// Synthetic local browser process-memory and library benchmark; no application edits.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, URL } from 'node:url';
import { setTimeout } from 'node:timers';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { chromium } from '@playwright/test';
const exec = promisify(execFile);
const checkout = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = { root: checkout, output: path.join(checkout, 'dist/consolidation-1.5.3/resource-memory.json'), label: 'current', repeats: 1, samples: 3, interval: 100 };
const help = 'node scripts/resource-memory-smoke.mjs [--root ABS] [--baseline-root ABS] [--output dist/consolidation-1.5.3/name.json] [--label current|baseline] [--repeats 1..10] [--samples 1..10] [--interval 0..2000]';
if (process.argv.includes('--help')) { console.log(help); process.exit(0); }
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i].slice(2), value = process.argv[i + 1];
  assert(value && ['root', 'baseline-root', 'output', 'label', 'repeats', 'samples', 'interval'].includes(key), help);
  options[key] = ['repeats', 'samples', 'interval'].includes(key) ? Number(value) : value;
}
assert(['baseline', 'current'].includes(options.label), help);
for (const key of ['repeats', 'samples']) assert(Number.isInteger(options[key]) && options[key] >= 1 && options[key] <= 10, help);
assert(Number.isInteger(options.interval) && options.interval >= 0 && options.interval <= 2000, help);
for (const root of [options.root, options['baseline-root']].filter(Boolean)) assert(path.isAbsolute(root), 'Roots must be absolute.');
options.output = path.resolve(options.output);
const rel = path.relative(path.join(checkout, 'dist/consolidation-1.5.3'), options.output);
assert(rel && !rel.startsWith('..') && !path.isAbsolute(rel) && rel.endsWith('.json'), 'Output must be JSON under dist/consolidation-1.5.3/.');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function identity(root) {
  const files = {};
  for (const name of (await fs.readdir(root)).filter(name => /\.(js|html|css|json)$/.test(name)).sort()) files[name] = createHash('sha256').update(await fs.readFile(path.join(root, name))).digest('hex');
  return { root, files };
}
async function processMemory(browserCdp) {
  const begin = performance.now();
  const info = (await browserCdp.send('SystemInfo.getProcessInfo')).processInfo;
  const pids = info.map(p => p.id);
  assert(pids.every(id => Number.isSafeInteger(id) && id > 0), 'Invalid CDP PID');
  let rows;
  if (process.platform === 'win32') {
    const command = '$ErrorActionPreference="Stop"; @(' + pids.join(',') + ') | ForEach-Object { $p = Get-Process -Id $_ -ErrorAction SilentlyContinue; if ($p) { [pscustomobject]@{pid=$p.Id;workingSetBytes=$p.WorkingSet64;privateBytes=$p.PrivateMemorySize64} } } | ConvertTo-Json -Compress';
    const { stdout } = await exec('pwsh', ['-NoProfile', '-NonInteractive', '-Command', command], { timeout: 15000, windowsHide: true });
    const parsed = JSON.parse(stdout || '[]'); rows = Array.isArray(parsed) ? parsed : [parsed];
  } else if (process.platform === 'linux') {
    rows = (await Promise.all(pids.map(async pid => {
      try {
        const status = await fs.readFile('/proc/' + pid + '/status', 'utf8');
        const rss = status.match(/^VmRSS:\s+(\d+) kB/m);
        let privateBytes = null;
        try { const rollup = await fs.readFile('/proc/' + pid + '/smaps_rollup', 'utf8'); privateBytes = [...rollup.matchAll(/^Private_(?:Clean|Dirty|Hugetlb):\s+(\d+) kB/gm)].reduce((sum, m) => sum + Number(m[1]) * 1024, 0); } catch { /* kernels may restrict smaps */ }
        return { pid, workingSetBytes: rss ? Number(rss[1]) * 1024 : null, privateBytes };
      } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    }))).filter(Boolean);
  } else throw new Error('Process memory sampler supports Windows and Linux only.');
  assert(rows.length > 0, 'No browser process memory rows collected');
  const processes = rows.map(row => ({ ...row, type: info.find(p => p.id === row.pid)?.type }));
  return { timestamp: new Date().toISOString(), elapsedMs: performance.now() - begin, processes, missingPids: pids.filter(pid => !rows.some(row => row.pid === pid)), workingSetSumBytes: rows.reduce((sum, row) => sum + (row.workingSetBytes || 0), 0), privateSumBytes: rows.every(row => row.privateBytes !== null) ? rows.reduce((sum, row) => sum + row.privateBytes, 0) : null };
}
async function snapshot(cdp, page) {
  const samples = [];
  for (let i = 0; i < options.samples; i++) { if (i) await pause(options.interval); samples.push(await processMemory(cdp)); }
  let heap = null;
  if (page && !page.isClosed()) {
    const target = await page.context().newCDPSession(page);
    try { heap = await target.send('Runtime.getHeapUsage'); } finally { await target.detach(); }
  }
  return { samples, heap, samplerWorkMs: samples.reduce((sum, sample) => sum + sample.elapsedMs, 0), maxObservedWorkingSetSumBytes: Math.max(...samples.map(s => s.workingSetSumBytes)), maxObservedPrivateSumBytes: samples.every(s => s.privateSumBytes !== null) ? Math.max(...samples.map(s => s.privateSumBytes)) : null };
}
async function stage(run, cdp, name, page, action) {
  const start = performance.now();
  const result = await action();
  const durationMs = performance.now() - start;
  const sampleStart = performance.now();
  const memory = await snapshot(cdp, page);
  const value = { name, durationMs, result, snapshotWallMs: performance.now() - sampleStart, memory };
  run.stages.push(value); console.log(run.label + ': ' + name + ' ' + durationMs.toFixed(1) + 'ms'); return value;
}
async function download(page, selector) {
  const pending = page.waitForEvent('download'); await page.locator(selector).click();
  if (selector === '#btn-download') await page.locator('#export-confirm').click();
  const item = await pending; assert.equal(await item.failure(), null);
  return { filename: item.suggestedFilename(), bytes: (await fs.stat(await item.path())).size };
}
async function fixtures(context) {
  const page = await context.newPage();
  try {
    await page.setContent('<canvas width="1600" height="1200"></canvas>');
    return await page.evaluate(async () => {
      const canvas = globalThis.document.querySelector('canvas'), ctx = canvas.getContext('2d');
      const files = [];
      for (let i = 0; i < 4; i++) {
        const pixels = ctx.createImageData(1600, 1200);
        for (let n = 0; n < pixels.data.length; n += 4) { pixels.data[n] = (n / 4 + i * 41) & 255; pixels.data[n+1] = ((n / 6400) + i * 71) & 255; pixels.data[n+2] = ((n / 4) ^ (n / 6400) ^ i) & 255; pixels.data[n+3] = 255; }
        ctx.putImageData(pixels, 0, 0);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = ''; for (let p = 0; p < bytes.length; p += 8192) binary += String.fromCharCode(...bytes.subarray(p, p+8192));
        files.push({ name: 'synthetic-' + i + '.png', base64: globalThis.btoa(binary) });
      }
      return files;
    });
  } finally { await page.close(); }
}
async function editor(run, context, cdp, origin, files, count) {
  const page = await context.newPage();
  const prefix = 'editor-' + count;
  try {
    await stage(run, cdp, prefix + '-empty', page, async () => { await page.goto(origin + '/editor.html'); await page.locator('#empty-state').waitFor({state:'visible'}); });
    await stage(run, cdp, prefix + '-import', page, async () => { await page.locator('#image-files').setInputFiles(files.slice(0,count).map(f => ({name:f.name,mimeType:'image/png',buffer:Buffer.from(f.base64,'base64')}))); await page.waitForFunction(n => globalThis.document.querySelectorAll('#composition-items li button').length === n && !globalThis.document.querySelector('#btn-html').disabled, count); return { images:count, dimensions:[1600,1200] }; });
    await stage(run, cdp, prefix + '-crop-retained', page, async () => { await page.locator('#tool-crop').click(); for (const [key,value] of Object.entries({x:100,y:100,width:800,height:600})) await page.locator('#geometry-'+key).fill(String(value)); await page.locator('#geometry-apply').click(); await page.waitForFunction(() => globalThis.document.querySelector('#main-canvas').width === 800); return {crop:[100,100,800,600], undoEnabled:await page.locator('#btn-undo').isEnabled()}; });
    await stage(run, cdp, prefix + '-save-library', page, async () => { await page.locator('#composition-title').fill('Synthetic '+count); await page.locator('#btn-save-library').click(); await page.waitForFunction(async title => (await globalThis.CaptureStore.listLibraryProjects()).some(p=>p.title===title), 'Synthetic '+count); });
    await stage(run, cdp, prefix + '-project-export', page, () => download(page,'#btn-save-project'));
    await stage(run, cdp, prefix + '-html-export', page, () => download(page,'#btn-html'));
    await stage(run, cdp, prefix + '-png-export', page, () => download(page,'#btn-download'));
  } finally { await page.close(); }
  await stage(run, cdp, prefix + '-closed-settled', null, () => pause(1500));
}
async function capturedEditor(run, context, cdp, origin, file) {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    await page.waitForFunction(() => !!globalThis.CaptureStore);
    await stage(run, cdp, 'capture-store-synthetic', page, () => page.evaluate(async base64 => {
      const binary = globalThis.atob(base64), bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      const createdAt = Date.now();
      await globalThis.CaptureStore.putCapture({ id: 'memory-synthetic', blob: new globalThis.Blob([bytes], {type:'image/png'}), width:1600, height:1200, createdAt, expiresAt:createdAt+300000, timestamp:new Date(createdAt).toISOString(), title:'Synthetic capture', url:'https://synthetic.invalid/capture', scale:1, textCoordinateSpace:'bitmap', textBlocks:[] });
      return {width:1600,height:1200,bytes:bytes.length};
    }, file.base64));
    await stage(run, cdp, 'capture-editor-load', page, async () => {
      await page.goto(origin + '/editor.html?capture=memory-synthetic');
      await page.waitForFunction(() => globalThis.document.querySelector('#main-canvas').width === 1600 && !globalThis.document.querySelector('#btn-html').disabled);
    });
  } finally { await page.close(); }
  await stage(run, cdp, 'capture-editor-closed-settled', null, () => pause(1500));
}
async function library(run, context, cdp, origin, count) {
  const page = await context.newPage();
  try {
    await page.goto(origin+'/editor.html'); await page.waitForFunction(()=>!!globalThis.CaptureStore);
    await page.evaluate(async count => {
      await globalThis.CaptureStore.listLibraryProjects();
      const canvas = globalThis.document.createElement('canvas'); canvas.width = 96; canvas.height = 64;
      const paint = canvas.getContext('2d'); const gradient = paint.createLinearGradient(0, 0, 96, 64); gradient.addColorStop(0, '#287ac0'); gradient.addColorStop(1, '#f7c74b'); paint.fillStyle = gradient; paint.fillRect(0, 0, 96, 64);
      const thumbnail = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const db = await new Promise((resolve,reject)=>{const req=globalThis.indexedDB.open('scionos-capture');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
      try { await new Promise((resolve,reject)=>{
        const tx=db.transaction(['libraryProjects','libraryContents'],'readwrite');
        const meta=tx.objectStore('libraryProjects'), content=tx.objectStore('libraryContents'); meta.clear();content.clear();
        const blob=new globalThis.Blob([new Uint8Array(1024)],{type:'application/x-scionos-project'});
        for(let i=0;i<count;i++){const id='synthetic-'+i;meta.put({id,title:'Synthetic project '+String(i).padStart(4,'0'),source:'https://synthetic.invalid/'+i,createdAt:1700000000000+i,updatedAt:1700000000000+i,expiresAt:null,revision:1,thumbnail,size:blob.size+thumbnail.size});content.put({id,blob});}
        tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
      }); } finally {db.close();}
    },count);
    await stage(run,cdp,'library-'+count+'-listing',page,async()=>{await page.goto(origin+'/library.html');await page.waitForFunction(n=>globalThis.document.querySelectorAll('#project-list > li').length===n,count);return {projects:count,cards:await page.locator('#project-list > li').count(),domElements:await page.locator('*').count(),thumbnails:await page.locator('#project-list img').evaluateAll(images=>({total:images.length,loaded:images.filter(img=>img.complete&&img.naturalWidth>0).length}))};});
    await stage(run,cdp,'library-'+count+'-search',page,async()=>{await page.locator('#library-search').fill('project 0000');await page.waitForFunction(()=>globalThis.document.querySelectorAll('#project-list > li').length===1);return {matches:1};});
    await stage(run,cdp,'library-'+count+'-clear-search',page,async()=>{await page.locator('#library-search').fill('');await page.waitForFunction(n=>globalThis.document.querySelectorAll('#project-list > li').length===n,count);});
  } finally {await page.close();}
  await stage(run,cdp,'library-'+count+'-closed-settled',null,()=>pause(1500));
}
const report={schemaVersion:1,startedAt:new Date().toISOString(),platform:{platform:process.platform,release:os.release(),node:process.version},configuration:options,methodology:{processScope:'Only PIDs returned by SystemInfo.getProcessInfo on this disposable browser connection; no process-name enumeration.',memory:'Windows WorkingSet64 and PrivateMemorySize64 (private committed bytes, not private resident memory); Linux VmRSS and smaps_rollup private clean+dirty+hugetlb where permitted. Working-set/RSS sums may double-count shared pages and are not exclusive physical memory.',sampling:'Bounded post-action stage snapshots; maxima are observed stage samples, not exact transient peaks. No forced GC. Action duration excludes snapshots, whose wall time and sampler work are reported separately. Playwright overhead remains included.',fixtures:'Deterministic 1600x1200 PNGs, no user data; library metadata + 96x64 synthetic PNG thumbnails + 1KiB placeholder project blobs inserted directly into temporary IndexedDB, never opened as projects.',limitations:['Headless synthetic extension-origin workload, not native OS screen capture or captureVisibleTab pipeline.','Fresh profile per root/repetition. Same host/browser required for comparison; no arbitrary thresholds.','Snapshots observe retained memory and allocator caching after closure; they do not prove leak absence.']},runs:[]};
try {
  for(const [label,root] of [['baseline',options['baseline-root']],[options.label,options.root]]) {
    if(!root)continue;
    for(let iteration=0;iteration<options.repeats;iteration++) {
      const run={label,iteration,source:await identity(root),stages:[]};report.runs.push(run);
      const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,acceptDownloads:true,viewport:{width:1440,height:1000},args:['--disable-extensions-except='+root,'--load-extension='+root]});
      try {
        context.setDefaultTimeout(60000);
        await context.route(/^https?:/,route=>route.abort());
        const browser=context.browser(),cdp=await browser.newBrowserCDPSession();run.browserVersion=browser.version();
        const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const origin='chrome-extension://'+new URL(worker.url()).host;
        const files=await fixtures(context);run.fixtures=files.map(f=>({name:f.name,bytes:Buffer.from(f.base64,'base64').length,sha256:createHash('sha256').update(Buffer.from(f.base64,'base64')).digest('hex')}));
        await stage(run,cdp,'browser-idle',null,()=>pause(500));
        await capturedEditor(run,context,cdp,origin,files[0]);
        for(const count of [1,4])await editor(run,context,cdp,origin,files,count);
        for(const count of [100,1000])await library(run,context,cdp,origin,count);
        run.sourceAfter=await identity(root);run.sourceStable=JSON.stringify(run.source)===JSON.stringify(run.sourceAfter);assert(run.sourceStable,'Source root changed while measuring');
        await cdp.detach();
      } finally {await context.close();}
    }
  }
  if(options['baseline-root'])report.comparison=report.runs.filter(r=>r.label==='current').flatMap(run=>run.stages.map(s=>{const before=report.runs.find(r=>r.label==='baseline'&&r.iteration===run.iteration)?.stages.find(b=>b.name===s.name);return {iteration:run.iteration,stage:s.name,durationDeltaMs:before?s.durationMs-before.durationMs:null,workingSetDeltaBytes:before?s.memory.maxObservedWorkingSetSumBytes-before.memory.maxObservedWorkingSetSumBytes:null,privateDeltaBytes:before?s.memory.maxObservedPrivateSumBytes-before.memory.maxObservedPrivateSumBytes:null};}));
} catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;} finally {report.finishedAt=new Date().toISOString();await fs.mkdir(path.dirname(options.output),{recursive:true});await fs.writeFile(options.output,JSON.stringify(report,null,2)+'\n');console.log('Report: '+options.output);}
