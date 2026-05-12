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
  // Cash due at signing that goes against the cap cost / drive-off. The
  // calculator amortizes this across the 36-month term so the "effective
  // monthly cost" reflects the true out-of-pocket spend regardless of how
  // it's split between sign-and-drive vs upfront cash.
  downPayment: number;
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
  // Down payment amortized over the lease term — folded into "effective
  // monthly cost" so a $3,000 cap reduction reads as ~$83/mo and isn't
  // hidden by the headline sticker payment.
  amortizedDown: number;
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
