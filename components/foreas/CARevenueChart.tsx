"use client";

import { GlassCard } from "./GlassCard";
import { Eyebrow } from "./Eyebrow";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";

interface ChartDataPoint {
  week: string;
  revenue: number;
}

interface CARevenueChartProps {
  data?: ChartDataPoint[];
}

// Stub fallback — 12 dernières semaines
const STUB_DATA: ChartDataPoint[] = [
  { week: "S-12", revenue: 18.4 },
  { week: "S-11", revenue: 19.2 },
  { week: "S-10", revenue: 20.1 },
  { week: "S-9", revenue: 19.8 },
  { week: "S-8", revenue: 21.5 },
  { week: "S-7", revenue: 22.3 },
  { week: "S-6", revenue: 21.9 },
  { week: "S-5", revenue: 23.1 },
  { week: "S-4", revenue: 24.4 },
  { week: "S-3", revenue: 25.2 },
  { week: "S-2", revenue: 25.8 },
  { week: "S-1", revenue: 26.5 },
];

export function CARevenueChart({ data: dataProp }: CARevenueChartProps = {}) {
  const data = dataProp && dataProp.length > 0 ? dataProp : STUB_DATA;
  const total = data.reduce((acc, d) => acc + d.revenue, 0);
  const avgWeek = total / data.length;

  return (
    <GlassCard className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-lg">
        <div>
          <Eyebrow>Performance flotte</Eyebrow>
          <h3 className="mt-xxs text-h2 font-bold text-text-hero">
            CA flotte — 12 dernières semaines
          </h3>
          <p className="mt-xs text-caption text-text-tertiary">
            Moyenne {avgWeek.toFixed(1)} k€/sem · Total {total.toFixed(0)} k€
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8C52FF" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#8C52FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              stroke="rgba(255,255,255,0.45)"
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.45)"
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              tickFormatter={(v) => `${v}k€`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(11, 15, 30, 0.95)",
                border: "1px solid rgba(140, 82, 255, 0.4)",
                borderRadius: "12px",
                backdropFilter: "blur(12px)",
                color: "#fff",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value} k€`, "CA"]}
              labelStyle={{ color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}
              cursor={{ stroke: "rgba(140, 82, 255, 0.3)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#8C52FF"
              strokeWidth={2.5}
              fill="url(#violetGradient)"
              dot={false}
              activeDot={{ r: 5, fill: "#8C52FF", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
