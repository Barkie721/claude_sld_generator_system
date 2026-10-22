// Detect annotation tags drawn on top of feeder lines.
//
// WHY THIS EXISTS: _auditSheet() runs four checks and none of them tests a tag
// against a feeder line — `label_overlap` is label x label, `feeder_crossing`
// is feeder x DEVICE. A pill sitting on a feeder run reports zero findings.
// Same blind spot collinear feeder x feeder had before check_feeder_overlaps.mjs.
//
// Sibling of check_feeder_overlaps.mjs: scrapes the rendered LIGHT SVG by
// data-id, not geometry.annotations (which covers 105 of 328 annotations, and
// exports A-1 pill CENTERS with no w/h — you cannot box a pill from it).
//
// PRECONDITION: snapshots must be current. Re-render --theme light after any
// routing or tag-placement change, then re-run.
import { loadProject, loadSVGs } from './check_lib.mjs';

const { t } = loadProject();
const reById = {}; t.routed_elements.forEach(r => reById[r.id] = r);
// A-1 pill groups carry data-id = the FEEDER id (renderTag wrapId), but A-3/A-4
// groups carry data-id = the ANNOTATION id. Without this map every pennant and
// squiggle compares as FOREIGN against its own feeder.
const boundTo = {}; t.annotations.forEach(a => boundTo[a.id] = a.bound_to);
// ...and that map is still not enough for an A-4. Per the A-4 anchor contract
// only anchor:'bus' binds to a routed element; 'primary'/'secondary'/'load'/
// 'default' all bind to the DEVICE. So a fault-current pennant's owner is a
// d-NNN and never equals an r-NNN, and every pennant scored FOREIGN against the
// very feeder its apex is DESIGNED to touch (the whole point of a pennant is to
// point at the fault location). On the project where this was found that meant
// 4 phantom findings — 1 "HARD -2.0 px" on the utility secondary and 3 "0.0 px"
// on the ATS loads, all of them correct drafting. Treat a device-owned tag as
// OWN for any feeder that starts or ends at that device.
const _epDev = {};
t.routed_elements.forEach(r => {
  _epDev[r.id] = new Set([r.start && r.start.device_id, r.end && r.end.device_id].filter(Boolean));
});
const _endpointOwned = (feederId, owner) => !!(_epDev[feederId] && _epDev[feederId].has(owner));
// Sheet map derived from t.sheets, never a literal — a hardcoded ['S1','S2'] in
// check_symbol_clash.mjs skipped a whole sheet in silence for a session.
const SVG = loadSVGs(t);

// ---------------------------------------------------------------- tolerances
const FEEDER_HALF = 0.75;   // feeder stroke-width 1.5
const CLEAR       = 6;      // ink gap below this is TIGHT. Deliberately under
                            // the engine's 10-20 px lane rhythm so legal lane
                            // spacing does not register as a finding.
const CHAR_ADV    = 0.6;    // engine's own monospace advance (sld_engine.mjs:16586)
const ASC = 0.78, DESC = 0.22;  // text box above/below baseline, in em

// ------------------------------------------------------------------ geometry
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

function segSegDist(p1, p2, q1, q2) {
  const r = sub(p2, p1), s = sub(q2, q1), d = cross(r, s), qp = sub(q1, p1);
  if (Math.abs(d) > 1e-12) {
    const tt = cross(qp, s) / d, uu = cross(qp, r) / d;
    if (tt >= 0 && tt <= 1 && uu >= 0 && uu <= 1) return 0;   // they cross
  }
  return Math.min(ptSegDist(p1, q1, q2), ptSegDist(p2, q1, q2),
                  ptSegDist(q1, p1, p2), ptSegDist(q2, p1, p2));
}
function ptSegDist(p, a, b) {
  const ab = sub(b, a), L = dot(ab, ab);
  const tt = L < 1e-12 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / L));
  return Math.hypot(p[0] - (a[0] + tt * ab[0]), p[1] - (a[1] + tt * ab[1]));
}
function ptInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) &&
        p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// 0 when the segment touches or enters the polygon, else the closest approach.
function segPolyDist(a, b, poly) {
  if (ptInPoly(a, poly) || ptInPoly(b, poly)) return 0;
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    best = Math.min(best, segSegDist(a, b, poly[j], poly[i]));
    if (best === 0) return 0;
  }
  return best;
}
const boxPoly = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// SVG transform list -> 2x3 matrix, applied left to right.
function parseTransform(str) {
  let m = [1, 0, 0, 1, 0, 0];                       // a b c d e f
  const mul = (A, B) => [
    A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
    A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
    A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
  ];
  for (const q of str.matchAll(/(translate|rotate|scale|matrix)\(([^)]*)\)/g)) {
    const n = q[2].trim().split(/[\s,]+/).map(Number);
    if (q[1] === 'translate') m = mul(m, [1, 0, 0, 1, n[0], n[1] || 0]);
    else if (q[1] === 'scale') m = mul(m, [n[0], 0, 0, n.length > 1 ? n[1] : n[0], 0, 0]);
    else if (q[1] === 'matrix') m = mul(m, n);
    else {
      const a = n[0] * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      if (n.length > 1) m = mul(m, [1, 0, 0, 1, n[1], n[2]]);
      m = mul(m, [c, s, -s, c, 0, 0]);
      if (n.length > 1) m = mul(m, [1, 0, 0, 1, -n[1], -n[2]]);
    }
  }
  return m;
}
const apply = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];

// Text box from the engine's own metric. The two text layers (A-2 callout,
// A-3 label) are the only ESTIMATED boxes in this checker — pills and pennants
// come from explicit rect/path coordinates.
function textBox(x, y, txt, fs, anchor) {
  const w = txt.length * fs * CHAR_ADV;
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return boxPoly(x0, y - ASC * fs, w, (ASC + DESC) * fs);
}
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// ------------------------------------------------------- scrape each sheet
const feeders = [], tags = [], leaders = [], rules = [];

for (const [sheet, svg] of Object.entries(SVG)) {
  const groups = [...svg.matchAll(/<g class="([a-z-]+)"([^>]*)>([\s\S]*?)<\/g>/g)];

  for (const g of groups) {
    const cls = g[1], attrs = g[2], body = g[3];
    const id = (attrs.match(/data-id="([^"]+)"/) || [])[1] || '';
    const gm = (attrs.match(/transform="([^"]+)"/) || [])[1];
    const M = gm ? parseTransform(gm) : null;
    const des = reById[id] ? (reById[id].designation || id) : id;

    const lines = [...body.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)]
      .map(m => [[+m[1], +m[2]], [+m[3], +m[4]]]);

    if (cls === 'feeder' || cls === 'bus' || cls === 'level-line') {
      const pts = [];
      const poly = body.match(/<polyline points="([^"]+)"/);
      if (poly) pts.push(poly[1].trim().split(/\s+/).map(q => q.split(',').map(Number)));
      lines.forEach(l => pts.push(l));
      for (const chain of pts) {
        for (let i = 0; i < chain.length - 1; i++) {
          const rec = { sheet, id, des, a: chain[i], b: chain[i + 1] };
          if (Math.hypot(...sub(chain[i + 1], chain[i])) < 0.01) continue;
          (cls === 'feeder' ? feeders : rules).push({ ...rec, kind: cls });
        }
      }
    }

    else if (cls === 'feeder-tag') {
      // renderTag() order is [tick, leader, rect, text]: the rect is the ink,
      // the lines are the leader and are EXPECTED to touch their own feeder.
      const rect = body.match(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"/);
      const txt = body.match(/<text x="([-\d.]+)" y="([-\d.]+)" text-anchor="(\w+)" font-family="[^"]*" font-size="([\d.]+)"[^>]*>([^<]*)</);
      if (rect) {
        // Second line is the leader arm: vertical arm => horizontal-orient tag
        // (pill above/below), horizontal arm => side-orient (pill left/right).
        const arm = lines[1];
        const orient = arm && Math.abs(arm[0][0] - arm[1][0]) < 0.01 ? 'horizontal' : 'vertical';
        tags.push({ sheet, layer: 'A-1 pill', owner: id, ownerDes: des, orient,
                    text: txt ? decode(txt[5]) : '',
                    poly: boxPoly(+rect[1], +rect[2], +rect[3], +rect[4]), half: 0.6 });
      } else if (txt) {
        tags.push({ sheet, layer: 'A-2 callout', owner: id, ownerDes: des, orient: '-',
                    text: decode(txt[5]),
                    poly: textBox(+txt[1], +txt[2], decode(txt[5]), +txt[4], txt[3]),
                    half: 0, est: true });
      }
      lines.forEach(l => leaders.push({ sheet, owner: id, ownerDes: des, a: l[0], b: l[1] }));
    }

    else if (cls === 'fc-pennant') {
      const d = body.match(/<path d="([^"]+)"/);
      if (!d || !M) continue;
      // Absolute comma-pairs only (engine guarantees no arc flags in emitted paths).
      let pts = [...d[1].matchAll(/([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2]]);
      // Drop the local (0,0) vertex: that is the ATTACH point, which sits on
      // the feeder by design. Same tip/ink split as a pill's leader vs rect.
      pts = pts.filter(p => Math.hypot(p[0], p[1]) > 0.01);
      const txt = body.match(/>([^<]*)<\/text>/);
      tags.push({ sheet, layer: 'A-4 pennant', owner: boundTo[id] || id, ownerDes: id, orient: '-',
                  text: txt ? decode(txt[1]).trim() : '',
                  poly: pts.map(p => apply(M, p)), half: 1.25 });
    }

    else if (cls === 'squiggle') {
      // The curl terminates its feeder by design — label text only.
      const txt = body.match(/<text x="([-\d.]+)" y="([-\d.]+)" text-anchor="(\w+)" font-family="[^"]*" font-size="([\d.]+)"[^>]*>([^<]*)</);
      if (!txt) continue;
      tags.push({ sheet, layer: 'A-3 label', owner: boundTo[id] || id, ownerDes: id, orient: '-',
                  text: decode(txt[5]),
                  poly: textBox(+txt[1], +txt[2], decode(txt[5]), +txt[4], txt[3]),
                  half: 0, est: true });
    }
  }
}

// ------------------------------------------------------------------ compare
function sweep(boxes, segs) {
  // One row per (tag, feeder) pair, worst gap wins: a polyline contributes
  // several segments and would otherwise report the same clash repeatedly.
  const best = new Map();
  for (const tg of boxes) for (const f of segs) {
    if (f.sheet !== tg.sheet) continue;
    const d = segPolyDist(f.a, f.b, tg.poly);
    const gap = d - FEEDER_HALF - tg.half;
    if (gap >= CLEAR) continue;
    const k = `${boxes.indexOf(tg)}|${f.id}`;
    if (!best.has(k) || gap < best.get(k).gap)
      best.set(k, { tg, f, gap, own: f.id === tg.owner || _endpointOwned(f.id, tg.owner) });
  }
  return [...best.values()].sort((a, b) => a.gap - b.gap);
}

const centre = poly => poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
const fmt = h => {
  const c = centre(h.tg.poly);
  return `  ${h.gap <= 0 ? 'HARD ' : 'tight'}  ${h.tg.sheet}  ${h.tg.layer.padEnd(11)} ` +
         `${('"' + h.tg.text + '"').padEnd(20)} @ (${Math.round(c[0])},${Math.round(c[1])})`.padEnd(46) +
         `x  ${h.f.des.padEnd(9)} ${h.own ? 'OWN    ' : 'FOREIGN'}  gap ${h.gap.toFixed(1)} px` +
         `   [seg ${h.f.a.map(Math.round)} -> ${h.f.b.map(Math.round)}]` +
         (h.tg.est ? ' [text box estimated]' : '');
};

console.log(`scraped: ${feeders.length} feeder segments, ${tags.length} tag boxes ` +
            `(${['A-1 pill', 'A-2 callout', 'A-3 label', 'A-4 pennant'].map(l => `${l} ${tags.filter(x => x.layer === l).length}`).join(', ')}), ` +
            `${leaders.length} leader segments, ${rules.length} bus/level segments`);
console.log(`tolerance: HARD = ink gap <= 0, TIGHT = ink gap < ${CLEAR} px\n`);

const hits = sweep(tags, feeders);
const hard = hits.filter(h => h.gap <= 0), tight = hits.filter(h => h.gap > 0);
console.log(`=== TAG x FEEDER — HARD: ${hard.length}, TIGHT: ${tight.length} ===`);
hits.forEach(h => console.log(fmt(h)));
if (!hits.length) console.log('  (none)');

// Advisory: a leader arm crossing SOMEONE ELSE'S feeder. Its own feeder is
// excluded — the tick is drawn on the line on purpose.
console.log(`\n--- ADVISORY: leader arm x foreign feeder ---`);
const lh = [];
for (const l of leaders) for (const f of feeders) {
  if (f.sheet !== l.sheet || f.id === l.owner) continue;
  const d = segSegDist(l.a, l.b, f.a, f.b);
  if (d - FEEDER_HALF - 0.75 < CLEAR) lh.push({ l, f, gap: d - 1.5 });
}
lh.sort((a, b) => a.gap - b.gap).forEach(h => console.log(
  `  ${h.gap <= 0 ? 'HARD ' : 'tight'}  ${h.l.sheet}  leader of ${h.l.ownerDes.padEnd(9)} x ${h.f.des.padEnd(9)} gap ${h.gap.toFixed(1)} px`));
if (!lh.length) console.log('  (none)');

// Advisory: tags over bus / level-line rules. Kept out of the headline number,
// but the pill_below option exists for exactly this.
// ⚠️ "Advisory" has cost real time: a pennant sitting on a LEVEL LINE scores
// HARD here and is then filed under a heading no phase gate reads. If this
// section is non-empty, look at the drawing before calling the set clean.
console.log(`\n--- ADVISORY: tag x bus / level-line ---`);
const rh = sweep(tags, rules);
rh.forEach(h => console.log(fmt(h)));
if (!rh.length) console.log('  (none)');

// FL-0003: 27 vertical A-1 tags measured a zero align correction, unverified.
const vert = tags.filter(t => t.layer === 'A-1 pill' && t.orient === 'vertical');
const vh = hits.filter(h => vert.includes(h.tg));
console.log(`\n--- FL-0003: vertical-orient A-1 pills ---`);
console.log(`  ${vert.length} of ${tags.filter(t => t.layer === 'A-1 pill').length} pills are side-anchored (pill centre y == attach y by construction)`);
console.log(`  findings among them: ${vh.filter(h => h.gap <= 0).length} HARD, ${vh.filter(h => h.gap > 0).length} tight`);

// ⚠️ This line is the LAST thing printed, after the two advisories. Any `sed`
// or `tail` filter applied to this checker's stdout truncates before it — that
// is why run_pipeline.sh tees the UNFILTERED stream to 2_build/run.log and
// filters only what reaches the screen.
console.log(`\nRESULT tag_feeder_clash tag_feeder_hard=${hard.length} tag_feeder_tight=${tight.length} ` +
            `leader_foreign_hard=${lh.filter(h => h.gap <= 0).length} advisory_rule_hard=${rh.filter(h => h.gap <= 0).length}`);
