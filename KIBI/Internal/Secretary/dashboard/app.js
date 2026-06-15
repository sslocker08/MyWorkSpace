/* KIBI 全社ダッシュボード SPA v2（WP-SPA・バニラJS・ビルド不要）
   ── v1 から温存した配線（壊さない） ──
   - live/static 自動判定：/api/pipeline 応答→live(SSE /api/stream)、不応答→static(_pipeline.json 60秒ポーリング)
   - /api/config・/api/board?name=（静的は ../boards/<name>.md）・POST /review・POST /api/build
   - renderMarkdown/renderTable/splitRow（md表パーサ）・setLive・テーマ・stampUpdated
   ── v2 で刷新したUI ──
   - 5タブ 概要/組織/課題/承認/連携（data-tabキーは overview/org/tasks/approvals/pipeline 不変）
   - 課題/承認/連携 は共通の「グループカード→項目カード→全項目展開」縦カード型
   - クライアント側フィルタ（担当部署 / STATE / 種別・委託先）
   外部依存なし・日本語UI・ローカル前提。 */
'use strict';

/* ───── 状態 ───── */
var state = {
  config: null,
  pipeline: null,
  prevSig: {},          // 直近のID→シグネチャ（変化検出＝パルス対象の特定）
  es: null,
  retryTimer: null,
  retryMs: 2000,
  mode: null,
  activeTab: 'overview',
  tasksRaw: null,       // 課題タブ：parse済み行
  judgmentsRaw: null,   // 承認タブ：jdg parse済み行
  loadedTasks: false,
  loadedJudgments: false,
  expanded: {},         // 項目カード開閉（ID→true）
  groupOpen: {},        // グループカード開閉（タブ:キー→true）
  filters: {            // タブ別フィルタ選択（軸→値 / null=全て）
    tasks: { dept: null, state: null, kind: null },
    approvals: { dept: null, state: null, kind: null },
    pipeline: { dept: null, state: null, kind: null },
  },
};

/* ───── 小物 ───── */
function $(id) { return document.getElementById(id); }
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function nowClock() {
  var d = new Date();
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

/* STATE → 状態色クラス（緑=完了/受入, 青=進行, 橙=human, 赤=競合/差戻し, 灰=準備中） */
function stateClass(st) {
  st = String(st || '');
  if (/(完了|受入|統合済|verdict済|回答済)/.test(st)) return 's-done';
  if (/(差戻し|中止)/.test(st)) return 's-bad';
  if (/(着手|提出済|監査済|審査中|条件付受入|依頼済|進行|レビュー待ち|他部署待ち)/.test(st)) return 's-prog';
  if (/(発注済|準備中)/.test(st)) return 's-idle';
  return 's-idle';
}
/* オープン判定（ステータスが「完了/中止」以外＝オープン） */
function isOpen(st) {
  st = String(st || '');
  return !/(完了|中止|統合済|verdict済|回答済|受入)/.test(st);
}

/* ───── タブ切替 ───── */
function initTabs() {
  var btns = document.querySelectorAll('.tabbtn');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var tab = b.getAttribute('data-tab');
      state.activeTab = tab;
      btns.forEach(function (x) { x.classList.toggle('active', x === b); });
      document.querySelectorAll('.panel').forEach(function (p) {
        p.classList.toggle('active', p.id === 'panel-' + tab);
      });
      onTabShown(tab);
    });
  });
}
function onTabShown(tab) {
  if (tab === 'org') renderOrg();
  else if (tab === 'tasks') {
    if (!state.loadedTasks) loadTasksBoard();
    else renderTasks();
  } else if (tab === 'approvals') {
    if (!state.loadedJudgments) loadJudgmentsBoard();
    else renderApprovals();
  } else if (tab === 'pipeline') {
    renderPipelineCards();
  }
}

/* ───── テーマ ───── */
function initTheme() {
  var saved = null;
  try { saved = localStorage.getItem('kibi-theme'); } catch (e) {}
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  $('themeBtn').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', cur);
    try { localStorage.setItem('kibi-theme', cur); } catch (e) {}
  });
}

/* ───── LIVEドット ───── */
function setLive(on) {
  $('liveBadge').classList.toggle('on', on);
  $('pipeLive').classList.toggle('on', on);
  if (state.mode === 'static') $('liveText').textContent = on ? '自動更新60s' : '未取得';
  else $('liveText').textContent = on ? '接続中' : '未接続';
}
function stampUpdated() {
  var t = nowClock();
  $('updatedAt').textContent = '更新 ' + t;
  $('pipeUpdated').textContent = t;
}

/* ───── 初回ロード ───── */
function boot() {
  initTabs();
  initTheme();
  $('rebuildBtn').addEventListener('click', rebuild);
  // ライブ(serve.js)か静的(GitHub Pages/file://)かを自動判定。
  // /api/pipeline が応答すればライブ＝SSE。応答しなければ静的＝相対スナップショットを60秒ポーリング＋リロード反映。
  fetch('/api/pipeline').then(function (r) { if (!r.ok) throw new Error('no-api'); return r.json(); })
    .then(function (p) {
      state.mode = 'live';
      fetch('/api/config').then(r => r.json()).then(applyConfig).catch(function () { applyConfig(null); });
      applyPipeline(p, false);
      openStream();
      loadTasksBoard(); loadJudgmentsBoard();   // 承認/KPIがタスク・jdgを集計できるよう先読み
    })
    .catch(function () {
      state.mode = 'static';
      enterStaticMode();
    });
}
function applyConfig(cfg) {
  state.config = cfg || { departments: [], vendors: [], magi: [] };
  if (state.config.instanceName) $('instanceName').textContent = state.config.instanceName;
  if (state.activeTab === 'org') renderOrg();
}
/* 静的ホスティング（GitHub Pages / file://）: バックエンド無し。相対スナップショットを読み、
   リロードで反映＋60秒ごとに自動更新。SSE・承認・再生成は使えない（閲覧のみ）。
   パス: 同階層 _pipeline.json ／ ルート ../../../instance.config.json ／ ../boards/*.md。 */
function enterStaticMode() {
  var rb = $('rebuildBtn'); if (rb) rb.style.display = 'none';
  fetch('../../../instance.config.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; }).then(applyConfig)
    .catch(function () { applyConfig(null); });
  refreshStatic();
  setInterval(refreshStatic, 60000);
  loadTasksBoard(); loadJudgmentsBoard();   // 承認/KPI集計のため先読み（静的＝../boards/*.md）
}
function refreshStatic() {
  fetch('_pipeline.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (p) {
      if (p) { applyPipeline(p, !!state.pipeline); setLive(true); }
      else { setLive(false); }
    })
    .catch(function () { setLive(false); });
}

/* ───── SSE ───── */
function openStream() {
  if (!window.EventSource) { setLive(false); return; }
  try {
    var es = new EventSource('/api/stream');
    state.es = es;
    es.addEventListener('open', function () { state.retryMs = 2000; });
    es.addEventListener('pipeline', function (ev) {
      try { applyPipeline(JSON.parse(ev.data), true); setLive(true); }
      catch (e) {}
    });
    es.addEventListener('ping', function () { setLive(true); });
    es.addEventListener('error', function () {
      setLive(false);
      try { es.close(); } catch (e) {}
      scheduleReconnect();
    });
  } catch (e) { setLive(false); scheduleReconnect(); }
}
function scheduleReconnect() {
  if (state.retryTimer) return;
  state.retryTimer = setTimeout(function () {
    state.retryTimer = null;
    state.retryMs = Math.min(state.retryMs * 1.6, 20000);
    openStream();
  }, state.retryMs);
}

/* ───── pipeline 適用（概要・連携・承認を再描画） ───── */
function signatureOf(item) {
  return [item.state, item.level, item.gate, item.nextWho, item.nextAction, item.verdictReady, item.needsHuman]
    .join('|');
}
function applyPipeline(p, live) {
  if (!p) return;
  // 変化検出：今回のシグネチャ集合を作り、前回と異なるIDをパルス対象に
  var changed = {};
  var newSig = {};
  var all = (p.orders || []).concat(p.cases || []);
  all.forEach(function (it) {
    var sig = signatureOf(it);
    newSig[it.id] = sig;
    if (live && state.prevSig[it.id] !== undefined && state.prevSig[it.id] !== sig) changed[it.id] = true;
  });
  state.pipeline = p;
  state.lastChanged = changed;
  renderKPIs(p);
  renderSignals(p);
  renderRecent(p);
  if (state.activeTab === 'pipeline') renderPipelineCards();
  renderLocks(p);
  if (state.loadedJudgments || state.activeTab === 'approvals') renderApprovals();
  state.prevSig = newSig;
  stampUpdated();
}

/* ───── 概要: KPI ───── */
function renderKPIs(p) {
  var orders = p.orders || [], cases = p.cases || [];
  var humanCount = collectApprovalItems().length;  // 承認タブと一致: pipeline要承認＋未解決jdg＋タスクのレビュー/社長室判断待ち
  var progCount = orders.filter(function (o) { return /(着手|提出済|監査済|発注済|条件付受入|受入)/.test(o.state); }).length;
  var caseCount = cases.filter(function (c) { return !c.verdictReady; }).length;
  var confWarn = ((p.locks && p.locks.conflicts) ? p.locks.conflicts.length : 0) + ((p.warnings || []).length);
  var data = [
    { cls: 'k-human', lab: '承認待ち', n: humanCount },
    { cls: 'k-prog',  lab: '進行中 order', n: progCount },
    { cls: 'k-case',  lab: '審査中 case', n: caseCount },
    { cls: 'k-bad',   lab: '競合・警告', n: confWarn },
  ];
  var host = $('kpis');
  host.innerHTML = '';
  data.forEach(function (d) {
    var c = el('div', 'kpi ' + d.cls + (d.n > 0 ? ' flagged' : ''));
    c.appendChild(el('span', 'num', String(d.n)));
    c.appendChild(el('span', 'lab', d.lab));
    host.appendChild(c);
  });
}

/* ───── 概要: 信号灯（vendor + MAGI） ───── */
function renderSignals(p) {
  var host = $('signals');
  host.innerHTML = '';
  var cfg = state.config || {};
  var orders = p.orders || [], cases = p.cases || [];

  // vendor 行
  var vrow = el('div', 'sigrow');
  vrow.appendChild(el('span', 'grouplab', '外注'));
  var vendors = (cfg.vendors || []);
  if (!vendors.length) vrow.appendChild(el('span', 'empty', '—'));
  vendors.forEach(function (v) {
    var ords = orders.filter(function (o) { return o.vendor === v.name; });
    var active = ords.filter(function (o) { return !/(完了|中止|統合済)/.test(o.state); });
    var cls = 's-idle';
    if (active.some(function (o) { return o.needsHuman; })) cls = 's-human';
    else if (active.length) cls = 's-prog';
    else if (ords.length) cls = 's-done';
    var s = el('span', 'sig');
    var dot = el('span', 'dot'); paintDot(dot, cls); s.appendChild(dot);
    s.appendChild(el('span', null, v.name));
    s.appendChild(el('span', 'meta', active.length ? ('進行 ' + active.length) : (ords.length ? '待機' : '案件なし')));
    vrow.appendChild(s);
  });
  host.appendChild(vrow);

  // MAGI 行
  var mrow = el('div', 'sigrow');
  mrow.appendChild(el('span', 'grouplab', 'MAGI'));
  var magi = (cfg.magi || []);
  if (!magi.length) mrow.appendChild(el('span', 'empty', '—'));
  var activePersonas = {};
  cases.forEach(function (c) {
    if (!c.verdictReady) (c.personas || []).forEach(function (pp) { activePersonas[String(pp).toLowerCase()] = true; });
  });
  magi.forEach(function (m) {
    var key = String(m.persona || '').toLowerCase();
    var on = activePersonas[key];
    var cls = on ? 's-prog' : 's-idle';
    var s = el('span', 'sig');
    var dot = el('span', 'dot'); paintDot(dot, cls); s.appendChild(dot);
    s.appendChild(el('span', null, m.persona || ''));
    s.appendChild(el('span', 'meta', (m.model || '') + (on ? '・審査中' : '')));
    mrow.appendChild(s);
  });
  host.appendChild(mrow);
}
function paintDot(dot, cls) {
  var map = { 's-done': 'var(--st-done)', 's-prog': 'var(--st-prog)', 's-human': 'var(--st-human)', 's-bad': 'var(--st-bad)', 's-idle': 'var(--st-idle)' };
  dot.style.background = map[cls] || map['s-idle'];
}

/* ───── 概要: 直近の動き ───── */
function renderRecent(p) {
  var host = $('recent');
  host.innerHTML = '';
  var items = (p.orders || []).concat(p.cases || []).filter(function (it) {
    return it.nextWho && it.nextWho !== '-';
  });
  items.sort(function (a, b) { return (b.needsHuman ? 1 : 0) - (a.needsHuman ? 1 : 0); });
  if (!items.length) { host.appendChild(el('li', 'empty', '進行中の案件はありません。')); return; }
  items.slice(0, 8).forEach(function (it) {
    var li = el('li', it.needsHuman ? 'flag' : '');
    li.appendChild(el('span', 'who', it.nextWho));
    li.appendChild(el('span', 'rid', it.id));
    li.appendChild(el('span', 'ract', it.nextAction || ''));
    if (it.needsHuman) li.appendChild(el('span', 'flagmk', '⚑'));
    host.appendChild(li);
  });
}

/* ═══════════════════════════════════════════════════════════
   共通カードパターン（課題/承認/連携）
   グループカード（オープン件数バッジ）→項目カード縦並び→全項目展開
   item = { id, title, stateText, dept, isHuman, fields:[{k,v}], render? }
   ═══════════════════════════════════════════════════════════ */

/* グループ群を描画。groups = [{key, name, items:[item]}] */
function renderGroups(hostId, tab, groups) {
  var host = $(hostId);
  host.innerHTML = '';
  var total = groups.reduce(function (n, g) { return n + g.items.length; }, 0);
  if (!total) { host.appendChild(el('div', 'empty', '該当する項目はありません。')); return; }
  groups.forEach(function (g) {
    if (!g.items.length) return;
    var gkey = tab + ':' + g.key;
    var openCount = g.items.filter(function (it) { return it.open; }).length;
    var gc = el('div', 'gcard' + (state.groupOpen[gkey] ? ' g-open' : ''));

    var head = el('div', 'ghead');
    head.appendChild(el('span', 'gtoggle', '▸'));
    head.appendChild(el('span', 'gname', g.name));
    var badge = el('span', 'gcount' + (openCount > 0 ? ' has-open' : ''),
      openCount > 0 ? ('オープン ' + openCount) : ('全 ' + g.items.length));
    head.appendChild(badge);
    head.addEventListener('click', function () {
      state.groupOpen[gkey] = !state.groupOpen[gkey];
      gc.classList.toggle('g-open', state.groupOpen[gkey]);
    });
    gc.appendChild(head);

    var list = el('div', 'gitems');
    g.items.forEach(function (it, idx) { list.appendChild(buildItemCard(it, idx + 1)); });
    gc.appendChild(list);
    host.appendChild(gc);
  });
}

/* 項目カード（タップで全項目展開・PCはhoverで全文title） */
function buildItemCard(it, num) {
  var sc = stateClass(it.stateText);
  var clsMap = { 's-done': 'i-done', 's-prog': 'i-prog', 's-human': 'i-human', 's-bad': 'i-bad', 's-idle': 'i-idle' };
  var ic = el('div', 'icard ' + (clsMap[sc] || 'i-idle') +
    (state.expanded[it.id] ? ' i-open' : '') +
    (state.lastChanged && state.lastChanged[it.id] ? ' pulse' : ''));

  var head = el('div', 'ihead');
  head.appendChild(el('span', 'inum', String(num)));
  if (it.id) head.appendChild(el('span', 'iid', it.id));
  var title = el('span', 'ititle', it.title || '');
  title.title = (it.id ? it.id + '：' : '') + (it.title || '');  // PC hover 全文
  head.appendChild(title);
  if (it.stateText) head.appendChild(makeTag(it.stateText, sc));
  if (it.isHuman) head.appendChild(el('span', 'iflag', '⚑'));
  head.addEventListener('click', function () {
    state.expanded[it.id] = !state.expanded[it.id];
    ic.classList.toggle('i-open', state.expanded[it.id]);
  });
  ic.appendChild(head);

  var body = el('div', 'ibody');
  // 全フィールドを定義リストで（行の全フィールド復活）
  if (it.fields && it.fields.length) {
    var dl = el('dl');
    it.fields.forEach(function (f) {
      if (f.v == null || f.v === '' || f.v === '-') return;
      var dt = el('dt', null, f.k);
      var dd = el('dd', null, f.v);
      dt.title = f.k; dd.title = f.v;  // PC hover 全文
      dl.appendChild(dt); dl.appendChild(dd);
    });
    body.appendChild(dl);
  }
  // 種別ごとの追加描画（承認フォーム・警告など）
  if (typeof it.render === 'function') it.render(body, ic);
  ic.appendChild(body);
  return ic;
}
function makeTag(text, cls) {
  var s = el('span', 'tag ' + cls);
  s.textContent = text || '-';
  return s;
}

/* ───── フィルタUI（チップ・クライアント側）───── */
/* axes = [{axis:'dept'|'state'|'kind', label, values:[..]}] */
function renderFilters(hostId, tab, axes) {
  var host = $(hostId);
  host.innerHTML = '';
  var f = state.filters[tab];
  axes.forEach(function (ax) {
    if (!ax.values.length) return;
    var grp = el('div', 'fgroup');
    grp.appendChild(el('span', 'flab', ax.label));
    grp.appendChild(makeChip(tab, ax.axis, null, 'すべて'));
    ax.values.forEach(function (v) { grp.appendChild(makeChip(tab, ax.axis, v, v)); });
    host.appendChild(grp);
  });
  function makeChip(tab, axis, val, label) {
    var on = (f[axis] === val) || (val === null && f[axis] === null);
    var chip = el('button', 'chip' + (on ? ' on' : ''), label);
    chip.addEventListener('click', function () {
      f[axis] = val;
      if (tab === 'tasks') renderTasks();
      else if (tab === 'approvals') renderApprovals();
      else if (tab === 'pipeline') renderPipelineCards();
    });
    return chip;
  }
}
function passFilter(tab, o) {
  var f = state.filters[tab];
  if (f.dept != null && o.dept !== f.dept) return false;
  if (f.state != null && o.stateText !== f.state) return false;
  if (f.kind != null && o.kind !== f.kind) return false;
  return true;
}
function uniq(arr) {
  var seen = {}, out = [];
  arr.forEach(function (v) { if (v != null && v !== '' && !seen[v]) { seen[v] = 1; out.push(v); } });
  return out;
}

/* ═══════════════════════════════════════════════════════════
   3. 課題タブ（/api/board?name=tasks → md表parse → 部署別グループ）
   ═══════════════════════════════════════════════════════════ */
function loadTasksBoard() {
  fetchBoard('tasks', function (md) {
    state.tasksRaw = parseFirstTable(md);
    state.loadedTasks = true;
    renderTasks();
    if (state.pipeline) renderKPIs(state.pipeline);
    renderApprovals();   // タスクのレビュー/判断待ちを承認・KPIへ反映
  }, function (errmsg) {
    $('tasksBody').innerHTML = '<div class="empty">取得失敗: ' + esc(errmsg) + '</div>';
  });
}
function renderTasks() {
  var rows = state.tasksRaw || [];
  // 行→item（tasks列: ID,部署,担当者,タスク,ステータス,トリガー,モデル,期限,進捗,優先度,関係部署,完了日）
  var items = rows.map(function (r) {
    var dept = r['部署'] || '—';
    var st = r['ステータス'] || '';
    var fields = [];
    Object.keys(r).forEach(function (k) {
      if (k === 'ID' || k === 'タスク') return;
      fields.push({ k: k, v: r[k] });
    });
    return {
      id: r['ID'] || '',
      title: r['タスク'] || '',
      stateText: st,
      dept: dept,
      kind: r['優先度'] || '',
      open: isOpen(st),
      isHuman: false,
      fields: fields,
    };
  });
  // フィルタ軸：担当部署 / STATE / 優先度
  renderFilters('tasksFilters', 'tasks', [
    { axis: 'dept',  label: '部署',   values: uniq(items.map(function (i) { return i.dept; })) },
    { axis: 'state', label: 'STATE',  values: uniq(items.map(function (i) { return i.stateText; })) },
    { axis: 'kind',  label: '優先度', values: uniq(items.map(function (i) { return i.kind; })) },
  ]);
  var filtered = items.filter(function (i) { return passFilter('tasks', i); });
  renderGroups('tasksBody', 'tasks', groupBy(filtered, 'dept'));
}

/* ═══════════════════════════════════════════════════════════
   4. 承認タブ（pipeline.needsHuman ＋ judgments md の jdg を承認カード化）
   どちらも target にIDを渡して POST /review。
   ═══════════════════════════════════════════════════════════ */
function loadJudgmentsBoard() {
  fetchBoard('judgments', function (md) {
    state.judgmentsRaw = parseFirstTable(md);
    state.loadedJudgments = true;
    renderApprovals();
    if (state.pipeline) renderKPIs(state.pipeline);
  }, function (errmsg) {
    state.judgmentsRaw = [];
    state.loadedJudgments = true;
    renderApprovals();
    if (state.pipeline) renderKPIs(state.pipeline);
  });
}
/* 承認待ち＝要レビュー/判断の全項目を1か所で集計（KPIと承認タブが同じ集合を使う＝件数一致）。
   (a)pipelineの要承認(order/case) (b)未解決jdg (c)タスクのレビュー待ち/社長室判断待ち */
function collectApprovalItems() {
  var p = state.pipeline || {};
  var items = [];

  // (a) pipeline.needsHuman ＋ needsHuman フラグの order/case
  var humanIds = {};
  (p.needsHuman || []).forEach(function (id) { humanIds[id] = true; });
  (p.orders || []).concat(p.cases || []).forEach(function (it) {
    if (!(it.needsHuman || humanIds[it.id])) return;
    var kind = it.kind === 'case' ? 'ThirdParty審査' : '外注';
    var dest = it.kind === 'order' ? (it.vendor || '社長室') : '社長室';
    var fields = [
      { k: 'STATE', v: it.state },
      { k: '次の番', v: it.nextWho },
      { k: '内容', v: it.nextAction },
    ];
    if (it.kind === 'order') {
      fields.push({ k: 'LEVEL', v: it.level });
      fields.push({ k: 'GATE', v: it.gate });
      fields.push({ k: '委託先', v: it.vendor });
    } else {
      fields.push({ k: '人格', v: (it.personas || []).join(', ') });
      fields.push({ k: 'verdict', v: it.verdictReady ? ('済' + (it.verdictResult ? '（' + it.verdictResult + '）' : '')) : '未' });
    }
    items.push({
      id: it.id, title: it.nextAction || it.id, stateText: it.state || '要承認',
      dept: kind, kind: kind, open: true, isHuman: true,
      _dest: dest, _warnings: it.warnings || [], fields: fields, render: approvalRenderer,
    });
  });

  // (b) judgments md の jdg 行（未解決のみ＝「回答済」を除外）
  (state.judgmentsRaw || []).forEach(function (r) {
    var id = r['ID'] || '';
    if (!/^jdg-/.test(id)) return;
    if (/回答済/.test(r['期限'] || '') || /回答済/.test(r['内容'] || '')) return; // 解決済みは除外
    var dept = r['部署'] || '社長室';
    var fields = [];
    Object.keys(r).forEach(function (k) { if (k === 'ID' || k === '内容') return; fields.push({ k: k, v: r[k] }); });
    items.push({
      id: id, title: r['内容'] || id, stateText: '判断待ち',
      dept: dept, kind: '判断(jdg)', open: true, isHuman: true,
      _dest: dept, _warnings: [], fields: fields, render: approvalRenderer,
    });
  });

  // (c) タスクのうち レビュー待ち / 社長室判断待ち（＝社長のレビュー/判断が要る）
  (state.tasksRaw || []).forEach(function (r) {
    var st = r['ステータス'] || '';
    if (!/(レビュー待ち|社長室判断待ち)/.test(st)) return;
    var dept = r['部署'] || '—';
    var fields = [];
    Object.keys(r).forEach(function (k) { if (k === 'ID' || k === 'タスク') return; fields.push({ k: k, v: r[k] }); });
    items.push({
      id: r['ID'] || '', title: r['タスク'] || '', stateText: st,
      dept: dept, kind: (/判断/.test(st) ? '判断(タスク)' : 'レビュー(タスク)'),
      open: true, isHuman: true, _dest: dept, _warnings: [], fields: fields, render: approvalRenderer,
    });
  });

  return items;
}
function renderApprovals() {
  var items = collectApprovalItems();
  renderFilters('approvalsFilters', 'approvals', [
    { axis: 'dept',  label: '部署/種別', values: uniq(items.map(function (i) { return i.dept; })) },
    { axis: 'kind',  label: '種別',     values: uniq(items.map(function (i) { return i.kind; })) },
  ]);
  var filtered = items.filter(function (i) { return passFilter('approvals', i); });
  renderGroups('approvalCards', 'approvals', groupBy(filtered, 'dept'));
}

/* 承認カードの本体（カード上で承認/差戻し）。POST /review（既存契約・変えない） */
function approvalRenderer(body, ic) {
  var it = this;
  (it._warnings || []).forEach(function (w) { body.appendChild(el('div', 'iwarn', '⚠ ' + w)); });

  if (state.mode === 'static') {
    body.appendChild(el('div', 'aform astatic', '※ 承認操作はローカルの操作卓（serve.js）でのみ可能。'));
    return;
  }
  var form = el('div', 'aform');
  var dest = el('input', 'dest');
  dest.placeholder = '通知先（部署/担当）';
  dest.value = it._dest || '社長室';
  form.appendChild(dest);
  var note = el('textarea');
  note.placeholder = '社長メモ（任意・差戻し理由など）';
  form.appendChild(note);
  var actions = el('div', 'actions');
  var ok = el('button', 'act ok', '承認');
  var ng = el('button', 'act ng', '差戻し');
  actions.appendChild(ok); actions.appendChild(ng);
  form.appendChild(actions);
  var msg = el('div', 'amsg');
  form.appendChild(msg);

  // カード内クリックで開閉に巻き込まれないよう抑止
  form.addEventListener('click', function (e) { e.stopPropagation(); });

  function submit(verdict) {
    ok.disabled = ng.disabled = true;
    msg.classList.remove('err'); msg.textContent = '送信中…';
    var bodyStr = 'target=' + encodeURIComponent(it.id) +
      '&dest=' + encodeURIComponent(dest.value || '') +
      '&verdict=' + encodeURIComponent(verdict) +
      '&note=' + encodeURIComponent(note.value || '') +
      '&title=' + encodeURIComponent(it.id);
    fetch('/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyStr,
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res && res.ok) {
        msg.textContent = (res.id || '記録') + '：' + verdict + (res.message ? ' — ' + res.message : '');
        // pipeline 再取得（SSEが拾えない即時反映の保険）
        fetch('/api/pipeline').then(r => r.json()).then(function (pp) { applyPipeline(pp, true); }).catch(function () {});
      } else {
        msg.classList.add('err');
        msg.textContent = 'エラー: ' + ((res && res.error) || '失敗');
        ok.disabled = ng.disabled = false;
      }
    }).catch(function (e) {
      msg.classList.add('err'); msg.textContent = '通信エラー: ' + e.message;
      ok.disabled = ng.disabled = false;
    });
  }
  ok.addEventListener('click', function () { submit('承認'); });
  ng.addEventListener('click', function () { submit('差戻し'); });
  body.appendChild(form);
}

/* ═══════════════════════════════════════════════════════════
   5. 連携タブ（pipeline.orders + cases を vendor/種別でグループ化）
   ═══════════════════════════════════════════════════════════ */
function renderPipelineCards() {
  var p = state.pipeline || {};
  var items = [];

  (p.orders || []).forEach(function (o) {
    items.push({
      id: o.id,
      title: o.nextAction || o.id,
      stateText: o.state || '',
      dept: o.vendor || '外注',
      kind: '外注order',
      open: isOpen(o.state),
      isHuman: !!o.needsHuman,
      fields: [
        { k: 'STATE', v: o.state },
        { k: 'LEVEL', v: o.level },
        { k: 'GATE', v: o.gate },
        { k: '委託先', v: o.vendor },
        { k: '次の番', v: o.nextWho },
        { k: '内容', v: o.nextAction },
        { k: '警告', v: (o.warnings || []).join(' / ') },
      ],
    });
  });
  (p.cases || []).forEach(function (c) {
    items.push({
      id: c.id,
      title: c.nextAction || c.id,
      stateText: c.state || '',
      dept: 'ThirdParty審査',
      kind: 'ThirdParty case',
      open: isOpen(c.state) && !c.verdictReady,
      isHuman: !!c.needsHuman,
      fields: [
        { k: 'STATE', v: c.state },
        { k: '人格', v: (c.personas || []).join(', ') },
        { k: 'verdict', v: c.verdictReady ? ('済' + (c.verdictResult ? '（' + c.verdictResult + '）' : '')) : '未' },
        { k: '次の番', v: c.nextWho },
        { k: '内容', v: c.nextAction },
      ],
    });
  });

  renderFilters('pipelineFilters', 'pipeline', [
    { axis: 'dept',  label: '委託先', values: uniq(items.map(function (i) { return i.dept; })) },
    { axis: 'state', label: 'STATE', values: uniq(items.map(function (i) { return i.stateText; })) },
    { axis: 'kind',  label: '種別',  values: uniq(items.map(function (i) { return i.kind; })) },
  ]);
  var filtered = items.filter(function (i) { return passFilter('pipeline', i); });
  renderGroups('pipelineBody', 'pipeline', groupBy(filtered, 'dept'));
}

/* ───── ロック・競合 ───── */
function renderLocks(p) {
  var host = $('locks');
  host.innerHTML = '';
  var locks = p.locks || { activeCount: 0, conflicts: [] };
  var conf = locks.conflicts || [];
  var info = el('div', 'lock-ok');
  info.textContent = '活性ロック ' + (locks.activeCount || 0) + ' 件 ／ 競合・解除漏れ ' + conf.length + ' 件';
  host.appendChild(info);
  conf.forEach(function (c) {
    var d = el('div', 'lock-conf');
    d.appendChild(el('span', 'ctype', c.type));
    d.appendChild(el('span', null, c.detail || ((c.target || '') + ' / ' + (c.ords || []).join(', '))));
    host.appendChild(d);
  });
  (p.warnings || []).forEach(function (w) {
    var d = el('div', 'lock-conf');
    d.style.borderLeftColor = 'var(--st-human)';
    d.appendChild(el('span', 'ctype', '注意'));
    d.appendChild(el('span', null, w));
    host.appendChild(d);
  });
}

/* ───── グループ化ユーティリティ ───── */
function groupBy(items, key) {
  var order = [], map = {};
  items.forEach(function (it) {
    var k = it[key] || '—';
    if (!map[k]) { map[k] = { key: k, name: k, items: [] }; order.push(k); }
    map[k].items.push(it);
  });
  return order.map(function (k) { return map[k]; });
}

/* ───── 組織図 / フロー（org-flow.js＝WP-ORG・触らない） ───── */
function renderOrg() {
  var fb = $('orgFallback');
  if (!window.KIBIOrgFlow) { if (fb) fb.hidden = false; return; }
  if (fb) fb.hidden = true;
  try {
    if (typeof window.KIBIOrgFlow.renderOrgChart === 'function') {
      window.KIBIOrgFlow.renderOrgChart(state.config || {}, $('orgchart'));
    }
    if (typeof window.KIBIOrgFlow.renderFlow === 'function') {
      window.KIBIOrgFlow.renderFlow($('flowdiagram'));
    }
  } catch (e) {
    if (fb) { fb.hidden = false; fb.textContent = '組織図の描画に失敗: ' + e.message; }
  }
}

/* ───── board markdown 取得（live=/api/board・static=../boards/<name>.md） ───── */
function fetchBoard(name, ok, fail) {
  if (state.mode === 'static') {
    fetch('../boards/' + name + '.md', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (md) { ok(md || ''); })
      .catch(function (e) { if (fail) fail(e.message); });
    return;
  }
  fetch('/api/board?name=' + encodeURIComponent(name)).then(r => r.json()).then(function (res) {
    ok((res && res.markdown) || '');
  }).catch(function (e) { if (fail) fail(e.message); });
}

/* md の最初の表を {列名:値} の配列に構造化（renderTable/splitRow のロジックを流用） */
function parseFirstTable(md) {
  var lines = String(md).replace(/<!--[\s\S]*?-->/g, '').split('\n');
  var i = 0;
  while (i < lines.length && lines[i].trim().indexOf('|') !== 0) i++;
  var tbl = [];
  while (i < lines.length && lines[i].trim().indexOf('|') === 0) { tbl.push(lines[i].trim()); i++; }
  if (!tbl.length) return [];
  var head = splitRow(tbl[0]);
  var bodyStart = 1;
  if (tbl.length > 1 && /^[\s|:\-]+$/.test(tbl[1])) bodyStart = 2;
  var out = [];
  for (var r = bodyStart; r < tbl.length; r++) {
    var cells = splitRow(tbl[r]);
    if (/^[\s:\-]+$/.test(cells.join(''))) continue;
    var obj = {};
    head.forEach(function (h, ci) { obj[h] = cells[ci] != null ? cells[ci] : ''; });
    out.push(obj);
  }
  return out;
}
function splitRow(row) {
  return row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
}

/* ───── ボード再生成（POST /api/build → 課題を再parse） ───── */
function rebuild() {
  var btn = $('rebuildBtn'), hint = $('rebuildHint');
  btn.disabled = true; hint.textContent = '再生成中…';
  fetch('/api/build', { method: 'POST' }).then(r => r.json()).then(function (res) {
    hint.textContent = (res && res.ok) ? '再生成しました。' : '失敗しました。';
    state.loadedTasks = false;
    state.loadedJudgments = false;
    loadTasksBoard();
    btn.disabled = false;
  }).catch(function (e) {
    hint.textContent = 'エラー: ' + e.message; btn.disabled = false;
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
