import { Product } from '@/types'

export const products: Product[] = [
  // --- CRAFT ---
  {
    id: 'c1',
    slug: 'bol-hagi-yaki',
    name: { fr: 'Bol Hagi-yaki', ja: '萩焼 茶碗' },
    category: 'craft',
    price: 180,
    shortDescription: {
      fr: 'Céramique de la région de Hagi, façonnée à la main depuis le XVIe siècle.',
      ja: '16世紀から続く萩の土で、職人の手により一点ずつ成形された茶碗。',
    },
    story: {
      fr: "La céramique Hagi naît de la terre blanche et rosée de la région de Yamaguchi. Ses irrégularités voulues — traces de doigts, légères craquelures de l'émail — sont autant de signes de vie. En France, on dirait que la pièce a une « gueule ». Au Japon, on parle de wabi : la beauté de l'imparfait.",
      ja: '萩焼の白土と赤土が生み出す、ゆらぎのある釉薬。フランスの食卓に並べると、テーブルクロスの白さが引き立て、ひとつの対話が生まれます。',
    },
    images: [
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
      'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80',
    ],
    tags: ['céramique', 'artisanat', 'thé'],
  },
  {
    id: 'c2',
    slug: 'plateau-urushi',
    name: { fr: 'Plateau en laque urushi', ja: '輪島塗 盆' },
    category: 'craft',
    price: 420,
    shortDescription: {
      fr: 'Laque de Wajima, appliquée en 80 couches successives sur du bois de hinoki.',
      ja: '檜の木地に漆を80回重ねた、輪島塗の丸盆。時間と職人技の結晶。',
    },
    story: {
      fr: "La laque urushi de Wajima est une lenteur qui se voit. Quatre-vingts couches, quatre-vingts jours — chaque passage révèle une profondeur nouvelle. Posée sur une table en chêne parisien, la surface noire reflète la lumière avec l'élégance d'un miroir ancien.",
      ja: '輪島の職人が積み上げる漆の層は、フランスの黒い石畳を想わせます。使うほどに艶が増す素材は、時間を味方にします。',
    },
    images: [
      'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    ],
    tags: ['laque', 'artisanat', 'bois'],
  },
  {
    id: 'c3',
    slug: 'papier-washi',
    name: { fr: 'Papier washi Echizen', ja: '越前和紙 一帖' },
    category: 'craft',
    price: 65,
    shortDescription: {
      fr: "Feuilles de papier washi d'Echizen, issues d'une tradition millénaire.",
      ja: '千年の歴史を誇る越前和紙。楮（こうぞ）を手漉きした一帖。',
    },
    story: {
      fr: "Le washi d'Echizen est classé au patrimoine immatériel de l'UNESCO. Chaque feuille — translucide, légèrement fibrée — raconte le geste patient du maître-papetier. En France, les relieurs et calligraphes en font un trésor.",
      ja: 'ユネスコ無形文化遺産の越前和紙は、フランスの製本家や書家たちが「光を通す紙」と称えます。日仏の手技が共鳴する素材です。',
    },
    images: [
      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80',
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80',
    ],
    tags: ['papier', 'artisanat', 'écriture'],
  },
  // --- FASHION ---
  {
    id: 'f1',
    slug: 'chemise-boro',
    name: { fr: 'Chemise en tissu boro', ja: 'boro ロングシャツ' },
    category: 'fashion',
    price: 320,
    shortDescription: {
      fr: "Interprétation contemporaine du boro — patchwork de coton indigo réparé à l'aiguille.",
      ja: '藍染のコットンを手縫いで継いだ、boro tekkuを現代的に解釈したロングシャツ。',
    },
    story: {
      fr: "Le boro est le mending japonais : des vêtements raccommodés génération après génération, jusqu'à devenir une œuvre. Cette chemise rend hommage à cette philosophie du soin — proche du concept français de « durabilité esthétique » défendu par les maisons de couture.",
      ja: '繕い続けることで美しくなるboro。フランスのマルジェラが「解体と再縫製」を美学とするように、boro は時間をデザインに変えます。',
    },
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4b4dd6?w=800&q=80',
    ],
    tags: ['indigo', 'coton', 'upcycling'],
  },
  {
    id: 'f2',
    slug: 'foulard-katazome',
    name: { fr: 'Foulard katazome', ja: '型染め スカーフ' },
    category: 'fashion',
    price: 155,
    shortDescription: {
      fr: 'Foulard en soie imprimée à la résistance de riz — technique katazome de Kyoto.',
      ja: '京都・型染め職人による米糊置き染めのシルクスカーフ。',
    },
    story: {
      fr: "La technique katazome ressemble à la sérigraphie : une résistance (ici, une pâte de riz) protège certaines zones du tissu avant la teinture. Le résultat — géométrie nette, couleur profonde — plaît aux Parisiens qui y voient un eco-print avant l'heure.",
      ja: '型染めのシャープな幾何学模様は、フランス人の「整然とした美」への感覚に響きます。',
    },
    images: [
      'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80',
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
    ],
    tags: ['soie', 'teinture', 'Kyoto'],
  },
  {
    id: 'f3',
    slug: 'tabi-coton',
    name: { fr: 'Tabi en coton naturel', ja: '足袋 コットン' },
    category: 'fashion',
    price: 48,
    shortDescription: {
      fr: 'Chaussettes tabi bifurquées en coton non blanchi, cousues à la main à Nara.',
      ja: '奈良の職人が手縫いする、生成りコットンの足袋。',
    },
    story: {
      fr: "La tabi sépare le gros orteil — forme héritée du kimono et du sandal. Portée avec des sneakers ou des mules, elle est devenue l'accessoire des connaisseurs parisiens depuis que Margiela l'a transposée en botte. Celle-ci revient à la source.",
      ja: 'マルジェラが世界に広めた足袋ブーツの原点。奈良の職人が今も変わらず縫い続ける白足袋は、フランスで「知る人ぞ知る日本」として愛されます。',
    },
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80',
    ],
    tags: ['coton', 'chaussettes', 'Nara'],
  },
  // --- FOOD ---
  {
    id: 'fo1',
    slug: 'gyokuro-uji',
    name: { fr: "Gyokuro d'Uji", ja: '宇治 玉露' },
    category: 'food',
    price: 88,
    shortDescription: {
      fr: "Thé vert d'exception cultivé à l'ombre pendant trois semaines, région d'Uji.",
      ja: '三週間遮光栽培した宇治の玉露。日本茶の最高峰。',
    },
    story: {
      fr: "Le gyokuro est traité à l'ombre pendant 20 jours avant la récolte — l'obscurité force la production de L-théanine, à l'origine de sa douceur umami unique. Sa préparation demande 50°C d'eau et une patience digne d'un service de thé zen. Les Français qui le découvrent y trouvent un pendant végétal au grand cru.",
      ja: '遮光によって増す旨味成分テアニン。低温で淹れるこの茶は、フランスのワインに通じる「テロワール」の哲学を持ちます。',
    },
    images: [
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
      'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80',
    ],
    tags: ['thé', 'Uji', 'umami'],
  },
  {
    id: 'fo2',
    slug: 'sake-junmai-daiginjo',
    name: { fr: 'Saké Junmai Daiginjo', ja: '純米大吟醸 720ml' },
    category: 'food',
    price: 72,
    shortDescription: {
      fr: "Saké premium sans alcool ajouté, poli à 50% — arômes floraux et texture soyeuse.",
      ja: '精米歩合50%以下の純米大吟醸。華やかな吟醸香と絹のような口当たり。',
    },
    story: {
      fr: "Le junmai daiginjo est au saké ce que le grand cru classé est au bordeaux : un produit de terroir, de savoir-faire et de patience. Polir le riz à 50% laisse le meilleur de la graine — sucre, amidon pur — qui fermente en arômes de poire blanche et de fleur de prunier.",
      ja: '西洋のワインに「テロワール」があるように、日本の酒米・水・杜氏の技術が生む純米大吟醸。フランスのソムリエたちが近年注目する日本酒です。',
    },
    images: [
      'https://images.unsplash.com/photo-1545438102-799c3991ffb2?w=800&q=80',
      'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&q=80',
    ],
    tags: ['saké', 'riz', 'premium'],
  },
  {
    id: 'fo3',
    slug: 'miso-hatcho',
    name: { fr: 'Miso Hatcho vieilli 3 ans', ja: '八丁味噌 3年熟成' },
    category: 'food',
    price: 34,
    shortDescription: {
      fr: 'Miso de soja pur vieilli 3 ans sous presses de pierre — Okazaki, Aichi.',
      ja: '岡崎・石積み圧搾で3年熟成させた八丁味噌。深みと複雑さが際立つ。',
    },
    story: {
      fr: "La fermentation de 36 mois sous 3 tonnes de pierres crée un umami d'une profondeur que les chefs français comparent au miso comme on compare le parmesan 36 mois au fromage frais. Mauro Colagreco en a fait un élément central de sa cuisine.",
      ja: '石の重さで3年間熟成させる八丁味噌は、パルメザンチーズやコンテに通じる「熟成の美学」をフランス料理界が発見しつつあります。',
    },
    images: [
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    ],
    tags: ['miso', 'fermenté', 'umami'],
  },
  // --- HOME ---
  {
    id: 'h1',
    slug: 'encens-koh-do',
    name: { fr: 'Encens Koh-dō, cèdre & hinoki', ja: '香道 白檀・檜 線香 30本' },
    category: 'home',
    price: 42,
    shortDescription: {
      fr: "Bâtonnets d'encens koh-dō — mélange de cèdre blanc et d'hinoki. 30 pièces.",
      ja: '白檀と檜をブレンドした香道用線香。30本入り。',
    },
    story: {
      fr: "Le koh-dō — « chemin du parfum » — est l'art japonais de l'encens : une discipline comparable à la cérémonie du thé, où l'on apprend à écouter la fumée. Ces bâtonnets sont composés selon des recettes du XVIe siècle et brûlent une heure en silence.",
      ja: '香道の線香は「聞く」ものです。フランスの調香師が「嗅ぐ」から「聴く」へと感覚を転換するとき、日仏の香りの対話が始まります。',
    },
    images: [
      'https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=800&q=80',
      'https://images.unsplash.com/photo-1563904092230-7ec217b65fe2?w=800&q=80',
    ],
    tags: ['encens', 'zen', 'hinoki'],
  },
  {
    id: 'h2',
    slug: 'vase-bizen',
    name: { fr: 'Vase Bizen-yaki', ja: '備前焼 花器' },
    category: 'home',
    price: 260,
    shortDescription: {
      fr: 'Vase en grès de Bizen, sans vernis ni glaçure — cuit en anagama 2 semaines.',
      ja: '無釉・穴窯2週間焼成の備前焼花器。炎の痕跡が模様となる。',
    },
    story: {
      fr: "La céramique Bizen n'utilise ni glaçure ni pigment. La couleur — rouge profond, cendres dorées — naît uniquement du feu de bois. Deux semaines dans le four anagama, la pièce enregistre chaque variation de flamme. À Paris, les fleuristes qui l'utilisent disent qu'il « sait » quelles fleurs lui conviennent.",
      ja: '火の偶然性を設計する備前焼。パリのフラワーアーティストたちは「花が器を選ぶ」と言います。',
    },
    images: [
      'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&q=80',
      'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&q=80',
    ],
    tags: ['céramique', 'Bizen', 'vase'],
  },
  {
    id: 'h3',
    slug: 'tenugui-shibori',
    name: { fr: 'Tenugui tie-dye shibori', ja: '絞り染め 手拭い' },
    category: 'home',
    price: 38,
    shortDescription: {
      fr: 'Tenugui en coton fin teint en shibori — technique de pliage et nouage avant teinture.',
      ja: '絞り染めの技法で染めた薄手コットンの手拭い。',
    },
    story: {
      fr: "Le shibori précède le tie-dye occidental de plusieurs siècles. Plié, noué, pressé avant d'être plongé dans l'indigo, le tissu révèle à la teinture des motifs impossibles à reproduire deux fois. À Paris, le tenugui sert aussi bien de serviette que d'œuvre murale.",
      ja: '西洋のタイダイに数百年先んじた絞り染め。フランス人は手拭いを壁に飾り、「染色のグラフィックアート」として鑑賞します。',
    },
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
      'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=800&q=80',
    ],
    tags: ['coton', 'shibori', 'indigo'],
  },
]

export const categoryLabels: Record<string, { fr: string; ja: string }> = {
  all:     { fr: 'Tout', ja: 'すべて' },
  craft:   { fr: 'Artisanat', ja: '工芸' },
  fashion: { fr: 'Mode', ja: 'ファッション' },
  food:    { fr: 'Épicerie', ja: '食・茶・酒' },
  home:    { fr: 'Maison', ja: 'ホーム' },
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getProductsByCategory(category: string): Product[] {
  if (category === 'all') return products
  return products.filter((p) => p.category === category)
}
