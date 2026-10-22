// ============================================================
// ink_extent_V1_0_0.mjs — is the emitted frame HONEST about the ink inside it?
// ------------------------------------------------------------
// THE REGRESSION GUARD FOR FL-0007 / FU-0008. It ships with the fix, and it is
// the net FL-0007 §6 says did not exist: every gate in this repo verified
// internal consistency (PNG vs a baseline rendered with the same defect, export
// keys vs export keys, anchors vs anchors) and NOTHING compared the quantity to
// ground truth. `--audit out_of_frame` looks like it does and does not — it
// fires when ink escapes the frame, and a frame that is too LARGE passes it
// trivially. This module is the missing opposite direction.
//
// ⚠️ IT IS DELIBERATELY A SECOND IMPLEMENTATION. It re-derives the extent by
// walking the RENDERED SVG with its own transform stack, so a defect in the
// engine's measureMarkupExtent cannot hide inside the thing that checks it.
// Do NOT "simplify" this by importing the engine's _mmeScan.
//
// WHERE TRUTH LIVES (FU-0008 §2.3 asked; this is the answer): here, once.
// Both consumers import THIS FILE rather than carrying a copy —
//   · 09_tests/Hospital Example (Golden Case)/tests_V1_0_0/behavior_test.mjs
//     (suite-invoked, gate "behavior", golden case, no PNG toolchain needed)
//   · 09_tests/*/4_checks/check_lib.mjs -> check_page_scale.mjs
//     (per-project, over that project's own rendered sheets)
// The three check_lib copies re-export it; they do not reimplement it.
//
// WHAT "INK" MEANS HERE: exactly what the engine means by it, on purpose.
// Text is measured with the engine's fixed monospace model (0.6em advance,
// 0.8em ascent / 0.25em descent, honoring text-anchor) and a circle/ellipse by
// its circumscribed box, because those ARE the engine's definition of a glyph
// box. Modelling them any other way would make this report a difference of
// DEFINITION as a dishonest frame. What is genuinely independent is the
// traversal: transforms compose here through a real stack, on the emitted
// document, with no shared code.
// ============================================================

const NUM = '-?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?';

// ---- 2x3 affine, SVG order: [a,b,c,d,e,f] => x' = a*x + c*y + e -------------
const I = [1, 0, 0, 1, 0, 0];
function mul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5]
  ];
}
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export function parseTransform(str) {
  let m = I;
  if (!str) return m;
  const re = new RegExp('(matrix|translate|scale|rotate|skewX|skewY)\\s*\\(([^)]*)\\)', 'g');
  let t;
  while ((t = re.exec(str))) {
    const a = (t[2].match(new RegExp(NUM, 'g')) || []).map(Number);
    if (t[1] === 'matrix') {
      if (a.length >= 6) m = mul(m, [a[0], a[1], a[2], a[3], a[4], a[5]]);
    } else if (t[1] === 'translate') {
      m = mul(m, [1, 0, 0, 1, a[0] || 0, a[1] || 0]);
    } else if (t[1] === 'scale') {
      const sx = (a[0] === undefined) ? 1 : a[0];
      const sy = (a[1] === undefined) ? sx : a[1];
      m = mul(m, [sx, 0, 0, sy, 0, 0]);
    } else if (t[1] === 'rotate') {
      const r = (a[0] || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      if (a.length >= 3) m = mul(m, [1, 0, 0, 1, a[1], a[2]]);
      m = mul(m, [c, s, -s, c, 0, 0]);
      if (a.length >= 3) m = mul(m, [1, 0, 0, 1, -a[1], -a[2]]);
    } else if (t[1] === 'skewX') {
      m = mul(m, [1, 0, Math.tan((a[0] || 0) * Math.PI / 180), 1, 0, 0]);
    } else if (t[1] === 'skewY') {
      m = mul(m, [1, Math.tan((a[0] || 0) * Math.PI / 180), 0, 1, 0, 0]);
    }
  }
  return m;
}

function attrsOf(s) {
  const out = {};
  const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[2];
  return out;
}
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };

// Engine's _snapTextLen: strip child tags, collapse each entity to one char.
const glyphLen = c => c.replace(/<[^>]*>/g, '').replace(/&[a-z]+;|&#\d+;/gi, 'x').length;

// Local-space points of one element; null when it draws no ink.
function shapePoints(tag, at, inner) {
  if (tag === 'rect') {
    const x = num(at.x), y = num(at.y), w = num(at.width), h = num(at.height);
    if (!(w > 0) || !(h > 0)) return null;
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }
  if (tag === 'circle' || tag === 'ellipse') {
    const cx = num(at.cx), cy = num(at.cy);
    const rx = num(at.rx !== undefined ? at.rx : at.r), ry = num(at.ry !== undefined ? at.ry : at.r);
    return [[cx - rx, cy - ry], [cx + rx, cy - ry], [cx + rx, cy + ry], [cx - rx, cy + ry]];
  }
  if (tag === 'line') return [[num(at.x1), num(at.y1)], [num(at.x2), num(at.y2)]];
  if (tag === 'polyline' || tag === 'polygon') {
    const n = (at.points || '').match(new RegExp(NUM, 'g')) || [];
    const pts = [];
    for (let i = 0; i + 1 < n.length; i += 2) pts.push([Number(n[i]), Number(n[i + 1])]);
    return pts.length ? pts : null;
  }
  if (tag === 'path') {
    const re = new RegExp('(' + NUM + '),(' + NUM + ')', 'g');
    const pts = []; let p;
    while ((p = re.exec(at.d || ''))) pts.push([Number(p[1]), Number(p[2])]);
    return pts.length ? pts : null;
  }
  if (tag === 'text') {
    const x = num(at.x), y = num(at.y), fs = num(at['font-size'], 10);
    const w = glyphLen(inner || '') * fs * 0.6;
    const anchor = at['text-anchor'] || 'start';
    const x0 = anchor === 'middle' ? x - w / 2 : (anchor === 'end' ? x - w : x);
    const y0 = y - fs * 0.8, y1 = y + fs * 0.25;
    return [[x0, y0], [x0 + w, y0], [x0 + w, y1], [x0, y1]];
  }
  return null;
}

// Extent of every drawn element in `markup`, transforms composed.
// opts.skipRect {x,y,w,h}: drop the full-viewBox background rect snapshotCore
// prepends — it is the frame, not ink, and unioning it makes every frame look
// perfectly honest about itself.
export function inkExtent(markup, opts) {
  opts = opts || {};
  const skip = opts.skipRect || null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const drivers = { minX: '?', minY: '?', maxX: '?', maxY: '?' };
  const ext = (x, y, what) => {
    if (!isFinite(x) || !isFinite(y)) return;
    if (x < minX) { minX = x; drivers.minX = what; }
    if (y < minY) { minY = y; drivers.minY = what; }
    if (x > maxX) { maxX = x; drivers.maxX = what; }
    if (y > maxY) { maxY = y; drivers.maxY = what; }
  };

  const tokRe = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  const stack = [I];
  let t;
  while ((t = tokRe.exec(markup))) {
    const closing = t[1] === '/', tag = t[2], selfClose = t[4] === '/';
    if (closing) { if (stack.length > 1) stack.pop(); continue; }
    const at = attrsOf(t[3]);
    const m = at.transform ? mul(stack[stack.length - 1], parseTransform(at.transform))
                           : stack[stack.length - 1];
    if (tag === 'g' || tag === 'svg' || tag === 'a') { if (!selfClose) stack.push(m); continue; }

    let inner = null;
    if (tag === 'text') {
      const close = markup.indexOf('</text>', tokRe.lastIndex);
      inner = close === -1 ? '' : markup.slice(tokRe.lastIndex, close);
      if (close !== -1) tokRe.lastIndex = close + 7;
    }
    if (tag === 'rect' && skip &&
        Math.abs(num(at.x) - skip.x) < 0.01 && Math.abs(num(at.y) - skip.y) < 0.01 &&
        Math.abs(num(at.width) - skip.w) < 0.01 && Math.abs(num(at.height) - skip.h) < 0.01) continue;

    const pts = shapePoints(tag, at, inner);
    if (!pts) continue;
    const label = tag + (at['data-id'] ? '#' + at['data-id'] : '') +
                  (inner ? ' "' + inner.replace(/<[^>]*>/g, '').trim().slice(0, 24) + '"' : '');
    for (const [px, py] of pts) { const q = apply(m, px, py); ext(q[0], q[1], label); }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY, drivers };
}

export function viewBoxOf(svgText) {
  const m = /viewBox="\s*(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/.exec(svgText);
  if (!m) return null;
  return { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
}

export const SNAPSHOT_PAD = 120;   // must match the engine's SNAPSHOT_PAD

// The assertion itself, for one rendered sheet SVG.
//
// Returns { ok, vb, ink, slack:{l,t,r,b}, worst, drivers } — `slack` is how much
// EMPTY frame each side carries beyond the pad, so 0 is honest, positive is
// phantom (FL-0007's defect) and negative means ink is being CLIPPED, which is
// the failure the tighter frame could newly cause and which `out_of_frame`
// would also catch. Both directions are failures; `tol` is symmetric.
export function frameHonesty(svgText, opts) {
  opts = opts || {};
  const pad = (opts.pad != null) ? opts.pad : SNAPSHOT_PAD;
  const tol = (opts.tol != null) ? opts.tol : 2;
  const vb = viewBoxOf(svgText);
  if (!vb) return { ok: false, reason: 'no viewBox' };
  const ink = inkExtent(svgText, { skipRect: vb });
  if (!ink) return { ok: false, reason: 'no ink' };
  const slack = {
    l: ink.minX - (vb.x + pad),
    t: ink.minY - (vb.y + pad),
    r: (vb.x + vb.w - pad) - ink.maxX,
    b: (vb.y + vb.h - pad) - ink.maxY,
  };
  const worst = Math.max(Math.abs(slack.l), Math.abs(slack.t), Math.abs(slack.r), Math.abs(slack.b));
  return { ok: worst <= tol, vb, ink, slack, worst, tol, pad, drivers: ink.drivers };
}
