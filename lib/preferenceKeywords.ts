const KEY = 'preference-keywords';

export function getPreferenceKeywords(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function savePreferenceKeywords(keywords: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(keywords));
}
