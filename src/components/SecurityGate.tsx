import React, { useState } from 'react';
import { Lock, LockOpen, AlertCircle } from 'lucide-react';

interface SecurityGateProps {
  onUnlock: () => void;
}

export const SecurityGate: React.FC<SecurityGateProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();

    if (cleanPin.toLowerCase() === 'kindev2026' || cleanPin === '2026') {
      sessionStorage.setItem('kindev_auth_session', 'true');
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white border border-slate-200/80 rounded-3xl p-7 text-center space-y-6 shadow-xl shadow-slate-200/60">
        
        {/* Logo Oficial Kindev */}
        <div className="flex flex-col items-center">
          <img 
            src="/logo.png" 
            alt="Kindev S.A.S. Logo" 
            className="h-16 w-auto object-contain mx-auto mb-2 drop-shadow-sm" 
          />
          <span className="text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60 uppercase">
            Panel Administrativo CAPI
          </span>
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Acceso Restringido</h2>
          <p className="text-xs text-slate-500 mt-1">Ingresa tu clave maestra para gestionar conversiones y leads.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError(false);
              }}
              placeholder="••••••••"
              maxLength={20}
              required
              autoFocus
              className="w-full text-center tracking-widest text-lg px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 font-mono transition-all"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-600 font-medium flex items-center justify-center gap-1.5 bg-rose-50 py-2 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4" />
              <span>PIN incorrecto. Intenta de nuevo.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition-all flex items-center justify-center gap-2"
          >
            <LockOpen className="w-4 h-4" />
            <span>Desbloquear Dashboard</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Acceso privado exclusivo para administradores de Kindev S.A.S.</span>
        </div>

      </div>
    </div>
  );
};
