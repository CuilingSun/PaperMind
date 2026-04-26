'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SECTION_KEYS, SECTION_LABELS, SectionKey, Lang } from '@/lib/gemini';
import { stripFigureJson } from '@/lib/figureParser';

const SECTION_META: Record<SectionKey, { icon: string; color: string }> = {
  '摘要翻译':      { icon: '📋', color: 'border-l-blue-400' },
  '方法动机':      { icon: '💡', color: 'border-l-amber-400' },
  '方法设计':      { icon: '🔧', color: 'border-l-purple-400' },
  '与其他方法对比': { icon: '⚖️', color: 'border-l-green-400' },
  '实验表现与优势': { icon: '📊', color: 'border-l-orange-400' },
  '学习与应用':    { icon: '🎓', color: 'border-l-pink-400' },
  '总结':         { icon: '✨', color: 'border-l-indigo-400' },
};

// Matches: Figure 1, Figure 2a, Fig. 3, Fig 4
const FIGURE_RE = /\b(Figure|Fig\.?)\s*(\d+[a-zA-Z]?)/gi;

// Extract only RFC-3986-valid characters so Chinese text Gemini occasionally
// appends inside parentheses (e.g. ".../repo获取") is stripped.
function sanitizeHref(href: string | undefined): string | undefined {
  if (!href) return href;
  const m = href.match(/^(https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+)/);
  return m ? m[1] : href;
}

// Pre-process markdown: turn "Figure N" into a fake link [Figure N](fig:N)
// so react-markdown's `a` component can intercept it reliably.
function injectFigureLinks(text: string, figureMap: Map<string, number>): string {
  return text.replace(FIGURE_RE, (match) => {
    const page = figureMap.get(match.toLowerCase()) ?? 0;
    return `[${match}](fig:${page})`;
  });
}

interface Props {
  sections: Partial<Record<SectionKey, string>>;
  currentSection: SectionKey | null;
  isAnalyzing: boolean;
  error: string;
  figureMap: Map<string, number>;
  onFigureClick: (page: number) => void;
  lang: Lang;
}

function MarkdownContent({
  content,
  figureMap,
  onFigureClick,
}: {
  content: string;
  figureMap: Map<string, number>;
  onFigureClick: (page: number) => void;
}) {
  const processed = injectFigureLinks(stripFigureJson(content), figureMap);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Figure refs: intercept both our injected fig: links and any real links
        // that Gemini may have attached to Figure-reference text.
        a: ({ href: rawHref, children }) => {
          const href = sanitizeHref(rawHref);
          // Derive page from fig: href OR from figureMap via link text
          let page = 0;
          if (href?.startsWith('fig:')) {
            page = parseInt(href.slice(4), 10);
          } else {
            const text = typeof children === 'string'
              ? children
              : Array.isArray(children) ? children.map(c => (typeof c === 'string' ? c : '')).join('') : '';
            if (/^(Figure|Fig\.?)\s*\d+/i.test(text)) {
              page = figureMap.get(text.toLowerCase().trim()) ?? 0;
            }
          }

          if (href?.startsWith('fig:') || page > 0) {
            const hasPage = page > 0;
            return (
              <button
                onClick={() => hasPage && onFigureClick(page)}
                title={hasPage ? `跳转到第 ${page} 页` : '页码未知'}
                className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs font-medium transition-colors ${
                  hasPage
                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer underline underline-offset-2'
                    : 'bg-slate-100 text-slate-400 cursor-default'
                }`}
              >
                {children}
                {hasPage && <span className="text-blue-400 not-italic">↗</span>}
              </button>
            );
          }
          // Regular external link — open in new tab
          const isGitHub = href?.includes('github.com');
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
            >
              {isGitHub && <span className="text-xs">⎇</span>}
              {children}
              <span className="text-xs text-slate-400">↗</span>
            </a>
          );
        },
        p: ({ children }) => <p className="mb-3 leading-7 text-slate-700">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-700">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-700">{children}</ol>,
        li: ({ children }) => <li className="leading-7">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
        h3: ({ children }) => <h3 className="font-semibold text-slate-800 mt-4 mb-2">{children}</h3>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead>{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        th: ({ children }) => (
          <th className="border border-slate-200 bg-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-slate-200 px-3 py-2 text-sm text-slate-700">{children}</td>
        ),
        tr: ({ children }) => <tr className="even:bg-slate-50">{children}</tr>,
        code: ({ children, className }) => {
          if (typeof children === 'string' && children.includes('"figures"')) return null;
          return (
            <code className={`bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800 ${className ?? ''}`}>
              {children}
            </code>
          );
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}

export default function ReportView({
  sections,
  currentSection,
  isAnalyzing,
  error,
  figureMap,
  onFigureClick,
  lang,
}: Props) {
  const completedCount = Object.keys(sections).length;
  // Sections start expanded; collapse state keyed by SectionKey
  const [collapsed, setCollapsed] = useState<Partial<Record<SectionKey, boolean>>>({});

  const toggle = (key: SectionKey) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-6 space-y-3">
        {isAnalyzing && (
          <>
            {/* Progress bar */}
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / SECTION_KEYS.length) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-xs">{completedCount}/{SECTION_KEYS.length}</span>
            </div>

            {/* "Reading the paper" banner — shown only before any section arrives */}
            {completedCount === 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-medium text-indigo-700">
                    {lang === 'zh' ? 'AI 正在读取论文…' : 'AI is reading the paper…'}
                  </p>
                  <p className="text-xs text-indigo-400 mt-0.5">
                    {lang === 'zh'
                      ? '通常需要 20–60 秒，请稍候'
                      : 'Usually takes 20–60 seconds'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>{lang === 'zh' ? '出错了：' : 'Error: '}</strong>{error}
          </div>
        )}

        {SECTION_KEYS.map((key) => {
          const content = sections[key];
          const meta = SECTION_META[key];
          const isStreaming = isAnalyzing && currentSection === key;
          const isPending = isAnalyzing && !content && !isStreaming;
          if (!content && !isStreaming && !isAnalyzing) return null;

          const isCollapsed = !!collapsed[key];

          return (
            <div
              key={key}
              className={`rounded-xl border bg-white shadow-sm border-l-4 overflow-hidden transition-opacity duration-300 ${
                isPending ? 'border-slate-100 opacity-50' : `border-slate-200 ${meta.color}`
              }`}
            >
              {/* Accordion header — always visible */}
              <button
                onClick={() => !isPending && toggle(key)}
                className={`w-full flex items-center gap-2 px-5 py-4 text-left transition-colors ${
                  isPending ? 'cursor-default' : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{meta.icon}</span>
                <h2 className={`font-semibold text-sm flex-1 ${isPending ? 'text-slate-400' : 'text-slate-900'}`}>
                  {SECTION_LABELS[key][lang]}
                </h2>
                {isStreaming && (
                  <span className="flex items-center gap-1.5 text-xs text-indigo-500 mr-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    {lang === 'zh' ? '生成中' : 'Generating'}
                  </span>
                )}
                {/* Chevron — hidden for pending cards */}
                {!isPending && (
                  <svg
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Collapsible body */}
              {!isCollapsed && (
                <div className="px-5 pb-5 text-sm border-t border-slate-100">
                  {content ? (
                    <div className="pt-4">
                      <MarkdownContent
                        content={content}
                        figureMap={figureMap}
                        onFigureClick={onFigureClick}
                      />
                    </div>
                  ) : (
                    <div className="pt-4 space-y-2">
                      <div className={`h-3 bg-slate-100 rounded w-3/4 ${isStreaming ? 'animate-pulse' : ''}`} />
                      <div className={`h-3 bg-slate-100 rounded w-full ${isStreaming ? 'animate-pulse' : ''}`} />
                      <div className={`h-3 bg-slate-100 rounded w-2/3 ${isStreaming ? 'animate-pulse' : ''}`} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!isAnalyzing && !error && completedCount === SECTION_KEYS.length && (
          <div className="text-center py-2">
            <span className="text-xs text-green-600 font-medium">
              {lang === 'zh' ? '✓ 分析完成，可在下方追问' : '✓ Analysis complete — ask follow-up questions below'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
