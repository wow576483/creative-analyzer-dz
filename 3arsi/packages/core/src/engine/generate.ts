import type { WeddingIntake, WeddingPackage } from '../types.js';
import { wilayaLabel } from '../wilayas.js';
import { generateBudget } from './budget.js';
import { buildDashboard } from './dashboard.js';
import { generateEquipment } from './equipment.js';
import { generateEvents } from './events.js';
import { generateTasks, generateTimeline } from './timeline.js';

export interface IntakeValidation {
  ok: boolean;
  errors: string[];
}

export function validateIntake(intake: Partial<WeddingIntake>): IntakeValidation {
  const errors: string[] = [];
  if (!intake.brideName || intake.brideName.trim().length < 2) errors.push('اسم العروس مطلوب');
  if (!intake.groomName || intake.groomName.trim().length < 2) errors.push('اسم العريس مطلوب');
  if (!intake.weddingDate || !/^\d{4}-\d{2}-\d{2}$/.test(intake.weddingDate)) {
    errors.push('تاريخ العرس غير صالح');
  }
  if (!intake.city || intake.city.trim().length < 1) errors.push('الولاية مطلوبة');
  if (!intake.guestCount || intake.guestCount < 10 || intake.guestCount > 5000) {
    errors.push('عدد المدعوّين يجب أن يكون بين 10 و 5000');
  }
  if (!intake.budget || intake.budget < 100000) errors.push('الميزانية يجب أن تكون 100,000 دج على الأقل');
  if (!intake.weddingType) errors.push('نوع العرس مطلوب');
  return { ok: errors.length === 0, errors };
}

// The Wedding Generator Engine (STEP 3): turns a small intake into a full,
// personalised wedding package across every module.
export function generateWeddingPackage(intake: WeddingIntake, now: Date = new Date()): WeddingPackage {
  const budget = generateBudget(intake);
  const timeline = generateTimeline(intake);
  const tasks = generateTasks(intake);
  const equipment = generateEquipment(intake);
  const events = generateEvents(intake);
  const dashboard = buildDashboard({ intake, budget, timeline, now });

  return {
    intake,
    wilayaLabel: wilayaLabel(intake.city),
    budget,
    timeline,
    tasks,
    equipment,
    events,
    dashboard,
    generatedAt: now.toISOString(),
  };
}
