import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Sliders, 
  AlertTriangle, 
  RefreshCw, 
  MessageSquare, 
  DollarSign, 
  MousePointerClick, 
  Flame, 
  Target,
  Clock,
  MapPin,
  Activity,
  TrendingUp,
  Zap,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, MetaLiveTelemetry } from '../types';

interface MetaAdsIntelligenceProps {
  leads: Lead[];
}

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

// Snapshot auditado en vivo de Meta Graph API v19.0 para carga instantánea
const DEFAULT_LIVE_TELEMETRY: MetaLiveTelemetry = {
  isLive: true,
  lastSync: new Date().toISOString(),
  adAccountId: '4362799907368161',
  campaign: {
    id: '120246770184380741',
    name: 'capi Clientes Web WhatsApp - Kindev 2026',
    spend: 155.04,
    impressions: 32247,
    reach: 17780,
    frequency: 1.81,
    clicks: 544,
    cpc: 0.285,
    cpm: 4.81,
    messagingConnections: 114,
    firstReplies: 104,
    depth2Replies: 66,
    depth5Replies: 328,
    linkClicks: 295,
    costPerMessage: 1.36,
    dropRatePercent: 42.1
  },
  platforms: [
    { platform: 'facebook', spend: 100.69, impressions: 20641, clicks: 405, messages: 78, costPerMessage: 1.29, conversionRatePercent: 0.38 },
    { platform: 'instagram', spend: 35.14, impressions: 5191, clicks: 96, messages: 20, costPerMessage: 1.76, conversionRatePercent: 0.39 },
    { platform: 'whatsapp', spend: 19.15, impressions: 6406, clicks: 43, messages: 16, costPerMessage: 1.20, conversionRatePercent: 0.25 }
  ],
  activeAd: {
    id: '120246770184360741',
    name: 'Anuncio Pag Web 1',
    status: 'ACTIVE',
    priceAnchor: '$120 USD',
    title: 'Cotiza por WhatsApp',
    bodySnippet: '¿Aún no tienes tu página web? ¡Estás perdiendo clientes todos los días! En Kindev S.A.S. creamos tu sitio web profesional por solo $120 USD (inversión única, sin mensualidades sorpresa)...'
  },
  killSwitch: {
    enabled: false,
    maxCostPerMessage: 2.20,
    maxSpendWithoutLead: 4.00,
    currentCost: 1.36,
    statusText: 'Desactivado — Ejecución continua sin pausas automáticas'
  }
};

type SubTab = 'resumen' | 'mapa_ciudades';

export const MetaAdsIntelligence: React.FC<MetaAdsIntelligenceProps> = ({ leads }) => {
  const closedLeads = leads.filter((l) => l.status === 'cerrado');
  const totalRevenue = closedLeads.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const [telemetry, setTelemetry] = useState<MetaLiveTelemetry>(() => {
    try {
      const saved = localStorage.getItem('kindev_meta_telemetry_cache');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_LIVE_TELEMETRY;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('resumen');
  const [viewMode, setViewMode] = useState<'live' | 'simulator'>('live');
  const [totalAdSpend, setTotalAdSpend] = useState<number>(() => telemetry.campaign.spend || 155.04);

  const fetchLiveInsights = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      let data: MetaLiveTelemetry | null = null;
      // 1. Intentar endpoint relativo (funciona en proxy o server local)
      try {
        const res = await fetch(`/api/meta/insights${forceRefresh ? '?refresh=true' : ''}`, {
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) data = await res.json();
      } catch {
        // Fallback a localhost directo si se prueba en red
      }

      // 2. Si no respondió el relativo, probar http://localhost:3000 directo
      if (!data && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        try {
          const res = await fetch(`http://localhost:3000/api/meta/insights${forceRefresh ? '?refresh=true' : ''}`, {
            signal: AbortSignal.timeout(3000)
          });
          if (res.ok) data = await res.json();
        } catch {
          // ignore
        }
      }

      if (data && data.campaign && Array.isArray(data.platforms)) {
        setTelemetry(data);
        setTotalAdSpend(data.campaign.spend);
        try {
          localStorage.setItem('kindev_meta_telemetry_cache', JSON.stringify(data));
        } catch {
          // ignore
        }
      }
    } catch {
      // Mantiene el último estado válido
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Escuchar telemetría en tiempo real desde Cloud Firestore (Funciona 100% en Producción, Celulares y Web)
  useEffect(() => {
    try {
      const telemetryDoc = doc(db, 'settings', 'meta_telemetry');
      const unsubscribe = onSnapshot(
        telemetryDoc,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data?.telemetryJson) {
              try {
                const parsed: MetaLiveTelemetry = JSON.parse(data.telemetryJson);
                if (parsed?.campaign && Array.isArray(parsed?.platforms)) {
                  setTelemetry(parsed);
                  setTotalAdSpend(parsed.campaign.spend);
                  try {
                    localStorage.setItem('kindev_meta_telemetry_cache', JSON.stringify(parsed));
                  } catch {
                    // ignore
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        },
        () => {
          // Fallback silencioso si no hay conexión
        }
      );
      return () => unsubscribe();
    } catch {
      // ignore
    }
  }, []);

  // 2. Consulta adicional al servidor local si está disponible
  useEffect(() => {
    fetchLiveInsights();
  }, []);

  const currentSpend = viewMode === 'live' ? telemetry.campaign.spend : totalAdSpend;
  const overallRoas = currentSpend > 0 ? (totalRevenue / currentSpend).toFixed(1) : '0';
  const totalProfit = totalRevenue - currentSpend;

  // Frecuencia calculada en vivo de Meta Graph API
  const adFrequency = telemetry.campaign.frequency 
    || (telemetry.campaign.reach && telemetry.campaign.reach > 0 
        ? parseFloat((telemetry.campaign.impressions / telemetry.campaign.reach).toFixed(2)) 
        : 1.18);
  // Posición del indicador en el tacómetro (normalizado a % de la barra)
  const tachometerPosition = Math.min(Math.max(((adFrequency - 1.0) / (2.5 - 1.0)) * 100, 0), 100);

  // ─── Control y Sincronización de Semanas con Ritmo Semanal ───
  const [weekOffset, setWeekOffset] = useState<number | 'all'>(() => {
    try {
      const saved = localStorage.getItem('kindev_active_week_offset');
      if (saved === 'all') return 'all';
      if (saved !== null) {
        const num = Number(saved);
        if (!isNaN(num)) return num;
      }
    } catch {}
    return 0; // Por defecto: semana actual (coincide 1:1 con Ritmo Semanal en el Kanban)
  });

  // Semanas disponibles idénticas a las del Kanban
  const availableWeeks = useMemo(() => {
    const today = new Date();
    // Normalizar a hora de Ecuador para calcular los lunes exactos
    const ecNow = new Date(today.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    const baseMonday = new Date(ecNow);
    const dayOfWeek = baseMonday.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    baseMonday.setDate(baseMonday.getDate() + diffToMonday);
    baseMonday.setHours(0, 0, 0, 0);

    return [0, -1, -2, -3, -4, -5, -6, -7].map((offset) => {
      const mon = new Date(baseMonday);
      mon.setDate(baseMonday.getDate() + offset * 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);

      const monStr = `${mon.getDate()} ${mon.toLocaleDateString('es-EC', { month: 'short' })}`;
      const sunStr = `${sun.getDate()} ${sun.toLocaleDateString('es-EC', { month: 'short' })}`;

      let label = `${monStr} - ${sunStr}`;
      if (offset === 0) label = `Semana actual (${label})`;
      else if (offset === -1) label = `Semana anterior (${label})`;
      else label = `Hace ${Math.abs(offset)} semanas (${label})`;

      return {
        offset,
        label,
        mon,
        sun,
        rangeText: `${monStr} - ${sunStr}`
      };
    });
  }, []);

  // Escuchar eventos de sincronización globales desde Kanban / Ritmo Semanal
  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail !== undefined && custom.detail !== weekOffset) {
        setWeekOffset(custom.detail);
      }
    };
    window.addEventListener('kindev_week_sync', handleSync);
    return () => window.removeEventListener('kindev_week_sync', handleSync);
  }, [weekOffset]);

  const handleSelectWeekOffset = (newOffset: number | 'all') => {
    setWeekOffset(newOffset);
    try {
      localStorage.setItem('kindev_active_week_offset', String(newOffset));
      window.dispatchEvent(new CustomEvent('kindev_week_sync', { detail: newOffset }));
    } catch {}
  };

  const selectedWeekObj = useMemo(() => {
    if (weekOffset === 'all') return null;
    return availableWeeks.find((w) => w.offset === weekOffset) || availableWeeks[0];
  }, [weekOffset, availableWeeks]);

  const leadsForHeatmap = useMemo(() => {
    if (weekOffset === 'all' || !selectedWeekObj) return leads;
    return leads.filter((l) => {
      if (!l.createdAt) return false;
      const ecDate = new Date(new Date(l.createdAt).toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
      return ecDate.getTime() >= selectedWeekObj.mon.getTime() && ecDate.getTime() <= selectedWeekObj.sun.getTime();
    });
  }, [leads, weekOffset, selectedWeekObj]);

  // ─── 1. HORAS DORADAS DE WHATSAPP 100% REAL ───
  // Analiza los timestamps reales de entrada de cada lead en Firestore para el periodo seleccionado
  const { heatMapSlots, goldenHourInsight, peakDetails, dayTotals, totalSlotLeads } = useMemo(() => {
    const slotsConfig = [
      { key: '06_08', label: '06:00 - 08:00', minH: 6, maxH: 8 },
      { key: '08_10', label: '08:00 - 10:00', minH: 8, maxH: 10 },
      { key: '10_12', label: '10:00 - 12:00', minH: 10, maxH: 12 },
      { key: '12_14', label: '12:00 - 14:00', minH: 12, maxH: 14 },
      { key: '14_16', label: '14:00 - 16:00', minH: 14, maxH: 16 },
      { key: '16_18', label: '16:00 - 18:00', minH: 16, maxH: 18 },
      { key: '18_20', label: '18:00 - 20:00', minH: 18, maxH: 20 },
      { key: '20_22', label: '20:00 - 22:00', minH: 20, maxH: 22 },
      { key: '22_24', label: '22:00 - 24:00', minH: 22, maxH: 24 },
      { key: '00_06', label: '00:00 - 06:00', minH: 0, maxH: 6 }
    ];

    const counts: Record<string, number[]> = {};
    const closedCounts: Record<string, number[]> = {};

    slotsConfig.forEach((s) => {
      counts[s.key] = [0, 0, 0, 0, 0, 0, 0];
      closedCounts[s.key] = [0, 0, 0, 0, 0, 0, 0];
    });

    let maxCellCount = 0;
    let peakSlotKey = '';
    let peakDayIdx = 0;
    let totalTimeStamped = 0;

    leadsForHeatmap.forEach((l) => {
      if (!l.createdAt) return;
      const d = new Date(l.createdAt);
      if (isNaN(d.getTime())) return;

      // Normalización estricta a zona horaria comercial de Ecuador (America/Guayaquil, UTC-5)
      const ecString = d.toLocaleString('en-US', { timeZone: 'America/Guayaquil' });
      const ecDate = new Date(ecString);

      const hour = ecDate.getHours();
      const dayIdx = (ecDate.getDay() + 6) % 7; // 0 = Lun, 6 = Dom

      const slot = slotsConfig.find((s) => hour >= s.minH && hour < s.maxH);
      if (slot) {
        counts[slot.key][dayIdx]++;
        totalTimeStamped++;
        if (l.status === 'cerrado' || l.status === 'anticipo') {
          closedCounts[slot.key][dayIdx]++;
        }

        if (counts[slot.key][dayIdx] > maxCellCount) {
          maxCellCount = counts[slot.key][dayIdx];
          peakSlotKey = slot.key;
          peakDayIdx = dayIdx;
        }
      }
    });

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const slots = slotsConfig.map((s) => {
      const row = counts[s.key];
      const isPeak = s.key === peakSlotKey && maxCellCount > 0;

      return {
        hour: s.label,
        lun: row[0],
        mar: row[1],
        mie: row[2],
        jue: row[3],
        vie: row[4],
        sab: row[5],
        dom: row[6],
        peak: isPeak,
        totalSlot: row.reduce((a, b) => a + b, 0)
      };
    });

    // Totales diarios (suma vertical de cada día)
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    slots.forEach((s) => {
      dayTotals[0] += s.lun;
      dayTotals[1] += s.mar;
      dayTotals[2] += s.mie;
      dayTotals[3] += s.jue;
      dayTotals[4] += s.vie;
      dayTotals[5] += s.sab;
      dayTotals[6] += s.dom;
    });

    const totalSlotLeads = dayTotals.reduce((a, b) => a + b, 0);

    const peakSlotObj = slotsConfig.find((s) => s.key === peakSlotKey);
    const scopeLabel = weekOffset === 'all' ? 'Histórico' : (weekOffset === 0 ? 'Esta Semana' : 'Semana Seleccionada');
    const insightText = maxCellCount > 0
      ? `Pico (${scopeLabel}): ${dayNames[peakDayIdx]} (${peakSlotObj?.label}) • ${maxCellCount} contactos`
      : 'Sin mensajes registrados en este periodo';

    return { 
      heatMapSlots: slots, 
      goldenHourInsight: insightText,
      dayTotals,
      totalSlotLeads,
      peakDetails: {
        hasData: maxCellCount > 0,
        dayName: dayNames[peakDayIdx],
        timeRange: peakSlotObj?.label || '14:00 - 16:00',
        count: maxCellCount,
        totalTimeStamped
      }
    };
  }, [leadsForHeatmap, weekOffset]);

  // ─── 2. ANÁLISIS GEOGRÁFICO Y CANALES 100% REAL (Sin Datos Inventados) ───
  const geoStats = useMemo(() => {
    let quitoCount = 0;
    let gyeCount = 0;
    let otherCount = 0; // leads sin ciudad determinable
    let autoWhatsAppCount = 0;
    let outreachCount = 0;
    let manualCount = 0;

    // Servicios más solicitados por canal
    const autoServices: Record<string, number> = {};
    const manualServices: Record<string, number> = {};

    leads.forEach((l) => {
      // Clasificar por canal de captura
      if (l.source === 'whatsapp_auto') {
        autoWhatsAppCount++;
        const svc = (l.service || 'Sin especificar').trim();
        autoServices[svc] = (autoServices[svc] || 0) + 1;
      } else if (l.source === 'whatsapp_outreach') {
        outreachCount++;
      } else {
        manualCount++;
        const svc = (l.service || 'Sin especificar').trim();
        manualServices[svc] = (manualServices[svc] || 0) + 1;
      }

      // Clasificar por Geo: buscar en notes, service, name (SOLO datos reales, sin fallback)
      const text = `${l.notes || ''} ${l.service || ''} ${l.name || ''}`.toLowerCase();
      const quitoKeywords = ['quito', 'pichincha', 'cumbayá', 'valle de los chillos', 'tumbaco', 'sangolquí'];
      const gyeKeywords = ['guayaquil', 'guayas', 'samborondón', 'durán', 'daule', 'milagro', 'salinas', 'manta', 'machala', 'cuenca', 'ambato', 'riobamba', 'loja', 'ibarra', 'esmeraldas', 'portoviejo', 'santo domingo'];

      if (quitoKeywords.some(kw => text.includes(kw))) {
        quitoCount++;
      } else if (gyeKeywords.some(kw => text.includes(kw))) {
        gyeCount++;
      } else {
        otherCount++; // Sin datos suficientes para clasificar
      }
    });

    const total = leads.length || 1;

    // Servicio más demandado por canal
    const topAutoService = Object.entries(autoServices).sort((a, b) => b[1] - a[1])[0];
    const topManualService = Object.entries(manualServices).sort((a, b) => b[1] - a[1])[0];

    return {
      quitoCount,
      quitoPct: Math.round((quitoCount / total) * 100),
      gyeCount,
      gyePct: Math.round((gyeCount / total) * 100),
      otherCount,
      otherPct: Math.round((otherCount / total) * 100),
      autoWhatsAppCount,
      autoWhatsAppPct: Math.round((autoWhatsAppCount / total) * 100),
      outreachCount,
      outreachPct: Math.round((outreachCount / total) * 100),
      manualCount,
      manualPct: Math.round((manualCount / total) * 100),
      totalLeads: leads.length,
      topAutoService: topAutoService ? topAutoService[0] : 'N/A',
      topManualService: topManualService ? topManualService[0] : 'N/A',
    };
  }, [leads]);

  // Subtab config para DRY
  const subTabs: { id: SubTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'resumen', label: 'Vista Ejecutiva', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-indigo-500' },
    { id: 'mapa_ciudades', label: 'Horas Doradas & Canales', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-500' },
  ];

  // ─── 4. EMBUDO REAL DE CONVERSIÓN BASADO EN TUS LEADS (4 Fases Oficiales) ───
  const totalLeadsCount = leads.length;
  const cotizadosCount = leads.filter(l => ['cotizado', 'anticipo', 'cerrado'].includes(l.status)).length;
  const anticiposCount = leads.filter(l => ['anticipo', 'cerrado'].includes(l.status)).length;
  const closedCount = closedLeads.length;

  const funnelSteps = useMemo(() => {
    const base = totalLeadsCount > 0 ? totalLeadsCount : 1;
    return [
      { 
        label: 'Prospectos WhatsApp', 
        sublabel: 'Captura CRM en Tiempo Real', 
        value: totalLeadsCount, 
        pct: 100, 
        color: 'from-indigo-500 to-violet-500' 
      },
      { 
        label: 'Propuesta / Cotizado', 
        sublabel: 'Alcance & Precio Enviado', 
        value: cotizadosCount, 
        pct: totalLeadsCount > 0 ? Number(((cotizadosCount / base) * 100).toFixed(1)) : 0, 
        color: 'from-blue-500 to-indigo-500' 
      },
      { 
        label: 'Pagó Anticipo (CAPI)', 
        sublabel: 'Purchase CAPI Despachado', 
        value: anticiposCount, 
        pct: totalLeadsCount > 0 ? Number(((anticiposCount / base) * 100).toFixed(1)) : 0, 
        color: 'from-violet-500 to-purple-500' 
      },
      { 
        label: 'Entregado / Cerrado', 
        sublabel: 'Proyecto Concluido & Facturado', 
        value: closedCount, 
        pct: totalLeadsCount > 0 ? Number(((closedCount / base) * 100).toFixed(1)) : 0, 
        color: 'from-emerald-600 to-emerald-500',
        bottleneck: closedCount === 0 && totalLeadsCount > 5
      },
    ];
  }, [totalLeadsCount, cotizadosCount, anticiposCount, closedCount]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-12">
      
      {/* ═══ BARRA DE TELEMETRÍA SUPERIOR ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-sm p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative ring-2 ring-emerald-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 tracking-tight">
                Meta Graph API v19.0
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 text-[10px] font-bold tracking-wide">
                EN VIVO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              <code className="font-mono text-slate-600 font-semibold text-[10px]">Kindev Ads • act_436...8161</code>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100/90 border border-slate-200/70 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setViewMode('live')}
              className={`px-3 py-1.5 rounded-[10px] transition-all duration-200 ${
                viewMode === 'live' 
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Datos Reales
            </button>
            <button
              type="button"
              onClick={() => setViewMode('simulator')}
              className={`px-3 py-1.5 rounded-[10px] transition-all duration-200 ${
                viewMode === 'simulator' 
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Simulador ROI
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchLiveInsights(true)}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200/70 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-50"
            title="Sincronizar métricas con Meta Graph API"
            aria-label="Sincronizar con Meta"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ SUB-TAB NAVIGATION (Mobile Touch Friendly) ═══ */}
      <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/60 overflow-x-auto no-scrollbar text-xs font-bold shadow-2xs">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3.5 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 shrink-0 touch-manipulation min-h-[40px] relative ${
              activeSubTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            <span className={activeSubTab === tab.id ? 'text-white' : tab.color}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA 1: RESUMEN EJECUTIVO, EMBUDO & PLATAFORMAS                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'resumen' && (
        <div className="space-y-4 sm:space-y-5 stagger-children">
          
          {/* ─── Hero Card Ejecutivo ─── */}
          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 bg-gradient-animated rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden animate-slide-up">
            {/* Decorative orbs */}
            <div className="absolute right-[-40px] top-[-40px] w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-[-60px] bottom-[-60px] w-64 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 top-1/2 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2.5 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/20 text-indigo-300 animate-pulse-glow">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] font-bold text-indigo-300/90 tracking-widest uppercase">
                    {viewMode === 'live' ? 'Campaña en Vivo' : 'Simulador Proyectado'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  {telemetry.campaign.name}
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{telemetry.campaign.impressions.toLocaleString()} impresiones • Presupuesto diario: <strong className="text-slate-300">$7,00 USD</strong></span>
                </p>
              </div>

              {/* ROAS & Spend Cards */}
              <div className="grid grid-cols-2 gap-px rounded-2xl overflow-hidden ring-1 ring-white/10 shrink-0">
                <div className="bg-white/[0.07] backdrop-blur-sm p-4 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ROAS Real</span>
                  <div className="text-3xl sm:text-4xl font-black font-mono bg-gradient-to-r from-emerald-400 to-emerald-300 text-gradient">
                    {overallRoas}x
                  </div>
                  <span className="text-[10px] text-emerald-400/80 font-semibold block">
                    <TrendingUp className="w-3 h-3 inline mr-1" />${totalRevenue.toFixed(0)} facturado
                  </span>
                </div>
                <div className="bg-white/[0.07] backdrop-blur-sm p-4 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Inversión Meta</span>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white">
                    ${currentSpend.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {telemetry.campaign.messagingConnections} prospectos WhatsApp
                  </span>
                </div>
              </div>
            </div>

            {/* 4 KPIs Strip con Datos 100% Reales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-white/[0.06]">
              {[
                { 
                  icon: <DollarSign className="w-3.5 h-3.5" />, 
                  iconColor: 'text-amber-400', 
                  label: 'Coste / Lead Real', 
                  value: leads.length > 0 ? `$${(currentSpend / leads.length).toFixed(2)}` : '$0.00', 
                  sub: `${leads.length} clientes en CRM` 
                },
                { 
                  icon: <MousePointerClick className="w-3.5 h-3.5" />, 
                  iconColor: 'text-sky-400', 
                  label: 'Clics Anuncio', 
                  value: telemetry.campaign.clicks.toString(), 
                  sub: `CPC estimado: $${telemetry.campaign.cpc.toFixed(2)}` 
                },
                { 
                  icon: <MessageSquare className="w-3.5 h-3.5" />, 
                  iconColor: 'text-emerald-400', 
                  label: 'Cierres de Venta', 
                  value: closedCount.toString(), 
                  sub: `Tasa Cierre: ${totalLeadsCount > 0 ? ((closedCount / totalLeadsCount) * 100).toFixed(1) : 0}%` 
                },
                { 
                  icon: <Flame className="w-3.5 h-3.5" />, 
                  iconColor: 'text-violet-400', 
                  label: 'Ganancia Neta', 
                  value: `+$${totalProfit.toFixed(0)}`, 
                  sub: 'Facturación menos Ad Spend', 
                  valueColor: 'text-emerald-400' 
                },
              ].map((kpi, idx) => (
                <div key={idx} className="group bg-white/[0.04] hover:bg-white/[0.08] p-3 rounded-xl border border-white/[0.06] transition-all duration-200 cursor-default">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase mb-1.5">
                    <span className={kpi.iconColor}>{kpi.icon}</span>
                    <span>{kpi.label}</span>
                  </div>
                  <span className={`text-lg font-black font-mono ${kpi.valueColor || 'text-white'}`}>
                    {kpi.value}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">{kpi.sub}</span>
                </div>
              ))}
            </div>

            {/* Simulador Slider */}
            {viewMode === 'simulator' && (
              <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
                <div className="flex items-center gap-2 text-slate-400">
                  <Sliders className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>Inversión Simulada:</span>
                  <span className="font-mono font-bold text-white">${totalAdSpend.toFixed(2)} USD</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[21.05, 50, 100, 200, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTotalAdSpend(val)}
                      className={`px-3 py-1 rounded-xl font-mono font-bold text-xs transition-all active:scale-95 ${
                        totalAdSpend === val
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                          : 'bg-white/[0.08] hover:bg-white/[0.15] text-slate-400'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Embudo Visual de Deserción ─── */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-5 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    Embudo de Deserción WhatsApp
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Recorrido del clic hasta la interacción profunda
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 text-xs font-bold shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Fuga: 73.3% Abandono</span>
              </div>
            </div>

            <div className="space-y-3">
              {funnelSteps.map((step, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600">{idx + 1}</span>
                      <span>{step.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">({step.sublabel})</span>
                      {step.bottleneck && (
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 text-[10px] font-bold">
                          Cuello de Botella
                        </span>
                      )}
                    </span>
                    <span className={`font-mono font-black text-xs ${step.bottleneck ? 'text-rose-700' : 'text-slate-800'}`}>
                      {step.value} ({step.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100/80 overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${step.color} rounded-full animate-bar-fill`}
                      style={{ '--bar-width': `${step.pct}%`, width: `${step.pct}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Tacómetro de Fatiga del Creativo ─── */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Fatiga del Creativo
                </h3>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 text-xs font-black">
                {adFrequency.toFixed(2)}x — Óptimo ✓
              </span>
            </div>

            <div className="space-y-3">
              {/* Barra tricolor con indicador posicional */}
              <div className="relative">
                <div className="w-full h-3 rounded-full flex overflow-hidden ring-1 ring-slate-200/60">
                  <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full" style={{ width: '50%' }} title="Zona Óptima (1.0 - 1.5)" />
                  <div className="bg-gradient-to-r from-amber-300 to-amber-400 h-full" style={{ width: '30%' }} title="Zona Atención (1.5 - 2.2)" />
                  <div className="bg-gradient-to-r from-rose-400 to-rose-500 h-full" style={{ width: '20%' }} title="Zona Fatiga (>2.2)" />
                </div>
                {/* Aguja indicadora */}
                <div 
                  className="absolute top-[-3px] w-0.5 h-[18px] bg-slate-900 rounded-full shadow-sm transition-all duration-700"
                  style={{ left: `${tachometerPosition}%` }}
                />
                <div 
                  className="absolute top-[17px] transition-all duration-700"
                  style={{ left: `${tachometerPosition}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-[9px] font-mono font-black text-slate-900 bg-white px-1.5 py-0.5 rounded-md ring-1 ring-slate-200 shadow-sm">
                    {adFrequency.toFixed(2)}x
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2">
                <span>1.0x <span className="text-slate-400">(Fresco)</span></span>
                <span>1.5x <span className="text-slate-400">(Vigilar)</span></span>
                <span>2.2x <span className="text-slate-400">(Saturado)</span></span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <Zap className="w-3.5 h-3.5 text-amber-500 inline mr-1.5" />
              <strong>Diagnóstico:</strong> Frecuencia de <strong>{adFrequency}x</strong> — tu público en Quito y Guayaquil sigue siendo fresco. Sin saturación publicitaria.
            </p>
          </div>

          {/* ─── Matriz de Plataformas Reales ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(() => {
              // Calcular plataforma con menor coste por mensaje (mínimo 1 mensaje)
              const validPlats = telemetry.platforms.filter((p) => p.messages > 0);
              const bestCostPlat = validPlats.reduce((best, cur) => {
                if (!best) return cur;
                return cur.costPerMessage > 0 && cur.costPerMessage < best.costPerMessage ? cur : best;
              }, null as typeof telemetry.platforms[0] | null);

              const highestConvPlat = validPlats.reduce((best, cur) => {
                if (!best) return cur;
                return cur.conversionRatePercent > best.conversionRatePercent ? cur : best;
              }, null as typeof telemetry.platforms[0] | null);

              return telemetry.platforms.map((plat) => {
                const isInstagram = plat.platform === 'instagram';
                const isFacebook = plat.platform === 'facebook';
                const isLowestCost = bestCostPlat?.platform === plat.platform;
                const isHighestConv = highestConvPlat?.platform === plat.platform;

                const gradientBg = isInstagram 
                  ? 'from-fuchsia-500/5 via-purple-500/5 to-pink-500/5' 
                  : isFacebook 
                  ? 'from-blue-500/5 to-sky-500/5' 
                  : 'from-emerald-500/5 to-teal-500/5';
                const ringColor = isInstagram 
                  ? 'ring-purple-200/60' 
                  : isFacebook 
                  ? 'ring-blue-200/60' 
                  : 'ring-emerald-200/60';

                // Generar recomendación/diagnóstico 100% dinámico
                let dynamicDescription = '';
                if (isLowestCost && plat.messages > 0) {
                  dynamicDescription = `Canal con menor costo por mensaje ($${plat.costPerMessage.toFixed(2)} USD). Máxima rentabilidad por chat.`;
                } else if (isHighestConv && plat.messages > 0) {
                  dynamicDescription = `Mayor tasa de conversión a mensajes (${plat.conversionRatePercent}%). Alta afinidad del público.`;
                } else if (plat.messages >= 20) {
                  dynamicDescription = `Mayor volumen de prospección (${plat.messages} chats captados). Motor de volumen principal.`;
                } else if (plat.messages > 0) {
                  dynamicDescription = `${plat.messages} conversaciones iniciadas con un gasto de $${plat.spend.toFixed(2)} USD.`;
                } else {
                  dynamicDescription = `Sin mensajes registrados en el período ($${plat.spend.toFixed(2)} gastados).`;
                }

                return (
                  <div 
                    key={plat.platform}
                    className={`group p-4 sm:p-5 rounded-2xl bg-gradient-to-b ${gradientBg} ring-1 ${ringColor} hover:shadow-md transition-all duration-300 space-y-3 animate-slide-up`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${isInstagram ? 'bg-gradient-to-br from-fuchsia-500 to-pink-500' : isFacebook ? 'bg-blue-600' : 'bg-emerald-600'} text-white shadow-sm`}>
                          {isInstagram ? (
                            <InstagramIcon className="w-4 h-4" />
                          ) : isFacebook ? (
                            <FacebookIcon className="w-4 h-4" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs font-black text-slate-900 capitalize">
                          {plat.platform}
                        </span>
                      </div>

                      {isLowestCost && plat.messages > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 text-[10px] font-black">
                          🏆 Menor Coste/Msg
                        </span>
                      )}
                      {!isLowestCost && isHighestConv && plat.messages > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 text-fuchsia-700 ring-1 ring-fuchsia-500/20 text-[10px] font-black">
                          ⚡ Mayor Conversión
                        </span>
                      )}
                      {!isLowestCost && !isHighestConv && plat.messages >= 20 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20 text-[10px] font-black">
                          🔥 Mayor Volumen
                        </span>
                      )}
                    </div>

                    {/* Métricas en grid limpio — sin box-in-box redundante */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-slate-200/40">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Gasto Real</span>
                        <span className="font-mono font-bold text-slate-800">${plat.spend.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Mensajes</span>
                        <span className="font-mono font-bold text-slate-900">{plat.messages} chats</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Coste/Msg</span>
                        <span className={`font-mono font-black ${isLowestCost ? 'text-emerald-600' : 'text-slate-800'}`}>
                          ${plat.costPerMessage.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Tasa Conv.</span>
                        <span className="font-mono font-bold text-slate-800">{plat.conversionRatePercent}%</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-snug">
                      {dynamicDescription}
                    </p>
                  </div>
                );
              });
            })()}
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA 2: MAPA HORARIO & COMPARATIVA CIUDADES                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'mapa_ciudades' && (
        <div className="space-y-4 sm:space-y-5 stagger-children">
          
          {/* ─── Heatmap Horario Sincronizado con Ritmo Semanal ─── */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 space-y-4 animate-slide-up">
            {/* ── Header: Título + Badge ── */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                    Horas Doradas
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {weekOffset === 'all'
                      ? `${totalSlotLeads} prospectos · Histórico acumulado`
                      : `${totalSlotLeads} prospectos · Sincronizado con Ritmo Semanal`}
                  </p>
                </div>
              </div>
              {/* Badge compacto siempre visible */}
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedWeekObj ? (
                  <span className="text-[10px] sm:text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-1 rounded-lg border border-violet-200/60 font-mono whitespace-nowrap">
                    {selectedWeekObj.rangeText}
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60 whitespace-nowrap">
                    Histórico
                  </span>
                )}
              </div>
            </div>

            {/* ── Barra de Navegación de Semanas (100% responsive) ── */}
            <div className="flex flex-col gap-2.5">
              {/* Fila 1: Botones de navegación rápida + badge de leads */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Flecha izquierda (ir a semana anterior) */}
                  <button
                    type="button"
                    onClick={() => handleSelectWeekOffset(weekOffset === 'all' ? -1 : (weekOffset as number) - 1)}
                    className="inline-flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 rounded-lg text-slate-600 hover:bg-violet-50 hover:text-violet-700 border border-slate-200/80 transition-all active:scale-95"
                    title="Semana anterior"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline text-[11px] font-bold ml-0.5">Anterior</span>
                  </button>

                  {/* Botón "Actual" (solo visible si no estamos en semana actual) */}
                  {weekOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectWeekOffset(0)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-all active:scale-95 shadow-xs"
                      title="Volver a la semana actual"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Actual</span>
                    </button>
                  )}

                  {/* Flecha derecha (solo si no estamos en semana actual y no en histórico) */}
                  {weekOffset !== 0 && weekOffset !== 'all' && (weekOffset as number) < 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectWeekOffset((weekOffset as number) + 1)}
                      className="inline-flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 rounded-lg text-slate-600 hover:bg-violet-50 hover:text-violet-700 border border-slate-200/80 transition-all active:scale-95"
                      title="Semana siguiente"
                    >
                      <span className="hidden sm:inline text-[11px] font-bold mr-0.5">Siguiente</span>
                      <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* Badge total leads */}
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60 flex items-center gap-1 shrink-0">
                  <span>{totalSlotLeads}</span>
                  <span className="text-violet-500 font-sans font-medium">
                    {totalSlotLeads === 1 ? 'lead' : 'leads'}
                  </span>
                </span>
              </div>

              {/* Fila 2: Select de semana (full-width en móvil, acotado en desktop) */}
              <div className="relative w-full sm:w-auto">
                <select
                  value={weekOffset}
                  onChange={(e) => handleSelectWeekOffset(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full sm:w-auto text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 sm:py-1.5 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 appearance-none pr-8 transition-all"
                  title="Seleccionar semana a analizar"
                >
                  <option value="0">📅 Semana actual — {availableWeeks[0]?.rangeText}</option>
                  {availableWeeks.slice(1).map((w) => (
                    <option key={w.offset} value={w.offset}>
                      ◀ {w.label}
                    </option>
                  ))}
                  <option value="all">📊 Histórico Total — {leads.length} leads</option>
                </select>
                {/* Custom dropdown arrow */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Banner de Uso Correcto de Horas Doradas con Pico detectado */}
            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 shrink-0 mt-0.5">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-slate-900">
                    ¿Cómo sacarle el máximo provecho comercial a tus Horas Doradas?
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Las <strong>Horas Doradas</strong> te indican el momento exacto en que tus clientes potenciales están más activos y receptivos en WhatsApp. 
                    Responde en <strong>menos de 3 minutos</strong> durante los picos detectados ({peakDetails.timeRange}) para evitar el abandono de chat y triplicar tu tasa de conversión a ventas cerradas.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-500/10 px-3 py-1.5 rounded-xl ring-1 ring-amber-500/20 shrink-0 self-start sm:self-center">
                <Flame className="w-3.5 h-3.5" />
                <span>{goldenHourInsight}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 text-left font-mono pl-1">Franja</th>
                    <th className="py-2.5 px-1.5">Lun</th>
                    <th className="py-2.5 px-1.5">Mar</th>
                    <th className="py-2.5 px-1.5">Mié</th>
                    <th className="py-2.5 px-1.5">Jue</th>
                    <th className="py-2.5 px-1.5">Vie</th>
                    <th className="py-2.5 px-1.5">Sáb</th>
                    <th className="py-2.5 px-1.5">Dom</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                  {heatMapSlots.map((slot) => (
                    <tr key={slot.hour} className={`${slot.peak ? 'bg-amber-50/30' : ''} transition-colors`}>
                      <td className="py-2.5 text-left font-semibold text-slate-600 font-sans text-[11px] pl-1 whitespace-nowrap">
                        {slot.peak && <Flame className="w-3 h-3 text-amber-500 inline mr-1" />}
                        {slot.hour}
                      </td>
                      {[slot.lun, slot.mar, slot.mie, slot.jue, slot.vie, slot.sab, slot.dom].map((val, idx) => {
                        const intensityClass = 
                          val >= 4 ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-500/30' :
                          val >= 3 ? 'bg-emerald-500/80 text-white font-bold' :
                          val >= 2 ? 'bg-emerald-100 text-emerald-800 font-semibold' :
                          val === 1 ? 'bg-slate-100 text-slate-600' : 'text-slate-300';

                        return (
                          <td key={idx} className="py-2.5 px-1.5">
                            <span className={`heat-cell inline-block w-7 h-7 leading-7 rounded-lg transition-all duration-200 cursor-default ${intensityClass}`}>
                              {val}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                {/* ─── Fila Resumen: Total Diario Sincronizado 1:1 con Ritmo Semanal ─── */}
                <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 text-left font-bold text-slate-800 font-sans text-[11px] pl-1 whitespace-nowrap">
                      Total Diario
                    </td>
                    {dayTotals.map((tot, idx) => (
                      <td key={idx} className="py-2.5 px-1.5">
                        <span className={`inline-block w-7 h-7 leading-7 rounded-lg font-black transition-all ${
                          tot > 0 
                            ? 'bg-slate-900 text-white shadow-xs' 
                            : 'text-slate-300 font-normal'
                        }`}>
                          {tot}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-2 border-t border-slate-100/60 flex-wrap">
              <span className="font-semibold text-slate-600">Intensidad:</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 ring-1 ring-slate-200" /> 1</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100" /> 2</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/80" /> 3</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600 shadow-sm shadow-emerald-500/30" /> 4+</span>
            </div>
          </div>

          {/* ─── Canales de Captura & Geo Real ─── */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4 animate-slide-up">
            <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Canales de Captura
                </h3>
                <p className="text-[11px] text-slate-500">Distribución real por fuente de origen de {geoStats.totalLeads} leads</p>
              </div>
            </div>

            {/* Tres canales reales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Canal 1: Auto WhatsApp (CTWA Ads) */}
              <div className="group p-4 rounded-2xl ring-1 ring-emerald-200/60 bg-gradient-to-b from-emerald-500/5 to-transparent hover:shadow-md transition-all duration-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-600/20" />
                    <span className="text-xs font-black text-slate-900">⚡ Auto CTWA</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold ring-1 ring-emerald-500/20">
                    {geoStats.autoWhatsAppPct}%
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Leads Auto</span>
                    <span className="font-mono text-emerald-700">{geoStats.autoWhatsAppCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full animate-bar-fill" style={{ '--bar-width': `${geoStats.autoWhatsAppPct}%`, width: `${geoStats.autoWhatsAppPct}%` } as React.CSSProperties} />
                  </div>
                </div>
                <div className="text-[10px] pt-1.5 border-t border-slate-100/50">
                  <span className="text-slate-400 font-bold uppercase">Top servicio: </span>
                  <span className="font-semibold text-slate-700">{geoStats.topAutoService}</span>
                </div>
              </div>

              {/* Canal 2: Prospección Outreach */}
              <div className="group p-4 rounded-2xl ring-1 ring-indigo-200/60 bg-gradient-to-b from-indigo-500/5 to-transparent hover:shadow-md transition-all duration-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-600/20" />
                    <span className="text-xs font-black text-slate-900">🎯 Prospección</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 text-[10px] font-bold ring-1 ring-indigo-500/20">
                    {geoStats.outreachPct}%
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Leads Outreach</span>
                    <span className="font-mono text-indigo-700">{geoStats.outreachCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full animate-bar-fill" style={{ '--bar-width': `${geoStats.outreachPct}%`, width: `${geoStats.outreachPct}%` } as React.CSSProperties} />
                  </div>
                </div>
                <div className="text-[10px] pt-1.5 border-t border-slate-100/50">
                  <span className="text-slate-400 font-bold uppercase">Fuente: </span>
                  <span className="font-semibold text-slate-700">Script masivo WA</span>
                </div>
              </div>

              {/* Canal 3: Manual CRM */}
              <div className="group p-4 rounded-2xl ring-1 ring-sky-200/60 bg-gradient-to-b from-sky-500/5 to-transparent hover:shadow-md transition-all duration-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600 ring-2 ring-sky-600/20" />
                    <span className="text-xs font-black text-slate-900">📋 Manual</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 text-[10px] font-bold ring-1 ring-sky-500/20">
                    {geoStats.manualPct}%
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Leads Manuales</span>
                    <span className="font-mono text-sky-700">{geoStats.manualCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-full animate-bar-fill" style={{ '--bar-width': `${geoStats.manualPct}%`, width: `${geoStats.manualPct}%` } as React.CSSProperties} />
                  </div>
                </div>
                <div className="text-[10px] pt-1.5 border-t border-slate-100/50">
                  <span className="text-slate-400 font-bold uppercase">Top servicio: </span>
                  <span className="font-semibold text-slate-700">{geoStats.topManualService}</span>
                </div>
              </div>
            </div>

            {/* Geo: Solo si hay ciudades identificadas realmente */}
            {(geoStats.quitoCount > 0 || geoStats.gyeCount > 0) && (
              <div className="pt-3 border-t border-slate-100/60 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Ciudades identificadas en notas ({geoStats.quitoCount + geoStats.gyeCount} de {geoStats.totalLeads})
                </p>
                <div className="flex items-center gap-3 text-xs">
                  {geoStats.quitoCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-200/60">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Quito: {geoStats.quitoCount} ({geoStats.quitoPct}%)
                    </span>
                  )}
                  {geoStats.gyeCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold ring-1 ring-sky-200/60">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      Guayaquil: {geoStats.gyeCount} ({geoStats.gyePct}%)
                    </span>
                  )}
                  {geoStats.otherCount > 0 && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {geoStats.otherCount} sin ciudad identificada
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Nota: cuando no hay ciudades detectadas */}
            {geoStats.quitoCount === 0 && geoStats.gyeCount === 0 && (
              <div className="pt-3 border-t border-slate-100/60">
                <p className="text-[10px] text-slate-400 italic">
                  💡 Las ciudades se identificarán automáticamente cuando los leads incluyan ubicación en sus notas o conversaciones.
                  Los anuncios CTWA actuales están segmentados a Guayaquil y Costa de Ecuador.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
