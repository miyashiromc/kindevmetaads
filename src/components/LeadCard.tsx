import React from 'react';
import { MessageCircle, DollarSign, Trash2, CheckCircle, Clock, User, XCircle, Edit3 } from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface LeadCardProps {
  lead: Lead;
  onOpenSale: (lead: Lead) => void;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onOpenSale, onUpdateStatus, onDelete }) => {
  const isClosed = lead.status === 'cerrado';
  const waLink = `https://wa.me/${lead.phone}`;

  const getStatusBadge = () => {
    switch (lead.status) {
      case 'cerrado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Cerrado (${Number(lead.amount).toFixed(2)})
          </span>
        );
      case 'en_negociacion':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            En Negociación {lead.amount > 0 ? `($${Number(lead.amount).toFixed(2)})` : ''}
          </span>
        );
      case 'descartado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Descartado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
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
    <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
      
      {/* Datos del Cliente */}
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h4 className="font-bold text-slate-900 text-base">{lead.name}</h4>
          {getStatusBadge()}
          {lead.source === 'whatsapp_auto' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ⚡ Auto-WhatsApp
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            +{lead.phone}
          </a>
          <span>•</span>
          <span className="text-slate-700 font-medium">{lead.service}</span>
          <span>•</span>
          <span className="text-slate-400 text-[11px]">{formatDate(lead.createdAt)}</span>
        </div>

        {lead.notes && (
          <p className="text-xs text-slate-600 italic bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/60 inline-block">
            {lead.notes}
          </p>
        )}

        {/* Historial de Eventos Meta */}
        {lead.metaEvents && lead.metaEvents.length > 0 && (
          <div className="pt-1 flex items-center gap-1.5 flex-wrap">
            {lead.metaEvents.map((evt, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-violet-50 text-violet-700 border border-violet-200/80"
                title={`fbtrace_id: ${evt.fbtraceId || 'N/A'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
                Meta CAPI: {evt.eventName} {evt.amount ? `($${Number(evt.amount).toFixed(2)})` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 self-end md:self-center">
        {!isClosed ? (
          <button
            onClick={() => onOpenSale(lead)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Cerrar Venta {lead.amount > 0 ? `($${lead.amount})` : ''}</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenSale(lead)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5"
            title="Ajustar precio o registrar nueva venta a Meta"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Editar / Re-facturar</span>
          </button>
        )}

        {/* Selector de Estado */}
        <select
          value={lead.status}
          onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
          className="bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-violet-600 cursor-pointer transition-all"
        >
          <option value="prospecto">Prospecto</option>
          <option value="en_negociacion">Negociación</option>
          <option value="cerrado">Cerrado</option>
          <option value="descartado">Descartado</option>
        </select>

        {/* Eliminar */}
        <button
          onClick={() => onDelete(lead.id)}
          className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all flex items-center justify-center text-xs"
          title="Eliminar lead"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
