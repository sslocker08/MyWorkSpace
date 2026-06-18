import { products, categoryLabels } from '@/lib/data/products'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Category } from '@/types'

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }))
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const product = products.find((p) => p.id === params.id)
  if (!product) notFound()

  const categories: Array<'all' | Category> = ['craft', 'fashion', 'food', 'home']

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/products" className="text-xs text-gray-400 hover:text-gray-600">
          ← Produits
        </Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{product.name.fr}</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 mb-6">
        Prototype — les modifications ne sont pas persistées (pas de base de données connectée).
      </div>

      <form className="flex flex-col gap-6">
        {/* Images preview */}
        <div className="bg-white border border-gray-100 p-5">
          <p className="text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-3">Images</p>
          <div className="flex gap-3">
            {product.images.map((img, i) => (
              <div key={i} className="relative w-20 aspect-[3/4] overflow-hidden bg-gray-100">
                <Image src={img} alt="" fill className="object-cover" sizes="80px" />
              </div>
            ))}
            <button
              type="button"
              className="w-20 aspect-[3/4] border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xl hover:border-gray-300 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white border border-gray-100 p-5 flex flex-col gap-4">
          <p className="text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-1">Informations de base</p>

          <AdminField label="Nom (FR)" defaultValue={product.name.fr} />
          <AdminField label="Nom (JA)" defaultValue={product.name.ja} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.08em] uppercase text-gray-400 mb-1.5">Catégorie</label>
              <select
                defaultValue={product.category}
                className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
              >
                {categories.filter(c => c !== 'all').map((c) => (
                  <option key={c} value={c}>{categoryLabels[c]?.fr}</option>
                ))}
              </select>
            </div>
            <AdminField label="Prix (€)" defaultValue={String(product.price)} type="number" />
          </div>
        </div>

        {/* Descriptions */}
        <div className="bg-white border border-gray-100 p-5 flex flex-col gap-4">
          <p className="text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-1">Descriptions</p>
          <AdminTextarea label="Description courte (FR)" defaultValue={product.shortDescription.fr} rows={2} />
          <AdminTextarea label="Description courte (JA)" defaultValue={product.shortDescription.ja} rows={2} />
          <AdminTextarea label="Histoire (FR)" defaultValue={product.story.fr} rows={5} />
          <AdminTextarea label="Histoire (JA)" defaultValue={product.story.ja} rows={5} />
        </div>

        {/* Tags */}
        <div className="bg-white border border-gray-100 p-5">
          <p className="text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-3">Tags</p>
          <div className="flex gap-2 flex-wrap mb-3">
            {product.tags.map((t) => (
              <span key={t} className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 flex items-center gap-1.5">
                {t}
                <button type="button" className="text-gray-400 hover:text-red-400 text-xs">×</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Ajouter un tag…"
            className="border border-gray-200 px-3 py-2 text-sm text-gray-700 w-full max-w-xs focus:outline-none focus:border-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-encre text-ivoire px-6 py-2.5 text-xs tracking-[0.1em] uppercase hover:bg-argile transition-colors"
          >
            Enregistrer
          </button>
          <Link
            href="/admin/products"
            className="px-6 py-2.5 text-xs tracking-[0.1em] uppercase border border-gray-200 text-gray-600 hover:border-gray-400 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}

function AdminField({ label, defaultValue, type = 'text' }: {
  label: string; defaultValue: string; type?: string
}) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.08em] uppercase text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        className="w-full border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400 bg-white"
      />
    </div>
  )
}

function AdminTextarea({ label, defaultValue, rows = 3 }: {
  label: string; defaultValue: string; rows?: number
}) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.08em] uppercase text-gray-400 mb-1.5">{label}</label>
      <textarea
        defaultValue={defaultValue}
        rows={rows}
        className="w-full border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400 bg-white resize-none leading-relaxed"
      />
    </div>
  )
}
