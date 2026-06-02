import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '../types';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { getMinutesUntil, getNextEvent } from '../services/calendar';
import {
  getCalendarEvents,
  setCalendarEvents,
  getOAuthConnected,
  setOAuthConnected,
  getUserEmail,
  setUserEmail,
} from '../services/storage';

const DEV_MOCK_EMAIL = 'dev@spacecloud.kr';

function createMockEvents(): CalendarEvent[] {
  const today = new Date();
  const d = (h: number, m = 0) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m).toISOString();

  return [
    { id: 'mock-1', summary: 'Daily Sync', start: d(9, 0), end: d(9, 30) },
    { id: 'mock-2', summary: '\uD300 \uC704\uD074\uB9AC \uC2A4\uD0E0\uB4DC\uC5C5', start: d(10, 30), end: d(11, 0), hangoutLink: 'https://meet.google.com/mock', location: 'Zoom Meeting #301' },
    { id: 'mock-3', summary: '\uB514\uC790\uC778 \uC2DC\uC2A4\uD15C \uD611\uC758', start: d(13, 0), end: d(14, 0) },
    { id: 'mock-4', summary: '\uCF54\uB4DC \uB9AC\uBDF0 \uC138\uC158', start: d(15, 0), end: d(16, 0), hangoutLink: 'https://meet.google.com/mock2' },
  ];
}

function createOnboardingMockEvents(): CalendarEvent[] {
  const now = new Date();
  const d = (offsetMin: number) =>
    new Date(now.getTime() + offsetMin * 60000).toISOString();

  return [
    { id: 'ob-1', summary: 'Daily Standup', start: d(-120), end: d(-90) },
    { id: 'ob-2', summary: '\uD300 \uC704\uD074\uB9AC \uC2A4\uD0E0\uB4DC\uC5C5', start: d(-60), end: d(-30), location: 'Meeting Room A' },
    { id: 'ob-3', summary: '\uB514\uC790\uC778 \uC2DC\uC2A4\uD15C \uD611\uC758', start: d(-10), end: d(50), hangoutLink: 'https://meet.google.com/mock' },
    { id: 'ob-4', summary: '\uCF54\uB4DC \uB9AC\uBDF0 \uC138\uC158', start: d(60), end: d(120), hangoutLink: 'https://meet.google.com/mock2' },
    { id: 'ob-5', summary: '\uC2A4\uD504\uB9B0\uD2B8 \uB9AC\uBDF0', start: d(180), end: d(240), location: 'Conference Room #301' },
    { id: 'ob-6', summary: '\uD300 \uD68C\uACE0', start: d(300), end: d(360) },
  ];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function Schedule({ isOnboarding }: { isOnboarding?: boolean }) {
  const isDev = import.meta.env.DEV;

  const [storedEvents, , eventsLoading] = useChromeStorage<CalendarEvent[]>(
    'calendarEvents',
    getCalendarEvents,
    setCalendarEvents,
    [],
  );
  const [oauthConnected, setConnected] = useChromeStorage<boolean>(
    'oauthConnected',
    getOAuthConnected,
    setOAuthConnected,
    false,
  );
  const [userEmail] = useChromeStorage<string | null>(
    'userEmail',
    getUserEmail,
    setUserEmail,
    null,
  );

  const effectiveEmail = isOnboarding
    ? 'id@email.com'
    : isDev && !oauthConnected ? DEV_MOCK_EMAIL : userEmail;
  const isSpaceCloudUser = effectiveEmail?.endsWith('@spacecloud.kr') ?? false;

  const events = isOnboarding
    ? createOnboardingMockEvents()
    : isDev && !oauthConnected ? createMockEvents() : storedEvents;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleConnect = useCallback(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    setConnecting(true);
    setConnectError(null);
    chrome.runtime.sendMessage(
      { type: 'CONNECT_CALENDAR' },
      (response: { success: boolean; error?: string } | undefined) => {
        setConnecting(false);
        if (response?.success) {
          setConnected(true);
        } else {
          setConnectError(response?.error ?? 'Connection failed');
        }
      },
    );
  }, [setConnected]);

  const handleDisconnect = useCallback(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    chrome.runtime.sendMessage(
      { type: 'DISCONNECT_CALENDAR' },
      () => setConnected(false),
    );
  }, [setConnected]);

  // Next Up 계산
  const nextEvent = getNextEvent(events);
  const currentEvent = events.find((e) => {
    const now = Date.now();
    return new Date(e.start).getTime() <= now && new Date(e.end).getTime() > now;
  });
  const heroEvent = currentEvent ?? nextEvent;
  const heroMinutes = heroEvent ? getMinutesUntil(heroEvent.start) : 0;
  const isHeroCurrent = heroEvent === currentEvent;

  if (eventsLoading) {
    return (
      <div className="section">
        <div className="section-header">
          <span className="section-title">SCHEDULE</span>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">SCHEDULE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(oauthConnected || isDev) && (
            <button onClick={handleDisconnect} style={disconnectButtonStyle}>
              Disconnect
            </button>
          )}
        </div>
      </div>

      {(oauthConnected || isDev || isOnboarding) && effectiveEmail && (
        <div style={connectedEmailStyle}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          {effectiveEmail}
        </div>
      )}

      {!isOnline && <div className="offline-banner">Offline</div>}

      {!oauthConnected && !isDev && !isOnboarding ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}>
            Connect your calendar to see today's schedule
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              ...connectButtonStyle,
              opacity: connecting ? 0.6 : 1,
              cursor: connecting ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {connecting ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
          {connectError && (
            <p style={{ color: '#DC2626', fontSize: 12, marginTop: 8 }}>
              {connectError}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Next Up Hero Card */}
          {heroEvent && (() => {
            const cardContent = (
              <>
              <div style={nextUpHeaderStyle}>
                <span style={nextUpLabelStyle}>
                  {isHeroCurrent ? 'Now' : `Next Up`}
                  {!isHeroCurrent && heroMinutes > 0 && ` \u2022 ${heroMinutes}\uBD84 \uD6C4`}
                </span>
              </div>
              <div style={nextUpTitleRowStyle}>
                <div style={nextUpTitleStyle}>{heroEvent.summary}</div>
                {heroEvent.hangoutLink && (
                  <span className="next-up-meet-icon" style={nextUpMeetIconStyle}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </span>
                )}
              </div>
              {heroEvent.location && (
                <div style={nextUpLocationStyle}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {heroEvent.location}
                </div>
              )}
              </>
            );
            return heroEvent.hangoutLink ? (
              <a
                className="next-up-card"
                href={heroEvent.hangoutLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                {cardContent}
              </a>
            ) : (
              <div className="next-up-card">
                {cardContent}
              </div>
            );
          })()}

          {/* Timeline */}
          {events.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, padding: '12px 0' }}>
              No meetings today
            </p>
          ) : (
            <div style={timelineContainerStyle}>
              {events.map((event, i) => {
                const now = Date.now();
                const isPast = new Date(event.end).getTime() <= now;
                const isCurrent =
                  new Date(event.start).getTime() <= now &&
                  new Date(event.end).getTime() > now;
                const isLast = i === events.length - 1;
                const hasOnlineLink = !!event.hangoutLink;

                if (isCurrent) {
                  return (
                    <div key={event.id} style={timelineRowStyle}>
                      <div style={timelineLeftStyle}>
                        <span style={currentTimeStyle}>
                          {formatTime(event.start)}
                        </span>
                        {!isLast && (
                          <div style={{ ...timelineLineStyle, background: 'var(--color-current-border)' }} />
                        )}
                      </div>
                      <div style={timelineContentStyle}>
                        <div style={timelineTitleRowStyle}>
                          <div style={{ ...timelineTitleStyle, fontWeight: 600 }}>
                            {event.summary}
                          </div>
                          {hasOnlineLink && (
                            <a
                              href={event.hangoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Google Meet 참석"
                              style={meetButtonStyle}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 7l-7 5 7 5V7z" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                              </svg>
                            </a>
                          )}
                        </div>
                        <div style={timelineStatusStyle}>
                          IN PROGRESS
                          {hasOnlineLink && ' \u2022 ONLINE'}
                          {event.location && ` \u2022 ${event.location}`}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={event.id} style={timelineRowStyle}>
                    <div style={timelineLeftStyle}>
                      <span
                        style={{
                          ...timelineTimeStyle,
                          color: isPast ? 'var(--color-timeline-past)' : 'var(--color-text-muted)',
                        }}
                      >
                        {formatTime(event.start)}
                      </span>
                      {!isLast && (
                        <div style={{ ...timelineLineStyle, background: 'var(--color-timeline-line)' }} />
                      )}
                    </div>
                    <div style={{ ...timelineContentStyle, opacity: isPast ? 0.45 : 1 }}>
                      <div style={timelineTitleRowStyle}>
                        <div style={timelineTitleStyle}>{event.summary}</div>
                        {hasOnlineLink && !isPast && (
                          <a
                            href={event.hangoutLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Google Meet 참석"
                            style={meetButtonStyle}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 7l-7 5 7 5V7z" />
                              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Meeting Room Booking + \uBE44\uBC88\uD1A1\uD1A1 */}
          {isSpaceCloudUser && (
            <>
              <a
                href="https://valueup-meetingroom.test.spacecloud.kr/"
                target="_blank"
                rel="noopener noreferrer"
                style={meetingRoomLinkStyle}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M3 21V7a2 2 0 012-2h6a2 2 0 012 2v14" />
                  <path d="M13 21V3a2 2 0 012-2h4a2 2 0 012 2v18" />
                  <path d="M7 9h2" />
                  <path d="M7 13h2" />
                  <path d="M17 5h2" />
                  <path d="M17 9h2" />
                  <path d="M17 13h2" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={meetingRoomLabelStyle}>{'\uD68C\uC758\uC2E4 \uC608\uC57D'}</div>
                  <div style={meetingRoomSubLabelStyle}>BOOK A MEETING ROOM</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </a>

              {/* 비번톡톡 — 회의실 예약과 동일한 카드 UI (아이콘은 자물쇠=비밀번호 연상) */}
              <a
                href="https://pass-opal-six.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...meetingRoomLinkStyle, marginTop: 12 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={meetingRoomLabelStyle}>{'비번톡톡'}</div>
                  <div style={meetingRoomSubLabelStyle}>PASSWORD MANAGER</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </a>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Styles ─── */

const disconnectButtonStyle: React.CSSProperties = {
  background: 'none',
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-small)',
  padding: '2px 8px',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

const connectButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  background: 'var(--color-connect-bg)',
  color: 'var(--color-connect-text)',
  border: '1px solid var(--color-connect-border)',
  borderRadius: 'var(--radius-small)',
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: "'Google Sans', Roboto, var(--font-body)",
  boxShadow: '0 1px 2px rgba(60,64,67,0.08)',
  transition: 'background 0.2s, box-shadow 0.2s',
};

const connectedEmailStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: 'var(--color-text-muted)',
  marginBottom: 8,
};

/* ─── Next Up Card ─── */

const nextUpHeaderStyle: React.CSSProperties = {
  marginBottom: 8,
};

const nextUpLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-accent)',
  letterSpacing: 0.3,
};

const nextUpTitleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
};

const nextUpTitleStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: 'var(--color-text)',
  lineHeight: 1.3,
  fontFamily: 'var(--font-headline)',
};

const nextUpMeetIconStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-accent)',
  textDecoration: 'none',
  flexShrink: 0,
  marginTop: 2,
};

const nextUpLocationStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: 'var(--color-text-secondary)',
  marginTop: 10,
};

/* ─── Timeline ─── */

const timelineContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '4px 0',
};

const timelineRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: 16,
  minHeight: 56,
};

const timelineLeftStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: 48,
  flexShrink: 0,
};

const timelineTimeStyle: React.CSSProperties = {
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  whiteSpace: 'nowrap',
};

const timelineLineStyle: React.CSSProperties = {
  width: 1.5,
  flex: 1,
  marginTop: 8,
  marginBottom: 2,
};

const timelineContentStyle: React.CSSProperties = {
  flex: 1,
  padding: '4px 0',
  minHeight: 36,
};

const currentTimeStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--color-accent)',
  fontFamily: 'var(--font-body)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const timelineTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  color: 'var(--color-text)',
  lineHeight: 1.3,
  flex: 1,
};

const timelineTitleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const meetButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid var(--color-border-light)',
  background: 'var(--color-card-bg)',
  color: 'var(--color-accent)',
  cursor: 'pointer',
  textDecoration: 'none',
  flexShrink: 0,
  opacity: 0.35,
};

const timelineStatusStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-accent)',
  letterSpacing: 0.3,
  marginTop: 4,
  textTransform: 'uppercase' as const,
};

/* ─── Meeting Room ─── */

const meetingRoomLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 24,
  padding: '16px 20px',
  border: '1.5px solid var(--color-accent)',
  borderRadius: 12,
  background: 'var(--color-card-bg)',
  textDecoration: 'none',
  color: 'var(--color-text)',
  cursor: 'pointer',
};

const meetingRoomLabelStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  fontFamily: 'var(--font-headline)',
  color: 'var(--color-text)',
};

const meetingRoomSubLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  marginTop: 2,
};
