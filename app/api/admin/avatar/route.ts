import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";
import { revalidatePath } from "next/cache";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;
  const employeeId = formData.get("employeeId") as string | null;

  // Admin can set any employee's avatar; non-admins can only set their own
  const targetId = auth.role === "admin" && employeeId ? employeeId : auth.employeeId;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${targetId}.${ext}`;
  const dir = path.join(process.cwd(), "public", "avatars");

  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const avatarUrl = `/avatars/${filename}?t=${Date.now()}`;
  await pool.query("UPDATE employees SET avatar_url = $1 WHERE id = $2", [avatarUrl, targetId]);

  revalidatePath("/app/admin/employees");
  revalidatePath("/app");

  return NextResponse.json({ ok: true, avatarUrl });
}
