// Trace every feeder by its source panel, and find TRUE crossings.
//
// check_feeder_overlaps.mjs finds only COLLINEAR overlap (two feeders drawn on top of
// each other). snapshot_html.mjs --audit finds only feeder x DEVICE. Neither one tests
// a feeder against another feeder at a right angle -- the classic "conduits crossing"
// defect, and the one a reviewer sees first. This does all three and groups the
// answer by panel.
//
// 2026-07-27: section 2's device box used to be `x0 = anchor.x, y0 = anchor.y`
// for every device, ignoring schema §14.1 anchor_mode. Any `bus_dot_bottom` /
// `bus_dot_top` device has anchor.x at the box CENTRE, so every one of them was
// compared against a box that is not where the ink is — 30 of them on the
// project where this was found. Boxes now come from check_lib's devBox(); the
// sheet map comes from the topology, never a literal.
import { loadProject, loadSVGs, devBox, feederPoints, EPS } from './check_lib.mjs';

const { t, by, G } = loadProject();
const gd = G;
const svg = loadSVGs(t);

// ---------- collect drawn segments, tagged with their routed element ----------
const feeders = [];
for (const r of t.routed_elements) {
  if (r.edge_type !== 'R-1') continue;
  const s = r.start ? by[r.start.device_id] : null, e = r.end ? by[r.end.device_id] : null;
  const sheetSvg = svg[r.sheet_id]; if (!sheetSvg) continue;
  const pts = feederPoints(sheetSvg, r.id);
  if (!pts) continue;
  const H = [], V = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    if (Math.abs(y1 - y2) < 0.01 && Math.abs(x1 - x2) > 0.01) H.push({ y: y1, a: Math.min(x1, x2), b: Math.max(x1, x2) });
    else if (Math.abs(x1 - x2) < 0.01 && Math.abs(y1 - y2) > 0.01) V.push({ x: x1, a: Math.min(y1, y2), b: Math.max(y1, y2) });
  }
  feeders.push({
    id: r.id, des: r.designation || r.id, sheet: r.sheet_id,
    srcId: s ? s.id : null, src: s ? s.designation : '(bus)',
    srcPort: r.start ? r.start.port : '?',
    dstId: e ? e.id : null, dst: e ? e.designation : '?',
    dstPort: r.end ? r.end.port : '?',
    H, V, pts,
  });
}

// ---------- 1. feeder x feeder, true right-angle crossings ----------
const cross = [];
for (let i = 0; i < feeders.length; i++) for (let j = 0; j < feeders.length; j++) {
  if (i === j) continue;
  const f = feeders[i], g = feeders[j];
  if (f.sheet !== g.sheet) continue;
  if (j < i && true) { /* still need both H(f)xV(g) and H(g)xV(f); loop covers both */ }
  for (const h of f.H) for (const v of g.V) {
    if (v.x > h.a + EPS && v.x < h.b - EPS && h.y > v.a + EPS && h.y < v.b - EPS) {
      cross.push({ sheet: f.sheet, x: v.x, y: h.y, over: f, under: g });
    }
  }
}

// ---------- 2. feeder x device box ----------
const hits = [];
for (const f of feeders) {
  for (const [id, g] of Object.entries(gd)) {
    const d = by[id]; if (!d) continue;
    if (d.sheet_id && d.sheet_id !== f.sheet) continue;
    if (id === f.srcId || id === f.dstId) continue;
    const b = devBox(id, gd); if (!b) continue;
    const { x0, x1, y0, y1 } = b;
    let hit = null;
    for (const v of f.V) if (v.x > x0 + EPS && v.x < x1 - EPS && v.b > y0 + EPS && v.a < y1 - EPS) hit = `vertical x=${v.x} through y ${Math.max(v.a, y0)}..${Math.min(v.b, y1)}`;
    for (const h of f.H) if (h.y > y0 + EPS && h.y < y1 - EPS && h.b > x0 + EPS && h.a < x1 - EPS) hit = `horizontal y=${h.y} through x ${Math.max(h.a, x0)}..${Math.min(h.b, x1)}`;
    if (hit) hits.push({ sheet: f.sheet, f, dev: d.designation || id, devId: id, box: `${x0}..${x1} x ${y0}..${y1}`, hit });
  }
}

// ---------- report, grouped by source panel ----------
const crossByFeeder = {};
for (const c of cross) (crossByFeeder[c.over.id] ||= []).push(c);
const hitByFeeder = {};
for (const h of hits) (hitByFeeder[h.f.id] ||= []).push(h);

console.log('='.repeat(78));
console.log('FEEDERS BY SOURCE PANEL');
console.log('='.repeat(78));
const groups = {};
for (const f of feeders) (groups[`${f.sheet}  ${f.src}`] ||= []).push(f);
for (const k of Object.keys(groups).sort()) {
  console.log(`\n${k}   (${groups[k].length} feeder${groups[k].length > 1 ? 's' : ''} out)`);
  for (const f of groups[k].sort((a, b) => a.des.localeCompare(b.des))) {
    const nx = (crossByFeeder[f.id] || []).length + (cross.filter(c => c.under.id === f.id).length);
    const nh = (hitByFeeder[f.id] || []).length;
    const flag = nx || nh ? `  <== ${[nx ? `${nx} feeder-cross` : '', nh ? `${nh} device-hit` : ''].filter(Boolean).join(', ')}` : '';
    console.log(`   ${f.des.padEnd(8)} ${f.id.padEnd(7)} ${f.srcPort.padEnd(13)} -> ${f.dst.padEnd(10)} ${f.dstPort.padEnd(13)} ${f.pts.length} pts${flag}`);
  }
}

console.log(`\n${'='.repeat(78)}`);
console.log(`FEEDER x FEEDER TRUE CROSSINGS: ${cross.length / 1} (each listed once per direction)`);
console.log('='.repeat(78));
const seenPair = new Set();
for (const c of cross.sort((a, b) => a.sheet.localeCompare(b.sheet) || a.y - b.y)) {
  const key = [c.over.id, c.under.id].sort().join('|') + `@${c.x},${c.y}`;
  if (seenPair.has(key)) continue; seenPair.add(key);
  console.log(`  ${c.sheet} @ (${c.x}, ${c.y})`);
  console.log(`      ${c.over.des} ${c.over.src} -> ${c.over.dst}   [horizontal]`);
  console.log(`      ${c.under.des} ${c.under.src} -> ${c.under.dst}   [vertical]`);
}
if (!seenPair.size) console.log('  none');

console.log(`\n${'='.repeat(78)}`);
console.log(`FEEDER x DEVICE BOX: ${hits.length}`);
console.log('='.repeat(78));
for (const h of hits.sort((a, b) => a.sheet.localeCompare(b.sheet))) {
  console.log(`  ${h.sheet}  ${h.f.des} (${h.f.src} -> ${h.f.dst}) ${h.hit}`);
  console.log(`        through ${h.dev} [${h.devId}] box ${h.box}`);
}
if (!hits.length) console.log('  none');

// feeder_x_feeder is the DEDUPED pair count (`seenPair`), which is what the
// acceptance table means by "0 crossings". The headline above counts each
// crossing once per direction, so it runs ~2x — both are emitted so a diff of
// two runs can never be read against the wrong one.
console.log(`\nRESULT trace_feeders feeder_x_feeder=${seenPair.size} feeder_x_feeder_directed=${cross.length} feeder_x_device=${hits.length}`);
