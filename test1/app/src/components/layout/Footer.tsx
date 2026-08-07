import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-encre/10 mt-24">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <p className="font-cormorant text-2xl tracking-[0.15em] uppercase mb-3">KANMI</p>
          <p className="font-dm text-xs text-brume leading-relaxed max-w-[220px]">
            Sélection de produits japonais d'exception, livrés depuis le Japon vers la France.
          </p>
          <p className="font-dm text-[10px] text-brume/60 mt-2">日本の逸品をフランスへ。</p>
        </div>

        <div>
          <p className="font-dm text-[11px] tracking-[0.12em] uppercase text-encre/50 mb-4">Navigation</p>
          <ul className="flex flex-col gap-2">
            {[
              { href: '/shop', label: 'Boutique' },
              { href: '/shop?cat=craft', label: 'Artisanat' },
              { href: '/shop?cat=fashion', label: 'Mode' },
              { href: '/shop?cat=food', label: 'Épicerie fine' },
              { href: '/shop?cat=home', label: 'Maison' },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="font-dm text-xs text-encre/70 hover:text-encre transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-dm text-[11px] tracking-[0.12em] uppercase text-encre/50 mb-4">Informations</p>
          <ul className="flex flex-col gap-2">
            {[
              { label: 'À propos', href: '/story' },
              { label: 'Livraison & retours', href: null },
              { label: 'Contact', href: null },
              { label: 'Mentions légales', href: null },
            ].map(({ label, href }) => (
              <li key={label}>
                {href ? (
                  <Link href={href} className="font-dm text-xs text-encre/70 hover:text-encre transition-colors">
                    {label}
                  </Link>
                ) : (
                  <span className="font-dm text-xs text-encre/30">{label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-encre/8 py-4 px-6 md:px-12 max-w-[1400px] mx-auto flex items-center justify-between">
        <p className="font-dm text-[10px] text-brume">© 2024 KANMI. Tous droits réservés.</p>
        <p className="font-dm text-[10px] text-brume">Japan → France</p>
      </div>
    </footer>
  )
}
