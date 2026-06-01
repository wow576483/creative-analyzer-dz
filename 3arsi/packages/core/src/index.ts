export * from './types.js';
export * from './wilayas.js';
export * from './modules.js';
export * from './format.js';
export * from './engine/budget.js';
export * from './engine/timeline.js';
export * from './engine/equipment.js';
export * from './engine/events.js';
export * from './engine/dashboard.js';
export * from './engine/generate.js';

export const BRAND = {
  name: '3ARSI',
  taglineAr: 'نظام تنظيم العرس الجزائري',
  taglineEn: 'Wedding Operating System · Algérie',
  colors: {
    burgundy: '#8F2F38',
    hennaDark: '#6E1F26',
    gold: '#C9A14A',
    goldLight: '#E2C77C',
    cream: '#FFF8EC',
    creamDark: '#F5E6BE',
    ink: '#2A1B1F',
  },
} as const;
