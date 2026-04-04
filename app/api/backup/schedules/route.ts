import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// Ensure table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS backup_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      year INT NOT NULL DEFAULT 2026,
      month INT NOT NULL DEFAULT 1,
      frequency TEXT NOT NULL DEFAULT 'daily',
      last_run TIMESTAMPTZ,
      next_run TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

function computeNextRun(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case "daily":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

// GET - list all schedules
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTable();

    const { rows } = await pool.query(
      `SELECT id, year, month, frequency, last_run, next_run, created_at
       FROM backup_schedules ORDER BY created_at DESC`,
    );

    return NextResponse.json({
      schedules: rows.map((r) => ({
        id: r.id,
        year: r.year,
        month: r.month,
        frequency: r.frequency,
        lastRun: r.last_run,
        nextRun: r.next_run,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error("Backup schedule GET error:", error);
    return NextResponse.json({ error: "Failed to load schedules" }, { status: 500 });
  }
}

// POST - create new schedule
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTable();

    const body = await request.json();
    const { year = 2026, month = 1, frequency = "daily" } = body;

    if (!["daily", "weekly", "monthly"].includes(frequency)) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    }

    const nextRun = computeNextRun(frequency);

    await pool.query(
      `INSERT INTO backup_schedules (year, month, frequency, next_run)
       VALUES ($1, $2, $3, $4)`,
      [year, month, frequency, nextRun.toISOString()],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Backup schedule POST error:", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}

// PATCH - update last_run (after a manual "Run Now")
export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTable();

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Get current frequency to compute next_run
    const { rows } = await pool.query(`SELECT frequency FROM backup_schedules WHERE id = $1`, [id]);
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const nextRun = computeNextRun(rows[0].frequency);

    await pool.query(
      `UPDATE backup_schedules SET last_run = NOW(), next_run = $2 WHERE id = $1`,
      [id, nextRun.toISOString()],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Backup schedule PATCH error:", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}

// DELETE - remove a schedule
export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTable();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await pool.query(`DELETE FROM backup_schedules WHERE id = $1`, [id]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Backup schedule DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}
