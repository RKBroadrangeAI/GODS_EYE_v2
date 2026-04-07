import { requireAuth } from "@/lib/auth";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getBrandPerformanceM2MData, parseEntityFilter } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPeopleMap } from "@/lib/analytics";
import { getBrandIcon } from "@/lib/brand-icons";
import { parseComparisonParams } from "@/lib/comparison";
import { ComparisonBanner } from "@/components/comparison-banner";
import { DeltaIndicator } from "@/components/delta-indicator";
import { ComparisonBarChart } from "@/components/comparison-bar-chart";
import Link from "next/link";

export default async function BrandPerfM2MPage({
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

  const [rows, people] = await Promise.all([
    getBrandPerformanceM2MData(month, year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  // Comparison data
  let prevMap = new Map<string, (typeof rows)[0]>();
  if (comp.isComparing) {
    const cm = comp.compareMonth ?? month;
    const cy = comp.compareYear ?? year;
    const prevRows = await getBrandPerformanceM2MData(cm, cy, filter);
    for (const r of prevRows) prevMap.set(`${r.brand}-${r.condition}`, r);
  }

  /* Aggregate GP by brand (collapse condition) for chart */
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const brandGpCurrent = new Map<string, number>();
  const brandGpPrev = new Map<string, number>();
  for (const r of rows) brandGpCurrent.set(r.brand, (brandGpCurrent.get(r.brand) ?? 0) + r.gp);
  if (comp.isComparing) {
    for (const r of rows) {
      const prev = prevMap.get(`${r.brand}-${r.condition}`);
      if (prev) brandGpPrev.set(r.brand, (brandGpPrev.get(r.brand) ?? 0) + prev.gp);
    }
  }
  const chartItems = comp.isComparing
    ? Array.from(brandGpCurrent.entries())
        .map(([brand, gp]) => ({
          label: brand,
          current: gp,
          previous: brandGpPrev.get(brand) ?? 0,
        }))
        .filter((i) => i.current !== 0 || i.previous !== 0)
    : [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">BRAND PERF M2M</h1>
          <p className="text-sm text-zinc-500">Brand month-over-month snapshot.</p>
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
      {chartItems.length > 0 && (
        <ComparisonBarChart
          items={chartItems}
          currentLabel={`${monthNames[month - 1]} ${year}`}
          previousLabel={`${monthNames[(comp.compareMonth ?? month) - 1]} ${comp.compareYear ?? year}`}
          title="Gross Profit by Brand"
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Month {month} / {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Brand", "Condition", "% Of GP", "% Of Units", "Revenue", "GP", "Count", "Markup", "Ave. Aging"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const prev = prevMap.get(`${row.brand}-${row.condition}`);
                return (
                  <TableRow key={`${row.brand}-${row.condition}`}>
                    <TableCell><Link href={`/app/sales-detail?brand=${encodeURIComponent(row.brand)}`} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"><span>{getBrandIcon(row.brand)}</span> {row.brand}</Link></TableCell>
                    <TableCell>{row.condition}</TableCell>
                    <TableCell>{formatPercent(row.gpShare)}{prev && <DeltaIndicator current={row.gpShare} previous={prev.gpShare} />}</TableCell>
                    <TableCell>{formatPercent(row.unitsShare)}{prev && <DeltaIndicator current={row.unitsShare} previous={prev.unitsShare} />}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}{prev && <DeltaIndicator current={row.revenue} previous={prev.revenue} />}</TableCell>
                    <TableCell>{formatCurrency(row.gp)}{prev && <DeltaIndicator current={row.gp} previous={prev.gp} />}</TableCell>
                    <TableCell>{row.count}{prev && <DeltaIndicator current={row.count} previous={prev.count} />}</TableCell>
                    <TableCell>{formatPercent(row.markup)}{prev && <DeltaIndicator current={row.markup} previous={prev.markup} />}</TableCell>
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
