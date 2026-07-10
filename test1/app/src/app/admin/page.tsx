import { products } from '@/lib/data/products'
import { mockOrders, statusLabels } from '@/lib/data/mock-orders'
import Link from 'next/link'

export default function AdminDashboard() {
  const totalRevenue = mockOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + o.total, 0)

  const recentOrders = [...mockOrders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  const stats = [
    { label: 'Produits', value: products.length, sub: '4 catégories', href: '/admin/products' },
    { label: 'Commandes', value: mockOrders.length, sub: `${mockOrders.filter(o => o.status === 'pending').length} en attente`, href: '/admin/orders' },
    { label: 'Chiffre d\'affaires', value: `${totalRevenue.toLocaleString('fr-FR')} €`, sub: 'hors annulées', href: '/admin/orders' },
    { label: 'Livré', value: mockOrders.filter(o => o.status === 'delivered').length, sub: 'commandes', href: '/admin/orders' },
  ]

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-400 mt-1">Bienvenue dans l'administration KANMI.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-gray-100 p-5 hover:border-gray-200 transition-colors group"
          >
            <p className="text-[11px] tracking-[0.08em] uppercase text-gray-400 mb-2">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900 group-hover:text-argile transition-colors">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Commandes récentes</h2>
          <Link href="/admin/orders" className="text-[11px] text-argile hover:underline">
            Voir tout
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {['Réf.', 'Client', 'Ville', 'Total', 'Statut', 'Date'].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-[10px] tracking-[0.08em] uppercase text-gray-400 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => {
              const status = statusLabels[order.status]
              return (
                <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs text-gray-500">{order.ref}</td>
                  <td className="px-6 py-3.5 text-gray-700">{order.customer.name}</td>
                  <td className="px-6 py-3.5 text-gray-400 text-xs">{order.customer.city}</td>
                  <td className="px-6 py-3.5 text-gray-700">{order.total.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-block text-[10px] tracking-wide px-2 py-1 rounded-sm font-medium ${status.color}`}>
                      {status.fr}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-400 text-xs">{order.createdAt}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
