# QA Report — Calculator Math Verification

**Reviewer**: qa-engineer
**Branch**: `iter3/qa-math`
**Date**: 2026-05-12
**Scope**: `src/calc.ts`, `src/taxes.ts`, `src/defaults.ts`, BRIEF.md §9

## Summary

| | |
|---|---|
| Tests written | 28 (in `src/__tests__/calc.test.ts`) |
| Tests passing | 28 / 28 |
| Math bugs found | **0** |
| Open recommendations | 2 (see below — not bugs) |

The math in `calc.ts` and `taxes.ts` is correct and reproduces BRIEF §9 sanity values exactly when given the BRIEF's input assumptions.

## Formulas verified by hand

### Driving (`calc.ts`)
- `monthlyMiles = roundTripMiles × tripsPerMonth + otherMonthlyMiles` → 352×2 + 800 = **1,504** ✓
- `annualMiles = monthlyMiles × 12` → 1,504 × 12 = **18,048** ✓

### Mileage overage
- `(max(0, annualMiles − allowance) × overageRate) / 12`
- Default profile (18,048 mi/yr, 12,000 allowance, $0.25): (6,048 × 0.25) / 12 = **$126.00/mo** ✓
- Exactly 12,000/yr → $0/mo ✓
- 18,000/yr → (6,000 × 0.25) / 12 = **$125.00/mo** ✓ (matches task acceptance criterion 2b)

### Fuel cost
- Gas: `miles / mpg × $/gal`. BMW 430i defaults: 1,504/28 × $5.30 = **$284.69/mo** ≈ BRIEF "$285" ✓
- EV: `miles × (33.7 / MPGe) × $/kWh`. EPA MPGe definition (33.7 kWh/gal) confirmed in code (`KWH_PER_GALLON = 33.7`).
- Task hand-check: 100 MPGe EV, 1,000 mi/mo, $0.20/kWh → 1,000 × 0.337 × $0.20 = **$67.40** ✓ (matches 2c exactly)
- IONIQ 6 defaults: 1,504 × (33.7/117) × $0.16 = **$69.32** ≈ BRIEF "$69" ✓
- Edge case: `miles ≤ 0` OR `efficiency ≤ 0` → returns 0 (safe early-exit; tested).

### Down payment amortization
- `downPayment / LEASE_TERM_MONTHS` (LEASE_TERM_MONTHS = 36).
- $5,400 / 36 = **$150.00/mo** ✓ (matches 2d exactly)
- $3,000 / 36 = **$83.33/mo** ✓
- Adding $3,600 down adds exactly $100/mo to monthly total ✓
- **APR / opportunity-cost**: NOT YET WIRED IN (pricing-engineer task #2 owns this). I added a placeholder structure in the test file noting that opportunity-cost validation will need to be added in a follow-up pass once their branch lands. Will re-verify against their branch when ready.

### Scenario switching
- Verified that changing `EnergyScenario` from `low` → `high` mutates `monthly.fuel` only; `lease`, `amortizedDown`, `insurance`, `maintenance`, `overage` are unchanged. ✓
- Holds for both gas (BMW) and EV (IONIQ) vehicles. ✓

### Cumulative array & threeYearTotal
- `cumulative` has 37 entries (months 0..36) ✓
- `cumulative[0] = 0`, `cumulative[36] = threeYearTotal` ✓
- Strictly monotonic increasing for any nonzero monthly cost ✓
- Implementation note: `cumulative[i] = monthly.total × i` — a linear projection. This is correct given the model's assumption that monthly cost is constant across the lease term. If APR/financing later varies monthly amortization, this formula will need updating.

### BRIEF §9 sanity table reproduction
Using BRIEF's exact inputs (lease=$550 BMW / $425 IONIQ, **no down payment**, default driving, average prices):

| Vehicle | Computed 3yr | BRIEF target | Δ |
|---|---|---|---|
| BMW 430i | $43,284.65 | $43,300 | −$15.35 (within ±$50) ✓ |
| IONIQ 6 | $28,931.45 | $28,900 | +$31.45 (within ±$50) ✓ |

Both pass the ±$50 tolerance specified in task 2a.

### Third vehicle (Kia EV6, replaces Polestar 3 in current main)
- BRIEF §9 listed Polestar 3 at $44,600/3yr; main has swapped to Kia EV6.
- With current `defaults.ts` (lease $450, $3,000 down, 105 MPGe, $200/mo ins, $120/yr maint, avg scenario): **$946.57/mo → $34,076.50/3yr** (verified component-by-component).
- Test locks in the value with a $33,500–$34,500 window to catch silent drift if pricing-engineer tweaks defaults.

### Tax / take-home (`taxes.ts`) — $185k Portland OR single filer
Output: federal $33,700 / OR $16,329 / FICA $13,600 (SS capped at wage base) / take-home **$10,114/mo** at a **34.4%** effective rate.

| Bucket | Computed | Documented expectation | OK? |
|---|---|---|---|
| Federal | $33,700 | ~$33k | ✓ |
| Oregon | $16,329 | ~$15k | ✓ (slightly high — high-bracket marginal of 9.9% from $125k+ adds up; brackets are 2026 estimates) |
| FICA | $13,601 | ~$13k | ✓ |
| Monthly take-home | $10,114 | ~$10k/mo | ✓ |

Additional hand-checks performed and codified as tests:
- SS caps at 2026 wage-base estimate ($176,100 × 6.2% = $10,918.20) — confirmed via $500k gross test. ✓
- Medicare additional 0.9% kicks in over $200k — formula `1.45% × gross + 0.9% × max(0, gross − 200k)` verified. ✓
- Zero/negative gross → all-zero output ✓
- `totalTax = federal + state + FICA_SS + FICA_Medicare` and `take-home = gross − totalTax` invariants hold ✓

## Issues found

**None — all math is internally consistent and matches the BRIEF.**

I considered the following as potential issues but ruled them out:

1. ~~Current `defaults.ts` doesn't reproduce BRIEF §9 totals out of the box~~ — Not a math bug. Pricing-engineer (task #2) has intentionally bumped lease prices and added down payments to reflect actual May 2026 market data (file comments cite the sources). The BRIEF table reflects the user's *quoted* numbers, not market data. Tests verify the math reproduces the BRIEF table when given the BRIEF's exact inputs.
2. ~~`amortizedDown` rolls into `total` but isn't separately surfaced in 3yr math~~ — `threeYearTotal = monthly.total × 36`, and `monthly.total` already includes `amortizedDown`. Over 36 months that's exactly the full down payment. Correct.

## Recommendations / unaddressed edge cases (NOT bugs)

1. **Linear cumulative cost** — `cumulative[i] = monthly.total × i` will need revision once pricing-engineer's APR/opportunity-cost change lands, because opportunity cost compounds and won't be linear in `i`. Flagging for re-verification against task #2's output.
2. **Negative `downPayment`** — currently passes through (`v.downPayment || 0` only catches 0/undefined). Not a real-world scenario, but could yield negative `amortizedDown`. Low priority — UI likely clamps this; worth a `Math.max(0, …)` if defending the math layer in isolation.
3. **Fuel cost when `efficiency = 0`** — safely guarded with `efficiency <= 0` early-return. Good.
4. **Mileage overage with `overagePerMile = 0`** — works correctly (returns 0).

## Reproducing locally

```bash
cd /private/tmp/bmw-qa
npm install
npm test
```

## Re-verification plan

When pricing-engineer (task #2) pushes their branch:
1. Rebase `iter3/qa-math` onto their branch (or merge in).
2. Re-run `npm test`. Existing tests should still pass — they don't depend on lease numbers or down-payment amounts that would change.
3. Add APR/opportunity-cost tests using their new API surface.
4. If `cumulative` becomes non-linear, update the strictly-monotonic test to also verify the per-month delta is consistent with the new formula.
