"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { monthNames } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, X } from "lucide-react";

export type FilterOption = { id: string; name: string };

type Props = {
  month?: number;
  year?: number;
  withMonth?: boolean;
  withYear?: boolean;
  entityLabel?: string;
  entityParam?: string;
  entityOptions?: FilterOption[];
  entityValue?: string;
  withComparison?: boolean;
  compareMonth?: number;
  compareYear?: number;
};

export function DashboardSelectForm({
  month,
  year,
  withMonth = true,
  withYear = true,
  entityLabel,
  entityParam,
  entityOptions,
  entityValue,
  withComparison = true,
  compareMonth,
  compareYear,
}: Props) {
  const [showCompare, setShowCompare] = useState(
    compareMonth != null || compareYear != null,
  );

  function handleClearCompare() {
    setShowCompare(false);
  }

  return (
    <form className="flex flex-wrap items-center gap-2">
      {entityLabel && entityParam && entityOptions ? (
        <select
          name={entityParam}
          defaultValue={entityValue ?? ""}
          className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
        >
          <option value="">All {entityLabel}s</option>
          {entityOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      ) : null}
      {withMonth ? (
        <select name="month" defaultValue={String(month ?? new Date().getMonth() + 1)} className="h-10 rounded-md border border-zinc-300 px-3 text-sm">
          {monthNames.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
      ) : null}
      {withYear ? (
        <select name="year" defaultValue={String(year ?? 2026)} className="h-10 rounded-md border border-zinc-300 px-3 text-sm">
          {[2024, 2025, 2026].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      ) : null}

      {withComparison && !showCompare && (
        <button
          type="button"
          onClick={() => setShowCompare(true)}
          className="inline-flex items-center gap-1 h-10 rounded-md border border-dashed border-zinc-300 px-3 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Compare
        </button>
      )}

      {withComparison && showCompare && (
        <>
          <span className="text-xs font-semibold text-zinc-400 uppercase">vs</span>
          {withMonth ? (
            <select name="compareMonth" defaultValue={String(compareMonth ?? "")} className="h-10 rounded-md border border-blue-300 bg-blue-50 px-3 text-sm">
              <option value="">—</option>
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
          <select name="compareYear" defaultValue={String(compareYear ?? "")} className="h-10 rounded-md border border-blue-300 bg-blue-50 px-3 text-sm">
            <option value="">—</option>
            {[2024, 2025, 2026].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleClearCompare}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Remove comparison"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}

      <Button type="submit">Apply</Button>
    </form>
  );
}
