// Kindev Meta CAPI Engine — Hardened Production Client
const META_DATASET_ID = '1368429478371391';
const DEFAULT_PIN_HASH = '1c024acfc5d190e1a2beaa95444bc4c47c3c720ee404eb56cdb1dd5fcd630690'; // SHA-256 de 'kindev2026'

// Configuración de Firebase para kindevmetaads
const firebaseConfig = {
  projectId: "kindevmetaads",
  appId: "1:180204990500:web:1275e0b3070d8583b328b1",
  storageBucket: "kindevmetaads.firebasestorage.app",
  apiKey: "AIzaSyDXrSYbXOKVeTabU-YVj0xcQLG0nlPbLoI",
  authDomain: "kindevmetaads.firebaseapp.com",
  messagingSenderId: "180204990500"
};

let db = null;
let useFirestore = false;

try {
  if (window.firebase) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    useFirestore = true;
  }
} catch (e) {
  console.warn('Firebase directo no disponible:', e);
}

// Elementos de Seguridad
const securityGate = document.getElementById('securityGate');
const appContainer = document.getElementById('appContainer');
const pinForm = document.getElementById('pinForm');
const inputPin = document.getElementById('inputPin');
const pinError = document.getElementById('pinError');
const btnLockApp = document.getElementById('btnLockApp');

// Elementos Principales
const leadsList = document.getElementById('leadsList');
const leadCountBadge = document.getElementById('leadCountBadge');
const statRevenue = document.getElementById('statRevenue');
const statClosed = document.getElementById('statClosed');
const statPending = document.getElementById('statPending');
const statTotal = document.getElementById('statTotal');
const configModeBadge = document.getElementById('configModeBadge');

// Elementos Modal Venta
const modalSale = document.getElementById('modalSale');
const modalClientName = document.getElementById('modalClientName');
const modalClientPhone = document.getElementById('modalClientPhone');
const inputCustomAmount = document.getElementById('inputCustomAmount');
const btnConfirmSale = document.getElementById('btnConfirmSale');
const btnCloseModal = document.getElementById('btnCloseModal');

// Elementos Config Modal
const modalConfig = document.getElementById('modalConfig');
const btnCloseConfig = document.getElementById('btnCloseConfig');
const btnOpenConfig = document.getElementById('btnOpenConfig');
const checkTestMode = document.getElementById('checkTestMode');
const inputTestCode = document.getElementById('inputTestCode');
const inputMetaToken = document.getElementById('inputMetaToken');
const btnToggleToken = document.getElementById('btnToggleToken');
const btnSaveConfig = document.getElementById('btnSaveConfig');
const btnRefresh = document.getElementById('btnRefresh');

// Toast
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const toastIcon = document.getElementById('toastIcon');

let currentLeadIdForSale = null;
let currentConfig = { testMode: false, testEventCode: '' };
let localLeads = [];

// ==========================================
// 🛡️ CAPA 1: CONTROL DE ACCESO (SECURITY GATE)
// ==========================================

async function hashSha256(value) {
  if (!value) return null;
  const clean = value.toString().trim().toLowerCase();
  const msgBuffer = new TextEncoder().encode(clean);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkAuthentication() {
  const isAuth = sessionStorage.getItem('kindev_auth_session') === 'true';
  if (isAuth) {
    unlockApp();
  } else {
    lockApp();
  }
}

function unlockApp() {
  securityGate.classList.add('hidden');
  appContainer.classList.remove('hidden');
  ensureInitialToken();
  initDataSync();
}

function lockApp() {
  sessionStorage.removeItem('kindev_auth_session');
  appContainer.classList.add('hidden');
  securityGate.classList.remove('hidden');
  inputPin.value = '';
  pinError.classList.add('hidden');
  inputPin.focus();
}

btnLockApp.addEventListener('click', lockApp);

pinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const enteredPin = inputPin.value.trim();
  const enteredHash = await hashSha256(enteredPin);

  const customPinHash = localStorage.getItem('kindev_pin_hash') || DEFAULT_PIN_HASH;

  if (enteredHash === customPinHash) {
    sessionStorage.setItem('kindev_auth_session', 'true');
    pinError.classList.add('hidden');
    unlockApp();
  } else {
    pinError.classList.remove('hidden');
    inputPin.value = '';
    inputPin.focus();
  }
});

// Inicialización segura del token en almacenamiento privado local
function ensureInitialToken() {
  if (!localStorage.getItem('kindev_meta_token')) {
    // Almacena el token de Meta de forma privada en el almacenamiento local del dispositivo autenticado
    localStorage.setItem('kindev_meta_token', 'EAAPkgvHBCxEBSoXtA0OwkEVoNIaZCjVsz77WQxWTsbo9cTMRCuhDIO6cF5Fe40fPi4jxrRF0nfFFSLumbTfumZCPGq4hO1C6KwldQESlPPUdqyZA5Dc6SLZCRVL2QY9ZB9aybQ0xTlYWrimR7lxQqGXFig1Qrb5lBv1ZCZCZCA24e4eotiELUVuvwIzJuYMyXAZDZD');
  }
  inputMetaToken.value = localStorage.getItem('kindev_meta_token') || '';
}

btnToggleToken.addEventListener('click', () => {
  if (inputMetaToken.type === 'password') {
    inputMetaToken.type = 'text';
    btnToggleToken.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
  } else {
    inputMetaToken.type = 'password';
    btnToggleToken.innerHTML = '<i class="fa-solid fa-eye"></i>';
  }
});

// ==========================================
// 🛡️ CAPA 2: MOTOR CRIPTOGRÁFICO META CAPI
// ==========================================

function formatPhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let phone = rawPhone.toString().replace(/\D/g, '');
  if (phone.startsWith('09') && phone.length === 10) {
    phone = '593' + phone.slice(1);
  } else if (phone.length === 9 && phone.startsWith('9')) {
    phone = '593' + phone;
  }
  return phone;
}

async function dispatchMetaCAPI({ eventName, phone, email, name, value = 0 }) {
  const token = localStorage.getItem('kindev_meta_token');
  if (!token) {
    throw new Error('No hay Token de Meta CAPI configurado en este navegador.');
  }

  const cleanPhone = formatPhoneNumber(phone);
  const hashedPhone = cleanPhone ? await hashSha256(cleanPhone) : null;
  const hashedEmail = email ? await hashSha256(email) : null;
  const hashedName = name ? await hashSha256(name.split(' ')[0]) : null;

  const resolvedEventId = `kd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'system_generated',
    event_id: resolvedEventId,
    user_data: {
      ...(hashedPhone ? { ph: [hashedPhone] } : {}),
      ...(hashedEmail ? { em: [hashedEmail] } : {}),
      ...(hashedName ? { fn: [hashedName] } : {}),
      client_user_agent: 'Kindev-Secure-Engine/2026'
    }
  };

  if (eventName === 'Purchase' || value > 0) {
    eventData.custom_data = {
      currency: 'USD',
      value: Number(value).toFixed(2),
      order_id: resolvedEventId
    };
  }

  if (currentConfig.testMode && currentConfig.testEventCode) {
    eventData.test_event_code = currentConfig.testEventCode.trim();
  }

  const url = `https://graph.facebook.com/v19.0/${META_DATASET_ID}/events?access_token=${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [eventData] })
  });

  const resData = await res.json();
  if (!res.ok) {
    throw new Error(resData?.error?.message || 'Error en Meta CAPI');
  }

  return {
    eventsReceived: resData.events_received,
    fbtraceId: resData.fbtrace_id,
    eventId: resolvedEventId
  };
}

// ==========================================
// 🛡️ CAPA 3: SINCRONIZACIÓN Y PRESENTACIÓN
// ==========================================

function initDataSync() {
  if (useFirestore && db) {
    db.collection('settings').doc('meta_config').onSnapshot(doc => {
      if (doc.exists) {
        currentConfig = doc.data();
        updateConfigBadge();
      }
    });

    db.collection('leads').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
      localLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateStatsAndRender(localLeads);
    }, err => {
      console.warn('Fallback a API local tras error Firestore:', err);
      loadLeadsFromLocalApi();
    });
  } else {
    loadLeadsFromLocalApi();
  }
}

async function loadLeadsFromLocalApi() {
  try {
    const res = await fetch('/api/leads');
    const data = await res.json();
    currentConfig = data.config || currentConfig;
    updateConfigBadge();
    localLeads = data.leads || [];
    updateStatsAndRender(localLeads);
  } catch (e) {
    console.error('Error cargando leads:', e);
  }
}

function updateStatsAndRender(leads) {
  const totalLeads = leads.length;
  const closedLeads = leads.filter(l => l.status === 'cerrado').length;
  const pendingLeads = leads.filter(l => l.status !== 'cerrado' && l.status !== 'descartado').length;
  const totalRevenue = leads
    .filter(l => l.status === 'cerrado')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  statRevenue.textContent = `$${totalRevenue.toFixed(2)}`;
  statClosed.textContent = closedLeads;
  statPending.textContent = pendingLeads;
  statTotal.textContent = totalLeads;
  leadCountBadge.textContent = totalLeads;

  renderLeads(leads);
}

function renderLeads(leads) {
  if (!leads || leads.length === 0) {
    leadsList.innerHTML = `
      <div class="p-8 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-zinc-500">
        <i class="fa-solid fa-inbox text-3xl mb-2 text-zinc-600"></i>
        <p class="text-sm font-medium text-zinc-400">Aún no hay clientes registrados</p>
        <p class="text-xs text-zinc-600 mt-1">Registra tu primer prospecto de WhatsApp usando el formulario superior.</p>
      </div>
    `;
    return;
  }

  leadsList.innerHTML = leads.map(lead => {
    const isClosed = lead.status === 'cerrado';
    const waLink = `https://wa.me/${lead.phone}`;

    let statusBadge = '';
    if (isClosed) {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"><i class="fa-solid fa-check"></i> Cerrado ($${Number(lead.amount).toFixed(2)})</span>`;
    } else if (lead.status === 'en_negociacion') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5"><i class="fa-solid fa-clock"></i> En Negociación</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center gap-1.5"><i class="fa-solid fa-user"></i> Prospecto</span>`;
    }

    const metaBadges = (lead.metaEvents || []).map(evt => `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 text-cyan-300 border border-zinc-700/50" title="fbtrace_id: ${escapeHtml(evt.fbtraceId || 'N/A')}">
        <i class="fa-brands fa-meta text-cyan-400"></i> ${escapeHtml(evt.eventName)} ${evt.amount ? `($${Number(evt.amount).toFixed(2)})` : ''}
      </span>
    `).join(' ');

    return `
      <div class="p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div class="space-y-1.5 flex-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h4 class="font-bold text-white text-base">${escapeHtml(lead.name)}</h4>
            ${statusBadge}
          </div>

          <div class="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline">
              <i class="fa-brands fa-whatsapp"></i> +${escapeHtml(lead.phone)}
            </a>
            <span>•</span>
            <span class="text-zinc-300">${escapeHtml(lead.service || 'Servicio')}</span>
            <span>•</span>
            <span class="text-zinc-500 text-[11px]">${formatDate(lead.createdAt)}</span>
          </div>

          ${lead.notes ? `<p class="text-xs text-zinc-400 italic bg-zinc-950/60 px-2.5 py-1 rounded-lg border border-zinc-800/60 inline-block">${escapeHtml(lead.notes)}</p>` : ''}
          ${metaBadges ? `<div class="pt-1 flex items-center gap-1.5 flex-wrap">${metaBadges}</div>` : ''}
        </div>

        <div class="flex items-center gap-2 self-end md:self-center">
          ${!isClosed ? `
            <button onclick="openSaleModal('${escapeJs(lead.id)}', '${escapeJs(lead.name)}', '${escapeJs(lead.phone)}')"
                    class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5">
              <i class="fa-solid fa-dollar-sign"></i>
              <span>Cerrar Venta</span>
            </button>
          ` : `
            <button onclick="openSaleModal('${escapeJs(lead.id)}', '${escapeJs(lead.name)}', '${escapeJs(lead.phone)}')"
                    class="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors flex items-center gap-1.5">
              <i class="fa-solid fa-plus"></i>
              <span>Re-facturar</span>
            </button>
          `}

          <select onchange="updateLeadStatus('${escapeJs(lead.id)}', this.value)" class="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-zinc-600">
            <option value="prospecto" ${lead.status === 'prospecto' ? 'selected' : ''}>Prospecto</option>
            <option value="en_negociacion" ${lead.status === 'en_negociacion' ? 'selected' : ''}>Negociación</option>
            <option value="cerrado" ${lead.status === 'cerrado' ? 'selected' : ''}>Cerrado</option>
            <option value="descartado" ${lead.status === 'descartado' ? 'selected' : ''}>Descartado</option>
          </select>

          <button onclick="deleteLead('${escapeJs(lead.id)}')" class="w-8 h-8 rounded-xl bg-zinc-950 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 border border-zinc-800 transition-colors flex items-center justify-center text-xs" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Ventas
window.openSaleModal = function(id, name, phone) {
  currentLeadIdForSale = id;
  modalClientName.textContent = name;
  modalClientPhone.textContent = `+${phone}`;
  inputCustomAmount.value = '120.00';

  document.querySelectorAll('.btn-preset').forEach(b => {
    b.classList.toggle('active', b.dataset.amount === '120');
  });

  modalSale.classList.remove('hidden');
};

btnCloseModal.addEventListener('click', () => {
  modalSale.classList.add('hidden');
  currentLeadIdForSale = null;
});

document.querySelectorAll('.btn-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    inputCustomAmount.value = Number(btn.dataset.amount).toFixed(2);
  });
});

inputCustomAmount.addEventListener('input', () => {
  document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
});

btnConfirmSale.addEventListener('click', async () => {
  if (!currentLeadIdForSale) return;

  const amount = Number(inputCustomAmount.value);
  if (!amount || amount <= 0) {
    showToast('Ingresa un monto válido', false);
    return;
  }

  const lead = localLeads.find(l => l.id === currentLeadIdForSale);
  if (!lead) return;

  const originalContent = btnConfirmSale.innerHTML;
  btnConfirmSale.disabled = true;
  btnConfirmSale.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando a Meta CAPI...`;

  try {
    const capiResult = await dispatchMetaCAPI({
      eventName: 'Purchase',
      phone: lead.phone,
      name: lead.name,
      email: lead.email,
      value: amount
    });

    const newEvent = {
      eventName: 'Purchase',
      amount: amount,
      currency: 'USD',
      date: new Date().toISOString(),
      fbtraceId: capiResult.fbtraceId,
      testMode: !!currentConfig.testMode
    };

    if (useFirestore && db) {
      await db.collection('leads').doc(currentLeadIdForSale).update({
        status: 'cerrado',
        amount: amount,
        saleDate: new Date().toISOString(),
        metaEvents: firebase.firestore.FieldValue.arrayUnion(newEvent)
      });
    } else {
      await fetch(`/api/leads/${currentLeadIdForSale}/sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
    }

    modalSale.classList.add('hidden');
    showToast(`¡Venta de $${amount} USD registrada y enviada a Meta!`);
  } catch (err) {
    console.error('Error registrando venta:', err);
    showToast(err.message || 'Error al despachar a Meta', false);
  } finally {
    btnConfirmSale.disabled = false;
    btnConfirmSale.innerHTML = originalContent;
  }
});

// Cambiar estado
window.updateLeadStatus = async function(id, status) {
  try {
    if (useFirestore && db) {
      await db.collection('leads').doc(id).update({ status });
    } else {
      await fetch(`/api/leads/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      loadLeadsFromLocalApi();
    }
    showToast('Estado actualizado');
  } catch (err) {
    showToast('Error al actualizar estado', false);
  }
};

// Eliminar Lead
window.deleteLead = async function(id) {
  if (!confirm('¿Deseas eliminar este prospecto?')) return;
  try {
    if (useFirestore && db) {
      await db.collection('leads').doc(id).delete();
    } else {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      loadLeadsFromLocalApi();
    }
    showToast('Prospecto eliminado');
  } catch (err) {
    showToast('Error al eliminar', false);
  }
};

// Nuevo Lead
document.getElementById('newLeadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('inputName').value.trim();
  const rawPhone = document.getElementById('inputPhone').value.trim();
  const service = document.getElementById('inputService').value;
  const cleanPhone = formatPhoneNumber(rawPhone);

  if (!cleanPhone) {
    showToast('Número de teléfono no válido', false);
    return;
  }

  try {
    let metaEvent = null;
    try {
      const capiRes = await dispatchMetaCAPI({
        eventName: 'Lead',
        phone: cleanPhone,
        name: name
      });
      metaEvent = {
        eventName: 'Lead',
        date: new Date().toISOString(),
        fbtraceId: capiRes.fbtraceId,
        testMode: !!currentConfig.testMode
      };
    } catch (metaErr) {
      console.warn('Aviso Meta CAPI:', metaErr);
    }

    const newLeadData = {
      name: name || 'Cliente WhatsApp',
      phone: cleanPhone,
      displayPhone: rawPhone,
      service: service,
      status: 'prospecto',
      amount: 0,
      createdAt: new Date().toISOString(),
      metaEvents: metaEvent ? [metaEvent] : []
    };

    if (useFirestore && db) {
      await db.collection('leads').add(newLeadData);
    } else {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLeadData, sendLeadEvent: false })
      });
      loadLeadsFromLocalApi();
    }

    document.getElementById('newLeadForm').reset();
    showToast('¡Lead guardado con éxito!');
  } catch (err) {
    showToast('Error al guardar lead', false);
  }
});

// Config Modal
btnOpenConfig.addEventListener('click', () => {
  checkTestMode.checked = !!currentConfig.testMode;
  inputTestCode.value = currentConfig.testEventCode || '';
  inputMetaToken.value = localStorage.getItem('kindev_meta_token') || '';
  modalConfig.classList.remove('hidden');
});

btnCloseConfig.addEventListener('click', () => {
  modalConfig.classList.add('hidden');
});

btnSaveConfig.addEventListener('click', async () => {
  const newConfig = {
    testMode: checkTestMode.checked,
    testEventCode: inputTestCode.value.trim()
  };

  const updatedToken = inputMetaToken.value.trim();
  if (updatedToken) {
    localStorage.setItem('kindev_meta_token', updatedToken);
  }

  try {
    if (useFirestore && db) {
      await db.collection('settings').doc('meta_config').set(newConfig);
    } else {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    }

    currentConfig = newConfig;
    updateConfigBadge();
    modalConfig.classList.add('hidden');
    showToast('Configuración y credenciales guardadas');
  } catch (err) {
    showToast('Error al guardar configuración', false);
  }
});

function updateConfigBadge() {
  if (currentConfig.testMode) {
    configModeBadge.textContent = `Prueba (${currentConfig.testEventCode || 'TEST'})`;
    configModeBadge.parentElement.className = 'text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30';
  } else {
    configModeBadge.textContent = 'Modo Producción';
    configModeBadge.parentElement.className = 'text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
  }
}

btnRefresh.addEventListener('click', () => {
  if (useFirestore) {
    showToast('Sincronizado en tiempo real');
  } else {
    loadLeadsFromLocalApi();
  }
});

function showToast(msg, isSuccess = true) {
  toastMsg.textContent = msg;
  toastIcon.className = isSuccess
    ? 'fa-solid fa-circle-check text-emerald-400 text-base'
    : 'fa-solid fa-triangle-exclamation text-rose-400 text-base';
  toast.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

function escapeJs(str) {
  if (!str) return '';
  return str.toString().replace(/'/g, "\\'");
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Verificar autenticación al arrancar
checkAuthentication();
