// Real native acquisition interruption checks; only API response delivery is delayed in memory.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist/consolidation-1.5.3');
await mkdir(output, { recursive: true });
const channels = process.argv.slice(2);
if (!channels.length) channels.push('chrome', 'msedge');
assert(channels.every(value => ['chrome', 'msedge'].includes(value)));
const report = { startedAt: new Date().toISOString(), command: 'node scripts/native-acquisition-smoke.mjs ' + channels.join(' '),
  limitations: ['Headless disposable windows: real tabs.onActivated and navigation are exercised; physical desktop focus/window switching is not covered.',
    'Context HTTP requests outside loopback are aborted; browser internal background services are additionally disabled, not claimed as OS-level network isolation.'], browsers: [] };
const persist = () => writeFile(path.join(output, 'native-acquisition-results.json'), JSON.stringify(report, null, 2) + '\n');
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end('<!doctype html><title>Synthetic acquisition fixture</title><style>html,body{margin:0;width:800px;height:600px;background:rgb(30,120,210);overflow:hidden}</style>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
async function until(operation, label, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await operation(); if (value) return value; await delay(40); }
  throw new Error('Timed out: ' + label);
}
async function snapshot(worker) {
  return worker.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open('scionos-capture');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const counts = {};
    for (const name of database.objectStoreNames) {
      counts[name] = await new Promise((resolve, reject) => {
        const request = database.transaction(name).objectStore(name).count();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
    }
    database.close();
    const stored = await globalThis.chrome.storage.session.get(null);
    return { counts, mappings: Object.keys(stored).filter(key => key.startsWith('capture-tab:')),
      editors: (await globalThis.chrome.tabs.query({})).filter(tab => tab.url?.includes('/editor.html')).map(tab => tab.url) };
  });
}
function assertEmpty(state) {
  assert.equal(state.counts.captures || 0, 0); assert.equal(state.counts.transfers || 0, 0);
  assert.equal(state.counts.captureChunks || 0, 0); assert.deepEqual(state.mappings, []); assert.deepEqual(state.editors, []);
}
try {
  for (const channel of channels) {
    const result = { channel, status: 'running', scenarios: [], blockedRequests: [], console: [] };
    report.browsers.push(result); await persist();
    const profile = await mkdtemp(path.join(output, 'native-acquisition-profile-' + channel + '-'));
    result.disposableProfile = profile;
    let context;
    let worker;
    try {
      context = await chromium.launchPersistentContext(profile, { channel, headless: true,
        viewport: { width: 800, height: 600 }, deviceScaleFactor: 1, ignoreDefaultArgs: ['--disable-extensions'],
        args: ['--enable-unsafe-extension-debugging', '--disable-background-networking', '--disable-component-update', '--no-first-run', '--disable-sync'] });
      result.browserVersion = context.browser().version();
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (['http:', 'https:'].includes(url.protocol) && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
          result.blockedRequests.push(url.origin); return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      context.on('console', message => { if (message.type() === 'error') result.console.push(message.text()); });
      context.on('page', page => page.on('dialog', async dialog => { result.console.push('dialog: ' + dialog.message()); await dialog.dismiss(); }));
      const cdp = await context.browser().newBrowserCDPSession();
      const extension = await cdp.send('Extensions.loadUnpacked', { path: root });
      worker = context.serviceWorkers().find(item => item.url().startsWith('chrome-extension://' + extension.id))
        || await context.waitForEvent('serviceworker', { timeout: 15000 });
      result.extensionVersion = await worker.evaluate(() => globalThis.chrome.runtime.getManifest().version);
      result.sourceManifestVersion = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')).version;
      await worker.evaluate(() => {
        const original = globalThis.chrome.tabs.captureVisibleTab;
        const state = globalThis.__nativeAcquisitionSmoke = { original, calls: [], nextDelay: 0, events: [] };
        globalThis.chrome.tabs.onActivated.addListener(info => state.events.push({ kind: 'activated', ...info, at: Date.now() }));
        globalThis.chrome.tabs.onUpdated.addListener((tabId, change) => {
          if (change.url || change.status === 'loading') state.events.push({ kind: 'navigation', tabId, url: change.url, status: change.status, at: Date.now() });
        });
        globalThis.chrome.tabs.captureVisibleTab = function (...args) {
          const entry = { startedAt: Date.now(), delayMs: state.nextDelay };
          state.nextDelay = 0; state.calls.push(entry);
          // Call the preserved native API immediately. Never block its promise.
          const native = Reflect.apply(original, globalThis.chrome.tabs, args);
          return native.then(async dataUrl => {
            entry.nativeResolvedAt = Date.now(); entry.nativePng = dataUrl.startsWith('data:image/png;base64,');
            entry.nativeBytes = dataUrl.length;
            if (entry.delayMs) await new Promise(resolve => globalThis.setTimeout(resolve, entry.delayMs));
            entry.deliveredAt = Date.now(); return dataUrl;
          }, error => { entry.nativeError = error.message; throw error; });
        };
      });
      for (const scenario of ['switch-tab', 'switch-return', 'navigate-document']) {
        const evidence = { scenario, status: 'running' }; result.scenarios.push(evidence); await persist();
        try {
          const page = await context.newPage(); await page.goto(base + '/' + scenario);
          const other = await context.newPage(); await other.goto(base + '/other-' + scenario);
          let popup = await context.newPage(); await popup.goto('chrome-extension://' + extension.id + '/popup.html');
          await popup.waitForFunction(() => globalThis.document.getElementById('txt-visible-title').textContent);
          await popup.locator('#capture-delay').selectOption('0');
          const trigger = async () => {
            await page.bringToFront();
            const { targetInfos } = await cdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }, { exclude: true }] });
            const target = targetInfos.find(item => item.url === page.url()); assert(target);
            await cdp.send('Extensions.triggerAction', { id: extension.id, targetId: target.targetId });
            await popup.locator('#btn-visible').evaluate(button => button.click());
          };
          evidence.before = await snapshot(worker); assertEmpty(evidence.before);
          const callIndex = await worker.evaluate(() => { globalThis.__nativeAcquisitionSmoke.nextDelay = 1800; return globalThis.__nativeAcquisitionSmoke.calls.length; });
          const errorIndex = result.console.length;
          await trigger();
          await until(() => worker.evaluate(index => !!globalThis.__nativeAcquisitionSmoke.calls[index]?.nativeResolvedAt, callIndex), 'native capture completed before interruption');
          evidence.sourceTabId = await worker.evaluate(() => globalThis.chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0].id));
          evidence.interruptionAt = Date.now();
          if (scenario === 'navigate-document') {
            const previousDocument = await page.evaluate(() => { globalThis.__documentIdentity = 'old'; return globalThis.location.href; });
            await page.goto(base + '/new-document-' + scenario);
            assert.equal(await page.evaluate(() => globalThis.__documentIdentity), undefined);
            evidence.navigation = { previousDocument, newDocument: page.url(), sameDocument: false };
          } else {
            await other.bringToFront();
            await until(() => worker.evaluate(at => globalThis.__nativeAcquisitionSmoke.events.some(event => event.kind === 'activated' && event.at >= at), evidence.interruptionAt), 'real activation event');
            if (scenario === 'switch-return') await page.bringToFront();
          }
          await until(() => worker.evaluate(index => !!globalThis.__nativeAcquisitionSmoke.calls[index]?.deliveredAt, callIndex), 'delayed native result delivered');
          await until(() => worker.evaluate('pendingAcquisitions.size === 0'), 'acquisition guard cleared');
          await until(() => result.console.slice(errorIndex).some(text => /CAPTURE_VISIBLE_TAB failed/.test(text)), 'worker acquisition rejection');
          if (scenario !== 'navigate-document') await until(() => result.console.slice(errorIndex).some(text => text.startsWith('dialog:')), 'content session rejection handled');
          evidence.rejection = result.console.slice(errorIndex);
          evidence.nativeCall = await worker.evaluate(index => globalThis.__nativeAcquisitionSmoke.calls[index], callIndex);
          evidence.events = await worker.evaluate(at => globalThis.__nativeAcquisitionSmoke.events.filter(event => event.at >= at), evidence.nativeCall.startedAt);
          assert(evidence.nativeCall.nativePng); assert(evidence.interruptionAt < evidence.nativeCall.deliveredAt);
          const during = evidence.events.filter(event => event.at >= evidence.interruptionAt && event.at < evidence.nativeCall.deliveredAt);
          assert(during.some(event => event.kind === (scenario === 'navigate-document' ? 'navigation' : 'activated')));
          if (scenario === 'switch-return') {
            const activations = during.filter(event => event.kind === 'activated');
            assert(activations.length >= 2, 'Switch and return must both occur before response delivery.');
            assert.notEqual(activations[0].tabId, evidence.sourceTabId);
            assert.equal(activations.at(-1).tabId, evidence.sourceTabId);
          }
          evidence.afterInvalid = await snapshot(worker); assertEmpty(evidence.afterInvalid);
          // The same UI and source tab must now accept a new session, and the queue must resolve normally.
          if (popup.isClosed()) {
            popup = await context.newPage(); await popup.goto('chrome-extension://' + extension.id + '/popup.html');
            await popup.waitForFunction(() => globalThis.document.getElementById('txt-visible-title').textContent);
            await popup.locator('#capture-delay').selectOption('0');
          }
          const opened = context.waitForEvent('page', { predicate: item => item !== popup && item !== other && item !== page, timeout: 15000 });
          opened.catch(() => undefined);
          await trigger();
          const editor = await opened; await editor.waitForURL('**/editor.html?capture=*');
          await editor.waitForFunction(() => !globalThis.document.getElementById('tool-text').disabled && globalThis.document.getElementById('empty-state').hidden);
          evidence.recoveryPixels = await editor.locator('#main-canvas').evaluate(canvas => {
            const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            let mismatches = 0;
            for (let index = 0; index < data.length; index += 4) if (data[index] !== 30 || data[index + 1] !== 120 || data[index + 2] !== 210 || data[index + 3] !== 255) mismatches++;
            return { width: canvas.width, height: canvas.height, mismatches };
          });
          assert.deepEqual(evidence.recoveryPixels, { width: 800, height: 600, mismatches: 0 });
          await editor.close(); if (!popup.isClosed()) await popup.close(); await other.close(); await page.close();
          await until(async () => { const state = await snapshot(worker); try { assertEmpty(state); evidence.afterRecoveryClose = state; return true; } catch { return false; } }, 'recovery editor cleanup');
          evidence.status = 'passed';
        } catch (error) { evidence.status = 'failed'; evidence.error = error.stack; throw error; }
        finally { await persist(); }
      }
      result.status = 'passed';
    } catch (error) { result.status = 'failed'; result.error = error.stack; process.exitCode = 1; }
    finally {
      if (worker) await worker.evaluate(() => {
        if (globalThis.__nativeAcquisitionSmoke) globalThis.chrome.tabs.captureVisibleTab = globalThis.__nativeAcquisitionSmoke.original;
      }).catch(() => undefined);
      if (context) await context.close().catch(error => { result.closeError = error.message; });
      // This exact path was created above by mkdtemp, strictly inside the authorized reports directory.
      assert(path.dirname(profile) === output && path.basename(profile).startsWith('native-acquisition-profile-'));
      await rm(profile, { recursive: true, force: true, maxRetries: 3 }).then(() => { result.profileRemoved = true; }).catch(error => { result.profileRemoved = false; result.profileRemovalError = error.message; });
      await persist(); console.log(channel + ': ' + result.status + ' ' + (result.browserVersion || '') + ' (' + result.scenarios.filter(item => item.status === 'passed').length + '/3)');
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve)); report.finishedAt = new Date().toISOString(); await persist();
}
