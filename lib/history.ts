export interface HistoryEntry {
  id: string;
  title: string;
  authors?: string[];
  published?: string;
  absUrl?: string;
  summary?: string;
  report?: Record<string, Record<string, string>>; // lang -> sectionKey -> content
  source: 'arxiv' | 'upload';
  analyzedAt: string;
}

const KEY = 'arxiv-history';
const MAX = 20;

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
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // localStorage full — retry without report content
    const slim = list.slice(0, MAX).map((e) => ({ ...e, report: undefined }));
    try {
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      // ignore
    }
  }
}

export function removeHistory(id: string): void {
  const list = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}
