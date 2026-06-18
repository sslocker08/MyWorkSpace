import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-sumi text-washi/60 mt-24">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand */}
          <div>
            <p className="font-noto text-3xl text-washi mb-2">絆</p>
            <p className="font-cormorant italic text-lg text-washi/80 mb-4">Kizuna Projet</p>
            <p className="font-dm text-xs text-washi/40 leading-relaxed max-w-[280px]">
              Trente créateurs japonais d&apos;exception, réunis pour partager leur savoir-faire avec la France.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="font-dm text-[10px] tracking-[0.18em] uppercase text-washi/30 mb-5">Navigation</p>
            <nav className="flex flex-col gap-3">
              {[
                { href: '/creators', label: 'Les Créateurs' },
                { href: '/products', label: 'La Boutique' },
                { href: '/about',    label: 'Le Projet' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-dm text-sm text-washi/60 hover:text-washi transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <p className="font-dm text-[10px] tracking-[0.18em] uppercase text-washi/30 mb-5">Contact</p>
            <p className="font-dm text-xs text-washi/50 leading-relaxed">
              Pour les créateurs, partenariats et presse :<br />
              <a href="mailto:contact@kizuna-projet.fr" className="text-washi/70 hover:text-washi underline underline-offset-2 transition-colors">
                contact@kizuna-projet.fr
              </a>
            </p>
            <p className="font-noto text-xs text-washi/30 mt-4 leading-relaxed">
              日本とフランスを<br />結ぶプロジェクト
            </p>
          </div>
        </div>

        <div className="border-t border-washi/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-dm text-[11px] text-washi/25">
            © 2025 絆プロジェクト. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/mentions-legales" className="font-dm text-[11px] text-washi/30 hover:text-washi/60 transition-colors">
              Mentions légales
            </Link>
            <Link href="/cgv" className="font-dm text-[11px] text-washi/30 hover:text-washi/60 transition-colors">
              CGV
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
