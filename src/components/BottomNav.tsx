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
      badge: kanbanCount > 0 ? (kanbanCount > 99 ? '99+' : String(kanbanCount)) : undefined,
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
      badge: '●',
      badgeColor: 'bg-emerald-500 text-emerald-100'
    },
    {
      id: 'ltv_clients' as TabView,
      label: 'Clientes',
      icon: Gem,
      badge: closedCount > 0 ? (closedCount > 99 ? '99+' : String(closedCount)) : undefined,
      badgeColor: 'bg-indigo-600 text-white'
    },
    {
      id: 'follow_up' as TabView,
      label: 'Seguir',
      icon: Clock,
      badge: followUpCount > 0 ? (followUpCount > 99 ? '99+' : String(followUpCount)) : undefined,
      badgeColor: 'bg-amber-600 text-white'
    },
    {
      id: 'quick_list' as TabView,
      label: 'Registro',
      icon: ListFilter,
      badge: undefined
    }
  ];

  return (
    <nav 
      aria-label="Navegación móvil inferior"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/90 backdrop-blur-2xl border-t border-slate-200/60 shadow-[0_-4px_25px_rgba(0,0,0,0.05)] pb-safe transition-all"
    >
      <div className="flex items-center justify-between px-1 py-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 active:scale-90 relative touch-manipulation min-h-[50px] ${
                isActive 
                  ? 'text-violet-700 font-extrabold' 
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              {/* Icono con badge y estado activo moderno */}
              <div className="relative flex items-center justify-center">
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 scale-105' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                {tab.badge && (
                  <span className={`absolute -top-1 -right-1 text-[8px] font-black min-w-[14px] h-3.5 px-1 rounded-full flex items-center justify-center leading-none font-mono shadow-xs ${
                    tab.badgeColor || 'bg-violet-600 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Etiqueta de texto ergonómica */}
              <span className={`text-[9.5px] tracking-tight truncate max-w-[52px] mt-1 ${
                isActive ? 'text-violet-700 font-black' : 'text-slate-400'
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
