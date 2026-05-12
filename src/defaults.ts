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
    // 36-mo / 12k-mi BMW USA Coupe lease at $599/mo with cap cost reduction
    // of ~$3,000–$4,500 due at signing. User's $550/mo quote is on the
    // aggressive end — keep it as a starter, but down payment shifts the
    // effective monthly higher.
    monthlyLease: 599,
    downPayment: 3500,
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
    downPayment: 3000,
    efficiency: 117,
    isGas: false,
    monthlyInsurance: 175,
    annualMaintenance: 100,
    fuelType: "electric",
  },
  {
    id: "polestar3",
    name: "Polestar 3 Long Range",
    shortName: "Polestar 3",
    color: "#f59e0b",
    msrp: 73000,
    // May 2026 Polestar promo: $579/mo for 27 mo with $5,000 down. Stretched
    // to a 36-mo equivalent and scaled for 12k mi (the promo is 7.5k mi/yr).
    monthlyLease: 699,
    downPayment: 5000,
    efficiency: 80,
    isGas: false,
    monthlyInsurance: 250,
    annualMaintenance: 150,
    fuelType: "electric",
  },
];

export const DEFAULT_DRIVING: DrivingProfile = {
  roundTripMiles: 352, // Portland <-> Bellevue
  tripsPerMonth: 2,
  otherMonthlyMiles: 800,
  leaseAllowanceAnnual: 12000,
  overagePerMile: 0.25,
};

export const DEFAULT_SCENARIOS: EnergyScenario[] = [
  { key: "low",     label: "Low",     gasPrice: 4.0, electricityRate: 0.13 },
  { key: "average", label: "Average", gasPrice: 5.3, electricityRate: 0.16 },
  { key: "high",    label: "High",    gasPrice: 7.0, electricityRate: 0.20 },
];

export const LEASE_TERM_MONTHS = 36;
