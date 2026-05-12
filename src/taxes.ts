// Annual-salary → monthly take-home, Oregon resident.
//
// Brackets and deductions are 2026 estimates (Portland metro, single
// filer). Approximate enough to anchor a "% of take-home" budget framing;
// not a substitute for an actual tax filing. All values overridable from
// the UI for transparency.

interface Bracket {
  threshold: number; // taxable income at which this rate begins (annual $)
  rate: number;      // marginal rate
}

// Federal — single filer, 2026 indexed estimate.
const FEDERAL_BRACKETS_SINGLE: Bracket[] = [
  { threshold: 0,       rate: 0.10 },
  { threshold: 12_000,  rate: 0.12 },
  { threshold: 48_000,  rate: 0.22 },
  { threshold: 103_000, rate: 0.24 },
  { threshold: 197_000, rate: 0.32 },
  { threshold: 250_000, rate: 0.35 },
  { threshold: 626_000, rate: 0.37 },
];
const FEDERAL_STANDARD_DEDUCTION_SINGLE = 15_000;

// Oregon — single filer, 2026 indexed estimate. OR has no sales tax,
// which keeps the calculator focused on income only.
const OREGON_BRACKETS_SINGLE: Bracket[] = [
  { threshold: 0,       rate: 0.0475 },
  { threshold: 4_300,   rate: 0.0675 },
  { threshold: 10_750,  rate: 0.0875 },
  { threshold: 125_000, rate: 0.099 },
];
const OREGON_STANDARD_DEDUCTION_SINGLE = 2_500;

// FICA — flat employee-side. Social Security capped at the 2026 wage base.
const FICA_SS_RATE = 0.062;
const FICA_SS_WAGE_BASE = 176_100; // 2026 estimate
const FICA_MEDICARE_RATE = 0.0145;
const FICA_MEDICARE_ADDITIONAL_RATE = 0.009;
const FICA_MEDICARE_ADDITIONAL_THRESHOLD_SINGLE = 200_000;

function tax(brackets: Bracket[], taxable: number): number {
  if (taxable <= 0) return 0;
  let owed = 0;
  for (let i = 0; i < brackets.length; i++) {
    const start = brackets[i].threshold;
    const end = i + 1 < brackets.length ? brackets[i + 1].threshold : Infinity;
    if (taxable <= start) break;
    const top = Math.min(taxable, end);
    owed += (top - start) * brackets[i].rate;
  }
  return owed;
}

export interface TakeHomeBreakdown {
  gross: number;
  federalTax: number;
  oregonTax: number;
  ficaSS: number;
  ficaMedicare: number;
  totalTax: number;
  annualTakeHome: number;
  monthlyTakeHome: number;
  effectiveRate: number;
}

export function computeTakeHome(gross: number): TakeHomeBreakdown {
  const safeGross = Math.max(0, gross);
  const federalTaxable = Math.max(0, safeGross - FEDERAL_STANDARD_DEDUCTION_SINGLE);
  const oregonTaxable = Math.max(0, safeGross - OREGON_STANDARD_DEDUCTION_SINGLE);
  const federalTax = tax(FEDERAL_BRACKETS_SINGLE, federalTaxable);
  const oregonTax = tax(OREGON_BRACKETS_SINGLE, oregonTaxable);
  const ficaSS = Math.min(safeGross, FICA_SS_WAGE_BASE) * FICA_SS_RATE;
  const ficaMedicare =
    safeGross * FICA_MEDICARE_RATE +
    Math.max(0, safeGross - FICA_MEDICARE_ADDITIONAL_THRESHOLD_SINGLE) *
      FICA_MEDICARE_ADDITIONAL_RATE;
  const totalTax = federalTax + oregonTax + ficaSS + ficaMedicare;
  const annualTakeHome = safeGross - totalTax;
  return {
    gross: safeGross,
    federalTax,
    oregonTax,
    ficaSS,
    ficaMedicare,
    totalTax,
    annualTakeHome,
    monthlyTakeHome: annualTakeHome / 12,
    effectiveRate: safeGross > 0 ? totalTax / safeGross : 0,
  };
}
