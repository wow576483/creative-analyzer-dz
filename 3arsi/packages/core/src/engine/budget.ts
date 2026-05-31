import type { BudgetItem, BudgetPlan, WeddingIntake, WeddingType } from '../types.js';

// Baseline line items extracted from the original workbook (💰 الميزانية).
// `weight` is the baseline planned amount (DZD) and is used purely to derive
// proportional shares; the absolute numbers are then rescaled to the bride's
// real budget.
interface BaselineItem {
  category: string;
  item: string;
  weight: number;
  scalesWithGuests?: boolean; // food/drinks scale with guest count
}

const BASELINE: BaselineItem[] = [
  { category: '🏛️ القاعة والديكور', item: 'كراء القاعة', weight: 350000 },
  { category: '🏛️ القاعة والديكور', item: 'الكوشة والديكور', weight: 120000 },
  { category: '🏛️ القاعة والديكور', item: 'الزهور', weight: 30000 },
  { category: '🍽️ الطعام', item: 'الطبّاخ / Catering', weight: 500000, scalesWithGuests: true },
  { category: '🍽️ الطعام', item: 'الحلويات (نڨروز)', weight: 80000, scalesWithGuests: true },
  { category: '🍽️ الطعام', item: 'المشروبات + العصائر', weight: 40000, scalesWithGuests: true },
  { category: '🎵 الترفيه', item: 'DJ / Orchestra', weight: 80000 },
  { category: '🎵 الترفيه', item: 'Lights + Sound', weight: 30000 },
  { category: '📸 التصوير', item: 'المصوّر', weight: 90000 },
  { category: '📸 التصوير', item: 'الفيديو + Drone', weight: 60000 },
  { category: '📸 التصوير', item: 'Album + Print', weight: 25000 },
  { category: '👰 لباس العروس', item: 'الشدّة (كراء)', weight: 200000 },
  { category: '👰 لباس العروس', item: 'القفطان', weight: 60000 },
  { category: '👰 لباس العروس', item: 'الكراكو', weight: 40000 },
  { category: '👰 لباس العروس', item: 'الفستان الأبيض', weight: 120000 },
  { category: '👰 لباس العروس', item: 'الفستان الأخضر / الأحمر', weight: 60000 },
  { category: '👰 لباس العروس', item: 'الأحذية + الإكسسوارات', weight: 55000 },
  { category: '🤵 لباس العريس', item: 'البدلة + التفاصيل', weight: 80000 },
  { category: '💎 الذهب', item: 'الصداق', weight: 500000 },
  { category: '💎 الذهب', item: 'خاتم الخطوبة + الزواج', weight: 140000 },
  { category: '💄 التجميل', item: 'الكوافيرة + Makeup + الحنّاء', weight: 60000 },
  { category: '💄 التجميل', item: 'Skincare + Spa', weight: 20000 },
  { category: '📩 الدعوات', item: 'كروت الدعوة + Save-the-date', weight: 20000 },
  { category: '🏠 جهاز العروس', item: 'غرفة النوم', weight: 250000 },
  { category: '🏠 جهاز العروس', item: 'السلون', weight: 180000 },
  { category: '🏠 جهاز العروس', item: 'المطبخ + الأواني', weight: 150000 },
  { category: '🏠 جهاز العروس', item: 'Bathroom + Linen', weight: 50000 },
  { category: '🚗 النقل', item: 'سيارة الزفّة + نقل الضيوف', weight: 35000 },
  { category: '🎁 الهدايا', item: 'هدايا المدعوّين + النقروز', weight: 55000 },
];

// Per-wedding-type multipliers applied to categories before normalising.
const TYPE_MULTIPLIERS: Record<WeddingType, Record<string, number>> = {
  traditional: { '💎 الذهب': 1.2, '👰 لباس العروس': 1.15, '🎵 الترفيه': 0.85 },
  modern: { '🎵 الترفيه': 1.25, '📸 التصوير': 1.25, '💎 الذهب': 0.85 },
  mixed: {},
  luxury: { '🏛️ القاعة والديكور': 1.3, '💎 الذهب': 1.2, '👰 لباس العروس': 1.2, '📸 التصوير': 1.2 },
};

const BASELINE_GUESTS = 300;

function round(n: number): number {
  // Round to nearest 1,000 DZD for clean, realistic figures.
  return Math.round(n / 1000) * 1000;
}

export function generateBudget(intake: WeddingIntake): BudgetPlan {
  const guestFactor = Math.max(0.4, intake.guestCount / BASELINE_GUESTS);
  const typeMul = TYPE_MULTIPLIERS[intake.weddingType] ?? {};

  // Compute adjusted weights.
  const adjusted = BASELINE.map((b) => {
    let w = b.weight;
    if (b.scalesWithGuests) w *= guestFactor;
    w *= typeMul[b.category] ?? 1;
    return { ...b, adjusted: w };
  });

  const totalWeight = adjusted.reduce((s, a) => s + a.adjusted, 0);

  const items: BudgetItem[] = adjusted.map((a) => ({
    category: a.category,
    item: a.item,
    planned: round((a.adjusted / totalWeight) * intake.budget),
    actual: 0,
  }));

  // Aggregate by category.
  const catMap = new Map<string, number>();
  for (const it of items) {
    catMap.set(it.category, (catMap.get(it.category) ?? 0) + it.planned);
  }
  const byCategory = [...catMap.entries()]
    .map(([category, planned]) => ({
      category,
      planned,
      share: Math.round((planned / intake.budget) * 1000) / 10,
    }))
    .sort((a, b) => b.planned - a.planned);

  return { total: intake.budget, items, byCategory };
}
