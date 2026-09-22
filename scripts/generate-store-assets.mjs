import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storeDir = path.join(root, 'store-assets');

await fs.mkdir(storeDir, { recursive: true });

const slide1Html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      width: 1280px;
      height: 800px;
      background: radial-gradient(circle at 50% 20%, #132742 0%, #08111e 70%, #040810 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 50px 60px;
      overflow: hidden;
    }
    .header { text-align: center; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #60A5FA;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 44px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
    }
    .gradient-text {
      background: linear-gradient(135deg, #60A5FA 0%, #C084FC 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      font-size: 20px;
      color: #94A3B8;
      max-width: 800px;
    }
    .mockup {
      width: 100%;
      max-width: 1000px;
      height: 480px;
      background: #0c1828;
      border-radius: 12px;
      border: 1px solid #1e293b;
      box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 30px rgba(59,130,246,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .toolbar {
      height: 54px;
      background: #0f1d32;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
    }
    .tools { display: flex; gap: 10px; }
    .tool-btn {
      background: #192d4a;
      border: 1px solid #2a4365;
      color: #E2E8F0;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .tool-btn.active {
      background: #2563EB;
      border-color: #3B82F6;
      color: white;
    }
    .canvas-area {
      flex: 1;
      background: #08111e;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .sample-doc {
      width: 760px;
      height: 360px;
      background: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      position: relative;
    }
    .doc-bar { height: 16px; background: #E2E8F0; border-radius: 4px; margin-bottom: 14px; width: 60%; }
    .doc-line { height: 10px; background: #F1F5F9; border-radius: 4px; margin-bottom: 10px; width: 90%; }
    .doc-box { width: 100%; height: 160px; background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 6px; margin-top: 20px; }
    .annotation-rect {
      position: absolute;
      top: 60px;
      left: 120px;
      width: 320px;
      height: 180px;
      border: 3px solid #EF4444;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.05);
    }
    .annotation-tag {
      position: absolute;
      top: -14px;
      left: 14px;
      background: #EF4444;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .annotation-arrow {
      position: absolute;
      top: 140px;
      right: 140px;
      width: 160px;
      height: 40px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">🇨🇭 100 % Local & Sans Télémétrie • Par eyelo SA</div>
    <h1>Capture d’Écran & <span class="gradient-text">Éditeur d’Annotations Pro</span></h1>
    <p class="subtitle">Onglet visible, page complète, sélection et zone défilante multi-écrans.</p>
  </div>
  <div class="mockup">
    <div class="toolbar">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-weight:700; font-size:16px;"><span style="color:#3B82F6">Scio</span><span style="color:#A855F7">Nos</span> Capture</span>
      </div>
      <div class="tools">
        <div class="tool-btn">✏️ Rectangle</div>
        <div class="tool-btn active">➔ Flèche</div>
        <div class="tool-btn">🔤 Texte</div>
        <div class="tool-btn">⬛ Masquer</div>
        <div class="tool-btn">✂️ Rogner</div>
      </div>
      <div style="display:flex; gap:8px;">
        <div class="tool-btn" style="background:#0284C7; border-color:#0284C7; color:#fff;">💾 Télécharger PNG</div>
        <div class="tool-btn" style="background:#7C3AED; border-color:#7C3AED; color:#fff;">🌐 Export HTML</div>
      </div>
    </div>
    <div class="canvas-area">
      <div class="sample-doc">
        <div class="doc-bar"></div>
        <div class="doc-line"></div>
        <div class="doc-line" style="width:75%;"></div>
        <div class="doc-box"></div>
        <div class="annotation-rect">
          <div class="annotation-tag">Zone à valider</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const slide2Html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      width: 1280px;
      height: 800px;
      background: radial-gradient(circle at 50% 20%, #151d38 0%, #08111e 70%, #040810 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 50px 60px;
      overflow: hidden;
    }
    .header { text-align: center; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.4);
      color: #C084FC;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 44px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
    }
    .gradient-text {
      background: linear-gradient(135deg, #60A5FA 0%, #C084FC 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      font-size: 20px;
      color: #94A3B8;
      max-width: 800px;
    }
    .grid-features {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
      width: 100%;
      max-width: 1100px;
      margin-top: 20px;
    }
    .card {
      background: #0c1828;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 30px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .card-icon {
      width: 50px;
      height: 50px;
      border-radius: 10px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .card h3 { font-size: 20px; font-weight: 700; color: #F8FAFC; }
    .card p { font-size: 15px; color: #94A3B8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">Nouveauté Exclusive</div>
    <h1>Rapports <span class="gradient-text">HTML Interactifs & Autonomes</span></h1>
    <p class="subtitle">Partagez vos captures dans un fichier HTML tout-en-un sans aucun hébergement tiers.</p>
  </div>
  <div class="grid-features">
    <div class="card">
      <div class="card-icon" style="background:rgba(59, 130, 246, 0.15); color:#60A5FA;">🔍</div>
      <h3>Visionneuse & Zoom</h3>
      <p>Explorez les captures ultra haute résolution avec un zoom fluide (20% à 300%) et déplacement libre (pan/drag).</p>
    </div>
    <div class="card">
      <div class="card-icon" style="background:rgba(168, 85, 247, 0.15); color:#C084FC;">📋</div>
      <h3>Métadonnées & Sécurité</h3>
      <p>Lien source sécurisé, date/heure, dimensions exactes et protection XSS intégrée. Fichier 100% autonome.</p>
    </div>
    <div class="card">
      <div class="card-icon" style="background:rgba(34, 197, 94, 0.15); color:#4ADE80;">🔒</div>
      <h3>Zéro Serveur / RGPD</h3>
      <p>Vos captures restent sur votre appareil. Aucune image ni URL n'est transmise. Conformité suisse nDPA & RGPD.</p>
    </div>
  </div>
  <div style="text-align:center; color:#64748B; font-size:14px;">
    Disponible en 4 langues : Français • English • Español • Deutsch
  </div>
</body>
</html>`;

async function generateScreenshots() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.setContent(slide1Html);
    await page.screenshot({ path: path.join(storeDir, 'screenshot-1-editor.png') });

    await page.setContent(slide2Html);
    await page.screenshot({ path: path.join(storeDir, 'screenshot-2-features.png') });
    console.log('Store screenshots generated in store-assets/');
  } finally {
    await browser.close();
  }
}

generateScreenshots().catch(error => {
  console.error('Store asset generation failed:', error);
  process.exitCode = 1;
});
