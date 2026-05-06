'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SECTION_KEYS, SECTION_LABELS, SectionKey, Lang } from '@/lib/gemini';
import { stripFigureJson } from '@/lib/figureParser';

const SECTION_NUMS: Record<SectionKey, number> = {
  '摘要翻译':       1,
  '方法动机':       2,
  '方法设计':       3,
  '与其他方法对比':  4,
  '实验表现与优势':  5,
  '学习与应用':     6,
  '总结':           7,
};

const FIGURE_RE = /\b(Figure|Fig\.?)\s*(\d+[a-zA-Z]?)/gi;

function sanitizeHref(href: string | undefined): string | undefined {
  if (!href) return href;
  const m = href.match(/^(https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+)/);
  return m ? m[1] : href;
}

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
  content, figureMap, onFigureClick,
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
        a: ({ href: rawHref, children }) => {
          const href = sanitizeHref(rawHref);
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
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  borderRadius: 4, padding: '1px 6px',
                  fontSize: 12, fontWeight: 500,
                  background: hasPage ? 'var(--pm-blue-light)' : 'var(--pm-bg-soft)',
                  color: hasPage ? 'var(--pm-blue)' : 'var(--pm-text-muted)',
                  cursor: hasPage ? 'pointer' : 'default',
                  border: 'none',
                  textDecoration: hasPage ? 'underline' : 'none',
                }}
              >
                {children}
                {hasPage && <span style={{ color: 'var(--pm-blue)', opacity: 0.6 }}>↗</span>}
              </button>
            );
          }
          const isGitHub = href?.includes('github.com');
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--pm-blue)', textDecoration: 'underline' }}
            >
              {isGitHub && <span style={{ fontSize: 11 }}>⎇ </span>}
              {children}
              <span style={{ fontSize: 11, color: 'var(--pm-text-soft)' }}>↗</span>
            </a>
          );
        },
        p: ({ children }) => <p style={{ marginBottom: 12, lineHeight: 1.75, color: 'var(--pm-text)' }}>{children}</p>,
        ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 12, lineHeight: 1.75, color: 'var(--pm-text)' }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 12, lineHeight: 1.75, color: 'var(--pm-text)' }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
        strong: ({ children }) => <strong style={{ fontWeight: 600, color: 'var(--pm-text)' }}>{children}</strong>,
        h3: ({ children }) => <h3 style={{ fontWeight: 600, color: 'var(--pm-text)', marginTop: 16, marginBottom: 8 }}>{children}</h3>,
        table: ({ children }) => (
          <div style={{ overflowX: 'auto', margin: '16px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead>{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        th: ({ children }) => (
          <th style={{ border: '1px solid var(--pm-border)', background: 'var(--pm-bg-region)', padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--pm-text-mid)' }}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td style={{ border: '1px solid var(--pm-border)', padding: '8px 12px', fontSize: 13, color: 'var(--pm-text)' }}>{children}</td>
        ),
        tr: ({ children }) => <tr>{children}</tr>,
        code: ({ children }) => {
          if (typeof children === 'string' && children.includes('"figures"')) return null;
          return (
            <code style={{
              background: 'var(--pm-bg-soft)', padding: '2px 6px',
              borderRadius: 4, fontSize: 12.5, fontFamily: 'monospace',
              color: 'var(--pm-text-mid)',
            }}>
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
  sections, currentSection, isAnalyzing, error, figureMap, onFigureClick, lang,
}: Props) {
  const completedCount = Object.keys(sections).length;
  const [collapsed, setCollapsed] = useState<Partial<Record<SectionKey, boolean>>>({});
  const toggle = (key: SectionKey) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '24px 24px', maxWidth: 780, margin: '0 auto' }}>

        {isAnalyzing && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 4, background: 'var(--pm-border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${(completedCount / SECTION_KEYS.length) * 100}%`,
                  background: 'linear-gradient(90deg, var(--pm-blue) 0%, var(--pm-purple) 100%)',
                  transition: 'width 500ms ease',
                }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--pm-text-muted)', flexShrink: 0 }}>
                {completedCount}/{SECTION_KEYS.length}
              </span>
            </div>

            {completedCount === 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                borderRadius: 'var(--pm-r-md)',
                border: '1px solid rgba(107,76,154,0.15)',
                background: 'var(--pm-purple-light-2)',
                padding: '14px 18px', marginBottom: 20,
              }}>
                <span style={{
                  width: 16, height: 16, border: '2px solid rgba(107,76,154,0.3)',
                  borderTopColor: 'var(--pm-purple)',
                  borderRadius: '50%', animation: 'pm-spin 1s linear infinite', display: 'inline-block', flexShrink: 0,
                }} />
                <style>{`@keyframes pm-spin { to { transform: rotate(360deg); } }`}</style>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pm-purple-dark)', margin: 0 }}>
                    {lang === 'zh' ? 'AI 正在读取论文…' : 'AI is reading the paper…'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--pm-purple)', margin: '2px 0 0' }}>
                    {lang === 'zh' ? '通常需要 20–60 秒，请稍候' : 'Usually takes 20–60 seconds'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div style={{
            borderRadius: 'var(--pm-r-md)', border: '1px solid rgba(226,75,74,0.3)',
            background: '#fff5f5', padding: '14px 18px', marginBottom: 16,
            fontSize: 13, color: 'var(--pm-error)',
          }}>
            <strong>{lang === 'zh' ? '出错了：' : 'Error: '}</strong>{error}
          </div>
        )}

        {SECTION_KEYS.map((key) => {
          const content = sections[key];
          const num = SECTION_NUMS[key];
          const isStreaming = isAnalyzing && currentSection === key;
          const isPending = isAnalyzing && !content && !isStreaming;
          if (!content && !isStreaming && !isAnalyzing) return null;

          const isCollapsed = !!collapsed[key];

          return (
            <div
              key={key}
              className={`pm-dim-card ${isPending ? 'pm-dim-card-pending' : ''}`}
            >
              {/* Header */}
              <button
                onClick={() => !isPending && toggle(key)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  cursor: isPending ? 'default' : 'pointer',
                  padding: 0,
                }}
              >
                <div className="pm-dim-header">
                  <span className="pm-dim-num">{num}</span>
                  <span className="pm-dim-title-text" style={{ flex: 1, textAlign: 'left' }}>
                    {SECTION_LABELS[key][lang]}
                  </span>
                  {isStreaming && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 12, color: 'var(--pm-purple)', fontWeight: 500,
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--pm-purple)', animation: 'pulse 1.4s ease infinite',
                        display: 'inline-block',
                      }} />
                      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
                      {lang === 'zh' ? '生成中' : 'Generating'}
                    </span>
                  )}
                  {!isPending && (
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pm-text-soft)" strokeWidth="2"
                      style={{ transform: isCollapsed ? 'none' : 'rotate(180deg)', transition: 'transform 200ms', flexShrink: 0 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Body */}
              {!isCollapsed && (
                <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--pm-text)' }}>
                  {content ? (
                    <MarkdownContent content={content} figureMap={figureMap} onFigureClick={onFigureClick} />
                  ) : (
                    <div style={{ paddingTop: 4 }}>
                      {[0.92, 0.78, 0.65].map((w, i) => (
                        <div key={i} className="pm-skel" style={{
                          height: 12, marginBottom: 8, width: `${w * 100}%`,
                          animationDelay: `${i * 0.12}s`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!isAnalyzing && !error && completedCount === SECTION_KEYS.length && (
          <div style={{ textAlign: 'center', padding: '8px 0 16px', fontSize: 12, color: 'var(--pm-success)', fontWeight: 500 }}>
            ✓ {lang === 'zh' ? '分析完成，可在下方追问' : 'Analysis complete — ask follow-up questions below'}
          </div>
        )}
      </div>
    </div>
  );
}
