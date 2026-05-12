// Core data model for the TCO calculator.
// Keep it flat — adding a new vehicle is a one-object change in `defaults.ts`.

export type FuelType = "premium" | "regular" | "electric";

export interface Vehicle {
  id: string;
  name: string;
  shortName: string; // for chart legend on mobile
  color: string; // hex
  msrp: number;
  monthlyLease: number;
  efficiency: number; // MPG (gas) or MPGe (EV)
  isGas: boolean;
  monthlyInsurance: number;
  annualMaintenance: number;
  fuelType: FuelType;
}

export interface DrivingProfile {
  roundTripMiles: number;
  tripsPerMonth: number;
  otherMonthlyMiles: number;
  leaseAllowanceAnnual: number;
  overagePerMile: number; // dollars
}

export type ScenarioKey = "low" | "average" | "high";

export interface EnergyScenario {
  key: ScenarioKey;
  label: string;
  gasPrice: number; // $/gal
  electricityRate: number; // $/kWh
}

export interface MonthlyBreakdown {
  lease: number;
  fuel: number;
  insurance: number;
  maintenance: number;
  overage: number;
  total: number;
}

export interface VehicleResult {
  vehicleId: string;
  monthly: MonthlyBreakdown;
  threeYearTotal: number;
  // cumulative cost at month 0..36 (37 entries)
  cumulative: number[];
}
