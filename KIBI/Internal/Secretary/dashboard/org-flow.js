/* ============================================================================
 * org-flow.js  ── KIBI ダッシュボード WP-ORG（組織図＋フロー図）v2
 * ----------------------------------------------------------------------------
 * 自己完結モジュール。外部依存なし。app.css に依存しない（of- 接頭辞で名前空間化）。
 * グローバルに window.KIBIOrgFlow = { renderOrgChart(config, el), renderFlow(el) }
 * を公開する（公開API名は不変。app.js の呼び出しを壊さない）。
 *
 * v2 方針: 横スクロールSVGを全廃し、縦スクロール・モバイル仕様の
 *   「階層カード／インデントツリー」HTML へ作り替える。
 *   - 各ノード = name + role + タグの小カード
 *   - width:100% ・縦スクロールのみ・横スクロール禁止
 *   - config 空(null/{}) でも最小枠を描く
 *   - ライト/ダークは prefers-color-scheme 追従
 *   - 各 render は単一 root 要素を el.innerHTML に挿入する
 *
 *   renderOrgChart(config, el): /api/config の形
 *     { instanceName, departments:[{key,name,role,noOutsourcing}],
 *       vendors:[{name,type,hasAuditor,tierMax,strengths,status}],
 *       magi:[{persona,model,role}] }
 *
 *   renderFlow(el): 指示→社長室(起票/発注)→Watcher(GATE)→分岐(auto/human)
 *     →Worker/MAGI→社長室レビュー/統合→(必要なら)本番デプロイ＋ESCALATE注記。
 *
 * 配色（状態色は最小限）:
 *   緑=完了/受入 / 青=進行 / 橙=承認待ち/human / 赤=競合/差戻し / 灰=準備中
 *   領域アクセント: internal(青紫) / external(緑灰) / third(紫)
 * ==========================================================================*/
(function () {
  "use strict";

  // ── ユーティリティ ─────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // 状態ピル（小タグ）。tone は CSSクラスの接尾（internal/external/third/green/blue/amber/red/gray）
  function pill(label, tone) {
    return '<span class="of-pill of-pill-' + tone + '">' + esc(label) + "</span>";
  }

  // ── 共通 <style>（of- 名前空間でスコープ。app.css 非依存）─────────
  // 各 render が自分の root に必ず同梱する（自己完結）。同一内容の <style> が
  // 複数枚あっても CSS は冪等（同じ規則なので衝突しない）。app.js は org タブを
  // 再描画するたびに innerHTML を入れ替えるため、DOM共有のキャッシュは持たない。
  function styleBlock() {
    return (
      '<style>' +
      // ルート（CSS変数。ライト既定→ダークは prefers-color-scheme で上書き）
      '.of-root{' +
        '--of-ink:#2b2b33;--of-sub:#6b6b78;--of-line:#d7d7e0;--of-faint:#ececf2;' +
        '--of-surface:#ffffff;--of-surface2:#f6f6fa;--of-bg:#fbfbfd;' +
        '--of-green:#3f9a6d;--of-blue:#3f6fb0;--of-amber:#c98a2b;--of-red:#c1574f;--of-gray:#9a9aa6;' +
        '--of-internal:#5566a8;--of-external:#6f8a4f;--of-third:#9a6fa0;' +
        'font-family:-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif;' +
        'color:var(--of-ink);width:100%;box-sizing:border-box;' +
        '-webkit-text-size-adjust:100%;' +
      '}' +
      '.of-root *{box-sizing:border-box;}' +
      // セクション（領域）
      '.of-sec{margin:0 0 14px;border:1px solid var(--of-line);border-radius:12px;' +
        'background:var(--of-surface2);padding:10px 10px 12px;border-left-width:4px;}' +
      '.of-sec-internal{border-left-color:var(--of-internal);}' +
      '.of-sec-external{border-left-color:var(--of-external);}' +
      '.of-sec-third{border-left-color:var(--of-third);}' +
      '.of-sec-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;margin:2px 2px 10px;}' +
      '.of-sec-name{font-size:11px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;}' +
      '.of-sec-internal .of-sec-name{color:var(--of-internal);}' +
      '.of-sec-external .of-sec-name{color:var(--of-external);}' +
      '.of-sec-third .of-sec-name{color:var(--of-third);}' +
      '.of-sec-note{font-size:11px;color:var(--of-sub);}' +
      // ノードカード
      '.of-node{border:1px solid var(--of-line);border-radius:10px;background:var(--of-surface);' +
        'padding:8px 10px;margin:0 0 8px;}' +
      '.of-node:last-child{margin-bottom:0;}' +
      '.of-node-lead{border-color:var(--of-ink);border-width:1.5px;}' +
      '.of-node-hq{border-color:var(--of-internal);border-width:1.5px;background:var(--of-faint);}' +
      '.of-node-sec{border-color:var(--of-amber);border-width:1.5px;}' +
      '.of-node-vendor{border-color:var(--of-external);}' +
      '.of-node-magi{border-color:var(--of-third);}' +
      '.of-node-row{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px;}' +
      '.of-node-name{font-size:13px;font-weight:700;}' +
      '.of-node-code{font-size:11px;font-weight:800;color:var(--of-sub);letter-spacing:.04em;}' +
      '.of-node-role{display:block;font-size:11.5px;line-height:1.45;color:var(--of-sub);margin-top:3px;}' +
      '.of-node-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;}' +
      // インデント（階層）＋縦コネクタ
      '.of-children{position:relative;margin:0 0 0 14px;padding-left:12px;' +
        'border-left:2px solid var(--of-line);}' +
      '.of-children > .of-node::before{content:"";position:absolute;left:-12px;' +
        'width:10px;height:2px;background:var(--of-line);margin-top:18px;}' +
      '.of-children > .of-node{position:relative;}' +
      // 部署グリッド（モバイル1列→広幅2列、横スクロールなし）
      '.of-grid{display:grid;grid-template-columns:1fr;gap:8px;}' +
      '@media (min-width:560px){.of-grid{grid-template-columns:1fr 1fr;}}' +
      '.of-grid .of-node{margin:0;}' +
      // ピル（タグ）
      '.of-pill{display:inline-block;font-size:10px;font-weight:700;line-height:1;' +
        'padding:3px 7px;border-radius:999px;white-space:nowrap;}' +
      '.of-pill-internal{color:var(--of-internal);background:rgba(85,102,168,.14);}' +
      '.of-pill-external{color:var(--of-external);background:rgba(111,138,79,.16);}' +
      '.of-pill-third{color:var(--of-third);background:rgba(154,111,160,.16);}' +
      '.of-pill-green{color:var(--of-green);background:rgba(63,154,109,.16);}' +
      '.of-pill-blue{color:var(--of-blue);background:rgba(63,111,176,.16);}' +
      '.of-pill-amber{color:var(--of-amber);background:rgba(201,138,43,.18);}' +
      '.of-pill-red{color:var(--of-red);background:rgba(193,87,79,.16);}' +
      '.of-pill-gray{color:var(--of-gray);background:rgba(154,154,166,.20);}' +
      // 受け皿（プレースホルダ）
      '.of-placeholder{border:1px dashed var(--of-gray);border-radius:10px;color:var(--of-sub);' +
        'font-size:11.5px;padding:10px;text-align:center;background:transparent;}' +
      // フロー（縦ステップ）
      '.of-flow{}' +
      '.of-step{border:1px solid var(--of-line);border-radius:10px;background:var(--of-surface);' +
        'padding:9px 11px;border-left-width:4px;border-left-color:var(--of-line);}' +
      '.of-step-internal{border-left-color:var(--of-internal);}' +
      '.of-step-external{border-left-color:var(--of-external);}' +
      '.of-step-third{border-left-color:var(--of-third);}' +
      '.of-step-auto{border-left-color:var(--of-green);}' +
      '.of-step-human{border-left-color:var(--of-amber);}' +
      '.of-step-deploy{border-left-color:var(--of-green);}' +
      '.of-step-lead{border-left-color:var(--of-ink);}' +
      '.of-step-title{font-size:13px;font-weight:700;}' +
      '.of-step-sub{display:block;font-size:11.5px;line-height:1.45;color:var(--of-sub);margin-top:3px;}' +
      '.of-arrow{display:block;text-align:center;color:var(--of-sub);font-size:13px;' +
        'line-height:1;margin:5px 0;opacity:.75;}' +
      // 分岐（auto/human を縦に並べた区画）
      '.of-branch{border:1px dashed var(--of-line);border-radius:10px;padding:8px;margin:0;' +
        'display:grid;grid-template-columns:1fr;gap:8px;}' +
      '@media (min-width:560px){.of-branch{grid-template-columns:1fr 1fr;}}' +
      '.of-branch-lab{grid-column:1/-1;font-size:11px;color:var(--of-sub);margin:0 0 2px;}' +
      // ESCALATE 注記
      '.of-escalate{border:1px solid var(--of-red);border-left-width:4px;border-radius:10px;' +
        'background:rgba(193,87,79,.06);padding:9px 11px;margin-top:12px;}' +
      '.of-escalate-name{font-size:11px;font-weight:800;letter-spacing:.10em;color:var(--of-red);}' +
      '.of-escalate p{margin:5px 0 0;font-size:11.5px;line-height:1.5;color:var(--of-sub);}' +
      // 図タイトル
      '.of-head{margin:0 0 10px;}' +
      '.of-head-title{font-size:15px;font-weight:800;letter-spacing:.01em;}' +
      '.of-head-sub{display:block;font-size:11.5px;color:var(--of-sub);margin-top:3px;line-height:1.45;}' +
      // ダーク（prefers-color-scheme 追従）
      '@media (prefers-color-scheme: dark){' +
        '.of-root{' +
          '--of-ink:#e7e7ee;--of-sub:#a9a9b8;--of-line:#3a3a46;--of-faint:#2a2a34;' +
          '--of-surface:#22222b;--of-surface2:#1d1d25;--of-bg:#191920;' +
        '}' +
      '}' +
      '</style>'
    );
  }

  // 各 render の root へ毎回同梱（自己完結。DOM状態に依存しない）
  function styleTag() {
    return styleBlock();
  }

  // ========================================================================
  // renderOrgChart(config, el)  ── 縦の階層カード／インデントツリー
  // ========================================================================
  function renderOrgChart(config, el) {
    if (!el) return;
    config = config || {};
    var depts = Array.isArray(config.departments) ? config.departments : [];
    var vendors = Array.isArray(config.vendors) ? config.vendors : [];
    var magi = Array.isArray(config.magi) ? config.magi : [];
    var instanceName = config.instanceName || "KIBI";

    var h = [];
    h.push('<div class="of-root">');
    h.push(styleTag());

    // ── 図タイトル ──
    h.push('<div class="of-head">');
    h.push('<span class="of-head-title">' + esc(instanceName) + ' 三社体制 組織図</span>');
    h.push('<span class="of-head-sub">Internal（社内＝Claude）／External（外注）／ThirdParty（中立審査＝KIBI-MAGI）</span>');
    h.push('</div>');

    // ====================================================================
    // 区画1: Internal（社内）── Sota → 社長室(HQ) → [秘書室＋各部署]
    // ====================================================================
    h.push('<section class="of-sec of-sec-internal">');
    h.push('<div class="of-sec-head"><span class="of-sec-name">Internal</span>' +
      '<span class="of-sec-note">社内（Claude）・設計／判断／統合のすべて</span></div>');

    // Sota（指示の起点）
    h.push(nodeCard({
      cls: "of-node-lead", name: "Sota（社長）", role: "最終判断・指示の起点（内部監査兼任）",
      tags: []
    }));

    // 社長室(HQ) ＝ Sota の子。HQ をdeptから抽出して見出し化、残りを children へ。
    var hqDept = null, rest = [];
    for (var i = 0; i < depts.length; i++) {
      if ((depts[i] || {}).key === "HQ") hqDept = depts[i];
      else rest.push(depts[i]);
    }
    h.push('<div class="of-children">');
    h.push(nodeCard({
      cls: "of-node-hq", code: "HQ", name: (hqDept && hqDept.name) || "社長室",
      role: (hqDept && hqDept.role) || "設計・発注・受入・統合（発注権は唯一ここ）",
      tags: [pill("発注権", "internal"), pill("外注不可", "internal")]
    }));

    // HQ の子 = 秘書室(管制塔) ＋ 各部署（グリッド・横スクロールなし）
    if (rest.length === 0) {
      h.push('<div class="of-children"><div class="of-placeholder">部署（config未読み込み）</div></div>');
    } else {
      // 秘書室(SEC)を先頭に寄せ、管制塔として強調
      rest.sort(function (a, b) {
        var ak = (a || {}).key === "SEC" ? 0 : 1;
        var bk = (b || {}).key === "SEC" ? 0 : 1;
        return ak - bk;
      });
      h.push('<div class="of-children"><div class="of-grid">');
      for (var d = 0; d < rest.length; d++) {
        var dep = rest[d] || {};
        var isSEC = dep.key === "SEC";
        var tags = [];
        if (isSEC) tags.push(pill("管制塔", "amber"));
        if (dep.noOutsourcing) tags.push(pill("外注不可", "internal"));
        else tags.push(pill("外注可", "external"));
        h.push(nodeCard({
          cls: isSEC ? "of-node-sec" : "", code: dep.key || "", name: dep.name || "部署",
          role: dep.role || "", tags: tags
        }));
      }
      h.push('</div></div>'); // of-grid / of-children
    }
    h.push('</div>'); // of-children (HQ層)
    h.push('</section>'); // Internal

    // ====================================================================
    // 区画2: External（外注）── vendors（型/Tier/Auditorタグ）
    // ====================================================================
    h.push('<section class="of-sec of-sec-external">');
    h.push('<div class="of-sec-head"><span class="of-sec-name">External</span>' +
      '<span class="of-sec-note">外注（Worker実装＋Auditor内部QA）・スナップショット供給</span></div>');
    if (vendors.length === 0) {
      h.push('<div class="of-placeholder">外注先（config未読み込み）</div>');
    } else {
      for (var vi = 0; vi < vendors.length; vi++) {
        var v = vendors[vi] || {};
        var vtags = [];
        if (v.type) vtags.push(pill(String(v.type), "external"));
        if (v.tierMax != null) vtags.push(pill("Tier≤" + v.tierMax, "blue"));
        vtags.push(pill(v.hasAuditor ? "Auditor有" : "Auditor無", v.hasAuditor ? "green" : "gray"));
        if (v.status) vtags.push(pill(String(v.status), v.status === "稼働" ? "green" : "amber"));
        h.push(nodeCard({
          cls: "of-node-vendor", name: v.name || "vendor", role: v.strengths || "", tags: vtags
        }));
      }
    }
    // 受け皿（将来vendor）
    h.push('<div class="of-placeholder" style="margin-top:8px;">受け皿（将来vendor・採用は社長承認）</div>');
    h.push('</section>'); // External

    // ====================================================================
    // 区画3: ThirdParty（中立審査＝KIBI-MAGI）── 3人格 model付き
    // ====================================================================
    h.push('<section class="of-sec of-sec-third">');
    h.push('<div class="of-sec-head"><span class="of-sec-name">ThirdParty</span>' +
      '<span class="of-sec-note">中立審査（KIBI-MAGI）・3人格 2/3合議・読み取り専用・勧告のみ</span></div>');
    var mlist = magi.slice();
    if (mlist.length === 0) {
      mlist = [{ persona: "CASPER" }, { persona: "MELCHIOR" }, { persona: "BALTHASAR" }];
    }
    for (var mi = 0; mi < mlist.length; mi++) {
      var m = mlist[mi] || {};
      var mtags = [];
      if (m.model) mtags.push(pill(String(m.model), "third"));
      h.push(nodeCard({
        cls: "of-node-magi", name: m.persona || "MAGI", role: m.role || "", tags: mtags
      }));
    }
    h.push('<p class="of-sec-note" style="margin:8px 2px 0;">※ GPT2人格の片方→Antigravity/Gemini3 は改訂案/予定（次tpr審査＋Sota承認）。</p>');
    h.push('</section>'); // ThirdParty

    h.push('</div>'); // of-root
    el.innerHTML = h.join("");
  }

  // ノードカード（name + code + role + tags）を1枚生成
  function nodeCard(o) {
    o = o || {};
    var s = '<div class="of-node ' + (o.cls || "") + '">';
    s += '<div class="of-node-row">';
    if (o.code) s += '<span class="of-node-code">' + esc(o.code) + '</span>';
    s += '<span class="of-node-name">' + esc(o.name || "") + '</span>';
    s += '</div>';
    if (o.role) s += '<span class="of-node-role">' + esc(o.role) + '</span>';
    if (o.tags && o.tags.length) {
      s += '<div class="of-node-tags">' + o.tags.join("") + '</div>';
    }
    s += '</div>';
    return s;
  }

  // ========================================================================
  // renderFlow(el)  ── 縦のステップ列（指示→…→デプロイ）＋ESCALATE
  // ========================================================================
  function renderFlow(el) {
    if (!el) return;
    var h = [];
    h.push('<div class="of-root of-flow">');
    h.push(styleTag());

    // ── 図タイトル ──
    h.push('<div class="of-head">');
    h.push('<span class="of-head-title">仕事のフロー ── 指示から統合・デプロイまで</span>');
    h.push('<span class="of-head-sub">GATE:auto＝自動着手（Tier2かつ軽微）／GATE:human＝承認ゲート（スマホ通知で待機）</span>');
    h.push('</div>');

    // 1) 指示
    h.push(stepCard("of-step-lead", "指示", "Sota（社長）── 最終判断・指示の起点"));
    h.push(arrow());
    // 2) 社長室（起票/発注）
    h.push(stepCard("of-step-internal", "社長室 HQ", "起票・発注（ord / tpr）。発注権は唯一ここ"));
    h.push(arrow());
    // 3) Watcher（GATE判定）
    h.push(stepCard("of-step-human", "Watcher（GATE判定）", "Tier・影響度を読み auto / human を振り分け"));
    h.push(arrow());

    // ── 分岐（auto / human を縦区画に）──
    h.push('<div class="of-branch">');
    h.push('<p class="of-branch-lab">GATE 分岐</p>');
    h.push(stepCard("of-step-auto", "GATE:auto", "自動実行（Tier2かつ軽微）。秘書室が自室判断で推進"));
    h.push(stepCard("of-step-human", "GATE:human", "承認ゲート＋スマホ通知で待機（Sota承認後に進行）"));
    h.push('</div>');
    h.push(arrow());

    // ── 実行レイヤ: Worker / MAGI ──
    h.push(stepCard("of-step-external", "Worker（実装系）", "実装 → Auditor 内部QA（External / Codex・Antigravity 等）"));
    h.push(arrow());
    h.push(stepCard("of-step-third", "MAGI（審査）", "3人格 2/3合議・勧告のみ（ThirdParty / 読み取り専用）"));
    h.push(arrow());
    // ── 社長室レビュー・統合 ──
    h.push(stepCard("of-step-internal", "社長室レビュー", "受入・統合（内部監査チェック内蔵）"));
    h.push(arrow());
    // ── 本番デプロイ（必要時・human）──
    h.push(stepCard("of-step-deploy", "本番デプロイ", "必要時のみ（human 承認ゲート）"));

    // ── ESCALATE 注記 ──
    h.push('<div class="of-escalate">');
    h.push('<span class="of-escalate-name">ESCALATE</span>');
    h.push('<p>曖昧・複数該当・サーキットブレーカ発火・MAGIが ESCALATE_TO_HUMAN（1票）→ 即停止し Sota の承認待ち（fail-closed）。</p>');
    h.push('<p>外注 / MAGI からの進言・勧告は秘書室が受けて社長室へエスカレ（直接実行はしない）。</p>');
    h.push('</div>');

    h.push('</div>'); // of-root
    el.innerHTML = h.join("");
  }

  function stepCard(cls, title, sub) {
    var s = '<div class="of-step ' + (cls || "") + '">';
    s += '<span class="of-step-title">' + esc(title) + '</span>';
    if (sub) s += '<span class="of-step-sub">' + esc(sub) + '</span>';
    s += '</div>';
    return s;
  }
  function arrow() {
    return '<span class="of-arrow" aria-hidden="true">↓</span>';
  }

  // ── 公開（API名は不変）─────────────────────────────────────────
  window.KIBIOrgFlow = {
    renderOrgChart: renderOrgChart,
    renderFlow: renderFlow
  };
})();
