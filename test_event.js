import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargar credenciales desde meta_access_token.txt
const credsRaw = fs.readFileSync(path.join(__dirname, 'meta_access_token.txt'), 'utf8');
const tokenMatch = credsRaw.match(/META_ACCESS_TOKEN=(.*)/);
const datasetMatch = credsRaw.match(/META_DATASET_ID=(.*)/);

const ACCESS_TOKEN = tokenMatch ? tokenMatch[1].trim() : '';
const DATASET_ID = datasetMatch ? datasetMatch[1].trim() : '1368429478371391';

// 2. Obtener el código de prueba desde argumento de línea de comandos o variable
// Ejemplo de uso: node test_event.js TEST12345 [lead|purchase]
const TEST_EVENT_CODE = process.argv[2] || process.env.TEST_EVENT_CODE;
const EVENT_TYPE = (process.argv[3] || 'lead').toLowerCase();

if (!TEST_EVENT_CODE) {
  console.log('\n⚠️  ATENCIÓN: No proporcionaste el código de prueba de Meta.');
  console.log('📌 Uso: node test_event.js <TU_TEST_EVENT_CODE> [lead|purchase]');
  console.log('👉 Ejemplo: node test_event.js TEST83741 lead\n');
  process.exit(1);
}

// 3. Función para hashear datos personales (PII) en SHA-256 según el estándar de Meta
function hashSha256(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

// 4. Datos de prueba con alta calidad de coincidencia (EMQ)
const rawPhone = '+593980649007'; // Número de prueba
const cleanPhone = rawPhone.replace(/\D/g, ''); // 593980649007
const hashedPhone = hashSha256(cleanPhone);

const rawEmail = 'contacto.kindev@gmail.com';
const hashedEmail = hashSha256(rawEmail);
const hashedFirstName = hashSha256('Miyako');
const hashedCountry = hashSha256('ec');

// Identificadores de clic y navegador de Meta (fbc & fbp)
const fakeFbp = `fb.1.${Date.now()}.${Math.floor(1000000000 + Math.random() * 9000000000)}`;
const fakeFbc = `fb.1.${Date.now()}.IwAR${Math.random().toString(36).substring(2, 15)}`;
const eventId = `test_${EVENT_TYPE}_${Date.now()}`;

// 5. Construir payload oficial de Meta CAPI optimizado
const isPurchase = EVENT_TYPE === 'purchase';
const isWhatsApp = EVENT_TYPE === 'whatsapp';

const payload = {
  data: [
    {
      event_name: isPurchase ? 'Purchase' : isWhatsApp ? 'LeadSubmitted' : 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: isWhatsApp ? 'business_messaging' : 'website',
      ...(isWhatsApp ? { messaging_channel: 'whatsapp' } : {}),
      event_id: eventId,
      user_data: isWhatsApp
        ? {
            ph: [hashedPhone],
            em: [hashedEmail],
            fn: [hashedFirstName],
            country: [hashedCountry]
          }
        : {
            ph: [hashedPhone],
            em: [hashedEmail],
            fn: [hashedFirstName],
            country: [hashedCountry],
            fbc: fakeFbc,
            fbp: fakeFbp,
            client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          },
      custom_data: isPurchase
        ? {
            currency: 'USD',
            value: 120.00,
            order_id: `KD-${Date.now().toString().slice(-6)}`
          }
        : {
            service: 'Página Web Corporativa Base',
            lead_type: 'WhatsApp Direct Chat'
          },
      test_event_code: TEST_EVENT_CODE
    }
  ]
};

console.log('🚀 Enviando evento de prueba optimizado a Meta CAPI...');
console.log(`📦 Dataset ID:    ${DATASET_ID}`);
console.log(`🔑 Test Code:     ${TEST_EVENT_CODE}`);
console.log(`🎯 Evento:        ${isPurchase ? 'Purchase ($120 USD)' : 'Lead (Cliente Potencial)'}`);
console.log(`🌐 Action Source: ${isPurchase ? 'website' : 'business_messaging'}`);
console.log(`🆔 Event ID:      ${eventId}`);
console.log(`🍪 fbc & fbp:     Inyectados (Máxima coincidencia EMQ)`);

try {
  const url = `https://graph.facebook.com/v19.0/${DATASET_ID}/events?access_token=${ACCESS_TOKEN}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (response.ok) {
    console.log('\n✅ ¡ÉXITO TOTAL! Evento recibido por Meta:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n👀 Mira ahora mismo tu pestaña "Probar eventos" en Meta: ¡Debe aparecer en VERDE!');
  } else {
    console.error('\n❌ Meta devolvió un error:');
    console.error(JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('\n❌ Error de red / conexión:', error.message);
}
