# 三社フロー 自動化基盤 設計（ドラフト・Sota承認待ち）

版：**draft v0.3**（2026-06-15 更新・社長室／特別開発部隊アーキ）。前版＝v0.2（2026-06-13 更新）・v0.1（2026-06-13 起案）。
v0.3 追記：rate-limit挙動（枠超過の保留化）・自動復帰（指数バックオフ・同時GPT≤3厳守）・Ollama退避（整形/要約の無枠リルート）・Antigravityフォールバック（MAGI一人格スロットル時のESCALATE/代替）・Watcher権限とTier/GATE写像・「自動化・搬送レイヤー附則」（共有ワークスペースで Internal/External 壁がポリシー壁化する点）。詳細＝§10。
**運用モデルの変更＝重大変更（契約 第14条・第20条1/4/5/7項）につき、採択にはSota承認＋tpr審査を要する。**
整合先：`Contracts/automation-requirements.md`（本自動化の要件定義＝REQ-A・本書の上位根拠）・`Contracts/requirements-definition.md`（三社体制要件＝REQ。本書の「REQ §x」は本書の節番号を指す）・`Contracts/master-agreement.md`・`Contracts/security-policy.md`。
目的：Claudeが発注→Codex（Worker/Auditor）/MAGIが自動処理→完了フラグ→Claudeが自動検知して再開、の半〜全自動パイプライン。

## 0. 設計方針（社長 Fable 5 確定事項）
社長が確定した運転思想を本設計の最上位制約とする。

1. **全自動でありながら、進捗はスマホ通知・重要事項はその都度承認。** 無人で進められる所は無人で詰め、判断の要る所だけ社長を呼ぶ。
2. **必ず人間で停止する事項（`GATE:human`）**＝自動進行させず、スマホへ承認依頼を出して**待つ**：
   - 重大変更（契約 第14条「重大」）／本番の決済・認証／本番デプロイ／外部AIへの大規模情報共有／契約・憲章・受入基準・情報保護方針・AI役割定義の変更。
   - 判定で `LEVEL:重大` または Tier1超の情報共有が絡む遷移は、ラベルに関わらず `GATE:human` に落ちる。
3. **`GATE:auto`（自動進行可）**＝**Tier2 かつ 軽微**に限る（中規模は `GATE:human`）：コード整形・テスト・差分照合・ダミーデータ整形・md整形等。成果物がTier2スナップショット内で完結し、Internal正本へ触れない範囲。
4. **サーキットブレーカ必須**（§7）：同時GPTセッション ≤3（MAGI審査中はCodex Worker=1に絞る）／連続失敗で停止／Secret走査ヒットで停止／diff照合不一致は自動差戻し／全遷移を記録。
5. **「急がない」哲学（契約思想・CLAUDE.md 行動規範）**：品質ゲート（Auditor監査・MAGI審査・人間承認）は省略しない。**自動化は待ち時間の自動詰めに限る**。速度のためにゲートを飛ばすことは禁止。

> 一言要約：**自動化は「人間を不要にする」のではなく「人間が判断すべき所だけに人間を集中させる」仕組み**。`GATE:auto` で待ちを詰め、`GATE:human` でスマホに上げて止まる。

## 0b. 現実の制約（正直な前提）
- リポジトリはローカルMac。**Claude Code（MAX×5）と Codex（GPT Plus）は別製品**で共通イベントバスが無い → **ファイルフラグのポーリング**で疎結合にする。同一マシン＝ファイル共有が使える利点を活かす。
- 通知は **`SLACK_WEBHOOK_URL`（既存env・Slackモバイルpush）が第一候補**。スマホ承認のMVPは「ローカル `serve.js` ダッシュボードを Tailscale / Cloudflare Tunnel で安全公開 → 既存レビュータブの承認/差戻しボタン」（新規コード最小）。上位案＝Slackインタラクティブ＋Netlify関数受け（§4）。
- **完全な無人実行にはローカル常駐（launchd 等）が要る**：`/loop` は「開いたClaude Codeセッションが要る」、cloud routine（schedule skill のクラウド実行）は**ローカルrepoに到達できない**。よって本設計の自走基盤は **ローカル launchd の定期 headless 実行** を推奨（§5）。
- 実体パス（現状）：発注＝`External/Codex/Orders/ord-codex-NNN/`、審査＝`ThirdParty/Cases/tpr-NNN/`、ロック＝`Contracts/locks.md`、ツール＝`Internal/Secretary/tools/`、操作卓＝`Internal/Secretary/tools/serve.js`（:4310）。
- **API課金ゼロが絶対条件**：エージェント間連携はファイル/git のみ（相互API呼び出しはしない）。計算は常にローカルMac。GitHub は永続化＋監査ログのみ（hostedランナー＝API課金につき不可）。headless 起動は **Codex＝`codex exec`／Claude＝`claude -p`**（いずれも各製品の購読枠＝MAX×5 / GPT Plus を消費する。従量APIは叩かない）。整形/要約の退避先＝**Ollama（ローカル・無枠）**。これらは購読枠の有限性を前提とするため、枠超過時の挙動（§10）を本設計の必須要件とする。

---

## 1. フラグ・プロトコル（機械可読のハンドオフ）
各 Order / Case の状態を、人にも機械にも読める形で**1か所**に持つ。REQ §3.2/§3.3・契約 別紙A の単一書き手原則を機械化したもの。

### 1.1 STATE/LEVEL/GATE の1行（`order.md` 冒頭）
```
<!-- KIBI-PIPE STATE:<状態> LEVEL:軽微|中規模|重大 GATE:auto|human OWNER:<次の担い手> UPDATED:<YYYY-MM-DDThh:mm+09:00> -->
```
- `STATE` 遷移（REQ §3.3）：`発注済 → 着手 → 提出済 → 監査済 →(審査中)→ 受入|条件付受入|差戻し → 統合済 → 完了|中止`
- **保留（rate-limit）は STATE を巻き戻さない**：`codex exec`／`claude -p` が枠超過で起動できなかった場合は、現STATEを保ったまま `circuit.held_rate_limit` に積む（§10.1）。**失敗（consecutive_failures）として数えない**。枠回復で自動復帰（§10.2）。OWNER は元の担い手のまま据え置く。
- `OWNER`＝「今ボールを持つ席」：`社長室 | Worker | Auditor | MAGI | Sota`。orders-scan が「誰の番か」を出す根拠。
- **STATE/GATE/OWNER 行の書き手は社長室のみ**（単一書き手の維持）。Worker/Auditor/MAGI は§1.2のセンチネルを置くことで合図し、社長室が状態行を進める。
- Case 側（`ThirdParty/Cases/tpr-NNN/`）は `verdict.md` 冒頭に同形式の1行（`STATE:審査中|判定済`・`OWNER:MAGI|社長室`）。

### 1.2 センチネルファイル（完了の合図＝置くだけ）
| センチネル | 置き場所 | 書き手（所有者） | 意味 |
|---|---|---|---|
| `.WORKER_DONE` | `Orders/<ord>/work/` | Worker | selfcheck.md・changed-files.md 提出済＝監査待ち |
| `.AUDITOR_DONE` | `Orders/<ord>/audit/` | Auditor | audit-report.md＋判定ラベル提出済 |
| `.VERDICT_READY` | `Cases/<tpr>/` | MAGI | 3観点＋verdict.md 提出済＝社長室受領待ち |
| `.INTEGRATED` | `Orders/<ord>/decision/` | 社長室 | Internal統合完了＝クローズ可 |

- センチネルは**所有サブフォルダにのみ置ける**（契約 第18条8項・別紙Aの書き込み権に一致）。他者サブフォルダへの書き込み＝契約違反として記録。
- センチネル本体は0バイトでよいが、推奨は1行JSON（`{"by":"Worker","ts":"...","label":"ACCEPTABLE_WITH_MINOR_FIXES"}`）＝scan が補助情報を拾える。
- **`GATE:human` の Order は、いかなるセンチネルが揃っても**、人間承認（§4の承認結果取り込み）なしに次STATEへ自動遷移しない。重大の安全弁。

### 1.3 所有権・図（テキスト）
```
[社長室] order.md(STATE/GATE/OWNER) ── 単一書き手
   │ 発注                                   ▲ 状態を進める
   ▼                                        │
[Worker] work/.WORKER_DONE ──→ (scan検知) ──┤
   │                                        │
[Auditor] audit/.AUDITOR_DONE ─→ (scan検知)─┤
   │                                        │
[MAGI] Cases/<tpr>/.VERDICT_READY ─(scan)──┘
   │
[社長室] decision/.INTEGRATED ──→ STATE=完了
```

---

## 2. `orders-scan.js`（状態スキャンの単一窓口・新規／要発注実装）
配置＝`Internal/Secretary/tools/orders-scan.js`。人も自動ループも**同じ表**を見る。

### 2.1 入力（読み取りのみ・副作用なし）
- `External/Codex/Orders/*/`：`order.md` の STATE/LEVEL/GATE/OWNER 行＋センチネル（`work/.WORKER_DONE`・`audit/.AUDITOR_DONE`・`decision/.INTEGRATED`）の有無。
- `ThirdParty/Cases/*/`：`verdict.md` の状態行＋`.VERDICT_READY` の有無。
- `Contracts/locks.md`：凍結中ファイル↔ordの対応（競合検出）。
- **読まないもの（防火壁・serve.js と同じ PROTECTED 正規表現を流用）**：`_Records/`・`.secrets/`・`Kofukuron23/`・各 `inputs/`/`inbox/` の中身（存在のみ確認、内容は読まない）。

### 2.2 判定ロジック（「誰の番か」）
| 条件 | 判定（OWNER／次アクション） |
|---|---|
| STATE=発注済 かつ `.WORKER_DONE` 無し | Worker着手待ち |
| `.WORKER_DONE` 有り かつ `.AUDITOR_DONE` 無し | Auditor監査待ち |
| `.AUDITOR_DONE` 有り・中規模以上 かつ tpr未起票 | 社長室＝MAGI回付要否判断 |
| `.VERDICT_READY` 有り | 社長室＝審査結果受領→受入判定 |
| `.AUDITOR_DONE` 有り・軽微 or 審査済 | 社長室＝diff照合→受入判定 |
| STATE=受入 かつ `.INTEGRATED` 無し | 社長室＝統合実行 |
| `GATE:human` の全停止点 | **Sota承認待ち（強調表示）** |
| locks.md で同一ファイルに2件 | **競合警告**（自動進行停止） |

### 2.3 出力
1. **人間可読表**（標準出力＋ダッシュボード新タブ「パイプライン」）：`ord-codex-007=Auditor待ち`・`ord-codex-003=社長室統合待ち`・`tpr-002=社長室受領待ち`・`ord-codex-005=★Sota承認待ち(重大)`。
2. **機械可読 `_pipeline.json`**（配置＝`Internal/Secretary/dashboard/summaries/_pipeline.json`）。スキーマ：
```json
{
  "generated": "2026-06-13T12:00+09:00",
  "items": [
    {"id":"ord-codex-007","kind":"order","state":"監査済","level":"中規模",
     "gate":"auto","owner":"社長室","next":"diff照合→受入判定",
     "sentinels":{"worker":true,"auditor":true,"verdict":false,"integrated":false},
     "waiting_human":false,"locks":["Internal/Secretary/dashboard/index.html"],"conflict":false}
  ],
  "alerts":[{"type":"awaiting_approval","id":"ord-codex-005","reason":"LEVEL:重大"}],
  "circuit":{"active_gpt_sessions":2,"consecutive_failures":0,"breaker_tripped":false,
     "held_rate_limit":[{"id":"ord-codex-006","engine":"codex","retry_after":"2026-06-15T13:20+09:00","attempts":2}],
     "ollama_reroute":false,"magi_fallback":[]}
}
```
- `_pipeline.json` は §3 の通知と §4 のダッシュボードが共通参照する**唯一の状態ソース**。
- scan は**冪等・無副作用**（読むだけ）。状態の前進は社長室（手動 or §3/§5 経由）が STATE 行を更新して行う。

---

## 3. `pipeline-notify.js`（通知モジュール・新規／要発注実装）
配置＝`Internal/Secretary/tools/pipeline-notify.js`。`_pipeline.json` を入力に、Slackへ digest を送る。

### 3.1 仕様
- 入力＝`_pipeline.json`。送信先＝`process.env.SLACK_WEBHOOK_URL`（未設定なら標準出力にフォールバックし**運用は止めない**）。
- **digest 構成**：①承認待ち（`waiting_human`／`alerts.awaiting_approval`）を**最上段に強調**（🔴＋ord-ID＋理由＋承認URL）②進行中（誰の番か）③ブロッカー（competition・breaker_tripped）④直近完了。
- **承認待ちの強調**：`GATE:human` 案件は本文先頭に固定し、§4の承認URL（Tunnel経由ダッシュボード `#review`）を添える。これがスマホへ push される（Slackモバイル）。
- **差分通知（推奨）**：前回送信の `_pipeline.json` ハッシュをキャッシュ（`summaries/_notify-last.json`）し、**変化があった時だけ送る**（通知疲れ防止）。承認待ちが新規発生した時は必ず即時送信。
- **送信抑制**：Tier0/Tier1 の中身は本文に出さない（ID・状態・OWNER のみ＝REQ §6・契約 第16条）。Slackは外部サービスのため、ord本文・処方・実データを載せない。
- 呼び出し：§5 の launchd 定期実行から `orders-scan.js → pipeline-notify.js` の順で叩く（scan が json を更新→notify が読む）。

### 3.2 通知の図（テキスト）
```
launchd(定期) → orders-scan.js → _pipeline.json → pipeline-notify.js → Slack Webhook → スマホ push
                                       │
                                       └→ ダッシュボード「パイプライン」タブ（serve.js が配信）
```

---

## 4. スマホ承認の具体設計（`GATE:human` の解錠経路）
進捗はSlackで push、**承認はワンタップ**で返せること。3層で設計する。

### 4.1 MVP（推奨・新規コード最小）＝Tunnel＋既存レビュータブ
- ローカル `serve.js`（:4310・既に承認/差戻しボタン＝`POST /review` を持つ）を **Tailscale Funnel または Cloudflare Tunnel** で安全公開。社長のスマホだけが到達できる経路にする。
- 承認フロー：Slack digest の承認URL（`https://<tunnel>/#review`）→ 既存レビュータブで対象ordの**承認/差戻し**ボタン → 既存 `POST /review` が `HQ.md` に fbk 追記＋build。
- **承認結果の取り込み経路**：`/review` は現状 fbk を `HQ.md` に書く。本設計では追加で、対象が ord の場合に **承認台帳 `Internal/Secretary/dashboard/summaries/_approvals.json`** に1行（`{ord, decision:'ACCEPT'|'RETURN', by:'Sota', ts}`）を追記する小改修を行う（serve.js 改修＝中規模・要発注）。orders-scan は次回巡回で `_approvals.json` を読み、`GATE:human` 案件の STATE を**社長室セッションが**進める（自動でWorker/MAGIへは進めない＝人間の意思が STATE 前進の起点）。
- 利点：新規UIゼロ・既存の単一書き手（HQ.md は社長室の延長）を崩さない・Claudeトークン不使用。
- 留意：Tunnel公開は**ローカルダッシュボードの外部到達**＝情報保護の論点（§Open Questions）。アクセス制御（Tailscale ACL／Cloudflare Access のメール認証＝Sotaのみ）必須。

### 4.2 上位案＝Slackインタラクティブ＋Netlify関数受け
- Slack Block Kit の「承認/差戻し」ボタンを digest に埋め、押下を **Netlify Functions**（`System/` に既存基盤あり）で受ける。
- 受けた関数は承認結果をどこかに永続化する必要があるが、**Netlifyはローカルrepoに書けない**（§0b 制約）→ 関数は承認イベントを保存（Netlify Blobs等）し、ローカルの launchd ジョブが**pull して `_approvals.json` に反映**する2段構え。
- 利点：Tunnel常時公開が不要・UXが最良。欠点：新規コード多・Slack App審査/署名検証・外部依存増。**P3以降・要tpr審査**。

### 4.3 最小フォールバック＝Slackスレッド返信 + 手動
- Tunnelもインタラクティブも使わない局面：digest に「承認するには社長室チャットで `approve ord-codex-NNN`」と明記。社長が社長室セッションで一言→Claudeが STATE を進める。常時稼働の launchd だけでは解決しないが、**確実に止まる**点で安全側。

### 4.4 承認の図（テキスト）
```
[GATE:human 検知] → Slack digest(🔴承認待ち+URL) → スマホ
        │                                            │ タップ
        ▼                                            ▼
   STATE据え置き(自動進行しない)        Tunnel→serve.js /#review→[承認/差戻し]
                                                     │
                                          _approvals.json 追記
                                                     │
                                  (次回 scan) 社長室が STATE 前進 / RETURN_TO_CODEX
```

---

## 5. 無人実行（自走基盤）の比較と推奨
| 方式 | 仕組み | 長所 | 短所 | 採否 |
|---|---|---|---|---|
| **launchd 常駐**（推奨） | `launchd` plist で定期 headless 実行（`orders-scan.js → pipeline-notify.js`、必要時 `codex exec`／`claude -p`） | ローカルrepoに到達・セッション不要・mac標準・電源連動 | plist設定が要る・mac固有 | **採用（P1〜）** |
| `/loop`（Claude Code） | 開いたセッション内で定期に巡回プロンプト | 既存・すぐ使える・Claudeの受入査読まで一気通貫 | **セッションを開きっぱなしが必要**＝無人不可・トークン消費 | 補助（社長在席時の手動巡回） |
| cloud routine（schedule skill） | クラウドのcronでエージェント実行 | 完全無人・mac非依存 | **ローカルrepo非到達**＝KIBIのファイルフラグを見られない | **不採用**（本用途では不可） |

- **推奨構成**：launchd が「監視・通知・Codex起動」の無人部分を担い、**Claudeの受入査読/diff照合/統合という判断は社長室セッション（在席 or `/loop`）で行う**。launchd の Claude headless（`claude -p`）は§7のブレーカ内で軽量タスク（scan結果の要約・通知整形）に限定し、統合のような重い判断は無人化しない（「急がない」哲学）。
- plist 例（要点）：`StartInterval`（例 600秒）／`WorkingDirectory=/絶対パス/to/MyWorkSpace/KIBI`（各自の環境パスに置換）／`StandardOutPath` でログ保存／環境に `SLACK_WEBHOOK_URL` を注入。実体は P2 で `System` へ発注実装。

### 5.1 自走ループの図（テキスト）
```
launchd(StartInterval 10m)
  └→ orders-scan.js ── _pipeline.json 更新
       ├→ pipeline-notify.js ── 変化あれば Slack
       ├→ (GATE:auto かつ Codex待ち) → codex-watcher 起動条件を満たすか確認
       └→ (GATE:human) → 通知のみ・自動進行しない
```

---

## 6. Codex watcher（外注側の自動着手・段階導入）
Codex には `/loop` 相当が無いため、`launchd + fswatch + codex exec` で着手を自動化する。配置＝`Internal/Secretary/tools/codex-watcher.sh`（または System 管理）。

### 6.1 仕組み
- `fswatch` で `External/Codex/Orders/*/inputs/` の新規出現を監視 → 対象ord の `order.md` が `STATE:発注済` かつ `GATE:auto` かつ `.WORKER_DONE` 無しなら **`codex exec`（非対話）で Worker を起動**。
- 起動プロンプトは固定：「`External/AGENTS.md` に従い、`STATE:発注済`・`.WORKER_DONE` の無い当該Orderを処理し、完了後 `work/.WORKER_DONE` を置け。範囲外編集禁止・changed-files.md 提出必須」。
- Auditor は `work/.WORKER_DONE` の出現を fswatch が拾い、別 `codex exec` で起動（`audit/.AUDITOR_DONE` を置かせる）。
- **`GATE:human` / `LEVEL:重大` の Order は watcher が起動しない**（着手させない＝§0 方針2・契約 第18条）。

### 6.2 同時数上限（サーキットブレーカと連動・§7）
- watcher は**起動中の `codex exec` プロセス数をカウント**し、上限を超えたら起動を見送る（キューに積み次回拾う）。
- 上限：**同時GPTセッション ≤3**。ただし**MAGI審査中（`.VERDICT_READY` 待ちのtprが存在）は Codex Worker=1 に絞る**（GPT Plus負荷分散＝社長確定方針）。**この ≤3 上限は §10.2 の自動復帰時も厳守**（保留分を一斉に再起動して上限を越えない）。
- 起動を試みて**枠超過が返った場合は失敗ではなく保留**：`held_rate_limit` に `retry_after` を記録し、次ポーリングで再評価する（§10.1）。
- 1 Order 内で **Worker と Auditor は同時起動しない**（提出済→監査の順＝REQ §5-6）。

### 6.3 図（テキスト）
```
fswatch(inputs/新規) → [STATE=発注済 & GATE=auto & 同時数<上限 & MAGI非審査中] → codex exec(Worker)
work/.WORKER_DONE 出現 → fswatch → [同時数<上限] → codex exec(Auditor)
GATE:human / LEVEL:重大 → 起動しない（通知のみ）
```

---

## 7. サーキットブレーカ（自動化の必須安全装置）
全項目を `_pipeline.json.circuit` に反映し、トリップ時は launchd の自動起動を停止＋Slack通知。

1. **重大ゲート**：`GATE:human` / `LEVEL:重大` は自動進行・自動起動を**禁止**（決済・認証・本番デプロイ・契約・憲章・受入基準・情報保護・AI役割定義・外部AIへの大規模共有＝契約 第14条「重大」・第20条）。
2. **同時実行上限**：GPT/Codex 同時セッション ≤3。MAGI審査中は Worker=1。watcher が機械的に制限（§6.2）。
3. **連続失敗で停止**：`codex exec` が N回連続（既定3）非ゼロ終了 → breaker トリップ→自動起動停止→Slack「要人間」。ただし**rate-limit（枠超過）は失敗に数えない**＝保留扱い（§10.1）。終了コード/エラー出力で「枠超過」と「実エラー」を判別し、前者は `held_rate_limit` へ、後者のみ `consecutive_failures` を加算する。
4. **Secret走査ヒットで停止**：統合前・コミット前に security-policy §6 のパターン（`sk-`・`ghp_`・`AIza`・`pk_live`・`sk_live`・`BEGIN PRIVATE KEY`・`password=` 等）を走査。ヒット即停止＋記録（外部AIへ渡る前段で遮断）。
5. **diff照合不一致は自動差戻し**：統合前に `changed-files.md` と実差分（inputs↔deliverables）を機械突合。不一致＝`RETURN_TO_CODEX`＋違反記録（契約 第18条1項・REQ §5-5）。
6. **ロック競合で停止**：`locks.md` で同一ファイルに重なる発注を検知したら当該 Order を自動進行から外す（REQ §5-3）。
7. **範囲外検知で停止**：センチネルが所有外サブフォルダに置かれた／Internal 直接編集の痕跡を検知→停止＋契約違反記録（第18条8/14項）。
8. **証跡**：全自動遷移を `_pipeline.json` 履歴と各 Order（`decision/`）に記録（契約 第17条・事後監査可能に）。

---

## 8. 段階導入ロードマップ（P1→P3）と完了条件
| フェーズ | 内容 | 主な発注（実装＝System/Secretary・Tier2） | 完了条件（DONE） |
|---|---|---|---|
| **P1 検知と通知**（即・低リスク） | フラグ・プロトコル正式化＋`orders-scan.js`＋`pipeline-notify.js`＋ダッシュ「パイプライン」タブ。Codex着手はSota手動 `codex exec`。 | orders-scan.js / pipeline-notify.js / dashboard タブ（build.js小改修） | ①scan が現存 ord-codex-001〜003・tpr-001〜003 を正しく「誰の番か」分類 ②`_pipeline.json` 生成 ③Slack digest がスマホ着弾（承認待ちは強調） ④Tier0/1 の中身が通知本文に出ない |
| **P2 承認と着手の自動化**（要設定・中リスク） | スマホ承認MVP（Tunnel＋`/review` 改修で `_approvals.json`）＋launchd定期実行＋codex-watcher（fswatch）＋サーキットブレーカ。 | serve.js `/review` 改修・launchd plist・codex-watcher.sh | ①Tunnel経由でスマホから承認/差戻しが `_approvals.json` に記録 ②launchd が10分間隔で scan→notify を無人実行 ③`GATE:auto` の Worker/Auditor が watcher で自動着手 ④同時数上限・連続失敗・Secret走査・diff不一致・ロック競合の各ブレーカが発火確認 ⑤`GATE:human` は一切自動進行しない |
| **P3 自走パイプライン**（全自動・要tpr審査） | MAGI回付の自動化（中規模以上で tpr 自動起票の提案→社長室確認）＋Slackインタラクティブ承認（上位案・任意）＋本運用。 | MAGI回付支援・（任意）Slack App＋Netlify受け | ①中規模以上で MAGI 回付要否が自動提示され社長室が確定 ②重大は必ず人間で停止し続ける ③2週間運転で誤自動進行ゼロ ④**採択前に tpr で本設計の独立審査**（運用モデル変更＝重大） |

- **共通の不変条件**（全フェーズ）：契約 第14/16/17/18/20条・REQ §4〜§6 を一切緩めない。自動化は§0方針5（待ち時間の自動詰めのみ）を守る。

## 9. 思想との両立（再掲・最重要）
- KIBIの「急がない」哲学（CLAUDE.md 行動規範）と矛盾させない。**自動化は品質ゲートの省略ではなく、待ち時間の自動詰め**に使う。Auditor監査・MAGI審査・人間承認は飛ばさない。
- 本ドラフトは設計提案。採択時は本書を `Contracts/` 正本化（changelog 記録）し、`orders-scan.js`・`pipeline-notify.js`・watcher・serve.js改修を System/Secretary に発注（Tier2＝外注可・ダミーデータ）して実装する。**運用モデルの変更そのものは重大＝MAGI審査＋Sota承認**を経て発効する。

---

## 10. 枠管理・フォールバック・搬送レイヤー（v0.3 追記）
本設計は従量APIを叩かず、各製品の**購読枠**（Claude＝MAX×5／GPT Plus）と**ローカル無枠**（Ollama）で回す（§0b）。枠は有限ゆえ、枠超過を「失敗」ではなく「待ち」として扱い、回復で自動復帰する仕組みを§7のサーキットブレーカに組み込む。

### 10.1 rate-limit 挙動（枠超過＝保留・失敗扱いしない）
- `codex exec`／`claude -p` が**枠超過（rate-limit / quota）で起動・継続できなかった**ときは、当該チケット（ord/tpr）を**保留**にする。STATE・OWNER は据え置き、`_pipeline.json.circuit.held_rate_limit` に1件積む：`{id, engine:'codex'|'claude', retry_after, attempts}`。
- **失敗（§7-3 の consecutive_failures）には数えない**。枠超過は正常系の待ちであり、breaker をトリップさせない。終了コード／標準エラーの判別ルール（「枠超過」 vs 「実エラー」）を watcher・launchd ジョブの共通関数に置く。
- `retry-after` を記録：レスポンスに retry-after 相当があればその時刻、無ければ既定の最小待機（例 §10.2 の初回バックオフ）を入れる。
- **通知は低優先**：保留は §3 digest の「ブロッカー」段ではなく**進行中（待ち）扱いの低優先**で出す（🔴 承認待ちと混同させない）。承認待ち（`GATE:human`）の即時 push とは別扱い＝通知疲れ防止（§3.1 差分通知に従う）。

### 10.2 自動復帰（次ポーリングで再評価・指数バックオフ・同時GPT≤3厳守）
- launchd の各巡回（§5）で、scan は `held_rate_limit` を**再評価**する：`now >= retry_after` の保留のみ再起動候補にする。
- **指数バックオフ**：再起動がまた枠超過なら `attempts++` し、待機を指数的に伸ばす（例 初回10分→20→40→上限60分でクリップ）。同一チケットの暴走再試行を防ぐ。
- **同時GPT ≤3 を復帰時も厳守**（§6.2・§7-2）：枠が回復しても保留分を一斉起動せず、空きスロット数ぶんだけ拾う。**MAGI審査中は Codex Worker=1** の絞り込みも復帰時に適用。残りは次巡回へ。
- 復帰に成功したら `held_rate_limit` から外し、STATE/OWNER は通常の判定ロジック（§2.2）へ戻す。`GATE:human`／`LEVEL:重大` の案件は**復帰しても自動進行しない**（保留解除＝起動可能になるだけで、人間承認の要否は変わらない）。

### 10.3 Ollama 退避（枠逼迫時、整形/要約は無枠へ自動リルート）
- 枠が逼迫（GPT/Claude の保留が発生 or 残量警告）した局面では、**整形・要約・md清書・差分の人間可読化など「意味を変えない軽作業」を Ollama（ローカル・無枠）へ自動リルート**する。`circuit.ollama_reroute=true` を立てる。
- **Ollama は整形系＝Auditor 無し**（外注スケール方針）。**社長室が意味不変照合**を行う前提を崩さない。リルート対象は Tier2 かつ意味不変の作業に限り、**判断・設計・受入査読・統合・審査は対象外**（これらは購読枠の回復を待つ＝「急がない」哲学§9）。
- Ollama 退避は §0 方針3（`GATE:auto`＝Tier2軽微のみ）の範囲内。Tier0/1 データは Ollama にも渡さない（ローカルでも本設計の防火壁 PROTECTED を適用）。

### 10.4 Antigravity フォールバック（MAGI 一人格スロットル時の ESCALATE／代替）
- MAGI 改訂案＝CASPER(Claude)＋GPT/Codex＋**Antigravity/Gemini3**（GPT2人格の片方を置換する案）。Antigravity は無料（Individual・公開プレビュー・APIキー不要）だが**プレビュー＝週次クォータ／作業量課金／料金変動リスク**を抱える。**この MAGI 構成変更は契約 第14条「重大」＝次 tpr 審査＋Sota承認が必要**（本書では「確定」ではなく改訂案／予定として記す）。
- 可用性担保は **2/3 合議＋スロットル時フォールバック**：MAGI の一人格がスロットル（クォータ枯渇・レート制限・プレビュー停止）で票を返せない場合、`circuit.magi_fallback` にその観点を記録し、以下のいずれかへ落とす。
  - **ESCALATE**：3観点が揃わない＝合議不成立として `verdict.md` を確定させず、社長室経由で **Sota へエスカレ**（`GATE:human`）。重大寄りの案件はこちらを既定とする。
  - **代替**：軽微・期限優先の案件に限り、残る2観点での合議＋「1観点欠」を明記した暫定 verdict を出し、復帰後に再審査する（暫定であることを必ず明示）。
- いずれも**票の捏造・自動補完はしない**（品質ゲートの省略禁止＝§9）。スロットルは §10.1 同様「失敗」ではなく可用性事象として扱い、breaker はトリップさせない。

### 10.5 Watcher 権限と Tier/GATE 写像（誰に・何を・自動でよいか）
watcher（§6）と launchd ジョブ（§5）が**自動で起動・前進してよい範囲**を、Tier と GATE で一意に写像する。これを越える起動は禁止。

| 区分 | Tier | GATE | watcher/launchd の権限 |
|---|---|---|---|
| 軽微（整形・テスト・差分照合・md清書・ダミーデータ整形） | Tier2 | `auto` | **自動実行可**（codex exec / Ollama 退避 / claude -p 軽量整形）。同時≤3・保留復帰・各ブレーカの制約内。 |
| 中規模 | Tier2 | `human`（既定）/ 例外的に `auto` は社長室が個別付与 | **承認ゲート**。watcher は通知のみ。社長室の受入査読・diff照合・統合は無人化しない。 |
| 重要・Tier1（情報共有が Tier1 に達する遷移を含む） | Tier1 | `human` | **自動起動・自動前進を禁止**。Sota承認待ちで停止（§7-1）。 |
| 重大（契約 第14条） | — | `human` | **禁止**。センチネルが揃っても自動進行しない（§1.2末尾・§7-1）。 |

- 原則：**`GATE:auto` ＝ Tier2 かつ軽微のみ**。中〜重要・Tier1 は承認ゲート（=`GATE:human`）。重大は常に人間停止。これは §0 方針2/3 の機械写像であり、緩めない。
- Ollama 退避（§10.3）は Tier2 かつ意味不変に限り `auto`。Antigravity 等の MAGI 一人格（§10.4）はそもそも審査＝重要工程ゆえ、スロットル時は ESCALATE/代替で人間判断へ寄せる。

### 10.6 「自動化・搬送レイヤー附則」の位置づけ（要・契約第14条＝次tpr）
- 移行先の共有ワークスペース（`MyWorkSpace/KIBI/{Internal,External,ThirdParty,Contracts}`）では、従来は別リポジトリ／別マシンで物理的に隔てていた **Internal／External の壁が、同一ワークスペース内の「ポリシー壁」へと性質を変える**。物理的隔離が薄まるぶん、誰が何を読み書きでき、**Watcher（自動搬送）が誰に何を渡してよいか**を明文化する必要が高まる。
- すなわち本 §10 が定める自動化・搬送（scan→notify→watcher→codex exec/claude -p/Ollama、保留・復帰・フォールバック）は、契約 別紙A（書き込み権）・第16条（情報保護）・第18条（範囲外編集）の上に**搬送レイヤーの規律**を重ねる位置づけになる。具体的には「Watcher がスナップショット供給（`security-policy.md`）を越えて Internal 正本を External へ渡さないこと」「保留・退避・フォールバックの判断ログを残すこと（§7-8）」を附則として固める。
- **この附則の制定＝運用モデル＋情報の流れの変更＝契約 第14条「重大」**。よって正式採択は**次 tpr の独立審査＋Sota承認**を要する（§8 P3 完了条件④と同じ扱い）。本 v0.3 は附則の**必要性と骨子の提示**に留め、条文化は tpr 審査に付す。

---
## 付記：本書が依存する Sota判断・設定（§Open Questions 連動）
- Tunnel公開の可否とアクセス制御（情報保護）／launchd常駐の許可／同時GPT上限の数値確定／承認台帳の置き場と単一書き手の整理／Slackインタラクティブ（上位案）採否。詳細は IMPL の open_questions に列挙。
- （v0.3 追加）指数バックオフの初回/上限値の確定／Ollama 退避モデルと「意味不変」の判定基準・社長室照合の運用／MAGI 改訂案（Antigravity/Gemini3 採用＝第14条重大）の次 tpr 審査時期／§10.6「自動化・搬送レイヤー附則」の条文化（共有ワークスペース移行と同期して tpr に付す）。
