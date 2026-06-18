'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { products, getProductsByCategory } from '@/lib/data/products'
import { FilterBar } from './FilterBar'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  initialCategory?: string
}

export function ProductGrid({ initialCategory = 'all' }: ProductGridProps) {
  const [active, setActive] = useState(initialCategory)

  useEffect(() => {
    setActive(initialCategory)
  }, [initialCategory])

  const filtered = useMemo(() => getProductsByCategory(active), [active])

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-10 border-b border-encre/10 pb-4">
        <FilterBar active={active} onChange={setActive} />
      </div>

      {/* Count */}
      <p className="font-dm text-[11px] text-brume mb-8">
        {filtered.length} produit{filtered.length > 1 ? 's' : ''}
        <span className="ml-1 text-encre/30">{active !== 'all' ? `· ${active}` : ''}</span>
      </p>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-12"
        >
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
