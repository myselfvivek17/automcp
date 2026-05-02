import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AutoMCP - Automatic MCP Server Generator',
  description: 'Generate production-ready MCP servers from API specifications using IBM watsonx.ai',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <Link href="/" className="font-bold text-gray-900 text-lg tracking-tight">
            AutoMCP
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/generate" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
              Generator
            </Link>
            <Link
              href="/settings"
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Agent Config
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
