import { Suspense } from 'react'
import { ProductGrid } from '@/components/shop/ProductGrid'

interface PageProps {
  searchParams: { cat?: string }
}

export const metadata = {
  title: 'Boutique — KANMI',
  description: "Tous nos produits japonais d'exception : artisanat, mode, épicerie fine et maison.",
}

function ShopContent({ cat }: { cat: string }) {
  return <ProductGrid initialCategory={cat} />
}

export default function ShopPage({ searchParams }: PageProps) {
  const cat = searchParams.cat ?? 'all'

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Page header */}
        <div className="py-12 md:py-16 border-b border-encre/10 mb-10">
          <p className="font-dm text-[10px] tracking-[0.2em] uppercase text-argile mb-3">
            Collection · コレクション
          </p>
          <h1 className="font-cormorant font-light italic text-4xl md:text-6xl text-encre">
            Boutique
          </h1>
          <p className="font-dm text-xs text-brume mt-2">
            {12} produits · Artisanat, mode, épicerie &amp; maison
          </p>
        </div>

        {/* Grid with filter */}
        <Suspense fallback={<div className="font-dm text-sm text-brume py-20 text-center">Chargement…</div>}>
          <ShopContent cat={cat} />
        </Suspense>
      </div>
    </div>
  )
}
