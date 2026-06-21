# MyWorkSpace Studio — ニッチ製品「工場」

`sslocker08/Skills`（200件規模・日々更新の4層AIカンパニー知見ベース）の実装力で、**競合が少ない／既存製品が古い／それでも強い需要がある**ニッチ向けプロダクトを量産するための製品工場（Turborepoモノレポ）。

> 本ディレクトリは `_framework/`（KIBI等のガバナンス枠組み）とは**疎結合＝インスタンスにしない**。`_framework/` は変更しない。

## 中核設計: 55製品 → 6エンジン
検証済みニッチ約55件は、技術軸で **6つの再利用エンジン**（FAB/AUD/SIM/VIZ/OPS/WEB）に畳める。エンジンを1回作れば、各製品はその上の薄い「ドメイン皮」として数日〜数週で量産できる。

| エンジン | 領域 |
|---|---|
| **FAB** | 製作/幾何アンフォールド（コスプレCAD・レザー型紙・刺繍デジタイズ 等） |
| **AUD** | Webオーディオ/音楽（合唱編曲・foley・微分音 等） |
| **SIM** | デジタルツイン/シミュ（リーフ化学・発酵科学・ロケット 等） |
| **VIZ** | 対話型3D解説/科学/教育（職種別3D解説・患者教育3D 等） |
| **OPS** | B2Bモバイル現場業務（樹木医・潜水点検・装蹄師 等） |
| **WEB** | 物語/創作Web（IF/Twine後継・世界構築シミュ・人工言語 等） |

詳細は **[docs/PORTFOLIO.md](docs/PORTFOLIO.md)**（全製品カタログ）／ **[docs/ROADMAP.md](docs/ROADMAP.md)**（波・制作モデル・実行体制）／ **[docs/BUSINESS-MODEL.md](docs/BUSINESS-MODEL.md)**（課金・懐疑P&L・販売/広告）／ **[docs/HUMAN-VS-AI.md](docs/HUMAN-VS-AI.md)**（人間 vs AI 境界・ツール内フィードバック仕様）。

## Skills を「生きたリファレンス」として使う
スキルは200件規模で日々更新。**本リポジトリ内のスキル名は2026-06時点の参照点**。各製品・各フェーズの着手時に必ず最新を引く:

```bash
# 別プロジェクトから Skills の skills/agents を発見させる
claude --add-dir ~/Skills
# 着手時に最新インデックスを読む: Skills/REFERENCE.md, Skills/_reference/web-skills-kit-index.md
```

固定リストに依存せず「機能（やりたいこと）→ 最新Skillsで該当を引く」運用にする。

## ディレクトリ構成
```
studio/
  apps/<product>/        # 製品アプリ（cosplay-cad / choir-arranger / reef-sim ...）
  packages/
    engine-fab|audio|sim|viz|ops/   # 6エンジン（共通実装）
    ui auth payments feedback analytics marketing   # 共有層
  sites/ house/  <product>-lp/       # ポートフォリオ・ハウス＋製品別LP
  infra/                 # IaC, CI/CD
  docs/                  # 戦略ドキュメント（本フォルダ）
```

## 制作モデル（各製品共通の6フェーズ）
1 要件定義(機能/非機能) → 2 基本設計 → 3 詳細設計 → 4 実装 → 5 テスト → 6 リリース。
**製品内は軽量ウォーターフォール（各段=ゲート）、ポートフォリオ全体はアジャイル**（旗艦→学習→ツール内フィードバックを次製品へ折返す）。詳細は ROADMAP.md。

## ステータス
- [x] Wave 0 設計（戦略ドキュメント＋モノレポ骨格）
- [~] Wave 0 実装
  - [x] `@mwstudio/feedback`（コア＋Reactウィジェット＋テスト・tsup/vitest・CI）
  - [x] `@mwstudio/ui`（OKLCHトークン＋DESIGN.md契約＋プリミティブ Button/Input/Badge/Card・全8状態・反スロップ自動ゲート・テスト17件）
  - [x] `@mwstudio/house`（統合実証アプリ＝ui+feedback+analyticsを端から端まで・Viteビルド＋統合テスト）
  - [x] `@mwstudio/analytics`（トラッキングプラン正本＋型付きtrack＋React hooks・sink抽象・テスト11件／houseで実利用）
  - [ ] auth / payments / marketing-LP生成 / infra・デプロイ
- [ ] Wave 1 旗艦（各エンジン1本: Cosplay CAD / Choir / Reef sim / Vertical 3D解説 / Arborist / IF後継）
- [ ] Wave 2..N 横展開

## 開発（このモノレポ）
```bash
cd studio
pnpm install
pnpm run typecheck && pnpm run build && pnpm run test   # turbo が各パッケージで実行
```
