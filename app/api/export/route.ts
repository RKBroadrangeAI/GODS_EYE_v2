import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getOverallSalesData, getInPersonRemoteData, getLeadPerformanceMonthlyData, getInventoryTiersData, getBrandPerformanceData, getInventoryMixData } from "@/lib/dashboard-data";
import { getSalesPerformanceData } from "@/lib/sales-performance";
import { getBudgetRows } from "@/lib/budgets";
import { requireAuth } from "@/lib/auth";
import { pool } from "@/lib/db";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function currency(v: number | null | undefined) {
  return v == null || Number.isNaN(v) ? "" : Math.round(v);
}

function pct(v: number | null | undefined) {
  return v == null || Number.isNaN(v) ? "" : Math.round(v * 1000) / 10; // e.g. 12.3
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year") ?? 2026);
    const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);

    const wb = XLSX.utils.book_new();

    // ----- 1. Budget vs Actuals -----
    try {
      const budgetRows = await getBudgetRows(year);
      const budgetData = budgetRows.map((r) => ({
        Month: r.monthLabel,
        "2025 GP": currency(r.profit2025),
        "2025 Units": r.units2025,
        "Per Unit 2025": currency(r.perUnit2025),
        "Avg Sold 2025": currency(r.avgSold2025),
        "Revenue 2025": currency(r.revenue2025),
        "Margin 2025": pct(r.margin2025),
        "Inventory Budget": currency(r.inventoryBudget),
        "Avg Days": r.averageDays,
        "Avg Inventory Value": currency(r.avgInventoryValue),
        "Instock Unit Budget": r.instockUnitBudget != null ? Math.round(r.instockUnitBudget) : "",
        "Margin Budget": pct(r.marginBudget),
        "GP Budget 2026": currency(r.gpBudget2026),
        "Growth %": pct(r.growthPercent),
        "Unit Budget 2026": r.unitBudget2026 != null ? Math.round(r.unitBudget2026) : "",
        "Per Unit 2026": currency(r.perUnit2026),
        "Ave Budget 2026": currency(r.aveBudget2026),
        "Revenue Budget 2026": currency(r.revenueBudget2026),
        "Actual GP 2026": currency(r.actualGp2026),
        "Tracking Delta": currency(r.trackingDelta),
        "YTD Delta": currency(r.ytdDelta),
      }));
      const ws1 = XLSX.utils.json_to_sheet(budgetData);
      XLSX.utils.book_append_sheet(wb, ws1, "Budget vs Actuals");
    } catch { /* skip sheet on error */ }

    // ----- 2. Overall Sales Performance -----
    try {
      const overall = await getOverallSalesData(year);
      const overallData = overall.rows.map((r) => ({
        "Sales Associate": r.salesAssociate,
        "Gross Profit": currency(r.grossProfit),
        Units: r.units,
        Revenue: currency(r.revenue),
        GPPU: currency(r.gppu),
        "Avg Aging": r.aging != null ? Math.round(r.aging) : "",
        "Margin %": pct(r.margin),
        "Avg Price": currency(r.avePrice),
      }));
      // Add totals row
      overallData.push({
        "Sales Associate": "TOTAL",
        "Gross Profit": currency(overall.totals.grossProfit),
        Units: overall.totals.units,
        Revenue: currency(overall.totals.revenue),
        GPPU: currency(overall.totals.gppu),
        "Avg Aging": "",
        "Margin %": pct(overall.totals.margin),
        "Avg Price": currency(overall.totals.avePrice),
      });
      const ws2 = XLSX.utils.json_to_sheet(overallData);
      XLSX.utils.book_append_sheet(wb, ws2, "Overall Sales");
    } catch { /* skip */ }

    // ----- 3. Sales Performance by Month -----
    try {
      const salesPerf = await getSalesPerformanceData(month, year);
      const spData = salesPerf.rows.map((r) => ({
        "Sales Associate": r.salesAssociate,
        "Closed GP": currency(r.closedGp),
        "Cashed GP": currency(r.cashedGp),
        "GP Budget": currency(r.gpBudget),
        "Pacing GP": currency(r.pacingGp),
        "Over/Under GP": currency(r.overUnderGp),
        Units: r.units,
        "Unit Budget": r.unitBudget,
        "Pacing Units": r.pacingUnits != null ? Math.round(r.pacingUnits) : "",
        "Over/Under Units": r.overUnderUnits != null ? Math.round(r.overUnderUnits) : "",
        Revenue: currency(r.revenue),
        "Pacing Revenue": currency(r.pacingRevenue),
        GPPU: currency(r.gppu),
        "Avg Aging": r.averageAging != null ? Math.round(r.averageAging) : "",
        "Margin %": pct(r.margin),
        "Avg Price": currency(r.averagePrice),
      }));
      const ws3 = XLSX.utils.json_to_sheet(spData);
      XLSX.utils.book_append_sheet(wb, ws3, `Sales Perf ${MONTHS[month - 1]}`);
    } catch { /* skip */ }

    // ----- 4. In Person vs Remote -----
    try {
      const ipr = await getInPersonRemoteData(month, year);
      const iprData = ipr.rows.map((r) => ({
        Category: r.category,
        GP: currency(r.gp),
        Deals: r.count,
        "Deals Share %": pct(r.dealsShare),
        "GP Share %": pct(r.gpShare),
        GPPU: currency(r.gppu),
      }));
      iprData.push({
        Category: "TOTAL",
        GP: currency(ipr.totals.totalGp),
        Deals: ipr.totals.totalCount,
        "Deals Share %": "",
        "GP Share %": "",
        GPPU: "",
      });
      const ws4 = XLSX.utils.json_to_sheet(iprData);
      XLSX.utils.book_append_sheet(wb, ws4, "In Person vs Remote");
    } catch { /* skip */ }

    // ----- 5. Lead Performance Monthly -----
    try {
      const leadPerf = await getLeadPerformanceMonthlyData(month, year);
      const lpData = leadPerf.rows.map((r) => ({
        "Lead Source": r.leadSource,
        GP: currency(r.gp),
        "GP Budget": currency(r.gpBudget),
        "Pacing GP": currency(r.pacingGp),
        "Over/Under GP": currency(r.overUnderGp),
        Units: r.units,
        "Unit Budget": r.unitBudget,
        "Pacing Units": r.pacingUnits != null ? Math.round(r.pacingUnits) : "",
        "Over/Under Units": r.overUnderUnits != null ? Math.round(r.overUnderUnits) : "",
        Revenue: currency(r.revenue),
        "Pacing Revenue": currency(r.pacingRevenue),
        GPPU: currency(r.gppu),
        "Avg Aging": r.aging != null ? Math.round(r.aging) : "",
        "Margin %": pct(r.margin),
        "Avg Price": currency(r.avePrice),
      }));
      const ws5 = XLSX.utils.json_to_sheet(lpData);
      XLSX.utils.book_append_sheet(wb, ws5, "Lead Perf Monthly");
    } catch { /* skip */ }

    // ----- 6. Inventory Tiers -----
    try {
      const tiers = await getInventoryTiersData(90);
      const tierData = tiers.rows.map((r) => ({
        "Price Range": `$${r.low.toLocaleString()} - $${r.high.toLocaleString()}`,
        Count: r.count,
        GP: currency(r.gp),
        Revenue: currency(r.revenue),
        "GP Share %": pct(r.gpShare),
        "Margin %": pct(r.margin),
        GPPU: currency(r.gppu),
        "Avg Aging": r.aging != null ? Math.round(r.aging) : "",
        "Per Day": Math.round(r.perDay * 100) / 100,
        "GP/Day": currency(r.gpPerDay),
      }));
      const ws6 = XLSX.utils.json_to_sheet(tierData);
      XLSX.utils.book_append_sheet(wb, ws6, "Inventory Tiers");
    } catch { /* skip */ }

    // ----- 7. Brand Performance -----
    try {
      const bp = await getBrandPerformanceData(year);
      const bpData = bp.rows.map((r) => ({
        Brand: r.brand,
        Condition: r.condition,
        "Units Share %": pct(r.unitsShare),
        "GP Share %": pct(r.gpShare),
        Revenue: currency(r.revenue),
        GP: currency(r.gp),
        Units: r.units,
        "Margin %": pct(r.margin),
        "Avg Aging": r.aging != null ? Math.round(r.aging) : "",
      }));
      const ws7 = XLSX.utils.json_to_sheet(bpData);
      XLSX.utils.book_append_sheet(wb, ws7, "Brand Performance");
    } catch { /* skip */ }

    // ----- 8. Inventory Mix -----
    try {
      const mix = await getInventoryMixData(month, year);
      const mixData = mix.rows.map((r) => ({
        "Inventory Type": r.inventoryType,
        GP: currency(r.gp),
        "GP Share %": pct(r.gpShare),
        "GP Budget": currency(r.gpBudget),
        "Pacing GP": currency(r.pacingGp),
        "Over/Under GP": currency(r.overUnderGp),
        Units: r.units,
        "Unit Budget": r.unitBudget,
        "Pacing Units": r.pacingUnits != null ? Math.round(r.pacingUnits) : "",
        "Over/Under Units": r.overUnderUnits != null ? Math.round(r.overUnderUnits) : "",
        Revenue: currency(r.revenue),
        "Pacing Revenue": currency(r.pacingRevenue),
        GPPU: currency(r.gppu),
        "Avg Aging": r.aging != null ? Math.round(r.aging) : "",
        "Margin %": pct(r.margin),
        "Avg Price": currency(r.avePrice),
      }));
      const ws8 = XLSX.utils.json_to_sheet(mixData);
      XLSX.utils.book_append_sheet(wb, ws8, "Inventory Mix");
    } catch { /* skip */ }

    // ----- 9. Data Log (raw sales) -----
    try {
      const { rows: salesRows } = await pool.query<{
        stock_number: string | null;
        date_in: string | null;
        date_out: string | null;
        brand_name: string | null;
        model: string | null;
        condition_name: string | null;
        sold_for: string;
        cost: string;
        profit: string;
        age_days: number | null;
        employee_name: string | null;
        lead_name: string | null;
        in_person_name: string | null;
        is_cashed: boolean;
      }>(
        `SELECT s.stock_number, s.date_in, s.date_out,
                b.name AS brand_name, s.model,
                ct.name AS condition_name,
                s.sold_for, s.cost, s.profit, s.age_days,
                e.name AS employee_name,
                ls.name AS lead_name,
                ipo.name AS in_person_name,
                s.is_cashed
         FROM sales s
         LEFT JOIN brands b ON b.id = s.brand_id
         LEFT JOIN condition_types ct ON ct.id = s.condition_type_id
         LEFT JOIN employees e ON e.id = s.sales_person_id
         LEFT JOIN lead_sources ls ON ls.id = s.lead_source_id
         LEFT JOIN in_person_options ipo ON ipo.id = s.in_person_option_id
         WHERE s.date_out >= $1 AND s.date_out <= $2
           AND s.is_cashed = true
         ORDER BY s.date_out DESC`,
        [`${year}-01-01`, `${year}-12-31`],
      );
      const dataLog = salesRows.map((r) => ({
        "Stock #": r.stock_number ?? "",
        "Date In": r.date_in ?? "",
        "Date Out": r.date_out ?? "",
        Brand: r.brand_name ?? "",
        Model: r.model ?? "",
        Condition: r.condition_name ?? "",
        "Sold For": currency(Number(r.sold_for ?? 0)),
        Cost: currency(Number(r.cost ?? 0)),
        Profit: currency(Number(r.profit ?? 0)),
        "Age Days": r.age_days ?? "",
        "Sales Person": r.employee_name ?? "",
        "Lead Source": r.lead_name ?? "",
        "In Person": r.in_person_name ?? "",
      }));
      const ws9 = XLSX.utils.json_to_sheet(dataLog);
      XLSX.utils.book_append_sheet(wb, ws9, "Data Log");
    } catch { /* skip */ }

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `Gods_Eye_${year}_${MONTHS[month - 1]}_Export.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
