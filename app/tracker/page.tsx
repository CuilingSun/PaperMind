'use client';

import { useEffect, useState, useCallback } from 'react';
import NavHeader from '@/components/NavHeader';
import KeywordManager from '@/components/KeywordManager';
import PaperCard from '@/components/PaperCard';
import TodaysPicks from '@/components/TodaysPicks';
import { searchArxivCombined, ArxivPaper, TrackedSearch } from '@/lib/arxiv';
import { getPreferenceKeywords } from '@/lib/preferenceKeywords';
import { Lang } from '@/lib/gemini';

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
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col">
      <NavHeader lang={lang} onLangChange={setLang} />

      <div className="flex-1 overflow-y-auto">
        <KeywordManager
          searches={searches}
          onAdd={addSearch}
          onRemove={removeSearch}
          onClearAll={clearAll}
          lang={lang}
        />

        {searches.length === 0 ? (
          <div className="px-6 py-6">
            <TodaysPicks keywords={prefKeywords} lang={lang} onAnalyze={handleAnalyze} />
          </div>
        ) : (
          <div className="px-6 py-4">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin" />
                {zh ? '正在加载…' : 'Loading…'}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
                <button
                  onClick={() => fetchAll(searches)}
                  className="ml-3 underline text-red-600 hover:text-red-800"
                >
                  {zh ? '重试' : 'Retry'}
                </button>
              </div>
            )}
            {!loading && !error && papers.length > 0 && (
              <div className="space-y-3">
                {papers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    lang={lang}
                    onAnalyze={handleAnalyze}
                  />
                ))}
              </div>
            )}
            {!loading && !error && papers.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                {zh ? '没有找到符合条件的论文' : 'No papers found matching all keywords'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
