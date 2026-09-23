import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para obtener credenciales de Meta
export function getMetaCredentials() {
  const tokenFile = path.resolve(__dirname, '../meta_access_token.txt');
  let accessToken = process.env.META_ACCESS_TOKEN || '';
  let datasetId = process.env.META_DATASET_ID || '1368429478371391';

  if (fs.existsSync(tokenFile)) {
    const raw = fs.readFileSync(tokenFile, 'utf8');
    const tokenMatch = raw.match(/META_ACCESS_TOKEN=(.*)/);
    const datasetMatch = raw.match(/META_DATASET_ID=(.*)/);
    if (tokenMatch) accessToken = tokenMatch[1].trim();
    if (datasetMatch) datasetId = datasetMatch[1].trim();
  }

  return { accessToken, datasetId };
}

// Normalizador y hasheador SHA-256 según el estándar oficial de Meta
export function hashSha256(value) {
  if (!value) return null;
  const clean = value.toString().trim().toLowerCase();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

// Formateador de teléfonos para WhatsApp (Ecuador y global)
export function formatPhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let phone = rawPhone.toString().replace(/\D/g, ''); // Quita espacios, guiones, signos +

  // Si el usuario en Ecuador ingresa "0991952889", se convierte a código internacional "593991952889"
  if (phone.startsWith('09') && phone.length === 10) {
    phone = '593' + phone.slice(1);
  }
  // Si ingresa "991952889" (9 dígitos)
  else if (phone.length === 9 && phone.startsWith('9')) {
    phone = '593' + phone;
  }

  return phone;
}

export function detectCountryCode(phone) {
  if (!phone) return 'ec';
  const clean = phone.toString().replace(/\D/g, '');
  if (clean.startsWith('593')) return 'ec';
  if (clean.startsWith('1') && clean.length === 11) return 'us';
  if (clean.startsWith('57')) return 'co';
  if (clean.startsWith('51')) return 'pe';
  if (clean.startsWith('34')) return 'es';
  if (clean.startsWith('52')) return 'mx';
  return 'ec';
}

/**
 * Envía un evento a Meta Conversions API (CAPI)
 * @param {Object} options
 * @param {string} options.eventName - 'Purchase' | 'Lead' | 'Contact'
 * @param {string} options.phone - Teléfono del cliente
 * @param {string} [options.email] - Correo electrónico
 * @param {string} [options.name] - Nombre del cliente
 * @param {number} [options.value] - Valor en USD (ej. 120)
 * @param {string} [options.currency='USD'] - Moneda
 * @param {string} [options.leadId] - ID único del cliente para external_id
 * @param {string} [options.countryCode] - Código de país ISO (ej. 'ec')
 * @param {string} [options.eventId] - ID único de evento para deduplicación
 * @param {string} [options.testEventCode] - Código de prueba opcional (TESTxxxxx)
 */
export async function sendMetaConversion({
  eventName,
  phone,
  email,
  name,
  value = 0,
  currency = 'USD',
  leadId,
  countryCode,
  eventId,
  testEventCode
}) {
  const { accessToken, datasetId } = getMetaCredentials();

  if (!accessToken || !datasetId) {
    throw new Error('Faltan las credenciales de Meta (META_ACCESS_TOKEN o META_DATASET_ID)');
  }

  const cleanPhone = formatPhoneNumber(phone);
  const hashedPhone = cleanPhone ? hashSha256(cleanPhone) : null;
  const hashedEmail = email ? hashSha256(email) : null;
  const hashedName = name ? hashSha256(name.split(' ')[0]) : null;

  const country = countryCode?.toLowerCase().trim() || detectCountryCode(cleanPhone);
  const hashedCountry = country ? hashSha256(country) : null;
  const hashedExternalId = leadId ? hashSha256(String(leadId).trim()) : null;

  const resolvedEventId = eventId || `kindev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'system_generated', // Evento generado desde backend / chat
    event_id: resolvedEventId,
    user_data: {
      ...(hashedPhone ? { ph: [hashedPhone] } : {}),
      ...(hashedEmail ? { em: [hashedEmail] } : {}),
      ...(hashedName ? { fn: [hashedName] } : {}),
      ...(hashedCountry ? { country: [hashedCountry] } : {}),
      ...(hashedExternalId ? { external_id: [hashedExternalId] } : {}),
      client_user_agent: 'Kindev-CAPI-Engine/2026'
    }
  };

  // Si es una compra, adjuntar custom_data con monto y divisa
  if (eventName === 'Purchase' || value > 0) {
    eventData.custom_data = {
      currency: currency || 'USD',
      value: Number(value).toFixed(2),
      order_id: resolvedEventId
    };
  }

  // Si hay código de prueba activo
  if (testEventCode && testEventCode.trim() !== '') {
    eventData.test_event_code = testEventCode.trim();
  }

  const payload = {
    data: [eventData]
  };

  const url = `https://graph.facebook.com/v19.0/${datasetId}/events?access_token=${accessToken}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const responseData = await response.json();

  if (!response.ok) {
    const errorMsg = responseData?.error?.message || 'Error desconocido de Meta Graph API';
    throw new Error(`Meta CAPI Error (${response.status}): ${errorMsg}`);
  }

  return {
    success: true,
    eventsReceived: responseData.events_received,
    fbtraceId: responseData.fbtrace_id,
    eventId: resolvedEventId,
    timestamp: new Date().toISOString()
  };
}
