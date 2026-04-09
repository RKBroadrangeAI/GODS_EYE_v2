import { requireRoles } from "@/lib/auth";
import { pool } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminEmployees } from "@/components/admin-employees";

export default async function AdminEmployeesPage() {
  const auth = await requireRoles(["admin", "management"]);
  const { rows } = await pool.query<{
    id: string;
    name: string;
    email: string | null;
    role: string;
    initials: string | null;
    is_active: boolean;
    has_password: boolean;
    avatar_url: string | null;
  }>(`SELECT id, name, email, role, initials, is_active, password_hash IS NOT NULL AS has_password, avatar_url FROM employees ORDER BY name`);

  const { rows: brands } = await pool.query<{ id: string; name: string; is_active: boolean }>(
    `SELECT id, name, is_active FROM brands WHERE is_active = true ORDER BY name`
  );

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
          <AdminEmployees rows={rows} brands={brands} isAdmin={auth.role === "admin" || auth.role === "management"} />
        </CardContent>
      </Card>
    </section>
  );
}
