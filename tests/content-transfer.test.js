const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../content-transfer.js'), 'utf8');
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function createTransfer(sendMessage, Utils) {
  class FileReader {
    readAsDataURL(blob) {
      blob.arrayBuffer().then(buffer => {
        this.result = 'data:image/png;base64,' + Buffer.from(buffer).toString('base64');
        this.onload();
      });
    }
  }
  const context = { Blob, FileReader, chrome: { runtime: { sendMessage } }, document: { title: 'Fixture' }, location: { href: 'https://example.test/' } };
  vm.runInNewContext(source, context);
  return context.ScionosContentTransfer.create({ Utils, text: key => key });
}
function checkpointFor(state) {
  return () => {
    if (state.cancelled) throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });
  };
}

test('cancellation during a rate-limit delay prevents another screenshot request', async () => {
  const delayed = deferred(), release = deferred(), state = { cancelled: false };
  let requests = 0;
  const transfer = createTransfer((_message, callback) => {
    requests += 1;
    callback({ success: false, errorCode: 'RATE_LIMITED' });
  }, { delay: () => { delayed.resolve(); return release.promise; } });
  const pending = transfer.captureVisibleTab(checkpointFor(state));
  await delayed.promise;
  state.cancelled = true;
  release.resolve();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(requests, 1);
});

test('cancellation during a chunk transfer aborts storage and never completes the editor', async () => {
  const appended = deferred(), state = { cancelled: false }, actions = [];
  let release;
  const transfer = createTransfer((message, callback) => {
    actions.push(message.action);
    if (message.action === 'BEGIN_CAPTURE_TRANSFER') callback({ success: true, transferId: 'fixture' });
    else if (message.action === 'APPEND_CAPTURE_CHUNK') { release = callback; appended.resolve(); }
    else callback({ success: true });
  }, { TRANSFER_CHUNK_BYTES: 1024, delay: async () => {} });
  const pending = transfer.openEditor(new Blob(['pixels']), 1, [], false, checkpointFor(state));
  await appended.promise;
  state.cancelled = true;
  release({ success: true });
  await assert.rejects(pending, { name: 'AbortError' });
  assert.deepEqual(actions, ['BEGIN_CAPTURE_TRANSFER', 'APPEND_CAPTURE_CHUNK', 'ABORT_CAPTURE_TRANSFER']);
});
