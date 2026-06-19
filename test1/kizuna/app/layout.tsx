import type { Metadata } from 'next'
import { Zen_Old_Mincho, Shippori_Mincho, DM_Sans, Noto_Serif_JP } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { LenisProvider } from '@/components/providers/LenisProvider'
import { Cursor } from '@/components/ui/Cursor'
import { PageTransitionOverlay } from '@/components/ui/PageTransitionOverlay'

const zen = Zen_Old_Mincho({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-zen',
  display: 'swap',
  preload: false,
})

const shippori = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-shippori',
  display: 'swap',
  preload: false,
})

const dm = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const noto = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-noto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '絆プロジェクト — Créateurs japonais pour la France',
  description: 'Trente créateurs japonais d\'exception, réunis pour le marché français.',
  openGraph: {
    title: '絆プロジェクト',
    description: 'Artisanat, mode, épicerie et maison — le meilleur du Japon pour la France.',
    locale: 'fr_FR',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${zen.variable} ${shippori.variable} ${dm.variable} ${noto.variable}`}>
      <body className="bg-washi text-sumi antialiased">
        <LenisProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
          <Cursor />
          <PageTransitionOverlay />
        </LenisProvider>
      </body>
    </html>
  )
}
