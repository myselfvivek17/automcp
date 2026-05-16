import type { Metadata } from 'next';
import Script from 'next/script';
import { NavBar } from '@/components/NavBar';
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
        <NavBar />
        {children}
      </body>
    </html>
  );
}
