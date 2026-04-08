import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { pool } from "@/lib/db";

/**
 * Smart-Graph drill-down API.
 *
 * Query params:
 *   year         – e.g. 2026
 *   dimensions   – comma-separated ordered list: person,brand,lead_source,condition,channel
 *   filters      – JSON object  { person?: id, brand?: id, ... } already-selected nodes
 *
 * Returns: { nodes: { id, name, gp, revenue, units, margin }[] }
 *   These are the children at the next un-drilled dimension.
 */

const DIMENSION_CONFIG: Record<
  string,
  { column: string; table: string; labelColumn?: string }
> = {
  person: { column: "sales_person_id", table: "employees" },
  brand: { column: "brand_id", table: "brands" },
  lead_source: { column: "lead_source_id", table: "lead_sources" },
  condition: { column: "condition_type_id", table: "condition_types" },
  channel: { column: "in_person_option_id", table: "in_person_options" },
};

const VALID_DIMENSIONS = Object.keys(DIMENSION_CONFIG);

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? 2026);
  const dimensionsRaw = searchParams.get("dimensions") ?? "";
  const filtersRaw = searchParams.get("filters") ?? "{}";

  // Validate dimensions
  const dimensions = dimensionsRaw.split(",").filter((d) => VALID_DIMENSIONS.includes(d));
  if (dimensions.length === 0) {
    return NextResponse.json({ error: "No valid dimensions" }, { status: 400 });
  }

  // Parse filters safely
  let filters: Record<string, string> = {};
  try {
    filters = JSON.parse(filtersRaw);
  } catch {
    return NextResponse.json({ error: "Invalid filters JSON" }, { status: 400 });
  }

  // Determine which dimension to aggregate next
  // Walk the ordered dimensions; the first one not yet in filters is the drill target
  let targetDim: string | null = null;
  for (const dim of dimensions) {
    if (!filters[dim]) {
      targetDim = dim;
      break;
    }
  }

  if (!targetDim) {
    // All dimensions drilled down — return individual sales
    return NextResponse.json({ nodes: [], fullyDrilled: true });
  }

  const config = DIMENSION_CONFIG[targetDim];
  const params: (string | number)[] = [`${year}-01-01`, `${year}-12-31`];
  let paramIdx = 3;

  // Build WHERE clause from existing filters
  const whereParts = [
    `s.date_out >= $1`,
    `s.date_out <= $2`,
    `s.is_cashed = true`,
  ];

  for (const [dim, value] of Object.entries(filters)) {
    if (!VALID_DIMENSIONS.includes(dim)) continue;
    const col = DIMENSION_CONFIG[dim].column;
    whereParts.push(`s.${col} = $${paramIdx}`);
    params.push(value);
    paramIdx++;
  }

  const whereClause = whereParts.join(" AND ");

  // Aggregate at target dimension level
  const sql = `
    SELECT
      t.id,
      t.name,
      COALESCE(SUM(s.profit), 0)::float AS gp,
      COALESCE(SUM(s.sold_for), 0)::float AS revenue,
      COUNT(CASE WHEN s.profit > 0 THEN 1 END)::int AS units,
      CASE WHEN SUM(s.sold_for) > 0
           THEN (SUM(s.profit) / SUM(s.sold_for))::float
           ELSE 0 END AS margin
    FROM ${config.table} t
    LEFT JOIN sales s ON s.${config.column} = t.id AND ${whereClause}
    WHERE t.is_active = true
    GROUP BY t.id, t.name
    ORDER BY COALESCE(SUM(s.profit), 0) DESC
  `;

  const { rows } = await pool.query<{
    id: string;
    name: string;
    gp: number;
    revenue: number;
    units: number;
    margin: number;
  }>(sql, params);

  return NextResponse.json({
    nodes: rows.filter((r) => r.units > 0 || r.gp !== 0),
    dimension: targetDim,
    fullyDrilled: false,
  });
}
