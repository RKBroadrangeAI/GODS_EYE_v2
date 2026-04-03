import { requireRoles } from "@/lib/auth";
import { getBudgetRows } from "@/lib/budgets";
import { BudgetDashboard } from "@/components/budget-dashboard";

export default async function Budget2026Page() {
  await requireRoles(["admin", "management"]);
  const rows = await getBudgetRows(2026);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Budget 2026</h1>
        <p className="text-sm text-zinc-500">Management budget planning, tracking, and finalization.</p>
      </div>
      <BudgetDashboard rows={rows} />
    </section>
  );
}
