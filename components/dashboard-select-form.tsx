import { monthNames } from "@/lib/constants";
import { Button } from "@/components/ui/button";

type Props = {
  month?: number;
  year?: number;
  withMonth?: boolean;
  withYear?: boolean;
};

export function DashboardSelectForm({ month, year, withMonth = true, withYear = true }: Props) {
  return (
    <form className="flex flex-wrap items-center gap-2">
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
