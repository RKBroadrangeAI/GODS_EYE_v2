import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  startOfMonth,
} from "date-fns";
import { pool } from "@/lib/db";
import { inventoryTierRanges } from "@/lib/constants";
import { safeDivide } from "@/lib/format";

type SaleFact = {
  sales_person_id: string;
  brand_id: string | null;
  condition_type_id: string | null;
  lead_source_id: string | null;
  in_person_option_id: string | null;
  profit: number;
  sold_for: number;
  age_days: number | null;
  is_cashed: boolean;
};

type PacingHeader = {
  daysInMonth: number;
  today: string;
  startDay: string;
  daysPassed: number;
};

export function buildPacingHeader(month: number, year: number): PacingHeader {
  const today = new Date();
  const startDayDate = startOfMonth(new Date(year, month - 1, 1));
  const endDayDate = endOfMonth(startDayDate);
  const daysInMonth = endDayDate.getDate();
  const isFutureMonth = isAfter(startDayDate, today);
  const isPastMonth = isBefore(endDayDate, today);
  const rawDays = differenceInCalendarDays(today, startDayDate) + 1;

  return {
    daysInMonth,
    today: format(today, "yyyy-MM-dd"),
    startDay: format(startDayDate, "yyyy-MM-dd"),
    daysPassed: isFutureMonth
      ? 0
      : isPastMonth
        ? daysInMonth
        : Math.min(daysInMonth, Math.max(0, rawDays)),
  };
}

export async function getSalesFactsByMonth(month: number, year: number) {
  const startDay = format(startOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");
  const endDay = format(endOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");

  const { rows } = await pool.query<SaleFact>(
    `SELECT sales_person_id, brand_id, condition_type_id, lead_source_id,
            in_person_option_id, profit, sold_for, age_days, is_cashed
     FROM sales
     WHERE date_out >= $1 AND date_out <= $2`,
    [startDay, endDay],
  );

  return rows;
}

export async function getSalesFactsByYear(year: number) {
  const { rows } = await pool.query<SaleFact & { date_out: string | null }>(
    `SELECT sales_person_id, brand_id, condition_type_id, lead_source_id,
            in_person_option_id, profit, sold_for, age_days, is_cashed, date_out
     FROM sales
     WHERE date_out >= $1 AND date_out <= $2`,
    [`${year}-01-01`, `${year}-12-31`],
  );

  return rows;
}

export async function getPeopleMap(onlyActive = true) {
  const sql = onlyActive
    ? `SELECT id, name, is_active FROM employees WHERE is_active = true ORDER BY name`
    : `SELECT id, name, is_active FROM employees ORDER BY name`;

  const { rows } = await pool.query<{ id: string; name: string; is_active: boolean }>(sql);

  return rows.map((person) => ({
    id: person.id,
    name: person.name,
    isActive: person.is_active,
  }));
}

type LookupTable = "brands" | "lead_sources" | "condition_types" | "in_person_options";
const ALLOWED_LOOKUP_TABLES: LookupTable[] = [
  "brands",
  "lead_sources",
  "condition_types",
  "in_person_options",
];

export async function getLookupMap(table: LookupTable) {
  if (!ALLOWED_LOOKUP_TABLES.includes(table)) throw new Error(`Disallowed table: ${table}`);
  const { rows } = await pool.query<{ id: string; name: string }>(
    // Table name is validated against whitelist above — safe to interpolate
    `SELECT id, name FROM ${table} WHERE is_active = true ORDER BY name`,
  );
  return new Map(rows.map((row) => [row.id, row.name]));
}

export function withPacingValue(value: number, header: PacingHeader) {
  if (header.daysPassed === 0) return null;
  return value * (header.daysInMonth / header.daysPassed);
}

export function aggregateCoreMetrics(rows: { profit: number; sold_for: number; age_days: number | null }[]) {
  const gp = rows.reduce((sum, row) => sum + Number(row.profit ?? 0), 0);
  const revenue = rows.reduce((sum, row) => sum + Number(row.sold_for ?? 0), 0);
  const units = rows.length;
  const ages = rows.map((row) => row.age_days).filter((value): value is number => value != null);
  const averageAging = ages.length ? ages.reduce((sum, age) => sum + age, 0) / ages.length : null;

  return {
    gp,
    revenue,
    units,
    gppu: safeDivide(gp, units),
    margin: safeDivide(gp, revenue),
    averagePrice: safeDivide(revenue, units),
    averageAging,
  };
}

export function aggregateInventoryTiers(rows: { sold_for: number; profit: number; age_days: number | null }[]) {
  const totalGp = rows.reduce((sum, row) => sum + Number(row.profit ?? 0), 0);

  return inventoryTierRanges.map(([low, high]) => {
    const bracketRows = rows.filter(
      (row) => Number(row.sold_for ?? 0) >= low && Number(row.sold_for ?? 0) <= high,
    );
    const count = bracketRows.length;
    const gp = bracketRows.reduce((sum, row) => sum + Number(row.profit ?? 0), 0);
    const revenue = bracketRows.reduce((sum, row) => sum + Number(row.sold_for ?? 0), 0);
    const ages = bracketRows.map((row) => row.age_days).filter((value): value is number => value != null);
    const aging = ages.length ? ages.reduce((sum, value) => sum + value, 0) / ages.length : null;

    return {
      low,
      high,
      count,
      gp,
      revenue,
      margin: safeDivide(gp, revenue),
      gppu: safeDivide(gp, count),
      aging,
      gpShare: safeDivide(gp, totalGp),
    };
  });
}
