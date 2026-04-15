export interface SendPhotoResult {
  ok: boolean;
  errorMessage?: string;
}

export interface SendTextResult {
  ok: boolean;
  errorMessage?: string;
}

const TELEGRAM_TEXT_LIMIT = 4096;

function chunkTelegramText(text: string): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    chunks.push(rest.slice(0, TELEGRAM_TEXT_LIMIT));
    rest = rest.slice(TELEGRAM_TEXT_LIMIT);
  }
  return chunks;
}

/** Sends plain text (split if longer than Telegram limit). */
export async function sendTextToTelegram(text: string): Promise<SendTextResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return { ok: false, errorMessage: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set' };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, errorMessage: 'Empty text' };
  }

  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;

  try {
    for (const part of chunkTelegramText(trimmed)) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: part,
          disable_web_page_preview: true,
        }),
      });

      const raw = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        return { ok: false, errorMessage: `Telegram non-JSON (${res.status}): ${raw.slice(0, 200)}` };
      }

      if (!res.ok) {
        const desc =
          typeof parsed === 'object' &&
          parsed !== null &&
          'description' in parsed &&
          typeof (parsed as { description: unknown }).description === 'string'
            ? (parsed as { description: string }).description
            : raw.slice(0, 200);
        return { ok: false, errorMessage: `Telegram HTTP ${res.status}: ${desc}` };
      }

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('ok' in parsed) ||
        (parsed as { ok: unknown }).ok !== true
      ) {
        return { ok: false, errorMessage: `Telegram ok=false: ${raw.slice(0, 300)}` };
      }
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errorMessage: message };
  }
}

export async function sendPhotoToTelegram(
  imageBuffer: Buffer,
  filename: string,
): Promise<SendPhotoResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return { ok: false, errorMessage: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set' };
  }

  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendPhoto`;

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), filename);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const raw = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return { ok: false, errorMessage: `Telegram non-JSON response (${res.status}): ${raw.slice(0, 200)}` };
    }

    if (!res.ok) {
      const desc =
        typeof parsed === 'object' &&
        parsed !== null &&
        'description' in parsed &&
        typeof (parsed as { description: unknown }).description === 'string'
          ? (parsed as { description: string }).description
          : raw.slice(0, 200);
      return { ok: false, errorMessage: `Telegram HTTP ${res.status}: ${desc}` };
    }

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'ok' in parsed &&
      (parsed as { ok: unknown }).ok === true
    ) {
      return { ok: true };
    }

    return { ok: false, errorMessage: `Telegram API ok=false: ${raw.slice(0, 300)}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errorMessage: message };
  }
}
