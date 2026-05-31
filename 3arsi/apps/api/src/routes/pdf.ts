import { generateWeddingPackage, type WeddingIntake } from '@3arsi/core';
import { Hono } from 'hono';
import type { Env, Vars } from '../env.js';
import { audit } from '../lib/audit.js';
import { newId } from '../lib/ids.js';
import { signDownload, verifyDownload } from '../lib/signed-url.js';
import { requireAuth } from '../middleware/auth.js';
import { requireBrideAccess } from '../middleware/tenant.js';
import { generateWeddingBook } from '../pdf/weddingBook.js';
import amiriFont from '../pdf/fonts/Amiri-Regular.ttf';

const pdf = new Hono<{ Bindings: Env; Variables: Vars }>();

interface BrideRow {
  id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  city: string;
  guest_count: number;
  budget: number;
  wedding_type: string;
  paid: number;
}

// Generate the "3ARSI Wedding Book" PDF, store it in R2 (watermarked), and
// return a short-lived signed download URL. Gated behind payment.
pdf.post('/:brideId/generate', requireAuth, requireBrideAccess, async (c) => {
  const brideId = c.get('brideId');
  const b = await c.env.DB.prepare('SELECT * FROM brides WHERE id = ?').bind(brideId).first<BrideRow>();
  if (!b) return c.json({ error: 'not_found' }, 404);
  if (!b.paid) {
    return c.json({ error: 'payment_required', message: 'الكتاب الفاخر متاح بعد إتمام الدفع' }, 402);
  }

  const intake: WeddingIntake = {
    brideName: b.bride_name,
    groomName: b.groom_name,
    weddingDate: b.wedding_date,
    city: b.city,
    guestCount: b.guest_count,
    budget: b.budget,
    weddingType: b.wedding_type as WeddingIntake['weddingType'],
  };
  const pkg = generateWeddingPackage(intake);
  const bytes = await generateWeddingBook(pkg, amiriFont as ArrayBuffer);

  const key = `brides/${brideId}/wedding-book-${Date.now()}.pdf`;
  await c.env.EXPORTS.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' } });

  const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  await c.env.DB.prepare(
    'INSERT INTO exports (id, bride_id, kind, r2_key, watermark, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(newId('exp'), brideId, 'pdf', key, `3ARSI · ${b.bride_name}`, new Date(exp * 1000).toISOString())
    .run();

  const token = await signDownload(c.env.SIGNED_URL_SECRET, { brideId, key, exp });
  await audit(c.env, { action: 'pdf.generate', userId: c.get('user').sub, brideId, target: key });

  return c.json({ url: `/api/pdf/download?token=${encodeURIComponent(token)}`, expiresAt: new Date(exp * 1000).toISOString() });
});

// Secure download via signed, expiring token (no auth header needed — the
// token itself authorises this single object).
pdf.get('/download', async (c) => {
  const token = c.req.query('token') || '';
  const payload = await verifyDownload(c.env.SIGNED_URL_SECRET, token);
  if (!payload) return c.json({ error: 'invalid_or_expired' }, 403);

  const obj = await c.env.EXPORTS.get(payload.key);
  if (!obj) return c.json({ error: 'not_found' }, 404);

  await audit(c.env, { action: 'pdf.download', brideId: payload.brideId, target: payload.key });
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="3ARSI-Wedding-Book.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
});

export default pdf;
