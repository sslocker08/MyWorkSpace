#!/usr/bin/env node
// チャネル別売上集計スクリプト（個人情報の防火壁）
// 生データ（顧客フィールド customer）の値は一切読まない・出力しない。
// スキーマ（フィールド名）と、カテゴリ／チャネル／製品別の件数・本数の集計値のみを出す。
// 金額は販売記録に価格フィールドが無いため算出しない（単価マスタが別途必要）。
// 使い方: node _aggregate.js <records.json>

const fs = require('fs');
const src = process.argv[2];
if (!src) { console.error('usage: node _aggregate.js <records.json>'); process.exit(1); }
const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.records || raw.sales || raw.data;
if (!Array.isArray(rows)) { console.error('records array not found'); process.exit(2); }

// category → チャネル区分（sales-summary/README.md の定義に従う）
const CHANNEL = {
  '店頭売り上げ': '香福論',
  'リモオーダー': '香福論',
  '直販':        '直販',
  '公式通販':    '公式通販EC',
  'テスター':    'テスター(無償・売上外)',
};

const byCat = {};      // category    -> {records, units}
const byChannel = {};  // channel     -> {records, units}
const byProduct = {};  // product_id  -> {units}
let totalRecords = 0, totalUnits = 0;
let minDate = null, maxDate = null;

for (const r of rows) {
  if (!r || typeof r !== 'object') continue;       // customer フィールドは参照しない
  totalRecords++;
  const cat = (r.category ?? '(不明)').toString();
  const ch  = CHANNEL[cat] ?? '(区分未定義)';
  let units = 0;
  if (Array.isArray(r.items)) {
    for (const it of r.items) {
      const q = Number(it.quantity) || 0;          // quantity / product_id のみ使用（name値は読まない）
      units += q;
      const pid = (it.product_id ?? '(不明)').toString();
      (byProduct[pid] ??= { units: 0 }).units += q;
    }
  }
  totalUnits += units;
  (byCat[cat] ??= { records: 0, units: 0 });
  byCat[cat].records++; byCat[cat].units += units;
  (byChannel[ch] ??= { records: 0, units: 0 });
  byChannel[ch].records++; byChannel[ch].units += units;

  const d = r.date ?? r.created_at;
  if (d) { const s = String(d).slice(0,10); if (!minDate||s<minDate) minDate=s; if (!maxDate||s>maxDate) maxDate=s; }
}

const out = {
  source_file: src.split('/').pop(),
  generated_from: 'record_count=' + totalRecords,
  date_range: { min: minDate, max: maxDate },
  note: '金額は販売記録に価格フィールドが無いため未算出。単価マスタ整備後に再集計する。',
  totals: { records: totalRecords, units: totalUnits },
  by_channel: byChannel,
  by_category: byCat,
  by_product_id: byProduct,
};
console.log(JSON.stringify(out, null, 2));
