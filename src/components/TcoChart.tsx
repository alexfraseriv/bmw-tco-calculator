import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney } from "../calc";
import type { Vehicle, VehicleResult } from "../types";
import type { ChartView } from "../urlState";

interface Props {
  vehicles: Vehicle[];
  results: VehicleResult[];
  view: ChartView;
}

// Derive per-month spend by differencing the cumulative series, so the
// chart can run a "monthly cost over time" view without touching the
// model layer. cumulative[0] is always 0 → perMonth[0] is 0 too (no
// spend before month 1).
function deriveMonthly(cumulative: number[]): number[] {
  const out: number[] = new Array(cumulative.length);
  out[0] = 0;
  for (let i = 1; i < cumulative.length; i++) {
    out[i] = cumulative[i] - cumulative[i - 1];
  }
  return out;
}

function formatTickShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    const k = v / 1000;
    // Keep one decimal for sub-10k, none above so axis stays uncluttered.
    return abs >= 10_000 ? `$${Math.round(k)}k` : `$${k.toFixed(1)}k`;
  }
  return `$${Math.round(v)}`;
}

function formatLabelShort(v: number): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${Math.round(v)}`;
}

export function TcoChart({ vehicles, results, view }: Props) {
  const months = results[0]?.cumulative.length ?? 0;

  // Build per-vehicle series once, then assemble row-wise for Recharts.
  const seriesByVehicle = new Map<string, number[]>();
  for (const v of vehicles) {
    const r = results.find((x) => x.vehicleId === v.id);
    if (!r) continue;
    seriesByVehicle.set(
      v.shortName,
      view === "cumulative" ? r.cumulative : deriveMonthly(r.cumulative),
    );
  }

  const rows: Array<Record<string, number>> = [];
  for (let m = 0; m < months; m++) {
    const row: Record<string, number> = { month: m };
    for (const v of vehicles) {
      const s = seriesByVehicle.get(v.shortName);
      if (s) row[v.shortName] = Math.round(s[m]);
    }
    rows.push(row);
  }
  const lastMonth = months > 0 ? months - 1 : 0;

  // End-of-line label: only render at the final data point so each vehicle's
  // value reads inline on the chart without needing a hover tooltip. For
  // monthly view we still mark the last visible month's spend.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endValueLabel = (color: string) => (props: any) => {
    if (props.index !== lastMonth) return null;
    const v = Number(props.value) || 0;
    const x = Number(props.x) || 0;
    const y = Number(props.y) || 0;
    return (
      <text
        x={x + 6}
        y={y + 3}
        fill={color}
        fontSize={11}
        fontWeight={600}
        textAnchor="start"
      >
        {formatLabelShort(v)}
      </text>
    );
  };

  // Calculate domain so dips below zero are visible without clipping. Pull
  // explicit min/max from the data and pad ~6% so labels and lines breathe.
  let dataMin = 0;
  let dataMax = 0;
  for (const series of seriesByVehicle.values()) {
    for (const n of series) {
      if (n < dataMin) dataMin = n;
      if (n > dataMax) dataMax = n;
    }
  }
  const pad = Math.max(50, (dataMax - dataMin) * 0.06);
  // If there's no negative data, keep the baseline pinned to zero so the
  // chart visually anchors on the x-axis (avoids a floating origin).
  const yMin = dataMin < 0 ? Math.floor((dataMin - pad) / 100) * 100 : 0;
  const yMax = Math.ceil((dataMax + pad) / 100) * 100;

  const yAxisLabel =
    view === "cumulative" ? "Cumulative $" : "Monthly cost $";

  return (
    <div className="h-[260px] w-full sm:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 16, right: 64, left: 8, bottom: 28 }}
        >
          <defs>
            {vehicles.map((v) => (
              <linearGradient
                key={`grad-${v.id}`}
                id={`grad-${v.id}`}
                x1="0"
                x2="1"
                y1="0"
                y2="0"
              >
                <stop offset="0%" stopColor={v.color} stopOpacity={0.85} />
                <stop offset="100%" stopColor={v.color} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => `${m}`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickMargin={6}
            stroke="#cbd5e1"
            label={{
              value: "Months from start",
              position: "insideBottom",
              offset: -16,
              fill: "#94a3b8",
              fontSize: 10,
              letterSpacing: 1.2,
            }}
          />
          <YAxis
            tickFormatter={formatTickShort}
            width={62}
            domain={[yMin, yMax]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickMargin={6}
            stroke="#cbd5e1"
            label={{
              value: yAxisLabel,
              angle: -90,
              position: "insideLeft",
              offset: 18,
              fill: "#94a3b8",
              fontSize: 10,
              letterSpacing: 1.2,
              style: { textAnchor: "middle" },
            }}
          />
          {/* Zero line is meaningful in both views — for cumulative it's the
              break-even origin; for monthly it separates spend (above) from
              one-time cash inflow events (below). Drawn solid when negative
              data exists, dashed otherwise so it doesn't fight the grid. */}
          <ReferenceLine
            y={0}
            stroke={dataMin < 0 ? "#94a3b8" : "transparent"}
            strokeWidth={1}
            strokeDasharray="0"
          />
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 12,
              padding: "8px 10px",
              boxShadow:
                "0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -8px rgb(15 23 42 / 0.18)",
              color: "#0f172a",
            }}
            labelStyle={{
              color: "#64748b",
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
            itemStyle={{ padding: "2px 0" }}
            formatter={(value) =>
              typeof value === "number" ? fmtMoney(value) : String(value)
            }
            labelFormatter={(m) =>
              view === "cumulative" ? `Month ${m} · cumulative` : `Month ${m}`
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            iconType="plainline"
            iconSize={16}
          />
          {vehicles.map((v) => (
            <Line
              key={v.id}
              // Monotone is good for the cumulative curve, but it smooths
              // away the single-month spikes we need in the monthly view
              // (lease step-down, one-time cash events). Use linear there
              // so step-changes are honest.
              type={view === "cumulative" ? "monotone" : "linear"}
              dataKey={v.shortName}
              stroke={v.color}
              strokeWidth={2.25}
              dot={false}
              activeDot={{
                r: 4,
                stroke: "#ffffff",
                strokeWidth: 2,
                fill: v.color,
              }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey={v.shortName}
                content={endValueLabel(v.color)}
              />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
