/**
 * panels.js — declarative spec for the Input Console.
 * Each entry describes one accordion panel; most panels are a plain grid of
 * numeric fields, three ("scenario", "capex", "ramp") get bespoke markup
 * because they aren't simple key/value pairs.
 */
export const PANELS = [
  { id: "scenario", title: "Scenario & Stress Levers", open: true, custom: true },
  {
    id: "pricing", title: "Product Mix, Pricing & Volume", open: true,
    fields: [
      { id: "volP100", label: "P100 (HighGrade) volume", unit: "MT/mo", path: "volP100" },
      { id: "volP60", label: "P60 volume", unit: "MT/mo", path: "volP60" },
      { id: "volP40", label: "P40 volume", unit: "MT/mo", path: "volP40" },
      { id: "priceP100", label: "P100 base price", unit: "₹/MT", path: "priceP100" },
      { id: "priceP60", label: "P60 base price", unit: "₹/MT", path: "priceP60" },
      { id: "priceP40", label: "P40 base price", unit: "₹/MT", path: "priceP40" },
    ],
  },
  {
    id: "polymer", title: "Polymer", open: false,
    fields: [
      { id: "polyQty", label: "Polymer quantity", unit: "MT/mo", path: "polyQty" },
      { id: "polyPrice", label: "Polymer price", unit: "₹/MT", path: "polyPrice" },
      { id: "polyInfl", label: "Inflation from Yr 3", unit: "%/yr", path: "polyInfl", pct: true },
    ],
  },
  {
    id: "varcost", title: "Variable Operating Cost", open: false,
    fields: [
      { id: "varCostBase", label: "Base rate @ 100% capacity", unit: "₹Cr/mo", path: "varCostBase", step: 0.01 },
      { id: "varCostInfl", label: "Inflation from Yr 3", unit: "%/yr", path: "varCostInfl", pct: true },
    ],
  },
  {
    id: "fixedopex", title: "Fixed OPEX", open: false,
    fields: [
      { id: "manpowerBase", label: "Manpower — steady rate", unit: "₹Cr/mo", path: "manpowerBase", step: 0.01 },
      { id: "manpowerInfl", label: "Manpower inflation, Yr3+", unit: "%/yr", path: "manpowerInfl", pct: true },
      { id: "mktgBase", label: "Marketing — flat base", unit: "₹Cr/mo", path: "mktgBase", step: 0.01 },
      { id: "mktgInfl", label: "Marketing inflation, Yr3+", unit: "%/yr", path: "mktgInfl", pct: true },
      { id: "consultFlat", label: "Consulting — flat fee", unit: "₹Cr/mo", path: "consultFlat", step: 0.01 },
      { id: "consultEndMonth", label: "Consulting flat-fee end month", unit: "month #", path: "consultEndMonth" },
      { id: "consultSharePct", label: "Consulting profit-share after", unit: "% of PBT", path: "consultSharePct", pct: true },
      { id: "ipFeeAnnual", label: "IP usage fee (R. Vadekar)", unit: "₹Cr/yr", path: "ipFeeAnnual", step: 0.01 },
      { id: "dirComp", label: "Director compensation", unit: "₹Cr/mo", path: "dirComp", step: 0.01 },
      { id: "officeBase", label: "Mumbai office — base", unit: "₹Cr/mo", path: "officeBase", step: 0.01 },
      { id: "officeInfl", label: "Office inflation, Yr3+", unit: "%/yr", path: "officeInfl", pct: true },
      { id: "vehiclesBase", label: "Vehicles — base", unit: "₹Cr/mo", path: "vehiclesBase", step: 0.01 },
      { id: "vehiclesInfl", label: "Vehicles inflation, Yr3+", unit: "%/yr", path: "vehiclesInfl", pct: true },
    ],
  },
  { id: "capex", title: "CAPEX (Months 1–6)", open: false, capex: true },
  {
    id: "tax", title: "Taxation, Depreciation & Financing", open: false,
    fields: [
      { id: "taxBase", label: "Corporate tax — base rate", unit: "Sec 115BAA", path: "taxBase", pct: true },
      { id: "taxSurcharge", label: "Surcharge", unit: "% of base", path: "taxSurcharge", pct: true },
      { id: "taxCess", label: "Health & education cess", unit: "% of base+sur.", path: "taxCess", pct: true },
      { id: "deprecLife", label: "Depreciation life", unit: "years, SL", path: "deprecLife" },
      { id: "loanRateAnnual", label: "Shareholder loan interest", unit: "%/yr", path: "loanRateAnnual", pct: true },
    ],
  },
  {
    id: "structural", title: "Structural", open: false,
    fields: [
      { id: "miscPct", label: "Misc & contingency", unit: "% of CAPEX+OPEX", path: "miscPct", pct: true },
      { id: "vedantaPct", label: "Vedanta profit share", unit: "% of PAT", path: "vedantaPct", pct: true },
      { id: "pcsPct", label: "PCS profit share", unit: "% of PAT", path: "pcsPct", pct: true },
    ],
  },
  { id: "ramp", title: "Ramp Schedule (Months 1–19)", open: false, ramp: true },
];

export const SCENARIO_META = {
  Base: { lamp: "good", label: "Base case" },
  Downside: { lamp: "warning", label: "Downside case" },
  Severe: { lamp: "critical", label: "Severe / bear case" },
  Custom: { lamp: "neutral", label: "Custom scenario" },
};
