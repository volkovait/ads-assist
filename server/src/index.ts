import './loadEnv.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { isRequestOriginAllowed } from './corsConfig.js';
import { createBannerRouter } from './routes/banner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GENERATED_DIR = path.resolve(__dirname, '../generated');
/** Сборка: client/dist копируется в корневой `public/` (Vercel отдаёт его с CDN; express.static на Vercel не используется). */
const REPO_PUBLIC_DIR = path.resolve(__dirname, '../../public');
const CLIENT_DIST_FALLBACK = path.resolve(__dirname, '../../client/dist');

const app = express();
const port = Number(process.env.PORT) || 3001;

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, isRequestOriginAllowed(origin));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '512kb' }));
app.use('/generated', express.static(GENERATED_DIR));
app.use('/api', createBannerRouter(GENERATED_DIR));

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  const spaDir = existsSync(path.join(REPO_PUBLIC_DIR, 'index.html')) ? REPO_PUBLIC_DIR : CLIENT_DIST_FALLBACK;
  app.use(express.static(spaDir));
  app.get(/^(?!\/api\/|\/generated\/).*/, (_req, res) => {
    res.sendFile(path.join(spaDir, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening on http://127.0.0.1:${port}`);
    if (isProd) {
      const dir = existsSync(path.join(REPO_PUBLIC_DIR, 'index.html')) ? REPO_PUBLIC_DIR : CLIENT_DIST_FALLBACK;
      console.log(`Serving client from ${dir}`);
    }
  });
}

export default app;
