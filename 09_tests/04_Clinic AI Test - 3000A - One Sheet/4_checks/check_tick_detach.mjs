// Detect A-1 tags whose TICK has left its own feeder.
//
// WHY THIS EXISTS (FL-0008): an acceptance table carried the row "A-1 tick off
// its own feeder: 27 -> 0" through SEVEN phases with NOTHING measuring it. It
// had been counted by eye once; the true count was 31, and every gate was green
// the whole time. check_tag_feeder_clash.mjs structurally cannot see it:
// it deliberately EXCLUDES a tag's own leader/tick from the sweep ("the tick is
// drawn on the line on purpose") — which is exactly the assumption that breaks
// the moment `a1_tag_placement.dx` moves a tag ACROSS its run instead of along
// it. renderR1Tags applies dx/dy to (fx,fy) BEFORE renderTag, so the tick, the
// leader root and the pill all translate together and the tick ends up floating
// in whitespace. OFF-023's `pill_dx`/`pill_dy` are the correct knob: pill only,
// tick stays put, leader stretches.
//
// WHAT IT MEASURES: renderTag emits [tick, leader, rect, text] in that order, so
// lines[0] of every A-1 `feeder-tag` group is the tick and its midpoint is the
// literal (fx, fy) the engine computed. Distance from that point to the nearest
// segment of the feeder named by the group's data-id is the answer — no
// estimation anywhere in this checker.
//
// A stacked A-1 (`off` in renderR1Tags: 40 px vertical / 100 px horizontal) is
// displaced ALONG the run by construction, so it still measures ~0 here. That is
// the point: this checker is blind to legitimate along-run sliding and only sees
// across-run displacement.
//
// PRECONDITION: snapshots must be current. Re-render --theme light after any
// tag-placement change, then re-run.
import { loadProject, loadSVGs } from './check_lib.mjs';

const { t } = loadProject();
const reById = {}; t.routed_elements.forEach(r => reById[r.id] = r);
const SVG = loadSVGs(t);

const ATTACHED = 2.0;   // px. A tick is ON its feeder within stroke width + eps.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
function ptSegDist(p, a, b) {
  const ab = sub(b, a), L = dot(ab, ab);
  const tt = L < 1e-12 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / L));
  return Math.hypot(p[0] - (a[0] + tt * ab[0]), p[1] - (a[1] + tt * ab[1]));
}

// -------------------------------------------------------------- scrape
const feedersById = {};   // id -> [ [a,b], ... ]  (per sheet id is unique)
const ticks = [];

for (const [sheet, svg] of Object.entries(SVG)) {
  const groups = [...svg.matchAll(/<g class="([a-z-]+)"([^>]*)>([\s\S]*?)<\/g>/g)];
  for (const g of groups) {
    const cls = g[1], attrs = g[2], body = g[3];
    const id = (attrs.match(/data-id="([^"]+)"/) || [])[1] || '';
    const lines = [...body.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)]
      .map(m => [[+m[1], +m[2]], [+m[3], +m[4]]]);

    if (cls === 'feeder') {
      const segs = feedersById[id] || (feedersById[id] = []);
      const poly = body.match(/<polyline points="([^"]+)"/);
      const chains = [];
      if (poly) chains.push(poly[1].trim().split(/\s+/).map(q => q.split(',').map(Number)));
      lines.forEach(l => chains.push(l));
      for (const chain of chains)
        for (let i = 0; i < chain.length - 1; i++)
          if (Math.hypot(...sub(chain[i + 1], chain[i])) >= 0.01)
            segs.push([chain[i], chain[i + 1]]);
    }
    else if (cls === 'feeder-tag') {
      // A-1 only: an A-2 callout group has no rect and draws a D-loop path, not
      // a tick. Guarding on the rect is the same test renderTag's own branches use.
      if (!/<rect /.test(body) || !lines.length) continue;
      const tk = lines[0];
      ticks.push({ sheet, id, des: reById[id] ? (reById[id].designation || id) : id,
                   p: [(tk[0][0] + tk[1][0]) / 2, (tk[0][1] + tk[1][1]) / 2] });
    }
  }
}

// -------------------------------------------------------------- compare
const rows = [];
for (const tk of ticks) {
  const segs = feedersById[tk.id];
  if (!segs || !segs.length) { rows.push({ ...tk, d: Infinity, why: 'no feeder polyline with that data-id' }); continue; }
  let best = Infinity;
  for (const [a, b] of segs) best = Math.min(best, ptSegDist(tk.p, a, b));
  rows.push({ ...tk, d: best });
}

const bad = rows.filter(r => r.d > ATTACHED).sort((a, b) => b.d - a.d);
console.log(`scraped: ${ticks.length} A-1 ticks across ${Object.keys(SVG).length} sheets, ` +
            `${Object.keys(feedersById).length} feeders`);
console.log(`tolerance: a tick is DETACHED when its centre is > ${ATTACHED} px from its own run\n`);
console.log(`=== A-1 TICK OFF ITS OWN FEEDER — ${bad.length} ===`);
for (const r of bad)
  console.log(`  ${r.sheet.padEnd(4)} ${r.des.padEnd(9)} tick @ (${Math.round(r.p[0])},${Math.round(r.p[1])})`.padEnd(46) +
              `  off by ${r.d === Infinity ? '(unmatched)' : r.d.toFixed(1) + ' px'}` + (r.why ? `  [${r.why}]` : ''));
if (!bad.length) console.log('  (none)');

const byDes = {};
bad.forEach(r => (byDes[r.des] = (byDes[r.des] || 0) + 1));
console.log(`\n  distinct feeders: ${Object.keys(byDes).length}   [acceptance: 0]`);
console.log(`RESULT tick_detach tick_detached=${bad.length} tick_total=${ticks.length} tick_feeders=${Object.keys(byDes).length}`);
