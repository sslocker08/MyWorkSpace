# @mwstudio/ui

全Studio製品が共有するデザインシステム。**OKLCHトークン**＋**`DESIGN.md` ブランド契約**＋**フレームワーク非依存のReactプリミティブ**（Tailwind非依存・トークンのみ・全8状態）。最新Skills（`brand-guidelines` の DESIGN.md パターン、`color-systems`、`web-typography`、`anti-ai-slop-ui-design`、`component-system-engineering`）に準拠。

## 使い方
```tsx
// 1) スタイルを1回だけ読み込む（トークン＋コンポーネントCSS）
import "@mwstudio/ui/styles.css";
// （自前のコンポーネントCSSを使うなら "@mwstudio/ui/tokens.css" だけでも可）

// 2) プリミティブを使う
import { Button, Input, Badge, Card } from "@mwstudio/ui";

<Card>
  <Card.Header>機能リクエスト</Card.Header>
  <Card.Body>
    <Input aria-label="件名" />
    <Button intent="primary" loading={saving}>送信</Button>
    <Badge variant="success">shipped</Badge>
  </Card.Body>
</Card>
```

## ブランドの差し替え（製品ごと）
コンポーネントは**セマンティック変数 `var(--color-*)` のみ**を参照し、生の値を持たない。製品は自分の `DESIGN.md`（[DESIGN.md](DESIGN.md) を複製・再調整）から生成したトークンCSSで上書きするだけ:
```css
/* 製品のトークン上書き（例） */
:root { --brand-h: 150; --brand-c: 0.11; }      /* 色相/彩度を振るだけで全体が変わる */
:root { --color-accent: oklch(0.6 0.14 150); }   /* セマンティック直指定も可 */
```
ダークモードは `prefers-color-scheme` と `[data-theme="dark"]` の両対応。

## プリミティブ（v1）
| 要素 | 状態 | 備考 |
|---|---|---|
| `Button` | default/hover/focus-visible/active/disabled/**loading**/**error**/**success**（全8） | `intent` primary/secondary/ghost・`size` sm/md/lg・`loading`でaria-busy＋spinner |
| `Input` | default/hover/focus/filled/disabled/error/success | `error`で`aria-invalid`・`forwardRef` |
| `Badge` | neutral/accent/success/warning/error/outline | ステータス色はアクセシブルな文字色とペア |
| `Card` | 複合（`Card.Header/Body/Footer`） | |

## 契約と検証
- **`DESIGN.md` 契約**は TypeScript 型 `DesignContract`（`src/design-contract.ts`）として機械可読化。`REQUIRED_STATES`（8状態）と `hasAllRequiredStates()` で「インタラクティブ要素は全8状態を持つ」を検証。
- **反・AIスロップ・ゲート**（[ANTI-SLOP.md](ANTI-SLOP.md)）の一部を**自動テスト化**（`src/anti-slop.test.ts`）: 自前CSSに hex/rgb が無い（OKLCHのみ）・色はトークン参照・**transform/opacity以外をアニメさせない**。

## 開発
```bash
pnpm --filter @mwstudio/ui build       # tsup → dist（CSSは styles/ から配布）
pnpm --filter @mwstudio/ui typecheck
pnpm --filter @mwstudio/ui test        # vitest（17 tests）
```

## 次の段
Modal/Tabs/Menu/Checkbox（Radix headless 検討）、Storybook ギャラリー、`DESIGN.md`→トークンCSSの自動生成スクリプト、`feedback` ウィジェットの本UIスキン適用、a11y自動監査（axe）。
