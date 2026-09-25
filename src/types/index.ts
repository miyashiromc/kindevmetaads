export type LeadStatus = 'prospecto' | 'cotizado' | 'en_negociacion' | 'anticipo' | 'cerrado' | 'descartado';

export interface MetaEventRecord {
  eventName: 'Purchase' | 'Lead' | 'Contact';
  amount?: number;
  currency?: string;
  date: string;
  fbtraceId?: string;
  eventId?: string;
  actionSource?: string;
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
  source?: 'manual' | 'whatsapp_auto' | 'whatsapp_outreach';
  adSource?: string;
  hostingExpiryDate?: string;
  domainExpiryDate?: string;
  lastContactDate?: string;
  followUpNote?: string;
  tenantId?: string; // ID del cliente o 'kindev'
  metaEvents: MetaEventRecord[];
  eventId?: string;
  fbc?: string;
  fbp?: string;
  clientIp?: string;
  clientUserAgent?: string;
}

export interface ClientAccount {
  id: string; // Slug único ej: 'kindev', 'cliente-mendez'
  name: string;
  isMaster?: boolean;
  clientPin: string; // PIN para que el cliente ingrese directo
  phone?: string;
  metaConfig: {
    datasetId: string;
    accessToken: string;
    testMode: boolean;
    testEventCode: string;
  };
  whatsappConfig?: {
    status?: 'connected' | 'qr_ready' | 'disconnected';
    connectedUser?: string;
  };
  notes?: string;
  createdAt: string;
}

export type UserRole = 'superadmin' | 'client';

export interface MetaConfig {
  testMode: boolean;
  testEventCode: string;
  datasetId?: string;
  accessToken?: string;
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

export interface MetaLiveCampaignInsights {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  messagingConnections: number;
  firstReplies: number;
  depth2Replies: number;
  depth5Replies: number;
  linkClicks: number;
  costPerMessage: number;
  dropRatePercent: number;
}

export interface MetaPlatformBreakdown {
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'audience_network' | string;
  spend: number;
  impressions: number;
  clicks: number;
  messages: number;
  costPerMessage: number;
  conversionRatePercent: number;
}

export interface MetaLiveTelemetry {
  isLive: boolean;
  lastSync: string;
  adAccountId: string;
  campaign: MetaLiveCampaignInsights;
  platforms: MetaPlatformBreakdown[];
  activeAd: {
    id: string;
    name: string;
    status: string;
    priceAnchor: string;
    title: string;
    bodySnippet: string;
  };
  killSwitch: {
    enabled: boolean;
    maxCostPerMessage: number;
    maxSpendWithoutLead: number;
    currentCost: number;
    statusText: string;
  };
}

