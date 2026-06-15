# 発注書 ord-codex-002：Secretary tools（build/serve系）の単体テスト整備

- ステータス: 発注準備（社長室がSota承認後 STATE=発注済へ）  <!-- STATE: 準備中 LEVEL: 中規模 GATE: auto -->
- 発注日: 2026-06-13 ｜ 依頼元部署: SEC/WEB（Secretary tools・保守はWEB所管） ｜ 変更区分: 中規模
- 目的: build.js などの集計ロジックに**単体テスト**を整備し、ダッシュボード生成の回帰を機械検知できるようにする（保守性向上）。
- 作業内容:
  - `inputs/tools/build.js`（＋必要なら `review-core.js`）の**純粋ロジック関数**（status パース・集計・語彙判定・関門タグ付与など、I/Oを伴わない部分）に対する単体テストを作成。
  - テストは**外部依存なし**（Node標準のみ。`node --test` もしくは素のassertスクリプト）。Ollama/Blobs/ネットワークには接続しない。
  - 入力は `inputs/sample-status/` のダミー status（架空部署 TST/DMY）のみ。
  - 成果物: `work/deliverables/` に テスト一式＋実行手順 `README.md`。テストが緑になることを示すログも添付。
- 対象範囲（編集してよい場所）: `External/Codex/Orders/ord-codex-002/work/` のみ。
- 範囲外（してはならないこと）: build.js 本体の仕様変更・機能追加／実 status データの要求／Ollama・Blobs・本番への接続／新規npm依存の追加。
- 受入基準: acceptance-criteria.md 参照。
- 第三者審査: 不要（中規模・テスト追加・自部署ツール内に閉じる。社長室受入で可）。

## 投入資料チェック（security-policy §3）
| 投入ファイル（inputs/内） | 元 | Tier | マスキング |
|---|---|---|---|
| tools/build.js, tools/review-core.js | Internal/Secretary/tools/（Secret実値なし＝process.env名前参照のみ） | 2 | 走査済（Secret 0） |
| sample-status/fixture-tst.md, fixture-dmy.md | 創作ダミー（架空部署） | 2 | 不要（創作） |
| sample-status/status-template-excerpt.md | status様式（空） | 2 | 済 |

## 共有情報の記録
- 外部AIに渡した範囲: Secretaryツールのコード（秘匿値なし）＋創作ダミーstatus。実status・実データ・boards・Secretは不投入。

## ロック
- 凍結したInternal側ファイル: なし（テストは work/ 内で完結。build.js本体は変更しない＝統合時もテストのみ Secretary/tools/__tests__/ 等へ受入予定）。
