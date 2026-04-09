import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
}).refine(
  (d) => !d.newPassword || d.currentPassword,
  { message: "Current password is required to set a new password", path: ["currentPassword"] },
);

export async function GET() {
  const auth = await getRequestAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await pool.query<{
    name: string;
    email: string | null;
    avatar_url: string | null;
    role: string;
    initials: string | null;
  }>(
    `SELECT name, email, avatar_url, role, initials FROM employees WHERE id = $1`,
    [auth.employeeId],
  );

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(rows[0]);
}

export async function PATCH(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const { name, email, avatarUrl, currentPassword, newPassword } = parsed.data;

  // Verify current password if changing password
  if (newPassword && currentPassword) {
    const { rows } = await pool.query<{ password_hash: string | null }>(
      `SELECT password_hash FROM employees WHERE id = $1`,
      [auth.employeeId],
    );
    const hash = rows[0]?.password_hash;
    if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (name !== undefined) {
    sets.push(`name = $${idx++}`);
    values.push(name);
  }
  if (email !== undefined) {
    sets.push(`email = $${idx++}`);
    values.push(email);
  }
  if (avatarUrl !== undefined) {
    sets.push(`avatar_url = $${idx++}`);
    values.push(avatarUrl);
  }
  if (newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);
    sets.push(`password_hash = $${idx++}`);
    values.push(hash);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  values.push(auth.employeeId);
  await pool.query(
    `UPDATE employees SET ${sets.join(", ")} WHERE id = $${idx}`,
    values,
  );

  return NextResponse.json({ ok: true });
}
