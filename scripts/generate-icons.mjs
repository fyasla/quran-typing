// Génère les icônes PWA PNG à partir de public/icon.svg via un navigateur headless.
// Nécessite playwright installé quelque part : soit en dépendance, soit via
// PLAYWRIGHT_DIR=<dossier contenant node_modules/playwright>.
// Usage : node scripts/generate-icons.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const pwSpec = process.env.PLAYWRIGHT_DIR
  ? pathToFileURL(`${process.env.PLAYWRIGHT_DIR}/node_modules/playwright/index.mjs`).href
  : 'playwright';
const { chromium } = await import(pwSpec);

const svg = readFileSync('public/icon.svg', 'utf8');

// [fichier, taille, padding relatif (zone de sécurité maskable = ~80 % centraux)]
const TARGETS = [
  ['public/icon-192.png', 192, 0],
  ['public/icon-512.png', 512, 0],
  ['public/icon-maskable-512.png', 512, 0.1],
  ['public/apple-touch-icon.png', 180, 0],
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });

for (const [file, size, pad] of TARGETS) {
  const inner = Math.round(size * (1 - 2 * pad));
  const offset = Math.round(size * pad);
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // Fond plein pour les maskable (le launcher rogne en cercle/squircle)
  const html = `<body style="margin:0;background:${pad > 0 ? '#1a1a2e' : 'transparent'}">
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"
         style="position:absolute;left:${offset}px;top:${offset}px;width:${inner}px;height:${inner}px"/>
  </body>`;
  await page.setContent(html);
  const buf = await page.screenshot({ omitBackground: pad === 0 });
  writeFileSync(file, buf);
  console.log(`${file} (${size}×${size})`);
  await page.close();
}

await browser.close();
