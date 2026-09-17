import React from 'react';
import { FlaskConical, Lock, Database, Radio, MessageSquare } from 'lucide-react';
import { MetaConfig, WhatsAppBotStatus } from '../types';
import { META_DATASET_ID } from '../lib/meta-capi';

interface HeaderProps {
  config: MetaConfig;
  wsStatus: WhatsAppBotStatus;
  onOpenConfig: () => void;
  onOpenWsStatus: () => void;
  onLock: () => void;
}

export const Header: React.FC<HeaderProps> = ({ config, wsStatus, onOpenConfig, onOpenWsStatus, onLock }) => {
  const isWsConnected = wsStatus.isListening && wsStatus.status === 'connected';

  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 transition-all">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Marca & Logo Kindev */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center p-1 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
            <img 
              src="/logo.png" 
              alt="Kindev S.A.S." 
              className="h-8 w-auto object-contain" 
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-slate-900 text-base tracking-tight">Kindev Meta Ads</h1>
              <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-violet-600 animate-pulse" />
                CAPI ENGINE
              </span>
              <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Database className="w-2.5 h-2.5 text-emerald-600" />
                FIRESTORE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Dataset: <span className="font-mono text-slate-700 font-semibold">{META_DATASET_ID}</span> • Proyecto: <span className="font-mono text-slate-700 font-semibold">kindevmetaads</span>
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Botón Indicador de Escuchador de WhatsApp */}
          <button
            type="button"
            onClick={onOpenWsStatus}
            className={`text-xs font-semibold flex items-center gap-2 px-3 py-2 rounded-xl transition-all border shadow-sm active:scale-95 ${
              isWsConnected
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100/90'
                : wsStatus.status === 'qr_ready'
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100/90'
                : 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-200'
            }`}
            title="Estado del Escuchador de WhatsApp"
          >
            <div className="relative flex items-center justify-center">
              <span className={`w-2 h-2 rounded-full ${
                isWsConnected ? 'bg-emerald-500' : wsStatus.status === 'qr_ready' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              {isWsConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
              )}
            </div>
            <MessageSquare className={`w-3.5 h-3.5 ${isWsConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline font-bold">
              {isWsConnected ? 'WhatsApp Activo' : wsStatus.status === 'qr_ready' ? 'Vincular QR' : 'WhatsApp Inactivo'}
            </span>
            <span className="sm:hidden font-bold">
              {isWsConnected ? 'WS Activo' : 'WS Inactivo'}
            </span>
          </button>

          {/* Modo Prueba / Producción Meta */}
          <button
            onClick={onOpenConfig}
            className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all border shadow-sm ${
              config.testMode
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FlaskConical className={`w-3.5 h-3.5 ${config.testMode ? 'text-amber-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{config.testMode ? `Prueba (${config.testEventCode || 'TEST'})` : 'Modo Producción'}</span>
            <span className="sm:hidden">{config.testMode ? 'Prueba' : 'Prod'}</span>
          </button>

          {/* Bloquear sesión */}
          <button
            onClick={onLock}
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all flex items-center justify-center shadow-sm shrink-0"
            title="Bloquear sesión"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
