# God's Eye — Excel Spec & Gap Analysis

> Source workbook: `TEST GOD'S EYE.xlsx` (26 sheets)
> Codebase: `/gods-eye` · Next.js App Router · PostgreSQL
> Last audited: 2025

---

## Table of Contents
1. [Excel Structure](#1-excel-structure)
2. [Column Mapping](#2-column-mapping-associate-sales-logs)
3. [Formula Reference](#3-formula-reference)
4. [Reference Data (DATA LOG)](#4-reference-data-data-log)
5. [CRITERIA — Requirements](#5-criteria--requirements)
6. [Report Definitions](#6-report-definitions)
7. [Gap Analysis](#7-gap-analysis)
8. [Confirmed Gaps — Detail](#8-confirmed-gaps--detail)

---

## 1. Excel Structure

### Associate Sales Logs (one sheet per associate)
| Sheet | Associate |
|-------|-----------|
| DJ SALES | DJ Allen |
| NOAH SALES | Noah Allen |
| ADAM SALES | Adam Cohen |
| RYAN SALES | Ryan Turry |
| MATT SALES | Matt Feist |
| LES SALES | Les (staff) |
| LUIS SALES | Luis Berrios |
| JESSE SALES | Jesse Arrowood |
| AUCTION SALES | Auction channel |
| SHOW SALES | Dealer Show channel |

### Report Sheets
`CRITERIA` · `INTERFACE` · `OVERALL SALES` · `IN PERSON vs REMOTE` · `SALES PERFORMANCE` · `LEAD PERFORMANCE Monthly` · `INVENTORY TIERS` · `BRAND PERFORMANCE` · `INVENTORY MIX` · `INVENTORY MIX PER SALES PERSON` · `LEAD PERFORMANCE` · `LEAD PERF M2M` · `BRAND PERF M2M` · `Budget 2026`

### Reference Sheets
`DATA LOG` · `CONDITION SCALE`

---

## 2. Column Mapping — Associate Sales Logs

Each associate's sheet shares the same structure (rows 4–1117). Decoded from live `SUMPRODUCT` formulas in the report sheets.

| Excel Col | DB Column | Description |
|-----------|-----------|-------------|
| A | `selected` | Sold/selected boolean flag |
| B | `brand_id` | Watch brand (Make) |
| C | `sales_person_id` | Sales associate name |
| D | `condition_type_id` | Inventory type (NEW/STOCK, USED, OLDER, …) |
| E | `stock_number` | Stock number (numeric) |
| F | `reference` | Reference number (alphanumeric) |
| G | `year_value` | Watch year |
| H | `bracelet_type_id` | Bracelet type |
| I | `dial_color_id` | Dial color |
| J | `bezel_type_id` | Bezel type |
| K | `marker_type_id` | Marker type |
| L | `date_in` | Date watch came into inventory |
| M | `date_out` | Date of sale / departure |
| N | `cost` | Purchase cost |
| O | `sold_for` | Revenue (sold price) |
| P | `sold_to` | Customer name |
| Q | `in_person_option_id` | In Person or Remote |
| R | `lead_source_id` | Lead source |
| S | `cashed_at` | Cash-out timestamp (checkbox + timestamp) |
| **T** | **`by_label`** | **Who cashed — initials + date, e.g. `"LB 03/30"`** |
| U | `profit` | Profit = O − N _(auto-computed by DB trigger)_ |
| V | `month_number` | Month 1–12 derived from `date_out` _(auto-computed)_ |
| W | `count_constant` | Always `1` — used as multiplier in SUMPRODUCT unit counts |
| Y | `age_days` | `date_out − date_in` in days _(auto-computed)_ |

---

## 3. Formula Reference

All formulas decoded from live Excel (openpyxl `data_only=False`).

### GP — Closed (all sales in period)
```
SUMPRODUCT(sheet!$U$4:$U$1117 × (sheet!$C = associate) × (sheet!$V = month))
```
**SQL equivalent:** `SUM(profit) WHERE sales_person_id = ? AND month_number = ?`

### Units
```
SUMPRODUCT(sheet!$W$4:$W$1117 × match_associate × match_month)
```
**SQL equivalent:** `COUNT(*) WHERE sales_person_id = ? AND month_number = ?`

### Revenue
```
SUMPRODUCT(sheet!$O$4:$O$1117 × match_associate × match_month)
```
**SQL equivalent:** `SUM(sold_for) WHERE ...`

### Pacing — ⚠️ USES BUSINESS DAYS (NETWORKDAYS)
```excel
Days In     = MAX(1, NETWORKDAYS(start_of_month, TODAY()) − 1)
Days In     = MIN(Days In, days_in_month)          ' capped at month total
Pacing GP   = (Actual GP / Days In) × days_in_month
```
> **Critical:** Excel counts only **Mon–Fri** (excluding weekends). The app currently uses **calendar days** — see Gap #1.

### Average Aging
```
SUMPRODUCT(sheet!$Y$4:$Y$780 × match_associate × match_month) / Units
```

### Margin (standard — most reports)
```
GP / Revenue
```

### Margin (brand performance — markup over cost variant)
```
GP / (Revenue − GP)
```
> This is **markup**, not margin. Used in the BRAND PERFORMANCE sheet — see Gap #3.

### GP per Unit (GP/PU)
```
GP / Units
```

### Pacing Over/Under
```
Pacing GP − GP Budget
```

---

## 4. Reference Data (DATA LOG)

### Employees (11)
Noah Allen · Luis Berrios · DJ Allen · Jesse Arrowood · Matt Feist · Jon Stoff · Adam Cohen · Ryan Turry · Dealer Show · Auction · Service

### Lead Sources (17)
Amazon · AWS/REDBAR/TRF · Bezel · Chrono24 · Dealer Show · eBay · Phone · Facebook · Grailzee · Instagram · Local Retail · Loyalty · Referral · Repeat · Target · TikTok · Walk In

### Inventory / Condition Types (4)
NEW/STOCK · USED · OLDER · _(4th value from DATA LOG rows 19–24)_

### In Person Options (2)
In Person · Remote

### Business Days per Month
Used in NETWORKDAYS pacing. Varies by year/month — must be computed dynamically, not hardcoded.

---

## 5. CRITERIA — Requirements

From the CRITERIA sheet (verbatim intent):

1. **Display** — data in easy-to-digest format
2. **Multiple viewing modes** — CRM / WatchOps style
3. **Cost/price protection** — Management can modify cost & sold price; sales associates **cannot**
4. **Employee management** — Management adds employees → auto-show in all active months until deactivated
5. **Admin dropdowns** — Admin can add/subtract measured fields via dropdown admin
6. **Budget locking** — Management can modify budgets until finalized (one-way lock — cannot un-finalize)
7. **Associate view restriction** — Sales associates can **only view their own** sales log; cannot modify
8. **Mobile-friendly** — web layout optimized for phone-based sale logging
9. **CRM tie-in** — future scope, out of current implementation

---

## 6. Report Definitions

### OVERALL SALES
**Scope:** Annual YTD per associate
**Columns:** Sales Associate · GP · Units · Revenue · GP/PU · Avg Aging · Margin · Ave Price
**Rows:** One per active associate + **Average row** + **Total row**
**Lib:** `lib/dashboard-data.ts → getOverallSalesData(year)`

---

### IN PERSON vs REMOTE
**Scope:** Monthly; two categories only (In Person / Remote)
**Columns:** Category · GP · Count · % of Deals · % of GP · GP/PU
**Lib:** `lib/dashboard-data.ts → getInPersonRemoteData(month, year)`

---

### SALES PERFORMANCE
**Scope:** Per associate per selected month
**Columns:**
- Closed GP · Cashed GP · GP Budget · Pacing GP · O/U GP
- Units · Unit Budget · Pacing Units · O/U Units
- Revenue · Pacing Revenue · GP/PU · Ave Aging · Margin · Ave Price
**Lib:** `lib/sales-performance.ts → getSalesPerformanceData(month, year)`

---

### LEAD PERFORMANCE Monthly
**Scope:** Per lead source per selected month
**Columns:** Lead Source · GP · GP Budget · Pacing GP · O/U · Units · Unit Budget · Pacing Units · O/U · Revenue · Pacing Revenue · GP/PU · Ave Aging · Margin · Ave Price
**Lib:** `lib/dashboard-data.ts → getLeadPerformanceMonthlyData(month, year)`

---

### LEAD PERFORMANCE (Annual)
**Scope:** Per lead source for full year
**Columns:** Source · % of Sales · Revenue · GP · Count · Ave Margin · Ave Aging
**Lib:** `lib/dashboard-data.ts → getLeadPerformanceAnnualData(year)`

---

### LEAD PERF M2M
**Scope:** Per lead source for selected month (month-over-month view)
**Columns:** Same as LEAD PERFORMANCE Annual
**Lib:** `lib/dashboard-data.ts → getLeadPerformanceM2MData(month, year)`

---

### INVENTORY TIERS
**Scope:** Rolling 90-day window; price brackets
**Tier ranges** (from `lib/constants.ts → inventoryTierRanges`): defined as [low, high] pairs
**Columns:** Tier · Count · GP · Revenue · Margin · GP/PU · Aging · GP Share · Per Day · GP/Day
**Lib:** `lib/dashboard-data.ts → getInventoryTiersData(totalDays)`

---

### BRAND PERFORMANCE
**Scope:** Annual per brand
**Excel shows:** Per **Brand × Condition** combo
**Columns:** Brand · Condition · % of GP · % of Units · Revenue · GP · Count · Ave Margin · Ave Aging
**Lib:** `lib/dashboard-data.ts → getBrandPerformanceData(year)` _(see Gap #2 — no condition split)_

---

### BRAND PERF M2M
**Scope:** Per brand for selected month
**Columns:** Same as Brand Performance Annual
**Lib:** `lib/dashboard-data.ts → getBrandPerformanceM2MData(month, year)` _(see Gap #2)_

---

### INVENTORY MIX
**Scope:** Per condition type per selected month
**Columns:** Type · GP · % of GP · Pacing GP · O/U · Units · Pacing Units · Revenue · Pacing Revenue · GP/PU · Ave Aging · Margin · Ave Price
**Lib:** `lib/dashboard-data.ts → getInventoryMixData(month, year)` _(see Gap #4 — no budget O/U)_

---

### INVENTORY MIX PER SALES PERSON
**Scope:** Same as Inventory Mix but further split per associate
**Lib:** `lib/dashboard-data.ts → getInventoryMixPerSalespersonData(month, year)`

---

### BUDGET 2026
**Scope:** 12-month budget vs actuals tracker
**Columns:**
- 2025 actuals: GP · Units · GP/PU · Avg Sold · Revenue · Margin
- Budget settings: Avg Increase/Mo · Inventory Budget · Avg Days · Avg Inventory Value · In-Stock Unit Budget · Margin Budget
- 2026 budget: GP Budget · Growth % · Weight · Unit Budget · GP/PU · Ave Price · Revenue Budget
- 2026 actuals: Actual GP · PROJECTED · TRACKING (delta) · YTD DELTA
**Lib:** `lib/budgets.ts → getBudgetRows(year)` _(PROJECTED, TRACKING, YTD DELTA all implemented)_

---

### ENTER SALE — Form Fields
_(From INTERFACE sheet)_
Product ID (numeric) · Brand (dropdown) · Reference (alphanumeric) · Type/Condition (dropdown) · Date In (date picker) · Date Out (date picker) · Customer Name (text) · In Person? (dropdown) · Lead Source (dropdown) · Price / Sold For (numeric)

### SALES DETAIL — Display Columns
_(From INTERFACE sheet)_
`SALES PERSON | MAKE | CONDITION | STOCK # | REFERENCE | YEAR | DATE IN | DATE OUT | COST | SOLD FOR | SOLD TO | IN PERSON? | SOURCE | CASHED | BY | MARGIN | PROFIT`

---

## 7. Gap Analysis

### Legend
- ✅ **Implemented** — matches Excel spec
- ⚠️ **Partial** — works but differs from Excel in a meaningful way
- ❌ **Missing** — not implemented

---

| # | Feature | Status | Location |
|---|---------|--------|----------|
| **Schema** | | | |
| S1 | All watch fields (brand, ref, year, bracelet, dial, bezel, marker) | ✅ | `db/migrations/001_initial_schema.sql` |
| S2 | `cashed_at` + `cashed_by` + `by_label` (initials + date) | ✅ | schema, `app/api/sales/[id]/route.ts` |
| S3 | `profit`, `margin`, `age_days`, `month_number` auto-computed (triggers) | ✅ | schema trigger |
| S4 | `count_constant = 1` default | ✅ | schema |
| S5 | `submit_locked` boolean for associate edit protection | ✅ | schema |
| S6 | `budgets` table with all budget fields + `is_finalized` | ✅ | schema |
| S7 | All lookup tables (brands, lead_sources, condition_types, etc.) | ✅ | schema |
| **Reports** | | | |
| R1 | Overall Sales — per-associate YTD with Average + Total rows | ✅ | `getOverallSalesData` |
| R2 | In Person vs Remote — GP, count, deal %, GP %, GP/PU | ✅ | `getInPersonRemoteData` |
| R3 | Sales Performance — closed GP, cashed GP, pacing, budgets, O/U | ✅ | `lib/sales-performance.ts` |
| R4 | Lead Performance Monthly — GP, budget, pacing, O/U, all metrics | ✅ | `getLeadPerformanceMonthlyData` |
| R5 | Lead Performance Annual — source share, revenue, GP, count, margin, aging | ✅ | `getLeadPerformanceAnnualData` |
| R6 | Lead Perf M2M | ✅ | `getLeadPerformanceM2MData` |
| R7 | Inventory Tiers — tiered by price range, rolling 90d window | ✅ | `getInventoryTiersData` |
| R8 | Brand Performance Annual — brand-level metrics | ⚠️ | `getBrandPerformanceData` — **missing Condition split** (Gap #2) |
| R9 | Brand Perf M2M | ⚠️ | `getBrandPerformanceM2MData` — **missing Condition split** (Gap #2) |
| R10 | Inventory Mix — per condition type, with pacing | ⚠️ | `getInventoryMixData` — **pacing present; no budget O/U** (Gap #4) |
| R11 | Inventory Mix per Sales Person | ✅ | `getInventoryMixPerSalespersonData` |
| R12 | Budget 2026 — PROJECTED, TRACKING, YTD DELTA | ✅ | `lib/budgets.ts → getBudgetRows` |
| **Business Logic** | | | |
| L1 | Closed GP (date_out based) | ✅ | `sales-performance.ts` |
| L2 | Cashed GP (`is_cashed = true` filter) | ✅ | `sales-performance.ts` |
| L3 | Average Aging | ✅ | `aggregateCoreMetrics` |
| L4 | Margin = GP / Revenue | ✅ | `aggregateCoreMetrics` |
| L5 | GP/PU | ✅ | `aggregateCoreMetrics` |
| L6 | Pacing = (actual / days) × days_in_month | ⚠️ | **Calendar days used; Excel uses NETWORKDAYS business days** (Gap #1) |
| L7 | Brand Perf markup = GP / (Revenue − GP) | ⚠️ | **App uses standard margin GP/Revenue** (Gap #3) |
| L8 | Budget one-way finalize lock | ✅ | `is_finalized` flag + API enforcement |
| **Access Control** | | | |
| A1 | Associate views own sales only | ✅ | `lib/server-data.ts` role filter |
| A2 | Management-only cost/price edit | ✅ | `submit_locked` + role check in API |
| A3 | Admin dropdown management | ✅ | `/app/admin` route |
| **Data Entry** | | | |
| D1 | Enter Sale form fields (all required fields) | ✅ | `/app/enter-sale` |
| D2 | Cashed checkbox → timestamp + `by_label` stored | ✅ | `app/api/sales/[id]/route.ts` |
| D3 | Sales detail columns match INTERFACE spec | ✅ | `lib/server-data.ts` |

---

## 8. Confirmed Gaps — Detail

### Gap #1 — Pacing: Calendar Days vs Business Days ⚠️
**Files:** `lib/analytics.ts → buildPacingHeader`, `lib/analytics.ts → withPacingValue`

**Current (code):**
```typescript
// uses differenceInCalendarDays — includes Sat/Sun
const rawDays = differenceInCalendarDays(today, startDayDate) + 1;
daysPassed = Math.min(daysInMonth, Math.max(0, rawDays));
```

**Excel formula:**
```excel
Days In = MAX(1, NETWORKDAYS(start_of_month, TODAY()) − 1)
```
NETWORKDAYS skips weekends (and optionally holidays). On any given weekday ~17% of calendar days are weekend days. This means pacing will overstate pace in weeks that start on Monday and understate relative to Excel.

**Fix:** Replace `differenceInCalendarDays` with a business-day counter:
```typescript
function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    const day = cur.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
```
Also need `businessDaysInMonth` for the denominator.

---

### Gap #2 — Brand Performance: Missing Condition-Type Split ⚠️
**Files:** `lib/dashboard-data.ts → getBrandPerformanceData`, `getBrandPerformanceM2MData`

**Excel:** Rows are `Brand × Condition` combinations — e.g. "ROLEX / USED", "ROLEX / NEW/STOCK".

**Current code:** Groups only by Brand, ignoring Condition. `SaleFact` type includes `condition_type_id` but it is unused in these two functions.

**Fix:** Change the grouping key from `brand_id` → `brand_id + condition_type_id`:
```typescript
const key = `${row.brand_id}::${row.condition_type_id}`;
```
And fetch `conditionMap` alongside `brandMap`.

---

### Gap #3 — Brand Performance Margin Formula ⚠️
**Files:** `lib/analytics.ts → aggregateCoreMetrics` (used by brand perf)

**Excel brand perf column:** Uses **markup** = `GP / (Revenue − GP)` rather than standard margin `GP / Revenue`.

**Current code:** `aggregateCoreMetrics` always returns `safeDivide(gp, revenue)` as `margin`.

**Fix options:**
- Add a `markup` metric to `aggregateCoreMetrics` return value, or
- Compute it separately in `getBrandPerformanceData` and expose it as `markup` alongside `margin`

---

### Gap #4 — Inventory Mix: No Budget Over/Under ⚠️
**Files:** `lib/dashboard-data.ts → getInventoryMixData`

**Excel:** INVENTORY MIX shows O/U columns (Pacing GP − GP Budget, Pacing Units − Unit Budget).

**Current code:** Returns pacing GP/units/revenue but never fetches a `condition_type_id` budget. The `budgets` table currently has `lead_source_id` FK for lead-source budgets. It is unclear whether `condition_type_id` budget rows exist.

**Fix:** 
1. Confirm whether `budgets` table has a `condition_type_id` column (or add one)
2. Query budget rows by `condition_type_id` in `getInventoryMixData`
3. Compute and return `overUnderGp` and `overUnderUnits`

---

*End of document*
