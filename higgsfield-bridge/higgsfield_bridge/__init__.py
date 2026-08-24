"""
higgsfield_bridge — Higgsfield Cloud API（接続経路③）を Claude Code / エージェントから
運転するための Python stdlib のみのブリッジ。

出典・前提: Skills 工房の `higgsfield-agentic-generation` スキル（draft・実 API 未接続で
執筆されたプレイブック）。本パッケージの API 呼び出し詳細（エンドポイント形状・
レスポンスJSONのフィールド名・パラメータ名等）の多くは同スキルの記述に基づく推定であり、
コード中に「未検証・接続後に実測で確定」とコメントした箇所は、実際の cloud.higgsfield.ai
アカウントで接続した後に実測して確定させる必要がある。

現在は一時的な作業ディレクトリに置かれており、後日 別の場所へ移動する予定
（詳細は README.md 参照）。このため本パッケージ内のコードはすべて `__file__` を
起点にした相対パス解決のみを行い、絶対パスのハードコードは一切含まない。
"""

__version__ = "0.1.0"
