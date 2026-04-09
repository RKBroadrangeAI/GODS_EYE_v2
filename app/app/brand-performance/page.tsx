import { requireAuth } from "@/lib/auth";
import { DashboardSelectForm } from "@/components/dashboard-select-form";
import { getBrandPerformanceData, parseEntityFilter } from "@/lib/dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getPeopleMap } from "@/lib/analytics";
import { BrandIcon } from "@/components/brand-icon";
import { parseComparisonParams } from "@/lib/comparison";
import { ComparisonBanner } from "@/components/comparison-banner";
import { DeltaIndicator } from "@/components/delta-indicator";
import { BrandCarousel } from "@/components/brand-carousel";
import { pool } from "@/lib/db";
import Link from "next/link";

export default async function BrandPerformancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const year = Number(params.year ?? 2025);
  const filter = parseEntityFilter(params);
  const comp = parseComparisonParams(params);

  const [data, people, brandsResult, brandStatsResult] = await Promise.all([
    getBrandPerformanceData(year, filter),
    getPeopleMap(false),
    pool.query<{ id: string; name: string; is_active: boolean }>(
      `SELECT id, name, is_active FROM brands WHERE is_active = true ORDER BY name`
    ),
    pool.query<{
      brand_id: string;
      total_gp: string;
      total_units: string;
      seller_ids: string[];
      seller_names: string[];
      seller_avatars: (string | null)[];
    }>(`
      SELECT
        s.brand_id,
        COALESCE(SUM(s.profit), 0)::text AS total_gp,
        COUNT(*)::text AS total_units,
        ARRAY_AGG(DISTINCT e.id) AS seller_ids,
        ARRAY_AGG(DISTINCT e.name) AS seller_names,
        ARRAY_AGG(DISTINCT e.avatar_url) AS seller_avatars
      FROM sales s
      JOIN employees e ON e.id = s.sales_person_id
      WHERE EXTRACT(YEAR FROM s.date_out) = $1
        AND s.brand_id IS NOT NULL
      GROUP BY s.brand_id
    `, [year]),
  ]);

  const brands = brandsResult.rows;
  const personOptions = people.map((p) => ({ id: p.id, name: p.name }));

  const brandStats: Record<string, { totalGp: number; totalUnits: number; sellers: { id: string; name: string; avatarUrl: string | null }[] }> = {};
  for (const bs of brandStatsResult.rows) {
    brandStats[bs.brand_id] = {
      totalGp: Number(bs.total_gp),
      totalUnits: Number(bs.total_units),
      sellers: bs.seller_ids.map((id, i) => ({ id, name: bs.seller_names[i], avatarUrl: bs.seller_avatars[i] ?? null })),
    };
  }

  let prevMap = new Map<string, (typeof data.rows)[0]>();
  if (comp.isComparing) {
    const cy = comp.compareYear ?? year;
    const prevData = await getBrandPerformanceData(cy, filter);
    for (const r of prevData.rows) prevMap.set(`${r.brand}-${r.condition}`, r);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">BRAND PERFORMANCE</h1>
          <p className="text-sm text-zinc-500">Annual brand-level metrics.</p>
        </div>
        <DashboardSelectForm
          withMonth={false}
          year={year}
          entityLabel="Sales Associate"
          entityParam="person"
          entityOptions={personOptions}
          entityValue={filter.personId}
          compareYear={comp.compareYear}
        />
      </div>

      <ComparisonBanner year={year} compareYear={comp.compareYear} isMonthly={false} />

      {/* Brand Carousel */}
      <BrandCarousel brands={brands} brandStats={brandStats} year={year} />

      <Card>
        <CardHeader>
          <CardTitle>Year {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Brand", "Condition", "% Of Units", "% of GP", "Revenue", "GP", "Units", "Markup", "Ave. Aging"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const prev = prevMap.get(`${row.brand}-${row.condition}`);
                return (
                  <TableRow key={`${row.brand}-${row.condition}`}>
                    <TableCell><Link href={`/app/sales-detail?brand=${encodeURIComponent(row.brand)}`} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"><BrandIcon name={row.brand} size={18} /> {row.brand}</Link></TableCell>
                    <TableCell>{row.condition}</TableCell>
                    <TableCell>{formatPercent(row.unitsShare)}{prev && <DeltaIndicator current={row.unitsShare} previous={prev.unitsShare} />}</TableCell>
                    <TableCell>{formatPercent(row.gpShare)}{prev && <DeltaIndicator current={row.gpShare} previous={prev.gpShare} />}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}{prev && <DeltaIndicator current={row.revenue} previous={prev.revenue} />}</TableCell>
                    <TableCell>{formatCurrency(row.gp)}{prev && <DeltaIndicator current={row.gp} previous={prev.gp} />}</TableCell>
                    <TableCell>{row.units}{prev && <DeltaIndicator current={row.units} previous={prev.units} />}</TableCell>
                    <TableCell>{formatPercent(row.markup)}{prev && <DeltaIndicator current={row.markup} previous={prev.markup} />}</TableCell>
                    <TableCell>{row.aging == null ? "—" : row.aging.toFixed(1)}{prev && <DeltaIndicator current={row.aging} previous={prev.aging} />}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
