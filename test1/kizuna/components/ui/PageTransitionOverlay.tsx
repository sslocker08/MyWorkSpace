'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { gsap } from '@/lib/animation/gsap'

export function PageTransitionOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const mounted = useRef(false)

  useEffect(() => {
    if (!overlayRef.current) return

    // Skip retreat on first mount (page load — no wipe-in happened)
    if (!mounted.current) {
      mounted.current = true
      gsap.set(overlayRef.current, { scaleY: 0 })
      return
    }

    // New pathname → overlay is currently full-screen (scaleY:1) → retreat upward
    gsap.fromTo(
      overlayRef.current,
      { scaleY: 1, transformOrigin: 'top' },
      { scaleY: 0, duration: 0.55, ease: 'power2.inOut', delay: 0.05 }
    )
  }, [pathname])

  return (
    <div
      ref={overlayRef}
      id="page-transition-overlay"
      className="fixed inset-0 z-[200] bg-sumi pointer-events-none"
      style={{ transform: 'scaleY(0)' }}
      aria-hidden="true"
    />
  )
}
