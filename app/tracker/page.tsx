'use client';

import { useEffect, useState, useCallback } from 'react';
import NavHeader from '@/components/NavHeader';
import KeywordManager from '@/components/KeywordManager';
import PaperCard from '@/components/PaperCard';
import TodaysPicks from '@/components/TodaysPicks';
import { searchArxivCombined, ArxivPaper, TrackedSearch } from '@/lib/arxiv';
import { getPreferenceKeywords } from '@/lib/preferenceKeywords';
import { Lang } from '@/lib/gemini';

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5z"/>
  </svg>
);

export default function TrackerPage() {
  const [lang, setLang]         = useState<Lang>('zh');
  const [searches, setSearches] = useState<TrackedSearch[]>([]);
  const [papers, setPapers]     = useState<ArxivPaper[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [prefKeywords, setPrefKeywords] = useState<string[]>([]);

  useEffect(() => {
    setPrefKeywords(getPreferenceKeywords());
  }, []);

  const fetchAll = useCallback(async (list: TrackedSearch[]) => {
    if (list.length === 0) { setPapers([]); return; }
    setLoading(true);
    setError('');
    try {
      const results = await searchArxivCombined(list, 20);
      setPapers(results);
    } catch {
      setError(lang === 'zh' ? '加载失败，请稍后重试' : 'Failed to load — please try again');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  const addSearch = (s: TrackedSearch) => {
    const next = [...searches, s];
    setSearches(next);
    fetchAll(next);
  };

  const removeSearch = (id: string) => {
    const next = searches.filter((s) => s.id !== id);
    setSearches(next);
    fetchAll(next);
  };

  const clearAll = () => {
    setSearches([]);
    setPapers([]);
    setError('');
  };

  const handleAnalyze = (paper: ArxivPaper) => {
    localStorage.setItem('pending-arxiv-id', paper.id);
    localStorage.setItem('pending-arxiv-title', paper.title);
    localStorage.setItem('pending-arxiv-authors', JSON.stringify(paper.authors));
    localStorage.setItem('pending-arxiv-published', paper.published);
    localStorage.setItem('pending-arxiv-absurl', paper.absUrl);
    localStorage.setItem('pending-arxiv-summary', paper.summary);
    window.open('/analyze', '_blank');
  };

  const zh = lang === 'zh';

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--pm-bg-page)', display: 'flex', flexDirection: 'column' }}>
      <NavHeader lang={lang} onLangChange={setLang} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="pm-page-tint pm-tint-blue">
        {/* Sticky search bar */}
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'saturate(140%) blur(8px)',
          WebkitBackdropFilter: 'saturate(140%) blur(8px)',
          borderBottom: '1px solid var(--pm-border)',
          flexShrink: 0, zIndex: 10,
          position: 'relative',
        }}>
          <KeywordManager
            searches={searches}
            onAdd={addSearch}
            onRemove={removeSearch}
            onClearAll={clearAll}
            lang={lang}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>

            {searches.length === 0 && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: 'var(--pm-blue)' }}><SparkleIcon /></span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--pm-blue)' }}>
                      {zh ? '今日精选' : "Today's Picks"}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--pm-text-muted)', margin: 0 }}>
                    {prefKeywords.length > 0
                      ? (zh ? '基于你的关键词偏好 · 每小时更新' : 'Based on your keyword preferences · updated hourly')
                      : (zh ? '热门 AI/CS 论文 · 每小时更新' : 'Trending AI/CS papers · updated hourly')}
                  </p>
                </div>
                <TodaysPicks keywords={prefKeywords} lang={lang} onAnalyze={handleAnalyze} />
              </>
            )}

            {searches.length > 0 && loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--pm-text-muted)', padding: '32px 0', justifyContent: 'center' }}>
                <span style={{
                  width: 14, height: 14, border: '2px solid var(--pm-border)',
                  borderTopColor: 'var(--pm-blue)', borderRadius: '50%',
                  animation: 'pm-spin 1s linear infinite', display: 'inline-block',
                }} />
                <style>{`@keyframes pm-spin { to { transform: rotate(360deg); } }`}</style>
                {zh ? '正在搜索…' : 'Searching…'}
              </div>
            )}

            {searches.length > 0 && error && (
              <div style={{
                background: '#fff', border: '1px solid var(--pm-error)',
                borderRadius: 'var(--pm-r-md)', padding: 20, marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                fontSize: 13, color: 'var(--pm-error)',
              }}>
                <span>{error}</span>
                <button
                  onClick={() => fetchAll(searches)}
                  style={{ color: 'var(--pm-error)', background: 'none', border: '1px solid var(--pm-error)', borderRadius: 'var(--pm-r-sm)', padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}
                >
                  {zh ? '重试' : 'Retry'}
                </button>
              </div>
            )}

            {searches.length > 0 && !loading && !error && papers.length > 0 && (
              <>
                <div style={{ fontSize: 13, color: 'var(--pm-text-muted)', marginBottom: 16 }}>
                  {zh ? `找到 ` : 'Found '}
                  <strong style={{ color: 'var(--pm-text)' }}>{papers.length}</strong>
                  {zh ? ` 篇论文` : ' papers'}
                </div>
                {papers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} lang={lang} onAnalyze={handleAnalyze} />
                ))}
              </>
            )}

            {searches.length > 0 && !loading && !error && papers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 13, color: 'var(--pm-text-muted)' }}>
                {zh ? '没有找到符合条件的论文' : 'No papers found matching all keywords'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
