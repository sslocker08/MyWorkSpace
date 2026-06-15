#!/usr/bin/env node
// KIBI パイプライン通知（三社フロー自動化 P1・設計正本: Contracts/automation-design-draft.md §2,§3,§5-5）
// orders-scan.js が出す _pipeline.json を読み、Slack へ簡潔な digest を投稿する。
// 「誰の番か」と「🔔承認待ち（GATE:human）」だけを伝える最小通知（スマホ push 想定）。
//
// 設計思想（鉄則）:
//  - Secret・個人情報・財務実数は本文に出さない。出すのは ID・状態・件数・"誰の番か" のみ。
//  - fail-safe: SLACK_WEBHOOK_URL 未設定なら投稿せず stdout に digest（ログのみ・非エラー終了）。
//  - 重複抑止: 前回送信した状態のハッシュをキャッシュし、変化したときだけ送る。
//
// 使い方:
//   node Internal/Secretary/tools/pipeline-notify.js                      … 既定パス(dashboard/_pipeline.json)を読んで通知
//   node Internal/Secretary/tools/pipeline-notify.js <path/to/_pipeline.json>
//   node Internal/Secretary/tools/orders-scan.js --json | node Internal/Secretary/tools/pipeline-notify.js -
//       （"-" 指定で stdin から JSON を読む。orders-scan→notify をパイプで繋ぐ最小 I/F）
// 入力スキーマ: orders-scan.js が出す { generatedAt, orders[], cases[], locks, needsHuman[], warnings[] }。
//   各 item: { kind, id, state, level, gate, nextWho, nextAction, needsHuman } を参照（実データ・Secretは読まない）。
//   FORCE=1 … 重複抑止を無視して必ず送る   DRY=1 … Slack に投げず stdout に出すだけ
//   SLACK_WEBHOOK_URL=https://hooks.slack.com/... を環境変数で渡す（.secrets 由来・コードに書かない）
//
// 終了コード: 正常=0 / 送信失敗=2（fail-safe で握りつぶさず exit 2、cron/loop 側で検知できるように）

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SHARED = path.resolve(__dirname, '..');         // Internal/Secretary
const ROOT = path.resolve(SHARED, '..', '..');         // KIBIルート
// 既定の入力（orders-scan.js の出力先・設計 §2）。実体が無い場合は空とみなす。
const DEFAULT_PIPELINE = path.join(SHARED, 'dashboard', '_pipeline.json');
// 重複抑止用キャッシュ（送信済みの状態ハッシュ）。生成物扱い・Git除外想定。
const CACHE_FILE = path.join(SHARED, 'tools', '.pipeline-notify-cache.json');

const WEBHOOK = (process.env.SLACK_WEBHOOK_URL || '').trim();
const FORCE = process.env.FORCE === '1';
const DRY = process.env.DRY === '1';

// 承認待ちを表す状態（設計 §1: GATE:human / STATE が人間待ちを示すもの）。
const HUMAN_WAIT_STATES = ['審査中', '受入', '社長室統合待ち', '社長室受領待ち', '社長室判断待ち'];

// ── 入力読み込み（ファイル / stdin "-"）。壊れていても落とさず空で進む（fail-safe）。
function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch (_) { return ''; }
}
function loadPipeline(srcArg) {
  let raw = '';
  let where = '';
  if (srcArg === '-') {
    where = '(stdin)';
    raw = readStdin();
  } else {
    const p = srcArg ? path.resolve(srcArg) : DEFAULT_PIPELINE;
    where = path.relative(ROOT, p) || p;
    if (!fs.existsSync(p)) return { ok: false, where, reason: 'not-found', data: emptyData() };
    try { raw = fs.readFileSync(p, 'utf8'); } catch (e) { return { ok: false, where, reason: e.message, data: emptyData() }; }
  }
  if (!raw.trim()) return { ok: false, where, reason: 'empty', data: emptyData() };
  try {
    const json = JSON.parse(raw);
    return { ok: true, where, data: normalize(json) };
  } catch (e) {
    return { ok: false, where, reason: 'invalid-json: ' + e.message, data: emptyData() };
  }
}

function emptyData() { return { generatedAt: '', items: [], conflicts: [] }; }

// orders-scan の JSON 形を受ける（正本キー: orders[]+cases[]・nextWho/nextAction・needsHuman）。
// 別ソースからのパイプも壊れにくいよう別名も拾う（items[] / status / turn 等）。
function normalize(json) {
  const items = Array.isArray(json) ? json
    : [].concat(
        Array.isArray(json.orders) ? json.orders : [],
        Array.isArray(json.cases) ? json.cases : [],
        Array.isArray(json.items) ? json.items : [],
        Array.isArray(json.pipeline) ? json.pipeline : [],
      );
  const out = items.map((it) => {
    const id = String(it.id || it.order || it.case || it.name || '').trim();
    const state = String(it.state || it.status || it.STATE || '').trim();
    const level = String(it.level || it.LEVEL || '').trim();
    const gate = String(it.gate || it.GATE || '').trim().toLowerCase();
    // 「誰の番か」= 役割名（AUDITOR/社長室/MAGI 等。人物名・個人情報ではない）
    // orders-scan は nextWho を出す。next がオブジェクト {who,action} の形も許容。
    const turn = String(
      it.nextWho || it.turn || it.owner || it.waitingOn ||
      (it.next && typeof it.next === 'object' ? it.next.who : it.next) || ''
    ).trim();
    const kind = String(it.kind || it.type || (id.startsWith('tpr') ? 'case' : id.startsWith('ord') ? 'order' : '')).trim();
    // orders-scan の権威ある人間ゲート判定（GATE:human / LEVEL:重大 / ESCALATE を集約済み）。
    // boolean が無いソースは undefined にして isHumanWait のヒューリスティックへフォールバック。
    const needsHuman = typeof it.needsHuman === 'boolean' ? it.needsHuman : undefined;
    return { id, state, level, gate, turn, kind, needsHuman };
  }).filter((it) => it.id); // ID 無しは捨てる（本文に出すのは ID ベースのみ）
  // ロック競合（設計 §5-3 サーキットブレーカ）。本文には件数と target/種別のみ。
  const conflicts = (json.locks && Array.isArray(json.locks.conflicts)) ? json.locks.conflicts.map((c) => ({
    type: String(c.type || '').trim(),
    target: String(c.target || '').trim(),
    ords: Array.isArray(c.ords) ? c.ords.map(String) : [],
  })) : [];
  return { generatedAt: String(json.generatedAt || json.stamp || ''), items: out, conflicts };
}

// ── digest 構築。Secret/個人情報/金額は構造的に持ち込まない（id/state/level/gate/turn のみ参照）。
function isHumanWait(it) {
  // orders-scan が出した権威ある判定を最優先（GATE:human/LEVEL:重大/ESCALATE 集約済み）。
  if (typeof it.needsHuman === 'boolean') return it.needsHuman;
  // フォールバック（別ソースから来た場合のヒューリスティック）。
  if (it.gate === 'human') return true;
  if (it.level === '重大') return true;
  return HUMAN_WAIT_STATES.includes(it.state);
}

function buildDigest(data) {
  const items = data.items;
  const total = items.length;
  // 完了/中止を除く稼働中
  const active = items.filter((it) => it.state !== '完了' && it.state !== '中止');
  const waits = active.filter(isHumanWait);
  const auto = active.filter((it) => !isHumanWait(it));

  // 状態別件数（件数のみ・実数は ID 数だけ）
  const byState = {};
  for (const it of active) byState[it.state || '(状態不明)'] = (byState[it.state || '(状態不明)'] || 0) + 1;

  const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
  return { total, active, waits, auto, byState, conflicts };
}

// 重複抑止のための安定ハッシュ。承認待ち集合と各 item の (id,state,gate) が変われば再通知。
function digestHash(d) {
  const sig = {
    waits: d.waits.map((it) => `${it.id}:${it.state}:${it.gate}`).sort(),
    active: d.active.map((it) => `${it.id}:${it.state}`).sort(),
    conflicts: d.conflicts.map((c) => `${c.type}:${c.target}`).sort(),
  };
  return crypto.createHash('sha256').update(JSON.stringify(sig)).digest('hex');
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (_) { return {}; }
}
function writeCache(hash) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ hash, at: new Date().toISOString() }, null, 2) + '\n');
  } catch (e) { console.error('[警告] キャッシュ書込失敗（重複抑止が効かない可能性）: ' + e.message); }
}

// ── 表示用整形（プレーンテキスト digest と Slack ブロック）
function fmtLines(d) {
  const lines = [];
  lines.push(`KIBI パイプライン: 稼働中 ${d.active.length}件 / 全 ${d.total}件`);
  const states = Object.keys(d.byState).sort();
  if (states.length) lines.push('状態: ' + states.map((s) => `${s} ${d.byState[s]}`).join(' / '));
  if (d.waits.length) {
    lines.push(`🔔 承認待ち ${d.waits.length}件（要 Sota 判断）:`);
    for (const it of d.waits) {
      const tag = [it.level && `LEVEL:${it.level}`, it.gate && `GATE:${it.gate}`].filter(Boolean).join(' ');
      lines.push(`  ・${it.id}  ${it.state || '状態不明'}${it.turn ? `  → ${it.turn}の番` : ''}${tag ? `  [${tag}]` : ''}`);
    }
  } else {
    lines.push('🔔 承認待ち: なし');
  }
  if (d.conflicts.length) {
    lines.push(`⚠ ロック競合 ${d.conflicts.length}件: ` + d.conflicts.map((c) => `${c.type}(${c.target}${c.ords.length ? ` ord=${c.ords.join(',')}` : ''})`).join(' '));
  }
  if (d.auto.length) {
    lines.push(`自動進行中 ${d.auto.length}件: ` + d.auto.map((it) => `${it.id}(${it.state || '?'}${it.turn ? `→${it.turn}` : ''})`).join(' '));
  }
  return lines;
}

function toSlackPayload(d) {
  const lines = fmtLines(d);
  const text = lines.join('\n'); // 通知/プレビュー用フォールバック
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: d.waits.length ? `🔔 承認待ち ${d.waits.length}件` : 'KIBI パイプライン', emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `自動通知 / ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC ・ ID と状態のみ（機密非掲載）` }] },
  ];
  return { text, blocks };
}

// ── Slack 送信（Node 標準 global fetch のみ。新規 npm 依存なし）
async function postSlack(payload) {
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.text().catch(() => '');
  if (!res.ok || body.trim() !== 'ok') {
    throw new Error(`Slack 応答 ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
}

(async () => {
  const srcArg = process.argv[2];
  const loaded = loadPipeline(srcArg);
  if (!loaded.ok) {
    // 入力が無い/壊れている＝通知すべき変化なしとみなしログのみ（落とさない）。
    console.error(`[情報] _pipeline.json を読めず通知スキップ（${loaded.where}: ${loaded.reason}）`);
  }
  const d = buildDigest(loaded.data);
  const lines = fmtLines(d);

  // 変化検知（FORCE 時は無視）
  const hash = digestHash(d);
  const prev = readCache();
  const changed = FORCE || prev.hash !== hash;

  if (!changed) {
    console.log('[抑止] 前回送信から状態変化なし。送信しません。（FORCE=1 で強制送信可）');
    console.log(lines.join('\n'));
    process.exit(0);
  }

  // 送信先が無い or DRY → stdout のみ（fail-safe）
  if (!WEBHOOK || DRY) {
    if (!WEBHOOK) console.error('[fail-safe] SLACK_WEBHOOK_URL 未設定。Slack へ投稿せず digest を出力します。');
    if (DRY) console.error('[DRY] DRY=1 のため Slack へ投稿しません。');
    console.log(lines.join('\n'));
    // 送信していないのでキャッシュは更新しない（次に webhook が付いたとき確実に送るため）。
    process.exit(0);
  }

  try {
    await postSlack(toSlackPayload(d));
    writeCache(hash);
    console.log(`[送信] Slack へ digest を投稿（承認待ち ${d.waits.length}件 / 稼働中 ${d.active.length}件）`);
  } catch (e) {
    console.error('[失敗] Slack 送信に失敗: ' + e.message);
    console.error(lines.join('\n')); // 送れなかった内容はログに残す
    process.exit(2);
  }
})();
