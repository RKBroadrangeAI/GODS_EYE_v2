import {
  endOfMonth,
  format,
  isAfter,
  isBefore,
  startOfMonth,
} from "date-fns";
import { countBusinessDays } from "@/lib/analytics";
import { pool } from "@/lib/db";
import { safeDivide } from "@/lib/format";

type SalesRow = {
  sales_person_id: string;
  is_cashed: boolean;
  profit: number;
  sold_for: number;
  age_days: number | null;
};

type BudgetRow = {
  employee_id: string | null;
  gp_budget: number | null;
  unit_budget: number | null;
};

type EmployeeRow = {
  id: string;
  name: string;
};

export type SalesPerformanceRow = {
  salesAssociate: string;
  closedGp: number;
  cashedGp: number;
  gpBudget: number;
  pacingGp: number | null;
  overUnderGp: number | null;
  units: number;
  unitBudget: number;
  pacingUnits: number | null;
  overUnderUnits: number | null;
  revenue: number;
  pacingRevenue: number | null;
  gppu: number | null;
  averageAging: number | null;
  margin: number | null;
  averagePrice: number | null;
};

export async function getSalesPerformanceData(month: number, year = 2026, personId?: string) {
  const today = new Date();
  const startDay = startOfMonth(new Date(year, month - 1, 1));
  const endDay = endOfMonth(startDay);

  const isFutureMonth = isAfter(startDay, today);
  const isPastMonth = isBefore(endDay, today);
  // Mirror Excel NETWORKDAYS(startOfMonth, today) − 1: business days elapsed, not counting today
  const nextMonthStart = new Date(year, month, 1);
  const daysInMonth = countBusinessDays(startDay, nextMonthStart);
  const elapsed = countBusinessDays(startDay, today);
  const daysPassed = isFutureMonth ? 0 : isPastMonth ? daysInMonth : Math.min(daysInMonth, Math.max(1, elapsed));

  const startStr = format(startDay, "yyyy-MM-dd");
  const endStr = format(endDay, "yyyy-MM-dd");

  const [employeesResult, salesResult, budgetsResult] = await Promise.all([
    personId
      ? pool.query<EmployeeRow>(
          `SELECT id, name FROM employees WHERE is_active = true AND id = $1 ORDER BY name`,
          [personId],
        )
      : pool.query<EmployeeRow>(
          `SELECT id, name FROM employees WHERE is_active = true ORDER BY name`,
        ),
    pool.query<SalesRow>(
      `SELECT sales_person_id, is_cashed, profit, sold_for, age_days
       FROM sales
       WHERE date_out >= $1 AND date_out <= $2
         AND is_cashed = true`,
      [startStr, endStr],
    ),
    pool.query<BudgetRow>(
      `SELECT employee_id, gp_budget, unit_budget
       FROM budgets
       WHERE year = $1 AND month = $2
         AND lead_source_id IS NULL
         AND condition_type_id IS NULL`,
      [year, month],
    ),
  ]);

  const employeeRows = employeesResult.rows;
  const salesRows = salesResult.rows;
  const budgetRows = budgetsResult.rows;

  const budgetByEmployee = new Map<string, BudgetRow>();
  for (const budget of budgetRows) {
    if (budget.employee_id) budgetByEmployee.set(budget.employee_id, budget);
  }

  const rows: SalesPerformanceRow[] = employeeRows.map((employee) => {
    const scopedSales = salesRows.filter((row) => row.sales_person_id === employee.id);
    const closedGp = scopedSales.reduce((sum, row) => sum + Number(row.profit ?? 0), 0);
    const cashedGp = scopedSales
      .filter((row) => row.is_cashed)
      .reduce((sum, row) => sum + Number(row.profit ?? 0), 0);
    // Match Excel: units only count rows with positive profit
    const units = scopedSales.filter((row) => Number(row.profit ?? 0) > 0).length;
    const revenue = scopedSales.reduce((sum, row) => sum + Number(row.sold_for ?? 0), 0);
    const agingValues = scopedSales.map((s) => s.age_days).filter((value): value is number => value != null);
    const averageAging = agingValues.length ? agingValues.reduce((a, b) => a + b, 0) / agingValues.length : null;

    const budget = budgetByEmployee.get(employee.id);
    const gpBudget = Number(budget?.gp_budget ?? 0);
    const unitBudget = Number(budget?.unit_budget ?? 0);

    const pacingFactor = daysPassed === 0 ? null : daysInMonth / daysPassed;
    const pacingGp = pacingFactor == null ? null : closedGp * pacingFactor;
    const pacingUnits = pacingFactor == null ? null : units * pacingFactor;
    const pacingRevenue = pacingFactor == null ? null : revenue * pacingFactor;

    return {
      salesAssociate: employee.name,
      closedGp,
      cashedGp,
      gpBudget,
      pacingGp,
      overUnderGp: pacingGp == null ? null : pacingGp - gpBudget,
      units,
      unitBudget,
      pacingUnits,
      overUnderUnits: pacingUnits == null ? null : pacingUnits - unitBudget,
      revenue,
      pacingRevenue,
      gppu: safeDivide(closedGp, units),
      averageAging,
      margin: safeDivide(closedGp, revenue),
      averagePrice: safeDivide(revenue, units),
    };
  });

  const totals = {
    closedGp: rows.reduce((sum, row) => sum + row.closedGp, 0),
    cashedGp: rows.reduce((sum, row) => sum + row.cashedGp, 0),
    gpBudget: rows.reduce((sum, row) => sum + row.gpBudget, 0),
    pacingGp: rows.reduce((sum, row) => sum + (row.pacingGp ?? 0), 0),
    overUnderGp: rows.reduce((sum, row) => sum + (row.overUnderGp ?? 0), 0),
    units: rows.reduce((sum, row) => sum + row.units, 0),
    unitBudget: rows.reduce((sum, row) => sum + row.unitBudget, 0),
    pacingUnits: rows.reduce((sum, row) => sum + (row.pacingUnits ?? 0), 0),
    overUnderUnits: rows.reduce((sum, row) => sum + (row.overUnderUnits ?? 0), 0),
    revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    pacingRevenue: rows.reduce((sum, row) => sum + (row.pacingRevenue ?? 0), 0),
  };

  const average = {
    closedGp: rows.length ? totals.closedGp / rows.length : 0,
    cashedGp: rows.length ? totals.cashedGp / rows.length : 0,
    gpBudget: rows.length ? totals.gpBudget / rows.length : 0,
    pacingGp: rows.length ? totals.pacingGp / rows.length : 0,
    overUnderGp: rows.length ? totals.overUnderGp / rows.length : 0,
    units: rows.length ? totals.units / rows.length : 0,
    unitBudget: rows.length ? totals.unitBudget / rows.length : 0,
    pacingUnits: rows.length ? totals.pacingUnits / rows.length : 0,
    overUnderUnits: rows.length ? totals.overUnderUnits / rows.length : 0,
    revenue: rows.length ? totals.revenue / rows.length : 0,
    pacingRevenue: rows.length ? totals.pacingRevenue / rows.length : 0,
    gppu: rows.length
      ? rows.map((row) => row.gppu).filter((value): value is number => value != null).reduce((a, b) => a + b, 0) /
        Math.max(1, rows.map((row) => row.gppu).filter((value) => value != null).length)
      : null,
    averageAging: rows.length
      ? rows
          .map((row) => row.averageAging)
          .filter((value): value is number => value != null)
          .reduce((a, b) => a + b, 0) /
        Math.max(1, rows.map((row) => row.averageAging).filter((value) => value != null).length)
      : null,
    margin: rows.length
      ? rows
          .map((row) => row.margin)
          .filter((value): value is number => value != null)
          .reduce((a, b) => a + b, 0) /
        Math.max(1, rows.map((row) => row.margin).filter((value) => value != null).length)
      : null,
    averagePrice: rows.length
      ? rows
          .map((row) => row.averagePrice)
          .filter((value): value is number => value != null)
          .reduce((a, b) => a + b, 0) /
        Math.max(1, rows.map((row) => row.averagePrice).filter((value) => value != null).length)
      : null,
  };

  return {
    month,
    year,
    header: {
      daysInMonth,
      today: format(today, "yyyy-MM-dd"),
      startDay: format(startDay, "yyyy-MM-dd"),
      daysPassed,
    },
    rows,
    totals: {
      ...totals,
      gppu: safeDivide(totals.closedGp, totals.units),
      averageAging: rows
        .map((row) => row.averageAging)
        .filter((value): value is number => value != null)
        .reduce((a, b) => a + b, 0) / Math.max(1, rows.map((row) => row.averageAging).filter((value) => value != null).length),
      margin: safeDivide(totals.closedGp, totals.revenue),
      averagePrice: safeDivide(totals.revenue, totals.units),
    },
    average,
  };
}
