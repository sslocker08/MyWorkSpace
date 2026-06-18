'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageGalleryProps {
  images: string[]
  alt: string
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [active, setActive] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-brume/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={images[active]}
              alt={alt}
              fill
              priority={active === 0}
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative w-16 aspect-[3/4] overflow-hidden transition-opacity duration-200 ${
                i === active ? 'opacity-100 ring-1 ring-encre' : 'opacity-40 hover:opacity-70'
              }`}
            >
              <Image
                src={img}
                alt={`${alt} ${i + 1}`}
                fill
                className="object-cover object-center"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
