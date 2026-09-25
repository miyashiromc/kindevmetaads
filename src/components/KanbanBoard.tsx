import React, { useState, useMemo } from 'react';
import { 
  Phone, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  PlusCircle,
  Search,
  Maximize2,
  Minimize2,
  DollarSign,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateStatus: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  onOpenSaleModal: (lead: Lead) => void;
  onAddNewLead: () => void;
  onUpdateName?: (leadId: string, newName: string) => Promise<void>;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
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
    description: 'Ajustando alcance o términos'
  },
  {
    status: 'anticipo',
    title: 'Pagó Anticipo',
    badgeBg: 'bg-violet-50 text-violet-900',
    borderColor: 'border-violet-200',
    dotColor: 'bg-violet-500',
    description: '50% abonado (En desarrollo)'
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
  onAddNewLead,
  onUpdateName,
  isSidebarCollapsed,
  onToggleSidebarCollapse
}) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<LeadStatus | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const columnsContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToStage = (status: LeadStatus, index: number) => {
    setActiveStageIndex(index);
    const colEl = document.getElementById(`kanban-col-${status}`);
    if (colEl && columnsContainerRef.current) {
      colEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  // Filtrar leads por búsqueda interna del Kanban
  const filteredLeads = useMemo(() => {
    if (!searchFilter.trim()) return leads;
    const q = searchFilter.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.service.toLowerCase().includes(q) ||
        (l.notes && l.notes.toLowerCase().includes(q))
    );
  }, [leads, searchFilter]);

  // Totales de métricas rápidas del tablero
  const pipelineMetrics = useMemo(() => {
    const closed = leads.filter((l) => l.status === 'cerrado');
    const closedTotal = closed.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const activePipeline = leads.filter((l) => l.status !== 'cerrado' && l.status !== 'descartado');
    const pipelineTotal = activePipeline.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return {
      totalLeads: leads.length,
      closedTotal,
      pipelineTotal,
      activeCount: activePipeline.length
    };
  }, [leads]);

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

  const handleStartEditName = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setEditNameValue(lead.name);
  };

  const handleSaveName = async (leadId: string) => {
    if (!onUpdateName || !editNameValue.trim()) {
      setEditingLeadId(null);
      return;
    }
    try {
      setIsSavingName(true);
      await onUpdateName(leadId, editNameValue.trim());
      setEditingLeadId(null);
    } catch {
      // Error handled by parent toast
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditingLeadId(null);
    setEditNameValue('');
  };

  return (
    <div className="space-y-4 w-full">
      {/* Barra de Control y Filtros del Kanban (Boxing Box Superior) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        
        {/* Título & Métricas Rápidas */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Tablero Visual de Ventas (Pipeline Kanban)
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                {leads.length} clientes
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Arrastra las tarjetas libremente o pulsa las flechas para avanzar etapas comerciales.
            </p>
          </div>

          {/* Píldoras de Facturación Rápida */}
          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cerrado: <strong className="font-mono font-bold">${pipelineMetrics.closedTotal.toFixed(0)} USD</strong></span>
            </div>

            {pipelineMetrics.pipelineTotal > 0 && (
              <div className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                <span>En Proceso: <strong className="font-mono font-bold">${pipelineMetrics.pipelineTotal.toFixed(0)} USD</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Buscador y Acciones */}
        <div className="flex items-center gap-2">
          {/* Buscador dentro del Kanban */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar cliente o teléfono..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggle de pantalla ancha / Colapsar barra lateral en escritorio */}
          {onToggleSidebarCollapse && (
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200 shrink-0"
              title={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral para pantalla completa"}
            >
              {isSidebarCollapsed ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Normal</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-violet-600" />
                  <span>Pantalla Ancha</span>
                </>
              )}
            </button>
          )}

          {/* Botón "+ Nuevo Contacto" */}
          <button
            type="button"
            onClick={onAddNewLead}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-violet-400" />
            <span>Nuevo Contacto</span>
          </button>
        </div>

      </div>

      {/* Selector de Etapa Rápido en Móvil (Píldoras con Scroll Horizontal Suave) */}
      <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5">
        {COLUMNS.map((col, idx) => {
          const colLeads = filteredLeads.filter((l) => l.status === col.status);
          const isSelected = activeStageIndex === idx;

          return (
            <button
              key={col.status}
              type="button"
              onClick={() => scrollToStage(col.status, idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border active:scale-95 touch-manipulation ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${col.dotColor}`} />
              <span>{col.title}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {colLeads.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Workspace de 5 Columnas — Amplitud Total con Scroll Snap en Móvil */}
      <div 
        ref={columnsContainerRef}
        className="flex gap-3 sm:gap-4 items-stretch w-full overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth scrollbar-thin scrollbar-thumb-slate-300"
      >
        {COLUMNS.map((col, colIdx) => {
          const colLeads = filteredLeads.filter((l) => l.status === col.status);
          const colTotal = colLeads.reduce((acc, curr) => acc + (curr.amount || 0), 0);
          const isDropTarget = activeDropCol === col.status;

          return (
            <div
              key={col.status}
              id={`kanban-col-${col.status}`}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`rounded-2xl border bg-slate-100/90 p-3 sm:p-3.5 flex flex-col w-[86vw] max-w-[340px] shrink-0 snap-center sm:w-auto sm:flex-1 sm:min-w-[280px] xl:min-w-[260px] 2xl:min-w-0 transition-all h-[calc(100dvh-280px)] sm:h-[calc(100vh-215px)] min-h-[480px] sm:min-h-[560px] ${
                isDropTarget
                  ? 'border-violet-500 bg-violet-50/70 ring-2 ring-violet-500/20 shadow-md'
                  : 'border-slate-200/90 shadow-2xs'
              }`}
            >
              {/* Encabezado Fijo de Columna */}
              <div className="pb-3 mb-2 border-b border-slate-200/80 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dotColor}`} />
                    <h3 className="font-extrabold text-xs text-slate-900 tracking-tight truncate">
                      {col.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="sm:hidden text-[10px] font-semibold text-slate-400">
                      {colIdx + 1}/5
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {colLeads.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate pr-1">{col.description}</span>
                  {colTotal > 0 && (
                    <span className="font-mono font-bold text-slate-800 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 shadow-2xs">
                      ${colTotal.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Área de Tarjetas con Scroll Vertical Independiente */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 mt-1 -mr-1">
                {colLeads.length === 0 ? (
                  <div className="h-36 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-300 rounded-2xl text-slate-400 bg-white/50">
                    <p className="text-xs font-semibold text-slate-600">Sin clientes en esta fase</p>
                    <p className="text-[11px] text-slate-400 mt-1">Arrastra una tarjeta o usa las flechas</p>
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const hasPrev = getPrevStatus(lead.status) !== null;
                    const hasNext = getNextStatus(lead.status) !== null;

                    return (
                      <div
                        key={lead.id}
                        draggable={editingLeadId !== lead.id}
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing space-y-2.5 group"
                      >
                        {/* Nombre del Cliente y Monto */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {editingLeadId === lead.id ? (
                              <div
                                className="flex items-center gap-1.5 my-0.5"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={editNameValue}
                                  onChange={(e) => setEditNameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveName(lead.id);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      handleCancelEditName();
                                    }
                                  }}
                                  autoFocus
                                  disabled={isSavingName}
                                  placeholder="Nombre o negocio..."
                                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1.5 focus:ring-violet-500 focus:border-violet-500 shadow-inner"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveName(lead.id)}
                                  disabled={isSavingName || !editNameValue.trim()}
                                  className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-all shrink-0 active:scale-95 touch-manipulation"
                                  title="Guardar nombre"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditName}
                                  disabled={isSavingName}
                                  className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all shrink-0 active:scale-95 touch-manipulation"
                                  title="Cancelar edición"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group/title">
                                <h4
                                  className="text-xs font-extrabold text-slate-900 truncate"
                                  title={lead.name}
                                >
                                  {lead.name}
                                </h4>
                                {onUpdateName && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditName(lead);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0 touch-manipulation"
                                    title="Modificar nombre del cliente"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}

                            <a
                              href={`https://wa.me/${lead.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200/70 font-mono inline-flex items-center gap-1 transition-colors mt-1 font-semibold"
                              title="Abrir chat en WhatsApp"
                            >
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>+{lead.phone}</span>
                            </a>
                          </div>

                          {lead.amount > 0 && (
                            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
                              ${lead.amount.toFixed(0)}
                            </span>
                          )}
                        </div>

                        {/* Servicio Cotizado / Notas */}
                        <div className="text-[11px] space-y-1">
                          <div className="font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 truncate">
                            {lead.service}
                          </div>
                          {lead.notes && (
                            <p className="text-slate-600 text-[10px] line-clamp-2 italic bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                              "{lead.notes}"
                            </p>
                          )}
                        </div>

                        {/* Controles de Avance Ergonómicos (Touch Targets Amplios) */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStepMove(lead, 'back')}
                            disabled={!hasPrev}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed border border-slate-200/80 text-slate-700 transition-all active:scale-95 touch-manipulation shrink-0"
                            title="Retroceder etapa"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {lead.status === 'anticipo' ? (
                            <button
                              type="button"
                              onClick={() => onOpenSaleModal(lead)}
                              className="flex-1 h-9 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 touch-manipulation"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Cerrar Venta ➔</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold truncate text-center flex-1">
                              {col.title}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStepMove(lead, 'forward')}
                            disabled={!hasNext}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed border border-slate-200/80 text-slate-700 transition-all active:scale-95 touch-manipulation shrink-0"
                            title="Avanzar etapa"
                          >
                            <ChevronRight className="w-4 h-4" />
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
