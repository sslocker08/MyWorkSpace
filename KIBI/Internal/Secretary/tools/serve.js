#!/usr/bin/env node
// KIBI ダッシュボード操作モード（ローカル専用・社長の操作卓）
// 起動: node Secretary/tools/serve.js → http://localhost:4310
// 役割: ダッシュボードを配信し、判断タブ／レビュータブのボタンから
//       Secretary/status/HQ.md の「部署へのフィードバック」表へ追記して再生成する。
//       レビュータブの承認/差戻しは Ollama で部署向け文面を生成してから記録する（/review）。
// 書き込むのは HQ.md のみ（社長＝単一書き手の延長。部署ファイルには触れない）。
//       成果物の「承認済/差戻し」表示は build.js が fbk から派生（部署は次回起動で自分の行を同期）。

'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const qs = require('querystring');
const crypto = require('crypto');
const { spawnSync, spawn } = require('child_process');

const SHARED = path.resolve(__dirname, '..');
const ROOT = path.resolve(SHARED, '..', '..'); // KIBIルート（Secretary は Internal/ 配下）
const PROTECTED = /(_Records|\.secrets|Kofukuron23)/; // 防火壁
const HQ = path.join(SHARED, 'status', 'HQ.md');
const DASHDIR = path.join(SHARED, 'dashboard');
const DASH = path.join(DASHDIR, 'index.html');       // 旧ビルド生成HTML（GET /legacy で残す）
const APP_HTML = path.join(DASHDIR, 'app.html');      // 新SPA（GET / が返す）
const BOARDSDIR = path.join(DASHDIR, '..', 'boards'); // Secretary/boards
const ORDERS_SCAN = path.join(__dirname, 'orders-scan.js');
const INSTANCE_CONFIG = path.join(ROOT, 'instance.config.json'); // 機械可読インスタンス設定（無ければフォールバック）
const VERDICTS_FILE = path.join(SHARED, 'dashboard', 'summaries', '_verdicts.json');
const VERDICTS = ['承認', '差戻し', 'コメント', '保留'];
// 静的配信ホワイトリスト（拡張子→Content-Type）。dashboard/ 配下のみ。
const STATIC_FILES = {
  '/app.css': 'text/css; charset=utf-8',
  '/app.js': 'application/javascript; charset=utf-8',
  '/org-flow.js': 'application/javascript; charset=utf-8',
};
// /api/board で読み出せるボード名（パストラバーサル防止のホワイトリスト）
const BOARD_NAMES = ['tasks', 'requests', 'blockers', 'judgments', 'feedback', 'bulletin', 'review', 'mail'];
const PORT = Number(process.env.PORT) || 4310;
const HOST = process.env.HOST || '127.0.0.1'; // 既定=localhostのみ（安全）。Tailnet公開時のみ HOST=<tailnet IP> を指定（tailnet内限定・LAN非開放）
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:14b';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

function build() {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'build.js')], { encoding: 'utf8' });
  if (r.status !== 0) console.error(r.stderr || r.stdout);
}

// ── 新SPA向けユーティリティ ──────────────────────────────────────────────
function sendJson(res, obj, code) {
  res.writeHead(code || 200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// instance.config.json を読む。無ければ空配列でフォールバック（壊さない）。
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(INSTANCE_CONFIG, 'utf8'));
  } catch (e) {
    return { instanceName: 'KIBI', departments: [], vendors: [], magi: [] };
  }
}

// orders-scan.js を子プロセスで実行し、機械可読JSON（_pipeline.json と同形）を得る。
// --json --no-write で stdout のみ取得（_pipeline.json は書き換えない＝build/scan運用と非干渉）。
// 終了コードは 0/2 ともに正常（2=競合 or 要人間承認あり）。stdout が無い時のみフォールバック。
function scanPipeline() {
  const r = spawnSync(process.execPath, [ORDERS_SCAN, '--json', '--no-write'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const out = (r.stdout || '').trim();
  if (out) {
    try { return JSON.parse(out); } catch (e) { /* fallthrough */ }
  }
  return { generatedAt: new Date().toISOString(), orders: [], cases: [], locks: { activeCount: 0, conflicts: [] }, needsHuman: [], warnings: ['orders-scan 実行に失敗（' + ((r.stderr || '').trim() || 'no output') + '）'] };
}

// レビューに回った成果物のレビュイー要約を、トリガー無しで自動生成（背景・非ブロッキング）。
// ページ表示は止めず、生成済みから順にカードへ反映される（クライアントが自動リロード）。
let genBusy = false;
function autoGen() {
  if (genBusy) return;
  let miss = [];
  try { miss = require('./review-core').missing(); } catch (e) { return; }
  if (!miss.length) return;
  genBusy = true;
  console.log(`[auto] レビュー要約 自動生成 開始（未生成 ${miss.length} 件）`);
  const child = spawn(process.execPath, [path.join(__dirname, 'review-summarize.js')], { stdio: 'ignore' });
  child.on('exit', () => { genBusy = false; console.log('[auto] レビュー要約 自動生成 完了'); });
  child.on('error', (e) => { genBusy = false; console.error('[auto] 失敗: ' + e.message); });
}

// レビュー判定 → 部署向け通知文を生成（ローカルOllama・Claudeトークン不使用）。
// 失敗・未導入時はテンプレート文にフォールバック（運用は止めない）。
function jstDate() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); }
function readVerdicts() { try { return JSON.parse(fs.readFileSync(VERDICTS_FILE, 'utf8')); } catch (e) { return {}; } }
function writeVerdicts(v) { fs.mkdirSync(path.dirname(VERDICTS_FILE), { recursive: true }); fs.writeFileSync(VERDICTS_FILE, JSON.stringify(v, null, 1)); }
function shaOf(rel) {
  try {
    const abs = path.resolve(ROOT, rel);
    if (!abs.startsWith(ROOT + path.sep) || PROTECTED.test(abs) || !fs.existsSync(abs)) return null;
    return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  } catch (e) { return null; }
}
// 判定の記録：再提出検知用の成果物SHA・社長コメント原文・対応方針を保管（fbk はHQ.mdが人間可読の正本）
function recordVerdict(taskId, verdict, fbkId, presidentNote, deptMessage) {
  const core = require('./review-core');
  const files = {};
  for (const d of core.listDeliverables()) if (d.taskId === taskId) { const s = shaOf(d.rel); if (s) files[d.rel] = s; }
  const recs = readVerdicts();
  recs[taskId] = { verdict, date: jstDate(), fbkId, presidentNote: String(presidentNote || ''), deptMessage: deptMessage || '', responsePlan: presidentNote ? '__pending__' : '', files };
  writeVerdicts(recs);
}
// 背景：社長コメントを受けた対応方針を Ollama（レビュイー）が生成し、記録を更新して再ビルド
function genResponseBg(taskId, rel, verdict, note) {
  require('./review-core').genResponsePlan(taskId, rel, verdict, note)
    .then((plan) => { const r = readVerdicts(); if (r[taskId]) { r[taskId].responsePlan = plan; writeVerdicts(r); build(); console.log(`[plan] ${taskId} 対応方針 生成`); } })
    .catch((e) => { const r = readVerdicts(); if (r[taskId] && r[taskId].responsePlan === '__pending__') { r[taskId].responsePlan = ''; writeVerdicts(r); } console.error('[plan] ' + e.message); });
}

async function composeFeedback(verdict, title, note) {
  const base = String(note || '').trim();
  const fallback = verdict === '承認'
    ? `「${title}」を承認。完了化して可。${base}`.trim()
    : `「${title}」を差戻し。${base || '修正のうえ再提出のこと。'}`.trim();
  try {
    const prompt = 'あなたはKIBI（香水ブランドの仮想カンパニー）の社長室。担当部署への通知文を日本語で1文だけ書く。'
      + `判定=${verdict}、対象成果物=「${title}」、社長メモ=「${base || '（なし）'}」。`
      + '簡潔体・静かなトーン。承認なら完了化を促す。差戻しなら直す観点を一言。前置き・引用符・改行なし、本文のみ。';
    const res = await fetch(OLLAMA_HOST + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, options: { temperature: 0.3 } }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const out = (await res.json()).response.replace(/[\r\n|]+/g, ' ').trim();
    return out || fallback;
  } catch (e) {
    console.error('[ollama] フォールバック: ' + e.message);
    return fallback;
  }
}

function addFeedback(f) {
  const clean = (s) => String(s || '').replace(/[|\r\n]/g, ' ').trim() || '-';
  const md = fs.readFileSync(HQ, 'utf8');
  const ids = [...md.matchAll(/fbk-hq-(\d+)/g)].map((m) => +m[1]);
  const id = 'fbk-hq-' + String((ids.length ? Math.max(...ids) : 0) + 1).padStart(3, '0');
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // JST固定のYYYY-MM-DD。UTCだと深夜帯に前日になる
  const verdict = VERDICTS.includes(f.verdict) ? f.verdict : 'コメント';
  const row = `| ${id} | ${clean(f.dest)} | ${clean(f.target)} | ${verdict} | ${clean(f.note)} | ${date} |`;

  const lines = md.split('\n');
  const sec = lines.findIndex((l) => l.startsWith('## 部署へのフィードバック'));
  if (sec === -1) throw new Error('HQ.md に「部署へのフィードバック」節がない');
  let last = -1;
  for (let i = sec + 1; i < lines.length && !lines[i].startsWith('## '); i++) {
    if (lines[i].trim().startsWith('|')) last = i;
  }
  if (last === -1) throw new Error('フィードバック表が見つからない');
  lines.splice(last + 1, 0, row);
  fs.writeFileSync(HQ, lines.join('\n'));
  return id;
}

// 社長（HQ）の社内便を HQ.md「社内便（送信）」へ1行追記（無ければ節を新設）。単一書き手の範囲。
function addMail(f) {
  const clean = (s) => String(s || '').replace(/[|\r\n]/g, ' ').trim() || '-';
  const md = fs.readFileSync(HQ, 'utf8');
  const ids = [...md.matchAll(/bin-hq-(\d+)/g)].map((m) => +m[1]);
  const id = 'bin-hq-' + String((ids.length ? Math.max(...ids) : 0) + 1).padStart(3, '0');
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 16);
  const thread = clean(f.thread) === '-' ? id : clean(f.thread);
  const row = `| ${id} | ${thread} | ${clean(f.to)} | 返信 | ${clean(f.subject)} | ${clean(f.body)} | 送信 | ${now} |`;
  const lines = md.split('\n');
  const sec = lines.findIndex((l) => l.startsWith('## 社内便（送信）'));
  if (sec === -1) {
    const block = ['## 社内便（送信）', '| 便ID | スレッド | 宛先 | 種別 | 件名 | 本文/パス | 状態 | 日時 |', '|---|---|---|---|---|---|---|---|', row, ''];
    const anchor = lines.findIndex((l) => l.startsWith('## 共有・アピール'));
    if (anchor === -1) lines.push('', ...block); else lines.splice(anchor, 0, ...block, '');
    fs.writeFileSync(HQ, lines.join('\n'));
    return id;
  }
  let last = -1;
  for (let i = sec + 1; i < lines.length && !lines[i].startsWith('## '); i++) if (lines[i].trim().startsWith('|')) last = i;
  if (last === -1) throw new Error('社内便表が見つからない');
  lines.splice(last + 1, 0, row);
  fs.writeFileSync(HQ, lines.join('\n'));
  return id;
}

// ── SSE（リアルタイム配信）────────────────────────────────────────────────
// 接続時に1回 pipeline を送り、以後 External/・ThirdParty/Cases/・Contracts/locks.md の
// 変化を ~400ms デバウンスで拾って再走査→配信。30秒ごとに ping。切断で watcher を畳む。
function handleStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) { /* 切断済み */ }
  };
  // 初回配信
  send('pipeline', scanPipeline());

  // 監視対象（保護領域・実データには触れない＝メタ走査のみ）
  const watchers = [];
  let timer = null;
  const fire = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; send('pipeline', scanPipeline()); }, 400);
  };
  const watchPath = (target, opts) => {
    try {
      if (!fs.existsSync(target)) return;
      const w = fs.watch(target, opts || {}, fire);
      w.on('error', () => {}); // 監視エラーは握りつぶす（配信は止めない）
      watchers.push(w);
    } catch (e) { /* 監視不可でも初回配信＋pingは生きる */ }
  };
  watchPath(path.join(ROOT, 'External'), { recursive: true });
  watchPath(path.join(ROOT, 'ThirdParty', 'Cases'), { recursive: true });
  watchPath(path.join(ROOT, 'Contracts', 'locks.md'));

  const ping = setInterval(() => send('ping', { t: Date.now() }), 30000);

  const cleanup = () => {
    clearInterval(ping);
    if (timer) clearTimeout(timer);
    for (const w of watchers) { try { w.close(); } catch (e) {} }
  };
  req.on('close', cleanup);
  res.on('error', cleanup);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (req.method === 'GET' && (urlPath === '/' || urlPath === '/app.html')) {
    // 新SPA。app.html が無ければ旧ビルドHTMLにフォールバック（壊さない）。
    if (fs.existsSync(APP_HTML)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(APP_HTML));
    } else {
      build();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(DASH));
    }
    autoGen(); // 表示後に背景で未生成の要約を埋める（応答はブロックしない）
  } else if (req.method === 'GET' && (urlPath === '/legacy' || urlPath.startsWith('/index.html'))) {
    // 旧 build 生成の index.html（同期ビルドして返す＝従来挙動）
    build();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(DASH));
    autoGen();
  } else if (req.method === 'GET' && STATIC_FILES[urlPath]) {
    // dashboard/ 配下の静的アセット（app.css / app.js / org-flow.js）
    const file = path.join(DASHDIR, urlPath);
    if (file.startsWith(DASHDIR + path.sep) && fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': STATIC_FILES[urlPath] });
      res.end(fs.readFileSync(file));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
    }
  } else if (req.method === 'GET' && urlPath === '/api/config') {
    sendJson(res, readConfig());
  } else if (req.method === 'GET' && urlPath === '/api/pipeline') {
    sendJson(res, scanPipeline());
  } else if (req.method === 'GET' && urlPath === '/api/stream') {
    handleStream(req, res);
  } else if (req.method === 'GET' && urlPath === '/api/board') {
    const name = qs.parse(req.url.split('?')[1] || '').name;
    if (!BOARD_NAMES.includes(name)) { sendJson(res, { ok: false, error: 'unknown board' }, 400); return; }
    let markdown = '';
    try { markdown = fs.readFileSync(path.join(BOARDSDIR, name + '.md'), 'utf8'); } catch (e) { markdown = ''; }
    sendJson(res, { name, markdown });
  } else if (req.method === 'POST' && urlPath === '/api/build') {
    build();
    sendJson(res, { ok: true });
  } else if (req.method === 'POST' && req.url === '/feedback') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => {
      try {
        const f = qs.parse(body);
        const id = addFeedback(f);
        build();
        console.log(`[fbk] ${id} → ${f.dest} ｜ ${f.verdict} ｜ 対象 ${f.target}`);
        res.writeHead(303, { Location: '/#judge' });
        res.end();
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('エラー: ' + e.message);
      }
    });
  } else if (req.method === 'POST' && req.url === '/mail-reply') {
    // 社長（HQ）の社内便返信：HQ.md の「社内便（送信）」に1行追記（差出人=社長室・同スレッド）。単一書き手維持
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => {
      try {
        const f = qs.parse(body);
        const id = addMail({ thread: f.thread, to: f.to, subject: f.subject, body: f.body });
        build();
        console.log(`[mail] ${id} 社長室→${f.to} ｜ スレッド ${f.thread}`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, id }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
  } else if (req.method === 'POST' && req.url === '/gen-review') {
    // モーダルからのオンデマンド生成：Ollamaがレビュイー資料を生成→キャッシュ→build→JSONで本文を返す
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', async () => {
      try {
        const f = qs.parse(body);
        const core = require('./review-core');
        let r;
        if (String(f.target || '').startsWith('jdg-')) {
          const j = core.listJudgments().find((x) => x.id === f.target);
          if (!j) { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ok: false, reason: '判断が見つからない' })); return; }
          r = await core.genJudgeBrief(j, { force: f.force === '1' });
        } else {
          r = await core.genReviewDoc(String(f.target || ''), String(f.path || ''), { force: f.force === '1' });
        }
        if (r.skipped) { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ok: false, skipped: true, reason: r.reason })); return; }
        build();
        console.log(`[gen-review] ${f.target} ← ${f.path}${r.cached ? '（キャッシュ）' : '（生成）'}`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, doc: r.doc, cached: r.cached }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
  } else if (req.method === 'POST' && req.url === '/review') {
    // レビュータブの承認/差戻し：Ollamaで文面生成 → fbk追記 → build → JSONで応答（画面はreload）
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', async () => {
      try {
        const f = qs.parse(body);
        const verdict = ['承認', '差戻し'].includes(f.verdict) ? f.verdict : 'コメント';
        const rawNote = String(f.note || '');
        const msg = await composeFeedback(verdict, String(f.title || f.target || ''), rawNote);
        const id = addFeedback({ dest: f.dest, target: f.target, verdict, note: msg });
        recordVerdict(String(f.target), verdict, id, rawNote, msg);
        build();
        console.log(`[review] ${id} → ${f.dest} ｜ ${verdict} ｜ 対象 ${f.target} ｜ ${msg}`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, id, message: msg }));
        // 社長コメントがあれば対応方針を背景生成（クリックは待たせない）
        if (rawNote) genResponseBg(String(f.target), String(f.path || ''), verdict, rawNote);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('ポート4310は使用中＝serve.jsが既に起動しています。コード更新後は古いプロセスを止めて起動し直す（Ctrl+C または pkill -f serve.js）。');
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, HOST, () => {
  console.log(`KIBI ダッシュボード（操作モード）: bind ${HOST}:${PORT}（localhostは http://localhost:${PORT}）`);
  console.log('終了は Ctrl+C。閲覧だけなら dashboard/index.html を直接開けばよい。');
  build();
  autoGen(); // 起動時にも未生成の要約を背景生成し始める
});
