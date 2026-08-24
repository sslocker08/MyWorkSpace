# 経路②: 公式 CLI のセットアップ（`@higgsfield/cli`・将来のローカル利用向け）

出典: `higgsfield-agentic-generation` SKILL.md §1（取得 2026-07-12・as-of 揮発）。

このブリッジ（higgsfield_bridge、経路③ Cloud API のラッパー）とは**別の接続経路**。
公式が「Claude Code で使うならこの CLI を推奨」と明言している経路で、
本人の「ゆくゆくはローカル」という将来計画に向けた手順として記録する。
**本ブリッジ自体はこの経路が無くても動作する**（経路③ Cloud API を直接使うため）。
今すぐ着手する優先度は低い（`docs/HUMAN-TASKS.md` の優先度3）。

## 手順

```bash
# 1. 公式 CLI をグローバルインストール
npm install -g @higgsfield/cli

# 2. ブラウザ OAuth でログイン
higgsfield auth login

# 3. Claude Code 用スキルを導入（Generate / Soul / Product Photoshoot の3スキル）
npx skills add higgsfield-ai/skills
```

- `higgsfield auth login` はブラウザを開いて OAuth 認証する。ヘッドレス環境では
  実行できないため、ブラウザが使えるローカルマシンで行うこと。
- `npx skills add higgsfield-ai/skills` は Claude Code のスキルとして
  Generate / Soul / Product Photoshoot の3つを導入する（公式スキル群）。

## 未検証事項

- 上記コマンド列はスキルの一次情報（higgsfield.ai/cli）に基づく記載だが、
  実際にこのブリッジの開発環境から `npm install -g` を実行して動作確認はしていない
  （未検証・接続後に実測で確定）。
- `npx skills add higgsfield-ai/skills` が導入する3スキルの具体的なツール名・
  引数スキーマも同様に未検証。導入後に実際のスキル定義を確認してから利用すること。

## このブリッジとの関係

本ブリッジ（`higgsfield_bridge` パッケージ）は経路③ Cloud API を Python から
直接叩く実装であり、この経路②の CLI には依存しない。将来的にローカル環境で
経路②（公式 CLI 経由の Claude Code 運用）に一本化する場合でも、経路③ベースの
ledger（クレジット台帳）やアンカーフレーム承認フローの設計思想はそのまま
参考にできる想定。
