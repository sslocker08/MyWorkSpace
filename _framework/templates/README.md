> 起案中(draft)｜移行先: MyWorkSpace/_framework/templates/ ｜ KIBI非依存の汎用テンプレ。

# _framework / templates ── 契約・様式テンプレ（継承元）

各インスタンスの `Contracts/` が継承する**汎用テンプレ**の置き場。運用契約書・役割定義・情報保護方針・様式集の「案件非依存の骨格」をここに一度だけ定義し、インスタンス側は固有値（部署／委託先／MAGI構成／しきい値）だけを上書きする。

**現状（移行前）**：テンプレの参照実装は KIBI の `Contracts/` 各文書（`master-agreement.md`／`role-definitions.md`／`security-policy.md`／`forms.md`）が事実上担っている。汎用テンプレ化（KIBI固有値の差し込み点を抽象化）は移行時（`ops/migration-runbook.md`）に実施する。それまで本ディレクトリは**継承元の所在を示すスタブ**。
