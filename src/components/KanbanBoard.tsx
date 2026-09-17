import React, { useState } from 'react';
import { 
  Phone, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  PlusCircle 
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateStatus: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  onOpenSaleModal: (lead: Lead) => void;
  onAddNewLead: () => void;
}

interface ColumnConfig {
  status: LeadStatus;
  title: string;
  badgeBg: string;
  borderColor: string;
  dotColor: string;
  description: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: 'prospecto',
    title: 'Nuevo Lead',
    badgeBg: 'bg-slate-100 text-slate-800',
    borderColor: 'border-slate-300/80',
    dotColor: 'bg-slate-400',
    description: 'Recién contactado vía WhatsApp'
  },
  {
    status: 'cotizado',
    title: 'Cotizado',
    badgeBg: 'bg-blue-50 text-blue-800',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
    description: 'Propuesta de precio enviada'
  },
  {
    status: 'en_negociacion',
    title: 'En Negociación',
    badgeBg: 'bg-amber-50 text-amber-900',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
    description: 'Ajustando alcance o requerimientos'
  },
  {
    status: 'anticipo',
    title: 'Pagó Anticipo',
    badgeBg: 'bg-violet-50 text-violet-900',
    borderColor: 'border-violet-200',
    dotColor: 'bg-violet-500',
    description: 'Anticipo 50% abonado (En desarrollo)'
  },
  {
    status: 'cerrado',
    title: 'Entregado / Cerrado',
    badgeBg: 'bg-emerald-50 text-emerald-900',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
    description: '100% Pagado & CAPI Despachado'
  }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  onUpdateStatus,
  onOpenSaleModal,
  onAddNewLead
}) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<LeadStatus | null>(null);

  const getNextStatus = (current: LeadStatus): LeadStatus | null => {
    switch (current) {
      case 'prospecto': return 'cotizado';
      case 'cotizado': return 'en_negociacion';
      case 'en_negociacion': return 'anticipo';
      case 'anticipo': return 'cerrado';
      default: return null;
    }
  };

  const getPrevStatus = (current: LeadStatus): LeadStatus | null => {
    switch (current) {
      case 'cerrado': return 'anticipo';
      case 'anticipo': return 'en_negociacion';
      case 'en_negociacion': return 'cotizado';
      case 'cotizado': return 'prospecto';
      default: return null;
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (activeDropCol !== status) {
      setActiveDropCol(status);
    }
  };

  const handleDragLeave = () => {
    setActiveDropCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    setActiveDropCol(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;

    if (targetStatus === 'cerrado') {
      onOpenSaleModal(lead);
    } else {
      await onUpdateStatus(leadId, targetStatus);
    }
    setDraggedLeadId(null);
  };

  const handleStepMove = async (lead: Lead, direction: 'forward' | 'back') => {
    const target = direction === 'forward' ? getNextStatus(lead.status) : getPrevStatus(lead.status);
    if (!target) return;

    if (target === 'cerrado') {
      onOpenSaleModal(lead);
    } else {
      await onUpdateStatus(lead.id, target);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header del Kanban */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Tablero Visual de Ventas (Pipeline Kanban)</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800">
              {leads.length} {leads.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Arrastra las tarjetas o usa las flechas rápidas para avanzar de etapa comercial.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddNewLead}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-violet-400" />
          <span>Nuevo Contacto</span>
        </button>
      </div>

      {/* Grid de 5 Columnas con Scroll Horizontal en móvil */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.status);
          const colTotal = colLeads.reduce((acc, curr) => acc + (curr.amount || 0), 0);
          const isDropTarget = activeDropCol === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`rounded-2xl border bg-slate-100/70 p-3 flex flex-col min-w-[260px] transition-all min-h-[480px] ${
                isDropTarget
                  ? 'border-violet-500 bg-violet-50/50 ring-2 ring-violet-500/20 shadow-md'
                  : 'border-slate-200/80 shadow-sm'
              }`}
            >
              {/* Encabezado de Columna */}
              <div className="pb-3 mb-2 border-b border-slate-200/70">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                    <h3 className="font-extrabold text-xs text-slate-800 tracking-tight">
                      {col.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    {colLeads.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{col.description}</span>
                  {colTotal > 0 && (
                    <span className="font-mono font-bold text-slate-700 shrink-0">
                      ${colTotal.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Lista de Tarjetas */}
              <div className="space-y-2.5 flex-1">
                {colLeads.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-300 rounded-xl text-slate-400">
                    <p className="text-[11px] font-medium">Sin clientes en esta fase</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Arrastra un lead aquí</p>
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const hasPrev = getPrevStatus(lead.status) !== null;
                    const hasNext = getNextStatus(lead.status) !== null;

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5 group"
                      >
                        {/* Nombre y Badge de Servicio */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">
                              {lead.name}
                            </h4>
                            <a
                              href={`https://wa.me/${lead.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-slate-500 hover:text-emerald-700 font-mono inline-flex items-center gap-1 transition-colors"
                              title="Abrir chat en WhatsApp"
                            >
                              <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span>+{lead.phone}</span>
                            </a>
                          </div>

                          {lead.amount > 0 && (
                            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
                              ${lead.amount.toFixed(0)}
                            </span>
                          )}
                        </div>

                        {/* Servicio / Nota */}
                        <div className="text-[11px] space-y-1">
                          <div className="font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 truncate">
                            {lead.service}
                          </div>
                          {lead.notes && (
                            <p className="text-slate-500 text-[10px] line-clamp-2 italic bg-slate-50/50 p-1.5 rounded">
                              "{lead.notes}"
                            </p>
                          )}
                        </div>

                        {/* Controles de Avance Ergonómicos */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepMove(lead, 'back')}
                            disabled={!hasPrev}
                            className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 text-slate-600 transition-all"
                            title="Retroceder etapa"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          {lead.status === 'anticipo' ? (
                            <button
                              type="button"
                              onClick={() => onOpenSaleModal(lead)}
                              className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Cerrar Venta ➔</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {col.title}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStepMove(lead, 'forward')}
                            disabled={!hasNext}
                            className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 text-slate-600 transition-all"
                            title="Avanzar etapa"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
