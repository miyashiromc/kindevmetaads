import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Eye, EyeOff, FlaskConical, Save, Zap, Copy, Check, Send, Sparkles } from 'lucide-react';
import { MetaConfig } from '../types';
import { getStoredMetaToken } from '../lib/meta-capi';
import { ingestIncomingLead } from '../lib/lead-ingestion';

interface ConfigModalProps {
  isOpen: boolean;
  config: MetaConfig;
  onClose: () => void;
  onSaveConfig: (newConfig: MetaConfig, newToken?: string) => Promise<void>;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  config,
  onClose,
  onSaveConfig,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'meta' | 'webhook'>('webhook');
  const [testMode, setTestMode] = useState<boolean>(config.testMode);
  const [testEventCode, setTestEventCode] = useState<string>(config.testEventCode);
  const [metaToken, setMetaToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Estados del simulador de Webhook
  const [simName, setSimName] = useState('Cliente WhatsApp');
  const [simPhone, setSimPhone] = useState('0992345678');
  const [simMessage, setSimMessage] = useState('Hola Kindev, vi el anuncio y quiero cotizar una web.');
  const [simLoading, setSimLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const webhookUrl = 'https://kindevmetaads.web.app/api/webhook/whatsapp';
  const webhookVerifyToken = 'kindev_meta_webhook_2026';

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

  const copyToClipboard = (text: string, isToken: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isToken) {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    if (onShowToast) onShowToast('Copiado al portapapeles', 'info');
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simPhone.trim()) return;

    setSimLoading(true);
    try {
      const res = await ingestIncomingLead(
        {
          name: simName.trim() || 'Cliente WhatsApp',
          phone: simPhone.trim(),
          message: simMessage.trim(),
          service: 'Interés por Anuncio de Meta',
          source: 'whatsapp_auto'
        },
        config
      );

      if (res.isDuplicate) {
        if (onShowToast) onShowToast(`El número ${simPhone} ya existe en tu lista de clientes`, 'info');
      } else if (res.success) {
        if (onShowToast) onShowToast(`⚡ ¡Nuevo lead simulado recibido y auto-registrado en Firestore!`, 'success');
        onClose();
      } else {
        if (onShowToast) onShowToast(res.error || 'Error al procesar mensaje', 'error');
      }
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 md:p-7 space-y-5 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-xl hover:bg-slate-100"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div>
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl mb-3 shadow-sm border border-violet-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Configuración & Automatizaciones</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Conexión con Meta CAPI y receptor automático de prospectos de WhatsApp.
          </p>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('webhook')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'webhook'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>⚡ Auto-WhatsApp (Webhook)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'meta'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-violet-600" />
            <span>Meta CAPI & Token</span>
          </button>
        </div>

        {/* PESTAÑA: AUTOMATIZAR WHATSAPP (WEBHOOK) */}
        {activeTab === 'webhook' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¿Cómo funciona la captura automática?</span>
              </div>
              <p className="text-[11px] text-emerald-900/80 leading-relaxed font-medium">
                Cuando alguien te escribe a WhatsApp, este Webhook recibe los datos (nombre y celular) y crea automáticamente la tarjeta de <strong>Prospecto</strong> en tu panel sin que tengas que escribir nada.
              </p>
            </div>

            {/* Credenciales del Webhook */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Oficial del Webhook</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-700 font-mono text-xs focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, false)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Copiar URL"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Token de Verificación (Meta / Webhook)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={webhookVerifyToken}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-700 font-mono text-xs focus:outline-none select-all font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookVerifyToken, true)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Copiar Token"
                  >
                    {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Simulador en Vivo para Probar Ahora Mismo */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Probar Ingesta Automática en Vivo</span>
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  Simulador
                </span>
              </div>

              <form onSubmit={handleSimulateWebhook} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Nombre Simulado</label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      placeholder="Juan WhatsApp"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Celular Simulado</label>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      placeholder="0992345678"
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Mensaje recibido</label>
                  <input
                    type="text"
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    placeholder="Hola, me interesa una web"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={simLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{simLoading ? 'Simulando llegada de WhatsApp...' : 'Simular Mensaje Entrante de WhatsApp'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PESTAÑA: META CAPI & TOKEN */}
        {activeTab === 'meta' && (
          <div className="space-y-4 animate-in fade-in duration-200">
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
              <span>{loading ? 'Guardando...' : 'Guardar Credenciales'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
