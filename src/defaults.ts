import type { DrivingProfile, EnergyScenario, Vehicle } from "./types";

// ---------------------------------------------------------------------------
// Vehicle catalog. Adding a new vehicle: append one object here. The rest of
// the app is fully driven by this array.
//
// Lease numbers reflect actual May 2026 market data (sources: BMW USA
// 4-Series Coupe Lease offer; Hyundai IONIQ 6 Limited AWD owner-reported
// deals on ioniqforum.com after 2026 incentive rollback; Polestar 3
// May–June 2026 promo). All numbers are editable in-app; the URL params
// preserve any overrides so a tweaked link captures the user's quote.
// ---------------------------------------------------------------------------
export const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: "bmw430i",
    name: "BMW 430i (2026)",
    shortName: "BMW 430i",
    color: "#3b82f6",
    msrp: 57290,
    // The user is financing the 430i as a loan, not leasing — there's no
    // mileage cap on a loan, and at month 36 the car is owned outright
    // (not returned). The `monthlyLease` field still carries the loan
    // payment; the field name predates the lease/loan distinction.
    // $550/mo at the user's quoted terms with ~$5,500 down.
    financingType: "loan",
    monthlyLease: 550,
    downPayment: 5500,
    apr: 7,
    efficiency: 28,
    isGas: true,
    monthlyInsurance: 225,
    annualMaintenance: 200,
    fuelType: "premium",
  },
  {
    id: "ioniq6",
    name: "Hyundai IONIQ 6 Limited",
    shortName: "IONIQ 6",
    color: "#34d399",
    msrp: 53000,
    // 2026 Hyundai pulled incentives — owner-reported quotes for the 2026
    // Limited AWD are running $600–$700/mo. Mid-point with modest sign-on.
    // (2024/2025 IONIQ 6 leases in the $300–$425 range used EV credit
    // pass-through that has now expired.)
    monthlyLease: 625,
    downPayment: 4500,
    apr: 7,
    efficiency: 117,
    isGas: false,
    monthlyInsurance: 175,
    annualMaintenance: 100,
    fuelType: "electric",
  },
  {
    // "Keep the current car" scenario. The car is a 2017 BMW X1 with 37k
    // miles, financed (not leased): $314/mo for 14 more months, then
    // owned outright (~$4,300 remaining principal). After payoff, monthly
    // car-payment cost drops to $0 for the rest of the 36-month window.
    // Maintenance is the big swing factor: 2017 BMW X1 averages ~$1,740/yr
    // in combined service + repair per RepairPal. Low mileage helps but
    // doesn't override age-related rubber / seal / cooling-system wear.
    // Default expectedResaleValue $14,000 reflects a KBB private-party
    // estimate adjusted upward for low miles; set it to 0 to model
    // keeping the car instead of selling at month 14.
    id: "bmwx1current",
    name: "BMW X1 (current — 2017, 37k mi)",
    shortName: "Current X1",
    color: "#a855f7",
    msrp: 0, // already paid for in prior years
    // Financed loan, not a lease — no mileage cap. Already conceptually
    // a financed car (paymentMonthsRemaining + resale path); this just
    // makes it explicit so the calculator skips overage on it.
    financingType: "loan",
    monthlyLease: 314,
    paymentMonthsRemaining: 14,
    downPayment: 0,
    apr: 0,
    // 2017 BMW X1 xDrive28i: EPA 25 MPG combined. Slightly worse than the
    // new 430i because it's an older 4-cyl turbo.
    efficiency: 25,
    isGas: true,
    monthlyInsurance: 150, // older car: comprehensive drops, liability rises
    annualMaintenance: 1740, // RepairPal: maint $824 + repair $915 / yr
    fuelType: "premium",
    // Financed car: no lease residual to buy out — once payments end at
    // month 14, the user owns it free. If they sell, the full sale price
    // is cash in pocket. Default sale price = $14k (low-miles premium
    // over the KBB baseline of ~$11k for typical-mileage 2017 X1).
    buyoutAmount: 0,
    expectedResaleValue: 14000,
  },
  {
    id: "kiaev6",
    name: "Kia EV6 Wind AWD",
    shortName: "Kia EV6",
    color: "#f59e0b",
    msrp: 53000,
    // 2026 Kia EV6 leases run $381 avg (12k mi / 36 mo, $2,000 down) per
    // TrueCar; AWD trims like Wind/GT-Line come in slightly higher.
    // Defaulting to a realistic mid-trim quote.
    monthlyLease: 450,
    downPayment: 4500,
    apr: 7,
    // EPA MPGe — 2025/2026 EV6 Wind AWD is ~105 combined; the base RWD
    // Long Range hits 117. Using AWD as default (premium-feel matched to
    // IONIQ 6 Limited which is AWD-class).
    efficiency: 105,
    isGas: false,
    monthlyInsurance: 200,
    annualMaintenance: 120,
    fuelType: "electric",
  },
];

export const DEFAULT_DRIVING: DrivingProfile = {
  // Historical baseline from the user's friend: 2017 X1 at 37k miles over
  // 9 years ≈ 4,100 mi/yr ≈ 350 mi/mo. Bellevue work trips are NOT in
  // this default — the friend will start adding them when the new job
  // requires it. Bump `tripsPerMonth` to 2 (or whatever) to model that.
  roundTripMiles: 352, // Portland <-> Bellevue, kept ready for the user
  tripsPerMonth: 0,
  otherMonthlyMiles: 350,
  leaseAllowanceAnnual: 12000,
  overagePerMile: 0.25,
};

export const DEFAULT_SCENARIOS: EnergyScenario[] = [
  { key: "low",     label: "Low",     gasPrice: 4.0, electricityRate: 0.13 },
  { key: "average", label: "Average", gasPrice: 5.3, electricityRate: 0.16 },
  { key: "high",    label: "High",    gasPrice: 7.0, electricityRate: 0.20 },
];

export const LEASE_TERM_MONTHS = 36;
