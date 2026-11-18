// Does the level grid mean what it says?
//
// WHY THIS EXISTS: nothing in the repo tests level-band membership.
// snapshot_html.mjs --audit excludes level lines from feeder_crossing entirely,
// and SH-3 excludes A-7 boxes. So a sheet can draw LEVEL ROOF straight through a
// panel whose own badge reads "L4" and every gate stays green. That is exactly
// what happened on a 9-storey emergency sheet: not one of its 59 level-assigned
// devices sat in its own band, and 63 rules / 0 errors / 0 warnings reported
// clean.
//
// A level line is a DATUM. The contract this file enforces:
//   1. a level line never crosses a device box (it is a reference line, not ink
//      through equipment)
//   2. a device mapped to level N sits in band N — below the line above it, and
//      at or above its own line
//   3. the gap from a device's bottom edge to its own level line is the number
//      the s2_shift_delta / D' solve reads off. Report it per device so the
//      solve is a lookup, not a guess. Golden-grade is 180 px; ±250 is the band.
//   4. every level-mapped device on a sheet HAS a datum on that sheet. The
//      moment a sheet split moves devices off their datum this goes non-zero —
//      it is the direct detector for "sheet 2 contradicts sheet 1 about how many
//      storeys the building has".
//
// Data source is geometry.level_lines + layout_config.level_map — no SVG scrape,
// so this runs straight off the merged topology.
import { loadProject, deviceBoxes, EPS } from './check_lib.mjs';

const TARGET = 180, TOL = 250;   // acceptance: line(own) - boxBottom = 180 +/- 250

const { t, by, G, cfg } = loadProject();
const lines = (t.geometry && t.geometry.level_lines) || [];
const levelMap = (cfg && cfg.level_map) || {};
const levelOrder = (cfg && cfg.level_order) || [];
const boxes = deviceBoxes(t, by, G);

if (!lines.length) {
  console.log('!! geometry.level_lines is empty — nothing to check. Re-run the layout + merge.');
  console.log('RESULT level_bands band_outside=0 band_total=0 line_through_device=0 out_of_band=0 orphan=0');
  process.exit(0);
}
if (!levelOrder.length) console.log('!! layout_config.level_order is empty — band ordering unavailable');

const sheets = [...new Set(lines.map(l => l.sheet))];
let totLineThrough = 0, totOutOfBand = 0, totOrphan = 0;
// The datum-gap metric in section 3 existed PER SHEET only, with no rollup —
// so the number in this file most likely to be red was the one number no
// summary line carried, and a phase could close with it unmeasured. These two
// accumulators are that rollup.
let totBandOutside = 0, totBandRows = 0;

for (const sheet of sheets) {
  const sl = lines.filter(l => l.sheet === sheet);
  const yOf = {}; sl.forEach(l => yOf[l.level] = l.y);
  // top-to-bottom, using the project's own level_order and only the levels
  // actually drawn on THIS sheet
  const drawn = levelOrder.filter(l => l in yOf);
  const sheetBoxes = boxes.filter(b => b.sheet === sheet);

  console.log('='.repeat(78));
  console.log(`${sheet} — ${sl.length} level line${sl.length === 1 ? '' : 's'} drawn: ${drawn.join(', ')}`);
  console.log('='.repeat(78));

  // ---- 1. level line through a device box ----
  const through = [];
  for (const l of sl) {
    for (const b of sheetBoxes) {
      if (!(l.y > b.y0 + EPS && l.y < b.y1 - EPS)) continue;
      if (!(l.x_end > b.x0 + EPS && l.x_start < b.x1 - EPS)) continue;
      through.push({ line: l, b });
    }
  }
  const linesHit = new Set(through.map(h => h.line.label));
  const devsHit = new Set(through.map(h => h.b.des));
  console.log(`  1. LEVEL LINE THROUGH A DEVICE BOX: ${through.length}` +
              (through.length ? `  (${linesHit.size} line${linesHit.size === 1 ? '' : 's'} x ${devsHit.size} device${devsHit.size === 1 ? '' : 's'})` : '   OK'));
  for (const h of through) {
    console.log(`       ${h.line.label.padEnd(11)} y=${Math.round(h.line.y)}  cuts ${h.b.des.padEnd(10)} ` +
                `box y ${Math.round(h.b.y0)}..${Math.round(h.b.y1)}  (${Math.round(h.line.y - h.b.y0)} px below its top edge)`);
  }
  totLineThrough += through.length;

  // ---- 2 + 3. band membership and the datum gap ----
  const rows = [], orphans = [];
  for (const b of sheetBoxes) {
    const lv = levelMap[b.des];
    if (lv == null) continue;                       // deliberately unmapped (utility xfmrs etc.)
    if (!(lv in yOf)) { orphans.push({ b, lv }); continue; }
    const own = yOf[lv];
    const i = drawn.indexOf(lv);
    const above = i > 0 ? yOf[drawn[i - 1]] : -Infinity;   // the line one storey up (smaller y)
    const delta = own - b.y1;                       // line(own) - boxBottom
    const inBand = b.y1 <= own + EPS && b.y0 >= above - EPS;
    rows.push({ des: b.des, lv, own, above, delta, inBand, y0: b.y0, y1: b.y1 });
  }
  const bad = rows.filter(r => !r.inBand);
  console.log(`  2. DEVICES OUTSIDE THEIR LEVEL BAND: ${bad.length} of ${rows.length}${bad.length ? '' : '   OK'}`);
  for (const r of bad.sort((p, q) => Math.abs(q.delta) - Math.abs(p.delta))) {
    const why = r.y1 > r.own + EPS ? `${Math.round(r.y1 - r.own)} px BELOW its own line`
                                   : `${Math.round(r.above - r.y0)} px ABOVE the line overhead`;
    console.log(`       ${r.des.padEnd(10)} level ${String(r.lv).padEnd(2)}  box y ${Math.round(r.y0)}..${Math.round(r.y1)}  ` +
                `own line ${Math.round(r.own)}  —  ${why}`);
  }
  totOutOfBand += bad.length;

  // ---- 3. datum gap distribution — the s2_shift_delta / D' lookup table ----
  if (rows.length) {
    const ds = rows.map(r => r.delta).sort((a, b) => a - b);
    const med = ds[Math.floor(ds.length / 2)];
    const off = rows.filter(r => Math.abs(r.delta - TARGET) > TOL).length;
    totBandOutside += off; totBandRows += rows.length;
    console.log(`  3. line(own) - boxBottom   min ${Math.round(ds[0])}  median ${Math.round(med)}  max ${Math.round(ds[ds.length - 1])} px` +
                `   [target ${TARGET} +/- ${TOL}]   outside tolerance: ${off} of ${rows.length}`);
    // per-level medians: this is what the pitch / shift solve actually reads
    for (const lv of drawn) {
      const g = rows.filter(r => r.lv === lv).map(r => r.delta).sort((a, b) => a - b);
      if (!g.length) continue;
      const m = g[Math.floor(g.length / 2)];
      const flag = Math.abs(m - TARGET) > TOL ? '  <==' : '';
      console.log(`       level ${String(lv).padEnd(2)}  n=${String(g.length).padEnd(3)} median ${String(Math.round(m)).padStart(6)} px` +
                  `   min ${String(Math.round(g[0])).padStart(6)}  max ${String(Math.round(g[g.length - 1])).padStart(6)}${flag}`);
    }
  }

  // ---- 4. orphans: mapped to a level with no datum on this sheet ----
  console.log(`  4. LEVEL-MAPPED DEVICES WITH NO DATUM ON THIS SHEET: ${orphans.length}${orphans.length ? '' : '   OK'}`);
  for (const o of orphans) console.log(`       ${o.b.des.padEnd(10)} mapped to level ${o.lv}, which this sheet does not draw`);
  totOrphan += orphans.length;
  console.log('');
}

console.log('='.repeat(78));
console.log(`TOTAL: ${totLineThrough} line-through-device, ${totOutOfBand} out-of-band, ${totOrphan} orphan`);
console.log(`       datum gap outside ${TARGET} +/- ${TOL} px: ${totBandOutside} of ${totBandRows} level-mapped devices`);
console.log('  acceptance: 0 / 0 / 0');
// ⚠️ band_outside is the datum-gap tolerance count (section 3) and out_of_band
// is band MEMBERSHIP (section 2). Different questions: a device can sit in the
// right band and still be 900 px off its datum.
console.log(`RESULT level_bands band_outside=${totBandOutside} band_total=${totBandRows} ` +
            `line_through_device=${totLineThrough} out_of_band=${totOutOfBand} orphan=${totOrphan}`);
