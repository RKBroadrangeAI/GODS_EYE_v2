import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";
import { revalidatePath } from "next/cache";

const schema = z.object({
  year: z.coerce.number().int().default(2026),
  month: z.coerce.number().int().min(1).max(12),
  finalized: z.boolean().default(true),
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

  const { year, month, finalized } = parsed.data;

  try {
    const { rows: existing } = await pool.query<{ id: string }>(
      `SELECT id FROM budgets WHERE year = $1 AND month = $2 AND employee_id IS NULL LIMIT 1`,
      [year, month],
    );

    if (existing[0]?.id) {
      await pool.query(
        `UPDATE budgets SET is_finalized = $1 WHERE id = $2`,
        [finalized, existing[0].id],
      );
    } else {
      await pool.query(
        `INSERT INTO budgets (year, month, is_finalized, employee_id) VALUES ($1, $2, $3, NULL)`,
        [year, month, finalized],
      );
    }

    revalidatePath("/app/budget-2026");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
