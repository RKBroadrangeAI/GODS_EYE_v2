"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, UserPen } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <Link
        href="/app/profile"
        className="flex items-center gap-2 rounded-lg bg-white border border-zinc-200 px-3 py-2 text-sm text-zinc-600 shadow-sm transition-colors hover:bg-zinc-100 hover:text-zinc-800"
      >
        <UserPen className="h-4 w-4" />
        <span>Profile</span>
      </Link>
      <button
        onClick={signOut}
        className="flex items-center gap-2 rounded-lg bg-white border border-zinc-200 px-3 py-2 text-sm text-zinc-600 shadow-sm transition-colors hover:bg-zinc-100 hover:text-zinc-800"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
