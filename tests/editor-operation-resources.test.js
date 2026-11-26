const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Utils = require('../capture-utils.js');

function harness() {
  const state = { allocated: [], calls: [], failure: null };
  function contextFor(role) {
    const stack = [];
    const ctx = { filter: 'none', fillStyle: '#123456', clipped: false,
      save() { stack.push({ filter: this.filter, fillStyle: this.fillStyle, clipped: this.clipped }); },
      restore() { assert.ok(stack.length, 'restore must match a save'); Object.assign(this, stack.pop()); },
      beginPath() {}, rect() {},
      clip() { this.clipped = true; if (state.failure === 'clip') throw new Error('clip refused'); },
      fill() { if (state.failure === 'fill') throw new Error('fill refused'); },
      drawImage(...args) {
        state.calls.push({ role, args, filter: this.filter, clipped: this.clipped });
        if (state.failure === role) throw new Error(role + ' refused');
      }
    };
    return { ctx, depth: () => stack.length };
  }
  const target = contextFor('target');
  const input = { width: 800, height: 600, getContext: () => target.ctx };
  const document = { createElement(name) {
    assert.equal(name, 'canvas');
    const temporary = contextFor('temporary');
    const canvas = { width: 300, height: 150, getContext: () => state.failure === 'context' ? null : temporary.ctx };
    state.allocated.push(canvas); return canvas;
  } };
  const context = vm.createContext({ document });
  vm.runInContext(fs.readFileSync(require.resolve('../editor-operations.js'), 'utf8'), context);
  return { state, input, target, operations: context.ScionosEditorOperations.create({ captureUtils: Utils }) };
}
const blur = { kind: 'censor', type: 'blur', shape: 'rectangle', blur: 4, start: { x: 30, y: 40 }, end: { x: 130, y: 100 } };
const crop = { kind: 'crop', start: { x: 30, y: 40 }, end: { x: 130, y: 100 } };
function inputIntact(h) {
  assert.equal(h.input.width, 800); assert.equal(h.input.height, 600);
}
function temporariesReleased(h) {
  assert.ok(h.state.allocated.length);
  assert.ok(h.state.allocated.every(canvas => canvas.width === 1 && canvas.height === 1));
}
function targetRestored(h) {
  assert.equal(h.target.depth(), 0);
  assert.equal(h.target.ctx.filter, 'none'); assert.equal(h.target.ctx.clipped, false);
  assert.equal(h.target.ctx.fillStyle, '#123456');
}
for (const failure of [null, 'temporary', 'context', 'target', 'clip']) {
  test(`blur releases its temporary source and restores context after ${failure || 'success'}`, () => {
    const h = harness(); h.state.failure = failure;
    if (failure) assert.throws(() => h.operations.applyOperation(h.input, blur));
    else {
      assert.equal(h.operations.applyOperation(h.input, blur), h.input);
      const copy = h.state.calls.find(call => call.role === 'temporary');
      assert.equal(copy.args[0], h.input);
      assert.deepEqual(copy.args.slice(1), [22, 32, 116, 76, 0, 0, 116, 76]);
      const draw = h.state.calls.find(call => call.role === 'target');
      assert.equal(draw.filter, 'blur(4px)'); assert.equal(draw.clipped, true);
      assert.deepEqual(draw.args.slice(1), [22, 32]);
    }
    temporariesReleased(h); inputIntact(h); targetRestored(h);
    h.state.failure = null;
    assert.equal(h.operations.applyOperation(h.input, blur), h.input, 'retry remains usable');
    temporariesReleased(h); targetRestored(h);
  });
}
for (const failure of ['temporary', 'context']) {
  test(`failed crop releases its destination after ${failure} and preserves caller input`, () => {
    const h = harness(); h.state.failure = failure;
    assert.throws(() => h.operations.applyOperation(h.input, crop));
    temporariesReleased(h); inputIntact(h);
    h.state.failure = null;
    const output = h.operations.applyOperation(h.input, crop);
    assert.notEqual(output, h.input); assert.equal(output.width, 100); assert.equal(output.height, 60);
    const draw = h.state.calls.at(-1);
    assert.equal(draw.args[0], h.input); assert.deepEqual(draw.args.slice(1), [30, 40, 100, 60, 0, 0, 100, 60]);
    inputIntact(h);
    output.width = output.height = 1; temporariesReleased(h);
  });
}
test('solid censor restores target state after drawing fails without allocating a source', () => {
  const h = harness(); h.state.failure = 'fill';
  const operation = { ...blur, type: 'color', color: '#000000' };
  assert.throws(() => h.operations.applyOperation(h.input, operation), /fill refused/);
  assert.equal(h.state.allocated.length, 0); inputIntact(h); targetRestored(h);
  h.state.failure = null;
  assert.equal(h.operations.applyOperation(h.input, operation), h.input); targetRestored(h);
});
