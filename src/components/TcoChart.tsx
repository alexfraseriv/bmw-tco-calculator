import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney } from "../calc";
import type { Vehicle, VehicleResult } from "../types";

interface Props {
  vehicles: Vehicle[];
  results: VehicleResult[];
}

export function TcoChart({ vehicles, results }: Props) {
  // Build rows: { month, [vehicleShortName]: cumulative$ }
  const rows: Array<Record<string, number>> = [];
  const months = results[0]?.cumulative.length ?? 0;
  for (let m = 0; m < months; m++) {
    const row: Record<string, number> = { month: m };
    for (const v of vehicles) {
      const r = results.find((x) => x.vehicleId === v.id);
      if (r) row[v.shortName] = Math.round(r.cumulative[m]);
    }
    rows.push(row);
  }
  const lastMonth = months > 0 ? months - 1 : 0;

  // End-of-line label: only render at the final data point so each vehicle's
  // 3-year total reads inline on the chart without needing a hover tooltip.
  // Recharts' LabelList content prop is loosely typed (x/y can be string
  // | number depending on layout). We coerce to number at the boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endValueLabel = (color: string) => (props: any) => {
    if (props.index !== lastMonth) return null;
    const v = Number(props.value) || 0;
    const x = Number(props.x) || 0;
    const y = Number(props.y) || 0;
    return (
      <text
        x={x + 6}
        y={y - 4}
        fill={color}
        fontSize={11}
        fontWeight={600}
        textAnchor="start"
      >
        {v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`}
      </text>
    );
  };

  return (
    <div className="h-[240px] w-full sm:h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 48, left: 4, bottom: 18 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => `${m}`}
            label={{
              value: "Months from start of lease",
              position: "insideBottom",
              offset: -10,
              fill: "#64748b",
              fontSize: 11,
            }}
          />
          <YAxis
            tickFormatter={(v) =>
              v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
            }
            width={56}
            label={{
              value: "Cumulative cost ($)",
              angle: -90,
              position: "insideLeft",
              offset: 16,
              fill: "#64748b",
              fontSize: 11,
              style: { textAnchor: "middle" },
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
              color: "#0f172a",
            }}
            labelStyle={{ color: "#64748b" }}
            formatter={(value) =>
              typeof value === "number" ? fmtMoney(value) : String(value)
            }
            labelFormatter={(m) => `Month ${m}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="plainline"
          />
          {vehicles.map((v) => (
            <Line
              key={v.id}
              type="monotone"
              dataKey={v.shortName}
              stroke={v.color}
              strokeWidth={2.5}
              dot={false}
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
