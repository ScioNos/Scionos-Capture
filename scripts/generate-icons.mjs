import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const svgTemplate = (size) => {
  const isSmall = size <= 16;
  const strokeWidth = isSmall ? 11 : 9.5;
  const cornerWidth = isSmall ? 5 : 4;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
  </style>
</head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">
    <defs>
      <linearGradient id="scioGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3B82F6"/>
        <stop offset="50%" stop-color="#6366F1"/>
        <stop offset="100%" stop-color="#A855F7"/>
      </linearGradient>
      <linearGradient id="sGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#60A5FA"/>
        <stop offset="100%" stop-color="#3B82F6"/>
      </linearGradient>
      <linearGradient id="nGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#818CF8"/>
        <stop offset="100%" stop-color="#C084FC"/>
      </linearGradient>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f1d36"/>
        <stop offset="100%" stop-color="#060c18"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#3B82F6" flood-opacity="0.3"/>
      </filter>
    </defs>

    <!-- Background rounded squircle -->
    <rect width="128" height="128" rx="28" fill="url(#bgGrad)"/>
    <rect x="1.5" y="1.5" width="125" height="125" rx="26.5" fill="none" stroke="url(#scioGrad)" stroke-width="2" stroke-opacity="0.6"/>

    <!-- Viewfinder / Capture Frame Corners -->
    <path d="M16 34 V22 A6 6 0 0 1 22 16 H34" fill="none" stroke="#3B82F6" stroke-width="${cornerWidth}" stroke-linecap="round"/>
    <path d="M94 16 H106 A6 6 0 0 1 112 22 V34" fill="none" stroke="#60A5FA" stroke-width="${cornerWidth}" stroke-linecap="round"/>
    <path d="M16 94 V106 A6 6 0 0 0 22 112 H34" fill="none" stroke="#818CF8" stroke-width="${cornerWidth}" stroke-linecap="round"/>
    <path d="M94 112 H106 A6 6 0 0 0 112 106 V94" fill="none" stroke="#A855F7" stroke-width="${cornerWidth}" stroke-linecap="round"/>

    <!-- Center Monogram 'S' & 'N' -->
    <g filter="url(#glow)">
      <!-- Letter S -->
      <path d="M 54 44 C 47 38 35 38 31 44 C 27 50 30 56 37 60 L 46 64 C 54 68 56 75 52 82 C 47 89 35 90 28 84"
            fill="none" stroke="url(#sGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Letter N -->
      <path d="M 72 86 V 42 L 98 86 V 42"
            fill="none" stroke="url(#nGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    ${isSmall ? '' : '<circle cx="63" cy="64" r="3" fill="#818CF8"/>'}
  </svg>
</body>
</html>`;
};

async function generate() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const size of [16, 48, 128]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(svgTemplate(size));
      const outputPath = path.join(root, 'images', `icon${size}.png`);
      await page.screenshot({ path: outputPath, omitBackground: true });
      console.log(`Generated ${outputPath} (${size}x${size})`);
    }
  } finally {
    await browser.close();
  }
}

generate().catch(error => {
  console.error('Icon generation failed:', error);
  process.exitCode = 1;
});
