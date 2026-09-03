/**
 * WhatsApp Multi-Device Baileys Bridge for WB-Agent.
 * Provides both QR Code (Terminal & Web UI) and Pairing Code.
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import express from "express";
import QRCode from "qrcode";
import qrcodeTerminal from "qrcode-terminal";

const PORT = 3001;
const BOT_PHONE = "918918753100";
const WEBHOOK_URL = "http://localhost:8000/api/v1/webhooks/whatsapp";
const AUTH_DIR = "./auth_info_baileys";

const logger = pino({ level: "silent" });
let sock = null;
let isConnected = false;
let latestQR = null;
let latestPairingCode = null;

const app = express();
app.use(express.json());

// 1. Status API
app.get("/status", (req, res) => {
  res.json({
    connected: isConnected,
    botPhone: BOT_PHONE,
    hasQR: !!latestQR,
    pairingCode: latestPairingCode,
  });
});

// 2. Web UI for QR Code
app.get("/qr", async (req, res) => {
  if (isConnected) {
    return res.send(`
      <html>
        <body style="font-family:sans-serif; text-align:center; padding:50px; background:#0f172a; color:#22c55e;">
          <h1>✅ WhatsApp is Connected!</h1>
          <p style="color:#f8fafc;">Bot number: +${BOT_PHONE} is live and active.</p>
        </body>
      </html>
    `);
  }

  if (!latestQR) {
    return res.send(`
      <html>
        <head><meta http-equiv="refresh" content="2"></head>
        <body style="font-family:sans-serif; text-align:center; padding:50px; background:#0f172a; color:#f8fafc;">
          <h2>Generating fresh WhatsApp QR code...</h2>
          <p>Please wait 2-3 seconds, page will auto-refresh.</p>
        </body>
      </html>
    `);
  }

  try {
    const qrImage = await QRCode.toDataURL(latestQR);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scan WhatsApp QR - WB-Agent</title>
          <meta http-equiv="refresh" content="18">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1329; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 36px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); text-align: center; max-width: 440px; border: 1px solid #334155; }
            .badge { display: inline-block; background: #22c55e; color: #0f172a; font-weight: 700; padding: 6px 16px; border-radius: 9999px; font-size: 13px; letter-spacing: 0.5px; margin-bottom: 16px; }
            .qr-wrapper { background: #ffffff; padding: 16px; border-radius: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            img { display: block; border-radius: 8px; }
            ol { text-align: left; background: #0f172a; padding: 16px 20px 16px 36px; border-radius: 12px; font-size: 14px; line-height: 1.6; color: #cbd5e1; border: 1px solid #1e293b; margin: 20px 0 16px; }
            .btn { display: block; background: #38bdf8; color: #0f172a; font-weight: 600; text-decoration: none; padding: 12px; border-radius: 10px; margin-top: 12px; }
            .footer { font-size: 12px; color: #64748b; margin-top: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">WHATSAPP MULTI-DEVICE</div>
            <h2 style="margin: 0 0 8px;">Scan to Connect Bot</h2>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">Link WhatsApp number: <strong>+${BOT_PHONE}</strong></p>
            <div class="qr-wrapper">
              <img src="${qrImage}" width="260" height="260" alt="WhatsApp QR Code" />
            </div>
            <ol>
              <li>Open WhatsApp on phone: <strong>+${BOT_PHONE}</strong></li>
              <li>Tap <strong>Settings / 3-dots</strong> &gt; <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a Device</strong></li>
              <li>Point phone camera at this QR code</li>
            </ol>
            <a href="/code" class="btn">Prefer 8-Digit Pairing Code Instead?</a>
            <div class="footer">QR auto-refreshes every 18 seconds</div>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send("Error rendering QR: " + err.message);
  }
});

// 3. Pairing Code endpoint
app.get("/code", async (req, res) => {
  try {
    if (!sock) {
      return res.send("Socket initializing... refresh in 3 seconds.");
    }
    const code = await sock.requestPairingCode(BOT_PHONE);
    latestPairingCode = code;
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pairing Code - WB-Agent</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1329; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 36px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); text-align: center; max-width: 440px; border: 1px solid #334155; }
            .code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #22c55e; background: #0f172a; padding: 16px; border-radius: 12px; margin: 24px 0; border: 1px solid #334155; }
            ol { text-align: left; background: #0f172a; padding: 16px 20px 16px 36px; border-radius: 12px; font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
            .btn { display: inline-block; background: #38bdf8; color: #0f172a; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="margin: 0 0 8px;">Your WhatsApp Pairing Code</h2>
            <p style="color: #94a3b8; font-size: 14px;">For phone: <strong>+${BOT_PHONE}</strong></p>
            <div class="code">${code}</div>
            <ol>
              <li>Open WhatsApp on +${BOT_PHONE}</li>
              <li>Settings &gt; Linked Devices &gt; Link a Device</li>
              <li>Tap <strong>Link with phone number instead</strong></li>
              <li>Enter code: <strong>${code}</strong></li>
            </ol>
            <a href="/qr" class="btn">Back to QR Code Scanner</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    return res.send(`
      <html><body style="font-family:sans-serif; text-align:center; padding:40px; background:#0f172a; color:#f8fafc;">
        <h3>Could not generate pairing code</h3>
        <p style="color:#ef4444;">${err.message}</p>
        <p><a href="/qr" style="color:#38bdf8;">Return to QR Code Scanner</a></p>
      </body></html>
    `);
  }
});

const jidMap = new Map();

// 4. Outbound message sending endpoint
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
    let jid = to;
    if (jidMap.has(cleanTo)) {
      jid = jidMap.get(cleanTo);
    } else if (!jid.includes("@")) {
      jid = `${cleanTo}@s.whatsapp.net`;
    }

    console.log(`[OUTBOUND] Sending to ${jid}: "${text.slice(0, 80)}"`);
    const result = await sock.sendMessage(jid, { text });
    console.log(`[OUTBOUND] Delivered message to ${jid} (Msg ID: ${result.key.id})`);
    return res.json({
      success: true,
      messageId: result.key.id,
    });
  } catch (err) {
    console.error("Failed to send WhatsApp message via Baileys:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Connect Baileys Socket
async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    emitOwnEvents: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = qr;
      console.log("\n" + "=".repeat(60));
      console.log(">>> NEW WHATSAPP QR CODE GENERATED! <<<");
      console.log(">>> OPEN IN BROWSER TO SCAN:  http://localhost:3001/qr  <<<");
      console.log("=".repeat(60) + "\n");
      try {
        qrcodeTerminal.generate(qr, { small: true });
      } catch (e) {}
    }

    if (connection === "close") {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`[BRIDGE] Connection closed (code ${statusCode}). Logged out: ${isLoggedOut}`);
      if (isLoggedOut) {
        console.log("[BRIDGE] Session logged out. Clearing auth cache and generating new QR...");
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch (e) {}
      }
      setTimeout(startSocket, 2000);
    } else if (connection === "open") {
      isConnected = true;
      latestQR = null;
      latestPairingCode = null;
      console.log("\n" + "=".repeat(70));
      console.log(`[+] WHATSAPP CONNECTED SUCCESSFULLY ON BOT NUMBER: +${BOT_PHONE}`);
      console.log("=".repeat(70) + "\n");
    }
  });

  // Forward incoming messages to FastAPI
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes("@g.us")) continue;

      const senderPhone = remoteJid.split("@")[0].replace(/[^0-9]/g, "");
      // CRITICAL SELF-CHAT GUARD: Never forward messages originating from or addressed to the bot's own number!
      if (senderPhone === BOT_PHONE || senderPhone.endsWith(BOT_PHONE) || BOT_PHONE.endsWith(senderPhone)) {
        console.log(`[IGNORE] Suppressed self-message loop from bot phone ${senderPhone}`);
        continue;
      }
      jidMap.set(senderPhone, remoteJid);
      const textBody =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";

      if (!textBody) continue;

      console.log(`[INBOUND] From +${senderPhone}: "${textBody}"`);

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

        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });
      } catch (err) {
        console.error("[BRIDGE] Failed to forward message to FastAPI:", err);
      }
    }
  });
}

// Start HTTP bridge
app.listen(PORT, () => {
  console.log(`[BRIDGE] WhatsApp HTTP bridge listening on http://localhost:${PORT}`);
  console.log(`[BRIDGE] Open http://localhost:${PORT}/qr to scan QR code in your browser!`);
  startSocket();
});
