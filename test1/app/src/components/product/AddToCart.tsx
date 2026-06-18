'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/lib/store/cart'
import { Product } from '@/types'

interface AddToCartProps {
  product: Product
}

export function AddToCart({ product }: AddToCartProps) {
  const [added, setAdded] = useState(false)
  const { add, toggle } = useCart()

  function handleAdd() {
    add(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="font-cormorant text-3xl">{product.price}</span>
        <span className="font-dm text-sm text-encre/60">€ EUR</span>
      </div>

      <p className="font-dm text-[10px] text-brume">Taxes incluses. Livraison calculée à la commande.</p>

      {/* Add to cart button */}
      <motion.button
        onClick={handleAdd}
        whileTap={{ scale: 0.98 }}
        className={`relative w-full py-4 font-dm text-[12px] tracking-[0.14em] uppercase overflow-hidden transition-colors duration-350 ${
          added ? 'bg-vert text-ivoire' : 'bg-encre text-ivoire hover:bg-argile'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={added ? 'added' : 'add'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="block"
          >
            {added ? '✓ Ajouté au panier' : 'Ajouter au panier'}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {added && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => toggle()}
          className="w-full py-3 border border-encre/20 font-dm text-[11px] tracking-[0.1em] uppercase text-encre/70 hover:border-encre hover:text-encre transition-all duration-200"
        >
          Voir le panier
        </motion.button>
      )}

      {/* Shipping info */}
      <div className="border border-encre/8 p-4 mt-2">
        <p className="font-dm text-[10px] tracking-[0.08em] text-encre/50 leading-relaxed">
          📦 Expédition depuis le Japon · 7–14 jours ouvrés<br />
          🔄 Retours acceptés sous 14 jours<br />
          🛃 Dédouanement assuré par KANMI
        </p>
        <p className="font-dm text-[9px] text-brume mt-1">日本直送 · 7〜14営業日</p>
      </div>
    </div>
  )
}
