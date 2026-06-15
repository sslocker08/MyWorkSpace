> 起案中(draft)｜移行先: MyWorkSpace/_framework/conventions/folder-and-vendor-taxonomy.md ｜ KIBI非依存の汎用テンプレ。インスタンスは継承し固有値は instance.config と各Contractsで具体化。

# フォルダ構成と外注先（vendor）の型分類

ワークスペースの領域構成と、外注先（vendor）の型ごとのフォルダ標準を定める共有規約。`_framework` は特定インスタンス（KIBI等）に依存しない汎用テンプレで、各インスタンスはこれを継承し、固有値（部署名・採用vendor・MAGI構成など）を `instance.config` と各 `Contracts/` で具体化する。

## 1. ワークスペース構成図

リポジトリ＝`MyWorkSpace`（1リポジトリ）。最上位は「KIBI非依存の共有資産（`_framework`）」と「インスタンス（案件単位の作業領域）」に分かれる。将来案件はインスタンスを兄弟フォルダとして増やす。

```
MyWorkSpace/
├── _framework/                  ← 全インスタンス共通の共有資産（KIBI非依存）
│   ├── conventions/             ← 本書を含む共通規約（命名・型分類・フロー標準）
│   ├── tools/                   ← 共有ツール（インスタンス横断で再利用）
│   └── templates/               ← 契約テンプレ・様式の雛形
│
├── KIBI/                        ← インスタンス1（香水事業）
│   ├── Internal/                ← 社内（Claude）：社長室＋秘書室＋部署
│   ├── External/                ← 外注（vendor群）
│   ├── ThirdParty/              ← 中立審査（MAGI）
│   ├── Contracts/               ← このインスタンスの共通規程（_framework を継承・具体化）
│   └── instance.config          ← 部署/vendor＋型/MAGI構成（ダッシュボード描画の駆動元）
│
└── <次の案件>/                  ← インスタンス2（兄弟フォルダで増設）
    ├── Internal/
    ├── External/
    ├── ThirdParty/
    ├── Contracts/
    └── instance.config
```

- `_framework` は雛形・規約・共有ツールの正本。固有の業務内容・数値・戦略は一切持たない。
- 各インスタンスは `_framework` を継承し、`instance.config` と自 `Contracts/` で固有値を確定する。
- ダッシュボードは `instance.config`（部署一覧・採用vendor＋型・MAGI構成）を読んで動的に描画する。

## 2. 各領域の役割

| 領域 | 担い手 | 役割 | 備考 |
|---|---|---|---|
| `_framework` | 全インスタンス共通 | KIBI非依存の共有資産（規約・テンプレ・共有ツール）。本書の正本 | インスタンス固有値を持たない |
| `Internal/` | 社内（Claude） | 社長室（設計・発注・受入・統合・最終判断）＋秘書室（管制塔）＋各部署（実務） | 中核業務は外注しない |
| `External/` | 外注（vendor群） | 発注に基づく実装・整形・生成。Internal 直読禁止＝社長室が `inputs/` にスナップショット供給 | 共通憲章＝`External/AGENTS.md` |
| `ThirdParty/` | 中立審査（MAGI） | 3観点合議の独立審査（Cases/tpr-###）。読み取り専用・勧告のみ | 起票/供給は社長室専管 |
| `Contracts/` | インスタンス共通 | このインスタンスの共通規程（運用契約・役割定義・情報保護・様式）。`_framework` を継承し具体化 | 書込みは社長室のみ |

- 連携手段：エージェント間の連携はファイル/gitのみ（相互API呼び出しはしない）。
- 階層原則：固有値は下位（インスタンスの `Contracts/`・`instance.config`）で確定し、共通則は `_framework` に置く。

## 3. 外注先（vendor）の型分類とフォルダ構成

vendor は「実装系／整形系／生成系」の3型に分類する。型ごとにレビュー責任の置き方が異なり、フォルダ構成もそれに従う。発注は `External/<vendor>/Orders/ord-<vendor>-###`、各 Order は共通フロー（order/inputs/work/[audit]/decision）を踏む。

| 型 | 例 | 担当領域 | フォルダ構成 | レビュー責任 |
|---|---|---|---|---|
| **実装系** | Codex（将来 Gemini・Antigravity） | コード実装・テスト・差分 | `Order`＋`Worker`＋`Auditor` | vendor内 Auditor が一次QA → 社長室が最終受入（重大は MAGI 審査） |
| **整形系** | Ollama（ローカル） | 整形・要約・分類・下書き | `Order`＋`Worker`（**Auditor 無**） | Auditor を持たず、**社長室が意味不変を照合**して受入 |
| **生成系** | 画像・動画 | 画像/動画の生成 | `Order`＋`Worker`（**レビュー非保有**） | vendor はレビューを持たない → **発注元 Internal 部署＋社長室がレビュー**（レビュー責任の詳細は別doc参照） |

各型の Order 配下フロー：

```
External/<vendor>/
├── Order(s)/<ord-<vendor>-###>/
│   ├── order/        ← 発注書（書き手＝社長室）
│   ├── inputs/       ← スナップショット供給（書き手＝社長室）
│   ├── work/         ← vendor の成果物（書き手＝Worker）
│   ├── audit/        ← 一次QA（実装系のみ／書き手＝Auditor）
│   └── decision/     ← 受入（書き手＝社長室）
├── Worker/           ← Worker の常駐領域・規約
└── Auditor/          ← 実装系のみ（Auditor の常駐領域・規約）
```

- **実装系**：`audit/` と `Auditor/` を持つ。Worker＝実装、Auditor＝内部QA（照合・差分・品質・範囲外編集の検査）。一次検査の後、社長室が最終受入。
- **整形系**：`audit/`・`Auditor/` を**持たない**。Worker の生成物を社長室が意味不変（戦略/数値/文言/業務内容を変えない）の観点で照合して受入。
- **生成系**：vendor はレビュー機能を持たない。生成物は発注元の Internal 部署と社長室がレビュー（デザインレビューはSota本人も関与し得る）。レビューの詳細フローは別docを参照。
- 共通制約：いずれの型も Internal 直読禁止・範囲遵守（`work/` と自 vendor 常駐領域のみ編集可）・Secret/個人情報の非記載・本番非接触。ブランド/世界観/法的判断は外注不可。

## 4. 新 vendor 追加手順

1. **型を決める**：実装系／整形系／生成系のいずれかに分類する（レビュー責任の置き方が決まる）。
2. **フォルダを作る**：`External/<vendor>/` を作成し、配下に `Order(s)/`・`Worker/` を置く。
   - 実装系はさらに `Auditor/` を追加する。
   - 整形系・生成系は `Auditor/` を作らない（前者＝社長室照合、後者＝発注元＋社長室レビュー）。
3. **規約を置く**：`External/<vendor>/AGENTS.md`（vendor固有規約）を作り、共通憲章 `External/AGENTS.md` に従う旨と固有事項を記す。
4. **台帳に登録**：委託先一覧（`External/_vendors.md` 相当）に vendor・型・得意ジャンル・許可Tier・コスト・起動方式を追記する。
5. **instance.config に反映**：採用 vendor＋型を `instance.config` に登録し、ダッシュボードに反映させる。
6. **承認**：新規発注先の採用は社長承認必須（契約に従う）。

- 発注 ID は `ord-<vendor>-###`。最初の Order から共通フロー（order/inputs/work/[audit]/decision）を踏む。
- 型に応じて `audit/`（実装系のみ）の有無が変わる以外、フローは全 vendor で共通。
