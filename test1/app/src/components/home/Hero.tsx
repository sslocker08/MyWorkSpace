'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] },
  }),
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-end pb-16 md:pb-24 overflow-hidden">
      {/* Background image — right side, editorial */}
      <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
        <div className="hidden md:block" />
        <div className="relative">
          <Image
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ivoire via-ivoire/60 to-transparent md:from-ivoire/80 md:via-ivoire/20 md:to-transparent" />
        </div>
      </div>

      {/* Mobile background */}
      <div className="absolute inset-0 md:hidden">
        <Image
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-20"
          sizes="100vw"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 md:px-12">
        <div className="max-w-[580px]">
          {/* Eyebrow */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.1}
            className="font-dm text-[11px] tracking-[0.2em] uppercase text-argile mb-6"
          >
            日本 → France
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.25}
            className="font-cormorant font-light italic text-5xl md:text-7xl lg:text-[88px] leading-[0.92] text-encre mb-2"
          >
            La beauté
          </motion.h1>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.35}
            className="font-cormorant font-light italic text-5xl md:text-7xl lg:text-[88px] leading-[0.92] text-encre mb-8"
          >
            des deux mondes.
          </motion.h1>

          {/* Japanese subtitle */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.45}
            className="font-dm text-xs text-brume tracking-[0.06em] mb-8"
          >
            二つの世界の美——職人の手仕事を、パリの食卓へ。
          </motion.p>

          {/* Body */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.55}
            className="font-dm text-sm text-encre/70 leading-relaxed max-w-[380px] mb-10"
          >
            Artisanat, mode, épicerie fine et maison — chaque pièce sélectionnée pour son dialogue
            entre l'esthétique japonaise et le goût français.
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.65}
            className="flex items-center gap-6 mb-16 md:mb-20"
          >
            <Link
              href="/shop"
              className="inline-flex items-center gap-3 bg-encre text-ivoire px-8 py-3.5 font-dm text-[12px] tracking-[0.14em] uppercase hover:bg-argile transition-colors duration-350"
            >
              Découvrir
              <span className="text-[10px]">→</span>
            </Link>
            <Link
              href="/shop?cat=craft"
              className="font-dm text-[12px] tracking-[0.1em] uppercase text-encre/50 hover:text-encre transition-colors border-b border-encre/20 hover:border-encre pb-0.5"
            >
              Artisanat
            </Link>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="flex items-start gap-8 border-t border-encre/10 pt-6"
          >
            {[
              { num: '12', label: 'artisans\nsélectionnés' },
              { num: '7–14j', label: 'livraison\ndepuis le Japon' },
              { num: '4', label: 'catégories\ncuratoriales' },
            ].map(({ num, label }, i) => (
              <div key={i} className="flex items-start gap-3">
                {i > 0 && <span className="text-encre/15 mt-1">·</span>}
                <div>
                  <p className="font-cormorant text-2xl text-encre leading-none">{num}</p>
                  <p className="font-dm text-[9px] tracking-[0.06em] text-brume mt-1 whitespace-pre-line leading-relaxed">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-8 right-12 hidden md:flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-px h-12 bg-gradient-to-b from-encre/40 to-transparent"
        />
        <p className="font-dm text-[10px] tracking-[0.2em] text-encre/30 rotate-90 origin-center translate-x-4">
          Scroll
        </p>
      </motion.div>
    </section>
  )
}
