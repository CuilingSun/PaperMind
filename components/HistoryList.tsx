'use client';

import { HistoryEntry } from '@/lib/history';
import { Lang } from '@/lib/gemini';

interface Props {
  entries: HistoryEntry[];
  lang: Lang;
  onRemove: (id: string) => void;
  onClear: () => void;
  onReanalyze?: (entry: HistoryEntry) => void;
  maxItems?: number; // if set, truncate and show "view all" link
  showViewAll?: boolean;
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

export default function HistoryList({
  entries,
  lang,
  onRemove,
  onClear,
  onReanalyze,
  maxItems,
  showViewAll,
}: Props) {
  const zh = lang === 'zh';
  const displayed = maxItems ? entries.slice(0, maxItems) : entries;
  const grouped = groupByDate(displayed, lang);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
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

      {grouped.map(({ label, items }) => (
        <div key={label}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="space-y-2">
            {items.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 group"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-base shrink-0 mt-0.5">
                    {entry.source === 'arxiv' ? '📄' : '📁'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{entry.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {entry.authors ? entry.authors.slice(0, 2).join(', ') + (entry.authors.length > 2 ? ' et al.' : '') + ' · ' : ''}
                      {zh ? '解析于 ' : 'Analyzed '}
                      {new Date(entry.analyzedAt).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {entry.source === 'arxiv' && (
                      <div className="flex items-center gap-3 mt-1.5">
                        <a
                          href={entry.absUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          arXiv ↗
                        </a>
                        {onReanalyze && (
                          <button
                            onClick={() => onReanalyze(entry)}
                            className="text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            {zh ? '再次解析' : 'Re-analyze'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(entry.id)}
                  className="shrink-0 text-slate-300 hover:text-red-500 transition-colors text-lg leading-none mt-0.5 opacity-0 group-hover:opacity-100"
                  title={zh ? '删除记录' : 'Remove'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
