'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Product } from '@/types'
import { categoryLabels } from '@/lib/data/products'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      {/* Image container — 3:4 ratio */}
      <div className="relative aspect-[3/4] overflow-hidden bg-brume/15 mb-4">
        <Image
          src={product.images[0]}
          alt={product.name.fr}
          fill
          className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Hover overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-encre/20 flex items-end p-5"
        >
          <span className="font-dm text-[11px] tracking-[0.14em] uppercase text-ivoire border border-ivoire/60 px-4 py-2">
            Voir →
          </span>
        </motion.div>

        {/* Category tag */}
        <div className="absolute top-3 left-3">
          <span className="font-dm text-[9px] tracking-[0.14em] uppercase bg-ivoire/90 text-encre/70 px-2 py-1">
            {categoryLabels[product.category]?.fr}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-cormorant text-lg leading-tight text-encre group-hover:text-argile transition-colors duration-200">
            {product.name.fr}
          </p>
          <p className="font-dm text-[10px] text-brume mt-0.5">{product.name.ja}</p>
        </div>
        <p className="font-dm text-sm text-argile shrink-0 pt-0.5">{product.price} €</p>
      </div>
    </Link>
  )
}
