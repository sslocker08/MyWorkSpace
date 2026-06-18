'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/lib/store/cart'
import Link from 'next/link'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, remove, updateQty, total } = useCart()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-encre/30 z-50"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-ivoire z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-encre/10">
              <span className="font-cormorant text-xl tracking-wider">Panier</span>
              <button
                onClick={onClose}
                className="font-dm text-xs tracking-[0.1em] uppercase text-encre/50 hover:text-encre transition-colors"
              >
                Fermer
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <p className="font-cormorant text-2xl italic text-encre/40">Votre panier est vide</p>
                  <p className="font-dm text-xs text-brume">空のカゴです</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-5">
                  {items.map((item) => (
                    <li key={item.product.id} className="flex gap-4">
                      <div className="w-16 aspect-[3/4] bg-brume/20 shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name.fr}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <p className="font-cormorant text-base leading-tight">{item.product.name.fr}</p>
                        <p className="font-dm text-xs text-brume">{item.product.name.ja}</p>
                        <p className="font-dm text-sm text-argile mt-auto">{item.product.price} €</p>
                        <div className="flex items-center gap-3 mt-1">
                          <button
                            onClick={() => updateQty(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 border border-encre/20 flex items-center justify-center font-dm text-xs hover:border-encre transition-colors"
                          >
                            –
                          </button>
                          <span className="font-dm text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 border border-encre/20 flex items-center justify-center font-dm text-xs hover:border-encre transition-colors"
                          >
                            +
                          </button>
                          <button
                            onClick={() => remove(item.product.id)}
                            className="ml-auto font-dm text-[11px] text-brume hover:text-encre transition-colors"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-encre/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-dm text-sm tracking-wider">Total</span>
                  <span className="font-cormorant text-xl">{total().toLocaleString('fr-FR')} €</span>
                </div>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="block w-full bg-encre text-ivoire text-center py-3.5 font-dm text-[13px] tracking-[0.12em] uppercase hover:bg-argile transition-colors duration-350"
                >
                  Commander
                </Link>
                <p className="text-center font-dm text-[10px] text-brume mt-2">Livraison depuis le Japon · 7–14 jours</p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
