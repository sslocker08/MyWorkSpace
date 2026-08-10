'use client'

import Image from 'next/image'
import { Product } from '@/types'
import { categoryLabels } from '@/lib/data/products'
import { TransitionLink } from '@/components/ui/TransitionLink'

interface Props {
  product: Product
  accentColor?: string
}

export function ProductCard({ product }: Props) {
  const vtName = `product-img-${product.slug}`

  return (
    <TransitionLink href={`/products/${product.slug}`} className="group block">
      {/* Image — 1:1 square */}
      <div
        className="relative aspect-square overflow-hidden bg-sumi/8 border border-sumi/8 group-hover:border-shu/30 transition-colors duration-350"
        style={{ viewTransitionName: vtName }}
      >
        <Image
          src={product.images[0]}
          alt={product.name.fr}
          fill
          className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-sumi/88 via-sumi/30 to-transparent" />

        {/* Category tag — 朱 */}
        <div className="absolute top-3 left-3">
          <span className="font-dm text-[8px] tracking-[0.20em] uppercase bg-shu text-washi px-2 py-0.5">
            {categoryLabels[product.category]?.fr}
          </span>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-shippori text-base text-washi leading-tight mb-0.5">
            {product.name.ja}
          </p>
          <div className="flex items-end justify-between gap-2">
            <p className="font-dm text-[9px] tracking-[0.08em] uppercase text-washi/45 truncate">
              {product.name.fr}
            </p>
            <p className="font-zen text-base text-kin shrink-0 leading-none">
              {product.price} €
            </p>
          </div>
        </div>

        {/* 朱 bottom border on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-shu transform scale-x-0 group-hover:scale-x-100 transition-transform duration-350 origin-left" />
      </div>
    </TransitionLink>
  )
}
