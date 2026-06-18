import { notFound } from 'next/navigation'
import { getCreatorBySlug, creators } from '@/lib/data/creators'
import { getProductsByCreator } from '@/lib/data/products'
import { CreatorHero } from '@/components/creator/CreatorHero'
import { CreatorConcept } from '@/components/creator/CreatorConcept'
import { CreatorInterview } from '@/components/creator/CreatorInterview'
import { CreatorProducts } from '@/components/creator/CreatorProducts'

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return creators.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props) {
  const creator = getCreatorBySlug(params.slug)
  if (!creator) return {}
  return {
    title: `${creator.brandName.fr} — ${creator.name} · 絆プロジェクト`,
    description: creator.brandConcept.fr,
  }
}

export default function CreatorPage({ params }: Props) {
  const creator = getCreatorBySlug(params.slug)
  if (!creator) notFound()

  const creatorProducts = getProductsByCreator(creator.id)

  return (
    <div style={{ '--brand-accent': creator.accentColor } as React.CSSProperties}>
      <CreatorHero creator={creator} />
      <CreatorConcept creator={creator} />
      <CreatorInterview creator={creator} />
      <CreatorProducts creator={creator} products={creatorProducts} />
    </div>
  )
}
