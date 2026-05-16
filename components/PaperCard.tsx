'use client';

import { useState } from 'react';
import { ArxivPaper } from '@/lib/arxiv';
import { resolveInstitutionLabel } from '@/lib/eliteFilter';
import { Lang } from '@/lib/gemini';

const ABSTRACT_LINES = 3;

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

const ChevronIcon = ({ up }: { up: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
    <path d="M6 9l6 6 6-6"/>
  </svg>
);


export default function PaperCard({ paper, lang, onAnalyze }: Props) {
  const [expanded, setExpanded] = useState(false);
  const zh = lang === 'zh';

  const authorsDisplay = paper.authors.length > 3
    ? paper.authors.slice(0, 3).join(', ') + ' et al.'
    : paper.authors.join(', ') || '—';

  const institution = resolveInstitutionLabel(paper) ?? null;
  const hasAbstract = paper.summary.trim().length > 0;

  return (
    <div className="pm-paper-card" style={{ marginBottom: 12 }}>

      {/* ── Title ── */}
      <div style={{
        fontSize: 15.5, fontWeight: 650, color: 'var(--pm-text)',
        lineHeight: 1.45, marginBottom: 10, letterSpacing: '-0.01em',
      }}>
        {paper.title}
      </div>

      {/* ── Meta row: authors · date · institution ── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
        gap: 6, marginBottom: 12, fontSize: 12.5,
      }}>
        <span style={{ color: 'var(--pm-text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
          {authorsDisplay}
        </span>
        <span style={{ color: 'var(--pm-text-soft)' }}>·</span>
        <span style={{ color: 'var(--pm-text-muted)', flexShrink: 0 }}>{paper.published}</span>
        {institution && (
          <>
            <span style={{ color: 'var(--pm-text-soft)' }}>·</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '1px 7px', borderRadius: 999,
              background: 'rgba(107,76,154,0.09)', color: 'var(--pm-purple-dark)',
              fontWeight: 600, fontSize: 11, flexShrink: 0,
            }}>
              {institution}
            </span>
          </>
        )}
        {(paper.citedByCount ?? 0) > 0 && (
          <>
            <span style={{ color: 'var(--pm-text-soft)' }}>·</span>
            <span style={{ color: 'var(--pm-text-muted)', flexShrink: 0, fontSize: 11.5 }}>
              ↑ {paper.citedByCount!.toLocaleString()}
            </span>
          </>
        )}
      </div>

      {/* ── Abstract ── */}
      {hasAbstract && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 13.5, color: 'var(--pm-text-mid)', lineHeight: 1.7,
            display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden',
            WebkitLineClamp: expanded ? 'unset' : ABSTRACT_LINES,
          }}>
            {paper.summary}
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 6, fontSize: 12.5, color: 'var(--pm-blue)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 0', fontWeight: 500,
            }}
          >
            {expanded
              ? (zh ? '收起' : 'Collapse')
              : (zh ? '展开全文' : 'Show more')}
            <ChevronIcon up={expanded} />
          </button>
        </div>
      )}

      {/* ── Action row ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        borderTop: '1px solid var(--pm-divider)', paddingTop: 12,
      }}>
        <a
          href={paper.absUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 32, padding: '0 12px',
            borderRadius: 'var(--pm-r-sm)',
            border: '1px solid var(--pm-border)',
            background: 'var(--pm-bg-card)',
            color: 'var(--pm-text-mid)',
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
            transition: 'border-color 150ms',
          }}
        >
          {zh ? '查看原文' : 'View paper'} <ExtLinkIcon />
        </a>

        {paper.pdfUrl && paper.pdfUrl !== paper.absUrl && (
          <a
            href={paper.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 32, padding: '0 12px',
              borderRadius: 'var(--pm-r-sm)',
              border: '1px solid var(--pm-border)',
              background: 'var(--pm-bg-card)',
              color: 'var(--pm-text-muted)',
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
            }}
          >
            PDF
          </a>
        )}

        <button
          onClick={() => onAnalyze(paper)}
          className="pm-btn pm-btn-primary pm-btn-sm"
          style={{ marginLeft: 'auto' }}
        >
          <SparkleIcon />
          {zh ? '深度解析' : 'Deep analysis'}
        </button>
      </div>
    </div>
  );
}
