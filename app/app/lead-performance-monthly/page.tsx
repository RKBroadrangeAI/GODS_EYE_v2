import { requireAuth } from "@/lib/auth";
import { getLeadPerformanceMonthlyData, parseEntityFilter } from "@/lib/dashboard-data";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPeopleMap } from "@/lib/analytics";
import Link from "next/link";
import { getLeadIcon } from "@/lib/lead-icons";

export default async function LeadPerformanceMonthlyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const month = Number(params.month ?? new Date().getMonth() + 1);
  const year = Number(params.year ?? 2026);
  const filter = parseEntityFilter(params);

  const [data, people] = await Promise.all([
    getLeadPerformanceMonthlyData(month, year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">LEAD PERFORMANCE Monthly</h1>
          <p className="text-sm text-zinc-500">Lead source pacing view using the TEAM PACING engine.</p>
        </div>
        <DashboardSelectForm
          month={month}
          year={year}
          entityLabel="Sales Associate"
          entityParam="person"
          entityOptions={personOptions}
          entityValue={filter.personId}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            Days In Month: {data.header.daysInMonth} | Today: {data.header.today} | Start: {data.header.startDay} | Days Passed: {data.header.daysPassed}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Lead Source", "Gross Profit", "GP Budget", "Pacing GP", "Over/Under", "Units", "Unit Budget", "Pacing Units", "Over/Under", "Revenue", "Pacing Revenue", "GP/PU", "Ave Aging", "Margin", "Ave Price"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.leadSource}>
                  <TableCell><Link href={`/app/sales-detail?source=${encodeURIComponent(row.leadSource)}`} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"><span>{getLeadIcon(row.leadSource)}</span> {row.leadSource}</Link></TableCell>
                  <TableCell>{formatCurrency(row.gp)}</TableCell>
                  <TableCell>{formatCurrency(row.gpBudget)}</TableCell>
                  <TableCell>{formatCurrency(row.pacingGp)}</TableCell>
                  <TableCell className={row.overUnderGp != null && row.overUnderGp >= 0 ? "text-emerald-600" : "text-red-600"}>{formatCurrency(row.overUnderGp)}</TableCell>
                  <TableCell>{row.units}</TableCell>
                  <TableCell>{row.unitBudget.toFixed(1)}</TableCell>
                  <TableCell>{row.pacingUnits == null ? "—" : row.pacingUnits.toFixed(1)}</TableCell>
                  <TableCell className={row.overUnderUnits != null && row.overUnderUnits >= 0 ? "text-emerald-600" : "text-red-600"}>{row.overUnderUnits == null ? "—" : row.overUnderUnits.toFixed(1)}</TableCell>
                  <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.pacingRevenue)}</TableCell>
                  <TableCell>{formatCurrency(row.gppu)}</TableCell>
                  <TableCell>{row.aging == null ? "—" : row.aging.toFixed(1)}</TableCell>
                  <TableCell>{formatPercent(row.margin)}</TableCell>
                  <TableCell>{formatCurrency(row.avePrice)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-zinc-50">
                <TableCell>Average</TableCell>
                <TableCell>{formatCurrency(data.average.gp)}</TableCell>
                <TableCell>{formatCurrency(data.average.gpBudget)}</TableCell>
                <TableCell>{formatCurrency(data.average.pacingGp)}</TableCell>
                <TableCell className={data.average.overUnderGp >= 0 ? "text-emerald-600" : "text-red-600"}>{formatCurrency(data.average.overUnderGp)}</TableCell>
                <TableCell>{data.average.units.toFixed(1)}</TableCell>
                <TableCell>{data.average.unitBudget.toFixed(1)}</TableCell>
                <TableCell>{data.average.pacingUnits.toFixed(1)}</TableCell>
                <TableCell className={data.average.overUnderUnits >= 0 ? "text-emerald-600" : "text-red-600"}>{data.average.overUnderUnits.toFixed(1)}</TableCell>
                <TableCell>{formatCurrency(data.average.revenue)}</TableCell>
                <TableCell>{formatCurrency(data.average.pacingRevenue)}</TableCell>
                <TableCell>{formatCurrency(data.average.gppu)}</TableCell>
                <TableCell>{data.average.aging == null ? "—" : data.average.aging.toFixed(1)}</TableCell>
                <TableCell>{formatPercent(data.average.margin)}</TableCell>
                <TableCell>{formatCurrency(data.average.avePrice)}</TableCell>
              </TableRow>
              <TableRow className="bg-zinc-100 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell>{formatCurrency(data.totals.gp)}</TableCell>
                <TableCell>{formatCurrency(data.totals.gpBudget)}</TableCell>
                <TableCell>{formatCurrency(data.totals.pacingGp)}</TableCell>
                <TableCell className={data.totals.overUnderGp >= 0 ? "text-emerald-600" : "text-red-600"}>{formatCurrency(data.totals.overUnderGp)}</TableCell>
                <TableCell>{data.totals.units}</TableCell>
                <TableCell>{data.totals.unitBudget.toFixed(1)}</TableCell>
                <TableCell>{data.totals.pacingUnits.toFixed(1)}</TableCell>
                <TableCell className={data.totals.overUnderUnits >= 0 ? "text-emerald-600" : "text-red-600"}>{data.totals.overUnderUnits.toFixed(1)}</TableCell>
                <TableCell>{formatCurrency(data.totals.revenue)}</TableCell>
                <TableCell>{formatCurrency(data.totals.pacingRevenue)}</TableCell>
                <TableCell>{formatCurrency(data.totals.gppu)}</TableCell>
                <TableCell>—</TableCell>
                <TableCell>{formatPercent(data.totals.margin)}</TableCell>
                <TableCell>{formatCurrency(data.totals.avePrice)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
