import { requireAuth } from "@/lib/auth";
import { getInPersonRemoteData, parseEntityFilter } from "@/lib/dashboard-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPeopleMap } from "@/lib/analytics";
import { parseComparisonParams } from "@/lib/comparison";
import { ComparisonBanner } from "@/components/comparison-banner";
import { DeltaIndicator } from "@/components/delta-indicator";
import Link from "next/link";

export default async function PerformanceByChannelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const month = Number(params.month ?? new Date().getMonth() + 1);
  const year = Number(params.year ?? 2026);
  const filter = parseEntityFilter(params);
  const comp = parseComparisonParams(params);

  const [data, people] = await Promise.all([
    getInPersonRemoteData(month, year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  let prevMap = new Map<string, (typeof data.rows)[0]>();
  let prevTotals: typeof data.totals | null = null;
  if (comp.isComparing) {
    const cm = comp.compareMonth ?? month;
    const cy = comp.compareYear ?? year;
    const prevData = await getInPersonRemoteData(cm, cy, filter);
    for (const r of prevData.rows) prevMap.set(r.category, r);
    prevTotals = prevData.totals;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">PERFORMANCE BY CHANNEL</h1>
          <p className="text-sm text-zinc-500">Performance analysis across sales channels.</p>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Total GP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.totals.totalGp)}{prevTotals && <DeltaIndicator current={data.totals.totalGp} previous={prevTotals.totalGp} />}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Total Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totals.totalCount}{prevTotals && <DeltaIndicator current={data.totals.totalCount} previous={prevTotals.totalCount} />}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Average GP/Deal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(data.totals.totalGp / Math.max(1, data.totals.totalCount))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Month {month} / {year} — Channel Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Channel", "Gross Profit", "Count", "% of Deals", "% of GP", "GPPU"].map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const prev = prevMap.get(row.category);
                return (
                  <TableRow key={row.category}>
                    <TableCell><Link href={`/app/sales-detail?channel=${encodeURIComponent(row.category)}`} className="text-blue-600 hover:underline font-medium">{row.category}</Link></TableCell>
                    <TableCell>{formatCurrency(row.gp)}{prev && <DeltaIndicator current={row.gp} previous={prev.gp} />}</TableCell>
                    <TableCell>{row.count}{prev && <DeltaIndicator current={row.count} previous={prev.count} />}</TableCell>
                    <TableCell>{formatPercent(row.dealsShare)}{prev && <DeltaIndicator current={row.dealsShare} previous={prev.dealsShare} />}</TableCell>
                    <TableCell>{formatPercent(row.gpShare)}{prev && <DeltaIndicator current={row.gpShare} previous={prev.gpShare} />}</TableCell>
                    <TableCell>{formatCurrency(row.gppu)}{prev && <DeltaIndicator current={row.gppu} previous={prev.gppu} />}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-zinc-100 font-semibold">
                <TableCell>TOTAL</TableCell>
                <TableCell>{formatCurrency(data.totals.totalGp)}</TableCell>
                <TableCell>{data.totals.totalCount}</TableCell>
                <TableCell>{formatPercent(1)}</TableCell>
                <TableCell>{formatPercent(1)}</TableCell>
                <TableCell>{formatCurrency(data.totals.totalGp / Math.max(1, data.totals.totalCount))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
