import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

const schema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  brandId: z.string().uuid(),
  reference: z.string().min(1),
  conditionTypeId: z.string().uuid(),
  dateIn: z.string().min(1),
  dateOut: z.string().min(1),
  soldTo: z.string().min(1),
  inPersonOptionId: z.string().uuid(),
  leadSourceId: z.string().uuid(),
  soldFor: z.coerce.number().nonnegative(),
});

export async function POST(request: Request) {
  const auth = await getRequestAuth();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.role === "view_only") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO sales
         (product_id, brand_id, sales_person_id, condition_type_id, reference,
          date_in, date_out, sold_to, in_person_option_id, lead_source_id, sold_for, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0)
       RETURNING id`,
      [d.productId ?? null, d.brandId, auth.employeeId, d.conditionTypeId, d.reference,
       d.dateIn, d.dateOut, d.soldTo, d.inPersonOptionId, d.leadSourceId, d.soldFor],
    );

    revalidatePath("/app/sales-performance");
    revalidatePath("/app/sales-detail");

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
