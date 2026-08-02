# 経路①: claude.ai カスタムコネクタのセットアップ（ホスト型 MCP）

出典: `higgsfield-agentic-generation` SKILL.md §1・§2（取得 2026-07-12・as-of 揮発）。

このブリッジ（higgsfield_bridge、経路③ Cloud API のラッパー）とは**別の接続経路**。
Claude Code on the web・Cowork のような**リモートセッションから直接 Higgsfield の
MCP ツールを呼びたい場合**に使う。認証は OAuth（API キー不要）。

## 手順

1. `claude.ai` にログインし、Settings → Connectors → **Add custom connector** を開く。
2. 名前を `Higgsfield` にする（任意の名前で構わないが分かりやすさのため推奨）。
3. URL 欄に次を **正確に** 入力する:

   ```
   https://mcp.higgsfield.ai/mcp
   ```

4. **Connect** を押し、Higgsfield アカウントでサインインする。
5. 接続完了後、そのアカウントに紐づくリモートセッションでツールが露出するようになる。

## ⚠️ 最頻の接続失敗（必読）

**マーケティングページの URL `higgsfield.ai/mcp` をそのまま貼ってしまい、
`mcp.` サブドメインを落とす**のが最も多い失敗パターン（スキル §1 が明記する
実際の GitHub Issue 複数件——いずれも "closed as not planned"＝公式側の救済は無い）。

正しい URL: `https://mcp.higgsfield.ai/mcp`
よくある間違い: `https://higgsfield.ai/mcp`（`mcp.` サブドメインが無い＝マーケページの URL）

コネクタ登録前に URL を貼り付けた直後、必ず `mcp.higgsfield.ai` になっているか
目視で再確認すること。

## 接続後: 実ツールスキーマを必ず確認する（未検証情報に依存しない）

公式が公言しているのは「5 tools・no API keys」という情報のみで、**個々のツール名は
公式未公開**。第三者報告で流通している名前（`generate_image` / `generate_video` /
`create_character` / `get_generation_status` / `list_characters`）は**単一ソースの
未検証情報**であり、そのまま信用してエージェントの分岐ロジックを書いてはならない。

**接続が完了したら、ToolSearch 等の手段で実際に露出しているツール名・パラメータ
スキーマを確認してから、そのツールに依存するプロンプト/コードを書くこと。**
これは `higgsfield-agentic-generation` スキル自身が明記する留保である
（「接続後に ToolSearch 等で実スキーマを確認してから設計すること」）。

## その他の未検証事項

- ローカル Claude Code へ MCP を直結する構文
  `claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp`
  は第三者記事の単一ソース。標準の `claude mcp add` 構文とは整合しており動く見込みだが
  公式ドキュメントには記載が無い（未検証・接続後に実測で確定）。
- OAuth 失効時の再認証手順（`/mcp` から Re-authenticate）も第三者情報で未検証。
- **ヘッドレス環境（本ブリッジのような遠隔実行環境）では初回 OAuth ができない**。
  必ず claude.ai の通常セッション、またはブラウザが使えるローカル環境で先に
  コネクタ登録・認証を済ませておくこと。
