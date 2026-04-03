import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getRequestAuth } from "@/lib/request-auth";
import { buildAiContext } from "@/lib/ai-intelligence";

export async function GET() {
  const auth = await getRequestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = new Date().getMonth() + 1;
  const context = await buildAiContext(month, 2026);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 760;
  page.drawText("GOD'S EYE — Executive Summary", {
    x: 40,
    y,
    size: 18,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 26;

  const lines = [
    `Month: ${context.month}/${context.year}`,
    `Top Performer: ${context.topPerformer}`,
    `Under Budget: ${context.underBudget.join(", ") || "None"}`,
    "",
    "Anomalies:",
    ...context.anomalies.map((a) => `- ${a}`),
    "",
    "Recommendations:",
    ...context.recommendations.map((r) => `- ${r}`),
    "",
    "Forecast (Top 5):",
    ...context.forecasts.slice(0, 5).map((f) => `- ${f.name}: ${f.projectedYearGp.toFixed(0)} projected GP`),
  ];

  lines.forEach((line) => {
    if (y < 50) return;
    page.drawText(line, {
      x: 40,
      y,
      size: 11,
      font: line.endsWith(":") ? bold : font,
      color: rgb(0.15, 0.15, 0.15),
      maxWidth: 530,
    });
    y -= 16;
  });

  const pdfBytes = await pdf.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="gods-eye-executive-summary-${context.year}-${String(context.month).padStart(2, "0")}.pdf"`,
    },
  });
}
