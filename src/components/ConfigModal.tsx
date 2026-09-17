import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Eye, EyeOff, FlaskConical, Save } from 'lucide-react';
import { MetaConfig } from '../types';
import { getStoredMetaToken } from '../lib/meta-capi';

interface ConfigModalProps {
  isOpen: boolean;
  config: MetaConfig;
  onClose: () => void;
  onSaveConfig: (newConfig: MetaConfig, newToken?: string) => Promise<void>;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  config,
  onClose,
  onSaveConfig
}) => {
  const [testMode, setTestMode] = useState<boolean>(config.testMode);
  const [testEventCode, setTestEventCode] = useState<string>(config.testEventCode);
  const [metaToken, setMetaToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTestMode(config.testMode);
      setTestEventCode(config.testEventCode);
      setMetaToken(getStoredMetaToken());
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSaveConfig(
        {
          testMode,
          testEventCode: testEventCode.trim()
        },
        metaToken.trim()
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full p-6 md:p-7 space-y-5 shadow-2xl relative">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl mb-3 shadow-sm border border-violet-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Seguridad & Meta CAPI</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Administra tus credenciales de la API y el entorno de pruebas de Meta.
          </p>
        </div>

        {/* Token de Meta CAPI */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Token de Acceso Meta (CAPI)</label>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Almacenado local
            </span>
          </div>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={metaToken}
              onChange={(e) => setMetaToken(e.target.value)}
              placeholder="EAAPkg..."
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-500/10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Modo de Prueba */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-violet-600" />
                <span>Modo Prueba (Test Events)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                Refleja eventos en vivo en la pestaña &quot;Probar eventos&quot;.
              </div>
            </div>
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="w-5 h-5 accent-violet-600 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Código de Prueba de Meta (TESTxxxxx)
            </label>
            <input
              type="text"
              value={testEventCode}
              onChange={(e) => setTestEventCode(e.target.value)}
              placeholder="Ej. TEST92244"
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-500/10 transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-violet-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Guardando...' : 'Guardar Ajustes'}</span>
        </button>

      </div>
    </div>
  );
};
