import React from 'react';
import { 
  Columns3, 
  BarChart3, 
  Target, 
  Gem, 
  Clock, 
  ListFilter, 
  FlaskConical, 
  Lock, 
  Settings, 
  MessageSquare, 
  Database, 
  Radio, 
  X, 
  ChevronRight 
} from 'lucide-react';
import { TabView, MetaConfig, WhatsAppBotStatus } from '../types';
import { META_DATASET_ID } from '../lib/meta-capi';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabView;
  onSelectTab: (tab: TabView) => void;
  config: MetaConfig;
  wsStatus: WhatsAppBotStatus;
  kanbanCount: number;
  closedCount: number;
  followUpCount: number;
  firestoreConnected: boolean;
  onOpenConfig: () => void;
  onOpenWsStatus: () => void;
  onLock: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  config,
  wsStatus,
  kanbanCount,
  closedCount,
  followUpCount,
  firestoreConnected,
  onOpenConfig,
  onOpenWsStatus,
  onLock,
}) => {
  const isWsConnected = wsStatus.isListening && wsStatus.status === 'connected';

  const navItems = [
    {
      id: 'kanban' as TabView,
      label: 'Pipeline Kanban',
      description: 'Tablero de 5 etapas de venta',
      icon: Columns3,
      badge: kanbanCount > 0 ? String(kanbanCount) : undefined,
      badgeClass: 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
    },
    {
      id: 'analytics' as TabView,
      label: 'Métricas & Gráficos',
      description: 'Embudo y analítica en vivo',
      icon: BarChart3,
      badge: undefined
    },
    {
      id: 'ads_intelligence' as TabView,
      label: 'Inteligencia Meta Ads',
      description: 'ROAS y semáforo de anuncios',
      icon: Target,
      badge: 'ROAS',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono'
    },
    {
      id: 'ltv_clients' as TabView,
      label: 'Clientes & Recompra (LTV)',
      description: 'Hostings y segundas fases',
      icon: Gem,
      badge: closedCount > 0 ? String(closedCount) : undefined,
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
    },
    {
      id: 'follow_up' as TabView,
      label: 'Centro de Seguimiento',
      description: 'Alertas y plantillas WhatsApp',
      icon: Clock,
      badge: followUpCount > 0 ? String(followUpCount) : undefined,
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    {
      id: 'quick_list' as TabView,
      label: 'Registro & Lista Rápida',
      description: 'Captura y vista paginada',
      icon: ListFilter,
      badge: undefined
    }
  ];

  const handleTabClick = (tab: TabView) => {
    onSelectTab(tab);
    onClose(); // Cerrar en móvil si estaba abierto
  };

  return (
    <>
      {/* Backdrop para móviles */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Barra Lateral (Sidebar) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera de la Barra Lateral */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-800 rounded-xl border border-slate-700 shadow-inner flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Kindev S.A.S." 
                className="h-8 w-auto object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-white text-base tracking-tight">Kindev Meta Ads</h1>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold tracking-wide">
                CAPI Suite • SaaS 2026
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Widget del Escuchador de WhatsApp (Directo en el Sidebar) */}
        <div className="p-4 border-b border-slate-800/60">
          <button
            type="button"
            onClick={onOpenWsStatus}
            className={`w-full text-left p-3 rounded-2xl border transition-all active:scale-98 group ${
              isWsConnected
                ? 'bg-emerald-950/30 border-emerald-500/30 hover:bg-emerald-950/50 text-emerald-300'
                : wsStatus.status === 'qr_ready'
                ? 'bg-amber-950/30 border-amber-500/30 hover:bg-amber-950/50 text-amber-300'
                : 'bg-slate-800/50 border-slate-700/80 hover:bg-rose-950/30 hover:border-rose-500/30 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    isWsConnected ? 'bg-emerald-500' : wsStatus.status === 'qr_ready' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                  {isWsConnected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
                  )}
                </div>
                <span className="font-extrabold text-xs tracking-tight text-white flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {isWsConnected ? 'WhatsApp Activo' : wsStatus.status === 'qr_ready' ? 'Escanear QR' : 'WhatsApp Offline'}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </div>

            <div className="text-[11px] text-slate-400 truncate pl-4">
              {isWsConnected ? (
                <span>Línea: <strong className="text-emerald-400 font-mono">+{wsStatus.user || '593991952889'}</strong></span>
              ) : wsStatus.status === 'qr_ready' ? (
                <span className="text-amber-400">Toca para abrir código QR</span>
              ) : (
                <span className="text-rose-400">Servidor apagado o desconectado</span>
              )}
            </div>
          </button>
        </div>

        {/* Navegación Principal por Módulos */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-none">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Módulos Comerciales
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`w-full text-left flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl transition-all text-xs font-bold active:scale-98 ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <span className="block truncate">{item.label}</span>
                    <span className={`block text-[10px] font-normal truncate ${isActive ? 'text-violet-200' : 'text-slate-500'}`}>
                      {item.description}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : item.badgeClass || 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Estado del Entorno e Infraestructura */}
        <div className="p-4 mx-3 mb-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-[11px] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloud Firestore:</span>
            </span>
            <span className="font-bold text-slate-200">
              {firestoreConnected ? 'En línea' : 'Local'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-violet-400" />
              <span>Dataset CAPI:</span>
            </span>
            <span className="font-mono font-bold text-slate-300 text-[10px]">
              {META_DATASET_ID.slice(0, 6)}...
            </span>
          </div>
        </div>

        {/* Barra Inferior del Sidebar (Configuraciones y Perfil) */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onOpenConfig}
            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              config.testMode
                ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/50'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="Configuración de Meta y Tokens"
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate">{config.testMode ? 'Modo Prueba' : 'Producción'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenConfig}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all shrink-0"
            title="Ajustes y Parámetros"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onLock}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-all shrink-0"
            title="Bloquear sesión"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>

      </aside>
    </>
  );
};
