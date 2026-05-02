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

function HistoryCard({
  entry,
  lang,
  onRemove,
  onReanalyze,
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow group relative">
      <button
        onClick={() => onRemove(entry.id)}
        className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors text-lg leading-none opacity-0 group-hover:opacity-100 z-10"
        title={zh ? '删除记录' : 'Remove'}
      >
        ×
      </button>

      <div className="px-5 py-4 pr-10">
        <div className="flex items-start gap-2">
          <span className="text-base shrink-0 mt-0.5">
            {entry.source === 'arxiv' ? '📄' : '📁'}
          </span>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">
            {entry.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap mt-1.5 ml-6">
          {authorsDisplay && <span>{authorsDisplay}</span>}
          {authorsDisplay && entry.published && <span>·</span>}
          {entry.published && <span>{entry.published}</span>}
          {entry.absUrl && (
            <>
              <span>·</span>
              <a
                href={entry.absUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
              >
                arXiv ↗
              </a>
            </>
          )}
          <span>·</span>
          <span className="text-slate-400">
            {zh ? '解析于 ' : 'Analyzed '}
            {new Date(entry.analyzedAt).toLocaleTimeString(zh ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {entry.summary && (
          <>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 ml-6 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {expanded ? (zh ? '收起摘要' : 'Collapse') : (zh ? '展开摘要' : 'Show abstract')}
            </button>

            {expanded && (
              <div className="mt-3 ml-6 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-600 leading-relaxed">{entry.summary}</p>
                {onReanalyze && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => onReanalyze(entry)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                    >
                      {zh ? '深度解析' : 'Deep analysis'}
                      <span>→</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!entry.summary && onReanalyze && entry.source === 'arxiv' && (
          <div className="mt-2 ml-6">
            <button
              onClick={() => onReanalyze(entry)}
              className="text-xs text-slate-500 hover:text-indigo-600 transition-colors"
            >
              {zh ? '再次解析' : 'Re-analyze'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryList({
  entries,
  lang,
  onRemove,
  onClear,
  onReanalyze,
  maxItems,
  showViewAll,
  hideHeader,
}: Props) {
  const zh = lang === 'zh';
  const displayed = maxItems ? entries.slice(0, maxItems) : entries;
  const grouped = groupByDate(displayed, lang);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            {zh ? '最近解析' : 'Recent analyses'}
          </h3>
          <div className="flex items-center gap-3">
            {showViewAll && entries.length > (maxItems ?? 0) && (
              <a href="/history" className="text-xs text-indigo-600 hover:text-indigo-800">
                {zh ? '查看全部 →' : 'View all →'}
              </a>
            )}
            {!showViewAll && (
              <button
                onClick={() => {
                  if (confirm(zh ? '确定清空所有历史记录？' : 'Clear all history?')) onClear();
                }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                🗑 {zh ? '清空历史' : 'Clear all'}
              </button>
            )}
          </div>
        </div>
      )}

      {grouped.map(({ label, items }) => (
        <div key={label}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="space-y-3">
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
        </div>
      ))}
    </div>
  );
}
