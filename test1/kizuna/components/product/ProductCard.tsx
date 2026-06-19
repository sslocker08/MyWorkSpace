'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Product } from '@/types'
import { categoryLabels } from '@/lib/data/products'

interface Props {
  product: Product
  accentColor?: string
}

export function ProductCard({ product, accentColor = '#1A1612' }: Props) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Image — 3:4 */}
      <div className="relative aspect-[3/4] overflow-hidden bg-brume/15 mb-4">
        <Image
          src={product.images[0]}
          alt={product.name.fr}
          fill
          className="object-cover object-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-hover:opacity-0"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {product.images[1] && (
          <Image
            src={product.images[1]}
            alt=""
            fill
            className="object-cover object-center opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-sumi/0 group-hover:bg-sumi/20 transition-colors duration-350 flex items-end p-5">
          <span
            className="font-dm text-[11px] tracking-[0.14em] uppercase text-washi border border-washi/60 px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            Voir →
          </span>
        </div>
        {/* Category tag */}
        <div className="absolute top-3 left-3">
          <span className="font-dm text-[9px] tracking-[0.12em] uppercase bg-washi/90 text-sumi/70 px-2 py-1">
            {categoryLabels[product.category]?.fr}
          </span>
        </div>
      </div>

      {/* Info */}
      <div
        className="w-4 h-px mb-2 transition-all duration-500 group-hover:w-7"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-cormorant text-lg leading-tight text-sumi group-hover:text-kon transition-colors duration-200">
            {product.name.fr}
          </p>
          <p className="font-noto text-[10px] text-sumi/40 mt-0.5">{product.name.ja}</p>
        </div>
        <p className="font-dm text-sm shrink-0 pt-0.5" style={{ color: accentColor }}>
          {product.price} €
        </p>
      </div>
    </Link>
  )
}
