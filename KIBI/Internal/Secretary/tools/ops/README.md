# ops ── 無人実行（自動化）設置キット

KIBI 三社フロー（[automation-design-draft.md](../../../../Contracts/automation-design-draft.md) §5）の **無人ループを設置するための雛形**を置く。
ここにあるのは「設置用の道具」だけ。**このファイル群を置いただけでは何も自動実行されない。** 有効化は **Sota 承認後**。

| ファイル | 役割 | 種別 |
|---|---|---|
| `run-pipeline.sh` | `orders-scan.js` → `pipeline-notify.js` を順に呼ぶ薄ラッパ（node 実行・終了コード伝播・エラーログ） | 実体（設置物） |
| `kibi-pipeline.plist.example` | launchd 定期実行の**雛形**（`StartInterval` 既定 600 秒・`SLACK_WEBHOOK_URL` は空） | 雛形 |
| `README.md` | 本書（設置手順） | 文書 |
| `logs/` | 実行ログの既定出力先（初回実行時に自動生成・Git 追跡外推奨） | 生成物 |

呼ぶ実体は1つ上の `../`（`Internal/Secretary/tools/`）にある `orders-scan.js` / `pipeline-notify.js`。
本キットの保守所管は **EC・情報システム部（System）**（秘書室は `req-sec-NNN` で改修依頼）。

---

## 0. 重要・到達制御（先に読む）

- **このパイプラインは Tier1 要約を含む。** Slack digest／ダッシュボードには ID・状態・件数・「誰の番か」のみが出る設計だが、
  これは **Tier1（社内要約）相当**であり、**到達できるのは Sota のみ**でなければならない（[security-policy.md](../../../../Contracts/security-policy.md)・契約 第16条）。
- よって **スマホ承認のための外部公開（Tunnel）には Sota 限定の ACL（アクセス制御）が必須**。ACL 無しで公開しない。
- **有効化（launchctl load）は Sota 承認後に限る。** 承認前は雛形・ラッパを置くだけ（試走は DRY/手動のみ）。
- Secret 実値（`SLACK_WEBHOOK_URL` 等）は **本ディレクトリのファイルに書かない**。実値は Git 追跡外の実体 plist にのみ入れる。

---

## 1. まず手動で試走（承認・常駐の前）

依存（`node` 標準のみ・新規 npm 依存なし）を確認し、Slack へ飛ばさず動作を見る。

```sh
# KIBI ルートからの相対例（席に応じてパスを調整）
DRY=1 bash Internal/Secretary/tools/ops/run-pipeline.sh
```

- `orders-scan.js` が `Internal/Secretary/dashboard/_pipeline.json` を更新し、
  `pipeline-notify.js` が digest を **stdout に出すだけ**（`DRY=1` のため Slack 非送信）。
- 終了コード: `0`=全クリア / `2`=競合 or 要人間承認 を検出（=スマホへ上げるべき変化あり） / `1`=走査エラー。
- ログは `Internal/Secretary/tools/ops/logs/run-pipeline.log` にタイムスタンプ付きで追記される。

`SLACK_WEBHOOK_URL` を一時的に env で渡せば実送信も単発で試せる（実値はコマンド履歴に残さない／`.secrets` 由来を export）。

---

## 2. launchd で常駐（無人定期実行）── Sota 承認後

### 2.1 plist の実体を作る（実値は実体にのみ）

```sh
# 雛形を LaunchAgents へコピー（実体名は .example を外す）
cp Internal/Secretary/tools/ops/kibi-pipeline.plist.example \
   ~/Library/LaunchAgents/jp.kibi.pipeline.plist
```

コピーした **実体** `~/Library/LaunchAgents/jp.kibi.pipeline.plist` を編集し、必要なら次を確認・調整する。

> 本書のコマンドは KIBI ルートからの相対表現で書く。ただし **launchd plist は仕様上どうしても絶対パスが要る**ため、雛形ではパスを `/絶対パス/to/MyWorkSpace/KIBI/...` のプレースホルダにしてある。コピーした実体側で**各自の環境の絶対パス**へ必ず置換すること（完全な相対化はできない）。

- `ProgramArguments` の `run-pipeline.sh` 絶対パス（雛形は `/絶対パス/to/MyWorkSpace/KIBI/...` のプレースホルダ。各自の環境パスに置換する）。
- `EnvironmentVariables` の `SLACK_WEBHOOK_URL` に **実値**を入れる（スマホ push したい場合）。空のままなら fail-safe で stdout のみ。
- `EnvironmentVariables` の `PATH` に `node` の場所を含める。**GUI launchd は最小 PATH** で `node` を見つけられないことがある。
  - nvm 等で `node` が標準 PATH 外にある場合は、`run-pipeline.sh` を `NODE_BIN=/絶対/path/node` 付きで呼ぶ形に変えるのが確実
    （例: `ProgramArguments` を `/bin/bash -lc 'NODE_BIN=$(which node) bash .../run-pipeline.sh'`、あるいは plist の PATH に node のディレクトリを追記）。
- `StartInterval`（既定 600 秒）。短くしすぎない（GPT Plus 負荷・「急がない」哲学・設計 §6.2）。

### 2.2 load / 確認 / 手動起動 / unload

```sh
# 読み込み（= 常駐開始。以後 StartInterval ごとに実行）
launchctl load ~/Library/LaunchAgents/jp.kibi.pipeline.plist

# 登録確認（PID と直近の終了コードが見える。エラー時は終了コードが非ゼロ）
launchctl list | grep jp.kibi.pipeline

# StartInterval を待たず今すぐ1回流す（macOS 10.10+ の domain-target 形式）
launchctl kickstart -k gui/$(id -u)/jp.kibi.pipeline

# 停止（常駐解除）
launchctl unload ~/Library/LaunchAgents/jp.kibi.pipeline.plist
```

- ログ確認: `Internal/Secretary/tools/ops/logs/launchd.out.log` / `launchd.err.log`（plist 指定）＋ `run-pipeline.log`（ラッパ自前）。
- plist を編集したら `unload` → `load` で再読込する。
- 無効化（一時停止）は `unload`。完全撤去は実体 plist の削除＋`unload`。

---

## 3. スマホ承認（`GATE:human` の解錠経路）── Sota 限定 ACL 必須

設計 §4 の MVP（新規コード最小）。**到達できるのは Sota のみ**にすること（本書 §0）。

1. ローカルダッシュボード `serve.js`（既存・`#review` タブに承認/差戻しボタン）を起動。
   - `node Internal/Secretary/tools/serve.js`（ポートは serve.js 既定）。
2. それを **Tunnel で安全公開**して、スマホから到達できるようにする。
   - **Cloudflare Tunnel ＋ Cloudflare Access**（メール認証 = **Sota のメールのみ許可**）、または
   - **Tailscale Funnel ＋ Tailscale ACL**（**Sota のデバイスのみ**到達可）。
   - **ACL を設定するまで公開しない。** どちらも「Sota 以外は到達不可」を満たすこと。
3. Slack digest（スマホ push）で `🔔 承認待ち` を受けたら、Tunnel 経由のダッシュボード `#review` で承認/差戻し。
   - Tunnel/インタラクティブを使わない局面では、digest の指示どおり**社長室チャットで `approve ord-codex-NNN`** と伝え、Claude が STATE を進める（確実に止まる安全側）。

> 注意: Tunnel 公開はローカルダッシュボードの外部到達＝情報保護の論点（設計 Open Questions）。
> 公開する/しない・どの Tunnel を使うかは **Sota の判断**。本書はあくまで設置手順であり、公開そのものを推奨・実行しない。

---

## 4. 何が通知に出る/出ないか（情報保護）

- **出る**: 案件 ID（`ord-...` / `tpr-...`）・STATE・LEVEL・GATE・「誰の番か（役割名）」・件数・ロック競合の種別/対象パス。
- **出ない**: Secret・個人情報・財務実数・処方・order/request の本文（Tier0/Tier1 の中身）。
- これは `orders-scan.js`（メタのみ走査）と `pipeline-notify.js`（id/state/level/gate/turn のみ参照）の鉄則による。
  Slack は外部サービスのため、上記「出ない」項目は**構造的に**本文へ載らない。

---

## 5. トラブルシュート

| 症状 | 確認 |
|---|---|
| Slack に来ない | `SLACK_WEBHOOK_URL` 未設定 → fail-safe で stdout のみ（`launchd.out.log` に digest）。実体 plist の env を確認。 |
| 重複抑止で送られない | 前回送信から状態変化なし（`pipeline-notify` の仕様）。強制送信は `FORCE=1`。キャッシュ = `../.pipeline-notify-cache.json`。 |
| `node: command not found` | GUI launchd の PATH 不足。§2.1 の PATH / `NODE_BIN` 対処。 |
| `_pipeline.json` が古い | `run-pipeline.sh` に `--no-write` を渡していないか。scan が json を更新できているかログ確認。 |
| launchd が即再起動を繰り返す | `ThrottleInterval`（雛形で 60 秒）と終了コードを確認。`launchctl list` の終了コード列を見る。 |
| 終了コード 2 が続く | 競合/要人間承認が滞留 = 正しく「人間待ち」を検出している。Sota が承認/差戻しを行うまで 2 は続く（異常ではない）。 |
