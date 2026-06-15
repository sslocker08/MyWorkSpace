> 起案中(draft)｜移行先: MyWorkSpace/_framework/ops/github-integration.md ｜ KIBI非依存の汎用テンプレ。インスタンスは継承し固有値は instance.config と各Contractsで具体化。

# GitHub連携 ── 2リポジトリの使い分けと運用（永続化＋監査ログ）

版：draft（2026-06-15 起案・社長室）。整合先：`Contracts/security-policy.md`（§6 Git安全規程・Tier）・`Contracts/_framework/ops/migration-runbook.md`（移行）・`Contracts/_framework/ops/vscode-setup.md`（操作卓）・`Contracts/automation-design-draft.md`（自動化はローカル計算・hostedランナー不可）。
位置づけ：運用基盤（MyWorkSpace）とWebサイト（kibi-fragrance）の**2リポジトリ**をどう分け、どう認証し、commit/pull をどう回すかの初心者向け手順。**GitHubは永続化と監査ログの置き場であって、計算の場ではない**（hostedランナーはAPI課金につき使わない）。

> 一言要約：**手元のMacで動かし、GitHubには記録を置くだけ**。運用基盤は private `MyWorkSpace`、WebサイトはそのままWebの repo。両者は混ぜない。

---

## 0. 大原則

- **計算はローカルMac限定**。GitHub Actions の hostedランナーは従量課金（API課金相当）になるため**使わない**。CI的なことが必要になっても、まずローカル実行で代替する（発展は §6 のセルフホストRunner）。
- **GitHubの役割は2つだけ**：①永続化（バックアップ・遠隔保管）②監査ログ（誰が・いつ・何を変えたかのGit履歴。改変検知・ロールバックの基盤）。
- **コミット前は必ず秘匿チェック**（`security-policy.md` §6）。不可侵領域（Tier0）は1バイトも上げない。

---

## 1. 2リポジトリの役割分担

| リポジトリ | 用途 | 中身 | 公開設定 |
|---|---|---|---|
| `sslocker08/MyWorkSpace`（private） | **運用基盤** | `_framework/`（共有ツール・契約テンプレ・規約）＋各インスタンス（例：`KIBI/{Internal,External,ThirdParty,Contracts}`）。`instance.config` 駆動でダッシュボード描画 | private 固定 |
| `kibi-fragrance`（Web側 repo） | **公開Webサイト** | サイトのソース（`Internal/System/` に相当する実体）。デプロイ対象 | サイト運用に準ずる |

- **混同しない**：運用基盤の記録（boards・ord・tpr・契約）は MyWorkSpace、サイトのコードは Web repo。
- **Webは運用基盤の中で submodule として参照**（実体はWeb repo・履歴は分離）。詳細は `migration-runbook.md`。

---

## 2. 認証の設定（最小・安全）

1. **GitHub アカウント**：運用基盤は `ss.locker08` の private repo。Web側は既存の管理アカウント。**公開設定の変更・コラボレータ追加・第三者アプリ連携はSotaのみ**（`security-policy.md` §6）。
2. **認証方式**：HTTPS＋GitHub の認証ヘルパー（`gh auth login` でブラウザ認証、またはOSキーチェーン保存）を推奨。Personal Access Token を使う場合は**最小スコープ（当該repoのみ）**で発行し、`.secrets/` 等の不可侵領域・リポジトリ本文に**絶対に書かない**。
3. **資格情報の保存場所**：OSのキーチェーン／git credential helper に限る。リポジトリ内の設定ファイルやドキュメントへトークンを書かない（コミット前スキャンの対象パターン）。
4. **push先の追加（別リモート）はSota承認必須**（`security-policy.md` §6）。

---

## 3. リモートの設定

新規インスタンスを MyWorkSpace 配下で運用する場合（移行手順の詳細は `migration-runbook.md`）：

1. ローカルの運用基盤フォルダ（`MyWorkSpace`）で `git remote -v` を確認。
2. 運用基盤の origin は `sslocker08/MyWorkSpace`（private）に向ける。
3. Web側の submodule は `kibi-fragrance` の repo URL を指す（`git submodule add <url> <path>`／既存は `.gitmodules` を正とする）。
4. **誤リモート防止**：origin が意図したprivate repoか、push前に必ず再確認（過去にWeb repoと取り違えない）。

---

## 4. 日々の運用（commit / pull）

「**こまめに記録し、相手の更新は取り込んでから書く**」が基本。

1. **書く前にpull**：作業開始時に `git pull`（または submodule 込みで取り込み）。他席・他端末の更新を先に取り込む。
2. **編集はワークスペース内のファイルで**：エージェント連携もファイル経由（`automation-design-draft.md` 搬送レイヤー）。
3. **コミット前チェック（必須・`security-policy.md` §6）**：
   - ステージ対象に共有禁止リスト該当（`_Records/ .secrets/ Kofukuron23/ *.db _knowledge/_data` 等）がないか。
   - 鍵・トークンのパターンスキャン（`sk-` `ghp_` `AIza` `pk_live` `sk_live` `BEGIN PRIVATE KEY` `password=` 等）。
   - ヒットしたら**即時除外し記録**。`.gitignore` を再適用してから再ステージ。
4. **コミット**：意味のある単位で、メッセージは「何を・なぜ」。Git履歴そのものが監査ログになる。
5. **push**：privateリモートへ。**force push・履歴書き換えは原則禁止**（機密混入の除去のみ例外＝Sota承認）。
6. **承認ゲートとの関係**：本番・契約改訂・公開設定変更など `GATE:human` 相当の変更は、commitしても**Sota承認なしに本番反映・公開しない**（`automation-design-draft.md` §0）。

> 自動化との接続：Watcher（launchd等）はローカルで監視・通知・headless起動を担うが、**push/commitの判断や承認は人間（社長室）が起点**。GitHub側で自動実行（Actions hostedランナー）はしない。

---

## 5. やってはいけないこと（禁止）

- hostedランナーでのビルド／テスト／生成（**API課金につき不可**）。
- 不可侵領域（Tier0）のcommit・push。
- トークン・鍵のリポジトリ／ドキュメントへの直書き。
- 無断のpublic化・コラボレータ追加・第三者アプリ連携・別リモート追加（すべてSota承認）。
- force push・履歴改変（例外＝機密除去のみSota承認）。

---

## 6. 発展：必要時のみセルフホストRunner（ローカルMac）

将来「どうしてもCI的な自動チェックをGitHubのワークフローから起動したい」場合に限り、**hostedではなくセルフホストRunner**を検討する。

- **ランナーの実体はローカルMac**：計算は手元で行うため**API課金が発生しない**（hostedランナー回避の唯一の正当な道）。
- **位置づけ**：必須ではない発展オプション。まずはローカルの launchd / 手動実行で足り、Runnerは「GitHubのイベントを起点にローカル実行したい」明確な必要が出てから。
- **導入時の条件**：Runner登録は private repo に限定し、登録・トークン管理はSota承認のうえで行う。Runner上でも不可侵領域は触らせない。
- **不採用が既定**：迷う段階では入れない。複雑化はコストとリスク（資格情報・常駐プロセス）を増やすため、明確な要件が出るまで保留。

---

## 7. このテンプレの具体化（インスタンス側）

- リモートURL・submodule のパス・公開設定・Runner採否は各インスタンスの `instance.config` と Contracts（`security-policy.md` §6）を正とする。
- 認証ヘルパーの具体（gh / credential helper）と保存先は、運用時点のOS・GitHub仕様に合わせてインスタンス側で確定する（テンプレは方式の原則のみ規定）。
