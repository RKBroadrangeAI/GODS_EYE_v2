import { requireAuth } from "@/lib/auth";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getLeadPerformanceM2MData, parseEntityFilter } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPeopleMap } from "@/lib/analytics";
import Link from "next/link";

export default async function LeadPerfM2MPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const month = Number(params.month ?? new Date().getMonth() + 1);
  const year = Number(params.year ?? 2024);
  const filter = parseEntityFilter(params);

  const [rows, people] = await Promise.all([
    getLeadPerformanceM2MData(month, year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">LEAD PERF M2M</h1>
          <p className="text-sm text-zinc-500">Lead performance month-to-month snapshot.</p>
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
          <CardTitle>Month {month} / {year}</CardTitle>
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
                  <TableCell><Link href={`/app/sales-detail?source=${encodeURIComponent(row.source)}`} className="text-blue-600 hover:underline font-medium">{row.source}</Link></TableCell>
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
