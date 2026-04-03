import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestAuth } from "@/lib/request-auth";
import { buildAiContext, contextToPrompt } from "@/lib/ai-intelligence";

const schema = z.object({
  message: z.string().min(2),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().optional(),
});

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const month = parsed.data.month ?? new Date().getMonth() + 1;
  const year = parsed.data.year ?? 2026;

  const context = await buildAiContext(month, year);
  const contextPrompt = contextToPrompt(context);

  const apiKey = process.env.XAI_GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer: "Grok API key is not configured. Add XAI_GROK_API_KEY.",
      context,
    });
  }

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.XAI_GROK_MODEL ?? "grok-3-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are God's Eye AI intelligence engine. Answer with concise analysis, include forecast and anomalies when relevant, and provide direct actions.",
        },
        { role: "system", content: `Context:\n${contextPrompt}` },
        { role: "user", content: parsed.data.message },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({
      answer: "Advanced AI request failed. Please try again.",
      context,
    });
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return NextResponse.json({
    answer: payload.choices?.[0]?.message?.content ?? "No answer returned.",
    context,
  });
}
