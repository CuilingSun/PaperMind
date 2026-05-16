import { NextRequest, NextResponse } from 'next/server';

const S2_BASE = 'https://api.semanticscholar.org/graph/v1';

const SERVER_CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface S2Author {
  affiliations?: string[];
}

interface S2Paper {
  paperId: string;
  citationCount?: number;
  authors?: S2Author[];
}

export interface S2Result {
  affiliations: string[];
  citationCount?: number;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ids = sp.get('ids')?.split('|').map((s) => s.trim()).filter(Boolean) ?? [];

  if (ids.length === 0) {
    return NextResponse.json({});
  }

  const cacheKey = ids.join('|');
  const hit = SERVER_CACHE.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return NextResponse.json(hit.data);
  }

  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY ?? '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  let res: Response;
  try {
    res = await fetch(`${S2_BASE}/paper/batch?fields=authors.affiliations,citationCount`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: ids.map((id) => `arXiv:${id}`) }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return NextResponse.json({ error: 'Semantic Scholar request timed out' }, { status: 503 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: `S2 ${res.status}` }, { status: res.status });
  }

  const data: (S2Paper | null)[] = await res.json();

  const result: Record<string, S2Result> = {};
  ids.forEach((id, i) => {
    const paper = data[i];
    if (!paper) return;
    const affiliations = Array.from(
      new Set(
        (paper.authors ?? [])
          .flatMap((a) => a.affiliations ?? [])
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
    if (affiliations.length > 0 || paper.citationCount != null) {
      result[id] = {
        affiliations,
        citationCount: paper.citationCount,
      };
    }
  });

  SERVER_CACHE.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
  return NextResponse.json(result);
}
