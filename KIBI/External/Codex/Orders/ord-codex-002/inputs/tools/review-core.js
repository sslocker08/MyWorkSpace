'use strict';
// KIBI レビュー資料 生成エンジン（共通モジュール）
// review-summarize.js（全件バッチ）と serve.js（/gen-review＝1件オンデマンド）が require して使う。
// 仕様正本: Secretary/rules/review-gate.md §7。
// Ollama をレビュイー（実施部署の代弁者）として、タスクの前後関係＋成果物本文から
// 社長レビュー用の「レビュー資料」を markdown で生成し、dashboard/summaries/ にキャッシュする。
// build.js は Ollama を呼ばない（このモジュールにも依存しない）。

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SHARED = path.resolve(__dirname, '..');
const ROOT = path.resolve(SHARED, '..');
const OUT = path.join(SHARED, 'dashboard', 'summaries');
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:14b';
const API = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MAX_BYTES = 50 * 1024;
const FEED_MAX = 24000; // Ollama へ渡す本文の上限（num_ctx 8192 に収める。超過分は先頭から切り詰め）
// テキスト判定は拡張子でなく内容で（先頭4KBにNULバイトが無いか）＝コード・設定ファイルも要約対象にする
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

function parseTable(sec) {
  const lines = sec.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return [];
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  return lines.slice(2).map(cells)
    .filter((c) => c[0] && !/^[-ー－\s]*$/.test(c[0]))
    .map((c) => Object.fromEntries(head.map((h, i) => [h, c[i] || ''])));
}

function readBoardTable(file) {
  const p = path.join(SHARED, 'boards', file);
  return fs.existsSync(p) ? parseTable(fs.readFileSync(p, 'utf8')) : [];
}

// 全成果物（レビュー用）行を status/*.md から集める
function listDeliverables() {
  const rows = [];
  for (const f of fs.readdirSync(path.join(SHARED, 'status')).filter((x) => x.endsWith('.md'))) {
    const md = fs.readFileSync(path.join(SHARED, 'status', f), 'utf8');
    const m = md.split(/\n(?=## )/).find((s) => s.startsWith('## 成果物（レビュー用）'));
    if (m) for (const r of parseTable(m)) rows.push({ taskId: String(r['タスクID'] || '').trim(), rel: String(r['成果物（パス）'] || '').trim() });
  }
  return rows.filter((r) => r.taskId && r.rel && r.rel !== '-');
}

// タスク行と前後関係（関連 req）を組み立てる
function contextFor(taskId) {
  const tasks = readBoardTable('tasks.md');
  const t = tasks.find((x) => x['ID'] === taskId) || {};
  const dept = t['部署'] || '';
  const reqs = readBoardTable('requests.md');
  const trunc = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
  const related = reqs.filter((r) =>
    r['依頼元'] === dept || r['宛先'] === dept ||
    String(r['内容']).includes(taskId) || String(r['回答・参照']).includes(taskId)
  ).slice(0, 10);
  let ctx = `【タスク】${taskId}　${t['タスク'] || '(タスク表に該当なし)'}\n`
    + `部署: ${dept}／担当: ${t['担当者'] || '-'}／モデル: ${t['モデル'] || '-'}\n`
    + `ステータス: ${t['ステータス'] || '-'}／進捗: ${t['進捗'] || '-'}／優先度: ${t['優先度'] || '-'}\n`
    + `トリガー(堰き止め): ${t['トリガー'] || '-'}／関係部署: ${t['関係部署'] || '-'}／期限: ${t['期限'] || '-'}\n`;
  if (related.length) {
    ctx += `【前後関係＝関連する部署間依頼】\n`;
    for (const r of related) {
      ctx += `- ${r['ID']} ${r['依頼元']}→${r['宛先']}｜${trunc(r['内容'], 110)}｜状態 ${r['ステータス(依頼元)'] || '-'}/${r['ステータス(宛先)'] || '-'}`
        + (r['回答・参照'] && r['回答・参照'] !== '-' ? `｜回答 ${trunc(r['回答・参照'], 110)}` : '') + '\n';
    }
  }
  return { ctx, dept, taskName: t['タスク'] || '' };
}

const PERSONA = [
  'あなたはKIBI（香水ブランド「吉備／機微」の仮想カンパニー）の担当者で、いまから自分が仕上げた成果物をレビュアーである社長に説明するレビュイー（被レビュー者）です。',
  'あなたの責任は、社長が承認/差戻しを判断するのに必要な情報を、先回りして正直に提示することです。誇張・粉飾をせず、事実・判断の根拠・弱点を率直に述べます。分からない点は「未確認」と書きます。',
  '日本語・簡潔体（です/ます禁止、体言止めや「〜した」中心）・markdown。次の見出しを必ずこの順で使い、各2〜5行：',
  '## 結論',
  '## このタスクの位置づけ・前後関係',
  '## やったこと',
  '## 主要な判断と根拠',
  '## 留意点・残課題・リスク',
  '## レビュアーへのお願い',
  '特記：成果物がコードや設定ファイルのときは、「結論」で**何をするためのコード/設定か（目的）**を一言で述べ、「やったこと」で主な動作・構成・他ファイルやAPIとの連携を、「主要な判断と根拠」で設計上の選択を説明する。レビュアーがコードでなくとも要点を掴めるように、専門用語は噛み砕く。',
  '前置き・自己紹介・締めの定型文は書かない。タスク文脈と成果物本文だけを根拠にする。',
].join('\n');

async function callOllama(prompt) {
  const res = await fetch(API + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { temperature: 0.25, num_ctx: 8192 } }),
    signal: AbortSignal.timeout(240000),
  });
  if (!res.ok) throw new Error('Ollama HTTP ' + res.status);
  return (await res.json()).response.trim();
}

function cachePathFor(taskId, abs) {
  return path.join(OUT, `${taskId}__${path.basename(abs)}.md`);
}

// 成果物1件のレビュー資料を生成（キャッシュ有効なら再利用）。
// 戻り値: { doc, cached, cacheFile, skipped, reason }
async function genReviewDoc(taskId, rel, opts = {}) {
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) || abs.includes('_Records')) return { skipped: true, reason: '保護領域/社外パス' };
  if (!fs.existsSync(abs)) return { skipped: true, reason: 'ファイル不在' };
  if (!isTextFile(abs)) return { skipped: true, reason: 'テキストでない（バイナリ）' };
  const buf = fs.readFileSync(abs);

  const { ctx, dept, taskName } = contextFor(taskId);
  const fileSha = crypto.createHash('sha256').update(buf).digest('hex');
  const ctxSha = crypto.createHash('sha256').update(ctx).digest('hex').slice(0, 12);
  const cacheFile = cachePathFor(taskId, abs);

  // キャッシュ無効化は「成果物本文の変更時のみ」（ctxshaは記録のみ）。
  // ＝依頼ボードの更新で要約が再生成され続ける事故を防ぐ。成果物が変われば再生成。
  if (!opts.force && fs.existsSync(cacheFile)) {
    const raw = fs.readFileSync(cacheFile, 'utf8');
    const m = raw.match(/^<!--\s*sha:([0-9a-f]+)/);
    if (m && m[1] === fileSha) {
      return { doc: raw.replace(/^<!--[^>]*-->\n?/, '').trim(), cached: true, cacheFile };
    }
  }

  const ext = path.extname(abs).toLowerCase();
  const isCode = !['.md', '.markdown', '.txt', ''].includes(ext);
  const full = buf.toString('utf8');
  const fed = full.length > FEED_MAX ? full.slice(0, FEED_MAX) + '\n…（以下省略・全文はパス参照）' : full;
  const kind = isCode ? `成果物（コード/設定・${ext}）` : '成果物本文';
  const prompt = `${PERSONA}\n\n# あなたの所属\n${dept}（担当として本成果物に責任を持つ）\n\n# タスク文脈\n${ctx}\n\n# ${kind}（${rel}）\n${fed}`;
  const doc = await callOllama(prompt);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(cacheFile, `<!-- sha:${fileSha} ctxsha:${ctxSha} source:${rel} model:${MODEL} task:${taskName} -->\n${doc}\n`);
  return { doc, cached: false, cacheFile };
}

// 社長コメント（原文）を受けて、担当部署（レビュイー）がどう対応するかの「対応方針」を生成。
// ＝差戻し/承認後のフローを言語化し、その後の処理に繋げる。Claude が組んだ枠の中で Ollama が応答する。
async function genResponsePlan(taskId, rel, verdict, presidentNote) {
  const abs = path.resolve(ROOT, rel);
  let content = '';
  if (abs.startsWith(ROOT + path.sep) && !abs.includes('_Records') && fs.existsSync(abs) && isTextFile(abs)) {
    content = fs.readFileSync(abs, 'utf8').slice(0, 12000);
  }
  const { ctx, dept } = contextFor(taskId);
  const guide = verdict === '承認'
    ? '承認されたので、コメントの指摘を反映してから完了化する段取りと、関係部署への申し送りを書く。'
    : '差し戻されたので、修正方針（何をどう直すか）と、再提出（成果物を更新→自動で再レビューに回る）までの段取りを書く。';
  const prompt = `あなたはKIBI ${dept} の担当者（レビュイー）。社長（レビュアー）から判定「${verdict}」とともに次のコメントが付いた。\n`
    + `社長コメント:「${presidentNote}」\n`
    + `このコメントを受けて、担当としてどう対応するかを日本語・簡潔体で3〜5行、具体的に述べる。${guide}`
    + `前置き・復唱・締めの定型文は書かない。対応内容のみ。\n\n# タスク文脈\n${ctx}\n\n# 成果物（${rel}）\n${content}`;
  return await callOllama(prompt);
}

// 成果物のレビュー資料が「現行（成果物SHA一致のキャッシュあり）」か（Ollama非実行・高速）
function isCurrent(taskId, rel) {
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) || abs.includes('_Records')) return true; // 対象外＝生成不要
  if (!fs.existsSync(abs) || !isTextFile(abs)) return true; // 不在/バイナリ＝生成不要
  const cacheFile = cachePathFor(taskId, abs);
  if (!fs.existsSync(cacheFile)) return false;
  const m = fs.readFileSync(cacheFile, 'utf8').match(/^<!--\s*sha:([0-9a-f]+)/);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  return !!(m && m[1] === sha);
}

// ---- 判断(jdg)＝レビューと同一扱い：論点整理ブリーフ ----
function listJudgments() {
  return readBoardTable('judgments.md').map((r) => ({
    id: String(r['ID'] || '').trim(), dept: String(r['部署'] || '').trim(),
    topic: String(r['内容'] || '').trim(), background: String(r['背景'] || '').trim(), due: String(r['期限'] || '').trim(),
  })).filter((j) => j.id);
}
function refPathIn(text) {
  const m = String(text || '').replace(/`/g, '').match(/([A-Za-z0-9_][A-Za-z0-9_./\- ]*\.(?:md|txt))/);
  if (!m) return null;
  const rel = m[1].trim();
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) || abs.includes('_Records') || !fs.existsSync(abs) || !isTextFile(abs)) return null;
  return { rel, abs };
}
function judgeCachePath(id) { return path.join(OUT, `${id}__judge.md`); }
function judgeSha(j) {
  const ref = refPathIn(j.background + ' ' + j.topic);
  const refContent = ref ? fs.readFileSync(ref.abs, 'utf8').slice(0, FEED_MAX) : '';
  return crypto.createHash('sha256').update(j.topic + ' ' + j.background + ' ' + refContent).digest('hex');
}
async function genJudgeBrief(j, opts = {}) {
  const sha = judgeSha(j);
  const cacheFile = judgeCachePath(j.id);
  if (!opts.force && fs.existsSync(cacheFile)) {
    const raw = fs.readFileSync(cacheFile, 'utf8');
    const m = raw.match(/^<!--\s*sha:([0-9a-f]+)/);
    if (m && m[1] === sha) return { doc: raw.replace(/^<!--[^>]*-->\n?/, '').trim(), cached: true, cacheFile };
  }
  const ref = refPathIn(j.background + ' ' + j.topic);
  const refText = ref ? fs.readFileSync(ref.abs, 'utf8').slice(0, FEED_MAX) : '';
  const prompt = `あなたはKIBI ${j.dept} の担当者（レビュイー）。社長（レビュアー）に判断を仰ぐ案件の論点整理を書く。`
    + `日本語・簡潔体・markdown。次の見出しを必ずこの順で、各2〜5行：\n## 結論（推奨）\n## 論点・背景\n## 選択肢（各メリット・デメリット）\n## 推奨と根拠\n## 社長に決めてほしい点\n`
    + `誇張せず事実に基づく。前置き・復唱・締めの定型文は書かない。\n\n# 案件\n${j.id}：${j.topic}\n\n# 背景\n${j.background}\n`
    + (refText ? `\n# 参照資料（${ref.rel}）\n${refText}` : '');
  const doc = await callOllama(prompt);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(cacheFile, `<!-- sha:${sha} jdg:${j.id} model:${MODEL} -->\n${doc}\n`);
  return { doc, cached: false, cacheFile };
}
function judgeIsCurrent(j) {
  const cacheFile = judgeCachePath(j.id);
  if (!fs.existsSync(cacheFile)) return false;
  const m = fs.readFileSync(cacheFile, 'utf8').match(/^<!--\s*sha:([0-9a-f]+)/);
  return !!(m && m[1] === judgeSha(j));
}

// まだ生成されていない成果物＋判断の一覧（自動生成の対象検出用）
function missing() {
  const d = listDeliverables().filter((x) => !isCurrent(x.taskId, x.rel)).map((x) => ({ type: 'deliverable', ...x }));
  const j = listJudgments().filter((x) => !judgeIsCurrent(x)).map((x) => ({ type: 'judge', ...x }));
  return d.concat(j);
}

module.exports = { listDeliverables, listJudgments, genReviewDoc, genResponsePlan, genJudgeBrief, cachePathFor, judgeCachePath, refPathIn, isCurrent, missing, OUT, MODEL };
