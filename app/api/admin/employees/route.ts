import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";
import { revalidatePath } from "next/cache";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  initials: z.string().min(1).max(4),
  role: z.enum(["admin", "management", "sales_associate", "view_only"]),
  password: z.string().min(6).optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const passwordHash = parsed.data.password
      ? await bcrypt.hash(parsed.data.password, 10)
      : null;

    await pool.query(
      `INSERT INTO employees (name, email, initials, role, is_active, password_hash) VALUES ($1, $2, $3, $4, true, $5)`,
      [
        parsed.data.name
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" "),
        parsed.data.email?.toLowerCase() ?? null,
        parsed.data.initials.toUpperCase(),
        parsed.data.role,
        passwordHash,
      ],
    );

    revalidatePath("/app/admin/employees");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await getRequestAuth();
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await pool.query(
      `UPDATE employees SET is_active = $1, deactivated_at = $2 WHERE id = $3`,
      [
        parsed.data.isActive,
        parsed.data.isActive ? null : new Date().toISOString(),
        parsed.data.id,
      ],
    );

    revalidatePath("/app/admin/employees");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(request: Request) {
  const auth = await getRequestAuth();
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    // Check if employee has sales records
    const { rows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM sales WHERE sales_person_id = $1`,
      [parsed.data.id],
    );
    if (Number(rows[0].cnt) > 0) {
      return NextResponse.json(
        { error: "Cannot delete: employee has sales records. Deactivate instead." },
        { status: 400 },
      );
    }

    await pool.query(`DELETE FROM employees WHERE id = $1`, [parsed.data.id]);

    revalidatePath("/app/admin/employees");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}