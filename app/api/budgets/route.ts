import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";
import { revalidatePath } from "next/cache";

const schema = z.object({
  year: z.coerce.number().int().default(2026),
  month: z.coerce.number().int().min(1).max(12),
  inventoryBudget: z.coerce.number().nonnegative(),
  avgInventoryValue: z.coerce.number().positive(),
  marginBudget: z.coerce.number().min(0).max(1),
  averageDays: z.coerce.number().nonnegative().optional(),
  growthPercent: z.coerce.number().optional(),
  weight: z.coerce.number().min(0).max(1).optional(),
});

export async function PATCH(request: Request) {
  const auth = await getRequestAuth();
  if (!auth || (auth.role !== "admin" && auth.role !== "management")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { year, month, inventoryBudget, avgInventoryValue, marginBudget, averageDays, growthPercent, weight } = parsed.data;

  try {
    const { rows: existing } = await pool.query<{ id: string; is_finalized: boolean }>(
      `SELECT id, is_finalized FROM budgets WHERE year = $1 AND month = $2 AND employee_id IS NULL LIMIT 1`,
      [year, month],
    );

    if (existing[0]?.is_finalized) {
      return NextResponse.json({ error: "Budget is finalized" }, { status: 400 });
    }

    if (existing[0]?.id) {
      await pool.query(
        `UPDATE budgets
         SET inventory_budget = $1, avg_inventory_value = $2, margin_budget = $3,
             avg_days = COALESCE($4, avg_days),
             growth_percent = COALESCE($5, growth_percent),
             weight = COALESCE($6, weight)
         WHERE id = $7`,
        [inventoryBudget, avgInventoryValue, marginBudget, averageDays ?? null, growthPercent ?? null, weight ?? null, existing[0].id],
      );
    } else {
      await pool.query(
        `INSERT INTO budgets (year, month, inventory_budget, avg_inventory_value, margin_budget, avg_days, growth_percent, weight, employee_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)`,
        [year, month, inventoryBudget, avgInventoryValue, marginBudget, averageDays ?? 40, growthPercent ?? 0.08, weight ?? (1/12)],
      );
    }

    revalidatePath("/app/budget-2026");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}