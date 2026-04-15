/**
 * Пустая строка в локальной разработке: запросы идут на тот же origin (Vite проксирует /api и /generated на Express).
 * На Vercel задайте VITE_PUBLIC_API_BASE_URL на публичный URL **деплоя API** (например https://your-api.vercel.app), без завершающего /.
 * Не используйте https://vercel.com — это не хост вашего приложения.
 */
function normalizeApiBase(raw: string | undefined): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (host === 'vercel.com' || host === 'www.vercel.com') {
      return '';
    }
  } catch {
    return '';
  }
  return trimmed;
}

const raw = import.meta.env.VITE_PUBLIC_API_BASE_URL;
export const API_BASE = normalizeApiBase(raw);

/** Абсолютный или относительный URL для fetch и для <img src> при отдельном хосте API. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}
