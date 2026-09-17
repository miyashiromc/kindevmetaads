export type LeadStatus = 'prospecto' | 'cotizado' | 'en_negociacion' | 'anticipo' | 'cerrado' | 'descartado';

export interface MetaEventRecord {
  eventName: 'Purchase' | 'Lead' | 'Contact';
  amount?: number;
  currency?: string;
  date: string;
  fbtraceId?: string;
  testMode?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  displayPhone: string;
  email?: string;
  service: string;
  notes?: string;
  status: LeadStatus;
  amount: number;
  createdAt: string;
  saleDate?: string;
  source?: 'manual' | 'whatsapp_auto';
  adSource?: string;
  hostingExpiryDate?: string;
  domainExpiryDate?: string;
  lastContactDate?: string;
  followUpNote?: string;
  metaEvents: MetaEventRecord[];
}

export interface MetaConfig {
  testMode: boolean;
  testEventCode: string;
}

export interface PricingPreset {
  label: string;
  amount: number;
  subtitle: string;
  badge?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  closedLeads: number;
  pendingLeads: number;
  totalLeads: number;
}

export interface WhatsAppBotStatus {
  status: 'connected' | 'reconnecting' | 'qr_ready' | 'initializing' | 'disconnected';
  isListening: boolean;
  user?: string;
  note?: string;
  updatedAt?: string;
  hasQr?: boolean;
}

export type TabView = 'kanban' | 'analytics' | 'ads_intelligence' | 'ltv_clients' | 'follow_up' | 'quick_list';

export interface AdPerformanceItem {
  id: string;
  name: string;
  format: 'Video Reels' | 'Imagen Carrusel' | 'Imagen Estática' | 'Story';
  spendUsd: number;
  clicks: number;
  leadsCount: number;
  salesCount: number;
  revenueUsd: number;
  roas: number;
  recommendation: 'scale' | 'optimize' | 'pause';
  recommendationText: string;
  status: 'active' | 'learning' | 'paused';
}

export interface ClientLTVRecord {
  id: string;
  clientName: string;
  phone: string;
  service: string;
  initialAmount: number;
  recurringAnnualUsd: number;
  hostingStatus: 'active' | 'expiring_soon' | 'expired';
  daysUntilHostingExpiry: number;
  upsellOpportunity: string;
  upsellPotentialUsd: number;
}

