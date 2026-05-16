'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import NavHeader from '@/components/NavHeader';
import TodaysPicks from '@/components/TodaysPicks';
import { getHistory, HistoryEntry } from '@/lib/history';
import { getPreferenceKeywords, savePreferenceKeywords } from '@/lib/preferenceKeywords';
import { ArxivPaper } from '@/lib/arxiv';
import { Lang } from '@/lib/gemini';

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const SparkleWhite = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5z"/>
  </svg>
);

const SparkleBlue = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5z"/>
  </svg>
);

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

const PencilIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

const XSmall = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('zh');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwOpen, setKwOpen] = useState(false);
  const [kwInput, setKwInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getHistory());
    setKeywords(getPreferenceKeywords());
  }, []);

  useEffect(() => {
    if (!kwOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setKwOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [kwOpen]);

  const addKeyword = (kw: string) => {
    const t = kw.trim().toLowerCase();
    if (!t || keywords.includes(t)) return;
    const next = [...keywords, t];
    setKeywords(next);
    savePreferenceKeywords(next);
    setKwInput('');
  };

  const removeKeyword = (kw: string) => {
    const next = keywords.filter((k) => k !== kw);
    setKeywords(next);
    savePreferenceKeywords(next);
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
    <div style={{ minHeight: '100vh', background: 'var(--pm-bg-page)', display: 'flex', flexDirection: 'column' }}>
      <NavHeader lang={lang} onLangChange={setLang} />

      <main
        className="pm-page-tint pm-tint-warm"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 64px' }}
      >
        <div style={{ width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Hero cards — 2 up (Tracker + Analyze) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Link href="/tracker" className="pm-hero-card pm-hero-blue">
              <div className="pm-hero-icon"><SearchIcon /></div>
              <div className="pm-hero-body">
                <div className="pm-hero-title">{zh ? '追踪' : 'Track'}</div>
                <div className="pm-hero-desc">
                  {zh
                    ? '搜索 arXiv 最新论文，按关键词、作者、分类筛选'
                    : 'Search latest arXiv papers with keyword, author & category filters'}
                </div>
              </div>
              <span className="pm-hero-arrow"><ArrowRight /></span>
            </Link>
            <Link href="/analyze" className="pm-hero-card pm-hero-purple">
              <div className="pm-hero-icon"><SparkleWhite /></div>
              <div className="pm-hero-body">
                <div className="pm-hero-title">{zh ? '解析' : 'Analyze'}</div>
                <div className="pm-hero-desc">
                  {zh
                    ? '上传 PDF，AI 生成 7 维深度报告与摘要'
                    : 'Upload a PDF for AI-generated 7-dimension analysis'}
                </div>
              </div>
              <span className="pm-hero-arrow"><ArrowRight /></span>
            </Link>
          </div>

          {/* Today's Picks */}
          <div>
            <div className="pm-picks-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="pm-picks-title">
                  <SparkleBlue /> {zh ? '今日精选' : "Today's Picks"}
                </div>
                <div className="pm-picks-meta" style={{ marginTop: 4 }}>
                  <span className="pm-pulse-dot" />
                  <span>{zh ? '每小时更新' : 'Updated hourly'}</span>
                </div>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }} ref={popoverRef}>
                {keywords.length > 0 ? (
                  <>
                    <div className="pm-kw-summary">
                      <span style={{ color: 'var(--pm-text-muted)' }}>{zh ? '基于' : 'Based on'}</span>
                      {keywords.slice(0, 2).map((k) => (
                        <span key={k} className="pm-kw-chip">
                          <span style={{ opacity: 0.55 }}>#</span>{k}
                        </span>
                      ))}
                      {keywords.length > 2 && (
                        <span className="pm-kw-more">+{keywords.length - 2}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setKwOpen((v) => !v)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        height: 26, padding: '0 10px',
                        borderRadius: 999,
                        border: '1px solid var(--pm-border)',
                        background: 'var(--pm-bg-card)',
                        color: 'var(--pm-text-mid)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        transition: 'border-color 150ms, color 150ms',
                        flexShrink: 0,
                      }}
                    >
                      <PencilIcon />
                      {zh ? '编辑' : 'Edit'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setKwOpen(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      height: 28, padding: '0 12px',
                      borderRadius: 999,
                      border: '1px dashed var(--pm-border)',
                      background: 'transparent',
                      color: 'var(--pm-blue)',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      transition: 'border-color 150ms, background 150ms',
                    }}
                  >
                    <PlusIcon />
                    {zh ? '添加偏好关键词' : 'Add keywords'}
                  </button>
                )}

                {kwOpen && (
                  <div className="pm-popover">
                    <div className="pm-popover-arrow" />
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text)', marginBottom: 4 }}>
                      {zh ? '关键词偏好' : 'Keyword Preferences'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--pm-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                      {zh
                        ? '添加感兴趣的研究领域，今日精选会自动推荐相关论文'
                        : 'Add research areas to get personalized picks'}
                    </div>

                    {keywords.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {keywords.map((k) => (
                          <span key={k} className="pm-pill" style={{ height: 26, fontSize: 12 }}>
                            {k}
                            <span className="pm-pill-x" onClick={() => removeKeyword(k)}>
                              <XSmall />
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--pm-text-soft)', padding: '6px 0 12px' }}>
                        {zh ? '暂无偏好，添加后将根据兴趣推荐' : 'No keywords yet — add some to get personalized picks'}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        className="pm-input"
                        placeholder={zh ? '输入关键词...' : 'Enter keyword...'}
                        style={{ flex: 1, height: 30, fontSize: 13, padding: '0 10px' }}
                        value={kwInput}
                        onChange={(e) => setKwInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addKeyword(kwInput); }}
                      />
                      <button
                        onClick={() => addKeyword(kwInput)}
                        style={{
                          height: 30, padding: '0 12px',
                          background: 'var(--pm-blue)', color: '#fff',
                          border: 'none', borderRadius: 'var(--pm-r-sm)',
                          fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        {zh ? '添加' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <TodaysPicks keywords={keywords} lang={lang} onAnalyze={handleAnalyze} />
          </div>

          {/* Recent history */}
          {recent.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--pm-text)', letterSpacing: '-0.01em' }}>
                  {zh ? '最近解析' : 'Recent Analyses'}
                </span>
                {history.length > 5 && (
                  <Link href="/history" style={{ fontSize: 13, color: 'var(--pm-blue)', textDecoration: 'none', fontWeight: 500 }}>
                    {zh ? '查看全部 →' : 'View all →'}
                  </Link>
                )}
              </div>
              <div style={{
                background: 'var(--pm-bg-card)', border: '1px solid var(--pm-border)',
                borderRadius: 'var(--pm-r-md)', padding: 8, boxShadow: 'var(--pm-sh-xs)',
              }}>
                {recent.map((entry) => (
                  <div key={entry.id} className="pm-recent-row" onClick={() => handleReanalyze(entry)}>
                    <span style={{
                      fontSize: 13, color: 'var(--pm-text)', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 12,
                    }}>
                      {entry.source === 'arxiv' ? '' : '📁 '}{entry.title}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--pm-text-muted)', flexShrink: 0 }}>
                      {new Date(entry.analyzedAt).toLocaleDateString(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--pm-text-muted)', paddingTop: 8 }}>
            {zh
              ? 'PaperMind 使用你自己的 Gemini API Key，完全免费，数据仅存储在本地'
              : 'PaperMind uses your own Gemini API Key — free, local-only storage'}
          </div>
        </div>
      </main>
    </div>
  );
}
