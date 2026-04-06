import { requireAuth } from "@/lib/auth";
import { getInPersonRemoteData, parseEntityFilter } from "@/lib/dashboard-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPeopleMap } from "@/lib/analytics";
import Link from "next/link";

export default async function InPersonVsRemotePage({
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
    getInPersonRemoteData(month, year, filter),
    getPeopleMap(false),
  ]);
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">IN PERSON vs REMOTE</h1>
          <p className="text-sm text-zinc-500">Monthly category breakdown by channel.</p>
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
                {["Category", "Gross Profit", "Count", "% of Deals", "% of GP", "GPPU"].map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.category}>
                  <TableCell><Link href={`/app/sales-detail?channel=${encodeURIComponent(row.category)}`} className="text-blue-600 hover:underline font-medium">{row.category}</Link></TableCell>
                  <TableCell>{formatCurrency(row.gp)}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{formatPercent(row.dealsShare)}</TableCell>
                  <TableCell>{formatPercent(row.gpShare)}</TableCell>
                  <TableCell>{formatCurrency(row.gppu)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-zinc-100 font-semibold">
                <TableCell>TOTAL</TableCell>
                <TableCell>{formatCurrency(data.totals.totalGp)}</TableCell>
                <TableCell>{data.totals.totalCount}</TableCell>
                <TableCell>{formatPercent(1)}</TableCell>
                <TableCell>{formatPercent(1)}</TableCell>
                <TableCell>{formatCurrency(data.totals.totalGp / Math.max(1, data.totals.totalCount))}</TableCell>
              </TableRow>
              <TableRow className="bg-zinc-50">
                <TableCell>AVERAGE</TableCell>
                <TableCell>{formatCurrency(data.totals.totalGp / 2)}</TableCell>
                <TableCell>{(data.totals.totalCount / 2).toFixed(1)}</TableCell>
                <TableCell>{formatPercent(0.5)}</TableCell>
                <TableCell>{formatPercent(0.5)}</TableCell>
                <TableCell>{formatCurrency((data.totals.totalGp / 2) / Math.max(1, data.totals.totalCount / 2))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
