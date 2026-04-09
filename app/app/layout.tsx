import { AppSidebar } from "@/components/app-sidebar";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { requireAuth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();

  /* Fetch avatar for the logged-in user */
  const { rows } = await pool.query<{ avatar_url: string | null }>(
    `SELECT avatar_url FROM employees WHERE id = $1`,
    [auth.employeeId],
  );
  const avatarUrl = rows[0]?.avatar_url ?? null;

  /* Executive / view-only users see dashboard only — no sidebar */
  const showSidebar = auth.role !== "view_only" && auth.role !== "test_user";

  return (
    <div className="min-h-screen lg:flex">
      <RealtimeRefresher />
      {showSidebar && <AppSidebar role={auth.role} name={auth.name} avatarUrl={avatarUrl} />}
      {!showSidebar && <LogoutButton />}
      <main className={`flex-1 bg-zinc-50 p-4 lg:p-8 ${showSidebar ? "pt-16 lg:pt-8" : ""}`}>
        {children}
      </main>
    </div>
  );
}
