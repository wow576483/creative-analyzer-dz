import type { WeddingEvent, WeddingIntake } from '../types.js';

// The five events of an Algerian wedding (🎉 الأحداث) generated around the
// wedding date. Guest counts are derived as fractions of the total.
interface EventTemplate {
  offset: number;
  name: string;
  time: string;
  place: string;
  guestFraction: number;
  note?: string;
}

const TEMPLATE: EventTemplate[] = [
  { offset: -3, name: 'لمّة العائلة', time: '20:00', place: 'بيت العروس', guestFraction: 0.12, note: 'عشاء قبل العرس' },
  { offset: -2, name: 'ليلة الحنّاء', time: '20:00 - 02:00', place: 'بيت العروس', guestFraction: 0.27, note: 'نساء فقط' },
  { offset: -1, name: 'صباحية + النقروز', time: '11:00 - 17:00', place: 'بيت العروس', guestFraction: 0.4, note: 'الذهب يُهدى للعروس' },
  { offset: 0, name: 'يوم العرس', time: '18:00 - 03:00', place: 'القاعة', guestFraction: 1.0, note: 'اليوم الكبير 🌹' },
  { offset: 1, name: 'الخرجة + غدّاوة', time: '13:00 - 20:00', place: 'بيت العريس', guestFraction: 0.17, note: 'العائلة الموسّعة' },
];

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateEvents(intake: WeddingIntake): WeddingEvent[] {
  return TEMPLATE.map((t, i) => ({
    order: i + 1,
    name: t.name,
    date: addDays(intake.weddingDate, t.offset),
    time: t.time,
    place: t.place,
    guests: Math.max(1, Math.round(intake.guestCount * t.guestFraction)),
    note: t.note,
  }));
}
