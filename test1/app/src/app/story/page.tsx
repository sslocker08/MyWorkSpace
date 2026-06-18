import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: "Notre histoire — KANMI",
  description: "Comment KANMI est née du dialogue entre l'esthétique japonaise et l'art de vivre français.",
}

const values = [
  {
    ja: '職人',
    fr: 'L\'artisan·e',
    text: "Chaque pièce est signée d'une paire de mains. Nous visitons les ateliers, rencontrons les maîtres, comprenons leurs gestes avant de les représenter.",
  },
  {
    ja: '間',
    fr: 'Le ma — l\'espace vide',
    text: "Au Japon, l'espace entre les choses a autant de valeur que les choses elles-mêmes. C'est cette philosophie du vide, de la retenue, que KANMI cherche à transmettre.",
  },
  {
    ja: '物語',
    fr: 'L\'histoire derrière',
    text: "Nous n'importons pas des objets — nous importons des récits. La technique, le lieu, le temps : tout compte pour comprendre ce qu'on tient entre les mains.",
  },
  {
    ja: '対話',
    fr: 'Le dialogue',
    text: "Wabi-sabi et art de vivre ne s'opposent pas — ils se reconnaissent. KANMI naît de ce moment de reconnaissance entre deux cultures qui ont su faire de la beauté quotidienne une discipline.",
  },
]

const steps = [
  { step: '01', label: 'Sélection au Japon', text: 'Nos curators visitent ateliers et producteurs à travers le Japon. Seules les pièces qui racontent quelque chose sont retenues.' },
  { step: '02', label: 'Vérification & conditionnement', text: "Chaque article est contrôlé, documenté, emballé à la main au Japon avec des matériaux recyclables." },
  { step: '03', label: 'Expédition directe', text: 'Livraison depuis le Japon vers la France en 7–14 jours ouvrés. Dédouanement pris en charge par KANMI.' },
  { step: '04', label: 'Chez vous', text: "L'objet arrive avec sa fiche d'histoire — le nom du créateur, son atelier, la technique employée." },
]

export default function StoryPage() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-5">
          <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-argile mb-4">
            Notre histoire · 私たちについて
          </p>
          <h1 className="font-cormorant font-light italic text-5xl md:text-6xl lg:text-7xl leading-[1.0] text-encre mb-6">
            Nés du dialogue
            <br />
            entre deux mondes.
          </h1>
          <p className="font-dm text-sm text-encre/70 leading-relaxed max-w-[420px]">
            KANMI est née d'une conviction simple : les objets japonais faits à la main
            et l'art de vivre français parlent la même langue — celle de la qualité,
            du temps, et de la beauté dans les gestes ordinaires.
          </p>
          <p className="font-dm text-[10px] text-brume mt-3">
            日本の手仕事とフランスの生活美学は、同じ言葉を話す。
          </p>
        </div>
        <div className="md:col-span-6 md:col-start-7 relative aspect-[4/3] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=1200&q=85"
            alt="Atelier au Japon"
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
      </section>

      {/* Values */}
      <section className="bg-encre text-ivoire py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-ivoire/40 mb-10">
            Nos valeurs · 価値観
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            {values.map((v) => (
              <div key={v.ja} className="flex gap-6">
                <span className="font-cormorant italic text-4xl text-ivoire/20 leading-none shrink-0 w-12">
                  {v.ja}
                </span>
                <div>
                  <p className="font-dm text-[11px] tracking-[0.1em] uppercase text-argile mb-2">{v.fr}</p>
                  <p className="font-dm text-sm text-ivoire/70 leading-relaxed">{v.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
        <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-argile mb-4">
          Comment ça marche · 仕組み
        </p>
        <h2 className="font-cormorant font-light italic text-4xl md:text-5xl text-encre mb-14">
          Du Japon jusqu'à votre porte.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s) => (
            <div key={s.step} className="flex flex-col gap-4">
              <span className="font-cormorant text-5xl text-encre/10 font-light leading-none">{s.step}</span>
              <div className="h-px bg-encre/10" />
              <p className="font-dm text-[11px] tracking-[0.1em] uppercase text-encre">{s.label}</p>
              <p className="font-dm text-sm text-encre/60 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team — mock curators */}
      <section className="border-t border-encre/10 py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <p className="font-dm text-[10px] tracking-[0.22em] uppercase text-argile mb-4">
            L'équipe · チーム
          </p>
          <h2 className="font-cormorant font-light italic text-4xl text-encre mb-12">
            Les curators KANMI.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Aiko Tanaka', role: 'Curatrice Japon', base: 'Kyoto', bio: "Formée en céramique à Kyoto, Aiko sélectionne les pièces artisanales et entretient les relations avec les ateliers." },
              { name: 'Marc Lefèvre', role: 'Curateur France', base: 'Paris', bio: "Ancien acheteur pour une maison de mode parisienne, Marc identifie les objets japonais susceptibles de résonner auprès des Français." },
              { name: 'Yuki Watanabe', role: 'Curatrice alimentaire', base: 'Tokyo', bio: "Sommelière de saké certifiée et passionnée de thé, Yuki gère la sélection épicerie fine et relations avec les producteurs." },
            ].map((p) => (
              <div key={p.name} className="flex flex-col gap-3">
                <div className="aspect-[4/3] bg-brume/20 flex items-center justify-center overflow-hidden">
                  <span className="font-cormorant italic text-5xl text-brume/40">{p.name[0]}</span>
                </div>
                <p className="font-cormorant text-xl text-encre">{p.name}</p>
                <p className="font-dm text-[10px] tracking-[0.1em] uppercase text-argile">{p.role} · {p.base}</p>
                <p className="font-dm text-sm text-encre/60 leading-relaxed">{p.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
