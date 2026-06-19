'use client'

import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { gsap } from '@/lib/animation/gsap'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const concepts = [
  {
    num: '01',
    title: { fr: 'La sélection', ja: '選定' },
    body: 'Chaque créateur est rencontré en personne, dans son atelier au Japon. Nous ne sélectionnons pas des produits — nous sélectionnons des histoires de vie, des décennies de maîtrise, des esthétiques irréductibles.',
    ukiyoe:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Hiroshige_Plum_Park.jpg/800px-Hiroshige_Plum_Park.jpg',
  },
  {
    num: '02',
    title: { fr: 'La transmission', ja: '伝承' },
    body: "Les techniques que nos créateurs pratiquent — raku, urushi, kiriko, yuzen — ont traversé des siècles. Certaines sont classées patrimoine immatériel. Notre rôle est de les faire voyager jusqu'en France, intactes.",
    ukiyoe:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Katsushika_Hokusai_-_Thirty-Six_Views_of_Mount_Fuji-_South_Wind%2C_Clear_Sky_%28Red_Fuji%29_-_Google_Art_Project.jpg/1200px-Katsushika_Hokusai_-_Thirty-Six_Views_of_Mount_Fuji-_South_Wind%2C_Clear_Sky_%28Red_Fuji%29_-_Google_Art_Project.jpg',
  },
  {
    num: '03',
    title: { fr: 'Le dialogue', ja: '対話' },
    body: "Le wabi-sabi japonais et le savoir-vivre français se répondent naturellement — l'imperfection choisie, le temps respecté, la table comme cérémonie. Kizuna est ce dialogue rendu visible.",
    ukiyoe:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Hokusai_-_Ejiri_in_Suruga_Province.jpg/1024px-Hokusai_-_Ejiri_in_Suruga_Province.jpg',
  },
]

// ─── Mobile: vertical layout with enhanced scroll animations ────────────────

function ConceptItemMobile({ item, index }: { item: (typeof concepts)[0]; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const isEven = index % 2 === 0

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch min-h-[480px]`}
    >
      <motion.div
        initial={{ opacity: 0, x: isEven ? -40 : 40 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 1.0, ease: EASE }}
        className={`relative overflow-hidden ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
        style={{ minHeight: 360 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.ukiyoe}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-sumi/30" />
        <p className="absolute bottom-6 right-8 font-cormorant text-[80px] leading-none text-washi/10 select-none">
          {item.num}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        className={`bg-washi flex flex-col justify-center px-10 md:px-16 py-14 ${
          isEven ? 'lg:order-2' : 'lg:order-1'
        }`}
      >
        <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-brume mb-4">
          {item.num} · {item.title.ja}
        </p>
        <h3 className="font-cormorant font-light italic text-4xl md:text-5xl text-sumi mb-6 leading-[1.1]">
          {item.title.fr}
        </h3>
        <p className="font-dm text-sm text-sumi/60 leading-relaxed max-w-[400px]">{item.body}</p>
      </motion.div>
    </div>
  )
}

// ─── Desktop: horizontal scroll-telling ─────────────────────────────────────

function ConceptScrollDesktop() {
  const outerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dotRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!outerRef.current || !trackRef.current) return

    const n = concepts.length
    const dots = dotRefs.current.filter(Boolean) as HTMLDivElement[]

    const ctx = gsap.context(() => {
      gsap.to(trackRef.current, {
        // Move track left so each successive 100vw-wide panel is revealed
        x: () => -(trackRef.current!.offsetWidth - window.innerWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: outerRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const active = Math.round(self.progress * (n - 1))
            dots.forEach((d, i) => {
              gsap.to(d, {
                scaleX: i === active ? 3 : 1,
                opacity: i === active ? 0.8 : 0.25,
                duration: 0.3,
                overwrite: 'auto',
              })
            })
          },
        },
      })
    }, outerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={outerRef} style={{ height: `${concepts.length * 100}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Horizontal track */}
        <div
          ref={trackRef}
          className="flex h-full"
          style={{ width: `${concepts.length * 100}vw` }}
        >
          {concepts.map((item, i) => {
            const isEven = i % 2 === 0
            return (
              <div
                key={item.num}
                className="w-screen h-full flex-shrink-0 grid grid-cols-2"
              >
                {/* Image side */}
                <div
                  className={`relative overflow-hidden ${isEven ? 'order-1' : 'order-2'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.ukiyoe}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-55 mix-blend-multiply"
                  />
                  <div className="absolute inset-0 bg-sumi/35" />
                  <p className="absolute bottom-10 right-12 font-cormorant text-[130px] leading-none text-washi/8 select-none pointer-events-none">
                    {item.num}
                  </p>
                </div>

                {/* Text side */}
                <div
                  className={`bg-washi flex flex-col justify-center px-16 xl:px-24 py-20 ${
                    isEven ? 'order-2' : 'order-1'
                  }`}
                >
                  <p className="font-dm text-[10px] tracking-[0.24em] uppercase text-brume mb-5">
                    {item.num} · {item.title.ja}
                  </p>
                  <h3 className="font-cormorant font-light italic text-5xl xl:text-6xl text-sumi mb-6 leading-[1.1]">
                    {item.title.fr}
                  </h3>
                  <p className="font-dm text-sm text-sumi/60 leading-relaxed max-w-[420px]">
                    {item.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress dots — float above the track */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
          {concepts.map((_, i) => (
            <div
              key={i}
              ref={(el) => { dotRefs.current[i] = el }}
              className="h-px w-6 bg-sumi/25 origin-left"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function ConceptScroll() {
  const labelRef = useRef(null)
  const labelInView = useInView(labelRef, { once: true })

  return (
    <section>
      {/* Section header */}
      <div
        ref={labelRef}
        className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24 flex items-center gap-6"
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={labelInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="font-dm text-[10px] tracking-[0.22em] uppercase text-kincha"
        >
          Notre philosophie
        </motion.span>
        <motion.span
          initial={{ scaleX: 0 }}
          animate={labelInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, ease: EASE }}
          className="flex-1 h-px bg-sumi/10 origin-left block"
        />
        <motion.span
          initial={{ opacity: 0 }}
          animate={labelInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="font-noto text-xs text-sumi/30"
        >
          理念
        </motion.span>
      </div>

      {/* Desktop: horizontal scroll-telling */}
      <div className="hidden lg:block">
        <ConceptScrollDesktop />
      </div>

      {/* Mobile: vertical stacked layout */}
      <div className="lg:hidden">
        {concepts.map((item, i) => (
          <ConceptItemMobile key={item.num} item={item} index={i} />
        ))}
      </div>
    </section>
  )
}
