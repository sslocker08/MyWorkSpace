# MELCHIOR-1 事前準備メモ tpr-002

- 状態: 待機（正式審査前）
- 作成日: 2026-06-13 JST
- 人格: MELCHIOR-1（仕様観点・GPT）
- 対象候補: 未確定。現時点で確認できるExternal Orderは `ord-001` のみ。
- ID表記: 正式様式は `tpr-NNN`。`trp-002` 表記は `tpr-002` に正規化する。

## 0. このメモの扱い
- 本メモは正式な第三者審査レポートではない。
- 判定は出さない。`Cases/tpr-002/inbox/request.md` が社長室から置かれ、対象成果物が揃った後に `melchior.md` を作成する。
- MELCHIORは `inbox/` を書かない。依頼書・投入資料・共有記録の作成者は社長室。
- 実装・修正・統合は行わず、仕様照合と勧告のみ行う。

## 1. 発行前の未充足条件
| 条件 | 現状 |
|---|---|
| `Cases/tpr-002/inbox/request.md` | 未設置 |
| 審査対象Order | 未確定 |
| Orderステータス | `ord-001` は準備中（発注前） |
| Worker成果物 | `ord-001/work/` に未設置 |
| Worker自己点検 | 未設置 |
| 変更ファイル一覧 | 未設置 |
| Codex内部監査 | 未設置 |
| ThirdParty投入資料の共有記録 | 未設置 |

## 2. 受領時に確認する資料
- `Cases/tpr-002/inbox/request.md`
- 対象 `External/Orders/ord-NNN/order/order.md`
- 対象 `External/Orders/ord-NNN/order/acceptance-criteria.md`
- 対象 `External/Orders/ord-NNN/inputs/` 一式
- 対象 `External/Orders/ord-NNN/work/declaration.md`
- 対象 `External/Orders/ord-NNN/work/changed-files.md`
- 対象 `External/Orders/ord-NNN/work/selfcheck.md`
- 対象 `External/Orders/ord-NNN/work/deliverables/` 一式
- 対象 `External/Orders/ord-NNN/audit/audit-report.md`
- 必要に応じて `Contracts/charter-public.md`、`Contracts/role-definitions.md`、`Contracts/master-agreement.md`

## 3. MELCHIOR観点の審査順
1. 依頼書の整合確認
   - 対象Order、変更区分、基準文書、社長室の論点が明記されているか。
   - `tpr-002` と対象Order番号の対応が一意か。
2. 発注書との照合
   - 作業内容、対象範囲、範囲外、受入基準、第三者審査指定が矛盾していないか。
   - 発注ステータスが審査可能段階まで進んでいるか。
3. 受入基準との照合
   - 各基準の検証方法が実行可能か。
   - Worker自己点検の申告と実体が一致するか。
4. 変更範囲の照合
   - `changed-files.md` と実ファイルが一致するか。
   - 成果物が許可範囲外に出ていないか。
5. 仕様逸脱の確認
   - 独自仕様、未依頼機能、外部依存、入力資料外の前提、文体逸脱がないか。
6. 内部監査との照合
   - Codex内部監査が仕様・差分・品質・範囲外編集を実質的に確認しているか。
   - 監査の見落としがあれば、社長室に差し戻しまたは条件付き受入を勧告する。

## 4. `ord-001` が対象になった場合の重点
- CLI名・配置が発注書どおり `work/deliverables/status-lint.js` か。
- 外部依存なしでNode.js標準モジュールだけを使っているか。
- 規則がR1〜R7のみで、独自規則や自動修正機能を追加していないか。
- 既知違反10件を過不足なく検出するか。
- 正常見本で終了コード0、違反ありで終了コード1になるか。
- 出力形式が `ファイル:行: 規則ID: 内容` に一致するか。
- 実装が `inputs/` 外の社内資料や実データを前提にしていないか。

## 5. 審査レポート雛形
```markdown
# MELCHIOR-1 審査 tpr-002
- 判定: APPROVE / APPROVE_WITH_CONDITIONS / RETURN_TO_CODEX / RETURN_TO_CLAUDE / ESCALATE_TO_HUMAN / REJECT
- 対象: External/Orders/ord-NNN/
- 観点: 仕様照合（発注書・受入基準・範囲外編集・変更一覧と実体）

## 所見
- 発注書との一致:
- 受入基準の充足:
- 変更範囲:
- 自己点検・内部監査との整合:
- 未確認:

## 勧告
- 

## Sotaへ上げる論点
- なし / あり:
```

## 6. 現時点のMELCHIOR待機宣言
- 正式依頼が置かれるまで審査判定は保留。
- `inbox/` 作成・依頼書作成・Order状態更新は社長室側の作業。
- MELCHIORは依頼受領後、仕様観点に限定して独立検証する。
