import { NextRequest, NextResponse } from 'next/server';

function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string {
  if (!invertedIndex) return '';
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.filter(Boolean).join(' ');
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const institutionIds = sp.get('institutionIds') ?? '';
  const keywords       = sp.get('keywords') ?? '';
  const days = Math.min(parseInt(sp.get('days') || '14', 10), 60);
  const n    = Math.min(parseInt(sp.get('n')    || '20', 10), 100);

  const today = new Date().toISOString().slice(0, 10);
  const filterParts: string[] = [
    `from_publication_date:${daysAgo(days)}`,
    `to_publication_date:${today}`,
  ];
  if (institutionIds) {
    // IDs are plain alphanumeric — no encoding needed; | = OR within field
    const ids = institutionIds.split('|').map((i) => i.trim()).filter(Boolean).join('|');
    filterParts.push(`institutions.id:${ids}`);
  }

  const selectFields = 'id,title,publication_date,authorships,abstract_inverted_index,ids,open_access';
  const searchParam  = keywords
    ? `&search=${encodeURIComponent(keywords.replace(/\|/g, ' OR '))}`
    : '';

  const url =
    `https://api.openalex.org/works` +
    `?filter=${filterParts.join(',')}` +
    `&sort=publication_date:desc` +
    `&per_page=${n}` +
    `&select=${selectFields}` +
    `&mailto=papermind-app%40example.com` +
    searchParam;

  console.log('[openalex] fetching:', url);

  let res: Response;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'PaperMind/1.0' } });
  } catch (err) {
    console.error('[openalex] fetch error:', err);
    return NextResponse.json({ error: 'Network error reaching OpenAlex' }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[openalex] API error:', res.status, body.slice(0, 500));
    return NextResponse.json(
      { error: `OpenAlex error ${res.status}`, detail: body.slice(0, 500) },
      { status: res.status }
    );
  }

  let data: { results?: unknown[] };
  try {
    data = await res.json();
  } catch (err) {
    console.error('[openalex] JSON parse error:', err);
    return NextResponse.json({ error: 'Invalid JSON from OpenAlex' }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const papers = (data.results ?? []).map((w: any) => {
    const arxivRaw: string = w.ids?.arxiv ?? '';
    const arxivId = arxivRaw
      .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
      .replace(/v\d+$/, '');

    const affiliations: string[] = Array.from(
      new Set<string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (w.authorships ?? []).flatMap((a: any) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a.institutions ?? []).map((i: any) => i.display_name as string)
        ).filter(Boolean)
      )
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authors: string[] = (w.authorships ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => a.author?.display_name ?? '')
      .filter(Boolean);

    return {
      id: arxivId || w.id,
      title: (w.title ?? '').replace(/\s+/g, ' '),
      authors,
      affiliations,
      published: w.publication_date ?? '',
      summary: reconstructAbstract(w.abstract_inverted_index),
      pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}` : (w.open_access?.oa_url ?? ''),
      absUrl: arxivId ? `https://arxiv.org/abs/${arxivId}` : w.id,
    };
  });

  return NextResponse.json(papers);
}
