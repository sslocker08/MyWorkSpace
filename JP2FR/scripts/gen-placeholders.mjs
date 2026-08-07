#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const colors = {
  cream: '#F3EFE4',
  washi: '#EAE3D2',
  indigo: '#33518F',
  indigoLight: '#7FA3C7',
  dark: '#2E2E35',
  vermilion: '#C2451E'
};

function hashSlug(slug) {
  return parseInt(crypto.createHash('md5').update(slug).digest('hex').slice(0, 8), 16);
}

function generateSeigaihaPattern(slug, width, height) {
  const hash = hashSlug(slug);
  const arcCount = 3 + (hash % 3);
  const rotation = (hash % 360);
  const opacity = 0.15 + ((hash >> 8) % 20) / 100;

  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = 80;

  let paths = [];
  for (let i = 0; i < arcCount; i++) {
    const radius = baseRadius + i * 40;
    const d = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;
    paths.push(d);
  }

  return `
    <g transform="translate(${centerX}, ${centerY}) rotate(${rotation})">
      <g fill="none" stroke="${colors.indigo}" stroke-width="2" opacity="${opacity}">
        ${paths.map(d => `<path d="${d}" />`).join('\n')}
      </g>
    </g>
  `;
}

function generateFounderPortrait(name, slug) {
  const width = 800;
  const height = 800;
  const hash = hashSlug(slug);

  // Extract initials (romanized)
  const initials = slug.split('-').slice(0, 2).map(w => w[0].toUpperCase()).join('');

  // Determine seal position (deterministic by hash)
  const sealPositions = [
    { x: 80, y: 80 },    // top-left
    { x: 720, y: 80 },   // top-right
    { x: 80, y: 720 },   // bottom-left
    { x: 720, y: 720 }   // bottom-right
  ];
  const sealPos = sealPositions[hash % 4];

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Serif';
        src: local('Georgia'), local('Times New Roman'), serif;
      }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${colors.cream}"/>

  <!-- Seigaiha pattern -->
  ${generateSeigaihaPattern(slug, width, height)}

  <!-- Center circle -->
  <circle cx="${width / 2}" cy="${height / 2}" r="200" fill="none" stroke="${colors.indigoLight}" stroke-width="3" opacity="0.3"/>

  <!-- Initials text -->
  <text x="${width / 2}" y="${height / 2 + 40}" font-size="120" font-family="Serif" font-weight="bold" text-anchor="middle" fill="${colors.dark}" opacity="0.6">
    ${initials}
  </text>

  <!-- Vermilion seal square -->
  <g transform="translate(${sealPos.x}, ${sealPos.y})">
    <rect width="40" height="40" fill="${colors.vermilion}"/>
    <circle cx="20" cy="20" r="8" fill="${colors.cream}" opacity="0.4"/>
  </g>
</svg>`;

  return svg;
}

// ---------------------------------------------------------------------
// Product "shop-plate" generator (Task C rewrite).
//
// The founder-portrait function above is untouched -- another worker owns
// real portrait photography and public/img/founders/. Only this product
// generator is new; it draws a woodblock-print "shop plate": a washi
// ground with a print-margin double rule, a large traditional pattern
// field (one of six patterns, chosen + scaled + rotated deterministically
// per slug), the product's Japanese name set tategaki (vertical, one
// character per line) in the right margin, and a small vermilion 落款
// seal bottom-left carrying one kanji from the name.
// ---------------------------------------------------------------------

const PATTERN_NAMES = ['seigaiha', 'asanoha', 'ichimatsu', 'kikko', 'yagasuri', 'shippo'];

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** First CJK Unified Ideograph (kanji) in `str`, or '品' if none is found. */
function firstKanji(str) {
  for (const ch of Array.from(str ?? '')) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x4e00 && cp <= 0x9fff) return ch;
  }
  return '品';
}

const num = (n) => n.toFixed(1);

// Each pattern below returns just the CONTENT of one repeat tile (not the
// tile itself) -- it is dropped into an SVG <pattern> element and repeated
// by the renderer, so file size stays tiny (one tile's worth of markup)
// no matter how large or dense the field looks. This replaced an earlier
// version that manually drew every repeat as its own element: for a
// ~1000x800px field at these spacings that was several thousand
// individual <path>/<circle> elements per image (multiple MB), blowing
// through the 15KB budget by two orders of magnitude.

/** 青海波 — staggered rows of nested concentric semicircle "fans". Tile is
 *  exactly 2r x 2r: row 0's fan is centered mid-tile (touches the left/
 *  right edges exactly, so it butts seamlessly against the next tile);
 *  row 1 is the same fan offset by r horizontally and r vertically, which
 *  is the textbook seigaiha brick-stagger. */
function patternSeigaiha(strokeColor) {
  const r = 68;
  const fan = (x, y) =>
    [1, 2, 3]
      .map((k) => {
        const rad = (r * 0.92 * k) / 3;
        return `<path d="M ${num(x - rad)} ${num(y)} A ${num(rad)} ${num(rad)} 0 0 1 ${num(x + rad)} ${num(y)}" fill="none" stroke="${strokeColor}" stroke-width="1.5" opacity="${(0.3 + k * 0.08).toFixed(2)}"/>`;
      })
      .join('');
  return { tileW: 2 * r, tileH: 2 * r, content: fan(r, 0) + fan(0, r) + fan(2 * r, r) };
}

/** 麻の葉 — three line families at 0/60/120°, i.e. a true equilateral
 *  triangular grid (the textbook construction of the hexagonal star
 *  lattice). One tile = one period of all three families. */
function patternAsanoha(strokeColor) {
  const s = 62;
  const h = s * Math.sqrt(3);
  const tileW = s * 2;
  const tileH = h;
  let content = '';
  // Horizontal family (the 0deg lines become horizontals once we also
  // draw the +-60deg families across a tile sized to the triangle grid).
  content += `<line x1="0" y1="0" x2="${num(tileW)}" y2="0" stroke="${strokeColor}" stroke-width="1.25" opacity="0.5"/>`;
  content += `<line x1="0" y1="${num(tileH)}" x2="${num(tileW)}" y2="${num(tileH)}" stroke="${strokeColor}" stroke-width="1.25" opacity="0.5"/>`;
  // The two diagonal families, drawn so each tile edge carries a
  // consistent half-segment that continues into the neighbouring tile.
  for (const x0 of [-s, s, 3 * s]) {
    content += `<line x1="${num(x0)}" y1="0" x2="${num(x0 - s)}" y2="${num(h)}" stroke="${strokeColor}" stroke-width="1.25" opacity="0.5"/>`;
    content += `<line x1="${num(x0)}" y1="0" x2="${num(x0 + s)}" y2="${num(h)}" stroke="${strokeColor}" stroke-width="1.25" opacity="0.5"/>`;
  }
  return { tileW, tileH, content };
}

/** 市松 — alternating filled squares. A 2x2-cell tile tiles perfectly by
 *  construction (no shape ever crosses a tile edge). */
function patternIchimatsu(fillColor) {
  const s = 96;
  return {
    tileW: 2 * s,
    tileH: 2 * s,
    content: `<rect x="0" y="0" width="${s}" height="${s}" fill="${fillColor}" opacity="0.45"/><rect x="${s}" y="${s}" width="${s}" height="${s}" fill="${fillColor}" opacity="0.45"/>`,
  };
}

function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    pts.push(`${num(cx + r * Math.cos(angle))},${num(cy + r * Math.sin(angle))}`);
  }
  return pts.join(' ');
}

/** 亀甲 — flat-top hexagon lattice (honeycomb of tortoise-shell cells).
 *  Tile = one full brick-offset period: two hex columns wide, one row
 *  tall, each hexagon centered inside so none of the six-sided outlines
 *  need to straddle a tile edge. */
function patternKikko(strokeColor) {
  const r = 72;
  const hSpace = 1.5 * r;
  const vSpace = Math.sqrt(3) * r;
  const tileW = 2 * hSpace;
  const tileH = vSpace;
  const hex = (x, y) => `<polygon points="${hexPoints(x, y, r)}" fill="none" stroke="${strokeColor}" stroke-width="1.5" opacity="0.5"/>`;
  // One centered hex + the offset-column hex + the four corner copies
  // (each a different corner's hex, so every tile edge sees a consistent
  // partial hexagon that lines up with its neighbour).
  const content = hex(0, 0) + hex(hSpace, vSpace / 2) + hex(tileW, 0) + hex(0, vSpace) + hex(tileW, vSpace);
  return { tileW, tileH, content };
}

/** 矢絣 — diagonal arrow-feather bands: a 45deg alternating stripe with
 *  counter-angled "barb" ticks inside the filled band, evoking fletching. */
function patternYagasuri(fillColor, tickColor) {
  const band = 78;
  const tileW = 2 * band * Math.SQRT2;
  const tileH = tileW;
  const half = tileW / 2;
  // Filled diagonal band running corner to corner of the tile.
  let content = `<polygon points="${num(-band)},0 ${num(half - band)},0 ${num(half + band)},${num(tileH)} ${num(band)},${num(tileH)}" fill="${fillColor}" opacity="0.3"/>`;
  content += `<polygon points="${num(tileW - band)},0 ${num(tileW + half - band)},0 ${num(tileW + half + band)},${num(tileH)} ${num(tileW + band)},${num(tileH)}" fill="${fillColor}" opacity="0.3"/>`;
  // Feather barbs: short counter-angled ticks stepping down the band.
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * tileH;
    const cx = t / 2; // centreline of the first band at height t
    content += `<line x1="${num(cx - band * 0.4)}" y1="${num(t - band * 0.3)}" x2="${num(cx + band * 0.4)}" y2="${num(t + band * 0.3)}" stroke="${tickColor}" stroke-width="1" opacity="0.55"/>`;
  }
  return { tileW, tileH, content };
}

/** 七宝 — interlocking circles: centers spaced by exactly one radius, so
 *  each circle passes through its neighbours' centers (the classic
 *  four-petal "seven treasures" overlap). Tile = one grid cell. */
function patternShippo(strokeColor) {
  const r = 88;
  return {
    tileW: r,
    tileH: r,
    content: [
      [0, 0],
      [r, 0],
      [0, r],
      [r, r],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${num(r)}" fill="none" stroke="${strokeColor}" stroke-width="1.5" opacity="0.42"/>`)
      .join(''),
  };
}

const PATTERN_FN = {
  seigaiha: patternSeigaiha,
  asanoha: patternAsanoha,
  ichimatsu: patternIchimatsu,
  kikko: patternKikko,
  yagasuri: patternYagasuri,
  shippo: patternShippo,
};

/** Builds a <pattern>-filled, rotated pattern field. Using a native SVG
 *  <pattern> (one small repeat tile, referenced by url()) instead of
 *  manually drawing every repeat keeps file size to "one tile's worth of
 *  markup" regardless of how large or dense the field looks. */
function buildPatternField(pattern, hash, fieldX, fieldY, fieldW, fieldH, clipId, variant) {
  // `hash` can exceed 2^31-1 (it's built from 8 hex chars = up to
  // 0xFFFFFFFF), so a signed `>>` would sign-extend and let a modulo on it
  // go negative for large slugs. `>>>` (unsigned shift) avoids that.
  const scaleFactor = 0.8 + ((hash >>> 5) % 40) / 100; // 0.8x - 1.2x, per-slug
  const baseRotation = (hash % 24) * 15; // 0..345 in 15deg steps
  const rotation = variant === 2 ? (baseRotation + 47) % 360 : baseRotation;
  const zoom = (variant === 2 ? 2.5 : 1) * scaleFactor;

  const fn = PATTERN_FN[pattern];
  const inkColor = colors.indigo;
  const inkColor2 = pattern === 'yagasuri' ? colors.indigoLight : colors.indigo;
  const fillColor = pattern === 'ichimatsu' ? colors.indigo : colors.indigoLight;

  const { tileW, tileH, content } =
    pattern === 'ichimatsu' ? fn(fillColor) : pattern === 'yagasuri' ? fn(fillColor, inkColor2) : fn(inkColor);

  const patternId = `pat-${clipId}`;

  return `
  <clipPath id="${clipId}">
    <rect x="${num(fieldX)}" y="${num(fieldY)}" width="${num(fieldW)}" height="${num(fieldH)}"/>
  </clipPath>
  <pattern id="${patternId}" x="${num(fieldX)}" y="${num(fieldY)}" width="${num(tileW * zoom)}" height="${num(tileH * zoom)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rotation} ${num(fieldX + fieldW / 2)} ${num(fieldY + fieldH / 2)})">
    <g transform="scale(${num(zoom)})">${content}</g>
  </pattern>
  <g clip-path="url(#${clipId})">
    <rect x="${num(fieldX)}" y="${num(fieldY)}" width="${num(fieldW)}" height="${num(fieldH)}" fill="${colors.cream}"/>
    <rect x="${num(fieldX)}" y="${num(fieldY)}" width="${num(fieldW)}" height="${num(fieldH)}" fill="url(#${patternId})"/>
  </g>`;
}

/** Vertical (tategaki) product name: one character per stacked <tspan>. */
function verticalName(nameJa, x, yStart, availableHeight) {
  const chars = Array.from(nameJa ?? '');
  if (chars.length === 0) return '';
  const fontSize = Math.max(24, Math.min(56, availableHeight / (chars.length + 0.6)));
  const lineHeight = fontSize * 1.15;
  const tspans = chars
    .map((ch, i) => `<tspan x="${num(x)}" dy="${i === 0 ? 0 : num(lineHeight)}">${escapeXml(ch)}</tspan>`)
    .join('');
  return `<text x="${num(x)}" y="${num(yStart)}" font-family="'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" font-size="${num(fontSize)}" text-anchor="middle" fill="${colors.dark}">${tspans}</text>`;
}

function generateProductImage(slug, nameJa, productNum, width = 1200, height = 900, variant = 1) {
  const hash = hashSlug(slug);
  const pattern = PATTERN_NAMES[hash % PATTERN_NAMES.length];

  // Print-margin double rule: outer hairline (25% sumi), inner 3px ai,
  // offset from each other like a woodblock print's registration margin.
  const outerInset = 22;
  const innerInset = 32;

  // Content area inside the inner rule.
  const contentX = innerInset + 8;
  const contentY = innerInset + 8;
  const contentW = width - 2 * (innerInset + 8);
  const contentH = height - 2 * (innerInset + 8);

  // Right margin column reserved for the vertical (tategaki) name.
  const textColW = 120;
  const dividerX = contentX + contentW - textColW - 16;

  const fieldX = contentX;
  const fieldY = contentY;
  const fieldW = dividerX - 10 - fieldX;
  const fieldH = contentH;

  const clipId = `plate-${slug}-${variant}`;
  const patternSvg = buildPatternField(pattern, hash, fieldX, fieldY, fieldW, fieldH, clipId, variant);

  const textX = dividerX + 16 + textColW / 2;
  const textTop = contentY + 36;
  const nameSvg = verticalName(nameJa, textX, textTop, contentH - 72);

  const sealSize = 56;
  const sealX = fieldX + 18;
  const sealY = fieldY + fieldH - sealSize - 18;
  const kanji = escapeXml(firstKanji(nameJa));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${colors.cream}"/>
  <rect x="${outerInset}" y="${outerInset}" width="${width - 2 * outerInset}" height="${height - 2 * outerInset}" fill="none" stroke="${colors.dark}" stroke-width="1" opacity="0.25"/>
  <rect x="${innerInset}" y="${innerInset}" width="${width - 2 * innerInset}" height="${height - 2 * innerInset}" fill="none" stroke="${colors.indigo}" stroke-width="3"/>
  ${patternSvg}
  <line x1="${num(dividerX)}" y1="${num(contentY)}" x2="${num(dividerX)}" y2="${num(contentY + contentH)}" stroke="${colors.dark}" stroke-width="1" opacity="0.2"/>
  ${nameSvg}
  <g transform="translate(${num(sealX)}, ${num(sealY)})">
    <rect width="${sealSize}" height="${sealSize}" fill="${colors.vermilion}"/>
    <text x="${sealSize / 2}" y="${sealSize / 2 + sealSize * 0.19}" font-family="serif" font-size="${sealSize * 0.58}" text-anchor="middle" fill="${colors.cream}">${kanji}</text>
  </g>
</svg>`;

  return svg;
}

async function main() {
  // Read founder and product JSONs
  const foundersDir = path.join(projectRoot, 'src/content/founders');
  const productsDir = path.join(projectRoot, 'src/content/products');
  const publicImgDir = path.join(projectRoot, 'public/img');

  const founderFiles = fs.readdirSync(foundersDir).filter(f => f.endsWith('.json'));
  const productFiles = fs.readdirSync(productsDir).filter(f => f.endsWith('.json'));

  // Founder portraits are owned by another worker right now (real
  // portraits are landing in src/content/founders/*.json + this same
  // public/img/founders/ tree). generateFounderPortrait() itself is left
  // untouched per that handoff, but this script must not re-run it and
  // clobber whatever that worker has already written. Flip this back on
  // only once placeholder founder portraits are wanted again.
  const REGENERATE_FOUNDER_PORTRAITS = false;

  let founderCount = 0;
  let productCount = 0;
  let imageCount = 0;

  if (REGENERATE_FOUNDER_PORTRAITS) {
    console.log('Generating founder portraits...');
    for (const file of founderFiles) {
      const content = JSON.parse(fs.readFileSync(path.join(foundersDir, file), 'utf8'));
      const slug = content.slug;
      const dir = path.join(publicImgDir, 'founders', slug);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const portraitSvg = generateFounderPortrait(content.name.en, slug);
      fs.writeFileSync(path.join(dir, 'portrait.svg'), portraitSvg, 'utf8');

      founderCount++;
      imageCount++;
    }
  } else {
    console.log('Skipping founder portraits (owned by another worker right now).');
  }

  console.log('Generating product images...');
  for (const file of productFiles) {
    const content = JSON.parse(fs.readFileSync(path.join(productsDir, file), 'utf8'));
    const slug = content.slug;
    const nameJa = content.name?.ja ?? slug;
    const dir = path.join(publicImgDir, 'products', slug);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate 2 images per product: 01 = the pattern plate, 02 = the same
    // pattern zoomed 2.5x with a different rotation (see buildPatternField).
    for (let i = 1; i <= 2; i++) {
      const productSvg = generateProductImage(slug, nameJa, i, 1200, 900, i);
      fs.writeFileSync(path.join(dir, `0${i}.svg`), productSvg, 'utf8');
      imageCount++;
    }

    productCount++;
  }

  console.log(`\n✓ Generated placeholder content:`);
  console.log(`  Founders: ${founderCount} portraits (regeneration ${REGENERATE_FOUNDER_PORTRAITS ? 'ON' : 'skipped'})`);
  console.log(`  Products: ${productCount} items (${productCount * 2} images)`);
  console.log(`  Total images: ${imageCount}`);
}

main().catch(console.error);
