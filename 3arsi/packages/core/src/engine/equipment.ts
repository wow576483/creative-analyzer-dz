import type { EquipmentItem, WeddingIntake } from '../types.js';

// Equipment / planner lists derived from the workbook sheets
// (🏠 جهاز العروس, 🏛️ القاعة, 🎵 الموسيقى). Quantities for guest-dependent
// items scale with the guest count.
interface EqTemplate {
  list: string;
  room?: string;
  item: string;
  baseQty: number;
  perGuest?: boolean;
  estPrice: number;
}

const TEMPLATE: EqTemplate[] = [
  // Trousseau — bedroom
  { list: 'trousseau', room: 'غرفة النوم', item: 'Set كامل (سرير + خزانة)', baseQty: 1, estPrice: 180000 },
  { list: 'trousseau', room: 'غرفة النوم', item: 'Matelas', baseQty: 1, estPrice: 45000 },
  { list: 'trousseau', room: 'غرفة النوم', item: 'Linen Set (×3)', baseQty: 3, estPrice: 9000 },
  { list: 'trousseau', room: 'غرفة النوم', item: 'Mirror + Coiffeuse', baseQty: 1, estPrice: 35000 },
  // Trousseau — living room
  { list: 'trousseau', room: 'السلون', item: 'Sofa modulaire (L-shape)', baseQty: 1, estPrice: 120000 },
  { list: 'trousseau', room: 'السلون', item: 'طاولة وسط + كراسي', baseQty: 1, estPrice: 35000 },
  { list: 'trousseau', room: 'السلون', item: 'Curtains + Sheers', baseQty: 1, estPrice: 25000 },
  // Trousseau — kitchen
  { list: 'trousseau', room: 'المطبخ', item: 'Cookware Set', baseQty: 1, estPrice: 30000 },
  { list: 'trousseau', room: 'المطبخ', item: 'Cutlery Set (×24)', baseQty: 24, estPrice: 600 },
  { list: 'trousseau', room: 'المطبخ', item: 'Plates + Bowls (Service 12)', baseQty: 6, estPrice: 3000 },
  { list: 'trousseau', room: 'المطبخ', item: 'Glassware + Crystal', baseQty: 24, estPrice: 500 },
  { list: 'trousseau', room: 'المطبخ', item: 'Electroménager (Mixer, Air-fryer)', baseQty: 4, estPrice: 12000 },
  // Trousseau — bathroom + personal
  { list: 'trousseau', room: 'الحمّام', item: 'Towels Set', baseQty: 6, estPrice: 2500 },
  { list: 'trousseau', room: 'الحمّام', item: 'Bathrobes + Slippers', baseQty: 2, estPrice: 6000 },
  { list: 'trousseau', room: 'Personal', item: 'Trousseau Lingerie', baseQty: 1, estPrice: 40000 },
  // Venue
  { list: 'venue', item: 'الكوشة', baseQty: 1, estPrice: 95000 },
  { list: 'venue', item: 'ديكور المدخل (Arch + ضوء)', baseQty: 1, estPrice: 15000 },
  { list: 'venue', item: 'الزهور (Centerpiece / طاولة)', baseQty: 1, perGuest: false, estPrice: 1000 },
  { list: 'venue', item: 'Lighting / DJ Stage', baseQty: 1, estPrice: 25000 },
  // Music / sound
  { list: 'music', item: 'DJ / Orchestra', baseQty: 1, estPrice: 80000 },
  { list: 'music', item: 'Sound + Lighting', baseQty: 1, estPrice: 30000 },
  // Photography deliverables
  { list: 'photography', item: 'Wedding day coverage (9h)', baseQty: 1, estPrice: 70000 },
  { list: 'photography', item: 'Drone footage', baseQty: 1, estPrice: 25000 },
  { list: 'photography', item: 'Album printed (30p)', baseQty: 1, estPrice: 15000 },
];

export function generateEquipment(intake: WeddingIntake): EquipmentItem[] {
  const tables = Math.ceil(intake.guestCount / 10);
  return TEMPLATE.map((t) => {
    let qty = t.baseQty;
    // Centerpieces scale with the number of tables.
    if (t.list === 'venue' && t.item.includes('الزهور')) qty = tables;
    if (t.perGuest) qty = intake.guestCount;
    return {
      list: t.list,
      room: t.room,
      item: t.item,
      quantity: qty,
      estPrice: t.estPrice * qty,
      status: 'not_started' as const,
    };
  });
}
