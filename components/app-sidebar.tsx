"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, LogOut, PlusCircle, ShieldCheck, Table2 } from "lucide-react";
import { adminLinks, dashboardLinks } from "@/lib/constants";
import type { AppRole } from "@/types/database";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type SidebarProps = {
  role: AppRole;
  name: string;
};

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
    <aside className="w-full border-r border-zinc-200 bg-white lg:w-72">
      <div className="border-b border-zinc-200 p-5">
        <p className="text-xs font-semibold uppercase text-zinc-500">GOD&apos;S EYE</p>
        <p className="mt-1 text-sm font-semibold">{name}</p>
        <p className="text-xs uppercase text-zinc-500">{role.replace("_", " ")}</p>
      </div>

      <nav className="space-y-1 p-3">
        <SidebarLink
          href="/app"
          label="Dashboard Home"
          icon={<LayoutGrid className="h-4 w-4" />}
          active={pathname === "/app"}
        />
        <SidebarLink href="/app/enter-sale" label="Enter Sale Here" icon={<PlusCircle className="h-4 w-4" />} active={pathname === "/app/enter-sale"} />
        {canManage ? (
          <SidebarLink
            href="/app/sales-detail"
            label="Sales Detail Page"
            icon={<Table2 className="h-4 w-4" />}
            active={pathname === "/app/sales-detail"}
          />
        ) : null}
        {dashboardLinks
          .filter((link) => (role === "sales_associate" || role === "view_only" ? link.href !== "/app/budget-2026" : true))
          .map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={<LayoutGrid className="h-4 w-4" />}
              active={pathname === link.href}
            />
          ))}

        {canManage ? (
          <div className="pt-2">
            <p className="px-3 pb-1 text-xs font-semibold uppercase text-zinc-500">Admin</p>
            {adminLinks.map((link) => (
              <SidebarLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={<ShieldCheck className="h-4 w-4" />}
                active={pathname === link.href}
              />
            ))}
          </div>
        ) : null}
      </nav>

      <div className="p-3">
        <ThemeToggle />
        <Button variant="outline" onClick={signOut} className="mt-2 w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
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
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
        active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
