'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { gsap } from '@/lib/animation/gsap'

interface Props {
  href: string
  children: React.ReactNode
  className?: string
}

export function TransitionLink({ href, children, className }: Props) {
  const router = useRouter()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Let modified clicks (Ctrl/Cmd/Shift/middle-click) navigate normally
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()

    const overlay = document.getElementById('page-transition-overlay')
    if (!overlay) {
      router.push(href)
      return
    }

    gsap.fromTo(
      overlay,
      { scaleY: 0, transformOrigin: 'bottom' },
      {
        scaleY: 1,
        duration: 0.42,
        ease: 'power2.inOut',
        onComplete: () => router.push(href),
      }
    )
  }

  return (
    <Link href={href} onClick={handleClick} className={className} prefetch>
      {children}
    </Link>
  )
}
