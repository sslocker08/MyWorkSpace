'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { creators, categoryLabels } from '@/lib/data/creators'
import { Category } from '@/types'

const categories: { key: 'all' | Category; label: string; ja: string }[] = [
  { key: 'all',     label: 'Tous',       ja: 'すべて' },
  { key: 'craft',   label: 'Artisanat',  ja: '工芸' },
  { key: 'fashion', label: 'Mode',       ja: 'ファッション' },
  { key: 'food',    label: 'Épicerie',   ja: '食・茶・酒' },
  { key: 'home',    label: 'Maison',     ja: 'ホーム' },
]

function CreatorCard({ creator, index }: { creator: typeof creators[0]; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: (index % 4) * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/creators/${creator.slug}`} className="group block">
        {/* Portrait */}
        <div className="relative aspect-[3/4] overflow-hidden mb-4">
          <Image
            src={creator.photo}
            alt={creator.name}
            fill
            className="object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-35 transition-opacity duration-500"
            style={{ backgroundColor: creator.accentColor }}
          />
          {/* Bottom info on hover */}
          <div className="absolute inset-x-0 bottom-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-gradient-to-t from-sumi/80 to-transparent">
            <p className="font-dm text-[10px] tracking-[0.14em] uppercase text-washi/80">
              Voir le brand →
            </p>
          </div>
          {/* Category */}
          <div className="absolute top-3 left-3">
            <span className="font-dm text-[9px] tracking-[0.12em] uppercase bg-washi/90 text-sumi/70 px-2 py-1">
              {categoryLabels[creator.category]?.fr}
            </span>
          </div>
        </div>

        {/* Info */}
        <div
          className="w-5 h-px mb-2.5 transition-all duration-500 group-hover:w-8"
          style={{ backgroundColor: creator.accentColor }}
        />
        <p className="font-cormorant text-xl text-sumi leading-tight">{creator.brandName.fr}</p>
        <p className="font-noto text-[10px] text-sumi/40 mt-0.5">{creator.brandName.ja}</p>
        <p className="font-dm text-xs text-brume mt-1.5">{creator.name}</p>
        <p className="font-dm text-[10px] text-brume/60">{creator.location}</p>
      </Link>
    </motion.div>
  )
}

export default function CreatorsPage() {
  const [active, setActive] = useState<'all' | Category>('all')

  const filtered = active === 'all' ? creators : creators.filter((c) => c.category === active)

  return (
    <>
      {/* Header */}
      <section className="pt-32 md:pt-40 pb-16 max-w-[1400px] mx-auto px-6 md:px-12">
        <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-brume mb-4">
          Créateurs · クリエイター
        </p>
        <h1 className="font-cormorant font-light italic text-5xl md:text-7xl text-sumi mb-6">
          Trente artisans<br className="hidden md:block" /> d&apos;exception.
        </h1>
        <p className="font-dm text-sm text-sumi/50 max-w-[480px] leading-relaxed">
          De Kyoto à Wajima, de Tokyo à Shodoshima — chaque créateur porte des décennies de maîtrise et une vision singulière du beau.
        </p>
      </section>

      {/* Filter bar */}
      <div className="sticky top-[64px] md:top-[80px] z-30 bg-washi/95 backdrop-blur-sm border-b border-sumi/8">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center gap-1 overflow-x-auto py-4 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActive(cat.key)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 font-dm text-[11px] tracking-[0.1em] uppercase transition-colors duration-200 ${
                  active === cat.key
                    ? 'bg-sumi text-washi'
                    : 'text-sumi/50 hover:text-sumi border border-sumi/10 hover:border-sumi/30'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`font-noto text-[9px] ${active === cat.key ? 'text-washi/60' : 'text-sumi/30'}`}>
                  {cat.ja}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filtered.map((creator, i) => (
            <CreatorCard key={creator.id} creator={creator} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="font-cormorant italic text-2xl text-sumi/30">Aucun créateur trouvé.</p>
          </div>
        )}
      </div>
    </>
  )
}
