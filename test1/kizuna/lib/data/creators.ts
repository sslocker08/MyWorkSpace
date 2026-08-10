import { Creator } from '@/types'

export const creators: Creator[] = [
  // ─── CRAFT 工芸 ────────────────────────────────────────────────────────────
  {
    id: 'cr01', slug: 'yuki-tanaka', name: 'Yuki Tanaka', category: 'craft', featured: true,
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
    location: 'Kyoto',
    brandName: { fr: "Terre de Silence", ja: "静の土" },
    brandConcept: {
      fr: "Céramiques façonnées à la main dans la tradition Raku — chaque pièce porte la marque du feu.",
      ja: "楽焼の伝統に根ざした手びねり陶器。炎の痕跡を宿す、一点もの。",
    },
    story: {
      fr: "Yuki a appris la céramique dans l'atelier familial de Kyoto avant de perfectionner sa technique auprès de maîtres Raku. Ses bols portent les imperfections du feu comme des médailles.",
      ja: "京都の家族の窯で陶芸を学び、楽焼の師匠のもとで技術を磨いた。炎が残した跡は、傷ではなく勲章だ。",
    },
    interview: [
      { q: "Quelle est votre philosophie du wabi-sabi ?", a: { fr: "L'imperfection n'est pas un défaut — c'est l'empreinte de la main et du feu.", ja: "不完全は欠陥ではない。手と炎の痕跡だ。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80' },
    ],
    accentColor: '#8B5E3C',
    palette: { bg: '#F5EDE3', surface: '#EDD8C0', text: '#3D2010' },
  },
  {
    id: 'cr02', slug: 'haruto-nakamura', name: 'Haruto Nakamura', category: 'craft', featured: true,
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
    location: 'Wajima, Ishikawa',
    brandName: { fr: "Laque Profonde", ja: "深漆" },
    brandConcept: {
      fr: "Laque Wajima — soixante-dix couches, soixante-dix jours. Profondeur absolue.",
      ja: "輪島塗——七十層、七十日。絶対的な深み。",
    },
    story: {
      fr: "Haruto perpétue l'art de la laque Wajima, classée patrimoine immatériel. Chaque plateau exige soixante-dix applications successives sur un fond de riz.",
      ja: "無形文化遺産に指定された輪島塗を継承。各盆は米糊の地に七十回の塗りを重ねる。",
    },
    interview: [
      { q: "Pourquoi soixante-dix couches ?", a: { fr: "Parce que la profondeur ne se précipite pas. Chaque couche est un jour de patience.", ja: "深みは急かせない。一層一層が、一日の辛抱だ。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80' },
    ],
    accentColor: '#2D1810',
    palette: { bg: '#1A1210', surface: '#2D1810', text: '#E8D5C0' },
  },
  {
    id: 'cr03', slug: 'mei-yoshida', name: 'Mei Yoshida', category: 'craft', featured: true,
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80',
    location: 'Tokushima',
    brandName: { fr: "Bleu Awa", ja: "阿波藍" },
    brandConcept: {
      fr: "Teinture indigo d'Awa — bleu vivant, chaque pièce unique comme une empreinte.",
      ja: "阿波藍——生きている青。一枚一枚が、固有の指紋。",
    },
    story: {
      fr: "Mei ressuscite la teinture indigo de Tokushima (Awa), qui faillit disparaître au XXe siècle. Elle cultive elle-même son indigotier japonais.",
      ja: "二十世紀に絶えかけた阿波藍を復活させた。藍草は自ら育て、土から染める。",
    },
    interview: [
      { q: "L'indigo vous a-t-il choisie ou l'avez-vous choisi ?", a: { fr: "C'est la cuve qui choisit — elle accepte certaines mains, refuse d'autres.", ja: "藍甕が選ぶ。ある手は受け入れ、ある手は拒む。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
    ],
    accentColor: '#1B3A6E',
    palette: { bg: '#E8EDF5', surface: '#C4D0E8', text: '#0F2040' },
  },
  {
    id: 'cr04', slug: 'kenji-sato', name: 'Kenji Sato', category: 'craft', featured: false,
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
    location: 'Kyoto',
    brandName: { fr: "Bois Sacré", ja: "聖木" },
    brandConcept: {
      fr: "Ébénisterie Kyoto-style — assemblages sans clou, joints invisibles comme des secrets.",
      ja: "京指物——釘を使わない、見えない継ぎ手が語る秘密。",
    },
    story: {
      fr: "Kenji maîtrise l'art de la menuiserie kyoto-daiku, où la précision du joint prime sur l'esthétique. Ses boîtes s'assemblent par pression seule.",
      ja: "京指物の匠。継ぎ手の精度が美を凌駕する。箱は圧力だけで組み上がる。",
    },
    interview: [
      { q: "Quel bois vous fascine le plus ?", a: { fr: "Le hinoki — il embaume une génération entière et ne vieillit qu'en beauté.", ja: "檜——一世代を薫らせ、老いるほど美しくなる。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
    ],
    accentColor: '#5C4033',
    palette: { bg: '#EDE6DE', surface: '#D4C4B0', text: '#2A1810' },
  },
  {
    id: 'cr05', slug: 'ayumi-watanabe', name: 'Ayumi Watanabe', category: 'craft', featured: false,
    photo: 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=600&q=80',
    location: 'Tokyo',
    brandName: { fr: "Métal Brut", ja: "地金" },
    brandConcept: {
      fr: "Bijoux forgés à la main — argent oxydé, textures brutes, beauté minérale.",
      ja: "手鍛えのジュエリー——酸化銀、荒い肌理、鉱物的な美。",
    },
    story: {
      fr: "Formée à l'École de joaillerie de Tokyo, Ayumi rejette le poli parfait pour des surfaces oxydées qui capturent la lumière autrement.",
      ja: "東京の宝飾学校で学んだが、完璧な光沢を捨て、酸化させた表面が光を別様に捉えることを選んだ。",
    },
    interview: [
      { q: "Pourquoi l'oxydation ?", a: { fr: "Un métal trop poli n'a pas d'histoire. L'oxydation, c'est le temps qui signe.", ja: "磨きすぎた金属に歴史はない。酸化は時間の署名だ。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80' },
    ],
    accentColor: '#7A7A7A',
    palette: { bg: '#EBEBEB', surface: '#D4D4D4', text: '#202020' },
  },
  {
    id: 'cr06', slug: 'ren-kobayashi', name: 'Ren Kobayashi', category: 'craft', featured: false,
    photo: 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=600&q=80',
    location: 'Tokyo',
    brandName: { fr: "Éclat de Verre", ja: "切子の光" },
    brandConcept: {
      fr: "Kiriko — verre gravé Edo, géométries parfaites, lumière prismatique.",
      ja: "江戸切子——完璧な幾何学が光を砕く。",
    },
    story: {
      fr: "Ren est l'un des rares artisans à perpétuer le kiriko d'Edo, verre gravé né au XIXe siècle. Ses verres captent la lumière en milliers d'éclats.",
      ja: "十九世紀に生まれた江戸切子を継ぐ、数少ない職人の一人。グラスは光を無数の輝きに砕く。",
    },
    interview: [
      { q: "La symétrie est-elle une contrainte ?", a: { fr: "C'est une discipline. La perfection géométrique libère — elle donne une limite à transcender.", ja: "対称は規律だ。幾何学的完璧さは解放する——超えるべき限界を与えてくれる。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80' },
    ],
    accentColor: '#2A4A7F',
    palette: { bg: '#EAF0FA', surface: '#C8D8F0', text: '#0F2040' },
  },
  {
    id: 'cr07', slug: 'sora-ito', name: 'Sora Ito', category: 'craft', featured: false,
    photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80',
    location: 'Echizen, Fukui',
    brandName: { fr: "Papier Vivant", ja: "生和紙" },
    brandConcept: {
      fr: "Washi Echizen — papier qui respire, translucide, taillé pour durer mille ans.",
      ja: "越前和紙——呼吸する紙。透明で、千年の命を持つ。",
    },
    story: {
      fr: "Sora fabrique du washi selon la méthode Echizen, classée au patrimoine mondial de l'UNESCO. Ses papiers sont utilisés par des artistes et relieurs du monde entier.",
      ja: "ユネスコ無形文化遺産に登録された越前流で和紙を漉く。その紙は世界中のアーティストや製本師が使う。",
    },
    interview: [
      { q: "Qu'est-ce que l'eau vous a appris ?", a: { fr: "La patience. L'eau ne se précipite jamais — elle attend que les fibres soient prêtes.", ja: "忍耐を。水は急かない——繊維が整うのを待つ。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80' },
    ],
    accentColor: '#B8A882',
    palette: { bg: '#F5F0E8', surface: '#E8E0D0', text: '#2A2416' },
  },
  {
    id: 'cr08', slug: 'taro-shimizu', name: 'Taro Shimizu', category: 'craft', featured: false,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    location: 'Beppu, Ōita',
    brandName: { fr: "Bambou d'Or", ja: "金竹" },
    brandConcept: {
      fr: "Vannerie Beppu — bambou courbé et tressé en objets d'une légèreté impossible.",
      ja: "別府竹細工——竹を曲げ、編み、ありえない軽さの器を生む。",
    },
    story: {
      fr: "Taro a appris l'art de la vannerie Beppu auprès de son grand-père. Ses paniers combinent la robustesse du bambou avec des formes presque architecturales.",
      ja: "祖父から別府竹細工を学んだ。竹の強さとほとんど建築的な形を融合させる。",
    },
    interview: [
      { q: "Le bambou est-il difficile à apprivoiser ?", a: { fr: "Il faut le respecter — pas le dompter. Il a son propre caractère.", ja: "手なずけるのではなく、敬うことが必要だ。竹には竹の性格がある。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80' },
    ],
    accentColor: '#4A7C59',
    palette: { bg: '#EBF0EB', surface: '#CCD8CC', text: '#1A2E1A' },
  },
  {
    id: 'cr09', slug: 'nana-fujiwara', name: 'Nana Fujiwara', category: 'craft', featured: false,
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80',
    location: 'Kyoto',
    brandName: { fr: "Jardin Peint", ja: "描き庭" },
    brandConcept: {
      fr: "Kyo-yuzen — teinture à la main, motifs floraux inspirés des jardins de Kyoto.",
      ja: "京友禅——手描き染め。京の庭から生まれた花模様。",
    },
    story: {
      fr: "Nana maîtrise le yuzen de Kyoto, art de teindre la soie à la main. Ses soies florales sont portées lors des grandes cérémonies.",
      ja: "米糊で輪郭を取る手描き友禅の技を会得。花模様の絹は大礼の場で纏われる。",
    },
    interview: [
      { q: "Comment naît un motif ?", a: { fr: "Je marche dans les jardins tôt le matin — les motifs viennent d'eux-mêmes.", ja: "早朝に庭を歩く。模様はおのずとやって来る。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80' },
    ],
    accentColor: '#C14B5A',
    palette: { bg: '#FAE8EA', surface: '#F0C8CC', text: '#3D1018' },
  },
  // ─── FASHION ファッション ──────────────────────────────────────────────────
  {
    id: 'cr10', slug: 'hana-kimura', name: 'Hana Kimura', category: 'fashion', featured: true,
    photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80',
    location: 'Kyoto',
    brandName: { fr: "Lin de Kyoto", ja: "京リネン" },
    brandConcept: {
      fr: "Mode lente — lin naturel, coupes épurées, vêtements pour durer vingt ans.",
      ja: "スローファッション——無染料の麻、簡潔なカット、二十年着られる服。",
    },
    story: {
      fr: "Hana crée des vêtements en lin japonais naturellement non blanchi. Chaque pièce est taillée pour vieillir avec grâce.",
      ja: "無漂白の国産麻で服を作る。一枚一枚が、優雅に年を重ねる。",
    },
    interview: [
      { q: "Pourquoi refuser les tendances ?", a: { fr: "Une mode sans saison ne pollue pas. Je crée pour après-demain.", ja: "季節のない服は汚染しない。私は明後日のために作る。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
    ],
    accentColor: '#8A8A6A',
    palette: { bg: '#F0EDE6', surface: '#DDD8CC', text: '#2A2820' },
  },
  {
    id: 'cr11', slug: 'sota-hayashi', name: 'Sota Hayashi', category: 'fashion', featured: false,
    photo: 'https://images.unsplash.com/photo-1526413232644-8a7f7c651f2a?w=600&q=80',
    location: 'Kojima, Okayama',
    brandName: { fr: "Boro Moderne", ja: "モダンボロ" },
    brandConcept: {
      fr: "Denim boro — patchwork de salvage, coutures visibles, beauté de la réparation.",
      ja: "ボロデニム——サルベージのパッチワーク、見せる縫い目、修繕の美。",
    },
    story: {
      fr: "Sota travaille à Kojima, capitale du denim japonais. Il récupère des retailles pour créer des pièces boro inspirées des textiles ruraux d'avant-guerre.",
      ja: "デニムの聖地・児島で、端切れを回収してボロ仕立ての作品を作る。戦前の農村布から着想。",
    },
    interview: [
      { q: "Boro est-il luxe ou pauvreté ?", a: { fr: "C'est le luxe de ceux qui comprennent que rien ne se jette.", ja: "何も捨てないと知っている人々の贅沢だ。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80' },
    ],
    accentColor: '#3B4A5E',
    palette: { bg: '#E8ECF0', surface: '#C8D0DC', text: '#141C28' },
  },
  {
    id: 'cr12', slug: 'yuna-aoki', name: 'Yuna Aoki', category: 'fashion', featured: false,
    photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80',
    location: 'Tokyo',
    brandName: { fr: "Soie et Indigo", ja: "絹藍" },
    brandConcept: {
      fr: "Écharpes en soie teintes à l'indigo naturel — dégradés vivants, portés de mille façons.",
      ja: "藍染め絹スカーフ——生きるグラデーション、千通りの纏い方。",
    },
    story: {
      fr: "Yuna tisse et teint ses écharpes en soie sauvage. Elle a étudié la teinture végétale en Inde avant de revenir au Japon.",
      ja: "インドで草木染めを学び、帰国して藍染め技術を磨いた。野蚕の絹を自ら織り、染める。",
    },
    interview: [
      { q: "Chaque écharpe est-elle différente ?", a: { fr: "Irrémédiablement — la cuve d'indigo est vivante. Elle évolue chaque jour.", ja: "必ずそうだ。藍甕は生きている。毎日変わる。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80' },
    ],
    accentColor: '#4A6FA5',
    palette: { bg: '#E8EEF8', surface: '#C4D4EC', text: '#0C1E40' },
  },
  {
    id: 'cr13', slug: 'riku-suzuki', name: 'Riku Suzuki', category: 'fashion', featured: false,
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=80',
    location: 'Niigata',
    brandName: { fr: "Point Sashiko", ja: "刺し子" },
    brandConcept: {
      fr: "Broderie sashiko — points géométriques sur coton naturel, armure visible.",
      ja: "刺し子刺繍——無染料コットンに幾何学模様、見える力布。",
    },
    story: {
      fr: "Riku réinterprète la broderie sashiko, naguère réservée aux vêtements de travail, en vestes contemporaines. Chaque point est visible et intentionnel.",
      ja: "かつて労働着だった刺し子を現代のジャケットに再解釈。一針一針が見え、意図的だ。",
    },
    interview: [
      { q: "Sashiko était utilitaire — est-ce encore le cas ?", a: { fr: "Toujours — mais l'utilité s'est élargie. Mes vêtements durent aussi longtemps.", ja: "今でもそうだ——ただ、実用性が広がった。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
    ],
    accentColor: '#5D4B3C',
    palette: { bg: '#EDE8E3', surface: '#D8D0C8', text: '#241C14' },
  },
  {
    id: 'cr14', slug: 'miku-tanaka', name: 'Miku Tanaka', category: 'fashion', featured: false,
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
    location: 'Nishijin, Kyoto',
    brandName: { fr: "Fil d'Or", ja: "金糸" },
    brandConcept: {
      fr: "Tissage Nishijin — fils d'or entrelacés, kimono réinventé pour le quotidien.",
      ja: "西陣織——金糸を織り込む、日常に寄り添う新解釈の着物。",
    },
    story: {
      fr: "Miku travaille dans le quartier Nishijin, berceau du tissage de soie dorée depuis le Ve siècle. Elle crée des pièces portables qui marient le Nishijin à la silhouette contemporaine.",
      ja: "五世紀から金糸を織り続けてきた西陣で作業する。現代のシルエットに西陣を溶かした着られる一枚を。",
    },
    interview: [
      { q: "L'or pèse-t-il trop ?", a: { fr: "Le vrai fil d'or est d'une légèreté inattendue — c'est le symbolique qui pèse.", ja: "本物の金糸は意外なほど軽い——重いのは象徴だ。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80' },
    ],
    accentColor: '#B8860B',
    palette: { bg: '#FAF0D8', surface: '#F0E0A8', text: '#2A1C00' },
  },
  {
    id: 'cr15', slug: 'kaito-yamamoto', name: 'Kaito Yamamoto', category: 'fashion', featured: false,
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    location: 'Nara',
    brandName: { fr: "Masque Sacré", ja: "神面" },
    brandConcept: {
      fr: "Accessoires inspirés des masques de nô — argile, bois, laques rituelles.",
      ja: "能面に着想したアクセサリー——泥、木、儀式の漆。",
    },
    story: {
      fr: "Kaito sculpte des accessoires en cuir et bois qui évoquent les masques de nô de Nara. Chaque pièce est entre art et mode.",
      ja: "奈良の能面を想起させる革と木のアクセサリーを彫る。芸術とモードの間に立つ作品。",
    },
    interview: [
      { q: "Le masque cache ou révèle ?", a: { fr: "Il révèle l'essentiel en masquant l'accessoire.", ja: "余分を隠し、本質を現す。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
    ],
    accentColor: '#D4A853',
    palette: { bg: '#FAF0DC', surface: '#EDD8A4', text: '#2A1800' },
  },
  {
    id: 'cr16', slug: 'emi-nakagawa', name: 'Emi Nakagawa', category: 'fashion', featured: false,
    photo: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=600&q=80',
    location: 'Osaka',
    brandName: { fr: "Tissu Précieux", ja: "布宝" },
    brandConcept: {
      fr: "Bijoux textiles — fragments de tissus anciens sertis comme des pierres précieuses.",
      ja: "テキスタイルジュエリー——古布を宝石のようにセットする。",
    },
    story: {
      fr: "Emi collecte de vieux textiles boro et kimono abîmés pour en extraire des fragments qu'elle sertit dans des broches et pendentifs.",
      ja: "古いボロ布や損傷した着物を収集し、小さな断片をブローチやペンダントにセット。",
    },
    interview: [
      { q: "Un tissu abîmé a-t-il encore de la valeur ?", a: { fr: "La valeur n'est pas dans l'état — elle est dans le temps qu'il porte.", ja: "価値は状態にない——纏った時間にある。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
    ],
    accentColor: '#704214',
    palette: { bg: '#EEE4D8', surface: '#D8C4AC', text: '#2C1408' },
  },
  // ─── FOOD 食・茶・酒 ───────────────────────────────────────────────────────
  {
    id: 'cr17', slug: 'hiro-matsumoto', name: 'Hiro Matsumoto', category: 'food', featured: true,
    photo: 'https://images.unsplash.com/photo-1531427186611-83e0e7432fb4?w=600&q=80',
    location: 'Uji, Kyoto',
    brandName: { fr: "Thé de Jade", ja: "玉露" },
    brandConcept: {
      fr: "Gyokuro d'Uji — thé couvert, umami intense, cueilli à la main en mai.",
      ja: "宇治玉露——覆い下栽培、深いうまみ、五月の手摘み。",
    },
    story: {
      fr: "Hiro cultive son gyokuro sous des filets d'ombrage pendant vingt jours avant la cueillette. Cette obscurité force la théine à se transformer en L-théanine.",
      ja: "収穫前の二十日間、覆いの下で茶葉を育てる。この暗さがテインをL-テアニンへと変える。",
    },
    interview: [
      { q: "Pourquoi l'ombre ?", a: { fr: "La lumière stresse la plante. L'ombre la force à concentrer tout ce qu'elle a.", ja: "光は植物を追い詰める。影はすべてを濃縮させる。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=800&q=80' },
    ],
    accentColor: '#3E5A2E',
    palette: { bg: '#E8F0E0', surface: '#C4D8B0', text: '#141E0A' },
  },
  {
    id: 'cr18', slug: 'aika-ogawa', name: 'Aika Ogawa', category: 'food', featured: false,
    photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
    location: 'Kyoto',
    brandName: { fr: "Douceurs de Kyoto", ja: "京菓子" },
    brandConcept: {
      fr: "Wagashi de saison — éditions limitées suivant le calendrier lunaire de Kyoto.",
      ja: "季節の和菓子——京都の旧暦に従う限定版。",
    },
    story: {
      fr: "Aika est confiseuse wagashi depuis quinze ans dans le quartier Nishiki. Ses créations suivent les saisons, la lune et les fêtes.",
      ja: "錦市場の和菓子師として十五年。作品は季節、月、祭りに従う。",
    },
    interview: [
      { q: "Une confiserie peut-elle être éphémère ?", a: { fr: "Elle doit l'être. La beauté qui dure perd de sa saveur.", ja: "そうでなければならない。長続きする美は、風味を失う。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80' },
    ],
    accentColor: '#D4726A',
    palette: { bg: '#FAE8E6', surface: '#F0C8C4', text: '#3D1010' },
  },
  {
    id: 'cr19', slug: 'jun-kato', name: 'Jun Kato', category: 'food', featured: false,
    photo: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=600&q=80',
    location: 'Niigata',
    brandName: { fr: "Saké Artisan", ja: "越後の酒" },
    brandConcept: {
      fr: "Junmai daiginjo brassé à la main — eau de fonte des neiges, riz Koshihikari.",
      ja: "手醸造の純米大吟醸——雪解け水、越後のコシヒカリ。",
    },
    story: {
      fr: "Jun dirige la plus petite brasserie de saké de Niigata. Son junmai daiginjo fermente six semaines dans le froid de janvier.",
      ja: "新潟最小の酒蔵を率いる。純米大吟醸は一月の寒さの中で六週間発酵する。",
    },
    interview: [
      { q: "Le froid est-il un ennemi ou un allié ?", a: { fr: "Un maître. Le froid ralentit tout — et la lenteur fait la complexité.", ja: "師だ。寒さはすべてを遅らせ、遅さが複雑さを生む。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80' },
    ],
    accentColor: '#8FA3BF',
    palette: { bg: '#EDF0F5', surface: '#D0D8E8', text: '#101828' },
  },
  {
    id: 'cr20', slug: 'yuki-inoue', name: 'Yuki Inoue', category: 'food', featured: false,
    photo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=600&q=80',
    location: 'Nagano',
    brandName: { fr: "Fermentation Lente", ja: "信州味噌" },
    brandConcept: {
      fr: "Miso Shinshu — vieilli trois ans en bois de cèdre, umami des hauts plateaux.",
      ja: "信州味噌——杉樽で三年熟成、高原のうまみ。",
    },
    story: {
      fr: "Yuki fermente son miso dans des cuves en cèdre vieilles de cent ans. Ses misos développent une complexité aromatique rare.",
      ja: "百年の杉桶で味噌を醸す。長期熟成のうまみは、板前が争って求める稀な複雑さを持つ。",
    },
    interview: [
      { q: "Trois ans, c'est long ?", a: { fr: "C'est court pour le miso. Ma grand-mère attendait cinq ans.", ja: "味噌には短い。祖母は五年待った。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=800&q=80' },
    ],
    accentColor: '#8B6914',
    palette: { bg: '#F5EDD8', surface: '#E8D4A0', text: '#2C1E00' },
  },
  {
    id: 'cr21', slug: 'nami-kimura', name: 'Nami Kimura', category: 'food', featured: false,
    photo: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=600&q=80',
    location: 'Kyushu',
    brandName: { fr: "Herbes du Japon", ja: "野草茶" },
    brandConcept: {
      fr: "Thés de plantes sauvages — cueillette manuelle dans les monts de Kyushu.",
      ja: "野草茶——九州の山々での手摘み。",
    },
    story: {
      fr: "Nami cueille ses plantes médicinales dans les collines du Kyushu à l'aube. Ses mélanges suivent les saisons.",
      ja: "夜明けに九州の丘で薬草を摘む。ブレンドは季節に従う。",
    },
    interview: [
      { q: "Comment choisissez-vous vos plantes ?", a: { fr: "À l'odorat d'abord — si ça ne sent pas juste, ça n'ira pas dans la tasse.", ja: "まず匂いで——正しく香らなければ、カップには入らない。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80' },
    ],
    accentColor: '#6B8E23',
    palette: { bg: '#EBF0E0', surface: '#CCD8A8', text: '#1A2800' },
  },
  {
    id: 'cr22', slug: 'toma-okada', name: 'Toma Okada', category: 'food', featured: false,
    photo: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=600&q=80',
    location: 'Shodoshima, Kagawa',
    brandName: { fr: "Soja Ancien", ja: "小豆島醤油" },
    brandConcept: {
      fr: "Shoyu artisanal de Shodoshima — fermenté deux ans en jarres de cèdre.",
      ja: "小豆島の手造り醤油——杉樽で二年熟成。",
    },
    story: {
      fr: "Toma dirige la dernière brasserie artisanale de shoyu de Shodoshima, île réputée pour sa sauce soja depuis le XVIIe siècle.",
      ja: "十七世紀から醤油で知られる小豆島で、最後の手造り蔵を守る。",
    },
    interview: [
      { q: "La patience est-elle votre ingrédient principal ?", a: { fr: "Non — c'est le micro-organisme. Je suis juste là pour ne pas le déranger.", ja: "いや——微生物だ。私はただ邪魔しないためにいる。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1591203383185-e9a21ecb4c2e?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80' },
    ],
    accentColor: '#3D2B1F',
    palette: { bg: '#EAE0D8', surface: '#D0C0B0', text: '#180C04' },
  },
  {
    id: 'cr23', slug: 'saki-hayashi', name: 'Saki Hayashi', category: 'food', featured: false,
    photo: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&q=80',
    location: 'Kochi',
    brandName: { fr: "Or de Yuzu", ja: "柚子の金" },
    brandConcept: {
      fr: "Yuzu de Kochi — confits, kosho, huile — l'agrume sacré du Japon en bocal.",
      ja: "高知の柚子——コンフィ、こしょう、オイル——神聖な柑橘を瓶に。",
    },
    story: {
      fr: "Saki cultive ses yuzus dans les vallées de Kochi. Sa yuzu kosho fermentée est plébiscitée par les chefs étoilés.",
      ja: "柑橘が自然に育つ高知の谷で柚子を育てる。発酵柚子こしょうは星付き料理人に愛される。",
    },
    interview: [
      { q: "Le yuzu est-il japonais ?", a: { fr: "Il vient de Chine — mais il est devenu l'âme du Japon. Comme le saké.", ja: "中国起源だが、日本の魂になった。酒と同じように。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1535585209827-a15f8bfab3c3?w=800&q=80' },
    ],
    accentColor: '#D4A017',
    palette: { bg: '#FFF8E8', surface: '#FCECC0', text: '#2A1C00' },
  },
  // ─── HOME ホーム ──────────────────────────────────────────────────────────
  {
    id: 'cr24', slug: 'kai-mori', name: 'Kai Mori', category: 'home', featured: true,
    photo: 'https://images.unsplash.com/photo-1619895862022-09114b41f316?w=600&q=80',
    location: 'Kamakura',
    brandName: { fr: "Lumière Zen", ja: "禅の灯" },
    brandConcept: {
      fr: "Bougies à la cire de soja infusées aux herbes du jardin de Kamakura.",
      ja: "鎌倉の庭のハーブを注入した大豆蝋燭。",
    },
    story: {
      fr: "Kai crée ses bougies en cire de soja dans son atelier de Kamakura, infusées de cèdre hinoki et de mousse de temple. Une lumière qui sent le Japon.",
      ja: "鎌倉のアトリエで国産大豆蝋燭を作る。檜と寺の苔のエッセンスを注ぐ。日本の匂いをする灯。",
    },
    interview: [
      { q: "Qu'est-ce qu'une bougie réussie ?", a: { fr: "Elle s'efface — elle ne doit pas s'imposer. Juste donner de la lumière et une odeur juste.", ja: "溶けていく——存在を主張しない。ただ光と正しい香りを与える。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80' },
    ],
    accentColor: '#C8A878',
    palette: { bg: '#F5EED8', surface: '#E8D8B0', text: '#2A1E08' },
  },
  {
    id: 'cr25', slug: 'lena-nishimura', name: 'Lena Nishimura', category: 'home', featured: false,
    photo: 'https://images.unsplash.com/photo-1590086782957-e45a0e3e2a53?w=600&q=80',
    location: 'Kyoto',
    brandName: { fr: "Encens Sacré", ja: "香道" },
    brandConcept: {
      fr: "Kodo — art japonais de l'encens. Bâtons façonnés à la main, formules séculaires.",
      ja: "香道——日本の芸道。手作りの線香、古典の調合。",
    },
    story: {
      fr: "Lena a étudié le kodo, art ancien de l'encens, pendant huit ans. Ses bâtons utilisent du bois d'agar et des résines recueillies à la main.",
      ja: "日本の古典芸道・香道を八年間学んだ。沈香と手摘みの樹脂を使う線香。",
    },
    interview: [
      { q: "L'encens a-t-il une durée de vie ?", a: { fr: "La fumée oui — mais un bâton bien conservé peut durer cinquante ans avant d'être brûlé.", ja: "煙はそうだ——でも保存のよい線香は、焚く前に五十年もつ。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80' },
    ],
    accentColor: '#7B5B8C',
    palette: { bg: '#F0EAF8', surface: '#DDD0F0', text: '#1E0C2C' },
  },
  {
    id: 'cr26', slug: 'mao-takahashi', name: 'Mao Takahashi', category: 'home', featured: false,
    photo: 'https://images.unsplash.com/photo-1555069519-127aadecd674?w=600&q=80',
    location: 'Ise, Mie',
    brandName: { fr: "Lin Sacré", ja: "麻の布" },
    brandConcept: {
      fr: "Textiles de maison en chanvre Ise — serviettes, nappes, naturels et durables.",
      ja: "伊勢麻のホームテキスタイル——自然で長持ちするタオル、テーブルクロス。",
    },
    story: {
      fr: "Mao tisse des textiles en chanvre dans la tradition d'Ise, où cette fibre était autrefois réservée aux offrandes impériales. Ses serviettes s'adoucissent à chaque lavage.",
      ja: "かつて皇室への献上品に使われた麻を伊勢の伝統で織る。洗うたびに柔らかくなるタオル。",
    },
    interview: [
      { q: "Le chanvre est-il luxueux ?", a: { fr: "Il est impérial — au sens propre. Et meilleur avec l'âge.", ja: "文字通り皇室のものだ。そして年々よくなる。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80' },
    ],
    accentColor: '#B5A088',
    palette: { bg: '#F5EEE5', surface: '#E4D8C8', text: '#2A2018' },
  },
  {
    id: 'cr27', slug: 'rin-fukuda', name: 'Rin Fukuda', category: 'home', featured: false,
    photo: 'https://images.unsplash.com/photo-1547394765-185e1e68b605?w=600&q=80',
    location: 'Shigaraki, Shiga',
    brandName: { fr: "Wabi Studio", ja: "侘び工房" },
    brandConcept: {
      fr: "Céramiques Shigaraki wabi-sabi — objets imparfaits pour des maisons vivantes.",
      ja: "信楽焼の侘び工房——不完全なものを、生きた家へ。",
    },
    story: {
      fr: "Rin crée à Shigaraki, l'une des six vieilles fours célèbres du Japon. Ses pièces portent les traces de la cuisson : cendres vitrifiées, craquelures, asymétries.",
      ja: "日本六古窯の一つ、信楽で制作。作品には焼きの痕跡が残る——灰釉、貫入、非対称。",
    },
    interview: [
      { q: "L'asymétrie est-elle un choix ?", a: { fr: "C'est une acceptation. Le four décide — pas moi.", ja: "受け入れだ。窯が決める、私ではない。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80' },
    ],
    accentColor: '#6B5E52',
    palette: { bg: '#EBE4DC', surface: '#D4C8BC', text: '#241C14' },
  },
  {
    id: 'cr28', slug: 'yoshi-suzuki', name: 'Yoshi Suzuki', category: 'home', featured: false,
    photo: 'https://images.unsplash.com/photo-1484802944726-d7e40ca07d08?w=600&q=80',
    location: 'Kiso, Nagano',
    brandName: { fr: "Forêt de Hinoki", ja: "檜の森" },
    brandConcept: {
      fr: "Accessoires de bain en hinoki de Kiso — baignoire à vapeur, savons, balais.",
      ja: "木曽檜の風呂道具——蒸し風呂、石鹸、ブラシ。",
    },
    story: {
      fr: "Yoshi taille ses accessoires de bain dans le hinoki de Kiso, cèdre consacré aux grands sanctuaires. Ses baignoires à vapeur embaumaient les onsen de jadis.",
      ja: "大社の御用木、木曽檜で風呂道具を削る。蒸し風呂は往年の温泉を薫らせた。",
    },
    interview: [
      { q: "Pourquoi le bain est-il différent au Japon ?", a: { fr: "Parce qu'il n'est pas hygiénique — il est rituel. On se lave avant d'entrer.", ja: "それは衛生ではなく、儀式だから。入る前に洗う。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80' },
    ],
    accentColor: '#4A7A50',
    palette: { bg: '#E8F0E8', surface: '#C4D8C4', text: '#142018' },
  },
  {
    id: 'cr29', slug: 'akira-ono', name: 'Akira Ono', category: 'home', featured: false,
    photo: 'https://images.unsplash.com/photo-1484863137850-baffdde7cd0a?w=600&q=80',
    location: 'Gifu',
    brandName: { fr: "Lumière d'Antan", ja: "行灯の灯" },
    brandConcept: {
      fr: "Andon — lanternes japonaises traditionnelles en washi et bambou, électrifiées.",
      ja: "行灯——和紙と竹の伝統照明、電気仕様。",
    },
    story: {
      fr: "Akira fabrique des andon, lanternes de papier japonaises, selon la technique de ses ancêtres à Gifu. Électrifiées, ses lanternes donnent une lumière dorée et douce.",
      ja: "岐阜で先祖の技法を継ぐ行灯職人。電気を通した現代の行灯は、柔らかな金色の光を放つ。",
    },
    interview: [
      { q: "La lumière électrique trahit-elle l'andon ?", a: { fr: "Non — le washi reste. La flamme, c'était le risque. Le LED, c'est la durabilité.", ja: "いや——和紙は残る。炎はリスクだった。LEDは永続性だ。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=800&q=80' },
    ],
    accentColor: '#C8A847',
    palette: { bg: '#FAF4DC', surface: '#F0E4A4', text: '#281C00' },
  },
  {
    id: 'cr30', slug: 'mia-kondo', name: 'Mia Kondo', category: 'home', featured: false,
    photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80',
    location: 'Tokyo',
    brandName: { fr: "Tissu Quotidien", ja: "日用布" },
    brandConcept: {
      fr: "Tenugui et furoshiki — coton japonais imprimé à la main, objets du quotidien.",
      ja: "手拭いと風呂敷——手捺染の国産コットン、日用品。",
    },
    story: {
      fr: "Mia imprime ses tenugui et furoshiki à Tokyo avec des motifs inspirés de la nature japonaise. Chaque tissu peut être serviette, emballage, ou écharpe.",
      ja: "東京で自然と都市生活から着想した模様を手捺染。一枚の布がタオルにも包みにもスカーフにもなる。",
    },
    interview: [
      { q: "Un tissu peut-il être universel ?", a: { fr: "Le furoshiki l'est — il s'adapte à tout. C'est la beauté des contraintes.", ja: "風呂敷はそうだ——何にでも合う。制約の美だ。" } },
    ],
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1519640961-c36d3d9da9e0?w=800&q=80' },
    ],
    accentColor: '#7B8FA8',
    palette: { bg: '#ECF0F5', surface: '#D0DAE8', text: '#141C28' },
  },
]

export const categoryLabels: Record<string, { fr: string; ja: string }> = {
  craft:   { fr: 'Artisanat', ja: '工芸' },
  fashion: { fr: 'Mode',      ja: 'ファッション' },
  food:    { fr: 'Épicerie',  ja: '食・茶・酒' },
  home:    { fr: 'Maison',    ja: 'ホーム' },
}

export const featuredCreators = creators.filter((c) => c.featured)
export const getCreatorBySlug = (slug: string) => creators.find((c) => c.slug === slug)
