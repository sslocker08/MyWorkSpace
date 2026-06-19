'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/store/cart'

export function CartDrawer() {
  const { isOpen, close, items, remove, updateQty, total, count } = useCart()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-sumi/40 z-50 backdrop-blur-sm"
            onClick={close}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-washi z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-sumi/8">
              <div>
                <p className="font-cormorant italic text-xl text-sumi">Votre panier</p>
                <p className="font-noto text-[10px] text-sumi/40 mt-0.5">お買い物かご</p>
              </div>
              <button onClick={close} className="text-sumi/40 hover:text-sumi transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Items — data-lenis-prevent stops Lenis intercepting wheel/touch inside the drawer */}
            <div className="flex-1 overflow-y-auto px-8 py-6" data-lenis-prevent>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <p className="font-noto text-4xl text-sumi/10">空</p>
                  <p className="font-cormorant italic text-lg text-sumi/40">Votre panier est vide</p>
                  <p className="font-dm text-xs text-sumi/30">Découvrez nos créateurs</p>
                </div>
              ) : (
                <ul className="space-y-6">
                  {items.map(({ product, quantity }) => (
                    <li key={product.id} className="flex gap-4">
                      <div className="relative w-20 h-24 shrink-0 overflow-hidden bg-brume/10">
                        <Image
                          src={product.images[0]}
                          alt={product.name.fr}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-cormorant text-base text-sumi leading-tight truncate">
                          {product.name.fr}
                        </p>
                        <p className="font-noto text-[10px] text-sumi/40 mt-0.5 truncate">
                          {product.name.ja}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          {/* Qty */}
                          <div className="flex items-center border border-sumi/15">
                            <button
                              onClick={() => updateQty(product.id, quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-sumi/50 hover:text-sumi transition-colors text-sm"
                            >−</button>
                            <span className="w-7 text-center font-dm text-sm text-sumi">{quantity}</span>
                            <button
                              onClick={() => updateQty(product.id, quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-sumi/50 hover:text-sumi transition-colors text-sm"
                            >+</button>
                          </div>
                          <p className="font-dm text-sm text-kincha">
                            {(product.price * quantity).toLocaleString('fr-FR')} €
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => remove(product.id)}
                        className="self-start text-sumi/20 hover:text-sumi/60 transition-colors mt-1"
                        aria-label="Retirer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {count() > 0 && (
              <div className="px-8 py-6 border-t border-sumi/8">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-dm text-xs tracking-[0.08em] uppercase text-sumi/50">Total</p>
                  <p className="font-cormorant text-2xl text-sumi">{total().toLocaleString('fr-FR')} €</p>
                </div>
                <p className="font-dm text-[10px] text-sumi/30 mb-5">
                  Livraison calculée à l&apos;étape suivante · Expédition depuis le Japon 7–14 jours
                </p>
                <Link
                  href="/checkout"
                  onClick={close}
                  className="block w-full bg-sumi text-washi py-4 text-center font-dm text-[12px] tracking-[0.14em] uppercase hover:bg-kon transition-colors duration-300"
                >
                  Passer commande →
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
