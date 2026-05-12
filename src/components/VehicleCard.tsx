import { fmtMoney } from "../calc";
import type {
  DrivingProfile,
  EnergyScenario,
  Vehicle,
  VehicleResult,
} from "../types";
import { NumberInput } from "./NumberInput";

interface Props {
  vehicle: Vehicle;
  result: VehicleResult;
  baselineResult?: VehicleResult; // BMW 430i (or first vehicle), used for delta
  scenario: EnergyScenario;
  driving: DrivingProfile;
  onChange: (next: Vehicle) => void;
  onRemove?: () => void;
}

export function VehicleCard({
  vehicle,
  result,
  baselineResult,
  scenario,
  onChange,
  onRemove,
}: Props) {
  const isBaseline = !baselineResult || baselineResult.vehicleId === vehicle.id;
  const delta = baselineResult
    ? baselineResult.threeYearTotal - result.threeYearTotal
    : 0;
  const saves = delta > 0;
  const adds = delta < 0;
  const efficiencyLabel = vehicle.isGas ? "MPG" : "MPGe";

  return (
    <article
      className="rounded-xl border border-line bg-panel p-4"
      style={{ borderTopColor: vehicle.color, borderTopWidth: 3 }}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <input
            value={vehicle.name}
            onChange={(e) => onChange({ ...vehicle, name: e.target.value })}
            className="w-full bg-transparent text-base font-semibold outline-none"
          />
          <div className="text-[11px] text-muted">
            {vehicle.isGas ? "Gas" : "Electric"} ·{" "}
            {scenario.label} energy
          </div>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:text-warn hover:border-warn/60"
            aria-label="Remove vehicle"
          >
            Remove
          </button>
        )}
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberInput
          label="Monthly lease"
          value={vehicle.monthlyLease}
          onChange={(n) => onChange({ ...vehicle, monthlyLease: n })}
          prefix="$"
        />
        <NumberInput
          label="Cash at signing"
          value={vehicle.downPayment ?? 0}
          onChange={(n) => onChange({ ...vehicle, downPayment: n })}
          prefix="$"
          step={500}
        />
        <NumberInput
          label={efficiencyLabel}
          value={vehicle.efficiency}
          onChange={(n) => onChange({ ...vehicle, efficiency: n })}
        />
        <NumberInput
          label="Insurance / mo"
          value={vehicle.monthlyInsurance}
          onChange={(n) => onChange({ ...vehicle, monthlyInsurance: n })}
          prefix="$"
        />
        <NumberInput
          label="Annual maint."
          value={vehicle.annualMaintenance}
          onChange={(n) => onChange({ ...vehicle, annualMaintenance: n })}
          prefix="$"
        />
      </div>

      <dl className="mt-4 space-y-1 text-[13px]">
        <Row label="Lease (sticker)" v={result.monthly.lease} />
        {result.monthly.amortizedDown > 0 && (
          <Row
            label="Down ÷ 36 mo"
            v={result.monthly.amortizedDown}
          />
        )}
        <Row label={vehicle.isGas ? "Fuel" : "Electricity"} v={result.monthly.fuel} />
        <Row label="Insurance" v={result.monthly.insurance} />
        <Row label="Maintenance" v={result.monthly.maintenance} />
        <Row
          label="Mileage overage"
          v={result.monthly.overage}
          warn={result.monthly.overage > 0}
        />
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <dt className="text-sm font-medium">Monthly total</dt>
          <dd className="font-mono text-base font-semibold">
            {fmtMoney(result.monthly.total)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-muted">3-year total</dt>
          <dd className="font-mono text-sm">{fmtMoney(result.threeYearTotal)}</dd>
        </div>
      </dl>

      {!isBaseline && (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            saves
              ? "bg-accent/[0.08] text-accent"
              : adds
                ? "bg-warn/[0.08] text-warn"
                : "bg-panel2 text-muted"
          }`}
        >
          {saves && (
            <>
              Saves <span className="font-semibold">{fmtMoney(delta)}</span> vs BMW 430i
              <span className="text-muted"> over 3 years</span>
            </>
          )}
          {adds && (
            <>
              Costs <span className="font-semibold">{fmtMoney(-delta)}</span> more
              <span className="text-muted"> than BMW 430i over 3 years</span>
            </>
          )}
          {!saves && !adds && <>Same 3-year total as BMW 430i</>}
        </div>
      )}
    </article>
  );
}

function Row({ label, v, warn }: { label: string; v: number; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-mono ${warn ? "text-warn" : ""}`}>
        {fmtMoney(v, v < 10 ? 2 : 0)}
      </dd>
    </div>
  );
}
