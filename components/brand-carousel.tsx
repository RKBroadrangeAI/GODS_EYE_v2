"use client";

import { useState, useRef } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { UserAvatar } from "@/components/user-avatar";
import { formatCurrency } from "@/lib/format";
import { ChevronLeft, ChevronRight, ShoppingBag, X, CalendarDays } from "lucide-react";

type Brand = {
  id: string;
  name: string;
  is_active: boolean;
};

type BrandYearStats = {
  year: number;
  totalGp: number;
  totalUnits: number;
  sellers: { id: string; name: string; avatarUrl: string | null }[];
};

export function BrandCarousel({
  brands,
  brandStats,
  year,
}: {
  brands: Brand[];
  brandStats: Record<string, BrandYearStats[]>;
  year: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const pageWidth = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -pageWidth : pageWidth, behavior: "smooth" });
  };

  if (brands.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Carousel */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <ShoppingBag className="h-4 w-4 text-amber-500" />
          Brands ({brands.length})
        </h3>
        <div className="relative group">
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-lg text-zinc-500 hover:text-zinc-800 hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 sm:opacity-100 -ml-3"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-lg text-zinc-500 hover:text-zinc-800 hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 sm:opacity-100 -mr-3"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {canScrollLeft && <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-[5]" />}
          {canScrollRight && <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-[5]" />}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-3 overflow-x-auto px-1 py-1 scrollbar-hide snap-x"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {brands.map((brand) => {
              const yearStats = brandStats[brand.id];
              const currentYearStats = yearStats?.find((s) => s.year === year);
              return (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrand(selectedBrand === brand.id ? null : brand.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-3 min-w-[100px] snap-start transition-all ${
                    selectedBrand === brand.id
                      ? "border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                  }`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-100">
                    <BrandIcon name={brand.name} size={32} />
                  </span>
                  <span className="text-xs font-medium text-zinc-700 whitespace-nowrap max-w-[88px] truncate">{brand.name}</span>
                  {currentYearStats && (
                    <span className="text-[10px] font-semibold text-emerald-600">{formatCurrency(currentYearStats.totalGp)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Brand Detail */}
      {selectedBrand && (() => {
        const brand = brands.find((b) => b.id === selectedBrand);
        if (!brand) return null;
        const yearStats = brandStats[brand.id] ?? [];
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-white border border-zinc-200 shadow-sm shrink-0">
                <BrandIcon name={brand.name} size={40} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-800">{brand.name}</p>
                <span className={`text-xs font-medium ${brand.is_active ? "text-green-600" : "text-red-500"}`}>
                  {brand.is_active ? "Active" : "Inactive"}
                </span>
                {yearStats.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
                      <CalendarDays className="h-3 w-3" /> Sales &amp; Associates by Year
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-amber-200">
                            <th className="py-1.5 pr-3 text-left font-semibold text-zinc-500">Year</th>
                            <th className="py-1.5 pr-3 text-right font-semibold text-zinc-500">Total GP</th>
                            <th className="py-1.5 pr-3 text-right font-semibold text-zinc-500">Units</th>
                            <th className="py-1.5 text-left font-semibold text-zinc-500">Associates</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearStats.map((ys) => (
                            <tr key={ys.year} className={`border-b border-amber-100 last:border-0 ${ys.year === year ? "bg-amber-100/60" : ""}`}>
                              <td className="py-2 pr-3 font-semibold text-zinc-700">{ys.year}</td>
                              <td className="py-2 pr-3 text-right font-bold text-emerald-700">{formatCurrency(ys.totalGp)}</td>
                              <td className="py-2 pr-3 text-right font-medium text-zinc-700">{ys.totalUnits}</td>
                              <td className="py-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {ys.sellers.map((seller) => (
                                    <span
                                      key={seller.id}
                                      className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-700"
                                    >
                                      <UserAvatar name={seller.name} avatarUrl={seller.avatarUrl} size={16} />
                                      {seller.name.split(" ")[0]}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-400 italic">No sales recorded</p>
                )}
              </div>
              <button onClick={() => setSelectedBrand(null)} className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
