// Detect collinear overlaps between sub-feeder segments (two feeders drawn on top of each other)
// and exits that fall outside their parent's drawn box.
// 2026-07-27: the sheet map is derived from the topology, never a literal --
// check_symbol_clash.mjs shipped a hardcoded ['S1','S2'] and skipped S3 in
// silence for a whole session. The exit-offset section below is unaffected by
// the anchor_mode box fix: it only measures L2-4 parents, which are top_left.
import { loadProject, loadSVGs, devBox, feederPoints } from './check_lib.mjs';

const { t, by, G } = loadProject();
const svg = loadSVGs(t);

// EVERY drawn feeder, not just panel->panel sub-feeds. Scoping this to L2-4 -> L2-4 is exactly
// what let the 4M-1-A..4M-4-A defect through: the riser and the panel's own internal transformer
// tap both left top-centre and ran 90 px collinear, but the tap is a CB -> L2-2 feeder, so the
// narrow scan never compared the two. Collect both the <polyline> (jogged) and <line> (straight)
// render forms.
const H = [], V = [];
const push = (r, s, e, pts) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const rec = { d: r.designation || r.id, parent: s ? s.designation : '(bus)',
                  child: e ? e.designation : '?', sheet: r.sheet_id };
    if (Math.abs(y1 - y2) < 0.01 && Math.abs(x1 - x2) > 0.01) H.push({ ...rec, y: y1, a: Math.min(x1, x2), b: Math.max(x1, x2) });
    else if (Math.abs(x1 - x2) < 0.01 && Math.abs(y1 - y2) > 0.01) V.push({ ...rec, x: x1, a: Math.min(y1, y2), b: Math.max(y1, y2) });
  }
};
for (const r of t.routed_elements) {
  if (r.edge_type !== 'R-1') continue;
  const s = r.start ? by[r.start.device_id] : null, e = r.end ? by[r.end.device_id] : null;
  const sheetSvg = svg[r.sheet_id]; if (!sheetSvg) continue;
  const pts = feederPoints(sheetSvg, r.id);
  if (pts) push(r, s, e, pts);
}
console.log(`segments: ${H.length} horizontal, ${V.length} vertical`);

function collinear(list, key) {
  const out = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const x = list[i], y = list[j];
    if (x.sheet !== y.sheet || Math.abs(x[key] - y[key]) > 0.01) continue;
    const ov = Math.min(x.b, y.b) - Math.max(x.a, y.a);
    if (ov > 0) out.push({ sheet: x.sheet, parent: x.parent, at: x[key], a: x.d, b: y.d, ov: Math.round(ov) });
  }
  return out.sort((p, q) => q.ov - p.ov);
}

const ho = collinear(H, 'y'), vo = collinear(V, 'x');
console.log(`\n=== COLLINEAR HORIZONTAL OVERLAPS: ${ho.length} ===`);
ho.forEach(o => console.log(`  ${o.sheet}  ${o.parent.padEnd(10)} y=${o.at}   ${o.a} / ${o.b}   ${o.ov} px on top of each other`));
console.log(`\n=== COLLINEAR VERTICAL OVERLAPS: ${vo.length} ===`);
vo.forEach(o => console.log(`  ${o.sheet}  ${o.parent.padEnd(10)} x=${o.at}   ${o.a} / ${o.b}   ${o.ov} px`));

// exits outside the parent's drawn box
console.log('\n=== EXITS OUTSIDE THE PARENT BOX (half-width 32) ===');
const seen = new Set();
let exitsOutside = 0;   // section C never carried a count — only a designation list
for (const r of t.routed_elements) {
  if (r.edge_type !== 'R-1' || !r.start || !r.end) continue;
  const s = by[r.start.device_id]; if (!s || s.node_type !== 'L2-4') continue;
  // Centre via devBox, not `anchor.x + w/2` — identical for an L2-4 (top_left)
  // but wrong by w/2 the day this section is widened to a bus-dot node type.
  const pb = devBox(s.id, G); if (!pb) continue;
  const m = svg[r.sheet_id].match(new RegExp(`<g class="feeder" data-id="${r.id}"[^>]*><polyline points="([^"]+)"`));
  if (!m) continue;
  const ex = Number(m[1].trim().split(/[ ]+/)[0].split(',')[0]);
  const off = ex - (pb.x0 + pb.w / 2);
  if (Math.abs(off) > pb.w / 2) {
    console.log(`  ${r.sheet_id}  ${s.designation.padEnd(10)} ${r.designation}  exit ${off > 0 ? '+' : ''}${Math.round(off)} px from centre (box half-width ${pb.w / 2}) — ${Math.round(Math.abs(off) - pb.w / 2)} px beyond the edge`);
    seen.add(s.designation);
    exitsOutside++;
  }
}
console.log(`  ${exitsOutside} exit${exitsOutside === 1 ? '' : 's'} outside the box across ` +
            `${seen.size} parent${seen.size === 1 ? '' : 's'}`);
console.log(`  affected parents: ${[...seen].join(', ') || 'none'}`);

console.log(`RESULT feeder_overlaps collinear_h=${ho.length} collinear_v=${vo.length} exits_outside=${exitsOutside}`);
