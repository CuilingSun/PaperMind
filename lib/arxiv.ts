export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  published: string;
  summary: string;
  pdfUrl: string;
  absUrl: string;
}

export type SortBy = 'submittedDate' | 'relevance';

export interface TrackedSearch {
  id: string;
  keyword: string;
  author?: string;
  category?: string;   // e.g. "cs.CV"
  yearFrom?: number;
  yearTo?: number;
  sortBy?: SortBy;
}

export function makeSearchId(s: Omit<TrackedSearch, 'id'>): string {
  return [s.keyword, s.author, s.category, s.yearFrom, s.yearTo, s.sortBy]
    .filter(Boolean)
    .join('|');
}

export function searchLabel(s: TrackedSearch): string {
  const parts = [s.keyword];
  if (s.author) parts.push(s.author);
  if (s.category) parts.push(s.category);
  if (s.yearFrom && s.yearTo) parts.push(`${s.yearFrom}–${s.yearTo}`);
  else if (s.yearFrom) parts.push(`${s.yearFrom}+`);
  else if (s.yearTo) parts.push(`≤${s.yearTo}`);
  return parts.join(' · ');
}

export async function searchArxivCombined(searches: TrackedSearch[], n = 20): Promise<ArxivPaper[]> {
  if (searches.length === 0) return [];
  const keywords = searches.map(s => s.keyword).filter(Boolean);
  const params = new URLSearchParams({ kws: keywords.join('|'), n: String(n) });
  const res = await fetch(`/api/arxiv?${params.toString()}`);
  if (!res.ok) throw new Error(`arXiv search failed: ${res.status}`);
  return res.json();
}

export async function searchArxiv(search: TrackedSearch, n = 20): Promise<ArxivPaper[]> {
  const params = new URLSearchParams({ q: search.keyword, n: String(n) });
  if (search.author) params.set('author', search.author);
  if (search.category) params.set('category', search.category);
  if (search.yearFrom) params.set('yearFrom', String(search.yearFrom));
  if (search.yearTo) params.set('yearTo', String(search.yearTo));
  if (search.sortBy) params.set('sortBy', search.sortBy);

  const res = await fetch(`/api/arxiv?${params.toString()}`);
  if (!res.ok) throw new Error(`arXiv search failed: ${res.status}`);
  return res.json();
}
