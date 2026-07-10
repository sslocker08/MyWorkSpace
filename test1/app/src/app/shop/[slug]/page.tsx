import { notFound } from 'next/navigation'
import { getProductBySlug, products, categoryLabels } from '@/lib/data/products'
import { ImageGallery } from '@/components/product/ImageGallery'
import { StoryBlock } from '@/components/product/StoryBlock'
import { AddToCart } from '@/components/product/AddToCart'
import { ProductCard } from '@/components/shop/ProductCard'
import Link from 'next/link'

interface PageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const product = getProductBySlug(params.slug)
  if (!product) return {}
  return {
    title: `${product.name.fr} — KANMI`,
    description: product.shortDescription.fr,
  }
}

export default function ProductPage({ params }: PageProps) {
  const product = getProductBySlug(params.slug)
  if (!product) notFound()

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3)

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-dm text-[10px] tracking-[0.08em] uppercase text-brume mb-10">
          <Link href="/" className="hover:text-encre transition-colors">Accueil</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-encre transition-colors">Boutique</Link>
          <span>/</span>
          <Link href={`/shop?cat=${product.category}`} className="hover:text-encre transition-colors">
            {categoryLabels[product.category]?.fr}
          </Link>
          <span>/</span>
          <span className="text-encre">{product.name.fr}</span>
        </nav>

        {/* Main product layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16">
          {/* Gallery — left, 6 cols */}
          <div className="md:col-span-6">
            <ImageGallery images={product.images} alt={product.name.fr} />
          </div>

          {/* Info — right, 5 cols (offset 1) */}
          <div className="md:col-span-5 md:col-start-8">
            {/* Category tag */}
            <p className="font-dm text-[10px] tracking-[0.16em] uppercase text-argile mb-4">
              {categoryLabels[product.category]?.fr}
              <span className="ml-2 text-brume">{categoryLabels[product.category]?.ja}</span>
            </p>

            {/* Name */}
            <h1 className="font-cormorant font-light text-3xl md:text-4xl leading-tight text-encre mb-1">
              {product.name.fr}
            </h1>
            <p className="font-dm text-xs text-brume mb-6">{product.name.ja}</p>

            {/* Short description */}
            <p className="font-dm text-sm text-encre/70 leading-relaxed mb-8">
              {product.shortDescription.fr}
            </p>

            {/* Add to cart */}
            <AddToCart product={product} />

            {/* Story */}
            <StoryBlock fr={product.story.fr} ja={product.story.ja} />
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <section className="mt-20 md:mt-28 pt-12 border-t border-encre/10">
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-cormorant italic text-3xl text-encre">Vous aimerez aussi</h2>
              <Link
                href={`/shop?cat=${product.category}`}
                className="hidden md:inline font-dm text-[11px] tracking-[0.1em] uppercase text-encre/40 hover:text-encre transition-colors border-b border-encre/20 pb-0.5"
              >
                Voir tout
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
