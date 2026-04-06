import { requireAuth } from "@/lib/auth";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getInventoryMixPerSalespersonData, parseEntityFilter } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPeopleMap } from "@/lib/analytics";
import Link from "next/link";

export default async function InventoryMixPerSalesPersonPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const month = Number(params.month ?? new Date().getMonth() + 1);
  const year = Number(params.year ?? 2026);
  const filter = parseEntityFilter(params);

  const [data, people] = await Promise.all([
    getInventoryMixPerSalespersonData(month, year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">INVENTORY MIX PER SALES PERSON</h1>
          <p className="text-sm text-zinc-500">Monthly inventory type pacing by salesperson.</p>
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
                {["Sales Person", "Inventory Type", "Gross Profit", "% of GP", "Pacing GP", "Units", "Pacing Units", "Revenue", "Pacing Revenue", "GP/PU", "Ave Aging", "Margin", "Ave Price"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, index) => (
                <TableRow key={`${row.salesPerson}-${row.inventoryType}-${index}`}>
                  <TableCell><Link href={`/app/sales-detail?salesPerson=${encodeURIComponent(row.salesPerson)}`} className="text-blue-600 hover:underline font-medium">{row.salesPerson}</Link></TableCell>
                  <TableCell><Link href={`/app/sales-detail?condition=${encodeURIComponent(row.inventoryType)}`} className="text-blue-600 hover:underline font-medium">{row.inventoryType}</Link></TableCell>
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
