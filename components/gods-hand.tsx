"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  MessageCircle,
  Mail,
  Send,
  Users,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Megaphone,
  X,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────── */

type WAStatus = "disconnected" | "connecting" | "qr" | "connected";
type Tab = "whatsapp" | "group" | "broadcast" | "email";
type Group = { id: string; name: string };

type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};

/* ── Main Component ───────────────────────────────── */

export function GodsHand() {
  const [waStatus, setWaStatus] = useState<WAStatus>("disconnected");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tab, setTab] = useState<Tab>("whatsapp");
  const [sending, setSending] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [polling, setPolling] = useState(false);

  // WhatsApp DM fields
  const [waTo, setWaTo] = useState("");
  const [waMessage, setWaMessage] = useState("");

  // Group message fields
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupMessage, setGroupMessage] = useState("");

  // Broadcast fields
  const [broadcastRecipients, setBroadcastRecipients] = useState<string[]>([]);
  const [broadcastInput, setBroadcastInput] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  // Email fields
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  /* ── Toast helpers ── */
  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  /* ── Poll WhatsApp status ── */
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/gods-hand?action=status");
      if (!res.ok) return;
      const data = await res.json();
      setWaStatus(data.status);
      setGroups(data.groups ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll for QR when connecting
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/gods-hand?action=qr");
      if (!res.ok) return;
      const data = await res.json();
      setWaStatus(data.status);
      if (data.qr) setQrImage(data.qr);
      if (data.status === "connected") {
        setPolling(false);
        setQrImage(null);
        fetchStatus();
        addToast("success", "WhatsApp connected!");
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [polling, fetchStatus, addToast]);

  /* ── Actions ── */
  const connectWA = async () => {
    try {
      const res = await fetch("/api/gods-hand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect" }),
      });
      const data = await res.json();
      setWaStatus(data.status);
      if (data.qr) setQrImage(data.qr);
      if (data.status === "qr" || data.status === "connecting") {
        setPolling(true);
      }
    } catch {
      addToast("error", "Failed to initiate WhatsApp connection");
    }
  };

  const disconnectWA = async () => {
    await fetch("/api/gods-hand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setWaStatus("disconnected");
    setQrImage(null);
    setGroups([]);
    setPolling(false);
    addToast("success", "WhatsApp disconnected");
  };

  const refreshGroupsList = async () => {
    try {
      const res = await fetch("/api/gods-hand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh-groups" }),
      });
      const data = await res.json();
      setGroups(data.groups ?? []);
      addToast("success", `Found ${data.groups?.length ?? 0} groups`);
    } catch {
      addToast("error", "Failed to refresh groups");
    }
  };

  const sendMessage = async () => {
    setSending(true);
    try {
      if (tab === "whatsapp") {
        if (!waTo || !waMessage) return addToast("error", "Fill in all fields");
        const res = await fetch("/api/gods-hand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send-whatsapp", to: waTo, message: waMessage }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setWaMessage("");
        addToast("success", `Message sent to ${waTo}`);
      }

      if (tab === "group") {
        if (!selectedGroup || !groupMessage) return addToast("error", "Fill in all fields");
        const res = await fetch("/api/gods-hand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send-group", groupId: selectedGroup, message: groupMessage }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setGroupMessage("");
        const gName = groups.find((g) => g.id === selectedGroup)?.name ?? selectedGroup;
        addToast("success", `Message sent to group: ${gName}`);
      }

      if (tab === "broadcast") {
        if (!broadcastRecipients.length || !broadcastMessage)
          return addToast("error", "Add recipients and a message");
        const res = await fetch("/api/gods-hand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "broadcast-whatsapp",
            recipients: broadcastRecipients,
            message: broadcastMessage,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const data = await res.json();
        setBroadcastMessage("");
        setBroadcastRecipients([]);
        addToast("success", `Broadcast: ${data.sent} sent, ${data.failed} failed`);
      }

      if (tab === "email") {
        if (!emailTo || !emailSubject || !emailBody) return addToast("error", "Fill in all fields");
        const res = await fetch("/api/gods-hand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send-email", to: emailTo, subject: emailSubject, text: emailBody }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setEmailBody("");
        addToast("success", `Email sent to ${emailTo}`);
      }
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const addBroadcastRecipient = () => {
    const val = broadcastInput.trim();
    if (val && !broadcastRecipients.includes(val)) {
      setBroadcastRecipients((r) => [...r, val]);
    }
    setBroadcastInput("");
  };

  /* ── Tab definitions ── */
  const tabs: { key: Tab; label: string; icon: React.ReactNode; requiresWA: boolean }[] = [
    { key: "whatsapp", label: "WhatsApp DM", icon: <MessageCircle className="h-4 w-4" />, requiresWA: true },
    { key: "group", label: "Group Message", icon: <Users className="h-4 w-4" />, requiresWA: true },
    { key: "broadcast", label: "Broadcast", icon: <Megaphone className="h-4 w-4" />, requiresWA: true },
    { key: "email", label: "Email", icon: <Mail className="h-4 w-4" />, requiresWA: false },
  ];

  const isConnected = waStatus === "connected";

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-lg bg-black flex items-center justify-center">
          <Image
            src="/image.png"
            alt="God's Hand"
            width={64}
            height={64}
            className="object-contain"
            unoptimized
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
            God&apos;s Hand
          </h1>
          <p className="text-sm text-zinc-500">
            Messaging hub — WhatsApp &amp; Email
          </p>
        </div>
      </div>

      {/* WhatsApp Connection Status */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                isConnected
                  ? "bg-emerald-500"
                  : waStatus === "qr" || waStatus === "connecting"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-zinc-300"
              }`}
            />
            <span className="text-sm font-medium text-zinc-700">
              WhatsApp: {isConnected ? "Connected" : waStatus === "qr" ? "Scan QR Code" : waStatus === "connecting" ? "Connecting…" : "Disconnected"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={refreshGroupsList}
                className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Groups
              </button>
            )}
            {isConnected ? (
              <button
                onClick={disconnectWA}
                className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                <WifiOff className="h-3.5 w-3.5" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectWA}
                disabled={waStatus === "connecting" || waStatus === "qr"}
                className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <Wifi className="h-3.5 w-3.5" />
                Connect WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* QR Code */}
        {qrImage && waStatus === "qr" && (
          <div className="mt-4 flex flex-col items-center gap-3 p-6 rounded-xl bg-zinc-50 border border-zinc-200">
            <QrCode className="h-6 w-6 text-zinc-500" />
            <p className="text-sm text-zinc-600 font-medium">Scan this QR code with WhatsApp</p>
            <img src={qrImage} alt="WhatsApp QR" className="h-64 w-64 rounded-lg" />
            <p className="text-xs text-zinc-400">Open WhatsApp → Settings → Linked Devices → Link a Device</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            disabled={t.requiresWA && !isConnected}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all flex-1 justify-center ${
              tab === t.key
                ? "bg-white text-zinc-800 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm flex-1">
        {/* WhatsApp DM */}
        {tab === "whatsapp" && (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-zinc-700">
              Phone Number
              <input
                type="text"
                placeholder="e.g. 14045551234 (country code, no +)"
                value={waTo}
                onChange={(e) => setWaTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Message
              <textarea
                rows={4}
                placeholder="Type your message…"
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none resize-none"
              />
            </label>
          </div>
        )}

        {/* Group Message */}
        {tab === "group" && (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-zinc-700">
              Select Group
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none bg-white"
              >
                <option value="">Choose a group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            {groups.length === 0 && isConnected && (
              <p className="text-xs text-zinc-400">No groups found. Click &quot;Refresh Groups&quot; above.</p>
            )}
            <label className="text-sm font-medium text-zinc-700">
              Message
              <textarea
                rows={4}
                placeholder="Type your group message…"
                value={groupMessage}
                onChange={(e) => setGroupMessage(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none resize-none"
              />
            </label>
          </div>
        )}

        {/* Broadcast */}
        {tab === "broadcast" && (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-zinc-700">
              Recipients
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Phone number (e.g. 14045551234)"
                  value={broadcastInput}
                  onChange={(e) => setBroadcastInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBroadcastRecipient())}
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                />
                <button
                  onClick={addBroadcastRecipient}
                  className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </label>
            {broadcastRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {broadcastRecipients.map((r) => (
                  <span
                    key={r}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                  >
                    {r}
                    <button onClick={() => setBroadcastRecipients((prev) => prev.filter((x) => x !== r))}>
                      <X className="h-3 w-3 text-zinc-400 hover:text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <label className="text-sm font-medium text-zinc-700">
              Message
              <textarea
                rows={4}
                placeholder="Broadcast message…"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none resize-none"
              />
            </label>
          </div>
        )}

        {/* Email */}
        {tab === "email" && (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-zinc-700">
              To
              <input
                type="email"
                placeholder="recipient@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Subject
              <input
                type="text"
                placeholder="Email subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Body
              <textarea
                rows={6}
                placeholder="Email body…"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none resize-none"
              />
            </label>
          </div>
        )}
      </div>

      {/* Send Button */}
      <button
        onClick={sendMessage}
        disabled={sending || (tab !== "email" && !isConnected)}
        className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {sending ? "Sending…" : "Send Message"}
      </button>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-bottom ${
              t.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
