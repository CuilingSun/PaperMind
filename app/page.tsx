'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LangDropdown from '@/components/LangDropdown';
import HistoryList from '@/components/HistoryList';
import { getHistory, removeHistory, clearHistory, HistoryEntry } from '@/lib/history';
import { Lang } from '@/lib/gemini';

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('zh');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
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
    if (!entry.absUrl) return;
    localStorage.setItem('pending-arxiv-id', entry.id);
    localStorage.setItem('pending-arxiv-title', entry.title);
    window.open('/analyze', '_blank');
  };

  const zh = lang === 'zh';
  const recent = history.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Minimal landing header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <span className="font-semibold text-slate-900">
              PaperMind
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
              CS / AI
            </span>
          </div>
          <LangDropdown lang={lang} onChange={setLang} />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-6 pt-16 pb-12">
        <div className="w-full max-w-2xl">
          {/* Hero */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {zh ? '选择你想要的功能' : 'Choose what to do'}
            </h1>
            <p className="text-sm text-slate-500">
              {zh ? 'CS / AI 论文追踪 · 深度解析一体' : 'Track arXiv papers · Deep analysis in one place'}
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <Link
              href="/tracker"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="text-3xl mb-3">📡</div>
              <h2 className="font-semibold text-slate-900 mb-1">
                {zh ? '追踪' : 'Track'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {zh
                  ? '订阅关键词，浏览 arXiv 最新论文，一键触发深度解析'
                  : 'Subscribe to keywords, browse arXiv papers, one-click deep analysis'}
              </p>
            </Link>

            <Link
              href="/analyze"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="text-3xl mb-3">📄</div>
              <h2 className="font-semibold text-slate-900 mb-1">
                {zh ? '解析' : 'Analyze'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {zh
                  ? '上传 PDF 或粘贴 arXiv 链接，AI 生成结构化深度报告'
                  : 'Upload a PDF or paste an arXiv link for an AI-generated analysis report'}
              </p>
            </Link>
          </div>

          {/* Recent history */}
          {recent.length > 0 && (
            <div>
              <HistoryList
                entries={recent}
                lang={lang}
                onRemove={handleRemove}
                onClear={handleClear}
                onReanalyze={handleReanalyze}
                maxItems={5}
                showViewAll={history.length > 5}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
