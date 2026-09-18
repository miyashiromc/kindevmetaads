import React from 'react';
import { 
  Columns3, 
  BarChart3, 
  Target, 
  Gem, 
  ListFilter,
  Clock
} from 'lucide-react';
import { TabView } from '../types';

interface BottomNavProps {
  activeTab: TabView;
  onSelectTab: (tab: TabView) => void;
  kanbanCount?: number;
  closedCount?: number;
  followUpCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  kanbanCount = 0,
  closedCount = 0,
  followUpCount = 0
}) => {
  const tabs = [
    {
      id: 'kanban' as TabView,
      label: 'Kanban',
      icon: Columns3,
      badge: kanbanCount > 0 ? String(kanbanCount) : undefined,
      badgeColor: 'bg-violet-600 text-white'
    },
    {
      id: 'analytics' as TabView,
      label: 'Métricas',
      icon: BarChart3,
      badge: undefined
    },
    {
      id: 'ads_intelligence' as TabView,
      label: 'Meta Ads',
      icon: Target,
      badge: 'ROAS',
      badgeColor: 'bg-emerald-600 text-white'
    },
    {
      id: 'ltv_clients' as TabView,
      label: 'LTV Clientes',
      icon: Gem,
      badge: closedCount > 0 ? String(closedCount) : undefined,
      badgeColor: 'bg-indigo-600 text-white'
    },
    {
      id: 'follow_up' as TabView,
      label: 'Seguimiento',
      icon: Clock,
      badge: followUpCount > 0 ? String(followUpCount) : undefined,
      badgeColor: 'bg-amber-600 text-white'
    },
    {
      id: 'quick_list' as TabView,
      label: 'Lista',
      icon: ListFilter,
      badge: undefined
    }
  ];

  return (
    <nav 
      aria-label="Navegación móvil inferior"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] pb-safe transition-all"
    >
      <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-90 relative touch-manipulation min-h-[48px] ${
                isActive 
                  ? 'text-violet-600 font-extrabold' 
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              {/* Barra superior de pestaña activa */}
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-violet-600 shadow-sm shadow-violet-500/50 animate-fade-in" />
              )}

              {/* Icono con badge */}
              <div className="relative flex items-center justify-center">
                <div className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-violet-50 text-violet-600' : 'text-slate-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                {tab.badge && (
                  <span className={`absolute -top-1 -right-2 text-[9px] font-black px-1.5 py-0.2 rounded-full leading-tight shadow-2xs font-mono ${
                    tab.badgeColor || 'bg-violet-600 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Etiqueta de texto */}
              <span className={`text-[10px] tracking-tight truncate max-w-[56px] mt-0.5 ${
                isActive ? 'text-violet-600 font-black' : 'text-slate-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
