import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import './globals.css';
import './styles.css';

export const metadata: Metadata = {
  title: 'AutoMCP - Automatic MCP Server Generator',
  description: 'Generate production-ready MCP servers from API specifications using IBM watsonx.ai',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive" src="/theme-init.js" />
        <header className="nav-blur" style={{
          borderBottom: '1px solid var(--rule)',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <Link href="/" style={{ fontFamily: 'var(--sans)', fontWeight: 700, color: 'var(--ink)', fontSize: '18px', letterSpacing: '-0.01em' }}>
            AutoMCP
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '14px' }}>
            <Link href="/" style={{ color: 'var(--ink-3)', fontFamily: 'var(--sans)', fontWeight: 500, transition: 'color 0.15s ease' }} className="hover:text-accent">
              Overview
            </Link>
            <Link href="/generate" style={{ color: 'var(--ink-3)', fontFamily: 'var(--sans)', fontWeight: 500, transition: 'color 0.15s ease' }} className="hover:text-accent">
              Generator
            </Link>
            <Link href="/settings" style={{ color: 'var(--ink-3)', fontFamily: 'var(--sans)', fontWeight: 500, transition: 'color 0.15s ease' }} className="hover:text-accent">
              Agents
            </Link>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
