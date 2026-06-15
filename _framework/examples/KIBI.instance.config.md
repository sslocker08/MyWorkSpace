> 起案中(draft)｜移行先: MyWorkSpace/_framework/Contracts/examples/KIBI.instance.config.md ｜ KIBI非依存の汎用テンプレ。インスタンスは継承し固有値は instance.config と各Contractsで具体化。

# KIBI instance.config 記入例（v0.1・draft）

スキーマ＝`Contracts/_framework/instance-config.schema.md`。本書は **KIBIインスタンス1社分の具体値**を記入した例。確定移行先は `MyWorkSpace/KIBI/Contracts/instance.config`。値は 2026-06-15 Sota承認の運用基盤方向に沿う（MAGIのAntigravityは下記のとおり「改訂案／予定」と注記）。

```yaml
instanceName: KIBI

repos:
  workspace: "sslocker08/MyWorkSpace"        # 正本(private)。MyWorkSpace/KIBI がインスタンス1
  website:
    repo: "kibi-fragrance/<site-repo>"        # 公開サイト(Internal/System由来)
    link: submodule                            # workspace に submodule で結合(別repo維持)

# ── 社内10部署(Internal)。部署数は動的。社長室直轄は noOutsourcing 寄り ──
departments:
  - { key: HQ,  name: 社長室,            role: 設計・発注・受入・統合・最終判断(内部監査兼任), noOutsourcing: true }
  - { key: SEC, name: 秘書室,            role: 管制塔(ord/tpr監視・tsk管理・ボード/ダッシュ維持), noOutsourcing: true }
  - { key: PLN, name: 経営企画室,        role: 成長ロードマップ・KPI・組織運営(社長直轄),       noOutsourcing: true }
  - { key: BRD, name: ブランド戦略室,     role: 理念・世界観の憲法(社長直轄),                    noOutsourcing: true }
  - { key: PRD, name: 製品開発部,        role: 調香・処方・5製品・次作開発(Tier0),              noOutsourcing: true }
  - { key: WEB, name: EC・情報システム部, role: 本番サイト・決済・在庫・セキュリティ・社内ツール保守, noOutsourcing: false }
  - { key: MKT, name: マーケティング部,   role: 4媒体・認知拡大・コンテンツ,                     noOutsourcing: false }
  - { key: MED, name: 広報部,            role: PR・メディア掲載・UGC・アドボケイト,             noOutsourcing: false }
  - { key: SLS, name: 営業部,            role: 卸・委託販売・実店舗提案・ポップアップ,           noOutsourcing: false }
  - { key: FIN, name: 経理・財務部,       role: 売上・原価・利益・税務(正本データは _Records),    noOutsourcing: true }
  - { key: LGL, name: 法務・コンプラ部,   role: 規約・特商法・IFRA/薬機・商標,                   noOutsourcing: true }
  # 注: 部署コードは旧フォルダ名由来のまま維持(ID連続性)。WEBの folder名は System。

# ── 外注先(External)。新vendor採用は社長承認必須 ──
vendors:
  - name: Codex
    type: 実装系
    hasAuditor: true                           # 外注先内部QA(別セッション)
    tierMax: 2                                  # Tier2まで(マスキング後)。Tier0/1不可
    strengths: コード実装・テスト・差分照合・既存仕様準拠の機能追加
  - name: Ollama
    type: 整形系
    hasAuditor: false                           # Auditor無し→社長室が意味不変照合
    tierMax: 1                                  # ローカル・無枠。外部送信ゼロ。Tier0非接触
    strengths: 整形・要約・通知文生成・ダミーデータ処理(rate-limit退避先)
  # 生成系(画像/動画)は採用時に追加。type:生成系 / hasAuditor:false /
  # レビュー=発注元Internal部署+社長室(Sota本人もデザインレビュー)。
  # 将来の実装系候補(Gemini/Antigravity)は採用時に type:実装系・hasAuditor:true で追加。

# ── 第三者審査(ThirdParty)。3人格2/3合議。変更は契約第14条「重大」 ──
magi:
  - persona: CASPER
    model: Claude
    role: 経営・思想審査(KIBI憲章/世界観整合・情報保護・利益相反)。verdict集約・casper.md直記担当
    fallback: ESCALATE                          # 同門(Claude)。単独賛成では重大を通さない(2/3要件)
  - persona: MELCHIOR
    model: GPT
    role: 仕様審査(発注書一致・受入基準充足・範囲外編集の有無)。別チャットで独立起動
    fallback: ESCALATE
  - persona: BALTHASAR
    model: GPT                                  # 改訂案/予定: GPT2人格の片方を Antigravity/Gemini3 へ置換検討
    role: 技術審査(実装品質・保守性・テスト可能性・セキュリティ)。別チャットで独立起動
    fallback: Antigravity_or_ESCALATE           # 改訂案/予定: Antigravityは無料だがプレビュー(週次クォータ/料金変動)。
                                                # スロットル時は代替→不可なら ESCALATE。構成変更は次tpr審査+Sota承認

# ── 自動化ゲート(GATE)。書き手は社長室のみ。Watcherは読むだけ ──
gatePolicy:
  auto:                                         # GATE:auto = ALL成立で自動着手
    levelIn: [軽微, 中規模]                      # 重大は不可
    tierMax: 2                                  # Tier2以下。Tier1は外部委託先へ出さずOllama限定。Tier0不可
    requiresAuditorForMedium: true              # 中規模はCodex内部監査必須(関門は省略しない)
    extraConditions:                            # 自動着手の最小条件(ALL)
      - STATE行が機械可読
      - locks.md に競合なし
      - サーキットブレーカ未発火
  human:                                        # GATE:human = 1項目でも該当→停止+スマホ承認待ち
    - 契約/憲章/受入基準/情報保護/AI役割定義の改訂(重大)
    - 決済・認証・本番デプロイ
    - 顧客接点(顧客接点を伴う遷移)
    - 新規発注先の採用・支出
    - 外部AIへの大規模情報共有(Tier1例外共有・大量スナップショット投入)
    - Tier0接触(.secrets/_Records/処方原本/顧客個人情報) ※恒久禁止・検知時は停止+違反記録
  default: human                                # fail-closed: 曖昧/判定不能/複数該当は human に倒す

# ── 情報保護階層(Tier)。防火壁・マスキングの基盤 ──
tierPolicy:
  "0": { desc: "不可侵: .secrets/ _Records/ 処方原本 顧客個人情報 認証実値 売上実数", outsourcing: false, git: false }
  "1": { desc: "社内限定。例外共有はSota承認+整形系(Ollama無枠)限定",                outsourcing: false, git: true }
  "2": { desc: "案件共有可。マスキング後 inputs/(MAGIは inbox/)へ。外注の既定対象",  outsourcing: true,  git: true }
  "3": { desc: "公開可(charter-public等)",                                          outsourcing: true,  git: true }

# ── 秘書室の自律境界(管制塔) ──
secretaryDelegation:
  autonomous:                                   # 自室判断で推進可
    - ord/tpr の監視
    - tsk(タスク)管理
    - ボード/ダッシュボードの維持・再生成
    - Tier2かつ軽微の推進のみ(GATE:auto相当)
  requiresPresident:                            # 社長承認必須
    - Tier0/1接触
    - 顧客接点
    - 本番反映
    - 契約改訂
    - 新規発注先の採用
    - 支出
  escalate:                                     # 社長へエスカレ
    - 外部(External)からの進言
    - ThirdParty(MAGI)からの勧告
```

## 記入メモ（KIBI固有の注記）
- **MAGIのAntigravity／Gemini3 は「改訂案／予定」**。現行確定構成は CASPER(Claude)＋MELCHIOR(GPT)＋BALTHASAR(GPT)。GPT2人格の片方を置換する案であり、発効は契約第14条「重大」＝次tpr審査＋Sota承認後。確定までは現構成が有効。
- **API課金ゼロが絶対条件**：エージェント間連携はファイル／gitのみ（相互API呼び出しなし）。計算は常にローカルMac。GitHubは永続化＋監査ログのみ（hostedランナー不可）。
- **移行は不可逆・最大の漏洩リスク**：`sslocker08/MyWorkSpace` への移行はSota合図待ち。新規 git init（履歴引継ぎなし）＋commit前に .gitignore 再適用＋秘匿スキャン。`.secrets/` `_Records/` `Kofukuron23/` `*.db` `_knowledge/_data` は絶対不可。
- **ブランド／世界観／法的判断は外注不可**（vendor.type・tierMax に関わらず Internal 専管）。
