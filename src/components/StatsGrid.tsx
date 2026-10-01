import React from 'react';
import { DollarSign, CheckCircle2, MessageSquare, Users } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsGridProps {
  stats: DashboardStats;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      
      {/* Facturación Meta */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-emerald-300/80 hover:shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold tracking-tight">Facturación Meta</span>
          <DollarSign className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight font-mono truncate">
            ${stats.totalRevenue.toFixed(0)} <span className="text-xs text-slate-400 font-sans font-medium">USD</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
            Eventos Purchase CAPI
          </p>
        </div>
      </div>

      {/* Ventas Cerradas */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-indigo-300/80 hover:shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold tracking-tight">Ventas Cerradas</span>
          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {stats.closedLeads}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
            Proyectos Entregados
          </p>
        </div>
      </div>

      {/* En Negociación */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-amber-300/80 hover:shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold tracking-tight">En Negociación</span>
          <MessageSquare className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight font-mono">
            {stats.pendingLeads}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
            Prospectos en pipeline
          </p>
        </div>
      </div>

      {/* Total Leads */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-violet-300/80 hover:shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold tracking-tight">Total Contactos</span>
          <Users className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {stats.totalLeads}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
            Base de clientes WhatsApp
          </p>
        </div>
      </div>

    </section>
  );
};
