# Methodology & known simplifications

Ash Ledger's calculation engine (`src/engine.js`) is ported formula-for-formula
from `PhullaVedanta_FlyAsh_Financial_Model_v07.xlsx`, and cross-checked against
the standalone Excel driver-model rebuild produced alongside it. Where it
departs from the source workbook, it's listed here.

1. **Cash / funding basis (deliberate correction).** v07's headline "Peak
   Funding ₹85.7 Cr" and "Breakeven Month 13" were computed on a *pre-tax*
   monthly cash basis, while its own Cash Flow Statement and Balance Sheet
   used a *post-tax* basis — the two didn't agree. This engine uses one
   post-tax basis everywhere, with an explicit month-by-month shareholder-loan
   waterfall (draws to cover shortfall, repays from surplus, floor at zero)
   and an optional interest rate on that loan. On the Base scenario this
   shows Peak Funding ≈ ₹81.6 Cr and Breakeven ≈ Month 14.

2. **Operations Manpower ramp.** v07 ramped manpower on its own bespoke
   hiring curve (reaching full staffing by ~Month 12, faster than revenue).
   This engine ties Manpower to the *same* ramp-% schedule as Revenue/Volume
   for simplicity and transparency.

3. **Marketing.** v07 used an irregular, launch-weighted monthly schedule
   (heavier during ramp, lower at steady state). This engine simplifies
   Marketing to a flat monthly base plus annual inflation. Simplifications
   (2) and (3) together move 15-year PAT by well under 0.1% vs. v07 in the
   Base scenario.

4. **Stress-test levers not in v07.** Variable Cost Multiplier, Freight/
   Logistics Rate, and per-grade Price Haircuts were added to support
   scenario analysis. v07 had no freight/logistics line at all. Base-scenario
   defaults for these are zero/1.0x, so the model reduces exactly to v07's
   own assumptions when Scenario = Base.

5. **CAPEX reconciliation.** v07's ₹72.67 Cr CAPEX ties out (within ₹0.10 Cr)
   to the companion `CAPEX and OPEX_v07extn.xlsx` workbook once its CPP-phase
   and TPP-phase equipment tabs are combined — they are not summed together
   anywhere in that workbook. That companion file's CPP-phase tabs still
   carry "Dirk International" labels (product name, consulting-fee
   counterparty, GP markup, 50% revenue-split partner) left over from an
   earlier template. None of that markup or branding is reflected here.

6. **Working capital** is still assumed nil, as in v07 — no receivables,
   inventory or payables are modeled.

## Reconciled reference figures (Base scenario)

| Metric | Value |
|---|---|
| 15-year revenue | ₹19,471.5 Cr |
| 15-year profit after tax | ₹12,347.6 Cr |
| PAT margin | 63.4% |
| Peak funding requirement | ₹81.6 Cr |
| Breakeven | Month 14 |

`test/engine.test.js` asserts these figures on every run — see
[Testing](../README.md#testing) in the README.
