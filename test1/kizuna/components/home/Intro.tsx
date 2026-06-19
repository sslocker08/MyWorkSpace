'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface IntroProps {
  onComplete: () => void
}

export function Intro({ onComplete }: IntroProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 2800)
    const t3 = setTimeout(onComplete, 3600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <AnimatePresence>
      {phase < 2 && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] bg-sumi flex flex-col items-center justify-center"
        >
          {/* Kanji 絆 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-6"
          >
            <p className="font-noto text-[120px] md:text-[180px] text-washi leading-none select-none">絆</p>
            <div className="absolute inset-0 blur-3xl bg-kin/15 -z-10 scale-150" />
          </motion.div>

          {/* French tagline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="font-zen text-xl md:text-2xl text-washi/70 tracking-wide"
          >
            Le lien entre deux mondes.
          </motion.p>

          {/* Japanese subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 0.35 } : {}}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="font-noto text-xs text-washi mt-2"
          >
            二つの世界を結ぶ絆
          </motion.p>

          {/* Bottom line decoration */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={phase >= 1 ? { scaleX: 1 } : {}}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[120px] h-px bg-kin/30 origin-left"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
