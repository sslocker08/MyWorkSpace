#!/usr/bin/env node
// KIBI 三社フロー パイプライン・スキャナ（orders-scan）
// 設計正本: Contracts/automation-design-draft.md §1・§2（採択待ちドラフト）。様式: Contracts/forms.md §1。
// 目的: External/*/Orders/*/（外注Order）と ThirdParty/Cases/*/（中立審査Case）を走査し、
//       各案件の STATE/LEVEL/GATE とサブフォルダのセンチネル（work/.WORKER_DONE 等）から
//       「次に誰の番か（next）」を判定する。Contracts/locks.md と突合して競合・凍結も検出する。
// 出力: 人可読の表（stdout）＋ 機械可読 JSON（Secretary/dashboard/_pipeline.json）。
//       GATE:human の案件には「要・人間承認（needsHuman）」フラグを立てる。
// 制約: メタ情報のみ読む（order.md / request.md / verdict.md 等）。実データ・Secret・個人情報は読まない。
//       外部依存なし（Node標準のみ）。書き込みは _pipeline.json のみ（既存ファイルは改変しない）。
//
// 使い方:
//   node Internal/Secretary/tools/orders-scan.js            … 走査して表を表示＋_pipeline.json を更新
//   node Internal/Secretary/tools/orders-scan.js --json     … JSON のみを stdout に出す（表は出さない）
//   node Internal/Secretary/tools/orders-scan.js --no-write  … _pipeline.json を書かず表示のみ（dry-run）
//   node Internal/Secretary/tools/orders-scan.js --out <path> … JSON 出力先を上書き指定
//   終了コード: 競合（CONFLICT）または要人間承認（needsHuman）が1件以上で 2、走査エラーで 1、それ以外 0。

'use strict';
const fs = require('fs');
const path = require('path');

const SHARED = path.resolve(__dirname, '..');          // Internal/Secretary
const INTERNAL = path.resolve(SHARED, '..');           // Internal
const ROOT = path.resolve(INTERNAL, '..');             // KIBIルート
const PROTECTED = /(_Records|\.secrets|Kofukuron23)/;  // 防火壁：保護領域には触れない
const DEFAULT_OUT = path.join(SHARED, 'dashboard', '_pipeline.json');

// ── 語彙（forms.md §1 / automation-design-draft §1）────────────────────────
const STATES = ['発注済', '着手', '提出済', '監査済', '審査中', '受入', '条件付受入', '差戻し', '統合済', '完了', '中止', '準備中'];
const LEVELS = ['軽微', '中規模', '重大'];
const GATES = ['auto', 'human'];
// STATE→「次の担い手」の素の対応（センチネルで上書きされうる）
const STATE_NEXT = {
  '準備中':     { who: '社長室',    action: '発注前準備（STATE=発注済へ）' },
  '発注済':     { who: 'WORKER',    action: 'Worker着手待ち' },
  '着手':       { who: 'WORKER',    action: 'Worker作業中' },
  '提出済':     { who: 'AUDITOR',   action: 'Auditor監査待ち' },
  '監査済':     { who: '社長室',    action: '社長室受入査読待ち' },
  '審査中':     { who: 'MAGI',      action: 'MAGI第三者審査待ち' },
  '条件付受入': { who: '社長室',    action: '条件充足の確認・統合待ち' },
  '受入':       { who: '社長室',    action: '社長室統合待ち' },
  '差戻し':     { who: 'WORKER',    action: 'Worker再作業待ち' },
  '統合済':     { who: '社長室',    action: 'クローズ処理待ち' },
  '完了':       { who: '-',         action: '完了' },
  '中止':       { who: '-',         action: '中止' },
};

// ── 小物ユーティリティ ──────────────────────────────────────────────────
function rel(abs) { return path.relative(ROOT, abs); }
function safe(abs) { return !PROTECTED.test(rel(abs)); }
function readText(abs) {
  if (!safe(abs)) return null;
  try { return fs.readFileSync(abs, 'utf8'); } catch (e) { return null; }
}
function isDir(abs) { try { return fs.statSync(abs).isDirectory(); } catch (e) { return false; } }
function exists(abs) { try { fs.accessSync(abs); return true; } catch (e) { return false; } }
function listDirs(abs) {
  if (!isDir(abs) || !safe(abs)) return [];
  try {
    return fs.readdirSync(abs, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name).sort();
  } catch (e) { return []; }
}

// 機械可読マーカー <!-- STATE: x LEVEL: y GATE: z --> を1行から抽出
function parseMarker(text) {
  if (!text) return null;
  const m = text.match(/<!--\s*STATE:\s*([^\sL]+)\s+LEVEL:\s*([^\sG]+)\s+GATE:\s*([a-zA-Z]+)\s*-->/);
  if (!m) return null;
  return { state: m[1].trim(), level: m[2].trim(), gate: m[3].trim().toLowerCase() };
}

// マーカーが無い場合のフォールバック: 「- ステータス: X」行から推定
function parseStatusLine(text) {
  if (!text) return null;
  const m = text.match(/^[-*]\s*ステータス:\s*([^\s（(<]+)/m);
  return m ? m[1].trim() : null;
}

function vocabWarnings(label, marker) {
  const w = [];
  if (!marker) return w;
  if (marker.state && !STATES.includes(marker.state)) w.push(`${label}: STATE 語彙外「${marker.state}」`);
  if (marker.level && !LEVELS.includes(marker.level)) w.push(`${label}: LEVEL 語彙外「${marker.level}」`);
  if (marker.gate && !GATES.includes(marker.gate)) w.push(`${label}: GATE 語彙外「${marker.gate}」`);
  return w;
}

// ── locks.md（凍結台帳）の読込 ───────────────────────────────────────────
function parseLocks() {
  const text = readText(path.join(ROOT, 'Contracts', 'locks.md'));
  const rows = [];
  if (!text) return rows;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    // 期待列: ロックID | 対象パス | ord | 登録日 | 解除日
    if (cells.length < 5) continue;
    const [lockId, target, ord, opened, closed] = cells;
    if (!lockId || /^[-ー－\s:]*$/.test(lockId) || lockId === 'ロックID') continue;
    rows.push({ lockId, target, ord, opened, closed, active: !closed || /^[-ー－\s]*$/.test(closed) });
  }
  return rows;
}

// ── Order 走査 ────────────────────────────────────────────────────────────
// External/<外注>/Orders/<ord-...>/ を再帰なしで列挙（Codex 以外の外注社が増えても拾う）
function findOrderRoots() {
  const out = [];
  const extRoot = path.join(ROOT, 'External');
  for (const vendor of listDirs(extRoot)) {                       // 例: Codex
    const ordersDir = path.join(extRoot, vendor, 'Orders');
    for (const ord of listDirs(ordersDir)) {                      // 例: ord-codex-001
      out.push({ id: ord, vendor, dir: path.join(ordersDir, ord) });
    }
  }
  return out;
}

function scanOrder(o) {
  const orderMd = path.join(o.dir, 'order', 'order.md');
  const text = readText(orderMd);
  const marker = parseMarker(text);
  const statusLine = parseStatusLine(text);
  const state = marker ? marker.state : (statusLine || '不明');
  const level = marker ? marker.level : '不明';
  const gate = marker ? marker.gate : 'unknown';

  // センチネル（automation-design-draft §1）。所有者だけが置く完了印。
  const sentinels = {
    workerDone: exists(path.join(o.dir, 'work', '.WORKER_DONE')),
    auditorDone: exists(path.join(o.dir, 'audit', '.AUDITOR_DONE')),
    integrated: exists(path.join(o.dir, 'decision', '.INTEGRATED')),
  };

  // next 判定: STATE を基準に、センチネルで前進を上書き（フラグが状態より新しい場合に追従）
  let next = STATE_NEXT[state] || { who: '不明', action: `STATE「${state}」を確認` };
  if (sentinels.integrated) next = { who: '-', action: '統合済（クローズ待ち）' };
  else if (sentinels.auditorDone) next = { who: '社長室', action: '社長室受入査読待ち（.AUDITOR_DONE）' };
  else if (sentinels.workerDone) next = { who: 'AUDITOR', action: 'Auditor監査待ち（.WORKER_DONE）' };

  const warnings = vocabWarnings(o.id, marker);
  if (!marker && statusLine) warnings.push(`${o.id}: STATE マーカー無し（ステータス行から推定）`);
  if (!text) warnings.push(`${o.id}: order.md 不読（${rel(orderMd)}）`);

  const needsHuman = gate === 'human' || level === '重大';

  return {
    kind: 'order', id: o.id, vendor: o.vendor, dir: rel(o.dir),
    state, level, gate, sentinels,
    nextWho: next.who, nextAction: next.action,
    needsHuman, warnings,
  };
}

// ── Case（ThirdParty）走査 ───────────────────────────────────────────────
function findCaseRoots() {
  const casesDir = path.join(ROOT, 'ThirdParty', 'Cases');
  return listDirs(casesDir).map((id) => ({ id, dir: path.join(casesDir, id) }));
}

function scanCase(c) {
  const verdictMd = path.join(c.dir, 'verdict.md');
  const verdictReady = exists(verdictMd) || exists(path.join(c.dir, '.VERDICT_READY'));
  // 3人格の所見ファイルが揃っているか（合議の前提）
  const personas = ['melchior', 'balthasar', 'casper'].filter((p) => exists(path.join(c.dir, `${p}.md`)));
  const hasRequest = exists(path.join(c.dir, 'inbox', 'request.md'));

  // verdict から ESCALATE_TO_HUMAN を検出（人間承認フラグ）
  let escalate = false;
  let verdictResult = '';
  const vtext = readText(verdictMd);
  if (vtext) {
    escalate = /ESCALATE_TO_HUMAN/.test(vtext);
    const m = vtext.match(/^[-*]\s*(?:結果|集約結果)[:：]\s*(.+)$/m);
    if (m) verdictResult = m[1].replace(/[*`]/g, '').trim().slice(0, 60);
  }

  let next;
  if (verdictReady) next = { who: '社長室', action: '社長室 verdict 受領・反映待ち' };
  else if (personas.length >= 3) next = { who: 'MAGI', action: '3人格そろい・合議（verdict）待ち' };
  else if (personas.length > 0) next = { who: 'MAGI', action: `審査中（${personas.length}/3人格 提出済）` };
  else if (hasRequest) next = { who: 'MAGI', action: 'MAGI審査着手待ち' };
  else next = { who: '社長室', action: '依頼書（inbox/request.md）未整備' };

  const warnings = [];
  if (!hasRequest) warnings.push(`${c.id}: inbox/request.md 無し`);

  return {
    kind: 'case', id: c.id, dir: rel(c.dir),
    state: verdictReady ? 'verdict済' : (personas.length ? '審査中' : (hasRequest ? '依頼済' : '準備中')),
    personas, verdictReady, verdictResult,
    nextWho: next.who, nextAction: next.action,
    needsHuman: escalate, warnings,
  };
}

// ── locks 突合（競合・凍結検出）────────────────────────────────────────
// 活性ロックを ord 単位で集計し、同一 ord に複数の活性ロックがあれば競合候補として記録。
function correlateLocks(locks, orders) {
  const active = locks.filter((l) => l.active);
  const byOrd = {};
  for (const l of active) {
    const key = (l.ord || '').trim() || '(未割当)';
    (byOrd[key] = byOrd[key] || []).push(l);
  }
  const conflicts = [];
  // 同一対象パスに複数 ord の活性ロック＝重複発注の疑い（契約 第12条）
  const byPath = {};
  for (const l of active) (byPath[l.target] = byPath[l.target] || []).push(l);
  for (const [target, rows] of Object.entries(byPath)) {
    const ords = [...new Set(rows.map((r) => r.ord).filter(Boolean))];
    if (ords.length > 1) {
      conflicts.push({ type: 'CONFLICT', target, ords, detail: `同一パスに複数 ord の活性ロック: ${ords.join(', ')}` });
    }
  }
  // 活性ロックが指す ord が、完了/中止/統合済なのに解除されていない＝解除漏れの疑い
  const ordState = Object.fromEntries(orders.map((o) => [o.id, o.state]));
  for (const l of active) {
    const st = ordState[(l.ord || '').trim()];
    if (st && ['完了', '中止', '統合済'].includes(st)) {
      conflicts.push({ type: 'STALE_LOCK', target: l.target, ords: [l.ord], detail: `${l.lockId}: ord=${l.ord} は STATE=${st} だが未解除` });
    }
  }
  return { activeCount: active.length, byOrd, conflicts };
}

// ── 表整形（stdout）─────────────────────────────────────────────────────
function pad(s, n) {
  s = String(s == null ? '' : s);
  // 全角を2幅として概算
  let w = 0;
  for (const ch of s) w += (ch.codePointAt(0) > 0xff) ? 2 : 1;
  return s + ' '.repeat(Math.max(0, n - w));
}
function printTable(rows, title) {
  console.log(`\n■ ${title}`);
  console.log(pad('ID', 18) + pad('STATE', 12) + pad('LV', 8) + pad('GATE', 7) + pad('次の番', 10) + '内容');
  console.log('-'.repeat(96));
  for (const r of rows) {
    const flag = r.needsHuman ? ' ⚑要人間承認' : '';
    console.log(
      pad(r.id, 18) + pad(r.state, 12) + pad(r.level || '-', 8) +
      pad(r.gate || '-', 7) + pad(r.nextWho, 10) + r.nextAction + flag
    );
  }
}

// ── メイン ─────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes('--json');
  const noWrite = args.includes('--no-write');
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 && args[outIdx + 1] ? path.resolve(args[outIdx + 1]) : DEFAULT_OUT;

  const orders = findOrderRoots().map(scanOrder);
  const cases = findCaseRoots().map(scanCase);
  const locks = parseLocks();
  const lockReport = correlateLocks(locks, orders);

  const allWarnings = [...orders, ...cases].flatMap((r) => r.warnings);
  const humanItems = [...orders, ...cases].filter((r) => r.needsHuman).map((r) => r.id);

  const report = {
    generatedAt: new Date().toISOString(),
    generator: 'orders-scan.js',
    note: 'メタのみ走査（実データ・Secret不読）。設計: Contracts/automation-design-draft.md',
    orders, cases,
    locks: { activeCount: lockReport.activeCount, conflicts: lockReport.conflicts },
    needsHuman: humanItems,
    warnings: allWarnings,
  };

  if (jsonOnly) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    printTable(orders, `Orders（外注パイプライン）  ${orders.length}件`);
    printTable(cases, `Cases（ThirdParty 審査）  ${cases.length}件`);
    console.log('\n■ ロック突合');
    console.log(`  活性ロック: ${lockReport.activeCount}件`);
    if (lockReport.conflicts.length) {
      for (const c of lockReport.conflicts) console.log(`  ⚠ ${c.type}: ${c.detail}`);
    } else {
      console.log('  競合・解除漏れ: なし');
    }
    if (humanItems.length) console.log(`\n⚑ 要・人間承認（GATE:human / LEVEL:重大 / ESCALATE）: ${humanItems.join(', ')}`);
    if (allWarnings.length) {
      console.log('\n■ 注意（様式・読込）');
      for (const w of allWarnings) console.log(`  ・${w}`);
    }
  }

  if (!noWrite) {
    try {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
      if (!jsonOnly) console.log(`\n→ 機械可読出力: ${rel(outPath)}`);
    } catch (e) {
      console.error(`[書込失敗] ${rel(outPath)}: ${e.message}`);
      return 1;
    }
  }

  if (lockReport.conflicts.length || humanItems.length) return 2;
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(`[走査エラー] ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  }
}

module.exports = { parseMarker, parseStatusLine, parseLocks, scanOrder, scanCase, correlateLocks };
