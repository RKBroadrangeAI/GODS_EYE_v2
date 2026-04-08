"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/providers";
import { Lock } from "lucide-react";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { error } = useToast();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      error(json.error ?? "Login failed");
      return;
    }

    router.push("/app/sales-performance");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <Image
          src="/God's Hand 2.png"
          alt="God's Hand"
          width={80}
          height={80}
          className="mb-4 object-contain"
          unoptimized
        />
        <h1 className="text-2xl font-bold text-orange-600">GOD&apos;S EYE</h1>
        <p className="mt-1 text-sm text-zinc-500">Sales Intelligence Platform</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-8 py-8 shadow-sm">
        {params.get("error") === "inactive" ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            Your account is inactive. Contact management.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Email
            </label>
            <input
              required
              type="email"
              name="email"
              placeholder="you@godseye.com"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Password
            </label>
            <input
              required
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
          >
            <Lock className="h-4 w-4" />
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Authorized personnel only. Contact your admin for access.
        </p>
      </div>
    </div>
  );
}
