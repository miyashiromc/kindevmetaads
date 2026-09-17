import React, { useState } from 'react';
import { 
  MessageCircle, 
  CheckCircle, 
  Send, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Phone
} from 'lucide-react';
import { Lead } from '../types';

interface FollowUpCenterProps {
  leads: Lead[];
  onSaveNote: (leadId: string, note: string) => Promise<void>;
}

export const FollowUpCenter: React.FC<FollowUpCenterProps> = ({ leads, onSaveNote }) => {
  // Filtramos prospectos y en negociación
  const pendingLeads = leads.filter(
    (l) => l.status === 'prospecto' || l.status === 'cotizado' || l.status === 'en_negociacion' || l.status === 'anticipo'
  );

  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    pendingLeads[0]?.id || ''
  );
  const [currentNote, setCurrentNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedLead = pendingLeads.find((l) => l.id === selectedLeadId) || pendingLeads[0];

  // Calcular horas desde el último contacto o registro
  const getHoursSinceContact = (dateStr: string) => {
    const d = new Date(dateStr).getTime();
    const now = Date.now();
    const diffHours = Math.floor((now - d) / (1000 * 60 * 60));
    return diffHours;
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
    <div className="space-y-6 animate-fade-in">
      
      {/* Encabezado */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Centro de Seguimiento Comercial & Reactivación</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
              {pendingLeads.length} {pendingLeads.length === 1 ? 'contacto pendiente' : 'contactos pendientes'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitorea el tiempo de inactividad de cada prospecto y utiliza plantillas de alta conversión para WhatsApp.
          </p>
        </div>
      </div>

      {pendingLeads.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-2">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">¡Al día! No hay prospectos pendientes</h3>
          <p className="text-xs text-slate-500">
            Todos tus clientes actuales han sido cerrados con éxito hacia Meta CAPI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Columna Izquierda: Lista de Clientes por Urgencia */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
              Prospectos por Atención
            </h3>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {pendingLeads.map((lead) => {
                const hours = getHoursSinceContact(lead.createdAt);
                const isSelected = (selectedLead?.id === lead.id);

                let badge = { text: 'Hoy', color: 'bg-emerald-100 text-emerald-800' };
                if (hours >= 48) {
                  badge = { text: `+${Math.floor(hours / 24)} días sin hablar`, color: 'bg-rose-100 text-rose-800' };
                } else if (hours >= 24) {
                  badge = { text: 'Hace 24h', color: 'bg-amber-100 text-amber-900' };
                }

                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50/60 shadow-sm ring-1 ring-violet-500/30'
                        : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 truncate">
                          {lead.name}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {lead.service}
                      </p>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-violet-600 translate-x-0.5' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Ficha de Seguimiento & Plantillas */}
          {selectedLead && (
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
              
              {/* Encabezado del Prospecto Seleccionado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                    Ficha de Prospecto
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    {selectedLead.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>{selectedLead.service}</span>
                    <span>•</span>
                    <a
                      href={`https://wa.me/${selectedLead.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-600 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      +{selectedLead.phone}
                    </a>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${selectedLead.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 self-start sm:self-auto"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Abrir Chat WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>

              {/* Plantillas de Seguimiento Rápido */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
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
                      <div key={i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">
                            {tpl.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {tpl.description}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed italic bg-white p-2 rounded-xl border border-slate-200/60">
                          "{readyText}"
                        </p>
                        <div className="flex justify-end">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
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
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block">
                  Anotar seguimiento / próximo paso:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    placeholder="Ej: Llamar mañana a las 3 PM para confirmar propuesta..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-600"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNoteSubmit}
                    disabled={isSaving || !currentNote.trim()}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-40"
                  >
                    Guardar
                  </button>
                </div>

                {selectedLead.notes && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 mt-2">
                    <span className="font-bold block mb-0.5">Última nota guardada:</span>
                    <p className="text-[11px] leading-relaxed">
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
