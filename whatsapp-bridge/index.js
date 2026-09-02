/**
 * WhatsApp Multi-Device Baileys Bridge for WB-Agent.
 * Provides pairing code authentication for non-Meta WhatsApp connections.
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import express from "express";
import http from "http";

const PORT = 3001;
const BOT_PHONE = "918918753100";
const WEBHOOK_URL = "http://localhost:8000/api/v1/webhooks/whatsapp";
const AUTH_DIR = "./auth_info_baileys";

const logger = pino({ level: "silent" });
let sock = null;
let isConnected = false;
let currentPairingCode = null;

const app = express();
app.use(express.json());

// 1. Health & Status endpoint
app.get("/status", (req, res) => {
  res.json({
    connected: isConnected,
    botPhone: BOT_PHONE,
    pairingCode: currentPairingCode,
  });
});

// 2. Outbound message sending endpoint
app.post("/send", async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ error: "Missing 'to' or 'text'" });
  }

  if (!sock || !isConnected) {
    return res.status(503).json({ error: "WhatsApp socket is not connected" });
  }

  try {
    const cleanTo = to.replace(/[^0-9]/g, "");
    const jid = `${cleanTo}@s.whatsapp.net`;
    const result = await sock.sendMessage(jid, { text });
    return res.json({
      success: true,
      messageId: result.key.id,
    });
  } catch (err) {
    console.error("Failed to send WhatsApp message via Baileys:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Connect Baileys Socket
async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    emitOwnEvents: false,
  });

  // Pairing code flow for phone number link
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(BOT_PHONE);
        currentPairingCode = code;
        console.log("\n" + "=".repeat(70));
        console.log(`>>> WHATSAPP PAIRING CODE:  ${code}  <<<`);
        console.log("=".repeat(70));
        console.log(`\nInstructions for +91 8918753100:`);
        console.log("1. Open WhatsApp on your phone (+91 8918753100)");
        console.log("2. Tap Settings (or 3 dots) > Linked Devices");
        console.log("3. Tap 'Link a Device'");
        console.log("4. Tap 'Link with phone number instead' at the bottom");
        console.log(`5. Enter this code: ${code}\n`);
      } catch (err) {
        console.error("Error requesting pairing code:", err);
      }
    }, 4000);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      isConnected = false;
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("[BRIDGE] Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) {
        setTimeout(startSocket, 3000);
      }
    } else if (connection === "open") {
      isConnected = true;
      currentPairingCode = null;
      console.log("\n" + "=".repeat(70));
      console.log(`[+] WHATSAPP CONNECTED SUCCESSFULLY ON BOT NUMBER: +${BOT_PHONE}`);
      console.log("=".repeat(70) + "\n");
    }
  });

  // Listen for incoming messages and forward to FastAPI
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes("@g.us")) continue; // Skip group chats

      const senderPhone = remoteJid.split("@")[0];
      const textBody =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";

      if (!textBody) continue;

      console.log(`[INBOUND] From +${senderPhone}: "${textBody}"`);

      // Forward to FastAPI Webhook
      try {
        const webhookPayload = {
          entry: [
            {
              changes: [
                {
                  value: {
                    messages: [
                      {
                        from: senderPhone,
                        id: msg.key.id || `baileys_${Date.now()}`,
                        timestamp: String(msg.messageTimestamp || Math.floor(Date.now() / 1000)),
                        type: "text",
                        text: { body: textBody },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        };

        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          console.error(`[BRIDGE] Webhook forward returned status: ${response.status}`);
        }
      } catch (err) {
        console.error("[BRIDGE] Failed to forward message to FastAPI:", err);
      }
    }
  });
}

// Start HTTP bridge server and Baileys
app.listen(PORT, () => {
  console.log(`[BRIDGE] WhatsApp HTTP bridge listening on http://localhost:${PORT}`);
  startSocket();
});
