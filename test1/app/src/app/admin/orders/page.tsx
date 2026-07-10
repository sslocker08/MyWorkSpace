import { mockOrders, statusLabels, OrderStatus } from '@/lib/data/mock-orders'

export default function AdminOrdersPage() {
  const totalRevenue = mockOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + o.total, 0)

  const byStatus: Record<OrderStatus, number> = {
    pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0,
  }
  mockOrders.forEach((o) => byStatus[o.status]++)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Commandes</h1>
        <p className="text-sm text-gray-400 mt-1">
          {mockOrders.length} commandes · {totalRevenue.toLocaleString('fr-FR')} € de CA
        </p>
      </div>

      {/* Status summary */}
      <div className="flex gap-3 flex-wrap mb-8">
        {(Object.entries(byStatus) as [OrderStatus, number][]).map(([status, count]) => {
          const s = statusLabels[status]
          return (
            <div key={status} className={`px-3 py-2 text-[11px] rounded-sm ${s.color}`}>
              <span className="font-medium">{count}</span>
              <span className="ml-1 opacity-70">{s.fr}</span>
            </div>
          )
        })}
      </div>

      {/* Orders table */}
      <div className="bg-white border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Réf.', 'Client', 'Ville', 'Articles', 'Total', 'Statut', 'Date', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.08em] uppercase text-gray-400 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...mockOrders]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((order) => {
                const status = statusLabels[order.status]
                return (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">{order.ref}</td>
                    <td className="px-4 py-4">
                      <p className="text-gray-800 font-medium">{order.customer.name}</p>
                      <p className="text-xs text-gray-400">{order.customer.email}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs">{order.customer.city}</td>
                    <td className="px-4 py-4 text-gray-500 text-xs">
                      {order.items.map((i) => `${i.name} ×${i.qty}`).join(', ').slice(0, 40) + (order.items.length > 1 ? '…' : '')}
                    </td>
                    <td className="px-4 py-4 text-gray-800 font-medium whitespace-nowrap">
                      {order.total.toLocaleString('fr-FR')} €
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block text-[10px] tracking-wide px-2 py-1 rounded-sm font-medium whitespace-nowrap ${status.color}`}>
                        {status.fr}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap">{order.createdAt}</td>
                    <td className="px-4 py-4">
                      <button className="text-xs text-argile hover:underline">Détails</button>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
