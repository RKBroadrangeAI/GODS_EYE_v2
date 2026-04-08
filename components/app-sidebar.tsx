"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Table2,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Layers,
  Award,
  PieChart,
  LineChart,
  ArrowLeftRight,
  UserCheck,
  Activity,
  Radio,
  Gauge,
  BarChart2,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  LogOut,
  Bot,
  FileDown,
  Network,
  ChevronDown,
  ChevronRight,
  Users2,
  LayoutGrid,
  Lightbulb,
  FileBarChart2,
  Sparkles,
  Hand,
} from "lucide-react";
import { adminLinks } from "@/lib/constants";
import { getBrandImagePath } from "@/lib/brand-icons";
import { BrandIcon } from "@/components/brand-icon";
import { UserAvatar } from "@/components/user-avatar";
import type { AppRole } from "@/types/database";

/* ── Types ────────────────────────────────────────────────────── */

type SidebarProps = { role: AppRole; name: string; avatarUrl?: string | null };

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  entityType?: "people" | "brands" | "lead_sources" | "in_person_options";
  entityParam?: string;
  children?: NavItem[];
};

type CategoryDef = {
  key: string;
  label: string;
  border: string;
  dot: string;
  badgeCls: string;
  activeCls: string;
  links: NavItem[];
  managementOnly?: boolean;
};

/* ── Category data (matching mockup layout) ───────────────────── */

const CATEGORIES: CategoryDef[] = [
  {
    key: "budgeting",
    label: "BUDGETING",
    border: "border-l-green-500",
    dot: "bg-green-500",
    badgeCls: "border border-green-400 bg-green-50 text-green-800",
    activeCls: "bg-green-50 text-green-700 font-semibold",
    managementOnly: true,
    links: [
      { href: "/app/budget-2026", label: "2026", icon: <DollarSign className="h-3.5 w-3.5" /> },
      { href: "/app/budget-2025", label: "2025", icon: <DollarSign className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "performance",
    label: "PERFORMANCE",
    border: "border-l-amber-500",
    dot: "bg-amber-500",
    badgeCls: "border border-amber-400 bg-amber-50 text-amber-800",
    activeCls: "bg-amber-50 text-amber-700 font-semibold",
    links: [
      { href: "/app/performance/by-associate", label: "ASSOCIATE", icon: <Users className="h-3.5 w-3.5" />, entityType: "people", entityParam: "person" },
      { href: "/app/performance/by-channel", label: "CHANNEL", icon: <Gauge className="h-3.5 w-3.5" /> },
      { href: "/app/performance/by-lead", label: "LEAD", icon: <Target className="h-3.5 w-3.5" /> },
      {
        href: "/app/overall-sales",
        label: "OVER TIME",
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        children: [
          { href: "/app/performance/by-month", label: "MONTH", icon: <Activity className="h-3.5 w-3.5" /> },
          { href: "/app/overall-sales", label: "YEAR", icon: <TrendingUp className="h-3.5 w-3.5" />, entityType: "people", entityParam: "person" },
        ],
      },
      { href: "/app/performance/by-sales", label: "SALES", icon: <Radio className="h-3.5 w-3.5" /> },
      { href: "/app/sales-performance", label: "PACING", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "channels",
    label: "CHANNELS",
    border: "border-l-sky-500",
    dot: "bg-sky-500",
    badgeCls: "border border-sky-400 bg-sky-50 text-sky-800",
    activeCls: "bg-sky-50 text-sky-700 font-semibold",
    links: [
      { href: "/app/in-person-vs-remote", label: "IN STORE", icon: <ArrowLeftRight className="h-3.5 w-3.5" />, entityType: "in_person_options", entityParam: "channel" },
      { href: "/app/lead-performance", label: "ONLINE", icon: <LineChart className="h-3.5 w-3.5" />, entityType: "lead_sources", entityParam: "lead" },
      { href: "/app/lead-performance-monthly", label: "MONTHLY", icon: <Target className="h-3.5 w-3.5" />, entityType: "lead_sources", entityParam: "lead" },
      { href: "/app/lead-perf-m2m", label: "M2M", icon: <ArrowLeftRight className="h-3.5 w-3.5" />, entityType: "lead_sources", entityParam: "lead" },
    ],
  },
  {
    key: "inventory",
    label: "INVENTORY",
    border: "border-l-purple-500",
    dot: "bg-purple-500",
    badgeCls: "border border-purple-400 bg-purple-50 text-purple-800",
    activeCls: "bg-purple-50 text-purple-700 font-semibold",
    links: [
      { href: "/app/inventory-tiers", label: "PRICE TIERS", icon: <Layers className="h-3.5 w-3.5" /> },
      { href: "/app/inventory-mix", label: "MIX", icon: <PieChart className="h-3.5 w-3.5" /> },
      { href: "/app/inventory-mix-per-sales-person", label: "MIX BY PERSON", icon: <UserCheck className="h-3.5 w-3.5" />, entityType: "people", entityParam: "person" },
      { href: "/app/brand-performance", label: "BRAND", icon: <Award className="h-3.5 w-3.5" />, entityType: "brands", entityParam: "brand" },
      { href: "/app/brand-perf-m2m", label: "BRAND M2M", icon: <ArrowLeftRight className="h-3.5 w-3.5" />, entityType: "brands", entityParam: "brand" },
    ],
  },
];

const adminIconMap: Record<string, ReactNode> = {
  "/app/admin/employees": <Users2 className="h-3.5 w-3.5" />,
  "/app/admin/dropdowns": <Settings className="h-3.5 w-3.5" />,
  "/app/admin/condition-scale": <SlidersHorizontal className="h-3.5 w-3.5" />,
};

/* ── Main component ───────────────────────────────────────────── */

export function AppSidebar({ role, name, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const canManage = role === "admin" || role === "management";
  const isBudgetHidden = role === "sales_associate" || role === "view_only";

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [entities, setEntities] = useState<Record<string, { id: string; name: string }[]>>({});
  const [loadingEntity, setLoadingEntity] = useState<string | null>(null);
  const [expandedLink, setExpandedLink] = useState<string | null>(null);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  async function fetchEntities(type: string) {
    if (entities[type]) return;
    setLoadingEntity(type);
    try {
      const res = await fetch(`/api/filter-options?type=${type}`);
      if (res.ok) {
        const data = (await res.json()) as { id: string; name: string }[];
        setEntities((prev) => ({ ...prev, [type]: data }));
      }
    } finally {
      setLoadingEntity(null);
    }
  }

  function handleToggleLink(link: NavItem) {
    if (expandedLink === link.href) {
      setExpandedLink(null);
    } else {
      setExpandedLink(link.href);
      if (link.entityType) fetchEntities(link.entityType);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full shrink-0 flex-col bg-white border-r border-zinc-200 lg:w-64 lg:min-h-screen shadow-sm">
      {/* Logo */}
      <div className="flex flex-col items-center border-b border-zinc-100 px-4 py-5">
        <Image
          src="/God's Hand 2.png"
          alt="God's Hand"
          width={80}
          height={80}
          className="object-contain"
          unoptimized
        />
      </div>

      {/* User */}
      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-3">
        <UserAvatar name={name} avatarUrl={avatarUrl} size={36} />
        <div>
          <p className="text-sm font-semibold text-zinc-800">{name}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
            {role.replace("_", " ")}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* ── OVERVIEW ─────────────────────── */}
        <p className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
          Overview
        </p>
        <NavLink
          href="/app"
          label="Dashboard"
          icon={<LayoutDashboard className="h-4 w-4" />}
          active={pathname === "/app"}
        />
        <NavLink
          href="/app/menu"
          label="Menu"
          icon={<LayoutGrid className="h-4 w-4" />}
          active={pathname === "/app/menu"}
        />

        <hr className="my-3 border-zinc-200" />

        {/* ── DATA ENTRY ─────────────────────── */}
        <p className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
          Data Entry
        </p>
        <NavLink
          href="/app/enter-sale"
          label="Product Sale"
          icon={<PlusCircle className="h-4 w-4" />}
          active={pathname === "/app/enter-sale"}
        />

        <hr className="my-3 border-zinc-200" />

        {/* ── DATA ANALYSIS ──────────────────── */}
        <p className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
          Data Analysis
        </p>
        {CATEGORIES.map((cat) => {
          if (cat.managementOnly && isBudgetHidden) return null;
          const isOpen = !!expanded[cat.key];
          return (
            <div key={cat.key} className={`mt-3 rounded-lg border-l-4 ${cat.border} bg-zinc-50/50`}>
              <button
                onClick={() => toggle(cat.key)}
                className="flex w-full items-center gap-2 px-3 py-2"
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span
                  className={`rounded-md px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cat.badgeCls}`}
                >
                  {cat.label}
                </span>
              </button>
              {isOpen && (
                <div className="space-y-0.5 px-2 pb-2">
                  {cat.links.map((link) => {
                    if (link.children) {
                      const isChildOpen = expandedChild === link.label;
                      return (
                        <div key={link.label}>
                          <button
                            onClick={() =>
                              setExpandedChild(isChildOpen ? null : link.label)
                            }
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 transition-colors"
                          >
                            <span
                              className={`h-2 w-2 rounded-sm shrink-0 ${cat.dot}`}
                            />
                            <span className="flex-1 text-left font-medium">
                              {link.label}
                            </span>
                            {isChildOpen ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                          {isChildOpen && (
                            <div className="ml-4 space-y-0.5 border-l border-zinc-200 pl-2">
                              {link.children.map((child) => (
                                <CatLink
                                  key={child.href + child.label}
                                  link={child}
                                  cat={cat}
                                  pathname={pathname}
                                  searchParams={searchParams}
                                  entities={entities}
                                  loadingEntity={loadingEntity}
                                  expandedLink={expandedLink}
                                  onToggleLink={handleToggleLink}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <CatLink
                        key={link.href}
                        link={link}
                        cat={cat}
                        pathname={pathname}
                        searchParams={searchParams}
                        entities={entities}
                        loadingEntity={loadingEntity}
                        expandedLink={expandedLink}
                        onToggleLink={handleToggleLink}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <hr className="my-3 border-zinc-200" />

        {/* ── AI INSIGHTS (next release) ──── */}
        <div className="pt-1">
          <div className="flex items-center gap-2 px-2 pb-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-300">
              AI Insights
            </p>
            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-zinc-400">
              Coming Soon
            </span>
          </div>
          <DisabledNavLink label="Recommendations" icon={<Lightbulb className="h-4 w-4" />} />
          <DisabledNavLink label="Reports" icon={<FileBarChart2 className="h-4 w-4" />} />
          <DisabledNavLink label="Trends" icon={<TrendingUp className="h-4 w-4" />} />
          <DisabledNavLink label="Predictions" icon={<Sparkles className="h-4 w-4" />} />
        </div>

        <hr className="my-3 border-zinc-200" />

        {/* ── TOOLS ───────────────────────────── */}
        <div className="pt-1">
          <p className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
            Tools
          </p>
          <NavLink
            href="/app/smart-graph"
            label="Smart Graph"
            icon={<Network className="h-4 w-4" />}
            active={pathname === "/app/smart-graph"}
          />
          <NavLink
            href="/app/ai-assistant"
            label="Ask Larry"
            icon={<Bot className="h-4 w-4" />}
            active={pathname === "/app/ai-assistant"}
          />
          {canManage && (
            <NavLink
              href="/app/sales-detail"
              label="Data Log"
              icon={<Table2 className="h-4 w-4" />}
              active={pathname === "/app/sales-detail"}
            />
          )}
          {canManage && (
            <NavLink
              href="/app/export"
              label="Export & Backup"
              icon={<FileDown className="h-4 w-4" />}
              active={pathname === "/app/export"}
            />
          )}
          {role === "admin" && (
            <NavLink
              href="/app/gods-hand"
              label="God's Hand"
              icon={<Hand className="h-4 w-4" />}
              active={pathname === "/app/gods-hand"}
            />
          )}
        </div>

        <hr className="my-3 border-zinc-200" />

        {/* ── OTHER ───────────────────────────── */}
        {canManage && (
          <div className="pt-1">
            <p className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
              Other
            </p>
            {adminLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={
                  adminIconMap[link.href] ?? (
                    <ShieldCheck className="h-4 w-4" />
                  )
                }
                active={pathname === link.href}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Sign Out */}
      <div className="border-t border-zinc-200 p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

/* ── Category link with optional entity drill-down ────────────── */

function CatLink({
  link,
  cat,
  pathname,
  searchParams,
  entities,
  loadingEntity,
  expandedLink,
  onToggleLink,
}: {
  link: NavItem;
  cat: CategoryDef;
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
  entities: Record<string, { id: string; name: string }[]>;
  loadingEntity: string | null;
  expandedLink: string | null;
  onToggleLink: (link: NavItem) => void;
}) {
  const isActive = pathname === link.href;
  const hasEntities = !!link.entityType;
  const isExpanded = expandedLink === link.href;
  const entityList = link.entityType ? entities[link.entityType] ?? [] : [];
  const isLoading = loadingEntity === link.entityType && isExpanded;
  const activeEntityId = isActive
    ? searchParams.get(link.entityParam ?? "")
    : null;
  const isBrandEntity = link.entityType === "brands";
  const hasBrandImage = (name: string) => !!getBrandImagePath(name);

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={link.href}
          className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
            isActive && !activeEntityId
              ? cat.activeCls
              : isActive
                ? "bg-zinc-100 text-zinc-800"
                : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <span className={`h-2 w-2 rounded-sm shrink-0 ${cat.dot}`} />
          <span className="truncate font-medium">{link.label}</span>
        </Link>
        {hasEntities && (
          <button
            onClick={() => onToggleLink(link)}
            className="mr-1 rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="ml-4 mt-0.5 space-y-px border-l border-zinc-200 pl-2">
          <Link
            href={link.href}
            className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] transition-colors ${
              isActive && !activeEntityId
                ? "text-orange-600 font-semibold"
                : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <span className="w-3 text-center text-[9px]">✦</span>
            <span>All</span>
          </Link>
          {isLoading && (
            <p className="px-2 py-1 text-[10px] text-zinc-400">Loading…</p>
          )}
          {entityList.map((entity) => {
            const entityHref = `${link.href}?${link.entityParam}=${entity.id}`;
            const isEntityActive = isActive && activeEntityId === entity.id;
            return (
              <Link
                key={entity.id}
                href={entityHref}
                className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] transition-colors ${
                  isEntityActive
                    ? "bg-orange-50 text-orange-600 font-semibold"
                    : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
                }`}
              >
                <span className="w-3 text-center text-[9px]">
                  {isBrandEntity && hasBrandImage(entity.name) ? (
                    <BrandIcon name={entity.name} size={12} />
                  ) : isBrandEntity ? (
                    "⌚"
                  ) : (
                    "•"
                  )}
                </span>
                <span className="truncate">{entity.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Simple nav link ──────────────────────────────────────────── */

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-orange-50 text-orange-700 font-semibold"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

/* ── Disabled nav link (greyed-out placeholder) ───────────────── */

function DisabledNavLink({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 cursor-not-allowed select-none"
      title="Coming in next release"
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}
