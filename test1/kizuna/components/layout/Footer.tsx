import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-sumi text-washi/60 mt-24">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <p className="font-noto text-4xl text-kin leading-none">絆</p>
              <div className="flex flex-col">
                <span className="font-dm text-[11px] tracking-[0.22em] uppercase text-washi/70 leading-none">KIZUNA</span>
                <span className="font-dm text-[8px] tracking-[0.12em] text-washi/30 leading-none mt-0.5">PROJET</span>
              </div>
            </div>
            <p className="font-dm text-xs text-washi/40 leading-relaxed max-w-[280px]">
              Trente créateurs japonais d&apos;exception, réunis pour partager leur savoir-faire avec la France.
            </p>
            <p className="font-noto text-xs text-washi/20 mt-4 leading-relaxed">
              職人の手仕事を<br />パリの暮らしへ。
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-kin/50 mb-5">Navigation</p>
            <nav className="flex flex-col gap-4">
              {[
                { href: '/creators', fr: 'Les Créateurs', ja: '職人' },
                { href: '/products', fr: 'La Boutique',   ja: '作品' },
                { href: '/about',    fr: 'La Philosophie', ja: '理念' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3"
                >
                  <span className="font-noto text-[10px] text-washi/20 group-hover:text-kin/60 transition-colors duration-200 w-6">
                    {item.ja}
                  </span>
                  <span className="font-dm text-sm text-washi/50 group-hover:text-washi transition-colors duration-200">
                    {item.fr}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-kin/50 mb-5">Contact</p>
            <p className="font-dm text-xs text-washi/50 leading-relaxed">
              Pour les créateurs, partenariats et presse :<br />
              <a href="mailto:contact@kizuna-projet.fr" className="text-washi/70 hover:text-kin underline underline-offset-2 transition-colors">
                contact@kizuna-projet.fr
              </a>
            </p>
            <div className="mt-8 border-l border-kin/20 pl-4">
              <p className="font-noto text-xs text-washi/25 leading-relaxed">
                日本とフランスを<br />結ぶプロジェクト
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-washi/8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-dm text-[11px] text-washi/20">
            © 2025 絆プロジェクト. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/mentions-legales" className="font-dm text-[11px] text-washi/25 hover:text-washi/50 transition-colors">
              Mentions légales
            </Link>
            <Link href="/cgv" className="font-dm text-[11px] text-washi/25 hover:text-washi/50 transition-colors">
              CGV
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
