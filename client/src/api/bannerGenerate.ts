import { apiUrl } from '../apiBase';
import type { BannerGenerateResponse } from './types';
import { getFetchErrorMessage } from './types';

/** POST `/api/banner/generate` — соответствует `router.post('/banner/generate', …)` в server/src/routes/banner.ts. */
export async function postBannerGenerate(params: {
  userName: string;
  keyMessage: string;
  targetAudience: string;
}): Promise<BannerGenerateResponse> {
  const res = await fetch(apiUrl('/api/banner/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(getFetchErrorMessage(data, `Ошибка ${res.status}`));
  }
  if (
    typeof data !== 'object' ||
    data === null ||
    !('imageUrl' in data) ||
    typeof (data as BannerGenerateResponse).imageUrl !== 'string'
  ) {
    throw new Error('Некорректный ответ сервера');
  }
  return data as BannerGenerateResponse;
}

