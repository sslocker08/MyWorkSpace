# MyWorkSpace ── マルチエージェント運用ワークスペース

複数のAIエージェント（Claude・Codex・Ollama・Antigravity 等）を、**1つの操作卓**から、**ファイル／git だけを連携バス**にして協調運用するための枠組み。案件（プロジェクト）非依存の共有部分を `_framework/` に一度だけ定義し、各案件は**インスタンス**としてこの枠組みを継承する。

> このリポジトリは **`sslocker08/MyWorkSpace`**（private）。最初のインスタンスは **KIBI**（香りブランドの仮想カンパニー）。

## 構成

```
MyWorkSpace/
├── _framework/        # ★ 案件非依存の共有ハーネス（規約・契約テンプレ・ツール・運用手順）
│   ├── README.md          入口
│   ├── conventions/       フォルダ/vendor型・採番/チケット・Tier/レビュー責任・MAGI構成
│   ├── instance-config.schema.md   instance.config のスキーマ
│   ├── examples/          記入例（KIBI）
│   ├── ops/               VS Code / GitHub連携 / 移行ランブック / リモート閲覧(Tailscale)
│   └── templates/         契約・様式テンプレ（継承元）
└── <instance>/        # 各案件（例: KIBI/）。instance.config と固有 Contracts で具体化
    └── Internal/ External/ ThirdParty/ Contracts/
```

将来の案件は **兄弟フォルダ**として同じルールで増やす（`_framework` は共有のまま）。

## 設計の核

- **操作卓**＝VS Code 1ウィンドウ（各エージェントの拡張を同居）。連携は**ファイル／git のみ**＝相互API呼び出しをしない＝**API課金ゼロが絶対条件**。計算は常にローカル。
- **三社体制**：Internal（社内・設計/統合）／External（外注・実装/整形/生成）／ThirdParty（中立審査）／Contracts（共通規程）。
- **GitHub** は永続化＋監査ログ。内部運用データ（boards 等 Tier1）は公開しない。リモート閲覧は Tailscale 等の**アクセス制御付き**で（`_framework/ops/remote-access-tailscale.md`）。

## 現状（2026-06）

- `_framework/` を seed（このコミット）。各ドキュメントは **draft（起案中）**。
- KIBI インスタンス本体は現在 `kibi-fragrance/KIBI`（private）にあり、本ワークスペースへの**本移行は安全手順で別途実施**（`_framework/ops/migration-runbook.md`・不可逆のため要承認）。
- `examples/KIBI.instance.config.md` は説明用の記入例。各インスタンスの実 `instance.config` は当該インスタンス側で管理する。

入口の詳細 → [_framework/README.md](_framework/README.md)
