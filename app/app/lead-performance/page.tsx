import { requireAuth } from "@/lib/auth";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getLeadPerformanceAnnualData } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function LeadPerformanceAnnualPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const year = Number(params.year ?? 2024);
  const rows = await getLeadPerformanceAnnualData(year);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">LEAD PERFORMANCE</h1>
          <p className="text-sm text-zinc-500">Annual lead source breakdown.</p>
        </div>
        <DashboardSelectForm withMonth={false} year={year} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Year {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Lead Source", "% Of Sales", "Revenue", "GP", "Count", "Ave. Margin", "Ave. Aging"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.source}>
                  <TableCell>{row.source}</TableCell>
                  <TableCell>{formatPercent(row.salesShare)}</TableCell>
                  <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.gp)}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{formatPercent(row.margin)}</TableCell>
                  <TableCell>{row.aging == null ? "—" : row.aging.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
