import { fmtMoney } from "../calc";
import type {
  DrivingProfile,
  EnergyScenario,
  FinancingType,
  Vehicle,
  VehicleResult,
} from "../types";
import { NumberInput } from "./NumberInput";

interface Props {
  vehicle: Vehicle;
  result: VehicleResult;
  baselineResult?: VehicleResult; // baseline vehicle (defaults to first), used for delta
  baselineName?: string; // display name of the baseline vehicle for delta copy
  scenario: EnergyScenario;
  driving: DrivingProfile;
  onChange: (next: Vehicle) => void;
  onRemove?: () => void;
}

export function VehicleCard({
  vehicle,
  result,
  baselineResult,
  baselineName,
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
  const financing: FinancingType = vehicle.financingType ?? "lease";
  const isLoan = financing === "loan";

  return (
    <article
      className="rounded-xl border border-line bg-panel p-4"
      style={{ borderTopColor: vehicle.color, borderTopWidth: 3 }}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <input
            value={vehicle.name}
            onChange={(e) => onChange({ ...vehicle, name: e.target.value })}
            className="w-full bg-transparent text-base font-semibold outline-none"
          />
          <div className="text-[11px] text-muted">
            {vehicle.isGas ? "Gas" : "Electric"} · {scenario.label} energy ·{" "}
            {isLoan ? "Loan" : "Lease"}
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

      {/* Financing toggle — Lease vs Loan. Drives a couple of labels
          ("Cash at signing" → "Down payment", "Monthly lease" → "Monthly
          payment") and gates the mileage-overage line out of the result
          breakdown when the user owns the car. */}
      <div className="mt-3 inline-flex rounded-full border border-line bg-panel2 p-0.5 text-[11px]">
        <FinancingTab
          label="Lease"
          active={financing === "lease"}
          onClick={() =>
            onChange({ ...vehicle, financingType: "lease" })
          }
        />
        <FinancingTab
          label="Loan"
          active={financing === "loan"}
          onClick={() =>
            onChange({ ...vehicle, financingType: "loan" })
          }
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <NumberInput
          label={isLoan ? "Monthly payment" : "Monthly lease"}
          value={vehicle.monthlyLease}
          onChange={(n) => onChange({ ...vehicle, monthlyLease: n })}
          prefix="$"
        />
        <NumberInput
          label={isLoan ? "Down payment" : "Cash at signing"}
          value={vehicle.downPayment ?? 0}
          onChange={(n) => onChange({ ...vehicle, downPayment: n })}
          prefix="$"
          step={500}
        />
        <NumberInput
          label="APR (opp. cost)"
          value={vehicle.apr ?? 0}
          onChange={(n) => onChange({ ...vehicle, apr: Math.max(0, Math.min(20, n)) })}
          suffix="%"
          step={0.25}
          min={0}
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
        <Row
          label={isLoan ? "Loan payment" : "Lease (sticker)"}
          v={result.monthly.lease}
        />
        {result.monthly.amortizedDown > 0 && (
          <Row
            label="Down ÷ 36 mo"
            v={result.monthly.amortizedDown}
          />
        )}
        {result.monthly.opportunityCost > 0 && (
          <Row
            label="Opp. cost on cash"
            v={result.monthly.opportunityCost}
          />
        )}
        <Row label={vehicle.isGas ? "Fuel" : "Electricity"} v={result.monthly.fuel} />
        <Row label="Insurance" v={result.monthly.insurance} />
        <Row label="Maintenance" v={result.monthly.maintenance} />
        {/* Hide overage when zero — for loans it's always zero (no cap);
            for under-cap leases there's nothing useful to surface. */}
        {result.monthly.overage > 0 && (
          <Row
            label="Mileage overage"
            v={result.monthly.overage}
            warn
          />
        )}
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
              Saves <span className="font-semibold">{fmtMoney(delta)}</span> vs {baselineName ?? "baseline"}
              <span className="text-muted"> over 3 years</span>
            </>
          )}
          {adds && (
            <>
              Costs <span className="font-semibold">{fmtMoney(-delta)}</span> more
              <span className="text-muted"> than {baselineName ?? "baseline"} over 3 years</span>
            </>
          )}
          {!saves && !adds && <>Same 3-year total as {baselineName ?? "baseline"}</>}
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

function FinancingTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1 transition-colors ${
        active
          ? "bg-panel font-semibold text-fg shadow-sm"
          : "text-muted hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}
