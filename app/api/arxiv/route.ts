import { NextRequest, NextResponse } from 'next/server';

// Server-side cache: persists within one Node.js process, avoiding repeated arXiv calls.
const SERVER_CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const SERVER_CACHE_TTL = 90 * 60 * 1000; // 90 minutes

// ── LaTeX cleanup ─────────────────────────────────────────────────────────────

function stripLatex(text: string): string {
  let s = text;
  // Iteratively unwrap \command{content} — handles nesting like \textbf{\emph{x}}
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(/\\[a-zA-Z]+\{([^{}]*)\}/g, '$1');
  }
  // Strip remaining bare commands (\alpha, \,, \; etc.)
  s = s.replace(/\\[a-zA-Z]+\b/g, '');
  s = s.replace(/\\[^a-zA-Z\s]/g, ' ');
  // Strip math delimiters ($$...$$  and  $...$)
  s = s.replace(/\$\$[^$]*\$\$/g, '').replace(/\$[^$]*\$/g, '');
  // Remove stray braces left over
  s = s.replace(/[{}]/g, '');
  // Normalise whitespace
  return s.replace(/\s{2,}/g, ' ').trim();
}

// ── XML helpers ──────────────────────────────────────────────────────────────

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

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function timedFetch(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': 'PaperMind/1.0 (personal research tool)' },
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── RSS path (used for single-category Today's Picks) ────────────────────────

function parseRssDate(pubDate: string): string {
  // "Thu, 07 May 2026 00:00:00 -0400" → "2026-05-07"
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function parseRssItems(xml: string, feedCategory: string) {
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  const papers = [];
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const item = m[1];

    // ID from guid: "oai:arXiv.org:2605.02910v2" → "2605.02910"
    const guidRaw = extractTag(item, 'guid');
    const id = guidRaw.replace(/^oai:arXiv\.org:/, '').replace(/v\d+$/, '');
    if (!id) continue;

    const title = stripLatex(extractTag(item, 'title').replace(/\s+/g, ' '));

    // Authors from dc:creator (comma-separated)
    const creatorRaw = item.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/i);
    const authors = creatorRaw
      ? creatorRaw[1].replace(/<[^>]+>/g, '').trim().split(/,\s*/).filter(Boolean)
      : [];

    // Abstract: strip the "arXiv:XXXX Announce Type: X\nAbstract: " preamble, then clean LaTeX
    const descRaw = extractTag(item, 'description');
    const summary = stripLatex(
      descRaw.replace(/^arXiv:\S+\s+Announce Type:\s*\S+\s*Abstract:\s*/i, '').replace(/\s+/g, ' ').trim()
    );

    // Published date
    const pubDateRaw = extractTag(item, 'pubDate');
    const published = parseRssDate(pubDateRaw);

    // Categories
    const categoryMatches = Array.from(
      item.matchAll(/<category>([^<]+)<\/category>/gi),
      (cm) => cm[1].trim()
    );
    const categories = Array.from(new Set(categoryMatches)).filter(Boolean);

    // Link (absUrl)
    const linkRaw = extractTag(item, 'link') || `https://arxiv.org/abs/${id}`;
    const absUrl = linkRaw.includes('arxiv.org') ? linkRaw : `https://arxiv.org/abs/${id}`;

    papers.push({
      id,
      title,
      authors,
      affiliations: [] as string[],
      primaryCategory: feedCategory,
      categories,
      published,
      summary,
      pdfUrl: `https://arxiv.org/pdf/${id}`,
      absUrl,
    });
  }
  return papers;
}

async function fetchViaRss(category: string) {
  const url = `https://arxiv.org/rss/${category}`;
  const cacheHit = SERVER_CACHE.get(url);
  if (cacheHit && cacheHit.expiresAt > Date.now()) return cacheHit.data;

  const res = await timedFetch(url, 10_000);
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();
  const papers = parseRssItems(xml, category);
  SERVER_CACHE.set(url, { data: papers, expiresAt: Date.now() + SERVER_CACHE_TTL });
  return papers;
}

// ── Export-API path (keyword / author / date range searches) ─────────────────

async function fetchViaExportApi(url: string) {
  const cacheHit = SERVER_CACHE.get(url);
  if (cacheHit && cacheHit.expiresAt > Date.now()) return cacheHit.data;

  let res: Response;
  try {
    res = await timedFetch(url, 20_000);
    if (res.status === 429 || res.status === 503) {
      await new Promise((r) => setTimeout(r, 3_000));
      res = await timedFetch(url, 20_000);
    }
  } catch {
    throw new Error('arXiv request timed out');
  }
  if (!res.ok) throw new Error(`arXiv ${res.status}`);

  const xml = await res.text();
  const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
  const papers = [];
  let m;
  while ((m = entryRe.exec(xml)) !== null) {
    const entry = m[1];
    const rawId = extractTag(entry, 'id');
    const id = rawId.replace(/.*\/abs\//, '').replace(/v\d+$/, '');
    const title = stripLatex(extractTag(entry, 'title').replace(/\s+/g, ' '));
    const published = extractTag(entry, 'published').slice(0, 10);
    const summary = stripLatex(extractTag(entry, 'summary').replace(/\s+/g, ' '));
    const primaryCategory = extractPrimaryCategory(entry);
    const categories = extractCategories(entry);

    const authorRe = /<author>([\s\S]*?)<\/author>/gi;
    const authors: string[] = [];
    const affiliationSet = new Set<string>();
    let am;
    while ((am = authorRe.exec(entry)) !== null) {
      const block = am[1];
      const name = extractTag(block, 'name');
      if (name) authors.push(name);
      const aff = extractTag(block, 'arxiv:affiliation') || extractTag(block, 'affiliation');
      if (aff) affiliationSet.add(aff);
    }

    papers.push({
      id, title, authors,
      affiliations: Array.from(affiliationSet),
      primaryCategory, categories, published, summary,
      pdfUrl: `https://arxiv.org/pdf/${id}`,
      absUrl: `https://arxiv.org/abs/${id}`,
    });
  }

  SERVER_CACHE.set(url, { data: papers, expiresAt: Date.now() + SERVER_CACHE_TTL });
  return papers;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q        = sp.get('q')?.trim();
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

  // Use RSS for pure single-category queries (Today's Picks) — no rate limits.
  const rssMatch = rawQuery?.match(/^cat:([a-z]+\.[a-zA-Z]+)$/i);
  if (rssMatch && kws.length === 0 && !q && !author && isNaN(yearFrom) && isNaN(yearTo)) {
    try {
      const papers = await fetchViaRss(rssMatch[1]);
      return NextResponse.json(papers);
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 503 });
    }
  }

  // All other queries go through the arXiv export API.
  const parts: string[] = [];
  if (kws.length > 0) {
    kws.forEach(kw => {
      const words = kw.split(/\s+/).filter(Boolean);
      parts.push(words.map(w => `all:${encodeURIComponent(w)}`).join('+AND+'));
    });
  } else if (q) {
    const words = q.split(/\s+/).filter(Boolean);
    parts.push(words.map(w => `all:${encodeURIComponent(w)}`).join('+AND+'));
  }
  if (author)   parts.push(`au:${encodeURIComponent(author)}`);
  if (category) parts.push(`cat:${encodeURIComponent(category)}`);

  let searchQuery = rawQuery ?? parts.join(joinOp);
  if (!isNaN(yearFrom) || !isNaN(yearTo)) {
    const from = !isNaN(yearFrom) ? `${yearFrom}0101` : '19910101';
    const to   = !isNaN(yearTo)   ? `${yearTo}1231`   : '20991231';
    searchQuery += `+AND+submittedDate:[${from}+TO+${to}]`;
  }

  const exportUrl =
    `https://export.arxiv.org/api/query?search_query=${searchQuery}` +
    `&sortBy=${sortBy}&sortOrder=descending&start=0&max_results=${n}`;

  try {
    const papers = await fetchViaExportApi(exportUrl);
    return NextResponse.json(papers);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 });
  }
}
