"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Message = {
  role: "user" | "assistant";
  content: string;
  sql?: string | null;
  totalRows?: number | null;
};

const prompts = [
  "Who sold the most revenue this year?",
  "Top 5 brands by GP in 2026",
  "How many units each person sold in January?",
  "What is the average margin by lead source?",
  "Show Noah Allen's monthly breakdown",
  "Which condition type has the highest GP?",
];

/* ── Simple markdown renderer ────────────────────────────────────── */
function renderMarkdown(md: string) {
  // Process line-by-line
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableKey = 0;

  function flushTable() {
    if (tableRows.length === 0) return;
    const headers = tableRows[0];
    // Skip separator row (row with --- patterns)
    const dataRows = tableRows.slice(1).filter((r) =>
      !r.every((c) => /^[-:|\s]+$/.test(c))
    );
    elements.push(
      <div key={`tbl-${tableKey++}`} className="my-2 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-300">
              {headers.map((h, i) => (
                <th key={i} className="px-2 py-1 font-semibold text-zinc-700 whitespace-nowrap">
                  {formatInline(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-zinc-50" : ""}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1 whitespace-nowrap">
                    {formatInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  }

  function formatInline(text: string): React.ReactNode {
    // Bold: **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table row detection
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line.trim().slice(1, -1).split("|");
      if (!inTable) inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="mt-3 mb-1 font-bold text-sm text-zinc-800">{formatInline(line.slice(4))}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="mt-3 mb-1 font-bold text-sm text-zinc-800">{formatInline(line.slice(3))}</h3>);
    } else if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="mt-3 mb-1 font-bold text-base text-zinc-900">{formatInline(line.slice(2))}</h2>);
    }
    // Bullet list
    else if (line.match(/^\s*[-*]\s/)) {
      elements.push(
        <div key={i} className="flex gap-1.5 ml-2">
          <span className="text-zinc-400 shrink-0">•</span>
          <span>{formatInline(line.replace(/^\s*[-*]\s/, ""))}</span>
        </div>
      );
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    }
    // Regular paragraph
    else {
      elements.push(<p key={i}>{formatInline(line)}</p>);
    }
  }
  if (inTable) flushTable();

  return elements;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(question?: string) {
    const text = (question ?? query).trim();
    if (!text || loading) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    if (!question) setQuery("");

    try {
      const response = await fetch("/api/ai/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, month: new Date().getMonth() + 1, year: 2026 }),
      });

      const payload = (await response.json().catch(() => ({ answer: "Unable to process request." }))) as {
        answer?: string;
        sql?: string | null;
        totalRows?: number | null;
      };

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: payload.answer ?? "Unable to process request.",
          sql: payload.sql,
          totalRows: payload.totalRows,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          Ask Larry
          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            <Sparkles className="h-3 w-3" />
            Advanced AI
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 min-h-0 flex-col gap-3">
        {/* Quick prompts */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              disabled={loading}
              className="rounded-md border border-zinc-200 px-2 py-1.5 text-left text-xs hover:bg-zinc-100 hover:border-zinc-300 transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat messages */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-md border border-zinc-200 p-3"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
              <Bot className="h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500 font-medium">Ask Larry anything about your sales data</p>
              <p className="text-xs text-zinc-400 max-w-xs">
                I query your database directly and format the results with AI.
                Try questions about revenue, GP, units, brands, associates, or trends.
              </p>
            </div>
          ) : (
            messages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`text-xs ${
                  message.role === "user"
                    ? "ml-8 rounded-lg bg-orange-50 border border-orange-100 p-2"
                    : "mr-2 rounded-lg bg-white border border-zinc-100 p-3 shadow-sm"
                }`}
              >
                <p className="font-semibold uppercase text-[10px] tracking-wider mb-1 text-zinc-400">
                  {message.role === "user" ? "You" : "Larry"}
                  {message.totalRows != null && (
                    <span className="ml-2 normal-case tracking-normal font-normal text-zinc-300">
                      {message.totalRows} row{message.totalRows !== 1 ? "s" : ""} queried
                    </span>
                  )}
                </p>
                <div className="leading-relaxed text-zinc-700 space-y-0.5">
                  {message.role === "assistant" ? renderMarkdown(message.content) : message.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
              <div className="flex gap-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              Querying database &amp; generating analysis…
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 shrink-0">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Larry anything about your sales data..."
            disabled={loading}
          />
          <Button disabled={loading || !query.trim()} onClick={() => send()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
