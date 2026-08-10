'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/store/cart'

export default function CheckoutPage() {
  const { items, total, count, close } = useCart()

  useEffect(() => {
    close()
  }, [close])

  if (count() === 0) {
    return (
      <div className="min-h-screen pt-40 flex flex-col items-center justify-center gap-6 text-center px-6">
        <p className="font-noto text-5xl text-sumi/10">空</p>
        <h1 className="font-zen text-3xl text-sumi">Votre panier est vide</h1>
        <Link
          href="/products"
          className="font-dm text-[12px] tracking-[0.14em] uppercase px-8 py-4 bg-sumi text-washi hover:bg-ai transition-colors duration-300"
        >
          Découvrir les créations →
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-28 md:pt-36 pb-20">
      <div className="max-w-[1100px] mx-auto px-6 md:px-12">
        {/* Header */}
        <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-kiri mb-4">
          Commande · 注文
        </p>
        <h1 className="font-zen font-bold text-4xl md:text-5xl text-sumi mb-12">
          Récapitulatif
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
          {/* Order items */}
          <div>
            <p className="font-dm text-[10px] tracking-[0.18em] uppercase text-kiri mb-6">
              Articles ({count()})
            </p>
            <ul className="divide-y divide-sumi/8">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-5 py-6">
                  <div className="relative w-20 h-24 shrink-0 overflow-hidden bg-sumi/8">
                    <Image
                      src={product.images[0]}
                      alt={product.name.fr}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-shippori text-lg text-sumi leading-tight">{product.name.fr}</p>
                    <p className="font-noto text-[10px] text-sumi/40 mt-0.5">{product.name.ja}</p>
                    <p className="font-dm text-xs text-sumi/50 mt-2">Qté : {quantity}</p>
                  </div>
                  <p className="font-zen text-xl text-kin shrink-0">
                    {(product.price * quantity).toLocaleString('fr-FR')} €
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-sumi/8 flex items-center justify-between">
              <p className="font-dm text-xs tracking-[0.1em] uppercase text-sumi/50">Total commande</p>
              <p className="font-zen text-3xl text-sumi">{total().toLocaleString('fr-FR')} €</p>
            </div>

            <p className="font-dm text-[10px] text-sumi/30 mt-3">
              Livraison depuis le Japon · 7–14 jours · frais calculés à l&apos;étape suivante
            </p>
          </div>

          {/* Payment panel */}
          <div className="bg-sumi/[0.03] border border-sumi/8 p-8 h-fit">
            <p className="font-dm text-[10px] tracking-[0.18em] uppercase text-kiri mb-6">
              Paiement · お支払い
            </p>

            {/* Stripe placeholder */}
            <div className="bg-washi border border-sumi/10 rounded-sm px-5 py-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none" className="text-sumi/20">
                  <rect width="32" height="20" rx="3" fill="currentColor" />
                  <path d="M6 10h20M6 13h12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="font-dm text-[11px] text-sumi/40">Carte bancaire</p>
              </div>
              <div className="space-y-3">
                <div className="h-9 bg-sumi/5 rounded-sm animate-pulse" />
                <div className="flex gap-3">
                  <div className="h-9 bg-sumi/5 rounded-sm flex-1 animate-pulse" />
                  <div className="h-9 bg-sumi/5 rounded-sm w-20 animate-pulse" />
                </div>
              </div>
              <p className="font-dm text-[10px] text-sumi/30 mt-3 text-center">
                Paiement sécurisé Stripe — bientôt disponible
              </p>
            </div>

            <button
              disabled
              className="w-full py-4 bg-sumi/20 text-sumi/30 font-dm text-[12px] tracking-[0.14em] uppercase cursor-not-allowed"
            >
              Confirmer la commande
            </button>

            <p className="font-dm text-[10px] text-sumi/30 text-center mt-4 leading-relaxed">
              L&apos;intégration Stripe est en cours de déploiement.<br />
              Contactez-nous pour passer commande manuellement.
            </p>

            <div className="mt-6 pt-6 border-t border-sumi/8 text-center">
              <Link
                href="/products"
                className="font-dm text-[11px] tracking-[0.08em] uppercase text-sumi/40 hover:text-sumi transition-colors"
              >
                ← Continuer les achats
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
