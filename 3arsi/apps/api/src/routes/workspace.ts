import { buildDashboard, type BudgetItem, type Guest, type TimelineEntry, type WeddingIntake } from '@3arsi/core';
import { Hono } from 'hono';
import type { Env, Vars } from '../env.js';
import { audit } from '../lib/audit.js';
import { newId } from '../lib/ids.js';
import { requireAuth } from '../middleware/auth.js';
import { requireBrideAccess } from '../middleware/tenant.js';

const ws = new Hono<{ Bindings: Env; Variables: Vars }>();

// Every workspace route is authenticated + tenant-isolated.
ws.use('/:brideId/*', requireAuth, requireBrideAccess);
ws.use('/:brideId', requireAuth, requireBrideAccess);

interface BrideRow {
  id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  city: string;
  guest_count: number;
  budget: number;
  wedding_type: string;
  status: string;
  paid: number;
}

async function loadBride(c: { env: Env }, brideId: string): Promise<BrideRow | null> {
  return c.env.DB.prepare('SELECT * FROM brides WHERE id = ?').bind(brideId).first<BrideRow>();
}

function intakeOf(b: BrideRow): WeddingIntake {
  return {
    brideName: b.bride_name,
    groomName: b.groom_name,
    weddingDate: b.wedding_date,
    city: b.city,
    guestCount: b.guest_count,
    budget: b.budget,
    weddingType: b.wedding_type as WeddingIntake['weddingType'],
  };
}

// ---- Overview / dashboard (recomputed from live data) --------------------
ws.get('/:brideId', async (c) => {
  const brideId = c.get('brideId');
  const b = await loadBride(c, brideId);
  if (!b) return c.json({ error: 'not_found' }, 404);

  const budgetRows = await c.env.DB.prepare('SELECT category, item, planned, actual, note FROM budget_items WHERE bride_id = ? ORDER BY sort')
    .bind(brideId)
    .all<BudgetItem & { note: string | null }>();
  const tlRows = await c.env.DB.prepare('SELECT ord, task, date, owner, status, priority, note FROM timeline_entries WHERE bride_id = ? ORDER BY date')
    .bind(brideId)
    .all();
  const guestRows = await c.env.DB.prepare('SELECT rsvp FROM guests WHERE bride_id = ?').bind(brideId).all<{ rsvp: string }>();

  const budgetItems: BudgetItem[] = budgetRows.results.map((r) => ({
    category: r.category,
    item: r.item,
    planned: r.planned,
    actual: r.actual,
    note: r.note ?? undefined,
  }));
  const catMap = new Map<string, number>();
  for (const it of budgetItems) catMap.set(it.category, (catMap.get(it.category) ?? 0) + it.planned);
  const byCategory = [...catMap.entries()]
    .map(([category, planned]) => ({ category, planned, share: Math.round((planned / b.budget) * 1000) / 10 }))
    .sort((a, z) => z.planned - a.planned);

  const timeline: TimelineEntry[] = tlRows.results.map((r: any) => ({
    order: r.ord,
    task: r.task,
    date: r.date,
    owner: r.owner,
    status: r.status,
    priority: r.priority,
    note: r.note ?? undefined,
  }));
  const guests: Guest[] = guestRows.results.map((r) => ({
    id: '',
    fullName: '',
    gender: 'female',
    relation: '',
    group: '',
    rsvp: r.rsvp as Guest['rsvp'],
    plusOne: 0,
  }));

  const dashboard = buildDashboard({
    intake: intakeOf(b),
    budget: { total: b.budget, items: budgetItems, byCategory },
    timeline,
    guests,
  });

  return c.json({
    bride: {
      id: b.id,
      brideName: b.bride_name,
      groomName: b.groom_name,
      weddingDate: b.wedding_date,
      city: b.city,
      guestCount: b.guest_count,
      budget: b.budget,
      weddingType: b.wedding_type,
      status: b.status,
      paid: !!b.paid,
    },
    dashboard,
  });
});

// ---- Budget --------------------------------------------------------------
ws.get('/:brideId/budget', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM budget_items WHERE bride_id = ? ORDER BY sort')
    .bind(c.get('brideId'))
    .all();
  return c.json({ items: results });
});

ws.patch('/:brideId/budget/:itemId', async (c) => {
  const brideId = c.get('brideId');
  const itemId = c.req.param('itemId');
  const body = await c.req
    .json<{ planned?: number; actual?: number; note?: string }>()
    .catch(() => ({}) as { planned?: number; actual?: number; note?: string });
  await c.env.DB.prepare(
    `UPDATE budget_items SET
       planned = COALESCE(?, planned),
       actual  = COALESCE(?, actual),
       note    = COALESCE(?, note)
     WHERE id = ? AND bride_id = ?`,
  )
    .bind(body.planned ?? null, body.actual ?? null, body.note ?? null, itemId, brideId)
    .run();
  return c.json({ ok: true });
});

// ---- Timeline ------------------------------------------------------------
ws.get('/:brideId/timeline', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM timeline_entries WHERE bride_id = ? ORDER BY date')
    .bind(c.get('brideId'))
    .all();
  return c.json({ entries: results });
});

ws.patch('/:brideId/timeline/:id', async (c) => {
  const brideId = c.get('brideId');
  const id = c.req.param('id');
  const body = await c.req
    .json<{ status?: string; note?: string }>()
    .catch(() => ({}) as { status?: string; note?: string });
  await c.env.DB.prepare(
    `UPDATE timeline_entries SET status = COALESCE(?, status), note = COALESCE(?, note) WHERE id = ? AND bride_id = ?`,
  )
    .bind(body.status ?? null, body.note ?? null, id, brideId)
    .run();
  return c.json({ ok: true });
});

// ---- Tasks ---------------------------------------------------------------
ws.get('/:brideId/tasks', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM tasks WHERE bride_id = ? ORDER BY due_date')
    .bind(c.get('brideId'))
    .all();
  return c.json({ tasks: results });
});

ws.patch('/:brideId/tasks/:id', async (c) => {
  const brideId = c.get('brideId');
  const id = c.req.param('id');
  const body = await c.req.json<{ status?: string }>().catch(() => ({}) as { status?: string });
  await c.env.DB.prepare('UPDATE tasks SET status = COALESCE(?, status) WHERE id = ? AND bride_id = ?')
    .bind(body.status ?? null, id, brideId)
    .run();
  return c.json({ ok: true });
});

// ---- Guests --------------------------------------------------------------
ws.get('/:brideId/guests', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM guests WHERE bride_id = ? ORDER BY full_name')
    .bind(c.get('brideId'))
    .all();
  return c.json({ guests: results });
});

ws.post('/:brideId/guests', async (c) => {
  const brideId = c.get('brideId');
  const body = await c.req.json<any>().catch(() => ({}) as any);
  if (!body.full_name) return c.json({ error: 'full_name_required' }, 400);
  const id = newId('gst');
  await c.env.DB.prepare(
    `INSERT INTO guests (id, bride_id, full_name, gender, relation, grp, rsvp, plus_one, table_no, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      brideId,
      body.full_name,
      body.gender ?? null,
      body.relation ?? null,
      body.grp ?? null,
      body.rsvp ?? 'pending',
      body.plus_one ?? 0,
      body.table_no ?? null,
      body.phone ?? null,
    )
    .run();
  return c.json({ id });
});

ws.patch('/:brideId/guests/:id', async (c) => {
  const brideId = c.get('brideId');
  const id = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}) as any);
  await c.env.DB.prepare(
    `UPDATE guests SET rsvp = COALESCE(?, rsvp), table_no = COALESCE(?, table_no), plus_one = COALESCE(?, plus_one)
     WHERE id = ? AND bride_id = ?`,
  )
    .bind(body.rsvp ?? null, body.table_no ?? null, body.plus_one ?? null, id, brideId)
    .run();
  return c.json({ ok: true });
});

ws.delete('/:brideId/guests/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM guests WHERE id = ? AND bride_id = ?')
    .bind(c.req.param('id'), c.get('brideId'))
    .run();
  return c.json({ ok: true });
});

// ---- Read-only module collections ---------------------------------------
for (const [path, table, order] of [
  ['equipment', 'equipment_items', 'list'],
  ['events', 'events', 'date'],
  ['tables', 'tables_plan', 'number'],
  ['vendors', 'vendors', 'name'],
  ['payments', 'payments', 'due_date'],
  ['gold', 'gold_items', 'piece'],
] as const) {
  ws.get(`/:brideId/${path}`, async (c) => {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE bride_id = ? ORDER BY ${order}`)
      .bind(c.get('brideId'))
      .all();
    return c.json({ items: results });
  });
}

export default ws;
