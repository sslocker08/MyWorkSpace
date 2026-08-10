'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/store/cart'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { count, open } = useCart()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
        scrolled
          ? 'bg-ai/98 backdrop-blur-sm border-kin/20'
          : 'bg-ai border-kin/15'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between h-16 md:h-20">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          <span className="font-noto text-2xl text-kin leading-none group-hover:text-washi transition-colors duration-300">
            絆
          </span>
          <div className="flex flex-col">
            <span className="font-dm text-[11px] tracking-[0.22em] uppercase text-washi/80 leading-none">
              KIZUNA
            </span>
            <span className="font-dm text-[8px] tracking-[0.12em] text-washi/30 leading-none mt-0.5 hidden sm:block">
              PROJET
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {[
            { href: '/creators', fr: 'Créateurs', ja: '職人' },
            { href: '/products', fr: 'Boutique',  ja: '作品' },
            { href: '/about',    fr: 'Philosophie', ja: '理念' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-0.5"
            >
              <span className="font-noto text-xs text-washi/40 group-hover:text-kin transition-colors duration-200">
                {item.ja}
              </span>
              <span className="font-dm text-[11px] tracking-[0.12em] uppercase text-washi/70 group-hover:text-washi transition-colors duration-200">
                {item.fr}
              </span>
            </Link>
          ))}
        </nav>

        {/* Right — cart + mobile menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={open}
            className="relative flex items-center gap-2 font-dm text-[12px] tracking-[0.1em] uppercase text-washi/60 hover:text-kin transition-colors duration-200"
            aria-label="Ouvrir le panier"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {count() > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-shu text-washi rounded-full text-[9px] flex items-center justify-center font-dm">
                {count()}
              </span>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className={`block w-5 h-px bg-washi/70 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-px bg-washi/70 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-px bg-washi/70 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-ai/98 border-t border-kin/15 px-6 py-8">
          <nav className="flex flex-col gap-8">
            {[
              { href: '/creators', fr: 'Créateurs', ja: '職人' },
              { href: '/products', fr: 'Boutique',  ja: '作品' },
              { href: '/about',    fr: 'Philosophie', ja: '理念' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-baseline gap-4"
              >
                <span className="font-zen text-2xl text-washi">{item.fr}</span>
                <span className="font-noto text-sm text-washi/30">{item.ja}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
