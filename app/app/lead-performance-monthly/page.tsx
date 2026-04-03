import { requireAuth } from "@/lib/auth";
import { getLeadPerformanceMonthlyData } from "@/lib/dashboard-data";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function LeadPerformanceMonthlyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const month = Number(params.month ?? new Date().getMonth() + 1);
  const year = Number(params.year ?? 2026);

  const data = await getLeadPerformanceMonthlyData(month, year);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">LEAD PERFORMANCE Monthly</h1>
          <p className="text-sm text-zinc-500">Lead source pacing view using the TEAM PACING engine.</p>
        </div>
        <DashboardSelectForm month={month} year={year} />
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
                  <TableCell>{row.leadSource}</TableCell>
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
