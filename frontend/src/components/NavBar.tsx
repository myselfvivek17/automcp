'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 44 24" aria-hidden="true">
      <line x1="4" y1="12" x2="40" y2="12" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 2.5" />
      {[6, 14, 22, 30, 38].map((cx, i) => (
        <circle key={i} cx={cx} cy="12" r={i === 2 ? 3.4 : 2.4} fill="currentColor" />
      ))}
    </svg>
  );
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'color-mix(in oklab, var(--paper) 86%, transparent)',
      backdropFilter: 'blur(10px) saturate(140%)',
      WebkitBackdropFilter: 'blur(10px) saturate(140%)',
      borderBottom: '1px solid var(--rule)',
      padding: '14px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Link
        href="/"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          color: 'var(--ink)', textDecoration: 'none',
        }}
      >
        <LogoMark size={22} />
        <span className="serif" style={{ fontSize: 22, lineHeight: 1, letterSpacing: '-0.01em' }}>
          AutoMCP
        </span>
        <span style={{ width: 1, height: 14, background: 'var(--rule-strong)', display: 'inline-block' }} />
        <span className="mono" style={{
          fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--ink-mute)',
        }}>
          v0.4 beta
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <NavLink href="/" active={pathname === '/'}>Overview</NavLink>
        <NavLink href="/generate" active={pathname === '/generate'}>Generator</NavLink>
        <NavLink href="/settings" active={pathname === '/settings'}>Agents</NavLink>
        <span style={{ width: 1, height: 18, background: 'var(--rule-strong)', margin: '0 10px' }} />
        <ThemeToggle />
        <Link
          href="/generate"
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 6, textDecoration: 'none' }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: 3, background: 'var(--accent)',
            display: 'inline-block', animation: 'pulse-dot 1.6s ease-in-out infinite',
          }} />
          New run
        </Link>
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: 'inline-block',
      padding: '6px 12px',
      fontSize: 13, fontWeight: 500, fontFamily: 'var(--sans)',
      color: active ? 'var(--ink)' : 'var(--ink-3)',
      borderBottom: active ? '1.5px solid var(--accent)' : '1.5px solid transparent',
      letterSpacing: '-0.005em',
      textDecoration: 'none',
      transition: 'color 0.15s ease',
    }}>
      {children}
    </Link>
  );
}
