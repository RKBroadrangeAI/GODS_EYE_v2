"use client";

import { useEffect, useState } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Payload = {
  recommendations: string[];
  anomalies: string[];
};

export function SmartRecommendations() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/ai/recommendations", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: Payload) => {
        if (!mounted) return;
        setData(payload);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          Smart Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-zinc-500">Generating recommendations…</p>
        ) : (
          <>
            {(data?.recommendations ?? []).slice(0, 3).map((item) => (
              <p key={item} className="text-xs text-zinc-700">
                • {item}
              </p>
            ))}
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <p className="mb-1 flex items-center gap-1 font-semibold">
                <TriangleAlert className="h-3 w-3" />
                Alerts
              </p>
              {(data?.anomalies ?? []).slice(0, 2).map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
