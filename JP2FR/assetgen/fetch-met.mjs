#!/usr/bin/env node
// Sources real public-domain ukiyo-e prints from The Met Open Access API
// (CC0, isPublicDomain===true only) and installs them as site assets.
//
// For each curated item this script:
//   1. Fetches the object record from the Met Collection API.
//   2. Asserts isPublicDomain === true (hard fail otherwise — no silent swap).
//   3. Downloads primaryImage to assetgen/sourced/met-<objectID>.jpg.
//   4. Appends a row to the in-memory ledger (written to assetgen/SOURCES.md).
//   5. Produces the processed, unified-treatment outputs under public/ via sharp.
//
// Usage: node assetgen/fetch-met.mjs
//
// No dependencies beyond global fetch (Node 22) and `sharp`, which is not
// hoisted to a top-level node_modules/sharp by pnpm — resolveSharp() below
// locates it inside node_modules/.pnpm/sharp@*/node_modules/sharp directly.

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------
// Resolve `sharp` from the pnpm store without running `pnpm install`.
// ---------------------------------------------------------------------
async function resolveSharp() {
  const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');
  const entries = readdirSync(pnpmDir).filter((d) => d.startsWith('sharp@'));
  if (entries.length === 0) {
    throw new Error('Could not find a sharp@* package inside node_modules/.pnpm — is sharp installed?');
  }
  // Prefer the plain "sharp@<version>" entry (not a peer-suffixed variant).
  entries.sort((a, b) => a.length - b.length);
  const chosen = entries[0];
  const sharpEntry = path.join(pnpmDir, chosen, 'node_modules', 'sharp', 'lib', 'index.js');
  const mod = await import('file://' + sharpEntry);
  return mod.default;
}

const sharp = await resolveSharp();

// ---------------------------------------------------------------------
// Curation list — verified via the Met Collection API (see assetgen/SOURCES.md
// for the full ledger). objectID is the sole input; everything else is
// fetched live so the ledger always reflects the Met's own metadata.
// ---------------------------------------------------------------------
const CURATION = [
  { slot: 'hero-wave', objectID: 45434 },
  { slot: 'section-bridge', objectID: 36922 },
  { slot: 'section-crane', objectID: 37107 },

  // 15 founder portrait stand-ins — single-figure, portrait-orientation
  // ukiyo-e prints (yakusha-e actor prints + one bijin-ga), one per slug.
  { slot: 'founder:ai-no-tsuki-apparel', objectID: 633299 },
  { slot: 'founder:ai-no-wa-indigo', objectID: 930218 },
  { slot: 'founder:aizome-stencil', objectID: 54824 },
  { slot: 'founder:atelier-tanaka-ceramic', objectID: 56595 },
  { slot: 'founder:hiroto-rag-weaving', objectID: 36816 },
  { slot: 'founder:iida-urushi-lacquer', objectID: 36856 },
  { slot: 'founder:koike-kumihimo', objectID: 56671 },
  { slot: 'founder:komori-illustration', objectID: 36747 },
  { slot: 'founder:matsuda-sashiko', objectID: 36887 },
  { slot: 'founder:nakamura-bamboo', objectID: 36820 },
  { slot: 'founder:studio-kizuki-wood', objectID: 36827 },
  { slot: 'founder:suzuki-glass', objectID: 36840 },
  { slot: 'founder:takeda-washi-paper', objectID: 36764 },
  { slot: 'founder:yamamoto-woodblock', objectID: 36763 },
  { slot: 'founder:yamazaki-gold-kintsugi', objectID: 54871 },
];

const API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const SLEEP_MS = 90;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJsonWithRetry(url, label) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === 2) throw new Error(`${label}: failed after retry (${err.message})`);
      await sleep(300);
    }
  }
}

async function downloadWithRetry(url, destPath, label) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await pipeline(res.body, createWriteStream(destPath));
      return;
    } catch (err) {
      if (attempt === 2) throw new Error(`${label}: download failed after retry (${err.message})`);
      await sleep(300);
    }
  }
}

// ---------------------------------------------------------------------
// Shared, subtle unifying treatment — identical parameters on every output
// so the mixed-source prints read as one consistent set. Kept deliberately
// light: real Met woodblock prints already share a woodblock-era palette,
// so we only nudge saturation down slightly and normalize gamma a touch.
// ---------------------------------------------------------------------
function unify(pipelineInstance) {
  return pipelineInstance.modulate({ saturation: 0.9 }).gamma(1.05);
}

const sourcedDir = path.join(rootDir, 'assetgen', 'sourced');
const heroDir = path.join(rootDir, 'public', 'media', 'hero');
const sectionsDir = path.join(rootDir, 'public', 'img', 'sections');
const foundersRootDir = path.join(rootDir, 'public', 'img', 'founders');
const contentFoundersDir = path.join(rootDir, 'src', 'content', 'founders');

for (const dir of [sourcedDir, heroDir, sectionsDir]) {
  mkdirSync(dir, { recursive: true });
}

const ledger = [];
const todayISO = new Date().toISOString().slice(0, 10);

let totalDownloadedBytes = 0;
const outputSizes = [];

for (const item of CURATION) {
  const { slot, objectID } = item;
  const obj = await fetchJsonWithRetry(`${API_BASE}/objects/${objectID}`, slot);
  await sleep(SLEEP_MS);

  if (obj.isPublicDomain !== true) {
    throw new Error(
      `[${slot}] objectID ${objectID} ("${obj.title}") is NOT public domain (isPublicDomain=${obj.isPublicDomain}). ` +
        `Aborting — replace this curation entry with a verified CC0 object.`,
    );
  }
  if (!obj.primaryImage) {
    throw new Error(`[${slot}] objectID ${objectID} ("${obj.title}") has no primaryImage.`);
  }

  const localRaw = path.join(sourcedDir, `met-${objectID}.jpg`);
  if (!existsSync(localRaw)) {
    await downloadWithRetry(obj.primaryImage, localRaw, slot);
    await sleep(SLEEP_MS);
  }
  const rawBytes = statSync(localRaw).size;
  totalDownloadedBytes += rawBytes;

  ledger.push({
    slot,
    objectID,
    title: obj.title,
    artist: obj.artistDisplayName || '(unattributed)',
    date: obj.objectDate,
    objectURL: obj.objectURL,
    localRaw: path.relative(rootDir, localRaw),
  });

  console.log(`[ok] ${slot} <- Met #${objectID} "${obj.title}" (${obj.artistDisplayName || 'unattributed'}, ${obj.objectDate})`);

  // -------------------------------------------------------------
  // Processing per slot type
  // -------------------------------------------------------------
  if (slot === 'hero-wave') {
    // Quality tuned against target budgets (hero-full <=500KB, poster <=80KB) —
    // measured empirically on the actual downloaded Great Wave source.
    const full = unify(sharp(localRaw).resize({ width: 2000 })).webp({ quality: 75 });
    const outFull = path.join(heroDir, 'wave-full.webp');
    await full.toFile(outFull);
    outputSizes.push([path.relative(rootDir, outFull), statSync(outFull).size]);

    const w1200 = unify(sharp(localRaw).resize({ width: 1200 })).webp({ quality: 82 });
    const out1200 = path.join(heroDir, 'wave-1200.webp');
    await w1200.toFile(out1200);
    outputSizes.push([path.relative(rootDir, out1200), statSync(out1200).size]);

    const poster = unify(sharp(localRaw).resize({ width: 1200 })).avif({ quality: 40 });
    const outPoster = path.join(heroDir, 'poster.avif');
    await poster.toFile(outPoster);
    outputSizes.push([path.relative(rootDir, outPoster), statSync(outPoster).size]);
  } else if (slot === 'section-bridge' || slot === 'section-crane') {
    const name = slot === 'section-bridge' ? 'bridge.webp' : 'crane.webp';
    const out = path.join(sectionsDir, name);
    const img = unify(sharp(localRaw).resize({ width: 1600 })).webp({ quality: 80 });
    await img.toFile(out);
    outputSizes.push([path.relative(rootDir, out), statSync(out).size]);
  } else if (slot.startsWith('founder:')) {
    const slug = slot.slice('founder:'.length);
    const founderDir = path.join(foundersRootDir, slug);
    mkdirSync(founderDir, { recursive: true });
    const out = path.join(founderDir, 'portrait.webp');
    // q60 keeps every portrait in the curation under the 120KB budget
    // (measured max 113.4KB across all 15 sourced prints at this setting).
    const img = unify(
      sharp(localRaw).resize(800, 1000, { fit: 'cover', position: sharp.strategy.attention }),
    ).webp({ quality: 60 });
    await img.toFile(out);
    outputSizes.push([path.relative(rootDir, out), statSync(out).size]);

    // Update src/content/founders/<slug>.json — ONLY the "portrait" field.
    const jsonPath = path.join(contentFoundersDir, `${slug}.json`);
    if (!existsSync(jsonPath)) {
      throw new Error(`[${slot}] expected founder content file not found: ${path.relative(rootDir, jsonPath)}`);
    }
    const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    data.portrait = `/img/founders/${slug}/portrait.webp`;
    writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  }
}

// ---------------------------------------------------------------------
// SOURCES.md ledger
// ---------------------------------------------------------------------
const ledgerLines = [];
ledgerLines.push('# Asset sourcing ledger — The Met Open Access (CC0)');
ledgerLines.push('');
ledgerLines.push(
  `All items below were verified against the Met Collection API on ${todayISO} with \`isPublicDomain === true\`. ` +
    'Source: The Metropolitan Museum of Art, Open Access (CC0 1.0 Universal). No login/API key required.',
);
ledgerLines.push('');
ledgerLines.push('| Slot | Met objectID | Title | Artist | Date | License | Object URL | Local files |');
ledgerLines.push('|---|---|---|---|---|---|---|---|');
for (const row of ledger) {
  const localFiles = [row.localRaw];
  if (row.slot === 'hero-wave') {
    localFiles.push('public/media/hero/wave-full.webp', 'public/media/hero/wave-1200.webp', 'public/media/hero/poster.avif');
  } else if (row.slot === 'section-bridge') {
    localFiles.push('public/img/sections/bridge.webp');
  } else if (row.slot === 'section-crane') {
    localFiles.push('public/img/sections/crane.webp');
  } else if (row.slot.startsWith('founder:')) {
    const slug = row.slot.slice('founder:'.length);
    localFiles.push(`public/img/founders/${slug}/portrait.webp`);
  }
  ledgerLines.push(
    `| ${row.slot} | ${row.objectID} | ${row.title.replace(/\|/g, '\\|')} | ${row.artist} | ${row.date || ''} | CC0 (isPublicDomain=true verified ${todayISO}) | ${row.objectURL} | ${localFiles.map((f) => `\`${f}\``).join(', ')} |`,
  );
}
ledgerLines.push('');
ledgerLines.push(
  '> **Note:** the 15 founder portraits above are real public-domain ukiyo-e prints used as visual ' +
    'stand-ins only. They do not depict the actual founders. Replace with real founder photographs ' +
    'as they become available — a manual swap only requires updating the `portrait` field in each ' +
    '`src/content/founders/<slug>.json`; re-running this script is not required.',
);
ledgerLines.push('');
ledgerLines.push(
  `Total downloaded (raw source images): ${(totalDownloadedBytes / (1024 * 1024)).toFixed(2)} MB across ${ledger.length} objects.`,
);
ledgerLines.push('');
ledgerLines.push('## Processed output sizes');
ledgerLines.push('');
ledgerLines.push('| File | Size (KB) |');
ledgerLines.push('|---|---|');
for (const [file, bytes] of outputSizes) {
  ledgerLines.push(`| \`${file}\` | ${(bytes / 1024).toFixed(1)} |`);
}
ledgerLines.push('');

writeFileSync(path.join(rootDir, 'assetgen', 'SOURCES.md'), ledgerLines.join('\n'));

console.log('');
console.log(`Downloaded ${(totalDownloadedBytes / (1024 * 1024)).toFixed(2)} MB of raw source images (${ledger.length} objects).`);
console.log('Wrote assetgen/SOURCES.md');
