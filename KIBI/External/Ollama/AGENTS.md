# External/Ollama ── 委託先規約（ローカルLLM）

共通憲章＝`../AGENTS.md`（全委託先に適用）に従う。本書はOllama固有。台帳＝`../_vendors.md`。

## 位置づけ
- 担い手：**ローカルLLM（Ollama・M5/24GB・既定 qwen2.5:14b 等）**。外部送信ゼロ＝**Tier1に触れる**整形・要約・分類・下書きを担える唯一の委託先。
- 実行モデル：Codexのような対話セッションではなく、**社長室がローカルでドライバ（`Internal/Secretary/tools/review-core.js` 系の要約エンジン／本件用の薄いスクリプト）を起動し、Ollama API（localhost:11434）に投げる**バッチ。`work/` には生成物を置く。
- コスト：無料（電気代のみ）。Claude/Codexのトークンを使わない＝負荷分散の主役。

## 鉄則（共通憲章に追加）
- **外部送信しない**こと自体が価値。インターネットへ出る処理（Web取得・外部API）はOllamaの責務外（それはリサーチ委託先＝§_vendors §3）。
- Tier1入力可だが、**Tier0（`.secrets/`・`_Records/`・認証実値・処方原本）は不可**（ローカルでも投入しない＝防火壁。既存ツールの `_Records/`遮断と同じ）。
- 生成物は社長室がレビュー・統合（最終受入は社長室）。Ollamaの出力を無検証で確定しない（局所生成＝枠組みはClaude）。

## フロー
- 発注＝`Orders/ord-ollama-###`（order/inputs/work/decision）。inputs＝対象テキスト＋整形/要約ルール。work＝Ollama生成物。decision＝社長室の受入。
- 着手宣言・自己点検は、ドライバ実行ログ（モデル名・件数・所要）で代替してよい。
