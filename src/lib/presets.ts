import { PricingPreset } from '../types';

export const KINDEV_PRESETS: PricingPreset[] = [
  {
    label: 'Landing Express',
    amount: 60,
    subtitle: '1 Página • Alta Conversión',
    badge: 'Express'
  },
  {
    label: 'Web Corp. Base',
    amount: 120,
    subtitle: 'Corporativa • Portafolio',
    badge: 'Popular'
  },
  {
    label: 'Web Corp. Pro',
    amount: 260,
    subtitle: 'Full Stack • CMS Integrado',
    badge: 'Pro'
  },
  {
    label: 'Plataforma SaaS',
    amount: 400,
    subtitle: 'Panel Usuarios • Base de Datos',
    badge: 'SaaS'
  },
  {
    label: 'E-commerce',
    amount: 600,
    subtitle: 'Tienda Online • Pagos',
    badge: 'Tienda'
  },
  {
    label: 'App Móvil',
    amount: 800,
    subtitle: 'iOS / Android Híbrida',
    badge: 'Mobile'
  }
];
