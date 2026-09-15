/** format.js — shared number formatters (₹ Crore, Indian digit grouping). */
export const fmtCr = (n) =>
  (n < 0 ? "–" : "") + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const fmtCr0 = (n) =>
  (n < 0 ? "–" : "") + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const fmtPct = (n) => (n * 100).toFixed(1) + "%";
