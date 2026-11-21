// What scale does each sheet ACTUALLY compose at, and how big is the body text
// on paper?
//
// WHY THIS EXISTS: the set was signed off quoting "Legibility S2 1.00". That
// number is `s_pred`, which is CLAMPED at 1 — the sheet really composes at
// 0.6424 while S1 and S3 sit near 0.21, a 3.03x on-paper text-size spread inside
// one drawing set (the golden's is 1.12x). Nothing in the pipeline reported it,
// because nothing computed the composed scale.
//
// It does not need a render. The page fit is a pure function of the sheet's
// viewBox:
//     s = min(1, floor(min(3360/(vbW-240), 2688/(vbH-240)) * 1e4) / 1e4)
// Verified exact against five artifacts on disk: 0.2160 / 0.6424 / 0.2119 on a
// 9-storey hospital and 0.4454 / 0.3972 on the golden. If this file ever prints
// 1.00 for a sheet with a tall viewBox, something has gone back to quoting
// s_pred.
//
// The bind direction matters as much as the number. While every sheet is
// HEIGHT-bound, `H = base + sum(steps); s = 2688/H` is a usable planning
// formula. A sheet that flips to width-bound invalidates that arithmetic, so
// re-check after every geometry change.
//
// ✅ THE vbH THIS READS IS NOW THE HEIGHT OF THE DRAWING. Until 2026-08-01 it
// was not: measureMarkupExtent bounded each <g transform="translate(…)"> by a
// ±r square where r was the largest number appearing anywhere in that group's
// markup, so an A-4 pennant carrying "41,837A" claimed ±837 px and even a
// digit-free tag claimed ±700 off font-weight="700" (FL-0007). FU-0008 replaced
// that scrape with a real child-geometry scan at engine rev 1.0.15, section 3
// below now ASSERTS the frame against the ink rather than warning about it, and
// the "budget ~1,400 px of phantom per pennant-bearing sheet" rule is RETIRED —
// do not carry it into new planning arithmetic.
//
// ⚠️ WHAT DID NOT GET RESTATED, AND SO IS STALE HERE ON PURPOSE: `LO`/`HI`
// below and the golden reference line. The band 0.35-0.46 was chosen against
// the golden's phantom-inflated 0.4454, and honest sheets legitimately compose
// ABOVE it — this project's own sheets may now report out-of-band for no reason
// but the band. FU-0008 §3 forbade re-tuning targets in the same change-set
// that moved the measurement ("this entry re-frames the sheet; it does not
// re-draw it"), so restating the band is FU-0013, not this file's business
// today. The GOLDEN REFERENCE line has been updated to the true numbers,
// because that is a measurement and not a target.
import { loadProject, sheetIds, loadSVGs, composedScale, frameHonesty,
         PAGE_W, PAGE_H, PAGE_MARGIN, PX_PER_INCH } from './check_lib.mjs';

const BODY_PX = 11;               // the A-1 pill / tag body size
const LO = 0.35, HI = 0.46;       // acceptance band — mirror it in ACCEPTANCE.md §3
                                  // ⚠️ phantom-derived, see the header. FU-0013.
const FRAME_TOL = 2;              // px, FU-0008 acceptance criterion
const SPREAD_MAX = 1.25;          // a set differing by more than this stops reading as one document
const inches = s => BODY_PX * s / PX_PER_INCH;

const { t } = loadProject();
const SVG = loadSVGs(t);
const num = t.sheets ? Object.fromEntries(t.sheets.map(s => [s.sheet_id, s.sheet_number || ''])) : {};

console.log('='.repeat(78));
console.log(`COMPOSED PAGE SCALE   (printable area ${PAGE_W} x ${PAGE_H} px, ${PAGE_MARGIN / 2} px margin per side, ${PX_PER_INCH} px/in)`);
console.log('='.repeat(78));
console.log('  sheet  number   viewBox w x h        s_width  s_height  ->  s        bind     11px on paper');

const rows = [];
for (const id of sheetIds(t)) {
  const sv = SVG[id];
  if (!sv) { console.log(`  ${id.padEnd(6)} !! no snapshot`); continue; }
  const c = composedScale(sv);
  if (!c) { console.log(`  ${id.padEnd(6)} !! no viewBox`); continue; }
  rows.push({ id, ...c });
  const flag = c.s < LO || c.s > HI ? '  <==' : '';
  console.log(`  ${id.padEnd(6)} ${String(num[id] || '').padEnd(8)} ` +
              `${String(Math.round(c.vb.w)).padStart(6)} x ${String(Math.round(c.vb.h)).padStart(6)}   ` +
              `${c.sw.toFixed(4)}   ${c.sh.toFixed(4)}   ->  ${c.s.toFixed(4)}   ${c.bind.padEnd(7)}  ` +
              `${inches(c.s).toFixed(4)} in${flag}`);
}

if (rows.length) {
  const ss = rows.map(r => r.s);
  const lo = Math.min(...ss), hi = Math.max(...ss);
  const spread = hi / lo;
  const widthBound = rows.filter(r => r.bind === 'width');
  console.log('');
  console.log(`  set range   ${lo.toFixed(4)} .. ${hi.toFixed(4)}      spread ${spread.toFixed(2)}x` +
              `   [acceptance: every sheet ${LO}-${HI}, spread <= ${SPREAD_MAX}x]`);
  console.log(`  on paper    ${inches(lo).toFixed(4)} .. ${inches(hi).toFixed(4)} in` +
              `   [acceptance: 0.0400-0.0490 in; golden S2 = 0.0455 in at s 0.3972]`);
  console.log(`  golden reference: S1 0.5662, S2 0.4841, spread 1.17x — S1 WIDTH-bound, S2 height-bound`);
  console.log(`                    (was S1 0.4454 / S2 0.3972 / 1.12x / both height-bound through rev`);
  console.log(`                     1.0.14 — those numbers were phantom-inflated, FL-0007. S1 flipping`);
  console.log(`                     to width-bound is a REAL change of bind, not a rounding artifact:`);
  console.log(`                     honest S1 is 6174 x 4949.59, so s_width 0.5662 < s_height 0.5707.)`);
  if (widthBound.length) {
    console.log(`  !! WIDTH-BOUND: ${widthBound.map(r => r.id).join(', ')} — the "H = base + sum(steps); s = 2688/H"`);
    console.log(`     sheet-height planning arithmetic does NOT apply to these sheets.`);
  }
  const out = rows.filter(r => r.s < LO || r.s > HI);
  console.log('');
  console.log(`VERDICT: ${out.length ? `${out.length} of ${rows.length} sheet(s) outside ${LO}-${HI}: ${out.map(r => `${r.id} ${r.s.toFixed(4)}`).join(', ')}`
                                      : `all ${rows.length} sheets in band`}` +
              `; spread ${spread.toFixed(2)}x ${spread <= SPREAD_MAX ? 'OK' : `> ${SPREAD_MAX}x`}`);

  // VERDICT above is prose with no stable numeric field. This is the machine
  // line stage 14 reads — see 09_tests/README.md "The RESULT contract".
  console.log(`RESULT page_scale sheets=${rows.length} out_of_band=${out.length} ` +
              `s_min=${lo.toFixed(4)} s_max=${hi.toFixed(4)} spread=${spread.toFixed(4)} ` +
              `all_height_bound=${widthBound.length === 0}`);
} else {
  console.log(`RESULT page_scale sheets=0 out_of_band=0 s_min=0 s_max=0 spread=0 all_height_bound=false`);
}

// ============================================================
// 3. IS THE FRAME HONEST ABOUT THE INK? — the FL-0007 / FU-0008 regression guard
// ------------------------------------------------------------
// Everything above divides by the viewBox and therefore trusts it. This section
// is the only thing in the project that checks it. FL-0007 §6: every gate in
// the repo verified internal consistency and none compared the quantity to
// ground truth, which is exactly how 1,405 px of phantom sheet height survived
// nine sessions of green gates.
//
// BOTH DIRECTIONS FAIL. Positive slack is phantom frame (the old defect, scale
// silently lost); negative slack is ink being CLIPPED by a frame that is now
// too tight, which is the new failure a tighter measurement could introduce.
// `--audit out_of_frame` sees only the second, and only past its 400 px pad.
// ============================================================
console.log('');
console.log('='.repeat(78));
console.log(`FRAME HONESTY   (viewBox minus the 120px pad vs true ink extent, tol ±${FRAME_TOL}px)`);
console.log('='.repeat(78));
console.log('  sheet   worst side   L / T / R / B slack        verdict');

let frameBad = 0, frameChecked = 0, frameWorst = 0;
for (const id of sheetIds(t)) {
  const sv = SVG[id];
  if (!sv) continue;
  const h = frameHonesty(sv, { tol: FRAME_TOL });
  frameChecked++;
  if (!h.ok) frameBad++;
  if (h.worst !== undefined && h.worst > frameWorst) frameWorst = h.worst;
  if (h.reason) { console.log(`  ${id.padEnd(7)} !! ${h.reason}`); continue; }
  console.log(`  ${id.padEnd(7)} ${h.worst.toFixed(2).padStart(9)}   ` +
              `${[h.slack.l, h.slack.t, h.slack.r, h.slack.b].map(v => v.toFixed(1).padStart(7)).join(' /')}    ` +
              (h.ok ? 'honest' : 'PHANTOM/CLIPPED  <=='));
  if (!h.ok) {
    console.log(`          drivers: minX=${h.drivers.minX} | minY=${h.drivers.minY} | ` +
                `maxX=${h.drivers.maxX} | maxY=${h.drivers.maxY}`);
    console.log(`          a POSITIVE slack is empty frame (scale lost); a NEGATIVE one is clipped ink.`);
  }
}
console.log('');
// ⚠️ EVERY KEY HERE IS PREFIXED `frame_`, AND THAT IS NOT COSMETIC. `make_results.mjs`
// flattens every `RESULT <scope> …` bag into ONE `checks` object with
// `Object.assign` — the scope name is dropped. A bare `sheets=` or `tol=` here
// would silently overwrite, or be overwritten by, the next checker that happens
// to use the same word, and the loser would be invisible in RESULTS.json.
// Only `page_scale` and `open_items` get their own sub-objects.
console.log(`RESULT frame_honesty frame_sheets=${frameChecked} frame_dishonest=${frameBad} ` +
            `frame_worst_px=${frameWorst.toFixed(2)} frame_tol_px=${FRAME_TOL}`);

// Cross-check hook: after `snapshot_html.mjs --page`, the scale() inside each
// <g class="composed-sld"> transform must match the s column above to 4 dp:
//   grep -o 'composed-sld" transform="[^"]*"' 3_output/pages/*__page.svg
