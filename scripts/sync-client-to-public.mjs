import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'client/dist');
const pub = path.join(root, 'public');

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('sync-client-to-public: сначала выполните `npm run build -w client`');
  process.exit(1);
}

mkdirSync(pub, { recursive: true });
for (const name of readdirSync(pub)) {
  if (name === '.gitkeep') continue;
  rmSync(path.join(pub, name), { recursive: true, force: true });
}
cpSync(dist, pub, { recursive: true });
console.log('sync-client-to-public: client/dist → public/');
