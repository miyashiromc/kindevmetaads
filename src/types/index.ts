export type LeadStatus = 'prospecto' | 'en_negociacion' | 'cerrado' | 'descartado';

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
