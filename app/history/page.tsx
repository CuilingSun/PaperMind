'use client';

import { useEffect, useState } from 'react';
import NavHeader from '@/components/NavHeader';
import HistoryList from '@/components/HistoryList';
import { getHistory, removeHistory, clearHistory, HistoryEntry } from '@/lib/history';
import { Lang } from '@/lib/gemini';

export default function HistoryPage() {
  const [lang, setLang] = useState<Lang>('zh');
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(getHistory());
  }, []);

  const handleRemove = (id: string) => {
    removeHistory(id);
    setEntries(getHistory());
  };

  const handleClear = () => {
    clearHistory();
    setEntries([]);
  };

  const handleReanalyze = (entry: HistoryEntry) => {
    if (!entry.absUrl) return;
    localStorage.setItem('pending-arxiv-id', entry.id);
    localStorage.setItem('pending-arxiv-title', entry.title);
    window.open('/analyze', '_blank');
  };

  const zh = lang === 'zh';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavHeader lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-slate-900">
            {zh ? '解析历史' : 'Analysis History'}
          </h1>
          {entries.length > 0 && (
            <button
              onClick={() => {
                if (confirm(zh ? '确定清空所有历史记录？' : 'Clear all history?')) handleClear();
              }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              🗑 {zh ? '清空历史' : 'Clear all'}
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <span className="text-5xl mb-4">📋</span>
            <p className="text-sm">
              {zh ? '还没有解析记录，去解析一篇论文吧' : 'No history yet — analyze a paper to get started'}
            </p>
          </div>
        ) : (
          <HistoryList
            entries={entries}
            lang={lang}
            onRemove={handleRemove}
            onClear={handleClear}
            onReanalyze={handleReanalyze}
          />
        )}
      </main>
    </div>
  );
}
