import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";
import { revalidatePath } from "next/cache";

const ALLOWED_TABLES = [
  "brands",
  "lead_sources",
  "condition_types",
  "bracelet_types",
  "dial_colors",
  "bezel_types",
  "marker_types",
  "in_person_options",
] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

const schema = z.object({
  table: z.enum(ALLOWED_TABLES),
  name: z.string().min(1),
});

const deactivateSchema = z.object({
  table: z.enum(ALLOWED_TABLES),
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth || (auth.role !== "admin" && auth.role !== "management")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Table is validated against ALLOWED_TABLES whitelist — safe to interpolate
  const table = parsed.data.table as AllowedTable;

  try {
    await pool.query(
      `INSERT INTO ${table} (name, is_active) VALUES ($1, true)`,
      [parsed.data.name],
    );

    revalidatePath("/app/admin/dropdowns");
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

  const parsed = deactivateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Table is validated against ALLOWED_TABLES whitelist — safe to interpolate
  const table = parsed.data.table as AllowedTable;

  try {
    await pool.query(
      `UPDATE ${table} SET is_active = $1 WHERE id = $2`,
      [parsed.data.isActive, parsed.data.id],
    );

    revalidatePath("/app/admin/dropdowns");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
