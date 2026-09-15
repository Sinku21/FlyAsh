/**
 * ui.js — DOM rendering and event wiring for the Input Console + Dashboard.
 * State lives in this module (a plain mutable object); every input event
 * mutates it in place and triggers a full recompute + re-render. The model
 * runs in well under a millisecond, so there's no debouncing.
 */
import { compute, defaultState, PRESETS } from "./engine.js";
import { PANELS, SCENARIO_META } from "./panels.js";
import { renderYearChart, renderCashChart, setTooltipEl } from "./charts.js";
import { fmtCr, fmtCr0, fmtPct } from "./format.js";

export let STATE = defaultState();

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => o[k], obj);
}
function setPath(obj, path, val) {
  const parts = path.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = val;
}

function fieldHTML(f) {
  const val = getPath(STATE, f.path);
  const step = f.step ?? (f.pct ? 0.005 : 1);
  const dispVal = f.pct ? val * 100 : val;
  return `<div class="field">
    <label for="${f.id}">${f.label}${f.unit ? ` <span class="unit">(${f.unit})</span>` : ""}</label>
    <input type="number" id="${f.id}" data-path="${f.path}" data-pct="${!!f.pct}" step="${step}" value="${dispVal}">
  </div>`;
}

function scenarioPanelHTML() {
  const isCustom = STATE.scenario === "Custom";
  const src = isCustom ? STATE.custom : PRESETS[STATE.scenario];
  const dis = isCustom ? "" : "disabled";
  return `
    <p class="hint" style="margin-top:0;">Pick a scenario above, or switch to <b>Custom</b> to set your own combination below.</p>
    <div class="field-grid">
      <div class="field"><label>Variable cost multiplier <span class="unit">(&times; base rate)</span></label>
        <input type="number" step="0.1" id="stress_varCostMult" data-stress="varCostMult" value="${src.varCostMult}" ${dis}></div>
      <div class="field"><label>Freight / logistics <span class="unit">(₹/MT)</span></label>
        <input type="number" step="10" id="stress_freight" data-stress="freight" value="${src.freight}" ${dis}></div>
      <div class="field"><label>P100 price haircut <span class="unit">(%)</span></label>
        <input type="number" step="0.5" id="stress_hcP100" data-stress="hcP100" value="${(src.hcP100 * 100).toFixed(1)}" ${dis}></div>
      <div class="field"><label>P60 price haircut <span class="unit">(%)</span></label>
        <input type="number" step="0.5" id="stress_hcP60" data-stress="hcP60" value="${(src.hcP60 * 100).toFixed(1)}" ${dis}></div>
      <div class="field"><label>P40 price haircut <span class="unit">(%)</span></label>
        <input type="number" step="0.5" id="stress_hcP40" data-stress="hcP40" value="${(src.hcP40 * 100).toFixed(1)}" ${dis}></div>
    </div>`;
}

function capexPanelHTML() {
  const draws = STATE.plantCapex.map((v, i) => `
    <div class="mini-field"><label for="capex_m${i + 1}">M${i + 1}</label>
      <input type="number" step="0.1" id="capex_m${i + 1}" data-capex-idx="${i}" value="${v}"></div>`).join("");
  return `
    <label style="font-size:12px;color:var(--ink-2);">Plant CAPEX draw by month (₹ Cr)</label>
    <div class="mini-grid" style="margin-top:6px;margin-bottom:14px;">${draws}</div>
    <div class="field-grid">
      <div class="field"><label>Director office setup — amount <span class="unit">(₹Cr)</span></label>
        <input type="number" step="0.01" id="officeCapexAmt" data-path="officeCapexAmt" value="${STATE.officeCapexAmt}"></div>
      <div class="field"><label>Director office setup — month</label>
        <input type="number" step="1" id="officeCapexMonth" data-path="officeCapexMonth" value="${STATE.officeCapexMonth}"></div>
    </div>`;
}

function rampPanelHTML() {
  const cells = STATE.ramp.map((v, i) => `
    <div class="mini-field"><label for="ramp_m${i + 1}">M${i + 1}</label>
      <input type="number" step="1" id="ramp_m${i + 1}" data-ramp-idx="${i}" value="${(v * 100).toFixed(1)}"></div>`).join("");
  return `
    <label style="font-size:12px;color:var(--ink-2);">% of steady-state capacity — applies to Revenue/Volume and Manpower. Month 20 onward = 100%.</label>
    <div class="mini-grid" style="margin-top:6px;">${cells}</div>`;
}

function renderConsole() {
  const el = document.getElementById("inputConsole");
  el.innerHTML = PANELS.map((p) => {
    let body;
    if (p.custom) body = scenarioPanelHTML();
    else if (p.capex) body = capexPanelHTML();
    else if (p.ramp) body = rampPanelHTML();
    else body = `<div class="field-grid">${p.fields.map(fieldHTML).join("")}</div>`;
    return `<details class="panel" ${p.open ? "open" : ""}>
      <summary class="panel-head"><h3>${p.title}</h3></summary>
      <div class="panel-body">${body}</div>
    </details>`;
  }).join("");
  wireInputs();
}

function wireInputs() {
  document.querySelectorAll("[data-path]").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const path = e.target.dataset.path;
      const isPct = e.target.dataset.pct === "true";
      let v = parseFloat(e.target.value);
      if (isNaN(v)) return;
      if (isPct) v = v / 100;
      setPath(STATE, path, v);
      recalcAndRender();
    });
  });
  document.querySelectorAll("[data-stress]").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const key = e.target.dataset.stress;
      let v = parseFloat(e.target.value);
      if (isNaN(v)) return;
      if (key.startsWith("hc")) v = v / 100;
      STATE.custom[key] = v;
      recalcAndRender();
    });
  });
  document.querySelectorAll("[data-capex-idx]").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const idx = +e.target.dataset.capexIdx;
      const v = parseFloat(e.target.value);
      if (isNaN(v)) return;
      STATE.plantCapex[idx] = v;
      recalcAndRender();
    });
  });
  document.querySelectorAll("[data-ramp-idx]").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const idx = +e.target.dataset.rampIdx;
      const v = parseFloat(e.target.value);
      if (isNaN(v)) return;
      STATE.ramp[idx] = v / 100;
      recalcAndRender();
    });
  });
}

export function setScenario(s) {
  STATE.scenario = s;
  document.querySelectorAll("#scenarioSeg button").forEach((b) => b.classList.toggle("active", b.dataset.scenario === s));
  const meta = SCENARIO_META[s];
  document.getElementById("lamp").className = "lamp " + meta.lamp;
  document.getElementById("lampLabel").textContent = meta.label;
  document.getElementById("scenarioTag").textContent = s.toUpperCase();
  renderConsole();
  recalcAndRender();
}

function renderTable(annual) {
  const rows = [
    ["Total Revenue", (y) => y.revenue, true],
    ["Total CAPEX", (y) => y.capex, false],
    ["Profit Before Tax", (y) => y.pbt, true],
    ["Corporate Tax", (y) => y.tax, false],
    ["Profit After Tax", (y) => y.pat, true],
    ["Cumulative PAT", (y) => y.cumPat, false],
    ["Vedanta Share", (y) => y.vedShare, false],
    ["PCS Share (PAT only)", (y) => y.pcsShare, false],
  ];
  const thead = `<tr><th>₹ Crore</th>${annual.map((y) => `<th>Y${y.year}</th>`).join("")}<th>15-Yr</th></tr>`;
  const body = rows.map(([label, fn, bold]) => {
    const tot = annual.reduce((a, y) => a + fn(y), 0);
    return `<tr class="${bold ? "total" : ""}"><td>${label}</td>${annual.map((y) => `<td>${fmtCr0(fn(y))}</td>`).join("")}<td>${fmtCr0(tot)}</td></tr>`;
  }).join("");
  document.getElementById("apTable").innerHTML = `<thead>${thead}</thead><tbody>${body}</tbody>`;
}

export function recalcAndRender() {
  const result = compute(STATE);
  const k = result.kpis;
  document.getElementById("kpiRevenue").textContent = fmtCr(k.totalRevenue);
  document.getElementById("kpiPat").textContent = fmtCr(k.totalPat);
  document.getElementById("kpiPatMargin").textContent = fmtPct(k.patMargin) + " margin";
  document.getElementById("kpiPeak").textContent = fmtCr(k.peakFunding);
  document.getElementById("kpiBreakeven").textContent = k.breakeven ? "M" + k.breakeven : "n/a";
  document.getElementById("kpiVedanta").textContent = fmtCr0(k.vedShare) + " Cr";
  document.getElementById("kpiPcs").textContent = fmtCr0(k.pcsShare) + " Cr";
  renderYearChart(result.annual, document.getElementById("yearChartWrap"));
  renderCashChart(result.months, document.getElementById("cashChartWrap"));
  renderTable(result.annual);
  return result;
}

export function initApp() {
  setTooltipEl(document.getElementById("tooltip"));
  renderConsole();
  document.getElementById("scenarioSeg").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    setScenario(btn.dataset.scenario);
  });
  setScenario("Base");
}
