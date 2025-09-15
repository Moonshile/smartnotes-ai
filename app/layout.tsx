import './globals.css'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import Image from 'next/image'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'smartnotes.ai',
  description: 'Local-first notes with embedded AI chat',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`} suppressHydrationWarning>
        <div className="relative">
          <div className="hero-bg" aria-hidden />
          <div className="relative mx-auto max-w-7xl px-6 py-4">
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl overflow-hidden shadow-md ring-1 ring-white/40" aria-label="smartnotes.ai logo">
                  <Image src="/logo.svg" alt="smartnotes.ai" width={56} height={56} priority />
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-semibold tracking-tight bg-clip-text text-transparent"
                       style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))' }}>
                    smartnotes.ai
                  </div>
                  <div className="text-sm text-slate-800/90">Notes with an embedded assistant</div>
                </div>
              </div>
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
