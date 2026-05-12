import type { DrivingProfile, EnergyScenario, Vehicle } from "./types";

// ---------------------------------------------------------------------------
// Vehicle catalog. Adding a new vehicle: append one object here. The rest of
// the app is fully driven by this array.
// ---------------------------------------------------------------------------
export const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: "bmw430i",
    name: "BMW 430i (2026)",
    shortName: "BMW 430i",
    color: "#3b82f6",
    msrp: 57290,
    monthlyLease: 550,
    efficiency: 28, // EPA combined MPG
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
    monthlyLease: 425,
    efficiency: 117, // EPA combined MPGe (Limited RWD ≈ 117–121; using mid)
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
    monthlyLease: 750,
    efficiency: 80, // EPA combined MPGe (~78–85 depending on trim)
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
