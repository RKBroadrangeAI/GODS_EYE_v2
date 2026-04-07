import { AppSidebar } from "@/components/app-sidebar";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { requireAuth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();

  /* Executive / view-only users see dashboard only — no sidebar */
  const showSidebar = auth.role !== "view_only";

  return (
    <div className="min-h-screen lg:flex">
      <RealtimeRefresher />
      {showSidebar && <AppSidebar role={auth.role} name={auth.name} />}
      <main className="flex-1 bg-zinc-50 p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
}
