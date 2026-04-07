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
  LineChart,
  Line,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { formatCurrency } from "@/lib/format";
import { getBrandIcon } from "@/lib/brand-icons";

/* ── Colors matching mockup section headers ───────────────────── */
const SECTION = {
  budgeting: "#22c55e",
  performance: "#d06050",
  channels: "#4a80b5",
  inventory: "#7b5296",
};

const BAR_COLORS = ["#22c55e", "#eab308", "#3b82f6", "#a855f7", "#ef4444", "#06b6d4", "#f97316", "#ec4899"];

/* ── Data shape ───────────────────────────────────────────────── */
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

/* ── Formatters ───────────────────────────────────────────────── */
function compactNum(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

/* ── Section card wrapper matching mockup ─────────────────────── */
function SectionCard({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden shadow-md border border-zinc-100 min-h-0">
      <div
        className="px-4 py-2.5 text-white text-sm font-bold uppercase tracking-wider text-center shrink-0"
        style={{ backgroundColor: color }}
      >
        {title}
      </div>
      <div className="flex-1 bg-white p-3 space-y-3 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
}

/* ── Horizontal progress bar ──────────────────────────────────── */
function HorizBar({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-16 truncate text-zinc-600 font-medium">{label}</span>
      <div className="flex-1 h-3.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-16 text-right font-semibold text-zinc-700 text-[10px]">
        {suffix ?? compactNum(value)}
      </span>
    </div>
  );
}

/* ── KPI card ─────────────────────────────────────────────────── */
function KpiBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm min-w-0">
      <p className="text-[9px] uppercase tracking-wider text-zinc-400 whitespace-nowrap">{label}</p>
      <p className={`text-base font-bold whitespace-nowrap ${accent ?? "text-zinc-800"}`}>{value}</p>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export function DashboardHomeCharts({ data }: { data: DashboardHomeData }) {
  const maxBrandGp = Math.max(...data.brands.slice(0, 5).map((b) => b.gp), 1);
  const maxTierGp = Math.max(...data.inventoryTiers.map((t) => t.gp), 1);
  const maxLeadGp = Math.max(...data.leadSources.slice(0, 5).map((l) => l.gp), 1);
  const totalChannelGp = data.channels.reduce((s, c) => s + c.gp, 0);
  const gpPerUnit = data.kpis.totalUnits > 0 ? data.kpis.totalGP / data.kpis.totalUnits : 0;

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* KPI Row */}
      <div className="flex flex-wrap items-stretch gap-2 rounded-xl bg-zinc-100 px-3 py-2.5 shrink-0">
        <KpiBox label="Revenue" value={compactNum(data.kpis.totalRevenue)} accent="text-zinc-800" />
        <KpiBox label="Gross Profit" value={compactNum(data.kpis.totalGP)} accent="text-emerald-600" />
        <KpiBox label="Units" value={String(data.kpis.totalUnits)} accent="text-blue-600" />
        <KpiBox
          label="Margin"
          value={data.kpis.avgMargin != null ? `${(data.kpis.avgMargin * 100).toFixed(1)}%` : "—"}
          accent="text-orange-600"
        />
        <KpiBox label="GP/Unit" value={compactNum(gpPerUnit)} accent="text-violet-600" />
        <KpiBox
          label="Units/Day"
          value={(data.kpis.totalUnits / Math.max(1, data.monthlyTrend.length * 30)).toFixed(1)}
          accent="text-sky-600"
        />
      </div>

      {/* Section cards grid */}
      <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* ── BUDGETING ─────────────────────────────────────── */}
        <SectionCard title="BUDGETING" color={SECTION.budgeting}>
          <div className="space-y-1.5">
            {data.monthlyTrend.map((m) => (
              <div key={m.month} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-green-500 shrink-0" />
                <span className="text-xs font-bold text-zinc-600 w-10">{m.month}</span>
                <span className="text-xs font-semibold text-zinc-800">
                  {formatCurrency(m.gp)}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">
            Sales Over Time
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyTrend} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                <YAxis tickFormatter={compactNum} tick={{ fontSize: 8 }} width={40} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="gp" name="GP" radius={[3, 3, 0, 0]}>
                  {data.monthlyTrend.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">
            Units Over Time
          </p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyTrend} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                <YAxis tick={{ fontSize: 8 }} width={30} />
                <Tooltip />
                <Line type="monotone" dataKey="units" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* ── PERFORMANCE ───────────────────────────────────── */}
        <SectionCard title="PERFORMANCE" color={SECTION.performance}>
          <div className="space-y-1.5">
            {data.salesByPerson.slice(0, 4).map((p) => (
              <div key={p.name} className="flex justify-between text-xs">
                <span className="font-medium text-zinc-700 truncate">{p.name}</span>
                <span className="font-bold text-zinc-800 shrink-0 ml-2">
                  {formatCurrency(p.gp)}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">
            Sales Over Time
          </p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyTrend} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                <YAxis tickFormatter={compactNum} tick={{ fontSize: 8 }} width={40} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="gp" fill="#111827" name="GP" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">
            Channel Performance
          </p>
          <div className="space-y-1">
            {data.leadSources.slice(0, 4).map((l, i) => (
              <HorizBar
                key={l.name}
                label={l.name.slice(0, 10)}
                value={l.gp}
                max={maxLeadGp}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">
            Sales by Day
          </p>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.salesByPerson.slice(0, 5)} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 7 }} interval={0} />
                <YAxis hide />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="gp" radius={[3, 3, 0, 0]}>
                  {data.salesByPerson.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={["#3b82f6", "#06b6d4", "#22c55e", "#f97316", "#ef4444"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* ── CHANNELS ──────────────────────────────────────── */}
        <SectionCard title="CHANNELS" color={SECTION.channels}>
          <div className="space-y-2">
            {data.channels.map((c) => (
              <div key={c.name} className="flex justify-between text-xs">
                <span className="font-medium text-zinc-700">{c.name}</span>
                <span className="font-bold text-zinc-800">{formatCurrency(c.gp)}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">
            Sales by Channel
          </p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.channels}
                  dataKey="gp"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="70%"
                  label={(props: PieLabelRenderProps) => {
                    const pct = ((Number(props.percent ?? 0)) * 100).toFixed(0);
                    return `${String(props.name ?? "").slice(0, 10)} ${pct}%`;
                  }}
                  labelLine={false}
                  fontSize={9}
                >
                  {data.channels.map((_, i) => (
                    <Cell key={i} fill={["#4a80b5", "#22c55e", "#f97316", "#a855f7"][i % 4]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">
            Sales by Day
          </p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.monthlyTrend.slice(-7)}
                margin={{ left: 0, right: 4, top: 4, bottom: 4 }}
              >
                <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                <YAxis hide />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="gp" fill="#4a80b5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* ── INVENTORY ─────────────────────────────────────── */}
        <SectionCard title="INVENTORY" color={SECTION.inventory}>
          <p className="text-[10px] font-bold uppercase text-zinc-400">
            Price Tiers
          </p>
          <div className="space-y-1">
            {data.inventoryTiers.slice(0, 5).map((t, i) => (
              <HorizBar
                key={t.tier}
                label={t.tier}
                value={t.gp}
                max={maxTierGp}
                color={["#3b82f6", "#06b6d4", "#22c55e", "#f97316", "#a855f7"][i % 5]}
              />
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-2">
            Top Brands
          </p>
          <div className="space-y-1">
            {data.brands.slice(0, 5).map((b, i) => (
              <HorizBar
                key={b.name}
                label={`${getBrandIcon(b.name)} ${b.name.slice(0, 8)}`}
                value={b.gp}
                max={maxBrandGp}
                color={["#6d8f4e", "#8b6f3e", "#c25245", "#5a7eb5", "#8a5a9e"][i % 5]}
              />
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-2">
            Inventory
          </p>
          <div className="space-y-1">
            {data.inventoryTiers.slice(0, 4).map((t, i) => (
              <HorizBar
                key={`inv-${t.tier}`}
                label={t.tier}
                value={t.count}
                max={Math.max(...data.inventoryTiers.map((x) => x.count), 1)}
                color={["#22c55e", "#3b82f6", "#f97316", "#ef4444"][i % 4]}
                suffix={formatCurrency(t.gp)}
              />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
