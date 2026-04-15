import type { Request, Response, NextFunction } from 'express';
import { isRequestOriginAllowed } from './corsConfig.js';

/**
 * CORS по рекомендациям Vercel KB:
 * https://vercel.com/kb/guide/how-to-enable-cors
 *
 * — OPTIONS → 200 + Access-Control-Allow-Methods / -Headers / -Max-Age
 * — Access-Control-Allow-Credentials: true + явный Access-Control-Allow-Origin
 * — Allow-Headers: отражение Access-Control-Request-Headers из префлайта (или запасной список)
 */
const ALLOW_METHODS = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS';
const FALLBACK_ALLOW_HEADERS = 'Content-Type, Authorization, Accept, RqUID, X-Client-ID';
const MAX_AGE = '86400';

/** Статические JPG превью: кросс-домен с фронта без Origin или с crossOrigin — нужен ACAO (часто `*`, без credentials). */
function isPublicGeneratedPath(req: Request): boolean {
  if (req.path.startsWith('/generated/') || req.path === '/generated') return true;
  const base = (req.originalUrl ?? '').split('?')[0] ?? '';
  return base.startsWith('/generated/') || base === '/generated';
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originHeader = req.headers.origin;
  const origin = typeof originHeader === 'string' ? originHeader : undefined;
  const allowed = isRequestOriginAllowed(origin);

  if (origin && !allowed && process.env.NODE_ENV !== 'production') {
    console.warn('[cors] blocked Origin:', origin);
  }

  if (req.method === 'OPTIONS') {
    const reflect = req.headers['access-control-request-headers'];
    const allowHeaders =
      typeof reflect === 'string' && reflect.trim().length > 0 ? reflect : FALLBACK_ALLOW_HEADERS;

    res.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS);
    res.setHeader('Access-Control-Allow-Headers', allowHeaders);
    res.setHeader('Access-Control-Max-Age', MAX_AGE);

    if (allowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.append('Vary', 'Origin');
    } else if (isPublicGeneratedPath(req)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.status(200).end();
    return;
  }

  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.append('Vary', 'Origin');
  } else if (isPublicGeneratedPath(req)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  next();
}
