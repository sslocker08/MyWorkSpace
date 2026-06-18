'use client'

import { useState } from 'react'
import { Intro } from '@/components/home/Intro'
import { Hero } from '@/components/home/Hero'
import { ConceptScroll } from '@/components/home/ConceptScroll'
import { CreatorReel } from '@/components/home/CreatorReel'

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(true)

  return (
    <>
      {showIntro && <Intro onComplete={() => setShowIntro(false)} />}
      <Hero />
      <ConceptScroll />
      <CreatorReel />

      {/* Marquee strip */}
      <div className="bg-sumi overflow-hidden py-3.5 select-none border-y border-washi/5 my-16">
        <div className="flex whitespace-nowrap animate-marquee">
          {[0, 1].map((n) => (
            <span key={n} className="font-dm text-[11px] tracking-[0.18em] text-washi/40 pr-0" aria-hidden={n > 0}>
              ARTISANAT · MODE · ÉPICERIE FINE · MAISON · 工芸 · ファッション · 食・茶・酒 · ホーム · JAPON → FRANCE · 職人の手仕事 · 30 CRÉATEURS · 絆プロジェクト ·&nbsp;
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
