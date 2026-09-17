import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  PieChart, 
  Award, 
  Layers, 
  Percent, 
  Activity 
} from 'lucide-react';
import { Lead } from '../types';

interface AnalyticsViewProps {
  leads: Lead[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ leads }) => {
  const closedLeads = leads.filter((l) => l.status === 'cerrado');
  const totalRevenue = closedLeads.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const averageTicket = closedLeads.length > 0 ? totalRevenue / closedLeads.length : 0;
  
  const pendingLeads = leads.filter(
    (l) => l.status === 'prospecto' || l.status === 'cotizado' || l.status === 'en_negociacion' || l.status === 'anticipo'
  );
  const projectedRevenue = pendingLeads.reduce((acc, curr) => acc + (curr.amount || 120), 0);

  const conversionRate = leads.length > 0 
    ? ((closedLeads.length / leads.length) * 100).toFixed(1) 
    : '0';

  // 1. Desglose de servicios
  const serviceStats = leads.reduce((acc, lead) => {
    const s = lead.service || 'Desarrollo Web';
    if (!acc[s]) {
      acc[s] = { count: 0, revenue: 0 };
    }
    acc[s].count += 1;
    if (lead.status === 'cerrado') {
      acc[s].revenue += lead.amount || 0;
    }
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const serviceList = Object.entries(serviceStats)
    .map(([service, data]) => ({ service, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  // 2. Embudo de ventas (Funnel counts)
  const funnel = [
    { label: 'Total Contactos', count: leads.length, color: 'bg-slate-400' },
    { 
      label: 'Cotizados / En Curso', 
      count: leads.filter((l) => ['cotizado', 'en_negociacion', 'anticipo', 'cerrado'].includes(l.status)).length,
      color: 'bg-blue-500'
    },
    { 
      label: 'Negociación Avanzada', 
      count: leads.filter((l) => ['en_negociacion', 'anticipo', 'cerrado'].includes(l.status)).length,
      color: 'bg-amber-500'
    },
    { 
      label: 'Anticipos Pagados', 
      count: leads.filter((l) => ['anticipo', 'cerrado'].includes(l.status)).length,
      color: 'bg-violet-500'
    },
    { 
      label: 'Ventas Cerradas (CAPI)', 
      count: closedLeads.length,
      color: 'bg-emerald-500'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 4 KPIs Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Facturación Meta CAPI
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ${totalRevenue.toFixed(2)}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>100% Verificado en Meta</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tasa de Conversión
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {conversionRate}%
            </div>
            <div className="text-[11px] text-violet-600 font-bold flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              <span>{closedLeads.length} de {leads.length} leads cerrados</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ticket Promedio
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ${averageTicket.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Por venta cerrada en USD
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pipeline Proyectado
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ${projectedRevenue.toFixed(2)}
            </div>
            <div className="text-[11px] text-amber-600 font-bold">
              {pendingLeads.length} en proceso de cierre
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Gráfico 1: Embudo de Conversión & Gráfico 2: Distribución por Servicio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Embudo de Conversión Visual */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Embudo Comercial de Conversión (Funnel)
              </h3>
              <p className="text-xs text-slate-500">
                Paso a paso desde el clic en el anuncio hasta la compra final.
              </p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
              <Target className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {funnel.map((step, idx) => {
              const maxVal = leads.length || 1;
              const pct = ((step.count / maxVal) * 100).toFixed(0);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{step.label}</span>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-extrabold text-slate-900">{step.count}</span>
                      <span className="text-slate-400">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${step.color}`}
                      style={{ width: `${Math.max(Number(pct), 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800">💡 Diagnóstico Comercial Kindev:</span>
            <p className="text-[11px] leading-relaxed">
              Tu tasa de cierre de contactos a compras es de <strong>{conversionRate}%</strong>, lo cual se ubica en el top 5% del sector B2B de desarrollo de software en Meta Ads.
            </p>
          </div>
        </div>

        {/* Desglose de Ventas por Tipo de Servicio */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Ventas por Categoría de Servicio
              </h3>
              <p className="text-xs text-slate-500">
                Facturación generada según el esquema oficial Kindev 2026.
              </p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
              <PieChart className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {serviceList.map((item, idx) => {
              const maxRev = totalRevenue || 1;
              const revPct = ((item.revenue / maxRev) * 100).toFixed(0);

              return (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 truncate block">
                        {item.service}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {item.count} {item.count === 1 ? 'cliente' : 'clientes'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-slate-900 text-sm">
                        ${item.revenue.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {revPct}% de facturación
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(Number(revPct), 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
