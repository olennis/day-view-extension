import { useState, useCallback, useRef, type ReactNode } from 'react';
import { Todo, PRIORITY_ORDER, PRIORITY_LABELS, PRIORITY_COLORS, PRIORITY_BG_COLORS } from '../types';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { getTodos, setTodos } from '../services/storage';

const ONBOARDING_TODOS: Todo[] = [
  { id: 'ob-1', text: '주간 리포트 작성', priority: 'P0', completed: false, createdAt: Date.now(), completedAt: null, archivedAt: null },
  { id: 'ob-2', text: 'API 문서 업데이트', priority: 'P1', completed: false, createdAt: Date.now(), completedAt: null, archivedAt: null },
  { id: 'ob-3', text: '코드 리뷰 피드백 반영', priority: 'P2', completed: false, createdAt: Date.now(), completedAt: null, archivedAt: null },
  { id: 'ob-4', text: 'PR 머지 후 배포 확인', priority: 'P1', completed: false, createdAt: Date.now(), completedAt: null, archivedAt: null },
  { id: 'ob-5', text: '스탠드업 미팅 노트 정리', priority: null, completed: true, createdAt: Date.now() - 3600000, completedAt: Date.now(), archivedAt: null },
  { id: 'ob-6', text: '디자인 시스템 컴포넌트 검토', priority: 'P1', completed: true, createdAt: Date.now() - 7200000, completedAt: Date.now(), archivedAt: null },
];

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    // 완료된 태스크는 하단
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    // 우선순위 정렬 (P0 > P1 > P2 > null)
    const pa = a.priority ? PRIORITY_ORDER[a.priority] ?? 99 : 99;
    const pb = b.priority ? PRIORITY_ORDER[b.priority] ?? 99 : 99;
    if (pa !== pb) return pa - pb;
    // 동일 우선순위: 생성 순서
    return a.createdAt - b.createdAt;
  });
}

const N = (n: number) => <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{n}</span>;

function getInsightMessage(rate: number, pending: number): ReactNode {
  if (rate === 0) return <>{N(pending)}개의 할 일이 기다리고 있어요. 첫 번째 완료를 향해 시작해 볼까요?</>;
  if (rate <= 10) return <>아직 시작 단계예요. 작은 것부터 하나씩 해치워 보세요.</>;
  if (rate <= 20) return <>조금씩 움직이고 있어요. 흐름을 이어가 보세요.</>;
  if (rate <= 30) return <>좋은 출발이에요! 남은 {N(pending)}개도 충분히 해낼 수 있어요.</>;
  if (rate <= 40) return <>거의 절반 가까이 왔어요. 페이스를 유지해 보세요.</>;
  if (rate <= 50) return <>절반을 넘겼어요! 가장 중요한 것에 집중해 보세요.</>;
  if (rate <= 60) return <>잘 진행되고 있어요. 우선순위 높은 항목부터 마무리해 보세요.</>;
  if (rate <= 70) return <>훌륭해요! 남은 {N(pending)}개만 정리하면 돼요.</>;
  if (rate <= 80) return <>거의 다 왔어요. 마지막 스퍼트를 올려 보세요!</>;
  if (rate <= 90) return <>막바지예요! 조금만 더 힘내면 끝이에요.</>;
  return <>모든 할 일을 완료했어요. 수고했습니다!</>;
}

export default function TodoPanel({ isOnboarding }: { isOnboarding?: boolean }) {
  const [todos, setTodosState, rawLoading] = useChromeStorage<Todo[]>(
    'todos',
    getTodos,
    setTodos,
    [],
  );
  const [showInput, setShowInput] = useState(false);
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<Todo['priority']>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loading = isOnboarding ? false : rawLoading;
  const activeTodos = isOnboarding ? ONBOARDING_TODOS : todos.filter((t) => !t.archivedAt);
  const sorted = sortTodos(activeTodos);
  const completedCount = activeTodos.filter((t) => t.completed).length;
  const totalCount = activeTodos.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const addTodo = useCallback(async () => {
    const text = newText.trim();
    if (!text) return;
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      priority: newPriority,
      completed: false,
      createdAt: Date.now(),
      completedAt: null,
      archivedAt: null,
    };
    await setTodosState((prev) => [...prev, todo]);
    setNewText('');
    setNewPriority(null);
    setShowInput(false);
  }, [newText, newPriority, setTodosState]);

  const toggleTodo = useCallback(
    async (id: string) => {
      await setTodosState((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? Date.now() : null,
              }
            : t,
        ),
      );
    },
    [setTodosState],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      await setTodosState((prev) => prev.filter((t) => t.id !== id));
    },
    [setTodosState],
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const pendingCount = totalCount - completedCount;

  return (
    <div style={{ padding: 0 }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>TODO</h2>
          <span style={dateStyle}>{dateStr}</span>
        </div>
        <button
          onClick={() => {
            setShowInput(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          style={newTaskBtnStyle}
        >
          + NEW TASK
        </button>
      </div>

      {/* Inline input (shown when + NEW TASK clicked) */}
      {showInput && (
        <div style={inputCardStyle}>
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) addTodo();
              if (e.key === 'Escape') { setShowInput(false); setNewText(''); }
            }}
            placeholder="What needs to be done?"
            style={inputStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <div style={priorityToggleGroupStyle}>
              {(['P0', 'P1', 'P2'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setNewPriority(newPriority === p ? null : p)}
                  style={{
                    ...priorityToggleBtnStyle,
                    ...(newPriority === p
                      ? { background: PRIORITY_BG_COLORS[p], color: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }
                      : {}),
                  }}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={addTodo} style={inputAddBtnStyle}>Add</button>
            <button
              onClick={() => { setShowInput(false); setNewText(''); setNewPriority(null); }}
              style={inputCancelBtnStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div style={taskListStyle}>
        {loading ? (
          <p style={emptyStyle}>Loading...</p>
        ) : sorted.length === 0 && !showInput ? (
          <p style={emptyStyle}>Add your first task</p>
        ) : (
          sorted.map((todo) => (
            <div
              key={todo.id}
              onClick={() => toggleTodo(todo.id)}
              style={{
                ...cardStyle,
                ...(todo.completed ? cardCompletedStyle : {}),
                cursor: 'pointer',
              }}
            >
              <div style={cardContentStyle}>
                <div
                  style={{
                    ...checkboxStyle,
                    ...(todo.completed ? checkboxDoneStyle : {}),
                  }}
                >
                  {todo.completed && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        ...todoTextStyle,
                        ...(todo.completed ? todoTextDoneStyle : {}),
                      }}
                    >
                      {todo.text}
                    </span>
                    {todo.priority && !todo.completed && (
                      <span
                        style={{
                          ...priorityBadgeStyle,
                          color: PRIORITY_COLORS[todo.priority],
                          background: PRIORITY_BG_COLORS[todo.priority],
                        }}
                      >
                        {PRIORITY_LABELS[todo.priority]}
                      </span>
                    )}
                  </div>
                  {todo.description && !todo.completed && (
                    <span style={descriptionStyle}>{todo.description}</span>
                  )}
                </div>
                <span
                  onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
                  style={deleteStyle}
                >
                  ×
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom stats row */}
      {totalCount > 0 && (
        <div style={bottomRowStyle}>
          <div style={insightsCardStyle}>
            <span style={insightsLabelStyle}>BACKLOG INSIGHTS</span>
            <p style={insightsTextStyle}>
              {getInsightMessage(completionRate, pendingCount)}
            </p>
          </div>
          <div style={rateCardStyle}>
            <span style={rateLabelStyle}>TASK COMPLETION RATE</span>
            <div style={rateTopRowStyle}>
              <span style={rateValueStyle}>{completionRate}%</span>
              {completionRate >= 100 ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path
                    d="M9 12L11 14L15 10"
                    stroke="var(--color-success)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="var(--color-success)"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path
                    d="M3 17L9 11L13 15L21 7"
                    stroke="var(--color-primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 7H21V12"
                    stroke="var(--color-primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 28,
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-headline)',
  fontSize: 28,
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: 0,
  lineHeight: 1.2,
};

const dateStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-muted)',
  marginTop: 4,
  display: 'block',
};

const newTaskBtnStyle: React.CSSProperties = {
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

const taskListStyle: React.CSSProperties = {
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
  padding: '16px 20px',
  transition: 'box-shadow 0.15s',
};

const cardCompletedStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-primary)',
};

const cardContentStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
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
  marginTop: 1,
  transition: 'background 0.15s, border-color 0.15s',
};

const checkboxDoneStyle: React.CSSProperties = {
  background: 'var(--color-primary)',
  borderColor: 'var(--color-primary)',
};

const todoTextStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  color: 'var(--color-text)',
  lineHeight: 1.4,
};

const todoTextDoneStyle: React.CSSProperties = {
  textDecoration: 'line-through',
  color: 'var(--color-text-muted)',
};

const priorityToggleGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
};

const priorityToggleBtnStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  padding: '4px 10px',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  cursor: 'pointer',
  letterSpacing: '0.3px',
  transition: 'all 0.15s',
};

const priorityBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  padding: '2px 8px',
  borderRadius: 10,
  letterSpacing: '0.3px',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-muted)',
  marginTop: 4,
  display: 'block',
  lineHeight: 1.4,
};

const deleteStyle: React.CSSProperties = {
  fontSize: 18,
  color: 'var(--color-delete-icon)',
  cursor: 'pointer',
  padding: '0 2px',
  lineHeight: 1,
  userSelect: 'none',
  flexShrink: 0,
  marginTop: 1,
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 14,
  padding: '40px 0',
  textAlign: 'center',
};

/* Bottom stats */

const bottomRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginTop: 24,
};

const insightsCardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  borderRadius: 14,
  padding: 20,
  minHeight: 140,
};

const insightsLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  letterSpacing: '0.5px',
  display: 'block',
  marginBottom: 8,
};

const insightsTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-muted)',
  lineHeight: 1.5,
  margin: 0,
};

const rateCardStyle: React.CSSProperties = {
  background: 'var(--color-card-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 14,
  padding: 20,
  minHeight: 140,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
};

const rateTopRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const rateValueStyle: React.CSSProperties = {
  fontSize: 64,
  fontWeight: 700,
  color: 'var(--color-primary)',
  fontFamily: 'var(--font-headline)',
  lineHeight: 1,
};

const rateLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  letterSpacing: '0.5px',
  marginBottom: 8,
};
