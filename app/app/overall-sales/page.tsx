import { requireAuth } from "@/lib/auth";
import { getOverallSalesData } from "@/lib/dashboard-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardSelectForm } from "@/components/dashboard-select-form";

export default async function OverallSalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const year = Number(params.year ?? 2026);

  const data = await getOverallSalesData(year);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">OVERALL SALES</h1>
          <p className="text-sm text-zinc-500">Annual sales performance by associate.</p>
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
                  <TableCell>{row.salesAssociate}</TableCell>
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
