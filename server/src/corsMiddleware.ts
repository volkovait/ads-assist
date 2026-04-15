import { appendFileSync } from 'node:fs';
import type { Request, Response, NextFunction } from 'express';
import { getCorsDebugInfo, isRequestOriginAllowed } from './corsConfig.js';

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

const NDJSON_LOG = '/Users/volkovaaaa/Documents/banner-practise/.cursor/debug-722705.log';

/** Локально пишет NDJSON + пробует ingest; на удалённом сервере файл недоступен — только fetch (тихо падает). */
function agentDebugLog(payload: Record<string, unknown>): void {
  const body = { sessionId: '722705', timestamp: Date.now(), ...payload };
  // #region agent log
  try {
    appendFileSync(NDJSON_LOG, `${JSON.stringify(body)}\n`, { flag: 'a' });
  } catch {
    /* удалённый деплой: нет пути к workspace */
  }
  fetch('http://127.0.0.1:7930/ingest/73592269-a2bf-4bea-b27c-1edf49e9be79', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '722705' },
    body: JSON.stringify(body),
  }).catch(() => {});
  // #endregion
}

function corsDebugHeadersEnabled(): boolean {
  const v = process.env.CORS_DEBUG_HEADERS?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function attachCorsDebugHeaders(res: Response, info: ReturnType<typeof getCorsDebugInfo>, extra: Record<string, string>): void {
  if (!corsDebugHeadersEnabled()) return;
  res.setHeader('X-Debug-Cors-Allowed', info.allowed ? '1' : '0');
  res.setHeader('X-Debug-Cors-Static', info.matchedStatic ? '1' : '0');
  res.setHeader('X-Debug-Cors-Vercel', info.matchedVercelHttps ? '1' : '0');
  res.setHeader('X-Debug-Cors-DevLocal', info.matchedDevLocal ? '1' : '0');
  res.setHeader('X-Debug-Cors-NodeEnv', info.nodeEnv ?? '');
  if (info.originReceived) {
    res.setHeader('X-Debug-Cors-Origin', info.originReceived.slice(0, 512));
  }
  for (const [k, v] of Object.entries(extra)) {
    res.setHeader(`X-Debug-Cors-${k}`, v.slice(0, 256));
  }
}

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
  const debugInfo = getCorsDebugInfo(origin);

  agentDebugLog({
    hypothesisId: 'H1',
    location: 'corsMiddleware.ts:entry',
    message: 'cors request',
    data: {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      ...debugInfo,
    },
  });

  if (origin && !allowed) {
    if (process.env.NODE_ENV !== 'production' || corsDebugHeadersEnabled()) {
      console.warn('[cors] blocked Origin:', origin, debugInfo);
    }
  }

  if (req.method === 'OPTIONS') {
    const reflect = req.headers['access-control-request-headers'];
    const allowHeaders =
      typeof reflect === 'string' && reflect.trim().length > 0 ? reflect : FALLBACK_ALLOW_HEADERS;

    agentDebugLog({
      hypothesisId: 'H2',
      location: 'corsMiddleware.ts:OPTIONS',
      message: 'preflight',
      data: {
        ...debugInfo,
        accessControlRequestHeaders: reflect ?? null,
        allowHeadersSent: allowHeaders,
      },
    });

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

    attachCorsDebugHeaders(res, debugInfo, {
      Phase: 'OPTIONS',
      AcaoSet: allowed && origin ? 'origin' : isPublicGeneratedPath(req) ? 'star' : 'none',
    });

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

  attachCorsDebugHeaders(res, debugInfo, {
    Phase: req.method,
    AcaoSet: allowed && origin ? 'origin' : isPublicGeneratedPath(req) ? 'star' : 'none',
  });

  next();
}
