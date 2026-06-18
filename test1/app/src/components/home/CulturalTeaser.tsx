'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export function CulturalTeaser() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="overflow-hidden">
      {/* Full-bleed editorial band */}
      <div className="bg-encre text-ivoire">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
          {/* Left: image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-5 relative aspect-[4/5] overflow-hidden"
          >
            <Image
              src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=900&q=85"
              alt="Céramique japonaise"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
            {/* Grain overlay */}
            <div className="absolute inset-0 opacity-20 mix-blend-overlay"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.4\'/%3E%3C/svg%3E")' }}
            />
          </motion.div>

          {/* Right: text */}
          <div className="md:col-span-6 md:col-start-7">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="font-dm text-[10px] tracking-[0.22em] uppercase text-ivoire/40 mb-6"
            >
              Notre philosophie · 哲学
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="font-cormorant font-light italic text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-ivoire mb-6"
            >
              Le wabi-sabi
              <br />
              rencontre
              <br />
              l'art de vivre.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="font-dm text-sm text-ivoire/60 leading-relaxed max-w-[400px] mb-4"
            >
              Le Japon valorise l'imparfait, le temps, la trace du geste. La France valorise
              le savoir-faire, le terroir, la profondeur. Chez KANMI, ces deux regards se
              reconnaissent — et créent quelque chose de nouveau.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.48 }}
              className="font-dm text-[10px] text-ivoire/30 tracking-[0.04em] mb-10"
            >
              日本の「侘び寂び」とフランスの「芸術的生活」が交わる場所。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href="/shop"
                className="inline-flex items-center gap-3 border border-ivoire/30 text-ivoire px-7 py-3 font-dm text-[12px] tracking-[0.12em] uppercase hover:bg-ivoire hover:text-encre transition-all duration-350"
              >
                Explorer la boutique
                <span className="text-[10px]">→</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
