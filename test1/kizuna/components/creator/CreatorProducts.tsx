'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Creator, Product } from '@/types'
import { ProductCard } from '@/components/product/ProductCard'

interface Props {
  creator: Creator
  products: Product[]
}

export function CreatorProducts({ creator, products }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  if (!products.length) return null

  return (
    <section id="products" ref={ref} className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-12"
      >
        <div>
          <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-brume mb-2">
            Créations · 作品
          </p>
          <h2
            className="font-cormorant font-light italic text-3xl md:text-4xl text-sumi"
          >
            Les œuvres de {creator.brandName.fr}
          </h2>
        </div>
        <span
          className="font-dm text-[11px] tracking-[0.1em] text-washi px-3 py-1"
          style={{ backgroundColor: creator.accentColor }}
        >
          {products.length} pièces
        </span>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <ProductCard product={product} accentColor={creator.accentColor} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
