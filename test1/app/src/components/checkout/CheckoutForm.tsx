'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/lib/store/cart'
import { useRouter } from 'next/navigation'

type Step = 'shipping' | 'payment' | 'success'

export function CheckoutForm() {
  const [step, setStep] = useState<Step>('shipping')
  const [loading, setLoading] = useState(false)
  const { items, total } = useCart()
  const router = useRouter()

  function handleShipping(e: React.FormEvent) {
    e.preventDefault()
    setStep('payment')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Mock payment processing delay
    await new Promise((r) => setTimeout(r, 1800))
    setLoading(false)
    setStep('success')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (items.length === 0 && step !== 'success') {
    return (
      <div className="flex flex-col items-center text-center py-16 gap-5">
        <p className="font-cormorant italic text-3xl text-encre/50">Votre panier est vide.</p>
        <p className="font-dm text-xs text-brume mb-2">空のカゴです</p>
        <button
          onClick={() => router.push('/shop')}
          className="font-dm text-[12px] tracking-[0.1em] uppercase bg-encre text-ivoire px-6 py-3 hover:bg-argile transition-colors"
        >
          Découvrir la boutique
        </button>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center py-16 gap-6"
      >
        <div className="w-16 h-16 rounded-full bg-vert/10 flex items-center justify-center">
          <span className="text-vert text-2xl">✓</span>
        </div>
        <div>
          <h2 className="font-cormorant italic text-4xl text-encre mb-2">Commande confirmée</h2>
          <p className="font-dm text-xs text-brume">ご注文ありがとうございます</p>
        </div>
        <p className="font-dm text-sm text-encre/70 max-w-[340px] leading-relaxed">
          Votre commande a été transmise à nos équipes au Japon. Vous recevrez un email
          de confirmation dans les prochaines minutes.
        </p>
        <div className="border border-encre/10 p-5 text-left max-w-[340px] w-full">
          <p className="font-dm text-[10px] tracking-[0.1em] uppercase text-brume mb-2">Référence</p>
          <p className="font-cormorant text-xl">KNM-2024-{Math.floor(1000 + Math.random() * 9000)}</p>
          <p className="font-dm text-[10px] text-brume mt-1">Livraison estimée: 7–14 jours ouvrés</p>
        </div>
        <button
          onClick={() => router.push('/shop')}
          className="font-dm text-[12px] tracking-[0.1em] uppercase border-b border-encre/30 pb-0.5 hover:border-encre transition-colors"
        >
          Continuer les achats
        </button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-10">
        {(['shipping', 'payment'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-dm text-[11px] transition-colors duration-300 ${
              step === s ? 'bg-encre text-ivoire' : i < (['shipping', 'payment'] as Step[]).indexOf(step) ? 'bg-vert/20 text-vert' : 'bg-brume/20 text-brume'
            }`}>
              {i + 1}
            </div>
            <span className={`font-dm text-[11px] tracking-[0.08em] uppercase transition-colors duration-200 ${step === s ? 'text-encre' : 'text-brume'}`}>
              {s === 'shipping' ? 'Livraison' : 'Paiement'}
            </span>
            {i === 0 && <span className="text-brume/30 text-sm">—</span>}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'shipping' && (
          <motion.form
            key="shipping"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleShipping}
            className="flex flex-col gap-5"
          >
            <h2 className="font-cormorant italic text-3xl text-encre mb-2">Adresse de livraison</h2>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom" name="first_name" required autoComplete="given-name" />
              <Field label="Nom" name="last_name" required autoComplete="family-name" />
            </div>
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Adresse" name="address" required autoComplete="street-address" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="Code postal" name="postal" required autoComplete="postal-code" />
              <div className="col-span-2">
                <Field label="Ville" name="city" required autoComplete="address-level2" />
              </div>
            </div>
            <div>
              <label className="block font-dm text-[10px] tracking-[0.1em] uppercase text-encre/50 mb-1.5">Pays</label>
              <select
                name="country"
                className="w-full border border-encre/15 bg-ivoire px-4 py-3 font-dm text-sm text-encre focus:outline-none focus:border-encre transition-colors"
                defaultValue="FR"
              >
                <option value="FR">France</option>
                <option value="BE">Belgique</option>
                <option value="CH">Suisse</option>
                <option value="LU">Luxembourg</option>
              </select>
            </div>
            <Field label="Téléphone" name="phone" type="tel" autoComplete="tel" />

            <button
              type="submit"
              className="w-full bg-encre text-ivoire py-4 font-dm text-[12px] tracking-[0.14em] uppercase hover:bg-argile transition-colors duration-350 mt-2"
            >
              Continuer vers le paiement
            </button>
            <p className="font-dm text-[10px] text-brume text-center">
              🔒 Vos données sont chiffrées et sécurisées
            </p>
          </motion.form>
        )}

        {step === 'payment' && (
          <motion.form
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handlePayment}
            className="flex flex-col gap-5"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-cormorant italic text-3xl text-encre">Paiement</h2>
              <button
                type="button"
                onClick={() => setStep('shipping')}
                className="font-dm text-[11px] text-brume hover:text-encre transition-colors"
              >
                ← Modifier la livraison
              </button>
            </div>

            {/* Mock Stripe card form */}
            <div className="border border-encre/15 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-dm text-[10px] tracking-[0.12em] uppercase text-encre/50">
                  🔒 Paiement sécurisé
                </p>
                <div className="flex gap-2">
                  {['VISA', 'MC', 'AMEX'].map((c) => (
                    <span key={c} className="font-dm text-[9px] border border-encre/15 px-1.5 py-0.5 text-encre/40">{c}</span>
                  ))}
                </div>
              </div>
              <Field label="Titulaire de la carte" name="card_name" required autoComplete="cc-name" />
              <div>
                <label className="block font-dm text-[10px] tracking-[0.1em] uppercase text-encre/50 mb-1.5">
                  Numéro de carte
                </label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full border border-encre/15 bg-ivoire px-4 py-3 font-dm text-sm text-encre placeholder:text-brume/50 focus:outline-none focus:border-encre transition-colors tracking-widest"
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 16)
                    e.target.value = v.replace(/(.{4})/g, '$1 ').trim()
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-dm text-[10px] tracking-[0.1em] uppercase text-encre/50 mb-1.5">
                    Expiration
                  </label>
                  <input
                    type="text"
                    placeholder="MM / AA"
                    maxLength={7}
                    className="w-full border border-encre/15 bg-ivoire px-4 py-3 font-dm text-sm text-encre placeholder:text-brume/50 focus:outline-none focus:border-encre transition-colors"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                      e.target.value = v.length > 2 ? `${v.slice(0, 2)} / ${v.slice(2)}` : v
                    }}
                  />
                </div>
                <div>
                  <label className="block font-dm text-[10px] tracking-[0.1em] uppercase text-encre/50 mb-1.5">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    maxLength={4}
                    className="w-full border border-encre/15 bg-ivoire px-4 py-3 font-dm text-sm text-encre placeholder:text-brume/50 focus:outline-none focus:border-encre transition-colors"
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4)
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-encre text-ivoire py-4 font-dm text-[12px] tracking-[0.14em] uppercase hover:bg-argile transition-colors duration-350 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 border border-ivoire/40 border-t-ivoire rounded-full animate-spin" />
                  Traitement en cours…
                </span>
              ) : (
                `Payer ${total().toLocaleString('fr-FR')} €`
              )}
            </button>
            <p className="font-dm text-[10px] text-brume text-center">
              Prototype — aucun paiement réel ne sera effectué
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({
  label, name, type = 'text', required, autoComplete, placeholder,
}: {
  label: string; name: string; type?: string; required?: boolean; autoComplete?: string; placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block font-dm text-[10px] tracking-[0.1em] uppercase text-encre/50 mb-1.5">
        {label}{required && <span className="text-argile ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full border border-encre/15 bg-ivoire px-4 py-3 font-dm text-sm text-encre placeholder:text-brume/50 focus:outline-none focus:border-encre transition-colors"
      />
    </div>
  )
}
