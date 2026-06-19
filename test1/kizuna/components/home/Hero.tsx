'use client'

import { useEffect, useRef } from 'react'
import { motion, type Variants } from 'framer-motion'
import Image from 'next/image'
import { gsap, SplitText } from '@/lib/animation/gsap'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { TransitionLink } from '@/components/ui/TransitionLink'

const UKIYOE_BG =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Great_Wave_off_Kanagawa2.jpg/1280px-Great_Wave_off_Kanagawa2.jpg'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: d, ease: EASE } }),
}

export function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!heroRef.current || !bgRef.current || !contentRef.current || !headlineRef.current) return

    const ctx = gsap.context(() => {
      // ── SplitText kinetic headline ──────────────────────────────────────
      const headlines = headlineRef.current!.querySelectorAll<HTMLElement>('.hero-hl')
      const splits = Array.from(headlines).map(
        (el) => new SplitText(el, { type: 'chars', aria: 'auto' })
      )
      const chars = splits.flatMap((s) => s.chars)

      gsap.set(headlineRef.current, { opacity: 1 })
      gsap.from(chars, {
        y: 56,
        opacity: 0,
        duration: 0.75,
        stagger: { amount: 0.55, from: 'start' },
        ease: 'power4.out',
        delay: 0.15,
        clearProps: 'transform,opacity',
        onComplete: () => splits.forEach((s) => s.revert()),
      })

      // ── Background parallax ──────────────────────────────────────────────
      gsap.to(bgRef.current, {
        yPercent: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // ── Content fade + drift on scroll ──────────────────────────────────
      gsap.to(contentRef.current, {
        yPercent: -14,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '60% top',
          scrub: true,
        },
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-end pb-20 md:pb-28 overflow-hidden"
    >
      {/* Ukiyo-e background */}
      <div ref={bgRef} className="absolute inset-0">
        <Image
          src={UKIYOE_BG}
          alt=""
          fill
          priority
          className="object-cover object-center opacity-30 mix-blend-multiply"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sumi/60 via-sumi/30 to-washi" />
        <div className="absolute inset-0 bg-gradient-to-r from-sumi/60 via-sumi/10 to-transparent" />
      </div>

      {/* Content */}
      <div ref={contentRef} className="relative z-10 max-w-[1400px] w-full mx-auto px-6 md:px-12">
        <div className="max-w-[640px]">
          {/* Label */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.1}
            className="font-dm text-[11px] tracking-[0.22em] uppercase text-washi/60 mb-8"
          >
            日本 × France · Trente créateurs · Lancement 2025
          </motion.p>

          {/* Headline — GSAP SplitText, initially hidden */}
          <div ref={headlineRef} style={{ opacity: 0 }}>
            <h1 className="hero-hl font-cormorant font-light italic text-5xl md:text-7xl lg:text-[88px] leading-[0.92] text-washi mb-3 overflow-hidden">
              Le lien
            </h1>
            <h1 className="hero-hl font-cormorant font-light italic text-5xl md:text-7xl lg:text-[88px] leading-[0.92] text-washi mb-3 overflow-hidden">
              qui unit
            </h1>
            <h1 className="hero-hl font-cormorant font-light italic text-5xl md:text-7xl lg:text-[88px] leading-[0.92] text-kincha mb-8 overflow-hidden">
              deux mondes.
            </h1>
          </div>

          {/* JP subtitle */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.6}
            className="font-noto text-sm text-washi/50 mb-6"
          >
            職人の手仕事をパリの暮らしへ。
          </motion.p>

          {/* Body */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.7}
            className="font-dm text-sm text-washi/60 leading-relaxed max-w-[440px] mb-10"
          >
            Trente artisans, designers et producteurs japonais — sélectionnés pour leur excellence
            et leur dialogue avec l&apos;esthétique française.
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.8}
            className="flex items-center gap-6"
          >
            <MagneticButton strength={0.25}>
              <TransitionLink
                href="/creators"
                className="inline-flex items-center gap-3 bg-washi text-sumi px-8 py-3.5 font-dm text-[12px] tracking-[0.14em] uppercase hover:bg-kincha hover:text-washi transition-colors duration-350"
              >
                Découvrir les créateurs
                <span className="text-[10px]">→</span>
              </TransitionLink>
            </MagneticButton>

            <MagneticButton strength={0.2}>
              <TransitionLink
                href="/products"
                className="font-dm text-[12px] tracking-[0.1em] uppercase text-washi/50 hover:text-washi transition-colors border-b border-washi/20 hover:border-washi pb-0.5"
              >
                Boutique
              </TransitionLink>
            </MagneticButton>
          </motion.div>
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
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
        transition={{ delay: 1.5, duration: 0.5 }}
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
