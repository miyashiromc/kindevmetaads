import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Search, Filter } from 'lucide-react';
import { db } from './lib/firebase';
import { Lead, LeadStatus, MetaConfig, DashboardStats } from './types';
import { dispatchMetaCAPI } from './lib/meta-capi';
import { SecurityGate } from './components/SecurityGate';
import { Header } from './components/Header';
import { StatsGrid } from './components/StatsGrid';
import { LeadForm } from './components/LeadForm';
import { LeadCard } from './components/LeadCard';
import { SaleModal } from './components/SaleModal';
import { ConfigModal } from './components/ConfigModal';
import { Toast, ToastData } from './components/Toast';

const FALLBACK_STORAGE_KEY = 'kindev_leads_cache';

export const App: React.FC = () => {
  // 1. Estado de Autenticación / Acceso
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('kindev_auth_session') === 'true';
  });

  // 2. Estado de Configuración Meta
  const [config, setConfig] = useState<MetaConfig>(() => {
    if (typeof window === 'undefined') {
      return { testMode: true, testEventCode: 'TEST92244' };
    }
    const saved = localStorage.getItem('kindev_meta_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return { testMode: true, testEventCode: 'TEST92244' };
  });

  // 3. Estado de Leads & Sincronización
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(FALLBACK_STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 4. Modales y Notificaciones
  const [saleLead, setSaleLead] = useState<Lead | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({
      id: Math.random().toString(),
      message,
      type
    });
  };

  // Firestore Real-Time Listener
  useEffect(() => {
    if (!isUnlocked) return;

    try {
      const leadsCol = collection(db, 'leads');
      const unsubscribe = onSnapshot(
        leadsCol,
        (snapshot) => {
          const fetchedLeads: Lead[] = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            fetchedLeads.push({
              id: docSnapshot.id,
              name: data.name || 'Sin Nombre',
              phone: data.phone || '',
              displayPhone: data.displayPhone || data.phone || '',
              email: data.email || '',
              service: data.service || 'Desarrollo Web',
              notes: data.notes || '',
              status: (data.status as LeadStatus) || 'prospecto',
              amount: Number(data.amount || 0),
              createdAt: data.createdAt || new Date().toISOString(),
              saleDate: data.saleDate,
              metaEvents: Array.isArray(data.metaEvents) ? data.metaEvents : []
            });
          });

          // Ordenar por fecha descendente
          fetchedLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setLeads(fetchedLeads);
          setFirestoreConnected(true);
          try {
            localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(fetchedLeads));
          } catch {
            // ignore
          }
        },
        (error) => {
          console.warn('Firestore fallback activado:', error.message);
          setFirestoreConnected(false);
          showToast('Modo sin conexión o sincronización local activa', 'info');
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Error inicializando Firestore:', err);
      setFirestoreConnected(false);
    }
  }, [isUnlocked]);

  // Cálculo de KPIs / Estadísticas
  const stats: DashboardStats = useMemo(() => {
    const totalLeads = leads.length;
    const closedList = leads.filter((l) => l.status === 'cerrado');
    const closedLeads = closedList.length;
    const totalRevenue = closedList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const pendingLeads = leads.filter(
      (l) => l.status === 'prospecto' || l.status === 'en_negociacion'
    ).length;

    return {
      totalLeads,
      closedLeads,
      totalRevenue,
      pendingLeads
    };
  }, [leads]);

  // Filtro de leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        lead.service.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ? true : lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  // Handlers
  const handleAddLead = async (data: { name: string; phone: string; service: string }) => {
    const newLeadData = {
      name: data.name,
      phone: data.phone,
      displayPhone: data.phone,
      service: data.service,
      status: 'prospecto' as LeadStatus,
      amount: 0,
      createdAt: new Date().toISOString(),
      metaEvents: []
    };

    try {
      if (firestoreConnected) {
        await addDoc(collection(db, 'leads'), newLeadData);
      } else {
        const localLead: Lead = {
          ...newLeadData,
          id: `local_${Date.now()}`
        };
        const updated = [localLead, ...leads];
        setLeads(updated);
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(updated));
      }

      showToast(`Prospecto ${data.name} registrado con éxito`, 'success');

      // Despacho opcional silencioso de evento Lead / Contact a Meta CAPI
      dispatchMetaCAPI({
        eventName: 'Lead',
        phone: data.phone,
        name: data.name,
        testMode: config.testMode,
        testEventCode: config.testEventCode
      }).catch((capiErr) => console.log('CAPI Lead background warning:', capiErr));

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar prospecto';
      showToast(msg, 'error');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: LeadStatus) => {
    try {
      if (firestoreConnected) {
        const leadRef = doc(db, 'leads', id);
        await updateDoc(leadRef, { status: newStatus });
      } else {
        const updated = leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
        setLeads(updated);
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(updated));
      }
      showToast(`Estado cambiado a: ${newStatus}`, 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar estado';
      showToast(msg, 'error');
    }
  };

  const handleConfirmSale = async (leadId: string, amount: number) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return;

    try {
      // 1. Despachar a Meta CAPI con SHA-256
      const capiRes = await dispatchMetaCAPI({
        eventName: 'Purchase',
        phone: targetLead.phone,
        name: targetLead.name,
        value: amount,
        currency: 'USD',
        testMode: config.testMode,
        testEventCode: config.testEventCode
      });

      const newMetaEvent = {
        eventName: 'Purchase' as const,
        amount,
        currency: 'USD',
        date: new Date().toISOString(),
        fbtraceId: capiRes.fbtraceId,
        testMode: config.testMode
      };

      const updatedEvents = [...(targetLead.metaEvents || []), newMetaEvent];

      // 2. Guardar en Firestore o Local
      if (firestoreConnected) {
        const leadRef = doc(db, 'leads', leadId);
        await updateDoc(leadRef, {
          status: 'cerrado',
          amount,
          saleDate: new Date().toISOString(),
          metaEvents: updatedEvents
        });
      } else {
        const updated = leads.map((l) =>
          l.id === leadId
            ? {
                ...l,
                status: 'cerrado' as LeadStatus,
                amount,
                saleDate: new Date().toISOString(),
                metaEvents: updatedEvents
              }
            : l
        );
        setLeads(updated);
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(updated));
      }

      showToast(`¡Venta de $${amount} USD enviada a Meta CAPI! (Trace: ${capiRes.fbtraceId})`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error enviando evento a Meta CAPI';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro?')) return;

    try {
      if (firestoreConnected) {
        await deleteDoc(doc(db, 'leads', id));
      } else {
        const updated = leads.filter((l) => l.id !== id);
        setLeads(updated);
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(updated));
      }
      showToast('Registro eliminado', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      showToast(msg, 'error');
    }
  };

  const handleSaveConfig = async (newConfig: MetaConfig, newToken?: string) => {
    setConfig(newConfig);
    localStorage.setItem('kindev_meta_config', JSON.stringify(newConfig));
    if (newToken) {
      localStorage.setItem('kindev_meta_token', newToken);
    }
    showToast('Configuración guardada exitosamente', 'success');
  };

  const handleLock = () => {
    sessionStorage.removeItem('kindev_auth_session');
    setIsUnlocked(false);
  };

  if (!isUnlocked) {
    return <SecurityGate onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-violet-100 selection:text-violet-900">
      
      {/* Barra de Navegación Superior */}
      <Header
        config={config}
        onOpenConfig={() => setIsConfigOpen(true)}
        onLock={handleLock}
      />

      {/* Contenedor Principal */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6 md:py-8 space-y-6 flex-1">
        
        {/* Banner informativo de modo prueba si está activo */}
        {config.testMode && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-900 text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span>
                <strong>Modo Prueba Meta Activo:</strong> Los eventos se están despachando con el código{' '}
                <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-bold">
                  {config.testEventCode || 'TEST92244'}
                </code>
                . Puedes visualizarlos en vivo en el Events Manager de Meta.
              </span>
            </div>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="font-bold underline hover:text-amber-700 shrink-0 text-xs"
            >
              Cambiar
            </button>
          </div>
        )}

        {/* Métricas / KPIs */}
        <StatsGrid stats={stats} />

        {/* Formulario de Captura Rápida de WhatsApp */}
        <LeadForm onAddLead={handleAddLead} />

        {/* Listado y Filtro de Clientes */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Gestión de Clientes & Ventas</h3>
              <p className="text-xs text-slate-500">
                Total: {filteredLeads.length} {filteredLeads.length === 1 ? 'cliente' : 'clientes'}
              </p>
            </div>

            {/* Controles de Búsqueda y Filtro */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente o teléfono..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
                />
              </div>

              {/* Selector de filtro */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 p-1 rounded-xl shadow-sm text-xs font-semibold">
                <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('prospecto')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'prospecto'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Prospectos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('en_negociacion')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'en_negociacion'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Negociación
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('cerrado')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'cerrado'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Cerrados
                </button>
              </div>
            </div>
          </div>

          {/* Listado de Tarjetas */}
          {filteredLeads.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No hay clientes en este filtro</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Registra un nuevo contacto de WhatsApp en el formulario superior para comenzar a alimentarlo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onOpenSale={(l) => setSaleLead(l)}
                  onUpdateStatus={handleUpdateStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Footer Luminous */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Kindev Logo" className="h-4 w-auto object-contain opacity-70" />
            <span>© 2026 Kindev S.A.S. • Conversions API Engine v2.0</span>
          </div>
          <div className="flex items-center gap-3 font-medium text-[11px]">
            <span>Cloud Firestore: {firestoreConnected ? 'En línea' : 'Modo local'}</span>
            <span>•</span>
            <span>Meta Graph v19.0</span>
          </div>
        </div>
      </footer>

      {/* Modal de Cierre de Venta */}
      <SaleModal
        lead={saleLead}
        onClose={() => setSaleLead(null)}
        onConfirmSale={handleConfirmSale}
      />

      {/* Modal de Configuración y Seguridad */}
      <ConfigModal
        isOpen={isConfigOpen}
        config={config}
        onClose={() => setIsConfigOpen(false)}
        onSaveConfig={handleSaveConfig}
      />

      {/* Notificaciones Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

    </div>
  );
};
