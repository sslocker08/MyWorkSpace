'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth/actions'

const nav = [
  { href: '/admin', label: 'Tableau de bord', icon: '▤' },
  { href: '/admin/products', label: 'Produits', icon: '◈' },
  { href: '/admin/orders', label: 'Commandes', icon: '◎' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-encre flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-ivoire/5">
        <Link href="/admin" className="font-cormorant text-xl tracking-[0.12em] uppercase text-ivoire">
          KANMI
        </Link>
        <p className="font-dm text-[9px] tracking-[0.14em] uppercase text-ivoire/30 mt-0.5">Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {nav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 font-dm text-[12px] tracking-[0.04em] rounded-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-ivoire/10 text-ivoire'
                  : 'text-ivoire/40 hover:text-ivoire/70 hover:bg-ivoire/5'
              }`}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-ivoire/5">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 font-dm text-[11px] text-ivoire/30 hover:text-ivoire/50 transition-colors"
        >
          <span className="text-xs">↗</span>
          Voir la boutique
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 font-dm text-[11px] text-ivoire/30 hover:text-ivoire/50 transition-colors text-left"
          >
            <span className="text-xs">→</span>
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  )
}
