/** Comparison helpers — compute deltas between two data sets */

export type ComparisonDelta = {
  current: number;
  previous: number;
  delta: number;
  pctChange: number | null; // null when previous is 0
};

export function computeDelta(current: number, previous: number): ComparisonDelta {
  const delta = current - previous;
  const pctChange = previous !== 0 ? delta / Math.abs(previous) : null;
  return { current, previous, delta, pctChange };
}

/** Format a delta value with arrow and color class */
export function formatDelta(value: number, isCurrency = false): string {
  const sign = value >= 0 ? "+" : "";
  if (isCurrency) {
    return `${sign}${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)}`;
  }
  return `${sign}${value.toLocaleString()}`;
}

export function formatPctChange(pct: number | null): string {
  if (pct == null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${(pct * 100).toFixed(1)}%`;
}

export function deltaColorClass(value: number): string {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-zinc-500";
}

/** Parse comparison params from URL search params */
export type ComparisonParams = {
  compareMonth?: number;
  compareYear?: number;
  isComparing: boolean;
};

export function parseComparisonParams(
  params: Record<string, string | string[] | undefined>,
): ComparisonParams {
  const cm = typeof params.compareMonth === "string" ? Number(params.compareMonth) : undefined;
  const cy = typeof params.compareYear === "string" ? Number(params.compareYear) : undefined;
  return {
    compareMonth: cm && !isNaN(cm) ? cm : undefined,
    compareYear: cy && !isNaN(cy) ? cy : undefined,
    isComparing: cm != null || cy != null,
  };
}
