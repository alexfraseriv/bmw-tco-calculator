import { describe, it, expect } from "vitest";
import {
  KWH_PER_GALLON,
  annualMiles,
  computeVehicleResult,
  monthlyBreakdown,
  monthlyFuelCost,
  monthlyMiles,
  monthlyOverageCost,
} from "../calc";
import {
  DEFAULT_DRIVING,
  DEFAULT_SCENARIOS,
  DEFAULT_VEHICLES,
  LEASE_TERM_MONTHS,
} from "../defaults";
import type { DrivingProfile, EnergyScenario, Vehicle } from "../types";
import { computeTakeHome } from "../taxes";

const averageScenario = (): EnergyScenario => {
  const s = DEFAULT_SCENARIOS.find((x) => x.key === "average");
  if (!s) throw new Error("missing average scenario");
  return s;
};

// BRIEF §9 inputs (no down payment, user-quoted lease numbers). The
// pricing-engineer's current defaults.ts uses more conservative lease + down
// payment figures, so the sanity-table assertions construct vehicles
// matching BRIEF §9 directly rather than relying on defaults.
const briefBmw: Vehicle = {
  id: "bmw430i",
  name: "BMW 430i",
  shortName: "BMW 430i",
  color: "#000",
  msrp: 57290,
  monthlyLease: 550,
  downPayment: 0,
  apr: 0,
  efficiency: 28,
  isGas: true,
  monthlyInsurance: 225,
  annualMaintenance: 200,
  fuelType: "premium",
};

const briefIoniq: Vehicle = {
  id: "ioniq6",
  name: "Hyundai IONIQ 6",
  shortName: "IONIQ 6",
  color: "#000",
  msrp: 53000,
  monthlyLease: 425,
  downPayment: 0,
  apr: 0,
  efficiency: 117,
  isGas: false,
  monthlyInsurance: 175,
  annualMaintenance: 100,
  fuelType: "electric",
};

describe("driving math", () => {
  it("monthlyMiles = roundTrip × trips + other", () => {
    expect(monthlyMiles(DEFAULT_DRIVING)).toBe(352 * 2 + 800);
    expect(monthlyMiles(DEFAULT_DRIVING)).toBe(1504);
  });

  it("annualMiles = monthlyMiles × 12", () => {
    expect(annualMiles(DEFAULT_DRIVING)).toBe(1504 * 12);
    expect(annualMiles(DEFAULT_DRIVING)).toBe(18048);
  });
});

describe("mileage overage", () => {
  it("zero overage when annual miles exactly equal allowance (12k/yr)", () => {
    const p: DrivingProfile = {
      roundTripMiles: 0,
      tripsPerMonth: 0,
      otherMonthlyMiles: 1000, // 12,000/yr
      leaseAllowanceAnnual: 12000,
      overagePerMile: 0.25,
    };
    expect(annualMiles(p)).toBe(12000);
    expect(monthlyOverageCost(p)).toBe(0);
  });

  it("zero overage when under allowance", () => {
    const p: DrivingProfile = {
      ...DEFAULT_DRIVING,
      roundTripMiles: 0,
      tripsPerMonth: 0,
      otherMonthlyMiles: 800, // 9,600/yr
    };
    expect(monthlyOverageCost(p)).toBe(0);
  });

  it("default driving (18,048/yr) yields ~$126/mo overage, and an 18k/yr round case yields exactly $125/mo", () => {
    // Default profile is 18,048 mi/yr → 6,048 overage × $0.25 ÷ 12 = $126.00
    expect(monthlyOverageCost(DEFAULT_DRIVING)).toBeCloseTo(126.0, 2);

    // BRIEF/task hint case: exactly 18,000 mi/yr default driving = $125/mo
    const p18k: DrivingProfile = {
      roundTripMiles: 0,
      tripsPerMonth: 0,
      otherMonthlyMiles: 1500, // 18,000/yr
      leaseAllowanceAnnual: 12000,
      overagePerMile: 0.25,
    };
    expect(annualMiles(p18k)).toBe(18000);
    expect(monthlyOverageCost(p18k)).toBeCloseTo(125.0, 2);
    // = 6,000 × 0.25 / 12
    expect(monthlyOverageCost(p18k)).toBeCloseTo((6000 * 0.25) / 12, 6);
  });
});

describe("MPGe conversion (fuel cost)", () => {
  it("33.7 kWh per gallon-equivalent constant matches EPA definition", () => {
    expect(KWH_PER_GALLON).toBe(33.7);
  });

  it("EV at 100 MPGe driven 1,000 miles consumes 337 kWh; at $0.20/kWh fuel cost = $67.40", () => {
    const v: Vehicle = {
      ...briefIoniq,
      efficiency: 100, // 100 MPGe
    };
    const p: DrivingProfile = {
      roundTripMiles: 0,
      tripsPerMonth: 0,
      otherMonthlyMiles: 1000, // 1,000 mi/mo
      leaseAllowanceAnnual: 12000,
      overagePerMile: 0.25,
    };
    const s: EnergyScenario = {
      key: "high",
      label: "High",
      gasPrice: 7.0,
      electricityRate: 0.2,
    };
    // 1000 mi × (33.7 / 100 MPGe) × $0.20/kWh = 337 kWh × $0.20 = $67.40
    expect(monthlyFuelCost(v, p, s)).toBeCloseTo(67.4, 4);
  });

  it("gas formula = miles / mpg × $/gal", () => {
    const v: Vehicle = { ...briefBmw, efficiency: 28 };
    const p: DrivingProfile = {
      roundTripMiles: 0,
      tripsPerMonth: 0,
      otherMonthlyMiles: 1504,
      leaseAllowanceAnnual: 12000,
      overagePerMile: 0.25,
    };
    const s: EnergyScenario = averageScenario();
    expect(monthlyFuelCost(v, p, s)).toBeCloseTo((1504 / 28) * s.gasPrice, 4);
  });

  it("zero monthly miles → zero fuel cost", () => {
    const p: DrivingProfile = {
      ...DEFAULT_DRIVING,
      roundTripMiles: 0,
      tripsPerMonth: 0,
      otherMonthlyMiles: 0,
    };
    expect(monthlyFuelCost(briefBmw, p, averageScenario())).toBe(0);
    expect(monthlyFuelCost(briefIoniq, p, averageScenario())).toBe(0);
  });
});

describe("BRIEF §9 sanity-table reproduction (defaults + average prices)", () => {
  // The BRIEF table uses lease=$550 (BMW) / $425 (IONIQ) and *no* down
  // payment. With those exact inputs, the calculator must produce the
  // table's 3-year totals within ±$50.
  it("BMW 430i → $43,300 / 3yr (±$50)", () => {
    const r = computeVehicleResult(briefBmw, DEFAULT_DRIVING, averageScenario());
    expect(r.threeYearTotal).toBeGreaterThan(43_300 - 50);
    expect(r.threeYearTotal).toBeLessThan(43_300 + 50);
  });

  it("IONIQ 6 → $28,900 / 3yr (±$50)", () => {
    const r = computeVehicleResult(briefIoniq, DEFAULT_DRIVING, averageScenario());
    expect(r.threeYearTotal).toBeGreaterThan(28_900 - 50);
    expect(r.threeYearTotal).toBeLessThan(28_900 + 50);
  });

  it("third vehicle (Kia EV6) with current defaults reproduces a consistent 3yr total", () => {
    // Current main has Kia EV6 as the third slot. We don't have a BRIEF
    // sanity number for it (Polestar 3 has been swapped out), so we verify
    // the math is internally consistent by recomputing each component.
    const kia = DEFAULT_VEHICLES.find((v) => v.id === "kiaev6");
    expect(kia).toBeDefined();
    if (!kia) return;

    const s = averageScenario();
    const m = monthlyBreakdown(kia, DEFAULT_DRIVING, s);

    expect(m.lease).toBeCloseTo(kia.monthlyLease, 6);
    expect(m.amortizedDown).toBeCloseTo(kia.downPayment / LEASE_TERM_MONTHS, 6);
    expect(m.fuel).toBeCloseTo(monthlyFuelCost(kia, DEFAULT_DRIVING, s), 6);
    expect(m.insurance).toBeCloseTo(kia.monthlyInsurance, 6);
    expect(m.maintenance).toBeCloseTo(kia.annualMaintenance / 12, 6);
    expect(m.overage).toBeCloseTo(monthlyOverageCost(DEFAULT_DRIVING), 6);

    const expectedTotal =
      m.lease +
      m.amortizedDown +
      m.opportunityCost +
      m.fuel +
      m.insurance +
      m.maintenance +
      m.overage;
    expect(m.total).toBeCloseTo(expectedTotal, 6);

    // For documentation / regression: with current iter3 defaults
    // (lease=$450, down=$4,500, APR=7%, eff=105 MPGe, ins=$200, maint=
    // $120/yr), Kia EV6 lands around $1,001/mo, $36,049/3yr. Lock it in
    // with wide tolerance so future tweaks don't silently drift.
    expect(r3(kia)).toBeGreaterThan(35_000);
    expect(r3(kia)).toBeLessThan(37_500);
  });
});

function r3(v: Vehicle): number {
  return computeVehicleResult(v, DEFAULT_DRIVING, averageScenario()).threeYearTotal;
}

describe("down payment amortization", () => {
  it("$5,400 over 36mo with no APR → $150/mo", () => {
    const v: Vehicle = { ...briefBmw, downPayment: 5400 };
    const m = monthlyBreakdown(v, DEFAULT_DRIVING, averageScenario());
    expect(m.amortizedDown).toBeCloseTo(150.0, 6);
  });

  it("$3,000 over 36mo → $83.33/mo", () => {
    const v: Vehicle = { ...briefIoniq, downPayment: 3000 };
    const m = monthlyBreakdown(v, DEFAULT_DRIVING, averageScenario());
    expect(m.amortizedDown).toBeCloseTo(3000 / 36, 6);
    expect(m.amortizedDown).toBeCloseTo(83.3333, 3);
  });

  it("zero down → zero amortizedDown", () => {
    const m = monthlyBreakdown(briefBmw, DEFAULT_DRIVING, averageScenario());
    expect(m.amortizedDown).toBe(0);
  });

  it("amortizedDown contributes to total", () => {
    const noDown = monthlyBreakdown(briefBmw, DEFAULT_DRIVING, averageScenario());
    const withDown = monthlyBreakdown(
      { ...briefBmw, downPayment: 3600 },
      DEFAULT_DRIVING,
      averageScenario(),
    );
    expect(withDown.total - noDown.total).toBeCloseTo(100, 4);
  });
});

describe("scenario switching", () => {
  it("changing energy scenario only affects monthly.fuel — lease/insurance/maintenance/overage stay fixed", () => {
    const low = DEFAULT_SCENARIOS.find((s) => s.key === "low")!;
    const high = DEFAULT_SCENARIOS.find((s) => s.key === "high")!;

    const mLow = monthlyBreakdown(briefBmw, DEFAULT_DRIVING, low);
    const mHigh = monthlyBreakdown(briefBmw, DEFAULT_DRIVING, high);

    expect(mLow.lease).toBe(mHigh.lease);
    expect(mLow.amortizedDown).toBe(mHigh.amortizedDown);
    expect(mLow.insurance).toBe(mHigh.insurance);
    expect(mLow.maintenance).toBe(mHigh.maintenance);
    expect(mLow.overage).toBe(mHigh.overage);
    expect(mLow.fuel).not.toBe(mHigh.fuel);
    expect(mHigh.fuel).toBeGreaterThan(mLow.fuel);
  });

  it("same for EVs", () => {
    const low = DEFAULT_SCENARIOS.find((s) => s.key === "low")!;
    const high = DEFAULT_SCENARIOS.find((s) => s.key === "high")!;

    const mLow = monthlyBreakdown(briefIoniq, DEFAULT_DRIVING, low);
    const mHigh = monthlyBreakdown(briefIoniq, DEFAULT_DRIVING, high);

    expect(mLow.lease).toBe(mHigh.lease);
    expect(mLow.insurance).toBe(mHigh.insurance);
    expect(mLow.maintenance).toBe(mHigh.maintenance);
    expect(mLow.overage).toBe(mHigh.overage);
    expect(mHigh.fuel).toBeGreaterThan(mLow.fuel);
  });
});

describe("cumulative & threeYearTotal", () => {
  it("cumulative has 37 entries (months 0..36); month 0 is zero; month 36 equals threeYearTotal", () => {
    const r = computeVehicleResult(briefBmw, DEFAULT_DRIVING, averageScenario());
    expect(r.cumulative.length).toBe(LEASE_TERM_MONTHS + 1);
    expect(r.cumulative[0]).toBe(0);
    expect(r.cumulative[36]).toBeCloseTo(r.threeYearTotal, 6);
  });

  it("cumulative is strictly increasing for nonzero monthly cost", () => {
    const r = computeVehicleResult(briefBmw, DEFAULT_DRIVING, averageScenario());
    for (let i = 1; i < r.cumulative.length; i++) {
      expect(r.cumulative[i]).toBeGreaterThan(r.cumulative[i - 1]);
    }
  });
});

describe("computeTakeHome — $185,000 Portland OR single filer", () => {
  // Brackets are 2026 estimates; allow generous tolerance.
  const t = computeTakeHome(185_000);

  it("federal tax ≈ $33k", () => {
    expect(t.federalTax).toBeGreaterThan(28_000);
    expect(t.federalTax).toBeLessThan(38_000);
  });

  it("Oregon tax ≈ $15k", () => {
    expect(t.oregonTax).toBeGreaterThan(12_000);
    expect(t.oregonTax).toBeLessThan(18_000);
  });

  it("FICA (SS + Medicare) ≈ $13k", () => {
    const fica = t.ficaSS + t.ficaMedicare;
    expect(fica).toBeGreaterThan(11_000);
    expect(fica).toBeLessThan(15_000);
  });

  it("monthly take-home ≈ $10k", () => {
    expect(t.monthlyTakeHome).toBeGreaterThan(8_500);
    expect(t.monthlyTakeHome).toBeLessThan(11_500);
  });

  it("total tax = sum of components; take-home = gross − total tax", () => {
    const sum = t.federalTax + t.oregonTax + t.ficaSS + t.ficaMedicare;
    expect(t.totalTax).toBeCloseTo(sum, 6);
    expect(t.annualTakeHome).toBeCloseTo(t.gross - t.totalTax, 6);
    expect(t.monthlyTakeHome).toBeCloseTo(t.annualTakeHome / 12, 6);
  });

  it("FICA Social Security caps at the wage base; Medicare additional kicks in over $200k", () => {
    // Below SS wage base: SS = gross × 6.2%
    const under = computeTakeHome(100_000);
    expect(under.ficaSS).toBeCloseTo(100_000 * 0.062, 4);
    // Way above SS wage base ($176,100 in 2026 estimate): SS caps
    const over = computeTakeHome(500_000);
    expect(over.ficaSS).toBeCloseTo(176_100 * 0.062, 4);
    // Medicare additional 0.9% on the portion above $200k
    // $500k → 1.45% × 500k + 0.9% × (500k − 200k)
    const expectedMedicare = 500_000 * 0.0145 + (500_000 - 200_000) * 0.009;
    expect(over.ficaMedicare).toBeCloseTo(expectedMedicare, 4);
  });

  it("zero / negative gross → zero everywhere", () => {
    const z = computeTakeHome(0);
    expect(z.federalTax).toBe(0);
    expect(z.oregonTax).toBe(0);
    expect(z.ficaSS).toBe(0);
    expect(z.ficaMedicare).toBe(0);
    expect(z.totalTax).toBe(0);
    expect(z.annualTakeHome).toBe(0);
    expect(z.monthlyTakeHome).toBe(0);
    expect(z.effectiveRate).toBe(0);

    const neg = computeTakeHome(-1000);
    expect(neg.gross).toBe(0);
    expect(neg.annualTakeHome).toBe(0);
  });

  it("effective rate matches totalTax / gross", () => {
    expect(t.effectiveRate).toBeCloseTo(t.totalTax / t.gross, 8);
  });
});
