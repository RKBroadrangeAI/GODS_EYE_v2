"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { monthNames } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import Link from "next/link";

type SalesPerformancePayload = {
  month: number;
  year: number;
  header: {
    daysInMonth: number;
    today: string;
    startDay: string;
    daysPassed: number;
  };
  rows: Array<{
    salesAssociate: string;
    closedGp: number;
    cashedGp: number;
    gpBudget: number;
    pacingGp: number | null;
    overUnderGp: number | null;
    units: number;
    unitBudget: number;
    pacingUnits: number | null;
    overUnderUnits: number | null;
    revenue: number;
    pacingRevenue: number | null;
    gppu: number | null;
    averageAging: number | null;
    margin: number | null;
    averagePrice: number | null;
  }>;
  totals: Record<string, number | null>;
  average: Record<string, number | null>;
};

type PersonOption = { value: string; label: string };

export function SalesPerformanceDashboard({
  initialData,
  personOptions = [],
}: {
  initialData: SalesPerformancePayload;
  personOptions?: PersonOption[];
}) {
  const [data, setData] = useState(initialData);
  const [month, setMonth] = useState(initialData.month);
  const [person, setPerson] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchData(nextMonth: number, nextPerson: string) {
    setLoading(true);
    const params = new URLSearchParams({ month: String(nextMonth), year: "2026" });
    if (nextPerson) params.set("person", nextPerson);
    const response = await fetch(`/api/sales-performance?${params.toString()}`, {
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as SalesPerformancePayload;
      setData(payload);
    }

    setLoading(false);
  }

  function onMonthChange(nextMonth: number) {
    setMonth(nextMonth);
    fetchData(nextMonth, person);
  }

  function onPersonChange(nextPerson: string) {
    setPerson(nextPerson);
    fetchData(month, nextPerson);
  }

  const chartData = useMemo(
    () =>
      data.rows.map((row) => ({
        name: row.salesAssociate,
        actual: row.closedGp,
        pacing: row.pacingGp ?? 0,
      })),
    [data.rows],
  );

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>TEAM PACING — SALES PERFORMANCE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <Metric label="Month" value={monthNames[month - 1]} />
            <Metric label="Days In Month" value={String(data.header.daysInMonth)} />
            <Metric label="Today" value={data.header.today} />
            <Metric label="Start Day" value={data.header.startDay} />
            <Metric label="Days Passed" value={String(data.header.daysPassed)} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Total Closed GP" value={formatCurrency(Number(data.totals.closedGp ?? 0))} />
            <Metric label="Total Pacing GP" value={formatCurrency(Number(data.totals.pacingGp ?? 0))} />
            <Metric
              label="Total Over/Under"
              value={formatCurrency(Number(data.totals.overUnderGp ?? 0))}
              className={Number(data.totals.overUnderGp ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Month</label>
            <select
              className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
              value={month}
              onChange={(event) => onMonthChange(Number(event.target.value))}
            >
              {monthNames.map((monthName, index) => (
                <option key={monthName} value={index + 1}>
                  {monthName}
                </option>
              ))}
            </select>

            {personOptions.length > 0 && (
              <>
                <label className="text-sm font-medium">Person</label>
                <select
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                  value={person}
                  onChange={(event) => onPersonChange(event.target.value)}
                >
                  <option value="">All People</option>
                  {personOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            {loading ? <span className="text-sm text-zinc-500">Loading...</span> : null}
          </div>

          <div className="h-72 rounded-md border border-zinc-200 bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="actual" fill="#111827" name="Closed GP" />
                <Bar dataKey="pacing" fill="#2563eb" name="Pacing GP" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <TeamPacingTable data={data} />
        </CardContent>
      </Card>
    </section>
  );
}

function TeamPacingTable({ data }: { data: SalesPerformancePayload }) {
  const columns = [
    "Sales Associate",
    "Closed GP",
    "Cashed GP",
    "GP Budget",
    "Pacing GP",
    "O/U GP",
    "Units",
    "Unit Budget",
    "Pacing Units",
    "O/U Units",
    "Revenue",
    "Pacing Revenue",
    "GP/PU",
    "Ave. Aging",
    "Margin",
    "Ave Price",
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={`${column}-${index}`}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row) => (
          <TableRow key={row.salesAssociate}>
            <TableCell><Link href={`/app/sales-detail?salesPerson=${encodeURIComponent(row.salesAssociate)}`} className="text-blue-600 hover:underline font-medium">{row.salesAssociate}</Link></TableCell>
            <TableCell>{formatCurrency(row.closedGp)}</TableCell>
            <TableCell>{formatCurrency(row.cashedGp)}</TableCell>
            <TableCell>{formatCurrency(row.gpBudget)}</TableCell>
            <TableCell>{formatCurrency(row.pacingGp)}</TableCell>
            <TableCell className={valueClass(row.overUnderGp)}>{formatCurrency(row.overUnderGp)}</TableCell>
            <TableCell>{row.units}</TableCell>
            <TableCell>{row.unitBudget.toFixed(0)}</TableCell>
            <TableCell>{row.pacingUnits == null ? "—" : row.pacingUnits.toFixed(1)}</TableCell>
            <TableCell className={valueClass(row.overUnderUnits)}>{row.overUnderUnits == null ? "—" : row.overUnderUnits.toFixed(1)}</TableCell>
            <TableCell>{formatCurrency(row.revenue)}</TableCell>
            <TableCell>{formatCurrency(row.pacingRevenue)}</TableCell>
            <TableCell>{formatCurrency(row.gppu)}</TableCell>
            <TableCell>{row.averageAging == null ? "—" : row.averageAging.toFixed(1)}</TableCell>
            <TableCell>{formatPercent(row.margin)}</TableCell>
            <TableCell>{formatCurrency(row.averagePrice)}</TableCell>
          </TableRow>
        ))}

        <FooterRow label="Average" data={data.average} />
        <FooterRow label="Total" data={data.totals} isTotal />
      </TableBody>
    </Table>
  );
}

function FooterRow({
  label,
  data,
  isTotal,
}: {
  label: string;
  data: Record<string, number | null>;
  isTotal?: boolean;
}) {
  return (
    <TableRow className={isTotal ? "bg-zinc-100 font-semibold" : "bg-zinc-50"}>
      <TableCell>{label}</TableCell>
      <TableCell>{formatCurrency(data.closedGp)}</TableCell>
      <TableCell>{formatCurrency(data.cashedGp)}</TableCell>
      <TableCell>{formatCurrency(data.gpBudget)}</TableCell>
      <TableCell>{formatCurrency(data.pacingGp)}</TableCell>
      <TableCell className={valueClass(data.overUnderGp)}>{formatCurrency(data.overUnderGp)}</TableCell>
      <TableCell>{(data.units ?? 0).toFixed(1)}</TableCell>
      <TableCell>{(data.unitBudget ?? 0).toFixed(1)}</TableCell>
      <TableCell>{(data.pacingUnits ?? 0).toFixed(1)}</TableCell>
      <TableCell className={valueClass(data.overUnderUnits)}>{(data.overUnderUnits ?? 0).toFixed(1)}</TableCell>
      <TableCell>{formatCurrency(data.revenue)}</TableCell>
      <TableCell>{formatCurrency(data.pacingRevenue)}</TableCell>
      <TableCell>{formatCurrency(data.gppu)}</TableCell>
      <TableCell>{data.averageAging == null ? "—" : data.averageAging.toFixed(1)}</TableCell>
      <TableCell>{formatPercent(data.margin)}</TableCell>
      <TableCell>{formatCurrency(data.averagePrice)}</TableCell>
    </TableRow>
  );
}

function valueClass(value: number | null) {
  if (value == null) return "";
  return value >= 0 ? "text-emerald-600" : "text-red-600";
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${className ?? ""}`}>{value}</p>
    </div>
  );
}
