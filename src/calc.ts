import { LEASE_TERM_MONTHS } from "./defaults";
import type {
  DrivingProfile,
  EnergyScenario,
  MonthlyBreakdown,
  Vehicle,
  VehicleResult,
} from "./types";

// EPA's definition of MPGe: 33.7 kWh = 1 gallon-equivalent of energy.
export const KWH_PER_GALLON = 33.7;

export function monthlyMiles(p: DrivingProfile): number {
  return p.roundTripMiles * p.tripsPerMonth + p.otherMonthlyMiles;
}

export function annualMiles(p: DrivingProfile): number {
  return monthlyMiles(p) * 12;
}

export function monthlyFuelCost(
  v: Vehicle,
  p: DrivingProfile,
  s: EnergyScenario,
): number {
  const miles = monthlyMiles(p);
  if (miles <= 0 || v.efficiency <= 0) return 0;

  if (v.isGas) {
    return (miles / v.efficiency) * s.gasPrice;
  }
  // EV: convert MPGe back into kWh, then multiply by $/kWh.
  return miles * (KWH_PER_GALLON / v.efficiency) * s.electricityRate;
}

export function monthlyOverageCost(p: DrivingProfile): number {
  const overMiles = Math.max(0, annualMiles(p) - p.leaseAllowanceAnnual);
  return (overMiles * p.overagePerMile) / 12;
}

export function monthlyBreakdown(
  v: Vehicle,
  p: DrivingProfile,
  s: EnergyScenario,
): MonthlyBreakdown {
  const lease = v.monthlyLease;
  const down = v.downPayment || 0;
  const amortizedDown = down / LEASE_TERM_MONTHS;
  // Opportunity cost on cash tied up at signing. Linear amortization →
  // average outstanding balance is down/2, so total interest = down * apr * years / 2.
  // Spread back over the term so it composes with the other monthly figures.
  const apr = (v.apr || 0) / 100;
  const years = LEASE_TERM_MONTHS / 12;
  const opportunityCost =
    down > 0 && apr > 0 ? (down * apr * years) / 2 / LEASE_TERM_MONTHS : 0;
  const fuel = monthlyFuelCost(v, p, s);
  const insurance = v.monthlyInsurance;
  const maintenance = v.annualMaintenance / 12;
  const overage = monthlyOverageCost(p);
  const total =
    lease + amortizedDown + opportunityCost + fuel + insurance + maintenance + overage;
  return {
    lease,
    amortizedDown,
    opportunityCost,
    fuel,
    insurance,
    maintenance,
    overage,
    total,
  };
}

export function computeVehicleResult(
  v: Vehicle,
  p: DrivingProfile,
  s: EnergyScenario,
): VehicleResult {
  const monthly = monthlyBreakdown(v, p, s);
  const cumulative: number[] = new Array(LEASE_TERM_MONTHS + 1);
  for (let i = 0; i <= LEASE_TERM_MONTHS; i++) {
    cumulative[i] = monthly.total * i;
  }
  return {
    vehicleId: v.id,
    monthly,
    threeYearTotal: monthly.total * LEASE_TERM_MONTHS,
    cumulative,
  };
}

export function fmtMoney(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
