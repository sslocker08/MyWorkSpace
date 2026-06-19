'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const concepts = [
  {
    num: '01',
    title: { fr: 'La sélection', ja: '選定' },
    body: 'Chaque créateur est rencontré en personne, dans son atelier au Japon. Nous ne sélectionnons pas des produits — nous sélectionnons des histoires de vie, des décennies de maîtrise, des esthétiques irréductibles.',
    ukiyoe: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Hiroshige_Plum_Park.jpg/800px-Hiroshige_Plum_Park.jpg',
  },
  {
    num: '02',
    title: { fr: 'La transmission', ja: '伝承' },
    body: 'Les techniques que nos créateurs pratiquent — raku, urushi, kiriko, yuzen — ont traversé des siècles. Certaines sont classées patrimoine immatériel. Notre rôle est de les faire voyager jusqu\'en France, intactes.',
    ukiyoe: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Katsushika_Hokusai_-_Thirty-Six_Views_of_Mount_Fuji-_South_Wind%2C_Clear_Sky_%28Red_Fuji%29_-_Google_Art_Project.jpg/1200px-Katsushika_Hokusai_-_Thirty-Six_Views_of_Mount_Fuji-_South_Wind%2C_Clear_Sky_%28Red_Fuji%29_-_Google_Art_Project.jpg',
  },
  {
    num: '03',
    title: { fr: 'Le dialogue', ja: '対話' },
    body: 'Le wabi-sabi japonais et le savoir-vivre français se répondent naturellement — l\'imperfection choisie, le temps respecté, la table comme cérémonie. Kizuna est ce dialogue rendu visible.',
    ukiyoe: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Hokusai_-_Ejiri_in_Suruga_Province.jpg/1024px-Hokusai_-_Ejiri_in_Suruga_Province.jpg',
  },
]

function ConceptItem({ item, index }: { item: typeof concepts[0]; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const isEven = index % 2 === 0

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch min-h-[480px] ${
        isEven ? '' : 'lg:flex-row-reverse'
      }`}
    >
      {/* Image side */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -40 : 40 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
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
        {/* Number watermark */}
        <p className="absolute bottom-6 right-8 font-cormorant text-[80px] leading-none text-washi/10 select-none">
          {item.num}
        </p>
      </motion.div>

      {/* Text side */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
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
        <p className="font-dm text-sm text-sumi/60 leading-relaxed max-w-[400px]">
          {item.body}
        </p>
      </motion.div>
    </div>
  )
}

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
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
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

      {/* Alternating concept blocks */}
      {concepts.map((item, i) => (
        <ConceptItem key={item.num} item={item} index={i} />
      ))}
    </section>
  )
}
