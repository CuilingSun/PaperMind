'use client';

import { useState } from 'react';
import { ArxivPaper } from '@/lib/arxiv';
import { Lang } from '@/lib/gemini';

interface Props {
  paper: ArxivPaper;
  lang: Lang;
  hasApiKey: boolean;
  onAnalyze: (paper: ArxivPaper) => void;
}

export default function PaperCard({ paper, lang, hasApiKey, onAnalyze }: Props) {
  const [expanded, setExpanded] = useState(false);
  const zh = lang === 'zh';

  const authorsDisplay = paper.authors.length > 3
    ? paper.authors.slice(0, 3).join(', ') + ' et al.'
    : paper.authors.join(', ');

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="px-5 py-4">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1.5">
          {paper.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <span>{authorsDisplay}</span>
          <span>·</span>
          <span>{paper.published}</span>
          <span>·</span>
          <a
            href={paper.absUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
          >
            arXiv ↗
          </a>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
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
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-600 leading-relaxed">{paper.summary}</p>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onAnalyze(paper)}
                disabled={!hasApiKey}
                title={!hasApiKey ? (zh ? '请先设置 API Key' : 'Set up API Key first') : ''}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {zh ? '深度解析' : 'Deep analysis'}
                <span>→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
