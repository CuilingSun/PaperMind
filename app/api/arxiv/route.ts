import { NextRequest, NextResponse } from 'next/server';

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function extractPrimaryCategory(entryXml: string): string {
  const m = entryXml.match(/<arxiv:primary_category[^>]*term="([^"]+)"/i);
  return m?.[1]?.trim() ?? '';
}

function extractCategories(entryXml: string): string[] {
  const matches = Array.from(
    entryXml.matchAll(/<category[^>]*term="([^"]+)"[^>]*\/?>/gi),
    (match) => match[1]?.trim()
  ).filter(Boolean) as string[];

  return Array.from(new Set(matches));
}


export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q        = sp.get('q')?.trim();
  // kws: pipe-separated list of keywords to AND together (e.g. "image generation|diffusion model")
  const kws      = sp.get('kws')?.split('|').map(k => k.trim()).filter(Boolean) ?? [];
  const joinOp   = sp.get('join') === 'or' ? '+OR+' : '+AND+';
  const author   = sp.get('author')?.trim();
  const category = sp.get('category')?.trim();
  const yearFrom = parseInt(sp.get('yearFrom') || '', 10);
  const yearTo   = parseInt(sp.get('yearTo')   || '', 10);
  const sortBy   = sp.get('sortBy') === 'relevance' ? 'relevance' : 'submittedDate';
  const n        = Math.min(parseInt(sp.get('n') || '20', 10), 100);

  const rawQuery = sp.get('rawQuery')?.trim();

  if (!rawQuery && !q && kws.length === 0 && !author && !category) {
    return NextResponse.json({ error: 'at least one search term required' }, { status: 400 });
  }

  // Build compound search_query (rawQuery bypasses all param parsing)
  const parts: string[] = [];
  if (kws.length > 0) {
    kws.forEach(kw => parts.push(`all:${encodeURIComponent(kw)}`));
  } else if (q) {
    parts.push(`all:${encodeURIComponent(q)}`);
  }
  if (author)   parts.push(`au:${encodeURIComponent(author)}`);
  if (category) parts.push(`cat:${encodeURIComponent(category)}`);

  let searchQuery = rawQuery ?? parts.join(joinOp);

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
    const primaryCategory = extractPrimaryCategory(entry);
    const categories = extractCategories(entry);

    // Extract author names and their affiliations from <author> blocks
    const authorRe = /<author>([\s\S]*?)<\/author>/gi;
    const authors: string[] = [];
    const affiliationSet = new Set<string>();
    let am;
    while ((am = authorRe.exec(entry)) !== null) {
      const block = am[1];
      const name = extractTag(block, 'name');
      if (name) authors.push(name);
      // arxiv:affiliation may or may not be present
      const aff = extractTag(block, 'arxiv:affiliation') || extractTag(block, 'affiliation');
      if (aff) affiliationSet.add(aff);
    }

    papers.push({
      id,
      title,
      authors,
      affiliations: Array.from(affiliationSet),
      primaryCategory,
      categories,
      published,
      summary,
      pdfUrl: `https://arxiv.org/pdf/${id}`,
      absUrl: `https://arxiv.org/abs/${id}`,
    });
  }

  return NextResponse.json(papers);
}
