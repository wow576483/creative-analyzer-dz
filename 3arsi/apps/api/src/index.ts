import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Vars } from './env.js';
import admin from './routes/admin.js';
import auth from './routes/auth.js';
import brides from './routes/brides.js';
import intake from './routes/intake.js';
import payments from './routes/payments.js';
import pdf from './routes/pdf.js';
import workspace from './routes/workspace.js';

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

app.use('*', cors({ origin: (o) => o ?? '*', credentials: true }));

app.get('/api/health', (c) => c.json({ ok: true, service: '3arsi-api', ts: new Date().toISOString() }));

app.route('/api/auth', auth);
app.route('/api/intake', intake);
app.route('/api/brides', brides);
app.route('/api/workspace', workspace);
app.route('/api/admin', admin);
app.route('/api/payments', payments);
app.route('/api/pdf', pdf);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal_error' }, 500);
});

export default app;
