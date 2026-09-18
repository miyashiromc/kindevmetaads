import React from 'react';
import { 
  Menu, 
  PlusCircle, 
  Calendar,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { TabView, MetaConfig, WhatsAppBotStatus } from '../types';

interface TopBarProps {
  activeTab: TabView;
  onOpenSidebar: () => void;
  onAddNewLead: () => void;
  config: MetaConfig;
  wsStatus: WhatsAppBotStatus;
  onOpenWsStatus: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenSidebar,
  onAddNewLead,
  config,
  wsStatus,
  onOpenWsStatus,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse
}) => {
  const isWsConnected = wsStatus.isListening && wsStatus.status === 'connected';

  const tabTitles: Record<TabView, { title: string; subtitle: string }> = {
    kanban: {
      title: 'Pipeline Visual Kanban',
      subtitle: 'Flujo de ventas en 5 etapas comerciales'
    },
    analytics: {
      title: 'Métricas & Analítica',
      subtitle: 'Embudo de conversión, facturación y KPIs'
    },
    ads_intelligence: {
      title: 'Inteligencia de Meta Ads',
      subtitle: 'Comparativa de creativos, ROAS y recomendaciones'
    },
    ltv_clients: {
      title: 'Clientes & Recompra (LTV)',
      subtitle: 'Gestión de renovaciones de hosting y segundas fases'
    },
    follow_up: {
      title: 'Centro de Seguimiento',
      subtitle: 'Alertas de inactividad y reactivación comercial'
    },
    quick_list: {
      title: 'Registro & Lista Rápida',
      subtitle: 'Captura de prospectos y listado paginado'
    }
  };

  const current = tabTitles[activeTab] || tabTitles.kanban;

  const todayStr = new Date().toLocaleDateString('es-EC', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3.5 transition-all">
      <div className="flex items-center justify-between gap-2.5 sm:gap-4">
        
        {/* Lado Izquierdo: Botón Menú Móvil / Toggle Escritorio + Título & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Menú Móvil */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 active:scale-95 touch-manipulation"
            title="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Toggle Barra Lateral Escritorio */}
          {onToggleSidebarCollapse && (
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
              title={isSidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-violet-600" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-500" />
              )}
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Panel</span>
              <span>/</span>
              <span className="text-violet-600 font-bold truncate">{current.title}</span>
            </div>
            <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight truncate leading-tight">
              {current.title}
            </h1>
          </div>
        </div>

        {/* Lado Derecho: Indicadores Rápidos & Acciones */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Indicador WhatsApp Rápido en Celulares (Táctil) */}
          <button
            type="button"
            onClick={onOpenWsStatus}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-slate-50 active:scale-95 text-xs font-bold transition-all"
            title="Estado WhatsApp"
          >
            <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[11px] font-mono text-slate-700">
              {isWsConnected ? 'WS' : 'Offline'}
            </span>
          </button>

          {/* Fecha Actual (Escritorio / Tablet) */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="capitalize">{todayStr}</span>
          </div>

          {/* Estado WhatsApp (Escritorio) */}
          <button
            type="button"
            onClick={onOpenWsStatus}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
              isWsConnected
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                : 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{isWsConnected ? 'WS Conectado' : 'WS Desconectado'}</span>
          </button>

          {/* Modo Prueba / Producción */}
          <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
            config.testMode
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.testMode ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{config.testMode ? `Prueba (${config.testEventCode || 'TEST'})` : 'Producción'}</span>
          </span>

          {/* Botón "+ Nuevo Contacto" */}
          <button
            type="button"
            onClick={onAddNewLead}
            className="h-9 px-3 sm:px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0 touch-manipulation"
          >
            <PlusCircle className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">Nuevo Contacto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>

      </div>
    </header>
  );
};
