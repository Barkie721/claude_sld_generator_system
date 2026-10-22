// Detect A-1 tags whose PILL has been displaced off its spec offset.
//
// WHY THIS EXISTS (R-011): the mechanical cluster's tag clashes were "fixed" by
// pushing `a1_tag_placement.pill_dx` until check_tag_feeder_clash read zero. It
// did read zero — and two tags were left visibly off standard: "703" at -60 px
// (the only westward pill on a sheet where the other 23 sit east) and "1504T" at
// +100 px, both with the leader dragged diagonal. Mayo caught it by eye.
//
// NOTHING MEASURED IT. check_tag_feeder_clash scores pill-vs-run PROXIMITY only:
// it has no opinion about how far the pill sits from its own tick, whether the
// leader is square to the run, or whether a tag sits on the same side as its
// neighbours. check_tick_detach (12b) is its complement but watches the TICK, so
// a pill_dx displacement — which moves the pill and leaves the tick on the line —
// is invisible to it by construction. Between the two of them a tag can be
// arbitrarily far off spec with both reporting clean.
//
// WHAT IT MEASURES: the A-1 spec (02_specs/symbols/sld_system_model_V1_0_0.md
// §A-1) fixes `leader_length` at 32 px with the leader square to the run, and
// puts the text centre at leader_length + pill_w/2. That yields exactly two legal
// pill offsets from the tag's anchor, and the engine emits both:
//
//   vertical run   -> dx = +70 (pill_w_std 76) or +77 (pill_w_xfmr 90, T-suffix)
//                     dy = 0            ... pill EAST, leader horizontal
//   horizontal leg -> dx = 0, dy = -47.5 ... pill ABOVE, leader vertical
//
// Anything else is an authored displacement. This checker does not judge whether
// the displacement was justified — it makes it VISIBLE, which is the whole gap.
//
// ⚠️ It reads geometry.annotations only. It cannot see a tag the layout dropped;
// stage 4's DROP list and the snapshot coverage assert own that.

import fs from 'node:fs';
import { PROJ, BUILD, SLUG, loadProject } from './check_lib.mjs';

const { t } = loadProject();
const geom = JSON.parse(
  fs.readFileSync(`${BUILD}/${SLUG}_SLD_topology_V1_0_0__WITH_GEOMETRY.json`, 'utf8')
).geometry;

const A = Object.fromEntries(t.annotations.map(a => [a.id, a]));

// Spec constants, named so a future reader can trace them to the symbol doc.
const LEADER_EAST_STD = 70;     // leader_length 32 + pill_w_std 76 / 2
const LEADER_EAST_XFMR = 77;    // leader_length 32 + pill_w_xfmr 90 / 2
const LEADER_ABOVE_DY = -47.5;  // pill above a horizontal leg
const TOL = 0.6;

const rows = [];
for (const [id, v] of Object.entries(geom.annotations || {})) {
  const a = A[id];
  if (!a || a.annotation_type !== 'A-1' || !v.pill) continue;
  const dx = +(v.pill.x - v.x).toFixed(2);
  const dy = +(v.pill.y - v.y).toFixed(2);
  const tSuffix = /T$/.test(String(a.content?.tag_text ?? ''));
  const want = tSuffix ? LEADER_EAST_XFMR : LEADER_EAST_STD;

  let orient, ok;
  if (Math.abs(dx) < TOL) {
    orient = 'above-horizontal';
    ok = Math.abs(dy - LEADER_ABOVE_DY) < TOL;
  } else {
    orient = 'east-of-vertical';
    ok = Math.abs(dx - want) < TOL && Math.abs(dy) < TOL;
  }
  rows.push({ id, tag: String(a.content?.tag_text ?? ''), bound: a.bound_to, dx, dy, orient, ok, want });
}

rows.sort((x, y) => x.id.localeCompare(y.id));
const off = rows.filter(r => !r.ok);
const west = rows.filter(r => r.dx < -TOL);

console.log('='.repeat(78));
console.log(`A-1 PILL OFFSET vs SPEC — ${rows.length} tags`);
console.log('='.repeat(78));
console.log('  spec: east of a vertical run dx=+70 (+77 T-suffix) dy=0');
console.log('        above a horizontal leg  dx=0  dy=-47.5');
console.log();

if (off.length === 0) {
  console.log('  all tags at spec offset');
} else {
  for (const r of off) {
    console.log(`  OFF SPEC  ${r.id}  "${r.tag}"  on ${r.bound}`);
    console.log(`            dx ${r.dx} dy ${r.dy}  (${r.orient}: expected ` +
      (r.orient === 'above-horizontal' ? `dx 0 dy ${LEADER_ABOVE_DY}` : `dx ${r.want} dy 0`) + ')');
  }
}

if (west.length) {
  console.log();
  console.log(`  ⚠️ ${west.length} pill(s) on the WEST side of their run — R-009 puts every tag east:`);
  for (const r of west) console.log(`     ${r.id} "${r.tag}" dx ${r.dx}`);
}

console.log();
console.log(`TOTAL: ${off.length} off spec, ${west.length} on the wrong side`);
console.log(`RESULT tag_spec a1_total=${rows.length} a1_off_spec=${off.length} a1_west_side=${west.length}`);
