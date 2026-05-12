import { annualMiles, fmtInt, monthlyMiles } from "../calc";
import type { DrivingProfile } from "../types";
import { NumberInput } from "./NumberInput";

interface Props {
  driving: DrivingProfile;
  onChange: (next: DrivingProfile) => void;
}

export function DrivingPanel({ driving, onChange }: Props) {
  const mm = monthlyMiles(driving);
  const am = annualMiles(driving);
  const overOver = am > driving.leaseAllowanceAnnual;

  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Driving profile</h2>
        <div className="text-right text-[11px] text-muted">
          <div>
            {fmtInt(mm)} mi / mo · {fmtInt(am)} mi / yr
          </div>
          {overOver && (
            <div className="text-warn">
              +{fmtInt(am - driving.leaseAllowanceAnnual)} mi over lease cap
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <NumberInput
          label="Round trip miles"
          value={driving.roundTripMiles}
          onChange={(n) => onChange({ ...driving, roundTripMiles: n })}
          suffix="mi"
        />
        <NumberInput
          label="Trips / month"
          value={driving.tripsPerMonth}
          onChange={(n) => onChange({ ...driving, tripsPerMonth: n })}
        />
        <NumberInput
          label="Other monthly miles"
          value={driving.otherMonthlyMiles}
          onChange={(n) => onChange({ ...driving, otherMonthlyMiles: n })}
          suffix="mi"
        />
        <NumberInput
          label="Lease allowance"
          value={driving.leaseAllowanceAnnual}
          onChange={(n) => onChange({ ...driving, leaseAllowanceAnnual: n })}
          suffix="mi/yr"
          step={1000}
          warn={overOver}
          hint={
            overOver
              ? "Your annual miles exceed this cap"
              : "Standard BMW lease is 12,000"
          }
        />
        <NumberInput
          label="Overage rate"
          value={driving.overagePerMile}
          onChange={(n) => onChange({ ...driving, overagePerMile: n })}
          prefix="$"
          suffix="/ mi"
          step={0.05}
          decimals={2}
        />
      </div>
    </section>
  );
}
