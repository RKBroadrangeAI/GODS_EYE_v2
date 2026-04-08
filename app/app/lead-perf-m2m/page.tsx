import { requireAuth } from "@/lib/auth";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getLeadPerformanceM2MData, parseEntityFilter } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPeopleMap } from "@/lib/analytics";
import Link from "next/link";
import { getLeadIcon } from "@/lib/lead-icons";
import { parseComparisonParams } from "@/lib/comparison";
import { ComparisonBanner } from "@/components/comparison-banner";
import { DeltaIndicator } from "@/components/delta-indicator";

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
  const comp = parseComparisonParams(params);

  const [rows, people] = await Promise.all([
    getLeadPerformanceM2MData(month, year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  let prevMap = new Map<string, (typeof rows)[0]>();
  if (comp.isComparing) {
    const cm = comp.compareMonth ?? month;
    const cy = comp.compareYear ?? year;
    const prevRows = await getLeadPerformanceM2MData(cm, cy, filter);
    for (const r of prevRows) prevMap.set(r.source, r);
  }

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
          compareMonth={comp.compareMonth}
          compareYear={comp.compareYear}
        />
      </div>
      <ComparisonBanner month={month} year={year} compareMonth={comp.compareMonth} compareYear={comp.compareYear} />
      <Card>
        <CardHeader>
          <CardTitle>{monthNames[month - 1]} {year}</CardTitle>
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
              {rows.map((row) => {
                const prev = prevMap.get(row.source);
                return (
                  <TableRow key={row.source}>
                    <TableCell><Link href={`/app/sales-detail?source=${encodeURIComponent(row.source)}`} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"><span>{getLeadIcon(row.source)}</span> {row.source}</Link></TableCell>
                    <TableCell>{formatPercent(row.salesShare)}{prev && <DeltaIndicator current={row.salesShare} previous={prev.salesShare} />}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}{prev && <DeltaIndicator current={row.revenue} previous={prev.revenue} />}</TableCell>
                    <TableCell>{formatCurrency(row.gp)}{prev && <DeltaIndicator current={row.gp} previous={prev.gp} />}</TableCell>
                    <TableCell>{row.count}{prev && <DeltaIndicator current={row.count} previous={prev.count} />}</TableCell>
                    <TableCell>{formatPercent(row.margin)}{prev && <DeltaIndicator current={row.margin} previous={prev.margin} />}</TableCell>
                    <TableCell>{row.aging == null ? "—" : row.aging.toFixed(1)}{prev && prev.aging != null && row.aging != null && <DeltaIndicator current={row.aging} previous={prev.aging} />}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
