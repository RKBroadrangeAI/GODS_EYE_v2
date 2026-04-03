"use client";

import { useSalesRealtime } from "@/hooks/use-sales-realtime";

export function RealtimeRefresher() {
  useSalesRealtime(true);
  return null;
}
