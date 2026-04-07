import { monthNames } from "@/lib/constants";
import Link from "next/link";

type Props = {
  month?: number;
  year: number;
  compareMonth?: number;
  compareYear?: number;
  /** If true, this is a monthly page (show month labels). Otherwise annual. */
  isMonthly?: boolean;
};

function periodLabel(month: number | undefined, year: number, isMonthly: boolean) {
  if (isMonthly && month) return `${monthNames[month - 1]} ${year}`;
  return String(year);
}

export function ComparisonBanner({
  month,
  year,
  compareMonth,
  compareYear,
  isMonthly = true,
}: Props) {
  const hasComparison =
    (compareMonth != null && compareMonth > 0) || (compareYear != null && compareYear > 0);
  if (!hasComparison) return null;

  const currentLabel = periodLabel(month, year, isMonthly);
  const prevLabel = periodLabel(
    compareMonth ?? month,
    compareYear ?? year,
    isMonthly,
  );

  return (
    <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900">
      <span className="font-semibold">Comparing:</span>
      <span>
        {currentLabel} <span className="text-blue-400">vs</span> {prevLabel}
      </span>
      <Link href="?" className="ml-auto text-xs text-blue-600 hover:underline">
        Clear comparison
      </Link>
    </div>
  );
}
