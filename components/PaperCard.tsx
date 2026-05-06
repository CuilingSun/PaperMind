'use client';

import { useState } from 'react';
import { ArxivPaper } from '@/lib/arxiv';
import { getEliteLabel } from '@/lib/eliteFilter';
import { Lang } from '@/lib/gemini';

interface Props {
  paper: ArxivPaper;
  lang: Lang;
  onAnalyze: (paper: ArxivPaper) => void;
}

const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5z"/>
  </svg>
);

const ExtLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  </svg>
);

export default function PaperCard({ paper, lang, onAnalyze }: Props) {
  const [expanded, setExpanded] = useState(false);
  const zh = lang === 'zh';
  const prestigeLabel = getEliteLabel(paper);

  const authorsDisplay = paper.authors.length > 3
    ? paper.authors.slice(0, 3).join(', ') + ' et al.'
    : paper.authors.join(', ');

  return (
    <div className="pm-paper-card" style={{ marginBottom: 12 }}>
      {/* Title */}
      <div
        style={{
          fontSize: 15, fontWeight: 600, color: 'var(--pm-text)',
          lineHeight: 1.45, marginBottom: 8, letterSpacing: '-0.005em',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {paper.title}
      </div>

      {/* Meta row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flexWrap: 'wrap', marginBottom: 12, fontSize: 12.5,
      }}>
        <span style={{ color: 'var(--pm-text-mid)' }}>{authorsDisplay}</span>
        <span style={{ color: 'var(--pm-text-soft)' }}>·</span>
        <span style={{ color: 'var(--pm-text-muted)' }}>{paper.published}</span>
        <a
          href={paper.absUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--pm-blue)', display: 'inline-flex', alignItems: 'center',
            gap: 3, marginLeft: 'auto', fontWeight: 500, textDecoration: 'none',
          }}
        >
          arXiv <ExtLinkIcon />
        </a>
      </div>

      {prestigeLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 8px', borderRadius: 999,
            background: 'rgba(107,76,154,0.10)', color: 'var(--pm-purple-dark)',
            fontWeight: 600, fontSize: 11,
          }}>
            {prestigeLabel}
          </span>
        </div>
      )}

      {/* Expand toggle + abstract */}
      <div style={{ borderTop: '1px solid var(--pm-divider)', paddingTop: 12 }}>
        <div
          style={{
            fontSize: 13.5, color: 'var(--pm-text-mid)', lineHeight: 1.65,
            display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden',
            WebkitLineClamp: expanded ? 'unset' : 2,
          }}
        >
          {paper.summary}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              fontSize: 13, color: 'var(--pm-blue)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 0', fontWeight: 500,
            }}
          >
            {expanded ? (zh ? '收起 ↑' : 'Collapse ↑') : (zh ? '展开摘要 ↓' : 'Show abstract ↓')}
          </button>
          <button
            onClick={() => onAnalyze(paper)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 32, padding: '0 14px',
              borderRadius: 'var(--pm-r-sm)',
              background: 'var(--pm-blue)', color: '#fff',
              fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 1px 2px rgba(12,68,124,0.25)',
              transition: 'background 180ms',
            }}
          >
            <SparkleIcon />
            {zh ? '深度解析' : 'Deep analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}
