import type { ChecklistTask, Priority, TimelineEntry, WeddingIntake } from '../types.js';

// Template extracted from the workbook (📅 Timeline). `offset` is the number of
// days BEFORE the wedding (negative) or after (positive) the task is due.
interface TaskTemplate {
  offset: number;
  task: string;
  owner: string;
  priority: Priority;
  category: string;
}

const TEMPLATE: TaskTemplate[] = [
  { offset: -365, task: 'الفاتحة الرسمية / الخطبة', owner: 'العائلتان', priority: 'high', category: 'تحضير' },
  { offset: -349, task: 'اختيار شهر العرس + اليوم', owner: 'العروسان', priority: 'high', category: 'تحضير' },
  { offset: -335, task: 'تحديد الميزانية الإجمالية', owner: 'العائلتان', priority: 'high', category: 'ميزانية' },
  { offset: -304, task: 'زيارة 3 قاعات على الأقل', owner: 'العروس + الأم', priority: 'high', category: 'قاعة' },
  { offset: -274, task: 'حجز القاعة + الدفعة الأولى', owner: 'العريس', priority: 'high', category: 'قاعة' },
  { offset: -243, task: 'اختيار الطبّاخ + الذوق', owner: 'العائلتان', priority: 'high', category: 'طعام' },
  { offset: -226, task: 'اختيار DJ / Orchestra', owner: 'العريس', priority: 'medium', category: 'موسيقى' },
  { offset: -198, task: 'اختيار الشدّة (كراء)', owner: 'العروس + الأم', priority: 'high', category: 'لباس' },
  { offset: -184, task: 'اختيار التصديرة + الكراكو', owner: 'العروس', priority: 'high', category: 'لباس' },
  { offset: -174, task: 'اختيار القفطان + الفستان', owner: 'العروس', priority: 'high', category: 'لباس' },
  { offset: -153, task: 'شراء الذهب (الصداق)', owner: 'العريس + الأم', priority: 'high', category: 'ذهب' },
  { offset: -123, task: 'حجز المصوّر + الفيديو', owner: 'العريس', priority: 'high', category: 'تصوير' },
  { offset: -113, task: 'حجز الكوافيرة + Makeup', owner: 'العروس', priority: 'high', category: 'تجميل' },
  { offset: -106, task: 'تصميم كروت الدعوة', owner: 'العروس', priority: 'medium', category: 'دعوات' },
  { offset: -92, task: 'بدء قائمة المدعوّين النهائية', owner: 'العائلتان', priority: 'high', category: 'مدعوّون' },
  { offset: -76, task: 'Trial #1 — Makeup', owner: 'العروس', priority: 'medium', category: 'تجميل' },
  { offset: -67, task: 'Trial #2 — الحنّاء + الشعر', owner: 'العروس', priority: 'medium', category: 'تجميل' },
  { offset: -57, task: 'شراء أحذية كل الإطلالات', owner: 'العروس', priority: 'medium', category: 'لباس' },
  { offset: -52, task: 'توزيع كروت الدعوة', owner: 'العائلتان', priority: 'high', category: 'دعوات' },
  { offset: -45, task: 'تأكيد الطباخ (عدد، منيو)', owner: 'العائلتان', priority: 'high', category: 'طعام' },
  { offset: -36, task: 'حجز سيارة الزفّة', owner: 'العريس', priority: 'medium', category: 'نقل' },
  { offset: -31, task: 'شراء النڨروز + الحلويات', owner: 'العائلة', priority: 'medium', category: 'طعام' },
  { offset: -26, task: 'بدء شراء جهاز العروس', owner: 'العروس + الأم', priority: 'high', category: 'جهاز' },
  { offset: -21, task: 'تأكيد المصوّر + Schedule', owner: 'العروس', priority: 'high', category: 'تصوير' },
  { offset: -16, task: 'بحث/حجز شهر العسل', owner: 'العروسان', priority: 'low', category: 'شهر العسل' },
  { offset: -14, task: 'Trial نهائي — Makeup + شعر', owner: 'العروس', priority: 'high', category: 'تجميل' },
  { offset: -12, task: 'Confirmations كل الـvendors', owner: 'العروسان', priority: 'high', category: 'تحضير' },
  { offset: -7, task: 'تنظيم الطاولات النهائي', owner: 'العروس + الأم', priority: 'high', category: 'طاولات' },
  { offset: -5, task: 'شراء آخر التفاصيل', owner: 'العروس', priority: 'medium', category: 'تحضير' },
  { offset: -3, task: 'الاستراحة قبل العرس', owner: 'العروس', priority: 'high', category: 'تحضير' },
  { offset: -3, task: 'يوم اللمّة (عشاء العائلة)', owner: 'العائلة', priority: 'high', category: 'أحداث' },
  { offset: -2, task: 'ليلة الحنّاء', owner: 'العروس + الفنّانة', priority: 'high', category: 'أحداث' },
  { offset: -1, task: 'صباحية + النقروز', owner: 'العائلة الموسّعة', priority: 'high', category: 'أحداث' },
  { offset: 0, task: 'يوم العرس 🌹', owner: 'الجميع', priority: 'high', category: 'أحداث' },
  { offset: 1, task: 'الخرجة + غدّاوة', owner: 'العروسان', priority: 'medium', category: 'أحداث' },
  { offset: 5, task: 'شهر العسل ✈️', owner: 'العروسان', priority: 'low', category: 'شهر العسل' },
  { offset: 30, task: 'شكر المدعوّين + الهدايا', owner: 'العروسان', priority: 'low', category: 'هدايا' },
];

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateTimeline(intake: WeddingIntake): TimelineEntry[] {
  return TEMPLATE.map((t, i) => ({
    order: i + 1,
    task: t.task,
    date: addDays(intake.weddingDate, t.offset),
    owner: t.owner,
    status: 'not_started' as const,
    priority: t.priority,
    note: undefined,
  })).sort((a, b) => a.date.localeCompare(b.date))
    .map((e, i) => ({ ...e, order: i + 1 }));
}

// Smart checklist = the timeline expressed as actionable tasks.
export function generateTasks(intake: WeddingIntake): ChecklistTask[] {
  return TEMPLATE.map((t, i) => ({
    id: `task-${i + 1}`,
    title: t.task,
    category: t.category,
    dueDate: addDays(intake.weddingDate, t.offset),
    status: 'not_started' as const,
    priority: t.priority,
  })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
