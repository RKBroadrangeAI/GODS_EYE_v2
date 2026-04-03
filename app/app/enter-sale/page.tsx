import { EnterSaleForm } from "@/components/enter-sale-form";
import { getSaleFormLookups } from "@/lib/server-data";
import { requireAuth } from "@/lib/auth";

export default async function EnterSalePage() {
  await requireAuth();
  const lookups = await getSaleFormLookups();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Enter Sale Here</h1>
        <p className="text-sm text-zinc-500">Create a new transaction. All dashboards update in real time.</p>
      </div>
      <EnterSaleForm {...lookups} />
    </section>
  );
}
