import { requireAuth } from "@/lib/auth";
import { getInventoryTiersData } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function InventoryTiersPage() {
  await requireAuth();
  const data = await getInventoryTiersData(90);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">INVENTORY TIERS</h1>
        <p className="text-sm text-zinc-500">Sold inventory grouped by price brackets.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Start: {data.startDate} | End: {data.endDate} | Days: {data.totalDays}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Low", "High", "Count", "GP", "Revenue", "Margin", "GPPU", "Aging", "% of GP", "# day", "GP/Day"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={`${row.low}-${row.high}`}>
                  <TableCell>{row.low.toLocaleString()}</TableCell>
                  <TableCell>{row.high.toLocaleString()}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{formatCurrency(row.gp)}</TableCell>
                  <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  <TableCell>{formatPercent(row.margin)}</TableCell>
                  <TableCell>{formatCurrency(row.gppu)}</TableCell>
                  <TableCell>{row.aging == null ? "—" : row.aging.toFixed(1)}</TableCell>
                  <TableCell>{formatPercent(row.gpShare)}</TableCell>
                  <TableCell>{row.perDay.toFixed(2)}</TableCell>
                  <TableCell>{formatCurrency(row.gpPerDay)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
