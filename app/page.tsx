'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LangDropdown from '@/components/LangDropdown';
import HistoryList from '@/components/HistoryList';
import PreferenceKeywords from '@/components/PreferenceKeywords';
import TodaysPicks from '@/components/TodaysPicks';
import { getHistory, removeHistory, clearHistory, HistoryEntry } from '@/lib/history';
import { getPreferenceKeywords } from '@/lib/preferenceKeywords';
import { ArxivPaper } from '@/lib/arxiv';
import { Lang } from '@/lib/gemini';

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('zh');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [prefKeywords, setPrefKeywords] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getHistory());
    setPrefKeywords(getPreferenceKeywords());
  }, []);

  const handleRemove = (id: string) => {
    removeHistory(id);
    setHistory(getHistory());
  };

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  const handleReanalyze = (entry: HistoryEntry) => {
    if (entry.source !== 'arxiv') return;
    localStorage.setItem('pending-arxiv-id', entry.id);
    localStorage.setItem('pending-arxiv-title', entry.title);
    if (entry.authors) localStorage.setItem('pending-arxiv-authors', JSON.stringify(entry.authors));
    if (entry.published) localStorage.setItem('pending-arxiv-published', entry.published);
    if (entry.absUrl) localStorage.setItem('pending-arxiv-absurl', entry.absUrl);
    if (entry.summary) localStorage.setItem('pending-arxiv-summary', entry.summary);
    if (entry.report) localStorage.setItem('pending-arxiv-report', JSON.stringify(entry.report));
    window.open('/analyze', '_blank');
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
  const recent = history.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <span className="font-semibold text-slate-900">PaperMind</span>
            <span className="hidden sm:inline text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
              CS / AI
            </span>
          </div>
          <LangDropdown lang={lang} onChange={setLang} />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-6 pt-12 pb-12">
        <div className="w-full max-w-2xl space-y-8">

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-4">
            <Link
              href="/tracker"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="text-3xl mb-3">📡</div>
              <h2 className="font-semibold text-slate-900 mb-1 text-sm">
                {zh ? '追踪' : 'Track'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {zh ? '搜索 arXiv 最新论文，一键深度解析' : 'Search latest arXiv papers, one-click analysis'}
              </p>
            </Link>

            <Link
              href="/analyze"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="text-3xl mb-3">📄</div>
              <h2 className="font-semibold text-slate-900 mb-1 text-sm">
                {zh ? '解析' : 'Analyze'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {zh ? '上传 PDF，AI 生成结构化深度报告' : 'Upload a PDF for AI-generated analysis'}
              </p>
            </Link>

            <Link
              href="/history"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="text-3xl mb-3">🕘</div>
              <h2 className="font-semibold text-slate-900 mb-1 text-sm">
                {zh ? '历史' : 'History'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {zh ? '查看全部解析记录，随时重新解析' : 'View past analyses and re-analyze anytime'}
              </p>
            </Link>
          </div>

          {/* Keyword preferences */}
          <PreferenceKeywords lang={lang} onChange={setPrefKeywords} />

          {/* Today's picks */}
          <TodaysPicks
            keywords={prefKeywords}
            lang={lang}
            onAnalyze={handleAnalyze}
          />

          {/* Recent history */}
          {recent.length > 0 && (
            <HistoryList
              entries={recent}
              lang={lang}
              onRemove={handleRemove}
              onClear={handleClear}
              onReanalyze={handleReanalyze}
              maxItems={5}
              showViewAll={history.length > 5}
            />
          )}
        </div>
      </main>
    </div>
  );
}
