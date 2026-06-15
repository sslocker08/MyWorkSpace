# 部署ステータス：EC・情報システム部（WEB）

最終更新: 2026-06-12 随時

## 重点テーマ
- 管理画面再設計＋セキュリティ是正（feat/admin-redesign）の本番デプロイ

## タスク
| ID | 担当者 | タスク | ステータス | トリガー | モデル | 期限 | 進捗 | 優先度 | 関係部署 | 完了日 |
|---|---|---|---|---|---|---|---|---|---|---|
| tsk-web-001 | システム設計 | admin再設計の本番デプロイ | 完了 | jdg-web-001 | Opus | - | 100% | 最高 | 社長室 | 2026-06-12 |
| tsk-web-002 | 実装 | デプロイ後の環境変数整備 | 完了 | req-hq-003 | Sonnet | - | 100% | 高 | - | 2026-06-12 |
| tsk-web-003 | 実装 | Firebase Console設定確認 | 他部署待ち | req-hq-003 | Sonnet | - | 50% | 高 | 社長室 | |
| tsk-web-004 | 実装 | 露出閉鎖（toml 404追加・小文字/netlify*） | 完了 | req-hq-003 | Sonnet | - | 100% | 最高 | 社長室 | 2026-06-12 |
| tsk-web-005 | CMS担当 | 内部文書是正（構成図・雛形明示・buildJST） | 完了 | req-hq-003 | Sonnet | - | 100% | 高 | - | 2026-06-12 |
| tsk-web-006 | システム設計 | 販売記録のWeb外退避（実測後に撤去） | 完了 | req-hq-003 | Opus | - | 100% | 最高 | 経理・財務部 | 2026-06-12 |
| tsk-web-007 | テスト・QA | 事後の遮断404・主要導線の実測 | 完了 | req-hq-003 | Sonnet | - | 100% | 最高 | - | 2026-06-12 |
| tsk-web-008 | システム設計 | 認証情報ローテーション（残はコンソール） | 他部署待ち | req-hq-003 | Opus | - | 60% | 最高 | 社長室 | |
| tsk-web-009 | システム設計 | 販売記録の保全調査と完全バックアップ確立 | 完了 | fbk-hq-006 | Opus | - | 100% | 最高 | 経理・財務部 | 2026-06-12 |
| tsk-web-010 | 実装(規約) | 法務ページ改訂（特商法反映済・残は弁護士後） | 他部署待ち | req-lgl-001 | Opus | - | 80% | 中 | 法務・コンプラ部 | |
| tsk-web-011 | システム設計 | 在庫運用回答＋ローカル在庫同期 | 完了 | req-sls-003 | Opus | - | 100% | 中 | 営業部 | 2026-06-12 |
| tsk-web-012 | システム設計 | 残課題3件の設計案(BU/publish/自律) | 完了 | req-hq-001/002/006 | Opus | - | 100% | 中 | 社長室 | 2026-06-12 |

## 今日やること（朝礼）
- 最重要：本番露出ゼロ化＋feat/admin-redesign の本番デプロイ完遂（req-hq-003/fbk-hq-001/dec-005）
- 完了させたい成果物：/claude.md小文字404・/netlify/*遮断・販売記録撤去・デプロイ・事後実測・認証ローテ
- リスク：本番デプロイは決済/認証/在庫に影響。実測（HTTPコード）で無回帰を確認しながら段階実施

## 今日の結果（夕礼）
- 完了：feat/admin-redesign を本番デプロイ。本番露出ゼロを実測（内部17パス=/claude.md・/CLAUDE.md・/docs/*・/netlify/*・販売記録・data系・server.js等→404／主要導線200・admin401・決済405）。/claude.md小文字・/netlify/*ソース・deno.lock・data.example を遮断。販売記録はSHA-256一致確認後にWeb撤去（正本_Records/）。HMAC2件をCLI交換し再デプロイで反映。build.js JST化。構成図・雛形READMEを是正。
- 未完了：認証情報の残ローテーション（ADMIN_TOKEN/ADMIN_GATE/Stripe/SMTP/Firebase・Firebase設定）は社長のコンソール操作（手順書 docs/CREDENTIAL_ROTATION_2026-06-12.md を提示）。
- 学び：.netlifyignore/.gitignore はCLIデプロイで参照されない＝機密はpublish直下に置かず force404 が遮断の正本。/netlify/*（ソース）と /.netlify/*（実行）は別パスで非干渉。値の流出は無く予防的交換。
- 明日：社長のコンソール操作支援、req-hq-001（バックアップ）/002（自律運転）着手、feat→main 反映の要否判断。

## 他部署への依頼
| ID | 宛先 | 内容 | 緊急度 | 期限 | ステータス |
|---|---|---|---|---|---|

## 受けた依頼への対応
| ID | 依頼元 | ステータス | 回答・参照 |
|---|---|---|---|
| req-hq-001 | 社長室 | 設計済(実行は承認後) | 4層設計＝L1 部署ドキュメントのroot private Git化(_Records/.secrets/Web除外・誤コミット実測関門あり)／L2 _Records個人情報はTime Machine+暗号退避／L3 .secrets認証はPWマネージャ・本番は環境変数権威／L4 本番Blobsは3層確立済。実行は個人情報・認証に関わるため社長承認後。設計=`Internal/System/docs/REQ-HQ-001_backup-architecture_2026-06-12.md` |
| req-hq-002 | 社長室 | 設計済(段階導入) | 段階設計＝Phase1 読取専用(デプロイ監視/npm audit週次/バックアップ確認日次・観測と報告のみ)→Phase2 書込は要承認・レビュー関門。トークン5h/週制限はクラウドcronでリセット後に自動再開(ローカルloopは制限中動けないため)。決済/認証/本番反映の自走は事前承認。設計=`Internal/System/docs/REQ-HQ-002_autonomous-ops_2026-06-12.md` |
| req-hq-003 | 社長室 | 回答済 | 露出ゼロを本番実測（内部17パス404・主要導線200・admin401・決済405）。feat本番デプロイ済。販売記録はSHA一致後Web撤去。HMAC2件CLI交換。残はコンソール操作＝docs/CREDENTIAL_ROTATION_2026-06-12.md＋社長依頼 |
| req-hq-006 | 社長室 | 設計済(実行は承認後) | 推奨=ビルド方式：デプロイ前に公開ホワイトリストをdist/へ抽出し publish="dist"。内部ファイルの物理アップロードを根絶(force404は保険で残す)。本番デプロイ構造変更=決済/認証/OGP edgeに影響→draft実測後に承認・本番。設計=`Internal/System/docs/REQ-HQ-006_publish-separation_2026-06-12.md` |
| req-lgl-001 | 法務・コンプラ部 | 一部反映済/残は弁護士後 | 草案＝`Internal/System/docs/LEGAL_PAGES_REVISION_DRAFT_2026-06-12.md`（特商法/プラポリ/規約 全文・重大度A/B/C反映）。社長確認＝**個人事業主(末田壮太・屋号KIBI)**確定。社長指示で**特商法(legal_notice)を本番反映済**：blob read-modify-write で legal_notice のみ更新＋_version 6→7、機密(smtp/stripe/firebase)・在庫(32)はbyte保全、公開/api/dataで新文言配信＆機密strip実測。L-1事業者名/L-2税込明記/L-5制定改定日を充足。**残=プラポリ(P-2越境移転)・規約(T-1免責)は弁護士確認後に反映**（弁護士フラグ項目を含むため保留）。L-3(最終確認画面=Stripe Checkout)はcustom_text/consent追加の別タスク化（要専門家）。反映はローカルInternal/System/不使用・当日backup-2026-06-12.jsonで巻戻し可 |
| req-fin-002 | 経理・財務部 | 回答済 | 【結論=本番は無損失】本番blob sales-records.json=**108件121本**（管理画面CSVと完全一致・Feb–May・うちStripe6件）。「10件13本」は本番でなく**ローカル Internal/System/sales-records.json（Git除外の旧作業ファイル・5月分のみ・本番/CSVとID0重複）**＝退避時に本番と誤認。在庫も同型（本番32=正/ローカル37=旧シード）。inventory-records.jsonは本番空[]（出庫は sales-records側に記録）。**完全バックアップ経路を確立**：日次自動(data-backup→kibi-backups・30世代・JST0時・全4ストア)は本日デプロイ初投入で未走→手動実行で初回 backup-2026-06-12.json 作成・108件保全と機密strip実測。月次退避は管理画面「販売記録JSONエクスポート」（全件・本番反映）を正に、Internal/System/ローカルは使わない。詳細 `Internal/System/docs/SALES_BACKUP_INVESTIGATION_2026-06-12.md` |
| req-sls-003 | 営業部 | 回答済 | 【運用確認】EC引当=自動2段階(カート仮押さえ35分→決済で確定減算・冪等性)・入庫=手動(管理画面入庫記録)。委託/出展はStripe外=自動減算なし→二重販売防止は「EC割当分のみ本番stock計上＋残は営業の持出台帳」を推奨(在庫はチャネル別分離なし)。完売需要は再入荷通知の商品別登録数で可視化。配分比率はjdg-sls-001(社長判断)、決定後EC割当分をWEBが入庫計上。詳細=`Internal/System/docs/REQ-SLS-003_inventory-ops_2026-06-12.md`。本番在庫実測=SOU0/SEAL6/PASS26 |

## 詰まり・障害
| ID | 内容 | 影響 | 必要な支援 | ステータス |
|---|---|---|---|---|

## 社長室への判断依頼
| ID | 内容 | 背景 | 期限 |
|---|---|---|---|
<!-- jdg-web-001 は dec-005 / fbk-hq-001 で条件付き承認→実行・完了。判断待ちなし -->


## 共有・アピール
- 完了報告：監査是正＋feat/admin-redesign 本番デプロイ完遂（req-hq-003/fbk-hq-001/dec-005）。本番露出ゼロを実測（HTTPコードで判定・内部17パス404／主要導線200・admin401・決済405）。販売記録は _Records/ への退避をSHA-256一致で確認後にWeb撤去。
- 依頼：社長のコンソール操作（認証情報の残ローテーション＝ADMIN_TOKEN/ADMIN_GATE/Stripe/SMTP、Firebaseのリファラー制限・承認済みドメイン）。手順書 `Internal/System/docs/CREDENTIAL_ROTATION_2026-06-12.md`（2-1〜2-6）。値はWEBで保持しない方針のため社長手元で実施を願う。
- 連絡：feat→main を反映済（PR #15 マージ＝merge 2698072）。push・マージ完遂し、main にも遮断ルールが入ったため main からのデプロイでも露出は再発しない。根本原因を解消。リポジトリは github.com/kibi-fragrance/kibi-fragrance。
- 【fbk-hq-006 回答】blk-fin-003 は**誤報＝本番無損失**を実測確定（本番108件121本＝CSV一致）。「10件」は本番でなくローカル旧ファイルの誤認。詳細・経理向け申し送りは `Internal/System/docs/SALES_BACKUP_INVESTIGATION_2026-06-12.md`。req-fin-002 回答済。
- 【自発是正・要共有】調査中に**自動バックアップが0件**（kibi-backups空＝data-backupが本日デプロイ初投入で未走）と判明。本番健全だが無保護のため `data-backup` を1回手動実行し初回バックアップ生成・108件保全と機密stripを実測検証。以降は毎日JST0時に自動取得（次回 06-13 00:00）。
- 経理へ：月次退避は管理画面「販売記録JSONエクスポート（全件・本番反映）」を正本に。`_Records/sales/sales-records_2026-06-12.json`(10件)は旧ローカルのため108件版へ差替推奨。在庫の真実源は本番Blobs（32）でローカルInternal/System/data.json(37)は陳腐化（blk-fin-002 は本番に問題なし）。
- 【blk-fin-002 是正完了】ローカルInternal/System/data.json の在庫を本番スナップショット値へ同期（SOU1→0/SEAL8→6/PASS28→26＝香水3種37→32、MOUI99→96）。Git除外・未デプロイ・本番非影響・JSON妥当性確認済。本番Blobsが唯一の真実源（開発時の混乱回避が目的）。fbk-hq-005/007「次の優先=blk-fin-002 是正確認」に対応。
- 【req-sls-003 回答】営業部の7月SOU-ODORI 100本 在庫運用確認に回答（jdg-sls-001 の材料）。EC引当=自動2段階／入庫=手動／委託・出展の二重販売防止＝EC割当のみ計上を推奨／完売需要は再入荷通知で可視化。配分比率は社長判断。詳細=`Internal/System/docs/REQ-SLS-003_inventory-ops_2026-06-12.md`。
- 【req-hq-001/006/002 設計完了】全社バックアップ体制(root private Git化・個人情報/認証は除外)／publish分離(ビルド方式でdist抽出・物理アップロード根絶)／自律運転(読取専用から段階導入・制限リセットはクラウドcron)の3設計案を作成。いずれも実行は社長承認後(個人情報・認証・本番構造変更を含むため)。設計=`Internal/System/docs/REQ-HQ-001_*`/`REQ-HQ-006_*`/`REQ-HQ-002_*`。
