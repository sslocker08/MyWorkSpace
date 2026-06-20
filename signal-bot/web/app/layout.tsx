import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Signal Bot — AI Market Scanner',
  description: 'AI-native full-market scanner with ceiling score detection',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="dark">
      <body className="bg-bg text-gray-100 min-h-screen font-mono">
        <nav className="border-b border-border px-6 py-3 flex items-center gap-8 sticky top-0 z-50 bg-bg/80 backdrop-blur">
          <span className="text-accent font-bold text-lg tracking-widest">SIGNAL BOT</span>
          <div className="flex gap-6 text-sm text-muted">
            <a href="/dashboard" className="hover:text-accent transition-colors">ダッシュボード</a>
            <a href="/signals" className="hover:text-accent transition-colors">シグナル</a>
            <a href="/scanner" className="hover:text-accent transition-colors">スキャナー</a>
            <a href="/market-intel" className="hover:text-accent transition-colors">マーケット</a>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
