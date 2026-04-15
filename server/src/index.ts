import './loadEnv.js';
import path from 'node:path';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { getCorsDebugInfo } from './corsConfig.js';
import { createBannerRouter } from './routes/banner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GENERATED_DIR = path.resolve(__dirname, '../generated');
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
const port = Number(process.env.PORT) || 3001;

function envFlagTrue(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

/** Лог Origin для `/api` (и префлайта): сверяйте с `corsConfig` / `CORS_ORIGINS`. В проде — только при `CORS_AUDIT_LOG`. */
function corsOriginAuditMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const pathOnly = (req.originalUrl ?? req.path).split('?')[0] ?? '';
  if (!pathOnly.startsWith('/api')) {
    next();
    return;
  }
  const auditEnabled = process.env.NODE_ENV !== 'production' || envFlagTrue(process.env.CORS_AUDIT_LOG);
  if (!auditEnabled) {
    next();
    return;
  }
  const raw = req.headers.origin;
  const origin = typeof raw === 'string' ? raw : undefined;
  const info = getCorsDebugInfo(origin);
  console.log(
    '[cors:origin]',
    req.method,
    pathOnly,
    '| Origin:',
    info.originReceived ?? '(нет)',
    '| по правилам corsConfig:',
    info.allowed ? 'да' : 'нет',
    '| static:',
    info.matchedStatic,
    '| vercel.app:',
    info.matchedVercelHttps,
    '| dev localhost:',
    info.matchedDevLocal,
  );
  next();
}

const corsOptions = {
  origin: '*.vercel.com', // Разрешаем запросы только с доменов, оканчивающихся на .vercel.app
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Разрешённые HTTP-методы
  credentials: true, // Разрешаем отправку cookies и авторизационных заголовков
};

app.use(corsOriginAuditMiddleware);
app.use(cors(corsOptions));
app.use(express.json({ limit: '512kb' }));
app.use('/generated', express.static(GENERATED_DIR));
app.use('/api', createBannerRouter(GENERATED_DIR));

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api\/|\/generated\/).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server listening on http://127.0.0.1:${port}`);
  if (isProd) {
    console.log(`Serving client from ${CLIENT_DIST}`);
  }
});
