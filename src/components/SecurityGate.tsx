import React, { useState } from 'react';
import { Lock, LockOpen, AlertCircle, Building2, ShieldCheck, Sparkles } from 'lucide-react';
import { ClientAccount, UserRole } from '../types';

interface SecurityGateProps {
  onUnlock: (role: UserRole, tenantId: string) => void;
  clients?: ClientAccount[];
}

export const SecurityGate: React.FC<SecurityGateProps> = ({ onUnlock, clients = [] }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginMode, setLoginMode] = useState<'admin' | 'client'>('admin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();

    // 1. Verificación Master Kindev SuperAdmin
    if (cleanPin.toLowerCase() === 'kindev2026' || cleanPin === '2026') {
      sessionStorage.setItem('kindev_auth_session', 'true');
      sessionStorage.setItem('kindev_auth_role', 'superadmin');
      sessionStorage.setItem('kindev_auth_tenant', 'kindev');
      setError(false);
      onUnlock('superadmin', 'kindev');
      return;
    }

    // 2. Verificación de PIN de Cliente específico
    const matchedClient = clients.find(
      (c) => c.clientPin && c.clientPin.trim() === cleanPin
    );

    if (matchedClient) {
      sessionStorage.setItem('kindev_auth_session', 'true');
      sessionStorage.setItem('kindev_auth_role', 'client');
      sessionStorage.setItem('kindev_auth_tenant', matchedClient.id);
      setError(false);
      onUnlock('client', matchedClient.id);
      return;
    }

    // Si falló
    setError(true);
    setErrorMessage(
      loginMode === 'admin'
        ? 'PIN maestro incorrecto. Intenta con la clave oficial de Kindev.'
        : 'Código de cliente no encontrado. Verifica tu clave de acceso.'
    );
    setPin('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white border border-slate-200/80 rounded-3xl p-7 text-center space-y-5 shadow-2xl shadow-slate-900/20 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Logo Oficial Kindev */}
        <div className="flex flex-col items-center">
          <img 
            src="/logo.png" 
            alt="Kindev S.A.S. Logo" 
            className="h-14 w-auto object-contain mx-auto mb-2 drop-shadow-sm" 
          />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60 text-[11px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span>Sistema Multi-Cliente CAPI</span>
          </div>
        </div>

        {/* Selector de Modo de Acceso */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setLoginMode('admin');
              setError(false);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'admin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
            <span>Kindev Admin</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('client');
              setError(false);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'client'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Portal Cliente</span>
          </button>
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            {loginMode === 'admin' ? 'Acceso Master Kindev' : 'Ingreso Portal de Clientes'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {loginMode === 'admin'
              ? 'Ingresa la clave maestra para gestionar todas las cuentas.'
              : 'Ingresa tu PIN asignado para ver tus métricas y prospectos.'}
          </p>
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
              placeholder={loginMode === 'admin' ? '••••••••' : 'PIN de Cliente'}
              maxLength={24}
              required
              autoFocus
              className="w-full text-center tracking-widest text-lg px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 font-mono transition-all"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-600 font-medium flex items-center justify-center gap-1.5 bg-rose-50 py-2.5 px-3 rounded-xl border border-rose-200 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition-all flex items-center justify-center gap-2"
          >
            <LockOpen className="w-4 h-4" />
            <span>Ingresar al Sistema</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Infraestructura Segura Multi-Tenant Kindev S.A.S. (2026)</span>
        </div>

      </div>
    </div>
  );
};
