'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LangDropdown from '@/components/LangDropdown';
import { Lang } from '@/lib/gemini';

interface Props {
  lang: Lang;
  onLangChange: (l: Lang) => void;
  children?: React.ReactNode; // page-specific controls (e.g. file name, API key button)
}

export default function NavHeader({ lang, onLangChange, children }: Props) {
  const pathname = usePathname();

  const navLink = (href: string, labelZh: string, labelEn: string) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          active
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {lang === 'zh' ? labelZh : labelEn}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm shrink-0">
      <div className="px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-lg">📚</span>
            <span className="font-semibold text-slate-900">
              PaperMind
            </span>
          </Link>
          <span className="hidden sm:inline text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
            CS / AI
          </span>
          <div className="flex items-center gap-1 ml-2">
            {navLink('/tracker', '追踪', 'Track')}
            {navLink('/analyze', '解析', 'Analyze')}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {children}
          <LangDropdown lang={lang} onChange={onLangChange} />
        </div>
      </div>
    </header>
  );
}
