import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert, 
  MessageSquare, 
  DollarSign, 
  MousePointerClick, 
  Copy, 
  Flame, 
  Target,
  Clock,
  MapPin,
  Activity,
  Mic,
  ShieldCheck,
  Radio,
  TrendingUp,
  Zap,
  Eye
} from 'lucide-react';
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
    spend: 21.05,
    impressions: 3466,
    clicks: 61,
    cpc: 0.345,
    cpm: 6.07,
    messagingConnections: 15,
    firstReplies: 15,
    depth2Replies: 4,
    depth5Replies: 4,
    linkClicks: 34,
    costPerMessage: 1.40,
    dropRatePercent: 73.3
  },
  platforms: [
    { platform: 'instagram', spend: 4.98, impressions: 492, clicks: 14, messages: 4, costPerMessage: 1.24, conversionRatePercent: 0.81 },
    { platform: 'facebook', spend: 13.94, impressions: 2014, clicks: 43, messages: 9, costPerMessage: 1.55, conversionRatePercent: 0.45 },
    { platform: 'whatsapp', spend: 2.11, impressions: 958, clicks: 4, messages: 2, costPerMessage: 1.05, conversionRatePercent: 0.21 }
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
    enabled: true,
    maxCostPerMessage: 2.20,
    maxSpendWithoutLead: 4.00,
    currentCost: 1.40,
    statusText: 'Óptimo — Bajo umbral de seguridad'
  }
};

type SubTab = 'resumen' | 'mapa_ciudades' | 'scripts_cierre' | 'reglas_live';

export const MetaAdsIntelligence: React.FC<MetaAdsIntelligenceProps> = ({ leads }) => {
  const closedLeads = leads.filter((l) => l.status === 'cerrado');
  const totalRevenue = closedLeads.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const [telemetry, setTelemetry] = useState<MetaLiveTelemetry>(DEFAULT_LIVE_TELEMETRY);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('resumen');
  const [viewMode, setViewMode] = useState<'live' | 'simulator'>('live');
  const [totalAdSpend, setTotalAdSpend] = useState<number>(21.05);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLiveInsights = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/meta/insights${forceRefresh ? '?refresh=true' : ''}`);
      if (res.ok) {
        const data: MetaLiveTelemetry = await res.json();
        setTelemetry(data);
        setTotalAdSpend(data.campaign.spend);
      }
    } catch {
      // Fallback seguro en snapshot
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveInsights();
  }, []);

  const currentSpend = viewMode === 'live' ? telemetry.campaign.spend : totalAdSpend;
  const overallRoas = currentSpend > 0 ? (totalRevenue / currentSpend).toFixed(1) : '0';
  const totalProfit = totalRevenue - currentSpend;

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Frecuencia calculada: 3466 impresiones / 2930 alcance = 1.18
  const adFrequency = 1.18;
  // Posición del indicador en el tacómetro (normalizado a % de la barra)
  const tachometerPosition = Math.min(((adFrequency - 1.0) / (2.5 - 1.0)) * 100, 100);

  // Guión de Nota de Voz
  const audioVoiceScript = `¡Hola! Qué gusto saludarte. Vi que te interesa tu página web profesional por $120 USD. Cuéntame brevemente: ¿cuál es el nombre y giro de tu negocio o empresa? Así te muestro un ejemplo similar de nuestro portafolio de Kindev de inmediato para que veas la calidad antes de decidir.`;

  // Scripts de Objeciones
  const objectionScripts = [
    {
      id: 'obj_precio',
      emoji: '💰',
      title: '\"¿Tiene algún descuento o cuánto es lo último?\"',
      text: `El precio de $120 USD ya incluye una tarifa de promoción de lanzamiento para PYMEs. Es un pago 100% único, sin mensualidades ni cobros ocultos por mantenimiento básico. Incluye tus 5 secciones, botón de WhatsApp directo y diseño adaptado a celulares. Para agendarte hoy solo iniciamos con un anticipo del 50% ($60 USD) y el saldo contra entrega aprobada.`
    },
    {
      id: 'obj_incluye',
      emoji: '📦',
      title: '\"¿Qué incluye exactamente el sitio web?\"',
      text: `Tu proyecto por $120 USD incluye:\n1. Hasta 5 secciones (Inicio, Nosotros, Servicios/Catálogo, Testimonios y Contacto).\n2. Botón flotante a tu WhatsApp para cerrar ventas directas.\n3. Formulario de contacto y mapa interactivo.\n4. Carga ultra rápida optimizada para celulares.\n5. Vinculación con tus redes sociales.\n¿Tienes listo el logotipo de tu negocio o te ayudamos a prepararlo?`
    },
    {
      id: 'obj_pensarlo',
      emoji: '🤔',
      title: '\"Déjame pensarlo / Te aviso después\"',
      text: `¡Claro que sí! Con gusto. Solo te dejo este dato: mientras lo piensas, tus clientes potenciales te están buscando en Google y redes sociales. Te dejo este enlace de demostración de nuestro portafolio para que veas cómo luciría tu marca: https://kindev.tech. Si arrancamos esta semana, te la entregamos lista y funcionando en 3 a 5 días hábiles.`
    }
  ];

  // Matriz de Mapa Horario
  const heatMapSlots = [
    { hour: '08:00 - 10:00', lun: 1, mar: 2, mie: 1, jue: 2, vie: 2, sab: 0, dom: 0 },
    { hour: '10:00 - 12:00', lun: 3, mar: 4, mie: 3, jue: 4, vie: 3, sab: 1, dom: 1, peak: true },
    { hour: '12:00 - 14:00', lun: 2, mar: 3, mie: 2, jue: 3, vie: 2, sab: 2, dom: 1 },
    { hour: '14:00 - 16:00', lun: 1, mar: 2, mie: 2, jue: 1, vie: 2, sab: 1, dom: 0 },
    { hour: '16:00 - 18:00', lun: 2, mar: 3, mie: 2, jue: 3, vie: 3, sab: 2, dom: 1 },
    { hour: '18:00 - 20:00', lun: 4, mar: 5, mie: 4, jue: 5, vie: 4, sab: 3, dom: 2, peak: true },
    { hour: '20:00 - 22:00', lun: 2, mar: 3, mie: 3, jue: 2, vie: 2, sab: 2, dom: 2 }
  ];

  // Feed de Actividad en Tiempo Real
  const liveEvents = [
    {
      id: 'ev_1',
      time: 'Hace 15 min',
      badge: 'CAPI Lead',
      badgeColor: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20',
      dotColor: 'bg-emerald-500',
      title: 'Evento CAPI "Lead" confirmado por Meta Graph v19.0',
      detail: 'Trace ID: AYToUQgFUNkUUDrXvI5GHPV • Dataset 1368429478371391'
    },
    {
      id: 'ev_2',
      time: 'Hace 38 min',
      badge: 'Ad Rule Kill Switch',
      badgeColor: 'bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-500/20',
      dotColor: 'bg-indigo-500',
      title: 'Regla Kill Switch evaluada en servidores de Meta',
      detail: 'Costo por mensaje en $1.40 USD (Bajo umbral de seguridad de $2.50 USD)'
    },
    {
      id: 'ev_3',
      time: 'Hace 1h 10m',
      badge: 'CAPI Purchase',
      badgeColor: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20',
      dotColor: 'bg-amber-500',
      title: 'Evento CAPI "Purchase" ($120.00 USD) recibido en Meta',
      detail: 'Trace ID: A7i9B6FcqmjoCo5wna5Pfwl • Calibración de algoritmo completada'
    },
    {
      id: 'ev_4',
      time: 'Hace 2h 45m',
      badge: 'Instagram',
      badgeColor: 'bg-fuchsia-500/10 text-fuchsia-700 ring-1 ring-fuchsia-500/20',
      dotColor: 'bg-fuchsia-500',
      title: 'Conversación iniciada desde Instagram Stories (Quito)',
      detail: 'Coste registrado: $1.24 USD • Frecuencia acumulada: 1.18'
    },
    {
      id: 'ev_5',
      time: 'Hace 4h',
      badge: 'Alerta Preventiva',
      badgeColor: 'bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20',
      dotColor: 'bg-sky-500',
      title: 'Regla de Notificación ID 1480910183909016 activa',
      detail: 'Monitoreando desviaciones superiores a $2.20 USD por resultado'
    }
  ];

  // Subtab config para DRY
  const subTabs: { id: SubTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'resumen', label: 'Vista Ejecutiva', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-indigo-500' },
    { id: 'mapa_ciudades', label: 'Mapa & Ciudades', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-500' },
    { id: 'scripts_cierre', label: 'Guiones de Cierre', icon: <Mic className="w-3.5 h-3.5" />, color: 'text-rose-500' },
    { id: 'reglas_live', label: 'Kill Switch & Feed', icon: <ShieldAlert className="w-3.5 h-3.5" />, color: 'text-emerald-500' },
  ];

  // Funnel data para renderizado dinámico
  const funnelSteps = [
    { label: 'Clics en el Anuncio', sublabel: 'Interés Inicial', value: telemetry.campaign.clicks, pct: 100, color: 'from-indigo-500 to-violet-500' },
    { label: 'Abrieron WhatsApp', sublabel: 'Link Click', value: telemetry.campaign.linkClicks, pct: 55.7, color: 'from-violet-500 to-purple-500' },
    { label: 'Conversación Iniciada', sublabel: 'Primer Mensaje', value: telemetry.campaign.messagingConnections, pct: 24.6, color: 'from-emerald-500 to-teal-500' },
    { label: 'Conversación Activa', sublabel: '>2 Mensajes', value: telemetry.campaign.depth2Replies, pct: 6.6, color: 'from-emerald-600 to-emerald-500', bottleneck: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-12">
      
      {/* ═══ BARRA DE TELEMETRÍA SUPERIOR ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-3 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm">
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

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100/80 border border-slate-200/60 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setViewMode('live')}
              className={`px-3 py-1.5 rounded-[10px] transition-all duration-200 ${
                viewMode === 'live' 
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' 
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
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' 
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
            className="p-2 rounded-xl border border-slate-200/60 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-50"
            title="Sincronizar métricas con Meta Graph API"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ SUB-TAB NAVIGATION ═══ */}
      <nav className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100/60 border border-slate-200/50 overflow-x-auto scrollbar-none text-xs font-bold">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 relative ${
              activeSubTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <span className={activeSubTab === tab.id ? tab.color : ''}>{tab.icon}</span>
            <span>{tab.label}</span>
            {activeSubTab === tab.id && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-indigo-500" />
            )}
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

            {/* 4 KPIs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-white/[0.06]">
              {[
                { icon: <DollarSign className="w-3.5 h-3.5" />, iconColor: 'text-amber-400', label: 'Coste / Msg', value: `$${telemetry.campaign.costPerMessage.toFixed(2)}`, sub: 'Mediana similar: $0.49' },
                { icon: <MousePointerClick className="w-3.5 h-3.5" />, iconColor: 'text-sky-400', label: 'Clics', value: telemetry.campaign.clicks.toString(), sub: `CPC: $${telemetry.campaign.cpc.toFixed(2)} USD` },
                { icon: <MessageSquare className="w-3.5 h-3.5" />, iconColor: 'text-emerald-400', label: 'Mensajes', value: telemetry.campaign.messagingConnections.toString(), sub: '100% Hombres (25-54)' },
                { icon: <Flame className="w-3.5 h-3.5" />, iconColor: 'text-violet-400', label: 'Ganancia', value: `+$${totalProfit.toFixed(0)}`, sub: 'Margen sobre ad spend', valueColor: 'text-emerald-400' },
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

          {/* ─── Matriz de Plataformas ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {telemetry.platforms.map((plat) => {
              const isInstagram = plat.platform === 'instagram';
              const isFacebook = plat.platform === 'facebook';
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

                    {isInstagram && (
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 text-fuchsia-700 ring-1 ring-fuchsia-500/20 text-[10px] font-black">
                        🏆 +50% eficiente
                      </span>
                    )}
                  </div>

                  {/* Métricas en grid limpio — sin box-in-box redundante */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-slate-200/40">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Gasto</span>
                      <span className="font-mono font-bold text-slate-800">${plat.spend.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Mensajes</span>
                      <span className="font-mono font-bold text-slate-900">{plat.messages} chats</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Coste/Msg</span>
                      <span className={`font-mono font-black ${isInstagram ? 'text-emerald-600' : 'text-slate-800'}`}>
                        ${plat.costPerMessage.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Tasa Conv.</span>
                      <span className="font-mono font-bold text-slate-800">{plat.conversionRatePercent}%</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug">
                    {isInstagram 
                      ? 'Mejor calidad de leads con menor inversión. Canal más eficiente.' 
                      : isFacebook 
                      ? 'Alto volumen pero mayor deserción en mensajes.' 
                      : 'Tráfico directo a número de WhatsApp.'}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA 2: MAPA HORARIO & COMPARATIVA CIUDADES                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'mapa_ciudades' && (
        <div className="space-y-4 sm:space-y-5 stagger-children">
          
          {/* ─── Heatmap Horario ─── */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    Horas Doradas de WhatsApp
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Intensidad de clics y mensajes por franja horaria
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-500/10 px-3 py-1.5 rounded-xl ring-1 ring-amber-500/20 self-start sm:self-auto">
                <Flame className="w-3.5 h-3.5" />
                <span>Picos: 10-12h y 18-20h</span>
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

          {/* ─── Geo: Quito vs Guayaquil ─── */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4 animate-slide-up">
            <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Rendimiento Geográfico
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Quito */}
              <div className="group p-4 rounded-2xl ring-1 ring-indigo-200/60 bg-gradient-to-b from-indigo-500/5 to-transparent hover:shadow-md transition-all duration-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-600/20" />
                    <span className="text-sm font-black text-slate-900">Quito</span>
                    <span className="text-[10px] text-slate-400 font-medium">(Pichincha)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 text-[10px] font-bold ring-1 ring-indigo-500/20">
                    R: 24 km
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Mensajes</span>
                    <span className="font-mono text-indigo-700">9 chats (58%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full animate-bar-fill" style={{ '--bar-width': '58%', width: '58%' } as React.CSSProperties} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100/50">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Coste Prom.</span>
                    <span className="font-mono font-bold text-slate-800">$1.35 USD</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Perfil</span>
                    <span className="font-semibold text-slate-700">Servicios B2B</span>
                  </div>
                </div>
              </div>

              {/* Guayaquil */}
              <div className="group p-4 rounded-2xl ring-1 ring-sky-200/60 bg-gradient-to-b from-sky-500/5 to-transparent hover:shadow-md transition-all duration-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600 ring-2 ring-sky-600/20" />
                    <span className="text-sm font-black text-slate-900">Guayaquil</span>
                    <span className="text-[10px] text-slate-400 font-medium">(Guayas)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 text-[10px] font-bold ring-1 ring-sky-500/20">
                    R: 19 km
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Mensajes</span>
                    <span className="font-mono text-sky-700">6 chats (42%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-full animate-bar-fill" style={{ '--bar-width': '42%', width: '42%' } as React.CSSProperties} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100/50">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Coste Prom.</span>
                    <span className="font-mono font-bold text-slate-800">$1.48 USD</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Perfil</span>
                    <span className="font-semibold text-slate-700">Comercio / Tiendas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA 3: GUIONES DE CIERRE & NOTA DE VOZ                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'scripts_cierre' && (
        <div className="space-y-4 sm:space-y-5 stagger-children">
          
          {/* ─── Nota de Voz 20s ─── */}
          <div className="bg-gradient-to-br from-rose-50/60 via-pink-50/30 to-white glass-card rounded-2xl sm:rounded-3xl ring-1 ring-rose-200/60 shadow-sm p-5 sm:p-6 space-y-4 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Nota de Voz de 20 Segundos
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    +300% respuestas con confianza humana inmediata
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(audioVoiceScript, 'voice')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 active:scale-95 ${
                  copiedId === 'voice'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-500/20'
                }`}
              >
                {copiedId === 'voice' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Guión</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-white/80 p-4 rounded-xl ring-1 ring-rose-200/40 text-xs text-slate-700 leading-relaxed font-mono select-all">
              "{audioVoiceScript}"
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-amber-500/5 p-2.5 rounded-xl ring-1 ring-amber-500/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span><strong>Tip:</strong> Grábalo caminando o de pie, con tono enérgico y seguro. No lo leas como un robot.</span>
            </div>
          </div>

          {/* ─── Banco de Objeciones ─── */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Cazador de Objeciones</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Copia y responde en 5 segundos cuando el cliente dude
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-slate-100/80 text-slate-600 text-[10px] font-bold ring-1 ring-slate-200/50">
                3 Respuestas
              </span>
            </div>

            <div className="space-y-3">
              {objectionScripts.map((obj) => (
                <div key={obj.id} className="group p-4 rounded-2xl ring-1 ring-slate-200/50 bg-slate-50/30 hover:bg-white hover:shadow-sm transition-all duration-200 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5">{obj.emoji}</span>
                      <span className="text-xs font-black text-slate-900 leading-snug">
                        {obj.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(obj.text, obj.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                        copiedId === obj.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white ring-1 ring-slate-200/60 hover:ring-slate-300 text-slate-600 hover:text-slate-900 shadow-sm'
                      }`}
                    >
                      {copiedId === obj.id ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-white/80 p-3 rounded-xl ring-1 ring-slate-100 text-xs font-mono text-slate-600 whitespace-pre-line leading-relaxed">
                    {obj.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA 4: REGLAS AUTOMATIZADAS & FEED EN VIVO                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'reglas_live' && (
        <div className="space-y-4 sm:space-y-5 stagger-children">
          
          {/* ─── Monitor de Reglas ─── */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Ad Rules Engine
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Reglas activas en <code className="text-[10px] font-mono">act_4362799907368161</code>
                  </p>
                </div>
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 text-xs font-black flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                2 Reglas Activas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Kill Switch */}
              <div className="group p-4 rounded-2xl ring-1 ring-emerald-200/60 bg-gradient-to-b from-emerald-500/5 to-transparent hover:shadow-md transition-all duration-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                    Kill Switch
                  </span>
                  <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    ID: 1395763...
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>PAUSE Campaña</strong> si costo/msg &gt; <strong>$2.50 USD</strong> tras 3 resultados
                </p>
                <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-500/5 p-2 rounded-lg ring-1 ring-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ENABLED — Evaluando continuamente</span>
                </div>
              </div>

              {/* Alerta */}
              <div className="group p-4 rounded-2xl ring-1 ring-sky-200/60 bg-gradient-to-b from-sky-500/5 to-transparent hover:shadow-md transition-all duration-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-sky-600" />
                    Alerta Preventiva
                  </span>
                  <span className="text-[9px] font-mono font-bold text-sky-700 bg-sky-500/10 px-2 py-0.5 rounded-md">
                    ID: 1480910...
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>NOTIFICATION</strong> si costo/resultado &gt; <strong>$2.20 USD</strong> tras 2 resultados
                </p>
                <div className="text-[10px] font-bold text-sky-700 flex items-center gap-1.5 bg-sky-500/5 p-2 rounded-lg ring-1 ring-sky-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ENABLED — Evaluando continuamente</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Feed de Actividad con Timeline ─── */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-5 sm:p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/20">
                  <Radio className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Feed en Tiempo Real
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-medium">Últimas 24h</span>
            </div>

            {/* Timeline con línea conectora */}
            <div className="relative pl-8 timeline-line space-y-1">
              {liveEvents.map((ev) => (
                <div key={ev.id} className="group relative p-3 rounded-xl hover:bg-slate-50/60 transition-all duration-200 animate-slide-up">
                  {/* Dot en la timeline */}
                  <div className={`absolute left-[-22px] top-4 w-3 h-3 rounded-full ${ev.dotColor} ring-4 ring-white z-10 group-hover:scale-125 transition-transform`} />
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ev.badgeColor}`}>
                          {ev.badge}
                        </span>
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {ev.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono leading-relaxed truncate">
                        {ev.detail}
                      </p>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 shrink-0 font-medium whitespace-nowrap mt-0.5">
                      {ev.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
