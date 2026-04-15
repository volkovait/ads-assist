/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Публичный URL бэкенда для прод-сборки (например Vercel фронт + отдельный API). Локально не задавать. */
  readonly VITE_PUBLIC_API_BASE_URL?: string;
}

