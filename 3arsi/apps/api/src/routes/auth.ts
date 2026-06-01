import { Hono } from 'hono';
import type { Env, Vars } from '../env.js';
import { audit } from '../lib/audit.js';
import { newId } from '../lib/ids.js';
import { issueToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { requireAuth } from '../middleware/auth.js';

const auth = new Hono<{ Bindings: Env; Variables: Vars }>();

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'bride';
  name: string | null;
}

auth.post('/register', async (c) => {
  const body = await c.req
    .json<{ email?: string; password?: string; name?: string }>()
    .catch(() => ({}) as { email?: string; password?: string; name?: string });
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: 'invalid_email' }, 400);
  if (password.length < 6) return c.json({ error: 'weak_password' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'email_taken' }, 409);

  const id = newId('usr');
  const hash = await hashPassword(password);
  await c.env.DB.prepare('INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)')
    .bind(id, email, hash, 'bride', body.name ?? null)
    .run();

  const user = { sub: id, email, role: 'bride' as const };
  const token = await issueToken(c.env, user);
  await audit(c.env, { action: 'auth.register', userId: id, ip: c.req.header('CF-Connecting-IP') });
  return c.json({ token, user });
});

// Lazily provision the admin account from env on first matching login, so the
// dashboard is reachable without a manual seed step. No-op once it exists.
async function ensureAdmin(c: { env: Env }, email: string) {
  const adminEmail = (c.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!adminEmail || email !== adminEmail || !c.env.ADMIN_PASSWORD) return;
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(adminEmail).first();
  if (existing) return;
  const hash = await hashPassword(c.env.ADMIN_PASSWORD);
  await c.env.DB.prepare('INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)')
    .bind(newId('usr'), adminEmail, hash, 'admin', '3ARSI Admin')
    .run();
}

auth.post('/login', async (c) => {
  const body = await c.req
    .json<{ email?: string; password?: string }>()
    .catch(() => ({}) as { email?: string; password?: string });
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  await ensureAdmin(c, email);
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    await audit(c.env, { action: 'auth.login_failed', target: email, ip: c.req.header('CF-Connecting-IP') });
    return c.json({ error: 'invalid_credentials' }, 401);
  }

  const user = { sub: row.id, email: row.email, role: row.role };
  const token = await issueToken(c.env, user);
  await audit(c.env, { action: 'auth.login', userId: row.id, ip: c.req.header('CF-Connecting-IP') });
  return c.json({ token, user: { ...user, name: row.name } });
});

auth.get('/me', requireAuth, async (c) => {
  const u = c.get('user');
  const row = await c.env.DB.prepare('SELECT id, email, role, name FROM users WHERE id = ?')
    .bind(u.sub)
    .first<UserRow>();
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ user: { sub: row.id, email: row.email, role: row.role, name: row.name } });
});

export default auth;
