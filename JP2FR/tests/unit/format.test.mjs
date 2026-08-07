// Plain node:test coverage (no TS execution, no external deps).
//
// src/lib/format.ts and src/lib/i18n.ts are thin wrappers around Intl
// APIs, so we exercise the underlying Intl behavior directly here
// (mirrors what formatPrice/useT do) rather than importing TypeScript
// into a JS-only test runner. Separately, we spawn the real
// scripts/validate-content.mjs against the actual content directory to
// make sure it never crashes and always reports a readable result.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, '..', '..');

// Intl formatting can insert a narrow no-break space (U+202F) or a
// regular no-break space (U+00A0) as the thousands separator / before
// the currency symbol depending on ICU data version — normalize all
// whitespace variants to a plain space before asserting.
function normalizeSpaces(str) {
  return str.replace(/[  \s]/g, ' ');
}

test('formatPrice-equivalent Intl formatting for fr-FR renders "1 234,50 €"', () => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(123450 / 100);

  const normalized = normalizeSpaces(formatted);
  assert.ok(normalized.includes('1 234,50'), `expected "1 234,50" in "${normalized}"`);
  assert.ok(formatted.includes('€'), `expected "€" in "${formatted}"`);
});

test('formatPrice-equivalent Intl formatting for en-IE and ja-JP both include the euro sign', () => {
  const en = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(42);
  const ja = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'EUR' }).format(42);
  assert.ok(en.includes('€'));
  assert.ok(ja.includes('€'));
});

test('Intl.PluralRules("fr") resolves 0 and 1 to "one", 2+ to "other" (mirrors useT plural resolution)', () => {
  const rules = new Intl.PluralRules('fr');
  assert.equal(rules.select(0), 'one');
  assert.equal(rules.select(1), 'one');
  assert.equal(rules.select(2), 'other');
  assert.equal(rules.select(5), 'other');
});

test('scripts/validate-content.mjs runs against the real content directory without crashing', () => {
  const result = spawnSync(process.execPath, [path.join(rootDir, 'scripts', 'validate-content.mjs')], {
    cwd: rootDir,
    encoding: 'utf-8',
  });

  // Never crash with a signal (segfault, uncaught throw producing a
  // non-numeric/null code, etc.) — it must always terminate with a
  // clean 0 (all valid) or 1 (validation errors reported) exit code.
  assert.equal(result.signal, null, `process was killed by signal ${result.signal}`);
  assert.ok(
    result.status === 0 || result.status === 1,
    `expected exit code 0 or 1, got ${result.status}. stderr:\n${result.stderr}`,
  );

  const output = result.stdout + result.stderr;
  if (result.status === 0) {
    assert.ok(output.includes('validate-content: OK'), output);
  } else {
    assert.ok(output.includes('error(s) found'), output);
  }
});
