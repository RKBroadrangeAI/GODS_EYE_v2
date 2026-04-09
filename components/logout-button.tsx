"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-white border border-zinc-200 px-3 py-2 text-sm text-zinc-600 shadow-sm transition-colors hover:bg-zinc-100 hover:text-zinc-800"
    >
      <LogOut className="h-4 w-4" />
      <span>Sign Out</span>
    </button>
  );
}
