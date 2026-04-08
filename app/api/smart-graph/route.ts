import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { pool } from "@/lib/db";
import { inventoryTierRanges } from "@/lib/constants";

/**
 * Smart-Graph drill-down API.
 *
 * Query params:
 *   year         – e.g. 2026
 *   dimensions   – comma-separated ordered list
 *   filters      – JSON object of already-selected nodes
 *
 * Supported dimensions:
 *   person, brand, lead_source, condition, channel  (lookup-table joins)
 *   inventory_tier  (computed price brackets from sold_for)
 *   month           (performance by calendar month)
 */

/* ── Standard lookup-table dimensions ─────────────── */

const LOOKUP_DIMENSIONS: Record<
  string,
  { column: string; table: string }
> = {
  person: { column: "sales_person_id", table: "employees" },
  brand: { column: "brand_id", table: "brands" },
  lead_source: { column: "lead_source_id", table: "lead_sources" },
  condition: { column: "condition_type_id", table: "condition_types" },
  channel: { column: "in_person_option_id", table: "in_person_options" },
};

const COMPUTED_DIMENSIONS = ["inventory_tier", "month"] as const;
const VALID_DIMENSIONS = [...Object.keys(LOOKUP_DIMENSIONS), ...COMPUTED_DIMENSIONS];

/* ── Tier label helpers ───────────────────────────── */

function tierLabel(low: number, high: number) {
  if (high >= 999999) return "$200K+";
  return `$${(low / 1000).toFixed(0)}K–$${(high / 1000).toFixed(0)}K`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? 2026);
  const dimensionsRaw = searchParams.get("dimensions") ?? "";
  const filtersRaw = searchParams.get("filters") ?? "{}";

  const dimensions = dimensionsRaw.split(",").filter((d) => VALID_DIMENSIONS.includes(d));
  if (dimensions.length === 0) {
    return NextResponse.json({ error: "No valid dimensions" }, { status: 400 });
  }

  let filters: Record<string, string> = {};
  try {
    filters = JSON.parse(filtersRaw);
  } catch {
    return NextResponse.json({ error: "Invalid filters JSON" }, { status: 400 });
  }

  // Find next un-drilled dimension
  let targetDim: string | null = null;
  for (const dim of dimensions) {
    if (!filters[dim]) {
      targetDim = dim;
      break;
    }
  }

  if (!targetDim) {
    // All dimensions drilled — return individual sale rows
    const detailParams: (string | number)[] = [`${year}-01-01`, `${year}-12-31`];
    let detailIdx = 3;
    const detailWhere = [
      `s.date_out >= $1`,
      `s.date_out <= $2`,
      `s.is_cashed = true`,
    ];
    for (const [dim, value] of Object.entries(filters)) {
      if (!VALID_DIMENSIONS.includes(dim)) continue;
      if (dim === "inventory_tier") {
        const [lo, hi] = value.split("-").map(Number);
        if (!isNaN(lo) && !isNaN(hi)) {
          detailWhere.push(`s.sold_for >= $${detailIdx}`);
          detailParams.push(lo);
          detailIdx++;
          detailWhere.push(`s.sold_for <= $${detailIdx}`);
          detailParams.push(hi);
          detailIdx++;
        }
      } else if (dim === "month") {
        detailWhere.push(`EXTRACT(MONTH FROM s.date_out)::int = $${detailIdx}`);
        detailParams.push(Number(value));
        detailIdx++;
      } else if (LOOKUP_DIMENSIONS[dim]) {
        detailWhere.push(`s.${LOOKUP_DIMENSIONS[dim].column} = $${detailIdx}`);
        detailParams.push(value);
        detailIdx++;
      }
    }
    const detailSql = `
      SELECT
        s.id,
        b.name AS brand,
        s.reference,
        s.stock_number,
        s.sold_for::float,
        s.profit::float,
        s.date_out
      FROM sales s
      LEFT JOIN brands b ON b.id = s.brand_id
      WHERE ${detailWhere.join(" AND ")}
      ORDER BY s.date_out DESC, s.sold_for DESC
    `;
    const { rows: details } = await pool.query<{
      id: string;
      brand: string | null;
      reference: string | null;
      stock_number: string | null;
      sold_for: number;
      profit: number;
      date_out: string;
    }>(detailSql, detailParams);

    return NextResponse.json({ nodes: [], fullyDrilled: true, saleDetails: details });
  }

  // Build base WHERE + params
  const params: (string | number)[] = [`${year}-01-01`, `${year}-12-31`];
  let paramIdx = 3;

  const whereParts = [
    `s.date_out >= $1`,
    `s.date_out <= $2`,
    `s.is_cashed = true`,
  ];

  for (const [dim, value] of Object.entries(filters)) {
    if (!VALID_DIMENSIONS.includes(dim)) continue;

    if (dim === "inventory_tier") {
      // value is "low-high"
      const [lo, hi] = value.split("-").map(Number);
      if (!isNaN(lo) && !isNaN(hi)) {
        whereParts.push(`s.sold_for >= $${paramIdx}`);
        params.push(lo);
        paramIdx++;
        whereParts.push(`s.sold_for <= $${paramIdx}`);
        params.push(hi);
        paramIdx++;
      }
    } else if (dim === "month") {
      whereParts.push(`EXTRACT(MONTH FROM s.date_out)::int = $${paramIdx}`);
      params.push(Number(value));
      paramIdx++;
    } else if (LOOKUP_DIMENSIONS[dim]) {
      const col = LOOKUP_DIMENSIONS[dim].column;
      whereParts.push(`s.${col} = $${paramIdx}`);
      params.push(value);
      paramIdx++;
    }
  }

  const whereClause = whereParts.join(" AND ");

  /* ── Computed dimension: inventory_tier ──────────── */
  if (targetDim === "inventory_tier") {
    // Build CASE expression for tier buckets
    const caseLines = inventoryTierRanges.map(
      ([lo, hi]) => `WHEN s.sold_for >= ${lo} AND s.sold_for <= ${hi} THEN '${lo}-${hi}'`,
    );
    const sql = `
      SELECT
        CASE ${caseLines.join(" ")} ELSE 'other' END AS tier_id,
        COALESCE(SUM(s.profit), 0)::float AS gp,
        COALESCE(SUM(s.sold_for), 0)::float AS revenue,
        COUNT(CASE WHEN s.profit > 0 THEN 1 END)::int AS units,
        CASE WHEN SUM(s.sold_for) > 0
             THEN (SUM(s.profit) / SUM(s.sold_for))::float ELSE 0 END AS margin
      FROM sales s
      WHERE ${whereClause}
      GROUP BY tier_id
      ORDER BY MIN(s.sold_for)
    `;
    const { rows } = await pool.query<{
      tier_id: string;
      gp: number;
      revenue: number;
      units: number;
      margin: number;
    }>(sql, params);

    const nodes = rows
      .filter((r) => r.units > 0 && r.tier_id !== "other")
      .map((r) => {
        const [lo, hi] = r.tier_id.split("-").map(Number);
        return {
          id: r.tier_id,
          name: tierLabel(lo, hi),
          gp: r.gp,
          revenue: r.revenue,
          units: r.units,
          margin: r.margin,
        };
      });

    // If this is the last dimension, include per-node sale details
    const isLastDim = dimensions.indexOf(targetDim) === dimensions.length - 1;
    let saleDetailsByNode: Record<string, unknown[]> | undefined;
    if (isLastDim) {
      const detailSql = `
        SELECT
          s.id,
          b.name AS brand,
          s.reference,
          s.stock_number,
          s.sold_for::float,
          s.profit::float,
          s.date_out,
          CASE ${caseLines.join(" ")} ELSE 'other' END AS tier_id
        FROM sales s
        LEFT JOIN brands b ON b.id = s.brand_id
        WHERE ${whereClause}
        ORDER BY s.date_out DESC, s.sold_for DESC
      `;
      const { rows: details } = await pool.query(detailSql, params);
      saleDetailsByNode = {};
      for (const d of details) {
        const key = d.tier_id as string;
        if (!saleDetailsByNode[key]) saleDetailsByNode[key] = [];
        saleDetailsByNode[key].push({ id: d.id, brand: d.brand, reference: d.reference, stock_number: d.stock_number, sold_for: d.sold_for, profit: d.profit, date_out: d.date_out });
      }
    }

    return NextResponse.json({ nodes, dimension: targetDim, fullyDrilled: false, ...(saleDetailsByNode ? { saleDetailsByNode } : {}) });
  }

  /* ── Computed dimension: month ───────────────────── */
  if (targetDim === "month") {
    const sql = `
      SELECT
        EXTRACT(MONTH FROM s.date_out)::int AS month_num,
        COALESCE(SUM(s.profit), 0)::float AS gp,
        COALESCE(SUM(s.sold_for), 0)::float AS revenue,
        COUNT(CASE WHEN s.profit > 0 THEN 1 END)::int AS units,
        CASE WHEN SUM(s.sold_for) > 0
             THEN (SUM(s.profit) / SUM(s.sold_for))::float ELSE 0 END AS margin
      FROM sales s
      WHERE ${whereClause}
      GROUP BY month_num
      ORDER BY month_num
    `;
    const { rows } = await pool.query<{
      month_num: number;
      gp: number;
      revenue: number;
      units: number;
      margin: number;
    }>(sql, params);

    const nodes = rows
      .filter((r) => r.units > 0)
      .map((r) => ({
        id: String(r.month_num),
        name: MONTH_NAMES[r.month_num - 1] ?? `Month ${r.month_num}`,
        gp: r.gp,
        revenue: r.revenue,
        units: r.units,
        margin: r.margin,
      }));

    const isLastDim = dimensions.indexOf(targetDim) === dimensions.length - 1;
    let saleDetailsByNode: Record<string, unknown[]> | undefined;
    if (isLastDim) {
      const detailSql = `
        SELECT
          s.id,
          b.name AS brand,
          s.reference,
          s.stock_number,
          s.sold_for::float,
          s.profit::float,
          s.date_out,
          EXTRACT(MONTH FROM s.date_out)::int AS month_num
        FROM sales s
        LEFT JOIN brands b ON b.id = s.brand_id
        WHERE ${whereClause}
        ORDER BY s.date_out DESC, s.sold_for DESC
      `;
      const { rows: details } = await pool.query(detailSql, params);
      saleDetailsByNode = {};
      for (const d of details) {
        const key = String(d.month_num);
        if (!saleDetailsByNode[key]) saleDetailsByNode[key] = [];
        saleDetailsByNode[key].push({ id: d.id, brand: d.brand, reference: d.reference, stock_number: d.stock_number, sold_for: d.sold_for, profit: d.profit, date_out: d.date_out });
      }
    }

    return NextResponse.json({ nodes, dimension: targetDim, fullyDrilled: false, ...(saleDetailsByNode ? { saleDetailsByNode } : {}) });
  }

  /* ── Standard lookup-table dimension ────────────── */
  const config = LOOKUP_DIMENSIONS[targetDim];
  const extraSelect = targetDim === "person" ? `, t.avatar_url` : "";
  const extraGroup = targetDim === "person" ? `, t.avatar_url` : "";

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
      ${extraSelect}
    FROM ${config.table} t
    LEFT JOIN sales s ON s.${config.column} = t.id AND ${whereClause}
    WHERE t.is_active = true
    GROUP BY t.id, t.name${extraGroup}
    ORDER BY COALESCE(SUM(s.profit), 0) DESC
  `;

  const { rows } = await pool.query<{
    id: string;
    name: string;
    gp: number;
    revenue: number;
    units: number;
    margin: number;
    avatar_url?: string | null;
  }>(sql, params);

  const filteredNodes = rows
    .filter((r) => r.units > 0 || r.gp !== 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      gp: r.gp,
      revenue: r.revenue,
      units: r.units,
      margin: r.margin,
      ...(r.avatar_url ? { avatarUrl: r.avatar_url } : {}),
    }));

  // If this is the last dimension, include per-node sale details
  const isLastDim = dimensions.indexOf(targetDim) === dimensions.length - 1;
  let saleDetailsByNode: Record<string, unknown[]> | undefined;
  if (isLastDim) {
    const detailSql = `
      SELECT
        s.id,
        b.name AS brand,
        s.reference,
        s.stock_number,
        s.sold_for::float,
        s.profit::float,
        s.date_out,
        s.${config.column}::text AS group_id
      FROM sales s
      LEFT JOIN brands b ON b.id = s.brand_id
      WHERE ${whereClause}
      ORDER BY s.date_out DESC, s.sold_for DESC
    `;
    const { rows: details } = await pool.query(detailSql, params);
    saleDetailsByNode = {};
    for (const d of details) {
      const key = d.group_id as string;
      if (!saleDetailsByNode[key]) saleDetailsByNode[key] = [];
      saleDetailsByNode[key].push({ id: d.id, brand: d.brand, reference: d.reference, stock_number: d.stock_number, sold_for: d.sold_for, profit: d.profit, date_out: d.date_out });
    }
  }

  return NextResponse.json({
    nodes: filteredNodes,
    dimension: targetDim,
    fullyDrilled: false,
    ...(saleDetailsByNode ? { saleDetailsByNode } : {}),
  });
}
