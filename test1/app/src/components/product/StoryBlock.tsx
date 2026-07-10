'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

interface StoryBlockProps {
  fr: string
  ja: string
}

export function StoryBlock({ fr, ja }: StoryBlockProps) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [showJa, setShowJa] = useState(false)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="border-t border-encre/10 pt-8 mt-8"
    >
      <div className="flex items-center justify-between mb-5">
        <p className="font-dm text-[10px] tracking-[0.2em] uppercase text-argile">
          Histoire · 物語
        </p>
        <button
          onClick={() => setShowJa(!showJa)}
          className="font-dm text-[10px] tracking-[0.12em] uppercase text-encre/40 hover:text-encre transition-colors border-b border-encre/20"
        >
          {showJa ? 'Français' : '日本語'}
        </button>
      </div>

      <motion.p
        key={showJa ? 'ja' : 'fr'}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`leading-relaxed text-encre/80 ${
          showJa ? 'font-dm text-sm' : 'font-dm text-sm'
        }`}
        lang={showJa ? 'ja' : 'fr'}
      >
        {showJa ? ja : fr}
      </motion.p>
    </motion.div>
  )
}
