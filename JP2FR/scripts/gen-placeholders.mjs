#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const colors = {
  cream: '#F3EFE4',
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

function generateProductImage(slug, productNum, width = 1200, height = 900) {
  const hash = hashSlug(slug);

  // Background with gradient suggestion via pattern
  const patternDensity = 0.08 + ((hash >> 8) % 15) / 1000;
  const rotation = (hash % 360);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${colors.cream}"/>

  <!-- Wave pattern (subtle) -->
  <g transform="translate(0, 200) rotate(${rotation})">
    <g fill="none" stroke="${colors.indigoLight}" stroke-width="3" opacity="0.12">
      <path d="M 0 0 Q 150 -30 300 0 T 600 0 T 900 0 T 1200 0"/>
      <path d="M 0 40 Q 150 10 300 40 T 600 40 T 900 40 T 1200 40"/>
      <path d="M 0 80 Q 150 50 300 80 T 600 80 T 900 80 T 1200 80"/>
    </g>
  </g>

  <!-- Central indigo rectangle (product placeholder) -->
  <rect x="200" y="150" width="800" height="600" fill="${colors.indigo}" opacity="0.15" rx="8"/>

  <!-- Decorative circles -->
  <circle cx="300" cy="300" r="80" fill="none" stroke="${colors.indigoLight}" stroke-width="2" opacity="0.2"/>
  <circle cx="900" cy="550" r="120" fill="none" stroke="${colors.indigo}" stroke-width="2" opacity="0.15"/>

  <!-- Product number text -->
  <text x="${width / 2}" y="${height / 2 - 40}" font-size="64" font-family="serif" font-weight="bold" text-anchor="middle" fill="${colors.dark}" opacity="0.4">
    ${productNum}
  </text>

  <!-- Small vermilion accent -->
  <rect x="${width - 60}" y="40" width="30" height="30" fill="${colors.vermilion}" opacity="0.7"/>

  <!-- Decorative line -->
  <line x1="150" y1="${height - 60}" x2="${width - 150}" y2="${height - 60}" stroke="${colors.indigo}" stroke-width="1" opacity="0.2"/>
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

  let founderCount = 0;
  let productCount = 0;
  let imageCount = 0;

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

  console.log('Generating product images...');
  for (const file of productFiles) {
    const content = JSON.parse(fs.readFileSync(path.join(productsDir, file), 'utf8'));
    const slug = content.slug;
    const dir = path.join(publicImgDir, 'products', slug);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate 2 images per product
    for (let i = 1; i <= 2; i++) {
      const productSvg = generateProductImage(slug, i, 1200, 900);
      fs.writeFileSync(path.join(dir, `0${i}.svg`), productSvg, 'utf8');
      imageCount++;
    }

    productCount++;
  }

  console.log(`\n✓ Generated placeholder content:`);
  console.log(`  Founders: ${founderCount} portraits`);
  console.log(`  Products: ${productCount} items (${productCount * 2} images)`);
  console.log(`  Total images: ${imageCount}`);
}

main().catch(console.error);
