import { requireRoles } from "@/lib/auth";
import { pool } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDropdowns } from "@/components/admin-dropdowns";

const tables = [
  "brands",
  "lead_sources",
  "condition_types",
  "bracelet_types",
  "dial_colors",
  "bezel_types",
  "marker_types",
  "in_person_options",
] as const;

export default async function AdminDropdownsPage() {
  await requireRoles(["admin", "management"]);

  const datasets = await Promise.all(
    tables.map(async (table) => {
      // Table is validated against literal constant above — safe to interpolate
      const { rows } = await pool.query<{ id: string; name: string; is_active: boolean }>(
        `SELECT id, name, is_active FROM ${table} ORDER BY name`,
      );
      return { table, rows };
    }),
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Manage Dropdowns</h1>
        <p className="text-sm text-zinc-500">Maintain lookup values for entry forms and dashboards.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lookup Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDropdowns tables={datasets} />
        </CardContent>
      </Card>
    </section>
  );
}
