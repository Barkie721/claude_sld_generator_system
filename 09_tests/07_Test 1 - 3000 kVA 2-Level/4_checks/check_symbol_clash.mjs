// Two more ungated surfaces, both found by eye on 2026-07-26:
//
//  A. A feeder running through its OWN parent/child device box. trace_feeders.mjs
//     skips the source and destination on purpose (a feeder is supposed to touch
//     them), so a jog row that lands INSIDE the parent panel is invisible to it —
//     and --audit's feeder_crossing excludes the endpoints too. F-641's jog row
//     landed at y=3174 inside O4S-1-A (3124..3212) and cut the panel's own text.
//     Rule used here: touching an EDGE is legal, crossing the interior is not.
//
//  B. A tag pill / pennant overlapping a DEVICE box. --audit's label_overlap is
//     label x label and glyph_collision is glyph x glyph; neither compares the
//     two layers.
//
//  C. A feeder running through an EQUIPMENT LABEL (A-8). Every device box here
//     is the SYMBOL box; the label block beside it is not part of it. 4T-1-B's
//     "480Δ-208Y/120V" line reaches 109 px past its own 49 px symbol, so a
//     riser dropping down that column cuts the text and no box test sees it.
//     These are the two --audit feeder_crossing findings that were dismissed as
//     false positives (r-806 x d-869 on S1, r-855 x d-893 on S2) -- both real.
//
// 2026-07-27: boxes now come from check_lib's devBox(), which honours schema
// §14.1 anchor_mode. This file used to read `x0 = anchor.x` for every device;
// any bus_dot_bottom/bus_dot_top device has anchor.x at the CENTRE, so its
// collisions were tested in the wrong place (30 such devices on the project
// where this was found) -- and the sheet list on section B was hardcoded
// ['S1','S2'], so a third sheet was never scanned at all.
import { loadProject, sheetIds, loadSVGs, deviceBoxes, textBoxes, feederPoints, segPenetration, EPS } from './check_lib.mjs';

const { t, by, G } = loadProject();
const SVG = loadSVGs(t);

// ---------- device boxes from the geometry block ----------
const boxes = deviceBoxes(t, by, G);

// ---------- A. feeders through a device interior, endpoints INCLUDED ----------
console.log('='.repeat(78));
console.log('A. FEEDER THROUGH A DEVICE INTERIOR (own parent/child included)');
console.log('='.repeat(78));
let nA = 0;
for (const r of t.routed_elements) {
  if (r.edge_type !== 'R-1') continue;
  const sv = SVG[r.sheet_id]; if (!sv) continue;
  const pts = feederPoints(sv, r.id);
  if (!pts) continue;
  for (const b of boxes) {
    if (b.sheet !== r.sheet_id) continue;
    let worst = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      // Per-axis PENETRATION, not area overlap -- see check_lib.segPenetration.
      const depth = segPenetration(x1, y1, x2, y2, b);
      if (depth == null) continue;
      if (!worst || depth > worst.depth) worst = { depth, seg: `${x1},${y1} -> ${x2},${y2}` };
    }
    if (worst) {
      const role = b.id === (r.start && r.start.device_id) ? 'ITS OWN PARENT'
                 : b.id === (r.end && r.end.device_id) ? 'ITS OWN CHILD' : 'foreign';
      console.log(`  ${r.sheet_id}  ${(r.designation || r.id).padEnd(7)} through ${b.des.padEnd(10)} [${role}]  (${b.mode})`);
      console.log(`        box x ${Math.round(b.x0)}..${Math.round(b.x1)} y ${Math.round(b.y0)}..${Math.round(b.y1)}  penetration ${worst.depth} px   seg ${worst.seg}`);
      nA++;
    }
  }
}
if (!nA) console.log('  none');

// ---------- B. tag boxes vs device boxes ----------
// Pills are <rect> inside a g.tag/g.a1; pennants are <polygon>. Scrape any
// <g class="tag ..."> and take the bbox of its rect/polygon points.
console.log(`\n${'='.repeat(78)}`);
console.log('B. TAG / PILL OVERLAPPING A DEVICE BOX');
console.log('='.repeat(78));
let nB = 0;
// Was ['S1','S2'] — a hardcoded list that silently skipped S3 for this whole
// section. Never hardcode a sheet list in this folder; sheetIds() is the source.
for (const sheet of sheetIds(t)) {
  const sv = SVG[sheet]; if (!sv) continue;
  const re = /<g class="([^"]*\btag\b[^"]*)"[^>]*data-id="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g;
  let m;
  while ((m = re.exec(sv))) {
    const [, cls, id, body] = m;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const rect = body.match(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    if (rect) { x0 = +rect[1]; y0 = +rect[2]; x1 = x0 + +rect[3]; y1 = y0 + +rect[4]; }
    const poly = body.match(/<polygon points="([^"]+)"/);
    if (poly) for (const p of poly[1].trim().split(/ +/)) {
      const [px, py] = p.split(',').map(Number);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    if (!isFinite(x0)) continue;
    const label = (body.match(/>([^<]{1,24})<\/text>/) || [, ''])[1].trim();
    for (const b of boxes) {
      if (b.sheet !== sheet) continue;
      const ox = Math.min(x1, b.x1) - Math.max(x0, b.x0);
      const oy = Math.min(y1, b.y1) - Math.max(y0, b.y0);
      if (ox <= EPS || oy <= EPS) continue;
      console.log(`  ${sheet}  ${cls.replace(/\s+/g, '.').padEnd(14)} "${label}" [${id}]`);
      console.log(`        overlaps ${b.des} box by ${Math.round(ox)} x ${Math.round(oy)} px   tag ${Math.round(x0)}..${Math.round(x1)} / ${Math.round(y0)}..${Math.round(y1)}`);
      nB++;
    }
  }
}
if (!nB) console.log('  none');

// ---------- C. feeders through EQUIPMENT TEXT (A-8), endpoints INCLUDED ----------
// The device box is the symbol only. The label block beside it is separate ink
// and is what --audit's feeder_crossing actually measured on r-806 / r-855.
// Glyph internals (the "F" inside a fuse circle, the "T" inside a transformer)
// are text nodes too, so any text box wholly inside its own device's symbol box
// is skipped -- otherwise every feeder terminating on a symbol reports a hit.
console.log(`\n${'='.repeat(78)}`);
console.log('C. FEEDER THROUGH EQUIPMENT TEXT (A-8 label blocks)');
console.log('='.repeat(78));
let nC = 0;
const labels = {};
for (const sheet of sheetIds(t)) {
  const sv = SVG[sheet]; if (!sv) continue;
  const own = {};
  for (const b of boxes) if (b.sheet === sheet) own[b.id] = b;
  labels[sheet] = textBoxes(sv).filter(tb => {
    if (!(tb.x1 > tb.x0)) return false;
    // A-8 equipment text ONLY: device-bound blocks live inside <g class="dev">,
    // the switchboard block is top-level. Deliberately NOT scanned here:
    //   g.section    — the dashed section band captions ("DISTRIBUTION",
    //                  "NEC 700"). Every feeder leaving a switchboard passes
    //                  through its own section band; that is the drawing
    //                  working as designed, and --audit agrees (0 findings).
    //   g.feeder-tag — A-1 pills. Tag x feeder is check_tag_feeder_clash.mjs,
    //                  which knows that a tag on its OWN feeder is legal.
    if (tb.group !== 'dev' && tb.group !== null) return false;
    const host = tb.ownerId && own[tb.ownerId];
    if (host && tb.x0 >= host.x0 - EPS && tb.x1 <= host.x1 + EPS
             && tb.y0 >= host.y0 - EPS && tb.y1 <= host.y1 + EPS) return false;  // glyph internal
    return true;
  });
}
for (const r of t.routed_elements) {
  if (r.edge_type !== 'R-1') continue;
  const sv = SVG[r.sheet_id]; if (!sv) continue;
  const pts = feederPoints(sv, r.id);
  if (!pts) continue;
  for (const tb of labels[r.sheet_id] || []) {
    let worst = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const depth = segPenetration(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], tb);
      if (depth == null) continue;
      if (!worst || depth > worst.depth) worst = { depth, seg: `${pts[i]} -> ${pts[i + 1]}` };
    }
    if (worst) {
      const role = tb.ownerId === (r.start && r.start.device_id) ? 'ITS OWN PARENT'
                 : tb.ownerId === (r.end && r.end.device_id) ? 'ITS OWN CHILD' : 'foreign';
      const owner = tb.ownerId ? (by[tb.ownerId] || {}).designation || tb.ownerId : '(sheet-level)';
      console.log(`  ${r.sheet_id}  ${(r.designation || r.id).padEnd(7)} through "${tb.text}" of ${String(owner).padEnd(10)} [${role}]`);
      console.log(`        text x ${Math.round(tb.x0)}..${Math.round(tb.x1)} y ${Math.round(tb.y0)}..${Math.round(tb.y1)}  penetration ${worst.depth} px   seg ${worst.seg}`);
      nC++;
    }
  }
}
if (!nC) console.log('  none');

console.log(`\nTOTAL: ${nA} feeder-through-symbol, ${nB} tag-on-symbol, ${nC} feeder-through-text`);
console.log(`RESULT symbol_clash through_symbol=${nA} tag_on_symbol=${nB} through_text=${nC}`);
