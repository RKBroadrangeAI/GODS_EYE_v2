import { AppSidebar } from "@/components/app-sidebar";
import { AIAssistant } from "@/components/ai-assistant";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { SmartRecommendations } from "@/components/smart-recommendations";
import { requireAuth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();

  return (
    <div className="min-h-screen lg:flex">
      <RealtimeRefresher />
      <AppSidebar role={auth.role} name={auth.name} />
      <main className="flex-1 space-y-4 p-4 lg:p-6">
        <SmartRecommendations />
        {children}
      </main>
      <div className="hidden w-96 border-l border-zinc-200 bg-white p-4 xl:block">
        <AIAssistant />
      </div>
    </div>
  );
}
