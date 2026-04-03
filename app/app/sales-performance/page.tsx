import { getSalesPerformanceData } from "@/lib/sales-performance";
import { SalesPerformanceDashboard } from "@/components/sales-performance-dashboard";
import { requireAuth } from "@/lib/auth";

export default async function SalesPerformancePage() {
  await requireAuth();
  const today = new Date();
  const initialData = await getSalesPerformanceData(today.getMonth() + 1, 2026);

  return <SalesPerformanceDashboard initialData={initialData} />;
}
