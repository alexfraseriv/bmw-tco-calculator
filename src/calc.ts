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

// Clamp paymentMonthsRemaining to [0, LEASE_TERM_MONTHS]; default to full
// term so new leases keep their existing semantics (lease paid through
// month 36).
function paymentMonths(v: Vehicle): number {
  const n = v.paymentMonthsRemaining;
  if (n === undefined || !Number.isFinite(n)) return LEASE_TERM_MONTHS;
  return Math.max(0, Math.min(LEASE_TERM_MONTHS, n));
}

export function monthlyBreakdown(
  v: Vehicle,
  p: DrivingProfile,
  s: EnergyScenario,
): MonthlyBreakdown {
  // Lease/loan: full sticker payment only for months remaining on the
  // contract. After that, $0. We surface the AVERAGE over the 36-month
  // window in `monthly.lease` so the per-month figures stay comparable;
  // the cumulative chart honors the actual step-down.
  const months = paymentMonths(v);
  const lease = (v.monthlyLease * months) / LEASE_TERM_MONTHS;
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
  // Mileage overage only applies to leases. Loans (and "keep current
  // car" scenarios) own the vehicle; no contractual mile cap. We default
  // `financingType` to "lease" when undefined to preserve historical
  // behavior for vehicles that pre-date this field.
  const overage = v.financingType === "loan" ? 0 : monthlyOverageCost(p);
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
  const months = paymentMonths(v);
  // Build cumulative by accruing the actual per-month spend each step,
  // so a kept-car line steps from "lease + everything" down to "just
  // everything else" when payments end at month `paymentMonthsRemaining`.
  // Non-lease components (down amortization, opportunity cost, fuel, ins,
  // maint, overage) accrue every month — they apply for the full window.
  const nonLeasePerMonth =
    monthly.amortizedDown +
    monthly.opportunityCost +
    monthly.fuel +
    monthly.insurance +
    monthly.maintenance +
    monthly.overage;
  const buyout = v.buyoutAmount ?? 0;
  const resale = v.expectedResaleValue ?? 0;
  // Buy-and-sell only makes sense if BOTH numbers are positive — otherwise
  // we don't have enough info to value the cash event.
  const buyAndSellNet =
    buyout > 0 && resale > 0 ? resale - buyout : 0;
  const cumulative: number[] = new Array(LEASE_TERM_MONTHS + 1);
  cumulative[0] = 0;
  for (let i = 1; i <= LEASE_TERM_MONTHS; i++) {
    const leaseAtThisStep = i <= months ? v.monthlyLease : 0;
    cumulative[i] = cumulative[i - 1] + leaseAtThisStep + nonLeasePerMonth;
    // One-time buy-and-sell cash event at the month payments end.
    if (i === months && buyAndSellNet !== 0) {
      // Cash event is a cost reduction when net is positive (resale >
      // buyout), an extra cost when negative. We subtract from cumulative
      // because cumulative is "money out the door" — positive net is
      // money back.
      cumulative[i] -= buyAndSellNet;
    }
  }
  return {
    vehicleId: v.id,
    monthly,
    threeYearTotal: cumulative[LEASE_TERM_MONTHS],
    cumulative,
    buyAndSellNet,
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
