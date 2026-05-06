'use client';

import { useEffect, useState } from 'react';
import NavHeader from '@/components/NavHeader';
import HistoryList from '@/components/HistoryList';
import { getHistory, removeHistory, clearHistory, HistoryEntry } from '@/lib/history';
import { Lang } from '@/lib/gemini';

const HistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
  </svg>
);

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

  const zh = lang === 'zh';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--pm-bg-page)', display: 'flex', flexDirection: 'column' }}>
      <NavHeader lang={lang} onLangChange={setLang} />

      <main className="pm-page-tint pm-tint-warm" style={{ flex: 1 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px 64px' }}>

          {/* Page header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ color: 'var(--pm-text-muted)' }}><HistoryIcon /></span>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--pm-text)', letterSpacing: '-0.015em', margin: 0 }}>
                  {zh ? '解析历史' : 'Analysis History'}
                </h1>
              </div>
              {entries.length > 0 && (
                <p style={{ fontSize: 13, color: 'var(--pm-text-muted)', margin: 0 }}>
                  {zh ? `共 ${entries.length} 条记录` : `${entries.length} record${entries.length !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>
            {entries.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(zh ? '确定清空所有历史记录？' : 'Clear all history?')) handleClear();
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 34, padding: '0 14px',
                  borderRadius: 'var(--pm-r-sm)',
                  background: 'var(--pm-error)', color: '#fff',
                  fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(163,45,45,0.25)',
                }}
              >
                🗑 {zh ? '清空历史' : 'Clear all'}
              </button>
            )}
          </div>

          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{
                width: 80, height: 80, margin: '0 auto 20px',
                borderRadius: '50%', background: 'var(--pm-bg-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--pm-text-muted)',
              }}>
                <HistoryIcon />
              </div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--pm-text)', marginBottom: 8 }}>
                {zh ? '暂无历史记录' : 'No history yet'}
              </div>
              <p style={{ fontSize: 13, color: 'var(--pm-text-muted)', margin: '0 0 24px' }}>
                {zh ? '上传 PDF 或从追踪页解析论文，记录将自动保存在这里' : 'Analyze a paper to get started — records are saved automatically'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <a href="/tracker" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 36, padding: '0 16px',
                  borderRadius: 'var(--pm-r-sm)',
                  background: '#fff', color: 'var(--pm-blue)',
                  border: '1px solid var(--pm-blue)',
                  fontSize: 14, fontWeight: 500, textDecoration: 'none',
                }}>
                  {zh ? '追踪论文 →' : 'Browse papers →'}
                </a>
                <a href="/analyze" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 36, padding: '0 16px',
                  borderRadius: 'var(--pm-r-sm)',
                  background: 'var(--pm-blue)', color: '#fff',
                  fontSize: 14, fontWeight: 500, textDecoration: 'none',
                }}>
                  {zh ? '上传 PDF →' : 'Upload PDF →'}
                </a>
              </div>
            </div>
          ) : (
            <HistoryList
              entries={entries}
              lang={lang}
              onRemove={handleRemove}
              onClear={handleClear}
              onReanalyze={handleReanalyze}
              hideHeader
            />
          )}
        </div>
      </main>
    </div>
  );
}
