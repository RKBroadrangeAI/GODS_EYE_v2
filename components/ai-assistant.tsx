"use client";

import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Message = { role: "user" | "assistant"; content: string };

const prompts = [
  "Who is under budget this month?",
  "Forecast Noah's GP for April",
  "Show anomalies in margins",
];

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(question?: string) {
    const text = (question ?? query).trim();
    if (!text) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    if (!question) setQuery("");

    const response = await fetch("/api/ai/advanced", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, month: new Date().getMonth() + 1, year: 2026 }),
    });

    const payload = (await response.json().catch(() => ({ answer: "Unable to process request." }))) as {
      answer?: string;
    };

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: payload.answer ?? "Unable to process request." },
    ]);
    setLoading(false);
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          God&apos;s Eye AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-[calc(100%-70px)] flex-col gap-3">
        <div className="grid gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="rounded-md border border-zinc-200 px-2 py-1 text-left text-xs hover:bg-zinc-100"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-2">
          {messages.length === 0 ? (
            <p className="text-xs text-zinc-500">Ask a question about pacing, budgets, forecasts, or anomalies.</p>
          ) : (
            messages.map((message, idx) => (
              <div key={`${message.role}-${idx}`} className="text-xs">
                <p className="font-semibold uppercase text-zinc-500">{message.role}</p>
                <p>{message.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask God’s Eye AI"
          />
          <Button disabled={loading} onClick={() => send()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
