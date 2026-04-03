"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls every 60 seconds to refresh the page data.
 * (Replaced Supabase Realtime — plain Postgres has no built-in push channel.)
 */
export function useSalesRealtime(enabled = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      router.refresh();
    }, 60_000);

    return () => clearInterval(interval);
  }, [enabled, router]);
}
