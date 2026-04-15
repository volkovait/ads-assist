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

const EXTRA_ORIGINS = parseCorsOriginsEnv();
const STATIC_ALLOWED_ORIGINS = new Set<string>([
  PRODUCTION_CLIENT_ORIGIN,
  ...DEV_DEFAULT_ORIGINS,
  ...EXTRA_ORIGINS,
]);

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
 * Деплои и превью на Vercel: Origin вида https://*.vercel.app
 * (см. https://vercel.com/kb/guide/how-to-enable-cors — префлайт и явный origin).
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

/** Разрешён ли Origin для CORS (с credentials нужен конкретный origin, не `*`). */
export function isRequestOriginAllowed(origin: string | undefined): boolean {
  if (typeof origin !== 'string' || origin.trim().length === 0) return false;

  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  if (isHttpsVercelAppOrigin(origin)) return true;

  const dev = process.env.NODE_ENV !== 'production';
  if (dev && isLocalOrigin(origin)) return true;

  return false;
}
