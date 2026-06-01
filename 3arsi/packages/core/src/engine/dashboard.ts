import type {
  BudgetPlan,
  DashboardData,
  Guest,
  TimelineEntry,
  WeddingIntake,
} from '../types.js';

export function daysUntil(weddingDate: string, from: Date = new Date()): number {
  const target = new Date(weddingDate + 'T00:00:00Z').getTime();
  const today = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

export function timelineProgress(timeline: TimelineEntry[]): number {
  if (timeline.length === 0) return 0;
  const done = timeline.filter((t) => t.status === 'done').length;
  return Math.round((done / timeline.length) * 100);
}

export function buildDashboard(args: {
  intake: WeddingIntake;
  budget: BudgetPlan;
  timeline: TimelineEntry[];
  guests?: Guest[];
  now?: Date;
}): DashboardData {
  const { intake, budget, timeline, guests = [], now } = args;

  const confirmed = guests.filter((g) => g.rsvp === 'confirmed').length;
  const pending = guests.filter((g) => g.rsvp === 'pending').length;
  const tables = Math.ceil(intake.guestCount / 10);

  const actual = budget.items.reduce((s, i) => s + i.actual, 0);
  const remaining = budget.total - actual;
  const spentPct = budget.total > 0 ? Math.round((actual / budget.total) * 100) : 0;

  const upcomingTasks = timeline
    .filter((t) => t.status !== 'done')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const spendByCategory = budget.byCategory.map((c) => ({
    category: c.category,
    amount: c.planned,
    share: c.share,
  }));

  return {
    daysUntilWedding: daysUntil(intake.weddingDate, now),
    progressPct: timelineProgress(timeline),
    guests: { total: intake.guestCount, confirmed, pending, tables },
    budget: { planned: budget.total, actual, remaining, spentPct },
    upcomingTasks,
    spendByCategory,
  };
}
