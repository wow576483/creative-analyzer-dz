import type { WeddingPackage } from '@3arsi/core';
import type { Env } from '../env.js';
import { newId } from './ids.js';

// Persist a freshly generated wedding package into the bride's tenant tables.
export async function persistPackage(env: Env, brideId: string, pkg: WeddingPackage): Promise<void> {
  const stmts: D1PreparedStatement[] = [];

  pkg.budget.items.forEach((b, i) => {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO budget_items (id, bride_id, category, item, planned, actual, note, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(newId('bud'), brideId, b.category, b.item, b.planned, b.actual, b.note ?? null, i),
    );
  });

  pkg.timeline.forEach((t) => {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO timeline_entries (id, bride_id, ord, task, date, owner, status, priority, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(newId('tl'), brideId, t.order, t.task, t.date, t.owner, t.status, t.priority, t.note ?? null),
    );
  });

  pkg.tasks.forEach((t) => {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO tasks (id, bride_id, title, category, due_date, status, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(t.id, brideId, t.title, t.category, t.dueDate, t.status, t.priority),
    );
  });

  pkg.equipment.forEach((e) => {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO equipment_items (id, bride_id, list, room, item, quantity, est_price, status, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(newId('eq'), brideId, e.list, e.room ?? null, e.item, e.quantity, e.estPrice, e.status, e.note ?? null),
    );
  });

  pkg.events.forEach((e) => {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO events (id, bride_id, ord, name, date, time, place, guests, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(newId('ev'), brideId, e.order, e.name, e.date, e.time, e.place, e.guests, e.note ?? null),
    );
  });

  // Seed empty table plan based on guest count.
  const tables = Math.ceil(pkg.intake.guestCount / 10);
  for (let i = 1; i <= tables; i++) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO tables_plan (id, bride_id, number, grp, capacity, assigned)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(newId('tab'), brideId, i, `Table ${i}`, 10, 0),
    );
  }

  if (stmts.length > 0) await env.DB.batch(stmts);
}
