import { describe, expect, it } from 'vitest';
import {
  generateWeddingPackage,
  validateIntake,
  type WeddingIntake,
} from '../index.js';

const intake: WeddingIntake = {
  brideName: 'سارة',
  groomName: 'ياسين',
  weddingDate: '2026-09-15',
  city: '25', // Constantine
  guestCount: 300,
  budget: 3_050_000,
  weddingType: 'traditional',
};

describe('validateIntake', () => {
  it('accepts a valid intake', () => {
    expect(validateIntake(intake).ok).toBe(true);
  });

  it('rejects a missing bride name and tiny budget', () => {
    const res = validateIntake({ ...intake, brideName: '', budget: 1000 });
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('generateWeddingPackage', () => {
  const pkg = generateWeddingPackage(intake, new Date('2025-09-15T00:00:00Z'));

  it('resolves the wilaya label', () => {
    expect(pkg.wilayaLabel).toContain('قسنطينة');
  });

  it('produces a budget that sums (approx) to the total', () => {
    const sum = pkg.budget.items.reduce((s, i) => s + i.planned, 0);
    // Rounding to nearest 1,000 introduces a small delta.
    expect(Math.abs(sum - intake.budget)).toBeLessThan(40_000);
    expect(pkg.budget.byCategory.length).toBeGreaterThan(5);
  });

  it('generates a full timeline ending on the wedding day', () => {
    expect(pkg.timeline.length).toBeGreaterThan(20);
    expect(pkg.timeline.some((t) => t.task.includes('يوم العرس'))).toBe(true);
  });

  it('generates the five wedding events', () => {
    expect(pkg.events).toHaveLength(5);
    const weddingDay = pkg.events.find((e) => e.name.includes('يوم العرس'));
    expect(weddingDay?.guests).toBe(300);
  });

  it('scales budget down for a smaller wedding', () => {
    const small = generateWeddingPackage({ ...intake, budget: 1_000_000, guestCount: 100 });
    expect(small.budget.total).toBe(1_000_000);
    const food = small.budget.byCategory.find((c) => c.category.includes('الطعام'));
    const foodBig = pkg.budget.byCategory.find((c) => c.category.includes('الطعام'));
    // Fewer guests → food takes a smaller share of the budget.
    expect((food?.share ?? 0)).toBeLessThan(foodBig?.share ?? 100);
  });

  it('computes a days-until countdown', () => {
    expect(pkg.dashboard.daysUntilWedding).toBe(365);
    expect(pkg.dashboard.guests.tables).toBe(30);
  });

  it('generates equipment lists including the trousseau', () => {
    expect(pkg.equipment.some((e) => e.list === 'trousseau')).toBe(true);
    expect(pkg.equipment.some((e) => e.list === 'venue')).toBe(true);
  });
});
