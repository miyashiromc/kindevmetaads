import React, { useState } from 'react';
import { MessageCircle, DollarSign, Trash2, CheckCircle, Clock, User, XCircle, Edit3, Pencil, Check, X } from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { CopyPhoneButton } from './CopyPhoneButton';

interface LeadCardProps {
  lead: Lead;
  onOpenSale: (lead: Lead) => void;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
  onUpdateName?: (id: string, newName: string) => Promise<void>;
  onOpenProfile?: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onOpenSale, onUpdateStatus, onDelete, onUpdateName, onOpenProfile }) => {
  const isClosed = lead.status === 'cerrado';
  const waLink = `https://wa.me/${lead.phone}`;

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(lead.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async () => {
    if (!onUpdateName || !nameValue.trim()) {
      setIsEditingName(false);
      return;
    }
    try {
      setIsSaving(true);
      await onUpdateName(lead.id, nameValue.trim());
      setIsEditingName(false);
    } catch {
      // error handled in toast
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (lead.status) {
      case 'cerrado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Cerrado (${Number(lead.amount).toFixed(2)})
          </span>
        );
      case 'anticipo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700">
            <Clock className="w-3.5 h-3.5 text-violet-600" />
            Pagó Anticipo (${Number(lead.amount).toFixed(2)})
          </span>
        );
      case 'cotizado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Cotizado {lead.amount > 0 ? `($${Number(lead.amount).toFixed(2)})` : ''}
          </span>
        );
      case 'descartado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Descartado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Prospecto {lead.amount > 0 ? `($${Number(lead.amount).toFixed(2)})` : ''}
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 hover:border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
      
      {/* Datos del Cliente */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditingName ? (
            <div className="flex items-center gap-1.5 my-0.5">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
                disabled={isSaving}
                placeholder="Nombre del cliente..."
                className="text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-inner"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={isSaving || !nameValue.trim()}
                className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-all shrink-0 active:scale-95 touch-manipulation"
                title="Guardar nombre"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                disabled={isSaving}
                className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all shrink-0 active:scale-95 touch-manipulation"
                title="Cancelar edición"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenProfile ? onOpenProfile(lead) : onOpenSale(lead)}
                className="font-extrabold text-slate-900 text-base text-left hover:text-violet-600 transition-colors flex items-center gap-1.5 group cursor-pointer"
                title="Abrir perfil completo del cliente"
              >
                <span>{lead.name}</span>
                <span className="opacity-0 group-hover:opacity-100 text-[11px] font-semibold text-violet-600 transition-opacity">
                  (ver perfil)
                </span>
              </button>
              {onUpdateName && (
                <button
                  type="button"
                  onClick={() => {
                    setNameValue(lead.name);
                    setIsEditingName(true);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0 touch-manipulation"
                  title="Modificar nombre rápido"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {getStatusBadge()}
          {lead.source === 'whatsapp_auto' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              ⚡ Auto-WhatsApp
            </span>
          )}
          {lead.source === 'whatsapp_outreach' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80" title="Respuesta a prospección">
              🎯 Prospección
            </span>
          )}
        </div>

        {/* Metadatos en Línea Limpia (Cero Cajas Recargadas) */}
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <div className="flex items-center gap-1">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition-colors active:scale-95 py-0.5"
              title="Abrir WhatsApp Web"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>+{lead.phone}</span>
            </a>
            <CopyPhoneButton phone={lead.phone} />
          </div>
          <span className="text-slate-300">•</span>
          <span className="text-slate-700 font-medium">{lead.service}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400 text-[11px]">{formatDate(lead.createdAt)}</span>
        </div>

        {lead.notes && (
          <p className="text-xs text-slate-600 italic border-l-2 border-violet-400/80 pl-2.5 py-0.5">
            "{lead.notes}"
          </p>
        )}

        {/* Historial de Eventos Meta CAPI y Metadatos de Atribución */}
        <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
          {lead.metaEvents && lead.metaEvents.length > 0 && lead.metaEvents.map((evt, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                evt.eventName === 'Purchase' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold' 
                  : 'bg-violet-50 text-violet-700 border border-violet-200/70'
              }`}
              title={`fbtrace_id: ${evt.fbtraceId || 'N/A'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${evt.eventName === 'Purchase' ? 'bg-emerald-600' : 'bg-violet-600'}`}></span>
              Meta CAPI: {evt.eventName} {evt.amount ? `($${Number(evt.amount).toFixed(2)})` : ''}
            </span>
          ))}

          {(lead.fbc || lead.fbp) && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-violet-50 text-violet-700 border border-violet-200/60" title="Atribución Click ID y Browser ID">
              {lead.fbc ? 'fbc' : ''}{lead.fbc && lead.fbp ? ' • ' : ''}{lead.fbp ? 'fbp' : ''}
            </span>
          )}
          {lead.clientIp && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 text-slate-600" title={`IP: ${lead.clientIp}`}>
              IP: {lead.clientIp}
            </span>
          )}
        </div>
      </div>

      {/* Acciones (Ergonómicas al Alcance del Pulgar en Móvil) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
        {!isClosed ? (
          <button
            onClick={() => onOpenSale(lead)}
            className="h-11 sm:h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 touch-manipulation"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Cerrar Venta {lead.amount > 0 ? `($${lead.amount})` : ''}</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenSale(lead)}
            className="h-11 sm:h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95"
            title="Ajustar precio o registrar nueva venta a Meta"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Editar / Re-facturar</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          {/* Selector de Estado */}
          <select
            value={lead.status}
            onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
            className="flex-1 sm:flex-initial h-11 sm:h-10 bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-bold rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 cursor-pointer transition-all"
          >
            <option value="prospecto">Prospecto</option>
            <option value="cotizado">Cotizado</option>
            <option value="anticipo">Anticipo</option>
            <option value="cerrado">Cerrado</option>
            <option value="descartado">Descartado</option>
          </select>

          {/* Eliminar */}
          <button
            onClick={() => onDelete(lead.id)}
            className="w-11 sm:w-10 h-11 sm:h-10 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all flex items-center justify-center text-xs shrink-0 active:scale-95 touch-manipulation"
            title="Eliminar lead"
            aria-label="Eliminar cliente"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
