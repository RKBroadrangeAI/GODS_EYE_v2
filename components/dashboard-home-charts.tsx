"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { formatCurrency } from "@/lib/format";

const COLORS = [
  "#111827",
  "#2563eb",
  "#f97316",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#eab308",
  "#6366f1",
];

type ChartCardProps = {
  title: string;
  children: React.ReactNode;
};

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white shadow-sm">
      <p className="border-b border-zinc-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </p>
      <div className="flex-1 min-h-0 p-1">{children}</div>
    </div>
  );
}

function currencyTick(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export type DashboardHomeData = {
  kpis: {
    totalGP: number;
    totalUnits: number;
    totalRevenue: number;
    avgMargin: number | null;
  };
  salesByPerson: { name: string; gp: number; units: number }[];
  leadSources: { name: string; gp: number; count: number }[];
  brands: { name: string; gp: number; units: number }[];
  channels: { name: string; gp: number; count: number }[];
  inventoryTiers: { tier: string; count: number; gp: number }[];
  monthlyTrend: { month: string; gp: number; units: number }[];
};

export function DashboardHomeCharts({ data }: { data: DashboardHomeData }) {
  return (
    <div className="grid h-full grid-rows-[auto_1fr_1fr] gap-2">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-2">
        <KpiCard label="Total Gross Profit" value={formatCurrency(data.kpis.totalGP)} accent="text-emerald-600" />
        <KpiCard label="Total Units" value={String(data.kpis.totalUnits)} accent="text-blue-600" />
        <KpiCard label="Total Revenue" value={formatCurrency(data.kpis.totalRevenue)} accent="text-orange-600" />
        <KpiCard
          label="Avg Margin"
          value={data.kpis.avgMargin != null ? `${(data.kpis.avgMargin * 100).toFixed(1)}%` : "—"}
          accent="text-violet-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid min-h-0 grid-cols-3 gap-2">
        <ChartCard title="GP by Sales Associate">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.salesByPerson} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={currencyTick} tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="gp" fill="#111827" name="GP" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lead Sources">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, bottom: 0 }}>
              <Pie
                data={data.leadSources}
                dataKey="gp"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="75%"
                label={(props: PieLabelRenderProps) =>
                  `${String(props.name ?? "").slice(0, 8)} ${((Number(props.percent ?? 0)) * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={9}
              >
                {data.leadSources.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Brand Performance">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.brands.slice(0, 8)} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={0} angle={-30} textAnchor="end" height={40} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="gp" fill="#2563eb" name="GP" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid min-h-0 grid-cols-3 gap-2">
        <ChartCard title="Channels">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, bottom: 0 }}>
              <Pie
                data={data.channels}
                dataKey="gp"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="75%"
                label={(props: PieLabelRenderProps) =>
                  `${String(props.name ?? "").slice(0, 10)} ${((Number(props.percent ?? 0)) * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={9}
              >
                {data.channels.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inventory Tiers">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.inventoryTiers} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" tick={{ fontSize: 8 }} interval={0} angle={-20} textAnchor="end" height={36} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="gp" fill="#f97316" name="GP" radius={[3, 3, 0, 0]} />
              <Bar dataKey="count" fill="#10b981" name="Units" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Trend (YTD)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyTrend} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="gp" fill="#111827" name="GP" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-2 py-2 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}
