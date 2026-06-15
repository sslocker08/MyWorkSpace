# MELCHIOR-1 審査 tpr-002 round-2

- 判定: **APPROVE_WITH_CONDITIONS**
- 対象: `tpr-001` 是正後 snapshot round-2（branch `security/tpr-001` / commit `40d68cb` と申告）
- 観点: 仕様照合（round-1差し戻し原因、B-001〜B-017網羅、T2-002/T2-003/T2-004/M-003追加是正、契約v0.2反映）
- 位置づけ: round-1 `melchior.md` は証跡として保持し、本書をround-2追補とする。

## 0. 契約更新の確認
- `master-agreement.md` は v0.2（2026-06-13 / dec-020）で External 多重委託化へ改訂。
- 主変更は External の親領域化、`External/Codex/Orders/` へのパス読み替え、委託先ルーティング/二次受け規程の追加。
- MAGIの権限は変わらない。`ThirdParty/Cases/*/inbox` は読み取り、`ThirdParty/**` はレポート類のみ書き込み。実装・修正・統合は不可。
- tpr-002はExternal Orderではなく、社長室供給snapshotの再審査。契約v0.2による追加の妨げはない。

## 1. round-1差し戻し原因の解消
- 依頼書はround-2で `assets/js` と `diff-assets.patch` を追加供給したと明記。
- 実体確認: `snapshot/` は71ファイル。`assets/js/main.js`、`assets/js/analytics.js`、`utils.js`、`confirm.js`、`unsubscribe.js` が存在。
- diffstat掲載ファイルとsnapshot実体を照合し、欠落は0件。
- 提供された全JS（functions/edge/assets）はローカル `node --check` でも構文OK。

評価:
- round-1のブロッカー（M-001/M-002）は解消。
- ただし `snapshot/netlify/functions/.DS_Store` が混入。機密ではないが、共有パッケージからは除外すべき軽微条件。

## 2. 前回未確認だった項目

| ID | round-2確認 | MELCHIOR判定 |
|---|---|---|
| B-004 退会UI | `main.js` が `action:'request'` + Firebase IDトークンで削除申請し、確認リンク着地後 `action:'confirm'` 成功後にのみローカル/Firebase削除へ進む。 | **CLOSED** |
| B-009 localStorage配送先PII | 配送先保存は明示チェックボックス制。未同意時は保存せず既存値を削除。ログアウト時も削除。 | **MOSTLY_CLOSED**。旧保存値の即時移行/即時削除は条件。 |
| B-010 Analytics/CSP | 同意後のみ `/assets/js/analytics.js` を読み込み、GA/GTM初期化を外部JSへ分離。inline script生成は廃止。 | **CLOSED_WITH_TEST_CONDITION**。GA DebugView/Networkの3状態確認は本番前条件。 |
| B-011 SEO/JSON-LD | `list-ssr.js` + `ogp-rewrite.js` + `main.js` 側Product/Article二重注入抑止を確認。 | **MOSTLY_CLOSED**。トップページOrganizationの重複余地と多言語SEO方針は条件。 |

## 3. round-2追加是正の確認

| 指摘 | 確認 | MELCHIOR判定 |
|---|---|---|
| T2-002 api-orders整合単位化 | add/delete/update で販売記録CAS成功後に在庫を動かす順へ変更。CAS失敗時に在庫だけ動くround-1リスクは閉塞方向。 | **CLOSED** |
| T2-003 Webhookイベント整合 | `payment_intent.canceled` が実装され、`charge.dispute.created` はログ/通知/フラグ付けの人手確認扱い。`ADMIN_ACTIONS` も6イベント購読＋dispute別扱いへ更新。 | **CLOSED_WITH_OPERATIONS_CONDITION** |
| T2-004 非本番URL fail-closed | 会員確認/Newsletter/再入荷/削除確認リンクは、非本番で `URL` 未設定なら503または送信中止。本番URL誤送信の懸念は閉塞。 | **CLOSED** |
| M-003 管理者作業表 | fail-open表記、Stripeイベント表は現コードに概ね整合。 | **MOSTLY_CLOSED** |

## 4. 残条件

### 条件A: Sota/Legal判断
- `DELETE_RETAIN_SHIPPING_FIELDS` の値を確定する。
- 既定の全PII匿名化で運用するなら、削除文言との整合は概ね取れる。
- 住所等を会計目的で保持するなら、Privacy Policy本文、画面文言、バックアップ内PII失効方針を更新してから本番化する。

### 条件B: Checkout仮押さえのT2-001
- `create-checkout.js` は予約集計失敗時に「仮押さえなし」として続行し、予約保存失敗時もCheckout Sessionを返す。
- `ADMIN_ACTIONS` はこれをT2-001要対応として認識している。
- 本番デプロイ前に、Sotaが「現状で許容して段階対応」か「503 fail-closed/補償処理を先に入れる」かを明示する。

### 条件C: 運用証跡
- Stripe Dashboardで、実装済み6イベント（`checkout.session.completed` / `checkout.session.expired` / `charge.refunded` / `payment_intent.payment_failed` / `payment_intent.canceled` / `checkout.session.async_payment_failed`）を購読対象にする。
- `charge.dispute.created` は購読する場合、人手確認の運用責任者と処理手順を決める。
- 本番 `URL`、`DELETION_HMAC_SECRET`、`ALLOW_TOKEN_AUTH`、`CHECKOUT_RATELIMIT_FAILOPEN` の設定状態を確認する。

### 条件D: 実機確認
- B-004: 削除申請→確認メール→confirm→KIBI側削除成功後のFirebase削除、失敗時に先行削除しないこと。
- B-010: Cookie同意前/拒否後/同意後の3状態でGA/GTMネットワーク発火を確認。
- B-011: 商品/記事/一覧ページの初期HTMLとJSON-LD、二重注入の有無をステージングで確認。

### 条件E: 文書整合
- `ENV-VARS-INVENTORY.md` は `CHECKOUT_RL_*` と `CHECKOUT_RESERVE_*` を「提案のみ」ではなく、実コード参照ありの運用ノブとして整理する。
- `TPR-001_REMEDIATION.md` には古い記述（例: B-007購読イベントが3件のまま、B-005 fail-open要否表現）が残る。round-2状態に合わせて更新する。
- `snapshot` から `.DS_Store` を除外する。

## 5. 指摘別まとめ

| ID | MELCHIOR round-2判定 |
|---|---|
| B-001 | CLOSED。`URL`本番設定は条件。 |
| B-002 | MOSTLY_CLOSED。Webhook状態機械と失敗時非2xxを確認。技術残リスクはBALTHASAR領域。 |
| B-003 | MOSTLY_CLOSED。既定全匿名化は妥当。保持フィールド利用時はLegal/Privacy条件。 |
| B-004 | CLOSED。クライアント/サーバー接続を確認。 |
| B-005 | PARTIAL。レート制限・TTL・上限は実装、T2-001が残条件。 |
| B-006 | CLOSED。 |
| B-007 | MOSTLY_CLOSED。canceled追加で文書/コードは改善。Stripe購読設定が条件。 |
| B-008 | PARTIAL。fail-closedと上限は確認。Turnstileは未実装でSota判断。 |
| B-009 | MOSTLY_CLOSED。明示同意制を確認。旧localStorage値の扱いは条件。 |
| B-010 | CLOSED_WITH_TEST_CONDITION。 |
| B-011 | MOSTLY_CLOSED。多言語SEOと軽微なJSON-LD重複確認は条件。 |
| B-012 | PARTIAL。運用訓練/暗号化/削除後PII方針は条件。 |
| B-013 | CLOSED。 |
| B-014 | NOT_CODE。DNS/メール構成はSota作業。 |
| B-015 | CLOSED。 |
| B-016 | CLOSED。 |
| B-017 | CLOSED。非本番fail-closedを確認。本番 `URL` 設定は条件。 |

## 6. 勧告

- MELCHIOR観点では、round-2は本番デプロイ判定へ進める水準に達した。
- ただし、上記条件A〜EをSota承認ゲートで明示し、条件未充足のまま `netlify deploy --prod` へ進まないこと。
- 合議判定はround-1 `verdict.md` のままでは古い。BALTHASAR/CASPERのround-2結果と本書をもとに、新しい `verdict` を作成すること。

## 7. Sotaへ上げる論点
- PII保持範囲とPrivacy/バックアップ失効の整合。
- Checkout T2-001をデプロイ前に直すか、条件付きで段階対応にするか。
- Turnstile導入時期、DNS/メール送信構成、多言語SEO方針。
- 本番環境変数とStripe購読イベントの確認。
