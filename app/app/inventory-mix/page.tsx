import { requireAuth } from "@/lib/auth";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getInventoryMixData, parseEntityFilter } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPeopleMap } from "@/lib/analytics";
import { parseComparisonParams } from "@/lib/comparison";
import { ComparisonBanner } from "@/components/comparison-banner";
import { DeltaIndicator } from "@/components/delta-indicator";
import Link from "next/link";

export default async function InventoryMixPage({
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
    getInventoryMixData(month, year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  let prevMap = new Map<string, (typeof data.rows)[0]>();
  if (comp.isComparing) {
    const cm = comp.compareMonth ?? month;
    const cy = comp.compareYear ?? year;
    const prevData = await getInventoryMixData(cm, cy, filter);
    for (const r of prevData.rows) prevMap.set(r.inventoryType, r);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">INVENTORY MIX</h1>
          <p className="text-sm text-zinc-500">Monthly inventory type pacing.</p>
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
      <Card>
        <CardHeader>
          <CardTitle>
            Days: {data.header.daysInMonth} | Today: {data.header.today} | Start: {data.header.startDay} | Days Passed: {data.header.daysPassed}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Inventory Type", "Gross Profit", "% of GP", "GP Budget", "Pacing GP", "O/U GP", "Units", "Unit Budget", "Pacing Units", "O/U Units", "Revenue", "Pacing Revenue", "GP/PU", "Ave Aging", "Margin", "Ave Price"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const prev = prevMap.get(row.inventoryType);
                return (
                  <TableRow key={row.inventoryType}>
                    <TableCell><Link href={`/app/sales-detail?condition=${encodeURIComponent(row.inventoryType)}`} className="text-blue-600 hover:underline font-medium">{row.inventoryType}</Link></TableCell>
                    <TableCell>{formatCurrency(row.gp)}{prev && <DeltaIndicator current={row.gp} previous={prev.gp} />}</TableCell>
                    <TableCell>{formatPercent(row.gpShare)}{prev && <DeltaIndicator current={row.gpShare} previous={prev.gpShare} />}</TableCell>
                    <TableCell>{formatCurrency(row.gpBudget)}</TableCell>
                    <TableCell>{formatCurrency(row.pacingGp)}</TableCell>
                    <TableCell className={row.overUnderGp != null && row.overUnderGp >= 0 ? "text-emerald-600" : "text-red-600"}>{formatCurrency(row.overUnderGp)}</TableCell>
                    <TableCell>{row.units}{prev && <DeltaIndicator current={row.units} previous={prev.units} />}</TableCell>
                    <TableCell>{row.unitBudget.toFixed(1)}</TableCell>
                    <TableCell>{row.pacingUnits == null ? "—" : row.pacingUnits.toFixed(1)}</TableCell>
                    <TableCell className={row.overUnderUnits != null && row.overUnderUnits >= 0 ? "text-emerald-600" : "text-red-600"}>{row.overUnderUnits == null ? "—" : row.overUnderUnits.toFixed(1)}</TableCell>
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
