import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BrandPerformanceLoading() {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">BRAND PERFORMANCE</h1>
          <p className="text-sm text-zinc-500">Annual brand-level metrics.</p>
        </div>
      </div>

      {/* Carousel skeleton */}
      <div className="space-y-2">
        <div className="h-5 w-32 animate-pulse rounded bg-zinc-200" />
        <div className="h-[160px] flex items-center justify-center">
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 w-[100px]">
                <div className="h-12 w-12 animate-pulse rounded-lg bg-zinc-200" />
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-12 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="h-5 w-24 animate-pulse rounded bg-zinc-200" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded bg-zinc-100" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-zinc-50 border border-zinc-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
