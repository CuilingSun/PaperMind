import { NextRequest, NextResponse } from 'next/server';

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function extractAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const results: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1].replace(/<[^>]+>/g, '').trim());
  }
  return results;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q        = sp.get('q')?.trim();
  // kws: pipe-separated list of keywords to AND together (e.g. "image generation|diffusion model")
  const kws      = sp.get('kws')?.split('|').map(k => k.trim()).filter(Boolean) ?? [];
  const author   = sp.get('author')?.trim();
  const category = sp.get('category')?.trim();
  const yearFrom = parseInt(sp.get('yearFrom') || '', 10);
  const yearTo   = parseInt(sp.get('yearTo')   || '', 10);
  const sortBy   = sp.get('sortBy') === 'relevance' ? 'relevance' : 'submittedDate';
  const n        = Math.min(parseInt(sp.get('n') || '20', 10), 50);

  if (!q && kws.length === 0 && !author && !category) {
    return NextResponse.json({ error: 'at least one search term required' }, { status: 400 });
  }

  // Build compound search_query
  const parts: string[] = [];
  if (kws.length > 0) {
    kws.forEach(kw => parts.push(`all:${encodeURIComponent(kw)}`));
  } else if (q) {
    parts.push(`all:${encodeURIComponent(q)}`);
  }
  if (author)   parts.push(`au:${encodeURIComponent(author)}`);
  if (category) parts.push(`cat:${encodeURIComponent(category)}`);

  let searchQuery = parts.join('+AND+');

  if (!isNaN(yearFrom) || !isNaN(yearTo)) {
    const from = !isNaN(yearFrom) ? `${yearFrom}0101` : '19910101';
    const to   = !isNaN(yearTo)   ? `${yearTo}1231`   : '20991231';
    searchQuery += `+AND+submittedDate:[${from}+TO+${to}]`;
  }

  const url =
    `https://export.arxiv.org/api/query?search_query=${searchQuery}` +
    `&sortBy=${sortBy}&sortOrder=descending&start=0&max_results=${n}`;

  const res = await fetch(url, { headers: { 'User-Agent': 'PaperMind/1.0' } });
  if (!res.ok) {
    return NextResponse.json({ error: 'arXiv error' }, { status: res.status });
  }

  const xml = await res.text();
  const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
  const papers = [];
  let m;

  while ((m = entryRe.exec(xml)) !== null) {
    const entry = m[1];
    const rawId = extractTag(entry, 'id');
    const id = rawId.replace(/.*\/abs\//, '').replace(/v\d+$/, '');
    const title = extractTag(entry, 'title').replace(/\s+/g, ' ');
    const published = extractTag(entry, 'published').slice(0, 10);
    const summary = extractTag(entry, 'summary').replace(/\s+/g, ' ');
    const authors = extractAll(entry, 'name');

    papers.push({
      id,
      title,
      authors,
      published,
      summary,
      pdfUrl: `https://arxiv.org/pdf/${id}`,
      absUrl: `https://arxiv.org/abs/${id}`,
    });
  }

  return NextResponse.json(papers);
}
