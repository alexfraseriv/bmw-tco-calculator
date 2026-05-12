// Core data model for the TCO calculator.
// Keep it flat — adding a new vehicle is a one-object change in `defaults.ts`.

export type FuelType = "premium" | "regular" | "electric";

// Lease vs loan distinction. Mileage caps only apply to leases; loans
// (and "keep the current car" scenarios) own the vehicle, so the
// `overage` line item is forced to 0 for loans regardless of driving
// inputs. Default `lease` so existing URL params and tests keep the
// previous semantics unless explicitly overridden.
export type FinancingType = "lease" | "loan";

export interface Vehicle {
  id: string;
  name: string;
  shortName: string; // for chart legend on mobile
  color: string; // hex
  msrp: number;
  // How the vehicle is paid for. `lease`: monthly payment + mileage cap
  // applies. `loan`: monthly payment + ownership at term end + no
  // mileage cap. Defaults to "lease" when omitted.
  financingType?: FinancingType;
  monthlyLease: number;
  // How many of the 36 comparison months still carry the lease/loan
  // payment. New leases: 36 (full window). For a "keep current car"
  // scenario, set this to the payments remaining on the existing
  // contract (e.g. 14) and monthly payments stop after that point.
  paymentMonthsRemaining?: number;
  // Cash due at signing that goes against the cap cost / drive-off. The
  // calculator amortizes this across the 36-month term so the "effective
  // monthly cost" reflects the true out-of-pocket spend regardless of how
  // it's split between sign-and-drive vs upfront cash.
  downPayment: number;
  // Optional resale / payoff economics for a kept vehicle. At month
  // `paymentMonthsRemaining` the user may sell the car privately. For a
  // lease this means paying the residual buyout first; for a finance
  // loan that's paid off by then, the buyout is $0 and the full sale
  // price is upside. Net cash = expectedResaleValue − buyoutAmount,
  // applied as a one-time event in the cumulative chart. Leave both 0
  // (or expectedResaleValue 0) to skip the math entirely.
  buyoutAmount?: number; // residual / payoff needed to free the car for sale
  expectedResaleValue?: number; // private-party sale price at that moment
  // Annual percentage rate used to value the cash tied up at signing. Typical
  // manufacturer money factors of 0.0028–0.0035 translate to ~6.7–8.4% APR;
  // 7% is a reasonable mid-point default.
  apr: number;
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
  // Average monthly lease/loan payment over the comparison window. For a
  // new lease this is just `monthlyLease`. For a "keep current" vehicle
  // with payments ending mid-window, it's the amount averaged across the
  // full 36 months so the per-month figures stay comparable; the chart
  // and 3-year total reflect the true step-down.
  lease: number;
  // Down payment amortized over the lease term — folded into "effective
  // monthly cost" so a $3,000 cap reduction reads as ~$83/mo and isn't
  // hidden by the headline sticker payment.
  amortizedDown: number;
  // Time-value-of-money cost on cash tied up at signing. Treated as the APR
  // applied to the AVERAGE outstanding balance (linear pay-down over the
  // term), expressed as a monthly figure so it folds into the per-month
  // total alongside the other components.
  opportunityCost: number;
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
  // One-time net cash event at end-of-payments if a buyout + resale is
  // configured. Positive = profit, negative = loss. Folded into
  // `threeYearTotal` (subtracted as a cost reduction) and shown as a
  // visible step in the cumulative chart.
  buyAndSellNet: number;
}
