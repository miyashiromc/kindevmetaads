import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Tag, 
  FileText, 
  ShieldCheck, 
  Save, 
  Trash2,
  DollarSign
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { KINDEV_PRESETS } from '../lib/presets';

interface LeadProfileModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  onDeleteLead?: (leadId: string) => Promise<void>;
  onOpenSaleModal?: (lead: Lead, targetStatus?: 'anticipo' | 'cerrado') => void;
}

export const LeadProfileModal: React.FC<LeadProfileModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSaveLead,
  onDeleteLead,
  onOpenSaleModal
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [amountInput, setAmountInput] = useState<string>('0');
  const [status, setStatus] = useState<LeadStatus>('prospecto');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setName(lead.name || '');
      setPhone(lead.phone || '');
      setEmail(lead.email || '');
      setService(lead.service || 'Web Corporativa Base ($120)');
      const val = lead.amount || 0;
      setAmountInput(val > 0 ? val.toString() : '0');
      setStatus(lead.status || 'prospecto');
      setNotes(lead.notes || '');
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handlePresetSelect = (preset: typeof KINDEV_PRESETS[0]) => {
    setService(`${preset.label} ($${preset.amount})`);
    setAmountInput(preset.amount.toString());
  };

  const handleAmountInputChange = (val: string) => {
    setAmountInput(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const parsedAmount = parseFloat(amountInput);
      await onSaveLead(lead.id, {
        name: name.trim(),
        phone: phone.trim().replace(/\D/g, ''),
        email: email.trim(),
        service: service.trim(),
        amount: isNaN(parsedAmount) ? 0 : parsedAmount,
        status,
        notes: notes.trim()
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const hasPurchaseEvent = lead.metaEvents?.some(e => e.eventName === 'Purchase');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm sm:p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 overflow-hidden max-h-[92dvh] sm:max-h-[90vh] flex flex-col my-0 sm:my-6 pb-safe sm:pb-0">
        
        {/* Encabezado Principal */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/40 shrink-0">
          {/* Indicador táctil en móvil */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-3 sm:hidden" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate max-w-[160px] sm:max-w-xs">{lead.name}</h2>
                  <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-mono bg-white/15 border border-white/20 text-indigo-200">
                    ID: {lead.id.slice(-6)}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-indigo-200/80 mt-0.5 flex items-center gap-1.5 sm:gap-2">
                  <span>{new Date(lead.createdAt).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}</span>
                  <span>•</span>
                  <span className="capitalize">{lead.source === 'whatsapp_auto' ? 'Captura WhatsApp' : 'Manual'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href={`https://wa.me/${lead.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                title="Abrir WhatsApp Web"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Formulario / Contenido de Edición */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">

          {/* Estado de Embudo (4 Fases Claras) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Etapa en el Embudo Comercial</span>
              <span className="text-[11px] font-normal text-slate-500">4 Estados Oficiales</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'prospecto', label: 'Nuevo Lead', dot: 'bg-slate-400', activeBg: 'border-slate-800 bg-slate-900 text-white' },
                { key: 'cotizado', label: 'Cotizado', dot: 'bg-blue-500', activeBg: 'border-blue-600 bg-blue-600 text-white' },
                { key: 'anticipo', label: 'Pagó Anticipo', dot: 'bg-violet-500', activeBg: 'border-violet-600 bg-violet-600 text-white' },
                { key: 'cerrado', label: 'Entregado / Cerrado', dot: 'bg-emerald-500', activeBg: 'border-emerald-600 bg-emerald-600 text-white' }
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatus(st.key as LeadStatus)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    status === st.key
                      ? st.activeBg + ' shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${status === st.key ? 'bg-white' : st.dot}`} />
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Información Personal y Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Nombre del Cliente o Negocio
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-semibold text-slate-800 outline-none transition-all"
                placeholder="Nombre o razón social..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Teléfono WhatsApp (Con código de país)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-mono font-semibold text-slate-800 outline-none transition-all"
                placeholder="593991234567"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Correo Electrónico (Opcional — Eleva puntuación de coincidencia Meta)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs text-slate-800 outline-none transition-all"
                placeholder="cliente@ejemplo.com"
              />
            </div>
          </div>

          {/* Servicio y Presupuesto Comercial */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                Servicio Contratado y Precio del Proyecto
              </label>
              <span className="text-[11px] text-slate-500 font-semibold">Tarifario 2026</span>
            </div>

            {/* Presets de selección rápida */}
            <div className="flex flex-wrap gap-1.5">
              {KINDEV_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePresetSelect(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                    service.includes(`$${p.amount}`)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-300'
                  }`}
                >
                  {p.label} (${p.amount})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2 space-y-1">
                <span className="text-[11px] font-medium text-slate-600">Nombre del servicio</span>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                  placeholder="Ej. Web Corporativa Pro ($260)"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-600">Monto total ($ USD)</span>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountInput}
                    onChange={(e) => handleAmountInputChange(e.target.value)}
                    className="w-full pl-6 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notas y Requerimientos de la Conversación */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Notas de Seguimiento, Especificaciones y Conversación
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all resize-none"
              placeholder="Detalles sobre lo que busca el cliente, requerimientos técnicos, enlaces de referencia..."
            />
          </div>

          {/* Historial de Eventos Meta CAPI */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Auditoría de Meta Conversions API (CAPI)
              </span>
              <span className="text-[11px] font-mono text-indigo-700">
                {lead.metaEvents?.length || 0} eventos registrados
              </span>
            </div>

            {lead.metaEvents && lead.metaEvents.length > 0 ? (
              <div className="space-y-1.5">
                {lead.metaEvents.map((evt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-indigo-100 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${evt.eventName === 'Purchase' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className="font-bold text-slate-800">{evt.eventName}</span>
                      {evt.amount ? <span className="font-mono text-slate-600">(${evt.amount} USD)</span> : null}
                    </div>
                    <span className="font-mono text-slate-400 text-[10px]">
                      Trace: {evt.fbtraceId ? evt.fbtraceId.slice(0, 10) + '...' : 'OK'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-indigo-800/80 italic">
                  Aún no registra eventos de compra. Al marcar "Pagó Anticipo" o "Cerrado", se despachará el evento Purchase a Meta.
                </p>
                {onOpenSaleModal && !hasPurchaseEvent && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSaleModal(lead, 'anticipo');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all"
                  >
                    <DollarSign className="w-3 h-3" />
                    Registrar Anticipo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Barra de Acciones Final */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 shrink-0">
            {onDeleteLead ? (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`¿Eliminar definitivamente a ${lead.name}?`)) {
                    await onDeleteLead(lead.id);
                    onClose();
                  }
                }}
                className="h-11 px-3.5 rounded-xl border border-rose-200 hover:bg-rose-50 active:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-indigo-400" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
