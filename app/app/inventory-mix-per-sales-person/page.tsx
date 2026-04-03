import { requireAuth } from "@/lib/auth";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getInventoryMixPerSalespersonData } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function InventoryMixPerSalesPersonPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const month = Number(params.month ?? new Date().getMonth() + 1);
  const year = Number(params.year ?? 2026);
  const data = await getInventoryMixPerSalespersonData(month, year);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">INVENTORY MIX PER SALES PERSON</h1>
          <p className="text-sm text-zinc-500">Monthly inventory type pacing by salesperson.</p>
        </div>
        <DashboardSelectForm month={month} year={year} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Month {month} / {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Sales Person", "Inventory Type", "Gross Profit", "% of GP", "Pacing GP", "Units", "Pacing Units", "Revenue", "Pacing Revenue", "GP/PU", "Ave Aging", "Margin", "Ave Price"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, index) => (
                <TableRow key={`${row.salesPerson}-${row.inventoryType}-${index}`}>
                  <TableCell>{row.salesPerson}</TableCell>
                  <TableCell>{row.inventoryType}</TableCell>
                  <TableCell>{formatCurrency(row.gp)}</TableCell>
                  <TableCell>{formatPercent(row.gpShare)}</TableCell>
                  <TableCell>{formatCurrency(row.pacingGp)}</TableCell>
                  <TableCell>{row.units}</TableCell>
                  <TableCell>{row.pacingUnits == null ? "—" : row.pacingUnits.toFixed(1)}</TableCell>
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
