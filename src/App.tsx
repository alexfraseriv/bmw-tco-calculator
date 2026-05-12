import { useMemo, useRef, useState } from "react";
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
import { computeTakeHome, type TakeHomeBreakdown } from "./taxes";
import type { EnergyScenario, Vehicle } from "./types";
import type { ChartView } from "./urlState";
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
    financingType: "lease",
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
  const {
    vehicles,
    driving,
    scenarios,
    scenarioKey,
    annualSalary,
    monthlyTakeHomeOverride,
    chartView,
  } = state;
  // Take-home: either the computed gross→net breakdown, or — when the user
  // has entered take-home directly — a synthetic breakdown that fans the
  // override out across the same fields the UI consumes. Keeps the rest of
  // the app's "% of take-home" math one-size-fits-all.
  const takeHome: TakeHomeBreakdown = useMemo(() => {
    if (monthlyTakeHomeOverride > 0) {
      const monthly = monthlyTakeHomeOverride;
      const annual = monthly * 12;
      return {
        gross: annual,
        federalTax: 0,
        oregonTax: 0,
        ficaSS: 0,
        ficaMedicare: 0,
        totalTax: 0,
        annualTakeHome: annual,
        monthlyTakeHome: monthly,
        effectiveRate: 0,
      };
    }
    return computeTakeHome(annualSalary);
  }, [annualSalary, monthlyTakeHomeOverride]);
  const usingTakeHomeOverride = monthlyTakeHomeOverride > 0;

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
        <ChartCard
          view={chartView}
          onChangeView={(v) => setState({ ...state, chartView: v })}
          scenarioLabel={activeScenario.label}
        >
          <TcoChart vehicles={vehicles} results={results} view={chartView} />
        </ChartCard>

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

      {/* ───────── COMPARISON TABLE (read-out, above the editable inputs) ───────── */}
      {/* Sortable side-by-side, sits between the hero and the editable
          controls. Headline number → sortable detail → controls below. */}
      <div className="mt-6">
        <ComparisonTable
          vehicles={vehicles}
          results={results}
          scenarioLabel={activeScenario.label}
        />
      </div>

      {/* ───────── EDIT / DETAIL ───────── */}
      <div ref={editRef} className="mt-8 scroll-mt-4 space-y-4">
        <SectionHeader
          kicker="Your inputs"
          title="Customize the numbers"
          body="Everything below is editable. The hero, chart, and comparison table above react in real time, and the URL captures your scenario so the share link reflects exactly what you see."
        />

        <DrivingPanel
          driving={driving}
          onChange={(d) => setState({ ...state, driving: d })}
        />

        <SalaryPanel
          annualSalary={annualSalary}
          takeHome={takeHome}
          monthlyTakeHomeOverride={monthlyTakeHomeOverride}
          usingOverride={usingTakeHomeOverride}
          onChangeSalary={(s) => setState({ ...state, annualSalary: s })}
          onChangeOverride={(n) =>
            setState({ ...state, monthlyTakeHomeOverride: n })
          }
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
  monthlyTakeHomeOverride,
  usingOverride,
  onChangeSalary,
  onChangeOverride,
  vehiclesMonthly,
}: {
  annualSalary: number;
  takeHome: TakeHomeBreakdown;
  monthlyTakeHomeOverride: number;
  usingOverride: boolean;
  onChangeSalary: (n: number) => void;
  onChangeOverride: (n: number) => void;
  vehiclesMonthly: Array<{ name: string; color: string; monthly: number }>;
}) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h2 className="text-base font-semibold">Salary &amp; take-home</h2>
        <div className="text-[11px] text-muted">
          {usingOverride
            ? "Take-home entered directly"
            : "Portland, OR · single filer · 2026 estimate"}
        </div>
      </div>

      {/* Mode toggle: gross-salary (compute tax) vs direct take-home entry. */}
      <div className="mt-3 inline-flex rounded-full border border-line bg-panel2 p-0.5 text-[12px]">
        <button
          type="button"
          onClick={() => onChangeOverride(0)}
          aria-pressed={!usingOverride}
          className={`rounded-full px-3 py-1 transition-colors ${
            !usingOverride
              ? "bg-panel font-semibold text-fg shadow-sm"
              : "text-muted hover:text-fg"
          }`}
        >
          Annual salary
        </button>
        <button
          type="button"
          onClick={() => {
            // Seed with the currently-computed take-home so the input
            // doesn't jump from $0 → user-typed when the user toggles in.
            const seed =
              monthlyTakeHomeOverride > 0
                ? monthlyTakeHomeOverride
                : Math.round(takeHome.monthlyTakeHome);
            onChangeOverride(Math.max(1, seed));
          }}
          aria-pressed={usingOverride}
          className={`rounded-full px-3 py-1 transition-colors ${
            usingOverride
              ? "bg-panel font-semibold text-fg shadow-sm"
              : "text-muted hover:text-fg"
          }`}
        >
          Take-home directly
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        {usingOverride ? (
          <NumberInput
            label="Monthly take-home"
            prefix="$"
            value={monthlyTakeHomeOverride}
            onChange={(n) => onChangeOverride(Math.max(0, n))}
            step={100}
            min={0}
          />
        ) : (
          <NumberInput
            label="Annual salary"
            prefix="$"
            value={annualSalary}
            onChange={onChangeSalary}
            step={1000}
            min={0}
          />
        )}
        <div className="flex flex-col rounded-md border border-line bg-panel2 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Monthly take-home
          </div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {fmtMoney(takeHome.monthlyTakeHome)}
          </div>
          {usingOverride ? (
            <div className="mt-1 text-[11px] text-muted">
              Entered directly — tax breakdown skipped
            </div>
          ) : (
            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-muted">
              <span>Federal + OR state + FICA</span>
              <span>
                Effective rate{" "}
                <span className="font-mono text-fg/70">
                  {(takeHome.effectiveRate * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col rounded-md border border-line bg-panel2 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Annual take-home
          </div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {fmtMoney(takeHome.annualTakeHome)}
          </div>
          {usingOverride ? (
            <div className="mt-1 text-[11px] text-muted">= monthly × 12</div>
          ) : (
            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-muted">
              <span>
                Total tax{" "}
                <span className="font-mono text-fg/70">
                  {fmtMoney(takeHome.totalTax)}
                </span>
              </span>
              <span className="font-mono text-[10.5px] text-muted">
                fed {fmtMoney(takeHome.federalTax)} · OR{" "}
                {fmtMoney(takeHome.oregonTax)} · FICA{" "}
                {fmtMoney(takeHome.ficaSS + takeHome.ficaMedicare)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">
          Monthly vehicle cost vs take-home
        </div>
        <div className="space-y-3">
          {vehiclesMonthly.map((v) => {
            const pct =
              takeHome.monthlyTakeHome > 0
                ? (v.monthly / takeHome.monthlyTakeHome) * 100
                : 0;
            return (
              <div key={v.name} className="text-sm">
                {/* Top row: name (left) + dollar (right). Bar lives on its
                    own row underneath with full width so it can breathe. */}
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: v.color }}
                    />
                    <span className="truncate text-[13px]">{v.name}</span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                    <span className="font-mono text-[13px] font-semibold">
                      {fmtMoney(v.monthly)}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded bg-panel2">
                  <div
                    className="absolute inset-y-0 left-0 rounded"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: v.color,
                      opacity: 0.75,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Chart card — wraps the chart with a magazine-style header (kicker +
// title + sublabel) and a pill-style view toggle. Keeps a generous bottom
// padding so the axis label / legend never crowd the card edge.
function ChartCard({
  view,
  onChangeView,
  scenarioLabel,
  children,
}: {
  view: ChartView;
  onChangeView: (v: ChartView) => void;
  scenarioLabel: string;
  children: React.ReactNode;
}) {
  const title =
    view === "cumulative" ? "Cumulative cost" : "Cost per month";
  const subtitle =
    view === "cumulative"
      ? "Total dollars out the door, accumulated through month 36"
      : "Actual spend each month — payment step-downs and cash events visible";
  return (
    <div className="rounded-2xl border border-line bg-panel px-3 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
            {scenarioLabel} energy · 0–36 mo
          </div>
          <h3 className="mt-0.5 text-base font-semibold leading-tight sm:text-[17px]">
            {title}
          </h3>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted sm:text-[12px]">
            {subtitle}
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Chart view"
          className="inline-flex shrink-0 rounded-full border border-line bg-panel2 p-0.5 text-[11px]"
        >
          <ChartViewTab
            label="Cumulative"
            active={view === "cumulative"}
            onClick={() => onChangeView("cumulative")}
          />
          <ChartViewTab
            label="Monthly"
            active={view === "monthly"}
            onClick={() => onChangeView("monthly")}
          />
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ChartViewTab({
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
      role="tab"
      aria-selected={active}
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

// Column metadata for the comparison table. Each column knows how to read
// its numeric value from a (vehicle, result) pair, so sort is a one-liner.
type ComparisonRow = {
  v: Vehicle;
  r: ReturnType<typeof computeVehicleResult>;
};
type SortKey =
  | "name"
  | "threeYear"
  | "leaseCash"
  | "energy"
  | "insurance"
  | "maintenance"
  | "overage"
  | "monthly";

interface ColumnDef {
  key: SortKey;
  label: string;
  short: string;
  // For sorting only — name uses a string compare, everything else numeric.
  numeric: boolean;
  value: (row: ComparisonRow) => number;
  format: (row: ComparisonRow) => string;
  // Highlight overage in warn color when nonzero.
  cellClass?: (row: ComparisonRow) => string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: "threeYear",
    label: "3-yr total",
    short: "3-yr",
    numeric: true,
    value: (row) => row.r.threeYearTotal,
    format: (row) => fmtMoney(row.r.threeYearTotal),
  },
  {
    key: "leaseCash",
    label: "Lease + cash",
    short: "Lease+cash",
    numeric: true,
    value: (row) =>
      row.r.monthly.lease +
      row.r.monthly.amortizedDown +
      row.r.monthly.opportunityCost,
    format: (row) =>
      fmtMoney(
        row.r.monthly.lease +
          row.r.monthly.amortizedDown +
          row.r.monthly.opportunityCost,
      ),
  },
  {
    key: "energy",
    label: "Energy",
    short: "Energy",
    numeric: true,
    value: (row) => row.r.monthly.fuel,
    format: (row) => fmtMoney(row.r.monthly.fuel),
  },
  {
    key: "insurance",
    label: "Ins.",
    short: "Ins.",
    numeric: true,
    value: (row) => row.r.monthly.insurance,
    format: (row) => fmtMoney(row.r.monthly.insurance),
  },
  {
    key: "maintenance",
    label: "Maint.",
    short: "Maint.",
    numeric: true,
    value: (row) => row.r.monthly.maintenance,
    format: (row) => fmtMoney(row.r.monthly.maintenance),
  },
  {
    key: "overage",
    label: "Overage",
    short: "Overage",
    numeric: true,
    value: (row) => row.r.monthly.overage,
    format: (row) => fmtMoney(row.r.monthly.overage),
    cellClass: (row) => (row.r.monthly.overage > 0 ? "text-warn" : ""),
  },
  {
    key: "monthly",
    label: "Monthly",
    short: "Monthly",
    numeric: true,
    value: (row) => row.r.monthly.total,
    format: (row) => fmtMoney(row.r.monthly.total),
  },
];

type SortDir = "asc" | "desc";

function ComparisonTable({
  vehicles,
  results,
  scenarioLabel,
}: {
  vehicles: Vehicle[];
  results: ReturnType<typeof computeVehicleResult>[];
  scenarioLabel: string;
}) {
  // Sort state is component-local — not URL-encoded; this is read-side
  // affordance, not part of the share payload.
  const [sortKey, setSortKey] = useState<SortKey>("threeYear");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const onHeaderClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Default direction: name sorts A→Z, numbers sort smallest-first
      // (cheapest first, which is also what the user wants for cost cols).
      setSortDir("asc");
    }
  };

  const rows: ComparisonRow[] = vehicles
    .map((v, i) => ({ v, r: results[i] }))
    .filter((row) => !!row.r);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortKey === "name") {
      copy.sort((a, b) =>
        a.v.shortName.localeCompare(b.v.shortName, undefined, {
          sensitivity: "base",
        }),
      );
    } else {
      const col = COLUMNS.find((c) => c.key === sortKey);
      if (col) copy.sort((a, b) => col.value(a) - col.value(b));
    }
    if (sortDir === "desc") copy.reverse();
    return copy;
    // rows is a freshly-built array each render, but eslint-react-hooks
    // can't see that. Depending on the inputs that actually drive it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, results, sortKey, sortDir]);

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
            {scenarioLabel} energy · per month
          </div>
          <h2 className="mt-0.5 text-base font-semibold sm:text-[17px]">
            Side-by-side breakdown
          </h2>
        </div>
        <div className="text-[11px] text-muted">
          Tap a header to sort
        </div>
      </div>

      {/* Phone: stacked cards. The full table demands ~560px just to read
          without claustrophobia, so on narrow screens we trade column
          density for full-width-friendly cards that surface 3-yr total
          first and the per-month detail below. */}
      <div className="mt-3 space-y-2 md:hidden">
        <MobileSortBar
          activeKey={sortKey}
          dir={sortDir}
          onChange={onHeaderClick}
        />
        {sortedRows.map((row) => (
          <MobileVehicleRow key={row.v.id} row={row} />
        ))}
      </div>

      {/* Tablet+: classic table, scrollable if it overflows but it
          shouldn't at md:+. Sticky vehicle column so the row label
          stays anchored if scrolling does occur. */}
      <div className="mt-3 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
              <SortableTh
                label="Vehicle"
                sortKey="name"
                activeKey={sortKey}
                dir={sortDir}
                onClick={onHeaderClick}
                align="left"
                sticky
              />
              {COLUMNS.map((c) => (
                <SortableTh
                  key={c.key}
                  label={c.label}
                  sortKey={c.key}
                  activeKey={sortKey}
                  dir={sortDir}
                  onClick={onHeaderClick}
                  align="right"
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.v.id} className="border-t border-line">
                <td className="sticky left-0 z-[1] bg-panel py-2 pr-3">
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ background: row.v.color }}
                  />
                  {row.v.shortName}
                </td>
                {COLUMNS.map((c) => (
                  <td
                    key={c.key}
                    className={`py-2 pr-3 text-right font-mono ${
                      c.key === "threeYear"
                        ? "font-semibold"
                        : c.key === "monthly"
                          ? "font-semibold"
                          : ""
                    } ${c.cellClass?.(row) ?? ""}`}
                  >
                    {c.format(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
  align,
  sticky,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align: "left" | "right";
  sticky?: boolean;
}) {
  const active = activeKey === sortKey;
  return (
    <th
      className={`py-2 pr-3 ${align === "right" ? "text-right" : "text-left"} ${
        sticky ? "sticky left-0 z-[2] bg-panel" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        aria-sort={
          active ? (dir === "asc" ? "ascending" : "descending") : "none"
        }
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors ${
          active ? "text-fg" : "text-muted hover:text-fg"
        }`}
      >
        <span>{label}</span>
        <SortIndicator active={active} dir={dir} />
      </button>
    </th>
  );
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      viewBox="0 0 10 12"
      width="8"
      height="10"
      aria-hidden="true"
      className={`shrink-0 ${active ? "opacity-100" : "opacity-30"}`}
    >
      <path
        d="M5 1 L9 5 L1 5 Z"
        fill="currentColor"
        opacity={active && dir === "asc" ? 1 : 0.35}
      />
      <path
        d="M5 11 L1 7 L9 7 Z"
        fill="currentColor"
        opacity={active && dir === "desc" ? 1 : 0.35}
      />
    </svg>
  );
}

function MobileSortBar({
  activeKey,
  dir,
  onChange,
}: {
  activeKey: SortKey;
  dir: SortDir;
  onChange: (k: SortKey) => void;
}) {
  // Phone-friendly sort picker. The whole table doesn't fit, so we
  // expose the sort separately as a horizontal scroller of chips. Each
  // chip toggles asc/desc on its column. Default cheapest-first stays
  // selected for "3-yr total" which is the most useful sort here.
  const chips: { key: SortKey; label: string }[] = [
    { key: "threeYear", label: "3-yr total" },
    { key: "monthly", label: "Monthly" },
    { key: "leaseCash", label: "Lease+cash" },
    { key: "energy", label: "Energy" },
    { key: "insurance", label: "Ins." },
    { key: "maintenance", label: "Maint." },
    { key: "overage", label: "Overage" },
    { key: "name", label: "Name" },
  ];
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((c) => {
        const active = c.key === activeKey;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              active
                ? "border-fg/60 bg-fg/[0.04] font-semibold text-fg"
                : "border-line bg-panel2 text-muted hover:text-fg"
            }`}
          >
            <span>{c.label}</span>
            <SortIndicator active={active} dir={dir} />
          </button>
        );
      })}
    </div>
  );
}

function MobileVehicleRow({ row }: { row: ComparisonRow }) {
  const { v, r } = row;
  return (
    <div className="rounded-xl border border-line bg-panel2/40 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: v.color }}
          />
          <span className="truncate text-[13px] font-medium">
            {v.shortName}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end leading-tight">
          <span className="font-mono text-[15px] font-semibold">
            {fmtMoney(r.threeYearTotal)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted">
            3-yr total
          </span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
        <MobileStat label="Monthly" value={fmtMoney(r.monthly.total)} bold />
        <MobileStat
          label="Lease+cash"
          value={fmtMoney(
            r.monthly.lease +
              r.monthly.amortizedDown +
              r.monthly.opportunityCost,
          )}
        />
        <MobileStat label="Energy" value={fmtMoney(r.monthly.fuel)} />
        <MobileStat label="Ins." value={fmtMoney(r.monthly.insurance)} />
        <MobileStat label="Maint." value={fmtMoney(r.monthly.maintenance)} />
        <MobileStat
          label="Overage"
          value={fmtMoney(r.monthly.overage)}
          warn={r.monthly.overage > 0}
        />
      </div>
    </div>
  );
}

function MobileStat({
  label,
  value,
  bold,
  warn,
}: {
  label: string;
  value: string;
  bold?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span
        className={`font-mono ${bold ? "font-semibold" : ""} ${
          warn ? "text-warn" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
