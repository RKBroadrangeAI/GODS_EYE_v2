"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

type NavItem = { href: string; label: string; icon: ReactNode };

const budgetLinks: NavItem[] = [
  { href: "/app/budget-2026", label: "Budget 2026", icon: <DollarSign className="h-4 w-4 shrink-0" /> },
  { href: "/app/budget-2025", label: "Budget 2025", icon: <DollarSign className="h-4 w-4 shrink-0" /> },
];

const salesLinks: NavItem[] = [
  { href: "/app/overall-sales",      label: "By Person",  icon: <TrendingUp className="h-4 w-4 shrink-0" /> },
  { href: "/app/sales-performance",  label: "By Month",   icon: <BarChart2 className="h-4 w-4 shrink-0" /> },
];

const channelsLinks: NavItem[] = [
  { href: "/app/in-person-vs-remote", label: "In Person vs Remote", icon: <Users className="h-4 w-4 shrink-0" /> },
  { href: "/app/lead-performance",    label: "Channel Performance", icon: <LineChart className="h-4 w-4 shrink-0" /> },
  { href: "/app/lead-performance-monthly", label: "Channel Monthly", icon: <Target className="h-4 w-4 shrink-0" /> },
  { href: "/app/lead-perf-m2m",       label: "Channel M2M",         icon: <ArrowLeftRight className="h-4 w-4 shrink-0" /> },
];

const brandsLinks: NavItem[] = [
  { href: "/app/brand-performance", label: "Brand Performance", icon: <Award className="h-4 w-4 shrink-0" /> },
  { href: "/app/brand-perf-m2m",    label: "Brand Perf M2M",    icon: <ArrowLeftRight className="h-4 w-4 shrink-0" /> },
];

const leadsLinks: NavItem[] = [
  { href: "/app/lead-performance",         label: "Performance",         icon: <LineChart className="h-4 w-4 shrink-0" /> },
  { href: "/app/lead-performance-monthly", label: "Monthly Performance", icon: <Target className="h-4 w-4 shrink-0" /> },
  { href: "/app/lead-perf-m2m",            label: "Lead Perf M2M",       icon: <ArrowLeftRight className="h-4 w-4 shrink-0" /> },
];

const inventoryLinks: NavItem[] = [
  { href: "/app/inventory-tiers",                label: "Tiers",            icon: <Layers className="h-4 w-4 shrink-0" /> },
  { href: "/app/inventory-mix",                  label: "Mix",              icon: <PieChart className="h-4 w-4 shrink-0" /> },
  { href: "/app/inventory-mix-per-sales-person", label: "Mix by Associate", icon: <UserCheck className="h-4 w-4 shrink-0" /> },
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

  const canManage = role === "admin" || role === "management";
  const isBudgetHidden = role === "sales_associate" || role === "view_only";

  /* Collapsed state per category – all open by default */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    budget: true,
    sales: true,
    channels: true,
    brands: true,
    leads: true,
    inventory: true,
    performance: true,
  });

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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
        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
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
              <SidebarLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                active={pathname === link.href}
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
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={pathname === link.href}
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
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={pathname === link.href}
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
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={pathname === link.href}
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
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={pathname === link.href}
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
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={pathname === link.href}
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
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={pathname === link.href}
            />
          ))}
        </CollapsibleSection>

        {/* ── TOOLS ── */}
        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
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
            <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
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
        className="flex w-full items-center gap-1 px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span>{label}</span>
      </button>
      {expanded && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

/* ── Single sidebar link ──────────────────────────────────────── */

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
