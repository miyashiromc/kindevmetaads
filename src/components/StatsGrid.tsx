import React from 'react';
import { DollarSign, CheckCircle2, MessageSquare, Users } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsGridProps {
  stats: DashboardStats;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
      
      {/* Facturación Meta */}
      <div className="bg-white/85 backdrop-blur-sm p-3.5 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
          <span className="truncate text-[11px] sm:text-xs">Facturación Meta</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-3xl font-black text-emerald-600 tracking-tight font-mono truncate">
            ${stats.totalRevenue.toFixed(0)} <span className="text-xs text-slate-400 font-sans font-medium">USD</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
            Enviado a Meta CAPI
          </div>
        </div>
      </div>

      {/* Ventas Cerradas */}
      <div className="bg-white/85 backdrop-blur-sm p-3.5 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
          <span className="truncate text-[11px] sm:text-xs">Ventas Cerradas</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-3xl font-black text-indigo-600 tracking-tight font-mono">
            {stats.closedLeads}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
            Eventos Purchase
          </div>
        </div>
      </div>

      {/* En Negociación */}
      <div className="bg-white/85 backdrop-blur-sm p-3.5 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
          <span className="truncate text-[11px] sm:text-xs">En Negociación</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-3xl font-black text-amber-600 tracking-tight font-mono">
            {stats.pendingLeads}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
            Prospectos activos
          </div>
        </div>
      </div>

      {/* Total Leads */}
      <div className="bg-white/85 backdrop-blur-sm p-3.5 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs relative overflow-hidden group hover:border-violet-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
          <span className="truncate text-[11px] sm:text-xs">Total Contactos</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-3xl font-black text-violet-600 tracking-tight font-mono">
            {stats.totalLeads}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
            Clientes WhatsApp
          </div>
        </div>
      </div>

    </section>
  );
};
