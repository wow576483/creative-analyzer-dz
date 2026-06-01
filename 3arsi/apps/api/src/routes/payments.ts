import { Hono } from 'hono';
import type { Env, Vars } from '../env.js';
import { audit } from '../lib/audit.js';
import { newId } from '../lib/ids.js';
import { requireAuth } from '../middleware/auth.js';
import { requireBrideAccess } from '../middleware/tenant.js';
import { timingSafeEqual } from '../lib/safe-compare.js';

const payments = new Hono<{ Bindings: Env; Variables: Vars }>();

// Create a Chargily Pay checkout for the "3ARSI Wedding Package".
payments.post('/:brideId/checkout', requireAuth, requireBrideAccess, async (c) => {
  const brideId = c.get('brideId');
  const user = c.get('user');
  const amount = Number(c.env.PACKAGE_PRICE_DZD || '4900');
  const orderId = newId('ord');

  await c.env.DB.prepare(
    `INSERT INTO orders (id, bride_id, amount, currency, status, provider) VALUES (?, ?, ?, 'dzd', 'pending', 'chargily')`,
  )
    .bind(orderId, brideId, amount)
    .run();

  const payload = {
    amount,
    currency: 'dzd',
    success_url: `${c.env.APP_URL}/workspace/${brideId}?paid=1`,
    failure_url: `${c.env.APP_URL}/workspace/${brideId}?paid=0`,
    payment_method: 'edahabia',
    metadata: [{ order_id: orderId, bride_id: brideId }],
  };

  let checkoutUrl: string | null = null;
  try {
    const res = await fetch(`${c.env.CHARGILY_BASE_URL}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.CHARGILY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { id?: string; checkout_url?: string };
    if (res.ok && data.checkout_url) {
      checkoutUrl = data.checkout_url;
      await c.env.DB.prepare('UPDATE orders SET provider_checkout_id = ?, provider_payload = ? WHERE id = ?')
        .bind(data.id ?? null, JSON.stringify(data), orderId)
        .run();
    }
  } catch {
    // fall through — checkoutUrl stays null
  }

  await audit(c.env, { action: 'payment.checkout', userId: user.sub, brideId, target: orderId });

  if (!checkoutUrl) {
    return c.json({ error: 'checkout_failed', orderId, message: 'تعذّر إنشاء صفحة الدفع — تحقّق من إعداد Chargily' }, 502);
  }
  return c.json({ orderId, checkoutUrl });
});

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Chargily webhook — verifies the `signature` header (HMAC-SHA256 of raw body).
payments.post('/webhook', async (c) => {
  const raw = await c.req.text();
  const signature = c.req.header('signature') || '';
  const expected = await hmacHex(c.env.CHARGILY_WEBHOOK_SECRET, raw);
  if (!signature || !timingSafeEqual(signature, expected)) {
    await audit(c.env, { action: 'payment.webhook_bad_sig' });
    return c.json({ error: 'invalid_signature' }, 403);
  }

  const event = JSON.parse(raw) as { type?: string; data?: any };
  const checkoutId: string | undefined = event.data?.id;
  const meta = event.data?.metadata?.[0];
  const orderId: string | undefined = meta?.order_id;
  const brideId: string | undefined = meta?.bride_id;

  if (event.type === 'checkout.paid' && (orderId || checkoutId)) {
    const where = orderId ? 'id = ?' : 'provider_checkout_id = ?';
    const arg = orderId ?? checkoutId!;
    await c.env.DB.prepare(`UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE ${where}`)
      .bind(arg)
      .run();
    if (brideId) {
      await c.env.DB.prepare("UPDATE brides SET paid = 1, status = 'active' WHERE id = ?").bind(brideId).run();
    }
    await audit(c.env, { action: 'payment.paid', brideId: brideId ?? null, target: orderId ?? checkoutId });
  } else if (event.type === 'checkout.failed' && orderId) {
    await c.env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").bind(orderId).run();
  }

  return c.json({ received: true });
});

export default payments;
