import { computeDelta, deltaColorClass, formatPctChange } from "@/lib/comparison";

type Props = {
  current: number | null;
  previous: number | null;
  /** Show ↑/↓ arrow */
  showArrow?: boolean;
};

/**
 * Inline delta badge: ↑ +12.5% (green/red/gray)
 * Renders below or beside the main value in a table cell.
 */
export function DeltaIndicator({ current, previous, showArrow = true }: Props) {
  if (current == null || previous == null) return null;
  const d = computeDelta(current, previous);
  if (d.delta === 0 && d.pctChange === 0) return null;

  const arrow = d.delta > 0 ? "↑" : d.delta < 0 ? "↓" : "";
  const colorClass = deltaColorClass(d.delta);

  return (
    <span className={`ml-1 text-[11px] font-medium ${colorClass}`}>
      {showArrow ? `${arrow} ` : ""}
      {formatPctChange(d.pctChange)}
    </span>
  );
}
