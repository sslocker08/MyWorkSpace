> 起案中(draft)｜移行先: MyWorkSpace/_framework/ops/ ｜ KIBI非依存

# iPhoneから自宅Macのダッシュボードを安全に見る ── Tailscale手順書（初心者向け）

版：draft v2（2026-06-15・社長室。実機検証で確定した手順に更新）。整合先：`Contracts/security-policy.md`（§6 Git安全規程）・`Contracts/_framework/ops/vscode-setup.md`（serve.js）。
対象読者：**非技術者の社長(Sota)**。目的：iPhone 17 Pro から、自宅Macで動くダッシュボード（`serve.js` :4310）を、**自分のデバイス間だけ**で安全に見る。

> 一言要約：**Tailscaleは「自分のアカウントで作る、自分のデバイスだけのプライベートな道（tailnet）」**。MacとiPhoneがその道で直接つながり、世界には一切公開されません。GitHub Pages公開（誰でも見られる＝Tier1漏洩）とは別物。

---

## 0. 全体像（30秒で）

```
[自宅Mac] serve.js を tailnet IP にバインド ──（自分だけのtailnet・WireGuard暗号化）── [iPhone] Safari
        ↑LAN・localhostには出さない                               ↑同じアカウントでサインイン
```

やることは4つ：**①Mac/iPhone に Tailscale を入れて同じアカウントでサインイン ②MacのtailnetアドレスでserveJSを動かす ③MagicDNS名を確認 ④iPhoneで開く**。公開はしない（`tailscale funnel` は絶対に使わない＝§5）。

---

## 1. なぜTailscaleか（なぜ安全か）

- 自分のアカウントでサインインしたデバイスだけが入れる小さなプライベートネットワーク＝**tailnet**。中には**自分のMacとiPhoneしかいない**＝外の誰も入れない＝**公開されない**。
- 通信は端末同士が**WireGuardで暗号化**。経路で中身を読まれない。
- 「URLを知れば誰でも見られる」公開（GitHub Pages等）とは根本的に違い、**Tier1漏洩リスクがない**。見えるのは自分のデバイスだけ。

---

## 2. Mac／iPhone に Tailscale を入れる

- **Mac**：`https://tailscale.com/download/mac` から入れてサインイン（Apple/Google/メール）。メニューバーが「接続済み」になればOK。**どのアカウントで入ったか覚える**。
- **iPhone**：App Storeで「Tailscale」を入れ、**Macと同じアカウント**でサインイン。VPN構成の追加を許可（自分のデバイス間を繋ぐためのもの）。
- *なぜ安全か*：同じアカウント＝**同じtailnet**。違うアカウントのデバイスは入れない。

確認（Macのターミナル）：両方が出ていればOK。
```
tailscale status
```

---

## 3. Mac側：ダッシュボードを tailnet 向けに動かす（実働手順）

KIBIのフォルダで、次の1行で起動します（`HOST` に**自分のMacのtailnet IP**を指定するのが要点）：

```
HOST=$(tailscale ip -4 | head -1) PORT=4310 node Internal/Secretary/tools/serve.js
```

- `tailscale ip -4` が**Macのtailnetアドレス**（例 `100.x.x.x`）を返し、`serve.js` をそのアドレスだけで待ち受けます。
- *なぜ安全か*：**tailnetアドレスにだけバインド**するので、**家のWi-Fi（LAN）にも、Mac内部の localhost にも開きません**。tailnet内のデバイス（自分のMac/iPhone）からしか届かない＝最小公開。
- 起動したまま（ターミナルは閉じない）にしておきます。

> **実例（KIBIのMac）**：tailnet名 `tail27cff0.ts.net`／Mac名 `applemacbook-pro`。起動コマンドは上記のままでOK（IPは自動取得）。

---

## 4. iPhone側：MagicDNS名で開く

**(1) MacのMagicDNS名を確認**（Macのターミナル）：
```
tailscale status
```
- Macの**デバイス名**を確認。完全な住所は `<デバイス名>.<tailnet名>.ts.net`。
  - KIBI実例：`applemacbook-pro.tail27cff0.ts.net`

**(2) iPhoneのSafariで開く**（Tailscaleがオンであること）：
```
http://<デバイス名>.<tailnet名>.ts.net:4310/
```
- KIBI実例：**`http://applemacbook-pro.tail27cff0.ts.net:4310/`**
- **末尾の `:4310` を忘れない**（serve.jsのポート）。
- Safariが「保護されていない通信」と出ても**そのまま開いてOK**：HTTPですが、Tailscale自体がWireGuardで暗号化し、tailnet内限定なので安全です。
- **ホーム画面に追加**（共有→「ホーム画面に追加」）でアプリのようにワンタップ起動。

> 画面はiPhone 17 Pro縦（約393×852pt・ノッチ/Dynamic Island）に最適化済み。タブ・更新は指で操作可。承認操作も同URLから可能（serve.jsライブ・同tailnet内）。

---

## 5. セキュリティ厳守（ここだけは守る）

- **`tailscale funnel` は使わない**（全世界公開になる）。tailnet内限定の道だけを使う。
- **`HOST` は tailnet IP（`tailscale ip -4`）にする。`0.0.0.0` にしない**＝LAN全体に開かないため（家のWi-Fiの他人に見えてしまう）。tailnet IPバインドなら自分のデバイスだけ。
- **Macがスリープ中／serve.js停止中は見えません**（Macが起きて serve.js が動いている間だけ）。常時見たい場合は launchd 常駐（automation設計の雛形）を別途組む。
- 公開設定・別経路の追加など外部に関わる変更は **Sota判断**（`security-policy.md` §6）。

---

## 6. うまくいかない時（チェック順）

1. **両デバイスが同じtailnetか**：Mac/iPhone とも同じアカウントで「接続済み」。`tailscale status` に両方表示。
2. **MagicDNSが有効か**：`https://login.tailscale.com/admin/dns` で MagicDNS オン（オフだと `.ts.net` 名で開けない）。
3. **serve.js が tailnet IP で起動中か**：起動ログに `bind 100.x.x.x:4310` が出ているか。Macがスリープしていないか。
4. **URLの綴り**：`http://<デバイス名>.<tailnet名>.ts.net:4310/`（**http・末尾:4310**）。名前は `tailscale status` の表記どおり。
5. **疎通テスト（Mac側）**：`curl -s -o /dev/null -w "%{http_code}\n" http://$(tailscale ip -4 | head -1):4310/` が `200` なら、iPhoneからも届くはず。

---

## 7. 補足：HTTPS版（`tailscale serve`）について

`tailscale serve --bg 4310` を使うと、HTTPSかつポート番号なしの綺麗なURL（`https://<デバイス名>.<tailnet名>.ts.net/`）で出せます。ただし**環境によってはCLIが応答せずハングすることがあり**（当該Macで発生）、その場合は本書の§3「tailnet IP直バインド＋:4310」を使えば同等に安全（tailnet内限定）に閲覧できます。HTTPSの綺麗なURLが欲しく、かつ `tailscale serve status` に設定が出るなら、そちらを使っても構いません。

## 8. 代替案（参考・今回は非推奨）

- **Cloudflare Tunnel ＋ Access**：独自ドメインやチーム招待など高機能だが、設定が重く非技術者には手間。将来チームで複数人アクセスが要る段階で再検討。
