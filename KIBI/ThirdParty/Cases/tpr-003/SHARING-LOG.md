# 情報共有ログ ── tpr-003（契約 第16条・第20条7項｜security-policy §3）

書き手＝社長室。Internalガバナンス監査のため**統治文書のみ**を3人格へ供給する判断の記録。Sota承認＝2026-06-13（tpr-003発行指示）。

## 1. 共有の必要性と最小化
- 目的＝三社体制の設計・契約・運用規程の整合性監査。組織の「設計」を見ないと監査不能。
- ただしInternalはTier1機密の塊。**運用データ・実数・処方・戦略は渡さず、統治文書（規程の設計）のみ**に絞る（第20条7項の最小共有）。

## 2. 内部監査ゲート（社長室が共有前に実測）
| 確認 | 結果 |
|---|---|
| Secret実値（sk_/whsec_/AIzaSy/AKIA/PRIVATE KEY 20字以上） | ゼロ（`BEGIN PRIVATE KEY` はsecurity-policyの走査パターン例示＝benign） |
| 財務実数（製造原価・損益分岐・粗利の数値） | decisions.md dec-013 の `¥3,100/78.3%` 等を**マスク済み**（`[Tier1財務実数につきマスク]`） |
| 処方ヒント（賦香率・原料名）/status実データ | **各部署CLAUDE.md・status/・boards実データを除外**（散在Tier1のため） |
| 公開情報（上代¥14,300等） | Tier3＝公開済みのため許容 |

## 3. 共有したもの（snapshot/・25ファイル）
- Contracts/全文（master-agreement・requirements-definition・role-definitions・security-policy・forms・charter-public・locks・changelog・README）
- Internal/CLAUDE.md（社長室/全社ガイド）
- Internal/Secretary/rules/（operations・review-gate・coordination-spec・model-policy）・templates/・decisions.md（財務マスク済み）
- External/ThirdParty 規約（AGENTS・README）

## 4. 共有しないもの（Tier0/Tier1）
- 各部署CLAUDE.md（原価言及・処方ヒントが散在）／status実データ・boards実データ／Finance実数・原価表／処方・原料／未公開戦略・ブランド構想正本（brand_concept等）／`_Records/`・`.secrets/`・`Kofukuron23/`。
- ※役割レベルの監査が必要になった場合は、各部署CLAUDE.mdのマスク版を後続で供給（別Sota承認）。

## 5. 役割終了後の扱い（security-policy §5）
- tpr-003クローズ時に `inbox/snapshot/` を削除（レポート `<persona>.md`・`verdict.md`・本ログ・request.md は証跡保持）。

## 6. 走査・削除記録
- 2026-06-13 格納時走査＝実Secret 0／財務実数マスク済／部署CLAUDE.md・status実データ非含有を確認。snapshot=25ファイル。
- 削除記録：（クローズ時に追記）
