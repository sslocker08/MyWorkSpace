'use client'

import { useCart } from '@/lib/store/cart'
import Image from 'next/image'

export function CheckoutSummary() {
  const { items, total } = useCart()

  if (items.length === 0) {
    return (
      <div className="border border-encre/10 p-6">
        <p className="font-cormorant italic text-xl text-encre/40">Panier vide</p>
      </div>
    )
  }

  const subtotal = total()
  const shipping = 0 // Free shipping in prototype
  const duties = 0  // Handled by KANMI

  return (
    <div className="sticky top-24">
      <div className="border border-encre/10 p-6 flex flex-col gap-5">
        <p className="font-dm text-[10px] tracking-[0.14em] uppercase text-encre/50">
          Récapitulatif
        </p>

        <ul className="flex flex-col gap-4 border-b border-encre/8 pb-5">
          {items.map((item) => (
            <li key={item.product.id} className="flex gap-3 items-start">
              <div className="relative w-12 aspect-[3/4] shrink-0 overflow-hidden bg-brume/15">
                <Image
                  src={item.product.images[0]}
                  alt={item.product.name.fr}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
                <span className="absolute -top-1.5 -right-1.5 bg-encre text-ivoire text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-dm">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 flex justify-between gap-2">
                <div>
                  <p className="font-cormorant text-base leading-tight">{item.product.name.fr}</p>
                  <p className="font-dm text-[9px] text-brume">{item.product.name.ja}</p>
                </div>
                <p className="font-dm text-sm text-encre shrink-0">
                  {(item.product.price * item.quantity).toLocaleString('fr-FR')} €
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-b border-encre/8 pb-4">
          <div className="flex justify-between font-dm text-xs">
            <span className="text-encre/60">Sous-total</span>
            <span>{subtotal.toLocaleString('fr-FR')} €</span>
          </div>
          <div className="flex justify-between font-dm text-xs">
            <span className="text-encre/60">Livraison depuis le Japon</span>
            <span className="text-vert">Offerte</span>
          </div>
          <div className="flex justify-between font-dm text-xs">
            <span className="text-encre/60">Dédouanement</span>
            <span className="text-vert">Inclus</span>
          </div>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="font-dm text-xs tracking-wider uppercase text-encre/60">Total</span>
          <span className="font-cormorant text-2xl text-encre">{subtotal.toLocaleString('fr-FR')} €</span>
        </div>

        <p className="font-dm text-[9px] text-brume leading-relaxed">
          Taxes incluses. Livraison en 7–14 jours ouvrés depuis le Japon.
          Dédouanement assuré par KANMI.
        </p>
      </div>
    </div>
  )
}
