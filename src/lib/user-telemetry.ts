// Telemetría de Uso y Medición de Tiempo por Sección (KinDev Telemetry Engine)
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

// Nombres legibles de las secciones
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

  constructor() {
    if (typeof window !== 'undefined') {
      // Manejar cambios de visibilidad de pestaña (no contar tiempo si el usuario minimiza)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else {
          this.resume();
        }
      });

      window.addEventListener('focus', () => this.resume());
      window.addEventListener('blur', () => this.pause());

      this.startHeartbeat();
    }
  }

  private loadData(): Record<string, SectionTimeData> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading telemetry:', e);
    }
    return {};
  }

  private saveData(data: Record<string, SectionTimeData>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving telemetry:', e);
    }
  }

  private startHeartbeat() {
    if (this.timerId) clearInterval(this.timerId);
    this.lastTick = Date.now();

    this.timerId = setInterval(() => {
      if (!this.isWindowFocused) return;
      const now = Date.now();
      const elapsed = Math.round((now - this.lastTick) / 1000);
      this.lastTick = now;

      if (elapsed > 0 && elapsed < 60) {
        this.addTime(this.currentSection, elapsed);
      }
    }, 5000); // Guardar cada 5 segundos
  }

  private addTime(section: string, seconds: number) {
    const data = this.loadData();
    if (!data[section]) {
      data[section] = {
        timeSeconds: 0,
        visitCount: 1,
        lastVisited: new Date().toISOString()
      };
    }
    data[section].timeSeconds += seconds;
    data[section].lastVisited = new Date().toISOString();
    this.saveData(data);
  }

  public recordSectionChange(section: TabView | 'lead_profile') {
    // Registrar tiempo previo
    const now = Date.now();
    const elapsed = Math.round((now - this.lastTick) / 1000);
    if (elapsed > 0 && elapsed < 60 && this.isWindowFocused) {
      this.addTime(this.currentSection, elapsed);
    }
    this.lastTick = now;
    this.currentSection = section;

    // Incrementar conteo de visitas
    const data = this.loadData();
    if (!data[section]) {
      data[section] = {
        timeSeconds: 0,
        visitCount: 1,
        lastVisited: new Date().toISOString()
      };
    } else {
      data[section].visitCount += 1;
      data[section].lastVisited = new Date().toISOString();
    }
    this.saveData(data);
  }

  public pause() {
    this.isWindowFocused = false;
    const now = Date.now();
    const elapsed = Math.round((now - this.lastTick) / 1000);
    if (elapsed > 0 && elapsed < 60) {
      this.addTime(this.currentSection, elapsed);
    }
    this.lastTick = now;
  }

  public resume() {
    this.isWindowFocused = true;
    this.lastTick = Date.now();
  }

  public getReport(): TelemetryReport {
    const data = this.loadData();
    let totalSeconds = 0;
    let topSectionName = 'kanban';
    let maxSeconds = 0;

    Object.entries(data).forEach(([key, val]) => {
      totalSeconds += val.timeSeconds;
      if (val.timeSeconds > maxSeconds) {
        maxSeconds = val.timeSeconds;
        topSectionName = key;
      }
    });

    const topPct = totalSeconds > 0 ? Math.round((maxSeconds / totalSeconds) * 100) : 0;

    return {
      totalSeconds,
      sections: data,
      topSection: {
        name: topSectionName,
        timeSeconds: maxSeconds,
        percentage: topPct
      },
      sessionStartTime: new Date().toISOString()
    };
  }

  public reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.lastTick = Date.now();
  }
}

export const userTelemetry = new UserTelemetryService();
