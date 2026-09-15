/**
 * engine.js — Financial model calculation engine
 *
 * Pure functions, no DOM access. Ported formula-for-formula from
 * PhullaVedanta_FlyAsh_Financial_Model_v07.xlsx (see the "Read Me" tab of
 * that workbook, or docs/METHODOLOGY.md in this repo, for the full list of
 * documented simplifications vs. the source spreadsheet).
 */

export const RAMP_DEFAULT = [
  0, 0, 0, 0.012015, 0.02403, 0.036045, 0.060075, 0.090113, 0.12015, 0.12015,
  0.14057, 0.202177, 0.322244, 0.530299, 0.636151, 0.724132, 0.812121,
  0.900102, 0.988091,
];

export const PLANT_CAPEX_DEFAULT = [33.89, 3.04, 1.98, 31.2, 1.2, 0.53];

export const PRESETS = {
  Base: { varCostMult: 1.0, freight: 0, hcP100: 0.0, hcP60: 0.0, hcP40: 0.0 },
  Downside: { varCostMult: 2.0, freight: 500, hcP100: 0.1, hcP60: 0.15, hcP40: 0.15 },
  Severe: { varCostMult: 3.0, freight: 800, hcP100: 0.2, hcP60: 0.25, hcP40: 0.25 },
};

export function defaultState() {
  return {
    scenario: "Base",
    custom: { varCostMult: 1.0, freight: 0, hcP100: 0, hcP60: 0, hcP40: 0 },
    volP100: 14752.8, volP60: 307350, volP40: 172116,
    priceP100: 20000, priceP60: 2000, priceP40: 1500,
    polyQty: 2458.8, polyPrice: 7000, polyInfl: 0.05,
    varCostBase: 4.4026, varCostInfl: 0.05,
    manpowerBase: 1.697, manpowerInfl: 0.08,
    mktgBase: 0.75, mktgInfl: 0.08,
    consultFlat: 0.4125, consultEndMonth: 21, consultSharePct: 0.02,
    ipFeeAnnual: 1.0,
    dirComp: 0.2,
    officeBase: 0.274, officeInfl: 0.08,
    vehiclesBase: 0.152, vehiclesInfl: 0.08,
    plantCapex: PLANT_CAPEX_DEFAULT.slice(),
    officeCapexAmt: 0.83, officeCapexMonth: 3,
    taxBase: 0.22, taxSurcharge: 0.1, taxCess: 0.04,
    deprecLife: 15,
    loanRateAnnual: 0.0,
    miscPct: 0.1,
    vedantaPct: 0.5, pcsPct: 0.5,
    rampMonths: 19,
    ramp: RAMP_DEFAULT.slice(),
  };
}

export function activeStress(s) {
  if (s.scenario === "Custom") return { ...s.custom };
  return { ...PRESETS[s.scenario] };
}

/**
 * Run the full 180-month model for a given input state.
 * @param {object} s - state object shaped like defaultState()
 * @returns {{months: object[], annual: object[], totalCapex: number, taxRate: number, kpis: object}}
 */
export function compute(s) {
  const N = 180;
  const stress = activeStress(s);
  const effP100 = s.priceP100 * (1 - stress.hcP100);
  const effP60 = s.priceP60 * (1 - stress.hcP60);
  const effP40 = s.priceP40 * (1 - stress.hcP40);
  const taxRate = s.taxBase * (1 + s.taxSurcharge) * (1 + s.taxCess);
  const totalCapex = s.plantCapex.reduce((a, b) => a + b, 0) + s.officeCapexAmt;
  const deprecMonthly = totalCapex / s.deprecLife / 12;

  const months = [];
  let loanOpen = 0, cashClose = 0, cumPat = 0;

  for (let m = 1; m <= N; m++) {
    const year = Math.ceil(m / 12);
    const infl = Math.max(0, year - 2);
    const ramp = m <= s.rampMonths ? (s.ramp[m - 1] ?? 1) : 1;

    const volP100 = s.volP100 * ramp, volP60 = s.volP60 * ramp, volP40 = s.volP40 * ramp;
    const revenue = (volP100 * effP100 + volP60 * effP60 + volP40 * effP40) / 1e7;

    const capexPlant = m <= 6 ? s.plantCapex[m - 1] : 0;
    const capexOffice = m === s.officeCapexMonth ? s.officeCapexAmt : 0;
    const capexTotal = capexPlant + capexOffice;

    const varCost = s.varCostBase * ramp * stress.varCostMult * Math.pow(1 + s.varCostInfl, infl);
    const freight = stress.freight * (volP100 + volP60 + volP40) / 1e7;
    const polymer = (s.polyQty * ramp * s.polyPrice) / 1e7 * Math.pow(1 + s.polyInfl, infl);
    const marketing = s.mktgBase * Math.pow(1 + s.mktgInfl, infl);
    const manpower = s.manpowerBase * ramp * Math.pow(1 + s.manpowerInfl, infl);
    const ipfee = s.ipFeeAnnual / 12;
    const dircomp = s.dirComp;
    const office = s.officeBase * Math.pow(1 + s.officeInfl, infl);
    const vehicles = s.vehiclesBase * Math.pow(1 + s.vehiclesInfl, infl);
    const interest = (s.loanRateAnnual / 12) * loanOpen;

    const otherCosts = varCost + freight + polymer + marketing + manpower + ipfee + dircomp + office + vehicles;
    const miscBase = capexTotal + varCost + freight + polymer + marketing + manpower + dircomp + office + vehicles;
    const misc = s.miscPct * miscBase;

    const pbtPreConsult = revenue - (otherCosts + misc + deprecMonthly + interest);
    const consulting = m <= s.consultEndMonth ? s.consultFlat : s.consultSharePct * Math.max(pbtPreConsult, 0);

    const totalExpense = otherCosts + consulting + misc + deprecMonthly + interest;
    const pbt = revenue - totalExpense;
    const tax = taxRate * pbt;
    const pat = pbt - tax;

    const netCash = pat + deprecMonthly - capexTotal;
    const loanClose = Math.max(0, loanOpen - netCash);
    const cashBuild = Math.max(0, netCash - loanOpen);
    cashClose = cashClose + cashBuild;
    cumPat = cumPat + pat;

    months.push({
      m, year, revenue, capexTotal, consulting, ipfee, misc, deprec: deprecMonthly,
      totalExpense, pbt, tax, pat, loanOpen, loanClose, cashClose, cumPat,
      vedShare: pat * s.vedantaPct, pcsShare: pat * s.pcsPct,
    });
    loanOpen = loanClose;
  }

  const annual = [];
  for (let y = 1; y <= 15; y++) {
    const ms = months.slice((y - 1) * 12, y * 12);
    const sum = (k) => ms.reduce((a, x) => a + x[k], 0);
    annual.push({
      year: y, revenue: sum("revenue"), capex: sum("capexTotal"), pbt: sum("pbt"),
      tax: sum("tax"), pat: sum("pat"), consulting: sum("consulting"), ipfee: sum("ipfee"),
      cumPat: ms[ms.length - 1].cumPat, cashClose: ms[ms.length - 1].cashClose,
      loanClose: ms[ms.length - 1].loanClose,
      vedShare: sum("vedShare"), pcsShare: sum("pcsShare"),
    });
  }

  const totalRevenue = annual.reduce((a, y) => a + y.revenue, 0);
  const totalPat = annual.reduce((a, y) => a + y.pat, 0);
  const totalPbt = annual.reduce((a, y) => a + y.pbt, 0);
  const totalTax = annual.reduce((a, y) => a + y.tax, 0);
  const totalConsulting = annual.reduce((a, y) => a + y.consulting, 0);
  const totalIpFee = annual.reduce((a, y) => a + y.ipfee, 0);
  const peakFunding = Math.max(...months.map((x) => x.loanClose));
  const beIdx = months.findIndex((x) => x.loanClose === 0);
  const breakeven = beIdx >= 0 ? beIdx + 1 : null;

  return {
    months, annual, totalCapex, taxRate,
    kpis: {
      totalRevenue, totalPbt, totalTax, totalPat,
      patMargin: totalRevenue ? totalPat / totalRevenue : 0,
      pbtMargin: totalRevenue ? totalPbt / totalRevenue : 0,
      steadyRevenue: months[179].revenue, peakFunding, breakeven,
      vedShare: totalPat * s.vedantaPct, pcsShare: totalPat * s.pcsPct + totalConsulting,
      totalConsulting, totalIpFee,
    },
  };
}
