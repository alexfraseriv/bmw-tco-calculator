import {
  CartesianGrid,
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

  return (
    <div className="h-[320px] w-full sm:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => `${m}`}
            label={{
              value: "Months",
              position: "insideBottom",
              offset: -4,
              fill: "#94a3b8",
              fontSize: 11,
            }}
          />
          <YAxis
            tickFormatter={(v) =>
              v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
            }
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "#121826",
              border: "1px solid #1f2937",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#94a3b8" }}
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
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
