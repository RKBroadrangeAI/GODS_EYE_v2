import Image from "next/image";
import { requireAuth } from "@/lib/auth";
import {
  aggregateCoreMetrics,
  aggregateInventoryTiers,
  getLookupMap,
  getPeopleMap,
  getSalesFactsByYear,
} from "@/lib/analytics";
import { safeDivide } from "@/lib/format";
import { DashboardHomeCharts, type DashboardHomeData } from "@/components/dashboard-home-charts";
import { monthNames } from "@/lib/constants";

export default async function AppHomePage() {
  await requireAuth();

  const year = 2026;
  const [allFacts, people, leadMap, brandMap, channelMap] = await Promise.all([
    getSalesFactsByYear(year),
    getPeopleMap(),
    getLookupMap("lead_sources"),
    getLookupMap("brands"),
    getLookupMap("in_person_options"),
  ]);

  // KPIs
  const metrics = aggregateCoreMetrics(
    allFacts.map((r) => ({ profit: Number(r.profit), sold_for: Number(r.sold_for), age_days: r.age_days })),
  );

  // Sales by Person
  const salesByPerson = people.map((p) => {
    const scoped = allFacts.filter((r) => r.sales_person_id === p.id);
    const m = aggregateCoreMetrics(scoped.map((r) => ({ profit: Number(r.profit), sold_for: Number(r.sold_for), age_days: r.age_days })));
    return { name: p.name, gp: m.gp, units: m.units };
  }).sort((a, b) => b.gp - a.gp);

  // Lead Sources
  const leadSources = Array.from(leadMap.entries()).map(([id, name]) => {
    const scoped = allFacts.filter((r) => r.lead_source_id === id);
    const m = aggregateCoreMetrics(scoped.map((r) => ({ profit: Number(r.profit), sold_for: Number(r.sold_for), age_days: r.age_days })));
    return { name, gp: m.gp, count: m.units };
  }).filter((r) => r.count > 0).sort((a, b) => b.gp - a.gp);

  // Brands (aggregate across conditions)
  const brandAgg = new Map<string, { gp: number; units: number }>();
  for (const fact of allFacts) {
    if (!fact.brand_id) continue;
    const existing = brandAgg.get(fact.brand_id) ?? { gp: 0, units: 0 };
    existing.gp += Number(fact.profit ?? 0);
    existing.units += Number(fact.profit ?? 0) > 0 ? 1 : 0;
    brandAgg.set(fact.brand_id, existing);
  }
  const brands = Array.from(brandAgg.entries())
    .map(([id, v]) => ({ name: brandMap.get(id) ?? id, ...v }))
    .sort((a, b) => b.gp - a.gp);

  // Channels
  const channels = Array.from(channelMap.entries()).map(([id, name]) => {
    const scoped = allFacts.filter((r) => r.in_person_option_id === id);
    const m = aggregateCoreMetrics(scoped.map((r) => ({ profit: Number(r.profit), sold_for: Number(r.sold_for), age_days: r.age_days })));
    return { name, gp: m.gp, count: m.units };
  }).filter((r) => r.count > 0);

  // Inventory Tiers (from full year data)
  const tierRows = aggregateInventoryTiers(
    allFacts.map((r) => ({ sold_for: Number(r.sold_for ?? 0), profit: Number(r.profit ?? 0), age_days: r.age_days })),
  );
  const inventoryTiers = tierRows.map((t) => ({
    tier: t.low >= 200001 ? "$200K+" : `$${(t.low / 1000).toFixed(0)}K–$${(t.high / 1000).toFixed(0)}K`,
    count: t.count,
    gp: t.gp,
  })).filter((t) => t.count > 0);

  // Monthly Trend (YTD)
  const currentMonth = new Date().getMonth() + 1; // April = 4
  const monthlyTrend: { month: string; gp: number; units: number }[] = [];
  for (let m = 1; m <= Math.min(currentMonth, 12); m++) {
    const scoped = allFacts.filter((r) => {
      const raw = (r as { date_out: string | Date | null }).date_out;
      if (raw == null) return false;
      const d = raw instanceof Date ? raw : new Date(raw);
      return d.getFullYear() === year && d.getMonth() + 1 === m;
    });
    const agg = aggregateCoreMetrics(scoped.map((r) => ({ profit: Number(r.profit), sold_for: Number(r.sold_for), age_days: r.age_days })));
    monthlyTrend.push({ month: monthNames[m - 1].slice(0, 3), gp: agg.gp, units: agg.units });
  }

  const chartData: DashboardHomeData = {
    kpis: {
      totalGP: metrics.gp,
      totalUnits: metrics.units,
      totalRevenue: metrics.revenue,
      avgMargin: metrics.margin,
    },
    salesByPerson,
    leadSources,
    brands,
    channels,
    inventoryTiers,
    monthlyTrend,
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-2 overflow-hidden">
      {/* Logo header */}
      <div className="flex flex-col items-center justify-center shrink-0">
        <Image
          src="/God's Eye 2.png"
          alt="God's Eye"
          width={100}
          height={100}
          className="object-contain"
          unoptimized
        />
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Executive Dashboard — {year}</p>
      </div>

      {/* Charts fill remaining space */}
      <div className="flex-1 min-h-0">
        <DashboardHomeCharts data={chartData} />
      </div>
    </div>
  );
}
