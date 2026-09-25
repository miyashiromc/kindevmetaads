/**
 * Kindev Meta Ads Tracker & Deduplication Engine (2026)
 * Cumple con el estándar oficial de Meta Conversions API (CAPI) & Píxel
 * Maneja captura de fbc (Click ID), fbp (Browser ID) y generación de event_id único para deduplicación.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const STORAGE_FBCLID_KEY = 'kindev_meta_fbclid';
const STORAGE_FBC_KEY = 'kindev_meta_fbc';

/**
 * Captura y persiste el fbclid proveniente de campañas de Meta Ads (?fbclid=...)
 */
export function captureAndStoreFbclid(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid');

    if (fbclid) {
      sessionStorage.setItem(STORAGE_FBCLID_KEY, fbclid);
      localStorage.setItem(STORAGE_FBCLID_KEY, fbclid);

      // Formato oficial de Meta para fbc: fb.<subdomainIndex>.<creationTime>.<fbclid>
      const creationTime = Date.now();
      const fbc = `fb.1.${creationTime}.${fbclid}`;
      sessionStorage.setItem(STORAGE_FBC_KEY, fbc);
      
      // Guardar cookie _fbc para redundancia
      const maxAge = 90 * 24 * 60 * 60; // 90 días
      document.cookie = `_fbc=${encodeURIComponent(fbc)};path=/;max-age=${maxAge};SameSite=Lax`;
      return fbc;
    }
  } catch (e) {
    console.warn('Error capturando fbclid:', e);
  }

  return null;
}

/**
 * Obtiene el valor de fbc (Facebook Click ID) formateado para Meta CAPI
 */
export function getFbc(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Intentar leer de cookie _fbc creada por el píxel o por nosotros
  try {
    const match = document.cookie.match(/(^|;)\s*_fbc=([^;]+)/);
    if (match && match[2]) {
      return decodeURIComponent(match[2]);
    }
  } catch {}

  // 2. Intentar leer de storage
  try {
    const storedFbc = sessionStorage.getItem(STORAGE_FBC_KEY) || localStorage.getItem(STORAGE_FBC_KEY);
    if (storedFbc) return storedFbc;

    const storedFbclid = sessionStorage.getItem(STORAGE_FBCLID_KEY) || localStorage.getItem(STORAGE_FBCLID_KEY);
    if (storedFbclid) {
      const fbc = `fb.1.${Date.now()}.${storedFbclid}`;
      sessionStorage.setItem(STORAGE_FBC_KEY, fbc);
      return fbc;
    }
  } catch {}

  return null;
}

/**
 * Obtiene el valor de fbp (Facebook Browser ID) desde la cookie _fbp del Píxel
 */
export function getFbp(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // Cookie nativa del píxel de Meta: _fbp=fb.1.1695500000.123456789
    const match = document.cookie.match(/(^|;)\s*_fbp=([^;]+)/);
    if (match && match[2]) {
      return decodeURIComponent(match[2]);
    }

    // Fallback estándar si el píxel aún no ha inicializado la cookie
    const stored = localStorage.getItem('kindev_meta_fbp');
    if (stored) return stored;

    const newFbp = `fb.1.${Date.now()}.${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    localStorage.setItem('kindev_meta_fbp', newFbp);
    document.cookie = `_fbp=${newFbp};path=/;max-age=${90 * 24 * 60 * 60};SameSite=Lax`;
    return newFbp;
  } catch {}

  return null;
}

/**
 * Genera un event_id único para deduplicación entre Píxel y CAPI
 * Ejemplo: kd_lead_1727142000000_a8f9
 */
export function generateEventId(prefix: string = 'evt'): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `kd_${prefix.toLowerCase()}_${timestamp}_${randomStr}`;
}

/**
 * Dispara un evento en el Píxel de Meta del navegador con su respectivo eventID para deduplicación
 */
export function trackPixelEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  eventId?: string
): void {
  if (typeof window === 'undefined') return;

  if (typeof window.fbq === 'function') {
    if (eventId) {
      window.fbq('track', eventName, params, { eventID: eventId });
    } else {
      window.fbq('track', eventName, params);
    }
  } else {
    // Si fbq no está listo en el window, encolar en queue manual
    window.fbq = window.fbq || function (...args: unknown[]) {
      ((window as unknown as { _fbqQueue: unknown[] })._fbqQueue = (window as unknown as { _fbqQueue: unknown[] })._fbqQueue || []).push(args);
    };
  }
}
