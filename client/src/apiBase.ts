/**
 * Пустая строка в локальной разработке: запросы идут на тот же origin (Vite проксирует /api и /generated на Express).
 * На Vercel задайте VITE_PUBLIC_API_BASE_URL на публичный URL бэкенда (без завершающего /).
 */
const raw = import.meta.env.VITE_PUBLIC_API_BASE_URL;
export const API_BASE =
  typeof raw === 'string' && raw.trim().length > 0 ? raw.trim().replace(/\/$/, '') : '';

/** Абсолютный или относительный URL для fetch и для <img src> при отдельном хосте API. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}
