import { sign, verify } from 'hono/jwt';
import type { AuthUser, Env } from '../env.js';

export async function issueToken(env: Env, user: AuthUser): Promise<string> {
  const ttl = Number(env.JWT_TTL_SECONDS || '604800');
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: user.sub,
      email: user.email,
      role: user.role,
      iss: env.JWT_ISSUER,
      iat: now,
      exp: now + ttl,
    },
    env.JWT_SECRET,
  );
}

export async function readToken(env: Env, token: string): Promise<AuthUser | null> {
  try {
    const payload = await verify(token, env.JWT_SECRET, 'HS256');
    if (!payload || typeof payload.sub !== 'string') return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      role: payload.role === 'admin' ? 'admin' : 'bride',
    };
  } catch {
    return null;
  }
}
