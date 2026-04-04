import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
  getOverallSalesData,
  getInPersonRemoteData,
  getLeadPerformanceMonthlyData,
  getInventoryTiersData,
  getBrandPerformanceData,
  getBrandPerformanceM2MData,
  getInventoryMixData,
  getInventoryMixPerSalespersonData,
  getLeadPerformanceAnnualData,
  getLeadPerformanceM2MData,
} from "@/lib/dashboard-data";
import { getSalesPerformanceData } from "@/lib/sales-performance";
import { getBudgetRows } from "@/lib/budgets";
import { requireAuth } from "@/lib/auth";
import { pool } from "@/lib/db";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/* Individual sales-person tab mapping */
const INDIVIDUAL_TABS: { dbName: string; sheetName: string }[] = [
  { dbName: "DJ ALLEN", sheetName: "DJ SALES" },
  { dbName: "NOAH ALLEN", sheetName: "NOAH SALES" },
  { dbName: "ADAM COHEN", sheetName: "ADAM SALES" },
  { dbName: "RYAN TURRY", sheetName: "RYAN SALES" },
  { dbName: "MATT FEIST", sheetName: "MATT SALES" },
  { dbName: "LES", sheetName: "LES SALES" },
  { dbName: "LUIS BERRIOS", sheetName: "LUIS SALES" },
  { dbName: "AUCTION", sheetName: "AUCTION SALES" },
  { dbName: "DEALER SHOW", sheetName: "SHOW SALES" },
  { dbName: "JESSE ARROWOOD", sheetName: "JESSE SALES" },
];

/* ── Color constants matching the reference Excel ── */
const BLACK: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
const GOLD: ExcelJS.FillPattern  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBBC04" } };
const GREEN: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF34A853" } };
const GRAY: ExcelJS.FillPattern  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF999999" } };

const WHITE_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true, name: "Arial", size: 11 };
const BLACK_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF000000" }, bold: true, name: "Arial", size: 11 };
const TITLE_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true, name: "Arial", size: 14 };
const DATA_FONT: Partial<ExcelJS.Font>  = { color: { argb: "FFFFFFFF" }, name: "Arial", size: 10 };

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: "FF444444" } },
  left:   { style: "thin", color: { argb: "FF444444" } },
  bottom: { style: "thin", color: { argb: "FF444444" } },
  right:  { style: "thin", color: { argb: "FF444444" } },
};

/* ── Format helpers ── */
function cur(v: number | null | undefined): number | string {
  return v == null || Number.isNaN(v) ? "" : Math.round(v);
}
function pctDisp(v: number | null | undefined): number | string {
  return v == null || Number.isNaN(v) ? "" : Math.round(v * 1000) / 10;
}

/* ── Worksheet styling helpers ── */
function styleHeaderRow(ws: ExcelJS.Worksheet, rowNum: number, colCount: number) {
  const row = ws.getRow(rowNum);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = GOLD;
    cell.font = WHITE_FONT;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }
  row.height = 22;
}

function styleDataRows(ws: ExcelJS.Worksheet, startRow: number, endRow: number, colCount: number) {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.fill = BLACK;
      cell.font = DATA_FONT;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  }
}

function addTitleRow(ws: ExcelJS.Worksheet, title: string, colCount: number, rowNum = 1) {
  ws.mergeCells(rowNum, 1, rowNum, colCount);
  const cell = ws.getCell(rowNum, 1);
  cell.value = title;
  cell.fill = BLACK;
  cell.font = TITLE_FONT;
  cell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(rowNum).height = 28;
}

function addSubtitleRow(ws: ExcelJS.Worksheet, text: string, colCount: number, rowNum = 2) {
  ws.mergeCells(rowNum, 1, rowNum, colCount);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.fill = GREEN;
  cell.font = BLACK_FONT;
  cell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(rowNum).height = 22;
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value?.toString().length ?? 0;
      if (len + 2 > max) max = len + 2;
    });
    col.width = Math.min(max, 30);
  });
}

function addDataSheet(
  ws: ExcelJS.Worksheet,
  headers: string[],
  rows: (string | number)[][],
  opts?: { startRow?: number },
) {
  const startRow = opts?.startRow ?? 1;
  const colCount = headers.length;

  const headerRow = ws.getRow(startRow);
  headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
  styleHeaderRow(ws, startRow, colCount);

  rows.forEach((dataRow, ri) => {
    const row = ws.getRow(startRow + 1 + ri);
    dataRow.forEach((val, ci) => { row.getCell(ci + 1).value = val as ExcelJS.CellValue; });
  });

  const endRow = startRow + rows.length;
  styleDataRows(ws, startRow + 1, endRow, colCount);
  return { headerRow: startRow, dataEndRow: endRow, colCount };
}

/* ── Raw sales types & query ── */
interface RawSaleRow {
  brand_name: string | null;
  employee_name: string | null;
  condition_name: string | null;
  stock_number: string | null;
  reference: string | null;
  year_value: number | null;
  bracelet_name: string | null;
  dial_name: string | null;
  bezel_name: string | null;
  marker_name: string | null;
  date_in: string | null;
  date_out: string | null;
  cost: string;
  sold_for: string;
  sold_to: string | null;
  in_person_name: string | null;
  lead_name: string | null;
  is_cashed: boolean;
  margin: string;
  profit: string;
  month_number: number | null;
  count_constant: number | null;
  age_days: number | null;
}

async function fetchAllSalesRows(year: number): Promise<RawSaleRow[]> {
  const { rows } = await pool.query<RawSaleRow>(
    `SELECT
       b.name   AS brand_name,
       e.name   AS employee_name,
       ct.name  AS condition_name,
       s.stock_number, s.reference, s.year_value,
       bt.name  AS bracelet_name,
       dc.name  AS dial_name,
       bz.name  AS bezel_name,
       mk.name  AS marker_name,
       s.date_in, s.date_out, s.cost, s.sold_for, s.sold_to,
       ipo.name AS in_person_name,
       ls.name  AS lead_name,
       s.is_cashed, s.margin, s.profit,
       s.month_number, s.count_constant, s.age_days
     FROM sales s
     LEFT JOIN brands           b   ON b.id   = s.brand_id
     LEFT JOIN condition_types  ct  ON ct.id  = s.condition_type_id
     LEFT JOIN employees        e   ON e.id   = s.sales_person_id
     LEFT JOIN lead_sources     ls  ON ls.id  = s.lead_source_id
     LEFT JOIN in_person_options ipo ON ipo.id = s.in_person_option_id
     LEFT JOIN bracelet_types   bt  ON bt.id  = s.bracelet_type_id
     LEFT JOIN dial_colors      dc  ON dc.id  = s.dial_color_id
     LEFT JOIN bezel_types      bz  ON bz.id  = s.bezel_type_id
     LEFT JOIN marker_types     mk  ON mk.id  = s.marker_type_id
     WHERE s.date_out >= $1 AND s.date_out <= $2
       AND s.is_cashed = true
     ORDER BY s.date_out DESC`,
    [`${year}-01-01`, `${year}-12-31`],
  );
  return rows;
}

const SALE_HEADERS = [
  "Make","Sales Associate","Condition","Stock #","Reference","Year",
  "Bracelet","Dial Color","Bezel","Marker","Date In","Date Out",
  "Cost","Sold For","Sold To","In Person?","Source","Cashed",
  "Margin","Profit","Month","Count","Age",
];

function saleToArray(r: RawSaleRow): (string | number)[] {
  return [
    r.brand_name ?? "", r.employee_name ?? "", r.condition_name ?? "",
    r.stock_number ?? "", r.reference ?? "", r.year_value ?? "",
    r.bracelet_name ?? "", r.dial_name ?? "", r.bezel_name ?? "",
    r.marker_name ?? "", r.date_in ?? "", r.date_out ?? "",
    cur(Number(r.cost ?? 0)) as number, cur(Number(r.sold_for ?? 0)) as number,
    r.sold_to ?? "", r.in_person_name ?? "", r.lead_name ?? "",
    r.is_cashed ? "Yes" : "No",
    pctDisp(Number(r.margin ?? 0)), cur(Number(r.profit ?? 0)) as number,
    r.month_number ?? "", r.count_constant ?? "", r.age_days ?? "",
  ];
}

/* ──────────── MAIN HANDLER ──────────── */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year") ?? 2026);
    const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
    const monthLabel = MONTHS[month - 1] ?? "January";

    const wb = new ExcelJS.Workbook();
    wb.creator = "God's Eye Analytics";
    wb.created = new Date();

    /* ===== 1. Budget ===== */
    try {
      const budgetRows = await getBudgetRows(year);
      const ws = wb.addWorksheet(`Budget ${year}`, { properties: { tabColor: { argb: "FF34A853" } } });
      const headers = [
        "Month","2025 GP","2025 Units","Per Unit","Ave $ Sold","Revenue",
        "Margin %","Inventory Budget","Average Days","Days in Month",
        "Avg Inv Value","Instock Unit Budget","Margin Budget",
        `${year} $GP Budgets`,"% Growth","Weight",
        `${year} Unit Budget`,"Per Unit","Ave $ Budget","Revenue Budget",
        `Actual GP ${year}`,"Tracking Delta","YTD Delta",
      ];
      const colCount = headers.length;
      addTitleRow(ws, `BUDGET ${year}`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = budgetRows.map((r) => [
        r.monthLabel, cur(r.profit2025), r.units2025 ?? "", cur(r.perUnit2025),
        cur(r.avgSold2025), cur(r.revenue2025), pctDisp(r.margin2025),
        cur(r.inventoryBudget), r.averageDays ?? "", "",
        cur(r.avgInventoryValue),
        r.instockUnitBudget != null ? Math.round(r.instockUnitBudget) : "",
        pctDisp(r.marginBudget), cur(r.gpBudget2026), pctDisp(r.growthPercent), "",
        r.unitBudget2026 != null ? Math.round(r.unitBudget2026) : "",
        cur(r.perUnit2026), cur(r.aveBudget2026), cur(r.revenueBudget2026),
        cur(r.actualGp2026), cur(r.trackingDelta), cur(r.ytdDelta),
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 3 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 2. OVERALL SALES ===== */
    try {
      const overall = await getOverallSalesData(year);
      const ws = wb.addWorksheet("OVERALL SALES", { properties: { tabColor: { argb: "FF34A853" } } });
      const headers = ["Sales Associate","Gross Profit","Units","Revenue","GP/PU","Aging","Margin","Ave Price"];
      const colCount = headers.length;
      addTitleRow(ws, `${year} OVERALL SALES`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = overall.rows.map((r) => [
        r.salesAssociate, cur(r.grossProfit), r.units, cur(r.revenue),
        cur(r.gppu), r.aging != null ? Math.round(r.aging) : "",
        pctDisp(r.margin), cur(r.avePrice),
      ] as (string | number)[]);
      rows.push([
        "TOTAL", cur(overall.totals.grossProfit), overall.totals.units,
        cur(overall.totals.revenue), cur(overall.totals.gppu), "",
        pctDisp(overall.totals.margin), cur(overall.totals.avePrice),
      ]);
      const info = addDataSheet(ws, headers, rows, { startRow: 3 });
      // Style totals row green
      const totRow = ws.getRow(info.dataEndRow);
      for (let c = 1; c <= colCount; c++) {
        totRow.getCell(c).fill = GREEN;
        totRow.getCell(c).font = { ...WHITE_FONT, size: 11 };
      }
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 3. IN PERSON vs REMOTE ===== */
    try {
      const ipr = await getInPersonRemoteData(month, year);
      const ws = wb.addWorksheet("IN PERSON vs REMOTE", { properties: { tabColor: { argb: "FF34A853" } } });
      const headers = ["Category","Gross Profit","Count","% of Deals","% of GP","GPPU"];
      const colCount = headers.length;
      addTitleRow(ws, `IN PERSON vs REMOTE — ${monthLabel} ${year}`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = ipr.rows.map((r) => [
        r.category, cur(r.gp), r.count, pctDisp(r.dealsShare), pctDisp(r.gpShare), cur(r.gppu),
      ] as (string | number)[]);
      rows.push(["TOTAL", cur(ipr.totals.totalGp), ipr.totals.totalCount, "", "", ""]);
      const info = addDataSheet(ws, headers, rows, { startRow: 3 });
      const totRow = ws.getRow(info.dataEndRow);
      for (let c = 1; c <= colCount; c++) {
        totRow.getCell(c).fill = GREEN;
        totRow.getCell(c).font = { ...WHITE_FONT, size: 11 };
      }
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 4. SALES PERFORMANCE ===== */
    try {
      const salesPerf = await getSalesPerformanceData(month, year);
      const ws = wb.addWorksheet("SALES PERFORMANCE", { properties: { tabColor: { argb: "FF34A853" } } });
      const headers = [
        "Sales Associate","Closed GP","Cashed GP","GP Budget","Pacing GP","Over/Under GP",
        "Units","Unit Budget","Pacing Units","Over/Under Units",
        "Revenue","Pacing Revenue","GPPU","Ave. Aging","Margin %","Ave Price",
      ];
      const colCount = headers.length;
      addTitleRow(ws, `SALES PERFORMANCE — ${monthLabel} ${year}`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      // Pacing info bar
      ws.mergeCells(3, 1, 3, colCount);
      const pc = ws.getCell(3, 1);
      pc.value = `Month: ${monthLabel} ${year}`;
      pc.fill = GRAY;
      pc.font = WHITE_FONT;
      pc.alignment = { horizontal: "center", vertical: "middle" };
      const rows = salesPerf.rows.map((r) => [
        r.salesAssociate, cur(r.closedGp), cur(r.cashedGp), cur(r.gpBudget),
        cur(r.pacingGp), cur(r.overUnderGp),
        r.units, r.unitBudget,
        r.pacingUnits != null ? Math.round(r.pacingUnits) : "",
        r.overUnderUnits != null ? Math.round(r.overUnderUnits) : "",
        cur(r.revenue), cur(r.pacingRevenue), cur(r.gppu),
        r.averageAging != null ? Math.round(r.averageAging) : "",
        pctDisp(r.margin), cur(r.averagePrice),
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 4 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 5-14. Individual Sales Person Tabs ===== */
    let allSalesRows: RawSaleRow[] | null = null;
    try {
      allSalesRows = await fetchAllSalesRows(year);
    } catch { /* skip */ }

    if (allSalesRows) {
      for (const tab of INDIVIDUAL_TABS) {
        try {
          const personRows = allSalesRows.filter(
            (r) => r.employee_name?.toUpperCase() === tab.dbName.toUpperCase(),
          );
          const ws = wb.addWorksheet(tab.sheetName, { properties: { tabColor: { argb: "FFFFFF00" } } });
          const colCount = SALE_HEADERS.length;
          addTitleRow(ws, `${year} SALES`, colCount);
          addSubtitleRow(ws, "GOD's EYE", colCount);
          const data = personRows.map(saleToArray);
          addDataSheet(ws, SALE_HEADERS, data, { startRow: 3 });
          autoWidth(ws);
        } catch { /* skip */ }
      }
    }

    /* ===== 15. LEAD PERFORMANCE Monthly ===== */
    try {
      const leadPerf = await getLeadPerformanceMonthlyData(month, year);
      const ws = wb.addWorksheet("LEAD PERF Monthly", { properties: { tabColor: { argb: "FF00FF00" } } });
      const headers = [
        "Lead Source","GP","GP Budget","Pacing GP","Over/Under GP",
        "Units","Unit Budget","Pacing Units","Over/Under Units",
        "Revenue","Pacing Revenue","GPPU","Ave. Aging","Margin %","Ave Price",
      ];
      const colCount = headers.length;
      addTitleRow(ws, `LEAD PERFORMANCE — ${monthLabel} ${year}`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = leadPerf.rows.map((r) => [
        r.leadSource, cur(r.gp), cur(r.gpBudget), cur(r.pacingGp), cur(r.overUnderGp),
        r.units, r.unitBudget,
        r.pacingUnits != null ? Math.round(r.pacingUnits) : "",
        r.overUnderUnits != null ? Math.round(r.overUnderUnits) : "",
        cur(r.revenue), cur(r.pacingRevenue), cur(r.gppu),
        r.aging != null ? Math.round(r.aging) : "",
        pctDisp(r.margin), cur(r.avePrice),
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 3 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 16. INVENTORY TIERS ===== */
    try {
      const tiers = await getInventoryTiersData(90);
      const ws = wb.addWorksheet("INVENTORY TIERS", { properties: { tabColor: { argb: "FF00FF00" } } });
      const headers = ["Price Range","Count","GP","Revenue","GP Share %","Margin %","GPPU","Avg Aging","Per Day","GP/Day"];
      const colCount = headers.length;
      addTitleRow(ws, "INVENTORY TIERS BY PRICE RANGE", colCount);
      addSubtitleRow(ws, `Last 90 Days — ${tiers.startDate} to ${tiers.endDate}`, colCount);
      const rows = tiers.rows.map((r) => [
        `$${r.low.toLocaleString()} - $${r.high.toLocaleString()}`,
        r.count, cur(r.gp), cur(r.revenue), pctDisp(r.gpShare), pctDisp(r.margin),
        cur(r.gppu), r.aging != null ? Math.round(r.aging) : "",
        Math.round(r.perDay * 100) / 100, cur(r.gpPerDay),
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 3 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 17. BRAND PERFORMANCE (annual) ===== */
    try {
      const bp = await getBrandPerformanceData(year);
      const ws = wb.addWorksheet("BRAND PERFORMANCE", { properties: { tabColor: { argb: "FF00FF00" } } });
      const headers = ["Brand","Condition","% Of Units","% Of GP","Revenue","GP","Count","Ave. Margin","Ave. Aging"];
      const colCount = headers.length;
      addTitleRow(ws, `BRAND PERFORMANCE — ${year}`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = bp.rows.map((r) => [
        r.brand, r.condition, pctDisp(r.unitsShare), pctDisp(r.gpShare),
        cur(r.revenue), cur(r.gp), r.units, pctDisp(r.margin),
        r.aging != null ? Math.round(r.aging) : "",
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 3 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 18. INVENTORY MIX ===== */
    try {
      const mix = await getInventoryMixData(month, year);
      const ws = wb.addWorksheet("INVENTORY MIX", { properties: { tabColor: { argb: "FFFF0000" } } });
      const headers = [
        "Inventory Type","Gross Profit","% of GP","GP Budget","Pacing GP","Over/Under",
        "Units","Unit Budget","Pacing Units","Over/Under Units",
        "Revenue","Pacing Revenue","GP/PU","Ave. Aging","Margin","Ave Price",
      ];
      const colCount = headers.length;
      addTitleRow(ws, `INVENTORY MIX — ${monthLabel} ${year}`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = mix.rows.map((r) => [
        r.inventoryType, cur(r.gp), pctDisp(r.gpShare),
        cur(r.gpBudget), cur(r.pacingGp), cur(r.overUnderGp),
        r.units, r.unitBudget,
        r.pacingUnits != null ? Math.round(r.pacingUnits) : "",
        r.overUnderUnits != null ? Math.round(r.overUnderUnits) : "",
        cur(r.revenue), cur(r.pacingRevenue), cur(r.gppu),
        r.aging != null ? Math.round(r.aging) : "",
        pctDisp(r.margin), cur(r.avePrice),
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 3 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 19. LEAD PERFORMANCE (annual) ===== */
    try {
      const annual = await getLeadPerformanceAnnualData(year);
      const ws = wb.addWorksheet("LEAD PERFORMANCE", { properties: { tabColor: { argb: "FFD5A6BD" } } });
      const headers = ["Source","% Of Sales","Revenue","GP","Count","Ave. Margin","Ave. Aging"];
      const colCount = headers.length;
      addTitleRow(ws, `LEAD PERFORMANCE — ${year} Annual`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = annual.map((r) => [
        r.source, pctDisp(r.salesShare), cur(r.revenue), cur(r.gp),
        r.count, pctDisp(r.margin), r.aging != null ? Math.round(r.aging) : "",
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 3 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 20. LEAD PERF M2M ===== */
    try {
      const m2m = await getLeadPerformanceM2MData(month, year);
      const ws = wb.addWorksheet("LEAD PERF M2M", { properties: { tabColor: { argb: "FFD5A6BD" } } });
      const headers = ["Source","% Of Sales","Revenue","GP","Count","Ave. Margin","Ave. Aging"];
      const colCount = headers.length;
      addTitleRow(ws, `LEAD PERFORMANCE M2M — ${monthLabel} ${year}`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = m2m.map((r) => [
        r.source, pctDisp(r.salesShare), cur(r.revenue), cur(r.gp),
        r.count, pctDisp(r.margin), r.aging != null ? Math.round(r.aging) : "",
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 3 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 21. INVENTORY MIX PER SALES PERSON ===== */
    try {
      const imp = await getInventoryMixPerSalespersonData(month, year);
      const ws = wb.addWorksheet("INV MIX PER PERSON", { properties: { tabColor: { argb: "FFFF0000" } } });
      const headers = [
        "Sales Person","Inventory Type","Gross Profit","% of GP","Pacing GP","Over/Under",
        "Units","Pacing Units","Revenue","Pacing Revenue","GP/PU","Ave. Aging","Margin","Ave Price",
      ];
      const colCount = headers.length;
      addTitleRow(ws, `INVENTORY MIX PER SALES PERSON — ${monthLabel} ${year}`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = imp.rows.map((r) => [
        r.salesPerson, r.inventoryType, cur(r.gp), pctDisp(r.gpShare),
        cur(r.pacingGp), r.pacingGp != null ? cur(r.pacingGp - r.gp) : "",
        r.units, r.pacingUnits != null ? Math.round(r.pacingUnits) : "",
        cur(r.revenue), cur(r.pacingRevenue), cur(r.gppu),
        r.aging != null ? Math.round(r.aging) : "",
        pctDisp(r.margin), cur(r.avePrice),
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 3 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 22. DATA LOG ===== */
    try {
      const salesData = allSalesRows ?? (await fetchAllSalesRows(year));
      const ws = wb.addWorksheet("DATA LOG");
      const colCount = SALE_HEADERS.length;
      // Green header row (Data Log style)
      const headerRow = ws.getRow(1);
      SALE_HEADERS.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.fill = GREEN;
        cell.font = BLACK_FONT;
        cell.border = THIN_BORDER;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      headerRow.height = 22;
      const data = salesData.map(saleToArray);
      data.forEach((dataRow, ri) => {
        const row = ws.getRow(2 + ri);
        dataRow.forEach((val, ci) => { row.getCell(ci + 1).value = val as ExcelJS.CellValue; });
      });
      styleDataRows(ws, 2, 1 + data.length, colCount);
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 23. CONDITION SCALE ===== */
    try {
      const { rows: condRows } = await pool.query<{ id: string; name: string }>(
        `SELECT id, name FROM condition_types WHERE is_active = true ORDER BY name`,
      );
      const ws = wb.addWorksheet("CONDITION SCALE");
      const headers = ["#", "Condition Type"];
      addTitleRow(ws, "CONDITION SCALE", headers.length);
      const rows = condRows.map((r, i) => [i + 1, r.name] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 2 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ===== 24. BRAND PERF M2M ===== */
    try {
      const bpm2m = await getBrandPerformanceM2MData(month, year);
      const ws = wb.addWorksheet("BRAND PERF M2M", { properties: { tabColor: { argb: "FFA4C2F4" } } });
      const headers = ["Brand","Condition","% Of GP","% Of Units","Revenue","GP","Count","Ave. Margin","Ave. Aging"];
      const colCount = headers.length;
      addTitleRow(ws, `BRAND PERFORMANCE M2M — ${monthLabel} ${year}`, colCount);
      addSubtitleRow(ws, "GOD's EYE", colCount);
      const rows = bpm2m.map((r) => [
        r.brand, r.condition, pctDisp(r.gpShare), pctDisp(r.unitsShare),
        cur(r.revenue), cur(r.gp), r.count, pctDisp(r.margin),
        r.aging != null ? Math.round(r.aging) : "",
      ] as (string | number)[]);
      addDataSheet(ws, headers, rows, { startRow: 3 });
      autoWidth(ws);
    } catch { /* skip */ }

    /* ── Generate buffer ── */
    const buffer = await wb.xlsx.writeBuffer();
    const filename = `Gods_Eye_${year}_${monthLabel}_Export.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
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
