# @mwstudio/house

ポートフォリオ・ハウスサイト。**Wave 0 共有層の統合実証**＝最初の実行アプリ（Vite + React）。`@mwstudio/ui` のトークン＋プリミティブで自分を描画し、`@mwstudio/feedback` のウィジェットを載せて、誰でもツール内で要望を出せる状態を端から端まで通している。

## 何を実証するか
- `@mwstudio/ui`（`styles.css` ＋ `Button`/`Card`/`Badge`）で UI を構成（トークンのみ・自前色なし）。
- `@mwstudio/feedback/widget` の `FeedbackWidget` をヘッダに常設し、`DefaultFeedbackClient` へ送信。
- **統合テスト**（`src/App.test.tsx`）が「UIが描画される」「訪問者がフィードバックを送ると client に届く（画面コンテキスト自動添付）」を検証。

## 構成
- `src/products.ts` … 6エンジン＋Wave 1 旗艦（`docs/PORTFOLIO.md` が正本、ここは表示用の抜粋）
- `src/App.tsx` … ページ本体（共有プリミティブで構成）
- `src/main.tsx` … エントリ（`@mwstudio/ui/styles.css` 読み込み＋in-memory client）
- `src/house.css` … サイト固有レイアウト（トークンのみ）

## 開発
```bash
pnpm --filter @mwstudio/house dev        # ローカル起動（Vite）
pnpm --filter @mwstudio/house build      # tsc --noEmit && vite build
pnpm --filter @mwstudio/house test       # vitest（統合テスト2件）
```

## 次の段
本番ホスティング/デプロイ（`deploy-hosting-cicd`）、`marketing` パッケージによる製品別LP生成、`feedback` のバックエンド接続（in-memory → DB）、SEO/構造化データ、ダークモードトグルUI。
