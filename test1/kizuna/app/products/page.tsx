'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { products } from '@/lib/data/products'
import { creators } from '@/lib/data/creators'
import { ProductCard } from '@/components/product/ProductCard'
import { Category } from '@/types'

const categories: { key: 'all' | Category; label: string }[] = [
  { key: 'all',     label: 'Tout' },
  { key: 'craft',   label: 'Artisanat' },
  { key: 'fashion', label: 'Mode' },
  { key: 'food',    label: 'Épicerie' },
  { key: 'home',    label: 'Maison' },
]

function ProductItem({ product, index }: { product: typeof products[0]; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const creator = creators.find((c) => c.id === product.creatorId)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <ProductCard product={product} accentColor={creator?.accentColor} />
    </motion.div>
  )
}

export default function ProductsPage() {
  const [active, setActive] = useState<'all' | Category>('all')
  const filtered = active === 'all' ? products : products.filter((p) => p.category === active)

  return (
    <>
      {/* Header */}
      <section className="pt-32 md:pt-40 pb-16 max-w-[1400px] mx-auto px-6 md:px-12">
        <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-brume mb-4">Boutique · 商品一覧</p>
        <h1 className="font-cormorant font-light italic text-5xl md:text-7xl text-sumi mb-6">
          Les créations.
        </h1>
        <p className="font-dm text-sm text-sumi/50 max-w-[440px] leading-relaxed">
          Soixante pièces sélectionnées — artisanat, mode, épicerie fine, maison. Chaque objet a une histoire.
        </p>
      </section>

      {/* Filter */}
      <div className="sticky top-[64px] md:top-[80px] z-30 bg-washi/95 backdrop-blur-sm border-b border-sumi/8">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center gap-1 overflow-x-auto py-4">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActive(cat.key)}
                className={`shrink-0 px-4 py-2 font-dm text-[11px] tracking-[0.1em] uppercase transition-colors duration-200 ${
                  active === cat.key ? 'bg-sumi text-washi' : 'text-sumi/50 hover:text-sumi border border-sumi/10 hover:border-sumi/30'
                }`}
              >
                {cat.label}
              </button>
            ))}
            <span className="ml-auto font-dm text-[11px] text-brume">
              {filtered.length} pièces
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((p, i) => (
            <ProductItem key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </>
  )
}
