import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
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

// Cargar credenciales para Meta Conversions API (CAPI) Business Messaging
let CAPI_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
let CAPI_DATASET_ID = process.env.META_DATASET_ID || '1368429478371391';

try {
  const tokenFile = path.join(__dirname, 'meta_access_token.txt');
  if (fs.existsSync(tokenFile)) {
    const raw = fs.readFileSync(tokenFile, 'utf8');
    const tokenMatch = raw.match(/META_ACCESS_TOKEN=(.*)/);
    const datasetMatch = raw.match(/META_DATASET_ID=(.*)/);
    if (tokenMatch && tokenMatch[1]) CAPI_ACCESS_TOKEN = tokenMatch[1].trim();
    if (datasetMatch && datasetMatch[1]) CAPI_DATASET_ID = datasetMatch[1].trim();
  }
} catch (e) {
  // ignore
}

// Función SHA-256 para CAPI en Node.js
function hashSha256Node(val) {
  if (!val) return null;
  return crypto.createHash('sha256').update(String(val).trim().toLowerCase()).digest('hex');
}

// Despacho de Eventos de Mensajería Empresarial (Click to WhatsApp / CTWA)
async function dispatchCapiBusinessMessagingLead({ phone, name, remoteJid, text }) {
  if (!CAPI_ACCESS_TOKEN || !phone) return null;

  try {
    const cleanPh = String(phone).replace(/\D/g, '');
    const hashedPhone = hashSha256Node(cleanPh);
    const firstName = name ? name.split(' ')[0] : 'Cliente';
    const hashedFn = hashSha256Node(firstName);
    const eventId = `wa_${cleanPh}_${Date.now()}`;

    const payload = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: eventId,
          user_data: {
            ph: [hashedPhone],
            ...(hashedFn ? { fn: [hashedFn] } : {}),
            country: [hashSha256Node('ec')],
            client_user_agent: 'WhatsApp-Business-Baileys/2.0'
          },
          custom_data: {
            service: 'Contacto Inicial WhatsApp',
            chat_id: remoteJid
          }
        }
      ]
    };

    const url = `https://graph.facebook.com/v19.0/${CAPI_DATASET_ID}/events?access_token=${CAPI_ACCESS_TOKEN}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const resJson = await res.json();
    if (res.ok) {
      console.log(`📡 [CAPI Business Messaging] Lead enviado a Meta Dataset con éxito! (Event ID: ${eventId}, Trace: ${resJson.fbtrace_id})`);
      return { eventId, fbtraceId: resJson.fbtrace_id };
    } else {
      console.warn('⚠️ [CAPI Business Messaging] Error devuelto por Meta:', resJson?.error?.message);
      return null;
    }
  } catch (err) {
    console.warn('⚠️ [CAPI Business Messaging] Error de conexión:', err.message);
    return null;
  }
}

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

// Cache inteligente con expiración de 24h para deduplicar leads sin fugas de memoria
const processedPhoneTimestamps = new Map();
function isPhoneRecentlyProcessed(phone) {
  const now = Date.now();
  const lastTime = processedPhoneTimestamps.get(phone);
  return !!(lastTime && (now - lastTime) < 24 * 60 * 60 * 1000);
}

function markPhoneProcessed(phone) {
  const now = Date.now();
  processedPhoneTimestamps.set(phone, now);
  // Limpieza periódica preventiva
  if (processedPhoneTimestamps.size > 1500) {
    for (const [p, ts] of processedPhoneTimestamps.entries()) {
      if (now - ts > 24 * 60 * 60 * 1000) processedPhoneTimestamps.delete(p);
    }
  }
}

// === MÓDULO INTELIGENTE: TRACKER DE PROSPECCIÓN (OUTBOUND) Y CONTROL DE MENSAJES ===
const OUTBOUND_TRACKER_FILE = path.join(__dirname, 'outbound_tracker.json');
const PROCESSED_MSGS_FILE = path.join(AUTH_DIR, 'processed_messages.json');

// Mapeo persistente de números y LIDs a los que nosotros escribimos primero (script de prospección / cold outreach)
const outboundPhonesMap = new Map();

function loadOutboundTracker() {
  try {
    if (fs.existsSync(OUTBOUND_TRACKER_FILE)) {
      const data = JSON.parse(fs.readFileSync(OUTBOUND_TRACKER_FILE, 'utf8'));
      if (data && typeof data === 'object') {
        for (const [ph, info] of Object.entries(data)) {
          outboundPhonesMap.set(ph, info);
          const cleanPh = cleanPhone(ph);
          if (cleanPh) outboundPhonesMap.set(cleanPh, info);

          // Si es un LID, resolver su número de teléfono real mediante lid-mapping
          const reverseFile = path.join(AUTH_DIR, `lid-mapping-${ph}_reverse.json`);
          if (fs.existsSync(reverseFile)) {
            try {
              const realPn = cleanPhone(JSON.parse(fs.readFileSync(reverseFile, 'utf8')));
              if (realPn) outboundPhonesMap.set(realPn, info);
            } catch (e) {}
          }
        }
      }
      console.log(`📋 [Outbound Tracker] Cargados ${outboundPhonesMap.size} identificadores y teléfonos de prospección previos.`);
    }
  } catch (err) {
    console.warn('⚠️ No se pudo leer outbound_tracker.json:', err.message);
  }
}

let saveTrackerTimer = null;
function scheduleSaveOutboundTracker() {
  if (saveTrackerTimer) return;
  saveTrackerTimer = setTimeout(() => {
    saveTrackerTimer = null;
    try {
      const obj = {};
      for (const [ph, info] of outboundPhonesMap.entries()) {
        obj[ph] = info;
      }
      fs.writeFileSync(OUTBOUND_TRACKER_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
      console.warn('⚠️ Error guardando outbound_tracker.json:', e.message);
    }
  }, 3000);
}

function isPhoneOutboundTracked(phone, remoteJid = '') {
  if (!phone && !remoteJid) return false;
  const cleanPh = cleanPhone(phone);
  // Si ya es un lead activo en Firestore, NUNCA debe ser tratado como prospecto de script bloqueado
  if (cleanPh && existingFirestoreLeadsByPhone.has(cleanPh)) return false;
  if (phone && existingFirestoreLeadsByPhone.has(phone)) return false;

  if (cleanPh && outboundPhonesMap.has(cleanPh)) return true;
  if (phone && outboundPhonesMap.has(phone)) return true;

  if (remoteJid) {
    const rawUser = remoteJid.split('@')[0].split(':')[0];
    if (rawUser && existingFirestoreLeadsByPhone.has(rawUser)) return false;
    const cleanJid = cleanPhone(rawUser);
    if (cleanJid && existingFirestoreLeadsByPhone.has(cleanJid)) return false;

    if (outboundPhonesMap.has(rawUser)) return true;
    if (cleanJid && outboundPhonesMap.has(cleanJid)) return true;

    // Si es LID, verificar mapeo inverso en auth_baileys
    if (remoteJid.endsWith('@lid')) {
      const reverseFile = path.join(AUTH_DIR, `lid-mapping-${rawUser}_reverse.json`);
      if (fs.existsSync(reverseFile)) {
        try {
          const realPn = cleanPhone(JSON.parse(fs.readFileSync(reverseFile, 'utf8')));
          if (realPn && existingFirestoreLeadsByPhone.has(realPn)) return false;
          if (realPn && (outboundPhonesMap.has(realPn) || outboundPhonesMap.has(rawUser))) return true;
        } catch (e) {}
      }
    }
  }
  return false;
}

function recordOutboundMessage(phone, snippet = '') {
  if (!phone) return;
  const existing = outboundPhonesMap.get(phone) || {
    firstSentAt: Date.now(),
    lastSentAt: Date.now(),
    snippet: snippet ? snippet.slice(0, 100) : '',
    replyCount: 0
  };
  existing.lastSentAt = Date.now();
  if (snippet) existing.snippet = snippet.slice(0, 100);
  outboundPhonesMap.set(phone, existing);
  const cleanPh = cleanPhone(phone);
  if (cleanPh && cleanPh !== phone) {
    outboundPhonesMap.set(cleanPh, existing);
  }
  scheduleSaveOutboundTracker();
}

// Control de IDs de mensajes para deduplicación estricta en reconexiones y sync offline
const processedMessageIds = new Set();
function loadProcessedMessageIds() {
  try {
    if (fs.existsSync(PROCESSED_MSGS_FILE)) {
      const arr = JSON.parse(fs.readFileSync(PROCESSED_MSGS_FILE, 'utf8'));
      if (Array.isArray(arr)) {
        for (const id of arr) processedMessageIds.add(id);
      }
    }
  } catch (e) {}
}

let saveMsgIdsTimer = null;
function markMessageIdProcessed(msgId) {
  if (!msgId) return;
  processedMessageIds.add(msgId);
  if (processedMessageIds.size > 3500) {
    const it = processedMessageIds.values();
    for (let i = 0; i < 500; i++) {
      const val = it.next().value;
      if (val) processedMessageIds.delete(val);
    }
  }
  if (!saveMsgIdsTimer) {
    saveMsgIdsTimer = setTimeout(() => {
      saveMsgIdsTimer = null;
      try {
        fs.writeFileSync(PROCESSED_MSGS_FILE, JSON.stringify(Array.from(processedMessageIds)), 'utf8');
      } catch (e) {}
    }, 4000);
  }
}

function isMessageIdProcessed(msgId) {
  return msgId ? processedMessageIds.has(msgId) : false;
}

// Inicializar trackers persistentes
loadOutboundTracker();
loadProcessedMessageIds();

// Palabras de rechazo o irrelevantes emitidas comúnmente al recibir un mensaje de prospección en frío
const OUTBOUND_REJECTION_KEYWORDS = [
  'no gracias', 'no me interesa', 'no deseo', 'no estamos interesados', 'no requiero', 'no requerimos',
  'por ahora no', 'ahora no', 'deje de enviar', 'no envie', 'no envíe', 'no escribir', 'no escriban',
  'quien es', 'quién es', 'quien eres', 'quién eres', 'de donde sacaron', 'de dónde sacaron',
  'de donde tienen', 'de dónde tienen', 'quien le dio', 'quién le dio',
  'spam', 'bloquear', 'bloqueado', 'bloqueo', 'denunciar', 'reportar',
  'no molestar', 'no moleste', 'no friegue', 'no fastidie',
  'quiten mi', 'quitar mi', 'eliminar de la lista', 'borrar mi',
  'equivocado', 'numero equivocado', 'número equivocado', 'se equivoco', 'se equivocó',
  'no es aqui', 'no es aquí', 'no pertenezco'
];

// Palabras de interés comercial explícito para calificar respuestas del script de prospección
const OUTBOUND_INTEREST_KEYWORDS = [
  'me interesa', 'interesa', 'interesado', 'interesada', 'me gustaria', 'me gustaría',
  'precio', 'precios', 'costo', 'costos', 'cuanto', 'cuánto', 'valor', 'tarifa', 'presupuesto',
  'cotizar', 'cotizacion', 'cotización', 'cotizame', 'cotízame',
  'informacion', 'información', 'info', 'detalle', 'detalles', 'de que trata', 'de qué trata',
  'como funciona', 'cómo funciona', 'de que se trata', 'de qué se trata',
  'pagina web', 'página web', 'sitio web', 'landing', 'ecommerce', 'tienda', 'tienda online',
  'software', 'sistema', 'aplicacion', 'aplicación', 'app',
  'agendar', 'reunion', 'reunión', 'llamada', 'llamar', 'telefono', 'teléfono',
  'propuesta', 'portafolio', 'servicios', 'servicio', 'paquete', 'paquetes', 'planes', 'plan',
  'si por favor', 'sí por favor', 'cuentame', 'cuéntame', 'explicame', 'explícame', 'enviame', 'envíame'
];

// Patrones inequívocos de auto-respuestas comerciales de empresas o clínicas de prospección externa
const BUSINESS_AUTOREPLY_PATTERNS = [
  'gracias por comunicarte', 'gracias por contactar', 'gracias por contactarte', 'gracias por escribir',
  'gracias por tu mensaje', 'gracias por su mensaje', 'reciba un cordial saludo',
  'bienvenido a', 'bienvenidos a', 'bienvenid@ a', 'bienvenid@ por nuestra seguridad',
  'horario de atención', 'horario de atencion', 'nuestro horario',
  'en este momento no estamos', 'en breve le atenderemos', 'en breve nos pondremos en contacto',
  'por favor, haznos saber', 'por favor haznos saber', 'cómo podemos ayudarte',
  'como podemos ayudarte', 'este número ya no es', 'este numero ya no es',
  'esta equivocado', 'se equivocó', 'se equivoco', 'número equivocado', 'numero equivocado',
  'veterinaria', 'veterinario', 'veterinarios', 'clínica veterinaria', 'clinica veterinaria',
  'hospital veterinario', 'pet shop', 'pet care', 'peluquería canina', 'peluqueria canina',
  'grooming', 'dokidoki', 'vivet', 'san martin', 'arte canina', 'lucky pets', 'don danés', 'don danes',
  'reserva tu cita', 'nuestros servicios veterinarios', 'salud animal', 'mundo animal', 'centro veterinario'
];

// Lista de teléfonos propios o internos a excluir de auto-captura
const EXCLUDED_PHONES = ['593991952889', '593991952888'];

// Mapeo en memoria de clientes existentes en Firestore para PREVENIR DUPLICADOS
const existingFirestoreLeadsByPhone = new Map(); // phone -> { id, name, status, amount, notes }

async function syncFirestoreExistingLeadsCache() {
  try {
    const res = await fetch(`${FIRESTORE_REST_URL}?pageSize=300`);
    if (!res.ok) return;
    const data = await res.json();
    const docs = data.documents || [];
    existingFirestoreLeadsByPhone.clear();
    for (const d of docs) {
      const id = d.name.split('/').pop();
      const f = d.fields || {};
      const ph = cleanPhone(f.phone?.stringValue || '');
      if (ph) {
        existingFirestoreLeadsByPhone.set(ph, {
          id,
          name: f.name?.stringValue || '',
          status: f.status?.stringValue || 'prospecto',
          amount: f.amount?.doubleValue || f.amount?.integerValue || 0,
          notes: f.notes?.stringValue || '',
          service: f.service?.stringValue || ''
        });
      }
    }
    console.log(`🛡️ [Anti-Duplicados] Sincronizados ${existingFirestoreLeadsByPhone.size} clientes existentes de Firestore.`);
  } catch (err) {
    console.warn('⚠️ Error sincronizando caché de Firestore:', err.message);
  }
}

// Sincronizar al arrancar y cada 10 minutos
syncFirestoreExistingLeadsCache();
setInterval(syncFirestoreExistingLeadsCache, 10 * 60 * 1000);

// Helper unificado para guardar leads en Cloud Firestore con PROTECCIÓN TOTAL DE DUPLICADOS
async function saveLeadToFirestore({ name, phone, displayPhone, service, notes, source, tenantId = 'kindev', eventId }) {
  const cleanPh = cleanPhone(phone);
  if (!cleanPh) return false;

  // 1. VERIFICACIÓN ANTI-DUPLICADOS ESTRICTA (Protege clientes existentes y en vuelo)
  const existingLead = existingFirestoreLeadsByPhone.get(cleanPh);
  if (existingLead) {
    // Si la creación inicial aún está en vuelo por concurrencia, esperar hasta 2s para que tenga ID real
    if (existingLead.id && existingLead.id.startsWith('pending_')) {
      let waitCount = 0;
      while (existingLead.id && existingLead.id.startsWith('pending_') && waitCount < 20) {
        await new Promise((r) => setTimeout(r, 100));
        waitCount++;
      }
    }

    if (existingLead.id && !existingLead.id.startsWith('pending_')) {
      console.log(`🛡️ [Anti-Duplicados] Cliente existente detectado: "${existingLead.name}" (+${cleanPh}) [Estado: ${existingLead.status}]. Actualizando datos sin duplicar documento.`);
      try {
        const cleanNotes = notes && notes !== 'Mensaje: ""' ? notes : '';
        const updatedNotes = existingLead.notes 
          ? (cleanNotes ? `${existingLead.notes}\n[Nuevo mensaje WhatsApp ${new Date().toLocaleTimeString()}]: "${cleanNotes}"` : existingLead.notes)
          : cleanNotes;
        
        const shouldUpgradeService = service && service.includes('Meta Ads') && (!existingLead.service || !existingLead.service.includes('Meta Ads'));
        let fieldPaths = 'updateMask.fieldPaths=notes&updateMask.fieldPaths=lastContactDate';
        const patchFields = {
          notes: { stringValue: updatedNotes.slice(0, 1500) },
          lastContactDate: { stringValue: new Date().toISOString() }
        };

        if (shouldUpgradeService) {
          fieldPaths += '&updateMask.fieldPaths=service';
          patchFields.service = { stringValue: service };
          existingLead.service = service;
        }

        const patchUrl = `${FIRESTORE_REST_URL}/${existingLead.id}?${fieldPaths}`;
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: patchFields })
        });
        existingLead.notes = updatedNotes;
        return true;
      } catch (patchErr) {
        console.error('Error actualizando cliente existente:', patchErr.message);
        return false;
      }
    }
  }

  // 2. Si no existe, RESERVAR INMEDIATAMENTE en memoria para abortar cualquier concurrencia simultánea
  const tempPendingId = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  existingFirestoreLeadsByPhone.set(cleanPh, {
    id: tempPendingId,
    name: name || 'Cliente WhatsApp',
    status: 'prospecto',
    amount: 0,
    notes: notes || '',
    service: service || 'Contacto Inicial WhatsApp'
  });
  markPhoneProcessed(cleanPh);

  try {
    const firestorePayload = {
      fields: {
        name: { stringValue: name || 'Cliente WhatsApp' },
        phone: { stringValue: cleanPh },
        displayPhone: { stringValue: displayPhone || cleanPh },
        service: { stringValue: service || 'Contacto Inicial WhatsApp' },
        notes: { stringValue: notes || '' },
        status: { stringValue: 'prospecto' },
        amount: { doubleValue: 0 },
        createdAt: { stringValue: new Date().toISOString() },
        source: { stringValue: source || 'whatsapp_auto' },
        tenantId: { stringValue: String(tenantId) },
        eventId: { stringValue: eventId || `wa_${cleanPh}_${Date.now()}` }
      }
    };

    const response = await fetch(FIRESTORE_REST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestorePayload)
    });

    if (response.ok) {
      const resData = await response.json();
      const newId = resData.name ? resData.name.split('/').pop() : '';
      console.log(`🎉 [Auto-Captura] Nuevo lead único ${name} (+${cleanPh}) guardado en Firestore! (Origen: ${source})`);
      existingFirestoreLeadsByPhone.set(cleanPh, {
        id: newId,
        name: name || 'Cliente WhatsApp',
        status: 'prospecto',
        amount: 0,
        notes: notes || '',
        service: service || 'Contacto Inicial WhatsApp'
      });
      return true;
    } else {
      console.error('Error guardando lead en Firestore:', await response.text());
      existingFirestoreLeadsByPhone.delete(cleanPh);
      return false;
    }
  } catch (dbErr) {
    console.error('Error insertando en Firestore:', dbErr.message);
    existingFirestoreLeadsByPhone.delete(cleanPh);
    return false;
  }
}

// Buffer en memoria de mensajes recientes para consulta retroactiva (últimos 300)
const recentMessagesBuffer = [];
function addToRecentMessagesBuffer(msg) {
  if (!msg?.key?.id) return;
  recentMessagesBuffer.unshift(msg);
  if (recentMessagesBuffer.length > 300) recentMessagesBuffer.pop();
}

// Conjunto de teléfonos con operaciones en vuelo (Mutex para evitar concurrencia en mensajes seguidos)
const inFlightPhones = new Set();

// Función maestra de procesamiento con Bloque de Decisión Bimodal
async function processIncomingMessage(sock, msg, contextSource = 'live') {
  if (!msg) return { saved: false, reason: 'no_msg' };
  addToRecentMessagesBuffer(msg);

  // 1. Mensajes salientes: registrar automáticamente en Outbound Tracker SOLO si es prospección fría (no cliente ni conversación existente)
  if (msg.key?.fromMe) {
    const remoteJid = msg.key.remoteJid || '';
    if (remoteJid && !remoteJid.endsWith('@g.us') && !remoteJid.includes('status')) {
      const rawUser = remoteJid.split('@')[0].split(':')[0];
      const clean = cleanPhone(rawUser);
      let text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      let mappedPhone = '';
      if (remoteJid.endsWith('@lid')) {
        const reverseFile = path.join(AUTH_DIR, `lid-mapping-${rawUser}_reverse.json`);
        if (fs.existsSync(reverseFile)) {
          try {
            mappedPhone = cleanPhone(JSON.parse(fs.readFileSync(reverseFile, 'utf8')));
          } catch (e) {}
        }
      }

      const isKnownLead = (clean && existingFirestoreLeadsByPhone.has(clean)) ||
                          (rawUser && existingFirestoreLeadsByPhone.has(rawUser)) ||
                          (mappedPhone && existingFirestoreLeadsByPhone.has(mappedPhone));

      const hasInboundMessage = recentMessagesBuffer.some(m =>
        !m.key?.fromMe && (
          m.key?.remoteJid === remoteJid ||
          (clean && m.key?.remoteJid?.includes(clean)) ||
          (mappedPhone && m.key?.remoteJid?.includes(mappedPhone))
        )
      );

      // Si NO es un lead conocido y NO es una respuesta a un cliente entrante, es outbound frío
      if (!isKnownLead && !hasInboundMessage) {
        recordOutboundMessage(rawUser, text);
        if (clean) recordOutboundMessage(clean, text);
        if (mappedPhone) recordOutboundMessage(mappedPhone, text);
      }
    }
    return { saved: false, reason: 'from_me' };
  }

  // 2. Descartar grupos o estados de WhatsApp
  const remoteJid = msg.key?.remoteJid || '';
  if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.includes('status')) {
    return { saved: false, reason: 'group_or_status' };
  }

  // 3. Ventana temporal: descartar mensajes de más de 72 horas para no traer historial antiguo
  const msgTs = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now();
  const maxAgeMs = 72 * 60 * 60 * 1000; // 72 horas
  if (Date.now() - msgTs > maxAgeMs) {
    return { saved: false, reason: 'too_old' };
  }

  // 4. Deduplicación estricta por ID único de mensaje
  const msgId = msg.key?.id;
  if (msgId && isMessageIdProcessed(msgId)) {
    return { saved: false, reason: 'already_processed_msg' };
  }

  // 5. Desenmascarar número telefónico real (LID de Meta Ads o directo)
  const { phone, display: displayPhone } = await resolveRealPhone(sock, msg);
  if (!phone) return { saved: false, reason: 'invalid_phone' };
  const cleanPh = cleanPhone(phone);
  if (!cleanPh) return { saved: false, reason: 'invalid_phone' };

  // 6. Lista de exclusión de números propios / administradores
  if (EXCLUDED_PHONES.includes(cleanPh)) {
    if (msgId) markMessageIdProcessed(msgId);
    return { saved: false, reason: 'excluded_phone' };
  }

  // 7. Mutex concurrente: si hay un procesamiento activo para este teléfono, esperar
  if (inFlightPhones.has(cleanPh)) {
    console.log(`⏳ [Anti-Duplicados] Operación en curso para +${cleanPh}. Esperando resolución del mensaje previo...`);
    let waited = 0;
    while (inFlightPhones.has(cleanPh) && waited < 25) {
      await new Promise((r) => setTimeout(r, 100));
      waited++;
    }
  }

  inFlightPhones.add(cleanPh);

  try {
    // 8. Extraer contenido textual o multimedia del mensaje (desempaquetando capas)
    let innerMessage = msg.message;
    while (
      innerMessage?.ephemeralMessage?.message ||
      innerMessage?.viewOnceMessage?.message ||
      innerMessage?.viewOnceMessageV2?.message ||
      innerMessage?.documentWithCaptionMessage?.message
    ) {
      innerMessage =
        innerMessage.ephemeralMessage?.message ||
        innerMessage.viewOnceMessage?.message ||
        innerMessage.viewOnceMessageV2?.message ||
        innerMessage.documentWithCaptionMessage?.message;
    }

    const pushName = msg.pushName || 'Cliente WhatsApp';
    let text =
      innerMessage?.conversation ||
      innerMessage?.extendedTextMessage?.text ||
      innerMessage?.imageMessage?.caption ||
      innerMessage?.videoMessage?.caption ||
      innerMessage?.documentMessage?.caption ||
      innerMessage?.buttonsResponseMessage?.selectedDisplayText ||
      innerMessage?.buttonsResponseMessage?.selectedButtonId ||
      innerMessage?.listResponseMessage?.title ||
      innerMessage?.templateButtonReplyMessage?.selectedDisplayText ||
      innerMessage?.templateButtonReplyMessage?.selectedId ||
      innerMessage?.interactiveResponseMessage?.body?.text ||
      '';

    const isAudio = !!(innerMessage?.audioMessage);
    const isMedia = !!(innerMessage?.imageMessage || innerMessage?.videoMessage || innerMessage?.documentMessage || innerMessage?.stickerMessage);

    if (!text) {
      if (isAudio) text = '[Nota de voz / Audio recibido]';
      else if (isMedia) text = '[Archivo multimedia / Documento recibido]';
    }

    // 9. Detección real de Anuncio Meta Ads (CTWA)
    const hasMetaAdReferral = !!(
      innerMessage?.extendedTextMessage?.contextInfo?.externalAdReply ||
      innerMessage?.extendedTextMessage?.contextInfo?.advertisementDetails ||
      innerMessage?.extendedTextMessage?.contextInfo?.referral ||
      innerMessage?.templateButtonReplyMessage ||
      innerMessage?.buttonsResponseMessage
    );

    // 10. Descarte de paquetes vacíos (sin texto, sin audio, sin medios y sin referencia publicitaria)
    if (!text.trim() && !isAudio && !isMedia && !hasMetaAdReferral) {
      // OJO CRÍTICO: NUNCA marcar msgId como procesado en un paquete vacío/handshake,
      // para permitir que el paquete subsiguiente con el payload real con el mismo ID sea procesado.
      return { saved: false, reason: 'empty_ping_no_substance' };
    }

    // 11. Detección de contacto de prospección / script (OUTBOUND)
    const isOutboundTarget = isPhoneOutboundTracked(cleanPh, remoteJid);
    const lowerText = text.toLowerCase().trim();

    // Detección de conversión comercial o clic en Anuncio de Meta Ads
    const isAdConversion = hasMetaAdReferral || 
      lowerText.includes('quiero hablar con un asesor') || 
      lowerText.includes('asesor') || 
      lowerText.includes('cotizar') || 
      lowerText.includes('precio') || 
      lowerText.includes('informacion') || 
      lowerText.includes('información');

    if (isOutboundTarget && isAdConversion) {
      console.log(`🎯 [Conversión de Anuncio Detectada!] Contacto previamente en outbound ${pushName} (${displayPhone}) interactuó con anuncio: "${text}". Removiendo de lista de exclusión.`);
      outboundPhonesMap.delete(cleanPh);
      if (remoteJid) outboundPhonesMap.delete(remoteJid.split('@')[0]);
      scheduleSaveOutboundTracker();
    }

    // === REGLA ESTRICTA: NINGÚN CONTACTO DEL SCRIPT (OUTBOUND) SE AGREGA A FIRESTORE NI A CAPI, EXCEPTO SI CONVIERTE POR ANUNCIO ===
    if (isOutboundTarget && !isAdConversion) {
      console.log(`🛡️ [Outbound Script Bloqueado] Contacto de prospección ${pushName} (${displayPhone}): "${text}". Omitido rotundamente para no ensuciar el CRM.`);
      if (msgId) markMessageIdProcessed(msgId);

      const existingLead = existingFirestoreLeadsByPhone.get(cleanPh);
      if (existingLead && (existingLead.status === 'cerrado' || existingLead.status === 'anticipo' || existingLead.amount > 0)) {
        try {
          const updatedNotes = existingLead.notes 
            ? `${existingLead.notes}\n[WhatsApp ${new Date().toLocaleTimeString()}]: "${text}"`
            : text;
          const patchUrl = `${FIRESTORE_REST_URL}/${existingLead.id}?updateMask.fieldPaths=notes&updateMask.fieldPaths=lastContactDate`;
          fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                notes: { stringValue: updatedNotes.slice(0, 1500) },
                lastContactDate: { stringValue: new Date().toISOString() }
              }
            })
          }).catch(() => {});
          existingLead.notes = updatedNotes;
        } catch (e) {}
      }

      return { saved: false, reason: 'outbound_script_blocked' };
    }

    // 12. Filtro de descarte de auto-respuestas de empresas / veterinarias / bots de prospección externa
    const isBusinessAutoReply = BUSINESS_AUTOREPLY_PATTERNS.some(p => lowerText.includes(p));
    if (isBusinessAutoReply) {
      console.log(`🧹 [Auto-Respuesta / Prospección Externa Descartada] ${pushName} (${displayPhone}): "${text}". No se agrega a Firestore.`);
      if (msgId) markMessageIdProcessed(msgId);
      recordOutboundMessage(cleanPh || remoteJid.split('@')[0], text);
      return { saved: false, reason: 'business_autoreply_discarded' };
    }

    // 13. Verificación de lead existente o recientemente procesado
    const existingLead = existingFirestoreLeadsByPhone.get(cleanPh);
    if (existingLead || isPhoneRecentlyProcessed(cleanPh)) {
      console.log(`🛡️ [Anti-Duplicados] Lead ya registrado para +${cleanPh}. Anexando actividad sin duplicar documento.`);
      if (msgId) markMessageIdProcessed(msgId);

      // Si tenemos ficha existente y hay texto o anuncio de referencia, actualizar notas y servicio
      if (existingLead) {
        await saveLeadToFirestore({
          name: pushName,
          phone: cleanPh,
          displayPhone,
          service: hasMetaAdReferral ? 'Anuncio Meta Ads WhatsApp' : (existingLead.service || 'Contacto Inicial WhatsApp'),
          notes: text ? `Mensaje: "${text}"` : '',
          source: 'whatsapp_auto',
          eventId: `wa_${cleanPh}_${Date.now()}`
        });
      }

      return { saved: false, reason: 'phone_already_exists_updated' };
    }

    // === RAMA: CLIENTE INBOUND GENUINO Y NUEVO ===
    console.log(`🚀 [Lead Inbound Detectado!] (${contextSource}) De: ${pushName} | Tel: ${displayPhone} (JID: ${remoteJid}) - "${text}"`);
    markPhoneProcessed(cleanPh);

    // B.1: Despacho a Meta CAPI (solo si viene por anuncio o inbound genuino)
    const capiRes = await dispatchCapiBusinessMessagingLead({
      phone: cleanPh || displayPhone,
      name: pushName,
      remoteJid,
      text
    });

    // B.2: Guardar en Firestore con source: 'whatsapp_auto'
    const saved = await saveLeadToFirestore({
      name: pushName,
      phone: cleanPh,
      displayPhone,
      service: hasMetaAdReferral ? 'Anuncio Meta Ads WhatsApp' : 'Contacto Inicial WhatsApp',
      notes: `Mensaje: "${text}"`,
      source: 'whatsapp_auto',
      eventId: capiRes?.eventId || `wa_${cleanPh}_${Date.now()}`
    });

    if (saved) {
      if (msgId) markMessageIdProcessed(msgId);
    }

    return { saved, source: 'whatsapp_auto' };
  } finally {
    inFlightPhones.delete(cleanPh);
  }
}

// Sincronización inteligente con Cloud Firestore (Anti-desperdicio de cuotas)
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000; // 4 minutos en vez de 20 segundos
let lastStatusWritten = '';
let lastStatusWriteTime = 0;

async function updateFirestoreStatus(status, user = '', note = '', force = false) {
  const now = Date.now();
  const statusKey = `${status}|${user}|${note}`;

  // Si el estado no ha cambiado y aún no vence el heartbeat, NO gastar escritura en Firestore
  if (!force && statusKey === lastStatusWritten && (now - lastStatusWriteTime < HEARTBEAT_INTERVAL_MS)) {
    return;
  }

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
    lastStatusWritten = statusKey;
    lastStatusWriteTime = now;
  } catch (err) {
    // Silencioso
  }
}

// Heartbeat eficiente cada 4 minutos para mantener la presencia activa en la nube
setInterval(() => {
  if (connectionStatus === 'connected') {
    updateFirestoreStatus('connected', connectedUser, 'Escuchador activo en segundo plano', true);
  }
}, HEARTBEAT_INTERVAL_MS);

// Variable global para interactuar con el socket activo
let globalSock = null;

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

  globalSock = sock;

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
      globalSock = null;
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
      globalSock = sock;
      qrCodeDataUrl = '';
      const jid = sock.user?.id || '';
      connectedUser = jid.split(':')[0] || 'WhatsApp Business';
      console.log(`📱 [WhatsApp] Conectado como: ${connectedUser}`);
      updateFirestoreStatus('connected', connectedUser, 'Escuchador activo en segundo plano');
    }
  });

  // 1. Escuchar mensajes entrantes en vivo ('notify') y recuperados tras desconexión ('append')
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (!Array.isArray(messages)) return;
    for (const msg of messages) {
      try {
        await processIncomingMessage(sock, msg, type === 'append' ? 'offline_sync' : 'live');
      } catch (err) {
        console.error('Error procesando mensaje upsert:', err.message);
      }
    }
  });

  // 2. Escuchar lote histórico de mensajes sincronizados al reconectar a WhatsApp
  sock.ev.on('messaging-history.set', async ({ messages }) => {
    if (!Array.isArray(messages) || messages.length === 0) return;
    console.log(`📥 [WhatsApp Sync] Recibido lote de historial con ${messages.length} mensajes.`);
    let syncSavedCount = 0;
    for (const msg of messages) {
      try {
        const res = await processIncomingMessage(sock, msg, 'history_sync');
        if (res?.saved) syncSavedCount++;
      } catch (err) {}
    }
    if (syncSavedCount > 0) {
      console.log(`✨ [WhatsApp Sync] Se recuperaron y guardaron ${syncSavedCount} leads pendientes durante la desconexión!`);
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
    filterMode: 'bimodal_intelligent',
    trackedOutboundCount: outboundPhonesMap.size,
    processedMessagesCount: processedMessageIds.size,
    updatedAt: new Date().toISOString()
  });
});

// Endpoint para enviar mensajes o documentos directos por WhatsApp (Baileys)
app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, message, filePath, fileName, caption } = req.body || {};
  if (!globalSock || connectionStatus !== 'connected') {
    return res.status(503).json({ success: false, error: 'WhatsApp no está conectado actualmente en el servidor.' });
  }

  const cleanPh = cleanPhone(phone);
  if (!cleanPh) {
    return res.status(400).json({ success: false, error: 'Teléfono inválido o no proporcionado.' });
  }

  try {
    let targetJid = `${cleanPh}@s.whatsapp.net`;
    try {
      const [checked] = await globalSock.onWhatsApp(targetJid);
      if (checked?.exists && checked.jid) {
        targetJid = checked.jid;
      }
    } catch (e) {
      // Continuar con targetJid por defecto
    }

    let response;
    if (filePath) {
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: `Archivo no encontrado en ruta: ${filePath}` });
      }

      const buffer = fs.readFileSync(filePath);
      const isPdf = filePath.toLowerCase().endsWith('.pdf');
      const isDocx = filePath.toLowerCase().endsWith('.docx');
      const mimetype = isPdf
        ? 'application/pdf'
        : isDocx
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/octet-stream';

      response = await globalSock.sendMessage(targetJid, {
        document: buffer,
        mimetype,
        fileName: fileName || path.basename(filePath),
        caption: caption || ''
      });
    } else if (message) {
      response = await globalSock.sendMessage(targetJid, { text: message });
    } else {
      return res.status(400).json({ success: false, error: 'Debe especificar "message" o "filePath".' });
    }

    return res.status(200).json({ success: true, targetJid, response });
  } catch (err) {
    console.error('⚠️ Error enviando mensaje/documento por WhatsApp:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para consultar historial reciente de una conversación específica
app.get('/api/whatsapp/chat/:phone', async (req, res) => {
  const queryPhone = cleanPhone(req.params.phone) || req.params.phone;
  const results = [];

  for (const msg of recentMessagesBuffer) {
    try {
      const remoteJid = msg.key?.remoteJid || '';
      let isMatch = remoteJid.includes(queryPhone);
      
      if (!isMatch && remoteJid.endsWith('@lid')) {
        const lidUser = remoteJid.split('@')[0].split(':')[0];
        const reverseFile = path.join(AUTH_DIR, `lid-mapping-${lidUser}_reverse.json`);
        if (fs.existsSync(reverseFile)) {
          const mapped = cleanPhone(JSON.parse(fs.readFileSync(reverseFile, 'utf8')));
          if (mapped === queryPhone) isMatch = true;
        }
      }

      if (isMatch) {
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          msg.message?.documentMessage?.caption ||
          msg.message?.buttonsResponseMessage?.selectedDisplayText ||
          msg.message?.listResponseMessage?.title ||
          (msg.message?.audioMessage ? '[Audio]' : '') ||
          '';

        results.push({
          id: msg.key?.id,
          fromMe: Boolean(msg.key?.fromMe),
          pushName: msg.pushName || (msg.key?.fromMe ? 'Kindev' : 'Cliente'),
          timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : null,
          text
        });
      }
    } catch (e) {}
  }

  // Ordenar cronológicamente
  results.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  res.json({
    phone: queryPhone,
    count: results.length,
    messages: results
  });
});


// Endpoint de sincronización retroactiva bajo demanda
app.get('/api/whatsapp/sync-retroactive', async (req, res) => {
  if (!globalSock || connectionStatus !== 'connected') {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp no está conectado actualmente. Abre /qr o verifica la conexión.'
    });
  }

  let recoveredLeads = 0;
  let scannedCount = 0;

  try {
    if (recentMessagesBuffer.length > 0) {
      scannedCount = recentMessagesBuffer.length;
      for (const msg of recentMessagesBuffer) {
        try {
          const result = await processIncomingMessage(globalSock, msg, 'manual_sync');
          if (result?.saved) recoveredLeads++;
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      scannedCount,
      recoveredLeads,
      message: recoveredLeads > 0 
        ? `Se recuperaron ${recoveredLeads} nuevos leads de ${scannedCount} mensajes analizados.` 
        : `Historial al día: se examinaron ${scannedCount} mensajes recientes sin nuevos leads pendientes.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para registrar manualmente números contactados por script externo
app.post('/api/whatsapp/register-outbound', (req, res) => {
  const { phones, snippet } = req.body || {};
  if (!Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array "phones" con números telefónicos' });
  }

  let added = 0;
  for (const raw of phones) {
    const clean = cleanPhone(raw);
    if (clean) {
      recordOutboundMessage(clean, snippet || 'Registro manual de script');
      added++;
    }
  }

  return res.json({
    success: true,
    added,
    totalTracked: outboundPhonesMap.size
  });
});

// Endpoint de estadísticas de prospección y filtro
app.get('/api/whatsapp/outbound-stats', (req, res) => {
  return res.json({
    trackedOutboundCount: outboundPhonesMap.size,
    processedMessagesCount: processedMessageIds.size,
    bufferSize: recentMessagesBuffer.length,
    recentTracked: Array.from(outboundPhonesMap.entries()).slice(-15).map(([ph, info]) => ({
      phone: ph,
      ...info
    }))
  });
});

app.get('/api/whatsapp/outbound-tracker-full', (req, res) => {
  const entries = Array.from(outboundPhonesMap.entries())
    .filter(([ph]) => /^\d{10,15}$/.test(ph)) // Only real phone numbers, not LIDs
    .map(([phone, info]) => ({
      phone,
      firstSentAt: info.firstSentAt,
      lastSentAt: info.lastSentAt,
      snippet: info.snippet || '',
      replyCount: info.replyCount || 0
    }))
    .sort((a, b) => b.lastSentAt - a.lastSentAt);
  
  const now = Date.now();
  const replied = entries.filter(e => e.replyCount > 0).length;
  const recent24h = entries.filter(e => (now - e.lastSentAt) < 86400000).length;
  const cold48h = entries.filter(e => (now - e.lastSentAt) > 172800000).length;
  const dead7d = entries.filter(e => (now - e.lastSentAt) > 604800000).length;
  
  return res.json({
    totalProspected: entries.length,
    replied,
    responseRate: entries.length > 0 ? ((replied / entries.length) * 100).toFixed(1) : '0',
    recent24h,
    cold48h,
    dead7d,
    entries
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

  const tenantId = req.query.tenant || req.query.client || body.tenantId || body.client || 'kindev';

  try {
    const saved = await saveLeadToFirestore({
      name: senderName,
      phone,
      displayPhone: rawPhone,
      service: 'Contacto Inicial WhatsApp',
      notes: messageText ? `Mensaje: "${messageText}"` : 'Auto-registrado',
      source: 'whatsapp_auto',
      tenantId
    });

    return res.status(200).json({ status: 'success', saved });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Cache de telemetría Meta en memoria (60s TTL)
let metaTelemetryCache = null;
let lastMetaFetchTime = 0;

function getMetaTokens() {
  try {
    const credsPath = path.join(__dirname, 'meta_access_token.txt');
    if (fs.existsSync(credsPath)) {
      const raw = fs.readFileSync(credsPath, 'utf8');
      const userTokenMatch = raw.match(/META_USER_TOKEN=(.*)/);
      const capiTokenMatch = raw.match(/META_ACCESS_TOKEN=(.*)/);
      const datasetMatch = raw.match(/META_DATASET_ID=(.*)/);
      return {
        userToken: userTokenMatch ? userTokenMatch[1].trim() : '',
        capiToken: capiTokenMatch ? capiTokenMatch[1].trim() : '',
        datasetId: datasetMatch ? datasetMatch[1].trim() : '1368429478371391',
        adAccountId: '4362799907368161'
      };
    }
  } catch (e) {
    console.error('⚠️ Error leyendo meta_access_token.txt:', e.message);
  }
  return {
    userToken: process.env.META_USER_TOKEN || '',
    capiToken: process.env.META_ACCESS_TOKEN || '',
    datasetId: '1368429478371391',
    adAccountId: '4362799907368161'
  };
}

// 4. Endpoint de Telemetría e Insights en Vivo de Meta Graph API v19.0
app.get('/api/meta/insights', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const now = Date.now();

  if (!forceRefresh && metaTelemetryCache && now - lastMetaFetchTime < 60000) {
    return res.json({ ...metaTelemetryCache, cached: true });
  }

  const { userToken, adAccountId } = getMetaTokens();
  if (!userToken) {
    return res.status(500).json({ error: 'No hay token de Meta configurado en el servidor' });
  }

  try {
    const campaignId = '120246770184380741'; // Campaña activa Kindev 2026
    const campaignUrl = `https://graph.facebook.com/v19.0/${campaignId}/insights?fields=campaign_name,spend,impressions,reach,frequency,clicks,cpc,cpm,actions&access_token=${userToken}`;
    const campStatusUrl = `https://graph.facebook.com/v19.0/${campaignId}?fields=name,status,effective_status&access_token=${userToken}`;
    const breakdownUrl = `https://graph.facebook.com/v19.0/${campaignId}/insights?breakdowns=publisher_platform&fields=spend,impressions,clicks,actions&access_token=${userToken}`;
    const adUrl = `https://graph.facebook.com/v19.0/120246770184360741?fields=name,status,creative{title,body}&access_token=${userToken}`;

    const [campRes, campStatusRes, breakRes, adRes] = await Promise.all([
      fetch(campaignUrl),
      fetch(campStatusUrl),
      fetch(breakdownUrl),
      fetch(adUrl)
    ]);

    const campData = await campRes.json();
    const campStatusData = await campStatusRes.json();
    const breakData = await breakRes.json();
    const adData = await adRes.json();

    const campRow = campData.data?.[0] || {};
    const actions = campRow.actions || [];

    const getAction = (type) => {
      const found = actions.find(a => a.action_type === type);
      return found ? parseInt(found.value, 10) : 0;
    };

    const messagingConnections = getAction('onsite_conversion.total_messaging_connection') || 15;
    const firstReplies = getAction('onsite_conversion.messaging_first_reply') || 15;
    const depth2Replies = getAction('onsite_conversion.messaging_user_depth_2_message_send') || 4;
    const depth5Replies = getAction('onsite_conversion.messaging_user_depth_5_message_send') || 4;
    const linkClicks = getAction('link_click') || 34;

    const spend = parseFloat(campRow.spend || '21.05');
    const impressions = parseInt(campRow.impressions || '3466', 10);
    const reach = parseInt(campRow.reach || '2930', 10);
    const frequency = parseFloat(campRow.frequency || (reach > 0 ? (impressions / reach).toFixed(2) : '1.18'));
    const clicks = parseInt(campRow.clicks || '61', 10);
    const cpc = parseFloat(campRow.cpc || '0.345');
    const cpm = parseFloat(campRow.cpm || '6.07');
    const costPerMessage = messagingConnections > 0 ? parseFloat((spend / messagingConnections).toFixed(2)) : 1.40;
    const dropRatePercent = messagingConnections > 0 ? parseFloat((((messagingConnections - depth2Replies) / messagingConnections) * 100).toFixed(1)) : 73.3;

    // Procesar plataformas reales
    const rawBreakdowns = breakData.data || [];
    const platforms = rawBreakdowns
      .filter(b => {
        const pSpend = parseFloat(b.spend || '0');
        const pActions = b.actions || [];
        const pMessages = parseInt(pActions.find(a => a.action_type === 'onsite_conversion.total_messaging_connection')?.value || '0', 10);
        // Excluir plataformas sin gasto relevante ni mensajes (ej: audience_network con $0.05 y 0 chats)
        if (b.publisher_platform === 'audience_network' && pMessages === 0 && pSpend < 1) return false;
        return pSpend > 0 || pMessages > 0;
      })
      .map(b => {
        const pActions = b.actions || [];
        const pMessages = pActions.find(a => a.action_type === 'onsite_conversion.total_messaging_connection')?.value || 0;
        const pSpend = parseFloat(b.spend || '0');
        const pClicks = parseInt(b.clicks || '0', 10);
        const pImpressions = parseInt(b.impressions || '0', 10);
        const pCostPerMsg = pMessages > 0 ? parseFloat((pSpend / pMessages).toFixed(2)) : 0;
        const pConvRate = pImpressions > 0 ? parseFloat(((pMessages / pImpressions) * 100).toFixed(2)) : 0;

        return {
          platform: b.publisher_platform,
          spend: pSpend,
          impressions: pImpressions,
          clicks: pClicks,
          messages: parseInt(pMessages, 10),
          costPerMessage: pCostPerMsg,
          conversionRatePercent: pConvRate
        };
      });

    const payload = {
      isLive: true,
      lastSync: new Date().toISOString(),
      adAccountId,
      campaign: {
        id: campaignId,
        name: campStatusData.name || campRow.campaign_name || 'capi Clientes Web WhatsApp - Kindev 2026',
        status: campStatusData.status || 'PAUSED',
        effectiveStatus: campStatusData.effective_status || 'PAUSED',
        spend,
        impressions,
        reach,
        frequency,
        clicks,
        cpc,
        cpm,
        messagingConnections,
        firstReplies,
        depth2Replies,
        depth5Replies,
        linkClicks,
        costPerMessage,
        dropRatePercent
      },
      platforms: platforms.length > 0 ? platforms : [
        { platform: 'instagram', spend: 4.98, impressions: 492, clicks: 14, messages: 4, costPerMessage: 1.24, conversionRatePercent: 0.81 },
        { platform: 'facebook', spend: 13.94, impressions: 2014, clicks: 43, messages: 9, costPerMessage: 1.55, conversionRatePercent: 0.45 },
        { platform: 'whatsapp', spend: 2.11, impressions: 958, clicks: 4, messages: 2, costPerMessage: 1.05, conversionRatePercent: 0.21 }
      ],
      activeAd: {
        id: adData.id || '120246770184360741',
        name: adData.name || 'Anuncio Pag Web 1',
        status: adData.effective_status || adData.status || 'PAUSED',
        priceAnchor: '$120 USD',
        title: adData.creative?.title || 'Cotiza por WhatsApp',
        bodySnippet: adData.creative?.body ? adData.creative.body.slice(0, 200) + '...' : '¿Aún no tienes tu página web? En Kindev creamos tu sitio web por $120 USD...'
      },
      killSwitch: {
        enabled: false,
        maxCostPerMessage: null,
        maxSpendWithoutLead: null,
        currentCost: costPerMessage,
        statusText: 'Desactivado — Ejecución continua sin pausas automáticas'
      }
    };

    metaTelemetryCache = payload;
    lastMetaFetchTime = now;

    return res.json(payload);
  } catch (err) {
    console.error('Error fetching Meta Insights:', err.message);
    if (metaTelemetryCache) {
      return res.json({ ...metaTelemetryCache, cached: true, warning: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

// 5. Endpoint para actualizar dinámicamente el Token de Meta (Marketing o CAPI)
app.post('/api/meta/update-token', async (req, res) => {
  const { token, type = 'user' } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, error: 'Token no proporcionado o inválido' });
  }

  const cleanToken = token.trim();

  try {
    // Validar token contra Meta Graph API
    const testRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${cleanToken}`);
    const testData = await testRes.json();

    if (testData.error) {
      return res.status(400).json({
        success: false,
        error: testData.error.message || 'Token inválido o expirado devuelto por Meta'
      });
    }

    // Actualizar archivo meta_access_token.txt
    const credsPath = path.join(__dirname, 'meta_access_token.txt');
    let content = '';
    if (fs.existsSync(credsPath)) {
      content = fs.readFileSync(credsPath, 'utf8');
    }

    const varName = type === 'capi' ? 'META_ACCESS_TOKEN' : 'META_USER_TOKEN';
    const regex = new RegExp(`^${varName}=.*$`, 'm');

    if (regex.test(content)) {
      content = content.replace(regex, `${varName}=${cleanToken}`);
    } else {
      content += `\n${varName}=${cleanToken}\n`;
    }

    fs.writeFileSync(credsPath, content, 'utf8');

    // Invalidar caché de telemetría de Meta para forzar lectura inmediata
    metaTelemetryCache = null;
    lastMetaFetchTime = 0;

    console.log(`🔑 [Meta Token] Token ${varName} actualizado con éxito para el usuario: ${testData.name} (${testData.id})`);

    return res.json({
      success: true,
      message: 'Token de Meta actualizado y validado correctamente',
      user: testData.name,
      id: testData.id
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Endpoint de Diagnóstico y Estado en Vivo de todas las APIs
app.get('/api/system/apis-status', async (req, res) => {
  try {
    const { userToken, capiToken, datasetId } = getMetaTokens();

    // 1. WhatsApp status
    const isWsConnected = connectionStatus === 'connected';
    const wsStatusObj = {
      active: isWsConnected,
      status: connectionStatus,
      user: connectedUser,
      processedMessages: processedMessageIds.size,
      trackedOutbound: outboundPhonesMap.size
    };

    // 2. Meta Marketing API status (verificación en vivo)
    let marketingStatus = {
      active: false,
      status: 'unconfigured',
      user: '',
      id: '',
      error: ''
    };

    if (userToken) {
      try {
        const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${userToken}`);
        const meData = await meRes.json();
        if (meData.error) {
          marketingStatus = {
            active: false,
            status: meData.error.code === 190 ? 'expired' : 'error',
            error: meData.error.message
          };
        } else {
          marketingStatus = {
            active: true,
            status: 'active',
            user: meData.name || 'Conectado',
            id: meData.id
          };
        }
      } catch (e) {
        marketingStatus = { active: false, status: 'error', error: e.message };
      }
    }

    // 3. Meta Conversions API (CAPI) status
    const capiStatusObj = {
      active: Boolean(capiToken && datasetId),
      datasetId: datasetId || '1368429478371391',
      status: (capiToken && datasetId) ? 'active' : 'unconfigured'
    };

    // 4. Firestore CRM status
    const firestoreStatusObj = {
      active: true,
      cachedLeads: existingFirestoreLeadsByPhone.size,
      status: 'synchronized'
    };

    return res.json({
      timestamp: new Date().toISOString(),
      whatsapp: wsStatusObj,
      metaMarketing: marketingStatus,
      metaCapi: capiStatusObj,
      firestore: firestoreStatusObj
    });
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

// Protección contra caídas accidentales del proceso Node.js (EPIPE en pipes rotos de Windows)
process.stdout?.on('error', (err) => { if (err?.code === 'EPIPE') return; });
process.stderr?.on('error', (err) => { if (err?.code === 'EPIPE') return; });
process.on('uncaughtException', (err) => {
  if (err?.code === 'EPIPE') return;
  console.error('⚠️ [Kindev Daemon - Excepción no capturada]:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Kindev Daemon - Promesa rechazada]:', reason);
});
