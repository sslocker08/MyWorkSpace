import { products } from '@/lib/data/products'
import { categoryLabels } from '@/lib/data/products'
import Image from 'next/image'
import Link from 'next/link'

export default function AdminProductsPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Produits</h1>
          <p className="text-sm text-gray-400 mt-1">{products.length} produits · 4 catégories</p>
        </div>
        <button className="bg-encre text-ivoire px-5 py-2.5 text-xs tracking-[0.1em] uppercase hover:bg-argile transition-colors">
          + Ajouter un produit
        </button>
      </div>

      <div className="bg-white border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['', 'Produit', 'Catégorie', 'Prix', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.08em] uppercase text-gray-400 font-normal first:w-14">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="relative w-10 h-[53px] overflow-hidden bg-gray-100">
                    <Image
                      src={p.images[0]}
                      alt={p.name.fr}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{p.name.fr}</p>
                  <p className="text-xs text-gray-400">{p.name.ja}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1">
                    {categoryLabels[p.category]?.fr}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">{p.price} €</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-xs text-argile hover:underline"
                    >
                      Modifier
                    </Link>
                    <Link
                      href={`/shop/${p.slug}`}
                      target="_blank"
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Voir ↗
                    </Link>
                    <button className="text-xs text-red-400 hover:text-red-600 transition-colors">
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
