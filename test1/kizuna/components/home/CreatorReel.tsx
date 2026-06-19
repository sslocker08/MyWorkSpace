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
            className="font-dm text-[10px] tracking-[0.22em] uppercase text-brume mb-3"
          >
            Créateurs en vedette · 注目クリエイター
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-cormorant font-light italic text-4xl md:text-5xl text-sumi"
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
            className="font-dm text-[12px] tracking-[0.1em] uppercase text-sumi/50 hover:text-sumi transition-colors border-b border-sumi/20 hover:border-sumi pb-0.5"
          >
            Voir tous les 30 créateurs →
          </Link>
        </motion.div>
      </div>

      {/* Creator cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {featuredCreators.map((creator, i) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href={`/creators/${creator.slug}`} className="group block">
              {/* Portrait */}
              <div className="relative aspect-[3/4] overflow-hidden mb-4">
                <Image
                  src={creator.photo}
                  alt={creator.name}
                  fill
                  className="object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                {/* Hover overlay with brand color */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                  style={{ backgroundColor: creator.accentColor }}
                />
                {/* Category tag */}
                <div className="absolute top-3 left-3">
                  <span className="font-dm text-[9px] tracking-[0.12em] uppercase bg-washi/90 text-sumi/70 px-2 py-1">
                    {categoryLabels[creator.category]?.fr}
                  </span>
                </div>
                {/* Hover CTA */}
                <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-350">
                  <span className="font-dm text-[10px] tracking-[0.14em] uppercase text-washi border border-washi/60 px-3 py-1.5">
                    Voir →
                  </span>
                </div>
              </div>

              {/* Info */}
              <div>
                <div
                  className="w-5 h-px mb-2 transition-all duration-500 group-hover:w-10"
                  style={{ backgroundColor: creator.accentColor }}
                />
                <p className="font-cormorant text-lg text-sumi leading-tight group-hover:text-kon transition-colors duration-200">
                  {creator.brandName.fr}
                </p>
                <p className="font-noto text-[10px] text-sumi/40 mt-0.5">{creator.brandName.ja}</p>
                <p className="font-dm text-xs text-brume mt-1">{creator.name} · {creator.location}</p>
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
