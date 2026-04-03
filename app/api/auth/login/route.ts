import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import type { AppRole } from "@/types/database";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const { rows } = await pool.query<{
    id: string;
    role: AppRole;
    name: string;
    initials: string | null;
    email: string;
    password_hash: string | null;
    is_active: boolean;
  }>(
    `SELECT id, role, name, initials, email, password_hash, is_active
     FROM employees
     WHERE email = $1
     LIMIT 1`,
    [email.toLowerCase()],
  );

  const employee = rows[0];

  if (!employee || !employee.is_active) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!employee.password_hash) {
    return NextResponse.json({ error: "Account not configured for login" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, employee.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSessionToken({
    employeeId: employee.id,
    role: employee.role,
    name: employee.name,
    initials: employee.initials,
    email: employee.email,
  });

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, token);
  return response;
}
