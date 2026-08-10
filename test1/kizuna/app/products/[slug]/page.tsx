import { notFound } from 'next/navigation'
import { getProductBySlug, products } from '@/lib/data/products'
import { creators } from '@/lib/data/creators'
import { ProductDetail } from '@/components/product/ProductDetail'

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props) {
  const product = getProductBySlug(params.slug)
  if (!product) return {}
  return {
    title: `${product.name.fr} · 絆プロジェクト`,
    description: product.shortDescription.fr,
  }
}

export default function ProductPage({ params }: Props) {
  const product = getProductBySlug(params.slug)
  if (!product) notFound()

  const creator = creators.find((c) => c.id === product.creatorId)
  if (!creator) notFound()

  return <ProductDetail product={product} creator={creator} />
}
