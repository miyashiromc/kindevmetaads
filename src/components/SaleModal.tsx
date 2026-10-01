import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Send, Loader2, Sparkles, Plus, Minus } from 'lucide-react';
import { Lead } from '../types';
import { KINDEV_PRESETS } from '../lib/presets';
import { CopyPhoneButton } from './CopyPhoneButton';

interface SaleModalProps {
  lead: Lead | null;
  targetStatus?: 'anticipo' | 'cerrado';
  onClose: () => void;
  onConfirmSale: (leadId: string, amount: number, note?: string, targetStatus?: 'anticipo' | 'cerrado') => Promise<void>;
}

export const SaleModal: React.FC<SaleModalProps> = ({ lead, targetStatus = 'cerrado', onClose, onConfirmSale }) => {
  const [amount, setAmount] = useState<number>(120);
  const [customInput, setCustomInput] = useState<string>('120.00');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (lead) {
      const initial = lead.amount && lead.amount > 0 ? lead.amount : 120;
      setAmount(initial);
      setCustomInput(initial.toFixed(2));
      setNote(lead.notes || '');
    }
  }, [lead]);

  if (!lead) return null;

  const handleSelectPreset = (presetAmount: number) => {
    setAmount(presetAmount);
    setCustomInput(presetAmount.toFixed(2));
  };

  const handleCustomChange = (val: string) => {
    setCustomInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setAmount(parsed);
    }
  };

  const adjustAmount = (delta: number) => {
    const current = parseFloat(customInput) || 0;
    const next = Math.max(1, current + delta);
    setAmount(next);
    setCustomInput(next.toFixed(2));
  };

  const handleSubmit = async () => {
    const finalAmount = parseFloat(customInput);
    if (isNaN(finalAmount) || finalAmount <= 0) return;

    setLoading(true);
    try {
      await onConfirmSale(lead.id, finalAmount, note.trim() || '', targetStatus);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
      <div className="bg-white border-t sm:border border-slate-200/90 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-7 space-y-4 sm:space-y-5 shadow-2xl relative max-h-[92dvh] sm:max-h-[95vh] overflow-y-auto pb-safe sm:pb-7">
        
        {/* Indicador de arrastre táctil para móvil */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />

        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 right-4 sm:right-5 text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-xl hover:bg-slate-100 active:scale-95"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div>
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-xl mb-2.5 sm:mb-3 shadow-xs border ${
            targetStatus === 'anticipo'
              ? 'bg-violet-50 text-violet-600 border-violet-100'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {targetStatus === 'anticipo' ? 'Registrar Anticipo & Enviar Purchase a Meta' : 'Cerrar Venta & Enviar a Meta'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            {targetStatus === 'anticipo' 
              ? 'Cliente asegurado. El evento Purchase se despachará de inmediato para acelerar el entrenamiento del algoritmo.' 
              : 'El proyecto se marcará como cerrado y el evento Purchase se despachará a Meta CAPI.'}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1.5 font-semibold">
            <span>Cliente: <span className="font-bold text-slate-900">{lead.name}</span> (+<span className="font-mono text-slate-700">{lead.phone}</span>)</span>
            <CopyPhoneButton phone={lead.phone} />
          </div>
        </div>

        {/* Campo de Precio Personalizado Principal */}
        <div className="bg-emerald-50/50 border border-emerald-500/25 rounded-2xl p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Monto de Venta Personalizable</span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black text-slate-400">$</span>
            <input
              type="number"
              value={customInput}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="1"
              autoFocus
              className="text-3xl md:text-4xl font-black text-emerald-600 bg-transparent text-center focus:outline-none w-44 font-mono border-b-2 border-emerald-400 focus:border-emerald-600 py-0.5 transition-all"
            />
            <span className="text-sm font-bold text-slate-500">USD</span>
          </div>

          {/* Botones de micro-ajuste rápido ergonómicos */}
          <div className="flex items-center justify-center gap-1.5 pt-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => adjustAmount(-50)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 active:bg-slate-100 text-[11px] font-mono font-bold text-slate-700 shadow-xs transition-all flex items-center gap-0.5"
            >
              <Minus className="w-2.5 h-2.5" />50
            </button>
            <button
              type="button"
              onClick={() => adjustAmount(-10)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 active:bg-slate-100 text-[11px] font-mono font-bold text-slate-700 shadow-xs transition-all flex items-center gap-0.5"
            >
              <Minus className="w-2.5 h-2.5" />10
            </button>
            <button
              type="button"
              onClick={() => adjustAmount(+10)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 active:bg-slate-100 text-[11px] font-mono font-bold text-slate-700 shadow-xs transition-all flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" />10
            </button>
            <button
              type="button"
              onClick={() => adjustAmount(+50)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 active:bg-slate-100 text-[11px] font-mono font-bold text-slate-700 shadow-xs transition-all flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" />50
            </button>
            <button
              type="button"
              onClick={() => adjustAmount(+100)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 active:bg-slate-100 text-[11px] font-mono font-bold text-slate-700 shadow-xs transition-all flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" />100
            </button>
          </div>
        </div>

        {/* Tarifas Oficiales Kindev 2026 (1 toque) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
            O elige una tarifa base Kindev (1 toque)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {KINDEV_PRESETS.map((preset) => {
              const isSelected = Math.abs(amount - preset.amount) < 0.01;
              return (
                <button
                  key={preset.amount}
                  type="button"
                  onClick={() => handleSelectPreset(preset.amount)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate">{preset.label}</span>
                  </div>
                  <div className="text-sm font-extrabold text-emerald-600 font-mono mt-0.5">
                    ${preset.amount} USD
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle / Concepto Opcional */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Detalle o Concepto (Opcional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. Anticipo 50%, Web Corporativa + Hosting, etc."
            maxLength={120}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 transition-all"
          />
        </div>

        {/* Botón de Confirmación con el monto exacto */}
        <button
          onClick={handleSubmit}
          disabled={loading || isNaN(parseFloat(customInput)) || parseFloat(customInput) <= 0}
          className={`w-full py-3.5 px-4 rounded-2xl active:scale-[0.98] text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
            targetStatus === 'anticipo'
              ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/25'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Despachando a Meta CAPI...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>
                {targetStatus === 'anticipo'
                  ? `Confirmar Anticipo ($${parseFloat(customInput || '0').toFixed(2)} USD) & Despachar Purchase`
                  : `Enviar $${parseFloat(customInput || '0').toFixed(2)} USD a Meta CAPI`}
              </span>
            </>
          )}
        </button>

      </div>
    </div>
  );
};
