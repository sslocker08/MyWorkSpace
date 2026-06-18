import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="font-cormorant text-[120px] md:text-[180px] leading-none font-light text-encre/8 select-none">
        404
      </p>
      <div className="-mt-8 md:-mt-12 relative z-10">
        <p className="font-cormorant italic text-3xl md:text-5xl text-encre mb-3">
          Cette page n'existe pas.
        </p>
        <p className="font-dm text-xs text-brume mb-8">
          このページは見つかりませんでした。
        </p>
        <div className="flex gap-6 justify-center">
          <Link
            href="/"
            className="font-dm text-[12px] tracking-[0.14em] uppercase bg-encre text-ivoire px-6 py-3 hover:bg-argile transition-colors"
          >
            Accueil
          </Link>
          <Link
            href="/shop"
            className="font-dm text-[12px] tracking-[0.14em] uppercase border border-encre/20 text-encre px-6 py-3 hover:border-encre transition-colors"
          >
            Boutique
          </Link>
        </div>
      </div>
    </div>
  )
}
