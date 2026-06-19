'use client'

import { motion, type Variants } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Creator } from '@/types'
import { categoryLabels } from '@/lib/data/creators'

interface Props { creator: Creator }

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: d, ease: EASE } }),
}

export function CreatorHero({ creator }: Props) {
  return (
    <section
      className="relative min-h-screen flex items-end pb-16 md:pb-24 overflow-hidden"
      style={{ backgroundColor: creator.palette.bg }}
    >
      {/* Background image — editorial split */}
      <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
        <div className="hidden md:block" />
        <div className="relative">
          <Image
            src={creator.media[0].url}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="50vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, ${creator.palette.bg}, ${creator.palette.bg}60, transparent)`,
            }}
          />
        </div>
      </div>
      {/* Mobile bg */}
      <div className="absolute inset-0 md:hidden">
        <Image src={creator.media[0].url} alt="" fill className="object-cover opacity-20" sizes="100vw" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 md:px-12">
        {/* Breadcrumb */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={0}
          className="flex items-center gap-2 mb-12"
        >
          <Link href="/creators" className="font-dm text-[11px] tracking-[0.12em] uppercase text-sumi/40 hover:text-sumi transition-colors">
            ← Créateurs
          </Link>
          <span className="text-sumi/20 text-xs">·</span>
          <span className="font-dm text-[11px] tracking-[0.12em] uppercase text-shu">
            {categoryLabels[creator.category]?.fr}
          </span>
        </motion.div>

        <div className="max-w-[560px]">
          {/* Creator name */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0.1}
            className="font-dm text-[11px] tracking-[0.2em] uppercase text-shu mb-3"
          >
            {creator.name} · {creator.location}
          </motion.p>

          {/* Japanese brand name */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0.18}
            className="font-shippori text-2xl mb-1"
            style={{ color: creator.palette.text }}
          >
            {creator.brandName.ja}
          </motion.p>

          {/* French brand name */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={0.24}
            className="font-zen font-bold text-5xl md:text-7xl leading-[0.95] mb-8"
            style={{ color: creator.palette.text }}
          >
            {creator.brandName.fr}
          </motion.h1>

          {/* Brand concept */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0.38}
            className="font-dm text-sm leading-relaxed max-w-[400px] mb-10"
            style={{ color: `${creator.palette.text}80` }}
          >
            {creator.brandConcept.fr}
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0.48}
          >
            <a
              href="#products"
              className="inline-flex items-center gap-3 px-7 py-3.5 font-dm text-[12px] tracking-[0.14em] uppercase bg-shu text-washi hover:bg-beni transition-colors duration-300"
            >
              Voir les créations →
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
