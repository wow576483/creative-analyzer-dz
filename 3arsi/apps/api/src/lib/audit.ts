import type { Env } from '../env.js';
import { newId } from './ids.js';

// Append-only audit log (security requirement).
export async function audit(
  env: Env,
  args: {
    action: string;
    userId?: string | null;
    brideId?: string | null;
    target?: string | null;
    ip?: string | null;
    meta?: unknown;
  },
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_logs (id, bride_id, user_id, action, target, ip, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId('aud'),
        args.brideId ?? null,
        args.userId ?? null,
        args.action,
        args.target ?? null,
        args.ip ?? null,
        args.meta ? JSON.stringify(args.meta) : null,
      )
      .run();
  } catch {
    // Never let audit logging break the request path.
  }
}
