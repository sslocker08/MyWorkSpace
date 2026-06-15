#!/usr/bin/env node
// KIBI 全社集計スクリプト
// Secretary/status/*.md（各部署が自分のファイルだけを書く）を読み、
// Secretary/boards/*.md と Secretary/dashboard/index.html（タブ式・1画面）を生成する。
// 生成物は手編集禁止。直すときは元のステータスファイルを直して再実行する。
// 使い方: node Secretary/tools/build.js ｜ 操作モード: node Secretary/tools/serve.js
// デザイン: 和紙×墨モダン／概況=左→右の指揮系統フロー＋連携クラスタ／モデル=ブレットグラフ＋ドットマトリクス

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SHARED = path.resolve(__dirname, '..');
const ROOT = path.resolve(SHARED, '..', '..'); // KIBIルート（Secretary は Internal/ 配下。成果物パスはKIBIルート相対）
const PROTECTED = /(_Records|\.secrets|Kofukuron23)/; // 防火壁：保護領域は内容を読まない
const DEPTS = [
  { code: 'hq',  file: 'HQ.md',        name: '社長室' },
  { code: 'sec', file: 'Secretary.md', name: '秘書室' },
  { code: 'pln', file: 'Planning.md',  name: '経営企画室' },
  { code: 'brd', file: 'Strategy.md',  name: 'ブランド戦略室' },
  { code: 'prd', file: 'Development.md', name: '製品開発部' },
  { code: 'web', file: 'System.md',    name: 'EC・情報システム部' },
  { code: 'mkt', file: 'Marketing.md', name: 'マーケティング部' },
  { code: 'med', file: 'PR.md',        name: '広報部' },
  { code: 'sls', file: 'Sales.md',    name: '営業部' },
  { code: 'fin', file: 'Finance.md',  name: '経理・財務部' },
  { code: 'lgl', file: 'Legal.md',    name: '法務・コンプラ部' },
];
const DEPT_IDX = Object.fromEntries(DEPTS.map((d, i) => [d.name, i]));

const ACTIVE_TASK = ['未着手', '進行中', 'レビュー待ち', '他部署待ち', '社長室判断待ち', '保留'];
const TASK_STATES = ['未着手', '進行中', 'レビュー待ち', '他部署待ち', '社長室判断待ち', '保留', '完了', '中止'];
const LINK_STATES = ['依頼中', '未受領', '受領', '対応中', '回答済', '取下', '未対応', '解消'];
const now = new Date();
// JST固定（UTC+9）。マシンのタイムゾーンに依存せず日本時間で日付・期限を判定する。
// toISOString はUTC基準のため、+9h してから読むと日本時間の壁時計になる。
const JST = new Date(now.getTime() + 9 * 3600 * 1000);
const STAMP = JST.toISOString().slice(0, 16).replace('T', ' ');
const TODAY = JST.toISOString().slice(0, 10);

// ---------- パース ----------
function sections(md) {
  const out = {};
  for (const part of md.split(/\n(?=## )/).slice(1)) {
    const nl = part.indexOf('\n');
    const head = (nl === -1 ? part.slice(3) : part.slice(3, nl)).trim();
    out[head] = nl === -1 ? '' : part.slice(nl + 1);
  }
  return out;
}

function parseTable(sec) {
  if (!sec) return [];
  const lines = sec.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return [];
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  const rows = [];
  for (const l of lines.slice(2)) {
    const c = cells(l);
    if (!c[0] || /^[-ー－\s]*$/.test(c[0])) continue;
    const row = {};
    head.forEach((h, i) => (row[h] = c[i] || ''));
    rows.push(row);
  }
  return rows;
}

function bullets(sec) {
  if (!sec) return [];
  return sec.split('\n')
    .map((l) => l.match(/^-\s+(.+)/)).filter(Boolean)
    .map((m) => m[1].trim())
    .filter((t) => t && t !== '-' && !/^[^：:]*[：:]\s*$/.test(t));
}

function rawTables(md) {
  const out = [];
  let cur = null;
  for (const line of md.split('\n')) {
    if (line.trim().startsWith('|')) {
      const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (cells.every((c) => /^[-:\s]*$/.test(c))) continue;
      if (!cur) { cur = { headers: cells, rows: [] }; out.push(cur); }
      else cur.rows.push(cells);
    } else cur = null;
  }
  return out;
}

const F = (r, ...keys) => { for (const k of keys) if (r[k] !== undefined && r[k] !== '') return r[k]; return ''; };

function loadDept(d) {
  const file = path.join(SHARED, 'status', d.file);
  if (!fs.existsSync(file)) return { ...d, missing: true, tasks: [], reqOut: [], reqIn: [], blockers: [], judgments: [], feedback: [], deliverables: [], mail: [], appeals: [], theme: '', updated: '' };
  const md = fs.readFileSync(file, 'utf8');
  const sec = sections(md);
  const updated = (md.match(/最終更新:\s*(.+)/) || [, ''])[1].trim();
  return {
    ...d,
    updated,
    theme: bullets(sec['重点テーマ'])[0] || '-',
    tasks: parseTable(sec['タスク']).map((t) => ({ ...t, ステータス: F(t, 'ステータス', '状態') })),
    reqOut: parseTable(sec['他部署への依頼']).map((r) => ({ ...r, ステータス: F(r, 'ステータス', '状態') })),
    reqIn: parseTable(sec['受けた依頼への対応']).map((r) => ({ ...r, ステータス: F(r, 'ステータス', '状態') })),
    blockers: parseTable(sec['詰まり・障害']).map((b) => ({ ...b, ステータス: F(b, 'ステータス', '状態') })),
    judgments: parseTable(sec['社長室への判断依頼']).map((j) => ({ ...j, 内容: F(j, '内容', '件名') })),
    feedback: parseTable(sec['部署へのフィードバック']),
    deliverables: parseTable(sec['成果物（レビュー用）']).map((v) => ({ ...v, ステータス: F(v, 'ステータス', '状態') })),
    mail: parseTable(sec['社内便（送信）']).map((m) => ({ 差出人: d.name, ...m, ステータス: F(m, 'ステータス', '状態') })),
    appeals: bullets(sec['共有・アピール']),
  };
}

function daysUntil(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
  const t = new Date(TODAY); // JST本日0時（UTC表現）。STAMP/TODAYと基準を統一。
  return Math.round((new Date(s) - t) / 86400000);
}

// ---------- 集計 ----------
const depts = DEPTS.map(loadDept);

const allTasks = depts.flatMap((d) => d.tasks.map((t) => ({ 部署: d.name, ...t })));
const byOrg = (a, b) => (DEPT_IDX[a['部署']] ?? 99) - (DEPT_IDX[b['部署']] ?? 99) || String(a['ID']).localeCompare(String(b['ID']));
const activeTasks = allTasks.filter((t) => ACTIVE_TASK.includes(t['ステータス'])).map((t) => ({ ...t, _d: daysUntil(t['期限']) })).sort(byOrg);
const doneTasks = allTasks.filter((t) => ['完了', '中止'].includes(t['ステータス'])).map((t) => ({ ...t, _d: null })).sort(byOrg);
const allBlockers = depts.flatMap((d) => d.blockers.map((b) => ({ 部署: d.name, ...b })));
const activeBlockers = allBlockers.filter((b) => !String(b['ステータス']).includes('解消'));
const resolvedBlockers = allBlockers.filter((b) => String(b['ステータス']).includes('解消'));
const allJudgments = depts.flatMap((d) => d.judgments.map((j) => ({ 部署: d.name, ...j })));
const allFeedback = depts.flatMap((d) => d.feedback);

// 成果物レビュー（rules/review-gate.md）
const taskById = Object.fromEntries(allTasks.map((t) => [t['ID'], t]));
// 社長の最新判定を対象IDごとに（fbk-hq-NNN の番号が大きいほど新しい）
const fbkVerdict = {};
for (const f of allFeedback) {
  const tgt = String(f['対象'] || '').trim();
  if (!tgt || !['承認', '差戻し'].includes(f['判定'])) continue;
  const n = parseInt(String(f['ID']).replace(/\D/g, ''), 10) || 0;
  if (!fbkVerdict[tgt] || n >= fbkVerdict[tgt].n) fbkVerdict[tgt] = { v: f['判定'], n };
}
// 判定記録（serve.js が /review で書く）。再提出検知（成果物SHA）・社長コメント原文・対応方針を持つ
let verdicts = {};
try { verdicts = JSON.parse(fs.readFileSync(path.join(SHARED, 'dashboard', 'summaries', '_verdicts.json'), 'utf8')); } catch (e) {}
// 三社パイプライン（orders-scan.js が出力。build は読むだけ＝生成しない）。
// 無ければ null のまま＝タブは「未生成」案内を出す。決定的・高速（JSON.parse のみ・外部呼び出しなし）。
let pipeline = null;
try { pipeline = JSON.parse(fs.readFileSync(path.join(SHARED, 'dashboard', '_pipeline.json'), 'utf8')); } catch (e) {}
function curSha(rel) {
  try {
    const abs = path.resolve(ROOT, rel);
    if (!abs.startsWith(ROOT + path.sep) || PROTECTED.test(abs) || !fs.existsSync(abs)) return null;
    return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  } catch (e) { return null; }
}
// 成果物の実効ステータス：①部署が確定済(承認済/取下)ならそれ ②判定記録があり成果物が判定後に
// 更新されていれば「レビュー待ち」へ戻す（＝差戻し→修正→自動で再レビュー）③記録の判定を反映
// ④記録が無い旧データは fbk から派生。単一書き手：serve.js は HQ.md/操作用ファイルのみ書く。
function effDeliv(v) {
  const raw = v['ステータス'];
  if (raw === '承認済' || raw === '取下') return raw;
  const rec = verdicts[v['タスクID']];
  if (rec && rec.files) {
    const rel = String(v['成果物（パス）'] || '').trim();
    const stored = rec.files[rel];
    if (stored) {
      const cur = curSha(rel);
      if (cur && cur !== stored) return 'レビュー待ち'; // 判定後に成果物が更新＝再提出→再レビュー
      return rec.verdict === '承認' ? '承認済' : '差戻し';
    }
  }
  const fv = fbkVerdict[v['タスクID']];
  if (fv) return fv.v === '承認' ? '承認済' : '差戻し';
  return raw || 'レビュー待ち';
}
const allDeliverables = depts.flatMap((d) => d.deliverables.map((v) => ({ 部署: d.name, _code: d.code, ...v, _eff: effDeliv(v) })));
const reviewWaiting = allDeliverables.filter((v) => v._eff === 'レビュー待ち');
const gateViolations = allDeliverables.filter((v) => v['レビュー'] === '社長' && v._eff !== '承認済'
  && ['完了', '中止'].includes((taskById[v['タスクID']] || {})['ステータス']));
// レビュー要否タグ（機械判定＝最高優先 もしくは Opus/Fable/Ultracode、または社長レビュー成果物あり）
const reviewReq = (t) => allDeliverables.some((v) => v['タスクID'] === t['ID'] && v['レビュー'] === '社長')
  || t['優先度'] === '最高' || ['Opus', 'Fable', 'Ultracode'].includes(modelOf(t)) ? '関門' : '';

const reqInById = {};
for (const d of depts) for (const r of d.reqIn) if (r['ID']) reqInById[r['ID']] = { ...r };
const allRequests = depts.flatMap((d) =>
  d.reqOut.map((r) => {
    const m = reqInById[r['ID']] || {};
    return {
      ID: r['ID'], 依頼元: d.name, 宛先: r['宛先'], 内容: r['内容'],
      緊急度: r['緊急度'] || '-', 期限: r['期限'] || '-',
      元: r['ステータス'] || '-', 先: m['ステータス'] || '未受領', '回答・参照': m['回答・参照'] || '-',
    };
  })
);
const reqById = Object.fromEntries(allRequests.map((r) => [r.ID, r]));
const orphanIn = depts.flatMap((d) => d.reqIn.filter((r) => r['ID'] && !reqById[r['ID']]).map((r) => ({ ...r, 宛先実体: d.name })));
const openRequests = allRequests.filter((r) => !['完了', '取下'].includes(r['元']));
const closedRequests = allRequests.filter((r) => ['完了', '取下'].includes(r['元']));
const dueSoon = activeTasks.filter((t) => t._d !== null && t._d <= 7);

// 社内便（スレッド）：送信者所有・受信箱とスレッドは派生ビュー（coordination-spec §4）
const allMail = depts.flatMap((d) => d.mail);
const threadsMap = {};
for (const m of allMail) {
  const tid = String(m['スレッド'] || m['便ID'] || '').trim();
  if (!tid) continue;
  (threadsMap[tid] = threadsMap[tid] || []).push(m);
}
const threads = Object.keys(threadsMap).map((tid) => {
  const msgs = threadsMap[tid].slice().sort((a, b) => String(a['日時'] || '').localeCompare(String(b['日時'] || '')));
  const last = msgs[msgs.length - 1] || {};
  const parts = [...new Set(msgs.flatMap((m) => [m['差出人'], m['宛先']]).filter(Boolean))];
  const open = !msgs.some((m) => m['種別'] === '完了' || String(m['ステータス']).includes('完了'));
  const needHQ = open && last['宛先'] === '社長室';
  return { tid, msgs, subject: msgs[0]['件名'] || tid, parts, last, open, needHQ };
});
const openThreads = threads.filter((t) => t.open);

// 本日の全社方針（daily/）
let policyBullets = null;
const dailyPath = path.join(SHARED, 'daily', `${TODAY}.md`);
if (fs.existsSync(dailyPath)) {
  const dsec = sections(fs.readFileSync(dailyPath, 'utf8'));
  const key = Object.keys(dsec).find((k) => k.startsWith('朝礼統合'));
  if (key) policyBullets = bullets(dsec[key]);
}

// モデル配分（現役タスクベース）
const MODELS = ['Sonnet', 'Opus', 'Haiku', 'Fable', 'Ultracode'];
const MODEL_COLOR = { Sonnet: '#0072B2', Opus: '#E69F00', Haiku: '#009E73', Fable: '#2b2b2b', Ultracode: '#CC79A7', 'その他': '#999489' };
const MODEL_TARGET = { Sonnet: [60, 70], Opus: [20, 25], Haiku: [10, 15], Fable: [1, 5], Ultracode: [0, 0] };
const modelOf = (t) => {
  const m = String(t['モデル'] || '').split('/')[0].trim().toLowerCase();
  return MODELS.find((x) => m.startsWith(x.toLowerCase())) || 'その他';
};
const modelCount = {};
for (const t of activeTasks) modelCount[modelOf(t)] = (modelCount[modelOf(t)] || 0) + 1;
const modelTotal = activeTasks.length || 1;

// archive/（履歴）
const archiveDir = path.join(SHARED, 'archive');
const archives = fs.existsSync(archiveDir)
  ? fs.readdirSync(archiveDir).filter((f) => f.endsWith('.md')).sort().reverse()
      .map((f) => ({ file: f, tables: rawTables(fs.readFileSync(path.join(archiveDir, f), 'utf8')) }))
  : [];

// ---------- boards/*.md 出力 ----------
const GEN = `<!-- 生成ファイル（${STAMP}）：手編集禁止。Secretary/tools/build.js が status/ から生成 -->`;

function mdTable(headers, rows, get) {
  if (!rows.length) return '（なし）\n';
  const line = (cs) => `| ${cs.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map((r) => line(headers.map((h) => (get ? get(r, h) : r[h]) || '-')))].join('\n') + '\n';
}

function writeBoard(file, title, body) {
  fs.writeFileSync(path.join(SHARED, 'boards', file), `# ${title}\n\n${GEN}\n\n${body}`);
}

writeBoard('tasks.md', '全社タスク管理表',
  mdTable(['ID', '部署', '担当者', 'タスク', 'ステータス', 'トリガー', 'モデル', '期限', '進捗', '優先度', '関係部署', '完了日'], allTasks.slice().sort(byOrg)));
writeBoard('requests.md', '部署間依頼ボード',
  mdTable(['ID', '依頼元', '宛先', '内容', '緊急度', '期限', 'ステータス(依頼元)', 'ステータス(宛先)', '回答・参照'], allRequests,
    (r, h) => h === 'ステータス(依頼元)' ? r['元'] : h === 'ステータス(宛先)' ? r['先'] : r[h]) +
  (orphanIn.length ? `\n## 依頼元の行が見つからない対応（要確認）\n` + mdTable(['ID', '依頼元', 'ステータス', '回答・参照'], orphanIn) : ''));
writeBoard('blockers.md', '詰まり・障害ボード',
  mdTable(['ID', '部署', '内容', '影響', '必要な支援', 'ステータス'], allBlockers));
writeBoard('judgments.md', '社長室判断待ち一覧',
  mdTable(['ID', '部署', '内容', '背景', '期限'], allJudgments));
writeBoard('feedback.md', '社長フィードバック（各部署はセッション開始時に自分宛を読む）',
  mdTable(['ID', '宛先', '対象', '判定', '内容', '日付'], allFeedback));
writeBoard('bulletin.md', '全社掲示板',
  depts.filter((d) => d.appeals.length).map((d) => d.appeals.map((a) => `- **${d.name}**（${d.updated || '-'}）: ${a}`).join('\n')).join('\n') + '\n' || '（投稿なし）\n');
writeBoard('review.md', '成果物レビューボード（正本＝各ステータスの「成果物（レビュー用）」｜規程＝rules/review-gate.md）',
  mdTable(['タスクID', '部署', '成果物（パス）', '種別', 'レビュー', 'ステータス', '提出日'], allDeliverables));
writeBoard('mail.md', '社内便スレッド（正本＝各ステータスの「社内便（送信）」｜規程＝rules/coordination-spec.md §4）',
  threads.length
    ? threads.map((th) => `## ${th.subject}　〔${th.tid}〕${th.open ? '' : '（完了）'}\n参加: ${th.parts.join(' ⇄ ')}\n\n`
        + th.msgs.map((m) => `- **${m['差出人']} → ${m['宛先']}**（${m['日時'] || '-'}・${m['種別'] || '-'}）: ${String(m['本文/パス'] || m['本文'] || '')}`).join('\n')).join('\n\n')
    : '（社内便なし）\n');

// ---------- dashboard/index.html ----------
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const linkify = (s) => esc(s).replace(/((?:tsk|req|jdg|blk|fbk)-[a-z0-9]+-\d{3})/g, '<a class="jump id" data-row="$1">$1</a>');

const CHIP = {
  '未着手': '#9b958a', '進行中': '#5c7a5c', 'レビュー待ち': '#4a6b8a', '他部署待ち': '#a8842c',
  '社長室判断待ち': '#7a5c8a', '判断待ち': '#7a5c8a', '保留': '#8a8a8a', '完了': '#3c5c3c', '中止': '#2b2b2b',
  '依頼中': '#a8842c', '取下': '#2b2b2b', '未受領': '#9b958a', '受領': '#4a6b8a', '対応中': '#5c7a5c', '回答済': '#3c5c3c',
  '未対応': '#a14b3c', '解消': '#3c5c3c',
  '最高': '#a14b3c', '高': '#a8842c', '中': '#4a6b8a', '低': '#9b958a',
  '承認': '#5c7a5c', '差戻し': '#a14b3c', 'コメント': '#4a6b8a',
  'レビュー待ち': '#4a6b8a', '承認済': '#3c5c3c',
};
const TONE = { 順調: '#1A7F5A', 注意: '#B45309', 詰まり: '#C2410C', 判断待ち: '#6D28D9', 未初期化: '#9b958a' };
const chip = (s) => s && s !== '-' ? `<span class="chip" style="background:${CHIP[s] || '#9b958a'}">${esc(s)}</span>` : '-';
const id = (s) => `<span class="id">${esc(s)}</span>`;
const tdT = (s) => `<td title="${esc(s)}">${esc(s)}</td>`;
const prog = (p) => {
  const n = Math.max(0, Math.min(100, parseInt(p) || 0));
  return `<div class="prog"><span class="bar"><i style="width:${n}%"></i></span><em>${n}%</em></div>`;
};
const progCat = (t) => {
  if (t['ステータス'] === '完了') return '完了';
  const n = parseInt(t['進捗']) || 0;
  return n <= 0 ? '未着手' : n >= 100 ? '完了' : '仕掛中';
};
const due = (t) => t._d !== null && t._d < 0
  ? `<span class="over" title="期限超過">${esc(t['期限'])}</span>` : esc(t['期限'] || '-');

function trigger(t) {
  const v = String(t['トリガー'] || '').trim();
  if (!v || v === '-') return '-';
  if (v.startsWith('req-')) {
    const r = reqById[v];
    return `<a class="jump" data-row="${esc(v)}" title="${esc(r ? r['宛先'] : '')} ${esc(v)}">${esc(r ? r['宛先'] : '')} ${id(v)}</a>`;
  }
  if (v.startsWith('jdg-')) return `<a class="jump" data-row="${esc(v)}">社長室 ${id(v)}</a>`;
  return esc(v);
}

function cardTone(d) {
  if (d.missing) return '未初期化';
  if (d.blockers.some((b) => b['ステータス'] !== '解消')) return '詰まり';
  if (d.judgments.length) return '判断待ち';
  const act = d.tasks.filter((t) => ACTIVE_TASK.includes(t['ステータス']));
  if (act.some((t) => ['他部署待ち', 'レビュー待ち'].includes(t['ステータス']) || (daysUntil(t['期限']) !== null && daysUntil(t['期限']) <= 3))) return '注意';
  return '順調';
}

function colgroup(widths) {
  return '<colgroup>' + widths.map((w) => (w === 'auto' ? '<col>' : `<col style="width:${w}px">`)).join('') + '</colgroup>';
}

function tbl(widths, headers, rows, render, rowAttr) {
  if (!rows.length) return '<p class="empty">なし</p>';
  return `<table>${colgroup(widths)}<thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
    rows.map((r) => `<tr${rowAttr ? rowAttr(r) : ''}>${render(r)}</tr>`).join('') + '</tbody></table>';
}

// 共通列幅（タブ間で揃える・改行禁止）
const TASK_W = [100, 140, 122, 'auto', 110, 180, 80, 95, 92, 64];
const TASK_H = ['ID', '部署', '担当者', 'タスク', 'ステータス', 'トリガー部署', 'モデル', '期限', '進捗', '優先度'];
const TASK_H_DONE = ['ID', '部署', '担当者', 'タスク', 'ステータス', 'トリガー部署', 'モデル', '完了日', '進捗', '優先度'];
const gtag = (t) => reviewReq(t) ? `<span class="gtag" title="社長レビュー必須＝承認まで完了化しない（rules/review-gate.md）">関門</span>` : '';
const taskCells = (t, dateCell) =>
  `<td>${id(t['ID'])}</td><td>${esc(t['部署'])}</td><td title="${esc(t['担当者'] || '-')}">${esc(t['担当者'] || '-')}</td><td title="${esc(t['タスク'])}">${gtag(t)}${esc(t['タスク'])}</td>` +
  `<td>${chip(t['ステータス'])}</td><td>${trigger(t)}</td><td>${esc(t['モデル'] || '-')}</td><td>${dateCell}</td><td>${prog(t['進捗'])}</td><td>${chip(t['優先度'])}</td>`;
const taskRow = (t) => taskCells(t, due(t));
const doneRow = (t) => taskCells(t, esc(t['完了日'] || '-'));
const taskAttr = (t) =>
  ` id="row-${esc(t['ID'])}" data-dept="${esc(t['部署'])}" data-status="${esc(t['ステータス'])}" data-model="${modelOf(t)}" data-prog="${progCat(t)}" data-pri="${esc(t['優先度'] || '')}"`;

// 共通フィルタバー（部署・ステータス・モデル・進捗・優先度＋検索＋リセット）
const opt = (vals) => vals.map((v) => `<option>${esc(v)}</option>`).join('');
const fbar = `<div class="fbar">
  <select class="f" data-k="dept"><option value="">部署：すべて</option>${opt(DEPTS.map((d) => d.name))}</select>
  <select class="f" data-k="status"><option value="">ステータス：すべて</option><optgroup label="タスク">${opt(TASK_STATES)}</optgroup><optgroup label="連携">${opt(LINK_STATES)}</optgroup></select>
  <select class="f" data-k="model"><option value="">モデル：すべて</option>${opt(MODELS)}</select>
  <select class="f" data-k="prog"><option value="">進捗：すべて</option>${opt(['未着手', '仕掛中', '完了'])}</select>
  <select class="f" data-k="pri"><option value="">優先度：すべて</option>${opt(['最高', '高', '中', '低'])}</select>
  <input class="fsearch" type="search" placeholder="検索（ID・語句）">
  <button class="freset" type="button">リセット</button>
</div>`;

// ===== 概況: 左→右フロー（四角カード・2クラスタ帯・連結線はJSで背面描画） =====
const DEPT_HUE = { hq: '#2b2b2b', pln: '#3D5A99', brd: '#D9442C', prd: '#3F7E5B', web: '#2C6E9E', mkt: '#D9952B', med: '#7E5BA6', sls: '#3A8E8C', fin: '#8A6A45', lgl: '#5A6B7A' };
const D = Object.fromEntries(depts.map((d) => [d.code, d]));
// クラスタ（直轄を先頭に）
const BANDS = [
  { key: 'g1', label: '世界観をつくる・伝える', lead: 'brd', codes: ['brd', 'prd', 'mkt', 'med'] },
  { key: 'g2', label: '事業をまわす・守る', lead: 'pln', codes: ['pln', 'web', 'fin', 'sls', 'lgl'] },
];

function deptStats(d) {
  const actList = d.tasks.filter((t) => ACTIVE_TASK.includes(t['ステータス'])).sort((a, b) => String(a['ID']).localeCompare(String(b['ID'])));
  const act = actList.length;
  const done = d.tasks.filter((t) => t['ステータス'] === '完了').length;
  const jdg = d.judgments.length;
  const blk = d.blockers.filter((b) => b['ステータス'] !== '解消').length;
  const tone = cardTone(d);
  const badge = blk ? `<span class="nbadge" style="background:${TONE['詰まり']}">詰${blk}</span>`
    : jdg ? `<span class="nbadge" style="background:${TONE['判断待ち']}">判${jdg}</span>` : '';
  const title = `${d.name} ── ${d.theme} ｜ 進行${act}・完了${done} ｜ ${tone} ｜ 更新 ${(d.updated || '-').split('（')[0]}`;
  return { actList, act, done, tone, badge, title };
}

function orgCard(code, isLead) {
  const d = D[code];
  const s = deptStats(d);
  const tasks = s.actList.slice(0, 3).map((t) =>
    `<span class="otask"><i style="background:${CHIP[t['ステータス']] || '#9b958a'}"></i>${esc(t['タスク'])}</span>`).join('');
  const more = s.act > 3 ? `<span class="omore">ほか ${s.act - 3} 件</span>` : '';
  return `<div class="ocard${s.tone === '詰まり' ? ' alert' : ''}" data-code="${code}" style="--c:${DEPT_HUE[code]}" title="${esc(s.title)}">
    <div class="ohead">
      <span class="ocode" style="background:${DEPT_HUE[code]}">${code.toUpperCase()}</span>
      <span class="oname">${esc(d.name)}${isLead ? '<em class="dtag">直轄</em>' : ''}</span>
      <i class="odot" style="background:${TONE[s.tone]}"></i>
    </div>
    <div class="otheme">${esc(d.theme)}</div>
    <div class="otasks">${tasks || '<span class="onone">現役タスクなし</span>'}${more}</div>
    <div class="ometa">進行 ${s.act} ／ 完了 ${s.done}${s.badge}</div>
  </div>`;
}

const ceoS = deptStats(D.hq);
const ceoCard = `<div class="ocard ceo" data-code="hq" title="${esc(ceoS.title)}">
  <div class="ohead"><span class="ocode" style="background:${DEPT_HUE.hq}">HQ</span><span class="oname">社長室</span><i class="odot" style="background:${TONE[ceoS.tone]}"></i></div>
  <div class="otheme">${esc(D.hq.theme)}</div>
  <div class="ometa">進行 ${ceoS.act} ／ 完了 ${ceoS.done}${ceoS.badge}</div>
</div>`;

const bandsHTML = BANDS.map((b) => `<div class="band ${b.key}" data-band="${b.key}">
  <span class="blabel" style="color:${DEPT_HUE[b.lead]}">${esc(b.label)}</span>
  <div class="bcards">${b.codes.map((c) => orgCard(c, c === b.lead)).join('')}</div>
</div>`).join('');

const policyHTML = policyBullets && policyBullets.length
  ? `<div class="policy"><span class="pdot"></span><strong>本日の全社方針（${TODAY}）</strong><span class="ptext">${policyBullets.map(esc).join('　｜　')}</span></div>`
  : `<div class="policy muted"><span class="pdot"></span>本日の全社方針：未作成 ── 朝礼で社長室が <span class="id">Secretary/daily/${TODAY}.md</span> に統合すると、ここに表示される</div>`;

const orgHTML = `
${policyHTML}
<div class="org">
  <svg class="orgsvg" aria-hidden="true"></svg>
  <div class="ceocol">${ceoCard}</div>
  <div class="bands">${bandsHTML}</div>
</div>
<div class="legend" style="text-align:center">線＝社長室からの系統（朱の流れ＝指示の下り）｜ 帯＝連携の近い圏 ｜ カード右上の点＝今日の調子：
  <i class="lgdot" style="background:${TONE['順調']}"></i>順調
  <i class="lgdot" style="background:${TONE['注意']}"></i>注意
  <i class="lgdot" style="background:${TONE['詰まり']}"></i>詰まり
  <i class="lgdot" style="background:${TONE['判断待ち']}"></i>判断待ち
</div>`;

// ===== モデルタブ: ブレットグラフ＋部署別ドットマトリクス =====
const bulletRows = MODELS.map((k) => {
  const c = modelCount[k] || 0;
  const pct = Math.round((c / modelTotal) * 100);
  const [lo, hi] = MODEL_TARGET[k];
  let judge = '';
  if (k === 'Ultracode') judge = c > 0 ? `<span class="warn">▲ 使用中（承認確認）</span>` : '';
  else if (pct > hi) judge = `<span class="warn">▲ 高め</span>`;
  else if (pct < lo) judge = `<span class="low">▼ 低め</span>`;
  const band = k === 'Ultracode'
    ? `<i class="tick" style="left:0"></i>`
    : `<i class="band" style="left:${lo}%;width:${hi - lo}%"></i>`;
  const target = k === 'Ultracode' ? '特大案件のみ' : `目安 ${lo}–${hi}%`;
  return `<div class="brow">
    <div class="blabel2">${k}<small>${target}</small></div>
    <div class="btrack">${band}<i class="bbar" style="width:${pct}%"></i></div>
    <div class="bval">${c}件（${pct}%）${judge}</div>
  </div>`;
}).join('');

const dotLegend = MODELS.map((k) => `<span><i style="background:${MODEL_COLOR[k]}"></i>${k}</span>`).join('');
const dotMatrix = depts.map((d) => {
  const act = d.tasks.filter((t) => ACTIVE_TASK.includes(t['ステータス']));
  const dots = act
    .map((t) => ({ t, m: modelOf(t) }))
    .sort((a, b) => MODELS.indexOf(a.m) - MODELS.indexOf(b.m))
    .map((x) => `<i class="dot" style="background:${MODEL_COLOR[x.m]}" title="${esc(x.t['ID'])} ${esc(x.t['タスク'])}（${x.m}）"></i>`).join('');
  return `<div class="mdrow"><span class="mdname">${esc(d.name)}</span><span class="mddots">${dots || '<em class="none">—</em>'}</span></div>`;
}).join('');

const modelHTML = `
<h2>モデル配分 vs 規程目安（現役タスク ${activeTasks.length} 件）</h2>
<div class="mwrap">
  <div class="bullets card">
    ${bulletRows}
    <div class="baxis"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></div>
  </div>
  <div class="dots card">
    <div class="dlegend">${dotLegend}</div>
    ${dotMatrix}
  </div>
</div>
<p class="fine">読み方：墨色のバー（実績）が薄い帯（規程目安レンジ）の中で止まっていれば適正。右は部署別の稼働内訳（●1つ＝現役タスク1件、色＝モデル）。集計は「モデル」列の先頭表記。規程は Secretary/rules/model-policy.md。</p>`;

// ===== 判断タブ =====
const judgeTable = tbl([100, 140, 'auto', 'auto', 95, 150], ['ID', '部署', '内容', '背景', '期限', '操作'], allJudgments, (r) =>
  `<td>${id(r['ID'])}</td><td>${esc(r['部署'])}</td>${tdT(r['内容'])}${tdT(r['背景'])}<td>${esc(r['期限'])}</td>` +
  `<td class="acts"><button class="act ok" data-dest="${esc(r['部署'])}" data-target="${esc(r['ID'])}" data-verdict="承認">承認</button>` +
  `<button class="act ng" data-dest="${esc(r['部署'])}" data-target="${esc(r['ID'])}" data-verdict="差戻し">差戻し</button></td>`,
  (r) => ` id="row-${esc(r['ID'])}" data-dept="${esc(r['部署'])}" data-status="社長室判断待ち"`);

const decisionsMd = fs.existsSync(path.join(SHARED, 'boards', 'decisions.md')) ? fs.readFileSync(path.join(SHARED, 'boards', 'decisions.md'), 'utf8') : '';
const decisions = parseTable(decisionsMd).reverse();

// ===== レビュータブ（成果物レビュー関門 rules/review-gate.md） =====
const TEXT_EXT = ['.md', '.txt', '.js', '.json', '.html', '.css', '.csv'];
// markdown の指定見出しセクション本文を取り出す（カードの結論表示用）
function sectionText(md, name) {
  const lines = String(md).split('\n');
  const i = lines.findIndex((l) => /^#{1,6}\s/.test(l) && l.includes(name));
  if (i < 0) return '';
  const buf = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^#{1,6}\s/.test(lines[j])) break;
    if (lines[j].trim()) buf.push(lines[j].trim());
  }
  return buf.join(' ').replace(/[*_`>#|]/g, '').replace(/^-\s*/, '').replace(/\s+/g, ' ').trim();
}
function teaserOf(text) {
  const pick = [];
  for (const l of String(text).split('\n')) {
    const t = l.trim();
    if (!t || t.startsWith('#') || t.startsWith('<!--')) continue;
    pick.push(t); if (pick.length >= 2) break;
  }
  return pick.join(' ').replace(/[*_`>#|]/g, '').replace(/^-\s*/, '').replace(/\s+/g, ' ').slice(0, 160);
}
function isTextFile(abs) {
  let fd = null;
  try {
    fd = fs.openSync(abs, 'r');
    const b = Buffer.alloc(4096);
    const n = fs.readSync(fd, b, 0, 4096, 0);
    for (let i = 0; i < n; i++) if (b[i] === 0) return false;
    return true;
  } catch (e) { return false; } finally { if (fd != null) fs.closeSync(fd); }
}
function fileInfo(abs) {
  try {
    const st = fs.statSync(abs);
    return `- ファイル：\`${path.basename(abs)}\`\n- 形式：${path.extname(abs) || '(拡張子なし)'}\n- サイズ：${(st.size / 1024).toFixed(1)} KB\n- 更新：${st.mtime.toISOString().slice(0, 16).replace('T', ' ')}`;
  } catch (e) { return '- メタ情報の取得に失敗'; }
}
// 原文は常に表示。レビュイー要約は結論に集約。対象外も必ず情報（メタ＋理由）を返す。build は Ollama を呼ばない。
function deliverableView(v) {
  const rel = String(v['成果物（パス）'] || '').trim();
  const out = { conclusion: '', summary: null, original: null, commentNote: '', pending: false, stale: false, note: '', path: rel, generable: false };
  if (!rel || rel === '-') {
    out.note = 'パス未記入';
    out.commentNote = '成果物パスが未記入です。提出部署はパスを記入してください。レビュー資料は作成できません。';
    out.original = '（パス未記入）';
    return out;
  }
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) || PROTECTED.test(abs)) {
    out.note = '保護領域';
    out.commentNote = '🔒 保護領域（_Records 等）の成果物です。個人情報保護のため内容と要約は表示しません。レビューには集計値の成果物（_Records 外のパス）を提出してください。';
    out.original = out.commentNote;
    return out;
  }
  if (!fs.existsSync(abs)) {
    out.note = 'ファイル不在';
    out.commentNote = '⚠ 指定パスにファイルがありません。パスの誤り、または未コミットの可能性があります。提出部署に確認してください。';
    out.original = '指定パス：' + rel + '（不在）';
    return out;
  }
  if (!isTextFile(abs)) {
    out.note = '非テキスト';
    out.commentNote = 'この成果物はテキストではないため自動要約の対象外です（画像・PDF 等）。右にメタ情報を表示します。レビューには概要を .md で補足提出するか、ファイルを直接ご確認ください。';
    out.original = '## 成果物メタ情報\n' + fileInfo(abs) + '\n\nテキストでないため本文プレビュー・自動要約はできません。';
    return out;
  }
  out.generable = true;
  out.original = fs.readFileSync(abs, 'utf8').slice(0, 24000);
  const cacheFile = path.join(SHARED, 'dashboard', 'summaries', `${v['タスクID']}__${path.basename(abs)}.md`);
  if (fs.existsSync(cacheFile)) {
    const raw = fs.readFileSync(cacheFile, 'utf8');
    const m = raw.match(/^<!--\s*sha:([0-9a-f]+)/);
    const sha = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    out.summary = raw.replace(/^<!--[^>]*-->\n?/, '').trim();
    out.stale = !(m && m[1] === sha);
    out.conclusion = sectionText(out.summary, '結論') || teaserOf(out.summary);
    out.note = out.stale ? '要約あり・成果物が更新されています' : '';
  }
  if (!out.summary) out.pending = true; // レビュー入り＝自動生成待ち（コード含む）
  return out;
}
// 判断(jdg)の実効状態：判定記録/fbk から（成果物SHAは無いので判定をそのまま反映）
function effJudge(jid) {
  const rec = verdicts[jid];
  if (rec && rec.verdict) return rec.verdict === '承認' ? '承認済' : '差戻し';
  const fv = fbkVerdict[jid];
  if (fv) return fv.v === '承認' ? '承認済' : '差戻し';
  return '判断待ち';
}
// 判断の論点整理ブリーフ（キャッシュ）＋参照資料
function judgeView(j) {
  const out = { conclusion: '', summary: null, original: null, pending: false, refPath: '' };
  const cacheFile = path.join(SHARED, 'dashboard', 'summaries', `${j['ID']}__judge.md`);
  if (fs.existsSync(cacheFile)) {
    out.summary = fs.readFileSync(cacheFile, 'utf8').replace(/^<!--[^>]*-->\n?/, '').trim();
    out.conclusion = sectionText(out.summary, '結論') || teaserOf(out.summary);
  } else out.pending = true;
  const m = String((j['背景'] || '') + ' ' + (j['内容'] || '')).replace(/`/g, '').match(/([A-Za-z0-9_][A-Za-z0-9_./\- ]*\.(?:md|txt))/);
  if (m) {
    const abs = path.resolve(ROOT, m[1].trim());
    if (abs.startsWith(ROOT + path.sep) && !PROTECTED.test(abs) && fs.existsSync(abs) && isTextFile(abs)) {
      out.original = fs.readFileSync(abs, 'utf8').slice(0, 24000); out.refPath = m[1].trim();
    }
  }
  if (!out.original) out.original = '## 背景\n' + (j['背景'] || '(背景なし)') + '\n\n## 論点\n' + (j['内容'] || '');
  return out;
}
const rtabsHTML = `<button class="rtab active" data-dept="">全部署<em>${reviewWaiting.length}</em></button>` +
  depts.map((d) => {
    const n = d.deliverables.filter((x) => effDeliv(x) === 'レビュー待ち').length;
    return `<button class="rtab${d.deliverables.length ? '' : ' dim'}" data-dept="${esc(d.name)}">${esc(d.name)}<em>${n}</em></button>`;
  }).join('');
const rstatesHTML = ['レビュー待ち', '承認済', '差戻し', '取下', 'すべて'].map((s) =>
  `<button class="rstate${s === 'レビュー待ち' ? ' active' : ''}" data-state="${esc(s)}">${esc(s)}</button>`).join('');
const reviewDocs = {};
const rcardsHTML = allDeliverables.map((v, i) => {
  const t = taskById[v['タスクID']] || {};
  const view = deliverableView(v);
  const eff = v._eff;
  const title = t['タスク'] || '';
  const key = 'r' + i;
  const actable = eff !== '承認済' && eff !== '取下'; // HQ成果物も社長が画面で承認/差戻しできる
  const rec = verdicts[v['タスクID']];
  const pNote = rec ? String(rec.presidentNote || '') : '';
  const plan = rec ? (rec.responsePlan === '__pending__' ? '' : String(rec.responsePlan || '')) : '';
  const planPending = !!(rec && rec.responsePlan === '__pending__');
  const resubmitted = !!(rec && eff === 'レビュー待ち'); // 判定後に更新＝再提出
  reviewDocs[key] = {
    kind: 'deliverable',
    id: v['タスクID'], title, dept: v['部署'], type: v['種別'] || '-', review: v['レビュー'] || '-',
    submitted: v['提出日'] || '-', path: view.path, eff, code: v._code, actable,
    summary: view.summary, original: view.original, commentNote: view.commentNote, pending: view.pending, stale: view.stale, generable: view.generable,
    presidentNote: pNote, responsePlan: plan, planPending, verdict: rec ? rec.verdict : '', verdictDate: rec ? rec.date : '', resubmitted,
  };
  const dataPath = ` data-path="${esc(view.path)}"`;
  let acts;
  if (eff === '承認済') acts = '<span class="rbadge ok">✓ 承認済</span>';
  else if (eff === '取下') acts = '<span class="rbadge cancel">取下</span>';
  else acts = `<button class="ract ok" data-dest="${esc(v['部署'])}" data-target="${esc(v['タスクID'])}" data-verdict="承認" data-title="${esc(title)}"${dataPath}>承認</button>` +
    `<button class="ract ng" data-dest="${esc(v['部署'])}" data-target="${esc(v['タスクID'])}" data-verdict="差戻し" data-title="${esc(title)}"${dataPath}>差戻し</button>`;
  const pcom = pNote ? `<div class="rpcom" title="${esc(pNote)}">💬 社長: ${esc(pNote.slice(0, 64))}${pNote.length > 64 ? '…' : ''}${resubmitted ? '　<em class="reflag">↻ 修正・再提出</em>' : ''}</div>` : '';
  let flag;
  if (view.summary && !view.stale) flag = '<span class="rflag ok">レビュイー要約</span>';
  else if (view.summary && view.stale) flag = '<span class="rflag stale">要約・要再生成</span>';
  else if (view.pending) flag = '<span class="rflag gen">要約 自動生成中…</span>';
  else flag = '<span class="rflag none">要約対象外</span>';
  const cardBody = view.conclusion
    ? `<div class="rconc">${esc(view.conclusion)}</div>`
    : `<div class="rteaser">${esc(view.generable ? (teaserOf(view.original || '') || '（要約 自動生成待ち）') : (view.commentNote || view.note))}</div>`;
  const pendingFlag = view.pending ? '1' : '0';
  return `<div class="rcard" data-rkey="${key}" data-pending="${pendingFlag}" data-dept="${esc(v['部署'])}" data-state="${esc(eff)}" title="クリックで全画面表示（原文＋レビュイーコメント）">
    <div class="rhead"><a class="jump id" data-row="${esc(v['タスクID'])}">${esc(v['タスクID'])}</a><span class="rtitle" title="${esc(title)}">${esc(title || '（タスク表に該当ID なし）')}</span>${chip(eff)}</div>
    <div class="rmeta">${esc(v['部署'])} ｜ 種別 ${esc(v['種別'] || '-')} ｜ 提出 ${esc(v['提出日'] || '-')}　${flag}</div>
    ${cardBody}
    ${pcom}
    <div class="rfoot"><span class="id rpath" title="${esc(v['成果物（パス）'])}">${esc(v['成果物（パス）'])}</span><span class="racts">${acts}</span></div>
  </div>`;
}).join('');
// ===== 判断(ジャッジ)カード＝レビューと同一機構（dec-012 §3） =====
const judgeWaiting = allJudgments.filter((j) => effJudge(j['ID']) === '判断待ち');
const jtabsHTML = `<button class="rtab active" data-dept="">全部署<em>${judgeWaiting.length}</em></button>` +
  depts.map((d) => {
    const n = allJudgments.filter((j) => j['部署'] === d.name && effJudge(j['ID']) === '判断待ち').length;
    const has = allJudgments.some((j) => j['部署'] === d.name);
    return `<button class="rtab${has ? '' : ' dim'}" data-dept="${esc(d.name)}">${esc(d.name)}<em>${n}</em></button>`;
  }).join('');
const jstatesHTML = ['判断待ち', '承認済', '差戻し', 'すべて'].map((s) =>
  `<button class="rstate${s === '判断待ち' ? ' active' : ''}" data-state="${esc(s)}">${esc(s)}</button>`).join('');
const jcardsHTML = allJudgments.map((j, i) => {
  const key = 'j' + i;
  const view = judgeView(j);
  const eff = effJudge(j['ID']);
  const actable = eff === '判断待ち' || eff === '差戻し';
  const rec = verdicts[j['ID']];
  const pNote = rec ? String(rec.presidentNote || '') : '';
  const plan = rec ? (rec.responsePlan === '__pending__' ? '' : String(rec.responsePlan || '')) : '';
  const planPending = !!(rec && rec.responsePlan === '__pending__');
  reviewDocs[key] = {
    kind: 'judge', id: j['ID'], title: j['内容'], dept: j['部署'], type: '判断', review: '社長', submitted: j['期限'] || '-',
    path: view.refPath, eff, code: '', actable, summary: view.summary, original: view.original, commentNote: '',
    pending: view.pending, stale: false, generable: true, presidentNote: pNote, responsePlan: plan, planPending,
    verdict: rec ? rec.verdict : '', verdictDate: rec ? rec.date : '', resubmitted: false,
  };
  let acts;
  if (eff === '承認済') acts = '<span class="rbadge ok">✓ 採用</span>';
  else acts = `<button class="ract ok" data-dest="${esc(j['部署'])}" data-target="${esc(j['ID'])}" data-verdict="承認" data-title="${esc(j['内容'])}">承認</button>` +
    `<button class="ract ng" data-dest="${esc(j['部署'])}" data-target="${esc(j['ID'])}" data-verdict="差戻し" data-title="${esc(j['内容'])}">差戻し</button>`;
  const pcom = pNote ? `<div class="rpcom" title="${esc(pNote)}">💬 社長: ${esc(pNote.slice(0, 64))}${pNote.length > 64 ? '…' : ''}</div>` : '';
  let flag;
  if (view.summary) flag = '<span class="rflag ok">論点整理</span>';
  else if (view.pending) flag = '<span class="rflag gen">論点整理 生成中…</span>';
  else flag = '<span class="rflag none">—</span>';
  const cardBody = view.conclusion ? `<div class="rconc">${esc(view.conclusion)}</div>` : `<div class="rteaser">${esc(teaserOf(j['内容']))}</div>`;
  return `<div class="rcard" data-rkey="${key}" data-pending="${view.pending ? '1' : '0'}" data-dept="${esc(j['部署'])}" data-state="${esc(eff)}" title="クリックで全画面表示（論点整理＋参照資料）">
    <div class="rhead"><a class="jump id" data-row="${esc(j['ID'])}">${esc(j['ID'])}</a><span class="rtitle" title="${esc(j['内容'])}">${esc(j['内容'])}</span>${chip(eff)}</div>
    <div class="rmeta">${esc(j['部署'])} ｜ 判断 ｜ 期限 ${esc(j['期限'] || '-')}　${flag}</div>
    ${cardBody}
    ${pcom}
    <div class="rfoot"><span class="id rpath" title="${esc(view.refPath || '')}">${esc(view.refPath || '参照資料なし')}</span><span class="racts">${acts}</span></div>
  </div>`;
}).join('');
const judgeHTML = `
<div class="rbar"><span class="rlbl">部署</span>${jtabsHTML}</div>
<div class="rbar"><span class="rlbl">状態</span>${jstatesHTML}</div>
<h2>社長室判断（待ち ${judgeWaiting.length} ／ 全 ${allJudgments.length}）</h2>
<div class="rcards">${jcardsHTML}</div>
<p class="empty off">該当なし</p>
<p class="fine">カードをクリックすると論点整理（Ollamaが起票部署の代弁）と参照資料が全画面で開き、承認/差戻しできます。レビューと同一の仕組み（判定記録・社長コメント・対応方針・自動同期）です。</p>`;
// ===== 連携(リンク)カード＝社内便スレッド＋依頼＋詰まり（dec-012 §5） =====
const threadCards = openThreads.map((th, i) => {
  const key = 'l' + i;
  const other = th.parts.filter((p) => p !== '社長室');
  reviewDocs[key] = {
    kind: 'thread', id: th.tid, title: th.subject, dept: th.parts.join('・'), type: '社内便',
    eff: th.open ? '進行中' : '完了', need: th.needHQ,
    messages: th.msgs.map((m) => ({ from: m['差出人'] || '', to: m['宛先'] || '', label: m['種別'] || '', body: String(m['本文/パス'] || m['本文'] || ''), at: m['日時'] || '' })),
    replyTo: (th.last && th.last['差出人']) || other[0] || '',
  };
  const lastBody = th.last ? String(th.last['本文/パス'] || th.last['本文'] || '') : '';
  return `<div class="rcard" data-rkey="${key}" data-dept="${esc(th.parts.join('｜'))}" data-state="社内便" data-need="${th.needHQ ? '1' : '0'}" title="クリックで会話・返信">
    <div class="rhead"><a class="jump id" data-row="${esc(th.tid)}">${esc(th.tid)}</a><span class="rtitle" title="${esc(th.subject)}">${esc(th.subject)}</span>${chip(th.open ? '進行中' : '完了')}</div>
    <div class="rmeta">社内便 ｜ ${esc(th.parts.join(' ⇄ '))} ｜ ${th.msgs.length}通${th.needHQ ? '　<span class="reflag">↩ 要返信</span>' : ''}</div>
    <div class="rteaser">${esc(((th.last ? th.last['差出人'] + '：' : '') + lastBody).slice(0, 120))}</div>
    <div class="rfoot"><span class="id rpath">最新 ${esc(th.last ? th.last['日時'] || '' : '')}</span><span class="racts">${th.needHQ ? '<span class="reflag">要返信</span>' : ''}</span></div>
  </div>`;
}).join('');
const reqCards = openRequests.map((r, i) => {
  const key = 'q' + i;
  const need = r['宛先'] === '社長室';
  reviewDocs[key] = { kind: 'req', id: r['ID'], title: r['内容'], dept: r['依頼元'] + '→' + r['宛先'], type: '依頼', eff: r['元'] + '→' + r['先'], need, body: r['内容'], answer: r['回答・参照'], urgency: r['緊急度'], deadline: r['期限'], from: r['依頼元'], to: r['宛先'] };
  return `<div class="rcard" data-rkey="${key}" data-dept="${esc(r['依頼元'] + '｜' + r['宛先'])}" data-state="依頼" data-need="${need ? '1' : '0'}" title="クリックで往復全文">
    <div class="rhead"><a class="jump id" data-row="${esc(r['ID'])}">${esc(r['ID'])}</a><span class="rtitle" title="${esc(r['内容'])}">${esc(r['内容'])}</span>${chip(r['元'])}</div>
    <div class="rmeta">依頼 ｜ ${esc(r['依頼元'])} → ${esc(r['宛先'])} ｜ ${chip(r['緊急度'])}${need ? '　<span class="reflag">要対応</span>' : ''}</div>
    <div class="rteaser">${esc(String(r['内容']).slice(0, 120))}</div>
    <div class="rfoot"><span class="id rpath">${chip(r['元'])} → ${chip(r['先'])}</span><span class="racts"></span></div>
  </div>`;
}).join('');
const blkCards = activeBlockers.map((b, i) => {
  const key = 'b' + i;
  const need = String(b['ステータス']).includes('社長室');
  reviewDocs[key] = { kind: 'blk', id: b['ID'], title: b['内容'], dept: b['部署'], type: '詰まり', eff: b['ステータス'], need, impact: b['影響'], support: b['必要な支援'] };
  return `<div class="rcard" data-rkey="${key}" data-dept="${esc(b['部署'])}" data-state="詰まり" data-need="${need ? '1' : '0'}" title="クリックで詳細">
    <div class="rhead"><a class="jump id" data-row="${esc(b['ID'])}">${esc(b['ID'])}</a><span class="rtitle" title="${esc(b['内容'])}">${esc(b['内容'])}</span>${chip(b['ステータス'])}</div>
    <div class="rmeta">詰まり ｜ ${esc(b['部署'])}${need ? '　<span class="reflag">要対応</span>' : ''}</div>
    <div class="rteaser">影響：${esc(String(b['影響'] || '').slice(0, 100))}</div>
    <div class="rfoot"><span class="id rpath">必要な支援：${esc(String(b['必要な支援'] || '-').slice(0, 50))}</span><span class="racts"></span></div>
  </div>`;
}).join('');
const linksNeed = openRequests.filter((r) => r['宛先'] === '社長室').length + activeBlockers.filter((b) => String(b['ステータス']).includes('社長室')).length + threads.filter((t) => t.needHQ).length;
const ltabsHTML = `<button class="rtab active" data-dept="">全部署</button>` + depts.map((d) => `<button class="rtab" data-dept="${esc(d.name)}">${esc(d.name)}</button>`).join('');
const lstatesHTML = ['要対応', '依頼', '詰まり', '社内便', 'すべて'].map((s, i) => `<button class="rstate${i === 0 ? ' active' : ''}" data-state="${esc(s)}">${esc(s)}</button>`).join('');
const linksHTML = `
<div class="rbar"><span class="rlbl">部署</span>${ltabsHTML}</div>
<div class="rbar"><span class="rlbl">種別</span>${lstatesHTML}</div>
<h2>連携（要対応 ${linksNeed} ／ 依頼 ${openRequests.length}・詰まり ${activeBlockers.length}・社内便 ${openThreads.length}）</h2>
<div class="rcards">${threadCards}${reqCards}${blkCards}</div>
<p class="empty off">該当なし（「すべて」に切り替えると表示されます）</p>
<h2>掲示板</h2>
${depts.filter((d) => d.appeals.length).map((d) => d.appeals.map((a) => `<p data-dept="${esc(d.name)}">● <strong>${esc(d.name)}</strong>（${esc(d.updated || '-')}）── ${esc(a)}</p>`).join('')).join('') || '<p class="empty">投稿なし</p>'}`;
const reviewDocsJSON = JSON.stringify(reviewDocs).replace(/</g, '\\u003c');
const gateHTML = gateViolations.length
  ? `<div class="gatewarn">⚠ 関門違反 ${gateViolations.length} 件：社長レビュー未承認のまま完了化 → ${gateViolations.map((v) => `<span class="id">${esc(v['タスクID'])}</span>`).join('、')}（該当部署は完了を取り消し、承認後に再完了すること）</div>`
  : '';
const reviewHTML = `
${gateHTML}
<div class="rbar"><span class="rlbl">部署</span>${rtabsHTML}</div>
<div class="rbar"><span class="rlbl">状態</span>${rstatesHTML}</div>
<h2>成果物レビュー（待ち ${reviewWaiting.length} ／ 全 ${allDeliverables.length}）</h2>
<div class="rcards">${rcardsHTML}</div>
<p class="empty off" id="rempty">該当なし（部署・状態フィルタを切り替えると表示されます）</p>
<p class="fine">カードをクリックすると詳細が拡大表示され、Ollamaがレビュイー（実施部署の代弁）として書いたレビュー資料を読みながら承認/差戻しできます（正本 Secretary/rules/review-gate.md §7）。資料の一括生成：<span class="id">node Secretary/tools/review-summarize.js</span>（ローカルOllama・Claudeトークン不使用）。承認・差戻しの記録は操作モード（serve.js）のみ。</p>`;

// ===== パイプラインタブ（三社フロー｜_pipeline.json を読むだけ。生成は orders-scan.js） =====
// build は決定的・高速を維持：JSON を render するだけで外部呼び出し・追加依存なし。
// 「次の番（next）」の担い手で色分けし、⚑要人間承認をカードと帯で強調する。
const PIPE_WHO_COLOR = { '社長室': '#2b2b2b', 'WORKER': '#2C6E9E', 'AUDITOR': '#8A6A45', 'MAGI': '#7E5BA6', 'MAGI/Sota': '#7E5BA6', '-': '#9b958a' };
const whoChip = (w) => `<span class="pwho" style="background:${PIPE_WHO_COLOR[w] || '#5c7a5c'}">${esc(w || '-')}</span>`;
const humanFlag = (on) => on ? '<span class="phuman">⚑ 要人間承認</span>' : '';
const pipeCount = (arr) => Array.isArray(arr) ? arr.length : 0;

function pipeCard(it) {
  const human = !!it.needsHuman;
  const sub = it.kind === 'case'
    ? `${esc(it.state || '-')} ｜ 人格 ${pipeCount(it.personas)}/3${it.verdictResult ? ' ｜ ' + esc(it.verdictResult) : ''}`
    : `${esc(it.state || '-')} ｜ LV ${esc(it.level || '-')} ｜ GATE ${esc(it.gate || '-')} ｜ ${esc(it.vendor || '-')}`;
  const warn = pipeCount(it.warnings) ? `<div class="pwarn" title="${esc(it.warnings.join(' ／ '))}">⚠ ${esc(it.warnings.length)}件の注意</div>` : '';
  return `<div class="pcard${human ? ' phot' : ''}" data-kind="${esc(it.kind)}" data-human="${human ? '1' : '0'}" data-who="${esc(it.nextWho || '')}" title="${esc(it.dir || it.id)}">
    <div class="phead"><span class="id">${esc(it.id)}</span>${whoChip(it.nextWho)}${humanFlag(human)}</div>
    <div class="pmeta">${sub}</div>
    <div class="pnext"><span class="parrow">→ 次の番</span> ${esc(it.nextAction || '-')}</div>
    ${warn}
  </div>`;
}

function pipelineSection() {
  if (!pipeline) {
    return `<div class="pempty">
      <p class="pempty-h">パイプラインは未生成です。</p>
      <p>三社フロー（外注Order・中立審査Case）の「次の番」一覧は <span class="id">node Secretary/tools/orders-scan.js</span> を実行すると生成されます（出力＝<span class="id">Secretary/dashboard/_pipeline.json</span>）。生成後にこのダッシュボードを再生成すると、ここに表示されます。</p>
      <p class="fine">build.js はこのファイルを読むだけで生成しません（決定的・高速の方針）。設計の正本＝Contracts/automation-design-draft.md。</p>
    </div>`;
  }
  const orders = Array.isArray(pipeline.orders) ? pipeline.orders : [];
  const cases = Array.isArray(pipeline.cases) ? pipeline.cases : [];
  const human = Array.isArray(pipeline.needsHuman) ? pipeline.needsHuman : [];
  const conflicts = (pipeline.locks && Array.isArray(pipeline.locks.conflicts)) ? pipeline.locks.conflicts : [];
  const activeLocks = (pipeline.locks && pipeline.locks.activeCount) || 0;
  const gen = pipeline.generatedAt ? String(pipeline.generatedAt).slice(0, 16).replace('T', ' ') + ' UTC' : '不明';

  const humanBanner = human.length
    ? `<div class="pbanner">⚑ 要・人間承認 ${human.length}件：${human.map((x) => `<span class="id">${esc(x)}</span>`).join('、')}（GATE:human／LEVEL:重大／ESCALATE_TO_HUMAN）── Sota判断ゲート前。</div>`
    : '';
  const conflictBanner = conflicts.length
    ? `<div class="pconflict">⚠ ロック競合・解除漏れ ${conflicts.length}件：${conflicts.map((c) => esc((c.type || '') + '：' + (c.detail || ''))).join(' ／ ')}</div>`
    : '';

  const ordersHTML = orders.length ? `<div class="pcards">${orders.map(pipeCard).join('')}</div>` : '<p class="empty">外注Order なし</p>';
  const casesHTML = cases.length ? `<div class="pcards">${cases.map(pipeCard).join('')}</div>` : '<p class="empty">審査Case なし</p>';

  return `${humanBanner}${conflictBanner}
<div class="pbar">
  <button class="pf active" data-pf="all">すべて</button>
  <button class="pf" data-pf="human">⚑ 要人間承認</button>
</div>
<h2>外注Order（External／パイプライン ${orders.length}）</h2>
${ordersHTML}
<h2>審査Case（ThirdParty／合議 ${cases.length}）</h2>
${casesHTML}
<p class="empty off" id="pempty-filter">該当なし（「すべて」に戻すと表示されます）</p>
<p class="fine">生成 ${esc(gen)} ｜ 活性ロック ${esc(activeLocks)}件 ｜ 再走査：<span class="id">node Secretary/tools/orders-scan.js</span>（メタのみ・外部依存なし）。色＝次の番の担い手（社長室／WORKER／AUDITOR／MAGI）。build はこのファイルを読むだけ。</p>`;
}
const pipelineHTML = pipelineSection();
// ナビ用カウント（_pipeline.json 未生成時は 0。バッジは要人間承認件数を出す）
const pipeHumanCount = pipeline && Array.isArray(pipeline.needsHuman) ? pipeline.needsHuman.length : 0;
const pipeTotalCount = pipeline ? (pipeCount(pipeline.orders) + pipeCount(pipeline.cases)) : 0;

const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KIBI 全社ダッシュボード</title>
<style>
  :root { --ink:#2b2b2b; --paper:#faf8f4; --line:rgba(43,43,43,.10); --sub:#8a8378;
          --shu:#D9442C; --gold:#C9A227; --serif:"Shippori Mincho","Hiragino Mincho ProN",serif; }
  * { box-sizing:border-box; margin:0; padding:0; }
  html, body { height:100%; }
  body { font-family:"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic",sans-serif; background:var(--paper); color:var(--ink);
         display:flex; flex-direction:column; overflow:hidden; line-height:1.6; }
  body::before { content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
    background: radial-gradient(640px 420px at 10% -8%, rgba(217,68,44,.05), transparent 70%),
                radial-gradient(560px 380px at 92% 4%, rgba(109,40,217,.04), transparent 70%),
                radial-gradient(700px 480px at 50% 112%, rgba(26,127,90,.05), transparent 70%); }
  header, nav, main { position:relative; z-index:1; }
  header { padding:14px 24px 0; }
  .head-row { display:flex; align-items:baseline; gap:16px; flex-wrap:wrap; }
  h1 { font-family:var(--serif); font-size:1.1rem; font-weight:500; letter-spacing:.2em; }
  .stamp { color:var(--sub); font-size:.68rem; }
  .stats { display:flex; gap:8px; margin-left:auto; flex-wrap:wrap; }
  .stat { font-size:.72rem; border:1px solid var(--line); background:#fff; padding:2px 12px; border-radius:999px; box-shadow:0 1px 2px rgba(43,43,43,.04); }
  .stat b { font-size:.85rem; }
  nav { display:flex; gap:4px; padding:10px 24px 10px; border-bottom:1px solid var(--line); }
  .tabbtn { font-family:var(--serif); font-size:.84rem; letter-spacing:.1em; background:none; border:1px solid transparent;
            border-radius:999px; padding:4px 16px; cursor:pointer; color:var(--sub); transition:.2s; }
  .tabbtn:hover { border-color:var(--line); background:#fff; }
  .tabbtn em { font-style:normal; font-size:.66rem; margin-left:5px; opacity:.75; }
  .tabbtn.active { color:var(--paper); background:var(--ink); }
  main { flex:1; min-height:0; }
  /* パディングは左右と下のみ。上は first-child の margin で確保（固定ヘッダーの吸い込みを正しく効かせる） */
  .panel { display:none; height:100%; overflow-y:auto; overflow-x:hidden; padding:0 24px 24px; }
  .panel.active { display:block; }
  .panel > *:first-child { margin-top:16px; }
  h2 { font-family:var(--serif); font-size:.95rem; font-weight:500; letter-spacing:.12em; margin:22px 0 10px; padding-bottom:6px; border-bottom:1px solid var(--line); }
  .fbar + h2 { margin-top:10px; }
  /* 表（改行禁止・角丸・固定ヘッダー＝行はヘッダー背面に吸い込まれて消える） */
  table { width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; background:#fff; font-size:.78rem;
          border-radius:12px; box-shadow:0 0 0 1px var(--line), 0 8px 24px rgba(43,43,43,.04); margin-bottom:6px; }
  th, td { padding:6px 10px; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-bottom:1px solid rgba(43,43,43,.07); }
  th { background:#f1ece1; font-weight:600; font-size:.73rem; position:sticky; top:0; z-index:3; border-bottom:1.5px solid rgba(43,43,43,.16); }
  thead th:first-child { border-top-left-radius:12px; } thead th:last-child { border-top-right-radius:12px; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:last-child td:first-child { border-bottom-left-radius:12px; } tbody tr:last-child td:last-child { border-bottom-right-radius:12px; }
  tbody tr:hover td { background:#f6f1e7; }
  .id { font-family:ui-monospace,"SF Mono",Menlo,monospace; font-size:.72rem; }
  .chip { color:#fff; font-size:.67rem; padding:1px 9px; border-radius:999px; white-space:nowrap; }
  .empty { color:var(--sub); font-size:.8rem; }
  .over { color:#a14b3c; font-weight:bold; }
  .legend, .fine { font-size:.7rem; color:var(--sub); margin-top:10px; }
  .prog { display:flex; align-items:center; gap:5px; }
  .prog .bar { flex:1; height:6px; background:#ece5d6; border-radius:3px; overflow:hidden; }
  .prog .bar i { display:block; height:100%; background:#1A7F5A; border-radius:3px; }
  .prog em { font-style:normal; font-size:.65rem; color:var(--sub); width:30px; text-align:right; }
  a.jump { color:#4a6b8a; text-decoration:none; border-bottom:1px dotted #4a6b8a; cursor:pointer; }
  .blink td { animation: blinkrow .6s 5; }
  @keyframes blinkrow { 50% { background:#efdfae; } }
  .fbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .fbar select, .fbar input { font-family:inherit; font-size:.76rem; padding:5px 10px; border:1px solid var(--line); background:#fff; border-radius:8px; }
  .fbar input { flex:1; min-width:140px; max-width:280px; }
  .fbar .freset { font-family:inherit; font-size:.74rem; padding:5px 14px; border:1px solid var(--sub); background:#fff; border-radius:999px; cursor:pointer; }
  .fbar .freset:hover { background:var(--ink); color:#fff; border-color:var(--ink); }
  .card { background:#fff; border-radius:14px; box-shadow:0 0 0 1px var(--line), 0 10px 28px rgba(43,43,43,.05); }
  /* ===== 概況: 左→右フロー（四角・帯・JS連結線） ===== */
  .policy { display:flex; align-items:center; gap:10px; font-size:.8rem; color:var(--paper); background:var(--ink);
            border-radius:12px; padding:9px 16px; font-family:var(--serif); box-shadow:0 10px 28px rgba(43,43,43,.18); border-bottom:1px solid var(--gold); }
  .policy .ptext { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .policy.muted { color:#cfc8bb; font-family:inherit; }
  .pdot { width:8px; height:8px; border-radius:50%; background:var(--shu); flex-shrink:0; }
  .org { position:relative; display:flex; gap:clamp(28px,5vw,76px); align-items:stretch; margin-top:14px;
         min-height:clamp(430px, calc(100vh - 250px), 760px); }
  .orgsvg { position:absolute; inset:0; width:100%; height:100%; z-index:0; pointer-events:none; overflow:visible; }
  .orgsvg .branch { fill:none; stroke-width:2.5; stroke-linecap:round; opacity:.85; }
  .orgsvg .pulseline { fill:none; stroke:var(--shu); stroke-width:2.5; stroke-linecap:round; stroke-dasharray:7 230; animation: flow 3.4s linear infinite; opacity:.9; }
  @keyframes flow { to { stroke-dashoffset:-237; } }
  .ceocol { position:relative; z-index:1; flex:0 0 clamp(150px,16vw,230px); display:flex; align-items:center; }
  .bands { position:relative; z-index:1; flex:1; min-width:0; display:flex; flex-direction:column; gap:clamp(14px,2.2vh,26px); }
  .band { position:relative; flex:1; border-radius:18px; padding:clamp(26px,3vh,34px) clamp(12px,1.5vw,20px) clamp(12px,1.8vh,18px); display:flex; flex-direction:column; }
  .band.g1 { background:rgba(217,68,44,.045); border:1.5px dashed rgba(217,68,44,.26); }
  .band.g2 { background:rgba(61,90,153,.05); border:1.5px dashed rgba(61,90,153,.28); }
  .blabel { position:absolute; top:9px; left:16px; font-family:var(--serif); font-size:clamp(.66rem,.85vw,.8rem); letter-spacing:.2em; opacity:.85; }
  .bcards { flex:1; display:flex; gap:clamp(8px,1vw,15px); align-items:stretch; }
  .ocard { flex:1 1 0; min-width:0; background:#fff; border-radius:12px; border-top:3px solid var(--c);
           box-shadow:0 0 0 1px var(--line), 0 8px 20px rgba(43,43,43,.07); padding:10px 12px; display:flex; flex-direction:column; gap:5px;
           overflow:hidden; transition:transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s; }
  .ocard:hover { transform:translateY(-3px); box-shadow:0 0 0 1px var(--line), 0 16px 30px rgba(43,43,43,.13); z-index:2; }
  .ohead { display:flex; align-items:center; gap:7px; }
  .ocode { flex-shrink:0; color:#fff; font-family:ui-monospace,"SF Mono",Menlo,monospace; font-size:clamp(.6rem,.78vw,.72rem); font-weight:700;
           letter-spacing:.04em; padding:2px 6px; border-radius:5px; }
  .oname { font-weight:700; font-size:clamp(.72rem,.95vw,.86rem); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
  .dtag { font-style:normal; font-size:.56rem; letter-spacing:.08em; background:var(--shu); color:#fff; border-radius:999px; padding:1px 6px; margin-left:6px; vertical-align:1px; }
  .odot { flex-shrink:0; width:11px; height:11px; border-radius:50%; }
  .otheme { font-size:clamp(.65rem,.8vw,.76rem); color:var(--sub); line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .otasks { display:flex; flex-direction:column; gap:2px; min-height:0; }
  .otask { display:flex; align-items:center; gap:5px; font-size:clamp(.64rem,.78vw,.74rem); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .otask i { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .onone, .omore { font-size:.64rem; color:var(--sub); }
  .ometa { margin-top:auto; font-size:clamp(.62rem,.74vw,.72rem); color:var(--sub); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .nbadge { display:inline-block; margin-left:6px; font-size:.58rem; color:#fff; border-radius:999px; padding:0 7px; }
  .ocard.ceo { background:var(--ink); color:var(--paper); border-top:3px solid var(--gold); box-shadow:0 0 0 1px rgba(43,43,43,.2), 0 16px 36px rgba(43,43,43,.28); }
  .ocard.ceo .oname { font-family:var(--serif); letter-spacing:.12em; font-size:clamp(.86rem,1.1vw,1rem); }
  .ocard.ceo .otheme { color:#bdb6a8; }
  .ocard.ceo .ometa { color:#bdb6a8; }
  .ocard.alert { box-shadow:0 0 0 1.5px ${TONE['詰まり']}, 0 8px 20px rgba(194,65,12,.18); }
  .ocard.alert .odot { animation: pulse 1.6s ease-out infinite; }
  @keyframes pulse { 0% { box-shadow:0 0 0 0 rgba(194,65,12,.5); } 100% { box-shadow:0 0 0 8px rgba(194,65,12,0); } }
  .lgdot { display:inline-block; width:9px; height:9px; border-radius:50%; margin:0 4px 0 10px; vertical-align:-1px; }
  /* ===== 判断タブ ===== */
  td.acts { white-space:nowrap; overflow:visible; text-overflow:clip; }
  .act { font-family:inherit; font-size:.72rem; padding:2px 11px; margin-right:4px; cursor:pointer; background:#fff; border-radius:999px; border:1px solid var(--sub); transition:.15s; }
  .act.ok { border-color:#1A7F5A; color:#1A7F5A; } .act.ok:hover { background:#1A7F5A; color:#fff; }
  .act.ng { border-color:#C2410C; color:#C2410C; } .act.ng:hover { background:#C2410C; color:#fff; }
  #fbform { display:flex; gap:8px; flex-wrap:wrap; align-items:center; background:#fff; border-radius:12px; box-shadow:0 0 0 1px var(--line); padding:10px 14px; font-size:.8rem; }
  #fbform select, #fbform input { font-family:inherit; font-size:.8rem; padding:5px 10px; border:1px solid var(--line); background:var(--paper); border-radius:8px; }
  #fbform button { font-family:inherit; cursor:pointer; background:var(--ink); color:#fff; border:none; padding:6px 20px; font-size:.8rem; border-radius:999px; }
  #fbform input[name=note] { flex:1; min-width:200px; }
  #servenote { font-size:.75rem; color:var(--sub); background:#fff; border:1px dashed var(--line); border-radius:10px; padding:8px 14px; }
  .off { display:none !important; }
  /* ===== モデルタブ ===== */
  .mwrap { display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; }
  .bullets { flex:1.5; min-width:540px; padding:18px 22px 10px; }
  .brow { display:grid; grid-template-columns:120px 1fr 170px; align-items:center; gap:14px; height:58px; }
  .blabel2 { font-weight:600; font-size:.84rem; line-height:1.3; }
  .blabel2 small { display:block; font-weight:400; font-size:.64rem; color:var(--sub); }
  .btrack { position:relative; height:26px; background:#efeae1; border-radius:4px; }
  .btrack .band { position:absolute; top:0; bottom:0; background:#ddd5c5; border-radius:2px; }
  .btrack .tick { position:absolute; top:-3px; bottom:-3px; width:2px; background:#c9bfa9; }
  .btrack .bbar { position:absolute; left:0; top:7px; height:12px; background:#2b2722; border-radius:0 3px 3px 0; }
  .bval { font-size:.8rem; font-variant-numeric:tabular-nums; }
  .bval .warn { color:#a14b3c; font-size:.7rem; margin-left:6px; }
  .bval .low { color:var(--sub); font-size:.7rem; margin-left:6px; }
  .baxis { display:flex; justify-content:space-between; margin:6px 134px 8px 0; padding-left:134px; font-size:.62rem; color:var(--sub); }
  .dots { flex:1; min-width:380px; padding:16px 20px; }
  .dlegend { display:flex; gap:14px; font-size:.68rem; color:var(--sub); margin-bottom:10px; flex-wrap:wrap; }
  .dlegend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; vertical-align:-1px; }
  .mdrow { display:grid; grid-template-columns:9.5em 1fr; align-items:center; height:32px; border-bottom:1px solid rgba(43,43,43,.06); font-size:.76rem; }
  .mdrow:last-child { border-bottom:none; }
  .mddots .dot { display:inline-block; width:15px; height:15px; border-radius:50%; margin-right:6px; vertical-align:middle; }
  .mddots .none { color:#b5ae9f; font-style:normal; }
  /* ===== レビュータブ ===== */
  .rbar { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:12px; }
  .rbar + .rbar { margin-top:7px; }
  .rlbl { font-size:.7rem; color:var(--sub); width:2.8em; flex-shrink:0; }
  .rtab, .rstate { font-family:inherit; font-size:.73rem; padding:3px 12px; border:1px solid var(--line); background:#fff; border-radius:999px; cursor:pointer; color:var(--ink); transition:.15s; }
  .rtab:hover, .rstate:hover { border-color:var(--sub); }
  .rtab em, .rstate em { font-style:normal; font-size:.6rem; margin-left:4px; opacity:.7; }
  .rtab.active, .rstate.active { background:var(--ink); color:#fff; border-color:var(--ink); }
  .rtab.dim { opacity:.4; }
  .rcards { display:grid; grid-template-columns:repeat(auto-fill, minmax(430px, 1fr)); gap:14px; margin-top:4px; }
  .rcard { background:#fff; border-radius:14px; box-shadow:0 0 0 1px var(--line), 0 8px 24px rgba(43,43,43,.05); padding:13px 16px; display:flex; flex-direction:column; gap:7px; }
  .rhead { display:flex; align-items:center; gap:8px; }
  .rtitle { font-weight:700; font-size:.83rem; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .rmeta { font-size:.69rem; color:var(--sub); }
  .rsum { font-family:inherit; font-size:.75rem; line-height:1.75; background:var(--paper); border:1px solid var(--line); border-radius:10px; padding:9px 12px; white-space:pre-wrap; word-break:break-word; max-height:190px; overflow-y:auto; margin:0; }
  .rnote { font-size:.64rem; color:#a8842c; }
  .rfoot { display:flex; align-items:center; gap:10px; justify-content:space-between; flex-wrap:wrap; }
  .rpath { font-size:.67rem; color:var(--sub); overflow:hidden; text-overflow:ellipsis; max-width:62%; white-space:nowrap; }
  .racts { white-space:nowrap; }
  .gatewarn { font-size:.78rem; color:#fff; background:#a14b3c; border-radius:10px; padding:8px 14px; margin-top:14px; }
  .gatewarn .id { color:#fff; }
  .gtag { display:inline-block; font-size:.56rem; color:#fff; background:#a14b3c; border-radius:4px; padding:0 5px; margin-right:6px; vertical-align:1px; letter-spacing:.04em; }
  .ract { font-family:inherit; font-size:.72rem; padding:2px 13px; margin-left:5px; cursor:pointer; background:#fff; border-radius:999px; border:1px solid var(--sub); transition:.15s; }
  .ract.ok { border-color:#1A7F5A; color:#1A7F5A; } .ract.ok:hover { background:#1A7F5A; color:#fff; }
  .ract.ng { border-color:#C2410C; color:#C2410C; } .ract.ng:hover { background:#C2410C; color:#fff; }
  .ract:disabled { opacity:.5; cursor:wait; }
  .rok { color:#1A7F5A; font-size:.76rem; font-weight:600; }
  .rcard { cursor:pointer; transition:transform .12s, box-shadow .12s; }
  .rcard:hover { transform:translateY(-2px); box-shadow:0 0 0 1px var(--line), 0 14px 30px rgba(43,43,43,.12); }
  .rconc { font-size:.82rem; line-height:1.75; color:#39342d; max-height:6.4em; overflow:hidden; }
  .rteaser { font-size:.78rem; line-height:1.7; color:#736c60; max-height:5.1em; overflow:hidden; }
  .rflag { font-size:.6rem; padding:1px 7px; border-radius:999px; white-space:nowrap; }
  .rflag.ok { background:#e6efe6; color:#3c5c3c; } .rflag.stale { background:#f3e6d6; color:#a8842c; }
  .rflag.gen { background:#e3ecf3; color:#4a6b8a; } .rflag.none { background:#efeae1; color:#8a8378; }
  .rcard { min-height:176px; position:relative; }
  .rfoot { margin-top:auto; }
  .rbadge { font-size:.7rem; font-weight:600; padding:3px 13px; border-radius:999px; white-space:nowrap; }
  .rbadge.ok { background:#1A7F5A; color:#fff; }
  .rbadge.cancel { background:#2b2b2b; color:#fff; }
  .rpcom { font-size:.7rem; color:#6a6358; background:#f3efe6; border-left:3px solid var(--gold); border-radius:0 8px 8px 0; padding:5px 10px; line-height:1.6; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .reflag { font-style:normal; color:#a14b3c; font-size:.64rem; }
  /* モーダル 判定バナー（社長コメント原文＋対応方針） */
  .rm-verdict { flex-shrink:0; padding:12px 24px; background:#f6f1e7; border-bottom:1px solid var(--line); max-height:34vh; overflow-y:auto; }
  .rm-verdict.off { display:none; }
  .rm-vhead { font-family:var(--serif); font-size:.86rem; letter-spacing:.06em; }
  .rm-vhead small { font-family:inherit; font-weight:400; color:var(--sub); font-size:.72rem; letter-spacing:0; }
  .rm-vlabel { font-size:.66rem; color:var(--sub); margin:9px 0 2px; }
  .rm-pnote { font-size:.84rem; line-height:1.7; background:#fff; border:1px solid var(--line); border-radius:8px; padding:8px 12px; white-space:pre-wrap; }
  .rm-plan { font-size:.82rem; line-height:1.7; }
  .rm-plan.md p, .rm-plan.md li { font-size:.82rem; }
  /* 連携：単一カラム・会話バブル・返信 */
  .rm-cols.solo .rm-right { display:none; }
  .rm-cols.solo .rm-left { flex:1 1 100%; border-right:none; }
  .msg { margin:10px 0; }
  .msg .msgh { font-size:.68rem; color:var(--sub); margin-bottom:3px; }
  .msg .msgb { font-size:.84rem; line-height:1.7; background:#fff; border:1px solid var(--line); border-radius:10px; padding:8px 12px; }
  .msg.mine .msgb { background:#eef3ee; border-color:#cfe0cf; }
  .rm-reply { flex:1; min-width:160px; font-family:inherit; font-size:.8rem; padding:6px 10px; border:1px solid var(--line); border-radius:8px; }
  /* ===== レビュー詳細モーダル（全画面・2ペイン） ===== */
  .rmodal { position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; }
  .rmodal.off { display:none; }
  .rmodal-back { position:absolute; inset:0; background:rgba(43,43,43,.5); backdrop-filter:blur(3px); }
  .rmodal-panel { position:relative; z-index:1; width:96vw; height:94vh; display:flex; flex-direction:column;
    background:var(--paper); border-radius:16px; box-shadow:0 24px 70px rgba(43,43,43,.45); overflow:hidden; }
  .rmodal-head { padding:16px 24px 12px; border-bottom:1px solid var(--line); flex-shrink:0; }
  .rmodal-x { position:absolute; top:12px; right:18px; z-index:2; border:none; background:none; font-size:1.5rem; line-height:1; cursor:pointer; color:var(--sub); }
  .rmodal-x:hover { color:var(--ink); }
  .rm-title { font-family:var(--serif); font-size:1.1rem; font-weight:500; letter-spacing:.04em; padding-right:28px; }
  .rm-meta { font-size:.74rem; color:var(--sub); margin-top:5px; }
  .rm-meta .id { font-size:.72rem; }
  .rm-cols { flex:1; min-height:0; display:flex; gap:0; }
  .rm-col { flex:1 1 50%; min-width:0; display:flex; flex-direction:column; }
  .rm-left { border-right:1px solid var(--line); background:#fffdf9; }
  .rm-coltitle { flex-shrink:0; font-family:var(--serif); font-size:.82rem; letter-spacing:.08em; color:var(--ink);
    padding:10px 22px; border-bottom:1px solid var(--line); background:#f1ece1; }
  .rm-coltitle small { font-family:inherit; font-weight:400; font-size:.66rem; color:var(--sub); margin-left:8px; letter-spacing:0; }
  .rm-comment, .rm-original { flex:1; overflow-y:auto; padding:16px 24px; }
  .rm-original { background:#fff; }
  @media (max-width:900px) { .rm-cols { flex-direction:column; } .rm-left { border-right:none; border-bottom:1px solid var(--line); } }
  .rm-foot { padding:12px 24px; border-top:1px solid var(--line); display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:#fff; flex-shrink:0; }
  .rm-foot .rpath { font-size:.7rem; color:var(--sub); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .rm-gen { font-family:inherit; font-size:.76rem; padding:5px 16px; border-radius:999px; border:1px solid var(--ink); background:var(--ink); color:#fff; cursor:pointer; }
  .rm-gen:disabled { opacity:.5; cursor:wait; }
  .rm-stale { font-size:.72rem; color:#fff; background:#a8842c; border-radius:8px; padding:6px 12px; margin-bottom:12px; }
  .rm-loading { font-size:.82rem; color:var(--sub); padding:24px 4px; }
  /* モーダル内 markdown レンダリング */
  .md h4 { font-family:var(--serif); font-size:.92rem; font-weight:600; letter-spacing:.06em; margin:16px 0 6px; padding-bottom:4px; border-bottom:1px solid var(--line); color:var(--ink); }
  .md h4:first-child { margin-top:0; }
  .md h5 { font-size:.82rem; font-weight:600; margin:12px 0 4px; }
  .md p { font-size:.84rem; line-height:1.85; margin:6px 0; }
  .md ul, .md ol { margin:6px 0 6px 1.3em; } .md li { font-size:.84rem; line-height:1.8; }
  .md strong { font-weight:600; color:#2b2b2b; }
  .md code { font-family:ui-monospace,Menlo,monospace; font-size:.78rem; background:#efeae1; padding:1px 5px; border-radius:4px; }
  .md table { width:100%; font-size:.78rem; margin:8px 0; border-collapse:collapse; background:#fff; box-shadow:none; }
  .md th, .md td { border:1px solid var(--line); padding:4px 8px; white-space:normal; }
  .md pre.raw { font-family:ui-monospace,Menlo,monospace; font-size:.74rem; line-height:1.6; white-space:pre-wrap; word-break:break-word; background:#fff; border:1px solid var(--line); border-radius:10px; padding:12px; }
  /* ===== パイプラインタブ（三社フロー） ===== */
  .pbanner { font-size:.78rem; color:#fff; background:#6D28D9; border-radius:10px; padding:8px 14px; margin-top:14px; }
  .pbanner .id { color:#fff; }
  .pconflict { font-size:.78rem; color:#fff; background:#C2410C; border-radius:10px; padding:8px 14px; margin-top:8px; }
  .pbar { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:12px; }
  .pf { font-family:inherit; font-size:.73rem; padding:3px 14px; border:1px solid var(--line); background:#fff; border-radius:999px; cursor:pointer; color:var(--ink); transition:.15s; }
  .pf:hover { border-color:var(--sub); }
  .pf.active { background:var(--ink); color:#fff; border-color:var(--ink); }
  .pcards { display:grid; grid-template-columns:repeat(auto-fill, minmax(330px, 1fr)); gap:12px; margin-top:6px; }
  .pcard { background:#fff; border-radius:12px; box-shadow:0 0 0 1px var(--line), 0 8px 24px rgba(43,43,43,.05); padding:11px 14px; display:flex; flex-direction:column; gap:6px; }
  .pcard.phot { box-shadow:0 0 0 1.5px #6D28D9, 0 8px 24px rgba(109,40,217,.14); }
  .phead { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .phead .id { font-weight:600; }
  .pwho { color:#fff; font-size:.64rem; padding:1px 9px; border-radius:999px; white-space:nowrap; letter-spacing:.04em; }
  .phuman { font-size:.62rem; color:#fff; background:#6D28D9; padding:1px 8px; border-radius:999px; white-space:nowrap; margin-left:auto; }
  .pmeta { font-size:.69rem; color:var(--sub); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .pnext { font-size:.8rem; line-height:1.5; color:#39342d; }
  .parrow { font-size:.66rem; color:var(--shu); font-weight:600; margin-right:4px; }
  .pwarn { font-size:.66rem; color:#a8842c; }
  .pempty { background:#fff; border:1px dashed var(--line); border-radius:12px; padding:18px 22px; margin-top:16px; font-size:.82rem; line-height:1.8; color:#4a463f; }
  .pempty .pempty-h { font-family:var(--serif); font-size:.95rem; letter-spacing:.06em; margin-bottom:6px; }
  @media (prefers-reduced-motion: reduce) { .orgsvg .pulseline, .ocard.alert .odot { animation:none !important; } }
</style></head><body>

<header>
  <div class="head-row">
    <h1>KIBI ── 全社ダッシュボード</h1>
    <span class="stamp">生成 ${STAMP} ｜ 再生成: node Secretary/tools/build.js</span>
    <div class="stats">
      <span class="stat">現役タスク <b>${activeTasks.length}</b></span>
      <span class="stat" style="${allJudgments.length ? 'border-color:#6D28D9' : ''}">判断待ち <b>${allJudgments.length}</b></span>
      <span class="stat" style="${activeBlockers.length ? 'border-color:#C2410C' : ''}">詰まり <b>${activeBlockers.length}</b></span>
      <span class="stat">依頼 <b>${openRequests.length}</b></span>
      <span class="stat" style="${dueSoon.length ? 'border-color:#B45309' : ''}">期限7日 <b>${dueSoon.length}</b></span>
    </div>
  </div>
</header>

<nav>
  <button class="tabbtn" data-tab="home">組織図</button>
  <button class="tabbtn" data-tab="tasks">タスク<em>${activeTasks.length}</em></button>
  <button class="tabbtn" data-tab="judge">ジャッジ<em>${allJudgments.length}</em></button>
  <button class="tabbtn" data-tab="review">レビュー<em>${reviewWaiting.length}</em></button>
  <button class="tabbtn" data-tab="links">連携<em>${openRequests.length + activeBlockers.length}</em></button>
  <button class="tabbtn" data-tab="history">履歴<em>${doneTasks.length + closedRequests.length + resolvedBlockers.length}</em></button>
  <button class="tabbtn" data-tab="pipeline" title="三社フロー（外注Order・審査Case）の次の番。全${pipeTotalCount}件・要人間承認${pipeHumanCount}件">パイプライン${pipeHumanCount ? `<em>⚑${pipeHumanCount}</em>` : (pipeTotalCount ? `<em>${pipeTotalCount}</em>` : '')}</button>
  <button class="tabbtn" data-tab="model">モデル</button>
</nav>

<main>
<section class="panel" id="home">${orgHTML}</section>

<section class="panel" id="review">${reviewHTML}</section>

<section class="panel" id="tasks">
  ${fbar}
  <h2>現役タスク（${activeTasks.length}）── 部署順・ID順</h2>
  ${tbl(TASK_W, TASK_H, activeTasks, taskRow, taskAttr)}
</section>

<section class="panel" id="links">${linksHTML}</section>

<section class="panel" id="judge">${judgeHTML}</section>

<section class="panel" id="history">
  ${fbar}
  <h2>完了・中止タスク（現サイクル ${doneTasks.length}）── 部署順・ID順</h2>
  ${tbl(TASK_W, TASK_H_DONE, doneTasks, doneRow, taskAttr)}
  <h2>完了した依頼（現サイクル ${closedRequests.length}）── 連携タブから移管</h2>
  ${tbl([100, 140, 140, 'auto', 64, 95, 170, 200], ['ID', '依頼元', '宛先', '内容', '緊急度', '期限', 'ステータス（元→先）', '回答・参照'], closedRequests, (r) =>
    `<td>${id(r['ID'])}</td><td>${esc(r['依頼元'])}</td><td>${esc(r['宛先'])}</td>${tdT(r['内容'])}<td>${chip(r['緊急度'])}</td><td>${esc(r['期限'])}</td>` +
    `<td>${chip(r['元'])} → ${chip(r['先'])}</td><td title="${esc(r['回答・参照'])}">${linkify(r['回答・参照'])}</td>`,
    (r) => ` id="row-${esc(r['ID'])}" data-dept="${esc(r['依頼元'])}｜${esc(r['宛先'])}" data-status="${esc(r['元'])}｜${esc(r['先'])}" data-pri="${esc(r['緊急度'])}"`)}
  <h2>解消した詰まり（現サイクル ${resolvedBlockers.length}）── 連携タブから移管</h2>
  ${tbl([100, 140, 'auto', 200, 200, 110], ['ID', '部署', '内容', '影響', '必要な支援', 'ステータス'], resolvedBlockers, (r) =>
    `<td>${id(r['ID'])}</td><td>${esc(r['部署'])}</td>${tdT(r['内容'])}${tdT(r['影響'])}${tdT(r['必要な支援'])}<td>${chip('解消')}</td>`,
    (r) => ` id="row-${esc(r['ID'])}" data-dept="${esc(r['部署'])}" data-status="解消"`)}
  ${archives.length
    ? archives.map((a) => `<h2>アーカイブ：${esc(a.file)}</h2>` + (a.tables.map((t) =>
        `<table>${colgroup(t.headers.map(() => 'auto'))}<thead><tr>${t.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
        t.rows.map((r) => `<tr>${t.headers.map((_, i) => `<td title="${esc(r[i] || '')}">${esc(r[i] || '')}</td>`).join('')}</tr>`).join('') + '</tbody></table>').join('') || '<p class="empty">表なし</p>')).join('')
    : '<h2>アーカイブ</h2><p class="empty">まだなし（週次で Secretary/archive/ に退避され、ここに全量表示される）</p>'}
  <h2>フィードバック履歴（${allFeedback.length}）</h2>
  ${tbl([100, 140, 120, 80, 'auto', 95], ['ID', '宛先', '対象', '判定', '内容', '日付'], allFeedback.slice().reverse(), (r) =>
    `<td>${id(r['ID'])}</td><td>${esc(r['宛先'])}</td><td>${linkify(r['対象'])}</td><td>${chip(r['判定'])}</td>${tdT(r['内容'])}<td>${esc(r['日付'])}</td>`,
    (r) => ` data-dept="${esc(r['宛先'])}"`)}
  <h2>意思決定ログ（${decisions.length}）</h2>
  ${tbl([72, 95, 95, 'auto', 250], ['ID', '日付', '判断者', '決定内容', '次アクション'], decisions, (r) =>
    `<td>${id(r['ID'])}</td><td>${esc(r['日付'])}</td><td>${esc(r['判断者'])}</td>${tdT(r['決定内容'])}${tdT(r['次アクション'])}`,
    (r) => ` data-dept="${esc(r['関係部署'] || '')}"`)}
</section>

<section class="panel" id="pipeline">${pipelineHTML}</section>

<section class="panel" id="model">${modelHTML}</section>
</main>

<div id="rmodal" class="rmodal off" aria-hidden="true">
  <div class="rmodal-back"></div>
  <div class="rmodal-panel">
    <button class="rmodal-x" title="閉じる（Esc）">×</button>
    <div class="rmodal-head"><div class="rm-title"></div><div class="rm-meta"></div></div>
    <div class="rm-verdict off"></div>
    <div class="rm-cols">
      <div class="rm-col rm-left">
        <div class="rm-coltitle">レビュイーコメント<small>Ollama・実施部署の代弁</small></div>
        <div class="rm-comment md"></div>
      </div>
      <div class="rm-col rm-right">
        <div class="rm-coltitle">原文（成果物）<small></small></div>
        <div class="rm-original md"></div>
      </div>
    </div>
    <div class="rm-foot"></div>
  </div>
</div>
<script id="reviewdocs" type="application/json">${reviewDocsJSON}</script>

<script>
(function () {
  var btns = document.querySelectorAll('.tabbtn');
  var panels = document.querySelectorAll('.panel');
  function show(id) {
    for (var i = 0; i < panels.length; i++) panels[i].classList.toggle('active', panels[i].id === id);
    for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', btns[j].getAttribute('data-tab') === id);
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (id === 'home') requestAnimationFrame(drawOrg);
  }
  for (var k = 0; k < btns.length; k++) btns[k].addEventListener('click', function () { show(this.getAttribute('data-tab')); });

  // 概況の連結線をカード背面に描画（社長室→各帯の左中央へエルボー。リサイズ追従）
  function drawOrg() {
    var org = document.querySelector('.org'); if (!org) return;
    var svg = org.querySelector('.orgsvg');
    var ceo = org.querySelector('.ceocol .ocard');
    var bands = org.querySelectorAll('.band');
    if (!ceo || !bands.length) return;
    var o = org.getBoundingClientRect();
    if (!o.width) return;
    function pt(el, side) { var r = el.getBoundingClientRect(); return { x: (side === 'r' ? r.right : r.left) - o.left, y: r.top + r.height / 2 - o.top }; }
    var p = pt(ceo, 'r');
    var firstLeft = pt(bands[0], 'l').x;
    var busX = p.x + Math.max(18, Math.min(46, (firstLeft - p.x) * 0.45));
    var hues = ['#D9442C', '#3D5A99'];
    var paths = '';
    for (var i = 0; i < bands.length; i++) {
      var c = pt(bands[i], 'l');
      var d = 'M ' + p.x + ' ' + p.y + ' L ' + busX + ' ' + p.y + ' L ' + busX + ' ' + c.y + ' L ' + c.x + ' ' + c.y;
      paths += '<path d="' + d + '" class="branch" style="stroke:' + (hues[i] || '#888') + '"/>';
    }
    for (var j = 0; j < bands.length; j++) {
      var c2 = pt(bands[j], 'l');
      var d2 = 'M ' + p.x + ' ' + p.y + ' L ' + busX + ' ' + p.y + ' L ' + busX + ' ' + c2.y + ' L ' + c2.x + ' ' + c2.y;
      paths += '<path d="' + d2 + '" class="pulseline"/>';
    }
    svg.innerHTML = paths;
  }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (document.getElementById('home').classList.contains('active')) drawOrg(); }, 120); });

  var init = location.hash.replace('#', '');
  show(document.getElementById(init) ? init : 'home');
  requestAnimationFrame(drawOrg);
  window.addEventListener('load', function () { requestAnimationFrame(drawOrg); });

  // IDジャンプ＋点滅（0.6秒×5回＝3秒）。リンク先の行が属するタブを自動判定して切替
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a.jump') : null;
    if (!a) return;
    e.preventDefault();
    var row = document.getElementById('row-' + a.getAttribute('data-row'));
    if (!row) return;
    var panel = row.closest('.panel');
    if (panel) show(panel.id);
    row.scrollIntoView({ block: 'center' });
    row.classList.remove('blink');
    void row.offsetWidth;
    row.classList.add('blink');
    setTimeout(function () { row.classList.remove('blink'); }, 3100);
  });

  // 共通フィルタ（部署・ステータス・モデル・進捗・優先度・検索｜AND判定｜リセット）
  var bars = document.querySelectorAll('.fbar');
  for (var n = 0; n < bars.length; n++) {
    (function (bar) {
      var panel = bar.closest('.panel');
      var sels = bar.querySelectorAll('select.f');
      var search = bar.querySelector('.fsearch');
      function apply() {
        var q = search.value.toLowerCase();
        var rows = panel.querySelectorAll('tbody tr, p[data-dept]');
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i], okAll = true;
          for (var s = 0; s < sels.length; s++) {
            var v = sels[s].value;
            if (!v) continue;
            var attr = r.getAttribute('data-' + sels[s].getAttribute('data-k'));
            if (!attr || attr.indexOf(v) === -1) { okAll = false; break; }
          }
          if (okAll && q && r.textContent.toLowerCase().indexOf(q) === -1) okAll = false;
          r.style.display = okAll ? '' : 'none';
        }
      }
      for (var s2 = 0; s2 < sels.length; s2++) sels[s2].addEventListener('change', apply);
      search.addEventListener('input', apply);
      bar.querySelector('.freset').addEventListener('click', function () {
        for (var s3 = 0; s3 < sels.length; s3++) sels[s3].value = '';
        search.value = '';
        apply();
      });
    })(bars[n]);
  }

  // カードパネルの部署×状態フィルタ（レビュー・ジャッジ共通。パネル単位でスコープ）
  function setupCardPanel(panelId, defaultState) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var dept = '', state = defaultState;
    var cards = panel.querySelectorAll('.rcard');
    var empty = panel.querySelector('.empty');
    function apply() {
      var vis = 0;
      for (var i = 0; i < cards.length; i++) {
        var dOk = !dept || (cards[i].getAttribute('data-dept') || '').indexOf(dept) >= 0;
        var sOk = state === 'すべて' || (state === '要対応'
          ? cards[i].getAttribute('data-need') === '1'
          : cards[i].getAttribute('data-state') === state);
        cards[i].style.display = (dOk && sOk) ? '' : 'none';
        if (dOk && sOk) vis++;
      }
      if (empty) empty.classList.toggle('off', vis > 0);
    }
    function bind(sel, set) {
      var els = panel.querySelectorAll(sel);
      for (var b = 0; b < els.length; b++) els[b].addEventListener('click', function () {
        for (var k = 0; k < els.length; k++) els[k].classList.remove('active');
        this.classList.add('active'); set(this); apply();
      });
    }
    bind('.rtab', function (el) { dept = el.getAttribute('data-dept'); });
    bind('.rstate', function (el) { state = el.getAttribute('data-state'); });
    apply();
  }
  setupCardPanel('review', 'レビュー待ち');
  setupCardPanel('judge', '判断待ち');
  setupCardPanel('links', '要対応');

  // パイプラインタブ：すべて／要人間承認 のフィルタ（カードは data-human で絞る）
  (function () {
    var panel = document.getElementById('pipeline');
    if (!panel) return;
    var pfs = panel.querySelectorAll('.pf');
    var cards = panel.querySelectorAll('.pcard');
    var empty = panel.querySelector('#pempty-filter');
    function apply(mode) {
      var vis = 0;
      for (var i = 0; i < cards.length; i++) {
        var ok = mode === 'all' || cards[i].getAttribute('data-human') === '1';
        cards[i].style.display = ok ? '' : 'none';
        if (ok) vis++;
      }
      if (empty) empty.classList.toggle('off', vis > 0);
    }
    for (var p = 0; p < pfs.length; p++) pfs[p].addEventListener('click', function () {
      for (var k = 0; k < pfs.length; k++) pfs[k].classList.remove('active');
      this.classList.add('active'); apply(this.getAttribute('data-pf'));
    });
  })();

  var served = location.protocol !== 'file:';

  var notServed ='いまは閲覧モード（file://）のため記録できません。\\n\\nターミナルで  node Secretary/tools/serve.js  を起動し、\\nhttp://localhost:4310 で開き直すと承認・差戻しできます。';

  // 承認/差戻し → /review（serve.jsがOllamaで文面生成→fbk記録→build→reload）。カード・モーダル両方から使う
  function submitVerdict(dest, target, verdict, title, btn, fpath) {
    if (!served) { alert(notServed); return; }
    var note = prompt(verdict + '：' + target + '「' + title + '」\\n社長コメント（任意・空欄可。記入すると原文を保存し、Ollamaが部署への通知文と対応方針を作ります。キャンセルで中止）', '');
    if (note === null) return;
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '処理中…'; }
    var body = 'dest=' + encodeURIComponent(dest) + '&target=' + encodeURIComponent(target)
      + '&verdict=' + encodeURIComponent(verdict) + '&title=' + encodeURIComponent(title)
      + '&note=' + encodeURIComponent(note) + '&path=' + encodeURIComponent(fpath || '');
    fetch('/review', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function () { location.reload(); })
      .catch(function (e) { alert('記録に失敗：' + e.message); if (btn) { btn.disabled = false; btn.textContent = label; } });
  }
  var racts = document.querySelectorAll('.rcard .ract');
  for (var ra = 0; ra < racts.length; ra++) {
    racts[ra].addEventListener('click', function (e) {
      e.stopPropagation();
      submitVerdict(this.getAttribute('data-dest'), this.getAttribute('data-target'), this.getAttribute('data-verdict'), this.getAttribute('data-title'), this, this.getAttribute('data-path'));
    });
  }

  // ===== レビュー詳細モーダル（カードクリックで拡大／Ollamaレビュイー資料を整形表示） =====
  var DOCS = {};
  try { DOCS = JSON.parse(document.getElementById('reviewdocs').textContent || '{}'); } catch (e) {}
  var modal = document.getElementById('rmodal');
  var mTitle = modal.querySelector('.rm-title'), mMeta = modal.querySelector('.rm-meta'),
      mVerdict = modal.querySelector('.rm-verdict'),
      mComment = modal.querySelector('.rm-comment'), mOriginal = modal.querySelector('.rm-original'),
      mOrigTitle = modal.querySelector('.rm-right .rm-coltitle small'), mFoot = modal.querySelector('.rm-foot');
  var curKey = null;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inline(s) { return esc(s).replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>').replace(/\`([^\`]+)\`/g, '<code>$1</code>'); }
  // 最小 markdown→HTML（見出し・箇条書き・表・段落・太字）
  function mdToHtml(md) {
    var lines = String(md).split('\\n'), out = [], i = 0, list = null;
    function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
    while (i < lines.length) {
      var ln = lines[i];
      var h = ln.match(/^(#{1,6})\\s+(.*)$/);
      if (h) { closeList(); out.push((h[1].length <= 2 ? '<h4>' : '<h5>') + inline(h[2]) + (h[1].length <= 2 ? '</h4>' : '</h5>')); i++; continue; }
      if (/^\\s*\\|.*\\|\\s*$/.test(ln) && i + 1 < lines.length && /^\\s*\\|?[\\s:|-]+\\|?\\s*$/.test(lines[i + 1])) {
        closeList();
        var rows = [];
        while (i < lines.length && /^\\s*\\|.*\\|\\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
        var cells = function (r) { return r.trim().replace(/^\\|/, '').replace(/\\|$/, '').split('|').map(function (c) { return c.trim(); }); };
        var head = cells(rows[0]);
        var t = '<table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
        for (var r = 2; r < rows.length; r++) { var cs = cells(rows[r]); t += '<tr>' + cs.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }
        out.push(t + '</tbody></table>'); continue;
      }
      var li = ln.match(/^\\s*([-*]|\\d+\\.)\\s+(.*)$/);
      if (li) { var want = /^\\s*\\d+\\./.test(ln) ? 'ol' : 'ul'; if (list !== want) { closeList(); list = want; out.push('<' + want + '>'); } out.push('<li>' + inline(li[2]) + '</li>'); i++; continue; }
      if (!ln.trim()) { closeList(); i++; continue; }
      closeList(); out.push('<p>' + inline(ln) + '</p>'); i++;
    }
    closeList();
    return out.join('');
  }

  function renderFoot(d) {
    var html = '<span class="id rpath" title="' + esc(d.path) + '">' + esc(d.path) + '</span>';
    if (!d.summary && d.generable) html += '<button class="rm-gen" data-act="gen">レビュイーコメントを生成（Ollama）</button>';
    else if (d.stale) html += '<button class="rm-gen" data-act="gen">コメントを再生成</button>';
    if (d.actable) html += '<button class="ract ok" data-act="ok">承認</button><button class="ract ng" data-act="ng">差戻し</button>';
    else if (d.eff === '承認済') html += '<span class="rok">✓ 承認済</span>';
    else if (d.eff === '取下') html += '<span class="fine">取下</span>';
    mFoot.innerHTML = html;
    var gen = mFoot.querySelector('[data-act=gen]');
    if (gen) gen.addEventListener('click', function () { doGenerate(d, this); });
    var ok = mFoot.querySelector('[data-act=ok]'), ng = mFoot.querySelector('[data-act=ng]');
    if (ok) ok.addEventListener('click', function () { submitVerdict(d.dept, d.id, '承認', d.title, this, d.path); });
    if (ng) ng.addEventListener('click', function () { submitVerdict(d.dept, d.id, '差戻し', d.title, this, d.path); });
  }
  function renderVerdict(d) {
    if (!d.presidentNote && !d.responsePlan && !d.planPending) { mVerdict.classList.add('off'); mVerdict.innerHTML = ''; return; }
    var head = (d.verdict ? ('判定 ' + esc(d.verdict)) : '') + (d.verdictDate ? ('　' + esc(d.verdictDate)) : '') + (d.resubmitted ? '　<em class="reflag">↻ 修正・再提出（再レビュー待ち）</em>' : '');
    var html = '<div class="rm-vhead">社長レビュー　<small>' + head + '</small></div>';
    if (d.presidentNote) html += '<div class="rm-vlabel">社長コメント（原文）</div><div class="rm-pnote">' + esc(d.presidentNote) + '</div>';
    html += '<div class="rm-vlabel">対応方針（' + esc(d.dept) + ' ／ Ollama）</div>';
    if (d.responsePlan) html += '<div class="rm-plan md">' + mdToHtml(d.responsePlan) + '</div>';
    else if (d.planPending) html += '<div class="rm-plan rm-loading">対応方針を生成中…（数十秒）。閉じている間に反映されます。</div>';
    else html += '<div class="rm-plan fine">（社長コメントなしのため対応方針は未生成）</div>';
    mVerdict.innerHTML = html; mVerdict.classList.remove('off');
  }
  function renderComment(d) {
    var html = '';
    if (d.stale && d.summary) html += '<div class="rm-stale">成果物が更新されています。コメントを再生成してください（下のボタン）。</div>';
    if (d.summary) html += mdToHtml(d.summary);
    else if (d.generable) html += '<div class="rm-loading">レビュイーコメントは自動生成待ちです。レビューに回った成果物（コード含む）は順次バックグラウンドで生成されます（数十秒〜）。すぐ必要なら下の「生成」を押してください。右に原文を表示しています。</div>';
    else html += mdToHtml(d.commentNote || 'レビュー資料はありません。右の情報をご確認ください。');
    mComment.innerHTML = html;
  }
  function renderOriginal(d) {
    mOriginal.innerHTML = d.original ? mdToHtml(d.original) : ('<p class="fine">' + esc(d.path) + ' は表示対象外です。ファイルを直接お開きください。</p>');
    if (mOrigTitle) mOrigTitle.textContent = d.path;
  }
  function renderLinkModal(d) {
    var cols = modal.querySelector('.rm-cols'); cols.classList.add('solo');
    var lt = modal.querySelector('.rm-left .rm-coltitle');
    if (lt && lt.firstChild) { lt.firstChild.nodeValue = d.kind === 'thread' ? '会話（社内便）' : (d.kind === 'req' ? '依頼の往復' : '詰まりの詳細'); var ls = lt.querySelector('small'); if (ls) ls.textContent = ''; }
    var html = '';
    if (d.kind === 'thread') {
      for (var i = 0; i < d.messages.length; i++) {
        var m = d.messages[i], mine = m.from === '社長室';
        html += '<div class="msg' + (mine ? ' mine' : '') + '"><div class="msgh">' + esc(m.from) + ' → ' + esc(m.to) + (m.label ? ' ・' + esc(m.label) : '') + ' <small>' + esc(m.at) + '</small></div><div class="msgb md">' + mdToHtml(m.body) + '</div></div>';
      }
      if (!d.messages.length) html += '<p class="fine">メッセージなし</p>';
    } else if (d.kind === 'req') {
      html += '<div class="rm-vlabel">依頼内容（' + esc(d.dept) + '）</div><div class="rm-pnote">' + esc(d.body) + '</div>'
        + '<div class="rm-vlabel">回答・参照</div><div class="md">' + mdToHtml(d.answer || '(未回答)') + '</div>'
        + '<p class="fine">緊急度 ' + esc(d.urgency || '-') + ' ／ 期限 ' + esc(d.deadline || '-') + ' ／ 状態 ' + esc(d.eff) + '</p>';
    } else {
      html += '<div class="rm-vlabel">影響</div><div class="rm-pnote">' + esc(d.impact || '-') + '</div>'
        + '<div class="rm-vlabel">必要な支援</div><div class="rm-pnote">' + esc(d.support || '-') + '</div>';
    }
    mComment.innerHTML = html;
    var foot = '<span class="id rpath">' + esc(d.id) + '</span>';
    if (d.kind === 'thread') foot += '<input class="rm-reply" placeholder="返信を書く（社長→' + esc(d.replyTo || '相手') + '）"><button class="rm-gen" data-act="reply">返信</button>';
    mFoot.innerHTML = foot;
    var rb = mFoot.querySelector('[data-act=reply]');
    if (rb) rb.addEventListener('click', function () { doReply(d, mFoot.querySelector('.rm-reply'), this); });
  }
  function doReply(d, input, btn) {
    if (!served) { alert(notServed); return; }
    var body = input ? input.value.trim() : '';
    if (!body) { if (input) input.focus(); return; }
    btn.disabled = true; btn.textContent = '送信中…';
    var p = 'thread=' + encodeURIComponent(d.id) + '&to=' + encodeURIComponent(d.replyTo || '') + '&body=' + encodeURIComponent(body) + '&subject=' + encodeURIComponent(d.title || '');
    fetch('/mail-reply', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: p })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function () { location.reload(); })
      .catch(function (e) { alert('返信失敗：' + e.message); btn.disabled = false; btn.textContent = '返信'; });
  }
  function openModal(key) {
    var d = DOCS[key]; if (!d) return;
    curKey = key;
    mTitle.textContent = (d.title || '(無題)');
    mMeta.innerHTML = '<span class="id">' + esc(d.id) + '</span>　' + esc(d.dept) + ' ｜ ' + esc(d.type || '') + ' ｜ ' + esc(d.eff || '');
    if (d.kind === 'thread' || d.kind === 'req' || d.kind === 'blk') {
      renderVerdict({}); renderLinkModal(d);
      modal.classList.remove('off'); modal.setAttribute('aria-hidden', 'false'); return;
    }
    modal.querySelector('.rm-cols').classList.remove('solo');
    var lt = modal.querySelector('.rm-left .rm-coltitle'), rt = modal.querySelector('.rm-right .rm-coltitle');
    var isJ = d.kind === 'judge';
    if (lt && lt.firstChild) { lt.firstChild.nodeValue = isJ ? '論点整理・推奨' : 'レビュイーコメント'; var ls = lt.querySelector('small'); if (ls) ls.textContent = isJ ? 'Ollama・起票部署の代弁' : 'Ollama・実施部署の代弁'; }
    if (rt && rt.firstChild) rt.firstChild.nodeValue = isJ ? '参照資料' : '原文（成果物）';
    renderVerdict(d); renderComment(d); renderOriginal(d); renderFoot(d);
    mComment.scrollTop = 0; mOriginal.scrollTop = 0;
    modal.classList.remove('off'); modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() { modal.classList.add('off'); modal.setAttribute('aria-hidden', 'true'); curKey = null; }
  function doGenerate(d, btn) {
    if (!served) { alert(notServed); return; }
    btn.disabled = true; btn.textContent = '生成中…（数十秒）';
    mComment.innerHTML = '<div class="rm-loading">Ollama がレビュイーとしてコメントを作成しています…（成果物の大きさにより数十秒）</div>';
    var body = 'target=' + encodeURIComponent(d.id) + '&path=' + encodeURIComponent(d.path);
    fetch('/gen-review', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error || j.reason || '生成不可');
        d.summary = j.doc; d.stale = false; DOCS[curKey] = d;
        renderComment(d); renderFoot(d);
      })
      .catch(function (e) { alert('生成に失敗：' + e.message); renderComment(d); renderFoot(d); });
  }
  var rcards = document.querySelectorAll('.rcard');
  for (var ci = 0; ci < rcards.length; ci++) {
    rcards[ci].addEventListener('click', function (e) {
      if (e.target.closest('.ract') || e.target.closest('a.jump')) return;
      openModal(this.getAttribute('data-rkey'));
    });
  }
  modal.querySelector('.rmodal-x').addEventListener('click', closeModal);
  modal.querySelector('.rmodal-back').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.classList.contains('off')) closeModal(); });

  // リアルタイム化：60秒ごとに自動更新（serve.jsはGET毎にbuild）。
  // モーダルを開いている間・入力中（返信や承認コメント記入中）は停止して操作を妨げない。
  if (served) {
    setInterval(function () {
      if (!modal.classList.contains('off')) return;
      var ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      location.reload();
    }, 60000);
  }
})();
</script>
</body></html>
`;

fs.writeFileSync(path.join(SHARED, 'dashboard', 'index.html'), html);

// 自己チェック：生成したダッシュボードのインラインJSが構文エラーだと白画面になるため、
// パースのみ（実行しない）で検証し、壊れていたら警告して異常終了にする。
try {
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (m) new Function(m[1]);
} catch (e) {
  console.error('警告: 生成ダッシュボードのJSに構文エラー（白画面の原因になる）: ' + e.message);
  process.exitCode = 1;
}

for (const v of gateViolations) {
  console.error(`警告: 関門違反 ${v['タスクID']}（${v['部署']}）＝社長レビュー未承認のまま完了化されている（rules/review-gate.md）`);
}

console.log(`[build] ${STAMP}`);
console.log(`  部署: ${depts.filter((d) => !d.missing).length}/${DEPTS.length} ｜ タスク: 現役${activeTasks.length}・完了${doneTasks.length} ｜ 依頼: ${allRequests.length} ｜ 詰まり: ${activeBlockers.length} ｜ 判断待ち: ${allJudgments.length} ｜ FB: ${allFeedback.length} ｜ レビュー待ち: ${reviewWaiting.length}`);
console.log('  生成: boards/{tasks,requests,blockers,judgments,feedback,bulletin,review}.md, dashboard/index.html');
