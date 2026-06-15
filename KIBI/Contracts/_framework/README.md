> 起案中(draft)｜移行先: MyWorkSpace/_framework/... ｜ KIBI非依存の汎用テンプレ。インスタンスは継承し固有値は instance.config と各Contractsで具体化。

# _framework ── 枠組みの入口

ここは **_framework**。特定の案件（KIBI等）に依存しない、全インスタンス共有のツール・契約テンプレ・規約の正本。各案件（インスタンス）はこの枠組みを継承し、固有値だけを `instance.config` と自分の `Contracts/` で具体化する。

移行先の全体像（`MyWorkSpace/`）：
```
MyWorkSpace/
├── _framework/          # ★ここ：KIBI非依存の共有ツール/契約テンプレ/規約
│   ├── README.md        #   本書（枠組みの入口）
│   ├── conventions/     #   共通規約（命名・単一書き手・ID・語彙・Tier）
│   ├── instance-config.schema.md  # instance.config のスキーマ定義
│   ├── ops/             #   自動化・搬送レイヤー（Watcher・headless・通知）
│   └── templates/       #   契約テンプレ・様式（インスタンスが継承）
└── KIBI/                # インスタンス1（兄弟フォルダで将来案件が増える）
    ├── instance.config  #   部署/vendor+型/MAGI構成（ダッシュボード駆動値）
    ├── Internal/  External/  ThirdParty/  Contracts/
```

## 1. _framework とは
- **案件非依存の共有層**。命名規約・単一書き手原則・ID連番・判定語彙・情報Tier・三社体制の枠組み・自動化の搬送レイヤー・契約と様式のテンプレを、案件をまたいで一度だけ定義する。
- インスタンス（`KIBI/` 等）は _framework を**継承**し、固有の部署構成・委託先・MAGI構成・しきい値だけを上書きする。共通則を案件ごとに複製しない（正本は常に _framework 側）。
- 書き込みは各インスタンスの社長室相当のみ。重大改訂は人間承認（KIBIでは契約 第14条「重大」＝tpr審査＋Sota承認）。

## 2. インスタンスの作り方
1. `MyWorkSpace/<name>/` を作る（例：`KIBI/`）。
2. `<name>/instance.config` を書く。固有値＝**部署一覧／委託先（vendor）と型／MAGI構成／Tierしきい値／通知先**等。スキーマ＝[instance-config.schema.md](instance-config.schema.md)。
3. `<name>/Contracts/` に、_framework のテンプレを継承した固有規程を置く（共通則は参照、固有値のみ具体化）。
4. 共通ツールが `instance.config` を読んでダッシュボード・ボード・パイプラインを**駆動**する（部署数・委託先・MAGI構成は config から動的に描画。コードへのハードコードはしない）。
5. 将来案件は **兄弟フォルダ**として同手順で増やす（`MyWorkSpace/<other>/`）。_framework は共有のまま。

## 3. 操作卓モデル
- **VS Code 1ウィンドウ**で全インスタンスを操作（Claude Code 拡張＋Codex 拡張を同居）。
- **エージェント間連携はファイル／git のみ**。相互API呼び出しはしない＝**API課金ゼロが絶対条件**。状態のハンドオフはフラグファイルのポーリングで疎結合化する。
- **計算は常にローカルMac**。headless 起動は Codex＝`codex exec`／Claude＝`claude -p`（各製品の購読枠を消費。従量APIは叩かない）。整形・要約の退避先は Ollama（ローカル・無枠）。
- **GitHub は永続化＋監査ログのみ**。hosted ランナーはAPI課金につき不可（自走基盤はローカル launchd 等の定期 headless 実行）。
- 自動化はハイブリッド：軽微かつ低Tier（`GATE:auto`）は Watcher 自動実行、中〜重要／重大（`GATE:human`）は承認ゲート＋スマホ通知で**待つ**。詳細＝[ops/](ops/)。

## 4. 三社体制の要旨
| 領域 | 担い手の型 | 役割 | 編集権 |
|---|---|---|---|
| Internal | 社内（設計AI） | 設計・発注・統合・最終受入判断。内部監査を兼任 | 自領域RW・統治文書の起案 |
| External | 外注（委託先＝vendor＋型） | 発注書に基づく実装／整形。実装系はAuditor付き、整形系はAuditor無し（発注元が意味不変照合） | 当該Orderの自サブフォルダのみ |
| ThirdParty | 中立審査（MAGI＝3観点合議） | 独立審査・勧告のみ。読み取り専用 | 自領域のみ・直接編集不可 |

- 発注できるのは Internal（社長室相当）のみ。External・ThirdParty は Internal を直接読まず、選別・マスキング済みスナップショットを供給される。
- 連絡はすべてファイル経由・非同期・単一書き手。重大変更は内部監査単独で確定せず、第三者審査＋人間承認を経る。
- ブランド・世界観・法的判断・統治文書は外注不可（インスタンス側 Contracts で具体化）。

## 5. 関連ドキュメント
- 共通規約：[conventions/](conventions/)（命名・単一書き手・ID連番・判定語彙・情報Tier）
- インスタンス設定スキーマ：[instance-config.schema.md](instance-config.schema.md)（`instance.config` の必須/任意フィールド・型・既定値）
- 自動化・運用：[ops/](ops/)（Watcher・フラグプロトコル・headless 起動・通知・サーキットブレーカ）
- 契約・様式テンプレ：[templates/](templates/)（運用契約書・役割定義・情報保護・様式集の継承元）
