// Geometry and immutable editing helpers for user-selectable annotations.
(function registerAnnotationModel(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ScionosAnnotationModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const KINDS = Object.freeze(['draw', 'highlight', 'arrow', 'shape', 'step', 'text']);
  const HANDLES = Object.freeze(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const pointValid = point => point && finite(point.x) && finite(point.y);
  const positive = value => finite(value) && value > 0;

  function isValid(op) {
    if (!op || !KINDS.includes(op.kind)) return false;
    if (op.kind === 'draw' || op.kind === 'highlight') return Array.isArray(op.points) && op.points.length > 0 && op.points.every(pointValid) && positive(op.width);
    if (op.kind === 'arrow') return pointValid(op.start) && pointValid(op.end) && positive(op.width);
    if (op.kind === 'shape') return pointValid(op.start) && pointValid(op.end) && ['rect', 'circle'].includes(op.shape) && ['fill', 'stroke'].includes(op.mode) && (op.width === undefined || positive(op.width));
    if (op.kind === 'step') return finite(op.x) && finite(op.y) && positive(op.radius) && finite(op.number);
    return finite(op.x) && finite(op.y) && typeof op.text === 'string' && op.text.length > 0 && positive(op.fontSize);
  }
  function assertValid(op) { if (!isValid(op)) throw new TypeError('Invalid or unsupported annotation'); }
  function normalized(x1, y1, x2, y2) { return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }; }
  function inflate(box, pad) { return { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 }; }
  // measureText(line, fontSize) returns a canvas-compatible TextMetrics or width.
  function textMetrics(op, options) {
    const size = Math.max(12, op.fontSize || 20);
    const lines = op.text.split('\n');
    const measure = options.measureText;
    const context = options.context;
    let widths;
    if (typeof measure === 'function') {
      widths = lines.map(line => { const result = measure(line, size); return typeof result === 'number' ? result : result?.width; });
    } else if (context && typeof context.measureText === 'function') {
      context.save();
      try { context.font = `bold ${size}px "Segoe UI", system-ui, sans-serif`; widths = lines.map(line => context.measureText(line).width); }
      finally { context.restore(); }
    } else widths = lines.map(line => Array.from(line).length * size * 0.65);
    if (widths.some(width => !finite(width) || width < 0)) throw new TypeError('Invalid text measurement');
    const padX = Math.round(size * 0.4), padY = Math.round(size * 0.3);
    return { size, width: Math.max(0, ...widths), height: lines.length * size * 1.35, padX, padY };
  }
  function bounds(op, options = {}) {
    assertValid(op);
    if (op.kind === 'text') {
      const m = textMetrics(op, options);
      return { x: op.x - m.padX, y: op.y - m.padY, width: m.width + 2 * m.padX, height: m.height + 2 * m.padY };
    }
    if (op.kind === 'step') {
      const radius = Math.max(12, op.radius || 18);
      const pad = Math.max(2, Math.round(radius * 0.12)) / 2;
      return { x: op.x - radius - pad, y: op.y - radius - pad, width: (radius + pad) * 2, height: (radius + pad) * 2 };
    }
    if (op.kind === 'draw' || op.kind === 'highlight') {
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      for (const point of op.points) {
        left = Math.min(left, point.x); top = Math.min(top, point.y);
        right = Math.max(right, point.x); bottom = Math.max(bottom, point.y);
      }
      const width = op.kind === 'highlight' ? Math.max(8, op.width || 16) : op.width;
      return inflate(normalized(left, top, right, bottom), width / 2);
    }
    if (op.kind === 'shape') return inflate(normalized(op.start.x, op.start.y, op.end.x, op.end.y), op.mode === 'stroke' ? (op.width || 4) / 2 : 0);
    const { start, end } = op;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const length = Math.min(Math.max(14, op.width * 3.5), Math.hypot(end.x - start.x, end.y - start.y) * 0.45);
    const points = [start, end, { x: end.x - length * Math.cos(angle - Math.PI / 6), y: end.y - length * Math.sin(angle - Math.PI / 6) }, { x: end.x - length * Math.cos(angle + Math.PI / 6), y: end.y - length * Math.sin(angle + Math.PI / 6) }];
    return inflate(normalized(Math.min(...points.map(p => p.x)), Math.min(...points.map(p => p.y)), Math.max(...points.map(p => p.x)), Math.max(...points.map(p => p.y))), op.width / 2);
  }
  function handles(box) {
    if (!box || ![box.x, box.y, box.width, box.height].every(finite) || box.width < 0 || box.height < 0) throw new TypeError('Invalid bounds');
    const left = box.x, right = left + box.width, top = box.y, bottom = top + box.height, cx = (left + right) / 2, cy = (top + bottom) / 2;
    return { nw: { x: left, y: top }, n: { x: cx, y: top }, ne: { x: right, y: top }, e: { x: right, y: cy }, se: { x: right, y: bottom }, s: { x: cx, y: bottom }, sw: { x: left, y: bottom }, w: { x: left, y: cy } };
  }
  function hitHandle(box, point, options = {}) {
    if (!pointValid(point)) throw new TypeError('Invalid point');
    const radius = options.radius === undefined ? 6 : options.radius;
    if (!finite(radius) || radius < 0) throw new TypeError('Invalid handle radius');
    const positions = handles(box);
    let best = null, distance = Infinity;
    for (const name of HANDLES) {
      const p = positions[name], d = Math.hypot(point.x - p.x, point.y - p.y);
      if (d <= radius && d < distance) { best = name; distance = d; }
    }
    return best;
  }
  function distanceToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, squared = dx * dx + dy * dy;
    const t = squared ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / squared)) : 0;
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function contains(op, point, options = {}) {
    assertValid(op);
    if (!pointValid(point)) throw new TypeError('Invalid point');
    const tolerance = options.tolerance === undefined ? 4 : options.tolerance;
    if (!finite(tolerance) || tolerance < 0) throw new TypeError('Invalid tolerance');
    const b = bounds(op, options);
    if (point.x < b.x - tolerance || point.x > b.x + b.width + tolerance || point.y < b.y - tolerance || point.y > b.y + b.height + tolerance) return false;
    if (op.kind === 'draw' || op.kind === 'highlight') {
      const r = (op.kind === 'highlight' ? Math.max(8, op.width) : op.width) / 2 + tolerance;
      if (op.points.length === 1) return Math.hypot(point.x - op.points[0].x, point.y - op.points[0].y) <= r;
      return op.points.slice(1).some((end, i) => distanceToSegment(point, op.points[i], end) <= r);
    }
    if (op.kind === 'arrow') {
      const angle = Math.atan2(op.end.y - op.start.y, op.end.x - op.start.x), length = Math.min(Math.max(14, op.width * 3.5), Math.hypot(op.end.x - op.start.x, op.end.y - op.start.y) * 0.45);
      const a = { x: op.end.x - length * Math.cos(angle - Math.PI / 6), y: op.end.y - length * Math.sin(angle - Math.PI / 6) };
      const c = { x: op.end.x - length * Math.cos(angle + Math.PI / 6), y: op.end.y - length * Math.sin(angle + Math.PI / 6) };
      const cross = (a1, a2, p) => (a2.x - a1.x) * (p.y - a1.y) - (a2.y - a1.y) * (p.x - a1.x);
      const cs = [cross(op.end, a, point), cross(a, c, point), cross(c, op.end, point)];
      const inHead = length > 0 && (cs.every(v => v >= 0) || cs.every(v => v <= 0));
      return distanceToSegment(point, op.start, op.end) <= op.width / 2 + tolerance || inHead || [a, c].some(p => distanceToSegment(point, op.end, p) <= tolerance);
    }
    if (op.kind === 'step') return Math.hypot(point.x - op.x, point.y - op.y) <= b.width / 2 + tolerance;
    if (op.kind === 'shape' && op.shape === 'circle') {
      const raw = normalized(op.start.x, op.start.y, op.end.x, op.end.y), rx = Math.max(1, raw.width / 2), ry = Math.max(1, raw.height / 2);
      const normalizedDistance = Math.hypot((point.x - (raw.x + raw.width / 2)) / rx, (point.y - (raw.y + raw.height / 2)) / ry);
      const pad = (tolerance + (op.mode === 'stroke' ? (op.width || 4) / 2 : 0)) / Math.min(rx, ry);
      return normalizedDistance <= 1 + pad && (op.mode !== 'stroke' || normalizedDistance >= Math.max(0, 1 - pad));
    }
    if (op.kind === 'shape' && op.mode === 'stroke') {
      const raw = normalized(op.start.x, op.start.y, op.end.x, op.end.y), p = tolerance + (op.width || 4) / 2;
      return !(point.x > raw.x + p && point.x < raw.x + raw.width - p && point.y > raw.y + p && point.y < raw.y + raw.height - p);
    }
    return true;
  }
  // Topmost selectable operation wins; unsupported censor/crop operations are skipped.
  function hitTest(operations, point, options = {}) {
    if (!Array.isArray(operations)) throw new TypeError('Expected operations array');
    for (let i = operations.length - 1; i >= 0; i--) if (isValid(operations[i]) && contains(operations[i], point, options)) return i;
    return -1;
  }
  function move(op, dx, dy) {
    assertValid(op);
    if (!finite(dx) || !finite(dy)) throw new TypeError('Invalid translation');
    const out = { ...op };
    if (op.points) out.points = op.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
    if (op.start) out.start = { ...op.start, x: op.start.x + dx, y: op.start.y + dy };
    if (op.end) out.end = { ...op.end, x: op.end.x + dx, y: op.end.y + dy };
    if (finite(op.x)) out.x = op.x + dx;
    if (finite(op.y)) out.y = op.y + dy;
    return out;
  }
  // Pass the ORIGINAL op on every pointermove to avoid accumulating rounding error.
  // Crossing the opposite handle is clamped to minSize; resizing never mirrors.
  function resize(op, handle, point, options = {}) {
    assertValid(op);
    if (!HANDLES.includes(handle) || !pointValid(point)) throw new TypeError('Invalid resize handle or point');
    const box = bounds(op, options), minSize = options.minSize === undefined ? 4 : options.minSize;
    if (!positive(minSize)) throw new TypeError('Invalid minimum size');
    let left = box.x, top = box.y, right = box.x + box.width, bottom = box.y + box.height;
    if (handle.includes('w')) left = Math.min(point.x, right - minSize);
    if (handle.includes('e')) right = Math.max(point.x, left + minSize);
    if (handle.includes('n')) top = Math.min(point.y, bottom - minSize);
    if (handle.includes('s')) bottom = Math.max(point.y, top + minSize);
    const sx = box.width ? (right - left) / box.width : 1, sy = box.height ? (bottom - top) / box.height : 1;
    const map = p => ({ ...p, x: left + (p.x - box.x) * sx, y: top + (p.y - box.y) * sy });
    const out = { ...op };
    if (op.points) out.points = op.points.map(map);
    if (op.start) out.start = map(op.start);
    if (op.end) out.end = map(op.end);
    if (finite(op.x) && finite(op.y)) Object.assign(out, map({ x: op.x, y: op.y }));
    const uniform = Math.max(0.01, handle === 'n' || handle === 's' ? sy : handle === 'e' || handle === 'w' ? sx : Math.min(sx, sy));
    if (op.kind === 'step') out.radius = Math.max(12, op.radius * uniform);
    if (op.kind === 'text') out.fontSize = Math.max(12, op.fontSize * uniform);
    if (['draw', 'highlight', 'arrow'].includes(op.kind) || op.kind === 'shape' && op.mode === 'stroke') out.width = Math.max(0.1, (op.width || 4) * uniform);
    return out;
  }
  return Object.freeze({ KINDS, HANDLES, isValid, bounds, handles, hitHandle, contains, hitTest, move, resize });
});
