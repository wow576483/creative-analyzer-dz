// The 23 modules of the 3ARSI system, extracted 1:1 from the original
// `3ARSI_Wedding_System.xlsx` workbook (each Excel sheet → one module).
export interface ModuleDef {
  key: string;
  ar: string; // Arabic label (matches the Excel tab)
  fr: string;
  icon: string; // emoji used in the workbook
  group: 'overview' | 'planning' | 'budget' | 'people' | 'extras';
  // Whether the module is part of the auto-generated workspace nav.
  inWorkspace: boolean;
}

export const MODULES: ModuleDef[] = [
  { key: 'cover', ar: 'الغلاف', fr: 'Couverture', icon: '🏠', group: 'overview', inWorkspace: false },
  { key: 'dashboard', ar: 'لوحة التحكم', fr: 'Dashboard', icon: '📊', group: 'overview', inWorkspace: true },
  { key: 'timeline', ar: 'الجدول الزمني', fr: 'Timeline', icon: '📅', group: 'planning', inWorkspace: true },
  { key: 'budget', ar: 'الميزانية', fr: 'Budget', icon: '💰', group: 'budget', inWorkspace: true },
  { key: 'dress', ar: 'اللباس', fr: 'Tenues', icon: '👗', group: 'planning', inWorkspace: true },
  { key: 'gold', ar: 'الذهب', fr: 'Or', icon: '💎', group: 'budget', inWorkspace: true },
  { key: 'events', ar: 'الأحداث', fr: 'Événements', icon: '🎉', group: 'planning', inWorkspace: true },
  { key: 'venue', ar: 'القاعة', fr: 'Salle', icon: '🏛️', group: 'planning', inWorkspace: true },
  { key: 'food', ar: 'الطعام', fr: 'Traiteur', icon: '🍽️', group: 'planning', inWorkspace: true },
  { key: 'music', ar: 'الموسيقى', fr: 'Musique', icon: '🎵', group: 'planning', inWorkspace: true },
  { key: 'photography', ar: 'التصوير', fr: 'Photographie', icon: '📸', group: 'planning', inWorkspace: true },
  { key: 'beauty', ar: 'التجميل', fr: 'Beauté', icon: '💄', group: 'planning', inWorkspace: true },
  { key: 'guests', ar: 'المدعوّون', fr: 'Invités', icon: '👥', group: 'people', inWorkspace: true },
  { key: 'tables', ar: 'الطاولات', fr: 'Tables', icon: '🪑', group: 'people', inWorkspace: true },
  { key: 'invitations', ar: 'الدعوات', fr: 'Invitations', icon: '💌', group: 'people', inWorkspace: true },
  { key: 'gifts', ar: 'الهدايا', fr: 'Cadeaux', icon: '🎁', group: 'people', inWorkspace: true },
  { key: 'trousseau', ar: 'جهاز العروس', fr: 'Trousseau', icon: '🏠', group: 'extras', inWorkspace: true },
  { key: 'vendors', ar: 'المزوّدون', fr: 'Prestataires', icon: '📒', group: 'extras', inWorkspace: true },
  { key: 'payments', ar: 'الدفعات', fr: 'Paiements', icon: '💸', group: 'budget', inWorkspace: true },
  { key: 'honeymoon', ar: 'شهر العسل', fr: 'Lune de miel', icon: '🌍', group: 'extras', inWorkspace: true },
  { key: 'notes', ar: 'ملاحظات', fr: 'Notes', icon: '📝', group: 'extras', inWorkspace: true },
  { key: 'dayof', ar: 'يوم العرس', fr: 'Jour J', icon: '📋', group: 'planning', inWorkspace: true },
  { key: 'guide', ar: 'الدليل', fr: 'Guide', icon: 'ℹ️', group: 'extras', inWorkspace: true },
];

export const WORKSPACE_MODULES = MODULES.filter((m) => m.inWorkspace);

export function moduleByKey(key: string): ModuleDef | undefined {
  return MODULES.find((m) => m.key === key);
}
