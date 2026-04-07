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
  if (!auth || (auth.role !== "admin" && auth.role !== "management")) {
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
        parsed.data.name.toUpperCase(),
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
  if (!auth || (auth.role !== "admin" && auth.role !== "management")) {
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