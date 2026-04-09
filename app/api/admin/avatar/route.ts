import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";
import { revalidatePath } from "next/cache";

const MAX_SIZE = 500 * 1024; // 500 KB (will be stored as base64 in DB)
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;
  const employeeId = formData.get("employeeId") as string | null;

  // Admin/management can set any employee's avatar; others can only set their own
  const targetId = (auth.role === "admin" || auth.role === "management") && employeeId ? employeeId : auth.employeeId;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 500 KB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  await pool.query("UPDATE employees SET avatar_url = $1 WHERE id = $2", [dataUrl, targetId]);

  revalidatePath("/app/admin/employees");
  revalidatePath("/app");

  return NextResponse.json({ ok: true, avatarUrl: dataUrl });
}
