'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArxivPaper, searchArxivByCategory, searchInstitutionPapers } from '@/lib/arxiv';
import PaperCard from '@/components/PaperCard';
import { PrestigeSignal } from '@/lib/eliteFilter';
import { Lang } from '@/lib/gemini';
import {
  getActiveTodayPickKeywords,
  getDomainLabel,
  matchPaperKeywords,
  resolvePickDomains,
  resolvePrestigeLabel,
  resolvePrestigeSignals,
} from '@/lib/todaysPicks';

const CACHE_KEY = 'todays-picks-cache-v14';
const PAGE_SIZE = 6;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface ScoredPaper extends ArxivPaper {
  matchedKeywords: string[];
  prestigeSignals: PrestigeSignal[];
  prestigeLabel?: string;
  recommendationTier: 'prestige' | 'fallback';
  resolvedDomain: string;
}

interface Cache {
  key: string;
  papers: ScoredPaper[];
  fetchedAt: number;
}

interface Props {
  keywords: string[];
  lang: Lang;
  onAnalyze: (paper: ArxivPaper) => void;
  listView?: boolean;
}

function readCache(cacheKey: string): ScoredPaper[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: Cache = JSON.parse(raw);
    if (cache.key !== cacheKey) return null;
    if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) return null;
    return cache.papers;
  } catch {
    return null;
  }
}

function writeCache(cacheKey: string, papers: ScoredPaper[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ key: cacheKey, papers, fetchedAt: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

function isRecent(published: string, days = 7): boolean {
  if (!published) return false;
  const publishedAt = new Date(`${published}T00:00:00Z`).getTime();
  if (Number.isNaN(publishedAt)) return false;
  const windowStart = Date.now() - days * 24 * 60 * 60 * 1000;
  return publishedAt >= windowStart;
}

function sortPapers(a: ScoredPaper, b: ScoredPaper): number {
  if (b.prestigeSignals.length !== a.prestigeSignals.length) {
    return b.prestigeSignals.length - a.prestigeSignals.length;
  }
  if (b.matchedKeywords.length !== a.matchedKeywords.length) {
    return b.matchedKeywords.length - a.matchedKeywords.length;
  }
  return new Date(b.published).getTime() - new Date(a.published).getTime();
}

const SparkleIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5z"/>
  </svg>
);

const ChevRight = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export default function TodaysPicks({ keywords, lang, onAnalyze, listView = false }: Props) {
  const [pool, setPool] = useState<ScoredPaper[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isKeywordFallback, setIsKeywordFallback] = useState(false);
  const zh = lang === 'zh';

  const papers = pool.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(pool.length / PAGE_SIZE);

  const activeKeywords = getActiveTodayPickKeywords(keywords);
  const hasTextKeywords = activeKeywords.length > 0;
  const resolvedDomains = useMemo(() => resolvePickDomains(keywords), [keywords]);
  const isMixedDefaultMode = keywords.length === 0;
  const resolvedDomain = resolvedDomains[0];
  const cacheKey = `${resolvedDomains.join('|')}::${activeKeywords.join('|')}::tiered-prestige-v2`;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setPage(0);
      setIsKeywordFallback(false);

      const cached = readCache(cacheKey);
      if (cached && cached.length > 0) {
        setError('');
        setPool(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Stagger domain requests 1 s apart to avoid arXiv rate limits; use allSettled so
        // a single failed domain doesn't discard results from the others.
        const stagger = (i: number) => new Promise<void>((r) => setTimeout(r, i * 1000));
        const [domainSettled, institutionPapers] = await Promise.all([
          Promise.allSettled(
            resolvedDomains.map((domain, i) =>
              stagger(i).then(() => searchArxivByCategory(domain, 40))
            )
          ),
          searchInstitutionPapers(50),
        ]);
        if (cancelled) return;

        const domainResultArrays = domainSettled
          .filter((r): r is PromiseFulfilledResult<ArxivPaper[]> => r.status === 'fulfilled')
          .map((r) => r.value);

        const domainSet = new Set(resolvedDomains);
        const domainCandidates = domainResultArrays.flat().filter(
          (paper) =>
            (!paper.primaryCategory || domainSet.has(paper.primaryCategory)) &&
            paper.authors.length >= 2
        );
        if (domainCandidates.length === 0) {
          setError('');
          setPool([]);
          return;
        }

        const withKeywords = domainCandidates.map((paper) => ({
          ...paper,
          matchedKeywords: matchPaperKeywords(paper, keywords),
        }));
        const keywordMatched = withKeywords.filter((p) => p.matchedKeywords.length > 0);
        const usingFallback = hasTextKeywords && keywordMatched.length === 0;
        const keywordFiltered = usingFallback ? withKeywords : hasTextKeywords ? keywordMatched : withKeywords;
        setIsKeywordFallback(usingFallback);

        const institutionMap = new Map(
          institutionPapers
            .filter((paper) => Boolean(paper.id))
            .map((paper) => [paper.id, paper] as const)
        );

        const seen = new Set<string>();
        const scoredPool = keywordFiltered
          .filter((paper) => {
            if (seen.has(paper.id)) return false;
            seen.add(paper.id);
            return true;
          })
          .map((paper) => {
            const enriched = institutionMap.get(paper.id)
              ? {
                  ...paper,
                  authors: institutionMap.get(paper.id)?.authors ?? paper.authors,
                  affiliations: institutionMap.get(paper.id)?.affiliations ?? paper.affiliations,
                  summary: institutionMap.get(paper.id)?.summary || paper.summary,
                }
              : paper;

            const prestigeSignals = resolvePrestigeSignals(enriched);
            const prestigeLabel = resolvePrestigeLabel(enriched);

            return {
              ...enriched,
              prestigeSignals,
              prestigeLabel,
              recommendationTier: prestigeSignals.length > 0 ? 'prestige' as const : 'fallback' as const,
              resolvedDomain: enriched.primaryCategory ?? resolvedDomain,
            };
          });

        // Prefer 3-day window when it has ≥2 prestige papers; otherwise expand to 7 days.
        const recent3d = scoredPool.filter((p) => isRecent(p.published, 3));
        const recent7d = scoredPool.filter((p) => isRecent(p.published, 7));
        const enough3d = recent3d.filter((p) => p.recommendationTier === 'prestige').length >= 2;
        const activePool = enough3d ? recent3d : recent7d.length > 0 ? recent7d : scoredPool;

        let next: ScoredPaper[];
        if (isMixedDefaultMode) {
          // Separate into two tier-specific domain maps, each sorted prestige-first within domain.
          const prestigeByDomain = new Map<string, ScoredPaper[]>();
          const fallbackByDomain = new Map<string, ScoredPaper[]>();
          resolvedDomains.forEach((d) => { prestigeByDomain.set(d, []); fallbackByDomain.set(d, []); });

          activePool.sort(sortPapers).forEach((paper) => {
            const map = paper.recommendationTier === 'prestige' ? prestigeByDomain : fallbackByDomain;
            const bucket = map.get(paper.resolvedDomain) ?? [];
            bucket.push(paper);
            map.set(paper.resolvedDomain, bucket);
          });

          const roundRobin = (byDomain: Map<string, ScoredPaper[]>, limit: number): ScoredPaper[] => {
            const result: ScoredPaper[] = [];
            let hasMore = true;
            while (hasMore && result.length < limit) {
              hasMore = false;
              for (const domain of resolvedDomains) {
                const bucket = byDomain.get(domain) ?? [];
                const paper = bucket.shift();
                if (!paper) continue;
                result.push(paper);
                hasMore = true;
              }
            }
            return result;
          };

          // All prestige papers first (domain-balanced), then fallback papers.
          const prestigePart = roundRobin(prestigeByDomain, 30);
          const fallbackPart = roundRobin(fallbackByDomain, 30 - prestigePart.length);
          next = [...prestigePart, ...fallbackPart];
        } else {
          const prestigePapers = activePool
            .filter((paper) => paper.recommendationTier === 'prestige')
            .sort(sortPapers);

          const fallbackPapers = activePool
            .filter((paper) => paper.recommendationTier === 'fallback')
            .sort(sortPapers);

          next = [...prestigePapers, ...fallbackPapers].slice(0, 30);
        }
        writeCache(cacheKey, next);
        if (!cancelled) setPool(next);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'unknown error';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [cacheKey, hasTextKeywords, isMixedDefaultMode, keywords, resolvedDomain, retryCount]);

  const hasFallback = papers.some((paper) => paper.recommendationTier === 'fallback');

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 10,
      }}>
        {isMixedDefaultMode ? (
          <>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(24,95,165,0.08)',
              color: 'var(--pm-blue-dark)',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {zh ? '默认推荐领域' : 'Default areas'}
            </span>
            {resolvedDomains.map((domain) => (
              <span key={domain} style={{ fontSize: 12, color: 'var(--pm-text-muted)' }}>
                {domain}
              </span>
            ))}
          </>
        ) : (
          <>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(24,95,165,0.08)',
              color: 'var(--pm-blue-dark)',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {zh ? '当前领域' : 'Current field'}: {resolvedDomain}
            </span>
            <span style={{ fontSize: 12, color: 'var(--pm-text-muted)' }}>
              {getDomainLabel(resolvedDomain)}
            </span>
          </>
        )}
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--pm-text-muted)', margin: '0 0 14px' }}>
        {isMixedDefaultMode
          ? (zh
              ? '默认混合展示多个研究方向，并优先推荐顶尖机构/作者论文'
              : 'Mixes several research areas by default and prioritizes top institutions/authors')
          : (zh
              ? '优先展示本领域顶尖机构/作者论文；不足时补充同领域高相关论文'
              : 'Prioritizes top institutions/authors in this field; backfills with strong papers from the same field')}
      </p>

      {loading && (
        listView ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="pm-skel" style={{ height: 120, borderRadius: 'var(--pm-r-md)', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="pm-skel" style={{ height: 168, borderRadius: 'var(--pm-r-md)', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )
      )}

      {!loading && error && (
        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--pm-error)', textAlign: 'center', maxWidth: 440 }}>
            {zh ? '加载失败：' : 'Failed to load: '}<span style={{ fontFamily: 'monospace', fontSize: 12 }}>{error}</span>
          </div>
          <button
            onClick={() => setRetryCount((count) => count + 1)}
            style={{
              fontSize: 13, fontWeight: 500, color: 'var(--pm-blue)',
              background: 'none', border: '1px solid var(--pm-blue)',
              borderRadius: 'var(--pm-r-sm)', padding: '5px 14px', cursor: 'pointer',
            }}
          >
            {zh ? '重试' : 'Retry'}
          </button>
        </div>
      )}

      {!loading && !error && papers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--pm-text-muted)' }}>
          {zh ? '近期暂无匹配论文' : 'No matching papers found recently'}
        </div>
      )}

      {!loading && !error && papers.length > 0 && (
        <>
          {isKeywordFallback && (
            <div style={{
              marginBottom: 12,
              borderRadius: 'var(--pm-r-sm)',
              background: 'rgba(186,117,23,0.07)',
              border: '1px solid rgba(186,117,23,0.18)',
              padding: '8px 12px',
              fontSize: 12,
              color: 'var(--pm-text-mid)',
            }}>
              {zh
                ? '近期暂无关键词匹配论文，显示当前领域热门'
                : 'No recent keyword matches — showing top papers from this field instead'}
            </div>
          )}
          {!listView && hasFallback && (
            <div style={{
              marginBottom: 12,
              borderRadius: 'var(--pm-r-sm)',
              background: 'rgba(15,110,86,0.06)',
              border: '1px solid rgba(15,110,86,0.12)',
              padding: '8px 12px',
              fontSize: 12,
              color: 'var(--pm-teal-dark)',
            }}>
              {zh
                ? '部分结果为同领域高相关补充推荐'
                : 'Some results are same-field backfill recommendations'}
            </div>
          )}
          {listView ? (
            <div>
              {papers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} lang={lang} onAnalyze={onAnalyze} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {papers.map((paper) => (
                <PickCard key={paper.id} paper={paper} zh={zh} onAnalyze={onAnalyze} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setPage((p) => (p + 1) % totalPages)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 32, padding: '0 14px',
                  borderRadius: 'var(--pm-r-sm)',
                  border: '1px solid var(--pm-border)',
                  background: 'var(--pm-bg-card)',
                  color: 'var(--pm-text-mid)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                </svg>
                {zh ? '换一批' : 'Show more'}
              </button>
              <span style={{ fontSize: 12, color: 'var(--pm-text-muted)' }}>
                {page + 1} / {totalPages}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PickCard({
  paper,
  zh,
  onAnalyze,
}: {
  paper: ScoredPaper;
  zh: boolean;
  onAnalyze: (paper: ArxivPaper) => void;
}) {
  const authorsDisplay = paper.authors.length > 2
    ? paper.authors.slice(0, 2).join(', ') + ' et al.'
    : paper.authors.join(', ');

  return (
    <div className="pm-pick-card">
      <span className="pm-pick-stamp">
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pm-blue)', display: 'inline-block' }} />
        {paper.recommendationTier === 'prestige'
          ? (zh ? '优选' : 'Priority')
          : (zh ? '补充' : 'Backfill')}
      </span>

      <div style={{
        fontSize: 14, fontWeight: 600, color: 'var(--pm-text)',
        lineHeight: 1.4, marginBottom: 8, marginTop: 4,
        letterSpacing: '-0.005em',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        paddingRight: 54,
      }}>
        {paper.title}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 10,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 8px', borderRadius: 999,
          background: 'rgba(24,95,165,0.10)', color: 'var(--pm-blue-dark)',
          fontWeight: 600, fontSize: 11,
        }}>
          {paper.resolvedDomain}
        </span>
        {paper.prestigeLabel && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 8px', borderRadius: 999,
            background: 'rgba(107,76,154,0.10)', color: 'var(--pm-purple-dark)',
            fontWeight: 600, fontSize: 11,
          }}>
            {paper.prestigeLabel}
          </span>
        )}
      </div>

      <div style={{
        fontSize: 12, color: 'var(--pm-text-muted)', marginBottom: 3, lineHeight: 1.5,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {authorsDisplay}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: 'var(--pm-text-soft)' }}>{paper.published}</span>
        {(paper.citedByCount ?? 0) > 0 && (
          <span style={{
            fontSize: 11, color: 'var(--pm-text-muted)',
            display: 'inline-flex', alignItems: 'center', gap: 2,
          }}>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>↑ {paper.citedByCount?.toLocaleString()}</span>
          </span>
        )}
      </div>

      <div className="pm-pick-actions">
        <a
          href={paper.absUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12, color: 'var(--pm-text-mid)', fontWeight: 500,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3,
            textDecoration: 'none',
          }}
        >
          {zh ? '原文' : 'arXiv'} <ChevRight />
        </a>
        <span style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => onAnalyze(paper)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 30, padding: '0 12px',
              borderRadius: 'var(--pm-r-sm)',
              background: 'var(--pm-blue)',
              color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(24,95,165,0.25)',
            }}
          >
            <SparkleIcon size={12} />
            {zh ? '解析' : 'Analyze'}
          </button>
        </span>
      </div>
    </div>
  );
}
