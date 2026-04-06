import { requireAuth } from "@/lib/auth";
import { getOverallSalesData, parseEntityFilter } from "@/lib/dashboard-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getPeopleMap } from "@/lib/analytics";
import Link from "next/link";

export default async function PerformanceByAssociatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const year = Number(params.year ?? 2026);
  const filter = parseEntityFilter(params);

  const [data, people] = await Promise.all([
    getOverallSalesData(year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

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
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Year {year}</CardTitle>
        </CardHeader>
        <CardContent>
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
                ].map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.salesAssociate}>
                  <TableCell><Link href={`/app/sales-detail?salesPerson=${encodeURIComponent(row.salesAssociate)}`} className="text-blue-600 hover:underline font-medium">{row.salesAssociate}</Link></TableCell>
                  <TableCell>{formatCurrency(row.grossProfit)}</TableCell>
                  <TableCell>{row.units}</TableCell>
                  <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.gppu)}</TableCell>
                  <TableCell>{row.aging == null ? "—" : row.aging.toFixed(1)}</TableCell>
                  <TableCell>{formatPercent(row.margin)}</TableCell>
                  <TableCell>{formatCurrency(row.avePrice)}</TableCell>
                </TableRow>
              ))}
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
    </section>
  );
}
