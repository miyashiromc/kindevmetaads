import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Tag, 
  ShieldCheck, 
  Save, 
  Trash2, 
  DollarSign, 
  ExternalLink, 
  MessageSquare, 
  Check 
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { KINDEV_PRESETS } from '../lib/presets';
import { CopyPhoneButton } from './CopyPhoneButton';

interface LeadProfileViewProps {
  lead: Lead;
  onBack: () => void;
  onSaveLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  onDeleteLead?: (leadId: string) => Promise<void>;
  onOpenSaleModal?: (lead: Lead, targetStatus?: 'anticipo' | 'cerrado') => void;
}

export const LeadProfileView: React.FC<LeadProfileViewProps> = ({
  lead,
  onBack,
  onSaveLead,
  onDeleteLead,
  onOpenSaleModal
}) => {
  const [name, setName] = useState(lead.name || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [email, setEmail] = useState(lead.email || '');
  const [service, setService] = useState(lead.service || 'Web Corporativa Base ($120)');
  const [amountInput, setAmountInput] = useState<string>(
    lead.amount && lead.amount > 0 ? lead.amount.toString() : '0'
  );
  const [status, setStatus] = useState<LeadStatus>(lead.status || 'prospecto');
  const [notes, setNotes] = useState(lead.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(lead.name || '');
    setPhone(lead.phone || '');
    setEmail(lead.email || '');
    setService(lead.service || 'Web Corporativa Base ($120)');
    const val = lead.amount || 0;
    setAmountInput(val > 0 ? val.toString() : '0');
    setStatus(lead.status || 'prospecto');
    setNotes(lead.notes || '');
  }, [lead]);

  const handlePresetSelect = (preset: typeof KINDEV_PRESETS[0]) => {
    setService(`${preset.label} ($${preset.amount})`);
    setAmountInput(preset.amount.toString());
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
      onBack();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteLead) return;
    setIsDeleting(true);
    try {
      await onDeleteLead(lead.id);
      onBack();
    } finally {
      setIsDeleting(false);
    }
  };

  const hasPurchaseEvent = lead.metaEvents?.some(e => e.eventName === 'Purchase');
  const cleanPhone = phone.replace(/\D/g, '');
  const waLink = `https://wa.me/${cleanPhone}`;

  // Extraer iniciales para el avatar
  const initials = (name.trim() || 'Cliente')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* ─── 1. BARRA SUPERIOR DE NAVEGACIÓN Y ACCIONES ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/80 shadow-2xs transition-all active:scale-95"
            title="Volver al tablero principal"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>/</span>
            <span>Clientes</span>
            <span>/</span>
            <span className="font-semibold text-slate-700 truncate max-w-[200px]">
              {name || 'Ficha del Cliente'}
            </span>
          </div>
        </div>

        {/* Acciones Globales: Eliminar & Guardar */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
              <span className="text-xs font-semibold text-rose-700 hidden md:inline">
                ¿Eliminar permanentemente?
              </span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
              >
                No
              </button>
            </div>
          ) : (
            onDeleteLead && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-bold transition-all"
                title="Eliminar este cliente"
              >
                <Trash2 className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">Eliminar Contacto</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !name.trim()}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-violet-400" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* ─── 2. HERO DEL CLIENTE (Directo en el lienzo, sin cajas anidadas) ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {name || 'Nuevo Contacto'}
              </h1>
              <span className="font-mono text-xs text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">
                #{lead.id.slice(-6)}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
              <div className="inline-flex items-center gap-1">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-mono font-bold transition-colors"
                  title="Abrir chat en WhatsApp"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>+{cleanPhone}</span>
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                </a>
                <CopyPhoneButton phone={cleanPhone} />
              </div>
              <span>•</span>
              <span>{lead.source === 'whatsapp_auto' ? 'Captura WhatsApp Automática' : 'Registro CRM'}</span>
              <span>•</span>
              <span>{new Date(lead.createdAt).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Facturación Total en Grande */}
        <div className="flex items-center gap-6 self-start lg:self-auto bg-white/70 backdrop-blur-sm px-5 py-3 rounded-2xl border border-slate-200/60 shadow-2xs">
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Valor del Proyecto
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                ${Number(amountInput || 0).toFixed(0)}
              </span>
              <span className="text-xs font-bold text-slate-400 font-sans">USD</span>
            </div>
          </div>
          
          <div className="w-px h-10 bg-slate-200" />

          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Estado Meta CAPI
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1 ${
              hasPurchaseEvent ? 'text-emerald-600' : 'text-slate-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${hasPurchaseEvent ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {hasPurchaseEvent ? 'Purchase Enviado' : 'Lead Pendiente'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. SELECTOR DE ETAPA EN EL EMBUDO COMERCIAL (Track Horizontal Fluido) ─── */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Etapa Comercial Actual</span>
          <span className="text-[11px] font-normal text-slate-400">Selecciona para actualizar el estado</span>
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'prospecto' as LeadStatus, label: 'Nuevo Lead', dot: 'bg-slate-400', activeBg: 'bg-slate-900 text-white border-slate-900 shadow-sm' },
            { id: 'cotizado' as LeadStatus, label: 'Cotizado', dot: 'bg-blue-500', activeBg: 'bg-blue-600 text-white border-blue-600 shadow-sm' },
            { id: 'anticipo' as LeadStatus, label: 'Pagó Anticipo', dot: 'bg-violet-500', activeBg: 'bg-violet-600 text-white border-violet-600 shadow-sm' },
            { id: 'cerrado' as LeadStatus, label: 'Entregado / Cerrado', dot: 'bg-emerald-500', activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-sm' }
          ].map((item) => {
            const isCurrent = status === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatus(item.id)}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition-all border active:scale-95 ${
                  isCurrent 
                    ? item.activeBg 
                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-white' : item.dot}`} />
                <span>{item.label}</span>
                {isCurrent && <Check className="w-3.5 h-3.5 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 4. REJILLA MAESTRA DE 2 COLUMNAS (Lienzo Asimétrico y Limpio) ─── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: DATOS COMERCIALES & CONVERSACIÓN (2/3 de ancho) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Bloque: Información de Contacto */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <User className="w-4 h-4 text-violet-600" />
              <span>Información de Contacto</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">
                  Nombre del Cliente o Razón Social
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Juan Pérez / Inmobiliaria..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">
                  Teléfono WhatsApp (Con código de país)
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 593991234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                  <span>Correo Electrónico (Opcional)</span>
                  <span className="text-[11px] font-normal text-slate-400">Mejora el match quality en Meta CAPI</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Bloque: Servicio y Presupuesto Oficial Kindev 2026 */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>Servicio Contratado y Presupuesto</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-400">
                Tarifario Kindev 2026
              </span>
            </div>

            {/* Presets Rápidos Oficiales */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Selección Rápida de Paquete:
              </span>
              <div className="flex flex-wrap gap-2">
                {KINDEV_PRESETS.map((p) => {
                  const isSelected = amountInput === p.amount.toString();
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="ml-1.5 font-mono opacity-80">${p.amount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campos de Especificación y Monto */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-600">
                  Concepto o Nombre del Servicio
                </label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="Ej. Web Corporativa Base ($120)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">
                  Monto Total ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bloque: Bitácora de Conversación y Notas */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>Historial de Conversación y Notas Técnicas</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Sincronizado con WhatsApp
              </span>
            </div>

            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe notas internas sobre los requerimientos del cliente, presupuestos acordados o detalles de entrega..."
              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all leading-relaxed font-sans"
            />
          </div>

        </div>

        {/* COLUMNA DERECHA: AUDITORÍA META CAPI & DETALLES (1/3 de ancho) */}
        <div className="space-y-6">
          
          {/* Bloque: Auditoría de Eventos Meta CAPI */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-600" />
                <span>Auditoría Meta CAPI</span>
              </h3>
              <span className="text-xs font-mono font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                {lead.metaEvents?.length || 0} eventos
              </span>
            </div>

            {/* Estado del Evento Purchase */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Evento Purchase:</span>
                <span className={`text-xs font-bold font-mono ${hasPurchaseEvent ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {hasPurchaseEvent ? 'Despachado' : 'No Despachado'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {hasPurchaseEvent 
                  ? 'La compra ya fue transmitida al Dataset de Meta Ads y sumada al ROAS de la campaña.'
                  : 'Al registrar un anticipo o cerrar la venta, se transmitirá el valor a Meta Conversions API.'}
              </p>
            </div>

            {/* Historial de Eventos Reportados */}
            {lead.metaEvents && lead.metaEvents.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Eventos Confirmados:
                </span>
                <div className="space-y-1.5">
                  {lead.metaEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs flex items-center justify-between shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
                          <span className="font-bold text-slate-900">{evt.eventName}</span>
                          {evt.amount && (
                            <span className="font-mono font-bold text-emerald-600">
                              (${Number(evt.amount).toFixed(2)})
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] text-slate-400 font-mono truncate mt-0.5">
                          Trace: {evt.fbtraceId || 'Confirmado'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 pl-2">
                        {new Date(evt.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Acciones de Venta / Anticipo */}
            {onOpenSaleModal && (
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                {!hasPurchaseEvent ? (
                  <button
                    type="button"
                    onClick={() => onOpenSaleModal(lead, 'anticipo')}
                    className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Registrar Anticipo y Despachar CAPI</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenSaleModal(lead, 'cerrado')}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Editar Venta / Re-facturar</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bloque: Metadatos del Prospecto */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Metadatos del Sistema
            </h3>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Canal de Ingreso:</span>
                <span className="font-semibold text-slate-700">
                  {lead.source === 'whatsapp_auto' ? 'WhatsApp Baileys' : 'Registro Manual'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">Fecha de Creación:</span>
                <span className="font-semibold text-slate-700">
                  {new Date(lead.createdAt).toLocaleDateString('es-EC', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">Identificador Firestore:</span>
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                  {lead.id}
                </span>
              </div>
            </div>
          </div>

        </div>

      </form>

    </div>
  );
};
