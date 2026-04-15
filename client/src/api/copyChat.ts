import { apiUrl } from '../apiBase';
import type { CopyChatMessage, CopyChatResponse } from './types';
import { getFetchErrorMessage } from './types';

/** POST `/api/copy/chat` — соответствует `router.post('/copy/chat', …)` в server/src/routes/banner.ts. */
export async function postCopyChat(
  userName: string,
  messages: CopyChatMessage[],
): Promise<CopyChatResponse> {
  const res = await fetch(apiUrl('/api/copy/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, messages }),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(getFetchErrorMessage(data, `Ошибка ${res.status}`));
  }
  if (
    typeof data !== 'object' ||
    data === null ||
    !('reply' in data) ||
    typeof (data as CopyChatResponse).reply !== 'string'
  ) {
    throw new Error('Некорректный ответ сервера');
  }
  return data as CopyChatResponse;
}
