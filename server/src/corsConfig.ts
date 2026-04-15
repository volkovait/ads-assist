import type { CorsOptions } from 'cors';

/** Продакшен-фронт на Vercel (разрешён по умолчанию). */
export const PRODUCTION_CLIENT_ORIGIN = 'https://ads-assist-client.vercel.app';

const DEV_DEFAULT_ORIGINS: readonly string[] = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://localhost:5173',
  'https://127.0.0.1:5173',
] as const;

function parseCorsOriginsEnv(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/** Локальная разработка: localhost / 127.0.0.1 с любым портом, http и https. */
function isLocalOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Деплои и превью на Vercel приходят с Origin вида https://*-....vercel.app,
 * а не только с канонического домена проекта — без этого браузер режет CORS.
 */
function isHttpsVercelAppOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return h === 'vercel.app' || h.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

export function createCorsOptions(): CorsOptions {
  const extra = parseCorsOriginsEnv();
  const allowed = new Set<string>([PRODUCTION_CLIENT_ORIGIN, ...DEV_DEFAULT_ORIGINS, ...extra]);

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.has(origin)) {
        callback(null, true);
        return;
      }
      if (isHttpsVercelAppOrigin(origin)) {
        callback(null, true);
        return;
      }
      const dev = process.env.NODE_ENV !== 'production';
      if (dev && isLocalOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'RqUID', 'X-Client-ID'],
    maxAge: 86_400,
    optionsSuccessStatus: 204,
  };
}
