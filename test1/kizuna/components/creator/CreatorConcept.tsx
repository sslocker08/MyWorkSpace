'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { Creator } from '@/types'

interface Props { creator: Creator }

export function CreatorConcept({ creator }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="overflow-hidden" style={{ backgroundColor: creator.palette.surface }}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Portrait + second image */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src={creator.photo}
                alt={creator.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
            {/* Second media image inset */}
            {creator.media[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -bottom-6 -right-4 w-[45%] aspect-square overflow-hidden hidden lg:block border-4"
                style={{ borderColor: creator.palette.bg }}
              >
                <Image src={creator.media[1].url} alt="" fill className="object-cover" sizes="20vw" />
              </motion.div>
            )}
          </motion.div>

          {/* Story */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.75, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 lg:col-start-7 relative"
          >
            {/* Kanji watermark */}
            <span
              className="absolute -top-4 right-0 font-noto text-[120px] leading-none select-none pointer-events-none opacity-5"
              aria-hidden
            >
              匠
            </span>

            <p
              className="font-dm text-[10px] tracking-[0.2em] uppercase mb-5"
              style={{ color: creator.accentColor }}
            >
              L&apos;histoire · {creator.brandName.ja}
            </p>

            <h2
              className="font-cormorant font-light italic text-4xl md:text-5xl leading-[1.05] mb-6"
              style={{ color: creator.palette.text }}
            >
              {creator.name}
            </h2>

            <p
              className="font-dm text-sm leading-relaxed mb-6"
              style={{ color: `${creator.palette.text}80` }}
            >
              {creator.story.fr}
            </p>

            <p
              className="font-noto text-xs leading-relaxed border-l-2 pl-4"
              style={{ borderColor: creator.accentColor, color: `${creator.palette.text}50` }}
            >
              {creator.story.ja}
            </p>

            {/* Location + category */}
            <div className="flex items-center gap-6 mt-8 pt-8 border-t border-sumi/10">
              <div>
                <p className="font-dm text-[9px] tracking-[0.1em] uppercase text-brume/60 mb-1">Localisation</p>
                <p className="font-cormorant text-lg" style={{ color: creator.palette.text }}>
                  {creator.location}
                </p>
              </div>
              <div>
                <p className="font-dm text-[9px] tracking-[0.1em] uppercase text-brume/60 mb-1">Domaine</p>
                <p className="font-cormorant text-lg" style={{ color: creator.palette.text }}>
                  {creator.brandConcept.ja.slice(0, 30)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
