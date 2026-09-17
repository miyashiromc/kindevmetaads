import React, { useState } from 'react';
import { UserPlus, MessageCircle } from 'lucide-react';
import { formatPhoneNumber } from '../lib/meta-capi';

interface LeadFormProps {
  onAddLead: (data: { name: string; phone: string; service: string }) => Promise<void>;
}

export const LeadForm: React.FC<LeadFormProps> = ({ onAddLead }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('Web Corporativa Base ($120)');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = formatPhoneNumber(phone);
    if (!clean) return;

    setLoading(true);
    try {
      await onAddLead({
        name: name.trim() || 'Cliente WhatsApp',
        phone: clean,
        service
      });
      setName('');
      setPhone('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <MessageCircle className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Registrar Cliente de WhatsApp</h2>
          <p className="text-xs text-slate-500">Anota a tus prospectos. Al cerrar el trato, un solo toque notifica la venta a Meta.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
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

        <div>
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

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Servicio de Interés</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-500/10 text-sm font-medium transition-all"
          >
            <option value="Landing Page Express ($60)">Landing Page Express ($60 USD)</option>
            <option value="Web Corporativa Base ($120)">Web Corporativa Base ($120 USD)</option>
            <option value="Web Corporativa Pro ($260)">Web Corporativa Pro ($260 USD)</option>
            <option value="Plataforma Web SaaS ($400+)">Plataforma Web SaaS ($400+ USD)</option>
            <option value="E-commerce ($600+)">E-commerce ($600+ USD)</option>
            <option value="App Móvil ($800+)">App Móvil ($800+ USD)</option>
            <option value="Otro Servicio">Otro / Personalizado</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-violet-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Guardando...' : 'Guardar Lead'}</span>
          </button>
        </div>
      </form>
    </section>
  );
};
