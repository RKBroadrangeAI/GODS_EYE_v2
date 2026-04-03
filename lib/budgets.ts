import { pool } from "@/lib/db";
import { monthNames } from "@/lib/constants";
import { safeDivide } from "@/lib/format";

export type BudgetMonthRow = {
  month: number;
  monthLabel: string;
  profit2025: number;
  units2025: number;
  perUnit2025: number | null;
  avgSold2025: number | null;
  revenue2025: number;
  margin2025: number | null;
  avgIncreasePerMonth: number;
  inventoryBudget: number;
  averageDays: number;
  daysInMonth: number;
  avgInventoryValue: number;
  instockUnitBudget: number | null;
  marginBudget: number;
  gpBudget2026: number;
  growthPercent: number;
  weight: number;
  unitBudget2026: number | null;
  perUnit2026: number | null;
  aveBudget2026: number;
  revenueBudget2026: number | null;
  actualGp2026: number;
  projectedGp2026: number | null;
  trackingDelta: number | null;
  ytdDelta: number;
  isFinalized: boolean;
  budgetId: string | null;
};

const defaultIncrease = 250000;

export async function getBudgetRows(year = 2026): Promise<BudgetMonthRow[]> {
  const [budgetResult, sales2026Result] = await Promise.all([
    pool.query<{
      id: string;
      month: number;
      inventory_budget: string | null;
      avg_inventory_value: string | null;
      margin_budget: string | null;
      growth_percent: string | null;
      gp_budget: string | null;
      avg_price_target: string | null;
      avg_days: string | null;
      weight: string | null;
      is_finalized: boolean | null;
      profit_prev_year: string | null;
      units_prev_year: string | null;
      revenue_prev_year: string | null;
    }>(
      `SELECT id, month, inventory_budget, avg_inventory_value, margin_budget,
              growth_percent, gp_budget, avg_price_target, avg_days, weight, is_finalized,
              profit_prev_year, units_prev_year, revenue_prev_year
       FROM budgets
       WHERE year = $1 AND employee_id IS NULL
         AND lead_source_id IS NULL AND condition_type_id IS NULL`,
      [year],
    ),
    pool.query<{ month_number: number | null; profit: string }>(
      `SELECT month_number, profit
       FROM sales
       WHERE date_out >= $1 AND date_out <= $2`,
      [`${year}-01-01`, `${year}-12-31`],
    ),
  ]);

  const budgetData = budgetResult.rows;
  const sales2026Data = sales2026Result.rows.map((r) => ({
    month_number: r.month_number,
    profit: Number(r.profit),
  }));

  const byMonthBudget = new Map(budgetData.map((row) => [row.month, row]));

  const actual2026ByMonth = new Map<number, number>();
  for (let m = 1; m <= 12; m += 1) {
    actual2026ByMonth.set(m, 0);
  }
  sales2026Data.forEach((row) => {
    const month = row.month_number ?? 0;
    actual2026ByMonth.set(month, (actual2026ByMonth.get(month) ?? 0) + Number(row.profit ?? 0));
  });

  let runningYtd = 0;

  return monthNames.map((monthLabel, index) => {
    const month = index + 1;
    const budget = byMonthBudget.get(month);

    // Use stored 2025 reference data from budgets table
    const profit2025 = Number(budget?.profit_prev_year ?? 0);
    const units2025 = Number(budget?.units_prev_year ?? 0);
    const revenue2025 = Number(budget?.revenue_prev_year ?? 0);
    const perUnit2025 = safeDivide(profit2025, units2025);
    const avgSold2025 = safeDivide(revenue2025, units2025);
    const margin2025 = safeDivide(profit2025, revenue2025);

    const inventoryBudget = Number(budget?.inventory_budget ?? 6200000 + index * defaultIncrease);
    const avgInventoryValue = Number(budget?.avg_inventory_value ?? 23500 + index * 200);
    const marginBudget = Number(budget?.margin_budget ?? 0.12);
    const growthPercent = Number(budget?.growth_percent ?? 0.08);
    const gpBudget2026 = Number(budget?.gp_budget ?? profit2025 * (1 + growthPercent));
    const unitBudget2026 = safeDivide(gpBudget2026, perUnit2025 ?? 0);
    const avgPriceTarget = Number(budget?.avg_price_target ?? avgSold2025 ?? 0);
    const revenueBudget2026 = unitBudget2026 == null ? null : unitBudget2026 * avgPriceTarget;
    const instockUnitBudget = safeDivide(inventoryBudget, avgInventoryValue);

    const actualGp2026 = actual2026ByMonth.get(month) ?? 0;
    const projectedGp2026 = gpBudget2026 === 0 ? null : gpBudget2026;
    const trackingDelta = projectedGp2026 == null ? null : actualGp2026 - projectedGp2026;
    runningYtd += trackingDelta ?? 0;

    return {
      month,
      monthLabel,
      profit2025,
      units2025,
      perUnit2025,
      avgSold2025,
      revenue2025,
      margin2025,
      avgIncreasePerMonth: defaultIncrease,
      inventoryBudget,
      averageDays: Number(budget?.avg_days ?? 40),
      daysInMonth: new Date(year, month, 0).getDate(),
      avgInventoryValue,
      instockUnitBudget,
      marginBudget,
      gpBudget2026,
      growthPercent,
      weight: Number(budget?.weight ?? (1 / 12)),
      unitBudget2026,
      perUnit2026: unitBudget2026 == null ? null : safeDivide(gpBudget2026, unitBudget2026),
      aveBudget2026: avgPriceTarget,
      revenueBudget2026,
      actualGp2026,
      projectedGp2026,
      trackingDelta,
      ytdDelta: runningYtd,
      isFinalized: Boolean(budget?.is_finalized),
      budgetId: budget?.id ?? null,
    };
  });
}
