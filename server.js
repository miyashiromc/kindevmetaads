import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_DIR = path.join(__dirname, 'auth_baileys');
const FIRESTORE_REST_URL = 'https://firestore.googleapis.com/v1/projects/kindevmetaads/databases/(default)/documents/leads';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Helper para limpiar teléfono celular ecuatoriano o internacional
function cleanPhone(raw) {
  if (!raw) return '';
  let phone = String(raw).replace(/\D/g, '');
  if (phone.startsWith('09') && phone.length === 10) {
    phone = '593' + phone.slice(1);
  } else if (phone.length === 9 && phone.startsWith('9')) {
    phone = '593' + phone;
  }
  return phone;
}

// Estados globales del Gateway de WhatsApp
let qrCodeDataUrl = '';
let connectionStatus = 'initializing'; // 'initializing' | 'qr_ready' | 'connected' | 'reconnecting'
let connectedUser = '';
let registeredNumbers = new Set();

// Iniciar Baileys WhatsApp Socket
async function startWhatsAppBot() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Kindev Meta Ads', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
        connectionStatus = 'qr_ready';
        console.log('⚡ [WhatsApp] Nuevo código QR generado. Listo para escanear.');
      } catch (err) {
        console.error('Error generando QR:', err);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`⚠️ [WhatsApp] Conexión cerrada. Reconectando: ${shouldReconnect}`);
      connectionStatus = 'reconnecting';
      qrCodeDataUrl = '';
      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      } else {
        connectionStatus = 'initializing';
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        setTimeout(startWhatsAppBot, 2000);
      }
    } else if (connection === 'open') {
      console.log('✅ [WhatsApp] Conexión establecida con éxito!');
      connectionStatus = 'connected';
      qrCodeDataUrl = '';
      const jid = sock.user?.id || '';
      connectedUser = jid.split(':')[0] || 'WhatsApp Business';
      console.log(`📱 [WhatsApp] Conectado como: ${connectedUser}`);
    }
  });

  // Escuchar mensajes entrantes para captura automática
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Ignorar mensajes enviados por mí o grupos de WhatsApp
      if (msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid || '';
      if (remoteJid.endsWith('@g.us') || remoteJid.includes('status')) continue;

      const rawNumber = remoteJid.replace('@s.whatsapp.net', '');
      const phone = cleanPhone(rawNumber);
      if (!phone) continue;

      // Evitar duplicar en la misma sesión si ya fue procesado
      if (registeredNumbers.has(phone)) continue;

      const pushName = msg.pushName || 'Cliente WhatsApp';
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      // 🔍 FILTRO ESTRICTO: Solo capturar si el mensaje contiene palabras del anuncio
      const AD_KEYWORDS = [
        'anuncio', 'publicidad', 'web', 'página', 'pagina', 'paginas', 'páginas',
        'cotizar', 'cotización', 'cotizacion', 'landing', 'saas', 'software',
        '120', 'precio', 'costo', 'planes', 'interesa', 'información', 'informacion',
        'paquete', 'kindev'
      ];

      const lowerText = text.toLowerCase().trim();
      const isFromAd = AD_KEYWORDS.some((kw) => lowerText.includes(kw));

      if (!isFromAd) {
        console.log(`ℹ️ [WhatsApp Ignorado] Mensaje de ${pushName} (${phone}) no contiene términos del anuncio: "${text}"`);
        continue;
      }

      console.log(`🎯 [Lead de Publicidad Detectado!] De: ${pushName} (${phone}) - "${text}"`);
      registeredNumbers.add(phone);

      // Guardar directamente en Cloud Firestore
      try {
        const firestorePayload = {
          fields: {
            name: { stringValue: pushName },
            phone: { stringValue: phone },
            displayPhone: { stringValue: rawNumber },
            service: { stringValue: 'Contacto Inicial WhatsApp' },
            notes: { stringValue: `Mensaje: "${text}"` },
            status: { stringValue: 'prospecto' },
            amount: { doubleValue: 0 },
            createdAt: { stringValue: new Date().toISOString() },
            source: { stringValue: 'whatsapp_auto' }
          }
        };

        const response = await fetch(FIRESTORE_REST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firestorePayload)
        });

        if (response.ok) {
          console.log(`🎉 [Auto-Captura] Lead ${pushName} guardado en Firestore con éxito!`);
        } else {
          console.error('Error guardando lead en Firestore:', await response.text());
        }
      } catch (dbErr) {
        console.error('Error insertando en Firestore:', dbErr);
      }
    }
  });
}

// Iniciar bot de WhatsApp en segundo plano
startWhatsAppBot().catch(console.error);

// 1. Endpoint para verificar el estado de la conexión
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    status: connectionStatus,
    user: connectedUser,
    hasQr: Boolean(qrCodeDataUrl)
  });
});

// 2. Página visual para escanear el Código QR
app.get('/qr', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vincular WhatsApp Business — Kindev</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col items-center justify-center p-4">
  
  <div class="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-7 text-center space-y-5">
    
    <div class="flex items-center justify-center gap-2 mb-1">
      <img src="/logo.png" alt="Kindev Logo" class="h-8 object-contain" onerror="this.style.display='none'">
      <span class="font-extrabold text-lg text-slate-900">Kindev Meta Ads</span>
    </div>

    <div>
      <h2 class="text-xl font-black text-slate-900">Vincular WhatsApp Business</h2>
      <p class="text-xs text-slate-500 mt-1">Conecta tu teléfono para auto-capturar los clientes que te escriben.</p>
    </div>

    <div id="loadingBox" class="${connectionStatus === 'initializing' ? 'block' : 'hidden'} py-8 space-y-3">
      <div class="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-500 font-semibold">Generando código QR de conexión...</p>
    </div>

    <div id="qrBox" class="${connectionStatus === 'qr_ready' ? 'block' : 'hidden'} space-y-4">
      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
        <img id="qrImg" src="${qrCodeDataUrl}" alt="Código QR" class="w-64 h-64 mx-auto rounded-xl">
      </div>

      <div class="text-left bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 space-y-1.5 font-medium">
        <p class="font-bold">📱 Pasos para escanear:</p>
        <p>1. Abre <strong>WhatsApp Business</strong> en tu celular.</p>
        <p>2. Toca los tres puntitos (o <em>Ajustes</em>) ➔ <strong>Dispositivos vinculados</strong>.</p>
        <p>3. Toca <strong>Vincular un dispositivo</strong> y apunta tu cámara a este código QR.</p>
      </div>
    </div>

    <div id="connectedBox" class="${connectionStatus === 'connected' ? 'block' : 'hidden'} py-6 space-y-3">
      <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
        ✓
      </div>
      <h3 class="text-base font-bold text-slate-900">¡WhatsApp Conectado con Éxito!</h3>
      <p class="text-xs text-slate-500">
        Conectado como: <strong class="text-slate-800" id="userName">${connectedUser}</strong>
      </p>
      <div class="pt-2">
        <a href="https://kindevmetaads.web.app" target="_blank" class="inline-block py-2.5 px-6 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-md">
          Ir al Panel de Clientes ➔
        </a>
      </div>
    </div>

  </div>

  <script>
    async function checkStatus() {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        
        if (data.status === 'connected') {
          document.getElementById('loadingBox').classList.add('hidden');
          document.getElementById('qrBox').classList.add('hidden');
          document.getElementById('connectedBox').classList.remove('hidden');
          document.getElementById('userName').innerText = data.user || 'WhatsApp Business';
        } else if (data.status === 'qr_ready' && data.hasQr) {
          document.getElementById('loadingBox').classList.add('hidden');
          document.getElementById('connectedBox').classList.add('hidden');
          document.getElementById('qrBox').classList.remove('hidden');
        }
      } catch (e) {}
    }
    setInterval(checkStatus, 2000);
  </script>
</body>
</html>
  `);
});

// 3. Webhook HTTP Universal de respaldo
app.post('/api/webhook/whatsapp', async (req, res) => {
  const body = req.body;
  const rawPhone = body.phone || body.from || '';
  const senderName = body.name || 'Cliente WhatsApp';
  const messageText = body.message || body.text || '';
  const phone = cleanPhone(rawPhone);

  if (!phone) return res.status(400).json({ error: 'Teléfono inválido' });

  try {
    const firestorePayload = {
      fields: {
        name: { stringValue: senderName },
        phone: { stringValue: phone },
        displayPhone: { stringValue: rawPhone },
        service: { stringValue: 'Contacto Inicial WhatsApp' },
        notes: { stringValue: messageText ? `Mensaje: "${messageText}"` : 'Auto-registrado' },
        status: { stringValue: 'prospecto' },
        amount: { doubleValue: 0 },
        createdAt: { stringValue: new Date().toISOString() },
        source: { stringValue: 'whatsapp_auto' }
      }
    };

    const response = await fetch(FIRESTORE_REST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestorePayload)
    });

    return res.status(200).json({ status: 'success', firestoreOk: response.ok });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Servir frontend SPA para cualquier otra ruta
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 [Kindev CAPI & WhatsApp Server] Activo en puerto ${PORT}`);
  console.log(`👉 Abre en tu navegador para escanear el QR: http://localhost:${PORT}/qr`);
});
