import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { formatPhoneNumber, dispatchMetaCAPI } from './meta-capi';
import { LeadStatus } from '../types';

export interface IngestLeadPayload {
  name?: string;
  phone: string;
  message?: string;
  service?: string;
  source?: 'whatsapp_auto' | 'manual';
  tenantId?: string;
}

export interface IngestResult {
  success: boolean;
  isDuplicate: boolean;
  leadId?: string;
  error?: string;
}

export async function ingestIncomingLead(
  payload: IngestLeadPayload,
  config?: { testMode: boolean; testEventCode: string; datasetId?: string; accessToken?: string }
): Promise<IngestResult> {
  const cleanPhone = formatPhoneNumber(payload.phone);
  if (!cleanPhone) {
    return { success: false, isDuplicate: false, error: 'Número de teléfono inválido' };
  }

  try {
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('phone', '==', cleanPhone));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return {
        success: true,
        isDuplicate: true,
        leadId: snapshot.docs[0].id
      };
    }

    const newLead = {
      name: payload.name?.trim() || 'Cliente WhatsApp',
      phone: cleanPhone,
      displayPhone: payload.phone.trim(),
      service: payload.service || 'Contacto Inicial WhatsApp',
      notes: payload.message ? `Mensaje: "${payload.message}"` : 'Auto-registrado desde WhatsApp',
      status: 'prospecto' as LeadStatus,
      amount: 0,
      createdAt: new Date().toISOString(),
      source: payload.source || 'whatsapp_auto',
      tenantId: payload.tenantId || 'kindev',
      metaEvents: []
    };

    const docRef = await addDoc(leadsRef, newLead);

    // Disparar evento Lead a Meta Conversions API en segundo plano con credenciales si existen
    dispatchMetaCAPI(
      {
        eventName: 'Lead',
        phone: cleanPhone,
        name: newLead.name,
        testMode: config?.testMode,
        testEventCode: config?.testEventCode
      },
      config?.datasetId
        ? { datasetId: config.datasetId, accessToken: config.accessToken }
        : undefined
    ).catch((err) => console.warn('CAPI Lead warning:', err));

    return {
      success: true,
      isDuplicate: false,
      leadId: docRef.id
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error en Firestore';
    return {
      success: false,
      isDuplicate: false,
      error: errorMsg
    };
  }
}
