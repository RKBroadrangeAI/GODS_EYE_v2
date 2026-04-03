import { NextResponse } from "next/server";
import { z } from "zod";
import { getSalesPerformanceData } from "@/lib/sales-performance";
import { getRequestAuth } from "@/lib/request-auth";

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().default(2026),
});

export async function GET(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    month: searchParams.get("month") ?? "1",
    year: searchParams.get("year") ?? "2026",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const data = await getSalesPerformanceData(parsed.data.month, parsed.data.year);
  return NextResponse.json(data);
}
