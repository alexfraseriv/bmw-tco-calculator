import type { EnergyScenario, ScenarioKey } from "../types";
import { NumberInput } from "./NumberInput";

interface Props {
  scenarios: EnergyScenario[];
  activeKey: ScenarioKey;
  onChangeScenario: (idx: number, next: EnergyScenario) => void;
  onChangeActiveKey: (k: ScenarioKey) => void;
}

export function ScenariosPanel({
  scenarios,
  activeKey,
  onChangeScenario,
  onChangeActiveKey,
}: Props) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h2 className="text-base font-semibold">Energy prices</h2>
        <div className="text-[11px] text-muted">
          Chart & totals use the highlighted scenario
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {scenarios.map((s, i) => {
          const active = s.key === activeKey;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onChangeActiveKey(s.key)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                active
                  ? "border-accent/60 bg-accent/[0.06]"
                  : "border-line bg-panel2 hover:border-muted/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{s.label}</span>
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  {active ? "Active" : "Tap to view"}
                </span>
              </div>
              <div
                className="mt-2 grid grid-cols-2 gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <NumberInput
                  label="Gas"
                  value={s.gasPrice}
                  onChange={(n) => onChangeScenario(i, { ...s, gasPrice: n })}
                  prefix="$"
                  suffix="/ gal"
                  step={0.1}
                  decimals={2}
                />
                <NumberInput
                  label="Electricity"
                  value={s.electricityRate}
                  onChange={(n) =>
                    onChangeScenario(i, { ...s, electricityRate: n })
                  }
                  prefix="$"
                  suffix="/ kWh"
                  step={0.01}
                  decimals={3}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
