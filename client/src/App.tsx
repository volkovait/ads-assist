import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { generatedAssetUrl, postBannerGenerate, postCopyChat } from './api';

type TabId = 'copy' | 'image';

type ChatBubble = { id: string; role: 'user' | 'assistant'; content: string };

const WELCOME_TEXT =
  'Привет! Здесь рождаются самые креативные и поражающие воображение рекламные тексты. Попробуй сломать меня темами про геев и наркоту! Спорим, ничего не выйдет ;)';

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const USER_NAME_MAX = 100;

export function App() {
  const [tab, setTab] = useState<TabId>('copy');
  const [userName, setUserName] = useState('');
  const nameReady = userName.trim().length > 0;

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.badge}>Лучшие рекламные технологии от умелых вайб-кодеров</div>
          <h1 style={styles.title}>Генератор баннеров</h1>
          <p style={styles.lead}>Тёплый помощник маркетолога: хочешь, текст генери, хочешь картиночку</p>
        </header>

        <div style={styles.nameBlock}>
          <label style={styles.nameLabel}>
            <span style={styles.nameLabelText}>Ваше имя</span>
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value.slice(0, USER_NAME_MAX))}
              placeholder="Как к вам обращаться"
              maxLength={USER_NAME_MAX}
              autoComplete="name"
              style={styles.nameInput}
              aria-invalid={!nameReady}
              aria-describedby="name-hint"
            />
          </label>
        </div>

        <nav style={styles.tabs} aria-label="Разделы">
          <button
            type="button"
            style={{ ...styles.tab, ...(tab === 'copy' ? styles.tabActive : null) }}
            onClick={() => setTab('copy')}
          >
            Тексты и слоганы
          </button>
          <button
            type="button"
            style={{ ...styles.tab, ...(tab === 'image' ? styles.tabActive : null) }}
            onClick={() => setTab('image')}
          >
            Картинка
          </button>
        </nav>

        <div style={styles.tabBody}>
          {tab === 'copy' ? <CopyChatPanel userName={userName} /> : <ImageBannerPanel userName={userName} />}
        </div>
      </div>
    </div>
  );
}

function CopyChatPanel({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<ChatBubble[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME_TEXT },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramSent, setTelegramSent] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const chatFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const nameOk = userName.trim().length > 0;

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || !nameOk) return;

    const userMsg: ChatBubble = { id: newId(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setError(null);
    setTelegramSent(null);
    setLoading(true);

    const payload = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

    try {
      const body = await postCopyChat(userName.trim(), payload);
      setMessages(prev => [...prev, { id: newId(), role: 'assistant', content: body.reply }]);
      setTelegramSent(typeof body.telegramSent === 'boolean' ? body.telegramSent : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить запрос');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  }

  function handleChatKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (loading || !input.trim() || !nameOk) return;
    chatFormRef.current?.requestSubmit();
  }

  function clearChat() {
    setMessages([{ id: 'welcome', role: 'assistant', content: WELCOME_TEXT }]);
    setError(null);
    setTelegramSent(null);
  }

  return (
    <div style={styles.panel}>
      <div style={styles.chatToolbar}>
        <button type="button" style={styles.linkBtn} onClick={clearChat}>
          Очистить чат
        </button>
      </div>

      <div style={styles.chatScroll} role="log" aria-live="polite">
        {messages.map(m => (
          <div
            key={m.id}
            style={{
              ...styles.row,
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}>
              <div style={styles.bubbleMeta}>{m.role === 'user' ? 'Вы' : 'AI'}</div>
              <div style={styles.bubbleText}>{m.content}</div>
            </div>
          </div>
        ))}
        {loading ? (
          <div style={styles.row}>
            <div className="typing-dots" style={styles.typing}>
              <span style={styles.dot} />
              <span style={styles.dot} />
              <span style={styles.dot} />
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {error ? (
        <div role="alert" style={styles.alert}>
          {error}
        </div>
      ) : null}
      {telegramSent !== null ? (
        <p style={styles.telegramNote}>
          {telegramSent ? 'Ответ также отправлен в Telegram.' : 'Не удалось отправить текст в Telegram (см. логи сервера).'}
        </p>
      ) : null}

      <form ref={chatFormRef} onSubmit={handleSend} style={styles.chatForm}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleChatKeyDown}
          rows={2}
          placeholder="Например: слоган для сервиса доставки цветов, аудитория — романтики 20–35, тон дружелюбный (Enter — отправить, Shift+Enter — новая строка)"
          style={styles.chatInput}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || !nameOk}
          style={{
            ...styles.primaryBtn,
            ...(loading || !input.trim() || !nameOk ? styles.btnMuted : null),
          }}
        >
          {loading ? 'Пишу…' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}

function ImageBannerPanel({ userName }: { userName: string }) {
  const [keyMessage, setKeyMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramSent, setTelegramSent] = useState<boolean | null>(null);

  const nameOk = userName.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const km = keyMessage.trim();
    const ta = targetAudience.trim();
    if (!km || !ta || loading || !nameOk) return;

    setError(null);
    setTelegramSent(null);
    setLoading(true);
    setImageUrl(null);

    try {
      const payload = await postBannerGenerate({
        userName: userName.trim(),
        keyMessage: km,
        targetAudience: ta,
      });
      setImageUrl(payload.imageUrl);
      setTelegramSent(typeof payload.telegramSent === 'boolean' ? payload.telegramSent : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить запрос');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.panel}>
      <form onSubmit={handleSubmit} style={styles.formGrid}>
        <label style={styles.field}>
          <span style={styles.fieldLabel}>Что рекламируем?</span>
          <textarea
            value={keyMessage}
            onChange={e => setKeyMessage(e.target.value)}
            rows={3}
            placeholder="Например: скидка 20% на первый заказ"
            style={styles.textarea}
            disabled={loading}
          />
        </label>
        <label style={styles.field}>
          <span style={styles.fieldLabel}>Целевая аудитория</span>
          <textarea
            value={targetAudience}
            onChange={e => setTargetAudience(e.target.value)}
            rows={3}
            placeholder="Кто увидит баннер и что для них важно"
            style={styles.textarea}
            disabled={loading}
          />
        </label>
        <button
          type="submit"
          disabled={loading || !nameOk || !keyMessage.trim() || !targetAudience.trim()}
          style={{
            ...styles.primaryBtn,
            alignSelf: 'flex-start',
            ...(loading || !nameOk || !keyMessage.trim() || !targetAudience.trim() ? styles.btnMuted : null),
          }}
        >
          {loading ? 'Рисуем баннер…' : 'Сгенерировать картинку'}
        </button>
      </form>

      {error ? (
        <div role="alert" style={styles.alert}>
          {error}
        </div>
      ) : null}
      {telegramSent !== null ? (
        <p style={styles.telegramNote}>
          {telegramSent
            ? 'Картинка и подпись отправлены в Telegram.'
            : 'Часть данных в Telegram не доставлена (см. логи сервера). Превью ниже.'}
        </p>
      ) : null}

      <section style={styles.preview}>
        <h2 style={styles.previewHeading}>Превью</h2>
        {imageUrl ? (
          <img src={generatedAssetUrl(imageUrl)} alt="Сгенерированный баннер" style={styles.previewImg} />
        ) : (
          <div style={styles.previewPlaceholder}>{loading ? 'Генерируем…' : 'Здесь появится баннер'}</div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: '100vh',
    padding: '1.5rem 1rem 3rem',
    background: 'linear-gradient(165deg, #fffbeb 0%, #ffedd5 38%, #fdba74 100%)',
  },
  card: {
    maxWidth: 720,
    margin: '0 auto',
    background: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    boxShadow: '0 24px 60px rgba(234, 88, 12, 0.18)',
    border: '1px solid rgba(251, 191, 36, 0.55)',
    overflow: 'hidden',
  },
  header: {
    padding: '1.75rem 1.75rem 1rem',
    background: 'linear-gradient(90deg, #fff7ed, #fffbeb)',
    borderBottom: '1px solid #fed7aa',
  },
  badge: {
    display: 'inline-block',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#9a3412',
    background: '#ffedd5',
    border: '1px solid #fdba74',
    padding: '0.25rem 0.6rem',
    borderRadius: 999,
    marginBottom: '0.65rem',
  },
  title: {
    margin: '0 0 0.4rem',
    fontSize: '1.85rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: '#7c2d12',
  },
  lead: {
    margin: 0,
    color: '#9a3412',
    fontSize: '0.98rem',
    lineHeight: 1.55,
    maxWidth: 520,
  },
  nameBlock: {
    padding: '1rem 1.5rem 1rem',
    background: '#fffbeb',
    borderBottom: '1px solid #fed7aa',
  },
  nameLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  nameLabelText: {
    fontWeight: 800,
    fontSize: '0.88rem',
    color: '#9a3412',
  },
  nameInput: {
    width: '100%',
    maxWidth: 420,
    padding: '0.65rem 0.9rem',
    borderRadius: 12,
    border: '2px solid #fdba74',
    font: 'inherit',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#431407',
    background: '#fff',
    outline: 'none',
  },
  nameHint: {
    margin: '0.5rem 0 0',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#b45309',
  },
  tabs: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #fed7aa',
    background: '#fff7ed',
  },
  tab: {
    flex: 1,
    padding: '0.95rem 1rem',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.95rem',
    color: '#b45309',
    borderBottom: '3px solid transparent',
  },
  tabActive: {
    color: '#c2410c',
    background: 'rgba(255, 255, 255, 0.85)',
    borderBottomColor: '#f97316',
  },
  tabBody: {
    padding: '1.25rem 1.5rem 1.75rem',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionIntro: {
    margin: 0,
    color: '#9a3412',
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
  chatToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  chatHint: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#b45309',
  },
  linkBtn: {
    border: 'none',
    background: 'transparent',
    color: '#ea580c',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '0.88rem',
  },
  chatScroll: {
    maxHeight: 420,
    overflowY: 'auto',
    padding: '0.75rem',
    borderRadius: 16,
    border: '1px solid #fed7aa',
    background: 'linear-gradient(180deg, #fffbeb, #fff7ed)',
  },
  row: {
    display: 'flex',
    marginBottom: '0.65rem',
  },
  bubbleUser: {
    maxWidth: '88%',
    padding: '0.65rem 0.85rem',
    borderRadius: '14px 14px 4px 14px',
    background: 'linear-gradient(135deg, #fb923c, #f97316)',
    color: '#fffaf0',
    boxShadow: '0 8px 20px rgba(249, 115, 22, 0.25)',
  },
  bubbleAssistant: {
    maxWidth: '88%',
    padding: '0.65rem 0.85rem',
    borderRadius: '14px 14px 14px 4px',
    background: '#fff',
    border: '1px solid #fdba74',
    color: '#431407',
    boxShadow: '0 6px 16px rgba(251, 146, 60, 0.12)',
  },
  bubbleMeta: {
    fontSize: '0.68rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    opacity: 0.85,
    marginBottom: '0.25rem',
  },
  bubbleText: {
    fontSize: '0.95rem',
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  },
  typing: {
    display: 'flex',
    gap: 6,
    padding: '0.5rem 0.75rem',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#fb923c',
    display: 'inline-block',
  },
  chatForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  chatInput: {
    width: '100%',
    resize: 'vertical',
    minHeight: 64,
    padding: '0.75rem 1rem',
    borderRadius: 14,
    border: '1px solid #fdba74',
    font: 'inherit',
    background: '#fff',
    color: '#431407',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  fieldLabel: {
    fontWeight: 700,
    fontSize: '0.88rem',
    color: '#9a3412',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 14,
    border: '1px solid #fdba74',
    font: 'inherit',
    background: '#fff',
    color: '#431407',
    resize: 'vertical',
    minHeight: 72,
  },
  primaryBtn: {
    border: 'none',
    borderRadius: 14,
    padding: '0.75rem 1.35rem',
    fontWeight: 800,
    fontSize: '0.95rem',
    cursor: 'pointer',
    color: '#fffaf0',
    background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    boxShadow: '0 10px 24px rgba(234, 88, 12, 0.35)',
  },
  btnMuted: {
    opacity: 0.45,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  alert: {
    padding: '0.75rem 1rem',
    borderRadius: 12,
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    color: '#be123c',
    fontSize: '0.9rem',
  },
  telegramNote: {
    margin: 0,
    fontSize: '0.86rem',
    color: '#b45309',
    fontWeight: 600,
  },
  preview: {
    marginTop: '0.5rem',
  },
  previewHeading: {
    margin: '0 0 0.75rem',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#c2410c',
    fontWeight: 800,
  },
  previewImg: {
    width: '100%',
    height: 'auto',
    borderRadius: 16,
    border: '1px solid #fdba74',
    display: 'block',
  },
  previewPlaceholder: {
    minHeight: 200,
    borderRadius: 16,
    border: '2px dashed #fdba74',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#b45309',
    fontWeight: 600,
    background: '#fffbeb',
  },
};
