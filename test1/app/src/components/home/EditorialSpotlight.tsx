'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { products } from '@/lib/data/products'

// Feature the plateau-urushi — premium craft, strong visual
const featured = products.find((p) => p.id === 'c2')!

export function EditorialSpotlight() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
        {/* Label row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-6 mb-12"
        >
          <span className="font-dm text-[10px] tracking-[0.22em] uppercase text-argile">
            Pièce d'exception · 特選作品
          </span>
          <span className="flex-1 h-px bg-encre/10" />
          <span className="font-dm text-[10px] text-brume">01</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-16 items-stretch">
          {/* Image — left, 6 cols */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-brume/10">
              <Image
                src={featured.images[0]}
                alt={featured.name.fr}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Grain overlay for editorial feel */}
              <div
                className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
                }}
              />
              {/* Category flag */}
              <div className="absolute bottom-5 left-5">
                <span className="font-dm text-[9px] tracking-[0.16em] uppercase bg-ivoire/90 text-encre/70 px-3 py-1.5">
                  Artisanat · 工芸
                </span>
              </div>
            </div>

            {/* Second image — small offset inset */}
            {featured.images[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -bottom-6 -right-4 w-[38%] aspect-[3/4] overflow-hidden border-4 border-ivoire hidden lg:block shadow-xl"
              >
                <Image
                  src={featured.images[1]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="20vw"
                />
              </motion.div>
            )}
          </motion.div>

          {/* Text — right, 5 cols offset */}
          <div className="lg:col-span-5 lg:col-start-8 flex flex-col justify-center pt-10 lg:pt-0 lg:pb-6 relative">
            {/* Watermark kanji */}
            <span
              className="absolute -top-4 right-0 font-cormorant text-[140px] md:text-[180px] leading-none text-encre/[0.04] select-none pointer-events-none"
              aria-hidden
            >
              匠
            </span>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-dm text-[10px] tracking-[0.2em] uppercase text-brume mb-5"
            >
              {featured.name.ja}
            </motion.p>

            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="font-cormorant font-light italic text-4xl md:text-5xl lg:text-6xl text-encre leading-[1.05] mb-6"
            >
              {featured.name.fr}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="font-dm text-sm text-encre/60 leading-relaxed max-w-[380px] mb-8"
            >
              {featured.story.fr.slice(0, 180)}…
            </motion.p>

            {/* Price + CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.48, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-end gap-8"
            >
              <div>
                <p className="font-dm text-[10px] tracking-[0.1em] uppercase text-brume mb-1">Prix</p>
                <p className="font-cormorant text-3xl text-argile">{featured.price.toLocaleString('fr-FR')} €</p>
              </div>
              <Link
                href={`/shop/${featured.slug}`}
                className="group inline-flex items-center gap-3 border-b border-encre/25 pb-1 hover:border-encre transition-colors duration-200"
              >
                <span className="font-dm text-[12px] tracking-[0.1em] uppercase text-encre">
                  Voir la pièce
                </span>
                <span className="text-sm text-encre/40 group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </Link>
            </motion.div>

            {/* Horizontal rule + quote */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-10 pt-8 border-t border-encre/10"
            >
              <p className="font-cormorant italic text-base text-encre/40 leading-relaxed">
                « Quatre-vingts couches, quatre-vingts jours — <br className="hidden md:block" />
                chaque passage révèle une profondeur nouvelle. »
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
