import React, { useState } from 'react';
import { UserPlus, MessageCircle, CheckCircle2 } from 'lucide-react';
import { formatPhoneNumber } from '../lib/meta-capi';

interface LeadFormProps {
  onAddLead: (data: {
    name: string;
    phone: string;
    service: string;
    amount?: number;
    isClosedImmediately?: boolean;
    note?: string;
  }) => Promise<void>;
}

export const LeadForm: React.FC<LeadFormProps> = ({ onAddLead }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('Web Corporativa Base ($120)');
  const [customPrice, setCustomPrice] = useState('120.00');
  const [isClosedImmediately, setIsClosedImmediately] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleServiceChange = (newService: string) => {
    setService(newService);
    // Sugerencia automática de precio base según servicio, pero editable
    if (newService.includes('$60')) setCustomPrice('60.00');
    else if (newService.includes('$120')) setCustomPrice('120.00');
    else if (newService.includes('$260')) setCustomPrice('260.00');
    else if (newService.includes('$400')) setCustomPrice('400.00');
    else if (newService.includes('$600')) setCustomPrice('600.00');
    else if (newService.includes('$800')) setCustomPrice('800.00');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = formatPhoneNumber(phone);
    if (!clean) return;

    const parsedPrice = parseFloat(customPrice);
    const validAmount = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0;

    setLoading(true);
    try {
      await onAddLead({
        name: name.trim() || 'Cliente WhatsApp',
        phone: clean,
        service,
        amount: validAmount,
        isClosedImmediately
      });
      setName('');
      setPhone('');
      setIsClosedImmediately(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Registrar Cliente de WhatsApp</h2>
            <p className="text-xs text-slate-500">Anota a tus prospectos o ingresa clientes con precio personalizado.</p>
          </div>
        </div>

        {/* Checkbox para marcar como cerrado de una vez */}
        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition-all select-none self-start sm:self-auto">
          <input
            type="checkbox"
            checked={isClosedImmediately}
            onChange={(e) => setIsClosedImmediately(e.target.checked)}
            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
          />
          <span className={isClosedImmediately ? 'text-emerald-700 font-bold' : ''}>
            {isClosedImmediately ? '✓ Ya me compró (Cerrar ahora)' : 'Marcar como venta ya cerrada'}
          </span>
        </label>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {/* Nombre */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Cliente</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Juan Pérez"
            required
            maxLength={100}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-500/10 text-sm font-medium transition-all"
          />
        </div>

        {/* Teléfono */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono (WhatsApp)</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0991234567 o +593..."
            required
            maxLength={20}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-500/10 text-sm font-mono transition-all"
          />
        </div>

        {/* Servicio */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Servicio</label>
          <select
            value={service}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-500/10 text-sm font-medium transition-all"
          >
            <option value="Landing Page Express ($60)">Landing Page Express ($60 USD)</option>
            <option value="Web Corporativa Base ($120)">Web Corporativa Base ($120 USD)</option>
            <option value="Web Corporativa Pro ($260)">Web Corporativa Pro ($260 USD)</option>
            <option value="Plataforma Web SaaS ($400+)">Plataforma Web SaaS ($400+ USD)</option>
            <option value="E-commerce ($600+)">E-commerce ($600+ USD)</option>
            <option value="App Móvil ($800+)">App Móvil ($800+ USD)</option>
            <option value="Servicio Personalizado">Otro / Personalizado</option>
          </select>
        </div>

        {/* Precio Personalizado */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Precio Personalizado ($ USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">$</span>
            <input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="120.00"
              step="0.01"
              min="1"
              className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm font-bold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="lg:col-span-12 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`w-full sm:w-auto py-2.5 px-6 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] ${
              isClosedImmediately
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'
            }`}
          >
            {isClosedImmediately ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Procesando...' : `Registrar Venta de $${parseFloat(customPrice || '0').toFixed(2)} USD`}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Guardando...' : 'Guardar Lead'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
