'use client';

import { useEffect, useRef, useState } from 'react';
import { Lang } from '@/lib/gemini';
import { getSuggestions } from '@/lib/arxivSuggestions';
import { getPreferenceKeywords, savePreferenceKeywords } from '@/lib/preferenceKeywords';

interface Props {
  lang: Lang;
  onChange?: (keywords: string[]) => void;
}

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

const XIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

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
  }, [onChange]);

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
    <div className="pm-panel">
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pm-text)', letterSpacing: '-0.005em' }}>
          {zh ? '我的关键词偏好' : 'My Keyword Preferences'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--pm-text-muted)', marginTop: 3, marginBottom: 14 }}>
          {zh ? '添加感兴趣的研究领域，今日精选将自动为你推荐相关论文' : 'Add research topics — Today\'s Picks will recommend matching papers'}
        </div>
      </div>

      {/* Input row */}
      <div ref={containerRef} className="relative" style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
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
            placeholder={zh ? '输入关键词，如 diffusion model、agent…' : 'Add a topic, e.g. diffusion model, agent…'}
            style={{
              flex: 1, height: 36,
              padding: '0 12px',
              border: '1px solid var(--pm-border)',
              borderRadius: 'var(--pm-r-sm)',
              fontSize: 14, color: 'var(--pm-text)',
              background: '#fff', outline: 'none',
              transition: 'border-color 180ms, box-shadow 180ms',
            }}
          />
          <button
            onClick={() => add(input)}
            disabled={!input.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 16px',
              borderRadius: 'var(--pm-r-sm)',
              background: 'var(--pm-blue)', color: '#fff',
              fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
              opacity: !input.trim() ? 0.4 : 1,
              transition: 'opacity 180ms, background 180ms',
            }}
          >
            <PlusIcon />{zh ? '添加' : 'Add'}
          </button>
        </div>

        {suggestions.length > 0 && (
          <ul style={{
            position: 'absolute', zIndex: 50, left: 0, right: 48,
            top: 'calc(100% + 4px)',
            background: '#fff',
            border: '1px solid var(--pm-border)',
            borderRadius: 'var(--pm-r-md)',
            boxShadow: 'var(--pm-sh-md)',
            overflow: 'hidden',
            listStyle: 'none', margin: 0, padding: 6,
          }}>
            {suggestions.map((s, i) => (
              <li key={s.label}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); add(s.label); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: 'var(--pm-r-xs)',
                    fontSize: 13, textAlign: 'left', border: 'none', cursor: 'pointer',
                    background: i === activeIdx ? 'var(--pm-blue-light)' : 'transparent',
                    color: i === activeIdx ? 'var(--pm-blue-dark)' : 'var(--pm-text)',
                    transition: 'background 120ms',
                  }}
                >
                  <span>{s.label}</span>
                  {s.tag && <span style={{ fontSize: 11, color: 'var(--pm-text-soft)', marginLeft: 8, flexShrink: 0 }}>{s.tag}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pills */}
      {keywords.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {keywords.map((kw) => (
            <span key={kw} className="pm-pill">
              {kw}
              <span className="pm-pill-x" onClick={() => remove(kw)}><XIcon /></span>
            </span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--pm-text-muted)', margin: 0 }}>
          {zh
            ? '还没有偏好关键词，添加后「今日精选」将根据你的兴趣推荐论文'
            : "No keywords yet — add some to personalize Today's Picks"}
        </p>
      )}
    </div>
  );
}
