import { requireAuth } from "@/lib/auth";
import { getOverallSalesData, parseEntityFilter } from "@/lib/dashboard-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getPeopleMap } from "@/lib/analytics";
import { parseComparisonParams } from "@/lib/comparison";
import { ComparisonBanner } from "@/components/comparison-banner";
import { DeltaIndicator } from "@/components/delta-indicator";
import { ComparisonBarChart } from "@/components/comparison-bar-chart";
import Link from "next/link";

type RowData = Awaited<ReturnType<typeof getOverallSalesData>>;

/* ── Reusable table for a single year ────────────────────────── */
function AssociateTable({
  yearLabel,
  data,
  prevMap,
  showDelta,
}: {
  yearLabel: number;
  data: RowData;
  prevMap?: Map<string, RowData["rows"][0]>;
  showDelta?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Year {yearLabel}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Sales Associate",
                "Gross Profit",
                "Units",
                "Revenue",
                "GP/PU",
                "Aging",
                "Margin",
                "Ave Price",
              ].map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => {
              const prev = showDelta ? prevMap?.get(row.salesAssociate) : undefined;
              return (
                <TableRow key={row.salesAssociate}>
                  <TableCell>
                    <Link
                      href={`/app/sales-detail?salesPerson=${encodeURIComponent(row.salesAssociate)}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {row.salesAssociate}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(row.grossProfit)}
                    {prev && <DeltaIndicator current={row.grossProfit} previous={prev.grossProfit} />}
                  </TableCell>
                  <TableCell>
                    {row.units}
                    {prev && <DeltaIndicator current={row.units} previous={prev.units} />}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(row.revenue)}
                    {prev && <DeltaIndicator current={row.revenue} previous={prev.revenue} />}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(row.gppu)}
                    {prev && <DeltaIndicator current={row.gppu} previous={prev.gppu} />}
                  </TableCell>
                  <TableCell>
                    {row.aging == null ? "—" : row.aging.toFixed(1)}
                    {prev && <DeltaIndicator current={row.aging} previous={prev.aging} />}
                  </TableCell>
                  <TableCell>
                    {formatPercent(row.margin)}
                    {prev && <DeltaIndicator current={row.margin} previous={prev.margin} />}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(row.avePrice)}
                    {prev && <DeltaIndicator current={row.avePrice} previous={prev.avePrice} />}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-zinc-50">
              <TableCell>Average</TableCell>
              <TableCell>{formatCurrency(data.average.grossProfit)}</TableCell>
              <TableCell>{data.average.units.toFixed(1)}</TableCell>
              <TableCell>{formatCurrency(data.average.revenue)}</TableCell>
              <TableCell>{formatCurrency(data.average.gppu)}</TableCell>
              <TableCell>{data.average.aging == null ? "—" : data.average.aging.toFixed(1)}</TableCell>
              <TableCell>{formatPercent(data.average.margin)}</TableCell>
              <TableCell>{formatCurrency(data.average.avePrice)}</TableCell>
            </TableRow>
            <TableRow className="bg-zinc-100 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell>{formatCurrency(data.totals.grossProfit)}</TableCell>
              <TableCell>{data.totals.units}</TableCell>
              <TableCell>{formatCurrency(data.totals.revenue)}</TableCell>
              <TableCell>{formatCurrency(data.totals.gppu)}</TableCell>
              <TableCell>—</TableCell>
              <TableCell>{formatPercent(data.totals.margin)}</TableCell>
              <TableCell>{formatCurrency(data.totals.avePrice)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── Page component ───────────────────────────────────────────── */

export default async function PerformanceByAssociatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const year = Number(params.year ?? 2026);
  const filter = parseEntityFilter(params);
  const comp = parseComparisonParams(params);

  const [data, people] = await Promise.all([
    getOverallSalesData(year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  /* Build delta map + side-by-side data when comparing */
  let prevData: RowData | null = null;
  const prevMap = new Map<string, RowData["rows"][0]>();
  if (comp.isComparing) {
    const cy = comp.compareYear ?? year;
    prevData = await getOverallSalesData(cy, filter);
    for (const r of prevData.rows) prevMap.set(r.salesAssociate, r);
  }

  /* Build chart data when comparing */
  const chartItems = comp.isComparing && prevData
    ? data.rows
        .map((r) => ({
          label: r.salesAssociate,
          current: r.grossProfit,
          previous: prevMap.get(r.salesAssociate)?.grossProfit ?? 0,
        }))
        .filter((i) => i.current !== 0 || i.previous !== 0)
    : [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">PERFORMANCE BY ASSOCIATE</h1>
          <p className="text-sm text-zinc-500">Individual sales associate performance metrics.</p>
        </div>
        <DashboardSelectForm
          withMonth={false}
          year={year}
          entityLabel="Sales Associate"
          entityParam="person"
          entityOptions={personOptions}
          entityValue={filter.personId}
          compareYear={comp.compareYear}
        />
      </div>
      <ComparisonBanner year={year} compareYear={comp.compareYear} isMonthly={false} />

      {comp.isComparing && prevData ? (
        <>
          <ComparisonBarChart
            items={chartItems}
            currentLabel={String(year)}
            previousLabel={String(comp.compareYear ?? year)}
            title="Gross Profit by Associate"
          />
          {/* ── Side-by-side tables ────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AssociateTable
              yearLabel={year}
              data={data}
              prevMap={prevMap}
              showDelta
            />
            <AssociateTable
              yearLabel={comp.compareYear ?? year}
              data={prevData}
            />
          </div>
        </>
      ) : (
        /* ── Single table (no comparison) ──────────────────── */
        <AssociateTable yearLabel={year} data={data} />
      )}
    </section>
  );
}
