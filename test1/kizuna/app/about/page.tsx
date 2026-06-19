import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Le Projet 絆 — Notre histoire',
}

export default function AboutPage() {
  return (
    <div className="pt-32 md:pt-40">
      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 pb-20">
        <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-brume mb-6">
          Le projet · プロジェクト
        </p>
        <h1 className="font-cormorant font-light italic text-5xl md:text-7xl lg:text-[88px] leading-[0.92] text-sumi mb-8 max-w-[900px]">
          Kizuna — le lien<br /> entre deux mondes.
        </h1>
        <p className="font-dm text-sm text-sumi/60 leading-relaxed max-w-[560px]">
          絆 (kizuna) : lien, attachement, ce qui unit. Un mot japonais qui n&apos;a pas d&apos;équivalent exact en français — parce que ce qu&apos;il décrit est universel.
        </p>
      </section>

      {/* Ukiyo-e full-width image */}
      <div className="relative h-[50vh] overflow-hidden bg-sumi/10">
        <Image
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Great_Wave_off_Kanagawa2.jpg/1280px-Great_Wave_off_Kanagawa2.jpg"
          alt="Hokusai — La grande vague de Kanagawa"
          fill
          className="object-cover object-center opacity-50 mix-blend-multiply"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-washi" />
        <div className="absolute bottom-8 right-12 font-dm text-[10px] tracking-[0.12em] text-sumi/30">
          Katsushika Hokusai — La Grande Vague · 富嶽三十六景 · c. 1831 · Domaine public
        </div>
      </div>

      {/* Mission */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-kincha mb-5">Notre mission</p>
            <h2 className="font-cormorant italic text-4xl md:text-5xl text-sumi mb-6 leading-[1.1]">
              Faire voyager l&apos;excellence japonaise jusqu&apos;en France.
            </h2>
            <p className="font-dm text-sm text-sumi/60 leading-relaxed mb-6">
              Nous avons passé un an à traverser le Japon, de Kyoto à Wajima, de Tokushima à Shodoshima, pour rencontrer des artisans, des designers, des producteurs qui font leur métier avec une rigueur absolue.
            </p>
            <p className="font-dm text-sm text-sumi/60 leading-relaxed">
              Notre curation est fondée sur un seul critère : est-ce que cette pièce, portée ou utilisée en France, va changer quelque chose dans la vie de quelqu&apos;un ?
            </p>
          </div>
          <div>
            <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-kincha mb-5">L&apos;équipe</p>
            <p className="font-cormorant italic text-xl text-sumi mb-4">
              Un projet franco-japonais.
            </p>
            <p className="font-dm text-sm text-sumi/60 leading-relaxed mb-6">
              Kizuna est né d&apos;une amitié franco-japonaise et d&apos;une conviction partagée : les savoir-faire artisanaux du Japon méritent un accès direct au marché français, sans intermédiaire qui ne comprend pas leur valeur.
            </p>
            <p className="font-noto text-xs text-sumi/40 leading-relaxed">
              絆は日仏の友情から生まれ、一つの信念を共有する——日本の職人技術はフランス市場への直接アクセスに値する。
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sumi py-20 text-center">
        <p className="font-noto text-4xl text-washi mb-4">絆</p>
        <h3 className="font-cormorant italic text-3xl text-washi/80 mb-6">Rencontrez les trente créateurs.</h3>
        <Link
          href="/creators"
          className="inline-flex items-center gap-3 bg-washi text-sumi px-8 py-4 font-dm text-[12px] tracking-[0.14em] uppercase hover:bg-kincha hover:text-washi transition-colors duration-350"
        >
          Découvrir →
        </Link>
      </section>
    </div>
  )
}
