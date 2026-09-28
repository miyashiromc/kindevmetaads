import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Key,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { SystemApisStatus } from '../types';

interface MetaTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdated?: () => void;
  apisStatus: SystemApisStatus | null;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const MetaTokenModal: React.FC<MetaTokenModalProps> = ({
  isOpen,
  onClose,
  onTokenUpdated,
  apisStatus,
  onShowToast
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPerms, setCopiedPerms] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  if (!isOpen) return null;

  const marketingStatus = apisStatus?.metaMarketing;
  const isMarketingActive = marketingStatus?.active;

  const requiredPermissions = 'ads_read, read_insights, ads_management, business_management';

  const handleCopyPermissions = () => {
    navigator.clipboard.writeText(requiredPermissions);
    setCopiedPerms(true);
    setTimeout(() => setCopiedPerms(false), 2000);
    onShowToast('Permisos copiados al portapapeles', 'info');
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      onShowToast('Ingresa un token válido de Meta', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/meta/update-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim(), type: 'user' })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast(`¡Token verificado con éxito! Conectado como: ${data.user || 'Meta Admin'}`, 'success');
        setTokenInput('');
        if (onTokenUpdated) onTokenUpdated();
        setTimeout(() => onClose(), 1200);
      } else {
        onShowToast(data.error || 'Token inválido o rechazado por Meta', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error de conexión: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm sm:p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 overflow-hidden my-0 sm:my-6 max-h-[92dvh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0">
        
        {/* Encabezado */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-b border-indigo-900/40 shrink-0">
          {/* Indicador táctil en móvil */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-3 sm:hidden" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  Conectar Meta Graph & Marketing API
                </h2>
                <p className="text-xs text-indigo-200/80">
                  Sincronización en vivo de métricas, pauta y atribución
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">

          {/* Tarjeta de Estado Actual de la API */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isMarketingActive
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/70 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className={`w-3 h-3 rounded-full shrink-0 ${
                  isMarketingActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`} />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    {isMarketingActive ? 'Marketing API Activa' : 'Marketing API Inactiva o Expirada'}
                  </h3>
                  <p className="text-xs mt-0.5 opacity-90">
                    {isMarketingActive
                      ? `Conectado como: ${marketingStatus?.user || 'Usuario Autorizado'} ${marketingStatus?.id ? `(ID: ${marketingStatus.id})` : ''}`
                      : marketingStatus?.error || 'El token actual caducó o no cuenta con los permisos necesarios.'}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 ${
                isMarketingActive ? 'bg-emerald-200/60 text-emerald-800' : 'bg-rose-200/60 text-rose-800'
              }`}>
                {isMarketingActive ? 'ONLINE' : 'EXPIRADO'}
              </span>
            </div>
          </div>

          {/* Paso 1: Abrir Explorer */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Paso 1: Abrir Meta Graph API Explorer</span>
              <span className="text-[11px] font-normal text-slate-500">Oficial de Meta</span>
            </label>
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-950 font-semibold text-xs transition-all active:scale-[0.99] group"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>Abrir Meta Graph API Explorer en una nueva pestaña</span>
              </div>
              <span className="text-[11px] text-indigo-600 underline font-mono">Abrir ↗</span>
            </a>
          </div>

          {/* Permisos sugeridos para copiar rápido */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Permisos que debes agregar en Explorer:</span>
              <button
                type="button"
                onClick={handleCopyPermissions}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {copiedPerms ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPerms ? 'Copiado' : 'Copiar lista'}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['ads_read', 'read_insights', 'ads_management', 'business_management'].map((perm) => (
                <span
                  key={perm}
                  className="px-2 py-0.5 rounded-lg bg-white border border-slate-300 text-[11px] font-mono text-slate-700 font-medium"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>

          {/* Paso 2: Formulario de actualización de token */}
          <form onSubmit={handleSaveToken} className="space-y-3">
            <label className="text-xs font-bold text-slate-800 block">
              Paso 2: Pegar el nuevo Token de Acceso
            </label>
            <div className="relative">
              <textarea
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Pega aquí el token generado (empieza por EAAT... o EAAP...)"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-mono text-slate-800 placeholder:text-slate-400 outline-none transition-all resize-none"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-all active:scale-95"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !tokenInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando con Meta...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Guardar y Actualizar Token</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Preguntas Frecuentes / Info de Tokens Infinitos */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowFaq(!showFaq)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                ¿Hay problema con generar tokens seguido o son infinitos?
              </span>
              <span className="text-[11px] text-indigo-600">{showFaq ? 'Ocultar' : 'Ver respuesta'}</span>
            </button>

            {showFaq && (
              <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs space-y-2 leading-relaxed animate-fade-in">
                <p>
                  <strong>1. Puedes generar tokens ilimitados:</strong> Meta no te penaliza, no cobra ni te bloquea por generar nuevos tokens en Graph API Explorer tantas veces como desees.
                </p>
                <p>
                  <strong>2. ¿Por qué caducan?:</strong> Los tokens de prueba de usuario creados en Explorer tienen una vigencia estándar de <strong>1 a 2 horas</strong> (por motivos de seguridad de sesión de Facebook).
                </p>
                <p>
                  <strong>3. Solución permanente (Sin vencimiento):</strong> Si no quieres renovarlo con frecuencia, puedes generar un token con un <em>Usuario del Sistema</em> en <strong>Meta Business Suite</strong> y seleccionar caducidad <strong>"Nunca"</strong>. Ese token durará indefinidamente.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
