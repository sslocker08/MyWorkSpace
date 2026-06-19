'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Product, Creator } from '@/types'
import { useCart } from '@/lib/store/cart'

interface Props {
  product: Product
  creator: Creator
}

export function ProductDetail({ product, creator }: Props) {
  const [activeImg, setActiveImg] = useState(0)
  const [added, setAdded] = useState(false)
  const { add, open } = useCart()

  const handleAdd = () => {
    add(product)
    setAdded(true)
    open()
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-8 pb-4">
        <nav className="flex items-center gap-2 font-dm text-[11px] tracking-[0.08em] uppercase text-sumi/40">
          <Link href="/products" className="hover:text-sumi transition-colors">Boutique</Link>
          <span>·</span>
          <Link href={`/creators/${creator.slug}`} className="hover:text-sumi transition-colors">
            {creator.brandName.fr}
          </Link>
          <span>·</span>
          <span className="text-sumi/70">{product.name.fr}</span>
        </nav>
      </div>

      {/* Main layout */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Images */}
          <div className="sticky top-24">
            {/* Main image */}
            <div className="relative aspect-[4/5] overflow-hidden bg-brume/10 mb-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImg}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={product.images[activeImg]}
                    alt={product.name.fr}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
              {/* Brand accent stripe */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: creator.accentColor }}
              />
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative w-16 h-20 overflow-hidden transition-all duration-200 ${
                      activeImg === i ? 'ring-2 ring-sumi' : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="lg:pt-4">
            {/* Creator link */}
            <Link
              href={`/creators/${creator.slug}`}
              className="inline-flex items-center gap-2 mb-6 group"
            >
              <div
                className="w-6 h-px transition-all duration-300 group-hover:w-10"
                style={{ backgroundColor: creator.accentColor }}
              />
              <span className="font-dm text-[11px] tracking-[0.14em] uppercase text-brume group-hover:text-sumi transition-colors">
                {creator.brandName.fr}
              </span>
            </Link>

            {/* Name */}
            <h1 className="font-cormorant font-light italic text-4xl md:text-5xl text-sumi leading-[1.05] mb-1">
              {product.name.fr}
            </h1>
            <p className="font-noto text-sm text-sumi/40 mb-6">{product.name.ja}</p>

            {/* Price */}
            <p
              className="font-cormorant text-4xl mb-8"
              style={{ color: creator.accentColor }}
            >
              {product.price.toLocaleString('fr-FR')} €
            </p>

            {/* Short description */}
            <p className="font-dm text-sm text-sumi/60 leading-relaxed mb-8 border-l-2 pl-4" style={{ borderColor: creator.accentColor }}>
              {product.shortDescription.fr}
            </p>

            {/* Add to cart */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAdd}
              className="w-full py-4 font-dm text-[12px] tracking-[0.16em] uppercase transition-colors duration-300 mb-4"
              style={{
                backgroundColor: added ? creator.accentColor : '#1A1612',
                color: '#F2EBE0',
              }}
            >
              {added ? '✓ Ajouté au panier' : 'Ajouter au panier'}
            </motion.button>

            {/* Shipping info */}
            <div className="flex items-center gap-3 py-4 border-t border-sumi/8">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brume shrink-0">
                <path d="M5 12H19M19 12L13 6M19 12L13 18" />
              </svg>
              <p className="font-dm text-xs text-sumi/40">
                Expédié depuis le Japon · Livraison 7–14 jours · Frais calculés à la commande
              </p>
            </div>

            {/* Story */}
            <div className="mt-8 pt-8 border-t border-sumi/8">
              <p className="font-dm text-[10px] tracking-[0.18em] uppercase text-brume mb-4">
                L&apos;histoire · 物語
              </p>
              <p className="font-dm text-sm text-sumi/65 leading-relaxed mb-4">{product.story.fr}</p>
              <p className="font-noto text-xs text-sumi/30 leading-relaxed">{product.story.ja}</p>
            </div>

            {/* Tags */}
            <div className="mt-8 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-dm text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 border border-sumi/10 text-sumi/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Creator CTA */}
      <div
        className="mt-20 py-16 text-center"
        style={{ backgroundColor: creator.palette.surface }}
      >
        <p className="font-noto text-xs mb-2" style={{ color: `${creator.palette.text}50` }}>
          {creator.brandName.ja}
        </p>
        <h3
          className="font-cormorant italic text-3xl mb-4"
          style={{ color: creator.palette.text }}
        >
          Découvrir {creator.brandName.fr}
        </h3>
        <Link
          href={`/creators/${creator.slug}`}
          className="inline-flex items-center gap-3 font-dm text-[12px] tracking-[0.14em] uppercase px-7 py-3.5 transition-colors duration-300"
          style={{ backgroundColor: creator.accentColor, color: creator.palette.bg }}
        >
          Voir tous les créations →
        </Link>
      </div>
    </div>
  )
}
