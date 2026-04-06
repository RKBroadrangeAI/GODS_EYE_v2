"use client";

import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Table2,
  BarChart2,
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
  Users2,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  LogOut,
  Bot,
  FileDown,
  ChevronDown,
  ChevronRight,
  Activity,
  Radio,
  Gauge,
} from "lucide-react";
import { adminLinks } from "@/lib/constants";
import type { AppRole } from "@/types/database";

type SidebarProps = {
  role: AppRole;
  name: string;
};

/* ── Category definitions ─────────────────────────────────────── */

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Which entity type to show as clickable sub-items */
  entityType?: "people" | "brands" | "lead_sources" | "in_person_options";
  /** Query param name for chosen entity */
  entityParam?: string;
};

const budgetLinks: NavItem[] = [
  { href: "/app/budget-2026", label: "Budget 2026", icon: <DollarSign className="h-4 w-4 shrink-0" /> },
  { href: "/app/budget-2025", label: "Budget 2025", icon: <DollarSign className="h-4 w-4 shrink-0" /> },
];

const salesLinks: NavItem[] = [
  { href: "/app/overall-sales",      label: "By Person",  icon: <TrendingUp className="h-4 w-4 shrink-0" />, entityType: "people", entityParam: "person" },
  { href: "/app/sales-performance",  label: "By Month",   icon: <BarChart2 className="h-4 w-4 shrink-0" /> },
];

const channelsLinks: NavItem[] = [
  { href: "/app/in-person-vs-remote", label: "In Person vs Remote", icon: <Users className="h-4 w-4 shrink-0" />, entityType: "in_person_options", entityParam: "channel" },
  { href: "/app/lead-performance",    label: "Channel Performance", icon: <LineChart className="h-4 w-4 shrink-0" />, entityType: "lead_sources", entityParam: "lead" },
  { href: "/app/lead-performance-monthly", label: "Channel Monthly", icon: <Target className="h-4 w-4 shrink-0" />, entityType: "lead_sources", entityParam: "lead" },
  { href: "/app/lead-perf-m2m",       label: "Channel M2M",         icon: <ArrowLeftRight className="h-4 w-4 shrink-0" />, entityType: "lead_sources", entityParam: "lead" },
];

const brandsLinks: NavItem[] = [
  { href: "/app/brand-performance", label: "Brand Performance", icon: <Award className="h-4 w-4 shrink-0" />, entityType: "brands", entityParam: "brand" },
  { href: "/app/brand-perf-m2m",    label: "Brand Perf M2M",    icon: <ArrowLeftRight className="h-4 w-4 shrink-0" />, entityType: "brands", entityParam: "brand" },
];

const leadsLinks: NavItem[] = [
  { href: "/app/lead-performance",         label: "Performance",         icon: <LineChart className="h-4 w-4 shrink-0" />, entityType: "lead_sources", entityParam: "lead" },
  { href: "/app/lead-performance-monthly", label: "Monthly Performance", icon: <Target className="h-4 w-4 shrink-0" />, entityType: "lead_sources", entityParam: "lead" },
  { href: "/app/lead-perf-m2m",            label: "Lead Perf M2M",       icon: <ArrowLeftRight className="h-4 w-4 shrink-0" />, entityType: "lead_sources", entityParam: "lead" },
];

const inventoryLinks: NavItem[] = [
  { href: "/app/inventory-tiers",                label: "Tiers",            icon: <Layers className="h-4 w-4 shrink-0" /> },
  { href: "/app/inventory-mix",                  label: "Mix",              icon: <PieChart className="h-4 w-4 shrink-0" /> },
  { href: "/app/inventory-mix-per-sales-person", label: "Mix by Associate", icon: <UserCheck className="h-4 w-4 shrink-0" />, entityType: "people", entityParam: "person" },
];

const performanceLinks: NavItem[] = [
  { href: "/app/performance/by-lead",      label: "By Lead",      icon: <Target className="h-4 w-4 shrink-0" /> },
  { href: "/app/performance/by-associate", label: "By Associate", icon: <Users className="h-4 w-4 shrink-0" /> },
  { href: "/app/performance/by-month",     label: "By Month",     icon: <Activity className="h-4 w-4 shrink-0" /> },
  { href: "/app/performance/by-sales",     label: "By Sales",     icon: <Radio className="h-4 w-4 shrink-0" /> },
  { href: "/app/performance/by-channel",   label: "By Channel",   icon: <Gauge className="h-4 w-4 shrink-0" /> },
];

const adminIconMap: Record<string, ReactNode> = {
  "/app/admin/employees":       <Users2 className="h-4 w-4 shrink-0" />,
  "/app/admin/dropdowns":       <Settings className="h-4 w-4 shrink-0" />,
  "/app/admin/condition-scale": <SlidersHorizontal className="h-4 w-4 shrink-0" />,
};

export function AppSidebar({ role, name }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const canManage = role === "admin" || role === "management";
  const isBudgetHidden = role === "sales_associate" || role === "view_only";

  /* Collapsed state per category – all start collapsed */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    budget: false,
    sales: false,
    channels: false,
    brands: false,
    leads: false,
    inventory: false,
    performance: false,
  });

  /* Entity caches (fetched once on first expand) */
  const [entities, setEntities] = useState<Record<string, { id: string; name: string }[]>>({});
  const [loadingEntity, setLoadingEntity] = useState<string | null>(null);
  /* Which link's sub-menu is expanded: key = href */
  const [expandedLink, setExpandedLink] = useState<string | null>(null);

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

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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
    <aside className="flex w-full shrink-0 flex-col bg-[#1c1c1e] text-white lg:w-64 lg:min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-5 py-4">
        <Image
          src="/copy_logo.png"
          alt="God's Eye"
          width={40}
          height={40}
          className="rounded-full object-cover"
          unoptimized
        />
        <div>
          <p className="text-sm font-bold tracking-wide text-orange-500">GOD&apos;S EYE</p>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Sales Intelligence</p>
        </div>
      </div>

      {/* User */}
      <div className="border-b border-white/10 px-5 py-3">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-[10px] uppercase tracking-wider text-zinc-400">{role.replace("_", " ")}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {/* Dashboard */}
        <SidebarLink
          href="/app"
          label="Dashboard"
          icon={<LayoutDashboard className="h-4 w-4 shrink-0" />}
          active={pathname === "/app"}
        />

        {/* Sales entry section */}
        <p className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-white/90">
          Sales
        </p>
        <SidebarLink
          href="/app/enter-sale"
          label="Enter Sale"
          icon={<PlusCircle className="h-4 w-4 shrink-0" />}
          active={pathname === "/app/enter-sale"}
        />
        {canManage ? (
          <SidebarLink
            href="/app/sales-detail"
            label="Data Log"
            icon={<Table2 className="h-4 w-4 shrink-0" />}
            active={pathname === "/app/sales-detail"}
          />
        ) : null}

        {/* ── BUDGET ── */}
        {!isBudgetHidden && (
          <CollapsibleSection
            label="Budget"
            expanded={expanded.budget}
            onToggle={() => toggle("budget")}
          >
            {budgetLinks.map((link) => (
              <SidebarLinkWithEntities
                key={link.href}
                link={link}
                pathname={pathname}
                searchParams={searchParams}
                entities={entities}
                loadingEntity={loadingEntity}
                expandedLink={expandedLink}
                onToggleLink={handleToggleLink}
              />
            ))}
          </CollapsibleSection>
        )}

        {/* ── SALES REPORTS ── */}
        <CollapsibleSection
          label="Sales Reports"
          expanded={expanded.sales}
          onToggle={() => toggle("sales")}
        >
          {salesLinks.map((link) => (
            <SidebarLinkWithEntities
              key={link.href}
              link={link}
              pathname={pathname}
              searchParams={searchParams}
              entities={entities}
              loadingEntity={loadingEntity}
              expandedLink={expandedLink}
              onToggleLink={handleToggleLink}
            />
          ))}
        </CollapsibleSection>

        {/* ── CHANNELS ── */}
        <CollapsibleSection
          label="Channels"
          expanded={expanded.channels}
          onToggle={() => toggle("channels")}
        >
          {channelsLinks.map((link) => (
            <SidebarLinkWithEntities
              key={link.href}
              link={link}
              pathname={pathname}
              searchParams={searchParams}
              entities={entities}
              loadingEntity={loadingEntity}
              expandedLink={expandedLink}
              onToggleLink={handleToggleLink}
            />
          ))}
        </CollapsibleSection>

        {/* ── BRANDS ── */}
        <CollapsibleSection
          label="Brands"
          expanded={expanded.brands}
          onToggle={() => toggle("brands")}
        >
          {brandsLinks.map((link) => (
            <SidebarLinkWithEntities
              key={link.href}
              link={link}
              pathname={pathname}
              searchParams={searchParams}
              entities={entities}
              loadingEntity={loadingEntity}
              expandedLink={expandedLink}
              onToggleLink={handleToggleLink}
            />
          ))}
        </CollapsibleSection>

        {/* ── LEADS ── */}
        <CollapsibleSection
          label="Leads"
          expanded={expanded.leads}
          onToggle={() => toggle("leads")}
        >
          {leadsLinks.map((link) => (
            <SidebarLinkWithEntities
              key={link.href}
              link={link}
              pathname={pathname}
              searchParams={searchParams}
              entities={entities}
              loadingEntity={loadingEntity}
              expandedLink={expandedLink}
              onToggleLink={handleToggleLink}
            />
          ))}
        </CollapsibleSection>

        {/* ── INVENTORY ── */}
        <CollapsibleSection
          label="Inventory"
          expanded={expanded.inventory}
          onToggle={() => toggle("inventory")}
        >
          {inventoryLinks.map((link) => (
            <SidebarLinkWithEntities
              key={link.href}
              link={link}
              pathname={pathname}
              searchParams={searchParams}
              entities={entities}
              loadingEntity={loadingEntity}
              expandedLink={expandedLink}
              onToggleLink={handleToggleLink}
            />
          ))}
        </CollapsibleSection>

        {/* ── PERFORMANCE ── */}
        <CollapsibleSection
          label="Performance"
          expanded={expanded.performance}
          onToggle={() => toggle("performance")}
        >
          {performanceLinks.map((link) => (
            <SidebarLinkWithEntities
              key={link.href}
              link={link}
              pathname={pathname}
              searchParams={searchParams}
              entities={entities}
              loadingEntity={loadingEntity}
              expandedLink={expandedLink}
              onToggleLink={handleToggleLink}
            />
          ))}
        </CollapsibleSection>

        {/* ── TOOLS ── */}
        <p className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-white/90">
          Tools
        </p>
        <SidebarLink
          href="/app/ai-assistant"
          label="Ask Larry"
          icon={<Bot className="h-4 w-4 shrink-0" />}
          active={pathname === "/app/ai-assistant"}
        />
        {canManage ? (
          <SidebarLink
            href="/app/export"
            label="Export & Backup"
            icon={<FileDown className="h-4 w-4 shrink-0" />}
            active={pathname === "/app/export"}
          />
        ) : null}

        {/* ── ADMIN ── */}
        {canManage ? (
          <>
            <p className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-white/90">
              Admin
            </p>
            {adminLinks.map((link) => (
              <SidebarLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={adminIconMap[link.href] ?? <ShieldCheck className="h-4 w-4 shrink-0" />}
                active={pathname === link.href}
              />
            ))}
          </>
        ) : null}
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

/* ── Collapsible section wrapper ──────────────────────────────── */

function CollapsibleSection({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="pt-3">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-3 pb-1 text-xs font-bold uppercase tracking-wide text-white/90 hover:text-white transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        <span>{label}</span>
      </button>
      {expanded && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

/* ── Brand icon mapping ───────────────────────────────────────── */

const BRAND_ICONS: Record<string, string> = {
  ROLEX: "👑",
  "PATEK PHILIPPE": "🏛️",
  "AUDEMARS PIGUET": "🔷",
  "RICHARD MILLE": "💎",
  OMEGA: "Ω",
  CARTIER: "🐆",
  BREITLING: "✈️",
  HUBLOT: "⬡",
  "TAG HEUER": "🏎️",
  TUDOR: "🛡️",
  IWC: "⚙️",
  PANERAI: "⚓",
  BREGUET: "🕰️",
  BLANCPAIN: "🌊",
  "A.LANGE & SOHNE": "🇩🇪",
  "VACHERON CONSTATIN": "🏔️",
  BVLGARI: "🐍",
  "JAEGER LECOULTRE": "🔄",
  ZENITH: "⭐",
  "FP JOURNE": "🎨",
  "GIRARD PERREGAUX": "🌉",
  "GRAND SEIKO": "🗻",
  "GLASHUTTE ORIGINAL": "🔧",
  LONGINES: "🐴",
  "ULYSSE NARDIN": "⛵",
  OTHER: "⌚",
  SERVICE: "🔧",
};

function getBrandIcon(name: string): string {
  return BRAND_ICONS[name.toUpperCase()] ?? "⌚";
}

/* ── Sidebar link with expandable entity sub-items ────────────── */

function SidebarLinkWithEntities({
  link,
  pathname,
  searchParams,
  entities,
  loadingEntity,
  expandedLink,
  onToggleLink,
}: {
  link: NavItem;
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
  const activeEntityId = isActive ? searchParams.get(link.entityParam ?? "") : null;
  const isBrandEntity = link.entityType === "brands";

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={link.href}
          className={`flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive && !activeEntityId
              ? "bg-orange-600 text-white shadow-sm"
              : isActive
                ? "bg-white/10 text-white"
                : "text-zinc-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          {link.icon}
          <span className="truncate">{link.label}</span>
        </Link>
        {hasEntities && (
          <button
            onClick={() => onToggleLink(link)}
            className="mr-1 rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            title={`Show ${link.entityType?.replace("_", " ")}`}
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
        <div className="ml-5 mt-0.5 space-y-px border-l border-white/10 pl-2">
          {/* "All" link */}
          <Link
            href={link.href}
            className={`flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
              isActive && !activeEntityId
                ? "text-orange-400 font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span className="w-4 text-center text-[10px]">✦</span>
            <span>All</span>
          </Link>
          {isLoading && (
            <p className="px-2 py-1 text-[10px] text-zinc-500">Loading...</p>
          )}
          {entityList.map((entity) => {
            const entityHref = `${link.href}?${link.entityParam}=${entity.id}`;
            const isEntityActive = isActive && activeEntityId === entity.id;
            return (
              <Link
                key={entity.id}
                href={entityHref}
                className={`flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                  isEntityActive
                    ? "bg-orange-600/20 text-orange-400 font-semibold"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-4 text-center text-[10px]">
                  {isBrandEntity ? getBrandIcon(entity.name) : "•"}
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

/* ── Single sidebar link (no entities) ────────────────────────── */

function SidebarLink({
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
          ? "bg-orange-600 text-white shadow-sm"
          : "text-zinc-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}
