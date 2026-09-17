// Kindev Meta CAPI Engine — Client Application v3.0
const META_DATASET_ID = '1368429478371391';

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
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    useFirestore = true;
    console.log('✅ Firebase Firestore activo');
  }
} catch (e) {
  console.warn('Firebase no inicializado:', e);
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
// 🛡️ 1. CONTROL DE ACCESO (SECURITY GATE)
// ==========================================

function checkAuthentication() {
  const isAuth = sessionStorage.getItem('kindev_auth_session') === 'true';
  if (isAuth) {
    unlockApp();
  } else {
    lockApp();
  }
}

function unlockApp() {
  if (securityGate) securityGate.classList.add('hidden');
  if (appContainer) appContainer.classList.remove('hidden');
  ensureInitialToken();
  initDataSync();
}

function lockApp() {
  sessionStorage.removeItem('kindev_auth_session');
  if (appContainer) appContainer.classList.add('hidden');
  if (securityGate) securityGate.classList.remove('hidden');
  if (inputPin) {
    inputPin.value = '';
    inputPin.focus();
  }
  if (pinError) pinError.classList.add('hidden');
}

if (btnLockApp) {
  btnLockApp.addEventListener('click', lockApp);
}

if (pinForm) {
  pinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = (inputPin.value || '').trim();

    // Verificación directa y segura del PIN (kindev2026)
    if (entered.toLowerCase() === 'kindev2026' || entered === '2026') {
      sessionStorage.setItem('kindev_auth_session', 'true');
      if (pinError) pinError.classList.add('hidden');
      unlockApp();
      showToast('¡Bienvenido a Kindev Meta Ads!');
    } else {
      if (pinError) pinError.classList.remove('hidden');
      inputPin.value = '';
      inputPin.focus();
    }
  });
}

function ensureInitialToken() {
  if (!localStorage.getItem('kindev_meta_token')) {
    localStorage.setItem('kindev_meta_token', 'EAAPkgvHBCxEBSoXtA0OwkEVoNIaZCjVsz77WQxWTsbo9cTMRCuhDIO6cF5Fe40fPi4jxrRF0nfFFSLumbTfumZCPGq4hO1C6KwldQESlPPUdqyZA5Dc6SLZCRVL2QY9ZB9aybQ0xTlYWrimR7lxQqGXFig1Qrb5lBv1ZCZCZCA24e4eotiELUVuvwIzJuYMyXAZDZD');
  }
  if (inputMetaToken) {
    inputMetaToken.value = localStorage.getItem('kindev_meta_token') || '';
  }
}

if (btnToggleToken) {
  btnToggleToken.addEventListener('click', () => {
    if (inputMetaToken.type === 'password') {
      inputMetaToken.type = 'text';
      btnToggleToken.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
      inputMetaToken.type = 'password';
      btnToggleToken.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
  });
}

// ==========================================
// 🛡️ 2. MOTOR CRIPTOGRÁFICO SHA-256 (NATIVO CON FALLBACK)
// ==========================================

async function hashSha256(value) {
  if (!value) return null;
  const clean = value.toString().trim().toLowerCase();

  // Si window.crypto.subtle está disponible (HTTPS estándar)
  if (window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(clean);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      console.warn('Fallback a sha256 manual:', err);
    }
  }

  // Fallback JS puro para SHA-256 (garantiza compatibilidad total)
  return sha256Fallback(clean);
}

// Algoritmo SHA-256 estándar embebido
function sha256Fallback(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var result = '';
  var words = [];
  var asciiBitLength = ascii[lengthProperty] * 8;
  var hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  var k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  var isCompound = {};
  for (i = 0; i < asciiBitLength; i += 8) {
    words[i >> 5] |= (ascii.charCodeAt(i / 8) & 0xff) << (24 - (i % 32));
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;
  for (i = 0; i < words[lengthProperty]; i += 16) {
    var w = words.slice(i, i + 16);
    var oldHash = hash.slice(0);
    for (j = 0; j < 64; j++) {
      var w15 = w[j - 15], w2 = w[j - 2];
      var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[j] = j < 16 ? w[j] : (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      var s1h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      var temp1 = (hash[7] + s1h + ch + k[j] + w[j]) | 0;
      var s0h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      var temp2 = (s0h + maj) | 0;
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }
    for (j = 0; j < 8; j++) hash[j] = (hash[j] + oldHash[j]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      var b = (hash[i] >> (8 * j)) & 0xff;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

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

// ==========================================
// 🛡️ 3. DESPACHADOR META CAPI
// ==========================================

async function dispatchMetaCAPI({ eventName, phone, email, name, value = 0 }) {
  const token = localStorage.getItem('kindev_meta_token');
  if (!token) {
    throw new Error('No hay Token de Meta CAPI configurado.');
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
// 🛡️ 4. DATOS Y RENDERIZADO
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

  if (statRevenue) statRevenue.textContent = `$${totalRevenue.toFixed(2)}`;
  if (statClosed) statClosed.textContent = closedLeads;
  if (statPending) statPending.textContent = pendingLeads;
  if (statTotal) statTotal.textContent = totalLeads;
  if (leadCountBadge) leadCountBadge.textContent = totalLeads;

  renderLeads(leads);
}

function renderLeads(leads) {
  if (!leadsList) return;

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

window.openSaleModal = function(id, name, phone) {
  currentLeadIdForSale = id;
  if (modalClientName) modalClientName.textContent = name;
  if (modalClientPhone) modalClientPhone.textContent = `+${phone}`;
  if (inputCustomAmount) inputCustomAmount.value = '120.00';

  document.querySelectorAll('.btn-preset').forEach(b => {
    b.classList.toggle('active', b.dataset.amount === '120');
  });

  if (modalSale) modalSale.classList.remove('hidden');
};

if (btnCloseModal) {
  btnCloseModal.addEventListener('click', () => {
    if (modalSale) modalSale.classList.add('hidden');
    currentLeadIdForSale = null;
  });
}

document.querySelectorAll('.btn-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (inputCustomAmount) inputCustomAmount.value = Number(btn.dataset.amount).toFixed(2);
  });
});

if (inputCustomAmount) {
  inputCustomAmount.addEventListener('input', () => {
    document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
  });
}

if (btnConfirmSale) {
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

      if (modalSale) modalSale.classList.add('hidden');
      showToast(`¡Venta de $${amount} USD registrada y enviada a Meta!`);
    } catch (err) {
      console.error('Error registrando venta:', err);
      showToast(err.message || 'Error al despachar a Meta', false);
    } finally {
      btnConfirmSale.disabled = false;
      btnConfirmSale.innerHTML = originalContent;
    }
  });
}

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

const newLeadForm = document.getElementById('newLeadForm');
if (newLeadForm) {
  newLeadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = (document.getElementById('inputName').value || '').trim();
    const rawPhone = (document.getElementById('inputPhone').value || '').trim();
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

      newLeadForm.reset();
      showToast('¡Lead guardado con éxito!');
    } catch (err) {
      showToast('Error al guardar lead', false);
    }
  });
}

if (btnOpenConfig) {
  btnOpenConfig.addEventListener('click', () => {
    if (checkTestMode) checkTestMode.checked = !!currentConfig.testMode;
    if (inputTestCode) inputTestCode.value = currentConfig.testEventCode || '';
    if (inputMetaToken) inputMetaToken.value = localStorage.getItem('kindev_meta_token') || '';
    if (modalConfig) modalConfig.classList.remove('hidden');
  });
}

if (btnCloseConfig) {
  btnCloseConfig.addEventListener('click', () => {
    if (modalConfig) modalConfig.classList.add('hidden');
  });
}

if (btnSaveConfig) {
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
      if (modalConfig) modalConfig.classList.add('hidden');
      showToast('Configuración guardada');
    } catch (err) {
      showToast('Error al guardar configuración', false);
    }
  });
}

function updateConfigBadge() {
  if (!configModeBadge) return;
  if (currentConfig.testMode) {
    configModeBadge.textContent = `Prueba (${currentConfig.testEventCode || 'TEST'})`;
    configModeBadge.parentElement.className = 'text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30';
  } else {
    configModeBadge.textContent = 'Modo Producción';
    configModeBadge.parentElement.className = 'text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
  }
}

if (btnRefresh) {
  btnRefresh.addEventListener('click', () => {
    if (useFirestore) {
      showToast('Sincronizado en tiempo real');
    } else {
      loadLeadsFromLocalApi();
    }
  });
}

function showToast(msg, isSuccess = true) {
  if (!toast || !toastMsg || !toastIcon) return;
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

// Iniciar verificación
checkAuthentication();
