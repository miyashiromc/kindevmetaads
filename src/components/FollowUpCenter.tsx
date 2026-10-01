import React, { useState, useMemo } from 'react';
import { 
  MessageCircle, 
  CheckCircle, 
  Send, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Phone,
  Clock,
  MessageSquare
} from 'lucide-react';
import { Lead } from '../types';
import { CopyPhoneButton } from './CopyPhoneButton';

interface FollowUpCenterProps {
  leads: Lead[];
  onSaveNote: (leadId: string, note: string) => Promise<void>;
}

export const FollowUpCenter: React.FC<FollowUpCenterProps> = ({ leads, onSaveNote }) => {
  // Filtramos prospectos, cotizados y anticipos
  const pendingLeads = useMemo(() => {
    return leads
      .filter((l) => l.status === 'prospecto' || l.status === 'cotizado' || l.status === 'anticipo')
      .sort((a, b) => {
        const timeA = new Date(a.lastContactDate || a.createdAt).getTime();
        const timeB = new Date(b.lastContactDate || b.createdAt).getTime();
        return timeB - timeA;
      });
  }, [leads]);

  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    pendingLeads[0]?.id || ''
  );
  const [currentNote, setCurrentNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedLead = pendingLeads.find((l) => l.id === selectedLeadId) || pendingLeads[0];

  // Calcular tiempo relativo e indicador inteligente de conversación
  const getContactActivity = (lead: Lead) => {
    const rawDate = lead.lastContactDate || lead.createdAt;
    const d = new Date(rawDate).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - d);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    const hasNewMessage = (lead.notes || '').includes('[Nuevo mensaje WhatsApp');

    if (diffMins < 60) {
      return {
        text: diffMins <= 1 ? 'Hace un momento' : `Hace ${diffMins}m`,
        color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold',
        hasNewMessage,
        isHot: true
      };
    }
    if (diffHours < 24) {
      return {
        text: `Hace ${diffHours}h`,
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-bold',
        hasNewMessage,
        isHot: false
      };
    }
    if (diffHours < 48) {
      return {
        text: 'Ayer / 24h',
        color: 'bg-amber-50 text-amber-900 border-amber-200/80',
        hasNewMessage,
        isHot: false
      };
    }
    return {
      text: `+${diffDays}d inactivo`,
      color: 'bg-rose-50 text-rose-800 border-rose-200/60',
      hasNewMessage,
      isHot: false
    };
  };

  // Extraer el texto del último mensaje recibido de WhatsApp si existe
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

  // Plantillas oficiales Kindev para seguimiento de ventas
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      
      {/* Encabezado */}
      <div className="bg-white/85 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Centro de Seguimiento Comercial</span>
            <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80">
              {pendingLeads.length} {pendingLeads.length === 1 ? 'contacto' : 'contactos'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitorea el tiempo de inactividad de cada prospecto y utiliza plantillas oficiales para WhatsApp.
          </p>
        </div>
      </div>

      {pendingLeads.length === 0 ? (
        <div className="bg-white/85 backdrop-blur-sm p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">¡Al día! No hay prospectos pendientes</h3>
          <p className="text-xs text-slate-500">
            Todos tus clientes actuales han sido cerrados con éxito hacia Meta CAPI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          
          {/* Selector Horizontal Rápido para Celulares (Scroll con el Pulgar) */}
          <div className="lg:hidden col-span-1 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 block">
              Seleccionar Prospecto:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {pendingLeads.map((lead) => {
                const isSelected = (selectedLead?.id === lead.id);
                const activity = getContactActivity(lead);
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
                    <span>{lead.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono border ${activity.color}`}>
                      {activity.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna Izquierda: Lista de Clientes en Escritorio */}
          <div className="hidden lg:block lg:col-span-5 bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-xs p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center justify-between">
              <span>Prospectos por Atención</span>
              <span className="text-[10px] font-mono lowercase text-slate-400 font-normal">por actividad reciente</span>
            </h3>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {pendingLeads.map((lead) => {
                const activity = getContactActivity(lead);
                const isSelected = (selectedLead?.id === lead.id);
                const latestMsg = extractLatestMessage(lead.notes);

                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50/70 shadow-xs ring-1 ring-violet-500/20'
                        : 'border-slate-200/60 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900 truncate max-w-[170px]">
                          {lead.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activity.color} flex items-center gap-1`}>
                          {activity.isHot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {activity.text}
                        </span>
                      </div>
                      
                      {latestMsg ? (
                        <p className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate italic">"{latestMsg}"</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 truncate">
                          {lead.service}
                        </p>
                      )}
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-violet-600 translate-x-0.5' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Ficha de Seguimiento & Plantillas */}
          {selectedLead && (
            <div className="lg:col-span-7 bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-5">
              
              {/* Encabezado del Prospecto Seleccionado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                    Ficha de Prospecto
                  </span>
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
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${getContactActivity(selectedLead).color}`}>
                      <Clock className="w-3 h-3" />
                      <span>{getContactActivity(selectedLead).text}</span>
                    </span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${selectedLead.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Abrir Chat WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>

              {/* Notificación inteligente si hay mensaje reciente recibido */}
              {extractLatestMessage(selectedLead.notes) && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2.5 shadow-2xs">
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-extrabold text-[11px] text-emerald-900 block">
                      Última interacción registrada de WhatsApp:
                    </span>
                    <p className="text-xs text-emerald-800 font-medium italic mt-0.5">
                      "{extractLatestMessage(selectedLead.notes)}"
                    </p>
                  </div>
                </div>
              )}

              {/* Plantillas de Seguimiento Rápido (Sin Box-in-Box) */}
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
                        <div className="flex justify-end pt-1">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                          >
                            <Send className="w-3 h-3 text-emerald-400" />
                            <span>Enviar por WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bitácora de Notas Rápidas */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block">
                  Anotar seguimiento / próximo paso:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    placeholder="Ej: Llamar mañana a las 3 PM para confirmar propuesta..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNoteSubmit}
                    disabled={isSaving || !currentNote.trim()}
                    className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs transition-all active:scale-95 disabled:opacity-40 shrink-0"
                  >
                    Guardar Nota
                  </button>
                </div>

                {selectedLead.notes && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 mt-2">
                    <span className="font-bold block mb-0.5 text-[11px]">Última nota guardada:</span>
                    <p className="text-[11px] leading-relaxed text-amber-900/90">
                      {selectedLead.notes}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
