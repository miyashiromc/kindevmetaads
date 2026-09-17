import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { Lead } from '../types';
import { KINDEV_PRESETS } from '../lib/presets';

interface SaleModalProps {
  lead: Lead | null;
  onClose: () => void;
  onConfirmSale: (leadId: string, amount: number) => Promise<void>;
}

export const SaleModal: React.FC<SaleModalProps> = ({ lead, onClose, onConfirmSale }) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(120);
  const [customAmount, setCustomAmount] = useState<string>('120.00');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (lead) {
      setSelectedAmount(120);
      setCustomAmount('120.00');
    }
  }, [lead]);

  if (!lead) return null;

  const handleSelectPreset = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount(amount.toFixed(2));
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setSelectedAmount(parsed);
    }
  };

  const handleSubmit = async () => {
    const finalAmount = parseFloat(customAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) return;

    setLoading(true);
    try {
      await onConfirmSale(lead.id, finalAmount);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full p-6 md:p-7 space-y-5 shadow-2xl relative">
        
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
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

        {/* Presets de Tarifas Kindev 2026 */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
            Tarifas Oficiales Kindev 2026 (1 toque)
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {KINDEV_PRESETS.map((preset) => {
              const isActive = selectedAmount === preset.amount;
              return (
                <button
                  key={preset.amount}
                  type="button"
                  onClick={() => handleSelectPreset(preset.amount)}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-slate-700">{preset.label}</span>
                    {preset.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600">
                        {preset.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-base font-extrabold text-emerald-600 tracking-tight">
                    ${preset.amount} USD
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Monto Personalizado */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            O escribe otro monto ($ USD)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">$</span>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="120.00"
              step="0.01"
              min="1"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-base font-bold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
          </div>
        </div>

        {/* Botón de Confirmación */}
        <button
          onClick={handleSubmit}
          disabled={loading}
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
              <span>Enviar Purchase a Meta CAPI</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
};
