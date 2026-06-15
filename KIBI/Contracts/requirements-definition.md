# KIBI 三社体制 要件定義書 v0.1（ドラフト・社長承認待ち）

起案：2026-06-12 社長室（Claude Code）
正本配置：`Contracts/requirements-definition.md`（Contracts/ 新設も本書の決定事項。最終配置は社長承認で確定）
承認者：Sota（社長）
優先順位：①社内再編成指示（2026-06-12 社長）＞②Codex提案書（2026-06-12 受領）。矛盾時は①が優先。

## 0. 本書の位置づけ
- KIBI を **Internal（社内＝Claude）／External（外注・外部レビュー＝Codex）／ThirdParty（中立審査＝KIBI-MAGI）** の三社体制へ移行するための要件定義。
- 本書の承認をもって、①社内再編成（P1）②運用契約書 v0.1 の起草（P2・Codex提案の22条様式）へ進む。
- External・ThirdParty は本書（および承認後の契約書）に定める範囲でのみ動く。

## 1. スコープ
### 1.1 やること
- 最上位構造の4領域化（Internal / External / ThirdParty / Contracts）と部署改名・Secretary（秘書室）新設
- 三社間の役割・連絡手段・アクセス/編集権限・同時編集禁止・情報保護の要件定義
- コマンド改名（/Chack→/check、/Tally→/tally。/audit は既に小文字）と再配置
### 1.2 やらないこと（今回スコープ外）
- `Kofukuron23/`：社長個人が外部で主催するプロジェクト（23の香福論）の保管庫。**存在認知のみ・全AI不可侵**（読み書きとも社長の直接指示時に限る）
- `Web/` 内部の開発フロー変更（独自Gitリポジトリのまま。三社体制の対象は発注単位で切り出す）
- ThirdParty の構成AIの決定（§9-1。Sota判断）

## 2. 決定事項（確定・着手可能）
### 2.1 最上位構造
```
KIBI/
├── CLAUDE.md            # 全社ガイド（三社体制版に改訂＝P1）
├── Contracts/           # ★新設：三社共通規程（本書・契約書・役割定義・情報保護・ロック台帳）
├── Internal/            # ★新設：社内＝Claude。社長室の作業ディレクトリ
│   ├── CLAUDE.md        #   社長室職務定義（現ルートCLAUDE.mdの後継）
│   ├── .claude/commands/  # audit.md / tally.md / check.md
│   ├── Secretary/       #   旧 Shared（秘書室へ昇格。status/boards/daily/dashboard/rules/templates/tools）
│   ├── Planning/ Strategy/ Development/ System/ Marketing/ PR/ Sales/ Finance/ Legal/
├── External/            # 旧 _AuditByCodex を改名：Codex の作業領域
│   ├── AGENTS.md        #   Codex向け職務定義（契約抜粋。Codex標準の規約ファイル形式）
│   ├── Worker/          #   Codex Worker 常駐領域
│   ├── Auditor/         #   Codex Internal Auditor 常駐領域（旧監査レポート4本は Auditor/archive/2026-06-12/ へ移設・凍結）
│   └── Orders/          #   発注単位の記録（ord-###）→ §3.2
├── ThirdParty/          # 中立審査＝KIBI-MAGI
│   ├── README.md        #   MAGI憲章（運用規約）
│   └── Cases/           #   審査単位の記録（tpr-###）
├── Kofukuron23/         # 社長個人プロジェクト（スコープ外・不可侵）
├── _Records/            # 販売記録正本（不可侵・現位置維持を推奨→§9-5）
└── .secrets/            # 認証情報（不可侵）
```
### 2.2 部署の改名と Secretary 新設
| 旧 | 新 | 部署 | コード |
|---|---|---|---|
| `Planning/` | `Internal/Planning/` | 経営企画室 | PLN |
| `Brand/` | `Internal/Strategy/` | ブランド戦略室 | BRD（維持案） |
| `Products/` | `Internal/Development/` | 製品開発部 | PRD |
| `Web/` | `Internal/System/` | EC・情報システム部 | WEB |
| `SNS/` | `Internal/Marketing/` | マーケティング部 | MKT |
| `Media/` | `Internal/PR/` | 広報部 | MED |
| `Sales/` | `Internal/Sales/` | 営業部 | SLS |
| `Finance/` | `Internal/Finance/` | 経理・財務部 | FIN |
| `Legal/` | `Internal/Legal/` | 法務・コンプラ部 | LGL |
| `Shared/` | `Internal/Secretary/` | 秘書室（新部署） | SEC（新設） |

- 部署コードは **ID継続性のため既存維持を推奨**（§9-4）。過去ID・アーカイブは書き換えない。
- `Secretary/status/` のファイル名は新フォルダ名へ改名（Brand.md→Strategy.md 等）。`tools/build.js` 等の対応表・パスも更新。
- 日本語の部署名（経営企画室 等）は変更しない。変わるのは英語フォルダ名のみ。

### 2.3 役割と兼任
| 席 | 担い手 | 役割 | 作業ディレクトリ |
|---|---|---|---|
| 社長室（Internal） | Claude（Fable） | 設計・発注書・受入基準・統合・最終受入判定・Sotaエスカレーション。**＋内部監査役を兼任** | `Internal/` |
| 部署AI ×10 | Claude（各モデル） | 従来どおり（model-policy.md） | `Internal/<部署>/` |
| Codex Worker | Codex | 発注書に基づく実装。範囲遵守・自己点検・変更一覧提出 | `External/`（Orders/<id>/work） |
| Codex Internal Auditor | Codex（別セッション） | Worker成果物の内部QA。**最終承認権なし** | `External/`（Orders/<id>/audit） |
| KIBI-MAGI | 未定（§9-1） | 三観点の独立審査。**読み取り専用・勧告のみ** | `ThirdParty/` |
| Sota | 人間 | 経営判断・重大変更の承認（§2.5・§9） | 全域 |

- **MAGI 三観点**：MELCHIOR＝仕様（発注との一致・受入基準充足）／BALTHASAR＝技術（品質・保守性・安全）／CASPER＝経営・思想（憲章・世界観・情報保護との整合）。判定は合議（2/3で可決。ESCALATE_TO_HUMAN は1票でも成立）。
- **社長＝内部監査兼任の安全弁**：①重大変更は内部監査単独で確定しない（MAGI審査＋Sota承認必須）②受入判断に自己監査チェック欄を常設 ③兼任の事実を契約書に明記（利益相反の開示）。

### 2.4 コマンド
- 改名：`Chack.md`→`check.md`、`Tally.md`→`tally.md`（`audit.md` は既に小文字・現行維持）。
- 配置：`Internal/.claude/commands/` に3本（/audit は社長室専用）。各部署フォルダにも `/check` `/tally` を配布（現状はルートのみ配置で部署席では機能していないため、本改修で是正）。
- コマンド本文内の参照パス（`Shared/templates/audit-prompt.md` 等）も新パスへ更新し、動作確認をDONE条件とする（§8-8）。

### 2.5 変更3分類と判定ラベル（Codex提案を採用）
| 区分 | 例 | 必須手続き |
|---|---|---|
| 軽微 | 誤字・整形・表記ゆれ・既存仕様に影響しない整理 | Worker実施可＋Auditor確認（任意）＋社長受入 |
| 中規模 | 構成変更・機能追加・ダッシュボード拡張・運用フロー追加 | 発注書＋**Auditor監査必須**＋社長受入（自己監査チェック付） |
| 重大 | 部署構造・憲章・役割定義・受入基準・情報保護・契約・思想文言・本番の決済/認証 | **原則外注不可**。実施時は MAGI審査＋Sota承認＋証跡保存が必須 |

判定ラベル（対外は英ラベル、社内fbkは従来語彙（承認/差戻し/コメント/保留）で併存）：
- Codex Internal Auditor：`ACCEPTABLE` / `ACCEPTABLE_WITH_MINOR_FIXES` / `NEEDS_REVISION` / `REJECT`
- KIBI-MAGI：`APPROVE` / `APPROVE_WITH_CONDITIONS` / `RETURN_TO_CODEX` / `RETURN_TO_CLAUDE` / `ESCALATE_TO_HUMAN` / `REJECT`
- 社長室（最終）：`ACCEPT` / `ACCEPT_WITH_CONDITIONS` / `RETURN_TO_CODEX` / `REQUEST_THIRD_PARTY_REVIEW` / `ESCALATE_TO_SOTA` / `HOLD` / `REJECT`
- 自己監査チェック（兼任のため社長室の受入判断に内蔵）：`VALID` / `VALID_WITH_CONCERNS` / `NEEDS_REDESIGN` / `ESCALATE_TO_SOTA`

### 2.6 標準フロー（発注→統合の12段）
1. 社長室：発注書＋受入基準を作成（自己監査チェック①＝範囲・機密・指示の明確性）→ `Orders/<ord>/order/`
2. 社長室：`inputs/` へスナップショット投入（Tier判定・マスキング→§6）＋ `Contracts/locks.md` 凍結登録＋ステータス＝発注済
3. Worker：着手宣言（`work/declaration.md`＝対象範囲・変更予定ファイル）
4. Worker：実装（`work/deliverables/`）
5. Worker：自己点検レポート＋変更ファイル一覧を提出（`selfcheck.md`・`changed-files.md`）→ 以後 `work/` 凍結
6. Auditor：内部監査（`audit/audit-report.md`＋判定ラベル）
7. （中規模以上 or 社長指定）MAGI：独立審査（tpr 起票→§3.5）
8. 社長室：diff照合（changed-files と実差分の突合）→受入判定（`decision/acceptance.md`＋自己監査チェック②）
9. 差戻し時：`RETURN_TO_CODEX`（ステータス＝差戻し→ `work/` 凍結解除）
10. 重大判断：Sotaへエスカレーション（レビュータブ or 社長室チャット）
11. 受入後：**社長室のみ**が Internal へ統合（`decision/integration.md` に統合記録）＋ロック解除
12. クローズ：ステータス＝完了。`Orders/<ord>/` 一式が監査証跡（削除・改変禁止）

## 3. 三社間の連絡手段
### 3.1 原則
- 全連絡＝**ファイル経由・非同期・単一書き手**。口頭・チャットは補助とし、事後に必ずファイルへ記録。
- 各席の起動はSotaが行う（＝起動がメッセージ配送）。朝礼・夕礼に「Orders/Cases 点検」を追加。
- 受領SLAを三社へ拡張：自分宛の新規ファイルがあれば、次回起動時に必ず状態を進める（または保留理由を書く）。
### 3.2 発注フォルダの構造と書き手（1サブフォルダ＝1書き手）
```
External/Codex/Orders/ord-001/
├── order/      # 書き手=社長室：order.md（発注書・ステータス行・共有情報欄）／acceptance-criteria.md
├── inputs/     # 書き手=社長室：スナップショット（マスク済み資料・ダミーデータ）
├── work/       # 書き手=Worker：declaration.md／deliverables/／selfcheck.md／changed-files.md／questions.md
├── audit/      # 書き手=Auditor：audit-report.md
└── decision/   # 書き手=社長室：answers.md／acceptance.md／integration.md
```
他者のサブフォルダへの書き込みは契約違反として記録する。
### 3.3 ステータス遷移（書き手＝社長室のみ。order.md の1行）
`発注済 → 着手 → 提出済 → 監査済 →（審査中）→ 受入／条件付受入／差戻し → 統合済 → 完了／中止`
Worker・Auditor は**ファイルを置くことで合図**し、状態行は社長室が進める（単一書き手の維持）。
### 3.4 質疑
Worker は `work/questions.md` に追記（q-001…の連番・1問1行）。社長室は `decision/answers.md` で回答。推測で実装を進めない。
### 3.5 第三者審査への回付
- 社長室が `ThirdParty/Cases/tpr-###/inbox/` に審査依頼を投入（対象ord・観点・基準文書の参照）。
- MAGI は `Cases/tpr-###/` に3観点レポート＋`verdict.md`（合議判定）を出力。**External へ直接接触しない**（レポートのみ。差戻し指示の伝達は社長室が行う）。
- 審査基準＝Contracts の公開版憲章・AI役割定義・受入基準（§4.3）。
### 3.6 緊急時
緊急修正でも Orders を**後追いで必ず起票**（事後24h以内目安→§9-6）。緊急時であっても External が Internal を直接編集することは禁止。
### 3.7 社内追跡
- 社長室は ord/tpr を HQステータスのタスク行で追跡（トリガー列に ord-ID を記載可）。
- External 成果物の統合は既存のレビュー関門（review-gate.md）に乗せる＝HQタスクの「成果物（レビュー用）」行（レビュー=社長）で管理。二重ゲートにはしない（ordの受入判定とレビュー関門承認を統合時の同一ゲートとして扱う）。

## 4. アクセス・編集権限
### 4.1 マトリクス（R=読取可／W=書込可／✗=接触禁止）
| 領域 | Sota | Internal（社長室・部署） | Worker | Auditor | MAGI |
|---|---|---|---|---|---|
| `Internal/**` | RW | RW（自部署原則・従来規程） | ✗ | ✗ | ✗ |
| `External/Codex/Orders/*/order,inputs,decision` | RW | RW（社長室のみ） | R | R | R |
| `External/Codex/Orders/*/work` | RW | R | RW | R | R |
| `External/Codex/Orders/*/audit` | RW | R | R | RW | R |
| `External/Codex/Worker/` | RW | R | RW | R | R |
| `External/Codex/Auditor/` | RW | R | ✗ | RW | R |
| `ThirdParty/Cases/*/inbox` | RW | RW（社長室のみ） | ✗ | ✗ | R |
| `ThirdParty/**`（上記以外） | RW | R | ✗ | ✗ | RW |
| `Contracts/**` | 承認 | 起案RW（社長室のみ。重大改訂はSota承認） | R | R | R |
| `Kofukuron23/` | RW | ✗（社長指示時のみ） | ✗ | ✗ | ✗ |
| `_Records/` | RW | FinanceのみRW | ✗ | ✗ | ✗ |
| `.secrets/` | RW | System・FinanceのみR（W=Sota） | ✗ | ✗ | ✗ |
### 4.2 Internal への読み込み範囲（原則ゼロ＋スナップショット）
- Worker・Auditor・MAGI とも **Internal の直接読み込みは禁止（ゼロ）**。
- 必要資料は社長室が選別・マスキングし、`inputs/`（Worker・Auditor向け）／`Cases/*/inbox/`（MAGI向け）へ**スナップショットとして供給**する。
- 理由：同一マシン・誠実運用前提では「読める＝漏れ得る」。読み込み範囲を宣言で縛るより、渡す側で物理的に絞る方が確実で、記録（共有情報欄）も自然に残る。
- 運用負荷が高い場合の代替案＝読み取り専用ホワイトリスト（候補：`Internal/Secretary/rules/**` のみ等）。採否は §9-3 でSota判断。
### 4.3 統治文書の編集権
- 統治文書＝Contracts 配下一式（本書・契約書・AI役割定義・security-policy・locks.md）＋KIBI憲章＋各CLAUDE.md。
- 起案・編集＝社長室のみ。重大改訂＝Sota承認必須。**Workerへの外注禁止**。監査役・MAGIは読むのみ（修正は勧告として提出）。
- MAGI の審査基準用に**公開版憲章（抜粋）**を Contracts に置く（正本＝`Internal/Strategy/`。抜粋作成＝社長室→§9-8）。

## 5. データ干渉防止(同時編集の禁止)
1. **領域所有権**：§4.1 のとおり。書き込みは自領域のみ（単一書き手原則の三社拡張）。
2. **スナップショット受け渡し**：三社間に共有可変ファイルを作らない。同一ファイルを2者が編集する局面を構造的に排除する。
3. **ロック台帳** `Contracts/locks.md`（書き手＝社長室）：発注対象の Internal 側ファイルを凍結登録（パス・ord-ID・登録日・解除日）。凍結中は Internal 側でも当該ファイルを編集しない。解除＝統合完了 or 中止時。**同一ファイルに重なる発注の同時発行は禁止**。
4. **提出後凍結**：Worker は selfcheck 提出後 `work/` を編集しない（差戻しで解除）。Auditor は `work/` を編集しない（指摘はレポートで）。
5. **検証**：統合前に社長室が `changed-files.md` と実差分（inputs↔deliverables の diff）を突合。不一致＝即差戻し＋違反記録。
6. **並行制限**：同一 Order 内で Worker と Auditor は同時に走らない（提出済→監査の順）。別 Order 同士は対象ファイルが重ならない限り並行可（locks.md で機械的に判定）。
7. **Git（推奨）**：KIBI ルートを private Git 化（req-hq-001 を本プログラムへ統合。`_Records/`・`.secrets/`・`Kofukuron23/` を除外、`Web/` は独自リポジトリのため除外設定）。履歴＝ロールバック＋改変検知の基盤（§9-2）。
8. **生成物**：boards/dashboard は従来どおり build.js 生成・手編集禁止。ツール改修を外注する場合もコードを inputs 経由で渡す（status 実データは渡さない）。

## 6. 情報保護
### 6.1 機密区分（Tier）
| Tier | 区分 | 対象（例） | 扱い |
|---|---|---|---|
| 0 | 不可侵 | `.secrets/`・`_Records/`・顧客個人情報・認証情報/APIキー/トークン実値・**調香処方/レシピ原本**（Development配下指定）・Stripe/Firebase実設定 | いかなる形でも外部AIへ渡さない |
| 1 | 社内限り | 未公開戦略（Planning）・原価/利益実数（Finance）・法務係争・未公開ブランド構想・status実データ一式 | Internal のみ。例外共有は要約・抽象化＋Sota承認 |
| 2 | 案件共有可 | ツール/サイトのソースコード（秘匿値除去後）・テンプレート・公開済み文書・ダミーデータ | マスキング後、当該案件の inputs/inbox に限定投入 |
| 3 | 公開済み | kibi-fragrance.jp 公開情報・公開SNS | 制限なし |
### 6.2 共有禁止リスト（初版）
Tier0 全件＋Tier1 既定。正本は P2 で `Contracts/security-policy.md` に整備。
### 6.3 マスキングと記録
- 発注書テンプレに「投入資料チェック欄」（Tier判定・マスキング実施・投入ファイル一覧）を内蔵。
- 外部に渡した範囲は `order.md` の「共有情報」欄に必ず記録（＝共有範囲の記録要件）。
- ダッシュボード要約（Ollama）の `_Records/` 遮断は継続。
### 6.4 External 受入開始の前提条件（ord-001 発行前に完了）
1. 認証情報ローテーション完了（社長作業・残あり＝`Web/docs/CREDENTIAL_ROTATION_2026-06-12.md`）
2. 再編成（P1）完了＋ /audit 通過
3. Contracts 整備（AGENTS.md・契約書 v0.1・security-policy）
4. 初回 ord-001 はダミーデータ案件（Tier2のみ）で試運転

## 7. 外注対象範囲（部署別）
| 部署 | 外注可（Worker） | 外注不可（Internal専担） |
|---|---|---|
| Planning | 表整形・集計補助ツール | 戦略・KPI設計・ロードマップ本文 |
| Strategy | **－（全面不可）** | 憲章・世界観・命名・文言すべて |
| Development | 試作管理ツールUI（ダミーデータ） | **処方・調香・原料・評価データ** |
| System | UI実装・ダッシュボード・テスト・差分レポート | 決済・認証・`.secrets/`・本番デプロイ・顧客データに触れる処理 |
| Marketing | 計測テンプレ・管理表の構造 | ブランド文言・投稿文（ブランドの声） |
| PR | リスト整形・進行管理表 | メディア対応文面・関係構築の判断 |
| Sales | 管理表・資料テンプレの構造 | 価格・取引条件・提案本文 |
| Finance | 様式の雛形（空フォーマット） | 実データ作業全般・`_Records/` |
| Legal | 形式整形 | 法的判断・規約/特商法の文言 |
| Secretary | build.js／dashboard／serve.js 等ツール改修（ダミーデータ・コード単位） | status実データ・boards運用 |
| 横断 | md整形・テストコード・差分レポート・匿名化済みデータ整形 | 各CLAUDE.md（職務定義）・Contracts・受入基準・本書 |

第三者審査（MAGI）必須：重大変更の全件＋本番に触れる System 案件＋社長指定案件。**運用初期は External 成果物の全件審査を推奨**（キャリブレーション）。

## 8. 懸念点と解決手段
| # | 懸念 | 解決手段 |
|---|---|---|
| 1 | 同一マシン上で強制力がない（どのAIも技術的には全域を読める） | 領域別規約ファイル（Internal/CLAUDE.md・External/AGENTS.md・ThirdParty/README.md）＋起動CWDを各領域に固定＋diff照合＋違反記録条項＋（将来）OSレベル分離 |
| 2 | 同時編集・競合 | §5（所有権・スナップショット・ロック・提出後凍結）。Git導入で機械検知（req-hq-001） |
| 3 | 機密の混入（発注資料に実鍵・実データが紛れる） | Tier分類＋投入前チェック欄＋ダミーデータ原則＋共有記録（§6）。前提条件 §6.4 |
| 4 | 既知の本番露出の残り（認証ローテ未了・blk-fin-003 販売記録乖離） | External 開始前に完了を条件化（§6.4）。乖離は FIN/WEB が継続対応 |
| 5 | Worker の範囲外編集・勝手な拡張 | 着手宣言＋changed-files＋diff照合＋RETURN_TO_CODEX＋違反記録 |
| 6 | MAGI の独立性（構成AI未定。Claude製MAGIだと内部監査の域を出ない） | §9-1 でSota決定。妥協構成の場合は独立性の限界を契約書に明記 |
| 7 | 社長＝内部監査の兼任（自己監査の限界） | 重大変更は内部監査単独で確定しない（MAGI＋Sota必須）＋自己監査チェック欄＋契約書に兼任を明記 |
| 8 | 再編成の影響範囲が大きい（md参照：Shared/ 48・Brand/ 43・Media/ 41・Products/ 39・Web/ 37・SNS/ 26ファイル＋tools内JSのパス・status名・build.js対応表） | 改名マップ→一括置換→アーカイブは書き換えず注記のみ→**DONE条件**＝①build警告ゼロ②ダッシュボード描画③/audit通過④3コマンド動作⑤serve.js操作確認 |
| 9 | ID・部署コードの継続性 | コード既存維持（BRD=Strategy等）＋SEC新設。過去ID・アーカイブは凍結 |
| 10 | 非同期ゆえの停滞 | 朝礼夕礼に Orders/Cases 点検を組込み＋受領SLAを三社へ拡張（§3.1） |
| 11 | コマンドが部署席で効かない（現状ルートのみ配置） | P1で Internal/.claude＋各部署へ配布・参照パス更新・動作確認をDONE条件化 |
| 12 | ord受入とレビュー関門の二重ゲート化 | 統合時の同一ゲートとして一本化（§3.7） |

## 9. 未確定事項（Sota確認）
| # | 論点 | 選択肢／推奨 |
|---|---|---|
| 1 | MAGI の構成AI | **決定（fbk-hq-044）**＝MELCHIOR(仕様)=GPT／BALTHASAR(技術)=GPT／CASPER(経営思想)=Claude。GPT2人格は別チャットで独立起動・観点分離、クロスモデル検証はCASPER（Claude）が担う |
| 2 | KIBIルートの Git 化 | 推奨＝導入（req-hq-001 を本プログラムに統合。`_Records/`・`.secrets/`・`Kofukuron23/`・`Web/` 除外） |
| 3 | Internal 直接読み取りの例外 | 推奨＝ゼロ維持（スナップショット方式）。代替＝`Secretary/rules/**` のみR許可 |
| 4 | 部署コード | 推奨＝既存維持（ID連続性）。代替＝新コード（STR/DEV/SYS等）＋新旧対照表 |
| 5 | `_Records/`・`.secrets/` の位置 | 推奨＝現状維持（ルート直下・Internal外・不可侵のまま） |
| 6 | 緊急修正の発動条件 | 推奨＝本番障害・セキュリティ事案のみ。事後24h以内に ord 後追い起票 |
| 7 | ord-001（試運転）の対象 | 推奨＝Secretaryツールの軽微改修（ダミーデータ）or md整形案件 |
| 8 | 公開版憲章（MAGI審査基準）を Contracts に置くこと | 推奨＝可（正本=Strategy・抜粋は社長室が作成） |
| 9 | Contracts 重大改訂の手続き | 推奨＝起案 社長室→MAGI審査→Sota承認→改訂履歴記録 |
| 10 | 再編成（P1）の実施タイミング | 推奨＝本書承認後ただちに |

## 10. 実施フェーズ（承認後）
- **P0**：本書のSota承認（レビュータブ or 社長室チャット）← いまここ
- **P1 社内再編成**：Internal新設・10フォルダ移設・6改名・Secretary化・パス一括改修・コマンド改名/配布・statusファイル名・build.js等ツール改修・全社CLAUDE.md改訂・DONE条件検証（§8-8）
- **P2 Contracts整備**：運用契約書 v0.1（22条・Codex提案様式）・AI役割定義・security-policy・locks.md・各種様式（発注書/受入基準/監査レポート/審査レポート）・公開版憲章
- **P3 External開設**：AGENTS.md・Orders雛形・旧 `_AuditByCodex` 資産の `Auditor/archive/` 移設・ord-001試運転（前提=§6.4）
- **P4 ThirdParty開設**：構成AI決定（§9-1）後に MAGI憲章・Cases雛形・tpr-001＝ord-001の審査でキャリブレーション
- **P5 本運用**：2週間後に初回レトロ→契約書 v1.0 へ改訂

## 付記：既存規程との関係
- `operations.md`（単一書き手・ID・語彙）・`review-gate.md`（関門）・`model-policy.md` は Internal 内で従来どおり有効。本書はそれらを三社へ拡張する上位文書。
- 優先順位：Sota指示 ＞ Contracts（本書・契約書）＞ Secretary/rules ＞ 各部署CLAUDE.md。
- 旧 `_AuditByCodex/2026-06-12/` の監査レポート4本は `External/Codex/Auditor/archive/2026-06-12/` へ移設（履歴保存・書き換え禁止）。
