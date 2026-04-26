'use client';

import { useEffect, useRef, useState } from 'react';
import { Lang } from '@/lib/gemini';

const OPTIONS: { value: Lang; label: string; sub: string }[] = [
  { value: 'zh', label: '中文', sub: 'Chinese' },
  { value: 'en', label: 'EN',   sub: 'English' },
];

interface Props {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

export default function LangDropdown({ lang, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = OPTIONS.find((o) => o.value === lang)!;

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>🌐</span>
        <span>{current.label}</span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                lang === opt.value
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{opt.label}</span>
              <span className="text-xs text-slate-400">{opt.sub}</span>
              <svg
                className={`w-3.5 h-3.5 ml-1 shrink-0 ${lang === opt.value ? 'text-indigo-500' : 'invisible'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
