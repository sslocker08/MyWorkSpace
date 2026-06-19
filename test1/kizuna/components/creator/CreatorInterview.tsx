'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Creator } from '@/types'

interface Props { creator: Creator }

export function CreatorInterview({ creator }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  if (!creator.interview.length) return null

  return (
    <section ref={ref} className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-6 mb-12"
      >
        <span className="font-noto text-xs text-shu">インタビュー</span>
        <span className="font-dm text-[9px] tracking-[0.22em] uppercase text-sumi/25">
          Entretien
        </span>
        <span className="flex-1 h-px bg-sumi/10" />
      </motion.div>

      <div className="max-w-[760px]">
        {creator.interview.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10 pb-10 border-b border-sumi/8 last:border-0"
          >
            {/* Question */}
            <p className="font-dm text-xs tracking-[0.06em] text-kiri mb-4">
              — {item.q}
            </p>
            {/* Answer FR */}
            <p className="font-zen text-2xl md:text-3xl text-sumi leading-relaxed mb-3">
              &laquo; {item.a.fr} &raquo;
            </p>
            {/* Answer JA */}
            <p className="font-noto text-xs text-sumi/35 leading-relaxed">
              {item.a.ja}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
