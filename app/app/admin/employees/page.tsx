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

  // Brand stats: total GP, units, and sellers for each brand (current year)
  const currentYear = new Date().getFullYear();
  const { rows: brandStats } = await pool.query<{
    brand_id: string;
    total_gp: string;
    total_units: string;
    seller_ids: string[];
    seller_names: string[];
  }>(`
    SELECT
      s.brand_id,
      COALESCE(SUM(s.profit), 0)::text AS total_gp,
      COUNT(*)::text AS total_units,
      ARRAY_AGG(DISTINCT e.id) AS seller_ids,
      ARRAY_AGG(DISTINCT e.name) AS seller_names
    FROM sales s
    JOIN employees e ON e.id = s.sales_person_id
    WHERE EXTRACT(YEAR FROM s.date_out) = $1
      AND s.brand_id IS NOT NULL
    GROUP BY s.brand_id
  `, [currentYear]);

  const brandStatsMap: Record<string, { totalGp: number; totalUnits: number; sellers: { id: string; name: string }[] }> = {};
  for (const bs of brandStats) {
    brandStatsMap[bs.brand_id] = {
      totalGp: Number(bs.total_gp),
      totalUnits: Number(bs.total_units),
      sellers: bs.seller_ids.map((id, i) => ({ id, name: bs.seller_names[i] })),
    };
  }

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
          <AdminEmployees rows={rows} brands={brands} brandStats={brandStatsMap} isAdmin={auth.role === "admin" || auth.role === "management"} />
        </CardContent>
      </Card>
    </section>
  );
}
