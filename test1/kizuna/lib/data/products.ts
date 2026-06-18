import { Product } from '@/types'

export const products: Product[] = [
  // cr01 Yuki Tanaka — Terre de Silence
  {
    id: 'p01a', slug: 'bol-raku-fume', creatorId: 'cr01', category: 'craft',
    name: { fr: "Bol Raku Fumé", ja: "焦がし楽碗" },
    price: 185,
    shortDescription: { fr: "Bol de thé façonné à la main, cuit Raku, émaillage fumé noir.", ja: "手びねり、楽焼、燻し黒釉。" },
    story: { fr: "Façonné sur le tour pendant vingt minutes, ce bol est ensuite enfumé dans un seau métallique — technique primitive qui donne la surface noire brillante. Chaque bol est unique.", ja: "轆轤で二十分、その後金属バケツで燻す——原始的な技法が黒光りの表面を生む。" },
    images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80'],
    tags: ['céramique', 'raku', 'thé', 'artisanat'],
  },
  {
    id: 'p01b', slug: 'vase-shizenyu', creatorId: 'cr01', category: 'craft',
    name: { fr: "Vase Glaçure Naturelle", ja: "自然釉壺" },
    price: 260,
    shortDescription: { fr: "Vase en grès cuit au bois, glaçure naturelle de cendres de pin.", ja: "薪窯焼き、松灰の自然釉。" },
    story: { fr: "La glaçure naît des cendres de pin qui fondent sur l'argile à 1280°C pendant soixante-douze heures. Aucune couleur n'est ajoutée — tout vient du feu.", ja: "1280℃で七十二時間、松灰が熔ける。色は加えない——すべて炎が決める。" },
    images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'],
    tags: ['céramique', 'vase', 'bois', 'naturel'],
  },

  // cr02 Haruto Nakamura — Laque Profonde
  {
    id: 'p02a', slug: 'plateau-urushi-noir', creatorId: 'cr02', category: 'craft',
    name: { fr: "Plateau Urushi Noir", ja: "黒漆盆" },
    price: 480,
    shortDescription: { fr: "Plateau Wajima — soixante-dix couches de laque noire, fond de riz.", ja: "輪島塗盆——七十層の黒漆、米糊地。" },
    story: { fr: "Soixante-dix couches, soixante-dix jours minimum. Ce plateau exige un an de travail complet. La surface est polie à la pierre à eau après chaque couche pour une profondeur absolue.", ja: "七十層、最低七十日。このお盆は一年の作業を要する。各層の後、水砥石で磨く。" },
    images: ['https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&q=80', 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80'],
    tags: ['laque', 'wajima', 'plateau', 'urushi'],
  },
  {
    id: 'p02b', slug: 'baguettes-urushi-rouge', creatorId: 'cr02', category: 'craft',
    name: { fr: "Baguettes Laquées Rouge", ja: "朱塗箸" },
    price: 145,
    shortDescription: { fr: "Paire de baguettes Wajima laquées rouge — trente couches, indestructibles.", ja: "輪島塗朱色箸一膳——三十層、傷まない。" },
    story: { fr: "Ces baguettes reçoivent trente couches de laque urushi rouge sur un cœur de hinoki. La laque durcit avec le temps — ces baguettes vieillissent mieux que l'argenterie.", ja: "檜の芯に朱色の漆を三十層。漆は時とともに硬化する——この箸は銀器より長持ちする。" },
    images: ['https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80', 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&q=80'],
    tags: ['laque', 'baguettes', 'wajima', 'cuisine'],
  },

  // cr03 Mei Yoshida — Bleu Awa
  {
    id: 'p03a', slug: 'echarpe-awa-indigo', creatorId: 'cr03', category: 'craft',
    name: { fr: "Écharpe Awa Indigo", ja: "阿波藍スカーフ" },
    price: 320,
    shortDescription: { fr: "Écharpe en coton teinte à l'indigo naturel d'Awa, dégradé unique.", ja: "阿波天然藍染コットンスカーフ、唯一の濃淡。" },
    story: { fr: "Chaque écharpe passe dix bains d'indigo successifs, en alternant immersion et oxydation. Le bleu se forge dans l'air — pas dans la cuve.", ja: "スカーフは藍液に十度漬け込み、都度酸化させる。青は空気の中に生まれる——甕の中ではない。" },
    images: ['https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    tags: ['indigo', 'teinture', 'écharpe', 'coton'],
  },
  {
    id: 'p03b', slug: 'tablier-awa-sombre', creatorId: 'cr03', category: 'craft',
    name: { fr: "Tablier Awa Profond", ja: "阿波藍前掛け" },
    price: 195,
    shortDescription: { fr: "Tablier de cuisine en coton indigo sombre, résistant, intemporel.", ja: "深い藍染木綿の調理用前掛け、丈夫で時代を選ばない。" },
    story: { fr: "Inspiré des tabliers des fermiers japonais, ce tablier en coton indigo profond résiste à vingt ans d'usage. L'indigo est naturellement antibactérien — un détail de bon sens.", ja: "日本の農夫の前掛けから着想。深い藍染コットンは二十年の使用に耐える。藍は天然で抗菌性がある。" },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80'],
    tags: ['indigo', 'tablier', 'cuisine', 'coton'],
  },

  // cr04 Kenji Sato — Bois Sacré
  {
    id: 'p04a', slug: 'boite-hinoki-kumiko', creatorId: 'cr04', category: 'craft',
    name: { fr: "Boîte Hinoki Kumiko", ja: "檜組子箱" },
    price: 395,
    shortDescription: { fr: "Boîte en hinoki à panneau kumiko — géométrie sans colle ni clou.", ja: "組子細工の檜箱——接着剤も釘も使わない幾何学。" },
    story: { fr: "Le panneau kumiko est assemblé de plus de deux cents petites pièces de hinoki par pression seule. Le motif traditionnel « asanoha » (feuille de chanvre) est symbole de croissance.", ja: "二百以上の檜の小片を圧力だけで組み上げる。伝統的な「麻の葉」模様は成長の象徴。" },
    images: ['https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80'],
    tags: ['bois', 'kumiko', 'hinoki', 'boîte'],
  },
  {
    id: 'p04b', slug: 'plateau-kiri-naturel', creatorId: 'cr04', category: 'craft',
    name: { fr: "Plateau Kiri Naturel", ja: "桐の盆" },
    price: 220,
    shortDescription: { fr: "Plateau en bois paulownia (kiri) — léger comme une plume, très résistant.", ja: "桐の盆——羽のように軽く、とても丈夫。" },
    story: { fr: "Le paulownia est le bois le plus léger du Japon — cinq fois plus léger que le chêne pour la même solidité. Kenji l'huile à la cire d'abeille japonaise.", ja: "桐は日本で最も軽い木——同じ強度でオークより五倍軽い。ケンジは国産蜜蝋で仕上げる。" },
    images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80', 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80'],
    tags: ['bois', 'paulownia', 'plateau', 'léger'],
  },

  // cr05 Ayumi Watanabe — Métal Brut
  {
    id: 'p05a', slug: 'bague-argent-oxide', creatorId: 'cr05', category: 'craft',
    name: { fr: "Bague Argent Oxydé", ja: "酸化銀指輪" },
    price: 280,
    shortDescription: { fr: "Bague en argent martelé et oxydé — texture de pierre volcanique.", ja: "打ち出し酸化銀の指輪——火山岩のような肌触り。" },
    story: { fr: "Forgée au marteau sur acier, cette bague est oxydée au sulfure de potassium pour obtenir une surface sombre et mate qui capture la lumière différemment selon l'angle.", ja: "鉄の上でハンマー鍛造し、硫化カリウムで酸化させ、角度によって光を異なる方向に捉える暗い消艶面を得る。" },
    images: ['https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=800&q=80', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'],
    tags: ['argent', 'bague', 'bijoux', 'oxydé'],
  },
  {
    id: 'p05b', slug: 'collier-pierres-brutes', creatorId: 'cr05', category: 'craft',
    name: { fr: "Collier Grains de Pierre", ja: "石粒ネックレス" },
    price: 340,
    shortDescription: { fr: "Collier en argent et quartz japonais brut — minimalisme minéral.", ja: "銀と粗い国産水晶のネックレス——鉱物的なミニマリズム。" },
    story: { fr: "Ayumi sertit des fragments de quartz brut de la préfecture de Yamanashi dans des bails en argent forgé. Le quartz n'est pas poli — sa forme naturelle est sa beauté.", ja: "山梨産の粗い水晶の欠片を鍛造銀のベールにセット。水晶は磨かない——自然の形がその美だ。" },
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80', 'https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=800&q=80'],
    tags: ['argent', 'collier', 'quartz', 'bijoux'],
  },

  // cr06 Ren Kobayashi — Éclat de Verre
  {
    id: 'p06a', slug: 'verre-kiriko-bleu', creatorId: 'cr06', category: 'craft',
    name: { fr: "Verre Kiriko Bleu Nuit", ja: "夜藍切子グラス" },
    price: 420,
    shortDescription: { fr: "Verre à saké en cristal kiriko bleu — motif « kikutsunagi » (chrysanthèmes liés).", ja: "菊繋ぎ模様の夜藍切子酒杯——酒のための器。" },
    story: { fr: "Deux cent quarante facettes taillées à la meule à main sur du cristal bleu de cobalt soufflé. Le motif kikutsunagi est traditionnel de l'époque Edo et symbolise l'éternité.", ja: "コバルト青吹きガラスに手砥石で二百四十の面取り。菊繋ぎは江戸時代の伝統文様で永遠を象徴する。" },
    images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80', 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80'],
    tags: ['verre', 'kiriko', 'edo', 'cristal'],
  },
  {
    id: 'p06b', slug: 'carafe-kiriko-clair', creatorId: 'cr06', category: 'craft',
    name: { fr: "Carafe Kiriko Transparente", ja: "透明切子カラフェ" },
    price: 580,
    shortDescription: { fr: "Carafe en cristal kiriko transparent — pour le saké, le vin blanc, l'eau.", ja: "透明切子クリスタルカラフェ——日本酒、白ワイン、水のために。" },
    story: { fr: "Taillée en motif « yarai » (bambou croisé), cette carafe diffracte la lumière en étoile autour d'elle. La transparence révèle la couleur de ce qu'on y verse.", ja: "矢来模様（交差した竹）に彫られ、光を周囲に放射状に拡散する。透明さが注ぐものの色を際立てる。" },
    images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80'],
    tags: ['verre', 'kiriko', 'carafe', 'cristal'],
  },

  // cr07 Sora Ito — Papier Vivant
  {
    id: 'p07a', slug: 'papier-washi-kozo', creatorId: 'cr07', category: 'craft',
    name: { fr: "Washi Kōzo Brut", ja: "楮和紙" },
    price: 85,
    shortDescription: { fr: "Feuilles de washi kōzo — fibres de mûrier sauvage, translucides, robustes.", ja: "楮和紙——野生の桑の繊維、半透明で丈夫。" },
    story: { fr: "Chaque feuille est coulée à la main dans un tamis de bambou dans l'eau de source de Fukui. Le séchage naturel dure une journée complète. Ces feuilles sont utilisées par des restaurateurs d'œuvres d'art.", ja: "福井の湧き水で竹のすのこに一枚一枚手漉きする。自然乾燥に丸一日かかる。美術品修復師が使う。" },
    images: ['https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80', 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80'],
    tags: ['washi', 'papier', 'artisanat', 'echizen'],
  },
  {
    id: 'p07b', slug: 'carnet-washi-persimmon', creatorId: 'cr07', category: 'craft',
    name: { fr: "Carnet Washi Kakishibu", ja: "柿渋和紙ノート" },
    price: 120,
    shortDescription: { fr: "Carnet artisanal en washi teinté à la tannin de kaki — teinte ambre naturelle.", ja: "柿渋で染めた和紙ノート——自然な琥珀色。" },
    story: { fr: "Le kakishibu (tannin de kaki fermenté) est utilisé depuis mille ans pour teindre et imperméabiliser le papier japonais. Cette teinture donne une teinte ambre unique qui s'approfondit avec l'âge.", ja: "柿渋（発酵した柿のタンニン）は千年間、和紙の染色と防水に使われてきた。その染めは独特の琥珀色を与え、年月とともに深まる。" },
    images: ['https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80'],
    tags: ['washi', 'carnet', 'kakishibu', 'papier'],
  },

  // cr08 Taro Shimizu — Bambou d'Or
  {
    id: 'p08a', slug: 'panier-madake-classique', creatorId: 'cr08', category: 'craft',
    name: { fr: "Panier Madake Classique", ja: "真竹籠" },
    price: 235,
    shortDescription: { fr: "Panier tressé en bambou madake de Beppu — formes courbes, légèreté absolue.", ja: "別府真竹編み籠——曲線美、絶対的な軽さ。" },
    story: { fr: "Le bambou madake de Beppu est fendu en lattes d'un millimètre d'épaisseur avant d'être tressé. Dix heures de travail pour deux cents grammes de panier.", ja: "別府の真竹を一ミリの薄板に割いてから編む。二百グラムの籠に十時間の作業。" },
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80', 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80'],
    tags: ['bambou', 'panier', 'beppu', 'artisanat'],
  },
  {
    id: 'p08b', slug: 'dessous-plat-bambou', creatorId: 'cr08', category: 'craft',
    name: { fr: "Dessous-de-Plat Hexagonal", ja: "六角鍋敷き" },
    price: 95,
    shortDescription: { fr: "Dessous-de-plat en bambou tressé, motif hexagonal — résistant à 300°C.", ja: "六角模様の竹編み鍋敷き——300℃に耐える。" },
    story: { fr: "Le motif hexagonal « kikko » (carapace de tortue) est l'un des motifs de vannerie les plus anciens du Japon, symbole de longévité. Ces dessous-de-plat résistent à la chaleur directe.", ja: "「亀甲」六角模様は日本最古の籠目の一つで、長寿の象徴。このお鍋敷きは直火にも耐える。" },
    images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'],
    tags: ['bambou', 'cuisine', 'hexagone', 'artisanat'],
  },

  // cr09 Nana Fujiwara — Jardin Peint
  {
    id: 'p09a', slug: 'furoshiki-yuzen-pivoine', creatorId: 'cr09', category: 'craft',
    name: { fr: "Furoshiki Pivoine Peinte", ja: "牡丹描き風呂敷" },
    price: 350,
    shortDescription: { fr: "Furoshiki en soie kyo-yuzen — pivoine peinte à la main, coloris rose et vert.", ja: "手描き京友禅の風呂敷絹——ピンクと緑の牡丹。" },
    story: { fr: "Nana peint ses pivoines à la main avec des contours tracés à la pâte de riz pour éviter les bavures. La teinte finale après rinçage révèle la profondeur des couleurs.", ja: "米糊で輪郭を引き、はみ出しを防ぎながら手で牡丹を描く。すすぎ後に色の深みが現れる。" },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80'],
    tags: ['soie', 'yuzen', 'furoshiki', 'pivoine'],
  },
  {
    id: 'p09b', slug: 'obi-yuzen-erable', creatorId: 'cr09', category: 'craft',
    name: { fr: "Carré Soie Érable d'Automne", ja: "秋楓絹四角" },
    price: 285,
    shortDescription: { fr: "Carré de soie yuzen — érable momiji d'automne, teintes orangées et dorées.", ja: "秋の紅葉友禅絹四角——オレンジと金の色合い。" },
    story: { fr: "L'automne est la saison reine du yuzen de Kyoto. Nana capture les momiji des jardins de Nanzenji dans cette écharpe — chaque feuille est tracée individuellement.", ja: "秋は京都友禅の季節。南禅寺の庭の紅葉をこのスカーフに閉じ込める——一枚一枚が個別に描かれる。" },
    images: ['https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    tags: ['soie', 'yuzen', 'automne', 'érable'],
  },

  // cr10 Hana Kimura — Lin de Kyoto
  {
    id: 'p10a', slug: 'chemise-lin-naturel', creatorId: 'cr10', category: 'fashion',
    name: { fr: "Chemise Lin Non Blanchi", ja: "無漂白麻シャツ" },
    price: 290,
    shortDescription: { fr: "Chemise en lin japonais non blanchi — coupe droite, col mao, boutons en coco.", ja: "無漂白国産麻のシャツ——直線的なカット、マオカラー、ヤシのボタン。" },
    story: { fr: "Ce lin vient de Shimane — cultivé sans pesticide, récolté à la main. La couleur beige naturelle s'éclaircit légèrement au lavage et vieillit magnifiquement au soleil.", ja: "農薬なし、手刈りの島根産麻。自然なベージュ色は洗うと少し明るくなり、日光で美しく年を重ねる。" },
    images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    tags: ['lin', 'chemise', 'slow-fashion', 'naturel'],
  },
  {
    id: 'p10b', slug: 'pantalon-lin-large', creatorId: 'cr10', category: 'fashion',
    name: { fr: "Pantalon Lin Ample", ja: "麻のゆったりパンツ" },
    price: 265,
    shortDescription: { fr: "Pantalon ample en lin naturel — taille élastique, coupe palazzo légère.", ja: "天然麻のゆったりパンツ——ゴムウエスト、軽いパラッツォカット。" },
    story: { fr: "La coupe palazzo est issue des hakama japonais traditionnels — ample mais structurée, agile mais digne. Hana conserve cette sagesse de forme dans un lin moderne.", ja: "パラッツォカットは伝統的な袴から——広いが構造的、機敏だが品がある。現代の麻でその形の知恵を守る。" },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'],
    tags: ['lin', 'pantalon', 'palazzo', 'naturel'],
  },

  // cr11 Sota Hayashi — Boro Moderne
  {
    id: 'p11a', slug: 'veste-boro-denim', creatorId: 'cr11', category: 'fashion',
    name: { fr: "Veste Boro Denim", ja: "ボロデニムジャケット" },
    price: 520,
    shortDescription: { fr: "Veste en denim boro — patchwork de salvage, coutures sashiko visibles.", ja: "ボロデニムジャケット——サルベージのパッチワーク、見せる刺し子縫い目。" },
    story: { fr: "Chaque veste est unique — assemblage de denim récupéré de différents ateliers de Kojima. Le sashiko visible renforce les jointures et constitue un motif en lui-même.", ja: "各ジャケットは唯一無二——児島の複数の工場から回収したデニムの組み合わせ。見える刺し子が継ぎ目を補強し、それ自体が模様になる。" },
    images: ['https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'],
    tags: ['denim', 'boro', 'sashiko', 'upcycling'],
  },
  {
    id: 'p11b', slug: 'sac-boro-tote', creatorId: 'cr11', category: 'fashion',
    name: { fr: "Tote Bag Boro", ja: "ボロトートバッグ" },
    price: 185,
    shortDescription: { fr: "Tote en denim boro — épais, renforcé, conçu pour durer trente ans.", ja: "ボロデニムトート——厚く、補強済み、三十年のために設計。" },
    story: { fr: "Les anses sont doublées et cousues au sashiko — elles ne lâcheront jamais. Le corps du sac combine trois types de denim récupéré pour une épaisseur et une texture uniques.", ja: "持ち手は二重縫いで刺し子補強——絶対に外れない。バッグの本体は三種類の回収デニムを合わせ、独特の厚みと質感を生む。" },
    images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80'],
    tags: ['denim', 'boro', 'tote', 'sac'],
  },

  // cr12 Yuna Aoki — Soie et Indigo
  {
    id: 'p12a', slug: 'echarpe-soie-sauvage-indigo', creatorId: 'cr12', category: 'fashion',
    name: { fr: "Écharpe Soie Sauvage Indigo", ja: "野蚕絹藍染スカーフ" },
    price: 445,
    shortDescription: { fr: "Écharpe en soie sauvage teinte à l'indigo naturel — dégradé vivant unique.", ja: "天然藍染野蚕絹スカーフ——生きた独自のグラデーション。" },
    story: { fr: "La soie sauvage est tissée irrégulièrement — sa texture naturelle crée un relief subtil que l'indigo souligne différemment selon la lumière. Aucune écharpe n'est identique.", ja: "野蚕の絹は不規則に織られ——自然な質感が微妙な凹凸を作り、藍が光によって異なる方法でそれを際立てる。同じスカーフは一枚もない。" },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'],
    tags: ['soie', 'indigo', 'écharpe', 'unique'],
  },
  {
    id: 'p12b', slug: 'kimono-soie-indigo-contemporain', creatorId: 'cr12', category: 'fashion',
    name: { fr: "Manteau Kimono Contemporain", ja: "現代着物コート" },
    price: 890,
    shortDescription: { fr: "Manteau en soie et coton inspiré du kimono — col croisé, teinte indigo profond.", ja: "着物からインスピレーションを得た絹綿コート——打ち合わせ衿、深い藍色。" },
    story: { fr: "Ce manteau adopte la structure croisée du kimono tout en intégrant des poches et une ceinture moderne. Il se porte aussi bien sur un jean que sur une tenue habillée.", ja: "着物の打ち合わせ構造を採用しながら、ポケットと現代的なベルトを組み込む。ジーンズにも正装にも合う。" },
    images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    tags: ['kimono', 'soie', 'manteau', 'contemporain'],
  },

  // cr13 Riku Suzuki — Point Sashiko
  {
    id: 'p13a', slug: 'veste-sashiko-naturel', creatorId: 'cr13', category: 'fashion',
    name: { fr: "Veste Sashiko Naturel", ja: "刺し子ジャケット" },
    price: 480,
    shortDescription: { fr: "Veste en coton naturel brodée sashiko — motif asanoha, points blanc sur blanc.", ja: "麻の葉模様の天然コットン刺し子ジャケット——白地に白糸。" },
    story: { fr: "Riku brode chaque veste en points sashiko à la main — deux mille points par veste. Le motif asanoha (feuille de chanvre) est utilisé depuis l'ère Heian, symbole de croissance.", ja: "一着一着、手で刺し子を刺す——一着二千針。麻の葉模様は平安時代から成長の象徴として使われてきた。" },
    images: ['https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'],
    tags: ['sashiko', 'coton', 'broderie', 'veste'],
  },
  {
    id: 'p13b', slug: 'pochette-sashiko-kogin', creatorId: 'cr13', category: 'fashion',
    name: { fr: "Pochette Kogin-zashi", ja: "こぎん刺しポーチ" },
    price: 145,
    shortDescription: { fr: "Pochette en lin brodée kogin-zashi — motif géométrique traditionnel du Tohoku.", ja: "東北の伝統的な幾何学模様のこぎん刺し麻ポーチ。" },
    story: { fr: "Le kogin-zashi est une broderie de géométries complexes née dans les froids de l'Aomori au XVIIIe siècle. Les motifs compta les surfaces impaires pour créer des illusions optiques.", ja: "こぎん刺しは十八世紀の青森の寒さから生まれた複雑な幾何学刺繍。奇数の面を数えて錯視を生む。" },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80'],
    tags: ['sashiko', 'kogin', 'pochette', 'broderie'],
  },

  // cr14 Miku Tanaka — Fil d'Or
  {
    id: 'p14a', slug: 'obi-nishijin-moderne', creatorId: 'cr14', category: 'fashion',
    name: { fr: "Ceinture Nishijin Contemporaine", ja: "現代西陣帯" },
    price: 750,
    shortDescription: { fr: "Ceinture en soie Nishijin tissée avec fils d'or — pour kimono et tenue moderne.", ja: "金糸入り西陣絹の帯——着物にも現代の服にも。" },
    story: { fr: "Cette ceinture combine les fils d'or du Nishijin avec une toile de soie naturelle. Elle peut s'utiliser comme ceinture large sur un manteau ou une robe — hors du kimono.", ja: "西陣の金糸と自然絹の地を合わせた帯。コートやワンピースに幅広のベルトとして使える——着物の外でも。" },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'],
    tags: ['nishijin', 'or', 'soie', 'ceinture'],
  },
  {
    id: 'p14b', slug: 'pochette-nishijin-hanami', creatorId: 'cr14', category: 'fashion',
    name: { fr: "Pochette Hanami Nishijin", ja: "花見西陣袋" },
    price: 320,
    shortDescription: { fr: "Pochette en soie Nishijin — motif cerisiers en fleurs, fermoir laiton.", ja: "西陣絹の小物入れ——桜模様、真鍮留め。" },
    story: { fr: "Le motif hanami (contemplation des cerisiers) est tissé en fil d'or et de soie rose sur fond noir. Un fermoir en laiton forgé à la main complète la pièce.", ja: "花見の模様は黒地に金糸とピンク絹で織る。手鍛造の真鍮留めが作品を完成させる。" },
    images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    tags: ['nishijin', 'sakura', 'pochette', 'or'],
  },

  // cr15 Kaito Yamamoto — Masque Sacré
  {
    id: 'p15a', slug: 'broche-masque-no', creatorId: 'cr15', category: 'fashion',
    name: { fr: "Broche Masque Nō", ja: "能面ブローチ" },
    price: 380,
    shortDescription: { fr: "Broche sculptée en bois de hinoki — visage inspiré du masque « Ko-Omote » du nō.", ja: "檜の彫刻ブローチ——能の「小面」から着想した顔。" },
    story: { fr: "Kaito sculpte chaque broche en hinoki blanc avec des outils de sculpteur traditionnels. Le visage Ko-Omote (jeune femme du nō) est peint à la gofun (pâte de coquilles d'huîtres).", ja: "伝統的な彫刻刀で白檜を彫る。能の「小面」（若い女性）の顔は胡粉（牡蠣殻の粉）で描く。" },
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    tags: ['masque', 'nō', 'broche', 'bois'],
  },
  {
    id: 'p15b', slug: 'collier-lacque-masque', creatorId: 'cr15', category: 'fashion',
    name: { fr: "Collier Laque Nō Miniature", ja: "能面ミニチュア漆ネックレス" },
    price: 265,
    shortDescription: { fr: "Pendentif en bois laqué — miniature du masque Okina (vieil homme sage).", ja: "漆塗り木のペンダント——翁面（賢い老人）のミニチュア。" },
    story: { fr: "L'Okina est le masque de nō le plus ancien et le plus sacré — symbole de sagesse et de paix. Kaito le reproduit en miniature en bois hida-shunkei laqué naturel.", ja: "翁は最古で最も神聖な能面——知恵と平和の象徴。飛騨春慶塗りでミニチュアを作る。" },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'],
    tags: ['nō', 'laque', 'collier', 'masque'],
  },

  // cr16 Emi Nakagawa — Tissu Précieux
  {
    id: 'p16a', slug: 'broche-tissu-boro', creatorId: 'cr16', category: 'fashion',
    name: { fr: "Broche Tissu Boro Encadré", ja: "ボロ布ブローチ" },
    price: 195,
    shortDescription: { fr: "Broche avec fragment de tissu boro Meiji serti dans un cadre en laiton argenté.", ja: "銀メッキ真鍮フレームに収めた明治時代のボロ布断片のブローチ。" },
    story: { fr: "Emi encadre de petits fragments de textiles boro du XIXe siècle dans des sertissures en laiton forgé. Chaque pièce est datée et accompagnée d'une carte d'authenticité.", ja: "十九世紀のボロ布の小片を鍛造真鍮のフレームに収める。各作品は日付入りで真正証明書を添える。" },
    images: ['https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    tags: ['boro', 'tissu', 'broche', 'histoire'],
  },
  {
    id: 'p16b', slug: 'collier-tissu-ancien', creatorId: 'cr16', category: 'fashion',
    name: { fr: "Collier Fragments Textiles", ja: "古布断片ネックレス" },
    price: 245,
    shortDescription: { fr: "Collier avec cinq fragments textiles anciens encadrés en argent — chaque fragment différent.", ja: "五つの古布断片を銀枠に収めたネックレス——各断片は異なる。" },
    story: { fr: "Emi assemble des fragments de cinq textiles différents (indigo, kasuri, katazome...) pour créer un collier-récit. Chaque fragment est tracé et sa provenance documentée.", ja: "藍、絣、型染めなど五種類の異なる古布を組み合わせ、語りのあるネックレスを作る。各断片は出所が記録される。" },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80'],
    tags: ['tissu', 'histoire', 'collier', 'ancien'],
  },

  // cr17 Hiro Matsumoto — Thé de Jade
  {
    id: 'p17a', slug: 'gyokuro-uji-premier-flush', creatorId: 'cr17', category: 'food',
    name: { fr: "Gyokuro Uji Premier Flush", ja: "宇治玉露一番摘み" },
    price: 145,
    shortDescription: { fr: "Gyokuro d'Uji premier flush — récolte de mai, soixante grammes.", ja: "宇治玉露一番摘み——五月収穫、六十グラム。" },
    story: { fr: "Vingt jours d'ombrage avant la cueillette forcent les feuilles à concentrer la chlorophylle et la L-théanine. Ce gyokuro se prépare à 50°C pour révéler toute sa douceur umami.", ja: "二十日間の覆いが葉にクロロフィルとL-テアニンを濃縮させる。甘みとうまみを引き出すには50℃で淹れる。" },
    images: ['https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80', 'https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=800&q=80'],
    tags: ['thé', 'gyokuro', 'uji', 'japon'],
  },
  {
    id: 'p17b', slug: 'matcha-ceremoniel-uji', creatorId: 'cr17', category: 'food',
    name: { fr: "Matcha Cérémoniel Uji", ja: "宇治儀式抹茶" },
    price: 98,
    shortDescription: { fr: "Matcha de cérémonie d'Uji — mouture pierre, vert intense, terreux et sucré.", ja: "宇治儀式抹茶——石臼挽き、濃いグリーン、土と甘みのバランス。" },
    story: { fr: "Ce matcha est moulu sur une meule en granit japonais à vitesse lente pour ne pas chauffer les feuilles. Trente grammes par heure seulement — d'où sa préciosité.", ja: "葉を加熱しないよう、日本産花崗岩の臼でゆっくり挽く。一時間に三十グラムしか挽けない——だから貴重だ。" },
    images: ['https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=800&q=80', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80'],
    tags: ['matcha', 'thé', 'uji', 'cérémonie'],
  },

  // cr18 Aika Ogawa — Douceurs de Kyoto
  {
    id: 'p18a', slug: 'wagashi-saison-coffret', creatorId: 'cr18', category: 'food',
    name: { fr: "Coffret Wagashi de Saison", ja: "季節の和菓子詰め合わせ" },
    price: 68,
    shortDescription: { fr: "Six wagashi de la saison — pâte de haricot, mochi, yōkan artisanaux.", ja: "季節の和菓子六個入り——餡、餅、羊羹の手作り。" },
    story: { fr: "Aika compose six wagashi différents selon le calendrier lunaire de Kyoto. En automne : momiji mochi (feuille d'érable), kuri yokan (châtaigne), shiratama azuki (perles de riz).", ja: "京都の旧暦に合わせて六種類の和菓子を作る。秋は紅葉餅、栗羊羹、白玉小豆。" },
    images: ['https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80'],
    tags: ['wagashi', 'mochi', 'kyoto', 'saison'],
  },
  {
    id: 'p18b', slug: 'dorayaki-artisanal-azuki', creatorId: 'cr18', category: 'food',
    name: { fr: "Dorayaki Azuki Artisanal", ja: "手作り小豆どら焼き" },
    price: 32,
    shortDescription: { fr: "Dorayaki à la pâte de haricot rouge artisanale — quatre pièces, expédié sous froid.", ja: "手作り小豆餡のどら焼き四個入り——冷蔵発送。" },
    story: { fr: "La pâte azuki de Aika mijote trois heures avec du sucre de canne non raffiné de Okinawa. La texture — ni trop sucrée, ni sèche — est son secret jalousement gardé.", ja: "小豆餡は沖縄の粗糖と三時間煮込む。甘すぎず乾かない食感が、彼女の秘密。" },
    images: ['https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80', 'https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80'],
    tags: ['dorayaki', 'azuki', 'wagashi', 'artisanal'],
  },

  // cr19 Jun Kato — Saké Artisan
  {
    id: 'p19a', slug: 'junmai-daiginjo-janvier', creatorId: 'cr19', category: 'food',
    name: { fr: "Junmai Daiginjo Hiver", ja: "純米大吟醸・冬仕込み" },
    price: 78,
    shortDescription: { fr: "Junmai daiginjo brassé en janvier — eau de fonte des neiges, fruité délicat.", ja: "一月醸造の純米大吟醸——雪解け水、繊細な果実味。" },
    story: { fr: "Le brassage commence en janvier quand la neige fond dans les monts Echigo. La fermentation lente en chambre froide dure six semaines. Filtré sans pression — méthode shizuku.", ja: "越後の山の雪解け水が流れ始める一月に醸造を開始。低温発酵六週間。圧力なしで濾す——雫法。" },
    images: ['https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80', 'https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80'],
    tags: ['saké', 'daiginjo', 'niigata', 'artisan'],
  },
  {
    id: 'p19b', slug: 'sake-nigori-non-filtre', creatorId: 'cr19', category: 'food',
    name: { fr: "Nigori Non Filtré", ja: "無濾過にごり酒" },
    price: 52,
    shortDescription: { fr: "Nigori artisanal non filtré — opaque, crémeux, légèrement pétillant.", ja: "手作りの無濾過にごり酒——白濁、クリーミー、微発泡。" },
    story: { fr: "Le nigori est laissé trouble délibérément — seul un grossier tamis de bambou le filtre. Il refermente légèrement en bouteille — d'où ses petites bulles naturelles.", ja: "にごりは意図的に白濁させたまま——粗い竹の篩だけで濾す。瓶内で微発酵——だから自然の小さな泡がある。" },
    images: ['https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80'],
    tags: ['saké', 'nigori', 'non-filtré', 'artisan'],
  },

  // cr20 Yuki Inoue — Fermentation Lente
  {
    id: 'p20a', slug: 'miso-shinshu-3ans', creatorId: 'cr20', category: 'food',
    name: { fr: "Miso Shinshu 3 Ans", ja: "信州三年味噌" },
    price: 42,
    shortDescription: { fr: "Miso de soja Shinshu vieilli 3 ans en fût de cèdre — umami profond et rond.", ja: "杉樽三年熟成の信州大豆味噌——深く円やかなうまみ。" },
    story: { fr: "Fermenté dans des fûts en cèdre centenaires, ce miso développe une complexité proche du vieux parmesan. Idéal pour la soupe, les marinades, les sauces mijotées.", ja: "百年の杉桶で発酵させ、古いパルミジャーノに近い複雑さを持つ。味噌汁、マリネ、煮込みに最適。" },
    images: ['https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80', 'https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80'],
    tags: ['miso', 'fermenté', 'shinshu', 'umami'],
  },
  {
    id: 'p20b', slug: 'shio-koji-artisanal', creatorId: 'cr20', category: 'food',
    name: { fr: "Shio Kōji Artisanal", ja: "手作り塩麹" },
    price: 28,
    shortDescription: { fr: "Shio kōji — riz fermenté au sel, pour mariner, assaisonner, attendrir.", ja: "塩麹——塩と米の発酵、マリネ・調味・軟化に。" },
    story: { fr: "Le shio kōji fermente quarante-huit heures à température douce. Ses enzymes attendrissent la viande et le poisson en une nuit tout en les parfumant d'umami naturel.", ja: "塩麹は穏やかな温度で四十八時間発酵。酵素は一晩で肉や魚を柔らかくし、自然なうまみの香りをつける。" },
    images: ['https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80'],
    tags: ['koji', 'fermenté', 'umami', 'cuisine'],
  },

  // cr21 Nami Kimura — Herbes du Japon
  {
    id: 'p21a', slug: 'the-kuzu-automne', creatorId: 'cr21', category: 'food',
    name: { fr: "Thé Kuzu d'Automne", ja: "秋の葛茶" },
    price: 38,
    shortDescription: { fr: "Mélange de thé de kuzu — racine, feuilles et fleurs séchées, réchauffant.", ja: "葛茶ブレンド——根、葉、乾燥花、体を温める。" },
    story: { fr: "Nami récolte la racine de kuzu en automne à Kyushu — une racine peut peser dix kilos. Elle la sèche, la réduit en poudre et la mélange avec des fleurs de chrysanthème sauvages.", ja: "秋に九州で葛の根を収穫——一本が十キロになることもある。乾燥させ、粉にして、野生の菊の花と混ぜる。" },
    images: ['https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=800&q=80', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80'],
    tags: ['thé', 'kuzu', 'plantes', 'artisanal'],
  },
  {
    id: 'p21b', slug: 'infusion-hoji-yomogi', creatorId: 'cr21', category: 'food',
    name: { fr: "Infusion Hōji & Yomogi", ja: "焙じ茶よもぎ茶" },
    price: 32,
    shortDescription: { fr: "Infusion de thé hōji torréfié et d'armoise (yomogi) — terreux, profond.", ja: "焙じ茶とよもぎのブレンド——土っぽく深い。" },
    story: { fr: "L'armoise yomogi pousse sauvagement dans les collines de Kyushu. Mêlée au hōji torréfié à feu vif, elle donne une infusion chaude et ancrée qui évoque la terre japonaise.", ja: "よもぎは九州の丘に自生する。強火で焙じた焙じ茶と合わせると、日本の土を想起させる温かく地に足のついた茶になる。" },
    images: ['https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80', 'https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=800&q=80'],
    tags: ['thé', 'hojicha', 'yomogi', 'infusion'],
  },

  // cr22 Toma Okada — Soja Ancien
  {
    id: 'p22a', slug: 'shoyu-shodoshima-extra-vieux', creatorId: 'cr22', category: 'food',
    name: { fr: "Shoyu Shodoshima Extra-Vieux", ja: "小豆島超特選醤油" },
    price: 55,
    shortDescription: { fr: "Sauce soja Shodoshima vieilli 2 ans en fûts de cèdre — viscosité et umami extrêmes.", ja: "小豆島の杉樽二年熟成醤油——極上の濃度とうまみ。" },
    story: { fr: "Toma utilise du soja d'Hokkaido et du sel de mer d'Ōshima. La fermentation en fûts centenaires de cèdre apporte des notes de chêne et de fruit que nul soja industriel ne peut reproduire.", ja: "北海道産大豆と大島の海塩を使う。百年の杉桶での発酵がオークと果実のニュアンスを生む——工業的な醤油は再現できない。" },
    images: ['https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80'],
    tags: ['shoyu', 'soja', 'shodoshima', 'fermenté'],
  },
  {
    id: 'p22b', slug: 'shiro-shoyu-blanc', creatorId: 'cr22', category: 'food',
    name: { fr: "Shiro Shoyu Ambre", ja: "白醤油琥珀" },
    price: 48,
    shortDescription: { fr: "Sauce soja blanche (shiro shoyu) — ambrée, sucrée, umami doux, pour la cuisine française.", ja: "白醤油琥珀——甘く、穏やかなうまみ、フランス料理に。" },
    story: { fr: "La shiro shoyu est faite à 90% de blé et 10% de soja — d'où sa couleur ambrée. Idéale pour les sauces beurre-blanc, les risottos, et les dressings de salade sans tacher.", ja: "白醤油は小麦九割大豆一割——だから琥珀色。ブールブラン、リゾット、ドレッシングに最適で色を汚さない。" },
    images: ['https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80', 'https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80'],
    tags: ['shoyu', 'blanc', 'cuisine', 'fusion'],
  },

  // cr23 Saki Hayashi — Or de Yuzu
  {
    id: 'p23a', slug: 'yuzu-kosho-vert', creatorId: 'cr23', category: 'food',
    name: { fr: "Yuzu Koshō Vert", ja: "青柚子こしょう" },
    price: 24,
    shortDescription: { fr: "Yuzu koshō — zeste de yuzu vert, piment vert et sel — condiment de chefs.", ja: "青柚子こしょう——青柚子の皮、青唐辛子、塩——料理人のコンディメント。" },
    story: { fr: "La récolte de yuzu vert en septembre donne un koshō intense et herbacé. Saki le prépare à la main — zeste finement râpé, piment vert, sel marin — puis laisse fermenter deux semaines.", ja: "九月の青柚子収穫が、強烈でハーバルなこしょうを生む。手で作る——細かく擦ったゼスト、青唐辛子、海塩——二週間発酵。" },
    images: ['https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80', 'https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80'],
    tags: ['yuzu', 'kosho', 'piment', 'condiment'],
  },
  {
    id: 'p23b', slug: 'confiture-yuzu-gingembre', creatorId: 'cr23', category: 'food',
    name: { fr: "Confiture Yuzu & Gingembre", ja: "柚子生姜ジャム" },
    price: 28,
    shortDescription: { fr: "Confiture de yuzu entier et gingembre frais de Kochi — parfait avec le fromage.", ja: "高知の柚子と生姜のジャム——チーズとの相性は抜群。" },
    story: { fr: "Le yuzu de Saki est confit entier — peau, pulpe et pépins — avec du gingembre frais et du sucre de canne d'Okinawa. La peau amère contrebalance le gingembre piquant.", ja: "柚子は皮・果肉・種ごと砂糖漬け。生姜と沖縄粗糖と一緒に煮る。苦い皮が辛い生姜のバランスをとる。" },
    images: ['https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80'],
    tags: ['yuzu', 'confiture', 'gingembre', 'fromage'],
  },

  // cr24 Kai Mori — Lumière Zen
  {
    id: 'p24a', slug: 'bougie-hinoki-bambou', creatorId: 'cr24', category: 'home',
    name: { fr: "Bougie Hinoki & Bambou", ja: "檜と竹のキャンドル" },
    price: 58,
    shortDescription: { fr: "Bougie en cire de soja — infusée au cèdre hinoki et à la fumée de bambou.", ja: "大豆蝋燭——檜と竹煙のエッセンス。" },
    story: { fr: "L'huile essentielle de hinoki utilisée par Kai est distillée localement à Kamakura à partir de copeaux de chantier. La fumée de bambou carbonisé est collectée lors d'une combustion lente.", ja: "使う檜の精油は鎌倉の建材廃材から地元で蒸留。炭化した竹の煙は緩やかな燃焼から採取。" },
    images: ['https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80', 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80'],
    tags: ['bougie', 'hinoki', 'soja', 'zen'],
  },
  {
    id: 'p24b', slug: 'bougie-sakura-washi', creatorId: 'cr24', category: 'home',
    name: { fr: "Bougie Sakura & Washi", ja: "桜と和紙のキャンドル" },
    price: 52,
    shortDescription: { fr: "Bougie de soja enveloppée de washi — fleurs de sakura séchées en surface.", ja: "和紙を巻いた大豆蝋燭——表面に乾燥桜の花。" },
    story: { fr: "La fleur de sakura séchée est incrustée dans la cire — elle flambe brièvement à la surface avant de laisser place à un sillage floral discret. La coupe en washi crée une lumière tamisée.", ja: "乾燥桜が蝋に埋め込まれ——表面でわずかに燃え、その後控えめなフローラルの余韻を残す。和紙のカップが柔らかな光を作る。" },
    images: ['https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80'],
    tags: ['bougie', 'sakura', 'washi', 'printanier'],
  },

  // cr25 Lena Nishimura — Encens Sacré
  {
    id: 'p25a', slug: 'encens-agarwood-kyoto', creatorId: 'cr25', category: 'home',
    name: { fr: "Encens Kyara Premium", ja: "伽羅香道線香" },
    price: 185,
    shortDescription: { fr: "Bâtons d'encens au bois de kyara (agar supérieur) — dix pièces, brûlent 45 min.", ja: "伽羅の線香十本——一本四十五分燃焼。" },
    story: { fr: "Le kyara est le agar le plus précieux au monde — plus cher que l'or au kilo. Lena l'utilise avec parcimonie, mêlé à de la cire d'abeille et de la résine de pin japonais.", ja: "伽羅は世界最高の沈香——重量あたり金より高い。蜜蝋と松脂に少量を混ぜて使う。" },
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80', 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80'],
    tags: ['encens', 'kyara', 'agar', 'kodo'],
  },
  {
    id: 'p25b', slug: 'encens-hinoki-pin', creatorId: 'cr25', category: 'home',
    name: { fr: "Encens Hinoki & Pin des Alpes", ja: "檜高山松線香" },
    price: 68,
    shortDescription: { fr: "Bâtons d'encens au hinoki et pin de montagne — trente pièces, arôme forestier profond.", ja: "檜と高山松の線香三十本——深い森の香り。" },
    story: { fr: "Ce mélange utilise de l'écorce de hinoki du Kiso et des aiguilles de pin sauvages des Alpes japonaises. L'association crée un arôme humide qui rappelle le sous-bois après la pluie.", ja: "木曽の檜の皮と日本アルプスの野松の針を合わせる。雨後の林床を想起させる湿った香りが生まれる。" },
    images: ['https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'],
    tags: ['encens', 'hinoki', 'forêt', 'naturel'],
  },

  // cr26 Mao Takahashi — Lin Sacré
  {
    id: 'p26a', slug: 'serviette-chanvre-ise', creatorId: 'cr26', category: 'home',
    name: { fr: "Serviette Chanvre Ise", ja: "伊勢麻タオル" },
    price: 72,
    shortDescription: { fr: "Serviette en chanvre Ise — s'adoucit à chaque lavage, séchage rapide, antibactérienne.", ja: "伊勢麻タオル——洗うたびに柔らかく、速乾、抗菌。" },
    story: { fr: "Cette serviette est tissée selon la méthode Ise — tissu non écru pour préserver les huiles naturelles de la fibre. Au contact de l'eau, elle durcit légèrement pour masser efficacement.", ja: "伊勢流で織る——繊維の天然油を保つため未晒し。水を含むと少し固くなり、効果的にマッサージできる。" },
    images: ['https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80', 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80'],
    tags: ['chanvre', 'serviette', 'ise', 'lin'],
  },
  {
    id: 'p26b', slug: 'nappe-chanvre-naturel', creatorId: 'cr26', category: 'home',
    name: { fr: "Nappe Chanvre Naturel 140×180", ja: "麻テーブルクロス140×180" },
    price: 165,
    shortDescription: { fr: "Nappe en chanvre naturel non blanchi — 140×180 cm, froissé élégant.", ja: "無漂白天然麻テーブルクロス140×180——上品なしわ。" },
    story: { fr: "Le chanvre non blanchi garde sa teinte beige naturelle qui s'harmonise avec toutes les tables. Plus le tissu est froissé, plus l'aspect est beau — les plis sont une caractéristique, pas un défaut.", ja: "無漂白はどのテーブルとも調和する自然なベージュを保つ。しわが多いほど美しい——しわは特徴であり欠陥ではない。" },
    images: ['https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80'],
    tags: ['nappe', 'chanvre', 'naturel', 'table'],
  },

  // cr27 Rin Fukuda — Wabi Studio
  {
    id: 'p27a', slug: 'bol-shigaraki-cendre', creatorId: 'cr27', category: 'home',
    name: { fr: "Bol Shigaraki Cendres", ja: "信楽灰釉ボウル" },
    price: 145,
    shortDescription: { fr: "Bol en grès Shigaraki — glaçure de cendres de bois, asymétrie délibérée.", ja: "信楽焼ボウル——木灰釉、意図的な非対称。" },
    story: { fr: "Le grès de Shigaraki contient des grains de feldspath naturels qui éclatent à la surface à haute température, créant de minuscules cratères caractéristiques. Aucun bol n'est identique.", ja: "信楽焼には天然の長石粒が入り、高温で表面に爆ぜて独特の小さな火ぶくれを作る。同じボウルは一つもない。" },
    images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80'],
    tags: ['shigaraki', 'céramique', 'wabi-sabi', 'bol'],
  },
  {
    id: 'p27b', slug: 'theiere-shigaraki-tokoname', creatorId: 'cr27', category: 'home',
    name: { fr: "Théière Shigaraki Wabi", ja: "信楽侘び急須" },
    price: 240,
    shortDescription: { fr: "Théière en grès Shigaraki — forme ovoïde, couvercle asymétrique, filtre intégré.", ja: "信楽焼の急須——卵形、非対称な蓋、一体型茶漉し。" },
    story: { fr: "Cette théière est conçue pour le thé verde sencha. Le filtre en grès est intégré à la buse — aucun métal. La surface brute absorbe légèrement les tanins du thé, s'enrichissant à chaque usage.", ja: "煎茶のための急須。ストレーナーは焼成陶で作られ口に一体化——金属なし。粗い表面が茶のタンニンを少し吸収し、使うほど豊かになる。" },
    images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80', 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80'],
    tags: ['théière', 'shigaraki', 'thé', 'céramique'],
  },

  // cr28 Yoshi Suzuki — Forêt de Hinoki
  {
    id: 'p28a', slug: 'planche-hinoki-bain', creatorId: 'cr28', category: 'home',
    name: { fr: "Planche Bain Hinoki", ja: "檜風呂蓋" },
    price: 195,
    shortDescription: { fr: "Planche de bain en hinoki de Kiso — entretient la chaleur et embaume le bain.", ja: "木曽檜の風呂蓋——湯を保ち、風呂場に香りを放つ。" },
    story: { fr: "Taillée dans du hinoki de cent ans de Kiso, cette planche libère ses huiles essentielles à la vapeur. L'effet est comparable à un bain en forêt — shinrin-yoku dans votre salle de bain.", ja: "木曽の百年檜から削り出し、蒸気で精油を放出する。効果は森の中でのお風呂——自宅で森林浴。" },
    images: ['https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80', 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80'],
    tags: ['hinoki', 'bain', 'bois', 'aromathérapie'],
  },
  {
    id: 'p28b', slug: 'seau-bain-hinoki', creatorId: 'cr28', category: 'home',
    name: { fr: "Seau de Bain Hinoki", ja: "檜湯桶" },
    price: 145,
    shortDescription: { fr: "Seau traditionnel en hinoki cerclé de cuivre — pour le rituel du bain japonais.", ja: "銅締め伝統檜湯桶——日本の入浴儀式のために。" },
    story: { fr: "La forme traditionnelle du seau de bain japonais n'a pas changé depuis trois siècles. Les cercles en cuivre seront naturellement patinés avec le temps — une patine que Yoshi encourage.", ja: "日本の湯桶の伝統的な形は三百年変わっていない。銅の締め金は自然に緑青が出る——ヨシはそれを奨励する。" },
    images: ['https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80'],
    tags: ['hinoki', 'seau', 'bain', 'cuivre'],
  },

  // cr29 Akira Ono — Lumière d'Antan
  {
    id: 'p29a', slug: 'andon-washi-naturel', creatorId: 'cr29', category: 'home',
    name: { fr: "Andon Washi Naturel", ja: "和紙行灯" },
    price: 320,
    shortDescription: { fr: "Lanterne andon en bambou et washi naturel — LED 2200K intégré, lumière dorée.", ja: "竹と天然和紙の行灯——2200K LED内蔵、金色の光。" },
    story: { fr: "L'andon de Akira est structuré en bambou de Gifu et habillé de washi d'Echizen. La LED 2200K — température de bougie — diffuse une lumière qui se fond dans le papier sans jamais l'éclabousser.", ja: "アキラの行灯は岐阜の竹で組み、越前和紙を張る。2200KのLED——ろうそくの色温度——は紙の中に溶け込む光を放つ。" },
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80', 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80'],
    tags: ['andon', 'washi', 'lumière', 'bambou'],
  },
  {
    id: 'p29b', slug: 'bougeoir-washi-cylindre', creatorId: 'cr29', category: 'home',
    name: { fr: "Bougeoir Cylindre Washi", ja: "和紙円筒燭台" },
    price: 85,
    shortDescription: { fr: "Cylindre de washi pour bougie — diffusion douce, motif japonais en transparence.", ja: "和紙円筒キャンドルホルダー——柔らかな拡散、透過する日本の文様。" },
    story: { fr: "Akira imprime des motifs traditionnels (plumes, vagues, pins) sur le washi avant de le former en cylindre. La flamme révèle le motif par transparence — invisible le jour, visible la nuit.", ja: "伝統文様（羽、波、松）を和紙に捺染してから円筒に仕立てる。炎が透過で文様を現す——昼は見えず、夜に見える。" },
    images: ['https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'],
    tags: ['washi', 'bougeoir', 'lumière', 'motifs'],
  },

  // cr30 Mia Kondo — Tissu Quotidien
  {
    id: 'p30a', slug: 'tenugui-fuji-indigo', creatorId: 'cr30', category: 'home',
    name: { fr: "Tenugui Mont Fuji Indigo", ja: "富士山藍染手拭い" },
    price: 38,
    shortDescription: { fr: "Tenugui en coton japonais — imprimé à la main, motif Fuji-san en bleu indigo.", ja: "手捺染和コットン手拭い——藍色の富士山模様。" },
    story: { fr: "Ce tenugui utilise une impression sur planche de bois (katazuri) avec une teinte à base d'indigo naturel. Le motif Fuji-san en style ukiyo-e est tiré d'une gravure Meiji.", ja: "板木捺染と天然藍染料で印刷。浮世絵スタイルの富士山模様は明治の版画から取った。" },
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80'],
    tags: ['tenugui', 'fuji', 'indigo', 'coton'],
  },
  {
    id: 'p30b', slug: 'furoshiki-koi-rouge', creatorId: 'cr30', category: 'home',
    name: { fr: "Furoshiki Carpe Koï Rouge", ja: "紅鯉風呂敷" },
    price: 55,
    shortDescription: { fr: "Furoshiki 70×70 cm — carpe koï rouge sur fond écru, coton naturel japonais.", ja: "70×70cm風呂敷——生成り地に紅の鯉、日本産天然コットン。" },
    story: { fr: "La carpe koï remontant le courant symbolise la persévérance et la réussite au Japon. Mia l'imprime en rouge beni sur fond écru pour un effet graphique fort et culturellement ancré.", ja: "鯉の滝登りは日本で忍耐と成功を象徴する。ミアは生成り地に紅で印刷し、強い図案的効果と文化的な深みを出す。" },
    images: ['https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    tags: ['furoshiki', 'koi', 'rouge', 'coton'],
  },
]

export const getProductsByCreator = (creatorId: string) =>
  products.filter((p) => p.creatorId === creatorId)

export const getProductBySlug = (slug: string) =>
  products.find((p) => p.slug === slug)

export const categoryLabels: Record<string, { fr: string; ja: string }> = {
  craft:   { fr: "Artisanat", ja: "工芸" },
  fashion: { fr: "Mode",      ja: "ファッション" },
  food:    { fr: "Épicerie",  ja: "食・茶・酒" },
  home:    { fr: "Maison",    ja: "ホーム" },
}
