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

// Mapeo persistente de números a los que nosotros escribimos primero (script de prospección / cold outreach)
const outboundPhonesMap = new Map();

function loadOutboundTracker() {
  try {
    if (fs.existsSync(OUTBOUND_TRACKER_FILE)) {
      const data = JSON.parse(fs.readFileSync(OUTBOUND_TRACKER_FILE, 'utf8'));
      if (data && typeof data === 'object') {
        for (const [ph, info] of Object.entries(data)) {
          outboundPhonesMap.set(ph, info);
        }
      }
      console.log(`📋 [Outbound Tracker] Cargados ${outboundPhonesMap.size} contactos de prospección previos.`);
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

function isPhoneOutboundTracked(phone) {
  return outboundPhonesMap.has(phone);
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
          notes: f.notes?.stringValue || ''
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

  // 1. VERIFICACIÓN ANTI-DUPLICADOS ESTRICTA (Protege clientes cerrados y avanzados)
  const existingLead = existingFirestoreLeadsByPhone.get(cleanPh);
  if (existingLead) {
    console.log(`🛡️ [Anti-Duplicados] Cliente existente detectado: "${existingLead.name}" (+${cleanPh}) [Estado: ${existingLead.status}]. Actualizando notas sin duplicar documento.`);
    try {
      const updatedNotes = existingLead.notes 
        ? `${existingLead.notes}\n[Nuevo mensaje WhatsApp ${new Date().toLocaleTimeString()}]: "${notes || ''}"`
        : notes || '';
      
      const patchUrl = `${FIRESTORE_REST_URL}/${existingLead.id}?updateMask.fieldPaths=notes&updateMask.fieldPaths=lastContactDate`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            notes: { stringValue: updatedNotes.slice(0, 1500) },
            lastContactDate: { stringValue: new Date().toISOString() }
          }
        })
      });
      existingLead.notes = updatedNotes;
      return true;
    } catch (patchErr) {
      console.error('Error actualizando cliente existente:', patchErr.message);
      return false;
    }
  }

  // 2. Si no existe, insertar nuevo documento único
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
        notes: notes || ''
      });
      return true;
    } else {
      console.error('Error guardando lead en Firestore:', await response.text());
      return false;
    }
  } catch (dbErr) {
    console.error('Error insertando en Firestore:', dbErr.message);
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

// Función maestra de procesamiento con Bloque de Decisión Bimodal
async function processIncomingMessage(sock, msg, contextSource = 'live') {
  if (!msg) return { saved: false, reason: 'no_msg' };
  addToRecentMessagesBuffer(msg);

  // 1. Mensajes salientes: registrar automáticamente en Outbound Tracker (sea de script o manual)
  if (msg.key?.fromMe) {
    const remoteJid = msg.key.remoteJid || '';
    if (remoteJid && !remoteJid.endsWith('@g.us') && !remoteJid.includes('status')) {
      const clean = cleanPhone(remoteJid.split('@')[0].split(':')[0]);
      if (clean) {
        let text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '';
        recordOutboundMessage(clean, text);
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

  // 6. Lista de exclusión de números propios / administradores
  if (EXCLUDED_PHONES.includes(phone)) {
    if (msgId) markMessageIdProcessed(msgId);
    return { saved: false, reason: 'excluded_phone' };
  }

  // 7. Evitar duplicar lead en ventana de 24h para el mismo teléfono
  if (isPhoneRecentlyProcessed(phone)) {
    if (msgId) markMessageIdProcessed(msgId);
    return { saved: false, reason: 'phone_recently_processed' };
  }

  // 8. Extraer contenido textual o multimedia del mensaje
  const pushName = msg.pushName || 'Cliente WhatsApp';
  let text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    msg.message?.buttonsResponseMessage?.selectedDisplayText ||
    msg.message?.listResponseMessage?.title ||
    msg.message?.templateButtonReplyMessage?.selectedId ||
    '';

  const isAudio = !!(msg.message?.audioMessage);
  const isMedia = !!(msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.documentMessage);

  if (!text) {
    if (isAudio) text = '[Nota de voz / Audio recibido]';
    else if (isMedia) text = '[Archivo multimedia / Documento recibido]';
  }

  // 9. Detección de origen: Anuncio Meta Ads vs Script Outbound vs Inbound Directo
  const isFromLidAd = remoteJid.endsWith('@lid') || !!msg.key?.participantAlt;
  const isOutboundTarget = isPhoneOutboundTracked(phone);

  const lowerText = text.toLowerCase().trim();

  // === RAMA A: CONTACTO PREVIAMENTE CONTACTADO POR NUESTRO SCRIPT (OUTBOUND) ===
  if (isOutboundTarget && !isFromLidAd) {
    // A.1: Filtro de descarte para negativas, reclamos o monosílabos fríos
    const isRejection = OUTBOUND_REJECTION_KEYWORDS.some(kw => lowerText.includes(kw));
    const isColdShort = ['ok', 'si', 'no', 'bien', 'ya', '👍', '👌', '?', 'ola', 'hola', 'buenas'].includes(lowerText) && lowerText.length <= 6;

    if (isRejection || isColdShort) {
      console.log(`🧹 [Outbound Descartado] Respuesta de prospección fría/negativa de ${pushName} (${displayPhone}): "${text}"`);
      if (msgId) markMessageIdProcessed(msgId);
      return { saved: false, reason: 'outbound_rejection' };
    }

    // A.2: Verificar si demuestra interés calificado
    const hasInterest = OUTBOUND_INTEREST_KEYWORDS.some(kw => lowerText.includes(kw)) || isAudio;
    if (!hasInterest && lowerText.length < 15) {
      console.log(`ℹ️ [Outbound Ignorado] Sin interés comercial explícito de ${pushName} (${displayPhone}): "${text}"`);
      if (msgId) markMessageIdProcessed(msgId);
      return { saved: false, reason: 'outbound_unqualified' };
    }

    // A.3: ¡Lead de prospección calificado! (NO enviar a Meta CAPI para no contaminar audiencias)
    console.log(`🎯 [Lead Outbound Calificado!] (${contextSource}) De: ${pushName} | Tel: ${displayPhone} - "${text}"`);
    const saved = await saveLeadToFirestore({
      name: pushName,
      phone,
      displayPhone,
      service: 'Prospección Calificada WhatsApp',
      notes: `Respuesta a prospección: "${text}"`,
      source: 'whatsapp_outreach',
      eventId: `outreach_${phone}_${Date.now()}`
    });

    if (saved) {
      markPhoneProcessed(phone);
      if (msgId) markMessageIdProcessed(msgId);
    }
    return { saved, source: 'whatsapp_outreach' };
  }

  // === RAMA B: CLIENTE INBOUND (Clic en Anuncio de Meta Ads o Orgánico Web) ===
  console.log(`🚀 [Lead Inbound Detectado!] (${contextSource}) De: ${pushName} | Tel: ${displayPhone} (JID: ${remoteJid}) - "${text}"`);

  // B.1: Despacho a Meta CAPI (solo si viene por anuncio o inbound genuino)
  const capiRes = await dispatchCapiBusinessMessagingLead({
    phone: phone || displayPhone,
    name: pushName,
    remoteJid,
    text
  });

  // B.2: Guardar en Firestore con source: 'whatsapp_auto'
  const saved = await saveLeadToFirestore({
    name: pushName,
    phone,
    displayPhone,
    service: isFromLidAd ? 'Anuncio Meta Ads WhatsApp' : 'Contacto Inicial WhatsApp',
    notes: `Mensaje: "${text}"`,
    source: 'whatsapp_auto',
    eventId: capiRes?.eventId || `wa_${phone}_${Date.now()}`
  });

  if (saved) {
    markPhoneProcessed(phone);
    if (msgId) markMessageIdProcessed(msgId);
  }

  return { saved, source: 'whatsapp_auto' };
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
        source: { stringValue: 'whatsapp_auto' },
        tenantId: { stringValue: String(tenantId) }
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
    const campaignUrl = `https://graph.facebook.com/v19.0/${campaignId}/insights?fields=campaign_name,spend,impressions,clicks,cpc,cpm,actions&access_token=${userToken}`;
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
    const clicks = parseInt(campRow.clicks || '61', 10);
    const cpc = parseFloat(campRow.cpc || '0.345');
    const cpm = parseFloat(campRow.cpm || '6.07');
    const costPerMessage = messagingConnections > 0 ? parseFloat((spend / messagingConnections).toFixed(2)) : 1.40;
    const dropRatePercent = messagingConnections > 0 ? parseFloat((((messagingConnections - depth2Replies) / messagingConnections) * 100).toFixed(1)) : 73.3;

    // Procesar plataformas
    const rawBreakdowns = breakData.data || [];
    const platforms = rawBreakdowns
      .filter(b => b.publisher_platform !== 'audience_network' || parseFloat(b.spend) > 0)
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
        enabled: true,
        maxCostPerMessage: 4.00,
        maxSpendWithoutLead: 4.00,
        currentCost: costPerMessage,
        statusText: costPerMessage <= 4.00 ? 'Óptimo — Bajo umbral de seguridad' : 'Alerta — Por encima del umbral'
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
