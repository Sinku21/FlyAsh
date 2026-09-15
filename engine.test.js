import { describe, it, expect } from "vitest";
import { compute, defaultState } from "../src/engine.js";

// Reconciled against PhullaVedanta_FlyAsh_Financial_Model_v07.xlsx and the
// standalone driver-model Excel rebuild. Tolerances are tight (0.5 Cr / 0.1pt)
// because this suite exists to catch a regression in the formula port, not
// to allow drift.
describe("Base scenario", () => {
  const s = defaultState();
  const r = compute(s);

  it("matches the reconciled 15-year revenue", () => {
    expect(r.kpis.totalRevenue).toBeCloseTo(19471.55, 0);
  });
  it("matches the reconciled 15-year PAT", () => {
    expect(r.kpis.totalPat).toBeCloseTo(12347.6, 0);
  });
  it("matches the reconciled PAT margin", () => {
    expect(r.kpis.patMargin * 100).toBeCloseTo(63.4, 1);
  });
  it("matches the reconciled peak funding requirement", () => {
    expect(r.kpis.peakFunding).toBeCloseTo(81.6, 1);
  });
  it("matches the reconciled breakeven month", () => {
    expect(r.kpis.breakeven).toBe(14);
  });
  it("produces 180 months and 15 annual rows", () => {
    expect(r.months).toHaveLength(180);
    expect(r.annual).toHaveLength(15);
  });
  it("keeps Vedanta and PCS PAT shares equal at the default 50/50 split", () => {
    expect(r.kpis.vedShare).toBeCloseTo(r.kpis.totalPat * 0.5, 1);
  });
});

describe("Severe scenario", () => {
  it("matches the reconciled stress-test revenue", () => {
    const s = defaultState();
    s.scenario = "Severe";
    const r = compute(s);
    expect(r.kpis.totalRevenue).toBeCloseTo(14849.62, 0);
  });
});

describe("Custom scenario", () => {
  it("is only active when scenario is explicitly Custom", () => {
    const s = defaultState();
    s.custom.varCostMult = 5;
    // scenario is still "Base" — custom overrides must not leak in
    const r = compute(s);
    expect(r.kpis.totalPat).toBeCloseTo(12347.6, 0);
  });

  it("applies custom overrides once scenario is Custom", () => {
    const s = defaultState();
    s.scenario = "Custom";
    s.custom.varCostMult = 5;
    const base = compute({ ...defaultState() }).kpis.totalPat;
    const r = compute(s);
    expect(r.kpis.totalPat).toBeLessThan(base);
  });
});

describe("Sanity properties", () => {
  it("higher freight strictly reduces PAT, holding everything else fixed", () => {
    const s1 = defaultState(); s1.scenario = "Custom"; s1.custom.freight = 0;
    const s2 = defaultState(); s2.scenario = "Custom"; s2.custom.freight = 500;
    const r1 = compute(s1), r2 = compute(s2);
    expect(r2.kpis.totalPat).toBeLessThan(r1.kpis.totalPat);
  });

  it("the balance identity holds: cash and loan are never simultaneously positive", () => {
    const r = compute(defaultState());
    for (const m of r.months) {
      expect(m.cashClose === 0 || m.loanClose === 0).toBe(true);
    }
  });

  it("shareholder loan balance never goes negative", () => {
    const r = compute(defaultState());
    for (const m of r.months) {
      expect(m.loanClose).toBeGreaterThanOrEqual(0);
    }
  });
});
