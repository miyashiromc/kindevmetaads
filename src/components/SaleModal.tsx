import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Send, Loader2, Sparkles, Plus, Minus } from 'lucide-react';
import { Lead } from '../types';
import { KINDEV_PRESETS } from '../lib/presets';

interface SaleModalProps {
  lead: Lead | null;
  onClose: () => void;
  onConfirmSale: (leadId: string, amount: number, note?: string) => Promise<void>;
}

export const SaleModal: React.FC<SaleModalProps> = ({ lead, onClose, onConfirmSale }) => {
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
      await onConfirmSale(lead.id, finalAmount, note.trim() || undefined);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full p-6 md:p-7 space-y-5 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-xl hover:bg-slate-100"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 shadow-sm border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Cerrar Venta & Enviar a Meta</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Cliente: <span className="font-bold text-slate-800">{lead.name}</span> (+<span className="font-mono text-slate-700">{lead.phone}</span>)
          </p>
        </div>

        {/* Campo de Precio Personalizado Principal */}
        <div className="bg-slate-50 border-2 border-emerald-500/30 rounded-2xl p-4 text-center space-y-2">
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

          {/* Botones de micro-ajuste rápido */}
          <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => adjustAmount(-50)}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-mono font-bold text-slate-600 shadow-sm transition-all flex items-center gap-0.5"
            >
              <Minus className="w-2.5 h-2.5" />50
            </button>
            <button
              type="button"
              onClick={() => adjustAmount(-10)}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-mono font-bold text-slate-600 shadow-sm transition-all flex items-center gap-0.5"
            >
              <Minus className="w-2.5 h-2.5" />10
            </button>
            <button
              type="button"
              onClick={() => adjustAmount(+10)}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-mono font-bold text-slate-600 shadow-sm transition-all flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" />10
            </button>
            <button
              type="button"
              onClick={() => adjustAmount(+50)}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-mono font-bold text-slate-600 shadow-sm transition-all flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" />50
            </button>
            <button
              type="button"
              onClick={() => adjustAmount(+100)}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-mono font-bold text-slate-600 shadow-sm transition-all flex items-center gap-0.5"
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
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Despachando a Meta CAPI...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Enviar ${parseFloat(customInput || '0').toFixed(2)} USD a Meta CAPI</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
};
