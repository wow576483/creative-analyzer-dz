import { Hono } from 'hono';
import type { Env, Vars } from '../env.js';
import { requireAuth } from '../middleware/auth.js';

const brides = new Hono<{ Bindings: Env; Variables: Vars }>();

// List the workspaces (brides) owned by the authenticated user.
brides.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare(
    `SELECT id, bride_name, groom_name, wedding_date, city, guest_count, budget, wedding_type, status, paid, created_at
     FROM brides WHERE user_id = ? ORDER BY created_at DESC`,
  )
    .bind(user.sub)
    .all();
  return c.json({ brides: results });
});

export default brides;
