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
// Ejemplo de uso: node test_event.js TEST12345
const TEST_EVENT_CODE = process.argv[2] || process.env.TEST_EVENT_CODE;

if (!TEST_EVENT_CODE) {
  console.log('\n⚠️  ATENCIÓN: No proporcionaste el código de prueba de Meta.');
  console.log('📌 Uso: node test_event.js <TU_TEST_EVENT_CODE>');
  console.log('👉 Ejemplo: node test_event.js TEST83741\n');
  process.exit(1);
}

// 3. Función para hashear datos personales (PII) en SHA-256 según el estándar de Meta
function hashSha256(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

// 4. Datos de prueba simulando un cierre de venta por WhatsApp en Ecuador
const rawPhone = '+593991952889'; // Ejemplo de teléfono
const cleanPhone = rawPhone.replace(/\D/g, ''); // 593991952889
const hashedPhone = hashSha256(cleanPhone);

const rawEmail = 'cliente.ejemplo@gmail.com';
const hashedEmail = hashSha256(rawEmail);

// 5. Construir payload oficial de Meta CAPI
const payload = {
  data: [
    {
      event_name: 'Purchase', // Evento de compra
      event_time: Math.floor(Date.now() / 1000), // Epoch timestamp actual
      action_source: 'system_generated', // Evento offline/backend
      event_id: `kindev_order_${Date.now()}`, // ID único para deduplicación
      user_data: {
        ph: [hashedPhone],
        em: [hashedEmail],
        client_user_agent: 'Kindev-Server-CAPI/1.0'
      },
      custom_data: {
        currency: 'USD',
        value: 120.00, // Monto de la venta (ej. Web Corporativa Base)
        order_id: `KD-${Date.now().toString().slice(-6)}`
      },
      test_event_code: TEST_EVENT_CODE
    }
  ]
};

console.log('🚀 Enviando evento de prueba a Meta Conversions API...');
console.log(`📦 Dataset ID: ${DATASET_ID}`);
console.log(`🔑 Test Code:  ${TEST_EVENT_CODE}`);
console.log(`💰 Valor:      $120.00 USD (Evento: Purchase)`);

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
