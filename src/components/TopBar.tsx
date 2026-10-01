import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  PlusCircle, 
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Plus,
  Check,
  Database
} from 'lucide-react';
import { TabView, MetaConfig, WhatsAppBotStatus, ClientAccount, UserRole, SystemApisStatus } from '../types';

interface TopBarProps {
  activeTab: TabView;
  onOpenSidebar: () => void;
  onAddNewLead: () => void;
  config: MetaConfig;
  wsStatus: WhatsAppBotStatus;
  onOpenWsStatus: () => void;
  apisStatus?: SystemApisStatus | null;
  onOpenMetaToken?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  // Soporte Multi-Cliente
  activeTenantId?: string;
  activeTenantName?: string;
  userRole?: UserRole;
  clients?: ClientAccount[];
  onSelectTenant?: (tenantId: string) => void;
  onOpenClientManager?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenSidebar,
  onAddNewLead,
  config,
  wsStatus,
  onOpenWsStatus,
  apisStatus,
  onOpenMetaToken,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  activeTenantId = 'kindev',
  activeTenantName = 'Kindev S.A.S.',
  userRole = 'superadmin',
  clients = [],
  onSelectTenant,
  onOpenClientManager
}) => {
  const isWsConnected = wsStatus.isListening && wsStatus.status === 'connected';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-3 max-w-[1600px] mx-auto w-full">
        
        {/* Lado Izquierdo: Menú Móvil / Toggle + Título & Selector de Cliente */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {/* Menú Móvil */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors shrink-0 active:scale-95 touch-manipulation"
            title="Abrir menú"
            aria-label="Abrir menú"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Toggle Barra Lateral Escritorio */}
          {onToggleSidebarCollapse && (
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
              title={isSidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-violet-600" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-500" />
              )}
            </button>
          )}

          {/* Selector de Cliente / Tenant Switcher */}
          {userRole === 'superadmin' ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100/80 text-slate-800 transition-all text-xs font-bold shrink-0 border border-transparent hover:border-slate-200/60"
                title="Cambiar de cuenta o cliente"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${activeTenantId === 'kindev' ? 'bg-violet-600' : 'bg-emerald-500'}`} />
                <span className="truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[200px] text-slate-900 font-extrabold">{activeTenantName}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200/80 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Cambiar Espacio de Trabajo
                  </div>

                  {/* Opción Kindev Principal */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTenant?.('kindev');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                      activeTenantId === 'kindev' ? 'font-black text-violet-700 bg-violet-50/60' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-[10px]">
                        KD
                      </div>
                      <div>
                        <p className="font-black text-xs leading-none">Kindev S.A.S.</p>
                        <span className="text-[10px] text-slate-400">Cuenta Principal</span>
                      </div>
                    </div>
                    {activeTenantId === 'kindev' && <Check className="w-3.5 h-3.5 text-violet-600" />}
                  </button>

                  {/* Lista de Clientes */}
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectTenant?.(c.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                        activeTenantId === c.id ? 'font-black text-emerald-700 bg-emerald-50/60' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate max-w-[150px]">
                          <p className="font-bold text-xs truncate leading-none">{c.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">Dataset: {c.metaConfig?.datasetId?.slice(-6) || 'N/A'}</span>
                        </div>
                      </div>
                      {activeTenantId === c.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  ))}

                  <div className="my-1 border-t border-slate-100" />

                  {/* Botón Administrar Clientes */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenClientManager?.();
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-violet-600 hover:bg-violet-50 flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Conectar / Gestionar Clientes</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl text-slate-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="truncate max-w-[140px]">{activeTenantName}</span>
            </div>
          )}

          {/* Separador vertical sutil */}
          <div className="hidden md:block w-px h-4 bg-slate-200" />

          {/* Título y Subtítulo de la Sección (PC) */}
          <div className="hidden md:block min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight truncate leading-none">
              {current.title}
            </h1>
            <p className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
              {current.subtitle}
            </p>
          </div>
        </div>

        {/* Lado Derecho: Indicadores Unificados & Acciones Ergonómicas */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Cluster Unificado de Estado de APIs (Cero Box-in-Box) */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-100/70 border border-slate-200/60 text-xs text-slate-600">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={onOpenWsStatus}
              className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
              title="API de WhatsApp (Baileys) — Clic para ver estado o escanear QR"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[11px] font-semibold">{isWsConnected ? 'WhatsApp' : 'WhatsApp Inactivo'}</span>
            </button>

            <span className="w-px h-3 bg-slate-200" />

            {/* Meta Ads */}
            <button
              type="button"
              onClick={onOpenMetaToken}
              className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
              title="Meta Graph & Marketing API — Clic para abrir Explorer o actualizar token"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${apisStatus?.metaMarketing.active ? 'bg-indigo-600 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[11px] font-semibold">{apisStatus?.metaMarketing.active ? 'Meta Ads' : 'Meta Ads!'}</span>
            </button>

            <span className="w-px h-3 bg-slate-200 hidden lg:block" />

            {/* CAPI */}
            <div className="hidden lg:flex items-center gap-1.5 text-slate-500 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-[10px]">CAPI</span>
            </div>

            {/* CRM Firestore */}
            <div className="hidden xl:flex items-center gap-1 text-slate-400 text-[11px]">
              <Database className="w-3 h-3 text-amber-500" />
              <span className="text-[10px]">CRM</span>
            </div>

            {/* Modo Prueba si está activo */}
            {config.testMode && (
              <>
                <span className="w-px h-3 bg-slate-200" />
                <span className="flex items-center gap-1 text-amber-700 font-bold text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>TEST</span>
                </span>
              </>
            )}
          </div>

          {/* Versión móvil compacta de estado */}
          <div className="sm:hidden flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenWsStatus}
              className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                isWsConnected ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full block ${isWsConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </button>
          </div>

          {/* Botón Principal "+ Nuevo Contacto" */}
          <button
            type="button"
            onClick={onAddNewLead}
            className="h-8.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
            aria-label="Registrar nuevo contacto"
          >
            <PlusCircle className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="hidden sm:inline">Nuevo Contacto</span>
            <span className="sm:hidden font-bold">Nuevo</span>
          </button>
        </div>

      </div>
    </header>
  );
};
