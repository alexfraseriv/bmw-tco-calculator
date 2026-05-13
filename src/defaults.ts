import type { DrivingProfile, EnergyScenario, Vehicle } from "./types";

// ---------------------------------------------------------------------------
// Default vehicle catalog. These are concrete examples seeded from a real
// May-2026 Portland-OR negotiation (BMW 4 Series lease vs IONIQ 6 / EV6 +
// keep-current-X1). Every field is editable in the UI, and the URL params
// preserve overrides so a tweaked link captures the user's own numbers.
// Adding a new vehicle: append one object here — the rest of the app loops
// over this array and picks up the new entry in the chart, table, and cards.
// ---------------------------------------------------------------------------
export const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: "bmw430i",
    name: "BMW 4 Series (2025 demo, 9k mi)",
    shortName: "BMW 4 Series",
    color: "#3b82f6",
    // Sample dealer worksheet (Option 1, lease, $0 down). Negotiated price
    // $49,999 + $215 doc fee + $423.63 DMV fees − $6,432 net trade equity
    // → $45,204.63 balance capitalized into the lease. 36-mo @ money
    // factor .0024 (= 5.76% APR) → $558.57/mo at $0 down. 10k mi/yr
    // allowance. Replace with your own quote.
    msrp: 49999,
    financingType: "lease",
    monthlyLease: 558.57,
    downPayment: 0,
    // 0.0024 × 2400 = 5.76% APR equivalent (money-factor convention).
    apr: 5.76,
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
    // Example "keep the current car" scenario — a 2017 BMW X1 with 37k
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
    // Financed loan, not a lease — no mileage cap. Per the dealer worksheet:
    // payoff $4,000, trade-in allowance $10,432 → net trade equity $6,432.
    // Continuing to pay it out: ~$4,000 remaining / $314 ≈ 13 months of
    // payments, then owned outright. Using 13 months below to match the
    // worksheet payoff exactly (was 14 from earlier estimate).
    financingType: "loan",
    monthlyLease: 314,
    paymentMonthsRemaining: 13,
    downPayment: 0,
    apr: 0,
    efficiency: 25,
    isGas: true,
    monthlyInsurance: 150,
    annualMaintenance: 1740,
    fuelType: "premium",
    // Two sell-paths the user can choose between:
    //   - Trade-in (dealer): $10,432 immediate offer (per worksheet).
    //   - Private party (KBB / Cars.com 2026): $13,500–$14,500 realistic
    //     sale price after some legwork. Low-mile premium over the KBB
    //     typical-mileage baseline (~$11k for a 100k-mi 2017 X1) puts a
    //     37k-mi example near the upper KBB range; nationwide dealer
    //     listings for similar 2017 X1 xDrive28i average ~$13,700.
    // Defaulting to **private-party midpoint $14,000** since holding to
    // month 13 (loan payoff) and selling private is the upside path.
    // Override to 10432 if modeling the trade-in instead.
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
  // Sample low-mileage profile: ~4,100 mi/yr ≈ 350 mi/mo, with a 352-mi
  // round-trip "work commute" slot pre-filled but set to 0 trips/mo so it
  // only activates when the user bumps `tripsPerMonth`. Tweak any field
  // in-app; everything is editable.
  roundTripMiles: 352,
  tripsPerMonth: 0,
  otherMonthlyMiles: 350,
  // 10,000 mi/yr matches a real-world BMW lease worksheet (lower than the
  // 12k industry-standard) so the overage warning fires honestly on
  // high-mileage drivers. Raise to 12k/15k if your lease offer differs.
  leaseAllowanceAnnual: 10000,
  overagePerMile: 0.25,
};

export const DEFAULT_SCENARIOS: EnergyScenario[] = [
  { key: "low",     label: "Low",     gasPrice: 4.0, electricityRate: 0.13 },
  { key: "average", label: "Average", gasPrice: 5.3, electricityRate: 0.16 },
  { key: "high",    label: "High",    gasPrice: 7.0, electricityRate: 0.20 },
];

export const LEASE_TERM_MONTHS = 36;
