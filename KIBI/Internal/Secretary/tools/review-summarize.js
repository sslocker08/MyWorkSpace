#!/usr/bin/env node
// KIBI レビュー資料 一括生成（ローカルOllama・Claudeトークン不使用）
// 仕様正本: Secretary/rules/review-gate.md §7。生成ロジックは review-core.js。
// 使い方:
//   node Secretary/tools/review-summarize.js            … 全成果物のレビュー資料を生成（キャッシュ済はスキップ）
//   node Secretary/tools/review-summarize.js <taskId>   … 該当タスクの成果物のみ
//   node Secretary/tools/review-summarize.js <taskId> <path>  … 1件のみ（serve.js が内部利用）
//   FORCE=1 を付けるとキャッシュ無視で再生成。
// Ollama 不在・失敗時は当該1件をスキップ（build は冒頭抜粋にフォールバック）。

'use strict';
const core = require('./review-core');

(async () => {
  const argId = process.argv[2];
  const argPath = process.argv[3];
  const force = process.env.FORCE === '1';

  let made = 0, cached = 0, skipped = 0, failed = 0;

  // 成果物（レビュー用）
  let dels = core.listDeliverables();
  if (argId) dels = dels.filter((t) => t.taskId === argId && (!argPath || t.rel === argPath));
  for (const { taskId, rel } of dels) {
    try {
      const r = await core.genReviewDoc(taskId, rel, { force });
      if (r.skipped) { skipped++; continue; }
      if (r.cached) { cached++; console.log(`[キャッシュ] ${taskId} ← ${rel}`); }
      else { made++; console.log(`[生成] ${taskId} ← ${rel}`); }
    } catch (e) { failed++; console.error(`[失敗] ${taskId} ← ${rel}: ${e.message}`); }
  }

  // 判断(jdg) 論点整理
  let jdgs = core.listJudgments();
  if (argId) jdgs = jdgs.filter((j) => j.id === argId);
  for (const j of jdgs) {
    try {
      const r = await core.genJudgeBrief(j, { force });
      if (r.cached) { cached++; console.log(`[キャッシュ] ${j.id} 論点整理`); }
      else { made++; console.log(`[生成] ${j.id} 論点整理`); }
    } catch (e) { failed++; console.error(`[失敗] ${j.id}: ${e.message}`); }
  }

  console.log(`完了: 生成${made}・キャッシュ${cached}・スキップ${skipped}・失敗${failed} ｜ モデル ${core.MODEL}`);
  console.log('反映: node Secretary/tools/build.js を実行（またはダッシュボード再読込）');
})();
