'use client';

import { useState } from 'react';
import { HistoryEntry } from '@/lib/history';
import { Lang } from '@/lib/gemini';

interface Props {
  entries: HistoryEntry[];
  lang: Lang;
  onRemove: (id: string) => void;
  onClear: () => void;
  onReanalyze?: (entry: HistoryEntry) => void;
  maxItems?: number;
  showViewAll?: boolean;
  hideHeader?: boolean;
}

function groupByDate(entries: HistoryEntry[], lang: Lang): { label: string; items: HistoryEntry[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: Record<string, HistoryEntry[]> = {};
  for (const e of entries) {
    const d = new Date(e.analyzedAt);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) {
      label = lang === 'zh' ? '今天' : 'Today';
    } else if (d.getTime() === yesterday.getTime()) {
      label = lang === 'zh' ? '昨天' : 'Yesterday';
    } else {
      label = d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    }
    (groups[label] ??= []).push(e);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

const SparkleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5z"/>
  </svg>
);

const ExtLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  </svg>
);

function HistoryCard({
  entry, lang, onRemove, onReanalyze,
}: {
  entry: HistoryEntry;
  lang: Lang;
  onRemove: (id: string) => void;
  onReanalyze?: (entry: HistoryEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const zh = lang === 'zh';

  const authorsDisplay = entry.authors
    ? (entry.authors.length > 3
        ? entry.authors.slice(0, 3).join(', ') + ' et al.'
        : entry.authors.join(', '))
    : null;

  return (
    <div className="pm-history-card" style={{ marginBottom: 12 }}>
      {/* Remove button */}
      <button
        onClick={() => onRemove(entry.id)}
        title={zh ? '删除记录' : 'Remove'}
        style={{
          position: 'absolute', top: 12, right: 12,
          width: 24, height: 24, borderRadius: '50%',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--pm-text-soft)', fontSize: 16, lineHeight: 1,
          opacity: 0, transition: 'opacity 150ms, color 150ms',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.opacity = '1';
          (e.target as HTMLButtonElement).style.color = 'var(--pm-error)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.opacity = '0';
          (e.target as HTMLButtonElement).style.color = 'var(--pm-text-soft)';
        }}
        className="pm-history-card-remove"
      >
        ×
      </button>

      {/* Title row */}
      <div style={{ display: 'flex', gap: 8, paddingRight: 28, marginBottom: 6 }}>
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
          {entry.source === 'arxiv' ? '📄' : '📁'}
        </span>
        <h3 style={{
          fontSize: 14, fontWeight: 600,
          color: 'var(--pm-blue)',
          lineHeight: 1.45, margin: 0,
          letterSpacing: '-0.005em', cursor: 'pointer',
        }}
          onClick={() => onReanalyze?.(entry)}
        >
          {entry.title}
        </h3>
      </div>

      {/* Meta */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        fontSize: 12.5, color: 'var(--pm-text-muted)', marginLeft: 22, marginBottom: 6,
      }}>
        {authorsDisplay && <span>{authorsDisplay}</span>}
        {authorsDisplay && entry.published && <span style={{ color: 'var(--pm-text-soft)' }}>·</span>}
        {entry.published && <span>{entry.published}</span>}
        {entry.absUrl && (
          <>
            <span style={{ color: 'var(--pm-text-soft)' }}>·</span>
            <a
              href={entry.absUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--pm-blue)', display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none', fontWeight: 500 }}
            >
              arXiv <ExtLinkIcon />
            </a>
          </>
        )}
        {entry.source === 'upload' && (
          <>
            <span style={{ color: 'var(--pm-text-soft)' }}>·</span>
            <span className="pm-badge pm-badge-pdf">PDF</span>
          </>
        )}
        <span style={{ color: 'var(--pm-text-soft)' }}>·</span>
        <span style={{ color: 'var(--pm-text-soft)' }}>
          {zh ? '解析于 ' : 'Analyzed '}
          {new Date(entry.analyzedAt).toLocaleTimeString(zh ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Abstract toggle */}
      {entry.summary && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              marginLeft: 22, fontSize: 12.5, color: 'var(--pm-blue)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
              fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? (zh ? '收起摘要' : 'Collapse') : (zh ? '展开摘要' : 'Show abstract')}
          </button>

          {expanded && (
            <div style={{
              marginLeft: 22, marginTop: 10,
              borderTop: '1px solid var(--pm-divider)', paddingTop: 10,
            }}>
              <p style={{ fontSize: 13, color: 'var(--pm-text-mid)', lineHeight: 1.65, margin: '0 0 12px' }}>
                {entry.summary}
              </p>
              {onReanalyze && entry.source === 'arxiv' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => onReanalyze(entry)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      height: 32, padding: '0 14px',
                      borderRadius: 'var(--pm-r-sm)',
                      background: 'var(--pm-blue)', color: '#fff',
                      fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(12,68,124,0.25)',
                    }}
                  >
                    <SparkleIcon />
                    {zh ? '深度解析' : 'Deep analysis'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!entry.summary && onReanalyze && entry.source === 'arxiv' && (
        <button
          onClick={() => onReanalyze(entry)}
          style={{
            marginLeft: 22, fontSize: 12.5, color: 'var(--pm-blue)',
            background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500,
          }}
        >
          {zh ? '再次解析 →' : 'Re-analyze →'}
        </button>
      )}
    </div>
  );
}

// Add hover handler via CSS injection for the remove button
const hoverStyle = `
  .pm-history-card:hover .pm-history-card-remove { opacity: 1 !important; }
`;

export default function HistoryList({
  entries, lang, onRemove, onClear, onReanalyze,
  maxItems, showViewAll, hideHeader,
}: Props) {
  const zh = lang === 'zh';
  const displayed = maxItems ? entries.slice(0, maxItems) : entries;
  const grouped = groupByDate(displayed, lang);

  if (entries.length === 0) return null;

  return (
    <div>
      <style>{hoverStyle}</style>

      {!hideHeader && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--pm-text)', letterSpacing: '-0.005em' }}>
            {zh ? '最近解析' : 'Recent Analyses'}
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {showViewAll && entries.length > (maxItems ?? 0) && (
              <a href="/history" style={{ fontSize: 13, color: 'var(--pm-blue)', textDecoration: 'none', fontWeight: 500 }}>
                {zh ? '查看全部 →' : 'View all →'}
              </a>
            )}
            {!showViewAll && (
              <button
                onClick={() => {
                  if (confirm(zh ? '确定清空所有历史记录？' : 'Clear all history?')) onClear();
                }}
                style={{
                  fontSize: 12, color: 'var(--pm-text-muted)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--pm-r-xs)',
                  transition: 'color 150ms',
                }}
              >
                🗑 {zh ? '清空历史' : 'Clear all'}
              </button>
            )}
          </div>
        </div>
      )}

      {grouped.map(({ label, items }) => (
        <div key={label} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 12, color: 'var(--pm-text-muted)', fontWeight: 600,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            paddingBottom: 8, borderBottom: '1px solid var(--pm-border)', marginBottom: 10,
          }}>
            {label}
          </div>
          {items.map((entry) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              lang={lang}
              onRemove={onRemove}
              onReanalyze={onReanalyze}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
