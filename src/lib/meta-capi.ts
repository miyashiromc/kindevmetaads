import { getFbc, getFbp, generateEventId } from './meta-tracker';

export const META_DATASET_ID = '1368429478371391';
const DEFAULT_TOKEN = 'EAAPkgvHBCxEBSoXtA0OwkEVoNIaZCjVsz77WQxWTsbo9cTMRCuhDIO6cF5Fe40fPi4jxrRF0nfFFSLumbTfumZCPGq4hO1C6KwldQESlPPUdqyZA5Dc6SLZCRVL2QY9ZB9aybQ0xTlYWrimR7lxQqGXFig1Qrb5lBv1ZCZCZCA24e4eotiELUVuvwIzJuYMyXAZDZD';

export function getStoredMetaToken(): string {
  if (typeof window === 'undefined') return DEFAULT_TOKEN;
  return localStorage.getItem('kindev_meta_token') || DEFAULT_TOKEN;
}

export function formatPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let phone = rawPhone.replace(/\D/g, '');
  if (phone.startsWith('09') && phone.length === 10) {
    phone = '593' + phone.slice(1);
  } else if (phone.length === 9 && phone.startsWith('9')) {
    phone = '593' + phone;
  }
  return phone;
}

export async function hashSha256(value: string): Promise<string | null> {
  if (!value) return null;
  const clean = value.trim().toLowerCase();

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(clean);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }

  return sha256Pure(clean);
}

function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  let i: number, j: number;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (i = 0; i < asciiBitLength; i += 8) {
    words[i >> 5] |= (ascii.charCodeAt(i / 8) & 0xff) << (24 - (i % 32));
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);
    for (j = 0; j < 64; j++) {
      const w15 = w[j - 15], w2 = w[j - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[j] = j < 16 ? w[j] : (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      const s1h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1h + ch + k[j] + w[j]) | 0;
      const s0h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0h + maj) | 0;
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }
    for (j = 0; j < 8; j++) hash[j] = (hash[j] + oldHash[j]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 0xff;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function detectCountryCode(phone: string): string {
  if (!phone) return 'ec';
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('593')) return 'ec';
  if (clean.startsWith('1') && clean.length === 11) return 'us';
  if (clean.startsWith('57')) return 'co';
  if (clean.startsWith('51')) return 'pe';
  if (clean.startsWith('34')) return 'es';
  if (clean.startsWith('52')) return 'mx';
  return 'ec';
}

export interface DispatchParams {
  eventName: 'Purchase' | 'Lead' | 'Contact';
  phone: string;
  name?: string;
  email?: string;
  value?: number;
  currency?: string;
  leadId?: string;
  eventId?: string;
  actionSource?: 'website' | 'business_messaging' | 'system_generated' | 'chat';
  fbc?: string;
  fbp?: string;
  clientIp?: string;
  clientUserAgent?: string;
  countryCode?: string;
  testMode?: boolean;
  testEventCode?: string;
}

export interface MetaCredentialsOverride {
  datasetId?: string;
  accessToken?: string;
}

export interface DispatchResult {
  eventsReceived: number;
  fbtraceId: string;
  eventId: string;
}

export async function dispatchMetaCAPI(
  params: DispatchParams,
  credentials?: MetaCredentialsOverride
): Promise<DispatchResult> {
  const resolvedDatasetId = credentials?.datasetId?.trim() || META_DATASET_ID;
  const token = credentials?.accessToken?.trim() || getStoredMetaToken();
  const cleanPhone = formatPhoneNumber(params.phone);
  const hashedPhone = cleanPhone ? await hashSha256(cleanPhone) : null;
  const hashedEmail = params.email ? await hashSha256(params.email) : null;
  const hashedName = params.name ? await hashSha256(params.name.split(' ')[0]) : null;

  const country = params.countryCode?.toLowerCase().trim() || detectCountryCode(cleanPhone);
  const hashedCountry = country ? await hashSha256(country) : null;
  const hashedExternalId = params.leadId ? await hashSha256(params.leadId.trim()) : null;

  // Clave de Deduplicación oficial de Meta: compartido entre Píxel y CAPI
  const resolvedEventId = params.eventId || generateEventId(params.eventName);

  // Parámetros de atribución y coincidencia avanzada
  const resolvedFbc = params.fbc || getFbc();
  const resolvedFbp = params.fbp || getFbp();
  const resolvedUserAgent = params.clientUserAgent || (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'Kindev-CAPI-Engine/2026');

  // Fuente de la acción: business_messaging para WhatsApp directo, website para navegación web
  const resolvedActionSource = params.actionSource || (params.eventName === 'Purchase' ? 'system_generated' : 'website');

  interface EventData {
    event_name: string;
    event_time: number;
    action_source: string;
    event_id: string;
    user_data: {
      ph?: string[];
      em?: string[];
      fn?: string[];
      country?: string[];
      external_id?: string[];
      fbc?: string;
      fbp?: string;
      client_ip_address?: string;
      client_user_agent: string;
    };
    custom_data?: {
      currency: string;
      value: string;
      order_id: string;
    };
    test_event_code?: string;
  }

  const eventData: EventData = {
    event_name: params.eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: resolvedActionSource,
    event_id: resolvedEventId,
    user_data: {
      ...(hashedPhone ? { ph: [hashedPhone] } : {}),
      ...(hashedEmail ? { em: [hashedEmail] } : {}),
      ...(hashedName ? { fn: [hashedName] } : {}),
      ...(hashedCountry ? { country: [hashedCountry] } : {}),
      ...(hashedExternalId ? { external_id: [hashedExternalId] } : {}),
      ...(resolvedFbc ? { fbc: resolvedFbc } : {}),
      ...(resolvedFbp ? { fbp: resolvedFbp } : {}),
      ...(params.clientIp ? { client_ip_address: params.clientIp } : {}),
      client_user_agent: resolvedUserAgent
    }
  };

  if (params.eventName === 'Purchase' || (params.value && params.value > 0)) {
    eventData.custom_data = {
      currency: params.currency || 'USD',
      value: Number(params.value || 0).toFixed(2),
      order_id: resolvedEventId
    };
  }

  if (params.testMode && params.testEventCode?.trim()) {
    eventData.test_event_code = params.testEventCode.trim();
  }

  const url = `https://graph.facebook.com/v19.0/${resolvedDatasetId}/events?access_token=${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [eventData] })
  });

  interface MetaApiResponse {
    events_received: number;
    fbtrace_id: string;
    error?: {
      message: string;
    };
  }

  const resData: MetaApiResponse = await res.json();
  if (!res.ok) {
    throw new Error(resData?.error?.message || 'Error al conectar con Meta CAPI');
  }

  return {
    eventsReceived: resData.events_received,
    fbtraceId: resData.fbtrace_id,
    eventId: resolvedEventId
  };
}
