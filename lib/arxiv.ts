export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  affiliations: string[];   // from <arxiv:affiliation> tags; empty when not provided
  primaryCategory?: string;
  categories?: string[];
  published: string;
  summary: string;
  pdfUrl: string;
  absUrl: string;
  citedByCount?: number;    // from OpenAlex cited_by_count; absent for arXiv-only results
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

  // Run each search independently so author / category / year filters all take effect.
  const settled = await Promise.allSettled(searches.map((s) => searchArxiv(s, n)));

  const seen = new Set<string>();
  const merged: ArxivPaper[] = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const paper of result.value) {
      if (seen.has(paper.id)) continue;
      seen.add(paper.id);
      merged.push(paper);
    }
  }

  // Sort newest first, cap at n
  return merged
    .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
    .slice(0, n);
}

export async function searchOpenAlexPicks(userKeywords: string[], n = 30): Promise<ArxivPaper[]> {
  const { ELITE_INSTITUTION_IDS, DEFAULT_AREA_KEYWORDS } = await import('./eliteFilter');
  const activeKeywords = userKeywords.length > 0 ? userKeywords : DEFAULT_AREA_KEYWORDS;
  const params = new URLSearchParams({
    institutionIds: ELITE_INSTITUTION_IDS.join('|'),
    keywords: activeKeywords.join('|'),
    n: String(n),
    days: '14',
  });
  const res = await fetch(`/api/openalex?${params.toString()}`);
  if (!res.ok) throw new Error(`OpenAlex search failed: ${res.status}`);
  return res.json();
}

export async function searchArxivByCategory(category: string, n = 80): Promise<ArxivPaper[]> {
  if (!category) return [];
  const params = new URLSearchParams({
    rawQuery: `cat:${encodeURIComponent(category)}`,
    sortBy: 'submittedDate',
    n: String(n),
  });
  const res = await fetch(`/api/arxiv?${params.toString()}`);
  if (!res.ok) throw new Error(`arXiv search failed: ${res.status}`);
  return res.json();
}

export async function searchArxivByCategories(categories: string[], n = 80): Promise<ArxivPaper[]> {
  if (categories.length === 0) return [];
  const rawQuery = categories.map((category) => `cat:${encodeURIComponent(category)}`).join('+OR+');
  const params = new URLSearchParams({
    rawQuery,
    sortBy: 'submittedDate',
    n: String(n),
  });
  const res = await fetch(`/api/arxiv?${params.toString()}`);
  if (!res.ok) throw new Error(`arXiv search failed: ${res.status}`);
  return res.json();
}

export async function searchInstitutionPapers(n = 100): Promise<ArxivPaper[]> {
  const { ELITE_INSTITUTION_IDS } = await import('./eliteFilter');
  const params = new URLSearchParams({
    institutionIds: ELITE_INSTITUTION_IDS.join('|'),
    days: '14',
    n: String(n),
  });
  const res = await fetch(`/api/openalex?${params.toString()}`);
  if (!res.ok) throw new Error(`OpenAlex search failed: ${res.status}`);
  return res.json();
}


export async function searchArxivOr(keywords: string[], n = 20): Promise<ArxivPaper[]> {
  if (keywords.length === 0) return [];
  const params = new URLSearchParams({ kws: keywords.join('|'), join: 'or', sortBy: 'submittedDate', n: String(n) });
  const res = await fetch(`/api/arxiv?${params.toString()}`);
  if (!res.ok) throw new Error(`arXiv search failed: ${res.status}`);
  return res.json();
}

export async function enrichArxivPapersWithSemanticScholar(papers: ArxivPaper[]): Promise<ArxivPaper[]> {
  const toEnrich = papers.filter((p) => p.id);
  if (toEnrich.length === 0) return papers;

  const ids = toEnrich.map((p) => p.id);
  let s2Map: Record<string, { affiliations: string[]; citationCount?: number }> = {};
  try {
    const params = new URLSearchParams({ ids: ids.join('|') });
    const res = await fetch(`/api/semanticscholar?${params.toString()}`);
    if (res.ok) s2Map = await res.json();
  } catch {
    // fail silently — S2 enrichment is best-effort
  }

  return papers.map((paper) => {
    const s2 = s2Map[paper.id];
    if (!s2) return paper;
    return {
      ...paper,
      affiliations: s2.affiliations.length > 0 ? s2.affiliations : paper.affiliations,
      citedByCount: s2.citationCount ?? paper.citedByCount,
    };
  });
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
