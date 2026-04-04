"use client";

import type { ReactNode } from "react";
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
} from "lucide-react";
import { adminLinks } from "@/lib/constants";
import type { AppRole } from "@/types/database";

type SidebarProps = {
  role: AppRole;
  name: string;
};

const navIconMap: Record<string, ReactNode> = {
  "/app/sales-performance":              <BarChart2 className="h-4 w-4 shrink-0" />,
  "/app/budget-2026":                    <DollarSign className="h-4 w-4 shrink-0" />,
  "/app/overall-sales":                  <TrendingUp className="h-4 w-4 shrink-0" />,
  "/app/in-person-vs-remote":            <Users className="h-4 w-4 shrink-0" />,
  "/app/lead-performance-monthly":       <Target className="h-4 w-4 shrink-0" />,
  "/app/inventory-tiers":                <Layers className="h-4 w-4 shrink-0" />,
  "/app/brand-performance":              <Award className="h-4 w-4 shrink-0" />,
  "/app/inventory-mix":                  <PieChart className="h-4 w-4 shrink-0" />,
  "/app/lead-performance":               <LineChart className="h-4 w-4 shrink-0" />,
  "/app/lead-perf-m2m":                 <ArrowLeftRight className="h-4 w-4 shrink-0" />,
  "/app/brand-perf-m2m":               <ArrowLeftRight className="h-4 w-4 shrink-0" />,
  "/app/inventory-mix-per-sales-person": <UserCheck className="h-4 w-4 shrink-0" />,
};

const adminIconMap: Record<string, ReactNode> = {
  "/app/admin/employees":       <Users2 className="h-4 w-4 shrink-0" />,
  "/app/admin/dropdowns":       <Settings className="h-4 w-4 shrink-0" />,
  "/app/admin/condition-scale": <SlidersHorizontal className="h-4 w-4 shrink-0" />,
};

const dashboardLinks = [
  { href: "/app/budget-2026",                    label: "Budget 2026" },
  { href: "/app/overall-sales",                  label: "Overall Sales" },
  { href: "/app/in-person-vs-remote",            label: "In Person vs Remote" },
  { href: "/app/sales-performance",              label: "Sales Performance" },
  { href: "/app/lead-performance-monthly",       label: "Lead Perf Monthly" },
  { href: "/app/inventory-tiers",                label: "Inventory Tiers" },
  { href: "/app/brand-performance",              label: "Brand Performance" },
  { href: "/app/inventory-mix",                  label: "Inventory Mix" },
  { href: "/app/lead-performance",               label: "Lead Performance" },
  { href: "/app/lead-perf-m2m",                 label: "Lead Perf M2M" },
  { href: "/app/brand-perf-m2m",               label: "Brand Perf M2M" },
  { href: "/app/inventory-mix-per-sales-person", label: "Inv Mix / Associate" },
] as const;

export function AppSidebar({ role, name }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const canManage = role === "admin" || role === "management";

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
        <SidebarLink
          href="/app"
          label="Dashboard"
          icon={<LayoutDashboard className="h-4 w-4 shrink-0" />}
          active={pathname === "/app"}
        />
        <SidebarLink
          href="/app/enter-sale"
          label="Enter Sale"
          icon={<PlusCircle className="h-4 w-4 shrink-0" />}
          active={pathname === "/app/enter-sale"}
        />
        {canManage ? (
          <SidebarLink
            href="/app/sales-detail"
            label="Sales Detail"
            icon={<Table2 className="h-4 w-4 shrink-0" />}
            active={pathname === "/app/sales-detail"}
          />
        ) : null}

        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Reports
        </p>

        {dashboardLinks
          .filter((link) =>
            role === "sales_associate" || role === "view_only"
              ? link.href !== "/app/budget-2026"
              : true,
          )
          .map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={navIconMap[link.href] ?? <BarChart2 className="h-4 w-4 shrink-0" />}
              active={pathname === link.href}
            />
          ))}

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
