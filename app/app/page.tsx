import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecutiveSummaryButton } from "@/components/executive-summary-button";
import { getDailyAlerts, getTopInsights } from "@/lib/insights";
import { requireAuth } from "@/lib/auth";

export default async function AppHomePage() {
  await requireAuth();
  const insights = await getTopInsights();
  const alerts = await getDailyAlerts();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Home</h1>
        <p className="text-sm text-zinc-500">Daily insights widget with alerts and executive exports.</p>
      </div>
      <ExecutiveSummaryButton />
      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((insight) => (
          <Card key={insight}>
            <CardHeader>
              <CardTitle className="text-base">Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700">{insight}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Insights Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map((alert) => (
            <p key={alert} className="text-sm text-zinc-700">
              • {alert}
            </p>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
