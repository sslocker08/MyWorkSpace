# KIBI アカウント設計・在庫

最終更新：2026-06-12

---

## 1. アカウント在庫（現状）

出典：公式サイト `../../System/data.json`（`.brand.social` ほか）で確認。

| 媒体 | ハンドル | URL | ステータス |
|---|---|---|---|
| Instagram | `@kibi_fragrance` | https://www.instagram.com/kibi_fragrance | ✅ 取得済（サイトにフィード埋込・連携あり） |
| X | `@kibi_fragrance` | https://x.com/kibi_fragrance | ✅ 取得済（サイト連携あり） |
| LINE公式 | `@kibi_fragrance` | https://line.me/R/ti/p/@kibi_fragrance | ✅ 存在 |
| Threads | `@kibi_fragrance` | https://www.threads.net/@kibi_fragrance | ✅ 取得済（2026-06-12・Instagram連携） |
| TikTok | `@kibi_fragrance` | https://www.tiktok.com/@kibi_fragrance | ✅ 取得済（2026-06-12） |
| note | `kibi_fragrance` | https://note.com/kibi_fragrance | ✅ 取得済（2026-06-12） |

### ハンドル統一の原則
**全6媒体（Instagram / X / LINE / Threads / TikTok / note）が `kibi_fragrance` で統一完了**（2026-06-12）。検索性・信頼性・ブランドの一貫性を確保。

### 注意：別アカウントとの区別
`kofukuron23` / `kofukuron.23` は KIBI 公式ではなく、ポップアップ「23の香福論」イベント側のアカウント（サイト news で言及）。KIBI 本体の発信と混同しないこと。

---

## 2. サイトとの導線（既存）
- 公式サイトに Instagram フィード埋込あり（`data.json` の `instagram_posts`）。
- news に「X / Instagram 公式アカウント開設」の告知あり。
- → サイト ⇄ SNS の相互導線はすでに存在。SNS側の bio から公式サイトへ返す設計を徹底する。

---

## 3. これから詰めること（TODO）
- [x] 各媒体の bio 文面 … 媒体別に草案を [`platforms/`](platforms/README.md) 各ファイルへ記載（実装時に微調整）
- [x] Instagram ハイライト構成（製品3種 / ものづくり / 哲学 / 次作）… [`platforms/instagram.md`](platforms/instagram.md) §6
- [x] プロフィールリンク導線（最上位の優先順）… IG=①公式サイト②note③LINE（[`platforms/instagram.md`](platforms/instagram.md) §6）
- [x] LINE公式の役割定義 … [`platforms/line.md`](platforms/line.md)（囲い込み・再訪＝最下層、正式運用）
- [x] **Threads / TikTok / note の新規取得とハンドル統一**（`@kibi_fragrance`／note は `kibi_fragrance`）… 2026-06-12 取得完了。手順書＝[`01a_handle_acquisition.md`](01a_handle_acquisition.md)

---

## 付記：LINE公式の扱い
LINE は新規認知より「既に接触した人の囲い込み・再訪促進」に強い。認知拡大フェーズでは主役ではないが、ファネル最下層（転換・リピート）の受け皿として既存資産を活かす。
→ **今期より正式運用に格上げ**。役割定義・配信設計・あいさつメッセージ・リッチメニュー・KPI（ブロック率重視）は [`platforms/line.md`](platforms/line.md) に確定。`00_sns_strategy.md` のファネル図にも反映済み。
