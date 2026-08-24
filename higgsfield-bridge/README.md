# higgsfield_bridge

Higgsfield（30+モデル集約の画像/動画生成プラットフォーム）の**接続経路③ Cloud API**
（`platform.higgsfield.ai`・APIキー方式）を Claude Code / エージェントから運転するための
Python 3.11・標準ライブラリのみ（pip 依存ゼロ）のブリッジ。

出典・前提スキル: `higgsfield-agentic-generation`（Skills 工房・draft）。このスキルは
実 API 接続前に書かれたプレイブックであり、本ブリッジの実装は**その記述からの推定**を
多く含む。コード中・ドキュメント中で「未検証・接続後に実測で確定」と明記した箇所は、
実際に `HIGGSFIELD_API_KEY` / `HIGGSFIELD_API_SECRET` を発行して接続した後、実測して
修正すべき前提である（人間タスクは [docs/HUMAN-TASKS.md](docs/HUMAN-TASKS.md) 参照）。

## 現在地・移動予定

**一時的な配置場所**: `/home/user/MyWorkSpace/higgsfield-bridge/`（後日、別の場所へ移動予定）。
このため本パッケージのコードは絶対パスを一切含まず、すべて `__file__` 起点の相対パス
解決のみを行う（`higgsfield_bridge/paths.py` に集約）。フォルダごと移動しても壊れない。

このリポジトリはまだ commit していない（作業中のスキャフォールド）。

## 構成

```
higgsfield-bridge/
├── higgsfield_bridge/
│   ├── __init__.py
│   ├── paths.py      相対パス解決の集約（絶対パス排除の要）
│   ├── client.py     経路③ Cloud API の実クライアント（submit/status/download/cancel）
│   ├── mock.py        認証情報なしでライフサイクル全体を試せるローカルモック
│   ├── ledger.py       クレジット使用台帳（JSONL・per-model レポート）
│   ├── anchor.py        アンカーフレーム承認フロー（静止画→人間承認→動画化）
│   ├── cli.py            サブコマンド実装
│   └── __main__.py        `python -m higgsfield_bridge` のエントリポイント
├── tests/                stdlib unittest（mock lifecycle / ledger / gate / anchor）
├── docs/
│   ├── SETUP-CONNECTOR.md    経路①（claude.ai カスタムコネクタ）
│   ├── SETUP-LOCAL-CLI.md    経路②（公式 CLI・将来のローカル利用向け）
│   └── HUMAN-TASKS.md         人間がブラウザで行う必要のあるタスク（優先度順）
└── README.md（本ファイル）
```

`ledger/`・`anchors/`・`mock_state/`・`downloads/` は実行時に自動生成される
（コミット前は存在しない。`.gitignore` 参照）。

## クイックスタート（mock モード・鍵不要）

既定の `--mode` は `mock` なので、認証情報を用意しなくても全パイプラインを試せる。

```bash
cd higgsfield-bridge

# 1. ジョブを投入（ローカルでライフサイクルを模擬）
python -m higgsfield_bridge submit \
  --model-id "higgsfield-ai/soul/standard" \
  --params '{"prompt": "a cinematic hero shot"}' \
  --mode mock
# => {"request_id": "mock-xxxxxxxxxxxx", ...}

# 2. 状態を確認（呼ぶたびに1段階進む: queued -> in_progress -> completed）
python -m higgsfield_bridge status --request-id mock-xxxxxxxxxxxx --mode mock
python -m higgsfield_bridge status --request-id mock-xxxxxxxxxxxx --mode mock

# 3. 完了したらアセット（プレースホルダー PNG）をダウンロード
python -m higgsfield_bridge download --request-id mock-xxxxxxxxxxxx --out ./downloads --mode mock

# 4. アンカーフレーム承認フロー（静止画を安く生成→人間承認→動画化）
python -m higgsfield_bridge anchor submit --name shot-1 \
  --model-id "higgsfield-ai/soul/standard" --params '{"prompt": "anchor still"}' --mode mock
python -m higgsfield_bridge anchor approve --name shot-1 --note "確認OK"
python -m higgsfield_bridge anchor submit-video --name shot-1 \
  --model-id "higgsfield-ai/kling/3.0" --params '{"prompt": "animate"}' --mode mock

# 5. クレジット使用台帳のレポート
python -m higgsfield_bridge ledger-report

# 送信内容だけ見たい場合（ネットワーク/ファイル書き込みなし）
python -m higgsfield_bridge submit --model-id "higgsfield-ai/kling/3.0" --params '{}' --mode dry-run
```

`--mode real` を使うには `HIGGSFIELD_API_KEY` / `HIGGSFIELD_API_SECRET` の発行が必要
（[docs/HUMAN-TASKS.md](docs/HUMAN-TASKS.md) 優先度1）。未設定のまま `--mode real` を
実行すると、スタックトレースではなく `docs/HUMAN-TASKS.md` を指す日本語の案内文が
表示されて終了する（プレースホルダーゲート）。

## テスト

```bash
python -m unittest discover -s tests -v
```

stdlib `unittest` のみ。mock ライフサイクル・ledger 追記/集計・プレースホルダーゲート・
アンカー状態機械の4系統を検証する（全て一時ディレクトリ上で実行し、実行環境の
`ledger/`・`anchors/`・`mock_state/` を汚染しない）。

## 設計上の要点

- **非同期ジョブの作法（経路③）**: 生成はサーバー側で継続する。クライアント側の
  ポーリングがタイムアウトしても、サーバー側のジョブを cancel しない
  （`client.wait_until_complete` はタイムアウト時に非終端状態のまま呼び出し元へ返すだけ）。
  `request_id` さえ保持していれば、セッションが切れた後でも `status`/`download` で
  resume できる。
- **キャンセルは queued の間のみ**（スキル記載どおり client/mock 双方でガードする）。
- **クレジット経済は実測でしか確定できない**——モデル別消費量は公式非公開・第三者値は
  矛盾するため、`ledger.py` は「予測モデル」ではなく「実測するための記録装置」として
  設計されている（`credits_estimated`/`credits_actual` は既定で null）。
- **アンカーフレーム承認は約4倍のクレジット節約パターン**（単一ソース・未検証）だが、
  仕組み自体（承認ゲートを経ないと動画化できない）はファイルの存在だけで表現される
  意図的にシンプルな状態機械。

## JP2FR / kibi-fragrance-studios について

本ブリッジの作業では `/home/user/MyWorkSpace/JP2FR/` と
`/home/user/MyWorkSpace/kibi-fragrance-studios/` には一切触れていない
（別エージェントの作業対象のため）。
