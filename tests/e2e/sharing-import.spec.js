const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { test, expect, chromium } = require('@playwright/test');
const { decodeZip, crc32 } = require('../../composition-utils.js');

let context;
let extensionOrigin;
const items = page => page.locator('#composition-items li button');
const sourceUrl = 'https://alice:SOURCE_PASSWORD@example.com/source?token=SOURCE_QUERY#SOURCE_FRAGMENT';
const linkUrl = 'https://bob:LINK_PASSWORD@example.com/link?token=LINK_QUERY#LINK_FRAGMENT';
const publicSource = 'https://example.com/source';
const publicLink = 'https://example.com/link';

function archiveEntries(bytes) { return new Map(decodeZip(new Uint8Array(bytes)).map(entry => [entry.name, Buffer.from(entry.data)])); }
function manifest(bytes) { return JSON.parse(archiveEntries(bytes).get('manifest.json').toString('utf8')); }
async function downloadBytes(download) {
  const file = await download.path();
  if (!file) throw new Error('Download was not persisted.');
  return fs.readFile(file);
}
async function imageFixture(page, name, mimeType = 'image/png', color = '#ff0000', width = 240, height = 120) {
  const encoded = await page.evaluate(({ mimeType, color, width, height }) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, width, height);
    const data = canvas.toDataURL(mimeType, 0.95);
    if (!data.startsWith('data:' + mimeType + ';')) throw new Error('Canvas encoder unavailable: ' + mimeType);
    return data.split(',')[1];
  }, { mimeType, color, width, height });
  return { name, mimeType, buffer: Buffer.from(encoded, 'base64') };
}
async function canvasPixel(page, x = 120, y = 60) {
  return page.locator('#main-canvas').evaluate((canvas, { x, y }) => [...canvas.getContext('2d').getImageData(x, y, 1, 1).data], { x, y });
}
async function seedCapture(page) {
  const id = 'sharing-' + randomUUID();
  await page.goto(extensionOrigin + '/editor.html');
  await page.evaluate(async ({ id, sourceUrl, linkUrl }) => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 240;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 640, 240);
    ctx.fillStyle = '#000'; ctx.font = '18px sans-serif'; ctx.fillText('SEARCHABLE LINK', 40, 80);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const createdAt = Date.now();
    await CaptureStore.putCapture({ id, blob, width:640, height:240, createdAt, expiresAt:createdAt + 300000,
      timestamp:new Date(createdAt).toISOString(), title:'Sharing fixture', url:sourceUrl, scale:1,
      textCoordinateSpace:'bitmap', textLayerLimited:false,
      textBlocks:[{text:'SEARCHABLE LINK', x:40, y:60, width:240, height:24, fontSize:18, url:linkUrl}] });
  }, { id, sourceUrl, linkUrl });
  await page.goto(extensionOrigin + '/editor.html?capture=' + id);
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '640');
}
async function saveProject(page) {
  const pending = page.waitForEvent('download'); await page.locator('#btn-save-project').click();
  return downloadBytes(await pending);
}
async function exportDocument(page, format) {
  await page.locator('#btn-download').click(); await page.locator('#export-format').selectOption(format);
  const pending = page.waitForEvent('download'); await page.locator('#export-confirm').click();
  const bytes = await downloadBytes(await pending);
  await expect(page.locator('#export-dialog')).not.toBeVisible(); return bytes;
}
async function printedDocument(page) {
  await page.evaluate(() => { globalThis.print = () => {}; });
  await page.locator('#btn-pdf').click(); await page.locator('#export-confirm').click();
  await expect(page.locator('#export-dialog')).not.toBeVisible();
  await expect(page.locator('#print-area img').first()).toHaveAttribute('src', /^blob:/);
  await page.locator('#print-area img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  const domLinks = await page.locator('#print-area a').evaluateAll(links => links.map(link => link.href));
  const bytes = await page.pdf({ preferCSSPageSize:true, printBackground:true });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({data:new Uint8Array(bytes), isEvalSupported:false, useSystemFonts:true});
  try {
    const pdf = await task.promise; const text = [], links = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const pdfPage = await pdf.getPage(i);
      text.push((await pdfPage.getTextContent()).items.map(item => item.str || '').join(' '));
      links.push(...(await pdfPage.getAnnotations()).filter(annotation => annotation.subtype === 'Link').map(annotation => annotation.url || annotation.unsafeUrl));
    }
    return {text:text.join('\n'), links, domLinks};
  } finally {
    await task.destroy();
    await page.evaluate(() => globalThis.dispatchEvent(new globalThis.Event('afterprint')));
  }
}
function oversizedPng(width, height) {
  // A complete IHDR with valid CRC is enough for dimension preflight. No bitmap or IDAT allocation.
  const bytes = Buffer.alloc(33); Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
  bytes.writeUInt32BE(13, 8); bytes.write('IHDR', 12); bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20);
  bytes[24] = 8; bytes[25] = 6; bytes.writeUInt32BE(crc32(bytes.subarray(12, 29)), 29);
  return bytes;
}

test.beforeAll(async () => {
  const extensionPath = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', {channel:'chromium', headless:true, acceptDownloads:true,
    viewport:{width:1440,height:1000}, args:['--disable-extensions-except=' + extensionPath, '--load-extension=' + extensionPath]});
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  extensionOrigin = 'chrome-extension://' + new URL(worker.url()).host;
});
test.afterAll(async () => { if (context) await context.close(); });

for (const policy of ['sanitized', 'none', 'full']) {
  test('source policy ' + policy + ' governs project, HTML, Markdown and PDF sources and links', async () => {
    const page = await context.newPage();
    try {
      await seedCapture(page);
      await expect(page.locator('#source-policy')).toHaveValue('sanitized');
      await page.locator('#source-policy').selectOption(policy);
      const expectedSource = policy === 'none' ? '' : policy === 'full' ? 'https://example.com/source?token=SOURCE_QUERY#SOURCE_FRAGMENT' : publicSource;
      const expectedLink = policy === 'none' ? '' : policy === 'full' ? 'https://example.com/link?token=LINK_QUERY#LINK_FRAGMENT' : publicLink;
      const projectBytes = await saveProject(page), project = manifest(projectBytes);
      expect(project.schemaVersion).toBe(2); expect(project.exportSettings.sourcePolicy).toBe(policy); expect(project.items[0].url).toBe(expectedSource);
      const reopened = await context.newPage();
      try {
        await reopened.goto(extensionOrigin + '/editor.html');
        await reopened.locator('#project-file').setInputFiles({name:'policy.scionos',mimeType:'application/x-scionos-project',buffer:projectBytes});
        await expect(reopened.locator('#main-canvas')).toHaveAttribute('width','640');
        await expect(reopened.locator('#source-policy')).toHaveValue(policy);
      } finally {await reopened.close();}
      const html = (await exportDocument(page, 'html')).toString('utf8');
      const htmlLinks = await page.evaluate(html => [...new globalThis.DOMParser().parseFromString(html, 'text/html').querySelectorAll('a')].map(a => a.href), html);
      expect(htmlLinks).toEqual(expectedSource ? [expectedSource] : []);
      const markdown = archiveEntries(await exportDocument(page, 'markdown')).get('document.md').toString('utf8');
      if (expectedSource) expect(markdown).toContain('[Source](<' + expectedSource + '>)'); else expect(markdown).not.toContain('[Source]');
      const printed = await printedDocument(page);
      expect(printed.text).toContain('SEARCHABLE LINK');
      if (expectedSource) expect(printed.text).toContain(expectedSource); else expect(printed.text).not.toContain(publicSource);
      expect(printed.domLinks).toEqual(expectedLink ? [expectedLink] : []);
      expect(printed.links).toEqual(expectedLink ? [expectedLink] : []);
      const all = JSON.stringify({project,html,markdown,printed});
      for (const secret of ['SOURCE_PASSWORD', 'LINK_PASSWORD', 'https://alice:', 'https://bob:']) expect(all).not.toContain(secret);
      if (policy !== 'full') for (const secret of ['SOURCE_QUERY','SOURCE_FRAGMENT','LINK_QUERY','LINK_FRAGMENT']) expect(all).not.toContain(secret);
    } finally { await page.close(); }
  });
}

test('library export sanitizes legacy full URLs while a dirty editor and stored archive remain unchanged', async () => {
  const library = await context.newPage(), editor = await context.newPage();
  const id = randomUUID(), title = 'Legacy sharing ' + id;
  try {
    await library.goto(extensionOrigin + '/library.html');
    const original = await library.evaluate(async ({id,title,sourceUrl}) => {
      const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 120;
      canvas.getContext('2d').fillRect(0,0,240,120);
      const image = new Uint8Array(await (await new Promise(resolve => canvas.toBlob(resolve,'image/png'))).arrayBuffer());
      const manifest = {schemaVersion:2,title,settings:{title},items:[{id:'legacy',path:'images/001.png',width:240,height:120,title:'Legacy',caption:'',url:sourceUrl,timestamp:null,annotations:[]}]};
      const blob = new Blob([globalThis.ScionosCompositionUtils.encodeZip([{name:'manifest.json',data:new globalThis.TextEncoder().encode(JSON.stringify(manifest))},{name:'images/001.png',data:image}])]);
      await CaptureStore.saveLibraryProject({id,title,source:sourceUrl,blob},{expectedRevision:null});
      return [...new Uint8Array(await blob.arrayBuffer())];
    }, {id,title,sourceUrl});
    await editor.goto(extensionOrigin + '/editor.html?project=' + id);
    await expect(editor.locator('#main-canvas')).toHaveAttribute('width','240');
    await editor.locator('#composition-title').fill('Dirty editor title');
    await library.reload();
    const card = library.locator('#project-list .card').filter({has:library.getByRole('heading',{name:title,exact:true})});
    const pending = library.waitForEvent('download'); await card.getByRole('button',{name:/Exporter|Export/}).click();
    const exported = manifest(await downloadBytes(await pending));
    expect(exported.exportSettings.sourcePolicy).toBe('sanitized'); expect(exported.items[0].url).toBe(publicSource);
    expect(exported.title).toBe(title); expect(exported.settings.title).toBe(title);
    await expect(editor.locator('#composition-title')).toHaveValue('Dirty editor title');
    const stored = await library.evaluate(async id => [...new Uint8Array(await (await CaptureStore.getLibraryProject(id)).blob.arrayBuffer())], id);
    expect(stored).toEqual(original);
  } finally {
    await library.evaluate(async id => {const record=await CaptureStore.getLibraryProject(id); if(record) await CaptureStore.deleteLibraryProject(id,record.revision);},id).catch(()=>{});
    await editor.close(); await library.close();
  }
});

test('oversized PNG headers reject before createImageBitmap and preserve an existing document', async () => {
  const page = await context.newPage();
  try {
    await page.goto(extensionOrigin + '/editor.html');
    await page.locator('#image-files').setInputFiles(await imageFixture(page,'existing.png'));
    await expect(items(page)).toHaveCount(1); await page.locator('#composition-title').fill('Keep this document');
    const before = await canvasPixel(page);
    await page.evaluate(() => {const original=globalThis.createImageBitmap;globalThis.__bitmapCalls=0;globalThis.createImageBitmap=function(...args){globalThis.__bitmapCalls++;return original.apply(this,args);};});
    for (const [width,height] of [[16385,1],[1,16385],[4001,4000]]) {
      const name='oversized-'+width+'x'+height+'.png';
      await page.locator('#image-files').setInputFiles({name,mimeType:'image/png',buffer:oversizedPng(width,height)});
      await expect(page.locator('#toast')).toContainText(name); await expect(page.locator('#toast')).toHaveAttribute('role','alert');
      expect(await page.evaluate(()=>globalThis.__bitmapCalls)).toBe(0);
      await expect(items(page)).toHaveCount(1); await expect(page.locator('#composition-title')).toHaveValue('Keep this document');
      expect(await canvasPixel(page)).toEqual(before); await expect(page.locator('#main-canvas')).toHaveAttribute('width','240');
    }
  } finally {await page.close();}
});

test('valid Canvas JPEG and WebP imports retain dimensions and visible pixels', async () => {
  const page=await context.newPage();
  try {
    await page.goto(extensionOrigin+'/editor.html');
    const jpeg=await imageFixture(page,'valid.jpg','image/jpeg','#ff0000',240,120);
    const webp=await imageFixture(page,'valid.webp','image/webp','#0000ff',320,160);
    await page.locator('#image-files').setInputFiles([jpeg,webp]); await expect(items(page)).toHaveCount(2);
    await expect(page.locator('#main-canvas')).toHaveAttribute('width','240');
    let pixel=await canvasPixel(page); expect(pixel[0]).toBeGreaterThan(245); expect(pixel[1]).toBeLessThan(10); expect(pixel[2]).toBeLessThan(10);
    await items(page).nth(1).click(); await expect(page.locator('#main-canvas')).toHaveAttribute('width','320'); await expect(page.locator('#main-canvas')).toHaveAttribute('height','160');
    pixel=await canvasPixel(page); expect(pixel[0]).toBeLessThan(10); expect(pixel[1]).toBeLessThan(10); expect(pixel[2]).toBeGreaterThan(245);
  } finally {await page.close();}
});

test('JPEG EXIF orientation 6 imports with rotated bitmap dimensions', async () => {
  const page=await context.newPage();
  try {
    await page.goto(extensionOrigin+'/editor.html');
    const jpeg=await imageFixture(page,'oriented.jpg','image/jpeg','#00ff00',80,40);
    // APP1 Exif, little-endian TIFF, IFD0 with one SHORT orientation=6 and no next IFD.
    const exif=Buffer.from('45786966000049492a0008000000010012010300010000000600000000000000','hex');
    const segment=Buffer.alloc(exif.length+4);segment[0]=0xff;segment[1]=0xe1;segment.writeUInt16BE(exif.length+2,2);exif.copy(segment,4);
    jpeg.buffer=Buffer.concat([jpeg.buffer.subarray(0,2),segment,jpeg.buffer.subarray(2)]);
    await page.locator('#image-files').setInputFiles(jpeg);await expect(items(page)).toHaveCount(1);
    await expect(page.locator('#main-canvas')).toHaveAttribute('width','40');await expect(page.locator('#main-canvas')).toHaveAttribute('height','80');
    const pixel=await canvasPixel(page,20,40);expect(pixel[0]).toBeLessThan(10);expect(pixel[1]).toBeGreaterThan(245);expect(pixel[2]).toBeLessThan(10);
  } finally {await page.close();}
});

for (const placement of ['before IDAT', 'after IDAT']) {
  test('PNG eXIf orientation 6 ' + placement + ' matches the browser bitmap dimensions', async () => {
    const page=await context.newPage();
    try {
      await page.goto(extensionOrigin+'/editor.html');
      const png=await imageFixture(page,'oriented.png','image/png','#00ff00',80,40);
      // PNG eXIf stores TIFF directly, without JPEG's Exif prefix. Chromium only
      // applies it before IDAT; a later valid eXIf must not rotate header geometry.
      const tiff=Buffer.from('49492a0008000000010012010300010000000600000000000000','hex');
      const exif=Buffer.alloc(tiff.length+12);exif.writeUInt32BE(tiff.length,0);exif.write('eXIf',4);tiff.copy(exif,8);
      exif.writeUInt32BE(crc32(exif.subarray(4,exif.length-4)),exif.length-4);
      const target=placement==='before IDAT'?'IDAT':'IEND';
      let offset=8;
      while(offset<png.buffer.length && png.buffer.toString('ascii',offset+4,offset+8)!==target) offset+=png.buffer.readUInt32BE(offset)+12;
      expect(png.buffer.toString('ascii',offset+4,offset+8)).toBe(target);
      png.buffer=Buffer.concat([png.buffer.subarray(0,offset),exif,png.buffer.subarray(offset)]);
      await page.locator('#image-files').setInputFiles(png);await expect(items(page)).toHaveCount(1);
      const [width,height]=placement==='before IDAT'?[40,80]:[80,40];
      await expect(page.locator('#main-canvas')).toHaveAttribute('width',String(width));await expect(page.locator('#main-canvas')).toHaveAttribute('height',String(height));
      expect(await canvasPixel(page,width/2,height/2)).toEqual([0,255,0,255]);
    } finally {await page.close();}
  });
}

test('print replacement and repeated cleanup revoke each owned URL exactly once', async () => {
  const page=await context.newPage();
  try {
    await page.goto(extensionOrigin+'/editor.html');
    const result=await page.evaluate(async()=>{
      globalThis.print=()=>{};
      const original=URL.revokeObjectURL;const revoked=[];URL.revokeObjectURL=function(url){revoked.push(url);return original.call(this,url);};
      const canvas=document.createElement('canvas');canvas.width=100;canvas.height=80;canvas.getContext('2d').fillRect(0,0,100,80);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      const snapshot={title:'Print lifecycle',settings:{title:'Print lifecycle'},exportSettings:{sourcePolicy:'sanitized'},items:[{id:'print',width:100,height:80,blob,title:'',url:'',textBlocks:[]}]};
      const area=document.getElementById('print-area');
      await globalThis.ScionosCompositionExport.print(snapshot,{},area);
      const first=[...area.querySelectorAll('img')].map(image=>image.src);
      await globalThis.ScionosCompositionExport.print(snapshot,{},area);
      const second=[...area.querySelectorAll('img')].map(image=>image.src);
      const afterReplacement=[...revoked];
      globalThis.dispatchEvent(new globalThis.Event('afterprint'));globalThis.dispatchEvent(new globalThis.Event('afterprint'));globalThis.dispatchEvent(new globalThis.Event('pagehide'));
      return {first,second,afterReplacement,revoked,children:area.childNodes.length,marker:area.hasAttribute('data-composition-print')};
    });
    expect(result.first.length).toBeGreaterThan(0);expect(result.second).toHaveLength(result.first.length);expect(result.second[0]).not.toBe(result.first[0]);
    expect(result.afterReplacement).toEqual(result.first);expect(result.revoked).toEqual([...result.first,...result.second]);
    expect(result.children).toBe(0);expect(result.marker).toBe(false);
  } finally {await page.close();}
});

test('overlapping print rendering keeps the newer job alive after the older rejection', async () => {
  const page=await context.newPage();
  try {
    await page.goto(extensionOrigin+'/editor.html');
    const result=await page.evaluate(async()=>{
      globalThis.print=()=>{};
      const canvas=document.createElement('canvas');canvas.width=100;canvas.height=80;canvas.getContext('2d').fillRect(0,0,100,80);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      const snapshot={title:'Overlap',settings:{title:'Overlap'},items:[{id:'image',width:100,height:80,blob}]};
      const area=document.getElementById('print-area');
      const originalBitmap=globalThis.createImageBitmap, originalRevoke=URL.revokeObjectURL;
      const revoked=[];let release,entered;
      const gate=new Promise(resolve=>{release=resolve;});const started=new Promise(resolve=>{entered=resolve;});
      let first=true;
      globalThis.createImageBitmap=async function(...args){
        const bitmap=await originalBitmap.apply(this,args);
        if(first){first=false;entered();await gate;}
        return bitmap;
      };
      URL.revokeObjectURL=function(url){revoked.push(url);return originalRevoke.call(this,url);};
      try {
        const older=globalThis.ScionosCompositionExport.print(snapshot,{},area).then(()=>'',error=>error.message);
        await started;
        await globalThis.ScionosCompositionExport.print({...snapshot,title:'Newer',settings:{title:'Newer'}},{},area);
        const newerUrls=[...area.querySelectorAll('img')].map(image=>image.src);
        release();const olderError=await older;
        const survivingUrls=[...area.querySelectorAll('img')].map(image=>image.src);
        const revokedBeforeCleanup=[...revoked];
        await Promise.all([...area.querySelectorAll('img')].map(image=>image.decode()));
        globalThis.dispatchEvent(new globalThis.Event('afterprint'));
        globalThis.dispatchEvent(new globalThis.Event('pagehide'));
        return {olderError,newerUrls,survivingUrls,revokedBeforeCleanup,revoked,children:area.childNodes.length};
      } finally {release();globalThis.createImageBitmap=originalBitmap;URL.revokeObjectURL=originalRevoke;}
    });
    expect(result.olderError).toContain('superseded');expect(result.newerUrls.length).toBeGreaterThan(0);
    expect(result.survivingUrls).toEqual(result.newerUrls);expect(result.revokedBeforeCleanup).toEqual([]);
    expect(result.revoked).toEqual(result.newerUrls);expect(result.children).toBe(0);
  } finally {await page.close();}
});

test('second snapshot encoder failure releases surfaces and the next export recovers', async () => {
  const page=await context.newPage();
  try {
    await page.goto(extensionOrigin+'/editor.html');
    await page.locator('#image-files').setInputFiles([await imageFixture(page,'red.png'),await imageFixture(page,'blue.png','image/png','#0000ff')]);
    await expect(items(page)).toHaveCount(2);
    await page.evaluate(()=>{
      const original=globalThis.HTMLCanvasElement.prototype.toBlob;let calls=0;
      globalThis.__failedSnapshotSurfaces=[];
      globalThis.HTMLCanvasElement.prototype.toBlob=function(callback,...args){
        globalThis.__failedSnapshotSurfaces.push(this);
        if(++calls===2){globalThis.HTMLCanvasElement.prototype.toBlob=original;globalThis.queueMicrotask(()=>callback(null));return;}
        return original.call(this,callback,...args);
      };
    });
    await page.locator('#btn-download').click();await page.locator('#export-format').selectOption('html');
    await page.locator('#export-confirm').click();
    await expect(page.locator('#export-status')).toContainText('PNG encoding failed');
    await expect(page.locator('#export-confirm')).toBeEnabled();
    expect(await page.evaluate(()=>globalThis.__failedSnapshotSurfaces.map(canvas=>[canvas.width,canvas.height]))).toEqual([[1,1],[1,1]]);
    const pending=page.waitForEvent('download');await page.locator('#export-confirm').click();
    const html=(await downloadBytes(await pending)).toString('utf8');
    await expect(page.locator('#export-dialog')).not.toBeVisible();
    expect((html.match(/<img /g)||[])).toHaveLength(2);
  } finally {await page.close();}
});

test('gated multi-image project snapshot preserves click-time pixels and leaves later edits dirty', async () => {
  const page=await context.newPage();
  try {
    await page.goto(extensionOrigin+'/editor.html');
    await page.locator('#image-files').setInputFiles([await imageFixture(page,'red.png'),await imageFixture(page,'blue.png','image/png','#0000ff')]);
    await expect(items(page)).toHaveCount(2);await items(page).nth(1).click();
    await page.locator('#tool-text').click();
    const canvas=page.locator('#main-canvas'),box=await canvas.boundingBox();
    const dimensions=await canvas.evaluate(element=>({width:element.width,height:element.height}));
    await page.mouse.click(box.x+20/dimensions.width*box.width,box.y+20/dimensions.height*box.height);
    await page.locator('#text-input-overlay').fill('CLICK_TIME_ANNOTATION');await page.locator('#text-input-overlay').press('Enter');
    await page.locator('#composition-title').fill('Click-time title');
    await page.evaluate(()=>{
      const original=globalThis.HTMLCanvasElement.prototype.toBlob;
      globalThis.HTMLCanvasElement.prototype.toBlob=function(callback,...args){
        globalThis.HTMLCanvasElement.prototype.toBlob=original;
        return original.call(this,blob=>{globalThis.__releaseSnapshot=()=>callback(blob);},...args);
      };
    });
    const pending=page.waitForEvent('download');await page.locator('#btn-save-project').click();
    await page.waitForFunction(()=>globalThis.__releaseSnapshot);
    await items(page).nth(1).click();
    await page.locator('#tool-censor').click();await page.locator('#censor-type').selectOption('color');
    await page.locator('#censor-color').evaluate(input=>{input.value='#000000';input.dispatchEvent(new globalThis.Event('input',{bubbles:true}));});
    for(const [key,value] of Object.entries({x:0,y:0,width:240,height:120}))await page.locator('#geometry-'+key).fill(String(value));
    await page.locator('#geometry-apply').click();await page.locator('#composition-title').fill('Later unsaved title');
    expect(await canvasPixel(page)).toEqual([0,0,0,255]);
    await page.evaluate(()=>globalThis.__releaseSnapshot());const bytes=await downloadBytes(await pending);
    const project=manifest(bytes);expect(project.title).toBe('Click-time title');
    expect(project.items[1].annotations.some(annotation=>annotation.text==='CLICK_TIME_ANNOTATION')).toBe(true);
    const entries=archiveEntries(bytes);
    const colors=await page.evaluate(async images=>Promise.all(images.map(async bytes=>{
      const bitmap=await globalThis.createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));
      try {const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);return [...ctx.getImageData(120,60,1,1).data];}finally{bitmap.close();}
    })),project.items.map(item=>[...entries.get(item.path)]));
    expect(colors).toEqual([[255,0,0,255],[0,0,255,255]]);
    const replacement=page.waitForEvent('dialog');
    await page.locator('#project-file').setInputFiles({name:'replacement.scionos',mimeType:'application/x-scionos-project',buffer:bytes});
    await (await replacement).dismiss();
    await expect(page.locator('#composition-title')).toHaveValue('Later unsaved title');expect(await canvasPixel(page)).toEqual([0,0,0,255]);
  } finally {await page.close();}
});

test('HTML and project encode N images once and library adds only one small thumbnail', async () => {
  const page=await context.newPage(); let savedId;
  try {
    await page.goto(extensionOrigin+'/editor.html');
    await page.locator('#image-files').setInputFiles([await imageFixture(page,'red.png'),await imageFixture(page,'blue.png','image/png','#0000ff')]);
    await expect(items(page)).toHaveCount(2);
    await page.evaluate(()=>{const original=globalThis.HTMLCanvasElement.prototype.toBlob;globalThis.__encodes=[];globalThis.HTMLCanvasElement.prototype.toBlob=function(...args){globalThis.__encodes.push({width:this.width,height:this.height,type:args[1]});return original.apply(this,args);};});
    const expected=[{width:240,height:120,type:'image/png'},{width:240,height:120,type:'image/png'}];
    const html=(await exportDocument(page,'html')).toString('utf8'); expect(await page.evaluate(()=>globalThis.__encodes)).toEqual(expected);
    const imageUrls=await page.evaluate(html=>[...new globalThis.DOMParser().parseFromString(html,'text/html').querySelectorAll('img')].map(image=>image.src),html);
    expect(imageUrls).toHaveLength(2);
    const colors=await page.evaluate(async urls=>Promise.all(urls.map(async url=>{const image=new globalThis.Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return [...ctx.getImageData(120,60,1,1).data];})),imageUrls);
    expect(colors).toEqual([[255,0,0,255],[0,0,255,255]]);
    await page.evaluate(()=>{globalThis.__encodes=[];}); const saved=await saveProject(page); expect(manifest(saved).items).toHaveLength(2);
    expect(await page.evaluate(()=>globalThis.__encodes)).toEqual(expected);
    const title='Encoding '+randomUUID(); await page.locator('#composition-title').fill(title);
    await page.evaluate(()=>{globalThis.__encodes=[];}); await page.locator('#btn-save-library').click();
    await expect.poll(()=>page.evaluate(async title=>(await CaptureStore.listLibraryProjects()).some(record=>record.title===title),title)).toBe(true);
    const calls=await page.evaluate(()=>globalThis.__encodes); expect(calls.slice(0,2)).toEqual(expected); expect(calls).toHaveLength(3);
    expect(calls[2]).toEqual({width:220,height:110,type:'image/png'});
    savedId=await page.evaluate(async title=>(await CaptureStore.listLibraryProjects()).find(record=>record.title===title).id,title);
  } finally {
    if(savedId) await page.evaluate(async id=>{const record=await CaptureStore.getLibraryProject(id);if(record)await CaptureStore.deleteLibraryProject(id,record.revision);},savedId).catch(()=>{});
    await page.close();
  }
});
