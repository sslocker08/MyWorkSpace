'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { products } from '@/lib/data/products'
import { ProductCard } from '@/components/shop/ProductCard'
import Link from 'next/link'

const featured = products.slice(0, 6)

export function FeaturedGrid() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
      {/* Section header */}
      <div className="flex items-end justify-between mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-dm text-[10px] tracking-[0.2em] uppercase text-argile mb-2">
            Sélection
          </p>
          <h2 className="font-cormorant font-light italic text-4xl md:text-5xl text-encre">
            Nos coups de cœur
          </h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/shop"
            className="hidden md:inline-flex font-dm text-[12px] tracking-[0.1em] uppercase text-encre/50 hover:text-encre transition-colors border-b border-encre/20 hover:border-encre pb-0.5"
          >
            Tout voir
          </Link>
        </motion.div>
      </div>

      {/* Asymmetric grid: 3 col desktop, 2 col tablet, 1 col mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
        {featured.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.6,
              delay: i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-10 md:hidden text-center"
      >
        <Link
          href="/shop"
          className="font-dm text-[12px] tracking-[0.1em] uppercase border-b border-encre/30 pb-0.5"
        >
          Voir tous les produits
        </Link>
      </motion.div>
    </section>
  )
}
