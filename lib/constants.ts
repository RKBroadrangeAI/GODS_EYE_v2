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

export const budgetLinks = [
  { href: "/app/budget-2026", label: "Budget 2026" },
  { href: "/app/budget-2025", label: "Budget 2025" },
] as const;

export const salesReportLinks = [
  { href: "/app/overall-sales", label: "By Person" },
  { href: "/app/sales-performance", label: "By Month" },
] as const;

export const channelsLinks = [
  { href: "/app/in-person-vs-remote", label: "In Person vs Remote" },
  { href: "/app/lead-performance", label: "Channel Performance" },
  { href: "/app/lead-performance-monthly", label: "Channel Monthly" },
  { href: "/app/lead-perf-m2m", label: "Channel M2M" },
] as const;

export const brandsLinks = [
  { href: "/app/brand-performance", label: "Brand Performance" },
  { href: "/app/brand-perf-m2m", label: "Brand Perf M2M" },
] as const;

export const leadsLinks = [
  { href: "/app/lead-performance", label: "Performance" },
  { href: "/app/lead-performance-monthly", label: "Monthly Performance" },
  { href: "/app/lead-perf-m2m", label: "Lead Perf M2M" },
] as const;

export const inventoryLinks = [
  { href: "/app/inventory-tiers", label: "Tiers" },
  { href: "/app/inventory-mix", label: "Mix" },
  { href: "/app/inventory-mix-per-sales-person", label: "Mix by Associate" },
] as const;

export const performanceLinks = [
  { href: "/app/performance/by-lead", label: "By Lead" },
  { href: "/app/performance/by-associate", label: "By Associate" },
  { href: "/app/performance/by-month", label: "By Month" },
  { href: "/app/performance/by-sales", label: "By Sales" },
  { href: "/app/performance/by-channel", label: "By Channel" },
] as const;

/** All dashboard links (flat list, used by AI assistant & exports) */
export const dashboardLinks = [
  ...budgetLinks,
  ...salesReportLinks,
  ...channelsLinks,
  ...brandsLinks,
  ...leadsLinks,
  ...inventoryLinks,
  ...performanceLinks,
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
