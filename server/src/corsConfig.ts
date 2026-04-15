import type { CorsOptions } from 'cors';

/** Продакшен-фронт на Vercel (разрешён по умолчанию). */
export const PRODUCTION_CLIENT_ORIGIN = 'https://ads-assist-client.vercel.app';

const DEV_DEFAULT_ORIGINS: readonly string[] = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
] as const;

function parseCorsOriginsEnv(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function isLocalHttpOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
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
      const dev = process.env.NODE_ENV !== 'production';
      if (dev && isLocalHttpOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  };
}
