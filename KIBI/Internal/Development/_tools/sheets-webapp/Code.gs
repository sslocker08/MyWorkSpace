// ========================================
// KIBI — 試作ログ転記 Web API（Google Apps Script）
// kibi.fragrance@gmail.com アカウントで設置する。
// Claude が POST で呼び出し、試作シートに処方・実測・評価を追記する。
// 読み書きは「列の追記」「指定セルの記入」のみ。既存データの削除・上書きはしない。
// ========================================

// 設置時に必ず変更すること（長いランダム文字列に）
const TOKEN = 'CHANGE_ME_TO_RANDOM_STRING';

// 製品名 → スプレッドシートID
const FILES = {
  'SOU-ODORI': '1J5UEo7-fNUrNgdn-BPEF-94RAIBHzV87pDZC5RFAqB0',
  'SEALING NIGHT': '1es2jbcyKDEiuQ60K__D0gWtHdGOduurdP3XxJ_UTF7U',
  'PASSED DOWN': '1SaKkj1jJ74N97A7NzvAhvdMKRa0rYnM9ffsQqJldL2A',
  'HOUJI-CHA': '1ANDE21y1a9uoeH5XlQMECP8UmOweiGf0j4W5v_uezEg',
  'PEACH TEA': '1nn6BC9a55RYb4ss_-yu3WVG0FrtSXqiok7eGOwiLVNQ',
};

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.token !== TOKEN) throw new Error('認証エラー');
    var sheet = getSheet(req.product, req.sheetName);

    switch (req.action) {
      case 'inspect':      out = inspect(sheet); break;
      case 'add_trial':    out = addTrial(sheet, req); break;
      case 'set_formula':  out = setFormula(sheet, req); break;
      case 'set_measured': out = setMeasured(sheet, req); break;
      case 'set_note':     out = setNote(sheet, req); break;
      case 'get_trial':    out = getTrial(sheet, req); break;
      default: throw new Error('不明なaction: ' + req.action);
    }
    out.ok = true;
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(product, sheetName) {
  var id = FILES[product];
  if (!id) throw new Error('不明な製品: ' + product);
  var ss = SpreadsheetApp.openById(id);
  if (sheetName) {
    var sh = ss.getSheetByName(sheetName);
    if (!sh) throw new Error('シートが見つかりません: ' + sheetName +
      '（存在するシート: ' + ss.getSheets().map(function (s) { return s.getName(); }).join(', ') + '）');
    return sh;
  }
  return ss.getSheets()[ss.getSheets().length - 1]; // 省略時は最後のタブ（最新ラウンド）
}

// 構造検出: A列の通し番号(No.)から香料ブロックを特定する
function findStructure(sheet) {
  var colA = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
  var first = -1, last = -1;
  for (var r = 0; r < colA.length; r++) {
    var v = colA[r][0];
    if (typeof v === 'number' && v > 0) {
      if (first === -1) first = r + 1;
      last = r + 1;
    }
  }
  if (first === -1) throw new Error('香料No.列が見つかりません');
  var headerRows = first - 1;

  // ヘッダー様式の検出。2様式に対応する:
  //  - 'single': 1行に「01/処方」「01/実測(g)」と複合表記（SOU-ODORI等）
  //  - 'multi' : 試作名の行（結合セル）の下に「処方」「実測(g)」のサブ見出し行（HOUJI-CHA Hay-Core等）
  var hdr = sheet.getRange(1, 1, headerRows, sheet.getLastColumn()).getDisplayValues();
  var style = 'single', subRow = headerRows, nameRow = headerRows;
  for (var r = 0; r < headerRows; r++) {
    for (var c = 0; c < hdr[r].length; c++) {
      if (String(hdr[r][c]).trim() === '処方') {   // 完全一致 = multi様式のサブ見出し
        style = 'multi'; subRow = r + 1; nameRow = Math.max(1, r); // 名前は1つ上の行
      }
    }
  }

  return {
    headerRows: headerRows,   // 1〜headerRows がヘッダー
    headerStyle: style,       // 'single' | 'multi'
    subHeaderRow: subRow,     // 「処方/実測(g)」見出しのある行
    nameRow: nameRow,         // 試作名のある行
    firstDataRow: first,
    lastDataRow: last,
    totalsRow: last + 1,
    notesRow: last + 2,
  };
}

// 試作名でヘッダーを検索し、処方列の番号を返す（両様式対応）
function findTrialColumn(sheet, st, trialName) {
  var want = String(trialName).trim();
  for (var r = 1; r <= st.headerRows; r++) {
    var row = sheet.getRange(r, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    for (var c = 0; c < row.length; c++) {
      var cell = String(row[c]).trim();
      // single様式: 「<名前>/処方」、multi様式: 「<名前>」の完全一致
      if (cell === want || cell === want + '/処方') return c + 1;
    }
  }
  throw new Error('試作名が見つかりません: ' + trialName);
}

// No.→行番号のマップ
function noToRowMap(sheet, st) {
  var vals = sheet.getRange(st.firstDataRow, 1, st.lastDataRow - st.firstDataRow + 1, 1).getValues();
  var map = {};
  vals.forEach(function (v, i) { if (v[0]) map[v[0]] = st.firstDataRow + i; });
  return map;
}

// --- inspect: 構造とヘッダーを返す（書き込み前の検証用） ---
function inspect(sheet) {
  var st = findStructure(sheet);
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, Math.max(st.headerRows, 1), lastCol).getDisplayValues();
  return {
    sheetName: sheet.getName(),
    allSheets: sheet.getParent().getSheets().map(function (s) { return s.getName(); }),
    structure: st,
    lastColumn: lastCol,
    headers: headers,
    ingredientCount: st.lastDataRow - st.firstDataRow + 1,
  };
}

// --- add_trial: 新しい試作列ペア（処方・実測）を追加し、処方値を記入 ---
// req: { trialName, rows: [{no, value}], note? }
function addTrial(sheet, req) {
  var st = findStructure(sheet);
  // 既存の同名試作があればエラー（誤上書き防止）
  try { findTrialColumn(sheet, st, req.trialName); throw new Error('DUP'); }
  catch (err) { if (String(err).indexOf('DUP') !== -1) throw new Error('同名の試作が既に存在します: ' + req.trialName); }

  var col = sheet.getLastColumn() + 1; // 処方列
  // ヘッダーは既存様式に合わせて配置する（findStructureが検出した行・様式を使用）
  if (st.headerStyle === 'multi') {
    // 試作名は nameRow に結合セルで、サブ見出しは subHeaderRow に
    sheet.getRange(st.nameRow, col, 1, 2).merge().setValue(req.trialName).setHorizontalAlignment('center');
    sheet.getRange(st.subHeaderRow, col).setValue('処方');
    sheet.getRange(st.subHeaderRow, col + 1).setValue('実測(g)');
  } else {
    // single様式: 複合見出しを subHeaderRow（=最終ヘッダー行）に
    sheet.getRange(st.subHeaderRow, col).setValue(req.trialName + '/処方');
    sheet.getRange(st.subHeaderRow, col + 1).setValue(req.trialName + '/実測(g)');
  }

  var map = noToRowMap(sheet, st);
  var written = [], missing = [];
  (req.rows || []).forEach(function (item) {
    var row = map[item.no];
    if (!row) { missing.push(item.no); return; }
    sheet.getRange(row, col).setValue(item.value);
    written.push(item.no);
  });

  // 合計行にSUM式
  var a1 = function (c, r) { return sheet.getRange(r, c).getA1Notation(); };
  sheet.getRange(st.totalsRow, col).setFormula('=SUM(' +
    a1(col, st.firstDataRow) + ':' + a1(col, st.lastDataRow) + ')');
  sheet.getRange(st.totalsRow, col + 1).setFormula('=SUM(' +
    a1(col + 1, st.firstDataRow) + ':' + a1(col + 1, st.lastDataRow) + ')');

  if (req.note) sheet.getRange(st.notesRow, col).setValue(req.note);
  return { trialName: req.trialName, column: col, written: written, missing: missing };
}

// --- set_formula: 既存の空試作列（見出しのみ作成済み #1〜）に処方値を記入 ---
// 開発タブ（1st）はあらかじめ #1〜#14 の列が用意されているため、add_trialではなくこちらを使う。
// req: { trialName, rows: [{no, value}], note?, overwrite? }
function setFormula(sheet, req) {
  var st = findStructure(sheet);
  var col = findTrialColumn(sheet, st, req.trialName); // 既存の処方列
  var n = st.lastDataRow - st.firstDataRow + 1;

  // 誤上書き防止: 既に処方値が入っている場合は overwrite:true がない限り拒否
  var existing = sheet.getRange(st.firstDataRow, col, n, 1).getValues();
  var filled = existing.filter(function (v) { return v[0] !== '' && v[0] !== null; }).length;
  if (filled > 0 && !req.overwrite) {
    throw new Error(req.trialName + ' には既に' + filled + '件の処方値が入っています。上書きするには overwrite:true を指定してください。');
  }

  var map = noToRowMap(sheet, st);
  var written = [], missing = [];
  (req.rows || []).forEach(function (item) {
    var row = map[item.no];
    if (!row) { missing.push(item.no); return; }
    sheet.getRange(row, col).setValue(item.value);
    written.push(item.no);
  });

  // 合計行に処方・実測のSUM式を設定（既存なら維持される＝同じ式で上書き）
  var a1 = function (c, r) { return sheet.getRange(r, c).getA1Notation(); };
  sheet.getRange(st.totalsRow, col).setFormula('=SUM(' +
    a1(col, st.firstDataRow) + ':' + a1(col, st.lastDataRow) + ')');
  sheet.getRange(st.totalsRow, col + 1).setFormula('=SUM(' +
    a1(col + 1, st.firstDataRow) + ':' + a1(col + 1, st.lastDataRow) + ')');

  if (req.note) sheet.getRange(st.notesRow, col).setValue(req.note);
  var totalParts = sheet.getRange(st.totalsRow, col).getValue();
  return { trialName: req.trialName, column: col, written: written, missing: missing, totalParts: totalParts };
}

// --- set_measured: 実測(g)を記入 ---
// req: { trialName, entries: [{no, grams}] }
function setMeasured(sheet, req) {
  var st = findStructure(sheet);
  var col = findTrialColumn(sheet, st, req.trialName) + 1; // 実測列 = 処方列+1
  var map = noToRowMap(sheet, st);
  var written = [], missing = [];
  (req.entries || []).forEach(function (item) {
    var row = map[item.no];
    if (!row) { missing.push(item.no); return; }
    sheet.getRange(row, col).setValue(item.grams);
    written.push(item.no);
  });
  return { trialName: req.trialName, written: written, missing: missing };
}

// --- set_note: 官能評価メモを記入 ---
// req: { trialName, note }
function setNote(sheet, req) {
  var st = findStructure(sheet);
  var col = findTrialColumn(sheet, st, req.trialName);
  var cell = sheet.getRange(st.notesRow, col);
  var existing = cell.getValue();
  cell.setValue(existing ? existing + '\n' + req.note : req.note); // 追記（上書きしない）
  return { trialName: req.trialName, notesRow: st.notesRow };
}

// --- get_trial: 試作列の読み戻し（検証用） ---
// req: { trialName }
function getTrial(sheet, req) {
  var st = findStructure(sheet);
  var col = findTrialColumn(sheet, st, req.trialName);
  var n = st.lastDataRow - st.firstDataRow + 1;
  var nos = sheet.getRange(st.firstDataRow, 1, n, 2).getValues();
  var vals = sheet.getRange(st.firstDataRow, col, n, 2).getValues();
  var rows = [];
  for (var i = 0; i < n; i++) {
    if (vals[i][0] !== '' || vals[i][1] !== '') {
      rows.push({ no: nos[i][0], name: nos[i][1], value: vals[i][0], grams: vals[i][1] });
    }
  }
  var totals = sheet.getRange(st.totalsRow, col, 1, 2).getValues()[0];
  var note = sheet.getRange(st.notesRow, col).getValue();
  return { trialName: req.trialName, rows: rows, totals: totals, note: note };
}
