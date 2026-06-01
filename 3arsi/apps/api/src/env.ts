// Cloudflare Workers bindings + environment variables.
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  EXPORTS: R2Bucket;

  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_TTL_SECONDS: string;
  SIGNED_URL_SECRET: string;

  CHARGILY_SECRET_KEY: string;
  CHARGILY_WEBHOOK_SECRET: string;
  CHARGILY_BASE_URL: string;
  PACKAGE_PRICE_DZD: string;

  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  APP_URL: string;
}

export interface AuthUser {
  sub: string; // user id
  email: string;
  role: 'admin' | 'bride';
}

// Hono context variables.
export interface Vars {
  user: AuthUser;
  brideId: string;
}
