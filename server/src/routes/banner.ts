import { Router } from 'express';
import fs from 'node:fs/promises';
import { completeCopyChat, generateBannerImage } from '../gigachat.js';
import type { CopyChatTurn } from '../gigachat.js';
import { sendPhotoToTelegram, sendTextToTelegram } from '../telegram.js';

const USER_NAME_MAX_LEN = 100;

/** Non-empty trimmed display name from client JSON `userName`. */
function parseUserName(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('userName' in body)) return null;
  const v = body.userName;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (t.length === 0 || t.length > USER_NAME_MAX_LEN) return null;
  return t;
}

function parseCopyTurns(body: unknown): CopyChatTurn[] | null {
  if (typeof body !== 'object' || body === null || !('messages' in body)) return null;
  const msgs = body.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return null;
  if (msgs.length > 30) return null;

  const out: CopyChatTurn[] = [];
  for (const item of msgs) {
    if (typeof item !== 'object' || item === null) return null;
    if (!('role' in item) || !('content' in item)) return null;
    const role = item.role;
    const content = item.content;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;
    out.push({ role, content });
  }
  return out;
}

export function createBannerRouter(generatedDir: string): Router {
  const router = Router();

  router.post('/copy/chat', async (req, res) => {
    const userName = parseUserName(req.body);
    if (!userName) {
      res.status(400).json({
        error: `Укажите непустое имя (userName), не длиннее ${USER_NAME_MAX_LEN} символов.`,
      });
      return;
    }

    const turns = parseCopyTurns(req.body);
    if (!turns) {
      res.status(400).json({
        error: 'Ожидается JSON: { userName, messages: [{ role: "user"|"assistant", content: string }, ...] } (1–30 сообщений).',
      });
      return;
    }

    try {
      const reply = await completeCopyChat(turns);
      const telegram = await sendTextToTelegram(`Слоганы и тексты · ${userName}\n\n${reply}`);
      if (!telegram.ok && telegram.errorMessage) {
        console.warn('[telegram copy]', telegram.errorMessage);
      }
      res.json({ reply, telegramSent: telegram.ok });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      console.error('[copy/chat]', err);
      res.status(500).json({ error: message });
    }
  });

  router.post('/banner/generate', async (req, res) => {
    const userName = parseUserName(req.body);
    if (!userName) {
      res.status(400).json({
        error: `Укажите непустое имя (userName), не длиннее ${USER_NAME_MAX_LEN} символов.`,
      });
      return;
    }

    const keyMessage = typeof req.body?.keyMessage === 'string' ? req.body.keyMessage.trim() : '';
    const targetAudience =
      typeof req.body?.targetAudience === 'string' ? req.body.targetAudience.trim() : '';

    if (!keyMessage || !targetAudience) {
      res.status(400).json({ error: 'Поля keyMessage и targetAudience обязательны и не могут быть пустыми.' });
      return;
    }

    try {
      const { absolutePath, publicPath } = await generateBannerImage(keyMessage, targetAudience, generatedDir);
      const imageBuffer = await fs.readFile(absolutePath);
      const filename = publicPath.split('/').pop() ?? 'banner.jpg';

      const telegramPhoto = await sendPhotoToTelegram(imageBuffer, filename);
      if (!telegramPhoto.ok && telegramPhoto.errorMessage) {
        console.warn('[telegram photo]', telegramPhoto.errorMessage);
      }

      const caption = `Баннер (картинка) · ${userName}\n\nКлючевое сообщение: ${keyMessage}\nЦелевая аудитория: ${targetAudience}`;
      const telegramText = await sendTextToTelegram(caption);
      if (!telegramText.ok && telegramText.errorMessage) {
        console.warn('[telegram banner text]', telegramText.errorMessage);
      }

      res.json({
        imageUrl: publicPath,
        telegramSent: telegramPhoto.ok && telegramText.ok,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      console.error('[banner/generate]', err);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
