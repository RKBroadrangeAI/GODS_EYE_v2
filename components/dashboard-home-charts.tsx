"use client";

import { useState } from "react";
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

const SECTION = {
  budgeting: "#22c55e",
  performance: "#f59e0b",
  channels: "#38bdf8",
  inventory: "#7b5296",
};

const BAR_COLORS = [
  "#22c55e", "#eab308", "#3b82f6", "#a855f7",
  "#ef4444", "#06b6d4", "#f97316", "#ec4899",
];

/* ── Data shape ───────────────────────────────────────────────── */
export type DashboardHomeData = {
  kpis: {
    totalGP: number;
    totalUnits: number;
    totalRevenue: number;
    avgMargin: number | null;
    avgPrice: number;
    avgAging: number | null;
    totalBudgetGP: number;
  };
  salesByPerson: { name: string; gp: number; units: number }[];
  leadSources: { name: string; gp: number; count: number }[];
  brands: { name: string; gp: number; units: number }[];
  channels: { name: string; gp: number; count: number }[];
  inventoryTiers: { tier: string; count: number; gp: number }[];
  monthlyTrend: {
    month: string;
    gp: number;
    units: number;
    revenue: number;
    gpBudget: number;
    revBudget: number;
    projectedGp: number;
  }[];
};

/* ── Formatters ───────────────────────────────────────────────── */
function compactNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "$" + (abs / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return sign + "$" + (abs / 1_000).toFixed(0) + "K";
  return sign + "$" + Math.round(abs);
}

/* ── Section card ─────────────────────────────────────────────── */
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

/* ── Year badge ───────────────────────────────────────────────── */
function YearBadge({ year, accent }: { year: number; accent: string }) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider"
      style={{ backgroundColor: accent }}
    >
      {year}
    </span>
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
          style={{ width: pct + "%", backgroundColor: color }}
        />
      </div>
      <span className="w-16 text-right font-semibold text-zinc-700 text-[10px]">
        {suffix ?? compactNum(value)}
      </span>
    </div>
  );
}

/* ── KPI card ─────────────────────────────────────────────────── */
function KpiBox({
  label,
  value,
  prevValue,
  accent,
}: {
  label: string;
  value: string;
  prevValue?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm min-w-0">
      <p className="text-[9px] uppercase tracking-wider text-zinc-400 whitespace-nowrap">{label}</p>
      <p className={"text-base font-bold whitespace-nowrap " + (accent ?? "text-zinc-800")}>{value}</p>
      {prevValue != null && (
        <p className="text-[9px] text-zinc-400 whitespace-nowrap">{prevValue}</p>
      )}
    </div>
  );
}

/* ── Budget view types ─────────────────────────────────────────── */
const BUDGET_VIEWS = [
  { key: "revBudget", label: "Revenue Budget" },
  { key: "gp", label: "Actual GP" },
  { key: "projectedGp", label: "Projected GP" },
  { key: "delta", label: "YTD Delta" },
] as const;

type BudgetViewKey = (typeof BUDGET_VIEWS)[number]["key"];

/* ── Side-by-side container ───────────────────────────────────── */
function SideBySide({
  left,
  right,
  year,
  prevYear,
  color,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  year: number;
  prevYear: number;
  color: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <div className="flex justify-center mb-1">
          <YearBadge year={year} accent={color} />
        </div>
        {left}
      </div>
      <div>
        <div className="flex justify-center mb-1">
          <YearBadge year={prevYear} accent="#94a3b8" />
        </div>
        {right}
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export function DashboardHomeCharts({
  data,
  prevData,
  year,
  prevYear,
}: {
  data: DashboardHomeData;
  prevData: DashboardHomeData;
  year: number;
  prevYear: number;
}) {
  const [budgetView, setBudgetView] = useState<BudgetViewKey>("gp");

  const maxBrandGp = Math.max(
    ...data.brands.slice(0, 5).map((b) => b.gp),
    ...prevData.brands.slice(0, 5).map((b) => b.gp),
    1,
  );
  const maxTierGp = Math.max(
    ...data.inventoryTiers.map((t) => t.gp),
    ...prevData.inventoryTiers.map((t) => t.gp),
    1,
  );
  const maxLeadGp = Math.max(
    ...data.leadSources.slice(0, 5).map((l) => l.gp),
    ...prevData.leadSources.slice(0, 5).map((l) => l.gp),
    1,
  );
  const maxTierCount = Math.max(
    ...data.inventoryTiers.map((x) => x.count),
    ...prevData.inventoryTiers.map((x) => x.count),
    1,
  );
  const gpPerUnit = data.kpis.totalUnits > 0 ? data.kpis.totalGP / data.kpis.totalUnits : 0;
  const prevGpPerUnit = prevData.kpis.totalUnits > 0 ? prevData.kpis.totalGP / prevData.kpis.totalUnits : 0;

  /* Helper: budget rows for a dataset */
  function renderBudgetRows(d: DashboardHomeData) {
    return d.monthlyTrend.map((m) => {
      let value: number;
      let prefix = "";
      if (budgetView === "revBudget") value = m.revBudget;
      else if (budgetView === "gp") value = m.gp;
      else if (budgetView === "projectedGp") value = m.projectedGp;
      else {
        value = m.gp - m.gpBudget;
        prefix = value >= 0 ? "+" : "";
      }
      const colorCls =
        budgetView === "delta"
          ? value >= 0
            ? "text-green-600"
            : "text-red-500"
          : "text-zinc-800";
      return (
        <div key={m.month} className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-500 shrink-0" />
          <span className="text-[10px] font-bold text-zinc-600 w-7">{m.month}</span>
          <span className={"text-[10px] font-semibold " + colorCls}>
            {prefix}
            {formatCurrency(value)}
          </span>
        </div>
      );
    });
  }

  /* Merged monthly trend for overlay charts */
  const mergedTrend = data.monthlyTrend.map((m, i) => ({
    month: m.month,
    gp: m.gp,
    units: m.units,
    prevGp: prevData.monthlyTrend[i]?.gp ?? 0,
    prevUnits: prevData.monthlyTrend[i]?.units ?? 0,
  }));

  const noData = <p className="text-[10px] text-zinc-400 italic">No data</p>;

  /* Person GP chart data */
  const personChartData = data.salesByPerson.slice(0, 5).map((p) => {
    const prev = prevData.salesByPerson.find((pp) => pp.name === p.name);
    return { name: p.name, gp: p.gp, prevGp: prev?.gp ?? 0 };
  });

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* ── KPI Row ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-stretch gap-2 rounded-xl bg-zinc-100 px-3 py-2.5 shrink-0">
        <KpiBox
          label="Revenue"
          value={compactNum(data.kpis.totalRevenue)}
          prevValue={prevYear + ": " + compactNum(prevData.kpis.totalRevenue)}
          accent="text-zinc-800"
        />
        <KpiBox
          label="Gross Profit"
          value={compactNum(data.kpis.totalGP)}
          prevValue={prevYear + ": " + compactNum(prevData.kpis.totalGP)}
          accent="text-emerald-600"
        />
        <KpiBox
          label="Units"
          value={String(data.kpis.totalUnits)}
          prevValue={prevYear + ": " + String(prevData.kpis.totalUnits)}
          accent="text-blue-600"
        />
        <KpiBox
          label="Margin"
          value={
            data.kpis.avgMargin != null
              ? (data.kpis.avgMargin * 100).toFixed(1) + "%"
              : "\u2014"
          }
          prevValue={
            prevYear +
            ": " +
            (prevData.kpis.avgMargin != null
              ? (prevData.kpis.avgMargin * 100).toFixed(1) + "%"
              : "\u2014")
          }
          accent="text-orange-600"
        />
        <KpiBox
          label="GP/Unit"
          value={compactNum(gpPerUnit)}
          prevValue={prevYear + ": " + compactNum(prevGpPerUnit)}
          accent="text-violet-600"
        />
        <KpiBox
          label="Avg Price"
          value={compactNum(data.kpis.avgPrice)}
          prevValue={prevYear + ": " + compactNum(prevData.kpis.avgPrice)}
          accent="text-teal-600"
        />
        <KpiBox
          label="Avg Aging"
          value={data.kpis.avgAging != null ? Math.round(data.kpis.avgAging) + "d" : "\u2014"}
          prevValue={prevYear + ": " + (prevData.kpis.avgAging != null ? Math.round(prevData.kpis.avgAging) + "d" : "\u2014")}
          accent="text-amber-600"
        />
        <KpiBox
          label="GP Budget"
          value={compactNum(data.kpis.totalBudgetGP)}
          prevValue={prevYear + ": " + compactNum(prevData.kpis.totalBudgetGP)}
          accent="text-green-700"
        />
        <KpiBox
          label="Budget Var"
          value={(data.kpis.totalGP - data.kpis.totalBudgetGP >= 0 ? "+" : "") + compactNum(data.kpis.totalGP - data.kpis.totalBudgetGP)}
          prevValue={prevYear + ": " + ((prevData.kpis.totalGP - prevData.kpis.totalBudgetGP >= 0 ? "+" : "") + compactNum(prevData.kpis.totalGP - prevData.kpis.totalBudgetGP))}
          accent={data.kpis.totalGP - data.kpis.totalBudgetGP >= 0 ? "text-green-600" : "text-red-500"}
        />
        <KpiBox
          label="Units/Day"
          value={(data.kpis.totalUnits / Math.max(1, data.monthlyTrend.length * 30)).toFixed(1)}
          prevValue={
            prevYear +
            ": " +
            (prevData.kpis.totalUnits / Math.max(1, prevData.monthlyTrend.length * 30)).toFixed(1)
          }
          accent="text-sky-600"
        />
      </div>

      {/* ── Section cards grid ──────────────────────────────── */}
      <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">

        {/* ── BUDGETING ─────────────────────────────────────── */}
        <SectionCard title="BUDGETING" color={SECTION.budgeting}>
          <div className="flex flex-wrap gap-1">
            {BUDGET_VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setBudgetView(v.key)}
                className={
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors " +
                  (budgetView === v.key
                    ? "bg-green-500 text-white"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200")
                }
              >
                {v.label}
              </button>
            ))}
          </div>

          <SideBySide
            year={year}
            prevYear={prevYear}
            color={SECTION.budgeting}
            left={<div className="space-y-1">{renderBudgetRows(data)}</div>}
            right={<div className="space-y-1">{renderBudgetRows(prevData)}</div>}
          />

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">GP Over Time</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mergedTrend} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                <YAxis tickFormatter={compactNum} tick={{ fontSize: 8 }} width={40} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="gp" name={String(year)} fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="prevGp" name={String(prevYear)} fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">Units Over Time</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedTrend} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                <YAxis tick={{ fontSize: 8 }} width={30} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Line type="monotone" dataKey="units" name={String(year)} stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="prevUnits" name={String(prevYear)} stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* ── PERFORMANCE ───────────────────────────────────── */}
        <SectionCard title="PERFORMANCE" color={SECTION.performance}>
          <SideBySide
            year={year}
            prevYear={prevYear}
            color={SECTION.performance}
            left={
              <div className="space-y-1">
                {data.salesByPerson.slice(0, 4).map((p) => (
                  <div key={p.name} className="flex justify-between text-[10px]">
                    <span className="font-medium text-zinc-700 truncate">{p.name}</span>
                    <span className="font-bold text-zinc-800 shrink-0 ml-1">{compactNum(p.gp)}</span>
                  </div>
                ))}
              </div>
            }
            right={
              <div className="space-y-1">
                {prevData.salesByPerson.slice(0, 4).map((p) => (
                  <div key={p.name} className="flex justify-between text-[10px]">
                    <span className="font-medium text-zinc-700 truncate">{p.name}</span>
                    <span className="font-bold text-zinc-800 shrink-0 ml-1">{compactNum(p.gp)}</span>
                  </div>
                ))}
                {prevData.salesByPerson.length === 0 && noData}
              </div>
            }
          />

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">Sales Over Time</p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mergedTrend} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                <YAxis tickFormatter={compactNum} tick={{ fontSize: 8 }} width={40} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="gp" name={String(year)} fill="#111827" radius={[2, 2, 0, 0]} />
                <Bar dataKey="prevGp" name={String(prevYear)} fill="#94a3b8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">Channel Performance</p>
          <SideBySide
            year={year}
            prevYear={prevYear}
            color={SECTION.performance}
            left={
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
            }
            right={
              <div className="space-y-1">
                {prevData.leadSources.slice(0, 4).map((l, i) => (
                  <HorizBar
                    key={l.name}
                    label={l.name.slice(0, 10)}
                    value={l.gp}
                    max={maxLeadGp}
                    color={BAR_COLORS[i % BAR_COLORS.length]}
                  />
                ))}
                {prevData.leadSources.length === 0 && noData}
              </div>
            }
          />

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">GP by Person</p>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={personChartData} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 7 }} interval={0} />
                <YAxis hide />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 8 }} />
                <Bar dataKey="gp" name={String(year)} radius={[3, 3, 0, 0]}>
                  {data.salesByPerson.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={["#3b82f6", "#06b6d4", "#22c55e", "#f97316", "#ef4444"][i]} />
                  ))}
                </Bar>
                <Bar dataKey="prevGp" name={String(prevYear)} fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* ── CHANNELS ──────────────────────────────────────── */}
        <SectionCard title="CHANNELS" color={SECTION.channels}>
          <SideBySide
            year={year}
            prevYear={prevYear}
            color={SECTION.channels}
            left={
              <div className="space-y-2">
                {data.channels.map((c) => (
                  <div key={c.name} className="flex justify-between text-[10px]">
                    <span className="font-medium text-zinc-700">{c.name}</span>
                    <span className="font-bold text-zinc-800">{compactNum(c.gp)}</span>
                  </div>
                ))}
              </div>
            }
            right={
              <div className="space-y-2">
                {prevData.channels.map((c) => (
                  <div key={c.name} className="flex justify-between text-[10px]">
                    <span className="font-medium text-zinc-700">{c.name}</span>
                    <span className="font-bold text-zinc-800">{compactNum(c.gp)}</span>
                  </div>
                ))}
                {prevData.channels.length === 0 && noData}
              </div>
            }
          />

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">Sales by Channel</p>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <div className="flex justify-center mb-1">
                <YearBadge year={year} accent={SECTION.channels} />
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.channels}
                      dataKey="gp"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="35%"
                      outerRadius="65%"
                      label={(props: PieLabelRenderProps) => {
                        const pct = (Number(props.percent ?? 0) * 100).toFixed(0);
                        return String(props.name ?? "").slice(0, 8) + " " + pct + "%";
                      }}
                      labelLine={false}
                      fontSize={8}
                    >
                      {data.channels.map((_, i) => (
                        <Cell key={i} fill={["#4a80b5", "#22c55e", "#f97316", "#a855f7"][i % 4]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="flex justify-center mb-1">
                <YearBadge year={prevYear} accent="#94a3b8" />
              </div>
              <div className="h-32">
                {prevData.channels.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prevData.channels}
                        dataKey="gp"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="35%"
                        outerRadius="65%"
                        label={(props: PieLabelRenderProps) => {
                          const pct = (Number(props.percent ?? 0) * 100).toFixed(0);
                          return String(props.name ?? "").slice(0, 8) + " " + pct + "%";
                        }}
                        labelLine={false}
                        fontSize={8}
                      >
                        {prevData.channels.map((_, i) => (
                          <Cell key={i} fill={["#4a80b5", "#22c55e", "#f97316", "#a855f7"][i % 4]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[10px] text-zinc-400 italic">
                    No data
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-1">Monthly GP</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mergedTrend} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
                <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                <YAxis hide />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 8 }} />
                <Bar dataKey="gp" name={String(year)} fill="#4a80b5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="prevGp" name={String(prevYear)} fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* ── INVENTORY ─────────────────────────────────────── */}
        <SectionCard title="INVENTORY" color={SECTION.inventory}>
          <p className="text-[10px] font-bold uppercase text-zinc-400">Price Tiers</p>
          <SideBySide
            year={year}
            prevYear={prevYear}
            color={SECTION.inventory}
            left={
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
            }
            right={
              <div className="space-y-1">
                {prevData.inventoryTiers.slice(0, 5).map((t, i) => (
                  <HorizBar
                    key={t.tier}
                    label={t.tier}
                    value={t.gp}
                    max={maxTierGp}
                    color={["#3b82f6", "#06b6d4", "#22c55e", "#f97316", "#a855f7"][i % 5]}
                  />
                ))}
                {prevData.inventoryTiers.length === 0 && noData}
              </div>
            }
          />

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-2">Top Brands</p>
          <SideBySide
            year={year}
            prevYear={prevYear}
            color={SECTION.inventory}
            left={
              <div className="space-y-1">
                {data.brands.slice(0, 5).map((b, i) => (
                  <HorizBar
                    key={b.name}
                    label={getBrandIcon(b.name) + " " + b.name.slice(0, 8)}
                    value={b.gp}
                    max={maxBrandGp}
                    color={["#6d8f4e", "#8b6f3e", "#c25245", "#5a7eb5", "#8a5a9e"][i % 5]}
                  />
                ))}
              </div>
            }
            right={
              <div className="space-y-1">
                {prevData.brands.slice(0, 5).map((b, i) => (
                  <HorizBar
                    key={b.name}
                    label={getBrandIcon(b.name) + " " + b.name.slice(0, 8)}
                    value={b.gp}
                    max={maxBrandGp}
                    color={["#6d8f4e", "#8b6f3e", "#c25245", "#5a7eb5", "#8a5a9e"][i % 5]}
                  />
                ))}
                {prevData.brands.length === 0 && noData}
              </div>
            }
          />

          <p className="text-[10px] font-bold uppercase text-zinc-400 pt-2">Inventory</p>
          <SideBySide
            year={year}
            prevYear={prevYear}
            color={SECTION.inventory}
            left={
              <div className="space-y-1">
                {data.inventoryTiers.slice(0, 4).map((t, i) => (
                  <HorizBar
                    key={"inv-" + t.tier}
                    label={t.tier}
                    value={t.count}
                    max={maxTierCount}
                    color={["#22c55e", "#3b82f6", "#f97316", "#ef4444"][i % 4]}
                    suffix={formatCurrency(t.gp)}
                  />
                ))}
              </div>
            }
            right={
              <div className="space-y-1">
                {prevData.inventoryTiers.slice(0, 4).map((t, i) => (
                  <HorizBar
                    key={"inv-" + t.tier}
                    label={t.tier}
                    value={t.count}
                    max={maxTierCount}
                    color={["#22c55e", "#3b82f6", "#f97316", "#ef4444"][i % 4]}
                    suffix={formatCurrency(t.gp)}
                  />
                ))}
                {prevData.inventoryTiers.length === 0 && noData}
              </div>
            }
          />
        </SectionCard>
      </div>
    </div>
  );
}
