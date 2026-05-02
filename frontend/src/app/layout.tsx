import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AutoMCP - Automatic MCP Server Generator',
  description: 'Generate production-ready MCP servers from API specifications using IBM watsonx.ai',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="theme-init" strategy="beforeInteractive" src="/theme-init.js" />
        <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <Link href="/" className="font-bold text-gray-900 dark:text-slate-50 text-lg tracking-tight">
            AutoMCP
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/generate" className="text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              Generator
            </Link>
            <Link href="/settings" className="text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              Agent Config
            </Link>
            <ThemeToggle />
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
