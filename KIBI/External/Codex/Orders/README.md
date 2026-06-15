# Orders ── 発注記録（ord-###）

1発注＝1フォルダ。フォルダ一式が監査証跡（文書類は削除・改変禁止）。様式＝`../../Contracts/forms.md`。

```
Orders/ord-NNN/
├── order/      # 書き手=社長室: order.md（発注書・ステータス行・共有情報）/ acceptance-criteria.md
├── inputs/     # 書き手=社長室: スナップショット（マスク済み資料・ダミーデータ）
├── work/       # 書き手=Worker: declaration.md / deliverables/ / selfcheck.md / changed-files.md / questions.md
├── audit/      # 書き手=Auditor: audit-report.md
└── decision/   # 書き手=社長室: answers.md / acceptance.md / integration.md
```

- ステータス（order.md 内・書き手=社長室のみ）：`発注済→着手→提出済→監査済→（審査中）→受入/条件付受入/差戻し→統合済→完了/中止`
- 1サブフォルダ＝1書き手。他者のサブフォルダへの書き込みは契約違反（`../../Contracts/master-agreement.md` 第12条）。
- 第三者審査が付く場合は `../../ThirdParty/Cases/tpr-NNN/` が対応する。
