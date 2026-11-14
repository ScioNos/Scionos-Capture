const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../annotation-model.js');

const text = { kind: 'text', x: 50, y: 30, text: 'abc\ndefg', fontSize: 20, color: '#fff' };
const draw = { kind: 'draw', points: [{ x: 10, y: 20 }, { x: 30, y: 20 }], width: 4, color: '#000' };
const shape = { kind: 'shape', shape: 'rect', mode: 'stroke', start: { x: 100, y: 90 }, end: { x: 20, y: 10 }, width: 4 };
const measureText = line => line.length * 10;

test('supports editor annotation shapes and excludes masks and crops', () => {
  for (const op of [draw, { ...draw, kind: 'highlight' }, { kind: 'arrow', start: { x: 0, y: 0 }, end: { x: 20, y: 30 }, width: 2 }, shape, { kind: 'step', x: 20, y: 20, number: 1, radius: 18 }, text]) assert.equal(model.isValid(op), true);
  for (const op of [{ kind: 'crop', start: { x: 0, y: 0 }, end: { x: 4, y: 4 } }, { kind: 'censor', type: 'color' }, { ...draw, points: [] }, { ...text, x: NaN }]) assert.equal(model.isValid(op), false);
});

test('bounds use matching measured text lines and padding', () => {
  assert.deepEqual(model.bounds(text, { measureText }), { x: 42, y: 24, width: 56, height: 66 });
  const context = { font: '', save() { this.previous = this.font; }, restore() { this.font = this.previous; }, measureText(line) { assert.match(this.font, /20px/); return { width: line.length * 10 }; } };
  assert.deepEqual(model.bounds(text, { context }), model.bounds(text, { measureText }));
  assert.equal(context.font, '');
});

test('selection geometry finds nearest handle and is in canvas coordinates', () => {
  const box = { x: 10, y: 20, width: 100, height: 80 }, handles = model.handles(box);
  assert.deepEqual(handles.se, { x: 110, y: 100 });
  assert.equal(model.hitHandle(box, { x: 109, y: 100 }, { radius: 3 }), 'se');
  assert.equal(model.hitHandle(box, { x: 70, y: 70 }, { radius: 3 }), null);
});

test('hit tests use paths, shapes and topmost ordering', () => {
  assert.equal(model.contains(draw, { x: 20, y: 22 }, { tolerance: 0 }), true);
  assert.equal(model.contains(draw, { x: 20, y: 27 }, { tolerance: 0 }), false);
  assert.equal(model.contains(shape, { x: 60, y: 50 }, { tolerance: 0 }), false);
  assert.equal(model.contains(shape, { x: 20, y: 50 }, { tolerance: 0 }), true);
  const filled = { ...shape, mode: 'fill' };
  assert.equal(model.hitTest([filled, { kind: 'crop' }, { ...filled }], { x: 60, y: 50 }), 2);
  assert.equal(model.hitTest([filled], { x: 1000, y: 1000 }), -1);
  assert.equal(model.contains({ kind: 'arrow', start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, width: 2 }, { x: 100, y: 100 }), false);
});

test('move and resize are immutable and repeatable from the original', () => {
  const original = JSON.parse(JSON.stringify(draw));
  const moved = model.move(draw, 5, -4);
  assert.deepEqual(moved.points, [{ x: 15, y: 16 }, { x: 35, y: 16 }]);
  const b = model.bounds(draw);
  const end = { x: b.x + b.width * 2, y: b.y + b.height * 2 };
  const first = model.resize(draw, 'se', end);
  assert.deepEqual(model.resize(draw, 'se', end), first);
  assert.deepEqual(draw, original);
  assert.ok(first.points[1].x > draw.points[1].x);
  const movedShape = model.move(shape, 3, 4);
  assert.deepEqual(movedShape.start, { x: 103, y: 94 });
  assert.deepEqual(shape.start, { x: 100, y: 90 });
});

test('resize supports text, steps, arrows and does not mirror across anchors', () => {
  const opts = { measureText }, b = model.bounds(text, opts);
  const enlarged = model.resize(text, 'se', { x: b.x + b.width * 2, y: b.y + b.height * 2 }, opts);
  assert.equal(enlarged.fontSize, 40);
  assert.equal(enlarged.text, text.text);
  const badge = { kind: 'step', x: 30, y: 30, radius: 18, number: 7 };
  const bb = model.bounds(badge);
  assert.ok(model.resize(badge, 'se', { x: bb.x + bb.width * 2, y: bb.y + bb.height * 2 }).radius > 18);
  const arrow = { kind: 'arrow', start: { x: 0, y: 0 }, end: { x: 40, y: 40 }, width: 2 };
  const result = model.resize(arrow, 'nw', { x: 1000, y: 1000 });
  assert.ok(Number.isFinite(result.end.x));
  assert.ok(model.isValid(result));
});
