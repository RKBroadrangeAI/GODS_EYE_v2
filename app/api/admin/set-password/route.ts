import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

const schema = z.object({
  employeeId: z.string().uuid(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth || (auth.role !== "admin" && auth.role !== "management")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid payload";
    return NextResponse.json(
      { error: msg },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const result = await pool.query(
      `UPDATE employees SET password_hash = $1 WHERE id = $2`,
      [hash, parsed.data.employeeId],
    );

    if ((result as { rowCount: number }).rowCount === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
