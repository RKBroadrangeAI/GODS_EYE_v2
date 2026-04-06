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
      <Button type="submit">Apply</Button>
    </form>
  );
}
