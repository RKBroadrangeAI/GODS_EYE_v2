"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExecutiveSummaryButton() {
  const [loading, setLoading] = useState(false);

  async function generatePdf() {
    setLoading(true);
    const response = await fetch("/api/ai/executive-summary", { method: "GET" });
    setLoading(false);

    if (!response.ok) return;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "gods-eye-executive-summary.pdf";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button onClick={generatePdf} disabled={loading} className="gap-2">
      <FileDown className="h-4 w-4" />
      {loading ? "Generating PDF..." : "Generate Executive Summary PDF"}
    </Button>
  );
}
