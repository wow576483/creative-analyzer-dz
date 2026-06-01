import { Hono } from 'hono';
import type { Env, Vars } from '../env.js';
import { newId } from '../lib/ids.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const admin = new Hono<{ Bindings: Env; Variables: Vars }>();
admin.use('*', requireAuth, requireAdmin);

// Overview stats: brides, orders, revenue.
admin.get('/stats', async (c) => {
  const brides = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM brides').first<{ n: number }>();
  const paidBrides = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM brides WHERE paid = 1').first<{ n: number }>();
  const orders = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM orders').first<{ n: number }>();
  const revenue = await c.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM orders WHERE status = 'paid'").first<{ total: number }>();
  return c.json({
    brides: brides?.n ?? 0,
    paidBrides: paidBrides?.n ?? 0,
    orders: orders?.n ?? 0,
    revenue: revenue?.total ?? 0,
  });
});

admin.get('/brides', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT b.id, b.bride_name, b.groom_name, b.wedding_date, b.city, b.guest_count, b.budget, b.wedding_type, b.status, b.paid, b.created_at, u.email
     FROM brides b JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC LIMIT 200`,
  ).all();
  return c.json({ brides: results });
});

admin.get('/orders', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT o.id, o.bride_id, o.amount, o.currency, o.status, o.created_at, o.paid_at, b.bride_name
     FROM orders o JOIN brides b ON b.id = o.bride_id ORDER BY o.created_at DESC LIMIT 200`,
  ).all();
  return c.json({ orders: results });
});

// Templates CRUD.
admin.get('/templates', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
  return c.json({ templates: results });
});

admin.post('/templates', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.name || !body.key) return c.json({ error: 'name_and_key_required' }, 400);
  const id = newId('tpl');
  await c.env.DB.prepare(
    'INSERT INTO templates (id, key, name, wedding_type, payload, active) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, body.key, body.name, body.wedding_type ?? null, JSON.stringify(body.payload ?? {}), body.active === false ? 0 : 1)
    .run();
  return c.json({ id });
});

admin.delete('/templates/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

admin.get('/audit', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200').all();
  return c.json({ logs: results });
});

export default admin;
