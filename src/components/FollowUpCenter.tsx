import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  CheckCircle,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Phone,
  Clock,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Users,
  Flame,
  Snowflake,
  Eye,
  Copy,
  CheckCheck,
  BarChart3,
  Megaphone,
  History,
  Zap,
  Tag,
  RefreshCw,
  ArrowUpDown
} from 'lucide-react';
import { Lead } from '../types';
import { CopyPhoneButton } from './CopyPhoneButton';

/* ─── Types ──────────────────────────────────────────────── */
interface FollowUpCenterProps {
  leads: Lead[];
  onSaveNote: (leadId: string, note: string) => Promise<void>;
}

interface OutboundEntry {
  phone: string;
  firstSentAt: number;
  lastSentAt: number;
  snippet: string;
  replyCount: number;
}

interface OutboundStats {
  totalProspected: number;
  replied: number;
  responseRate: string;
  recent24h: number;
  cold48h: number;
  dead7d: number;
  entries: OutboundEntry[];
}

type ViewTab = 'leads' | 'outbound';
type SortMode = 'activity' | 'priority' | 'name';

/* ─── Helpers ────────────────────────────────────────────── */
const getActivityLevel = (lastContactDate: string | undefined, createdAt: string) => {
  const d = new Date(lastContactDate || createdAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - d);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return {
      text: diffMins <= 1 ? 'Ahora' : `${diffMins}m`,
      level: 'hot' as const,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dotColor: 'bg-emerald-500',
      priority: 0,
      diffMs
    };
  }
  if (diffHours < 24) {
    return {
      text: `${diffHours}h`,
      level: 'warm' as const,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-400',
      priority: 1,
      diffMs
    };
  }
  if (diffHours < 48) {
    return {
      text: '24-48h',
      level: 'cooling' as const,
      color: 'bg-amber-50 text-amber-900 border-amber-200',
      dotColor: 'bg-amber-500',
      priority: 2,
      diffMs
    };
  }
  if (diffDays < 7) {
    return {
      text: `${diffDays}d`,
      level: 'cold' as const,
      color: 'bg-rose-50 text-rose-800 border-rose-200',
      dotColor: 'bg-rose-500',
      priority: 3,
      diffMs
    };
  }
  return {
    text: `${diffDays}d`,
    level: 'dead' as const,
    color: 'bg-slate-100 text-slate-600 border-slate-300',
    dotColor: 'bg-slate-400',
    priority: 4,
    diffMs
  };
};

const extractNotesTimeline = (notes?: string): Array<{ text: string; isWhatsApp: boolean; timestamp?: string }> => {
  if (!notes) return [];
  const lines = notes.split('\n').filter(Boolean);
  return lines.map((line) => {
    const isWa = line.includes('[Nuevo mensaje WhatsApp') || line.startsWith('Mensaje:');
    // Try to extract timestamp from note format: [2026-10-01 14:30] ...
    const tsMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\]/);
    const waDateMatch = line.match(/\[Nuevo mensaje WhatsApp\s*-?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}[^]]*?)\]/);
    let text = line;
    // Clean up WhatsApp message format for display
    if (isWa) {
      const msgMatch = line.match(/\]:\s*"?([^"]*)"?\s*$/);
      if (msgMatch) text = msgMatch[1];
    }
    return {
      text,
      isWhatsApp: isWa,
      timestamp: tsMatch?.[1] || waDateMatch?.[1] || undefined
    };
  });
};

const extractLatestMessage = (notes?: string) => {
  if (!notes) return null;
  const lines = notes.split('\n').filter(Boolean);
  const lastLine = lines[lines.length - 1];
  if (lastLine && lastLine.includes('[Nuevo mensaje WhatsApp')) {
    const match = lastLine.match(/\[Nuevo mensaje WhatsApp.*?\]:\s*"?([^"]*)"?/);
    return match ? match[1] : lastLine;
  }
  if (lastLine && lastLine.startsWith('Mensaje:')) {
    return lastLine.replace(/^Mensaje:\s*"?/, '').replace(/"?$/, '');
  }
  return null;
};

const formatTimestamp = (epoch: number) => {
  const d = new Date(epoch);
  const now = Date.now();
  const diffH = Math.floor((now - epoch) / 3600000);
  if (diffH < 1) return 'Hace momentos';
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Hace ${diffD}d`;
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
};

const getSourceBadge = (source?: string, adSource?: string) => {
  if (adSource) return { label: `Meta Ads`, icon: Megaphone, color: 'bg-blue-50 text-blue-800 border-blue-200' };
  switch (source) {
    case 'whatsapp_auto': return { label: 'WhatsApp Directo', icon: MessageCircle, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'whatsapp_outreach': return { label: 'Prospección', icon: Megaphone, color: 'bg-violet-50 text-violet-800 border-violet-200' };
    case 'manual': return { label: 'Manual', icon: Users, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    default: return { label: 'Sin fuente', icon: Tag, color: 'bg-slate-50 text-slate-500 border-slate-200' };
  }
};

/* ─── Component ──────────────────────────────────────────── */
export const FollowUpCenter: React.FC<FollowUpCenterProps> = ({ leads, onSaveNote }) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('leads');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [currentNote, setCurrentNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [outboundStats, setOutboundStats] = useState<OutboundStats | null>(null);
  const [outboundLoading, setOutboundLoading] = useState(false);
  const [outboundFilter, setOutboundFilter] = useState<'all' | 'replied' | 'ghosted' | 'recent' | 'dead'>('all');
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [showTimeline, setShowTimeline] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState<number | null>(null);

  // Filtered & sorted leads
  const pendingLeads = useMemo(() => {
    const filtered = leads.filter(
      (l) => l.status === 'prospecto' || l.status === 'cotizado' || l.status === 'anticipo'
    );

    return filtered.sort((a, b) => {
      if (sortMode === 'priority') {
        const actA = getActivityLevel(a.lastContactDate, a.createdAt);
        const actB = getActivityLevel(b.lastContactDate, b.createdAt);
        // Cold leads first (need attention), then by time within each level
        if (actA.priority !== actB.priority) return actB.priority - actA.priority;
        return actB.diffMs - actA.diffMs;
      }
      if (sortMode === 'name') {
        return a.name.localeCompare(b.name);
      }
      // activity = most recent first
      const timeA = new Date(a.lastContactDate || a.createdAt).getTime();
      const timeB = new Date(b.lastContactDate || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [leads, sortMode]);

  // Activity counts for the semáforo
  const activityCounts = useMemo(() => {
    const counts = { hot: 0, warm: 0, cooling: 0, cold: 0, dead: 0 };
    pendingLeads.forEach((lead) => {
      const act = getActivityLevel(lead.lastContactDate, lead.createdAt);
      counts[act.level]++;
    });
    return counts;
  }, [pendingLeads]);

  // Auto-select first lead
  useEffect(() => {
    if (pendingLeads.length > 0 && !pendingLeads.find((l) => l.id === selectedLeadId)) {
      setSelectedLeadId(pendingLeads[0].id);
    }
  }, [pendingLeads, selectedLeadId]);

  const selectedLead = pendingLeads.find((l) => l.id === selectedLeadId) || pendingLeads[0];

  // Fetch outbound data
  const fetchOutboundData = useCallback(async () => {
    setOutboundLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/whatsapp/outbound-tracker-full', {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data: OutboundStats = await res.json();
        setOutboundStats(data);
      }
    } catch {
      // Server may be offline
    } finally {
      setOutboundLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'outbound' && !outboundStats) {
      fetchOutboundData();
    }
  }, [activeTab, outboundStats, fetchOutboundData]);

  // Filtered outbound entries
  const filteredOutbound = useMemo(() => {
    if (!outboundStats) return [];
    const now = Date.now();
    switch (outboundFilter) {
      case 'replied': return outboundStats.entries.filter((e) => e.replyCount > 0);
      case 'ghosted': return outboundStats.entries.filter((e) => e.replyCount === 0);
      case 'recent': return outboundStats.entries.filter((e) => (now - e.lastSentAt) < 172800000);
      case 'dead': return outboundStats.entries.filter((e) => (now - e.lastSentAt) > 604800000);
      default: return outboundStats.entries;
    }
  }, [outboundStats, outboundFilter]);

  // Templates
  const templates = [
    {
      title: 'Seguimiento Amable (24h)',
      description: 'Consultar si revisó la propuesta',
      text: 'Hola {name}, te saluda Kindev. Espero estés teniendo un excelente día. Te escribo para consultar si tuviste oportunidad de revisar la propuesta de {service} que te enviamos. ¿Tienes alguna inquietud que podamos aclararte?'
    },
    {
      title: 'Aclaración Técnica / Alcance',
      description: 'Para clientes con dudas de funciones',
      text: 'Hola {name}, con gusto podemos agendar una videollamada de 10 minutos para mostrarte cómo funcionará exactamente tu {service} y definir los detalles. ¿Qué horario te queda mejor hoy o mañana?'
    },
    {
      title: 'Urgencia & Disponibilidad',
      description: 'Para cerrar antes de fin de semana',
      text: 'Hola {name}, te comento que estamos cerrando los cupos de desarrollo de esta semana para entregas prioritarias de {service}. Si confirmamos hoy con el 50% de anticipo, tu proyecto arranca mañana a primera hora.'
    }
  ];

  // Re-engagement template for batch & outbound
  const reengagementTemplate = 'Hola, te saluda Kindev 👋 Hace un tiempo conversamos sobre desarrollo web. ¿Sigues interesado? Tenemos nuevas ofertas que podrían interesarte. ¡Escríbenos!';

  const handleSaveNoteSubmit = async () => {
    if (!selectedLead || !currentNote.trim()) return;
    setIsSaving(true);
    try {
      await onSaveNote(selectedLead.id, currentNote.trim());
      setCurrentNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBatchSelect = (leadId: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const selectAllCold = () => {
    const coldIds = pendingLeads
      .filter((l) => {
        const act = getActivityLevel(l.lastContactDate, l.createdAt);
        return act.priority >= 3;
      })
      .map((l) => l.id);
    setBatchSelected(new Set(coldIds));
  };

  const handleCopyTemplate = (idx: number) => {
    navigator.clipboard.writeText(reengagementTemplate).catch(() => {});
    setCopiedTemplate(idx);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">

      {/* ═══ 1. MÉTRICAS DE ENGAGEMENT — Header Cards ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-4 h-4 text-violet-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pendientes</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">{pendingLeads.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">prospectos activos</p>
        </div>

        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Flame className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Calientes</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700">{activityCounts.hot + activityCounts.warm}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">contactados hoy</p>
        </div>

        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enfriándose</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-700">{activityCounts.cooling}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">24-48h sin contacto</p>
        </div>

        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Snowflake className="w-4 h-4 text-rose-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fríos / Muertos</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-700">{activityCounts.cold + activityCounts.dead}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">+48h inactivos</p>
        </div>
      </div>

      {/* ═══ 2. SEMÁFORO DE ALERTAS ═══ */}
      {(activityCounts.cold > 0 || activityCounts.dead > 0) && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-rose-900">
                ⚠️ {activityCounts.cold + activityCounts.dead} leads se están enfriando
              </p>
              <p className="text-[10px] text-rose-700 mt-0.5">
                {activityCounts.cold > 0 && `${activityCounts.cold} con +2 días sin respuesta`}
                {activityCounts.cold > 0 && activityCounts.dead > 0 && ' · '}
                {activityCounts.dead > 0 && `${activityCounts.dead} con +7 días (casi perdidos)`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setSortMode('priority'); selectAllCold(); }}
            className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold whitespace-nowrap transition-all active:scale-95 shrink-0"
          >
            Atender fríos primero
          </button>
        </div>
      )}

      {/* ═══ TAB SWITCHER: Leads CRM / Prospección Outbound ═══ */}
      <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-xs p-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`flex-1 h-10 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'leads'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Seguimiento CRM ({pendingLeads.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('outbound')}
          className={`flex-1 h-10 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'outbound'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          Prospección Outbound {outboundStats ? `(${outboundStats.totalProspected})` : ''}
        </button>
      </div>

      {/* ═══ TAB: SEGUIMIENTO CRM ═══ */}
      {activeTab === 'leads' && (
        <>
          {pendingLeads.length === 0 ? (
            <div className="bg-white/85 backdrop-blur-sm p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">¡Al día! No hay prospectos pendientes</h3>
              <p className="text-xs text-slate-500">Todos tus leads están cerrados o descartados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">

              {/* ── Mobile Selector ── */}
              <div className="lg:hidden col-span-1 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Seleccionar:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSortMode((m) => m === 'priority' ? 'activity' : m === 'activity' ? 'name' : 'priority')}
                    className="text-[10px] text-violet-600 font-bold flex items-center gap-1"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    {sortMode === 'priority' ? 'Por prioridad' : sortMode === 'activity' ? 'Por actividad' : 'A-Z'}
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {pendingLeads.map((lead) => {
                    const isSelected = (selectedLead?.id === lead.id);
                    const activity = getActivityLevel(lead.lastContactDate, lead.createdAt);
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border active:scale-95 touch-manipulation min-h-[42px] ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                            : 'bg-white text-slate-700 border-slate-200/80 shadow-xs hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${activity.dotColor} ${activity.level === 'hot' ? 'animate-pulse' : ''}`} />
                        <span>{lead.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono border ${activity.color}`}>
                          {activity.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Desktop: Left Panel — Lead List with Semáforo ── */}
              <div className="hidden lg:flex lg:flex-col lg:col-span-5 bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
                {/* Header with sort */}
                <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Prospectos</span>
                    {/* Semáforo mini */}
                    <span className="flex items-center gap-0.5 ml-1">
                      {activityCounts.hot > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title={`${activityCounts.hot} calientes`} />}
                      {activityCounts.cooling > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" title={`${activityCounts.cooling} enfriándose`} />}
                      {(activityCounts.cold + activityCounts.dead) > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" title={`${activityCounts.cold + activityCounts.dead} fríos`} />}
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSortMode((m) => m === 'priority' ? 'activity' : m === 'activity' ? 'name' : 'priority')}
                    className="text-[10px] text-violet-600 font-bold flex items-center gap-1 hover:text-violet-800 transition-colors"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    {sortMode === 'priority' ? 'Prioridad' : sortMode === 'activity' ? 'Recientes' : 'A-Z'}
                  </button>
                </div>

                {/* Batch bar */}
                {batchSelected.size > 0 && (
                  <div className="px-3.5 py-2 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-violet-800">
                      {batchSelected.size} seleccionados
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const phones = pendingLeads
                            .filter((l) => batchSelected.has(l.id))
                            .map((l) => l.phone);
                          const links = phones.map((p) => `https://wa.me/${p}?text=${encodeURIComponent(reengagementTemplate)}`);
                          links.forEach((link, i) => setTimeout(() => window.open(link, '_blank'), i * 600));
                        }}
                        className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold flex items-center gap-1 transition-all active:scale-95"
                      >
                        <Send className="w-3 h-3" />
                        Re-enganchar todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchSelected(new Set())}
                        className="text-[10px] text-violet-600 font-bold hover:underline"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                )}

                {/* Lead list */}
                <div className="space-y-1 max-h-[520px] overflow-y-auto p-2.5">
                  {pendingLeads.map((lead) => {
                    const activity = getActivityLevel(lead.lastContactDate, lead.createdAt);
                    const isSelected = (selectedLead?.id === lead.id);
                    const latestMsg = extractLatestMessage(lead.notes);
                    const srcBadge = getSourceBadge(lead.source, lead.adSource);
                    const isBatchSelected = batchSelected.has(lead.id);

                    return (
                      <div
                        key={lead.id}
                        className={`relative flex items-center gap-2 group ${
                          isSelected ? '' : ''
                        }`}
                      >
                        {/* Batch checkbox */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleBatchSelect(lead.id); }}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isBatchSelected
                              ? 'bg-violet-600 border-violet-600 text-white'
                              : 'border-slate-300 hover:border-violet-400 text-transparent group-hover:border-slate-400'
                          }`}
                        >
                          {isBatchSelected && <CheckCheck className="w-3 h-3" />}
                        </button>

                        {/* Lead button */}
                        <button
                          type="button"
                          onClick={() => { setSelectedLeadId(lead.id); setShowTimeline(false); }}
                          className={`flex-1 text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'border-violet-500 bg-violet-50/70 shadow-xs ring-1 ring-violet-500/20'
                              : 'border-slate-200/60 bg-white/60 hover:bg-white'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${activity.dotColor} ${activity.level === 'hot' ? 'animate-pulse' : ''}`} />
                              <span className="font-extrabold text-xs text-slate-900 truncate max-w-[130px]">
                                {lead.name}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${activity.color}`}>
                                {activity.text}
                              </span>
                              {/* Source badge — mini */}
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${srcBadge.color} hidden xl:inline-flex items-center gap-0.5`}>
                                {srcBadge.label}
                              </span>
                            </div>

                            {latestMsg ? (
                              <p className="text-[10px] text-slate-600 truncate flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate italic">"{latestMsg}"</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-500 truncate">
                                {lead.service}
                              </p>
                            )}
                          </div>

                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'text-violet-600 translate-x-0.5' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Right Panel: Lead Detail ── */}
              {selectedLead && (
                <div className="lg:col-span-7 bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-xs p-4 sm:p-5 space-y-4">

                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                          Ficha de Prospecto
                        </span>
                        {/* Source badge */}
                        {(() => {
                          const sb = getSourceBadge(selectedLead.source, selectedLead.adSource);
                          const SbIcon = sb.icon;
                          return (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${sb.color}`}>
                              <SbIcon className="w-2.5 h-2.5" />
                              {sb.label}
                            </span>
                          );
                        })()}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        {selectedLead.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
                        <span>{selectedLead.service}</span>
                        <span>•</span>
                        <div className="inline-flex items-center gap-1">
                          <a
                            href={`https://wa.me/${selectedLead.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-emerald-600 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            +{selectedLead.phone}
                          </a>
                          <CopyPhoneButton phone={selectedLead.phone} />
                        </div>
                        <span>•</span>
                        {(() => {
                          const act = getActivityLevel(selectedLead.lastContactDate, selectedLead.createdAt);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${act.color}`}>
                              <span className={`w-2 h-2 rounded-full ${act.dotColor} ${act.level === 'hot' ? 'animate-pulse' : ''}`} />
                              <Clock className="w-3 h-3" />
                              {act.text}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/${selectedLead.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Abrir Chat</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  </div>

                  {/* Latest WA message notification */}
                  {extractLatestMessage(selectedLead.notes) && (
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2.5 shadow-2xs">
                      <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-extrabold text-[11px] text-emerald-900 block">
                          Última interacción WhatsApp:
                        </span>
                        <p className="text-xs text-emerald-800 font-medium italic mt-0.5">
                          "{extractLatestMessage(selectedLead.notes)}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ═══ 4. TIMELINE DE CONVERSACIÓN ═══ */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowTimeline(!showTimeline)}
                      className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-violet-700 transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Historial de Interacciones</span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showTimeline ? 'rotate-90' : ''}`} />
                    </button>

                    {showTimeline && (() => {
                      const timeline = extractNotesTimeline(selectedLead.notes);
                      if (timeline.length === 0) return (
                        <p className="text-[10px] text-slate-400 italic pl-5">Sin historial registrado</p>
                      );
                      return (
                        <div className="pl-2 border-l-2 border-slate-200 space-y-2 max-h-[200px] overflow-y-auto">
                          {timeline.map((entry, i) => (
                            <div key={i} className="pl-3 relative">
                              <div className={`absolute -left-[9px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                                entry.isWhatsApp ? 'bg-emerald-500' : 'bg-slate-400'
                              }`} />
                              <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className={`text-[11px] leading-relaxed ${entry.isWhatsApp ? 'text-emerald-800 font-medium' : 'text-slate-700'}`}>
                                    {entry.isWhatsApp && <MessageSquare className="w-3 h-3 text-emerald-600 inline mr-1" />}
                                    {entry.text}
                                  </p>
                                  {entry.timestamp && (
                                    <span className="text-[9px] text-slate-400 font-mono">{entry.timestamp}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Templates */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                      <span>Plantillas de Reactivación Comercial:</span>
                    </h4>

                    <div className="grid grid-cols-1 gap-2.5">
                      {templates.map((tpl, i) => {
                        const readyText = tpl.text
                          .replace('{name}', selectedLead.name)
                          .replace('{service}', selectedLead.service);
                        const waLink = `https://wa.me/${selectedLead.phone}?text=${encodeURIComponent(readyText)}`;

                        return (
                          <div key={i} className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs text-slate-900">
                                {tpl.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {tpl.description}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed italic border-l-2 border-violet-400/80 pl-2.5 py-0.5">
                              "{readyText}"
                            </p>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleCopyTemplate(i)}
                                className="h-8 px-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
                              >
                                {copiedTemplate === i ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                {copiedTemplate === i ? 'Copiado' : 'Copiar'}
                              </button>
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                              >
                                <Send className="w-3 h-3 text-emerald-400" />
                                Enviar
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes input */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block">
                      Anotar seguimiento / próximo paso:
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveNoteSubmit()}
                        placeholder="Ej: Llamar mañana a las 3 PM para confirmar propuesta..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNoteSubmit}
                        disabled={isSaving || !currentNote.trim()}
                        className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs transition-all active:scale-95 disabled:opacity-40 shrink-0"
                      >
                        Guardar
                      </button>
                    </div>

                    {selectedLead.notes && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 mt-2">
                        <span className="font-bold block mb-0.5 text-[11px]">Última nota:</span>
                        <p className="text-[11px] leading-relaxed text-amber-900/90 line-clamp-3">
                          {selectedLead.notes}
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ TAB: DASHBOARD DE PROSPECCIÓN OUTBOUND ═══ */}
      {activeTab === 'outbound' && (
        <div className="space-y-4">

          {/* Outbound metrics */}
          {outboundStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <Megaphone className="w-3.5 h-3.5 text-violet-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Prospectados</span>
                </div>
                <p className="text-xl font-black text-slate-900">{outboundStats.totalProspected}</p>
              </div>
              <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Tasa Respuesta</span>
                </div>
                <p className="text-xl font-black text-emerald-700">{outboundStats.responseRate}%</p>
                <p className="text-[9px] text-slate-500">{outboundStats.replied} respondieron</p>
              </div>
              <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Recientes</span>
                </div>
                <p className="text-xl font-black text-amber-700">{outboundStats.recent24h}</p>
                <p className="text-[9px] text-slate-500">últimas 48h</p>
              </div>
              <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <Snowflake className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Muertos</span>
                </div>
                <p className="text-xl font-black text-rose-700">{outboundStats.dead7d}</p>
                <p className="text-[9px] text-slate-500">+7 días sin contacto</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-violet-600" />
                Contactos Prospectados por Script
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'replied', 'ghosted', 'recent', 'dead'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setOutboundFilter(f)}
                    className={`h-7 px-2.5 rounded-lg text-[10px] font-bold transition-all ${
                      outboundFilter === f
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' && `Todos`}
                    {f === 'replied' && `✅ Respondió`}
                    {f === 'ghosted' && `👻 Ghosteó`}
                    {f === 'recent' && `⚡ Recientes`}
                    {f === 'dead' && `💀 Muertos`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={fetchOutboundData}
                  disabled={outboundLoading}
                  className="h-7 px-2.5 rounded-lg bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center gap-1 hover:bg-violet-200 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${outboundLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>
            </div>

            {/* Outbound list */}
            {outboundLoading && !outboundStats ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 text-slate-400 mx-auto animate-spin" />
                <p className="text-xs text-slate-500 mt-2">Cargando datos del servidor...</p>
              </div>
            ) : filteredOutbound.length === 0 ? (
              <div className="p-8 text-center">
                <Eye className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">
                  {outboundStats ? 'No hay contactos en este filtro' : 'Servidor no disponible. Asegúrate de que esté corriendo.'}
                </p>
              </div>
            ) : (
              <div className="max-h-[450px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-3.5 py-2.5">Teléfono</th>
                      <th className="px-3.5 py-2.5 hidden sm:table-cell">Mensaje Enviado</th>
                      <th className="px-3.5 py-2.5">Primer Contacto</th>
                      <th className="px-3.5 py-2.5">Último Envío</th>
                      <th className="px-3.5 py-2.5">Estado</th>
                      <th className="px-3.5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOutbound.map((entry) => {
                      const now = Date.now();
                      const age = now - entry.lastSentAt;
                      const isRecent = age < 172800000;
                      const isDead = age > 604800000;

                      return (
                        <tr key={entry.phone} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800">+{entry.phone}</span>
                              <CopyPhoneButton phone={entry.phone} />
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 hidden sm:table-cell">
                            <p className="text-slate-600 truncate max-w-[200px] italic">
                              "{entry.snippet || '—'}"
                            </p>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500 font-medium">
                            {formatTimestamp(entry.firstSentAt)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500 font-medium">
                            {formatTimestamp(entry.lastSentAt)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {entry.replyCount > 0 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                ✅ Respondió ({entry.replyCount})
                              </span>
                            ) : isRecent ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                ⏳ Esperando
                              </span>
                            ) : isDead ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                💀 Sin respuesta
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                                👻 Ghosteó
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <a
                              href={`https://wa.me/${entry.phone}?text=${encodeURIComponent(reengagementTemplate)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-7 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold inline-flex items-center gap-1 transition-all active:scale-95"
                            >
                              <Send className="w-3 h-3 text-emerald-400" />
                              Re-enviar
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Counter */}
                <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                  Mostrando {filteredOutbound.length} de {outboundStats?.totalProspected || 0} contactos
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
