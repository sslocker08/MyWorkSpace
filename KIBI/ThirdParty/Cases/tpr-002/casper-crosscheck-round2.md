# CASPER-3 クロスモデル検証 & verdict集約準備 ── tpr-002 round-2

- 種別: **クロスモデル検証（README§1：CASPER担当）＋ verdict即時集約の準備**。verdict（合議成立）ではない。
- 検証者: CASPER-3（Claude）。対象: round-2 snapshot（commit 40d68cb）と evidence のみ。snapshot外は参照しない。
- 位置づけ: GPT2人格（MELCHIOR/BALTHASAR）のround-2は未着。本書は、それが揃った時点で**verdict集約を即時化**するための、Claude側独立検証の記録。自己申告（REMEDIATION/request）は鵜呑みにせず実コードで照合した。
- 日付: 2026-06-13 JST。

---

## 1. round-1で残っていた技術所見の閉塞確認（Claude独立検証）
| 所見 | round-1状態 | round-2 実コード確認 | 判定 |
|---|---|---|---|
| **T2-002** api-orders 在庫/CAS乖離 | 要修正 | add/delete/update の3経路とも**販売記録CAS成功(ok&&matched)を確認後に在庫増減**。CAS失敗(409)/対象なし(404)は在庫不変。在庫数量は置換実レコードから確定（stale snapshot非依存）。`api-orders.js:111-232` | **CLOSED（コード上）** |
| **T2-003** Stripeイベント齟齬 | 要修正 | `stripe-webhook.js` が7イベント処理: completed/expired/charge.refunded/payment_intent.payment_failed/**canceled(483)**/async_payment_failed/**charge.dispute.created(549)** | **CLOSED（コード上）** |
| **T2-004** URL未設定で本番fallback | 要修正 | `security.js getCanonicalBaseUrl()` は `URL` 未設定で**null返却**、本番(CONTEXT=production)非httpsもnull＝B-001と方針統一 | **CLOSED（コード上）** |
| **M-003** 文書がcanceledを「未実装」と後退 | 要修正 | `TPR-001_ADMIN_ACTIONS.md:205` がcanceledを「実装済み(483)」へ訂正＋購読6件に明記。disputeはlog/notifyのみ＋Sota方針ゲート | **CLOSED（文書整合）** |
| **B-004/009/010/011 クライアント** | UNVERIFIED（供給不足） | `diff-assets.patch` で独立確認（詳細は casper.md round-2 §C-001） | **VERIFIED（経営/UX観点で健全）** |

## 2. クロスモデルで検出した論点
- **X-1 ── 撤回（WITHDRAWN・2026-06-13）**: 当初「`api-delete-account.js` の削除確認メールURLが `getCanonicalBaseUrl()` 未統一」と指摘したが、これは**round-1スナップショット（commit 003ee82）の読みに基づく誤り**だった。round-2実コード（`api-delete-account.js:199-206`）を再確認した結果、`security.getCanonicalBaseUrl()` を使用し、未解決時は**本番のみ既知ドメインへfallback／非本番はthrow→500（fail-closed）**で、B-001/B-017/T2-004の方針と統一済み。**BALTHASAR-2 round-2の「T2-004 CLOSED」が正しい**。本フラグは取り下げる（証跡として撤回理由を残す）。

## 3. verdict（合議）集約の準備 ── 判定ツリー
> 本書は verdict.md を**まだ作らない**（合議は3人格round-2が揃って成立。契約 第9条）。下表は、GPT2人格のround-2判定が出た瞬間に集約を即時化するための事前整理。**CASPER票は確定済み**。

- **CASPER-3（確定）**: `APPROVE_WITH_CONDITIONS`（＋ESCALATE_TO_HUMAN: C-002/C-003）
- 集約規則: 2/3で成立、`ESCALATE_TO_HUMAN`は**1票で成立**（既にCASPERが保持＝**verdictには必ずESCALATE論点が載る**）。

| BALTHASAR-2 r2 | MELCHIOR-1 r2 | 合議結果（CASPER=AWCと合わせ） |
|---|---|---|
| APPROVE / AWC | APPROVE / AWC | **APPROVE_WITH_CONDITIONS 成立**（3/3が承認系）→ Sota承認ゲートへ。下記条件必須 |
| APPROVE / AWC | RETURN_TO_CLAUDE | 1票RETURN。承認系2/3だが、MELCHIOR差し戻し事由（網羅性）を条件化して**AWC成立**か、事由が重大ならHOLD。要事由精査 |
| RETURN_TO_CODEX | APPROVE / AWC | 同上（BALTHASAR差し戻し事由＝X-1等の技術閉塞次第） |
| RETURN | RETURN | **RETURN成立（デプロイ不可）**＝round-1同型。再是正→round-3 |

- **いずれの承認系でも持ち越す条件（CASPER由来）**:
  1. **[ESCALATE｜C-002]** 公開Privacy Policy本文をLegal/Sotaが実装へ整合（削除権・保持境界・端末保存・バックアップPII失効・オンサイトCookie同意）。デプロイ前必須。
  2. **[ESCALATE｜C-003]** fail-open(B-005)/Turnstile(B-008)/多言語SEO(B-011)/DNS・メール(B-014)の方針決定（デプロイと独立）。
  3. **[C-004]** 段階デプロイ＋残CASライター（survey/shipping-notify/delete-account）統一の次フォロー起票。
  4. デプロイ時 本番 `URL`・`DELETION_HMAC_SECRET` 設定確認（B-001/004/017前提）。
- **BALTHASAR/MELCHIOR round-2 が見るべき残点**（CASPERからの申し送り）: X-1（§2）／T2-002〜004の実コード閉塞の最終確認／網羅性（提案のみ項目=Turnstile・DNS・保持値の取りこぼし有無）。

## 4. CASPERが今できることの完了状況
- [x] casper.md round-2（経営・思想判定）
- [x] casper-advisory-contract.md（契約整備の勧告）
- [x] 本書（クロスモデル検証＋verdict集約準備）
- [x] **verdict.md round-2**（集約）＝3人格APPROVE_WITH_CONDITIONSで成立。本書§3ツリーどおりCASPERが直接集約（Sota決定の新運用）。

---
*CASPER-3｜KIBI-MAGI（中立審査）｜2026-06-13 JST｜クロスモデル検証・勧告のみ。実装/承認権なし。*
