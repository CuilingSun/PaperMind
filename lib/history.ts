export interface HistoryEntry {
  id: string;
  title: string;
  authors?: string[];
  published?: string;
  absUrl?: string;
  source: 'arxiv' | 'upload';
  analyzedAt: string;
}

const KEY = 'arxiv-history';
const MAX = 50;

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function addHistory(entry: HistoryEntry): void {
  const list = getHistory().filter((e) => e.id !== entry.id);
  list.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function removeHistory(id: string): void {
  const list = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}
