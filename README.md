# Генератор рекламных баннеров

**Banner Practise** — одностраничное приложение для маркетинга: ИИ на базе **GigaChat** помогает с рекламными текстами и с визуалом баннера, а результаты дублируются в **Telegram**. Интерфейс разделён на два режима, перед работой пользователь указывает имя — без него запросы к API не принимаются.

---

## Возможности

- **Тексты и слоганы** — чат только для копирайтинга: слоганы, заголовки, CTA, офферы. Генерация изображений в этом режиме отключена на уровне промпта и проверки ответа.
- **Картинка** — по ключевому сообщению и целевой аудитории создаётся рекламный баннер (GigaChat text2image → сохранение JPG → превью в браузере).
- **Telegram** — после каждого успешного ответа текст уходит в чат; для баннера отправляются фото и текстовая подпись с брифом и именем.
- **Имя пользователя** — поле над табами; имя передаётся на сервер и попадает в подписи к сообщениям в Telegram.
- **Защита промпта** — в системных инструкциях заданы правила против prompt injection и ограничение тематики (реклама и смежные задачи).

---

## Стек

| Слой | Технологии |
|------|------------|
| Клиент | React 18, TypeScript, Vite |
| Сервер | Node.js, Express, TypeScript |
| ИИ | [GigaChat API](https://developers.sber.ru/docs/ru/gigachat/api/overview) (OAuth, chat/completions, скачивание файла изображения) |
| Уведомления | [Telegram Bot API](https://core.telegram.org/bots/api) (`sendPhoto`, `sendMessage`) |

Монорепозиторий с npm **workspaces**: каталоги `client/` и `server/`.

---

## Быстрый старт

1. **Node.js** 18+ (для `fetch`, `FormData`, `Blob` на сервере).

2. Скопируйте переменные окружения и заполните секреты:

   ```bash
   cp .env.example .env
   ```

   Файл `.env` в **корне** репозитория подхватывается сервером даже при запуске workspace из `server/` (см. `server/src/loadEnv.ts`).

3. Установка и режим разработки (Vite на `5173`, API на `3001`, прокси `/api` и `/generated`):

   ```bash
   npm install
   npm run dev
   ```

   Откройте в браузере адрес, который выведет Vite (обычно `http://localhost:5173`).

   Локально **не нужен** `VITE_PUBLIC_API_BASE_URL`: запросы идут на тот же origin, Vite проксирует `/api` и `/generated` на `http://127.0.0.1:3001`.

4. **Продакшен-сборка** — клиент в `client/dist`, сервер в `server/dist`; Express отдаёт API, статику `generated/` и SPA при `NODE_ENV=production`:

   ```bash
   npm run build
   NODE_ENV=production npm run start
   ```

---

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `GIGACHAT_AUTHORIZATION_KEY` | Base64-ключ для `Authorization: Basic` из [Studio GigaChat](https://developers.sber.ru/studio) (`client_id:client_secret` в Base64). |
| `GIGACHAT_INSECURE_TLS` | `true` / `1` / `yes` / `on` — только для локальной разработки, если Node не доверяет цепочке TLS Сбера. В проде используйте [сертификаты НУЦ](https://developers.sber.ru/docs/ru/gigachat/certificates) и `NODE_EXTRA_CA_CERTS`. |
| `GIGACHAT_OAUTH_SCOPE` | Необязательно; по умолчанию `GIGACHAT_API_PERS`. |
| `GIGACHAT_CLIENT_ID` | Необязательно; при необходимости передаётся как `X-Client-ID`. |
| `PORT` | Порт Express (по умолчанию `3001`). |
| `TELEGRAM_BOT_TOKEN` | Токен бота. |
| `TELEGRAM_CHAT_ID` | ID чата для отправки результатов. |
| `CORS_ORIGINS` | Необязательно: дополнительные разрешённые origin для CORS (через запятую). По умолчанию уже разрешены прод-фронт [ads-assist-client.vercel.app](https://ads-assist-client.vercel.app) и типичные `localhost` / `127.0.0.1` для Vite. |

### Клиент (Vite): отдельный хост API

Если фронт собирается для статического хостинга (например только приложение на Vercel), а API крутится на другом URL, при сборке клиента задайте:

| Переменная | Описание |
|------------|----------|
| `VITE_PUBLIC_API_BASE_URL` | Абсолютный URL бэкенда **без** завершающего `/` (например `https://api.myapp.com`). Пустое значение — относительные пути и прокси в dev. |

Переменную указывают в `client/.env.local` или в настройках CI / Vercel → Environment Variables для шага `npm run build -w client`.

Ключи и токены не коммитьте; держите их только в `.env` (файл в `.gitignore`).

---

## API (кратко)

Все маршруты с префиксом `/api`, тело — JSON.

| Метод и путь | Назначение |
|--------------|------------|
| `POST /api/copy/chat` | Тело: `{ "userName": string, "messages": [{ "role": "user" \| "assistant", "content": string }, ...] }`. Ответ: `{ "reply", "telegramSent" }`. |
| `POST /api/banner/generate` | Тело: `{ "userName", "keyMessage", "targetAudience" }`. Ответ: `{ "imageUrl", "telegramSent" }`. |

Сгенерированные файлы доступны по `GET /generated/<имя>.jpg`.

---

## Структура репозитория

```
banner-practise/
├── client/                 # Vite + React (табы, чат, форма баннера)
├── server/
│   ├── src/
│   │   ├── gigachat.ts     # OAuth, чат, скачивание изображения, промпты
│   │   ├── telegram.ts     # sendPhoto, sendMessage
│   │   ├── routes/banner.ts# /api/copy/chat, /api/banner/generate
│   │   ├── loadEnv.ts      # загрузка .env из корня монорепо
│   │   ├── corsConfig.ts   # CORS: Vercel-фронт + localhost в dev
│   │   └── index.ts        # Express, статика, SPA в production
│   └── generated/          # сохранённые JPG (не коммитить содержимое)
├── example/                # референс NestJS + другой провайдер (исторический)
├── .env.example
└── package.json            # workspaces, dev/build/start
```

---

## Безопасность и ограничения

- Системные промпты задают область ответов и базовые правила **PROMPT_SECURITY_RULES**; это снижает риск prompt injection, но не заменяет серверные квоты, фильтры и мониторинг злоупотреблений.
- Имя пользователя валидируется на сервере (непустая строка, разумная длина).
- Для стабильной работы TLS к API Сбера в проде настройте доверенные корневые сертификаты вместо отключения проверки.

---

## Лицензия

Проект в репозитории помечен как `private`; при публикации добавьте файл лицензии по своему выбору.
