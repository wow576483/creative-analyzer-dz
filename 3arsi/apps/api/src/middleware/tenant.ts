import type { Context, Next } from 'hono';
import type { Env, Vars } from '../env.js';

type Ctx = Context<{ Bindings: Env; Variables: Vars }>;

// Multi-tenant isolation: verifies that the authenticated user owns the
// :brideId workspace (or is an admin). Every workspace route runs this so a
// bride can never read/write another bride's tenant data.
export async function requireBrideAccess(c: Ctx, next: Next) {
  const user = c.get('user');
  const brideId = c.req.param('brideId');
  if (!brideId) return c.json({ error: 'bride_id_required' }, 400);

  const row = await c.env.DB.prepare('SELECT user_id FROM brides WHERE id = ?')
    .bind(brideId)
    .first<{ user_id: string }>();

  if (!row) return c.json({ error: 'not_found' }, 404);
  if (user.role !== 'admin' && row.user_id !== user.sub) {
    return c.json({ error: 'forbidden' }, 403);
  }

  c.set('brideId', brideId);
  await next();
}
