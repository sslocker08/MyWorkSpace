import type { Metadata } from 'next'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary'

export const metadata: Metadata = {
  title: 'Commander — KANMI',
}

export default function CheckoutPage() {
  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-12">
        <div className="mb-10">
          <p className="font-dm text-[10px] tracking-[0.2em] uppercase text-argile mb-2">
            Finaliser · 注文確認
          </p>
          <h1 className="font-cormorant font-light italic text-4xl md:text-5xl text-encre">
            Votre commande
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Form — left, 7 cols */}
          <div className="lg:col-span-7">
            <CheckoutForm />
          </div>

          {/* Summary — right, 4 cols (offset 1) */}
          <div className="lg:col-span-4 lg:col-start-9">
            <CheckoutSummary />
          </div>
        </div>
      </div>
    </div>
  )
}
