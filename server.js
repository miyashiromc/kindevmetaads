import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendMetaConversion, getMetaCredentials, formatPhoneNumber } from './lib/meta-capi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'leads.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper para leer la base de datos local
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = { config: { testMode: false, testEventCode: '' }, leads: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error leyendo leads.json:', err);
    return { config: { testMode: false, testEventCode: '' }, leads: [] };
  }
}

// Helper para escribir en la base de datos local
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error escribiendo leads.json:', err);
  }
}

// 1. Obtener lista de prospectos y métricas globales
app.get('/api/leads', (req, res) => {
  const db = readDb();
  const leads = db.leads || [];

  const totalLeads = leads.length;
  const closedLeads = leads.filter(l => l.status === 'cerrado').length;
  const pendingLeads = leads.filter(l => l.status !== 'cerrado' && l.status !== 'descartado').length;
  const totalRevenue = leads
    .filter(l => l.status === 'cerrado')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  res.json({
    stats: {
      totalLeads,
      closedLeads,
      pendingLeads,
      totalRevenue
    },
    config: db.config,
    leads: leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  });
});

// 2. Registrar un nuevo prospecto de WhatsApp
app.post('/api/leads', async (req, res) => {
  try {
    const { name, phone, email, notes, service, sendLeadEvent } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'El número de teléfono es obligatorio.' });
    }

    const db = readDb();
    const cleanPhone = formatPhoneNumber(phone);

    const newLead = {
      id: `kd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name?.trim() || 'Cliente WhatsApp',
      phone: cleanPhone,
      displayPhone: phone.trim(),
      email: email?.trim() || '',
      service: service || 'Web Corporativa Base ($120)',
      notes: notes?.trim() || '',
      status: 'prospecto', // 'prospecto' | 'en_negociacion' | 'cerrado' | 'descartado'
      amount: 0,
      createdAt: new Date().toISOString(),
      metaEvents: []
    };

    // Si se activó enviar evento de Lead a Meta en el registro
    if (sendLeadEvent) {
      try {
        const testCode = db.config?.testMode ? db.config?.testEventCode : undefined;
        const capiRes = await sendMetaConversion({
          eventName: 'Lead',
          phone: cleanPhone,
          email: newLead.email,
          name: newLead.name,
          testEventCode: testCode
        });

        newLead.metaEvents.push({
          eventName: 'Lead',
          date: new Date().toISOString(),
          fbtraceId: capiRes.fbtraceId,
          testMode: !!testCode
        });
      } catch (metaErr) {
        console.warn('Aviso: No se pudo despachar evento Lead inicial a Meta:', metaErr.message);
      }
    }

    db.leads.push(newLead);
    writeDb(db);

    res.status(201).json({ success: true, lead: newLead });
  } catch (error) {
    console.error('Error al crear lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Registrar una VENTA CERRADA y despachar Purchase a Meta CAPI
app.post('/api/leads/:id/sale', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    const saleAmount = Number(amount);
    if (!saleAmount || saleAmount <= 0) {
      return res.status(400).json({ error: 'El monto de la venta debe ser mayor a 0.' });
    }

    const db = readDb();
    const leadIndex = db.leads.findIndex(l => l.id === id);

    if (leadIndex === -1) {
      return res.status(404).json({ error: 'Prospecto no encontrado.' });
    }

    const lead = db.leads[leadIndex];
    lead.status = 'cerrado';
    lead.amount = saleAmount;
    lead.saleDate = new Date().toISOString();
    if (notes) lead.notes = (lead.notes ? `${lead.notes} | ` : '') + notes;

    // Despachar a Meta CAPI
    const testCode = db.config?.testMode ? db.config?.testEventCode : undefined;
    const capiResult = await sendMetaConversion({
      eventName: 'Purchase',
      phone: lead.phone,
      email: lead.email,
      name: lead.name,
      value: saleAmount,
      currency: 'USD',
      testEventCode: testCode
    });

    lead.metaEvents = lead.metaEvents || [];
    lead.metaEvents.push({
      eventName: 'Purchase',
      amount: saleAmount,
      currency: 'USD',
      date: new Date().toISOString(),
      fbtraceId: capiResult.fbtraceId,
      testMode: !!testCode
    });

    writeDb(db);

    res.json({
      success: true,
      message: `¡Venta de $${saleAmount} USD enviada exitosamente a Meta CAPI!`,
      lead,
      capiResult
    });
  } catch (error) {
    console.error('Error al registrar venta:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Cambiar estado de un prospecto
app.patch('/api/leads/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['prospecto', 'en_negociacion', 'cerrado', 'descartado'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado no válido.' });
  }

  const db = readDb();
  const lead = db.leads.find(l => l.id === id);
  if (!lead) return res.status(404).json({ error: 'Prospecto no encontrado.' });

  lead.status = status;
  writeDb(db);

  res.json({ success: true, lead });
});

// 5. Eliminar un prospecto
app.delete('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  db.leads = db.leads.filter(l => l.id !== id);
  writeDb(db);
  res.json({ success: true, message: 'Prospecto eliminado.' });
});

// 6. Obtener configuración actual
app.get('/api/config', (req, res) => {
  const db = readDb();
  const creds = getMetaCredentials();
  res.json({
    datasetId: creds.datasetId,
    hasToken: !!creds.accessToken,
    firebaseProject: 'kindevmetaads',
    config: db.config || { testMode: false, testEventCode: '' }
  });
});

// 7. Actualizar configuración (Modo Test / Código de prueba)
app.post('/api/config', (req, res) => {
  const { testMode, testEventCode } = req.body;
  const db = readDb();
  db.config = {
    testMode: !!testMode,
    testEventCode: testEventCode?.trim() || ''
  };
  writeDb(db);
  res.json({ success: true, config: db.config });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Kindev Meta Ads CAPI Dashboard en ejecución`);
  console.log(`🌐 Acceso local:   http://localhost:${PORT}`);
  console.log(`📁 Proyecto Firebase: kindevmetaads`);
  console.log(`🔑 Dataset ID:     ${getMetaCredentials().datasetId}`);
  console.log(`==================================================\n`);
});
