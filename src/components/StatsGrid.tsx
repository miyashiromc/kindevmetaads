import React from 'react';
import { DollarSign, CheckCircle2, MessageSquare, Users } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsGridProps {
  stats: DashboardStats;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      
      {/* Facturación Meta */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
          <span>Facturación Meta</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl md:text-3xl font-extrabold text-emerald-600 tracking-tight">
          ${stats.totalRevenue.toFixed(2)}
        </div>
        <div className="text-[11px] text-slate-400 font-medium mt-1">
          Enviado a Meta CAPI (USD)
        </div>
      </div>

      {/* Ventas Cerradas */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
          <span>Ventas Cerradas</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl md:text-3xl font-extrabold text-indigo-600 tracking-tight">
          {stats.closedLeads}
        </div>
        <div className="text-[11px] text-slate-400 font-medium mt-1">
          Eventos `Purchase`
        </div>
      </div>

      {/* En Negociación */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
          <span>En Negociación</span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl md:text-3xl font-extrabold text-amber-600 tracking-tight">
          {stats.pendingLeads}
        </div>
        <div className="text-[11px] text-slate-400 font-medium mt-1">
          Prospectos en curso
        </div>
      </div>

      {/* Total Leads */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-violet-300 transition-all">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
          <span>Total Contactos</span>
          <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl md:text-3xl font-extrabold text-violet-600 tracking-tight">
          {stats.totalLeads}
        </div>
        <div className="text-[11px] text-slate-400 font-medium mt-1">
          Clientes de WhatsApp
        </div>
      </div>

    </section>
  );
};
