// HMAC-signed, expiring tokens for secure R2 export downloads.
function b64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const bin = atob(s + '='.repeat(pad));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

export interface SignedPayload {
  brideId: string;
  key: string; // R2 object key
  exp: number; // unix seconds
}

export async function signDownload(secret: string, payload: SignedPayload): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64url(await hmac(secret, body));
  return `${body}.${sig}`;
}

export async function verifyDownload(secret: string, token: string): Promise<SignedPayload | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64url(await hmac(secret, body));
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SignedPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
