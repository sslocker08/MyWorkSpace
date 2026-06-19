'use client'

import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/animation/gsap'

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const shown = useRef(false)

  useEffect(() => {
    // Only activate for pointer (non-touch) devices
    if (window.matchMedia('(hover: none)').matches) return

    const dot = dotRef.current!
    const ring = ringRef.current!

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 })
    document.documentElement.style.cursor = 'none'

    const xDot = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3.out' })
    const yDot = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3.out' })
    const xRing = gsap.quickTo(ring, 'x', { duration: 0.36, ease: 'power2.out' })
    const yRing = gsap.quickTo(ring, 'y', { duration: 0.36, ease: 'power2.out' })

    function onMove(e: MouseEvent) {
      if (!shown.current) {
        gsap.to([dot, ring], { opacity: 1, duration: 0.3 })
        shown.current = true
      }
      xDot(e.clientX)
      yDot(e.clientY)
      xRing(e.clientX)
      yRing(e.clientY)
    }

    const onHoverIn = () => {
      gsap.to(ring, { scale: 2.2, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
      gsap.to(dot, { scale: 0.4, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
    }
    const onHoverOut = () => {
      gsap.to(ring, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' })
      gsap.to(dot, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' })
    }
    const onDown = () => gsap.to(ring, { scale: 0.75, duration: 0.1, overwrite: 'auto' })
    const onUp = () => gsap.to(ring, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' })

    function bindHovers() {
      document.querySelectorAll<Element>('a, button, [data-cursor-hover]').forEach(el => {
        el.addEventListener('mouseenter', onHoverIn)
        el.addEventListener('mouseleave', onHoverOut)
      })
    }
    bindHovers()

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    const mo = new MutationObserver(bindHovers)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.documentElement.style.cursor = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      mo.disconnect()
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-sumi pointer-events-none z-[9999] will-change-transform mix-blend-difference"
        aria-hidden="true"
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-7 h-7 rounded-full border border-sumi/40 pointer-events-none z-[9999] will-change-transform"
        aria-hidden="true"
      />
    </>
  )
}
