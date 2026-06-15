# KIBI 三社体制 様式集（forms）

版：v1.0（2026-06-12）。各様式はコピーして使う。パス表記はKIBIルート相対。IDは小文字。

## §1 発注書（order.md｜書き手=社長室）
```markdown
# 発注書 ord-NNN：〈件名〉
- ステータス: 発注済   <!-- STATE: 発注済 LEVEL: 中規模 GATE: auto -->  <!-- 発注済→着手→提出済→監査済→（審査中）→受入/条件付受入/差戻し→統合済→完了/中止。書き手=社長室のみ -->
- 発注日: YYYY-MM-DD ｜ 依頼元部署: 〈HQ/部署〉 ｜ 変更区分: 軽微/中規模/重大
- 目的: 〈1-3行。なぜやるか〉
- 作業内容: 〈箇条書き。何を作るか・どこまでやるか〉
- 対象範囲（編集してよい場所）: External/Codex/Orders/ord-NNN/work/ のみ
- 範囲外（してはならないこと): 仕様の独自変更／inputs外の資料要求／範囲外ファイル生成
- 受入基準: acceptance-criteria.md 参照
- 期限目安: YYYY-MM-DD（なければ「-」）
- 第三者審査: 要/不要（中規模以上は原則要）

## 投入資料チェック（security-policy §3）
| 投入ファイル（inputs/内） | 元（参考） | Tier | マスキング |
|---|---|---|---|
| | | 2 | 済/不要 |

## 共有情報の記録
- 外部AIに渡した範囲: 上表のとおり（追加投入があれば行を追記）
- Tier1例外共有: なし／あり（Sota承認記録: 〈日付・経路〉）

## ロック
- 凍結したInternal側ファイル: 〈Contracts/locks.md の行ID〉／なし
```

### 機械可読マーカー（自動化の規約｜書き手=社長室）
ステータス行の末尾に、人にも機械にも読める1行 `<!-- STATE: .. LEVEL: .. GATE: .. -->` を必ず添える（`orders-scan.js` が走査して「次に誰の番か」を判定する。設計＝`automation-design-draft.md` §1）。
- **STATE**（案件の現在地。書き手＝社長室のみ・単一書き手）: `発注済｜着手｜提出済｜監査済｜審査中｜受入｜条件付受入｜差戻し｜統合済｜完了｜中止`（発注前は `準備中` 可）。
- **LEVEL**（変更区分。上の「変更区分」と一致させる）: `軽微｜中規模｜重大`。
- **GATE**（自動進行の可否）: `auto`＝自動段で前進可／`human`＝**人間（Sota）承認なしに次へ進めない**。決済・認証・個人情報・本番デプロイ・契約/憲章変更・外部AIへの大規模共有・`LEVEL: 重大` は必ず `GATE: human`（サーキットブレーカ＝automation-design-draft §5）。
- 進行の物理的な合図は各サブフォルダの**センチネルファイル**で表す（書き手＝所有者のみ）: `work/.WORKER_DONE`・`audit/.AUDITOR_DONE`・`decision/.INTEGRATED`、審査側は `ThirdParty/Cases/tpr-NNN/.VERDICT_READY`（または `verdict.md` の存在）。STATE行とセンチネルが食い違う場合、`orders-scan.js` はセンチネル（より新しい合図）を優先して次工程を示す。

## §2 受入基準（acceptance-criteria.md｜書き手=社長室）
```markdown
# 受入基準 ord-NNN
| # | 基準 | 検証方法 |
|---|---|---|
| 1 | 〈機能・品質の合格条件〉 | 〈どう確かめるか〉 |
- 共通基準: 範囲外編集ゼロ／changed-files.md と実差分の一致／外部依存の無断追加なし／簡潔体
```

## §3 着手宣言（work/declaration.md｜書き手=Worker）
```markdown
# 着手宣言 ord-NNN
- 宣言日: YYYY-MM-DD ｜ 担当: Codex Worker
- 発注書の理解: 〈1-3行で要約。解釈に不安があれば questions.md へ〉
- 作業予定: 〈手順の概略〉
- 変更予定ファイル: work/deliverables/ 配下の一覧（予定）
- 既存構造を変更する場合の理由: 〈該当時のみ〉
```

## §4 質疑（work/questions.md=Worker ／ decision/answers.md=社長室）
```markdown
| Q# | 日付 | 質問（Worker） |
|---|---|---|
| q-001 | | |
```
```markdown
| Q# | 日付 | 回答（社長室） |
|---|---|---|
| q-001 | | |
```

## §5 自己点検レポート（work/selfcheck.md｜書き手=Worker）
```markdown
# 自己点検 ord-NNN
- 実施内容の要約: 〈3-5行〉
- 受入基準セルフチェック: | # | 結果(○/×/未確認) | 根拠 |
- 既知の制限・残課題: 〈正直に。未確認は「未確認」と書く〉
- 範囲外編集: なし（あれば即申告）
- 提出後、work/ は凍結（差し戻しまで編集しない）
```

## §6 変更ファイル一覧（work/changed-files.md｜書き手=Worker）
```markdown
# 変更ファイル一覧 ord-NNN
| パス（work/deliverables/内） | 新規/変更/削除 | 概要 |
|---|---|---|
```

## §7 内部監査レポート（audit/audit-report.md｜書き手=Codex Internal Auditor）
```markdown
# 内部監査 ord-NNN
- 判定: ACCEPTABLE / ACCEPTABLE_WITH_MINOR_FIXES / NEEDS_REVISION / REJECT
- 発注照合: 〈発注内容と成果物の一致・乖離〉
- 差分確認: 〈changed-files と実差分の突合結果〉
- 品質: 〈テスト可能性・保守性・既存構造との整合〉
- 範囲外編集: なし/あり（詳細）
- 自己点検の妥当性: 〈過大申告・漏れの有無〉
- 修正依頼案: 〈NEEDS_REVISION 時〉
```

## §8 受入判定＋自己監査チェック（decision/acceptance.md｜書き手=社長室）
```markdown
# 受入判定 ord-NNN
- 最終判定: ACCEPT / ACCEPT_WITH_CONDITIONS / RETURN_TO_CODEX / REQUEST_THIRD_PARTY_REVIEW / ESCALATE_TO_SOTA / HOLD / REJECT
- diff照合: 一致/不一致（不一致なら即差戻し＋違反記録）
- 受入基準の充足: 〈基準ごとに○×〉
- 差し戻し理由: 〈該当時〉

## 自己監査チェック（兼任内部監査・契約第6条）
- 判定: VALID / VALID_WITH_CONCERNS / NEEDS_REDESIGN / ESCALATE_TO_SOTA
- ①発注は曖昧・過剰・危険でなかったか: 
- ②機密の投入は最小・マスク済みだったか: 
- ③憲章・Sota意図からの逸脱はないか: 
- ④Codex成果物を過信していないか（独立検証したか）: 
- ⑤第三者審査を不当に省略していないか: 
```

## §9 統合記録（decision/integration.md｜書き手=社長室）
```markdown
# 統合記録 ord-NNN
- 統合日: YYYY-MM-DD ｜ 統合先: 〈Internal側パス〉
- ロック解除: locks.md 行〈ID〉を解除
- 投入データの削除（security-policy §5）: 削除した/保持（理由）
- レビュー関門: HQ成果物表に提出済（タスクID: tsk-hq-NNN）
```

## §10 第三者審査依頼（Cases/tpr-NNN/inbox/request.md｜書き手=社長室）
```markdown
# 審査依頼 tpr-NNN（対象: ord-NNN）
- 依頼日: YYYY-MM-DD ｜ 変更区分: 中規模/重大
- 審査対象: External/Codex/Orders/ord-NNN/ 一式
- 基準文書: Contracts/charter-public.md・acceptance-criteria.md・role-definitions.md・master-agreement.md
- 論点（社長室の認識）: 〈MAGIはこの枠を超えて指摘してよい〉
```

## §11 第三者審査レポート（Cases/tpr-NNN/〈melchior|balthasar|casper〉.md＋verdict.md）
```markdown
# 〈MELCHIOR-1|BALTHASAR-2|CASPER-3〉審査 tpr-NNN
- 判定: APPROVE / APPROVE_WITH_CONDITIONS / RETURN_TO_CODEX / RETURN_TO_CLAUDE / ESCALATE_TO_HUMAN / REJECT
- 所見: 〈観点別。社長室の依頼内容もCodexの自己申告も独立検証する〉
- 勧告: 〈条件・修正勧告・エスカレーション論点〉
```
```markdown
# 合議判定 tpr-NNN（verdict.md）
- 結果: 〈3票の集計。2/3で成立、ESCALATE_TO_HUMANは1票で成立〉
- 条件・勧告の統合: 
- Sotaへ上げる論点: なし/あり（内容）
```
