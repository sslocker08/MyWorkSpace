# 人間タスク一覧（ブラウザ操作が必要・AIでは完結しない）

Higgsfield の3つの接続経路（`higgsfield-agentic-generation` スキル §1）は、いずれも
最初の一手だけ人間がブラウザで行う必要がある（アカウント連携・OAuth・APIキー発行は
AI からは実行できない）。優先度順に並べる。

## 優先度1: cloud.higgsfield.ai で API キー＋シークレットを発行する（このブリッジの必須要件）

**このリポジトリ（higgsfield_bridge）の `--mode real` を動かすのに必須。** これが無い限り
`submit` / `status` / `download` / `anchor` の real モードは「設定エラー」で止まる
（プレースホルダーゲート＝スタックトレースではなく本ドキュメントを指す案内文が出る）。

手順:
1. ブラウザで `cloud.higgsfield.ai` にサインインする。
2. API キー（key）と シークレット（secret）を発行する。
3. 発行された2つの値を環境変数に設定する:
   ```bash
   export HIGGSFIELD_API_KEY="発行されたキー"
   export HIGGSFIELD_API_SECRET="発行されたシークレット"
   ```
4. `python -m higgsfield_bridge submit --model-id <model_id> --params '{...}' --mode real` を実行できることを確認する。

## 優先度2: claude.ai にカスタムコネクタを登録する（経路①・ホスト型 MCP）

このブリッジ（経路③ Cloud API）とは別物。Claude Code on the web や Cowork のような
**リモートセッションから直接 Higgsfield のツールを呼びたい場合**に使う経路。
本ブリッジの動作には必須ではないが、エージェントループへの統合オプションとして有用。

手順:
1. `claude.ai` の Settings → Connectors → Add custom connector を開く。
2. 名前を `Higgsfield` にする。
3. URL に **`https://mcp.higgsfield.ai/mcp`** を入力する（詳細・注意点は
   [SETUP-CONNECTOR.md](SETUP-CONNECTOR.md) を参照——**最頻の接続失敗は `mcp.` サブドメインを
   落とすこと**）。
4. Connect → Higgsfield アカウントでサインイン。

## 優先度3: ローカル CLI の認証を行う（経路②・将来のローカル利用向け）

本人の「ゆくゆくはローカル」という将来計画に向けた準備。**今すぐの優先度は低い**
（このブリッジ自体は経路③ Cloud API を使うため、経路②が無くても動作する）。

手順は [SETUP-LOCAL-CLI.md](SETUP-LOCAL-CLI.md) を参照:
1. `npm install -g @higgsfield/cli`
2. `higgsfield auth login`（ブラウザ OAuth）
3. `npx skills add higgsfield-ai/skills`

---

## クレジット・ToS の注意（全経路共通・出典: `higgsfield-agentic-generation` SKILL.md §6・§8）

- **MCP/CLI は常にメータ制クレジットを消費する**。「Unlimited 生成」特典（Plus プランの
  Nano Banana 2 / Kling 3.0 7日無制限等）は **higgsfield.ai の web アプリ専用**であり、
  MCP・CLI・Canvas 経由では適用されない（公式明記）。エージェント運転で使えるのは
  月次クレジット（例: Plus は月1,200）だけと考えること。
- **クレジットは繰越なし**。毎サイクル失効する。7日返金は「クレジット未使用」が条件のため、
  **テスト生成を1回でも行うと返金権が消滅する**。
- **モデル別の消費量は公式非公開**。第三者の数値は桁レベルで矛盾している（例: Kling 3.0 が
  「6」と報告される場合と「50」と報告される場合がある）ため信用しない。
  本ブリッジの `ledger.py` は、この不確実性そのものに対応するために存在する
  （実際にジョブを流し、残高差分から実測するための台帳。`credits_actual` は実測後に
  手動で埋める設計）。
- **入出力に対する Higgsfield の永続ライセンス**: ToS §4.4（2025-08-30 版・逐語確認）により、
  商用利用は可能・出力の所有権主張はされないが、**Higgsfield 側は入力/出力を訓練・マーケに
  使う恒久ライセンスを保持する**。有料プランでこれが免除されるという第三者の説は
  裏取りできていない（未検証）。機密性の高い画像・キャラクターを投入する前に、
  この恒久ライセンスの扱いを踏まえて判断すること。
- **nsfw / failed は返金対象**（スキル記載）だが、返金がどのようにアカウント残高へ反映される
  かの具体的な挙動（即時か・サイクル末か等）は未検証。実測して確認すること。
- クレジット条件は「いつでも変更できる」（ToS §9.4）。上記の数値・条件は全て揮発する前提で扱う。

> 未検証・接続後に実測で確定: 本ドキュメントの「返金の反映タイミング」「Unlimited 除外の
> 正確な範囲」等は `higgsfield-agentic-generation` スキルが draft のため、実アカウントで
> 確認してから確定情報として扱うこと。
