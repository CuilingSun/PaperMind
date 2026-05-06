'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lang } from '@/lib/gemini';
import LangDropdown from '@/components/LangDropdown';

interface Props {
  lang: Lang;
  onLangChange: (l: Lang) => void;
  children?: React.ReactNode;
}

const BookIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

export default function NavHeader({ lang, onLangChange, children }: Props) {
  const pathname = usePathname();

  const links = [
    { href: '/tracker', zh: '追踪', en: 'Track' },
    { href: '/analyze', zh: '解析', en: 'Analyze' },
    { href: '/history', zh: '历史', en: 'History' },
  ];

  return (
    <header
      className="sticky top-0 z-40 shrink-0"
      style={{
        height: 56,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(140%) blur(8px)',
        WebkitBackdropFilter: 'saturate(140%) blur(8px)',
        borderBottom: '1px solid var(--pm-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        position: 'sticky',
        gap: 0,
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
      >
        <span className="pm-nav-logo-mark">
          <BookIcon />
        </span>
        <span style={{ fontWeight: 700, color: 'var(--pm-blue)', fontSize: 16, letterSpacing: '-0.01em' }}>
          PaperMind
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, marginLeft: 32, flex: 1 }}>
        {links.map(({ href, zh, en }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: '0 14px',
                height: 56,
                lineHeight: '56px',
                color: active ? 'var(--pm-blue)' : 'var(--pm-text-mid)',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                position: 'relative',
                textDecoration: 'none',
                transition: 'color 180ms',
                display: 'inline-block',
              }}
            >
              {lang === 'zh' ? zh : en}
              {active && <span className="pm-nav-link-active-bar" />}
            </Link>
          );
        })}
      </div>

      {/* Right: extra children + lang toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {children}
        <LangDropdown lang={lang} onChange={onLangChange} />
      </div>
    </header>
  );
}
