import React from 'react';
import { 
  Gem, 
  Server, 
  MessageCircle, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw 
} from 'lucide-react';
import { Lead } from '../types';

interface LtvClientsViewProps {
  leads: Lead[];
}

export const LtvClientsView: React.FC<LtvClientsViewProps> = ({ leads }) => {
  const closedLeads = leads.filter((l) => l.status === 'cerrado');
  const totalClosedRevenue = closedLeads.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Generar recomendaciones de recompra basadas en el servicio comprado
  const getUpsellDetails = (service: string, _amount?: number) => {
    const s = service.toLowerCase();
    if (s.includes('landing')) {
      return {
        opportunity: 'Web Corporativa Pro o Publicidad Meta Ads',
        potentialUsd: 120,
        recurringMonthly: 30,
        message: 'Hola {name}, te saluda Kindev. ¿Cómo va tu Landing Page? Varios clientes están escalando a su Web Corporativa con múltiples secciones para duplicar conversiones. ¿Te gustaría ver una demo rápida?'
      };
    } else if (s.includes('corporativa')) {
      return {
        opportunity: 'Mantenimiento Mensual & Módulo E-commerce PayPhone',
        potentialUsd: 260,
        recurringMonthly: 45,
        message: 'Hola {name}, un saludo de Kindev. Te recordamos que podemos sumar pagos automáticos con PayPhone o mantenimiento técnico prioritario a tu sitio web. ¿Hablamos esta semana?'
      };
    } else if (s.includes('saas') || s.includes('plataforma')) {
      return {
        opportunity: 'Fase 2: App Móvil (iOS/Android) o Soporte SLA 24/7',
        potentialUsd: 800,
        recurringMonthly: 85,
        message: 'Hola {name}, un gusto saludarte de Kindev. Queremos coordinar contigo la propuesta para la Fase 2 de tu plataforma SaaS y la app móvil nativa. ¿Cuándo tienes 10 minutos para una videollamada?'
      };
    } else {
      return {
        opportunity: 'Mantenimiento Preventivo & Optimización SEO Kindev',
        potentialUsd: 90,
        recurringMonthly: 35,
        message: 'Hola {name}, te saludamos de Kindev para revisar el rendimiento y actualizaciones de seguridad de tu web. ¿Todo marchando excelente?'
      };
    }
  };

  // Calcular días de vigencia de Hosting (Ciclo de 365 días)
  const getHostingStatus = (createdDateStr: string) => {
    const created = new Date(createdDateStr);
    const oneYearLater = new Date(created);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const now = new Date();
    const diffMs = oneYearLater.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { status: 'expired', days: 0, text: 'Vencido', color: 'bg-rose-100 text-rose-800' };
    } else if (daysLeft <= 45) {
      return { status: 'warning', days: daysLeft, text: `${daysLeft} días (Por vencer)`, color: 'bg-amber-100 text-amber-900' };
    } else {
      return { status: 'active', days: daysLeft, text: `${daysLeft} días restantes`, color: 'bg-emerald-100 text-emerald-800' };
    }
  };

  const totalRecurringPotential = closedLeads.reduce((acc, lead) => {
    const up = getUpsellDetails(lead.service, lead.amount);
    return acc + (up.recurringMonthly * 12);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Tarjetas de Resumen LTV */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Clientes en Cartera (Cerrados)
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {closedLeads.length} Clientes
            </div>
            <p className="text-[11px] text-slate-500">
              Ventas iniciales: ${totalClosedRevenue.toFixed(2)} USD
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <Gem className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Potencial de Recompra Anual
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              +${totalRecurringPotential.toFixed(2)}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium">
              Por hosting + mantenimientos recurrentes
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <RefreshCw className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hostings & Dominios Activos
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {closedLeads.length} Dominios
            </div>
            <p className="text-[11px] text-violet-600 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Monitoreo 365 días activo</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0">
            <Server className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Listado de Clientes con Countdown y Oportunidad de Recompra */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Base de Datos de Clientes & Valor de Por Vida (LTV)</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {closedLeads.length} con proyecto entregado
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Vigencia de infraestructura y sugerencias inteligentes de segundas fases comerciales.
          </p>
        </div>

        {closedLeads.length === 0 ? (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No hay clientes cerrados todavía para gestionar LTV.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {closedLeads.map((lead) => {
              const hosting = getHostingStatus(lead.createdAt);
              const upsell = getUpsellDetails(lead.service, lead.amount);
              const personalizedMsg = encodeURIComponent(
                upsell.message.replace('{name}', lead.name)
              );

              return (
                <div
                  key={lead.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all space-y-3.5"
                >
                  {/* Nombre y Facturación Inicial */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 truncate">
                        {lead.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold truncate">
                        {lead.service}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200 text-xs">
                        ${lead.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Estado de Hosting y Dominio */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 font-medium">Hosting & Dominio:</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${hosting.color}`}>
                      {hosting.text}
                    </span>
                  </div>

                  {/* Oportunidad de Recompra Recomendada */}
                  <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100 space-y-1.5 text-xs text-indigo-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1 text-indigo-900 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Oportunidad de Recompra:
                      </span>
                      <span className="font-mono font-black text-indigo-700">
                        +${upsell.potentialUsd} USD
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-900/80 leading-relaxed font-medium">
                      {upsell.opportunity}
                    </p>
                  </div>

                  {/* Botón de 1 Clic para WhatsApp */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">
                      +{lead.phone}
                    </span>

                    <a
                      href={`https://wa.me/${lead.phone}?text=${personalizedMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Contactar Recompra</span>
                      <ArrowUpRight className="w-3 h-3 opacity-70" />
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
