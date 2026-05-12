import { useMemo, useRef } from "react";
import {
  computeVehicleResult,
  fmtInt,
  fmtMoney,
  monthlyMiles,
  annualMiles,
} from "./calc";
import { DEFAULT_VEHICLES } from "./defaults";
import { DrivingPanel } from "./components/DrivingPanel";
import { ScenariosPanel } from "./components/ScenariosPanel";
import { ShareBar } from "./components/ShareBar";
import { TcoChart } from "./components/TcoChart";
import { VehicleCard } from "./components/VehicleCard";
import { NumberInput } from "./components/NumberInput";
import { computeTakeHome } from "./taxes";
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
    downPayment: 0,
    apr: 7,
    efficiency: 100,
    isGas: false,
    monthlyInsurance: 200,
    annualMaintenance: 150,
    fuelType: "electric",
  };
}

export default function App() {
  const [state, setState] = useUrlState();
  const { vehicles, driving, scenarios, scenarioKey, annualSalary } = state;
  const takeHome = useMemo(() => computeTakeHome(annualSalary), [annualSalary]);

  const activeScenario: EnergyScenario =
    scenarios.find((s) => s.key === scenarioKey) ?? scenarios[1];

  const results = useMemo(
    () => vehicles.map((v) => computeVehicleResult(v, driving, activeScenario)),
    [vehicles, driving, activeScenario],
  );

  // Baseline = the first 430i present, or the first vehicle.
  const baseline =
    results.find((r) => r.vehicleId === "bmw430i") ?? results[0];
  const baselineVehicle =
    vehicles.find((v) => v.id === baseline?.vehicleId) ?? vehicles[0];

  const overage = annualMiles(driving) > driving.leaseAllowanceAnnual;

  // Cheapest 3-yr total = the "winner" surfaced in the hero. Falls back to
  // baseline if everything is identical so the hero never goes empty.
  const winner = useMemo(() => {
    if (results.length === 0) return null;
    let best = results[0];
    for (const r of results) if (r.threeYearTotal < best.threeYearTotal) best = r;
    return best;
  }, [results]);
  const winnerVehicle = winner
    ? vehicles.find((v) => v.id === winner.vehicleId) ?? vehicles[0]
    : null;
  const winnerSavings =
    baseline && winner && winner.vehicleId !== baseline.vehicleId
      ? baseline.threeYearTotal - winner.threeYearTotal
      : 0;

  // Smooth scroll to the editable section. Using a ref + scrollIntoView keeps
  // the URL clean (no #fragment) and feels right on iOS Safari.
  const editRef = useRef<HTMLDivElement | null>(null);
  const scrollToEdit = () => {
    editRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
      {/* ───────── HERO ───────── */}
      <section
        aria-label="Headline answer"
        className="flex flex-col gap-3"
        style={{ minHeight: "calc(100svh - 1.5rem)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
              3-year cost · Portland, OR · May 2026
            </div>
            <h1 className="mt-0.5 text-[22px] font-semibold leading-tight sm:text-2xl">
              Lease vs EV: which one wins?
            </h1>
          </div>
          <ShareBar />
        </div>

        {/* Verdict card — the punchy answer. */}
        {winnerVehicle && winner && baseline && baselineVehicle && (
          <div
            className="relative overflow-hidden rounded-2xl border bg-panel p-4 sm:p-5"
            style={{
              borderColor: winnerVehicle.color,
              boxShadow: `0 1px 0 ${winnerVehicle.color}22, 0 8px 24px -16px ${winnerVehicle.color}55`,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: winnerVehicle.color }}
            />
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
              {winner.vehicleId === baseline.vehicleId
                ? "Cheapest over 3 years"
                : `Cheapest vs ${baselineVehicle.shortName}`}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: winnerVehicle.color }}
              />
              <h2 className="truncate text-xl font-semibold sm:text-2xl">
                {winnerVehicle.name}
              </h2>
            </div>
            {winnerSavings > 0 ? (
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-[34px] font-semibold leading-none text-accent sm:text-[40px]">
                  {fmtMoney(winnerSavings)}
                </span>
                <span className="text-sm text-muted">
                  cheaper than {baselineVehicle.shortName} over 36 months
                </span>
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted">
                Lowest 3-year total in this scenario.
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-muted">
              <div>
                <span className="text-muted">Monthly</span>{" "}
                <span className="font-mono text-fg">
                  {fmtMoney(winner.monthly.total)}
                </span>
              </div>
              <div>
                <span className="text-muted">3-yr total</span>{" "}
                <span className="font-mono text-fg">
                  {fmtMoney(winner.threeYearTotal)}
                </span>
              </div>
              <div>
                <span className="text-muted">{activeScenario.label} energy</span>{" "}
                <span className="font-mono text-fg">
                  {winnerVehicle.isGas
                    ? `$${activeScenario.gasPrice.toFixed(2)}/gal`
                    : `$${activeScenario.electricityRate.toFixed(2)}/kWh`}
                </span>
              </div>
              <div>
                <span className="text-muted">Driving</span>{" "}
                <span className="font-mono text-fg">
                  {fmtInt(monthlyMiles(driving))} mi/mo
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Compact chart — the visual argument. */}
        <div className="rounded-2xl border border-line bg-panel p-3 sm:p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Cumulative cost</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {activeScenario.label} energy · 0–36 mo
            </span>
          </div>
          <div className="mt-1">
            <TcoChart vehicles={vehicles} results={results} />
          </div>
        </div>

        {/* Standings row — at-a-glance comparison. 2 cols on phone so 4
            vehicles fit cleanly without horizontal scroll. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {vehicles.map((v) => {
            const r = results.find((x) => x.vehicleId === v.id);
            if (!r) return null;
            const isWinner = winner?.vehicleId === v.id;
            return (
              <div
                key={v.id}
                className={`rounded-xl border bg-panel p-2.5 ${
                  isWinner ? "ring-1" : ""
                }`}
                style={{
                  borderColor: isWinner ? v.color : undefined,
                  ...(isWinner
                    ? ({ "--tw-ring-color": v.color } as React.CSSProperties)
                    : {}),
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: v.color }}
                  />
                  <span className="truncate text-[11px] font-medium">
                    {v.shortName}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[15px] font-semibold leading-tight">
                  {fmtMoney(r.threeYearTotal)}
                </div>
                <div className="font-mono text-[10px] text-muted">
                  {fmtMoney(r.monthly.total)}/mo
                </div>
              </div>
            );
          })}
        </div>

        {overage && (
          <div className="rounded-lg border border-warn/40 bg-warn/[0.06] px-3 py-2 text-[12px] text-warn">
            <strong className="font-semibold">Mileage gotcha:</strong>{" "}
            {fmtInt(annualMiles(driving))} mi/yr exceeds the{" "}
            {fmtInt(driving.leaseAllowanceAnnual)} mi cap — adds{" "}
            {fmtMoney(
              (annualMiles(driving) - driving.leaseAllowanceAnnual) *
                driving.overagePerMile *
                3,
            )}{" "}
            over 3 years on every lease.
          </div>
        )}

        <button
          type="button"
          onClick={scrollToEdit}
          className="group mx-auto mt-auto flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-fg shadow-sm transition-colors hover:border-muted"
        >
          Tweak your numbers
          <ChevronDownIcon className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
        </button>
      </section>

      {/* ───────── EDIT / DETAIL ───────── */}
      <div ref={editRef} className="mt-8 scroll-mt-4 space-y-4">
        <SectionHeader
          kicker="Your inputs"
          title="Customize the numbers"
          body="Everything below is editable. The hero and chart above react in real time, and the URL captures your scenario so the share link reflects exactly what you see."
        />

        <DrivingPanel
          driving={driving}
          onChange={(d) => setState({ ...state, driving: d })}
        />

        <SalaryPanel
          annualSalary={annualSalary}
          takeHome={takeHome}
          onChange={(s) => setState({ ...state, annualSalary: s })}
          vehiclesMonthly={results.map((r, i) => ({
            name: vehicles[i]?.shortName ?? "",
            color: vehicles[i]?.color ?? "#888",
            monthly: r.monthly.total,
          }))}
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

        {/* Work-travel reimbursement caveat — moved from top to here per the
            user's note that it's read-once context, not in-flight UI. */}
        <section className="rounded-xl border border-line bg-panel2/60 p-4 text-[13px] text-muted">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
            Notes
          </div>
          <p className="mt-2">
            <strong className="font-semibold text-fg">
              Work-travel reimbursement:
            </strong>{" "}
            work mileage gets reimbursed at the IRS rate (variable cost — fuel +
            per-mile wear), but the <em>lease payment itself is fixed</em>{" "}
            regardless of how you drive. Picking a more expensive lease costs the
            extra premium × 36 in pure out-of-pocket spend that reimbursement
            does not cover. Insurance and unreimbursed maintenance widen the gap.
          </p>
          <p className="mt-2 text-[12px]">
            Calc:{" "}
            <code className="text-fg/80">
              monthly = lease + miles/MPG × $gas (or miles × 33.7/MPGe × $/kWh) +
              insurance + maint/12 + overage
            </code>
          </p>
        </section>

        <footer className="pb-4 pt-2 text-center text-[11px] text-muted">
          All numbers persist in the URL. Math follows EPA MPGe (33.7 kWh/gal).
        </footer>
      </div>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border-t border-line pt-6">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
        {kicker}
      </div>
      <h2 className="mt-1 text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">{body}</p>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

function SalaryPanel({
  annualSalary,
  takeHome,
  onChange,
  vehiclesMonthly,
}: {
  annualSalary: number;
  takeHome: ReturnType<typeof computeTakeHome>;
  onChange: (n: number) => void;
  vehiclesMonthly: Array<{ name: string; color: string; monthly: number }>;
}) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Salary &amp; take-home</h2>
        <div className="text-[11px] text-muted">
          Portland, OR · single filer · 2026 estimate
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        <NumberInput
          label="Annual salary"
          prefix="$"
          value={annualSalary}
          onChange={onChange}
          step={1000}
          min={0}
        />
        <div className="rounded-md border border-line bg-panel2 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Monthly take-home
          </div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {fmtMoney(takeHome.monthlyTakeHome)}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Federal + OR state + FICA · effective rate{" "}
            {(takeHome.effectiveRate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-md border border-line bg-panel2 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Annual take-home
          </div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {fmtMoney(takeHome.annualTakeHome)}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Tax: {fmtMoney(takeHome.totalTax)} (fed {fmtMoney(takeHome.federalTax)}{" "}
            · OR {fmtMoney(takeHome.oregonTax)} · FICA{" "}
            {fmtMoney(takeHome.ficaSS + takeHome.ficaMedicare)})
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-muted">
          Monthly vehicle cost vs take-home
        </div>
        <div className="space-y-1.5">
          {vehiclesMonthly.map((v) => {
            const pct =
              takeHome.monthlyTakeHome > 0
                ? (v.monthly / takeHome.monthlyTakeHome) * 100
                : 0;
            return (
              <div key={v.name} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: v.color }}
                />
                <span className="w-32 shrink-0 truncate">{v.name}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded bg-panel2">
                  <div
                    className="absolute inset-y-0 left-0 rounded"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: v.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-mono text-[12px]">
                  {fmtMoney(v.monthly)} · {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
              <th className="py-2 pr-3 text-right">Lease + cash</th>
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
                    {fmtMoney(
                      r.monthly.lease +
                        r.monthly.amortizedDown +
                        r.monthly.opportunityCost,
                    )}
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
