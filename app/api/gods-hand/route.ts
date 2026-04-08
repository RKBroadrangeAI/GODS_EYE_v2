import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const ALLOWED_ROLES = ["admin", "test_user"];

/* Lazy-load heavy modules to avoid Turbopack tracing Baileys at build time */
async function getWhatsApp() {
  return import("@/lib/whatsapp");
}
async function getQRCode() {
  const mod = await import("qrcode");
  return mod.default ?? mod;
}
async function getEmailModule() {
  return import("@/lib/email");
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return null;
  }
  return session;
}

/* ── GET: status / qr / groups ───────────────────── */
export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "status") {
    const { getWAState } = await getWhatsApp();
    return NextResponse.json(getWAState());
  }

  if (action === "qr") {
    const { getWAState } = await getWhatsApp();
    const QRCode = await getQRCode();
    const state = getWAState();
    if (!state.qr) return NextResponse.json({ qr: null, status: state.status });
    const qrDataUrl = await QRCode.toDataURL(state.qr);
    return NextResponse.json({ qr: qrDataUrl, status: state.status });
  }

  if (action === "groups") {
    const { getWAState } = await getWhatsApp();
    const state = getWAState();
    return NextResponse.json({ groups: state.groups, status: state.status });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/* ── POST: connect / disconnect / send / broadcast ── */
export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  try {
    /* ── WhatsApp connect ── */
    if (action === "connect") {
      const { connectWhatsApp, getWAState } = await getWhatsApp();
      const QRCode = await getQRCode();
      await connectWhatsApp();
      const state = getWAState();
      let qrDataUrl = null;
      if (state.qr) {
        qrDataUrl = await QRCode.toDataURL(state.qr);
      }
      return NextResponse.json({ status: state.status, qr: qrDataUrl });
    }

    /* ── WhatsApp disconnect ── */
    if (action === "disconnect") {
      const { disconnectWhatsApp } = await getWhatsApp();
      await disconnectWhatsApp();
      return NextResponse.json({ status: "disconnected" });
    }

    /* ── WhatsApp refresh groups ── */
    if (action === "refresh-groups") {
      const { refreshGroups } = await getWhatsApp();
      const groups = await refreshGroups();
      return NextResponse.json({ groups });
    }

    /* ── Send WhatsApp message ── */
    if (action === "send-whatsapp") {
      const { to, message } = body;
      if (!to || !message) {
        return NextResponse.json({ error: "Missing 'to' or 'message'" }, { status: 400 });
      }
      const { sendWhatsAppMessage } = await getWhatsApp();
      await sendWhatsAppMessage(to, message);
      return NextResponse.json({ success: true });
    }

    /* ── Send WhatsApp group message ── */
    if (action === "send-group") {
      const { groupId, message } = body;
      if (!groupId || !message) {
        return NextResponse.json({ error: "Missing 'groupId' or 'message'" }, { status: 400 });
      }
      const { sendWhatsAppGroupMessage } = await getWhatsApp();
      await sendWhatsAppGroupMessage(groupId, message);
      return NextResponse.json({ success: true });
    }

    /* ── Broadcast WhatsApp ── */
    if (action === "broadcast-whatsapp") {
      const { recipients, message } = body;
      if (!recipients?.length || !message) {
        return NextResponse.json({ error: "Missing 'recipients' or 'message'" }, { status: 400 });
      }
      const { broadcastWhatsApp } = await getWhatsApp();
      const result = await broadcastWhatsApp(recipients, message);
      return NextResponse.json(result);
    }

    /* ── Send Email ── */
    if (action === "send-email") {
      const { to, subject, text, html } = body;
      if (!to || !subject || !text) {
        return NextResponse.json({ error: "Missing 'to', 'subject', or 'text'" }, { status: 400 });
      }
      const { sendEmail } = await getEmailModule();
      await sendEmail({ to, subject, text, html });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
