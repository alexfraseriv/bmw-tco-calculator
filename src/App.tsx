import { useMemo } from "react";
import { computeVehicleResult, fmtInt, fmtMoney, monthlyMiles, annualMiles } from "./calc";
import { DEFAULT_VEHICLES } from "./defaults";
import { DrivingPanel } from "./components/DrivingPanel";
import { ScenariosPanel } from "./components/ScenariosPanel";
import { ShareBar } from "./components/ShareBar";
import { TcoChart } from "./components/TcoChart";
import { VehicleCard } from "./components/VehicleCard";
import type { EnergyScenario, Vehicle } from "./types";
import { useUrlState } from "./useUrlState";

// A small palette for newly-added "blank" vehicles so the chart stays readable.
const EXTRA_COLORS = ["#ef4444", "#8b5cf6", "#f472b6", "#22d3ee", "#eab308"];

function makeBlankVehicle(existingIds: string[]): Vehicle {
  let n = 1;
  while (existingIds.includes(`custom${n}`)) n += 1;
  const color = EXTRA_COLORS[(n - 1) % EXTRA_COLORS.length];
  return {
    id: `custom${n}`,
    name: `New vehicle ${n}`,
    shortName: `Custom ${n}`,
    color,
    msrp: 50000,
    monthlyLease: 500,
    efficiency: 100,
    isGas: false,
    monthlyInsurance: 200,
    annualMaintenance: 150,
    fuelType: "electric",
  };
}

export default function App() {
  const [state, setState] = useUrlState();
  const { vehicles, driving, scenarios, scenarioKey } = state;

  const activeScenario: EnergyScenario =
    scenarios.find((s) => s.key === scenarioKey) ?? scenarios[1];

  const results = useMemo(
    () => vehicles.map((v) => computeVehicleResult(v, driving, activeScenario)),
    [vehicles, driving, activeScenario],
  );

  // Baseline = the first 430i present, or the first vehicle.
  const baseline =
    results.find((r) => r.vehicleId === "bmw430i") ?? results[0];

  const overage = annualMiles(driving) > driving.leaseAllowanceAnnual;

  // Headline savings vs BMW: largest saver in active scenario.
  const headline = useMemo(() => {
    if (!baseline) return null;
    let best: { id: string; delta: number } | null = null;
    for (const r of results) {
      if (r.vehicleId === baseline.vehicleId) continue;
      const delta = baseline.threeYearTotal - r.threeYearTotal;
      if (!best || delta > best.delta) best = { id: r.vehicleId, delta };
    }
    if (!best || best.delta <= 0) return null;
    const v = vehicles.find((x) => x.id === best!.id);
    return v ? { vehicleName: v.shortName, delta: best.delta } : null;
  }, [results, vehicles, baseline]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted">
            Portland, OR · 3-year lease
          </div>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            BMW 430i vs EV: total cost of ownership
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            All numbers below are editable and saved into the URL — share the
            link and the recipient sees your exact scenario. Math follows EPA
            MPGe (33.7 kWh / gal) and standard lease overage at $
            {driving.overagePerMile.toFixed(2)} / mi.
          </p>
        </div>
        <ShareBar />
      </header>

      {overage && (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn/[0.06] p-3 text-sm text-warn">
          <strong className="font-semibold">Mileage gotcha:</strong>{" "}
          {fmtInt(annualMiles(driving))} mi / yr exceeds the{" "}
          {fmtInt(driving.leaseAllowanceAnnual)} mi lease cap. At $
          {driving.overagePerMile.toFixed(2)} / mi, every vehicle below carries
          an extra{" "}
          {fmtMoney(
            ((annualMiles(driving) - driving.leaseAllowanceAnnual) *
              driving.overagePerMile *
              3),
          )}{" "}
          over 3 years unless you negotiate a higher allowance upfront.
        </div>
      )}

      <div className="space-y-4">
        <DrivingPanel
          driving={driving}
          onChange={(d) => setState({ ...state, driving: d })}
        />

        <ScenariosPanel
          scenarios={scenarios}
          activeKey={scenarioKey}
          onChangeScenario={(idx, next) => {
            const newScenarios = scenarios.map((s, i) => (i === idx ? next : s));
            setState({ ...state, scenarios: newScenarios });
          }}
          onChangeActiveKey={(k) => setState({ ...state, scenarioKey: k })}
        />

        <section className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">
              Cumulative cost ({activeScenario.label.toLowerCase()} energy)
            </h2>
            <div className="text-[11px] text-muted">
              {fmtInt(monthlyMiles(driving))} mi / mo · 36-month lease
            </div>
          </div>
          {headline && (
            <div className="mt-2 text-sm text-accent">
              {headline.vehicleName} saves{" "}
              <span className="font-semibold">{fmtMoney(headline.delta)}</span>{" "}
              vs BMW 430i over 3 years.
            </div>
          )}
          <div className="mt-3">
            <TcoChart vehicles={vehicles} results={results} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Vehicles</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const ids = vehicles.map((v) => v.id);
                  setState({
                    ...state,
                    vehicles: [...vehicles, makeBlankVehicle(ids)],
                  });
                }}
                className="rounded-md border border-line bg-panel2 px-3 py-1.5 text-xs hover:border-muted"
              >
                + Add vehicle
              </button>
              <button
                type="button"
                onClick={() => {
                  // Restore the original 3-vehicle defaults; preserve driving / scenarios.
                  setState({
                    ...state,
                    vehicles: DEFAULT_VEHICLES.map((v) => ({ ...v })),
                  });
                }}
                className="rounded-md border border-line bg-panel2 px-3 py-1.5 text-xs text-muted hover:border-muted"
              >
                Reset vehicles
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((v, idx) => {
              const r = results[idx];
              return (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  result={r}
                  baselineResult={baseline}
                  scenario={activeScenario}
                  driving={driving}
                  onChange={(next) => {
                    const nextList = vehicles.map((x, i) =>
                      i === idx ? next : x,
                    );
                    setState({ ...state, vehicles: nextList });
                  }}
                  onRemove={
                    vehicles.length > 1
                      ? () =>
                          setState({
                            ...state,
                            vehicles: vehicles.filter((_, i) => i !== idx),
                          })
                      : undefined
                  }
                />
              );
            })}
          </div>
        </section>

        <ComparisonTable
          vehicles={vehicles}
          results={results}
          scenarioLabel={activeScenario.label}
        />

        <footer className="pb-8 pt-4 text-center text-[11px] text-muted">
          Calc:{" "}
          <code className="text-muted">
            monthly = lease + miles/MPG × $gas (or miles × 33.7/MPGe × $/kWh) +
            insurance + maint/12 + overage
          </code>
        </footer>
      </div>
    </div>
  );
}

function ComparisonTable({
  vehicles,
  results,
  scenarioLabel,
}: {
  vehicles: Vehicle[];
  results: ReturnType<typeof computeVehicleResult>[];
  scenarioLabel: string;
}) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">
          Monthly cost breakdown ({scenarioLabel.toLowerCase()} energy)
        </h2>
        <div className="text-[11px] text-muted">All figures in USD</div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="py-2 pr-3">Vehicle</th>
              <th className="py-2 pr-3 text-right">Lease</th>
              <th className="py-2 pr-3 text-right">Energy</th>
              <th className="py-2 pr-3 text-right">Ins.</th>
              <th className="py-2 pr-3 text-right">Maint.</th>
              <th className="py-2 pr-3 text-right">Overage</th>
              <th className="py-2 pr-3 text-right">Monthly</th>
              <th className="py-2 text-right">3-yr total</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v, i) => {
              const r = results[i];
              return (
                <tr key={v.id} className="border-t border-line">
                  <td className="py-2 pr-3">
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ background: v.color }}
                    />
                    {v.shortName}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {fmtMoney(r.monthly.lease)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {fmtMoney(r.monthly.fuel)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {fmtMoney(r.monthly.insurance)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {fmtMoney(r.monthly.maintenance)}
                  </td>
                  <td
                    className={`py-2 pr-3 text-right font-mono ${
                      r.monthly.overage > 0 ? "text-warn" : ""
                    }`}
                  >
                    {fmtMoney(r.monthly.overage)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono font-semibold">
                    {fmtMoney(r.monthly.total)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {fmtMoney(r.threeYearTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
