import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

const schema = z.object({
  cost: z.coerce.number().nonnegative().optional(),
  soldFor: z.coerce.number().nonnegative().optional(),
  isCashed: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getRequestAuth();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.role !== "admin" && auth.role !== "management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { id } = await params;

  // Build SET clause dynamically
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (parsed.data.cost !== undefined) {
    setClauses.push(`cost = $${idx++}`);
    values.push(parsed.data.cost);
  }

  if (parsed.data.soldFor !== undefined) {
    setClauses.push(`sold_for = $${idx++}`);
    values.push(parsed.data.soldFor);
  }

  if (parsed.data.isCashed !== undefined) {
    setClauses.push(`is_cashed = $${idx++}`);
    values.push(parsed.data.isCashed);
    if (parsed.data.isCashed) {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const initials = auth.initials ?? "NA";
      setClauses.push(`by_label = $${idx++}`, `cashed_by = $${idx++}`, `cashed_at = $${idx++}`);
      values.push(`${initials} ${mm}/${dd}`, initials, now.toISOString());
    }
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ ok: true });
  }

  values.push(id);

  try {
    await pool.query(
      `UPDATE sales SET ${setClauses.join(", ")} WHERE id = $${idx}`,
      values,
    );

    revalidatePath("/app/sales-performance");
    revalidatePath("/app/sales-detail");

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
