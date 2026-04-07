import Image from "next/image";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

/* ── Menu item definitions ────────────────────────────────────── */

type MenuItem = {
  label: string;
  href: string;
  children?: MenuItem[];
};

type CategoryDef = {
  title: string;
  /** Tailwind bg class for the header block */
  headerBg: string;
  /** Tailwind bg class for the item indicator dot (gradient from light to dark) */
  dotColors: string[];
  items: MenuItem[];
};

const CATEGORIES: CategoryDef[] = [
  {
    title: "BUDGETING",
    headerBg: "bg-green-500",
    dotColors: [
      "bg-green-200",
      "bg-green-300",
      "bg-green-400",
      "bg-green-500",
      "bg-green-600",
    ],
    items: [
      { label: "2026", href: "/app/budget-2026" },
      { label: "2025", href: "/app/budget-2025" },
      { label: "2024", href: "/app/overall-sales?year=2024" },
      { label: "2023", href: "/app/overall-sales?year=2023" },
      { label: "2022", href: "/app/overall-sales?year=2022" },
    ],
  },
  {
    title: "PERFORMANCE",
    headerBg: "bg-orange-500",
    dotColors: [
      "bg-orange-200",
      "bg-orange-300",
      "bg-orange-400",
      "bg-orange-500",
      "bg-orange-600",
      "bg-orange-700",
    ],
    items: [
      { label: "ASSOCIATE", href: "/app/performance/by-associate" },
      { label: "CHANNEL", href: "/app/performance/by-channel" },
      { label: "LEAD", href: "/app/performance/by-lead" },
      {
        label: "OVER TIME",
        href: "/app/overall-sales",
        children: [
          { label: "DAY", href: "/app/sales-detail" },
          { label: "MONTH", href: "/app/performance/by-month" },
          { label: "YEAR", href: "/app/overall-sales" },
        ],
      },
      { label: "SALES", href: "/app/performance/by-sales" },
    ],
  },
  {
    title: "CHANNELS",
    headerBg: "bg-teal-700",
    dotColors: [
      "bg-sky-200",
      "bg-sky-400",
    ],
    items: [
      { label: "ONLINE", href: "/app/lead-performance" },
      { label: "IN STORE", href: "/app/in-person-vs-remote" },
    ],
  },
  {
    title: "INVENTORY",
    headerBg: "bg-purple-600",
    dotColors: [
      "bg-purple-200",
      "bg-purple-500",
    ],
    items: [
      { label: "PRICE-TIERS", href: "/app/inventory-tiers" },
      { label: "BRAND", href: "/app/brand-performance" },
    ],
  },
];

/* ── Page component ───────────────────────────────────────────── */

export default async function MenuPage() {
  const auth = await requireAuth();
  const canManage = auth.role === "admin" || auth.role === "management";

  /* Filter categories and items based on role */
  const visibleCategories = CATEGORIES
    .filter((cat) => !(cat.title === "BUDGETING" && !canManage))
    .map((cat) => {
      if (cat.title !== "PERFORMANCE") return cat;
      /* Remove OVER TIME → DAY (sales-detail) for non-management */
      if (canManage) return cat;
      return {
        ...cat,
        items: cat.items.map((item) => {
          if (!item.children) return item;
          return {
            ...item,
            children: item.children.filter((c) => c.href !== "/app/sales-detail"),
          };
        }),
      };
    });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-zinc-100 px-4 py-8">
      {/* Logo */}
      <div className="flex flex-col items-center">
        <Image
          src="/God's Eye 2.png"
          alt="God's Eye"
          width={160}
          height={160}
          className="object-contain"
          unoptimized
        />
        <h1 className="mt-2 text-2xl font-extrabold tracking-[0.25em] text-orange-500" style={{ fontFamily: "serif" }}>
          GOD&apos;S EYE
        </h1>
      </div>

      {/* Category grid */}
      <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visibleCategories.map((cat) => (
          <CategoryColumn key={cat.title} category={cat} />
        ))}
      </div>
    </div>
  );
}

/* ── Category column ─────────────────────────────────────────── */

function CategoryColumn({ category }: { category: CategoryDef }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-stretch overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
        <div className={`w-3 shrink-0 ${category.headerBg}`} />
        <span className="flex-1 px-4 py-2.5 text-center text-sm font-extrabold tracking-wider text-zinc-800">
          {category.title}
        </span>
      </div>

      {/* Items */}
      {category.items.map((item, idx) => (
        <MenuItemRow
          key={item.label}
          item={item}
          dotColor={category.dotColors[idx % category.dotColors.length]}
          childDotColors={category.dotColors}
          childStartIndex={idx + 1}
        />
      ))}
    </div>
  );
}

/* ── Single menu item (optionally with nested children) ──────── */

function MenuItemRow({
  item,
  dotColor,
  childDotColors,
  childStartIndex,
}: {
  item: MenuItem;
  dotColor: string;
  childDotColors: string[];
  childStartIndex: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Link
        href={item.href}
        className="group flex items-stretch overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm transition-shadow hover:shadow-md hover:border-zinc-400"
      >
        <div className={`w-3 shrink-0 ${dotColor}`} />
        <span className="flex-1 px-4 py-2 text-sm font-semibold tracking-wide text-zinc-700 group-hover:text-zinc-900">
          {item.label}
        </span>
      </Link>

      {/* Nested children (e.g., OVER TIME → DAY / MONTH / YEAR) */}
      {item.children && (
        <div className="ml-8 flex flex-col gap-1.5">
          {item.children.map((child, ci) => (
            <Link
              key={child.label}
              href={child.href}
              className="group flex items-stretch overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm transition-shadow hover:shadow-md hover:border-zinc-400"
            >
              <div
                className={`w-3 shrink-0 ${
                  childDotColors[(childStartIndex + ci) % childDotColors.length]
                }`}
              />
              <span className="flex-1 px-3 py-1.5 text-xs font-semibold tracking-wide text-zinc-700 group-hover:text-zinc-900">
                {child.label}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
