import { CalendarEvent } from '../types';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export async function fetchTodayEvents(token: string): Promise<CalendarEvent[]> {
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
    `${CALENDAR_API_BASE}/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error(`Calendar API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.items ?? [])
    .filter((item: any) => item.start?.dateTime)
    .map((item: any): CalendarEvent => ({
      id: item.id,
      summary: item.summary ?? '(No title)',
      start: item.start.dateTime,
      end: item.end.dateTime,
      hangoutLink: item.hangoutLink,
      location: item.location,
    }));
}

export function getNextEvent(events: CalendarEvent[]): CalendarEvent | null {
  const now = Date.now();
  return (
    events.find((e) => new Date(e.start).getTime() > now) ?? null
  );
}

export function getCurrentEvent(events: CalendarEvent[]): CalendarEvent | null {
  const now = Date.now();
  return (
    events.find(
      (e) =>
        new Date(e.start).getTime() <= now &&
        new Date(e.end).getTime() > now,
    ) ?? null
  );
}

export function getMinutesUntil(isoDate: string): number {
  return Math.max(0, Math.round((new Date(isoDate).getTime() - Date.now()) / 60000));
}
