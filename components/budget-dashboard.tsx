"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useToast } from "@/components/providers";
import type { BudgetMonthRow } from "@/lib/budgets";

type Props = {
  rows: BudgetMonthRow[];
};

export function BudgetDashboard({ rows }: Props) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

  const selected = rows.find((row) => row.month === month) ?? rows[0];

  // Compute totals row matching Excel TOTAL row
  const totals = useMemo(() => {
    const profit2025 = rows.reduce((s, r) => s + r.profit2025, 0);
    const units2025 = rows.reduce((s, r) => s + r.units2025, 0);
    const revenue2025 = rows.reduce((s, r) => s + r.revenue2025, 0);
    const gpBudget2026 = rows.reduce((s, r) => s + r.gpBudget2026, 0);
    const unitBudget2026 = rows.reduce((s, r) => s + (r.unitBudget2026 ?? 0), 0);
    const revenueBudget2026 = rows.reduce((s, r) => s + (r.revenueBudget2026 ?? 0), 0);
    const actualGp2026 = rows.reduce((s, r) => s + r.actualGp2026, 0);
    const projectedGp2026 = rows.reduce((s, r) => s + (r.projectedGp2026 ?? 0), 0);
    const avgDays = rows.length ? rows.reduce((s, r) => s + r.averageDays, 0) / rows.length : 0;
    const avgInvValue = rows.length ? rows.reduce((s, r) => s + r.avgInventoryValue, 0) / rows.length : 0;

    return {
      profit2025,
      units2025,
      perUnit2025: units2025 ? profit2025 / units2025 : null,
      avgSold2025: units2025 ? revenue2025 / units2025 : null,
      revenue2025,
      margin2025: revenue2025 ? profit2025 / revenue2025 : null,
      avgDays,
      avgInvValue,
      gpBudget2026,
      unitBudget2026,
      revenueBudget2026,
      actualGp2026,
      projectedGp2026,
      trackingDelta: actualGp2026 - projectedGp2026,
    };
  }, [rows]);

  async function updateField(
    field: "inventoryBudget" | "avgInventoryValue" | "marginBudget" | "averageDays" | "growthPercent" | "weight",
    value: number,
  ) {
    setSaving(true);
    const response = await fetch("/api/budgets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 2026,
        month,
        inventoryBudget: field === "inventoryBudget" ? value : selected.inventoryBudget,
        avgInventoryValue: field === "avgInventoryValue" ? value : selected.avgInventoryValue,
        marginBudget: field === "marginBudget" ? value : selected.marginBudget,
        averageDays: field === "averageDays" ? value : selected.averageDays,
        growthPercent: field === "growthPercent" ? value : selected.growthPercent,
        weight: field === "weight" ? value : selected.weight,
      }),
    });
    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      error(payload.error ?? "Unable to update budget");
      return;
    }

    success("Budget updated");
    startTransition(() => router.refresh());
  }

  async function finalize() {
    if (selected.isFinalized) return;

    const response = await fetch("/api/budgets/finalize", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2026, month, finalized: true }),
    });

    if (!response.ok) {
      error("Unable to finalize budget");
      return;
    }

    success("Budget finalized and locked");
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <CardTitle>Budget 2026</CardTitle>
        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {rows.map((row) => (
              <option key={row.month} value={row.month}>
                {row.monthLabel}
              </option>
            ))}
          </select>
          <Button disabled={isPending || saving || selected.isFinalized} onClick={finalize} className="gap-2">
            {selected.isFinalized ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {selected.isFinalized ? "Budget Finalized" : "Finalize Budget"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {selected.isFinalized ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Lock className="h-4 w-4" />
              Budget is finalized and editing is locked.
            </span>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
          <Metric label="Today" value={new Date().toISOString().slice(0, 10)} />
          <Metric label="Month #" value={String(new Date().getMonth() + 1)} />
          <Metric label="Remaining" value={String(12 - new Date().getMonth() - 1)} />
          <Metric label="Avg Increase/Mo" value={formatCurrency(selected.avgIncreasePerMonth)} />
          <Metric label="YTD DELTA" value={formatCurrency(selected.ytdDelta)} />
          <Metric label="TRACKING vs PROJECTED" value={formatCurrency(selected.trackingDelta)} />
          <Metric label="ACTUAL GP" value={formatCurrency(selected.actualGp2026)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Month",
                "2025 PROFIT",
                "2025 UNITS",
                "PER UNIT",
                "AVE $ SOLD",
                "REVENUE",
                "MARGIN %",
                "INVENTORY BUDGET",
                "AVERAGE DAYS",
                "Days in Month",
                "AVG INVENTORY VALUE",
                "INSTOCK UNIT BUDGET",
                "MARGIN BUDGET",
                "2026 $GP BUDGET",
                "% GROWTH",
                "WEIGHT",
                "2026 UNIT BUDGET",
                "PER UNIT (2026)",
                "AVE $ BUDGET",
                "REVENUE BUDGET",
                "Actual GP",
                "Projected GP",
                "Tracking Delta",
                "YTD Delta",
              ].map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.month}>
                <TableCell>{row.monthLabel}</TableCell>
                <TableCell>{formatCurrency(row.profit2025)}</TableCell>
                <TableCell>{row.units2025}</TableCell>
                <TableCell>{formatCurrency(row.perUnit2025)}</TableCell>
                <TableCell>{formatCurrency(row.avgSold2025)}</TableCell>
                <TableCell>{formatCurrency(row.revenue2025)}</TableCell>
                <TableCell>{formatPercent(row.margin2025)}</TableCell>
                <TableCell>
                  <Editable
                    value={row.inventoryBudget}
                    disabled={row.isFinalized || month !== row.month || saving || isPending}
                    onSave={(value) => updateField("inventoryBudget", value)}
                  />
                </TableCell>
                <TableCell>
                  <Editable
                    value={row.averageDays}
                    disabled={row.isFinalized || month !== row.month || saving || isPending}
                    onSave={(value) => updateField("averageDays", value)}
                  />
                </TableCell>
                <TableCell>{row.daysInMonth}</TableCell>
                <TableCell>
                  <Editable
                    value={row.avgInventoryValue}
                    disabled={row.isFinalized || month !== row.month || saving || isPending}
                    onSave={(value) => updateField("avgInventoryValue", value)}
                  />
                </TableCell>
                <TableCell>{formatCurrency(row.instockUnitBudget)}</TableCell>
                <TableCell>
                  <Editable
                    value={row.marginBudget}
                    disabled={row.isFinalized || month !== row.month || saving || isPending}
                    onSave={(value) => updateField("marginBudget", value)}
                    step="0.001"
                  />
                </TableCell>
                <TableCell>{formatCurrency(row.gpBudget2026)}</TableCell>
                <TableCell>
                  <Editable
                    value={row.growthPercent}
                    disabled={row.isFinalized || month !== row.month || saving || isPending}
                    onSave={(value) => updateField("growthPercent", value)}
                    step="0.01"
                  />
                </TableCell>
                <TableCell>
                  <Editable
                    value={row.weight}
                    disabled={row.isFinalized || month !== row.month || saving || isPending}
                    onSave={(value) => updateField("weight", value)}
                    step="0.001"
                  />
                </TableCell>
                <TableCell>{formatCurrency(row.unitBudget2026)}</TableCell>
                <TableCell>{formatCurrency(row.perUnit2026)}</TableCell>
                <TableCell>{formatCurrency(row.aveBudget2026)}</TableCell>
                <TableCell>{formatCurrency(row.revenueBudget2026)}</TableCell>
                <TableCell>{formatCurrency(row.actualGp2026)}</TableCell>
                <TableCell>{formatCurrency(row.projectedGp2026)}</TableCell>
                <TableCell className={row.trackingDelta != null && row.trackingDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {formatCurrency(row.trackingDelta)}
                </TableCell>
                <TableCell className={row.ytdDelta >= 0 ? "text-emerald-600" : "text-red-600"}>{formatCurrency(row.ytdDelta)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-zinc-100 font-semibold italic">
              <TableCell>TOTAL</TableCell>
              <TableCell>{formatCurrency(totals.profit2025)}</TableCell>
              <TableCell>{totals.units2025}</TableCell>
              <TableCell>{formatCurrency(totals.perUnit2025)}</TableCell>
              <TableCell>{formatCurrency(totals.avgSold2025)}</TableCell>
              <TableCell>{formatCurrency(totals.revenue2025)}</TableCell>
              <TableCell>{formatPercent(totals.margin2025)}</TableCell>
              <TableCell />
              <TableCell className="text-orange-600">{totals.avgDays.toFixed(2)}</TableCell>
              <TableCell />
              <TableCell className="text-orange-600">{formatCurrency(totals.avgInvValue)}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell>{formatCurrency(totals.gpBudget2026)}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell>{formatCurrency(totals.unitBudget2026)}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell>{formatCurrency(totals.revenueBudget2026)}</TableCell>
              <TableCell>{formatCurrency(totals.actualGp2026)}</TableCell>
              <TableCell>{formatCurrency(totals.projectedGp2026)}</TableCell>
              <TableCell className={totals.trackingDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
                {formatCurrency(totals.trackingDelta)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Editable({
  value,
  disabled,
  onSave,
  step,
}: {
  value: number;
  disabled: boolean;
  onSave: (value: number) => void;
  step?: string;
}) {
  return (
    <Input
      type="number"
      defaultValue={String(value)}
      disabled={disabled}
      step={step ?? "1"}
      onBlur={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next) && next !== value) onSave(next);
      }}
      className="h-8 min-w-28"
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
