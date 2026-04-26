'use client';

import { useEffect, useRef, useState } from 'react';
import { Lang } from '@/lib/gemini';
import { getSuggestions, Suggestion } from '@/lib/arxivSuggestions';
import { TrackedSearch, makeSearchId, SortBy } from '@/lib/arxiv';

const ARXIV_CATEGORIES = [
  { value: 'cs.AI',    label: 'cs.AI — Artificial Intelligence' },
  { value: 'cs.CL',    label: 'cs.CL — Computation & Language' },
  { value: 'cs.CV',    label: 'cs.CV — Computer Vision' },
  { value: 'cs.LG',    label: 'cs.LG — Machine Learning' },
  { value: 'cs.RO',    label: 'cs.RO — Robotics' },
  { value: 'cs.NE',    label: 'cs.NE — Neural & Evolutionary Computing' },
  { value: 'cs.IR',    label: 'cs.IR — Information Retrieval' },
  { value: 'cs.HC',    label: 'cs.HC — Human-Computer Interaction' },
  { value: 'stat.ML',  label: 'stat.ML — Machine Learning (Statistics)' },
  { value: 'eess.IV',  label: 'eess.IV — Image & Video Processing' },
];

interface Props {
  searches: TrackedSearch[];
  onAdd: (s: TrackedSearch) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  lang: Lang;
}

function hasFilters(author: string, category: string, yearFrom: string, yearTo: string, sortBy: SortBy) {
  return !!(author || category || yearFrom || yearTo || sortBy !== 'submittedDate');
}

export default function KeywordManager({ searches, onAdd, onRemove, onClearAll, lang }: Props) {
  const [keyword, setKeyword]   = useState('');
  const [author, setAuthor]     = useState('');
  const [category, setCategory] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo]     = useState('');
  const [sortBy, setSortBy]     = useState<SortBy>('submittedDate');
  const [filterOpen, setFilterOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [isComposing, setIsComposing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const zh = lang === 'zh';

  useEffect(() => {
    if (!isComposing) {
      setSuggestions(getSuggestions(keyword));
      setActiveIdx(-1);
    }
  }, [keyword, isComposing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const commit = (kw = keyword) => {
    const k = kw.trim();
    if (!k && !author.trim() && !category) return;

    const draft: Omit<TrackedSearch, 'id'> = {
      keyword: k,
      author:   author.trim()   || undefined,
      category: category        || undefined,
      yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
      yearTo:   yearTo   ? parseInt(yearTo,   10) : undefined,
      sortBy:   sortBy !== 'submittedDate' ? sortBy : undefined,
    };
    const id = makeSearchId(draft);
    if (searches.some((s) => s.id === id)) return; // duplicate

    onAdd({ ...draft, id });
    setKeyword(''); setAuthor(''); setCategory('');
    setYearFrom(''); setYearTo(''); setSortBy('submittedDate');
    setSuggestions([]); setActiveIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        commit(suggestions[activeIdx].label);
      } else if (suggestions.length === 0) {
        commit();
      }
    }
    else if (e.key === 'Escape') { setSuggestions([]); setActiveIdx(-1); }
  };

  const filtersActive = hasFilters(author, category, yearFrom, yearTo, sortBy);
  const currentYear = new Date().getFullYear();

  return (
    <div className="px-6 py-4 border-b border-slate-200 bg-white space-y-3">
      {/* Row 1: keyword input + filter toggle + add + refresh */}
      <div className="flex gap-2">
        <div ref={containerRef} className="relative flex-1">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              setKeyword((e.target as HTMLInputElement).value);
            }}
            onFocus={() => keyword && !isComposing && setSuggestions(getSuggestions(keyword))}
            placeholder={zh ? '输入主题关键词…' : 'Topic keyword…'}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <li key={s.label}>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); commit(s.label); }}
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

        {/* Filter toggle */}
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            filtersActive
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
          title={zh ? '高级筛选' : 'Advanced filters'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 10h10M11 16h2" />
          </svg>
          {zh ? '筛选' : 'Filter'}
          {filtersActive && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
        </button>

        <button
          onClick={() => commit()}
          disabled={!keyword.trim() && !author.trim() && !category}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          {zh ? '搜索' : 'Search'}
        </button>

        {searches.length > 0 && (
          <button
            onClick={onClearAll}
            title={zh ? '清除所有搜索词' : 'Clear all'}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors text-sm"
          >
            {zh ? '清除全部' : 'Clear all'}
          </button>
        )}
      </div>

      {/* Row 2: filter panel */}
      {filterOpen && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Author */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {zh ? '作者' : 'Author'}
              </label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={zh ? '如 Kaiming He' : 'e.g. Kaiming He'}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {zh ? 'arXiv 分类' : 'arXiv Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">{zh ? '不限' : 'Any'}</option>
                {ARXIV_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Year from */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {zh ? '年份（从）' : 'Year from'}
              </label>
              <input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="2020"
                min={1991}
                max={currentYear}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Year to */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {zh ? '年份（至）' : 'Year to'}
              </label>
              <input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder={String(currentYear)}
                min={1991}
                max={currentYear}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {zh ? '排序方式' : 'Sort by'}
            </label>
            <div className="flex gap-2">
              {(['submittedDate', 'relevance'] as SortBy[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setSortBy(v)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                    sortBy === v
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {v === 'submittedDate'
                    ? (zh ? '⏱ 最新' : '⏱ Newest')
                    : (zh ? '🎯 相关度' : '🎯 Relevance')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row 3: saved search pills — appear after a suggestion is committed */}
      {searches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {searches.map((s) => {
            const parts = [s.keyword];
            if (s.author) parts.push(s.author);
            if (s.category) parts.push(s.category);
            if (s.yearFrom && s.yearTo) parts.push(`${s.yearFrom}–${s.yearTo}`);
            else if (s.yearFrom) parts.push(`${s.yearFrom}+`);
            else if (s.yearTo) parts.push(`≤${s.yearTo}`);
            const label = parts.filter(Boolean).join(' · ');

            return (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700 max-w-xs"
              >
                <span className="truncate">{label}</span>
                <button
                  onClick={() => onRemove(s.id)}
                  className="text-indigo-400 hover:text-indigo-700 leading-none shrink-0"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
