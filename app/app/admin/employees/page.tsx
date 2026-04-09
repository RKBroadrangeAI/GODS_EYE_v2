import { requireRoles } from "@/lib/auth";
import { pool } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import nextDynamic from "next/dynamic";

const AdminEmployees = nextDynamic(() => import("@/components/admin-employees").then((m) => m.AdminEmployees), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-5 w-28 animate-pulse rounded bg-zinc-200" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 min-w-[90px]">
              <div className="h-12 w-12 animate-pulse rounded-full bg-zinc-200" />
              <div className="h-3 w-14 animate-pulse rounded bg-zinc-200" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-10 animate-pulse rounded bg-zinc-100" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded bg-zinc-50 border border-zinc-100" />
        ))}
      </div>
    </div>
  ),
});



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
          <AdminEmployees rows={rows} isAdmin={auth.role === "admin" || auth.role === "management"} />
        </CardContent>
      </Card>
    </section>
  );
}
