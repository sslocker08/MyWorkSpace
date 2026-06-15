> 起案中(draft)｜移行先: MyWorkSpace/_framework/ops/vscode-setup.md ｜ KIBI非依存の汎用テンプレ。インスタンスは継承し固有値は instance.config と各Contractsで具体化。

# 操作卓セットアップ ── VS Code 1ウィンドウで2エージェント並行（macOS）

版：draft（2026-06-15 起案・社長室）。整合先：`Contracts/_framework/ops/github-integration.md`（リポジトリ/認証）・`Contracts/automation-design-draft.md`（自動化・Watcher・GATE/Tier）・`Contracts/security-policy.md`（Tier・Git安全）。
位置づけ：操作卓＝**VS Code 1ウィンドウ**に Claude Code 拡張と Codex 拡張を同居させ、同一ワークスペースで2エージェントを並行利用するための初心者向け手順。**API課金ゼロが絶対条件**（サブスク／無料枠の認証のみを使い、従量APIキーは登録しない）。

> 一言要約：1つのVS Codeウィンドウ＝1つの操作卓。Claude（社内）と Codex（外注）を**別ターミナルで並べて**動かし、両者の連携はファイル／gitだけ（互いをAPIで呼ばない＝課金ゼロ）。

---

## 0. 前提と原則（先に読む）

- **計算は常にローカルMac**。エージェント同士は相互にAPIを呼ばない。連携はワークスペース内のファイルとgitのみ（`automation-design-draft.md` の搬送レイヤー附則と整合）。
- **認証はサブスク／無料枠のみ**：Claude＝Claudeの購読（Max等）でサインイン、Codex＝対応サブスクでサインイン。**従量課金のAPIキー（`sk-...` 等）はどちらの拡張にも入れない**。これがAPI課金ゼロの担保。
- **1案件＝1ワークスペース**：MyWorkSpace直下の各インスタンスフォルダ（例：`MyWorkSpace/KIBI/`）を開く。`_framework/`（共有ツール・規約）は親フォルダとして必要時のみ開く。
- 迷ったら止めてSotaに確認（特に認証情報の入力画面）。

---

## 1. VS Code を入れる（初回のみ）

1. ブラウザで Visual Studio Code の公式配布ページを開き、**macOS（Apple Silicon / Universal）**版をダウンロードする。
2. ダウンロードした `.zip` を解凍し、出てきた `Visual Studio Code.app` を**「アプリケーション」フォルダへドラッグ**して移動する。
3. Launchpad か「アプリケーション」から VS Code を起動する。初回は「開いてよいか」の確認が出るので許可する。
4. （任意・便利）コマンドパレット（`⇧⌘P`）で `Shell Command: Install 'code' command in PATH` を実行すると、ターミナルから `code .` でフォルダを開けるようになる。

---

## 2. ワークスペースを開く

1. VS Code の「ファイル → フォルダを開く」で、インスタンスのルート（例：`MyWorkSpace/KIBI/`）を選ぶ。
2. 左の **エクスプローラー**に `Internal/ External/ ThirdParty/ Contracts/` が見えれば正しい席。
3. 共有ツールや契約テンプレも同時に触る日は、代わりに親の `MyWorkSpace/` を開くか、マルチルートで `_framework/` を追加する（「ワークスペースにフォルダを追加」）。普段は案件フォルダ単体でよい。

> 注意：`.secrets/ _Records/ Kofukuron23/` などの不可侵領域は開いても**書かない・渡さない**（Tier0＝`security-policy.md`）。

---

## 3. 2つの拡張を入れる

VS Code 左端の**拡張機能アイコン（四角が4つ）**をクリックし、検索して入れる。

1. **Claude Code 拡張**（Anthropic 提供）を検索してインストール。
2. **Codex 拡張**（提供元の正規版）を検索してインストール。提供元の表示名が正規のものか確認してから入れる（紛らわしい類似拡張に注意）。
3. インストール後、VS Code を**一度再読み込み**（`⇧⌘P` → `Developer: Reload Window`）すると両拡張のパネルが安定して出る。

---

## 4. 各エージェントにサインイン（サブスク認証）

**ここが課金ゼロの肝**。どちらも「サブスク／既存アカウントでサインイン」を選び、**APIキー欄には何も入れない**。

### 4-1. Claude Code
1. サイドバーの Claude Code パネルを開く。
2. 「Sign in」を選び、ブラウザ経由で**Claudeの購読アカウント**でログイン（Max等のサブスク）。
3. パネルに使用中アカウントが表示されれば完了。モデル選択はサブスクに含まれる範囲で行う。
4. ターミナルからの利用も同じ認証を使う（`claude` で対話、`claude -p "…"` で非対話＝headless。いずれも購読枠を消費し従量APIは叩かない）。

### 4-2. Codex
1. Codex パネルを開き、「Sign in」を選ぶ。
2. ブラウザ経由で**対応サブスクのアカウント**でログイン。**APIキー方式は選ばない**（選ぶと従量課金になり得るため）。
3. ターミナル併用時は `codex` で対話、`codex exec "…"` で非対話起動（headless）。これも購読枠を消費する経路を使う。

> 確認の合言葉：**「キーを貼る画面は触らない／サインインは必ずブラウザのアカウントログイン」**。

---

## 5. ターミナルを分割して2エージェントを並べる

操作卓の基本形は「**左にClaude席・右にCodex席**」のターミナル2枚。

1. メニュー「ターミナル → 新しいターミナル」（`⌃\`` でトグル）で1枚目を開く。
2. パネル右上の**分割アイコン**（または `⌘\`）で2枚目を右に並べる。
3. 左ペインを **Internal（Claude）席**にする：ワークスペース直下、または `Internal/` 配下で `claude` を起動。
4. 右ペインを **External（Codex）席**にする：`External/`（または `External/<vendor>/`）へ移動してから `codex` を起動（規約＝`External/AGENTS.md`）。
5. ペインのタブ名を右クリック →「名前の変更」で `Claude` / `Codex` と付けておくと迷わない。

> 席の独立：Claudeは社内正本を、CodexはExternal配下のスナップショットだけを触る。**互いのターミナルに相手を呼び出さない**（連携はファイル／gitのみ）。重要編集は同時に同じファイルへ書かない（`Contracts/master-agreement.md` の同時編集禁止）。

---

## 6. boards / dashboard をプレビューする

秘書室の管制物（boards のmd・dashboardのHTML）はVS Code内で確認できる。

- **boards（Markdown）**：`Internal/Secretary/boards/*.md` をエディタで開き、右上の**プレビューアイコン**または `⇧⌘V` で整形表示。編集しながら見るなら `⌘K V`（横並びプレビュー）。
- **dashboard（HTML）**：`Internal/Secretary/dashboard/index.html` は静的に開くだけなら拡張（Live系プレビュー拡張）で表示できる。ただし**ローカルfetchやサーバ前提の挙動がある場合は、ローカルの簡易サーバ（serve系）でローカルホスト配信して見る**のが確実（`automation-design-draft.md` の serve.js 経路と整合）。スマホ確認はトンネル経由（自動化設計側の運用）に従う。
- プレビューは**閲覧のみ**。値の編集はエディタ本文で行い、生成物（`dashboard/summaries/` 等）は手で書き換えない。

---

## 7. よくあるつまずき

- **拡張パネルが出ない** → `Developer: Reload Window` で再読み込み。
- **サインインでブラウザが開かない** → 既定ブラウザを確認し、表示されたURLを手動で開く。
- **APIキーを求められた気がする** → サインイン方式を間違えている可能性。キーは入れず、アカウントログイン側を選び直す。
- **2席が混ざる** → ターミナルのタブ名を `Claude`/`Codex` に固定し、CWD（左=Internal・右=External）を毎回確認。
- **dashboardが空/崩れる** → 静的openではなくローカルサーバ配信で開く。

---

## 8. このテンプレの具体化（インスタンス側）

- 拡張の正規名・対応サブスク種別・モデル選択は、運用時点の各製品仕様に合わせて `instance.config` 側に追記する（テンプレ本文は製品名のバージョンに依存させない）。
- インスタンス固有のフォルダ名（例：`KIBI/`）・席の起動コマンド・boards/dashboard のパスは各インスタンスの Contracts／CLAUDE.md を正とする。
