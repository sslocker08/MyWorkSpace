# ロードマップ・制作モデル・実行体制

## 制作モデル（各製品共通の6フェーズ）→ Skills ゲートへの写像
| 段階 | 主担当 | Skills / エージェント |
|---|---|---|
| 1 要件定義（機能/非機能） | build-orchestrator＋人間承認 | `agentic-build-spec-interview`（性能/セキュリティ/可用性/法務を明文化）。ツール内フィードバック蓄積も入力 |
| 2 基本設計 | 設計 | `api-backend-architecture` `information-architecture` ＋各エンジン設計、`DESIGN.md`確定 |
| 3 詳細設計 | 設計＋oracle | 機械検証可能な「正解(oracle)」を先に作る（`robust-by-construction-design`） |
| 4 実装 | implementer（worktree隔離・並列） | 参照アルゴリズム移植、disjoint-fileで並列 |
| 5 テスト | quality＋adversarial-reviewer | `webapp-testing-qa` E2E、`web-performance/accessibility/security`、Phase3/6破壊レビュー |
| 6 リリース | platform＋campaign | `deploy-hosting-cicd`、LP公開、`launch-playbook`、**人間リリースゲート** |

**判断: 製品内＝軽量ウォーターフォール（各段=ゲート）、ポートフォリオ＝アジャイル。**
AIが各段を高速圧縮でき、oracle-firstが要件/詳細設計の前倒し確定を要するため製品内は順次ゲートが向く。旗艦を出して学び→**ツール内フィードバックを次製品へ折返す**のでポートフォリオは反復。各製品 ≈2週スプリントで6段を1〜2周。

## ビルド波
- **Wave 0（基盤・1回）**: `studio/`モノレポ＋共有層（ui / auth / payments / **feedback** / analytics / marketing-LP生成 / infra）＋ハウスサイト雛形＋CI/CD。
- **Wave 1（各エンジンの旗艦＝パイプライン実証）**:
  - FAB → **Cosplay foam-armor CAD**
  - AUD → **Choir/a cappella arranger**
  - SIM → **Reef/planted aquarium 化学ツイン**
  - VIZ → **Vertical 3D 解説 SaaS（職種別）**
  - OPS → **Arborist 見積+3D診断**（代替/次: Commercial diving）
  - WEB → **IF/Twine後継＋分析**
  - 空白の宝（Leathercraft / Worldbuilding sim / Solo-RPG / Charcuterie・cheese / Equine farrier / 獣医3D解剖）を各波で繰上げ。
- **Wave 2..N（横展開）**: 各エンジン確立後、同エンジン上の残りをドメイン皮として量産（工数 1/5–1/10）。各リリース＝6フェーズ通過＋LP＋課金＋feedback内蔵＋ハウス掲載。

## 実行体制（複数セッション vs ダイナミックワークフロー）
**推奨 = ハイブリッド「1オーケストレーション・セッション(spine)＋並列worktree/サブ＋独立製品は別セッション」**

- **共有基盤・同一エンジンの変更** → **単一セッション**（共有パッケージのマージ衝突回避＋プロンプトキャッシュ＝前置き不変を保つ）。build-orchestrator がダイナミックWFで `implementer` を **disjoint-file・worktree隔離で並列**起動。
- **確立済みエンジン上の独立した製品app**（共有packageを触らない） → **別セッションで並走**可（互いに非干渉）。
- 規律: `orchestration-delegation-review`（委任/検収）、`model-effort-routing`（難所Opus/実装Sonnet/定型Haiku）、`agent-token-economy`（キャッシュ・並列ファンアウト）。
- 結論: **波0–1は単一spineで密に、波2以降は製品独立度に応じてセッションを増やす**。

## 着手時の必須チェック
- [ ] `claude --add-dir ~/Skills` で最新 skills/agents を発見、`Skills/REFERENCE.md`・index を読む（スキル名のドリフトを許容、機能→最新スキルで引く）。
- [ ] 各製品の最初に **ブランド・キックオフ**（ターゲット中心を撃ち抜く `DESIGN.md`：配色/フォント/声）。
- [ ] 各製品着手前に **懐疑P&L** を更新（[BUSINESS-MODEL.md](BUSINESS-MODEL.md)）し回収可否を判断。
