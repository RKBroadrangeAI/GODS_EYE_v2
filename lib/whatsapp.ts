import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";

/* ── Singleton WhatsApp connection ───────────────── */

type WAState = {
  socket: WASocket | null;
  qr: string | null;
  status: "disconnected" | "connecting" | "qr" | "connected";
  groups: { id: string; name: string }[];
};

const state: WAState = {
  socket: null,
  qr: null,
  status: "disconnected",
  groups: [],
};

const AUTH_DIR = path.join(process.cwd(), ".whatsapp-auth");

export function getWAState() {
  return { status: state.status, qr: state.qr, groups: state.groups };
}

export async function connectWhatsApp(): Promise<string | null> {
  if (state.status === "connected" && state.socket) {
    return null; // Already connected
  }
  if (state.status === "connecting") {
    return state.qr; // Already connecting, return current QR
  }

  state.status = "connecting";

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: authState,
    printQRInTerminal: false,
    generateHighQualityLinkPreview: true,
  });

  state.socket = socket;

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      state.qr = qr;
      state.status = "qr";
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        // Clear auth and reset
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
        state.socket = null;
        state.qr = null;
        state.status = "disconnected";
        state.groups = [];
      } else {
        // Reconnect
        state.status = "disconnected";
        state.socket = null;
        await connectWhatsApp();
      }
    }

    if (connection === "open") {
      state.qr = null;
      state.status = "connected";
      // Fetch groups
      try {
        const groupMetadata = await socket.groupFetchAllParticipating();
        state.groups = Object.values(groupMetadata).map((g) => ({
          id: g.id,
          name: g.subject,
        }));
      } catch {
        state.groups = [];
      }
    }
  });

  return state.qr;
}

export async function disconnectWhatsApp() {
  if (state.socket) {
    await state.socket.logout();
    state.socket = null;
  }
  state.qr = null;
  state.status = "disconnected";
  state.groups = [];
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
}

export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<void> {
  if (!state.socket || state.status !== "connected") {
    throw new Error("WhatsApp is not connected");
  }
  // Ensure JID format
  const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
  await state.socket.sendMessage(jid, { text: message });
}

export async function sendWhatsAppGroupMessage(
  groupId: string,
  message: string,
): Promise<void> {
  if (!state.socket || state.status !== "connected") {
    throw new Error("WhatsApp is not connected");
  }
  await state.socket.sendMessage(groupId, { text: message });
}

export async function broadcastWhatsApp(
  recipients: string[],
  message: string,
): Promise<{ sent: number; failed: number }> {
  if (!state.socket || state.status !== "connected") {
    throw new Error("WhatsApp is not connected");
  }
  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    try {
      const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
      await state.socket.sendMessage(jid, { text: message });
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

export async function refreshGroups(): Promise<{ id: string; name: string }[]> {
  if (!state.socket || state.status !== "connected") {
    throw new Error("WhatsApp is not connected");
  }
  const groupMetadata = await state.socket.groupFetchAllParticipating();
  state.groups = Object.values(groupMetadata).map((g) => ({
    id: g.id,
    name: g.subject,
  }));
  return state.groups;
}
