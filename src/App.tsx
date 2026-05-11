import { useRef, useCallback, useState, useEffect } from 'react';
import Schedule from './components/Schedule';
import TodoPanel from './components/TodoPanel';
import QuickLinks from './components/QuickLinks';
import './styles/tokens.css';
import './styles/layout.css';

const MIN_SIDE = 240;
const DEFAULT_RATIO = { left: 0.25, right: 0.25 };
const STORAGE_KEY = 'dashboardColumnRatio';
const THEME_KEY = 'dashboardTheme';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch { /* ignore */ }
  return 'system';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

function loadRatio(): { left: number; right: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_RATIO;
}

function saveRatio(ratio: { left: number; right: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ratio));
}

export default function App() {
  const dashRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(loadRatio);
  const dragging = useRef<'left' | 'right' | null>(null);
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  }, []);

  useEffect(() => { saveRatio(ratio); }, [ratio]);

  const onMouseDown = useCallback((side: 'left' | 'right') => {
    dragging.current = side;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      const el = dashRef.current;
      if (!el || !dragging.current) return;
      const rect = el.getBoundingClientRect();
      const totalW = rect.width;
      const x = e.clientX - rect.left;

      if (dragging.current === 'left') {
        const newLeft = Math.max(MIN_SIDE / totalW, Math.min(x / totalW, 1 - ratio.right - MIN_SIDE / totalW));
        setRatio(prev => ({ ...prev, left: newLeft }));
      } else {
        const newRight = Math.max(MIN_SIDE / totalW, Math.min((totalW - x) / totalW, 1 - ratio.left - MIN_SIDE / totalW));
        setRatio(prev => ({ ...prev, right: newRight }));
      }
    };

    const onMouseUp = () => {
      dragging.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [ratio]);

  const cols = `${ratio.left * 100}% 4px 1fr 4px ${ratio.right * 100}%`;

  return (
    <>
      <header className="top-bar">
        <div className="top-bar-left">
          <span className="top-bar-brand">Descle</span>
          <span className="top-bar-separator">/</span>
          <span className="top-bar-breadcrumb">DayView Dashboard</span>
        </div>
      </header>

      <button
        onClick={cycleTheme}
        className="theme-fab"
        title={`Theme: ${theme}`}
      >
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : theme === 'light' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}
      </button>

      <main
        ref={dashRef}
        className="dashboard"
        style={{ gridTemplateColumns: cols }}
      >
        <section className="col-schedule">
          <Schedule />
        </section>

        <div
          className="resize-handle"
          onMouseDown={() => onMouseDown('left')}
        />

        <section className="col-todo">
          <TodoPanel />
        </section>

        <div
          className="resize-handle"
          onMouseDown={() => onMouseDown('right')}
        />

        <section className="col-links">
          <QuickLinks />
        </section>
      </main>
    </>
  );
}
