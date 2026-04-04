import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestAuth } from "@/lib/request-auth";
import { pool } from "@/lib/db";
import { buildAiContext, contextToPrompt } from "@/lib/ai-intelligence";

/* ------------------------------------------------------------------ */
/*  Database schema description for the LLM                           */
/* ------------------------------------------------------------------ */
const DB_SCHEMA = `
### PostgreSQL Database Schema — God's Eye Watch Sales Analytics

**sales** — Every watch transaction. KEY RULES: Always filter is_cashed = true for real numbers. Count units where profit > 0.
  id UUID PK, stock_number TEXT, reference TEXT, model TEXT,
  brand_id UUID → brands.id,
  sales_person_id UUID → employees.id,
  condition_type_id UUID → condition_types.id,
  lead_source_id UUID → lead_sources.id,
  in_person_option_id UUID → in_person_options.id,
  bracelet_type_id UUID → bracelet_types.id,
  dial_color_id UUID → dial_colors.id,
  bezel_type_id UUID → bezel_types.id,
  marker_type_id UUID → marker_types.id,
  year_value INT → years.value,
  date_in DATE, date_out DATE,
  cost NUMERIC, sold_for NUMERIC, profit NUMERIC, margin NUMERIC,
  age_days INT, month_number INT,
  is_cashed BOOLEAN, cashed_by TEXT, cashed_at TIMESTAMPTZ,
  selected BOOLEAN, submit_locked BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

**employees** — Sales associates / channels
  id UUID PK, name TEXT, email CITEXT, role app_role (admin|management|sales_associate|view_only),
  initials TEXT, is_active BOOLEAN, is_channel BOOLEAN

**brands** — Watch brands (ROLEX, AUDEMARS PIGUET, etc.)
  id UUID PK, name TEXT, is_active BOOLEAN

**condition_types** — Watch condition (NEW / STOCK, USED / STOCK, USED / CONS, NEW / CONS)
  id UUID PK, name TEXT, is_active BOOLEAN

**lead_sources** — Where the customer came from (Website, Walk In, Repeat, etc.)
  id UUID PK, name TEXT, is_active BOOLEAN

**in_person_options** — Channel: In Person or Remote
  id UUID PK, name TEXT, is_active BOOLEAN

**budgets** — Monthly planning targets
  id UUID PK, year INT, month INT,
  employee_id UUID → employees (NULL = company-wide),
  lead_source_id UUID → lead_sources (NULL = not lead-specific),
  condition_type_id UUID → condition_types (NULL = not condition-specific),
  gp_budget NUMERIC, unit_budget NUMERIC, revenue_budget NUMERIC,
  inventory_budget NUMERIC, avg_inventory_value NUMERIC, avg_days NUMERIC,
  margin_budget NUMERIC, per_unit_target NUMERIC, avg_price_target NUMERIC,
  weight NUMERIC, growth_percent NUMERIC, is_finalized BOOLEAN,
  profit_prev_year NUMERIC, units_prev_year INT, revenue_prev_year NUMERIC

**bracelet_types** — id UUID, name TEXT, is_active BOOLEAN
**dial_colors** — id UUID, name TEXT, is_active BOOLEAN
**bezel_types** — id UUID, name TEXT, is_active BOOLEAN
**marker_types** — id UUID, name TEXT, is_active BOOLEAN
**years** — value INT PK, is_active BOOLEAN
`;

/* ------------------------------------------------------------------ */
/*  SQL validation — read only, no mutations                          */
/* ------------------------------------------------------------------ */
const FORBIDDEN_KEYWORDS = [
  "INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE",
  "GRANT", "REVOKE", "COPY", "EXECUTE", "EXEC", "VACUUM",
  "REINDEX", "CLUSTER", "COMMENT", "SECURITY", "OWNER",
];

function validateSql(sql: string): { valid: boolean; reason?: string } {
  const upper = sql.toUpperCase().trim();

  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return { valid: false, reason: "Only SELECT queries are allowed." };
  }

  for (const kw of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${kw.trim()}\\b`, "i");
    if (regex.test(sql)) {
      return { valid: false, reason: `Forbidden keyword: ${kw.trim()}` };
    }
  }

  const trimmed = sql.replace(/;\s*$/, "");
  if (trimmed.includes(";")) {
    return { valid: false, reason: "Multi-statement queries are not allowed." };
  }

  return { valid: true };
}

/* ------------------------------------------------------------------ */
/*  Grok API helper                                                    */
/* ------------------------------------------------------------------ */
async function callGrok(messages: Array<{ role: string; content: string }>, temperature = 0.1) {
  const apiKey = process.env.XAI_GROK_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.XAI_GROK_MODEL ?? "grok-3-mini",
      temperature,
      messages,
    }),
  });

  if (!res.ok) return null;
  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? null;
}

/* ------------------------------------------------------------------ */
/*  Input schema                                                       */
/* ------------------------------------------------------------------ */
const schema = z.object({
  message: z.string().min(2),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().optional(),
});

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */
export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const month = parsed.data.month ?? new Date().getMonth() + 1;
  const year = parsed.data.year ?? 2026;
  const userQuestion = parsed.data.message;

  const apiKey = process.env.XAI_GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer: "Grok API key is not configured. Add XAI_GROK_API_KEY to your environment variables.",
      sql: null,
      data: null,
    });
  }

  // ── Step 1: Generate SQL from user question ──────────────────────
  const sqlPrompt = [
    {
      role: "system",
      content: `You are a PostgreSQL query generator for a luxury watch sales analytics system.
Given the user's question, generate a single read-only SELECT query to answer it.

${DB_SCHEMA}

RULES:
1. Output ONLY the raw SQL query — no markdown, no code fences, no explanation.
2. ALWAYS include "WHERE is_cashed = true" when querying sales.
3. Always JOIN lookup tables to show human-readable names instead of UUIDs.
4. Use appropriate aggregations (SUM, COUNT, AVG, ROUND).
5. ROUND monetary values to whole numbers: ROUND(value::numeric, 0)
6. ROUND percentages to 1 decimal: ROUND((value * 100)::numeric, 1)
7. Default year is ${year}. Default month is ${month}.
8. ORDER results meaningfully (usually by the main metric DESC).
9. LIMIT large result sets to 50 rows.
10. If the question cannot be answered from this schema, respond with exactly: CANNOT_ANSWER
11. For "units", use: SUM(CASE WHEN s.profit > 0 THEN 1 ELSE 0 END)
12. Never use INSERT, UPDATE, DELETE, DROP, or any mutation.`,
    },
    { role: "user", content: userQuestion },
  ];

  const generatedSql = await callGrok(sqlPrompt, 0.05);

  if (!generatedSql || generatedSql.trim() === "CANNOT_ANSWER") {
    // Fall back to context-only mode
    const context = await buildAiContext(month, year);
    const contextPrompt = contextToPrompt(context);

    const fallbackAnswer = await callGrok([
      {
        role: "system",
        content: `You are Ask Larry, the God's Eye AI sales intelligence assistant. Answer concisely with data-backed analysis. Format currency as $X,XXX and percentages as X.X%.`,
      },
      { role: "system", content: `Current data context:\n${contextPrompt}` },
      { role: "user", content: userQuestion },
    ], 0.2);

    return NextResponse.json({
      answer: fallbackAnswer ?? "I couldn't generate a query for that question. Try rephrasing.",
      sql: null,
      data: null,
    });
  }

  // Clean potential markdown code fences
  const cleanSql = generatedSql
    .replace(/^```sql\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // ── Step 2: Validate SQL is safe ─────────────────────────────────
  const validation = validateSql(cleanSql);
  if (!validation.valid) {
    return NextResponse.json({
      answer: `I generated a query but it was blocked for safety: ${validation.reason}. Please rephrase your question.`,
      sql: cleanSql,
      data: null,
    });
  }

  // ── Step 3: Execute the query ────────────────────────────────────
  let queryRows: Record<string, unknown>[];
  let queryError: string | null = null;

  try {
    const client = await pool.connect();
    try {
      await client.query("SET statement_timeout = '10000'");
      await client.query("SET default_transaction_read_only = ON");
      const result = await client.query(cleanSql);
      queryRows = result.rows;
    } finally {
      await client.query("SET default_transaction_read_only = OFF");
      await client.query("RESET statement_timeout");
      client.release();
    }
  } catch (err: unknown) {
    queryError = err instanceof Error ? err.message : String(err);
    queryRows = [];
  }

  if (queryError) {
    // SQL execution failed — retry with context-only fallback
    const context = await buildAiContext(month, year);
    const contextPrompt = contextToPrompt(context);

    const retryAnswer = await callGrok([
      {
        role: "system",
        content: `You are Ask Larry, God's Eye AI. The SQL query failed. Answer the question using the dashboard context below. Be honest if the data is limited.`,
      },
      { role: "system", content: `Dashboard context:\n${contextPrompt}` },
      {
        role: "user",
        content: `Question: ${userQuestion}\n\nNote: SQL query failed with: ${queryError}`,
      },
    ], 0.2);

    return NextResponse.json({
      answer: retryAnswer ?? "The query encountered an error. Please try a different question.",
      sql: cleanSql,
      data: null,
      error: queryError,
    });
  }

  // ── Step 4: Format results with LLM ──────────────────────────────
  const maxRows = 40;
  const displayRows = queryRows.slice(0, maxRows);
  const truncatedNote = queryRows.length > maxRows
    ? `\n(Showing ${maxRows} of ${queryRows.length} total rows)`
    : "";

  const dataJson = JSON.stringify(displayRows, null, 2);

  const formatAnswer = await callGrok([
    {
      role: "system",
      content: `You are Ask Larry, the God's Eye luxury watch sales intelligence assistant.
Format the SQL query results into a clear, professional answer.

FORMATTING RULES:
- Use markdown for structure (headers, bold, tables when appropriate)
- Format currency as $XX,XXX (with commas, no decimals)
- Format percentages as XX.X%
- If there's tabular data with 3+ rows, use a markdown table
- Add brief analytical insights (trends, top/bottom performers, notable figures)
- Keep the tone professional but conversational
- If results are empty, say so clearly
- Don't show the raw SQL to the user
- Be concise — key takeaways first, details second
- Reference the current date context: month ${month}/${year}`,
    },
    {
      role: "user",
      content: `Question: ${userQuestion}

Query results (${queryRows.length} rows):
${dataJson}${truncatedNote}`,
    },
  ], 0.3);

  return NextResponse.json({
    answer: formatAnswer ?? "Here are your results:\n\n" + dataJson,
    sql: cleanSql,
    data: displayRows,
    totalRows: queryRows.length,
  });
}
