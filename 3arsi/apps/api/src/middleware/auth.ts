import type { Context, Next } from 'hono';
import type { Env, Vars } from '../env.js';
import { readToken } from '../lib/jwt.js';

type Ctx = Context<{ Bindings: Env; Variables: Vars }>;

function bearer(c: Ctx): string | null {
  const h = c.req.header('Authorization') || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

// Requires a valid JWT; attaches the user to the context.
export async function requireAuth(c: Ctx, next: Next) {
  const token = bearer(c);
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  const user = await readToken(c.env, token);
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  c.set('user', user);
  await next();
}

// Requires an admin role (must run after requireAuth).
export async function requireAdmin(c: Ctx, next: Next) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') return c.json({ error: 'forbidden' }, 403);
  await next();
}
