import { requireRoles } from "@/lib/auth";
import { pool } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminEmployees } from "@/components/admin-employees";

export default async function AdminEmployeesPage() {
  await requireRoles(["admin", "management"]);
  const { rows } = await pool.query<{
    id: string;
    name: string;
    email: string | null;
    role: string;
    initials: string | null;
    is_active: boolean;
  }>(`SELECT id, name, email, role, initials, is_active FROM employees ORDER BY name`);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Manage Employees</h1>
        <p className="text-sm text-zinc-500">Add or deactivate employees; changes auto-reflect across dashboards.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Employee Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEmployees rows={rows} />
        </CardContent>
      </Card>
    </section>
  );
}
