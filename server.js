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
const FIRESTORE_STATUS_URL = 'https://firestore.googleapis.com/v1/projects/kindevmetaads/databases/(default)/documents/settings/whatsapp_status';

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

// Helper para resolver el número de teléfono real del remitente (desenmascarando LIDs de Meta Ads)
async function resolveRealPhone(sock, msg) {
  const remoteJid = msg.key?.remoteJid || '';
  if (!remoteJid) return { phone: '', display: '' };

  let resolved = '';

  // 1. Si remoteJidAlt o participantAlt contiene el número real (@s.whatsapp.net)
  const alt = msg.key?.remoteJidAlt || msg.key?.participantAlt;
  if (alt && (alt.endsWith('@s.whatsapp.net') || alt.includes('@s.whatsapp.net'))) {
    resolved = alt.split('@')[0].split(':')[0];
  }

  // 2. Si es un LID, consultar Baileys signalRepository.lidMapping
  if (!resolved && remoteJid.endsWith('@lid') && sock?.signalRepository?.lidMapping) {
    try {
      const pn = await sock.signalRepository.lidMapping.getPNForLID(remoteJid);
      if (pn) {
        resolved = pn.split('@')[0].split(':')[0];
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Si aún no está resuelto y es un LID, consultar archivo de mapeo inverso en auth_baileys
  if (!resolved && remoteJid.endsWith('@lid')) {
    const lidUser = remoteJid.split('@')[0].split(':')[0];
    const reverseFile = path.join(AUTH_DIR, `lid-mapping-${lidUser}_reverse.json`);
    
    // Si el archivo aún se está escribiendo, dar una breve pausa de 350ms
    if (!fs.existsSync(reverseFile)) {
      await new Promise((r) => setTimeout(r, 350));
    }

    if (fs.existsSync(reverseFile)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(reverseFile, 'utf-8'));
        if (fileContent) {
          resolved = String(fileContent).replace(/\D/g, '');
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // 4. Si no es LID (mensaje normal de WhatsApp directo)
  if (!resolved && !remoteJid.endsWith('@lid')) {
    resolved = remoteJid.split('@')[0].split(':')[0];
  }

  // 5. Si después de todo aún no se pudo resolver, usar fallback
  if (!resolved) {
    resolved = remoteJid.split('@')[0].split(':')[0];
  }

  // Limpiar número y formatear
  const clean = cleanPhone(resolved);
  let display = clean;
  if (clean.startsWith('593') && clean.length === 12) {
    display = `+593 ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  } else if (clean) {
    display = `+${clean}`;
  }

  return { phone: clean, display };
}


// Estados globales del Gateway de WhatsApp
let qrCodeDataUrl = '';
let connectionStatus = 'initializing'; // 'initializing' | 'qr_ready' | 'connected' | 'reconnecting'
let connectedUser = '';
let registeredNumbers = new Set();

// Sincronizar estado en vivo con Cloud Firestore
async function updateFirestoreStatus(status, user = '', note = '') {
  try {
    const payload = {
      fields: {
        status: { stringValue: status },
        user: { stringValue: user || '' },
        note: { stringValue: note || '' },
        isListening: { booleanValue: status === 'connected' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    };
    await fetch(FIRESTORE_STATUS_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Silencioso
  }
}

// Heartbeat periódico cada 20s para informar que el servidor está vivo
setInterval(() => {
  if (connectionStatus === 'connected') {
    updateFirestoreStatus('connected', connectedUser, 'Escuchador activo en segundo plano');
  }
}, 20000);

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
        updateFirestoreStatus('qr_ready', '', 'Esperando escaneo de código QR');
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
      updateFirestoreStatus('reconnecting', '', 'Reconectando conexión');
      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      } else {
        connectionStatus = 'initializing';
        updateFirestoreStatus('disconnected', '', 'Sesión cerrada');
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
      updateFirestoreStatus('connected', connectedUser, 'Escuchador activo en segundo plano');
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

      // Resolver el número telefónico real (desenmascara LIDs de anuncios de Meta Ads)
      const { phone, display: displayPhone } = await resolveRealPhone(sock, msg);
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
        'deseo hablar con un asesor', 'hablar con un asesor', 'asesor', 'asesoría', 'asesoria',
        'anuncio', 'publicidad', 'web', 'página', 'pagina', 'paginas', 'páginas',
        'cotizar', 'cotización', 'cotizacion', 'landing', 'saas', 'software',
        '120', 'precio', 'costo', 'planes', 'interesa', 'información', 'informacion',
        'paquete', 'kindev'
      ];

      const lowerText = text.toLowerCase().trim();
      const isFromAd = AD_KEYWORDS.some((kw) => lowerText.includes(kw));

      if (!isFromAd) {
        console.log(`ℹ️ [WhatsApp Ignorado] Mensaje de ${pushName} (${displayPhone}) no contiene términos del anuncio: "${text}"`);
        continue;
      }

      console.log(`🎯 [Lead de Publicidad Detectado!] De: ${pushName} | Teléfono Real: ${displayPhone} (JID: ${remoteJid}) - "${text}"`);
      registeredNumbers.add(phone);

      // Guardar directamente en Cloud Firestore
      try {
        const firestorePayload = {
          fields: {
            name: { stringValue: pushName },
            phone: { stringValue: phone },
            displayPhone: { stringValue: displayPhone },
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
    isListening: connectionStatus === 'connected',
    user: connectedUser,
    hasQr: Boolean(qrCodeDataUrl),
    updatedAt: new Date().toISOString()
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
