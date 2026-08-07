'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useCart } from '@/lib/store/cart'
import { CartDrawer } from './CartDrawer'

const navLinks = [
  { href: '/shop', label: 'Boutique', ja: '商品一覧' },
  { href: '/shop?cat=craft', label: 'Artisanat', ja: '工芸' },
  { href: '/shop?cat=fashion', label: 'Mode', ja: 'ファッション' },
  { href: '/shop?cat=food', label: 'Épicerie', ja: '食・茶・酒' },
  { href: '/shop?cat=home', label: 'Maison', ja: 'ホーム' },
]

export function Header() {
  const count = useCart((s) => s.count())
  const toggle = useCart((s) => s.toggle)
  const isOpen = useCart((s) => s.isOpen)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-ivoire/90 backdrop-blur-sm border-b border-encre/8">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-cormorant text-2xl tracking-[0.15em] uppercase text-encre">
            KANMI
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-dm text-[13px] tracking-[0.08em] uppercase text-encre/70 hover:text-encre transition-colors duration-200"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => toggle()}
              className="relative font-dm text-[13px] tracking-[0.08em] uppercase text-encre/70 hover:text-encre transition-colors duration-200"
              aria-label="Panier"
            >
              Panier
              {count > 0 && (
                <span className="absolute -top-2 -right-3 bg-argile text-ivoire text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-dm">
                  {count}
                </span>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              className="md:hidden w-6 h-4 flex flex-col justify-between"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              <span className={`block h-px bg-encre transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-px bg-encre transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-px bg-encre transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden border-t border-encre/8 bg-ivoire overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-4">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="font-dm text-sm tracking-[0.06em] uppercase text-encre/80"
                  >
                    {l.label}
                    <span className="ml-2 text-brume text-xs">{l.ja}</span>
                  </Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <CartDrawer isOpen={isOpen} onClose={() => toggle()} />
    </>
  )
}
