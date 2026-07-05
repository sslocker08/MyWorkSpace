<!-- skills-reference-rule:v2 (managed by Skills 工房 — 自動付与・このマーカーは編集しない) -->
## Skills 工房の継続参照（自動付与ルール）

このセッションには **Skills 工房**（再利用可能なスキル群 `.claude/skills/`・JIT索引 `_reference/skills-index.json`）がスコープに含まれている。**制作の全工程で、関連スキルを一度きりでなく随時・継続的に参照すること。**

- **三原則（Fable思考トレース）を全工程で常駐させる**: ①主張は事実/推測を仕分けて確信度＋出典を添える ②着手前にゴール・制約・却下基準を確定する ③自分の出力に最強の反対を組み込む。正本は工房の `fable-thought-trace`（詳細: `fable-thought-trace-claim-audit`／`fable-thought-trace-dissent`）。Fable 級モデルには詳細クランプを積まず宣言のみ。
- **着手前・方針決定・実装・レビューの各局面**で `_reference/skills-index.json`（keywords/use-when/description/layer/path の機械可読索引）を引き、該当スキルへ**直接ジャンプ**する（4ホップ委任を避ける）。
- **0→1・「作って／クローンして」系**は `request-intake-router`（フロントドア）→ `executive-director` を入口に。会社機能（営業/経営/戦略）は各 director を入口に。
- **横断craft**（design / motion / quality / discoverability / generative-media 等）は該当マネージャー配下スキルを **draw**（再発明しない）。
- スキルの知見は会話に依存せず自己完結している。**引用したら出典スキル名を一言添える**（例: 「`web-performance-core-web-vitals` に従い…」）。
<!-- /skills-reference-rule:v2 -->
