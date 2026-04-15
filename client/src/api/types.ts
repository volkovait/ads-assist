/** Ответ POST `/api/copy/chat` (см. server/src/routes/banner.ts). */
export interface CopyChatResponse {
  reply: string;
  telegramSent: boolean;
}

/** Ответ POST `/api/banner/generate`. */
export interface BannerGenerateResponse {
  imageUrl: string;
  telegramSent: boolean;
}

/** Сообщение в теле `{ messages }` для copy/chat. */
export interface CopyChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function getFetchErrorMessage(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null || !('error' in data)) return fallback;
  const err = (data as { error?: unknown }).error;
  return typeof err === 'string' && err.trim() ? err : fallback;
}
