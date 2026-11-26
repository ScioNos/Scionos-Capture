const test = require('node:test');
const assert = require('node:assert/strict');
const { deflateSync } = require('node:zlib');
const { TextEncoder } = require('node:util');
const U = require('../composition-utils.js');
const enc = new TextEncoder();
function png() {
  const chunk = (name, data) => {
    const bytes = new Uint8Array(data.length + 12), view = new DataView(bytes.buffer);
    view.setUint32(0, data.length); bytes.set(enc.encode(name), 4); bytes.set(data, 8);
    view.setUint32(bytes.length - 4, U.crc32(bytes.subarray(4, bytes.length - 4)));
    return bytes;
  };
  const header = new Uint8Array(13), view = new DataView(header.buffer);
  view.setUint32(0, 1); view.setUint32(4, 1); header[8] = 8; header[9] = 6;
  return new Blob([Uint8Array.of(137,80,78,71,13,10,26,10), chunk('IHDR', header), chunk('IDAT', deflateSync(Uint8Array.of(0,0,0,0,0))), chunk('IEND', new Uint8Array())]);
}
function project() {
  return { title: '中文 😀 " \\ \n', settings: {title:'é'}, exportSettings: {sourcePolicy:'sanitized',imageOnly:true}, items: [{id:'a',width:1,height:1,title:'😀',caption:'é',url:'https://example.com/?secret=yes',blob:png(),annotations:[{kind:'text',color:'#fff',bgColor:'transparent',text:'中文 😀 " \\ \n',x:0,y:0,fontSize:12}]}] };
}
test('JSON budget counts exact UTF8 and JSON escaping without changing state', () => {
  const value = {text:'é中😀"\\\n\t\ud800', list:[1,-0,null,true,false,undefined], omitted:undefined};
  assert.equal(U.jsonUtf8Bytes(value), enc.encode(JSON.stringify(value)).length);
  const bytes = U.jsonUtf8Bytes(value);
  assert.equal(U.jsonUtf8Bytes(value, bytes), bytes);
  assert.throws(() => U.jsonUtf8Bytes(value, bytes - 1), /JSON.*limit/);
  assert.equal(value.text, 'é中😀"\\\n\t\ud800');
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => U.jsonUtf8Bytes(cycle), /JSON/);
});
test('project preflight exactly matches manifest UTF8 and STORE ZIP including imageOnly', async () => {
  const doc = project(), budget = U.measureProject(doc);
  const blob = await U.encodeProject(doc);
  const entries = U.decodeZip(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(budget.manifestBytes, entries[0].data.length);
  assert.equal(budget.zipBytes, blob.size);
  assert.equal(budget.imageBytes, entries[1].data.length);
  assert.equal((await U.decodeProject(blob)).exportSettings.imageOnly, true);
  assert.equal((await U.decodeProject(await U.rewriteProjectMetadata(blob,{title:'new'}))).exportSettings.imageOnly, true);
});
test('oversized UTF8 annotations are rejected before reading image blobs', async () => {
  const doc = project(); let reads = 0;
  doc.items[0].blob.arrayBuffer = async () => { reads++; throw new Error('image read too early'); };
  doc.items[0].annotations = Array.from({length:400}, () => ({kind:'text',color:'#fff',bgColor:'transparent',text:'中'.repeat(1000),x:0,y:0,fontSize:12}));
  await assert.rejects(U.encodeProject(doc), /Manifest size limit/);
  assert.equal(reads, 0);
});
test('preflight includes STORE overhead even if images alone fit their quota', () => {
  const doc = project();
  doc.items = Array.from({length:4}, (_,i) => ({...doc.items[0],id:String(i),blob:undefined,imageBytes:U.LIMITS.totalImageBytes / 4}));
  assert.throws(() => U.measureProject(doc), /ZIP size limit/);
  doc.items[3].imageBytes -= U.LIMITS.manifestBytes;
  assert.ok(U.measureProject(doc).zipBytes < U.LIMITS.zipBytes);
});
test('manifest accepts the exact byte limit and rejects the next ASCII byte', async () => {
  const doc = project();
  doc.items[0].annotations = Array.from({length:105}, () => ({kind:'text',color:'#fff',bgColor:'transparent',text:'a',x:0,y:0,fontSize:12}));
  let remaining = U.LIMITS.manifestBytes - U.measureProject(doc).manifestBytes;
  for (const annotation of doc.items[0].annotations) {
    const added = Math.min(9999, remaining);
    annotation.text += 'a'.repeat(added); remaining -= added;
  }
  assert.equal(remaining, 0);
  assert.equal(U.measureProject(doc).manifestBytes, U.LIMITS.manifestBytes);
  const archive = await U.encodeProject(doc);
  assert.equal(U.decodeZip(new Uint8Array(await archive.arrayBuffer()))[0].data.length, U.LIMITS.manifestBytes);
  doc.items[0].annotations.at(-1).text += 'a';
  assert.throws(() => U.measureProject(doc), /Manifest size limit/);
  await assert.rejects(U.encodeProject(doc), /Manifest size limit/);
});
test('STORE ZIP preflight accepts its exact byte boundary and rejects one extra byte', () => {
  const doc = project();
  doc.items = Array.from({length:4}, (_,i) => ({...doc.items[0],id:String(i),blob:undefined,imageBytes:1}));
  const overhead = U.measureProject(doc).zipBytes - 4;
  let remaining = U.LIMITS.zipBytes - overhead;
  for (const item of doc.items) { item.imageBytes = Math.min(32 * 1024 * 1024, remaining); remaining -= item.imageBytes; }
  assert.equal(remaining, 0);
  assert.equal(U.measureProject(doc).zipBytes, U.LIMITS.zipBytes);
  doc.items.at(-1).imageBytes++;
  assert.throws(() => U.measureProject(doc), /ZIP size limit/);
});
test('JSON byte counter supports DAGs, sparse arrays, numbers and rejects invalid budgets', () => {
  const shared = {s:'😀'}, value = {a:shared,b:shared,array:new Array(1).concat([undefined,NaN,Infinity,-Infinity,-0])};
  assert.equal(U.jsonUtf8Bytes(value), enc.encode(JSON.stringify(value)).length);
  for (const limit of [-1, NaN, 0.5, '1']) assert.throws(() => U.jsonUtf8Bytes(value,limit), /JSON/);
});
test('imageOnly defaults false for legacy settings and rejects non booleans', async () => {
  const doc = project(); delete doc.exportSettings.imageOnly;
  assert.equal((await U.decodeProject(await U.encodeProject(doc))).exportSettings.imageOnly, false);
  doc.exportSettings.imageOnly = 'true';
  await assert.rejects(U.encodeProject(doc), /imageOnly/);
});
