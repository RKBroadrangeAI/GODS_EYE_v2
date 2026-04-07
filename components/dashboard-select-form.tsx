import { monthNames } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export type FilterOption = { id: string; name: string };

type Props = {
  month?: number;
  year?: number;
  withMonth?: boolean;
  withYear?: boolean;
  /** Entity filter label, e.g. "Sales Associate", "Lead Source" */
  entityLabel?: string;
  /** Query-param name for the entity filter, e.g. "person", "lead" */
  entityParam?: string;
  /** List of selectable entities */
  entityOptions?: FilterOption[];
  /** Currently selected entity id */
  entityValue?: string;
  /** Comparison support */
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

      {withComparison && (
        <>
          <span className="text-xs font-semibold text-zinc-400 uppercase">vs</span>
          {withMonth ? (
            <select name="compareMonth" defaultValue={String(compareMonth ?? "")} className="h-10 rounded-md border border-zinc-300 px-3 text-sm">
              <option value="">—</option>
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
          <select name="compareYear" defaultValue={String(compareYear ?? "")} className="h-10 rounded-md border border-zinc-300 px-3 text-sm">
            <option value="">—</option>
            {[2024, 2025, 2026].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </>
      )}

      <Button type="submit">Apply</Button>
    </form>
  );
}
