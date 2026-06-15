> 起案中(draft)｜移行先: MyWorkSpace/_framework/ops/ ｜ KIBI非依存

# iPhoneから自宅Macのダッシュボードを安全に見る ── Tailscale手順書（初心者向け）

版：draft（2026-06-15 起案・社長室）。整合先：`Contracts/security-policy.md`（§6 Git安全規程・Tier／公開設定はSotaのみ）・`Contracts/_framework/ops/vscode-setup.md`（serve.js プレビュー）。
対象読者：**非技術者の社長(Sota)**。目的：iPhone 17 Pro から、自宅Macで動いているダッシュボード（`serve.js` :4310）を、**自分のデバイス間だけ**で安全に見る。

> 一言要約：**Tailscaleは「自分のApple/メールで作る、自分のデバイスだけのプライベートな道（tailnet）」**。MacとiPhoneがその道で直接つながるので、世界には一切公開されません。GitHub Pages公開（誰でも見られる＝Tier1漏洩リスク）とは別物です。

---

## 0. 全体像（30秒で）

```
[自宅Mac] serve.js :4310 ──（自分だけのtailnet・暗号化）── [iPhone 17 Pro] Safari
        ↑127.0.0.1のまま外には開かない           ↑同じアカウントでサインイン
```

- やることは4つだけ：**①Macに Tailscale を入れる ②serve.js を動かす ③tailnet内に出す ④iPhoneで開く**。
- 公開はしません。`tailscale funnel`（全世界公開）は**絶対に使いません**（§5）。

---

## 1. なぜTailscaleか（なぜ安全か）

- Tailscaleは、**自分のアカウント（Apple/メール）でサインインしたデバイスだけ**が入れる小さなプライベートネットワーク＝**tailnet**を作る仕組みです。
- このtailnetには**自分のMacと自分のiPhoneしか入っていない**ので、外の誰かが入ってくることはありません。**＝公開されない**。
- 通信は端末同士が**暗号化**してやり取りします。途中の経路で中身を読まれません。
- GitHub Pagesのような「誰でもURLを知れば見られる公開」とは根本的に違い、**Tier1（外部公開）漏洩のリスクがありません**。見られるのは自分のデバイスだけです。

---

## 2. Mac側：Tailscaleを入れて、ダッシュボードを動かす

**(1) Tailscaleを入れてサインイン**

- Mac App Store（または公式サイト `https://tailscale.com/download`）から **Tailscale** をインストール。
- アプリを開き、**自分のアカウント（Apple または メール）でサインイン**。メニューバーにTailscaleのアイコンが出て「接続済み(Connected)」になればOK。
- *なぜ安全か*：このサインインで、Macが「自分のtailnetのメンバー」になります。他人のアカウントでは入れません。

**(2) ダッシュボードを動かす（serve.js）**

ターミナルで、KIBIのフォルダにいる状態で次を実行：

```
node Internal/Secretary/tools/serve.js
```

- 起動すると `http://127.0.0.1:4310` で待ち受けます（**この127.0.0.1のままで構いません**＝Mac自身からのみ受け付ける安全な状態）。
- *なぜ安全か*：`127.0.0.1` はMac内部だけのアドレス。**LAN（家のWi-Fi全体）には直接開いていません**。外に出す経路は次の§3でTailscaleが暗号化して担います。

---

## 3. tailnet内だけに出す（公開しない共有）

Macのターミナルで、`serve.js` を動かしたまま、別のターミナルで次を実行：

```
tailscale serve --bg 4310
```

- これは「`localhost:4310` を、**tailnet内向けのHTTPS**で、自分のMagicDNS名（後述）に出す」設定です。`--bg` はバックグラウンド常駐の意味。
- 状態の確認：

```
tailscale serve status
```

- 出すのをやめたいとき（例）：

```
tailscale serve --https=443 off
```

- *なぜ安全か*：`serve` は**tailnet内のデバイスにしか見せません**。世界には出ません（世界公開は `funnel` で、本手順では使いません＝§5）。
- ※Tailscaleのバージョンによってサブコマンドの書式が少し違うことがあります。困ったら：

```
tailscale serve --help
```

---

## 4. iPhone側：同じアカウントで入って、Safariで開く

**(1) iPhoneにTailscaleを入れてサインイン**

- App Storeで **Tailscale** をインストールし、**Mac と同じアカウント**でサインイン。
- *なぜ安全か*：同じアカウント＝**同じtailnet**に入るので、初めてMacと「自分のデバイス同士」としてつながります。違うアカウントでは見えません。

**(2) MacのMagicDNS名を確認する**

Macのターミナルで：

```
tailscale status
```

- 一覧に出るMacの**デバイス名**を確認します（例：`mac-mini`）。完全な住所は `https://<Macのデバイス名>.<tailnet名>.ts.net/` の形です。
  - 例：`https://mac-mini.tailxxxx.ts.net/`

**(3) Safariで開く**

- iPhoneのSafariで、上の `https://<デバイス名>.<tailnet名>.ts.net/` を開く（末尾スラッシュ可）。ダッシュボードが表示されます。
- **ホーム画面に追加**：Safariの共有ボタン → 「ホーム画面に追加」。アプリのようにワンタップで開けます。
- *なぜ安全か*：このURLはtailnet内でしか名前解決・接続できません。tailnet外のSafariからは開けません。

> 画面はiPhone 17 Proの縦画面（約393×852pt・ノッチ/Dynamic Island）に最適化済み。タブ切替・更新は普段どおり指で操作できます。

---

## 5. セキュリティ厳守（ここだけは守る）

- **`tailscale funnel` は使わない**。`funnel` は**全世界に公開**する機能で、本来の目的（自分のデバイスだけ）に反します。使うのは常に `tailscale serve`（tailnet内のみ）。
- **serve.jsは `127.0.0.1` のまま**。`0.0.0.0` 等でLAN全体に直接開かない（家のWi-Fiにいる他人に見えてしまうため）。外への経路はTailscaleの暗号化された道だけに限定する。
- **Macがスリープ中は見えません**（Macが起きていて serve.js が動いている間だけ表示）。常時見たい場合は別途「スリープさせない設定」等が必要です。
- **承認操作も同じURLでできます**：`serve.js` はライブ反映なので、iPhoneのこのURLからタスク承認などの操作も可能です（操作も同じtailnet内・暗号化）。
- 公開設定・別経路の追加など外部に関わる変更は **Sota判断**（`security-policy.md` §6）。

---

## 6. うまくいかない時（チェック順）

上から順に確認してください。

1. **両デバイスが同じtailnetか**：Mac/iPhone とも**同じアカウント**でサインインし「接続済み」か。`tailscale status` に両方が出ているか。
2. **MagicDNSが有効か**：Tailscale管理画面（`https://login.tailscale.com/admin/dns`）で MagicDNS がオンか。オフだと `.ts.net` の名前で開けません。
3. **serve.js が起動中か**：Macで `node Internal/Secretary/tools/serve.js` が動いているか（ターミナルを閉じると止まります）。Macがスリープしていないか。
4. **共有が出ているか**：`tailscale serve status` に 4310 の共有が表示されているか。出ていなければ §3 をやり直す。
5. **URLの綴り**：`https://<デバイス名>.<tailnet名>.ts.net/`。デバイス名・tailnet名は `tailscale status` の表記どおりに。

---

## 7. 代替案（参考・今回は非推奨）

- **Cloudflare Tunnel ＋ Cloudflare Access**：独自ドメインやチーム招待など、より高機能な遠隔アクセスができます。ただし**ドメイン・トンネル・アクセスポリシーの設定が重く**、非技術者には手間が大きいので**今回はTailscaleを推奨**します。将来チームで複数人がアクセスする必要が出た段階で再検討すれば十分です。
