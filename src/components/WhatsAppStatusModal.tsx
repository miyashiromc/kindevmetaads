import React, { useState } from 'react';
import { X, MessageSquare, AlertCircle, RefreshCw, QrCode, ExternalLink, ShieldCheck, Terminal } from 'lucide-react';
import { WhatsAppBotStatus } from '../types';

interface WhatsAppStatusModalProps {
  isOpen: boolean;
  status: WhatsAppBotStatus;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const WhatsAppStatusModal: React.FC<WhatsAppStatusModalProps> = ({
  isOpen,
  status,
  onClose,
  onRefresh,
  onShowToast,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const isConnected = status.isListening && status.status === 'connected';

  const handleManualCheck = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      onShowToast('Estado de conexión verificado.', 'info');
    } catch {
      onShowToast('No se pudo verificar el estado local.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Escuchador de WhatsApp
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pasarela Automática de Leads & Meta CAPI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Card de Estado Principal */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
            isConnected
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}>
            <div className="shrink-0 mt-0.5">
              {isConnected ? (
                <div className="relative flex items-center justify-center">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
                </div>
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm">
                  {isConnected ? 'Escuchador ACTIVO y Conectado' : 'Escuchador DETENIDO o Desconectado'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isConnected ? 'bg-emerald-200/70 text-emerald-800' : 'bg-rose-200/70 text-rose-800'
                }`}>
                  {isConnected ? 'En Línea' : 'Offline'}
                </span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {isConnected
                  ? 'El robot de Baileys está escuchando mensajes entrantes en tu PC y enviando clientes potenciales automáticamente a Cloud Firestore.'
                  : 'El servidor local en tu PC no está respondiendo. Si apagaste tu computadora o reiniciaste, enciende el servidor desde tu escritorio.'}
              </p>
            </div>
          </div>

          {/* Detalles Técnicos */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Línea Vinculada:</span>
              <span className="font-mono font-bold text-slate-800">
                {status.user ? `+${status.user}` : (isConnected ? '+593 99 195 2889' : 'No conectado')}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Filtro de Anuncios:</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Estricto (Solo leads de Meta Ads)
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-medium">Última comprobación:</span>
              <span className="text-slate-600 font-mono">
                {status.updatedAt ? new Date(status.updatedAt).toLocaleTimeString() : 'Reciente'}
              </span>
            </div>
          </div>

          {/* Instrucciones si está desconectado */}
          {!isConnected && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs text-amber-900">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <Terminal className="w-4 h-4 text-amber-700" />
                ¿Cómo iniciar el escuchador en tu PC?
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-900/90 pl-1">
                <li>Haz doble clic en el acceso directo <strong>"Kindev Meta Ads"</strong> en tu escritorio.</li>
                <li>O ejecuta el archivo <strong>"Estado-WhatsApp.bat"</strong> en tu carpeta de proyecto.</li>
                <li>Al iniciar Windows, se levantará automáticamente en segundo plano.</li>
              </ul>
            </div>
          )}

          {/* Acciones Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <a
              href="http://localhost:3000/qr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-sm active:scale-95 text-center"
            >
              <QrCode className="w-4 h-4" />
              <span>Vincular / Escanear QR</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>

            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Comprobar Conexión</span>
            </button>
          </div>

        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
