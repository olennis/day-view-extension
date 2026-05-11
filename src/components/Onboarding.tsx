import { useState, useEffect, useCallback } from 'react';

const STEPS = [
  {
    target: '.col-schedule',
    title: 'Schedule',
    description: 'Google Calendar와 연동하여 오늘의 일정을 한눈에 확인하세요.',
  },
  {
    target: '.col-todo',
    title: 'Todo',
    description: '할 일을 우선순위별로 관리하고 완료 상태를 추적하세요.',
  },
  {
    target: '.col-links',
    title: 'Bookmark',
    description: '크롬 북마크를 기반으로 자주 방문하는 사이트를 그룹별로 정리하고 빠르게 접근하세요.',
  },
];

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(STEPS[step].target);
    if (!el) return;

    el.classList.add('onboarding-active');

    const rect = el.getBoundingClientRect();
    const tooltipW = 300;
    const gap = 20;
    const spaceRight = window.innerWidth - rect.right;

    const left =
      spaceRight > tooltipW + gap * 2
        ? rect.right + gap
        : rect.left - tooltipW - gap;

    setPos({
      top: rect.top + 80,
      left: Math.max(gap, left),
    });

    return () => {
      el.classList.remove('onboarding-active');
    };
  }, [step]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else onComplete();
  }, [step, onComplete]);

  if (!pos) return null;

  const current = STEPS[step];

  return (
    <div className="onboarding-backdrop" onClick={onComplete}>
      <div
        key={step}
        className="onboarding-tooltip"
        onClick={(e) => e.stopPropagation()}
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
            />
          ))}
        </div>
        <div className="onboarding-title">{current.title}</div>
        <div className="onboarding-desc">{current.description}</div>
        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={onComplete}>
            건너뛰기
          </button>
          <button className="onboarding-next" onClick={next}>
            {step < STEPS.length - 1 ? '다음' : '시작하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
