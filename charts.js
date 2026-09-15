/**
 * charts.js — hand-rolled SVG charts with a shared hover tooltip.
 * No charting library: the data is small (15 bars, 180-point line) and a
 * dependency-free renderer keeps the bundle tiny and the output CSP-safe.
 */
import { fmtCr } from "./format.js";

let tooltipEl = null;
export function setTooltipEl(el) {
  tooltipEl = el;
}

function showTooltip(x, y, html, container) {
  if (!tooltipEl) return;
  tooltipEl.innerHTML = html;
  tooltipEl.hidden = false;
  const wrapRect = container.closest(".chart-wrap").getBoundingClientRect();
  tooltipEl.style.left = wrapRect.left + x + window.scrollX + "px";
  tooltipEl.style.top = wrapRect.top + y + window.scrollY + "px";
}
function hideTooltip() {
  if (tooltipEl) tooltipEl.hidden = true;
}

export function renderYearChart(annual, mountEl) {
  const W = 560, H = 280, padL = 44, padR = 10, padT = 14, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxV = Math.max(...annual.map((y) => y.revenue), ...annual.map((y) => y.pat), 1) * 1.08;
  const n = annual.length;
  const groupW = plotW / n;
  const barW = groupW * 0.34;
  const yScale = (v) => padT + plotH - (v / maxV) * plotH;

  let gridlines = "", yticks = "";
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (maxV * i) / ticks;
    const y = yScale(v);
    gridlines += `<line class="grid-line" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>`;
    yticks += `<text class="axis-text" x="${padL - 6}" y="${y + 3}" text-anchor="end">${Math.round(v).toLocaleString("en-IN")}</text>`;
  }
  let bars = "", xticks = "";
  annual.forEach((y, i) => {
    const gx = padL + i * groupW;
    const rx = gx + groupW * 0.14;
    const px = gx + groupW * 0.52;
    const rh = plotH - (yScale(y.revenue) - padT);
    const ph = plotH - (yScale(Math.max(y.pat, 0)) - padT);
    bars += `<rect class="bar-revenue" x="${rx}" y="${yScale(y.revenue)}" width="${barW}" height="${Math.max(rh, 0)}" rx="1.5"/>`;
    bars += `<rect class="bar-pat" x="${px}" y="${yScale(Math.max(y.pat, 0))}" width="${barW}" height="${Math.max(ph, 0)}" rx="1.5"/>`;
    if (i % 2 === 0 || n <= 8) xticks += `<text class="axis-text" x="${gx + groupW / 2}" y="${H - 8}" text-anchor="middle">Y${y.year}</text>`;
  });

  mountEl.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" id="yearSvg">
    ${gridlines}${yticks}${bars}${xticks}
    <line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" stroke="var(--line-strong)"/>
    <rect class="overlay-rect" x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" id="yearOverlay"/>
  </svg>`;

  const overlay = mountEl.querySelector("#yearOverlay");
  overlay.addEventListener("mousemove", (e) => {
    const rect = overlay.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    let idx = Math.floor((mx - padL) / groupW);
    idx = Math.max(0, Math.min(n - 1, idx));
    const y = annual[idx];
    const cx = (rect.left - mountEl.closest(".chart-wrap").getBoundingClientRect().left) +
      (padL + idx * groupW + groupW / 2) / scaleX;
    showTooltip(cx, (padT / H) * rect.height, `
      <div style="font-weight:600;margin-bottom:3px;">Year ${y.year}</div>
      <div class="tt-row"><span><span class="tt-dot" style="background:var(--accent)"></span>Revenue</span><span>${fmtCr(y.revenue)}</span></div>
      <div class="tt-row"><span><span class="tt-dot" style="background:var(--series-cost)"></span>PAT</span><span>${fmtCr(y.pat)}</span></div>
    `, overlay);
  });
  overlay.addEventListener("mouseleave", hideTooltip);
}

export function renderCashChart(months, mountEl) {
  const W = 560, H = 230, padL = 46, padR = 10, padT = 14, padB = 24;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxCash = Math.max(...months.map((m) => m.cashClose), 1);
  const maxLoan = Math.max(...months.map((m) => m.loanClose), 1);
  const maxV = Math.max(maxCash, maxLoan) * 1.08;
  const n = months.length;
  const xScale = (i) => padL + (i / (n - 1)) * plotW;
  const yScaleUp = (v) => padT + plotH / 2 - (v / maxV) * (plotH / 2);
  const yScaleDown = (v) => padT + plotH / 2 + (v / maxV) * (plotH / 2);
  const mid = padT + plotH / 2;

  let cashPath = "M" + xScale(0) + "," + mid, loanPath = "M" + xScale(0) + "," + mid;
  months.forEach((m, i) => {
    cashPath += ` L${xScale(i).toFixed(1)},${yScaleUp(m.cashClose).toFixed(1)}`;
    loanPath += ` L${xScale(i).toFixed(1)},${yScaleDown(m.loanClose).toFixed(1)}`;
  });
  const cashArea = cashPath + ` L${xScale(n - 1).toFixed(1)},${mid} Z`;
  const loanArea = loanPath + ` L${xScale(n - 1).toFixed(1)},${mid} Z`;

  let gridlines = "", yticks = "";
  yticks += `<text class="axis-text" x="${padL - 6}" y="${mid + 3}" text-anchor="end">0</text>`;
  gridlines += `<line class="grid-line" x1="${padL}" x2="${W - padR}" y1="${mid}" y2="${mid}"/>`;
  [0.5, 1].forEach((f) => {
    const yU = yScaleUp(maxV * f);
    gridlines += `<line class="grid-line" x1="${padL}" x2="${W - padR}" y1="${yU}" y2="${yU}"/>`;
    yticks += `<text class="axis-text" x="${padL - 6}" y="${yU + 3}" text-anchor="end">${Math.round(maxV * f).toLocaleString("en-IN")}</text>`;
  });
  let xticks = "";
  for (let y = 3; y <= 15; y += 3) {
    const i = y * 12 - 1, x = xScale(i);
    xticks += `<text class="axis-text" x="${x}" y="${H - 6}" text-anchor="middle">Y${y}</text>`;
  }

  mountEl.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" id="cashSvg">
    ${gridlines}
    <path d="${loanArea}" fill="var(--status-critical-wash)" stroke="var(--status-critical)" stroke-width="1.5"/>
    <path d="${cashArea}" fill="var(--accent-wash)" stroke="var(--accent)" stroke-width="1.5"/>
    ${yticks}${xticks}
    <line id="cashCrosshair" class="crosshair" x1="0" x2="0" y1="${padT}" y2="${padT + plotH}" hidden/>
    <rect class="overlay-rect" x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" id="cashOverlay"/>
  </svg>`;

  const overlay = mountEl.querySelector("#cashOverlay");
  const crosshair = mountEl.querySelector("#cashCrosshair");
  overlay.addEventListener("mousemove", (e) => {
    const rect = overlay.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    let idx = Math.round(((mx - padL) / plotW) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    const mo = months[idx];
    const x = xScale(idx);
    crosshair.setAttribute("x1", x); crosshair.setAttribute("x2", x); crosshair.hidden = false;
    const cx = (padL + (idx / (n - 1)) * plotW) / scaleX;
    showTooltip(cx, (padT / H) * rect.height, `
      <div style="font-weight:600;margin-bottom:3px;">Month ${mo.m} (Year ${mo.year})</div>
      <div class="tt-row"><span><span class="tt-dot" style="background:var(--status-critical)"></span>Loan outstanding</span><span>${fmtCr(mo.loanClose)}</span></div>
      <div class="tt-row"><span><span class="tt-dot" style="background:var(--accent)"></span>Cash built</span><span>${fmtCr(mo.cashClose)}</span></div>
    `, overlay);
  });
  overlay.addEventListener("mouseleave", () => { hideTooltip(); crosshair.hidden = true; });
}
