import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/request-auth";
import { buildAiContext } from "@/lib/ai-intelligence";

export async function GET() {
  const auth = await getRequestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = new Date().getMonth() + 1;
  const context = await buildAiContext(month, 2026);

  return NextResponse.json({
    recommendations: context.recommendations,
    anomalies: context.anomalies,
  });
}
