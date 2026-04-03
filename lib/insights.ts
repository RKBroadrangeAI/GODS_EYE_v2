import { buildAiContext } from "@/lib/ai-intelligence";

export async function getTopInsights() {
  const month = new Date().getMonth() + 1;
  const context = await buildAiContext(month, 2026);

  return [
    ...context.recommendations.slice(0, 3),
  ];
}

export async function getDailyAlerts() {
  const month = new Date().getMonth() + 1;
  const context = await buildAiContext(month, 2026);
  return context.anomalies.slice(0, 3);
}
