import { apiUrl } from '../apiBase';

/**
 * URL для `<img src>` / GET по пути из ответа баннера (`/generated/...`).
 * Соответствует `app.use('/generated', …)` в server/src/index.ts.
 */
export function generatedAssetUrl(publicPath: string): string {
  const p = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  return apiUrl(p);
}
