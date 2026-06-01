import { generateWeddingPackage, validateIntake, type WeddingIntake } from '@3arsi/core';
import { Hono } from 'hono';
import type { Env, Vars } from '../env.js';
import { audit } from '../lib/audit.js';
import { newId } from '../lib/ids.js';
import { persistPackage } from '../lib/persist.js';
import { requireAuth } from '../middleware/auth.js';

const intake = new Hono<{ Bindings: Env; Variables: Vars }>();

// Preview generation (no persistence) — used by the public intake wizard.
intake.post('/preview', async (c) => {
  const body = await c.req.json<Partial<WeddingIntake>>().catch(() => ({}));
  const v = validateIntake(body);
  if (!v.ok) return c.json({ error: 'invalid_intake', details: v.errors }, 400);
  const pkg = generateWeddingPackage(body as WeddingIntake);
  return c.json({
    dashboard: pkg.dashboard,
    budget: pkg.budget,
    wilayaLabel: pkg.wilayaLabel,
    timelineCount: pkg.timeline.length,
    events: pkg.events,
  });
});

// Create a bride workspace (tenant) + persist the generated package.
intake.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Partial<WeddingIntake>>().catch(() => ({}));
  const v = validateIntake(body);
  if (!v.ok) return c.json({ error: 'invalid_intake', details: v.errors }, 400);

  const data = body as WeddingIntake;
  const brideId = newId('brd');

  await c.env.DB.prepare(
    `INSERT INTO brides (id, user_id, bride_name, groom_name, wedding_date, city, guest_count, budget, wedding_type, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
  )
    .bind(
      brideId,
      user.sub,
      data.brideName,
      data.groomName,
      data.weddingDate,
      data.city,
      data.guestCount,
      data.budget,
      data.weddingType,
    )
    .run();

  const pkg = generateWeddingPackage(data);
  await persistPackage(c.env, brideId, pkg);

  // Cache the generated dashboard for fast first paint.
  await c.env.CACHE.put(`dashboard:${brideId}`, JSON.stringify(pkg.dashboard), {
    expirationTtl: 86400,
  });

  await audit(c.env, { action: 'intake.create', userId: user.sub, brideId, ip: c.req.header('CF-Connecting-IP') });
  return c.json({ brideId, dashboard: pkg.dashboard });
});

export default intake;
