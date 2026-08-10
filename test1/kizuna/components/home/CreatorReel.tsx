'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { featuredCreators } from '@/lib/data/creators'
import { categoryLabels } from '@/lib/data/products'

export function CreatorReel() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
      {/* Header */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="font-noto text-xs text-shu mb-2"
          >
            職人
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="font-dm text-[9px] tracking-[0.22em] uppercase text-sumi/30 mb-4"
          >
            Créateurs en vedette
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-zen font-bold text-4xl md:text-5xl text-sumi"
          >
            Rencontrez les artisans
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="hidden md:block"
        >
          <Link
            href="/creators"
            className="font-dm text-[12px] tracking-[0.1em] uppercase text-sumi/40 hover:text-sumi transition-colors border-b border-sumi/15 hover:border-sumi pb-0.5"
          >
            Voir tous les 30 créateurs →
          </Link>
        </motion.div>
      </div>

      {/* Karuta-style creator cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {featuredCreators.map((creator, i) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href={`/creators/${creator.slug}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-sumi/10">
                <Image
                  src={creator.photo}
                  alt={creator.name}
                  fill
                  className="object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-sumi/90 via-sumi/30 to-transparent" />

                {/* Category tag — 朱 */}
                <div className="absolute top-3 right-3">
                  <span className="font-dm text-[8px] tracking-[0.18em] uppercase bg-shu text-washi px-2 py-0.5">
                    {categoryLabels[creator.category]?.fr}
                  </span>
                </div>

                {/* Number — 朱 top-left */}
                <div className="absolute top-3 left-3">
                  <span className="font-dm text-[9px] tracking-[0.16em] text-shu/80">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-shippori text-lg text-washi leading-tight mb-1">
                    {creator.brandName.ja}
                  </p>
                  <p className="font-dm text-[9px] tracking-[0.12em] uppercase text-washi/50">
                    {creator.brandName.fr}
                  </p>
                  <p className="font-dm text-[8px] text-kiri/50 mt-1">
                    {creator.name} · {creator.location}
                  </p>
                </div>

                {/* Hover CTA */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-350">
                  <span className="font-dm text-[10px] tracking-[0.14em] uppercase text-washi border border-washi/50 px-4 py-2 bg-sumi/40">
                    Voir →
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Mobile CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-10 text-center md:hidden"
      >
        <Link
          href="/creators"
          className="inline-flex items-center gap-2 font-dm text-[12px] tracking-[0.12em] uppercase text-sumi border-b border-sumi/20 hover:border-sumi pb-0.5"
        >
          Voir les 30 créateurs →
        </Link>
      </motion.div>
    </section>
  )
}
