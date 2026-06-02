import { useState, useCallback, useRef } from 'react';
import { Routine } from '../types';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { getRoutines, setRoutines } from '../services/storage';

/* ---------- date / streak helpers (pure) ---------- */

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return localDateStr(new Date());
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}

function isDoneToday(r: Routine): boolean {
  return r.lastCompletedDate === todayStr();
}

// 현재 시점 기준 살아있는 스트릭 (하루라도 비면 0). 저장된 streak이 stale해도 안전.
function liveStreak(r: Routine): number {
  if (r.lastCompletedDate === todayStr() || r.lastCompletedDate === yesterdayStr()) {
    return r.streak;
  }
  return 0;
}

// 오늘 완료 토글 결과 (체크/언체크 모두 같은 날 안에서 되돌릴 수 있게).
function toggled(r: Routine): Routine {
  const today = todayStr();
  const yesterday = yesterdayStr();
  if (r.lastCompletedDate === today) {
    // 언체크: 오늘 완료 취소 → 직전 상태로 복원
    if (r.streak <= 1) return { ...r, lastCompletedDate: null, streak: 0 };
    return { ...r, lastCompletedDate: yesterday, streak: r.streak - 1 };
  }
  // 체크: 어제 연속이면 이어가고, 아니면 1부터 다시 시작
  const base = r.lastCompletedDate === yesterday ? r.streak : 0;
  return { ...r, lastCompletedDate: today, streak: base + 1 };
}

/* ---------- onboarding mock ---------- */

const ONBOARDING_ROUTINES: Routine[] = [
  { id: 'obr-1', text: '비타민 챙겨먹기', createdAt: Date.now(), lastCompletedDate: todayStr(), streak: 3 },
  { id: 'obr-2', text: '계단 오르기', createdAt: Date.now() + 1, lastCompletedDate: yesterdayStr(), streak: 5 },
  { id: 'obr-3', text: '물 2L 마시기', createdAt: Date.now() + 2, lastCompletedDate: null, streak: 0 },
];

export default function RoutinePanel({ isOnboarding }: { isOnboarding?: boolean }) {
  const [routines, setRoutinesState, rawLoading] = useChromeStorage<Routine[]>(
    'routines',
    getRoutines,
    setRoutines,
    [],
  );
  const [showInput, setShowInput] = useState(false);
  const [newText, setNewText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loading = isOnboarding ? false : rawLoading;
  const items = isOnboarding ? ONBOARDING_ROUTINES : routines;
  const doneCount = items.filter(isDoneToday).length;
  const total = items.length;

  const addRoutine = useCallback(async () => {
    const text = newText.trim();
    if (!text) return;
    const routine: Routine = {
      id: crypto.randomUUID(),
      text,
      createdAt: Date.now(),
      lastCompletedDate: null,
      streak: 0,
    };
    await setRoutinesState((prev) => [...prev, routine]);
    setNewText('');
    setShowInput(false);
  }, [newText, setRoutinesState]);

  const toggleRoutine = useCallback(
    async (id: string) => {
      await setRoutinesState((prev) => prev.map((r) => (r.id === id ? toggled(r) : r)));
    },
    [setRoutinesState],
  );

  const deleteRoutine = useCallback(
    async (id: string) => {
      await setRoutinesState((prev) => prev.filter((r) => r.id !== id));
    },
    [setRoutinesState],
  );

  return (
    <div style={rootStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>ROUTINE</h2>
          <span style={subtitleStyle}>
            {total > 0 ? `${doneCount} of ${total} done today` : 'Build your daily habits'}
          </span>
        </div>
        <button
          onClick={() => {
            setShowInput(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          style={newBtnStyle}
        >
          + NEW ROUTINE
        </button>
      </div>

      {/* Inline input */}
      {showInput && (
        <div style={inputCardStyle}>
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) addRoutine();
              if (e.key === 'Escape') { setShowInput(false); setNewText(''); }
            }}
            placeholder="What do you do every day?"
            style={inputStyle}
          />
          <div style={inputActionsStyle}>
            <button onClick={addRoutine} style={inputAddBtnStyle}>Add</button>
            <button
              onClick={() => { setShowInput(false); setNewText(''); }}
              style={inputCancelBtnStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={listStyle}>
        {loading ? (
          <p style={emptyStyle}>Loading...</p>
        ) : total === 0 && !showInput ? (
          <p style={emptyStyle}>Add your first routine</p>
        ) : (
          items.map((r) => {
            const done = isDoneToday(r);
            const streak = liveStreak(r);
            return (
              <div
                key={r.id}
                onClick={() => toggleRoutine(r.id)}
                style={{ ...cardStyle, ...(done ? cardDoneStyle : {}), cursor: 'pointer' }}
              >
                <div style={cardContentStyle}>
                  <div style={{ ...checkboxStyle, ...(done ? checkboxDoneStyle : {}) }}>
                    {done && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div style={textWrapStyle}>
                    <span style={{ ...textStyle, ...(done ? textDoneStyle : {}) }}>{r.text}</span>
                    {streak > 0 && (
                      <span style={streakBadgeStyle}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                        </svg>
                        {streak}
                      </span>
                    )}
                  </div>
                  <span
                    onClick={(e) => { e.stopPropagation(); deleteRoutine(r.id); }}
                    style={deleteStyle}
                  >
                    ×
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const rootStyle: React.CSSProperties = {
  paddingTop: 32,
  marginTop: 40,
  borderTop: '1px solid var(--color-border)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 20,
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-headline)',
  fontSize: 28,
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: 0,
  lineHeight: 1.2,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-muted)',
  marginTop: 4,
  display: 'block',
};

const newBtnStyle: React.CSSProperties = {
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
};

const inputCardStyle: React.CSSProperties = {
  background: 'var(--color-card-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  border: 'none',
  borderBottom: '1px solid var(--color-border-light)',
  fontSize: 15,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  color: 'var(--color-text)',
  background: 'transparent',
};

const inputActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 12,
  justifyContent: 'flex-end',
};

const inputAddBtnStyle: React.CSSProperties = {
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
};

const inputCancelBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-card-bg)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--color-border)',
  borderRadius: 14,
  padding: '14px 20px',
  transition: 'box-shadow 0.15s, background 0.15s, border-color 0.15s',
};

const cardDoneStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border-light)',
};

const cardContentStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
};

const checkboxStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderWidth: 2,
  borderStyle: 'solid',
  borderColor: 'var(--color-checkbox-border)',
  borderRadius: 6,
  flexShrink: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s, border-color 0.15s',
};

const checkboxDoneStyle: React.CSSProperties = {
  background: 'var(--color-primary)',
  borderColor: 'var(--color-primary)',
};

const textWrapStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const textStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  color: 'var(--color-text)',
  lineHeight: 1.4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const textDoneStyle: React.CSSProperties = {
  color: 'var(--color-text-muted)',
};

const streakBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  fontSize: 11,
  fontWeight: 700,
  fontFamily: 'var(--font-body)',
  padding: '2px 8px',
  borderRadius: 10,
  color: 'var(--color-p1)',
  background: 'rgba(245, 158, 11, 0.12)',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const deleteStyle: React.CSSProperties = {
  fontSize: 18,
  color: 'var(--color-delete-icon)',
  cursor: 'pointer',
  padding: '0 2px',
  lineHeight: 1,
  userSelect: 'none',
  flexShrink: 0,
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 14,
  padding: '40px 0',
  textAlign: 'center',
};
