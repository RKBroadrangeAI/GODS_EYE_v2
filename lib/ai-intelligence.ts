import { format, endOfMonth } from "date-fns";
import { getSalesPerformanceData } from "@/lib/sales-performance";
import { pool } from "@/lib/db";
import { safeDivide } from "@/lib/format";

export type AiContext = {
  month: number;
  year: number;
  topPerformer: string;
  underBudget: string[];
  forecasts: Array<{ name: string; projectedYearGp: number }>;
  anomalies: string[];
  recommendations: string[];
};

export async function buildAiContext(month: number, year: number): Promise<AiContext> {
  const pacing = await getSalesPerformanceData(month, year);

  const top = pacing.rows.slice().sort((a, b) => b.closedGp - a.closedGp)[0];
  const underBudget = pacing.rows
    .filter((row) => (row.overUnderGp ?? 0) < 0)
    .sort((a, b) => (a.overUnderGp ?? 0) - (b.overUnderGp ?? 0))
    .slice(0, 5)
    .map((row) => `${row.salesAssociate} (${Math.abs(row.overUnderGp ?? 0).toFixed(0)} below budget)`);

  const mStr = String(month).padStart(2, "0");
  const prevMonth = Math.max(1, month - 1);
  const prevMStr = String(prevMonth).padStart(2, "0");

  const currStart = `${year}-${mStr}-01`;
  const currEnd = format(endOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");
  const prevStart = `${year}-${prevMStr}-01`;
  const prevEnd = format(endOfMonth(new Date(year, prevMonth - 1, 1)), "yyyy-MM-dd");

  const [prevResult, currResult] = await Promise.all([
    pool.query<{ profit: string }>(
      `SELECT profit FROM sales WHERE date_out >= $1 AND date_out <= $2 AND is_cashed = true`,
      [prevStart, prevEnd],
    ),
    pool.query<{ profit: string; sold_for: string; cost: string; age_days: number | null }>(
      `SELECT profit, sold_for, cost, age_days FROM sales WHERE date_out >= $1 AND date_out <= $2 AND is_cashed = true`,
      [currStart, currEnd],
    ),
  ]);

  const previousMonthSales = prevResult.rows.map((r) => ({ profit: Number(r.profit) }));
  const monthSales = currResult.rows.map((r) => ({
    profit: Number(r.profit),
    sold_for: Number(r.sold_for),
    cost: Number(r.cost),
    age_days: r.age_days,
  }));

  const forecasts = pacing.rows.map((row) => {
    const projectedYearGp = row.pacingGp == null ? row.closedGp * 12 : row.pacingGp * 12;
    return {
      name: row.salesAssociate,
      projectedYearGp,
    };
  }).sort((a, b) => b.projectedYearGp - a.projectedYearGp);

  const marginAnomalies = monthSales
    .filter((sale) => {
      const soldFor = Number(sale.sold_for ?? 0);
      const cost = Number(sale.cost ?? 0);
      const margin = soldFor === 0 ? 0 : (soldFor - cost) / soldFor;
      return margin < 0.08;
    })
    .length;

  const ageAnomalies = monthSales.filter((sale) => Number(sale.age_days ?? 0) > 60).length;

  const previousTotal = previousMonthSales.reduce((sum, row) => sum + Number(row.profit ?? 0), 0);
  const currentTotal = monthSales.reduce((sum, row) => sum + Number(row.profit ?? 0), 0);
  const pacingDrop = previousTotal > 0 ? (previousTotal - currentTotal) / previousTotal : 0;

  const anomalies = [
    `Low-margin deals (<8% margin): ${marginAnomalies}`,
    `Aging outliers (>60 days): ${ageAnomalies}`,
    `Pacing drop vs prior month: ${(pacingDrop * 100).toFixed(1)}%`,
  ];

  const [inPersonResult, optionsResult] = await Promise.all([
    pool.query<{ in_person_option_id: string | null; profit: string; sold_for: string }>(
      `SELECT in_person_option_id, profit, sold_for FROM sales WHERE date_out >= $1 AND date_out <= $2 AND is_cashed = true`,
      [currStart, currEnd],
    ),
    pool.query<{ id: string; name: string }>(`SELECT id, name FROM in_person_options`),
  ]);

  const inPersonOptions = optionsResult.rows;
  const remoteInPerson = inPersonResult.rows.map((r) => ({
    in_person_option_id: r.in_person_option_id,
    profit: Number(r.profit),
    sold_for: Number(r.sold_for),
  }));

  const optionMap = new Map(inPersonOptions.map((row) => [row.id, row.name.toLowerCase()]));

  const remoteRows = remoteInPerson.filter((row) => optionMap.get(row.in_person_option_id ?? "") === "remote");
  const inPersonRows = remoteInPerson.filter((row) => optionMap.get(row.in_person_option_id ?? "") === "in person");

  const remoteMargin = safeDivide(
    remoteRows.reduce((s, r) => s + Number(r.profit ?? 0), 0),
    remoteRows.reduce((s, r) => s + Number(r.sold_for ?? 0), 0),
  );
  const inPersonMargin = safeDivide(
    inPersonRows.reduce((s, r) => s + Number(r.profit ?? 0), 0),
    inPersonRows.reduce((s, r) => s + Number(r.sold_for ?? 0), 0),
  );

  const recommendations = [
    remoteMargin != null && inPersonMargin != null && remoteMargin > inPersonMargin
      ? `Focus on Remote sales — ${((remoteMargin - inPersonMargin) * 100).toFixed(1)}% higher margin.`
      : "Balance channel mix: current margin delta between Remote and In Person is minimal.",
    underBudget[0]
      ? `Coach ${underBudget[0].split(" (")[0]} on pace conversion and deal velocity this week.`
      : "Team pacing is on target; keep current execution cadence.",
    ageAnomalies > 0
      ? `Prioritize ${ageAnomalies} aging units >60 days with targeted discount campaigns.`
      : "No urgent aging inventory anomalies this month.",
  ];

  return {
    month,
    year,
    topPerformer: top?.salesAssociate ?? "N/A",
    underBudget,
    forecasts,
    anomalies,
    recommendations,
  };
}

export function contextToPrompt(context: AiContext) {
  return `Date: ${format(new Date(), "yyyy-MM-dd")}
Month: ${context.month}/${context.year}
Top performer: ${context.topPerformer}
Under budget: ${context.underBudget.join("; ") || "None"}
Forecasts: ${context.forecasts.slice(0, 5).map((f) => `${f.name}:${f.projectedYearGp.toFixed(0)}`).join("; ")}
Anomalies: ${context.anomalies.join("; ")}
Recommendations: ${context.recommendations.join("; ")}`;
}
