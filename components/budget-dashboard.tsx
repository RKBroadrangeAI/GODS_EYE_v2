"use client";

import { useState, useTransition } from "react";
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

  async function updateField(field: "inventoryBudget" | "avgInventoryValue" | "marginBudget", value: number) {
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
      <CardHeader className="flex flex-row items-center justify-between">
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
        <div className="grid gap-3 md:grid-cols-3">
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
                "AVG INCREASE PER MONTH",
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
                "Finalized",
                "Today",
                "Month #",
                "Remaining",
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
                <TableCell>{formatCurrency(row.avgIncreasePerMonth)}</TableCell>
                <TableCell>
                  <Editable
                    value={row.inventoryBudget}
                    disabled={row.isFinalized || month !== row.month || saving || isPending}
                    onSave={(value) => updateField("inventoryBudget", value)}
                  />
                </TableCell>
                <TableCell>{row.averageDays}</TableCell>
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
                <TableCell>{formatPercent(row.growthPercent)}</TableCell>
                <TableCell>{formatPercent(row.weight)}</TableCell>
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
                <TableCell>{row.isFinalized ? "Yes" : "No"}</TableCell>
                <TableCell>{new Date().toISOString().slice(0, 10)}</TableCell>
                <TableCell>{row.month}</TableCell>
                <TableCell>{12 - row.month}</TableCell>
              </TableRow>
            ))}
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
