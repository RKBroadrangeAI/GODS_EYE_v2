export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const dashboardLinks = [
  { href: "/app/sales-performance", label: "SALES PERFORMANCE" },
  { href: "/app/budget-2026", label: "Budget 2026" },
  { href: "/app/overall-sales", label: "OVERALL SALES" },
  { href: "/app/in-person-vs-remote", label: "IN PERSON vs REMOTE" },
  { href: "/app/lead-performance-monthly", label: "LEAD PERFORMANCE Monthly" },
  { href: "/app/inventory-tiers", label: "INVENTORY TIERS" },
  { href: "/app/brand-performance", label: "BRAND PERFORMANCE" },
  { href: "/app/inventory-mix", label: "INVENTORY MIX" },
  { href: "/app/lead-performance", label: "LEAD PERFORMANCE" },
  { href: "/app/lead-perf-m2m", label: "LEAD PERF M2M" },
  { href: "/app/brand-perf-m2m", label: "BRAND PERF M2M" },
  { href: "/app/inventory-mix-per-sales-person", label: "INVENTORY MIX PER SALES PERSON" },
] as const;

export const adminLinks = [
  { href: "/app/admin/employees", label: "Manage Employees" },
  { href: "/app/admin/dropdowns", label: "Manage Dropdowns" },
  { href: "/app/admin/condition-scale", label: "Condition Scale" },
] as const;

export const inventoryTierRanges = [
  [0, 10000],
  [10001, 20000],
  [20001, 30000],
  [30001, 40000],
  [40001, 50000],
  [50001, 60000],
  [60001, 70000],
  [70001, 80000],
  [80001, 90000],
  [90001, 100000],
  [100001, 125000],
  [125001, 150000],
  [150001, 200000],
  [200001, 999999],
] as const;

export const conditionScaleReference = [
  {
    source: "eBay",
    scale: "New, Manufacturer Refurbished, Seller Refurbished, Used, For Parts",
    note: "Use strict listing condition labels for marketplace parity.",
  },
  {
    source: "Chrono24 Used",
    scale: "Unworn, Very good, Good, Fair",
    note: "Used inventory should map to Chrono24 quality definitions.",
  },
  {
    source: "Chrono24 General",
    scale: "New, Unworn, Used",
    note: "Preferred simplified grouping for overview reporting.",
  },
  {
    source: "Website / Internal",
    scale: "NEW / LIKE NEW",
    note: "Primary internal default guidance.",
  },
  {
    source: "Policy",
    scale: "Most inventory should be EXCELLENT",
    note: "Exceptions allowed for older watches with expected wear.",
  },
] as const;
