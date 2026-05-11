export interface Todo {
  id: string;
  text: string;
  description?: string;
  priority: 'P0' | 'P1' | 'P2' | null;
  completed: boolean;
  createdAt: number;
  completedAt: number | null;
  archivedAt: number | null;
}

export interface LinkItem {
  id: string;
  name: string;
  url: string;
  favicon: string;
}

export interface LinkGroup {
  id: string;
  name: string;
  order: number;
  links: LinkItem[];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  hangoutLink?: string;
  location?: string;
}

export const PRIORITY_ORDER: Record<string, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
};

export const PRIORITY_COLORS: Record<string, string> = {
  P0: '#DC2626',
  P1: '#F59E0B',
  P2: '#5200E1',
};

export const PRIORITY_LABELS: Record<string, string> = {
  P0: 'high',
  P1: 'medium',
  P2: 'low',
};

export const PRIORITY_BG_COLORS: Record<string, string> = {
  P0: '#FEF2F2',
  P1: '#FFFBEB',
  P2: '#F5F3FF',
};

export const DEFAULT_LINK_GROUPS: LinkGroup[] = [
  {
    id: 'default-dev',
    name: 'Development',
    order: 0,
    links: [
      { id: 'default-github', name: 'GitHub', url: 'https://github.com', favicon: '' },
      { id: 'default-jira', name: 'Jira', url: 'https://jira.atlassian.com', favicon: '' },
    ],
  },
  {
    id: 'default-comm',
    name: 'Communication',
    order: 1,
    links: [
      { id: 'default-slack', name: 'Slack', url: 'https://slack.com', favicon: '' },
      { id: 'default-notion', name: 'Notion', url: 'https://notion.so', favicon: '' },
    ],
  },
  {
    id: 'default-mon',
    name: 'Monitoring',
    order: 2,
    links: [
      { id: 'default-grafana', name: 'Grafana', url: 'https://grafana.com', favicon: '' },
      { id: 'default-sentry', name: 'Sentry', url: 'https://sentry.io', favicon: '' },
    ],
  },
];
