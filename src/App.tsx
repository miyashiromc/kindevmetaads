import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from './lib/firebase';
import { 
  Lead, 
  LeadStatus, 
  MetaConfig, 
  DashboardStats, 
  MetaEventRecord, 
  WhatsAppBotStatus,
  TabView,
  ClientAccount,
  UserRole
} from './types';
import { dispatchMetaCAPI } from './lib/meta-capi';
import { getFbc, getFbp, generateEventId, trackPixelEvent } from './lib/meta-tracker';
import { SecurityGate } from './components/SecurityGate';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ClientManagerModal } from './components/ClientManagerModal';
import { KanbanBoard } from './components/KanbanBoard';
import { AnalyticsView } from './components/AnalyticsView';
import { MetaAdsIntelligence } from './components/MetaAdsIntelligence';
import { LtvClientsView } from './components/LtvClientsView';
import { FollowUpCenter } from './components/FollowUpCenter';
import { StatsGrid } from './components/StatsGrid';
import { LeadForm } from './components/LeadForm';
import { LeadCard } from './components/LeadCard';
import { SaleModal } from './components/SaleModal';
import { ConfigModal } from './components/ConfigModal';
import { WhatsAppStatusModal } from './components/WhatsAppStatusModal';
import { BottomNav } from './components/BottomNav';
import { Toast, ToastData } from './components/Toast';

const FALLBACK_STORAGE_KEY = 'kindev_leads_cache';

// Mapeo oficial de Pestañas ↔ Hash (#) para navegación amigable e historial
const TAB_TO_HASH: Record<TabView, string> = {
  kanban: '#kanban',
  analytics: '#metricas',
  ads_intelligence: '#meta-ads',
  ltv_clients: '#ltv-clientes',
  follow_up: '#seguimiento',
  quick_list: '#directorio'
};

const getTabFromHash = (hash: string): TabView => {
  const clean = hash.replace(/^#\/?/, '').toLowerCase().trim();
  switch (clean) {
    case 'kanban':
    case 'pipeline':
      return 'kanban';
    case 'metricas':
    case 'analytics':
    case 'graficos':
    case 'analitica':
      return 'analytics';
    case 'meta-ads':
    case 'ads':
    case 'ads_intelligence':
    case 'anuncios':
    case 'roas':
      return 'ads_intelligence';
    case 'ltv':
    case 'ltv-clientes':
    case 'ltv_clients':
    case 'recompra':
    case 'clientes':
      return 'ltv_clients';
    case 'seguimiento':
    case 'follow_up':
    case 'followup':
      return 'follow_up';
    case 'directorio':
    case 'lista':
    case 'quick_list':
    case 'registro':
    case 'leads':
      return 'quick_list';
    default:
      return 'kanban';
  }
};

export const App: React.FC = () => {
  // 1. Estado de Autenticación / Acceso Multi-Cliente
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('kindev_auth_session') === 'true';
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (typeof window === 'undefined') return 'superadmin';
    return (sessionStorage.getItem('kindev_auth_role') as UserRole) || 'superadmin';
  });

  const [activeTenantId, setActiveTenantIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'kindev';
    return sessionStorage.getItem('kindev_auth_tenant') || 'kindev';
  });

  const setActiveTenantId = (tId: string) => {
    setActiveTenantIdState(tId);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('kindev_auth_tenant', tId);
    }
  };

  const CLIENTS_STORAGE_KEY = 'kindev_clients_registry';
  const [clients, setClients] = useState<ClientAccount[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(CLIENTS_STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isClientManagerOpen, setIsClientManagerOpen] = useState<boolean>(false);

  // 2. Estado de Configuración Meta (Kindev Default)
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

  // Cuenta Activa (Kindev o Cliente)
  const activeTenant = useMemo(() => {
    if (activeTenantId === 'kindev') {
      return {
        id: 'kindev',
        name: 'Kindev S.A.S.',
        isMaster: true,
        clientPin: 'kindev2026',
        metaConfig: {
          datasetId: '1368429478371391',
          accessToken: '',
          testMode: config.testMode,
          testEventCode: config.testEventCode
        },
        createdAt: '2026-01-01T00:00:00.000Z'
      } as ClientAccount;
    }
    const found = clients.find((c) => c.id === activeTenantId);
    return (
      found ||
      ({
        id: activeTenantId,
        name: activeTenantId,
        clientPin: '',
        metaConfig: {
          datasetId: '',
          accessToken: '',
          testMode: true,
          testEventCode: ''
        },
        createdAt: new Date().toISOString()
      } as ClientAccount)
    );
  }, [activeTenantId, clients, config]);

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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const LEADS_PER_PAGE = 5;

  // 4. Módulo Activo / Pestaña con Soporte de Hash (#)
  const [activeTab, setActiveTabState] = useState<TabView>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return getTabFromHash(window.location.hash);
    }
    return 'kanban';
  });

  const setActiveTab = (tab: TabView, replace: boolean = false) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const targetHash = TAB_TO_HASH[tab] || `#${tab}`;
      if (window.location.hash !== targetHash) {
        if (replace) {
          window.history.replaceState(null, '', targetHash);
        } else {
          window.history.pushState(null, '', targetHash);
        }
      }
    }
  };

  // Sincronización bidireccional con eventos de historial (HashChange / PopState)
  useEffect(() => {
    const handleHashSync = () => {
      if (typeof window === 'undefined') return;
      const currentTab = getTabFromHash(window.location.hash);
      setActiveTabState(currentTab);
    };

    window.addEventListener('hashchange', handleHashSync);
    window.addEventListener('popstate', handleHashSync);

    // Si entra a la página sin hash, asignar el hash por defecto correspondiente
    if (typeof window !== 'undefined') {
      if (!window.location.hash) {
        const initialHash = TAB_TO_HASH[activeTab] || '#kanban';
        window.history.replaceState(null, '', initialHash);
      } else {
        const initialTab = getTabFromHash(window.location.hash);
        if (initialTab !== activeTab) {
          setActiveTabState(initialTab);
        }
      }
    }

    return () => {
      window.removeEventListener('hashchange', handleHashSync);
      window.removeEventListener('popstate', handleHashSync);
    };
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // 5. Modales y Notificaciones
  const [saleLead, setSaleLead] = useState<Lead | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isWsModalOpen, setIsWsModalOpen] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<WhatsAppBotStatus>({
    status: 'disconnected',
    isListening: false,
    user: ''
  });
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
              tenantId: data.tenantId || 'kindev',
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

  // Sincronización en tiempo real de cuentas de clientes (tenants_registry)
  useEffect(() => {
    try {
      const docRef = doc(db, 'settings', 'tenants_registry');
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.clients)) {
            setClients(data.clients);
            try {
              localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(data.clients));
            } catch {
              // ignore
            }
          }
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Error sincronizando tenants_registry:', err);
    }
  }, []);

  // Escuchar estado del WhatsApp Bot (Firestore + Localhost)
  const refreshWhatsAppStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/whatsapp/status', {
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        setWsStatus({
          status: data.status,
          isListening: Boolean(data.isListening),
          user: data.user || '',
          hasQr: Boolean(data.hasQr),
          updatedAt: data.updatedAt || new Date().toISOString()
        });
        return;
      }
    } catch {
      // Localhost no alcanzable desde este dispositivo
    }
  };

  useEffect(() => {
    if (!isUnlocked) return;

    // 1. Escucha en tiempo real vía Cloud Firestore (Funciona en tu PC o en tu celular)
    const statusDoc = doc(db, 'settings', 'whatsapp_status');
    const unsubscribe = onSnapshot(
      statusDoc,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const lastUpdate = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
          // Ventana de validez de 6 minutos acorde al heartbeat optimizado
          const isRecent = Date.now() - lastUpdate < (6 * 60 * 1000);
          const isConn = data.status === 'connected' && isRecent;

          setWsStatus({
            status: isConn ? 'connected' : (data.status === 'qr_ready' ? 'qr_ready' : 'disconnected'),
            isListening: isConn,
            user: data.user || '',
            note: data.note || '',
            updatedAt: data.updatedAt
          });
        }
      },
      (err) => {
        console.warn('WhatsApp status snapshot error:', err.message);
      }
    );

    // 2. Consulta al localhost SOLO si el navegador está en la máquina local (evita errores en celulares)
    const isLocalEnvironment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    let interval: NodeJS.Timeout | undefined;
    if (isLocalEnvironment) {
      refreshWhatsAppStatus();
      interval = setInterval(refreshWhatsAppStatus, 30000);
    }

    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [isUnlocked]);

  // Leads pertenecientes exclusivamente al tenant activo
  const tenantLeads = useMemo(() => {
    if (activeTenantId === 'kindev') {
      return leads.filter((l) => !l.tenantId || l.tenantId === 'kindev');
    }
    return leads.filter((l) => l.tenantId === activeTenantId);
  }, [leads, activeTenantId]);

  // Cálculo de KPIs / Estadísticas para el tenant activo
  const stats: DashboardStats = useMemo(() => {
    const totalLeads = tenantLeads.length;
    const closedList = tenantLeads.filter((l) => l.status === 'cerrado');
    const closedLeads = closedList.length;
    const totalRevenue = closedList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const pendingLeads = tenantLeads.filter(
      (l) => l.status === 'prospecto' || l.status === 'cotizado' || l.status === 'en_negociacion' || l.status === 'anticipo'
    ).length;

    return {
      totalLeads,
      closedLeads,
      totalRevenue,
      pendingLeads
    };
  }, [tenantLeads]);

  // Filtro de leads del tenant activo
  const filteredLeads = useMemo(() => {
    return tenantLeads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        lead.service.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'prospecto'
          ? lead.status === 'prospecto' || lead.status === 'cotizado'
          : statusFilter === 'en_negociacion'
          ? lead.status === 'en_negociacion' || lead.status === 'anticipo'
          : lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tenantLeads, searchQuery, statusFilter]);

  // Reset de página al buscar o filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Paginación horizontal (máximo 5 clientes por vista)
  const totalPages = Math.ceil(filteredLeads.length / LEADS_PER_PAGE) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * LEADS_PER_PAGE;
    return filteredLeads.slice(start, start + LEADS_PER_PAGE);
  }, [filteredLeads, currentPage]);

  // Handlers
  const handleAddLead = async (data: {
    name: string;
    phone: string;
    service: string;
    amount?: number;
    isClosedImmediately?: boolean;
    note?: string;
  }) => {
    const saleAmount = Number(data.amount || 0);
    const isClosed = Boolean(data.isClosedImmediately);
    let initialEvents: MetaEventRecord[] = [];

    const fbc = getFbc() || undefined;
    const fbp = getFbp() || undefined;

    try {
      if (isClosed && saleAmount > 0) {
        const purchaseEventId = generateEventId('purchase');

        // Disparar en Píxel de Meta con clave de deduplicación
        trackPixelEvent('Purchase', { value: saleAmount, currency: 'USD' }, purchaseEventId);

        // Enviar compra inmediatamente a Meta con credenciales del tenant activo
        const tenantMetaCreds = activeTenantId !== 'kindev' && activeTenant?.metaConfig?.datasetId
          ? {
              datasetId: activeTenant.metaConfig.datasetId,
              accessToken: activeTenant.metaConfig.accessToken
            }
          : undefined;

        const capiRes = await dispatchMetaCAPI(
          {
            eventName: 'Purchase',
            phone: data.phone,
            name: data.name,
            value: saleAmount,
            currency: 'USD',
            eventId: purchaseEventId,
            actionSource: 'website',
            fbc,
            fbp,
            testMode: activeTenant.metaConfig.testMode,
            testEventCode: activeTenant.metaConfig.testEventCode
          },
          tenantMetaCreds
        );

        initialEvents = [{
          eventName: 'Purchase',
          amount: saleAmount,
          currency: 'USD',
          date: new Date().toISOString(),
          fbtraceId: capiRes.fbtraceId,
          eventId: purchaseEventId,
          actionSource: 'website',
          testMode: activeTenant.metaConfig.testMode
        }];
      }

      const leadEventId = generateEventId('lead');

      const newLeadData = {
        name: data.name,
        phone: data.phone,
        displayPhone: data.phone,
        service: data.service,
        notes: data.note || '',
        status: (isClosed ? 'cerrado' : 'prospecto') as LeadStatus,
        amount: saleAmount,
        createdAt: new Date().toISOString(),
        source: 'manual' as const,
        tenantId: activeTenantId,
        metaEvents: initialEvents,
        eventId: leadEventId,
        fbc,
        fbp,
        ...(isClosed ? { saleDate: new Date().toISOString() } : {})
      };

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

      if (isClosed) {
        showToast(`¡Venta de $${saleAmount.toFixed(2)} USD registrada y enviada a Meta!`, 'success');
      } else {
        showToast(`Prospecto ${data.name} registrado con éxito`, 'success');
        
        // 1. Disparar Píxel en navegador con deduplicación
        trackPixelEvent('Lead', { content_name: data.service, currency: 'USD', value: 0 }, leadEventId);

        // 2. Despacho a Meta CAPI con mismo eventId
        dispatchMetaCAPI({
          eventName: 'Lead',
          phone: data.phone,
          name: data.name,
          eventId: leadEventId,
          actionSource: 'website',
          fbc,
          fbp,
          testMode: config.testMode,
          testEventCode: config.testEventCode
        }).catch((capiErr) => console.log('CAPI Lead background warning:', capiErr));
      }

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

  const handleUpdateLeadName = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      if (firestoreConnected) {
        const leadRef = doc(db, 'leads', id);
        await updateDoc(leadRef, { name: trimmed });
      }
      const updated = leads.map((l) => (l.id === id ? { ...l, name: trimmed } : l));
      setLeads(updated);
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(updated));
      showToast('Nombre actualizado correctamente', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar nombre';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleConfirmSale = async (leadId: string, amount: number, note?: string) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return;

    try {
      const purchaseEventId = generateEventId('purchase');
      const fbc = targetLead.fbc || getFbc() || undefined;
      const fbp = targetLead.fbp || getFbp() || undefined;

      // Disparar en Píxel del navegador con eventID para deduplicación
      trackPixelEvent('Purchase', { value: amount, currency: 'USD' }, purchaseEventId);

      // 1. Despachar a Meta CAPI con SHA-256 (usando credenciales del tenant si aplica)
      const tenantMetaCreds = activeTenantId !== 'kindev' && activeTenant?.metaConfig?.datasetId
        ? {
            datasetId: activeTenant.metaConfig.datasetId,
            accessToken: activeTenant.metaConfig.accessToken
          }
        : undefined;

      const capiRes = await dispatchMetaCAPI(
        {
          eventName: 'Purchase',
          phone: targetLead.phone,
          name: targetLead.name,
          value: amount,
          currency: 'USD',
          leadId: targetLead.id,
          eventId: purchaseEventId,
          actionSource: targetLead.source === 'whatsapp_auto' ? 'business_messaging' : 'website',
          fbc,
          fbp,
          testMode: activeTenant.metaConfig.testMode,
          testEventCode: activeTenant.metaConfig.testEventCode
        },
        tenantMetaCreds
      );

      const newMetaEvent: MetaEventRecord = {
        eventName: 'Purchase',
        amount,
        currency: 'USD',
        date: new Date().toISOString(),
        fbtraceId: capiRes.fbtraceId,
        eventId: purchaseEventId,
        actionSource: targetLead.source === 'whatsapp_auto' ? 'business_messaging' : 'website',
        testMode: activeTenant.metaConfig.testMode
      };

      const updatedEvents = [...(targetLead.metaEvents || []), newMetaEvent];
      const updatedNotes = note ? note : targetLead.notes || '';

      // 2. Guardar en Firestore o Local
      if (firestoreConnected) {
        const leadRef = doc(db, 'leads', leadId);
        await updateDoc(leadRef, {
          status: 'cerrado',
          amount,
          notes: updatedNotes,
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
                notes: updatedNotes,
                saleDate: new Date().toISOString(),
                metaEvents: updatedEvents
              }
            : l
        );
        setLeads(updated);
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(updated));
      }

      showToast(`¡Venta de $${amount.toFixed(2)} USD enviada a Meta CAPI! (Trace: ${capiRes.fbtraceId})`, 'success');
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

  const handleSaveLeadNote = async (leadId: string, note: string) => {
    try {
      if (firestoreConnected) {
        const leadRef = doc(db, 'leads', leadId);
        await updateDoc(leadRef, {
          notes: note,
          lastContactDate: new Date().toISOString()
        });
      }
      const updated = leads.map((l) =>
        l.id === leadId
          ? { ...l, notes: note, lastContactDate: new Date().toISOString() }
          : l
      );
      setLeads(updated);
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(updated));
      showToast('Nota de seguimiento guardada con éxito', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar nota';
      showToast(msg, 'error');
    }
  };

  const handleSaveConfig = async (newConfig: MetaConfig, newToken?: string) => {
    if (activeTenantId === 'kindev') {
      setConfig(newConfig);
      localStorage.setItem('kindev_meta_config', JSON.stringify(newConfig));
      if (newToken) {
        localStorage.setItem('kindev_meta_token', newToken);
      }
    } else {
      const updatedClient: ClientAccount = {
        ...activeTenant,
        metaConfig: {
          ...activeTenant.metaConfig,
          testMode: newConfig.testMode,
          testEventCode: newConfig.testEventCode,
          ...(newToken ? { accessToken: newToken } : {})
        }
      };
      await handleSaveClient(updatedClient);
    }
    showToast('Configuración guardada exitosamente', 'success');
  };

  const handleSaveClient = async (clientToSave: ClientAccount) => {
    const updated = [...clients];
    const idx = updated.findIndex((c) => c.id === clientToSave.id);
    if (idx >= 0) {
      updated[idx] = clientToSave;
    } else {
      updated.push(clientToSave);
    }
    setClients(updated);
    try {
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      if (firestoreConnected) {
        await setDoc(doc(db, 'settings', 'tenants_registry'), {
          clients: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Error guardando en Firestore tenants_registry:', err);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);
    try {
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (activeTenantId === clientId) {
      setActiveTenantId('kindev');
    }

    try {
      if (firestoreConnected) {
        await setDoc(doc(db, 'settings', 'tenants_registry'), {
          clients: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      showToast('Cliente eliminado', 'info');
    } catch (err) {
      console.warn('Error eliminando en Firestore tenants_registry:', err);
    }
  };

  const handleUnlock = (role: UserRole, tenantId: string) => {
    setUserRole(role);
    setActiveTenantId(tenantId);
    setIsUnlocked(true);
  };

  const handleLock = () => {
    sessionStorage.removeItem('kindev_auth_session');
    sessionStorage.removeItem('kindev_auth_role');
    sessionStorage.removeItem('kindev_auth_tenant');
    setIsUnlocked(false);
  };

  if (!isUnlocked) {
    return <SecurityGate onUnlock={handleUnlock} clients={clients} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex font-sans antialiased selection:bg-violet-100 selection:text-violet-900">
      
      {/* 1. Barra Lateral Izquierda (Sidebar Empresarial) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        config={activeTenant.metaConfig || config}
        wsStatus={wsStatus}
        kanbanCount={tenantLeads.filter((l) => l.status !== 'descartado').length}
        closedCount={tenantLeads.filter((l) => l.status === 'cerrado').length}
        followUpCount={tenantLeads.filter((l) => ['prospecto', 'cotizado', 'en_negociacion'].includes(l.status)).length}
        firestoreConnected={firestoreConnected}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenWsStatus={() => setIsWsModalOpen(true)}
        onLock={handleLock}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenClientManager={() => setIsClientManagerOpen(true)}
        activeTenantName={activeTenant.name}
        userRole={userRole}
      />

      {/* 2. Área de Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Barra Superior (TopBar) */}
        <TopBar
          activeTab={activeTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onAddNewLead={() => setActiveTab('quick_list')}
          config={activeTenant.metaConfig || config}
          wsStatus={wsStatus}
          onOpenWsStatus={() => setIsWsModalOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          activeTenantId={activeTenantId}
          activeTenantName={activeTenant.name}
          userRole={userRole}
          clients={clients}
          onSelectTenant={(id) => setActiveTenantId(id)}
          onOpenClientManager={() => setIsClientManagerOpen(true)}
        />

        {/* Contenedor Principal con Espacio Seguro para Barra Inferior en Celular */}
        <main className={`flex-1 w-full transition-all pb-24 lg:pb-8 ${
          activeTab === 'kanban'
            ? 'p-2.5 sm:p-4 md:p-6 max-w-none space-y-3 sm:space-y-4'
            : 'p-3 sm:p-5 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6'
        }`}>
          
          {/* Banner informativo de modo prueba si está activo */}
          {Boolean(activeTenant.metaConfig?.testMode ?? config.testMode) && (
            <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-900 text-xs shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>
                  <strong>Modo Prueba Meta Activo ({activeTenant.name}):</strong> Los eventos se están despachando con el código{' '}
                  <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-bold">
                    {activeTenant.metaConfig?.testEventCode || config.testEventCode || 'TEST92244'}
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

        {/* 1. Módulo: Pipeline Kanban */}
        {activeTab === 'kanban' && (
          <KanbanBoard
            leads={tenantLeads}
            onUpdateStatus={handleUpdateStatus}
            onOpenSaleModal={(lead) => setSaleLead(lead)}
            onAddNewLead={() => setActiveTab('quick_list')}
            onUpdateName={handleUpdateLeadName}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          />
        )}

        {/* 2. Módulo: Métricas & Gráficos */}
        {activeTab === 'analytics' && (
          <AnalyticsView leads={tenantLeads} />
        )}

        {/* 3. Módulo: Inteligencia Meta Ads */}
        {activeTab === 'ads_intelligence' && (
          <MetaAdsIntelligence leads={tenantLeads} />
        )}

        {/* 4. Módulo: Clientes & LTV */}
        {activeTab === 'ltv_clients' && (
          <LtvClientsView leads={tenantLeads} />
        )}

        {/* 5. Módulo: Centro de Seguimiento */}
        {activeTab === 'follow_up' && (
          <FollowUpCenter leads={tenantLeads} onSaveNote={handleSaveLeadNote} />
        )}

        {/* 6. Módulo: Lista & Registro Rápido */}
        {activeTab === 'quick_list' && (
          <div className="space-y-6">
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
                    {totalPages > 1 && ` • Página ${currentPage} de ${totalPages}`}
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
                <>
                  <div className="grid grid-cols-1 gap-3">
                    {paginatedLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onOpenSale={(l) => setSaleLead(l)}
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDelete}
                        onUpdateName={handleUpdateLeadName}
                      />
                    ))}
                  </div>

                  {/* Barra de Navegación Horizontal (Paginador) */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm mt-2">
                      <div className="text-xs text-slate-500 font-medium">
                        Mostrando <span className="font-bold text-slate-800">{(currentPage - 1) * LEADS_PER_PAGE + 1}</span> a{' '}
                        <span className="font-bold text-slate-800">{Math.min(currentPage * LEADS_PER_PAGE, filteredLeads.length)}</span> de{' '}
                        <span className="font-bold text-slate-800">{filteredLeads.length}</span> clientes
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Anterior</span>
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                currentPage === page
                                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        <span>Siguiente</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

        </main>

        {/* Footer Empresarial Luminous */}
        <footer className="border-t border-slate-200/80 bg-white py-3.5 px-4 sm:px-6 mt-auto mb-14 lg:mb-0">
          <div className={`${activeTab === 'kanban' ? 'w-full px-2' : 'max-w-7xl mx-auto'} flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2`}>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Kindev Logo" className="h-4 w-auto object-contain opacity-70" />
              <span>© 2026 Kindev S.A.S. • Conversions API Engine v2.0 Enterprise</span>
            </div>
            <div className="flex items-center gap-3 font-medium text-[11px]">
              <span>Cloud Firestore: {firestoreConnected ? 'En línea' : 'Modo local'}</span>
              <span>•</span>
              <span>Meta Graph v19.0</span>
            </div>
          </div>
        </footer>

      </div>

      {/* Barra de Navegación Móvil Inferior (BottomNav Ergonómico al Alcance del Pulgar) */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        kanbanCount={tenantLeads.filter((l) => l.status !== 'descartado' && l.status !== 'cerrado').length}
        closedCount={tenantLeads.filter((l) => l.status === 'cerrado').length}
        followUpCount={tenantLeads.filter((l) => ['prospecto', 'cotizado', 'en_negociacion'].includes(l.status)).length}
      />

      {/* Modal de Gestión Multi-Cliente */}
      <ClientManagerModal
        isOpen={isClientManagerOpen}
        onClose={() => setIsClientManagerOpen(false)}
        clients={clients}
        activeTenantId={activeTenantId}
        onSelectTenant={(id) => setActiveTenantId(id)}
        onSaveClient={handleSaveClient}
        onDeleteClient={handleDeleteClient}
        onShowToast={showToast}
      />

      {/* Modal de Cierre de Venta */}
      <SaleModal
        lead={saleLead}
        onClose={() => setSaleLead(null)}
        onConfirmSale={handleConfirmSale}
      />

      {/* Modal de Configuración y Seguridad */}
      <ConfigModal
        isOpen={isConfigOpen}
        config={activeTenant.metaConfig || config}
        onClose={() => setIsConfigOpen(false)}
        onSaveConfig={handleSaveConfig}
        onShowToast={showToast}
      />

      {/* Modal de Estado de WhatsApp */}
      <WhatsAppStatusModal
        isOpen={isWsModalOpen}
        status={wsStatus}
        onClose={() => setIsWsModalOpen(false)}
        onRefresh={refreshWhatsAppStatus}
        onShowToast={showToast}
      />

      {/* Notificaciones Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

    </div>
  );
};
