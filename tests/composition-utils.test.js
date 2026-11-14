const test = require('node:test');
const assert = require('node:assert/strict');
const { deflateSync } = require('node:zlib');
const fs = require('node:fs');
const vm = require('node:vm');
const { TextEncoder, TextDecoder } = require('node:util');
const { DecompressionStream } = require('node:stream/web');
const U = require('../composition-utils.js');
const { computeLayout, buildPagePlan, encodeZip, decodeZip, encodeProject, decodeProject, crc32 } = U;
const enc = new TextEncoder();
function chunk(type, data) {
  const b = new Uint8Array(data.length + 12), v = new DataView(b.buffer);
  v.setUint32(0, data.length); b.set(enc.encode(type), 4); b.set(data, 8);
  v.setUint32(b.length - 4, crc32(b.subarray(4, b.length - 4))); return b;
}
function png({ width = 2, height = 2, text = '', raw, compressed } = {}) {
  const ihdr = new Uint8Array(13), v = new DataView(ihdr.buffer);
  v.setUint32(0, width); v.setUint32(4, height); ihdr[8] = 8; ihdr[9] = 6;
  const chunks = [new Uint8Array([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr)];
  if (text) chunks.push(chunk('tEXt', enc.encode(text)));
  chunks.push(chunk('IDAT', compressed || deflateSync(raw || new Uint8Array((width * 4 + 1) * height))), chunk('IEND', new Uint8Array()));
  return new Blob(chunks, { type: 'image/png' });
}
function project(blob = png()) {
  return { title: 'Tutoriel', items: [{ id: 'capture-1', blob, title: 'Étape', caption: 'Légende', url: 'https://example.com/page', timestamp: 1700000000000 }], settings: { numbered: true }, exportSettings: { format: 'Letter', header: true } };
}
async function rewriteProject(blob, modify) {
  const entries = decodeZip(new Uint8Array(await blob.arrayBuffer()));
  const manifest = JSON.parse(new TextDecoder().decode(entries[0].data));
  modify(manifest, entries);
  entries[0].data = enc.encode(JSON.stringify(manifest));
  return new Blob([encodeZip(entries)]);
}
test('exposes the identical frozen CommonJS and global API', () => {
  assert.equal(globalThis.ScionosCompositionUtils, U);
  assert.equal(typeof U.cleanPng, 'function');
  assert.equal(U.LIMITS.textBlocksPerItem, 1500);
  assert.equal(Object.isFrozen(U), true);
  const context = { TextEncoder, TextDecoder, Uint32Array, Uint8Array, Blob, DecompressionStream };
  vm.runInNewContext(fs.readFileSync(require.resolve('../composition-utils.js'), 'utf8'), context);
  assert.equal(typeof context.ScionosCompositionUtils.encodeProject, 'function');
});
test('vertical layout harmonizes width without enlargement and reserves all text', () => {
  const input = [{ id: 'a', width: 200, height: 100, title: 'Titre', caption: 'Texte' }, { id: 'b', width: 100, height: 300 }];
  const before = JSON.stringify(input);
  const l = computeLayout(input, { padding: 10, gap: 7, title: 'Document', numbered: true });
  assert.equal(l.width, 120);
  assert.equal(l.items[0].imageWidth, 100); assert.equal(l.items[0].imageHeight, 50);
  assert.equal(l.items[1].imageHeight, 300);
  assert.equal(l.items[0].imageY, l.items[0].y + l.items[0].headingHeight);
  assert.equal(l.items[1].y, l.items[0].y + l.items[0].height + 7);
  assert.equal(l.items[1].heading, '2.');
  assert.equal(l.height, l.items[1].y + l.items[1].height + 10);
  assert.equal(JSON.stringify(input), before);
});
test('horizontal layout harmonizes height, preserves aspect ratio and aligns tops', () => {
  const l = computeLayout([{ id:'a', width:300, height:200 }, { id:'b', width:100, height:100, caption:'x' }], { direction:'horizontal', padding:0, gap:5 });
  assert.equal(l.width, 255); assert.equal(l.height, 128);
  assert.equal(l.items[0].imageWidth, 150); assert.equal(l.items[1].x, 155);
  assert.equal(l.items[0].y, l.items[1].y);
});
test('text estimator wraps long words, Unicode, blank lines and explicit newlines', () => {
  assert.deepEqual(U.estimateTextLines('abcdef', 18, 10), ['abc', 'def']);
  assert.deepEqual(U.estimateTextLines('😀😀\n\nx', 12, 10), ['😀😀', '', 'x']);
  assert.deepEqual(U.estimateTextLines('', 0, 10), []);
  assert.throws(() => U.estimateTextLines('x', NaN, 10));
  assert.throws(() => U.estimateTextLines('x', 10, 0));
  assert.ok(computeLayout([{ id:'x', width:2, height:1, caption:'long' }]).items[0].captionHeight > 20);
});
test('layout has defined empty result and rejects invalid/unbounded values', () => {
  assert.equal(computeLayout([]).items.length, 0);
  for (const dimensions of [{width:0,height:1}, {width:NaN,height:1}, {width:1,height:Infinity}]) assert.throws(() => computeLayout([{id:'x',...dimensions}]));
  assert.throws(() => computeLayout([{id:'x',width:1,height:1},{id:'x',width:1,height:1}]));
  for (const settings of [{direction:'diagonal'}, {gap:-1}, {padding:Infinity}, {background:'url(secret)'}, {numbered:'yes'}]) assert.throws(() => computeLayout([], settings));
});
test('fit page plan fills page width and partitions long image with exact shared edges', () => {
  const p = buildPagePlan(1000, 10000, { marginsMm:10, header:true, footer:{ heightMm:9 } });
  assert.equal(p.columns, 1); assert.equal(p.contentWidthMm, 190); assert.equal(p.contentHeightMm, 260);
  assert.equal(p.pages[0].yMm, 18); assert.equal(p.pages[0].sourceY, 0);
  p.pages.forEach((page, i) => {
    assert.equal(page.sourceWidth, 1000);
    if (i) assert.equal(p.pages[i-1].sourceY + p.pages[i-1].sourceHeight, page.sourceY);
  });
  assert.equal(p.pages.at(-1).sourceY + p.pages.at(-1).sourceHeight, 10000);
});
test('percentage pagination tiles both axes without gaps and obeys paper/orientation', () => {
  const p = buildPagePlan(2000, 3000, { format:'Letter', orientation:'landscape', scale:100, marginsMm:{top:5,right:10,bottom:15,left:20} });
  assert.equal(p.pageWidthMm, 279.4); assert.equal(p.pageHeightMm, 215.9);
  assert.equal(p.mmPerPixel, 25.4/96);
  let area = 0;
  for (let row=0; row<p.rows; row++) {
    const pages = p.pages.filter(page => page.row === row);
    pages.forEach((page, i) => { if (i) assert.equal(pages[i-1].sourceX + pages[i-1].sourceWidth, page.sourceX); area += page.sourceWidth * page.sourceHeight; });
    assert.equal(pages.at(-1).sourceX + pages.at(-1).sourceWidth, 2000);
  }
  assert.ok(Math.abs(area - 6000000) < 0.000001);
  assert.equal(p.pages.at(-1).sourceY + p.pages.at(-1).sourceHeight, 3000);
});
test('page plan enforces 200 pages and valid printable area', () => {
  assert.equal(buildPagePlan(100, 297 * 200, {marginsMm:0, scale:96/25.4*100}).pages.length, 200);
  assert.throws(() => buildPagePlan(100, 297 * 201, {marginsMm:0, scale:96/25.4*100}), /200/);
  for (const settings of [{marginsMm:150}, {scale:0}, {scale:'100%'}, {format:'A3'}, {orientation:'sideways'}, {header:{heightMm:-1}}]) assert.throws(() => buildPagePlan(100,100,settings));
  assert.throws(() => buildPagePlan(0,100));
});
test('STORE ZIP roundtrips Unicode names, empty files and exact bytes', () => {
  const source = [{name:'images/été.png',data:Uint8Array.of(0,1,255)}, {name:'README.md',data:new Uint8Array()}];
  const bytes = encodeZip(source), result = decodeZip(bytes);
  assert.deepEqual(result, source); assert.deepEqual(decodeZip(encodeZip([])), []);
  result[0].data[0] = 45; assert.equal(decodeZip(bytes)[0].data[0], 0);
  assert.equal(crc32(enc.encode('123456789')), 0xcbf43926);
});
test('ZIP rejects traversal, ambiguous/unsafe paths and duplicates', () => {
  for (const name of ['../a','/a','C:/a','a\\b','a//b','a/./b','a/../b','a/','a\0b','CON.txt','a.','a ','e\u0301.png','\ud800']) assert.throws(() => encodeZip([{name,data:new Uint8Array()}]));
  assert.throws(() => encodeZip([{name:'a',data:new Uint8Array()}, {name:'A',data:new Uint8Array()}]), /Duplicate/);
});
test('ZIP rejects corrupted content, headers, flags, methods, offsets and truncation', () => {
  const original = encodeZip([{name:'a',data:Uint8Array.of(1,2,3)}]);
  const central = 34;
  for (const mutate of [b => b[31]^=1, b => b[6]|=1, b=>b[8]=8, b=>b[central+8]|=1, b=>b[central+10]=8, b=>b[central+42]=1, b=>b[central+20]=100, b=>b[central+46]=98]) {
    const bytes = original.slice(); mutate(bytes); assert.throws(() => decodeZip(bytes));
  }
  assert.throws(() => decodeZip(original.subarray(0,original.length-1)));
  assert.throws(() => decodeZip(new Uint8Array(129*1024*1024)), /size/);
  assert.throws(() => encodeZip(Array.from({length:4097},(_,i)=>({name:String(i),data:new Uint8Array()}))), /count/);
});
test('ZIP decode rejects duplicate names, traversal and invalid UTF-8 supplied externally', () => {
  for (const bad of [Uint8Array.of(0xff), enc.encode('.')]) {
    const bytes = encodeZip([{name:'a',data:new Uint8Array()}]);
    bytes.set(bad,30); bytes.set(bad,30+1+46);
    assert.throws(() => decodeZip(bytes));
  }
  const bytes = encodeZip([{name:'a',data:new Uint8Array()}, {name:'b',data:new Uint8Array()}]);
  bytes[61]=97; bytes[62+47+46]=97;
  assert.throws(() => decodeZip(bytes));
});
test('project roundtrip returns validated image dimensions and only allowed data', async () => {
  const doc = project(png({text:'Comment\0secret OCR history'}));
  Object.assign(doc, {original:'secret', history:['secret'], textBlocks:['secret']});
  Object.assign(doc.items[0], {originalBlob:png(), textBlocks:[{text:'secret'}], history:['secret']});
  doc.settings.unknownSecret = 'secret'; doc.exportSettings.unknownSecret = 'secret';
  const blob = await encodeProject(doc);
  const entries = decodeZip(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(entries.length, 2);
  assert.equal(new TextDecoder().decode(entries[0].data).includes('secret'), false);
  assert.equal(new TextDecoder().decode(entries[1].data).includes('secret'), false);
  const result = await decodeProject(blob);
  assert.equal(result.items[0].width, 2); assert.equal(result.items[0].height, 2);
  assert.equal(result.items[0].blob.type, 'image/png');
  assert.equal(result.title, doc.title); assert.equal(result.settings.numbered, true);
  assert.deepEqual(Object.keys(result).sort(), ['title','settings','exportSettings','items'].sort());
  assert.equal(result.items[0].textBlocks, undefined); assert.equal(result.items[0].originalBlob, undefined);
});
test('import never restores unverified text layers or metadata even from injected manifest', async () => {
  const blob = await rewriteProject(await encodeProject(project()), m => { m.textBlocks=[{text:'secret'}]; m.items[0].textBlocks=[{text:'secret'}]; m.items[0].original='secret'; m.history=['secret']; });
  const result = await decodeProject(blob);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});
test('project rejects invalid schema, absent/unreferenced images and dimension lies', async () => {
  const valid = await encodeProject(project());
  for (const modify of [m=>m.schemaVersion=3, m=>m.items[0].path='../outside.png', m=>m.items[0].width=3, m=>m.items[0].id='', m=>m.items[0].timestamp={}, m=>m.items=[], (m,e)=>e.push({name:'extra',data:new Uint8Array()})]) {
    await assert.rejects(decodeProject(await rewriteProject(valid, modify)));
  }
  await assert.rejects(decodeProject(new Blob([encodeZip([{name:'manifest.json',data:enc.encode('{broken')}])])), /manifest/);
});
test('project rejects non PNG, CRC corruption, malformed compressed data and scanlines', async () => {
  await assert.rejects(encodeProject(project(new Blob(['not PNG']))), /PNG/);
  const bytes = new Uint8Array(await png().arrayBuffer()); bytes[20]^=1;
  await assert.rejects(encodeProject(project(new Blob([bytes]))), /CRC/);
  await assert.rejects(encodeProject(project(png({compressed:Uint8Array.of(1,2,3)}))));
  await assert.rejects(encodeProject(project(png({raw:new Uint8Array(1)}))), /size/);
  const raw = new Uint8Array(18); raw[0]=5;
  await assert.rejects(encodeProject(project(png({raw}))), /filter/);
  await assert.rejects(encodeProject(project(png({width:1000000,height:1000000,compressed:Uint8Array.of(1)}))), /dimensions/);
});
test('project validates canvas dimension and pixel limits before inflating PNG', async () => {
  for (const dimensions of [{width:16385,height:1}, {width:1,height:16385}, {width:4001,height:4000}]) {
    await assert.rejects(encodeProject(project(png({...dimensions,compressed:Uint8Array.of(1)}))), /dimensions/);
  }
  const edge = await decodeProject(await encodeProject(project(png({width:16384,height:1}))));
  assert.equal(edge.items[0].width, 16384);
  const pixelsEdge = await decodeProject(await encodeProject(project(png({width:4000,height:4000}))));
  assert.equal(pixelsEdge.items[0].width * pixelsEdge.items[0].height, 16000000);
});
test('schema 2 roundtrips supported annotations and strips extra fields', async () => {
  const doc = project(png({width:100,height:80}));
  const annotations = [
    {kind:'draw',color:'#ff0000',width:4,points:[{x:1,y:2},{x:99,y:79}], secret:'discard'},
    {kind:'highlight',color:'#abc',width:12,points:[{x:3,y:4}]},
    {kind:'arrow',color:'#123456',width:2,start:{x:1,y:2},end:{x:30,y:40}},
    {kind:'shape',color:'#654321',width:4,start:{x:1,y:2},end:{x:30,y:40},shape:'circle',mode:'fill'},
    {kind:'step',color:'#111111',x:20,y:30,number:2,radius:18},
    {kind:'text',color:'#ffffff',x:10,y:12,text:'Hello\nWorld',fontSize:16,bgColor:'rgba(0,0,0,0.75)'}
  ];
  doc.items[0].annotations = annotations;
  doc.items[0].width = 100; doc.items[0].height = 80;
  const archive = await encodeProject(doc);
  const manifest = JSON.parse(new TextDecoder().decode(decodeZip(new Uint8Array(await archive.arrayBuffer()))[0].data));
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.items[0].annotations[0].secret, undefined);
  const decoded = await decodeProject(archive);
  const expected = annotations.map(item => { const copy = {...item}; delete copy.secret; return copy; });
  assert.deepEqual(decoded.items[0].annotations, expected);
  assert.notEqual(decoded.items[0].annotations, annotations);
});
test('moved and duplicated annotations beyond every image edge survive a real project roundtrip', async () => {
  const model = require('../annotation-model.js');
  const annotations = [
    {kind:'draw',color:'#ff0000',width:4,points:[{x:1,y:1},{x:99,y:79}]},
    {kind:'highlight',color:'#abc',width:12,points:[{x:1,y:1},{x:99,y:79}]},
    {kind:'arrow',color:'#123456',width:2,start:{x:1,y:1},end:{x:99,y:79}},
    {kind:'shape',color:'#654321',width:4,start:{x:1,y:1},end:{x:99,y:79},shape:'circle',mode:'stroke'},
    {kind:'step',color:'#111111',x:1,y:1,number:2,radius:18},
    {kind:'text',color:'#ffffff',x:1,y:1,text:'Edge\nannotation',fontSize:16,bgColor:'transparent'}
  ];
  const before = globalThis.structuredClone(annotations);
  // Keyboard/pointer move and the editor's duplicate offset must preserve geometry,
  // including the invisible part that becomes visible when the object is moved back.
  const edited = annotations.flatMap(op => [model.move(op, -2, 0), model.move(op, 0, -3), model.move(model.move(op, 98, 78), 10, 10)]);
  assert.ok(edited.every(model.isValid));
  const doc = project(png({width:100,height:80}));
  doc.items[0].annotations = edited;
  const reopened = await decodeProject(await encodeProject(doc));
  assert.deepEqual(reopened.items[0].annotations, edited);
  assert.deepEqual(annotations, before);
  for (let i = 0; i < edited.length; i++) {
    assert.deepEqual(model.bounds(reopened.items[0].annotations[i]), model.bounds(edited[i]));
  }
  const savedAgain = await decodeProject(await encodeProject(reopened));
  assert.deepEqual(savedAgain.items[0].annotations, edited);
});
test('off-image annotation coordinates have finite bounded margins on save and import', async () => {
  const margin = U.LIMITS.imageDimension;
  const doc = project();
  const op = {kind:'step',color:'#fff',x:-margin,y:2+margin,number:1,radius:10};
  doc.items[0].annotations = [op, {...op,x:2+margin,y:-margin}];
  assert.deepEqual((await decodeProject(await encodeProject(doc))).items[0].annotations, doc.items[0].annotations);
  const base = await encodeProject(project());
  for (const point of [{x:-margin-1,y:0}, {x:3+margin,y:0}, {x:0,y:-margin-1}, {x:0,y:3+margin}, {x:Number.MAX_VALUE,y:0}, {x:0,y:-Number.MAX_VALUE}]) {
    const annotation = {...op,...point};
    doc.items[0].annotations = [annotation];
    await assert.rejects(encodeProject(doc), /Invalid annotation [xy]/);
    const modified = await rewriteProject(base, manifest => { manifest.items[0].annotations = [annotation]; });
    await assert.rejects(decodeProject(modified), /Invalid annotation [xy]/);
  }
});
test('schema 1 migration ignores any annotations and never restores unverified text', async () => {
  const old = await rewriteProject(await encodeProject(project()), manifest => {
    manifest.schemaVersion = 1;
    manifest.items[0].annotations = [{kind:'censor',text:'hidden'}];
    manifest.items[0].textBlocks = [{text:'hidden'}];
  });
  const decoded = await decodeProject(old);
  assert.deepEqual(decoded.items[0].annotations, []);
  assert.equal(decoded.items[0].textBlocks, undefined);
});
test('schema 2 refuses unsupported or malformed annotations on save and import', async () => {
  const valid = {kind:'arrow',color:'#abcdef',width:2,start:{x:0,y:0},end:{x:2,y:2}};
  const invalid = [
    {kind:'censor',color:'#000000'}, {kind:'crop',color:'#000000'},
    {...valid,kind:'other'}, {...valid,color:'url(https://evil)'}, {...valid,color:'rgba(256,0,0,1)'},
    {...valid,start:{x:-U.LIMITS.imageDimension-1,y:0}}, {...valid,end:{x:3+U.LIMITS.imageDimension,y:0}}, {...valid,width:0}, {...valid,width:Infinity},
    {kind:'draw',color:'#fff',width:2,points:[]}, {kind:'highlight',color:'#fff',width:2,points:[{x:0,y:NaN}]},
    {kind:'shape',color:'#fff',width:2,start:{x:0,y:0},end:{x:1,y:1},shape:'rect',mode:'unknown'},
    {kind:'step',color:'#fff',x:0,y:0,number:1.5,radius:10},
    {kind:'text',color:'#fff',x:0,y:0,text:'x',fontSize:12,bgColor:'red'},
    {kind:'text',color:'#fff',x:0,y:0,text:'',fontSize:12,bgColor:'transparent'}
  ];
  const base = await encodeProject(project());
  for (const annotation of invalid) {
    const input = project(); input.items[0].annotations = [annotation];
    await assert.rejects(encodeProject(input));
    const modified = await rewriteProject(base, manifest => { manifest.items[0].annotations = [annotation]; });
    await assert.rejects(decodeProject(modified));
  }
  const wrongSize = project(); wrongSize.items[0].width = 3;
  await assert.rejects(encodeProject(wrongSize), /dimensions/);
});
test('optional UUID annotation identifiers roundtrip and duplicates are refused per item', async () => {
  const id = 'f9380c01-f33c-4c65-8e0a-36297d96b574';
  const op = {kind:'step',id,color:'#fff',x:1,y:1,number:1,radius:10};
  const doc = project(); doc.items[0].annotations = [op];
  const archive = await encodeProject(doc);
  assert.equal((await decodeProject(archive)).items[0].annotations[0].id, id);
  doc.items[0].annotations = [op, {...op,id:id.toUpperCase()}];
  await assert.rejects(encodeProject(doc), /Duplicate annotation id/);
  const duplicate = await rewriteProject(archive, manifest => { manifest.items[0].annotations.push({...op,id:id.toUpperCase()}); });
  await assert.rejects(decodeProject(duplicate), /Duplicate annotation id/);
  doc.items[0].annotations = [{...op,id:'not-an-id'}];
  await assert.rejects(encodeProject(doc), /annotation id/);
  const without = project(); without.items[0].annotations = [{...op}]; delete without.items[0].annotations[0].id;
  assert.equal((await decodeProject(await encodeProject(without))).items[0].annotations[0].id, undefined);
});
test('annotation and point budgets bound work on save and import', async () => {
  const op = {kind:'draw',color:'#000',width:1,points:[{x:0,y:0}]};
  const perItem = project(); perItem.items[0].annotations = Array(1001).fill(op);
  await assert.rejects(encodeProject(perItem), /limit/);
  const valid = await encodeProject(project());
  const oversized = await rewriteProject(valid, manifest => { manifest.items[0].annotations = Array(1001).fill(op); });
  await assert.rejects(decodeProject(oversized), /limit/);
  const many = project(); many.items = Array.from({length:6}, (_,i) => ({...many.items[0],id:String(i),annotations:Array(1000).fill(op)}));
  await assert.rejects(encodeProject(many), /document limit/);
  const points = project(); points.items[0].annotations = [{...op,points:Array(10001).fill({x:0,y:0})}];
  await assert.rejects(encodeProject(points), /points/);
});
test('project validates image count, blob sizes, IDs, metadata and credentials', async () => {
  await assert.rejects(encodeProject({items:[]}), /1–30/);
  await assert.rejects(encodeProject({items:Array(31).fill({})}), /1–30/);
  const duplicate = project(); duplicate.items.push(duplicate.items[0]); await assert.rejects(encodeProject(duplicate), /Duplicate/);
  const oversized = project(new Blob([new Uint8Array(48*1024*1024+1)])); await assert.rejects(encodeProject(oversized), /size/);
  const total = project(new Blob([new Uint8Array(45*1024*1024)])); total.items = [1,2,3].map(id=>({...total.items[0],id:String(id)}));
  await assert.rejects(encodeProject(total), /images limit/);
  const unsafe = project(); unsafe.items[0].url='javascript:alert(1)'; await assert.rejects(encodeProject(unsafe), /URL/);
  const credentials = project(); credentials.items[0].url='https://name:password@example.com/';
  assert.equal((await decodeProject(await encodeProject(credentials))).items[0].url, 'https://example.com/');
});
