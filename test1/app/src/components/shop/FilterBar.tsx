'use client'

import { motion } from 'framer-motion'
import { categoryLabels } from '@/lib/data/products'
import { Category } from '@/types'

const CATEGORIES: Array<'all' | Category> = ['all', 'craft', 'fashion', 'food', 'home']

interface FilterBarProps {
  active: string
  onChange: (cat: string) => void
}

export function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {CATEGORIES.map((cat) => {
        const isActive = active === cat
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className="relative px-5 py-2 font-dm text-[11px] tracking-[0.1em] uppercase transition-colors duration-200"
          >
            {isActive && (
              <motion.span
                layoutId="filter-pill"
                className="absolute inset-0 bg-encre"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-ivoire' : 'text-encre/50 hover:text-encre'}`}>
              {categoryLabels[cat]?.fr}
            </span>
          </button>
        )
      })}
    </div>
  )
}
