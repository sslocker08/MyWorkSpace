> 起案中(draft)｜移行先: MyWorkSpace/_framework/ops/migration-runbook.md ｜ KIBI非依存の汎用テンプレ。インスタンスは継承し固有値は instance.config と各Contractsで具体化。

# 移行ランブック ── kibi-fragrance/KIBI → sslocker08/MyWorkSpace（不可逆・Sota承認後）

版：draft（2026-06-15 起案・社長室）。整合先：`Contracts/security-policy.md`（§6 Git安全・Tier・共有禁止）・`Contracts/_framework/ops/github-integration.md`（2リポジトリ）・`Contracts/_framework/ops/vscode-setup.md`（操作卓）。
位置づけ：現行の運用リポジトリ（`kibi-fragrance/KIBI`）を、新しい運用基盤リポジトリ（`sslocker08/MyWorkSpace` のインスタンス位置）へ安全に移す手順。

> **本手順は不可逆・最大の漏洩リスク。実行はSota承認後・Sotaの合図待ち。** 承認前は本書を「予定」として扱い、いかなる工程も実行しない。新規 `git init`（履歴引継ぎなし）で行うため、旧履歴は旧リポジトリ側にのみ残す。

---

## 0. なぜ「履歴引継ぎなし（新規init）」か

- 旧リポジトリには過去の運用記録が積み上がっており、**過去のどこかで不可侵領域や秘匿値が一瞬でも混入していた場合、履歴ごと引き継ぐと新基盤へ漏洩が持ち込まれる**。
- そこで**新規 `git init` でクリーンな起点**を作り、現時点の安全なファイルだけを最初のコミットに載せる。旧履歴は旧repo（アーカイブ）に保全し、監査が必要なら旧repoを参照する。
- これにより新基盤 `MyWorkSpace` は「秘匿物が一度も触れていない履歴」から始まる。

---

## 1. 移行先の構成（到達形）

```
MyWorkSpace/                      （ss.locker08 private・新規 git init）
├─ _framework/                    共有ツール・契約テンプレ・規約（KIBI非依存）
└─ KIBI/                          インスタンス1
   ├─ Internal/  External/  ThirdParty/  Contracts/
   └─ （Web実体は Internal/System を submodule 化＝§5）
```

- 将来案件は `MyWorkSpace/<別案件>/` の兄弟フォルダで増える。
- ダッシュボードは `instance.config`（部署／vendor＋型／MAGI構成）駆動で描画。

---

## 2. 事前準備（Sota承認・合図の取得）

1. **Sota承認の確認**：本移行は重大・不可逆。Sotaの明示承認と「実行してよい」合図を得る。得るまで以降の工程に進まない。
2. **作業の独立**：他の編集・自動化（Watcher等）を止め、移行中に新規変更が入らない静かな状態にする。
3. **移行先 repo の存在確認**：`sslocker08/MyWorkSpace`（private・作成済）を確認。public でないこと、コラボレータが意図通りであることを確認。
4. **バックアップ**：旧リポジトリのローカル作業コピーを別名で1部退避（読み取り専用の保険）。

---

## 3. 秘匿スキャン（移行の核心・絶対不可リストの遮断）

新基盤に**絶対に入れてはいけない**もの（`security-policy.md` §6・本書で再掲）：

- `.secrets/`（認証情報全件）
- `_Records/`（販売記録の正本・個人情報）
- `Kofukuron23/`（社長個人プロジェクト）
- `*.db`（大容量バイナリ・処方/原料知識DBの恐れ＝Tier1相当）
- `_knowledge/_data`（`Internal/Development/_knowledge/_data/` の調香知識データ）

手順：

1. **コピー段階で除外**：旧フォルダから新基盤の作業ツリーへファイルを移すとき、上記を**最初からコピーしない**（含めてから消すのではなく、入れない）。
2. **`.gitignore` を先に置く**：新基盤の作業ツリー直下に `.gitignore` を**最初のコミット前に**配置し、上記＋`Internal/System/`（submodule化）＋ローカル生成物（dashboard キャッシュ・`_pipeline.json`・`settings.local.json`・`node_modules/` 等）を除外（`security-policy.md` §6 の.gitignore正本に準拠）。
3. **パターンスキャン**：作業ツリー全体を鍵・トークンのパターンで走査（`sk-` `ghp_` `AIza` `pk_live` `sk_live` `BEGIN PRIVATE KEY` `password=` 等）。ヒットは除去または該当ファイルを除外し、記録する。
4. **不可侵パスの再確認**：`find` 等で `.secrets`・`_Records`・`Kofukuron23`・`*.db`・`_knowledge/_data` が作業ツリーに**存在しないこと**を確認（存在＝即除外）。
5. **疑わしきは入れない**：Tier判定に迷うファイルは新基盤に入れず、Sotaへエスカレーション。

---

## 4. 新規 git init と初回コミット

1. 新基盤の作業ツリー（秘匿スキャン済・§3完了）で `git init`（**旧 `.git` は持ち込まない**＝履歴引継ぎなし）。
2. **`.gitignore` 再適用を確認**してから `git add`。ステージ後、`git status` で不可侵領域・秘匿値が**1件も含まれない**ことを目視確認。
3. コミット前チェック（`github-integration.md` §4・`security-policy.md` §6）を再実行：共有禁止リスト該当なし＋パターンスキャンクリアを確認。
4. 初回コミット（メッセージ例：「MyWorkSpace 初期化（クリーン起点・履歴引継ぎなし）」）。
5. リモート origin を `sslocker08/MyWorkSpace`（private）に設定し push。**public でないことを push 前後で再確認**。

---

## 5. Internal/System を submodule 化（Webサイト分離）

- Webサイト実体（`Internal/System/` 相当）は**別リポジトリ `kibi-fragrance`**で版管理し、新基盤からは **submodule** として参照する（`github-integration.md` §1・§3）。
- `MyWorkSpace` 本体には submodule の**参照（gitlink）だけ**が入り、Webのソース実体や履歴は本体履歴に混ざらない。
- `.gitignore` で `Internal/System/` を素のディレクトリとしては追跡しない（submodule 経由のみ）。重複コピー（`External/Auditor/System/` 等）は持ち込まない。

---

## 6. 移行後の旧リポジトリ アーカイブ

1. **検証完了まで旧repoは消さない**：新基盤で席が開け、boards/dashboard が描画でき、ord/tpr 参照が通ることを確認するまで旧repoを保持。
2. 検証後、旧 `kibi-fragrance/KIBI` を**アーカイブ（読み取り専用化）**：新規commit不可・参照のみ可とし、過去履歴の監査用に保全。
3. 旧repoを操作卓の作業対象から外す（VS Codeで開かない・origin を取り違えない）。
4. 旧repoの公開設定・削除可否はSota判断（**この手順では削除しない**）。

---

## 7. 実行チェックリスト（Sota承認後に上から順に）

- [ ] Sota承認・実行合図を取得した（未取得なら以降すべて中止）
- [ ] 移行中は他の編集・自動化を停止した
- [ ] `sslocker08/MyWorkSpace` が private・コラボレータ正しいことを確認した
- [ ] 旧リポジトリのバックアップを1部退避した
- [ ] `.secrets/ _Records/ Kofukuron23/ *.db _knowledge/_data` を作業ツリーに**入れていない**
- [ ] `.gitignore` を初回コミット前に配置した（不可侵＋Internal/System＋生成物）
- [ ] 鍵・トークンのパターンスキャンを実行し、ヒットを除去・記録した
- [ ] `find` 等で不可侵パスが作業ツリーに存在しないことを確認した
- [ ] `git init`（旧 `.git` 非持込）→ `git add` → `git status` で混入ゼロを目視した
- [ ] 初回コミット → private origin へ push（public でないことを再確認）
- [ ] `Internal/System` を submodule 化した（実体・履歴は本体に混ぜない）
- [ ] 新基盤で席が開け、boards/dashboard 描画と ord/tpr 参照を検証した
- [ ] 検証後に旧repoをアーカイブ（読み取り専用化）し、操作卓から外した
- [ ] 各工程の除外・スキャン結果を記録に残した

---

## 8. このテンプレの具体化（インスタンス側）

- インスタンス名（例：`KIBI/`）・submodule のWeb repo URL／パス・除外対象の具体パスは各インスタンスの `instance.config` と `security-policy.md` を正とする。
- 絶対不可リストはインスタンスのTier定義に従い増減し得る（追加・解除はSota承認のうえ各Contractsを改訂）。
