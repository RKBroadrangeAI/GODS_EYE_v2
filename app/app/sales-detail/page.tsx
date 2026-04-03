import { requireRoles } from "@/lib/auth";
import { getSalesDetailRows } from "@/lib/server-data";
import { SalesDetailTable } from "@/components/sales-detail-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SalesDetailPage() {
  await requireRoles(["admin", "management"]);
  const rows = await getSalesDetailRows();

  const normalizedRows = rows.map((row) => ({
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

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sales Detail Page</h1>
        <p className="text-sm text-zinc-500">Management edit view for all sales transactions.</p>
      </div>
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
