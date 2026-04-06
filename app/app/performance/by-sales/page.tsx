import { requireAuth } from "@/lib/auth";
import { getOverallSalesData, parseEntityFilter } from "@/lib/dashboard-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getPeopleMap } from "@/lib/analytics";

export default async function PerformanceBySalesPage({
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">PERFORMANCE BY SALES</h1>
          <p className="text-sm text-zinc-500">Performance analysis by sales volume and revenue.</p>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.totals.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Total Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.totals.grossProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Total Units</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totals.units}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Overall Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(data.totals.margin)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Year {year} — Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Sales Associate",
                  "Revenue",
                  "Gross Profit",
                  "Units",
                  "GP/PU",
                  "Margin",
                  "Ave Price",
                  "Aging",
                ].map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.salesAssociate}>
                  <TableCell>{row.salesAssociate}</TableCell>
                  <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.grossProfit)}</TableCell>
                  <TableCell>{row.units}</TableCell>
                  <TableCell>{formatCurrency(row.gppu)}</TableCell>
                  <TableCell>{formatPercent(row.margin)}</TableCell>
                  <TableCell>{formatCurrency(row.avePrice)}</TableCell>
                  <TableCell>{row.aging == null ? "—" : row.aging.toFixed(1)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-zinc-100 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell>{formatCurrency(data.totals.revenue)}</TableCell>
                <TableCell>{formatCurrency(data.totals.grossProfit)}</TableCell>
                <TableCell>{data.totals.units}</TableCell>
                <TableCell>{formatCurrency(data.totals.gppu)}</TableCell>
                <TableCell>{formatPercent(data.totals.margin)}</TableCell>
                <TableCell>{formatCurrency(data.totals.avePrice)}</TableCell>
                <TableCell>—</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
