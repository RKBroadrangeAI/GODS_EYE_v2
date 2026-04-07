"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ComparisonChartItem = {
  label: string;
  current: number;
  previous: number;
};

interface ComparisonBarChartProps {
  /** Chart data — one entry per category/label */
  items: ComparisonChartItem[];
  /** Current period label, e.g. "2026" or "Mar 2026" */
  currentLabel: string;
  /** Comparison period label, e.g. "2025" or "Mar 2025" */
  previousLabel: string;
  /** Card title shown above the chart */
  title?: string;
  /** Format function for values (default: plain number) */
  formatValue?: (v: number) => string;
  /** Bar color for the current period */
  currentColor?: string;
  /** Bar color for the comparison period */
  previousColor?: string;
}

const defaultFormat = (v: number) =>
  v >= 1000 || v <= -1000
    ? `$${(v / 1000).toFixed(0)}k`
    : `$${v.toLocaleString()}`;

export function ComparisonBarChart({
  items,
  currentLabel,
  previousLabel,
  title = "Gross Profit Comparison",
  formatValue = defaultFormat,
  currentColor = "#22c55e",
  previousColor = "#94a3b8",
}: ComparisonBarChartProps) {
  if (!items.length) return null;

  /* Filter out rows where both values are 0 for a cleaner chart */
  const filtered = items.filter((i) => i.current !== 0 || i.previous !== 0);
  if (!filtered.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, filtered.length * 40)}>
          <BarChart
            data={filtered}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: any) => formatValue(Number(v))}
              fontSize={11}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              fontSize={11}
              tick={{ fill: "#374151" }}
            />
            <Tooltip
              formatter={(v: any) => formatValue(Number(v))}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend />
            <Bar
              dataKey="current"
              name={currentLabel}
              fill={currentColor}
              radius={[0, 4, 4, 0]}
              barSize={16}
            />
            <Bar
              dataKey="previous"
              name={previousLabel}
              fill={previousColor}
              radius={[0, 4, 4, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
