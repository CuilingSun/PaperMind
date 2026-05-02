'use client';

import { useEffect, useState } from 'react';
import { ArxivPaper, searchArxiv } from '@/lib/arxiv';
import { Lang } from '@/lib/gemini';

const FALLBACK_KEYWORDS = ['machine learning', 'large language model', 'reinforcement learning'];
const CACHE_KEY = 'todays-picks-cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface ScoredPaper extends ArxivPaper {
  matchedKeywords: string[];
}

interface Cache {
  keywords: string;
  papers: ScoredPaper[];
  fetchedAt: number;
}

function readCache(keywordsKey: string): ScoredPaper[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: Cache = JSON.parse(raw);
    if (cache.keywords !== keywordsKey) return null;
    if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) return null;
    return cache.papers;
  } catch {
    return null;
  }
}

function writeCache(keywordsKey: string, papers: ScoredPaper[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ keywords: keywordsKey, papers, fetchedAt: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

function getRecentDates(days = 3): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function scorePapers(papers: ArxivPaper[], keywords: string[]): ScoredPaper[] {
  return papers.map((p) => {
    const text = (p.title + ' ' + p.summary).toLowerCase();
    const matchedKeywords = keywords.filter((kw) => text.includes(kw.toLowerCase()));
    return { ...p, matchedKeywords };
  });
}

interface Props {
  keywords: string[];
  lang: Lang;
  onAnalyze: (paper: ArxivPaper) => void;
}

export default function TodaysPicks({ keywords, lang, onAnalyze }: Props) {
  const [papers, setPapers] = useState<ScoredPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const zh = lang === 'zh';

  const activeKeywords = keywords.length > 0 ? keywords : FALLBACK_KEYWORDS;
  const keywordsKey = activeKeywords.join(',');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Serve from cache if still fresh
      const cached = readCache(keywordsKey);
      if (cached) {
        setPapers(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const recentDates = getRecentDates(3);

        const results = await Promise.all(
          activeKeywords.map((kw) =>
            searchArxiv({ id: kw, keyword: kw, sortBy: 'submittedDate' }, 10).catch(() => [] as ArxivPaper[])
          )
        );

        if (cancelled) return;

        const seen = new Set<string>();
        const all: ArxivPaper[] = [];
        for (const batch of results) {
          for (const p of batch) {
            if (!seen.has(p.id)) { seen.add(p.id); all.push(p); }
          }
        }

        const recent = all.filter((p) => recentDates.includes(p.published));
        const scored = scorePapers(recent.length > 0 ? recent : all, activeKeywords)
          .filter((p) => p.matchedKeywords.length > 0)
          .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length)
          .slice(0, 5);

        writeCache(keywordsKey, scored);
        setPapers(scored);
      } catch {
        if (!cancelled) setError(zh ? '加载失败，请稍后重试' : 'Failed to load — please try again');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [keywordsKey]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            {zh ? '今日精选' : "Today's Picks"}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {keywords.length > 0
              ? (zh ? '基于你的关键词偏好' : 'Based on your keyword preferences')
              : (zh ? '热门 AI / CS 论文' : 'Trending AI / CS papers')}
          </p>
        </div>
        {loading && (
          <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin" />
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {error && (
          <div className="px-5 py-4 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && papers.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            {zh ? '近期暂无匹配论文' : 'No matching papers found recently'}
          </div>
        )}

        {papers.map((paper) => (
          <div key={paper.id} className="px-5 py-4">
            <h3 className="text-sm font-medium text-slate-900 leading-snug mb-1.5">
              {paper.title}
            </h3>

            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap mb-2">
              <span>
                {paper.authors.length > 3
                  ? paper.authors.slice(0, 3).join(', ') + ' et al.'
                  : paper.authors.join(', ')}
              </span>
              <span>·</span>
              <span>{paper.published}</span>
              <span>·</span>
              <a href={paper.absUrl} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800">
                arXiv ↗
              </a>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {paper.matchedKeywords.map((kw) => (
                <span key={kw}
                  className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  {kw}
                </span>
              ))}
            </div>

            <button
              onClick={() => setExpandedId(expandedId === paper.id ? null : paper.id)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform duration-200 ${expandedId === paper.id ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {expandedId === paper.id ? (zh ? '收起摘要' : 'Collapse') : (zh ? '展开摘要' : 'Show abstract')}
            </button>

            {expandedId === paper.id && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{paper.summary}</p>
                <div className="flex justify-end">
                  <button onClick={() => onAnalyze(paper)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors">
                    {zh ? '深度解析' : 'Deep analysis'}<span>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
