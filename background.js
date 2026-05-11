const ALARM_CALENDAR = 'calendar-poll';
const ALARM_ARCHIVE = 'midnight-archive';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// ─── Install / Startup ───

chrome.runtime.onInstalled.addListener(() => {
  setupAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
});

function setupAlarms() {
  // Calendar polling: 5분 간격
  chrome.alarms.create(ALARM_CALENDAR, { periodInMinutes: 5 });
  // Midnight archive: 매일 자정
  scheduleMidnightAlarm();
}

function scheduleMidnightAlarm() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  chrome.alarms.create(ALARM_ARCHIVE, { delayInMinutes: msUntilMidnight / 60000 });
}

// ─── Alarm Handler ───

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_CALENDAR) {
    await fetchAndCacheCalendar();
  } else if (alarm.name === ALARM_ARCHIVE) {
    await archiveCompletedTodos();
    scheduleMidnightAlarm();
  }
});

// ─── Message Handler ───

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CONNECT_CALENDAR') {
    connectCalendar().then(sendResponse);
    return true;
  }
  if (message.type === 'DISCONNECT_CALENDAR') {
    disconnectCalendar().then(sendResponse);
    return true;
  }
});

// ─── Calendar ───

async function connectCalendar() {
  try {
    const token = await getAuthToken(true);
    if (token) {
      await chrome.storage.local.set({ oauthConnected: true });
      await fetchAndCacheUserEmail(token);
      await fetchAndCacheCalendar();
      return { success: true };
    }
    return { success: false, error: 'No token received' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function disconnectCalendar() {
  try {
    const token = await getAuthToken(false).catch(() => null);
    if (token) {
      await new Promise((resolve) =>
        chrome.identity.removeCachedAuthToken({ token }, resolve)
      );
    }
    await chrome.storage.local.set({
      oauthConnected: false,
      calendarEvents: [],
      calendarLastFetched: null,
      userEmail: null,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(token);
      }
    });
  });
}

async function fetchAndCacheUserEmail(token) {
  try {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.email) {
        await chrome.storage.local.set({ userEmail: data.email });
      }
    }
  } catch {
    // userinfo 실패해도 캘린더 연결에는 영향 없음
  }
}

async function fetchAndCacheCalendar() {
  try {
    const connected = (await chrome.storage.local.get('oauthConnected')).oauthConnected;
    if (!connected) return;

    let token;
    try {
      token = await getAuthToken(false);
    } catch {
      // Token expired — try refresh
      await new Promise((resolve) =>
        chrome.identity.removeCachedAuthToken({ token: '' }, resolve)
      );
      try {
        token = await getAuthToken(false);
      } catch {
        // Can't auto-refresh, user needs to reconnect
        await chrome.storage.local.set({ oauthConnected: false });
        return;
      }
    }

    if (!token) return;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '20',
    });

    const response = await fetch(
      `${CALENDAR_API}/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.status === 401) {
      // Token expired mid-flight
      await chrome.storage.local.set({ oauthConnected: false });
      return;
    }

    if (!response.ok) return;

    const data = await response.json();
    const events = (data.items || [])
      .filter((item) => item.start?.dateTime)
      .map((item) => ({
        id: item.id,
        summary: item.summary || '(No title)',
        start: item.start.dateTime,
        end: item.end.dateTime,
        hangoutLink: item.hangoutLink || undefined,
        location: item.location || undefined,
      }));

    await chrome.storage.local.set({
      calendarEvents: events,
      calendarLastFetched: Date.now(),
    });
  } catch {
    // Network error — keep cached data
  }
}

// ─── TODO Archive ───

async function archiveCompletedTodos() {
  const result = await chrome.storage.local.get('todos');
  const todos = result.todos || [];
  const now = Date.now();
  const updated = todos.map((todo) => {
    if (todo.completed && !todo.archivedAt) {
      return { ...todo, archivedAt: now };
    }
    return todo;
  });
  await chrome.storage.local.set({ todos: updated });
}
