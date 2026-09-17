import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'kindev_meta_webhook_2026';
const FIRESTORE_REST_URL = 'https://firestore.googleapis.com/v1/projects/kindevmetaads/databases/(default)/documents/leads';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Helper para formatear celular ecuatoriano
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

// 1. Verificación de Webhook para Meta (Facebook Developers)
app.get('/api/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook de Meta verificado con éxito!');
    return res.status(200).send(challenge);
  }
  console.warn('❌ Intento fallido de verificación de Webhook:', { mode, token });
  return res.sendStatus(403);
});

// 2. Ingesta de Mensajes de WhatsApp (Meta Cloud API o Formato Universal)
app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    const body = req.body;
    let senderName = 'Cliente WhatsApp';
    let rawPhone = '';
    let messageText = '';

    // Caso A: Formato Oficial de Meta WhatsApp Cloud API
    if (body.entry && body.entry[0]?.changes && body.entry[0]?.changes[0]?.value) {
      const changeVal = body.entry[0].changes[0].value;
      const contact = changeVal.contacts?.[0];
      const message = changeVal.messages?.[0];

      if (!message) {
        // Notificación de estado (delivered, read, etc.), responder 200 OK
        return res.status(200).json({ status: 'ignored_status_update' });
      }

      senderName = contact?.profile?.name || 'Cliente WhatsApp';
      rawPhone = message?.from || '';
      messageText = message?.text?.body || message?.type || 'Mensaje de WhatsApp';
    } 
    // Caso B: Formato Universal (Zapier, Make, ManyChat, QR Gateways)
    else if (body.phone || body.from) {
      rawPhone = body.phone || body.from;
      senderName = body.name || body.sender || 'Cliente WhatsApp';
      messageText = body.message || body.text || '';
    } else {
      return res.status(400).json({ error: 'Formato de payload no reconocido' });
    }

    const phone = cleanPhone(rawPhone);
    if (!phone) {
      return res.status(400).json({ error: 'Número de teléfono no válido' });
    }

    // Insertar en Cloud Firestore vía REST API
    const firestorePayload = {
      fields: {
        name: { stringValue: senderName },
        phone: { stringValue: phone },
        displayPhone: { stringValue: rawPhone },
        service: { stringValue: 'Contacto Inicial WhatsApp' },
        notes: { stringValue: messageText ? `Mensaje: "${messageText}"` : 'Auto-registrado desde WhatsApp' },
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

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error insertando en Firestore REST:', errText);
      return res.status(500).json({ error: 'Error guardando en Firestore', detail: errText });
    }

    const docResult = await response.json();
    console.log(`⚡ Lead auto-capturado con éxito: ${senderName} (${phone})`);

    return res.status(200).json({
      status: 'success',
      lead: {
        name: senderName,
        phone,
        docName: docResult.name
      }
    });

  } catch (err) {
    console.error('Error en /api/webhook/whatsapp:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Redirigir cualquier otra ruta a la SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor CAPI & Webhook activo en puerto ${PORT}`);
});
