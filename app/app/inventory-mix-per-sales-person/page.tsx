import { requireAuth } from "@/lib/auth";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getInventoryMixPerSalespersonData, parseEntityFilter } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPeopleMap } from "@/lib/analytics";
import { parseComparisonParams } from "@/lib/comparison";
import { ComparisonBanner } from "@/components/comparison-banner";
import { DeltaIndicator } from "@/components/delta-indicator";
import { ComparisonBarChart } from "@/components/comparison-bar-chart";
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
  const comp = parseComparisonParams(params);

  const [data, people] = await Promise.all([
    getInventoryMixPerSalespersonData(month, year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  let prevMap = new Map<string, (typeof data.rows)[0]>();
  if (comp.isComparing) {
    const cm = comp.compareMonth ?? month;
    const cy = comp.compareYear ?? year;
    const prevData = await getInventoryMixPerSalespersonData(cm, cy, filter);
    for (const r of prevData.rows) prevMap.set(`${r.salesPerson}-${r.inventoryType}`, r);
  }

  /* Aggregate GP by sales person for chart */
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const personGpCurrent = new Map<string, number>();
  const personGpPrev = new Map<string, number>();
  for (const r of data.rows) personGpCurrent.set(r.salesPerson, (personGpCurrent.get(r.salesPerson) ?? 0) + r.gp);
  if (comp.isComparing) {
    for (const r of data.rows) {
      const prev = prevMap.get(`${r.salesPerson}-${r.inventoryType}`);
      if (prev) personGpPrev.set(r.salesPerson, (personGpPrev.get(r.salesPerson) ?? 0) + prev.gp);
    }
  }
  const chartItems = comp.isComparing
    ? Array.from(personGpCurrent.entries())
        .map(([person, gp]) => ({
          label: person,
          current: gp,
          previous: personGpPrev.get(person) ?? 0,
        }))
        .filter((i) => i.current !== 0 || i.previous !== 0)
    : [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
          title="Gross Profit by Sales Person"
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>{monthNames[month - 1]} {year}</CardTitle>
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
              {data.rows.map((row, index) => {
                const prev = prevMap.get(`${row.salesPerson}-${row.inventoryType}`);
                return (
                  <TableRow key={`${row.salesPerson}-${row.inventoryType}-${index}`}>
                    <TableCell><Link href={`/app/sales-detail?salesPerson=${encodeURIComponent(row.salesPerson)}`} className="text-blue-600 hover:underline font-medium">{row.salesPerson}</Link></TableCell>
                    <TableCell><Link href={`/app/sales-detail?condition=${encodeURIComponent(row.inventoryType)}`} className="text-blue-600 hover:underline font-medium">{row.inventoryType}</Link></TableCell>
                    <TableCell>{formatCurrency(row.gp)}{prev && <DeltaIndicator current={row.gp} previous={prev.gp} />}</TableCell>
                    <TableCell>{formatPercent(row.gpShare)}{prev && <DeltaIndicator current={row.gpShare} previous={prev.gpShare} />}</TableCell>
                    <TableCell>{formatCurrency(row.pacingGp)}</TableCell>
                    <TableCell>{row.units}{prev && <DeltaIndicator current={row.units} previous={prev.units} />}</TableCell>
                    <TableCell>{row.pacingUnits == null ? "—" : row.pacingUnits.toFixed(1)}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}{prev && <DeltaIndicator current={row.revenue} previous={prev.revenue} />}</TableCell>
                    <TableCell>{formatCurrency(row.pacingRevenue)}</TableCell>
                    <TableCell>{formatCurrency(row.gppu)}{prev && <DeltaIndicator current={row.gppu} previous={prev.gppu} />}</TableCell>
                    <TableCell>{row.aging == null ? "—" : row.aging.toFixed(1)}{prev && prev.aging != null && row.aging != null && <DeltaIndicator current={row.aging} previous={prev.aging} />}</TableCell>
                    <TableCell>{formatPercent(row.margin)}{prev && <DeltaIndicator current={row.margin} previous={prev.margin} />}</TableCell>
                    <TableCell>{formatCurrency(row.avePrice)}{prev && <DeltaIndicator current={row.avePrice} previous={prev.avePrice} />}</TableCell>
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
