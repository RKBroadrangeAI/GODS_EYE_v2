import { getSalesPerformanceData } from "@/lib/sales-performance";
import { SalesPerformanceDashboard } from "@/components/sales-performance-dashboard";
import { requireAuth } from "@/lib/auth";
import { pool } from "@/lib/db";

export default async function PerformanceByMonthPage() {
  await requireAuth();
  const today = new Date();
  const [initialData, peopleResult] = await Promise.all([
    getSalesPerformanceData(today.getMonth() + 1, 2026),
    pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM employees WHERE is_active = true ORDER BY name`,
    ),
  ]);

  const personOptions = peopleResult.rows.map((row) => ({
    value: row.id,
    label: row.name,
  }));

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PERFORMANCE BY MONTH</h1>
        <p className="text-sm text-zinc-500">Monthly performance pacing and trends.</p>
      </div>
      <SalesPerformanceDashboard initialData={initialData} personOptions={personOptions} />
    </section>
  );
}
