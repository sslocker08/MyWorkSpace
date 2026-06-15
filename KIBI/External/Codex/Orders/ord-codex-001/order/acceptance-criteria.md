# 受入基準 ord-codex-001

| # | 基準 | 検証方法 |
|---|---|---|
| 1 | Node.js単体で動く（`require` は fs/path 等の標準モジュールのみ） | ソース確認＋`node status-lint.js` 実行 |
| 2 | inputs の2 fixture に埋め込まれた既知違反 **10件すべて**を検出する | `node status-lint.js inputs/fixture-tst.md inputs/fixture-dmy.md` の出力照合 |
| 3 | 誤検知ゼロ（埋め込み違反以外を報告しない） | 同上 |
| 4 | 終了コード（違反あり=1／なし=0）が正しい | クリーンな status-template-excerpt.md で 0 を確認 |
| 5 | 出力形式「ファイル:行: 規則ID: 内容」・簡潔体 | 出力目視 |
| 6 | 規則はR1〜R7のみ（独自規則の追加なし） | ソース確認 |
- 共通基準: 範囲外編集ゼロ／changed-files.md と実差分の一致／外部依存の無断追加なし
