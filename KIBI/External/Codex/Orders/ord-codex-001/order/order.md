# 発注書 ord-codex-001：status様式チェッカー（試運転）

- ステータス: 準備中（発注前）  <!-- 発注済へ進める条件＝認証情報ローテーション完了のSota宣言（security-policy §7）。書き手=社長室のみ -->
- 発注日: -（準備 2026-06-12） ｜ 依頼元部署: HQ（秘書室所管ツール） ｜ 変更区分: 中規模
- 目的: 各部署ステータスファイルの様式崩れ（語彙違反・列欠け・完了日漏れ等）を機械検出し、/audit・/tally の点検を軽くする。三社体制の試運転を兼ねる（実データ不使用）。
- 作業内容:
  - Node.js単体（外部依存なし）のCLI `status-lint.js` を新規作成する。
  - 使い方: `node status-lint.js <statusファイル...>`（複数可）。
  - 検出規則（inputs/README.md の規則表＝R1〜R7）に従い、違反を「ファイル:行: 規則ID: 内容」で標準出力に列挙する。
  - 終了コード: 違反なし=0／違反あり=1。
  - 成果物は `work/deliverables/status-lint.js` の1ファイル（テスト用の追加fixtureを作る場合は `work/deliverables/fixtures/` 配下）。
- 対象範囲（編集してよい場所）: `External/Codex/Orders/ord-codex-001/work/` のみ
- 範囲外（してはならないこと）: 検出規則の独自追加・自動修正機能の実装・外部パッケージ利用・inputs外の資料要求
- 受入基準: acceptance-criteria.md 参照
- 期限目安: -（発注後、次のCodexセッション内）
- 第三者審査: 要（tpr-001＝MAGIキャリブレーションを兼ねる）

## 投入資料チェック（security-policy §3）
| 投入ファイル（inputs/内） | 元（参考） | Tier | マスキング |
|---|---|---|---|
| README.md（検出規則表） | Internal/Secretary/rules/operations.md の語彙規程を抽象化 | 2 | 済（規則のみ・実データなし） |
| fixture-tst.md | ダミー（架空のテスト部） | 2 | 不要（創作データ） |
| fixture-dmy.md | ダミー（架空のダミー部） | 2 | 不要（創作データ） |
| status-template-excerpt.md | Internal/Secretary/templates/status-template.md | 2 | 済（様式のみ） |

## 共有情報の記録
- 外部AIに渡した範囲: 上表のとおり（様式・語彙規則・創作ダミーデータのみ。実ステータス・実データは含まない）
- Tier1例外共有: なし

## ロック
- 凍結したInternal側ファイル: なし（新規ツール。Internal側の置き換え対象なし。統合先は受入後に社長室が決定＝Internal/Secretary/tools/ 予定）
