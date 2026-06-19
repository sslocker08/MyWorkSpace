'use client'

import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

// Public-domain ukiyo-e from Wikimedia Commons
const UKIYOE_BG =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Great_Wave_off_Kanagawa2.jpg/1280px-Great_Wave_off_Kanagawa2.jpg'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: d, ease: EASE } }),
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-end pb-20 md:pb-28 overflow-hidden">
      {/* Ukiyo-e background */}
      <div className="absolute inset-0">
        <Image
          src={UKIYOE_BG}
          alt=""
          fill
          priority
          className="object-cover object-center opacity-30 mix-blend-multiply"
          sizes="100vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-sumi/60 via-sumi/30 to-washi" />
        <div className="absolute inset-0 bg-gradient-to-r from-sumi/60 via-sumi/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 md:px-12">
        <div className="max-w-[640px]">
          {/* Label */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0.1}
            className="font-dm text-[11px] tracking-[0.22em] uppercase text-washi/60 mb-8"
          >
            日本 × France · Trente créateurs · Lancement 2025
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={0.25}
            className="font-cormorant font-light italic text-5xl md:text-7xl lg:text-[88px] leading-[0.92] text-washi mb-3"
          >
            Le lien
          </motion.h1>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={0.35}
            className="font-cormorant font-light italic text-5xl md:text-7xl lg:text-[88px] leading-[0.92] text-washi mb-3"
          >
            qui unit
          </motion.h1>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={0.45}
            className="font-cormorant font-light italic text-5xl md:text-7xl lg:text-[88px] leading-[0.92] text-kincha mb-8"
          >
            deux mondes.
          </motion.h1>

          {/* JP subtitle */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0.52}
            className="font-noto text-sm text-washi/50 mb-6"
          >
            職人の手仕事をパリの暮らしへ。
          </motion.p>

          {/* Body */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0.6}
            className="font-dm text-sm text-washi/60 leading-relaxed max-w-[440px] mb-10"
          >
            Trente artisans, designers et producteurs japonais — sélectionnés pour leur excellence
            et leur dialogue avec l&apos;esthétique française.
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0.7}
            className="flex items-center gap-6"
          >
            <Link
              href="/creators"
              className="inline-flex items-center gap-3 bg-washi text-sumi px-8 py-3.5 font-dm text-[12px] tracking-[0.14em] uppercase hover:bg-kincha hover:text-washi transition-colors duration-350"
            >
              Découvrir les créateurs
              <span className="text-[10px]">→</span>
            </Link>
            <Link
              href="/products"
              className="font-dm text-[12px] tracking-[0.1em] uppercase text-washi/50 hover:text-washi transition-colors border-b border-washi/20 hover:border-washi pb-0.5"
            >
              Boutique
            </Link>
          </motion.div>
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="mt-16 flex items-start gap-8 border-t border-washi/15 pt-6"
        >
          {[
            { num: '30', label: 'créateurs\nsélectionnés' },
            { num: '4', label: 'univers\ncrafts, mode, épicerie, maison' },
            { num: '7–14j', label: 'livraison\ndepuis le Japon' },
          ].map(({ num, label }, i) => (
            <div key={i} className="flex items-start gap-3">
              {i > 0 && <span className="text-washi/15 mt-1">·</span>}
              <div>
                <p className="font-cormorant text-2xl text-washi leading-none">{num}</p>
                <p className="font-dm text-[9px] tracking-[0.06em] text-washi/40 mt-1 whitespace-pre-line leading-relaxed">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="absolute bottom-8 right-12 hidden md:flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-px h-12 bg-gradient-to-b from-washi/40 to-transparent"
        />
        <p className="font-dm text-[10px] tracking-[0.2em] text-washi/30 rotate-90 origin-center translate-x-4">
          Scroll
        </p>
      </motion.div>
    </section>
  )
}
