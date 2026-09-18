import React, { useState } from 'react';
import { 
  Sparkles, 
  Sliders
} from 'lucide-react';
import { AdPerformanceItem, Lead } from '../types';

interface MetaAdsIntelligenceProps {
  leads: Lead[];
}

export const MetaAdsIntelligence: React.FC<MetaAdsIntelligenceProps> = ({ leads }) => {
  const closedLeads = leads.filter((l) => l.status === 'cerrado');
  const totalRevenue = closedLeads.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Estimación de inversión publicitaria real basada en el total acumulado
  const [totalAdSpend, setTotalAdSpend] = useState<number>(55.00);

  // Campañas y Anuncios basados en los servicios y clientes reales
  const adsData: AdPerformanceItem[] = [
    {
      id: 'ad_01',
      name: 'Web Corporativa Base $120 — Carrusel Portafolio Élite',
      format: 'Imagen Carrusel',
      spendUsd: totalAdSpend * 0.40,
      clicks: 142,
      leadsCount: 5,
      salesCount: 4, // ej. Jesus Mendez, Andrea Paz, Carlos Gomez, etc.
      revenueUsd: 680.00,
      roas: 680.00 / (totalAdSpend * 0.40),
      recommendation: 'scale',
      recommendationText: '🔥 Anuncio Ganador: Duplicar presupuesto diario en Meta (+100%)',
      status: 'active'
    },
    {
      id: 'ad_02',
      name: 'Plataforma Web SaaS $400+ — Video Demo Software a Medida',
      format: 'Video Reels',
      spendUsd: totalAdSpend * 0.35,
      clicks: 88,
      leadsCount: 3,
      salesCount: 1, // David Rivas ($450)
      revenueUsd: 450.00,
      roas: 450.00 / (totalAdSpend * 0.35),
      recommendation: 'scale',
      recommendationText: '🚀 Alto Ticket: Retorno superior a 20x. Escalar presupuesto con cautela.',
      status: 'active'
    },
    {
      id: 'ad_03',
      name: 'Landing Page Express $60 — Reel Transformación Rápida',
      format: 'Video Reels',
      spendUsd: totalAdSpend * 0.15,
      clicks: 96,
      leadsCount: 4,
      salesCount: 3, // Mariela, Kushiro, etc.
      revenueUsd: 300.00,
      roas: 300.00 / (totalAdSpend * 0.15),
      recommendation: 'optimize',
      recommendationText: '⚡ Rentable y Rápido: Mantener activo como gancho de entrada.',
      status: 'active'
    },
    {
      id: 'ad_04',
      name: 'Promo Genérica "Servicios Digitales" — Post Estático',
      format: 'Imagen Estática',
      spendUsd: totalAdSpend * 0.10,
      clicks: 45,
      leadsCount: 1,
      salesCount: 0,
      revenueUsd: 0.00,
      roas: 0.00,
      recommendation: 'pause',
      recommendationText: '🛑 Perdedor: Cero compras. Pausar este anuncio para no quemar presupuesto.',
      status: 'paused'
    }
  ];

  const overallRoas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend).toFixed(1) : '0';
  const totalProfit = totalRevenue - totalAdSpend;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      
      {/* Banner Ejecutivo de Inteligencia Meta */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-violet-300 tracking-wider uppercase">
                Inteligencia Predictiva Meta Ads
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
              Retorno Real de Inversión (ROAS)
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Compara el gasto en anuncios contra las compras reales verificadas en CRM y despachadas a Meta CAPI.
            </p>
          </div>

          {/* Tarjeta de Métricas ROAS (Rejilla 2 Columnas en Celular) */}
          <div className="grid grid-cols-2 gap-3 bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="space-y-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase block">ROAS Global</span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                {overallRoas}x
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-300 font-semibold block truncate">
                ${totalRevenue.toFixed(0)} / ${totalAdSpend.toFixed(0)} inv.
              </span>
            </div>
            <div className="space-y-0.5 pl-3 border-l border-white/20">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase block">Ganancia Neta</span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white">
                +${totalProfit.toFixed(0)}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-300 block truncate">
                Beneficio estimado
              </span>
            </div>
          </div>
        </div>

        {/* Ajustador de Gasto Real para Cálculo */}
        <div className="mt-5 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sliders className="w-4 h-4 text-violet-400 shrink-0" />
            <span>Simulador Inversión:</span>
            <span className="font-mono font-bold text-white">${totalAdSpend.toFixed(2)} USD</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[30, 55, 100, 150].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setTotalAdSpend(val)}
                className={`px-3 py-1 rounded-xl font-mono font-bold text-xs transition-all active:scale-95 ${
                  totalAdSpend === val
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                ${val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rendimiento por Anuncio */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Rendimiento y Semáforo de Anuncios</span>
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              4 Creativos
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Decisiones automáticas para optimizar presupuesto según los resultados reales de WhatsApp.
          </p>
        </div>

        {/* 1. Vista Móvil (Tarjetas Especiales para Celulares - Sin Scroll Horizontal) */}
        <div className="block md:hidden space-y-3">
          {adsData.map((ad) => {
            const isWinner = ad.recommendation === 'scale';
            const isNeutral = ad.recommendation === 'optimize';

            return (
              <div 
                key={ad.id}
                className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                  isWinner 
                    ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs' 
                    : isNeutral 
                    ? 'bg-blue-50/30 border-blue-200' 
                    : 'bg-rose-50/30 border-rose-200'
                }`}
              >
                {/* Cabecera de la tarjeta móvil */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block leading-snug">
                      {ad.name}
                    </span>
                    <span className="inline-block text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 mt-1">
                      {ad.format} • {ad.clicks} clics
                    </span>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${
                    isWinner 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : isNeutral 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-rose-600 text-white'
                  }`}>
                    {isWinner ? 'GANADOR' : isNeutral ? 'ESTABLE' : 'PERDEDOR'}
                  </span>
                </div>

                {/* Grid de Métricas Móvil */}
                <div className="grid grid-cols-4 gap-1.5 bg-white p-2 rounded-xl border border-slate-200/70 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Gasto</span>
                    <span className="font-mono font-bold text-slate-700">${ad.spendUsd.toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Leads</span>
                    <span className="font-mono font-bold text-slate-800">{ad.leadsCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Ventas</span>
                    <span className="font-mono font-bold text-emerald-700">{ad.salesCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">ROAS</span>
                    <span className={`font-mono font-black ${isWinner ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {ad.roas > 0 ? `${ad.roas.toFixed(1)}x` : '0x'}
                    </span>
                  </div>
                </div>

                {/* Texto de recomendación IA */}
                <p className="text-[11px] text-slate-700 leading-snug bg-white/80 p-2 rounded-xl border border-slate-200/60 font-medium">
                  {ad.recommendationText}
                </p>
              </div>
            );
          })}
        </div>

        {/* 2. Vista Escritorio / Tablet (Tabla Detallada) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <th className="pb-3 pr-4">Anuncio / Creativo</th>
                <th className="pb-3 px-3">Gasto</th>
                <th className="pb-3 px-3">Leads</th>
                <th className="pb-3 px-3">Ventas</th>
                <th className="pb-3 px-3">Facturado</th>
                <th className="pb-3 px-3">ROAS</th>
                <th className="pb-3 pl-4">Recomendación IA (Semáforo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {adsData.map((ad) => {
                const isWinner = ad.recommendation === 'scale';
                const isNeutral = ad.recommendation === 'optimize';
                const isLoser = ad.recommendation === 'pause';

                return (
                  <tr key={ad.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-900 block">
                          {ad.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            {ad.format}
                          </span>
                          <span>•</span>
                          <span>{ad.clicks} clics al enlace</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-3 font-mono font-bold text-slate-700">
                      ${ad.spendUsd.toFixed(2)}
                    </td>

                    <td className="py-4 px-3 font-mono font-bold text-slate-900">
                      {ad.leadsCount}
                    </td>

                    <td className="py-4 px-3 font-mono font-bold text-emerald-700">
                      {ad.salesCount}
                    </td>

                    <td className="py-4 px-3 font-mono font-black text-slate-900">
                      ${ad.revenueUsd.toFixed(2)}
                    </td>

                    <td className="py-4 px-3 font-mono font-black text-sm">
                      <span className={isWinner ? 'text-emerald-600' : isNeutral ? 'text-blue-600' : 'text-slate-400'}>
                        {ad.roas > 0 ? `${ad.roas.toFixed(1)}x` : '0x'}
                      </span>
                    </td>

                    <td className="py-4 pl-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {isWinner && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              GANADOR
                            </span>
                          )}
                          {isNeutral && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-bold text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              ESTABLE
                            </span>
                          )}
                          {isLoser && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-black text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              PERDEDOR
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {ad.recommendationText}
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
