'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { login, LoginResult } from '@/lib/auth/actions'

const initialState: LoginResult | null = null

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-ivoire text-encre py-3.5 font-dm text-[12px] tracking-[0.14em] uppercase hover:bg-argile hover:text-ivoire transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
    >
      {pending ? 'Connexion…' : 'Se connecter'}
    </button>
  )
}

export default function AdminLoginPage() {
  const [result, action] = useFormState(
    async (_prev: LoginResult | null, formData: FormData) => login(formData),
    initialState
  )

  return (
    <div className="min-h-screen bg-encre flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <p className="font-cormorant text-3xl tracking-[0.15em] uppercase text-ivoire">KANMI</p>
          <p className="font-dm text-[10px] tracking-[0.18em] uppercase text-ivoire/30 mt-1">
            Administration
          </p>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="block font-dm text-[10px] tracking-[0.12em] uppercase text-ivoire/40 mb-2">
              Identifiant
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              autoFocus
              className="w-full bg-ivoire/5 border border-ivoire/10 px-4 py-3 font-dm text-sm text-ivoire placeholder:text-ivoire/20 focus:outline-none focus:border-ivoire/30 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-dm text-[10px] tracking-[0.12em] uppercase text-ivoire/40 mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full bg-ivoire/5 border border-ivoire/10 px-4 py-3 font-dm text-sm text-ivoire placeholder:text-ivoire/20 focus:outline-none focus:border-ivoire/30 transition-colors"
            />
          </div>

          {result && !result.success && (
            <p className="font-dm text-xs text-red-400 bg-red-400/10 px-4 py-3 border border-red-400/20">
              {result.error}
            </p>
          )}

          <SubmitButton />
        </form>

        <p className="font-dm text-[10px] text-ivoire/20 text-center mt-8">
          Accès réservé aux administrateurs KANMI
        </p>
      </div>
    </div>
  )
}
