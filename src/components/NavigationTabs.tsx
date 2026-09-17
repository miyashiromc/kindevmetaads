import React from 'react';
import { 
  Columns3, 
  BarChart3, 
  Target, 
  Gem, 
  Clock, 
  ListFilter 
} from 'lucide-react';
import { TabView } from '../types';

interface NavigationTabsProps {
  activeTab: TabView;
  onSelectTab: (tab: TabView) => void;
  kanbanCount: number;
  closedCount: number;
  followUpCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onSelectTab,
  kanbanCount,
  closedCount,
  followUpCount,
}) => {
  const tabs = [
    {
      id: 'kanban' as TabView,
      label: 'Pipeline Visual (Kanban)',
      shortLabel: 'Pipeline',
      icon: Columns3,
      badge: kanbanCount > 0 ? String(kanbanCount) : undefined,
      badgeColor: 'bg-violet-100 text-violet-700'
    },
    {
      id: 'analytics' as TabView,
      label: 'Métricas & Gráficos',
      shortLabel: 'Métricas',
      icon: BarChart3,
      badge: undefined
    },
    {
      id: 'ads_intelligence' as TabView,
      label: 'Inteligencia Meta Ads',
      shortLabel: 'Meta Ads',
      icon: Target,
      badge: 'ROAS',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'ltv_clients' as TabView,
      label: 'Clientes & Recompra (LTV)',
      shortLabel: 'Clientes LTV',
      icon: Gem,
      badge: closedCount > 0 ? String(closedCount) : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-700'
    },
    {
      id: 'follow_up' as TabView,
      label: 'Centro de Seguimiento',
      shortLabel: 'Seguimiento',
      icon: Clock,
      badge: followUpCount > 0 ? String(followUpCount) : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'quick_list' as TabView,
      label: 'Lista & Registro Rápido',
      shortLabel: 'Lista Rápida',
      icon: ListFilter,
      badge: undefined
    }
  ];

  return (
    <div className="w-full overflow-x-auto pb-1 scrollbar-none">
      <nav className="flex items-center gap-2 min-w-max p-1 bg-slate-200/60 rounded-2xl border border-slate-200/90 shadow-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.shortLabel}</span>

              {tab.badge && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
