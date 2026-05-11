import { Todo, LinkGroup, CalendarEvent, DEFAULT_LINK_GROUPS } from '../types';

const STORAGE_KEYS = {
  todos: 'todos',
  linkGroups: 'linkGroups',
  calendarEvents: 'calendarEvents',
  calendarLastFetched: 'calendarLastFetched',
  oauthConnected: 'oauthConnected',
  userEmail: 'userEmail',
} as const;

export async function getTodos(): Promise<Todo[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.todos);
  return result[STORAGE_KEYS.todos] ?? [];
}

export async function setTodos(todos: Todo[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.todos]: todos });
}

export async function getLinkGroups(): Promise<LinkGroup[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.linkGroups);
  const groups = result[STORAGE_KEYS.linkGroups];
  if (!groups || groups.length === 0) {
    await setLinkGroups(DEFAULT_LINK_GROUPS);
    return DEFAULT_LINK_GROUPS;
  }
  return groups;
}

export async function setLinkGroups(groups: LinkGroup[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.linkGroups]: groups });
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.calendarEvents);
  return result[STORAGE_KEYS.calendarEvents] ?? [];
}

export async function setCalendarEvents(events: CalendarEvent[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.calendarEvents]: events });
}

export async function getCalendarLastFetched(): Promise<number | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.calendarLastFetched);
  return result[STORAGE_KEYS.calendarLastFetched] ?? null;
}

export async function setCalendarLastFetched(timestamp: number): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.calendarLastFetched]: timestamp });
}

export async function getOAuthConnected(): Promise<boolean> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.oauthConnected);
  return result[STORAGE_KEYS.oauthConnected] ?? false;
}

export async function setOAuthConnected(connected: boolean): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.oauthConnected]: connected });
}

export async function getUserEmail(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.userEmail);
  return result[STORAGE_KEYS.userEmail] ?? null;
}

export async function setUserEmail(email: string | null): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.userEmail]: email });
}

export { STORAGE_KEYS };
