// Portfolio data shown on the house site. Mirrors studio/docs/PORTFOLIO.md
// (the validated niches) — kept small here; the doc remains the source of truth.

export type Engine = {
  key: string;
  name: string;
  blurb: string;
};

export type BillingModel = "OT" | "SUB" | "FRE" | "MKT";

export type Flagship = {
  name: string;
  engine: string;
  wedge: string;
  model: BillingModel;
  /** opportunity score (1-5) */
  score: number;
};

export const engines: Engine[] = [
  { key: "FAB", name: "FAB · 製作/幾何", blurb: "3Dモデル→2D型紙展開・ネスティング・原価。コスプレCAD/レザー型紙ほか。" },
  { key: "AUD", name: "AUD · Webオーディオ", blurb: "Web Audio・微分音・楽譜/タブ。合唱編曲/foleyほか。" },
  { key: "SIM", name: "SIM · デジタルツイン", blurb: "前進シミュ・化学/発酵モデル・診断。リーフ化学/発酵科学ほか。" },
  { key: "VIZ", name: "VIZ · 対話型3D解説", blurb: "インタラクティブ3D解説・科学可視化。職種別解説/患者教育ほか。" },
  { key: "OPS", name: "OPS · B2B現場業務", blurb: "オフラインモバイル・見積/帳票・コンプラ記録。樹木医/潜水点検ほか。" },
  { key: "WEB", name: "WEB · 物語/創作", blurb: "ノードグラフ編集・ホスティング・読者分析。IF後継/世界構築ほか。" },
];

export const flagships: Flagship[] = [
  { name: "Cosplay foam-armor CAD", engine: "FAB", wedge: "Pepakuraは紙前提/Win専用・Armorsmith開発終了。EVA厚み/体型スケール/Web版が皆無", model: "OT", score: 4 },
  { name: "Choir / a cappella arranger", engine: "AUD", wedge: "Finale 2024終了で数万編曲者が難民化。合唱特化＋良質再生の後継が空白", model: "SUB", score: 4 },
  { name: "Reef chemistry digital twin", engine: "SIM", wedge: "Reef2Reefで要望明示→未存在。投与→alk/Ca/Mg軌道の前進シミュ", model: "FRE", score: 4 },
  { name: "Vertical 3D 解説 SaaS", engine: "VIZ", wedge: "代理店が1本$20–80k。垂直アセット付きセルフ作成SaaSが皆無", model: "SUB", score: 4 },
  { name: "Arborist 見積+3D診断", engine: "OPS", wedge: "Arborgoldは30年級/高額。ISA TRAQ採点→提案を1セッション完結が空白", model: "SUB", score: 4 },
  { name: "IF / Twine 後継 + 読者分析", engine: "WEB", wedge: "Twineは15年眠れる王者。視覚編集＋ホスティング＋離脱分析の統合が皆無", model: "SUB", score: 4 },
];

export const MODEL_LABEL: Record<BillingModel, string> = {
  OT: "買い切り",
  SUB: "サブスク",
  FRE: "freemium",
  MKT: "マーケット",
};
