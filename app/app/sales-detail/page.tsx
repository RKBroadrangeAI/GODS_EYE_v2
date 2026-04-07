import { requireAuth } from "@/lib/auth";
import { getSalesDetailRows } from "@/lib/server-data";
import { SalesDetailTable } from "@/components/sales-detail-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function SalesDetailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const rows = await getSalesDetailRows();

  let normalizedRows = rows.map((row) => ({
    id: row.id,
    salesPerson: row.employees?.name ?? "—",
    make: row.brands?.name ?? "—",
    condition: row.condition_types?.name ?? "—",
    stockNumber: row.stock_number,
    reference: row.reference,
    year: row.year_value,
    dateIn: row.date_in,
    dateOut: row.date_out,
    cost: Number(row.cost ?? 0),
    soldFor: Number(row.sold_for ?? 0),
    soldTo: row.sold_to,
    inPerson: row.in_person_options?.name ?? "—",
    source: row.lead_sources?.name ?? "—",
    cashed: row.is_cashed,
    by: row.by_label,
    margin: row.margin,
    profit: Number(row.profit ?? 0),
  }));

  /* ── Apply drill-down filters from query params ──────────────── */
  const filterSalesPerson = typeof params.salesPerson === "string" ? params.salesPerson : undefined;
  const filterBrand = typeof params.brand === "string" ? params.brand : undefined;
  const filterSource = typeof params.source === "string" ? params.source : undefined;
  const filterCondition = typeof params.condition === "string" ? params.condition : undefined;
  const filterChannel = typeof params.channel === "string" ? params.channel : undefined;

  if (filterSalesPerson) normalizedRows = normalizedRows.filter((r) => r.salesPerson.toUpperCase() === filterSalesPerson.toUpperCase());
  if (filterBrand) normalizedRows = normalizedRows.filter((r) => r.make.toUpperCase() === filterBrand.toUpperCase());
  if (filterSource) normalizedRows = normalizedRows.filter((r) => r.source.toUpperCase() === filterSource.toUpperCase());
  if (filterCondition) normalizedRows = normalizedRows.filter((r) => r.condition.toUpperCase() === filterCondition.toUpperCase());
  if (filterChannel) normalizedRows = normalizedRows.filter((r) => r.inPerson.toUpperCase() === filterChannel.toUpperCase());

  const activeFilter = filterSalesPerson ?? filterBrand ?? filterSource ?? filterCondition ?? filterChannel;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sales Detail Page</h1>
        <p className="text-sm text-zinc-500">Management edit view for all sales transactions.</p>
      </div>

      {activeFilter && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm">
          <span className="font-medium text-blue-700">
            Filtered by: {filterSalesPerson && `Sales Person = ${filterSalesPerson}`}
            {filterBrand && `Brand = ${filterBrand}`}
            {filterSource && `Source = ${filterSource}`}
            {filterCondition && `Condition = ${filterCondition}`}
            {filterChannel && `Channel = ${filterChannel}`}
          </span>
          <span className="text-blue-500">({normalizedRows.length} transactions)</span>
          <Link href="/app/sales-detail" className="ml-auto text-blue-600 hover:underline">
            Clear filter
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesDetailTable rows={normalizedRows} />
        </CardContent>
      </Card>
    </section>
  );
}
