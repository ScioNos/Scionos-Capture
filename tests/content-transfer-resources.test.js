const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Utils = require('../capture-utils.js');

function harness(encode) {
  const allocated = [];
  const context = vm.createContext({ Blob, document: { createElement() {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: callback => encode(callback) };
    allocated.push(canvas); return canvas;
  } } });
  vm.runInContext(fs.readFileSync(require.resolve('../content-transfer.js'), 'utf8'), context);
  return { allocated, transfer: context.ScionosContentTransfer.create({ Utils, text: key => key }) };
}

for (const failure of [false, true]) test(`temporary resized capture surfaces release after encoding ${failure ? 'failure' : 'success'}`, async () => {
  const h = harness(callback => callback(failure ? null : new Blob(['PNG'])));
  const source = { width: 20000, height: 1000 };
  const pending = h.transfer.prepareCanvasForEditor(source);
  if (failure) await assert.rejects(pending, /preparation failed/);
  else assert.equal((await pending).blob.size, 3);
  assert.ok(h.allocated.length > 0);
  assert.ok(h.allocated.every(canvas => canvas.width === 1 && canvas.height === 1));
  assert.deepEqual(source, { width: 20000, height: 1000 }, 'caller still owns the input canvas');
});

test('successive payload reductions release every owned surface when still oversized', async () => {
  const h = harness(callback => callback({ size: Utils.MAX_TRANSFER_BYTES + 1000000 }));
  const source = { width: 20000, height: 1000 };
  await assert.rejects(h.transfer.prepareCanvasForEditor(source), /captureTooLargeError/);
  assert.ok(h.allocated.length > 1);
  assert.ok(h.allocated.every(canvas => canvas.width === 1 && canvas.height === 1));
  assert.deepEqual(source, { width: 20000, height: 1000 });
});
