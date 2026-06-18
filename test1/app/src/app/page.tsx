import { Hero } from '@/components/home/Hero'
import { MarqueeBanner } from '@/components/home/MarqueeBanner'
import { FeaturedGrid } from '@/components/home/FeaturedGrid'
import { EditorialSpotlight } from '@/components/home/EditorialSpotlight'
import { CulturalTeaser } from '@/components/home/CulturalTeaser'

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeBanner />
      <FeaturedGrid />
      <EditorialSpotlight />
      <CulturalTeaser />

      {/* Category strip */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Artisanat', ja: '工芸', cat: 'craft', img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80' },
            { label: 'Mode', ja: 'ファッション', cat: 'fashion', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80' },
            { label: 'Épicerie', ja: '食・茶・酒', cat: 'food', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80' },
            { label: 'Maison', ja: 'ホーム', cat: 'home', img: 'https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80' },
          ].map((item) => (
            <a
              key={item.cat}
              href={`/shop?cat=${item.cat}`}
              className="group relative aspect-square overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.img}
                alt={item.label}
                className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-encre/30 group-hover:bg-encre/50 transition-colors duration-350" />
              <div className="absolute bottom-4 left-4">
                <p className="font-cormorant italic text-xl text-ivoire leading-none">{item.label}</p>
                <p className="font-dm text-[9px] text-ivoire/60 mt-0.5">{item.ja}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  )
}
