'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NavHeader from '@/components/NavHeader';
import PreferenceKeywords from '@/components/PreferenceKeywords';
import TodaysPicks from '@/components/TodaysPicks';
import { getHistory, HistoryEntry } from '@/lib/history';
import { getPreferenceKeywords } from '@/lib/preferenceKeywords';
import { ArxivPaper } from '@/lib/arxiv';
import { Lang } from '@/lib/gemini';

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5z"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
  </svg>
);

const SparkleBlue = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5z"/>
  </svg>
);

const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('zh');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [prefKeywords, setPrefKeywords] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getHistory());
    setPrefKeywords(getPreferenceKeywords());
  }, []);

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
        className="pm-page-tint pm-tint-mix"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 64px' }}
      >
        <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Quick action cards — 3-up grid */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                {
                  href: '/tracker', accent: 'blue', icon: <SearchIcon />,
                  title: zh ? '追踪' : 'Track',
                  desc: zh ? '搜索 arXiv 最新论文，按关键词、作者、分类筛选' : 'Search latest arXiv papers with keyword, author & category filters',
                },
                {
                  href: '/analyze', accent: 'purple', icon: <SparkleIcon />,
                  title: zh ? '解析' : 'Analyze',
                  desc: zh ? '上传 PDF，AI 生成 7 维深度报告' : 'Upload a PDF for AI-generated 7-dimension analysis',
                },
                {
                  href: '/history', accent: 'teal', icon: <HistoryIcon />,
                  title: zh ? '历史' : 'History',
                  desc: zh ? '查看与管理全部解析记录' : 'View and manage all past analyses',
                },
              ].map((c) => (
                <Link key={c.href} href={c.href} className={`pm-qa-card pm-qa-${c.accent}`} style={{ textDecoration: 'none' }}>
                  <div className="pm-qa-icon">{c.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--pm-text)' }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--pm-text-muted)', lineHeight: 1.5, marginBottom: 14 }}>{c.desc}</div>
                  <span className="pm-qa-arrow">
                    {zh ? '进入' : 'Open'} <ArrowRight />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Keyword preferences */}
          <PreferenceKeywords lang={lang} onChange={setPrefKeywords} />

          {/* Today's picks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="pm-picks-title">
                <SparkleBlue /> {zh ? '今日精选' : "Today's Picks"}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--pm-text-muted)' }}>
                <span className="pm-pulse-dot" />
                {zh
                  ? (prefKeywords.length > 0 ? `基于 ${prefKeywords.length} 个关键词` : '热门 AI/CS 论文')
                  : (prefKeywords.length > 0 ? `${prefKeywords.length} keyword${prefKeywords.length > 1 ? 's' : ''}` : 'Trending AI/CS')}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--pm-text-muted)', marginBottom: 16, marginTop: 4 }}>
              {zh ? '点击卡片查看详情或直接进入深度解析' : 'Click a card to view details or analyze'}
            </p>
            <TodaysPicks keywords={prefKeywords} lang={lang} onAnalyze={handleAnalyze} />
          </div>

          {/* Recent history */}
          {recent.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--pm-text)', letterSpacing: '-0.01em' }}>
                  {zh ? '最近解析' : 'Recent Analyses'}
                </span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {history.length > 5 && (
                    <Link href="/history" style={{ fontSize: 13, color: 'var(--pm-blue)', textDecoration: 'none', fontWeight: 500 }}>
                      {zh ? '查看全部 →' : 'View all →'}
                    </Link>
                  )}
                </div>
              </div>
              <div style={{ background: 'var(--pm-bg-card)', border: '1px solid var(--pm-border)', borderRadius: 'var(--pm-r-md)', padding: 8, boxShadow: 'var(--pm-sh-xs)' }}>
                {recent.map((entry) => (
                  <div
                    key={entry.id}
                    className="pm-recent-row"
                    onClick={() => handleReanalyze(entry)}
                  >
                    <span style={{ fontSize: 13, color: 'var(--pm-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 12 }}>
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
