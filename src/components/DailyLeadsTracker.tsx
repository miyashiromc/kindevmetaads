import React, { useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  CheckCircle2,
  X
} from 'lucide-react';
import { Lead } from '../types';

export type DateFilterType = 'all' | 'today' | 'yesterday' | string;

interface DailyLeadsTrackerProps {
  leads: Lead[];
  selectedFilter: DateFilterType;
  onSelectFilter: (filter: DateFilterType) => void;
}

/**
 * Convierte cualquier fecha/ISO string a una clave YYYY-MM-DD en hora local
 */
export const toLocalDateKey = (dateInput: string | Date | undefined): string | null => {
  if (!dateInput) return null;
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DailyLeadsTracker: React.FC<DailyLeadsTrackerProps> = ({
  leads,
  selectedFilter,
  onSelectFilter
}) => {
  // Claves de Hoy y Ayer en tiempo local
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toLocalDateKey(today)!, [today]);

  const yesterdayDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() - 1);
    return d;
  }, [today]);
  const yesterdayKey = useMemo(() => toLocalDateKey(yesterdayDate)!, [yesterdayDate]);

  // Agrupación en memoria de leads por clave de fecha
  const leadsByDay = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const lead of leads) {
      const key = toLocalDateKey(lead.createdAt);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(lead);
      map.set(key, list);
    }
    return map;
  }, [leads]);

  // Conteo de Hoy
  const todayLeads = useMemo(() => leadsByDay.get(todayKey) || [], [leadsByDay, todayKey]);
  const todayCount = todayLeads.length;

  // Conteo de Ayer
  const yesterdayLeads = useMemo(() => leadsByDay.get(yesterdayKey) || [], [leadsByDay, yesterdayKey]);
  const yesterdayCount = yesterdayLeads.length;

  // Variación Hoy vs Ayer
  const difference = todayCount - yesterdayCount;

  // Estructura de la semana en curso (Lunes a Domingo)
  const weekData = useMemo(() => {
    const monday = new Date(today);
    const dayOfWeek = monday.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    monday.setDate(monday.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const days = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + offset);
      const key = toLocalDateKey(date)!;
      const dayLeads = leadsByDay.get(key) || [];
      const isToday = key === todayKey;
      const isYesterday = key === yesterdayKey;
      const isFuture = date.getTime() > today.getTime() && !isToday;

      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const shortName = dayNames[date.getDay()];

      return {
        date,
        key,
        shortName,
        dayNum: date.getDate(),
        monthShort: date.toLocaleDateString('es-EC', { month: 'short' }),
        count: dayLeads.length,
        isToday,
        isYesterday,
        isFuture,
        isSelected:
          selectedFilter === key ||
          (selectedFilter === 'today' && isToday) ||
          (selectedFilter === 'yesterday' && isYesterday)
      };
    });

    const totalWeek = days.reduce((sum, d) => sum + (d.isFuture ? 0 : d.count), 0);

    return {
      monday,
      sunday,
      days,
      totalWeek
    };
  }, [today, todayKey, yesterdayKey, leadsByDay, selectedFilter]);

  // Manejador de selección de filtro por tarjeta o día
  const handleToggleFilter = (filterKey: DateFilterType) => {
    if (selectedFilter === filterKey) {
      onSelectFilter('all');
    } else {
      onSelectFilter(filterKey);
    }
  };

  const isTodaySelected = selectedFilter === 'today' || selectedFilter === todayKey;
  const isYesterdaySelected = selectedFilter === 'yesterday' || selectedFilter === yesterdayKey;

  return (
    <div className="w-full space-y-2.5">
      {/* Grid Superior: Hoy, Ayer y Ritmo Semanal */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        
        {/* ─── TARJETA 1: HOY (En vivo con actualización en tiempo real) ─── */}
        <div 
          onClick={() => handleToggleFilter('today')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleToggleFilter('today')}
          className={`md:col-span-3 rounded-2xl p-4 sm:p-4.5 border transition-all cursor-pointer relative overflow-hidden select-none group ${
            isTodaySelected
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-gradient-to-br from-white via-white to-emerald-50/30 border-slate-200/80 hover:border-emerald-300 hover:shadow-xs shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
          }`}
          title="Haz clic para filtrar los leads que llegaron hoy"
        >
          {/* Header de la tarjeta */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              {/* Indicador de pulso verde en vivo */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Hoy
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                En vivo
              </span>
            </div>

            {isTodaySelected ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Filtrado
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 group-hover:text-emerald-600 transition-colors font-medium">
                Filtrar ➔
              </span>
            )}
          </div>

          {/* Contador principal */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900">
              {todayCount}
            </span>
            <span className="text-xs font-bold text-slate-500">
              {todayCount === 1 ? 'lead nuevo' : 'leads nuevos'}
            </span>
          </div>

          {/* Subtítulo / Comparativa vs Ayer */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px] font-medium">
              vs ayer ({yesterdayCount})
            </span>
            {difference > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                +{difference} hoy
              </span>
            ) : difference < 0 ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-600">
                <ArrowDownRight className="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />
                {difference} vs ayer
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-500">
                <Minus className="w-3 h-3 text-slate-400" />
                Igual que ayer
              </span>
            )}
          </div>
        </div>

        {/* ─── TARJETA 2: AYER (Cierre consolidado del día anterior) ─── */}
        <div 
          onClick={() => handleToggleFilter('yesterday')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleToggleFilter('yesterday')}
          className={`md:col-span-3 rounded-2xl p-4 sm:p-4.5 border transition-all cursor-pointer relative overflow-hidden select-none group ${
            isYesterdaySelected
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
          }`}
          title="Haz clic para filtrar los leads con los que cerró el día de ayer"
        >
          {/* Header de la tarjeta */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Ayer
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                Cierre
              </span>
            </div>

            {isYesterdaySelected ? (
              <span className="text-[11px] font-bold text-blue-700 bg-blue-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Filtrado
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 group-hover:text-blue-600 transition-colors font-medium">
                Filtrar ➔
              </span>
            )}
          </div>

          {/* Contador principal */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-800">
              {yesterdayCount}
            </span>
            <span className="text-xs font-bold text-slate-500">
              {yesterdayCount === 1 ? 'lead recibido' : 'leads recibidos'}
            </span>
          </div>

          {/* Subtítulo informativo */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px] font-medium">
              Cierre final del día
            </span>
            <span className="text-[11px] font-bold text-slate-600">
              {yesterdayDate.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* ─── TARJETA 3: RITMO SEMANAL (Días de la semana actual con conteo diario) ─── */}
        <div className="md:col-span-6 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          
          {/* Header de la semana */}
          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Ritmo Semanal
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                ({weekData.monday.getDate()} {weekData.monday.toLocaleDateString('es-EC', { month: 'short' })} - {weekData.sunday.getDate()} {weekData.sunday.toLocaleDateString('es-EC', { month: 'short' })})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60">
                {weekData.totalWeek} {weekData.totalWeek === 1 ? 'lead' : 'leads'} esta semana
              </span>
            </div>
          </div>

          {/* Tira interactiva de los 7 días de la semana */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekData.days.map((day) => {
              const isSelected = day.isSelected;
              
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => !day.isFuture && handleToggleFilter(day.key)}
                  disabled={day.isFuture}
                  className={`flex flex-col items-center justify-between py-2 px-1 rounded-xl transition-all select-none text-center ${
                    day.isFuture
                      ? 'opacity-40 cursor-not-allowed bg-slate-50 border border-transparent'
                      : isSelected
                      ? 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-900/10 scale-[1.02]'
                      : day.isToday
                      ? 'bg-emerald-50/90 text-emerald-950 border border-emerald-300 hover:bg-emerald-100/80 cursor-pointer'
                      : day.isYesterday
                      ? 'bg-blue-50/60 text-blue-950 border border-blue-200 hover:bg-blue-100/60 cursor-pointer'
                      : 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border border-slate-200/60 cursor-pointer'
                  }`}
                  title={
                    day.isFuture
                      ? `${day.shortName} ${day.dayNum} (Día futuro)`
                      : `${day.shortName} ${day.dayNum}: ${day.count} leads. Haz clic para filtrar.`
                  }
                >
                  {/* Nombre y número de día */}
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSelected 
                      ? 'text-slate-300' 
                      : day.isToday 
                      ? 'text-emerald-700' 
                      : 'text-slate-500'
                  }`}>
                    {day.shortName}
                  </span>
                  <span className={`text-xs font-black my-0.5 ${
                    isSelected ? 'text-white' : 'text-slate-800'
                  }`}>
                    {day.dayNum}
                  </span>

                  {/* Conteo de leads del día */}
                  <div className="mt-1 w-full flex items-center justify-center">
                    {day.isFuture ? (
                      <span className="text-[10px] text-slate-400 font-mono">-</span>
                    ) : (
                      <span className={`text-xs font-mono font-black px-1.5 py-0.5 rounded-md min-w-[20px] ${
                        isSelected
                          ? 'bg-white text-slate-900'
                          : day.isToday
                          ? 'bg-emerald-600 text-white'
                          : day.count > 0
                          ? 'bg-slate-200/80 text-slate-800 font-bold'
                          : 'text-slate-400 font-normal'
                      }`}>
                        {day.count}
                      </span>
                    )}
                  </div>

                  {/* Badge Hoy / Ayer */}
                  {day.isToday && (
                    <span className={`text-[9px] font-extrabold mt-1 tracking-tighter ${
                      isSelected ? 'text-emerald-300' : 'text-emerald-700'
                    }`}>
                      HOY
                    </span>
                  )}
                  {day.isYesterday && !day.isToday && (
                    <span className={`text-[9px] font-bold mt-1 tracking-tighter ${
                      isSelected ? 'text-blue-300' : 'text-blue-600'
                    }`}>
                      AYER
                    </span>
                  )}
                  {!day.isToday && !day.isYesterday && !day.isFuture && (
                    <span className="text-[9px] text-transparent mt-1 leading-none">.</span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

      </div>

      {/* Banner / Pill de filtro activo con botón para ver todos */}
      {selectedFilter !== 'all' && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              Filtrando vista de leads: <strong>
                {selectedFilter === 'today'
                  ? `Hoy (${todayCount} leads)`
                  : selectedFilter === 'yesterday'
                  ? `Ayer (${yesterdayCount} leads)`
                  : `Fecha ${selectedFilter}`}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors"
          >
            <span>Ver todos los leads</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
