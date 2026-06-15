# External 外注バックログ（委託先ルーティング付き）

書き手＝社長室。部長ヒアリング（2026-06-13・全10部署）の外注候補を、契約v0.2 別紙C＝**情報Tier × コスト × 得意分野**で委託先へ振り分け。全てTier2以下（実データ・処方・戦略・顧客情報は inputs に入れない）。発注は社長室専管。台帳＝`_vendors.md`。

## 委託先の使い分け（ルーティング｜型つき）
- **Codex（実装系・Auditor付）**＝コード実装・テスト・差分・補助ツール（Tier2・ダミーデータ）。`Codex/Orders/ord-codex-###`。
- **Ollama（整形系・Auditor無＝社長室が意味不変照合）**＝Tier1に触れる整形・要約・分類・下書き（外部送信ゼロ）。`Ollama/Orders/ord-ollama-###`。
- **将来の受け皿**＝実装系（Gemini/Antigravity）／生成系（画像・動画＝レビュー非保有→発注元Internal部署＋社長室がレビュー）。具体採用は社長室の発注時にSota承認。追加手順・型分類は `AGENTS.md` §3-4、台帳は `_vendors.md`。採番＝**ord-<vendor>-###**。
- **Internal（外注しない）**＝決済/認証/本番/顧客データに触れるコード、戦略/世界観/命名/文言/価格/法的判断、各CLAUDE.md・Contracts・受入基準。

## 発行済みチケット（発注準備済み｜Codex再起動・Ollama起動で着手）
| ord | 委託先 | タスク | 状態 |
|---|---|---|---|
| ord-codex-001 | Codex | status様式チェッカー CLI | パッケージ済 |
| ord-codex-002 | Codex | build/serve系の単体テスト（ダミーstatus） | パッケージ済 |
| ord-codex-003 | Codex | 薬機/景表 NGワード一次スキャナ CLI | パッケージ済 |
| ord-codex-004 | Codex | 販売集計CSV→正規化JSON＋スキーマ検証（ダミーCSV） | パッケージ済（本ターン） |
| ord-ollama-001 | Ollama | 内部ドキュメントのmd整形・結論要約（ローカル・Tier1可） | パッケージ済（本ターン） |

## 次波（仕様明確・materialize待ち）
| 委託先 | タスク | 部署 |
|---|---|---|
| Codex | IFRA加算・最終濃度チェッカー（ダミー素材） | PRD |
| Codex | _aggregate.js 防火壁強化＋単体テスト／admin features 単体テスト（ダミーdata） | FIN/WEB |
| Codex | テスト用ダミーstatusデータ生成器／様式テンプレ構造整合チェッカー | SEC |
| Codex | 月次KPIフォーム生成・検証スクリプト | PLN |
| Codex | 各部 管理表/様式の構造（計測ログ・メディアリスト・許諾・ポップアップ会期・委託精算・出展前CL 等 空テンプレ） | MKT/MED/SLS/FIN |
| **Ollama** | 各部 md整形・リンク健全性・要約（PR/SLS/PLN/PRD/WEB/LGL/FIN のドキュメント群） | 横断 |
| **Ollama** | 差戻し成果物・長文提案の要約（社長レビュー前の結論抽出） | 横断 |

## Internal 保持（外注しない｜参考）
- **G5（tpr-002）残CASライター**：`api-survey.js`・`api-shipping-notify.js`・`api-delete-account.js` を共有 `updateSalesRecords` 経由へ統一＝**決済/データ整合に直結＝情シス内製**（別紙B・WP-K同様）。次フォローで社長室主導。
- 戦略・KPI設計・命名・文言・価格・取引条件・提案本文・法的判断・処方・実データ作業・各CLAUDE.md・Contracts・受入基準。
- BRD（ブランド戦略室）は全業務 外注ゼロ（理念・世界観・命名・文言・監修）。

## 発注ペース（_vendors §5）
同時GPTセッション≤3（Codex Worker/Auditor＋MAGIのGPT2人格 合算）。MAGI審査中はCodex Worker=1。**Ollama・CASPER(Claude)・社長室はGPT枠外で並行可**＝重い整形/要約をOllamaへ寄せるほどGPT枠が空く。
