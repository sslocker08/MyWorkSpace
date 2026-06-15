> 起案中(draft)｜移行先: MyWorkSpace/_framework/Contracts/instance-config.schema.md ｜ KIBI非依存の汎用テンプレ。インスタンスは継承し固有値は instance.config と各Contractsで具体化。

# instance.config スキーマ仕様（v0.1・draft）

各インスタンス（KIBI＝1社）が自分の構成を宣言する単一の設定ファイルの仕様。ボード／ダッシュボード生成・自動化（Watcher/通知）・契約整合チェックが**この1ファイルを読んで描画・判定する**。固有値（部署名・vendor・MAGI割当）はここに集約し、規程本文（master-agreement・role-definitions・security-policy）はインスタンス非依存に保つ。

## 位置づけと優先順位
- 配置：各インスタンスの `Contracts/instance.config`（例＝`MyWorkSpace/KIBI/Contracts/instance.config`）。
- 形式：YAML（推奨）または md表。本書は YAML をキー正本とする（md表はビューア向けの等価表現）。
- 優先順位：**Sota指示 ＞ Contracts本文 ＞ instance.config ＞ Internal/Secretary/rules ＞ 各部署CLAUDE.md**。instance.config は規程の「数値・名称の具体化」であって規程を上書きしない（矛盾時は Contracts本文が優先し、是正は社長室が起票）。
- 書き手：社長室のみ（単一書き手）。`gatePolicy`/`tierPolicy`/`magi` の改訂は契約第14条「重大」＝次tpr審査＋Sota承認を要する（`departments` の軽微な追加は中規模・社長承認）。

## トップレベル構成
| キー | 型 | 必須 | 意味 |
|---|---|---|---|
| `instanceName` | string | ◯ | インスタンス識別名（例：KIBI）。ダッシュボード見出し・通知接頭辞に使う |
| `repos` | object | ◯ | 永続化先リポジトリ（workspace＋website） |
| `departments` | list | ◯ | 社内（Internal）部署の宣言。ダッシュボードの部署タブ・ボードの部署軸を駆動 |
| `vendors` | list | ◯ | 外注先（External）の宣言。発注経路・Auditor有無・Tier上限を駆動 |
| `magi` | list | ◯ | 第三者審査（ThirdParty）の3人格構成。合議・フォールバック規則を駆動 |
| `gatePolicy` | object | ◯ | GATE（auto/中/重）の閾値。自動化レイヤーの分岐基盤 |
| `tierPolicy` | object | ◯ | Tier0〜3の定義と外注可否。防火壁・マスキング判定の基盤 |
| `secretaryDelegation` | object | ◯ | 秘書室が自室判断で推進できる範囲（管制塔の自律境界） |

---

## 1. `repos`（永続化先）
| キー | 型 | 意味 |
|---|---|---|
| `workspace` | string | 正本リポジトリ。`<owner>/<repo>` 形式。GitHubは永続化＋監査ログのみ（hostedランナー不使用＝API課金回避）。計算は常にローカル |
| `website` | object | 公開サイト等の別repo。`{ repo, link:submodule\|external }` |

```yaml
repos:
  workspace: "sslocker08/MyWorkSpace"      # 正本（private）
  website:
    repo: "kibi-fragrance/<site-repo>"      # 公開サイト
    link: submodule                          # workspace に submodule で結合
```

## 2. `departments[]`（社内部署）
| キー | 型 | 必須 | 意味 |
|---|---|---|---|
| `key` | string | ◯ | 短い英字キー（タブ・ファイル名・data属性に使用。例：DEV, FIN） |
| `name` | string | ◯ | 表示名（例：開発部） |
| `role` | string | ◯ | 一言の職務定義 |
| `noOutsourcing` | bool | ◯ | 外注ゼロ部署か（true＝ブランド/世界観/法的判断など外注不可領域を担う） |

- 部署数は固定しない。`departments[]` の要素数がそのままダッシュボードの部署軸になる（部署数の動的化）。
- `noOutsourcing:true` の部署は発注経路の対象外として描画し、Watcher の自動着手候補から除外する。

## 3. `vendors[]`（外注先）
| キー | 型 | 必須 | 意味 |
|---|---|---|---|
| `name` | string | ◯ | vendor名（External配下フォルダ名＝`External/<name>/{Order,Worker}`） |
| `type` | enum | ◯ | `実装系` \| `整形系` \| `生成系` |
| `hasAuditor` | bool | ◯ | Auditor（内部QA）を持つか。type別の既定は下表 |
| `tierMax` | int(0-3) | ◯ | 投入可能な最大Tier。Tier0は常に不可。整形系はTier1まで（Ollama等・無枠ローカル） |
| `strengths` | string | ◯ | 得意分野（発注の振り分けヒント） |

**type × レビュー体制（既定）**
| type | 例 | hasAuditor | レビュー主体 |
|---|---|---|---|
| 実装系 | Codex／将来Gemini・Antigravity | true | Auditor（外注先内部QA）＋社長室受入 |
| 整形系 | Ollama（ローカル・無枠） | false | 社長室が意味不変照合（Auditor無し） |
| 生成系 | 画像／動画 | false | 発注元Internal部署＋社長室レビュー（Sota本人もデザインレビュー）。レビュー非保有 |

- `External/<vendor>/{Order,Worker}` 構成を生成・監視する。新vendor追加は新規発注先採用＝社長承認必須。
- ブランド／世界観／法的判断はいかなる vendor.type でも発注不可（tierMax に関わらず Internal 専管）。

## 4. `magi[]`（第三者審査・3人格合議）
| キー | 型 | 必須 | 意味 |
|---|---|---|---|
| `persona` | enum | ◯ | `CASPER` \| `MELCHIOR` \| `BALTHASAR`（各1要素・計3） |
| `model` | string | ◯ | 起動モデル（例：Claude／GPT／Gemini3） |
| `role` | string | ◯ | 観点（経営・思想／仕様／技術） |
| `fallback` | string | ◯ | スロットル・クォータ枯渇時の挙動（`ESCALATE` または代替モデル名） |

- 合議：3人格が独立レポート→判定は **2/3以上で成立**。`ESCALATE_TO_HUMAN` は1票でも成立。
- 可用性担保：2/3合議＋スロットル時フォールバック。プレビュー系モデル（週次クォータ・料金変動リスク）は `fallback` を明示する。
- MAGI構成の変更（モデル差し替え含む）は契約第14条「**重大**」＝次tpr審査＋Sota承認。ドキュメント上は確定前のものを「改訂案／予定」と注記する。

## 5. `gatePolicy`（自動化ゲート閾値）
GATE は `order.md` 冒頭センチネル `<!-- ... GATE: auto|human ... -->` の値域と一対一。Watcher／通知はこれを読むだけで、書き手は社長室のみ。
| キー | 型 | 意味 |
|---|---|---|
| `auto` | object | 自動進行可の条件（ALL成立で着手）。`{ levelIn:[軽微,中規模], tierMax:2, requiresAuditorForMedium:bool }` |
| `human` | list | 必ず人間で停止する事項（GATE:human）。1項目でも該当すれば auto を上書きして停止 |
| `default` | enum | 既定値。`human`（fail-closed＝曖昧・判定不能・複数該当は human に倒す） |

## 6. `tierPolicy`（情報保護階層）
| キー | 型 | 意味 |
|---|---|---|
| `0` | object | 不可侵。`{ desc, outsourcing:false, git:false }`（処方・顧客・認証・売上実数・.secrets/_Records） |
| `1` | object | 社内限定。例外共有はSota承認＋整形系（無枠ローカル）限定 |
| `2` | object | 案件共有可。マスキング後 `inputs/`（MAGIは `inbox/`）へ。外注の既定対象 |
| `3` | object | 公開可（任意） |

## 7. `secretaryDelegation`（秘書室の自律境界）
管制塔としての秘書室が**自室判断で推進できる範囲**を宣言する。
| キー | 型 | 意味 |
|---|---|---|
| `autonomous` | list | 秘書室が承認なしで推進可（ord/tpr監視・tsk管理・ボード/ダッシュ維持・Tier2かつ軽微のみ） |
| `requiresPresident` | list | 社長承認必須（Tier0/1・顧客接点・本番・契約改訂・新規発注先採用・支出・Tier0/1接触） |
| `escalate` | list | 外部／ThirdParty進言は社長へエスカレ |

---

## 描画・判定の読み取り順（ジェネレータ規約）
1. `instanceName`＋`repos` → ダッシュボード見出し・通知接頭辞。
2. `departments[]` → 部署タブ／ボードの部署軸（要素数で動的）。`noOutsourcing` で発注対象から除外。
3. `vendors[]` → External経路・Auditorバッジ・Tier上限ガード。
4. `magi[]` → 審査タブ・2/3合議表示・`fallback` 注記（プレビュー系は「改訂案/予定」表示）。
5. `gatePolicy`/`tierPolicy` → Watcher着手可否・防火壁・マスキング要否・通知本文のTierマスク。
6. `secretaryDelegation` → 承認待ち強調と自律推進可否の分岐。
