import { requireRoles } from "@/lib/auth";
import { getBudgetRows } from "@/lib/budgets";
import { BudgetDashboard } from "@/components/budget-dashboard";

export default async function Budget2025Page() {
  await requireRoles(["admin", "management"]);
  const rows = await getBudgetRows(2025);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Budget 2025</h1>
        <p className="text-sm text-zinc-500">Management budget review for 2025.</p>
      </div>
      <BudgetDashboard rows={rows} />
    </section>
  );
}
