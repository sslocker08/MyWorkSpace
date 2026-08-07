#!/usr/bin/env node
// Derives the v2 "夜の版元" (night-edition) assets on top of the already
// -sourced Met Open Access images. Three jobs:
//   1. 藍デュオトーン (indigo duotone) portraits for all 15 founder slugs —
//      derived from the already-processed public/img/founders/<slug>/portrait.webp.
//   2. Intro actor — a genuine ōkubi-e (large bust) Sharaku print, kept full
//      color, for the intro's kon-masked composite.
//   3. Hero dark grade — a darkened regrade of the Nihonbashi bridge print
//      for white-text-overlay hero use.
//
// Reuses the sharp-resolution pattern from assetgen/fetch-met.mjs (sharp is
// not hoisted to a top-level node_modules/sharp by pnpm).
//
// Usage: node assetgen/derive-v2-assets.mjs [--force]

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
} from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const FORCE = process.argv.includes('--force');

// ---------------------------------------------------------------------
// Resolve `sharp` from the pnpm store without running `pnpm install`.
// (identical approach to assetgen/fetch-met.mjs)
// ---------------------------------------------------------------------
async function resolveSharp() {
  const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');
  const entries = readdirSync(pnpmDir).filter((d) => d.startsWith('sharp@'));
  if (entries.length === 0) {
    throw new Error('Could not find a sharp@* package inside node_modules/.pnpm — is sharp installed?');
  }
  entries.sort((a, b) => a.length - b.length);
  const chosen = entries[0];
  const sharpEntry = path.join(pnpmDir, chosen, 'node_modules', 'sharp', 'lib', 'index.js');
  const mod = await import('file://' + sharpEntry);
  return mod.default;
}

const sharp = await resolveSharp();

const outputSizes = [];
function record(outPath) {
  const bytes = statSync(outPath).size;
  outputSizes.push([path.relative(rootDir, outPath), bytes]);
  return bytes;
}
function skip(outPath) {
  if (FORCE) return false;
  return existsSync(outPath);
}

// ---------------------------------------------------------------------
// OKLCH -> sRGB (Björn Ottosson's standard OKLab/OKLCH matrices), used to
// derive the duotone LUT endpoints EXACTLY from the DESIGN.md v2 tokens
// (--color-kon and --color-kinari) rather than eyeballed hex approximations,
// so the duotone's darkest tone matches the surrounding kon UI surface
// pixel-for-pixel (needed for the mask-image "fade into the dark" rule in
// DESIGN.md §3).
// ---------------------------------------------------------------------
function oklchToSrgb8(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const toSrgb = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };
  r = toSrgb(r);
  g = toSrgb(g);
  bb = toSrgb(bb);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(bb * 255)];
}

// --color-kon:    oklch(0.17 0.03 264)  — duotone shadow
// 藍 mid-stop:    oklch(0.45 0.10 255)  — keeps chroma in the mid-tones so the
//                 set reads as 藍摺り絵 (aizuri-e indigo print), not silver-gray.
//                 A 2-stop navy→cream lerp desaturates mids (visual-gate finding).
// --color-kinari: oklch(0.955 0.012 95) — duotone highlight
const SHADOW_RGB = oklchToSrgb8(0.17, 0.03, 264);
const MID_RGB = oklchToSrgb8(0.45, 0.1, 255);
const HIGHLIGHT_RGB = oklchToSrgb8(0.955, 0.012, 95);

console.log(
  `Tritone LUT — shadow rgb(${SHADOW_RGB.join(',')}), mid(ai) rgb(${MID_RGB.join(',')}), highlight rgb(${HIGHLIGHT_RGB.join(',')})`,
);

// 256-entry RGB lookup table: shadow → ai (t=0.45) → highlight.
function buildDuotoneLUT(shadow, mid, highlight) {
  const MID_T = 0.45;
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a, b, u;
    if (t <= MID_T) {
      a = shadow;
      b = mid;
      u = t / MID_T;
    } else {
      a = mid;
      b = highlight;
      u = (t - MID_T) / (1 - MID_T);
    }
    lut[i * 3 + 0] = Math.round(a[0] + (b[0] - a[0]) * u);
    lut[i * 3 + 1] = Math.round(a[1] + (b[1] - a[1]) * u);
    lut[i * 3 + 2] = Math.round(a[2] + (b[2] - a[2]) * u);
  }
  return lut;
}

const DUOTONE_LUT = buildDuotoneLUT(SHADOW_RGB, MID_RGB, HIGHLIGHT_RGB);

async function makeDuotone(srcPath, outPath) {
  // Grayscale + histogram-normalize (deterministic contrast stretch, no
  // magic numbers) via sharp, forced to a single 8-bit channel ('b-w'),
  // then map every pixel through the 256-entry duotone LUT by hand.
  const { data, info } = await sharp(srcPath)
    .toColourspace('b-w')
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info; // channels should be 1
  const out = Buffer.alloc(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    const gray = data[p * channels];
    const lutOff = gray * 3;
    out[p * 3 + 0] = DUOTONE_LUT[lutOff + 0];
    out[p * 3 + 1] = DUOTONE_LUT[lutOff + 1];
    out[p * 3 + 2] = DUOTONE_LUT[lutOff + 2];
  }

  // quality 24 + effort 6 (max compression search) tuned empirically against
  // the two highest-complexity sources in the set (aizome-stencil and
  // koike-kumihimo, both dense textile/pattern prints) to keep every one of
  // the 15 outputs safely under the 90KB budget with margin.
  await sharp(out, { raw: { width, height, channels: 3 } })
    .webp({ quality: 24, effort: 6 })
    .toFile(outPath);

  return { width, height };
}

// Spot-check: sample the darkest and lightest pixel actually written to the
// output file and confirm they land near the shadow/highlight endpoints.
async function verifyDuotone(outPath) {
  const { data, info } = await sharp(outPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let darkestSum = 255 * 3 + 1;
  let lightestSum = -1;
  let darkestPx = [0, 0, 0];
  let lightestPx = [0, 0, 0];
  for (let p = 0; p < width * height; p++) {
    const r = data[p * channels + 0];
    const g = data[p * channels + 1];
    const b = data[p * channels + 2];
    const sum = r + g + b;
    if (sum < darkestSum) {
      darkestSum = sum;
      darkestPx = [r, g, b];
    }
    if (sum > lightestSum) {
      lightestSum = sum;
      lightestPx = [r, g, b];
    }
  }
  return { darkestPx, lightestPx };
}

// ---------------------------------------------------------------------
// Job 1 — 15 藍デュオトーン portraits
// ---------------------------------------------------------------------
const foundersRootDir = path.join(rootDir, 'src', 'content', 'founders');
const publicFoundersDir = path.join(rootDir, 'public', 'img', 'founders');

const slugs = readdirSync(foundersRootDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

console.log(`Found ${slugs.length} founder slugs.`);

let duotoneVerifySample = null;

for (const slug of slugs) {
  const srcPath = path.join(publicFoundersDir, slug, 'portrait.webp');
  const outPath = path.join(publicFoundersDir, slug, 'portrait-duo.webp');
  if (!existsSync(srcPath)) {
    throw new Error(`[duotone] missing source portrait for slug "${slug}": ${path.relative(rootDir, srcPath)}`);
  }
  if (skip(outPath)) {
    record(outPath);
    console.log(`[skip] ${slug} (portrait-duo.webp exists)`);
    continue;
  }
  const { width, height } = await makeDuotone(srcPath, outPath);
  const bytes = record(outPath);
  console.log(`[ok] ${slug} -> portrait-duo.webp (${width}x${height}, ${(bytes / 1024).toFixed(1)} KB)`);
  if (!duotoneVerifySample) {
    duotoneVerifySample = await verifyDuotone(outPath);
  }
}

// ---------------------------------------------------------------------
// Job 2 — intro actor (ōkubi-e close-up bust)
// ---------------------------------------------------------------------
// The 18 already-sourced Met prints (see assetgen/SOURCES.md) are all
// full-length figure compositions (yakusha-e / bijin-ga) — none is a true
// ōkubi-e (large bust/face close-up). Sharaku's ōkubi-e are the canonical
// example of this composition, so we fetch one directly from the Met API,
// filtered to artistOrCulture=Sharaku (44 hits), and hand-pick the most
// dramatic bust crop: Met #37358 "Kabuki Actor Ōtani Oniji III as Yakko
// Edobei" — one of Sharaku's most famous prints, a tight head-and-shoulders
// crop with a fierce kabuki mie (glare + clawed hands at the frame edge),
// dark neutral background that will read well against the kon intro. This
// beats the other 43 Sharaku hits, nearly all of which are also full or
// three-quarter figures at oban/hosoban size (12-15in tall, 5.5-10in wide,
// figure occupying well under half the frame height).
const INTRO_ACTOR_OBJECT_ID = 37358;

const sourcedDir = path.join(rootDir, 'assetgen', 'sourced');
const introDir = path.join(rootDir, 'public', 'img', 'intro');
mkdirSync(introDir, { recursive: true });

const introActorLocalRaw = path.join(sourcedDir, `met-${INTRO_ACTOR_OBJECT_ID}.jpg`);

// Always fetch the object record (cheap single JSON call) so the ledger
// carries full, accurate metadata whether or not the raw jpg is cached from
// a previous run — avoids a stale/placeholder ledger row on reruns.
const metaRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${INTRO_ACTOR_OBJECT_ID}`);
if (!metaRes.ok) throw new Error(`[intro-actor] Met API HTTP ${metaRes.status}`);
const introActorObj = await metaRes.json();
if (introActorObj.isPublicDomain !== true) {
  throw new Error(`[intro-actor] objectID ${INTRO_ACTOR_OBJECT_ID} ("${introActorObj.title}") is NOT public domain.`);
}
if (!introActorObj.primaryImage) {
  throw new Error(`[intro-actor] objectID ${INTRO_ACTOR_OBJECT_ID} ("${introActorObj.title}") has no primaryImage.`);
}
const introActorLedgerRow = {
  objectID: INTRO_ACTOR_OBJECT_ID,
  title: introActorObj.title,
  artist: introActorObj.artistDisplayName || '(unattributed)',
  date: introActorObj.objectDate,
  objectURL: introActorObj.objectURL,
};

if (!existsSync(introActorLocalRaw)) {
  const imgRes = await fetch(introActorObj.primaryImage);
  if (!imgRes.ok) throw new Error(`[intro-actor] image download HTTP ${imgRes.status}`);
  await pipeline(imgRes.body, createWriteStream(introActorLocalRaw));
  console.log(`[fetched] Met #${INTRO_ACTOR_OBJECT_ID} "${introActorObj.title}" (${introActorLedgerRow.artist}, ${introActorLedgerRow.date})`);
} else {
  console.log(`[cached] assetgen/sourced/met-${INTRO_ACTOR_OBJECT_ID}.jpg already present ("${introActorObj.title}")`);
}

const introActorOut = path.join(introDir, 'actor.webp');
if (skip(introActorOut)) {
  record(introActorOut);
  console.log('[skip] public/img/intro/actor.webp exists');
} else {
  await sharp(introActorLocalRaw)
    .resize({ height: 1600 })
    .modulate({ saturation: 0.9 })
    .gamma(1.05)
    .webp({ quality: 82 })
    .toFile(introActorOut);
  const bytes = record(introActorOut);
  console.log(`[ok] intro actor -> public/img/intro/actor.webp (${(bytes / 1024).toFixed(1)} KB)`);
}

// ---------------------------------------------------------------------
// Job 3 — hero dark grade (Hiroshige Nihonbashi, already sourced)
// ---------------------------------------------------------------------
const heroSrc = path.join(sourcedDir, 'met-36922.jpg');
if (!existsSync(heroSrc)) {
  throw new Error(`[hero-dark] expected already-sourced raw not found: ${path.relative(rootDir, heroSrc)}`);
}
const heroDir = path.join(rootDir, 'public', 'media', 'hero');
mkdirSync(heroDir, { recursive: true });

function darkGrade(pipelineInstance) {
  return pipelineInstance.modulate({ brightness: 0.72, saturation: 0.82 }).gamma(1.08);
}

const heroDark2000 = path.join(heroDir, 'bridge-dark-2000.webp');
if (skip(heroDark2000)) {
  record(heroDark2000);
  console.log('[skip] bridge-dark-2000.webp exists');
} else {
  await darkGrade(sharp(heroSrc).resize({ width: 2000 })).webp({ quality: 80 }).toFile(heroDark2000);
  const bytes = record(heroDark2000);
  console.log(`[ok] bridge-dark-2000.webp (${(bytes / 1024).toFixed(1)} KB)`);
}

const heroDark1200 = path.join(heroDir, 'bridge-dark-1200.webp');
if (skip(heroDark1200)) {
  record(heroDark1200);
  console.log('[skip] bridge-dark-1200.webp exists');
} else {
  await darkGrade(sharp(heroSrc).resize({ width: 1200 })).webp({ quality: 80 }).toFile(heroDark1200);
  const bytes = record(heroDark1200);
  console.log(`[ok] bridge-dark-1200.webp (${(bytes / 1024).toFixed(1)} KB)`);
}

const heroPoster = path.join(heroDir, 'bridge-poster.avif');
if (skip(heroPoster)) {
  record(heroPoster);
  console.log('[skip] bridge-poster.avif exists');
} else {
  await darkGrade(sharp(heroSrc).resize({ width: 1200 })).avif({ quality: 55 }).toFile(heroPoster);
  const bytes = record(heroPoster);
  console.log(`[ok] bridge-poster.avif (${(bytes / 1024).toFixed(1)} KB)`);
}

// ---------------------------------------------------------------------
// Append to assetgen/SOURCES.md (derived-assets ledger)
// ---------------------------------------------------------------------
const todayISO = new Date().toISOString().slice(0, 10);
const lines = [];
lines.push('');
lines.push('## Derived assets — v2 "夜の版元" (night edition) additions');
lines.push('');
lines.push(
  `Generated by \`assetgen/derive-v2-assets.mjs\` on ${todayISO}. Duotone LUT endpoints computed from the ` +
    'DESIGN.md v2 OKLCH tokens (not eyeballed hex), so the shadow tone matches --color-kon pixel-for-pixel: ' +
    `shadow (--color-kon, oklch(0.17 0.03 264)) = rgb(${SHADOW_RGB.join(', ')}); ` +
    `highlight (--color-kinari, oklch(0.955 0.012 95)) = rgb(${HIGHLIGHT_RGB.join(', ')}).`,
);
lines.push('');
lines.push('| Source | Derivation | Output files |');
lines.push('|---|---|---|');
lines.push(
  '| `public/img/founders/<slug>/portrait.webp` (all 15 slugs, already-sourced Met prints) | ' +
    'grayscale (`toColourspace(\'b-w\')`) → histogram-normalize → 256-entry duotone LUT (kon shadow / kinari highlight) → raw RGB reassembly | ' +
    '`public/img/founders/<slug>/portrait-duo.webp` (800x1000, q24 effort6 — tuned against the two densest-pattern sources to stay under the 90KB budget) ×15 |',
);
lines.push(
  `| Met #${introActorLedgerRow.objectID} "${introActorLedgerRow.title.replace(/\|/g, '\\|')}" — ${introActorLedgerRow.artist}, ${introActorLedgerRow.date} | ` +
    `CC0 (isPublicDomain=true verified ${todayISO}) — fetched via artistOrCulture=Sharaku search because none of the 18 already-sourced ` +
    `prints is a true ōkubi-e bust close-up (all are full-length yakusha-e/bijin-ga) — ` +
    `resize height 1600 → modulate(saturation 0.9) → gamma(1.05), full color | ` +
    `\`assetgen/sourced/met-${introActorLedgerRow.objectID}.jpg\`, \`public/img/intro/actor.webp\` |`,
);
lines.push('');
lines.push(`> Object URL: ${introActorLedgerRow.objectURL}`);
lines.push(
  '| `assetgen/sourced/met-36922.jpg` (Hiroshige, Stations One: Morning View of Nihonbashi — already ledgered as section-bridge) | ' +
    'dark grade for white-text-overlay hero use: modulate(brightness 0.72, saturation 0.82) → gamma(1.08) | ' +
    '`public/media/hero/bridge-dark-2000.webp` (w2000 q80), `public/media/hero/bridge-dark-1200.webp` (w1200 q80), `public/media/hero/bridge-poster.avif` (w1200 q55) |',
);
lines.push('');
lines.push('### Derived output sizes');
lines.push('');
lines.push('| File | Size (KB) |');
lines.push('|---|---|');
for (const [file, bytes] of outputSizes) {
  lines.push(`| \`${file}\` | ${(bytes / 1024).toFixed(1)} |`);
}
lines.push('');

// Idempotent ledger write: strip any previously-appended "## Derived assets"
// section (and everything after it) before re-appending, so reruns (with or
// without --force) never duplicate this section in SOURCES.md.
const sourcesPath = path.join(rootDir, 'assetgen', 'SOURCES.md');
const existingSources = readFileSync(sourcesPath, 'utf-8');
const marker = '## Derived assets — v2 "夜の版元" (night edition) additions';
const markerIdx = existingSources.indexOf(marker);
const baseSources = markerIdx === -1 ? existingSources : existingSources.slice(0, markerIdx).replace(/\n+$/, '\n');
writeFileSync(sourcesPath, baseSources + lines.join('\n'));

console.log('');
console.log(markerIdx === -1 ? 'Appended derived-assets ledger to assetgen/SOURCES.md' : 'Refreshed derived-assets ledger in assetgen/SOURCES.md (idempotent rerun)');
if (duotoneVerifySample) {
  console.log(
    `Duotone spot-check (first generated portrait) — darkest px rgb(${duotoneVerifySample.darkestPx.join(',')}), ` +
      `lightest px rgb(${duotoneVerifySample.lightestPx.join(',')}) vs. target shadow rgb(${SHADOW_RGB.join(',')}) / highlight rgb(${HIGHLIGHT_RGB.join(',')})`,
  );
}
