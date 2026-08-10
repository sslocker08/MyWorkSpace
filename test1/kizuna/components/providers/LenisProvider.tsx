'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/lib/animation/gsap'

type LenisContextValue = { lenis: Lenis | null }
const LenisCtx = createContext<LenisContextValue>({ lenis: null })
export const useLenis = () => useContext(LenisCtx).lenis

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    })
    lenisRef.current = lenis

    function raf(time: number) {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    lenis.on('scroll', ScrollTrigger.update)

    return () => {
      lenis.destroy()
      gsap.ticker.remove(raf)
    }
  }, [])

  return (
    <LenisCtx.Provider value={{ lenis: lenisRef.current }}>
      {children}
    </LenisCtx.Provider>
  )
}
