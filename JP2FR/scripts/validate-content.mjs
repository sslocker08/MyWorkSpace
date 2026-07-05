#!/usr/bin/env node
// Validates src/content/{founders,products}/*.json and src/i18n/*.json
// without any dependencies (plain fs/path). Run via `pnpm validate` or
// `node scripts/validate-content.mjs`.
//
// Checks:
//   (a) every product.founder references an existing founder slug
//   (b) slug uniqueness within founders, and within products
//   (c) filename (minus .json) === the entry's `slug` field
//   (d) price.amount is a positive integer
//   (e) the 3 i18n catalogs (fr/en/ja) have identical deep key sets
//   (f) every product has >= 1 image
//
// Exits 1 with readable errors on any failure, 0 with a summary of
// counts otherwise. Never throws on missing directories/files — those
// are reported as errors instead.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

const FOUNDERS_DIR = path.join(rootDir, 'src', 'content', 'founders');
const PRODUCTS_DIR = path.join(rootDir, 'src', 'content', 'products');
const I18N_DIR = path.join(rootDir, 'src', 'i18n');

const VALID_CRAFTS = ['ceramique', 'textile', 'illustration', 'objets', 'mode'];
const VALID_CATEGORIES = ['ceramique', 'textile', 'illustration', 'objets', 'mode'];

const errors = [];

function readJsonEntries(dir, label) {
  if (!existsSync(dir)) {
    errors.push(`[${label}] directory does not exist: ${path.relative(rootDir, dir)}`);
    return [];
  }

  let filenames;
  try {
    filenames = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch (err) {
    errors.push(`[${label}] could not read directory ${path.relative(rootDir, dir)}: ${err.message}`);
    return [];
  }

  const entries = [];
  for (const filename of filenames) {
    const filePath = path.join(dir, filename);
    const slugFromFilename = filename.slice(0, -'.json'.length);
    let data;
    try {
      data = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (err) {
      errors.push(`[${label}] ${filename}: invalid JSON (${err.message})`);
      continue;
    }
    entries.push({ filename, slugFromFilename, filePath, data });
  }
  return entries;
}

// ---------------------------------------------------------------------
// Founders
// ---------------------------------------------------------------------

const founderEntries = readJsonEntries(FOUNDERS_DIR, 'founders');
const founderSlugs = new Set();
const founderSlugCounts = new Map();

for (const { filename, slugFromFilename, data } of founderEntries) {
  const slug = data.slug;

  if (typeof slug !== 'string' || slug.length === 0) {
    errors.push(`[founders] ${filename}: missing or empty "slug" field`);
    continue;
  }

  if (slug !== slugFromFilename) {
    errors.push(`[founders] ${filename}: filename does not match slug field ("${slug}")`);
  }

  // Validate craft field
  const craft = data.craft;
  if (typeof craft !== 'string' || !VALID_CRAFTS.includes(craft)) {
    errors.push(`[founders] ${filename}: craft must be one of [${VALID_CRAFTS.join(', ')}] (got "${craft}")`);
  }

  founderSlugCounts.set(slug, (founderSlugCounts.get(slug) ?? 0) + 1);
  founderSlugs.add(slug);
}

for (const [slug, count] of founderSlugCounts) {
  if (count > 1) {
    errors.push(`[founders] duplicate slug "${slug}" appears in ${count} files`);
  }
}

// ---------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------

const productEntries = readJsonEntries(PRODUCTS_DIR, 'products');
const productSlugCounts = new Map();
let validProductCount = 0;

for (const { filename, slugFromFilename, data } of productEntries) {
  const slug = data.slug;

  if (typeof slug !== 'string' || slug.length === 0) {
    errors.push(`[products] ${filename}: missing or empty "slug" field`);
    continue;
  }

  if (slug !== slugFromFilename) {
    errors.push(`[products] ${filename}: filename does not match slug field ("${slug}")`);
  }

  productSlugCounts.set(slug, (productSlugCounts.get(slug) ?? 0) + 1);

  // (a) founder reference must exist
  if (typeof data.founder !== 'string' || !founderSlugs.has(data.founder)) {
    errors.push(
      `[products] ${filename}: founder reference "${data.founder}" does not match any founder slug`,
    );
  }

  // Validate category field
  const category = data.category;
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
    errors.push(`[products] ${filename}: category must be one of [${VALID_CATEGORIES.join(', ')}] (got "${category}")`);
  }

  // (d) price.amount must be a positive integer
  const amount = data.price?.amount;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    errors.push(`[products] ${filename}: price.amount must be a positive integer (got ${amount})`);
  }

  // (f) at least one image
  if (!Array.isArray(data.images) || data.images.length === 0) {
    errors.push(`[products] ${filename}: must have at least one entry in "images"`);
  }

  validProductCount += 1;
}

for (const [slug, count] of productSlugCounts) {
  if (count > 1) {
    errors.push(`[products] duplicate slug "${slug}" appears in ${count} files`);
  }
}

// ---------------------------------------------------------------------
// i18n catalogs — identical deep key sets across fr/en/ja
// ---------------------------------------------------------------------

const LOCALES = ['fr', 'en', 'ja'];

function collectKeys(value, prefix, out) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      out.add(prefix);
      return;
    }
    for (const key of keys) {
      collectKeys(value[key], prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.add(prefix);
  }
}

const catalogKeySets = {};

for (const locale of LOCALES) {
  const filePath = path.join(I18N_DIR, `${locale}.json`);
  if (!existsSync(filePath)) {
    errors.push(`[i18n] missing catalog file: ${path.relative(rootDir, filePath)}`);
    catalogKeySets[locale] = new Set();
    continue;
  }
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    const keys = new Set();
    collectKeys(data, '', keys);
    catalogKeySets[locale] = keys;
  } catch (err) {
    errors.push(`[i18n] ${locale}.json: invalid JSON (${err.message})`);
    catalogKeySets[locale] = new Set();
  }
}

const unionKeys = new Set();
for (const locale of LOCALES) {
  for (const key of catalogKeySets[locale]) unionKeys.add(key);
}

for (const locale of LOCALES) {
  const missing = [...unionKeys].filter((key) => !catalogKeySets[locale].has(key)).sort();
  if (missing.length > 0) {
    errors.push(`[i18n] ${locale}.json is missing ${missing.length} key(s): ${missing.join(', ')}`);
  }
}

// ---------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`validate-content: ${errors.length} error(s) found:\n`);
  for (const err of errors) console.error(`  - ${err}`);
  console.error('');
  process.exit(1);
} else {
  console.log('validate-content: OK');
  console.log(`  founders: ${founderEntries.length}`);
  console.log(`  products: ${validProductCount}`);
  console.log(`  i18n keys per locale: ${unionKeys.size}`);
  process.exit(0);
}
