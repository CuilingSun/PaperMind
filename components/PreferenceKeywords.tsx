'use client';

import { useEffect, useRef, useState } from 'react';
import { Lang } from '@/lib/gemini';
import { getSuggestions } from '@/lib/arxivSuggestions';
import { getPreferenceKeywords, savePreferenceKeywords } from '@/lib/preferenceKeywords';

interface Props {
  lang: Lang;
  onChange?: (keywords: string[]) => void;
}

export default function PreferenceKeywords({ lang, onChange }: Props) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<ReturnType<typeof getSuggestions>>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [isComposing, setIsComposing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const zh = lang === 'zh';

  useEffect(() => {
    const saved = getPreferenceKeywords();
    setKeywords(saved);
    onChange?.(saved);
  }, []);

  useEffect(() => {
    if (!isComposing) {
      setSuggestions(getSuggestions(input));
      setActiveIdx(-1);
    }
  }, [input, isComposing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const add = (kw: string) => {
    const k = kw.trim().toLowerCase();
    if (!k || keywords.includes(k)) return;
    const next = [...keywords, k];
    setKeywords(next);
    savePreferenceKeywords(next);
    onChange?.(next);
    setInput('');
    setSuggestions([]);
    setActiveIdx(-1);
  };

  const remove = (kw: string) => {
    const next = keywords.filter((k) => k !== kw);
    setKeywords(next);
    savePreferenceKeywords(next);
    onChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) add(suggestions[activeIdx].label);
      else if (input.trim()) add(input);
    }
    else if (e.key === 'Escape') { setSuggestions([]); setActiveIdx(-1); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800">
          {zh ? '我的关键词偏好' : 'My Keyword Preferences'}
        </h2>
        {keywords.length > 0 && (
          <span className="text-xs text-slate-400">
            {zh ? `${keywords.length} 个关键词` : `${keywords.length} keyword${keywords.length > 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      {/* Input */}
      <div ref={containerRef} className="relative mb-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              setInput((e.target as HTMLInputElement).value);
            }}
            onFocus={() => input && !isComposing && setSuggestions(getSuggestions(input))}
            placeholder={zh ? '添加感兴趣的研究方向…' : 'Add a research topic…'}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={() => add(input)}
            disabled={!input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {zh ? '添加' : 'Add'}
          </button>
        </div>

        {suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <li key={s.label}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); add(s.label); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                    i === activeIdx ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{s.label}</span>
                  {s.tag && <span className="text-xs text-slate-400 ml-2 shrink-0">{s.tag}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pills */}
      {keywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700"
            >
              {kw}
              <button
                onClick={() => remove(kw)}
                className="text-indigo-400 hover:text-indigo-700 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          {zh
            ? '还没有偏好关键词，添加后「今日精选」将根据你的兴趣推荐论文'
            : 'No keywords yet — add some to get personalized recommendations in Today\'s Picks'}
        </p>
      )}
    </div>
  );
}
