// Telemetría de Uso Ultra-Optimizada (Zero-Cost / Zero-Firestore I/O)
// Diseñado para 0 consumo de cuota de red y mínimo impacto en CPU/batería.
import { TabView } from '../types';

export interface SectionTimeData {
  timeSeconds: number;
  visitCount: number;
  lastVisited: string;
}

export interface TelemetryReport {
  totalSeconds: number;
  sections: Record<string, SectionTimeData>;
  topSection: { name: string; timeSeconds: number; percentage: number };
  sessionStartTime: string;
}

const STORAGE_KEY = 'kindev_user_telemetry_v1';

export const SECTION_LABELS: Record<string, string> = {
  kanban: '📌 Pipeline Kanban (Gestión de Leads)',
  analytics: '📊 Métricas & Analítica Comercial',
  ads_intelligence: '🎯 Meta Ads Intelligence',
  ltv_clients: '💎 Clientes & LTV Recurrente',
  follow_up: '💬 Seguimiento Comercial & WhatsApp',
  quick_list: '📇 Directorio Rápido de Leads',
  lead_profile: '👤 Perfil de Lead & CAPI Metadata'
};

class UserTelemetryService {
  private currentSection: string = 'kanban';
  private lastTick: number = Date.now();
  private timerId: any = null;
  private isWindowFocused: boolean = true;
  private memoryCache: Record<string, SectionTimeData> = {};
  private isDirty: boolean = false;
  private flushTimerId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Cargar una sola vez de localStorage a memoria RAM
      this.memoryCache = this.loadFromStorage();

      // 2. Control inteligente de pestaña activa (pausa inmediata si se oculta)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
          this.flush(); // Guardar al minimizar
        } else {
          this.resume();
        }
      });

      window.addEventListener('focus', () => this.resume());
      window.addEventListener('blur', () => {
        this.pause();
        this.flush();
      });

      // 3. Guardar en memoria local cuando el usuario cierra la pestaña
      window.addEventListener('beforeunload', () => this.flush());

      // 4. Iniciar reloj en memoria (cada 10 segundos) y flush a disco (cada 60 segundos)
      this.startHeartbeat();
    }
  }

  private loadFromStorage(): Record<string, SectionTimeData> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignorar fallos de parseo
    }
    return {};
  }

  /**
   * Escribe a disco solo si hay datos nuevos y espaciado en el tiempo.
   * Evita operaciones de I/O innecesarias en el navegador.
   */
  public flush() {
    if (!this.isDirty || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memoryCache));
      this.isDirty = false;
    } catch {
      // Falla silenciosa si localStorage está lleno
    }
  }

  private startHeartbeat() {
    if (this.timerId) clearInterval(this.timerId);
    if (this.flushTimerId) clearInterval(this.flushTimerId);
    this.lastTick = Date.now();

    // Pulso en RAM: incrementa contadores en memoria cada 10s (consumo CPU ~0.0001%)
    this.timerId = setInterval(() => {
      if (!this.isWindowFocused) return;
      const now = Date.now();
      const elapsed = Math.round((now - this.lastTick) / 1000);
      this.lastTick = now;

      if (elapsed > 0 && elapsed < 60) {
        this.addTimeInMemory(this.currentSection, elapsed);
      }
    }, 10000);

    // Flush a disco: Guarda en localStorage solo 1 vez cada 60 segundos
    this.flushTimerId = setInterval(() => {
      this.flush();
    }, 60000);
  }

  private addTimeInMemory(section: string, seconds: number) {
    if (!this.memoryCache[section]) {
      this.memoryCache[section] = {
        timeSeconds: 0,
        visitCount: 1,
        lastVisited: new Date().toISOString()
      };
    }
    this.memoryCache[section].timeSeconds += seconds;
    this.memoryCache[section].lastVisited = new Date().toISOString();
    this.isDirty = true;
  }

  public recordSectionChange(section: TabView | 'lead_profile') {
    const now = Date.now();
    const elapsed = Math.round((now - this.lastTick) / 1000);
    if (elapsed > 0 && elapsed < 60 && this.isWindowFocused) {
      this.addTimeInMemory(this.currentSection, elapsed);
    }
    this.lastTick = now;
    this.currentSection = section;

    if (!this.memoryCache[section]) {
      this.memoryCache[section] = {
        timeSeconds: 0,
        visitCount: 1,
        lastVisited: new Date().toISOString()
      };
    } else {
      this.memoryCache[section].visitCount += 1;
      this.memoryCache[section].lastVisited = new Date().toISOString();
    }
    this.isDirty = true;
  }

  public pause() {
    this.isWindowFocused = false;
    const now = Date.now();
    const elapsed = Math.round((now - this.lastTick) / 1000);
    if (elapsed > 0 && elapsed < 60) {
      this.addTimeInMemory(this.currentSection, elapsed);
    }
    this.lastTick = now;
  }

  public resume() {
    this.isWindowFocused = true;
    this.lastTick = Date.now();
  }

  public getReport(): TelemetryReport {
    let totalSeconds = 0;
    let topSectionName = 'kanban';
    let maxSeconds = 0;

    Object.entries(this.memoryCache).forEach(([key, val]) => {
      totalSeconds += val.timeSeconds;
      if (val.timeSeconds > maxSeconds) {
        maxSeconds = val.timeSeconds;
        topSectionName = key;
      }
    });

    const topPct = totalSeconds > 0 ? Math.round((maxSeconds / totalSeconds) * 100) : 0;

    return {
      totalSeconds,
      sections: this.memoryCache,
      topSection: {
        name: topSectionName,
        timeSeconds: maxSeconds,
        percentage: topPct
      },
      sessionStartTime: new Date().toISOString()
    };
  }

  public reset() {
    this.memoryCache = {};
    this.isDirty = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.lastTick = Date.now();
  }
}

export const userTelemetry = new UserTelemetryService();
