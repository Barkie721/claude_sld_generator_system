// Shared helpers for the seven ungated geometry checkers in this project.
//
// THIS FILE IS THE ONLY ONE IN 4_checks/ THAT KNOWS A PATH. The other ten
// scripts open the project exclusively through loadProject() / loadSVGs(), and
// the relative import './check_lib.mjs' holds because they all live here. A
// project folder copied from _PROJECT_TEMPLATE therefore needs no edit in this
// directory at all — the filename prefix comes from metadata.slug, discovered
// at load time.
//
// WHY THIS EXISTS (2026-07-27): on a 9-storey hospital the checkers reported a
// clean bill of health that was partly false, for two reasons that were both
// copy-paste divergence between scripts:
//
//   1. check_symbol_clash.mjs and trace_feeders.mjs each built a device box as
//      `x0 = anchor.x, y0 = anchor.y`, ignoring schema §14.1 `anchor_mode`.
//      30 devices on that project were NOT top-left anchored (27 bus_dot_bottom,
//      3 bus_dot_top), so their `x` is the CENTRE of the drawn box and their `y`
//      is the bus dot, not the top edge. Every collision involving one of those
//      30 was tested against a box in the wrong place. A feeder running straight
//      through its own CB glyph is the visible consequence.
//
//   2. Each script hardcoded its own sheet list. check_symbol_clash.mjs:89 read
//      ['S1','S2'], so its section B never ran on S3 at all.
//
// Both bugs are structural: they come back the moment a sixth script is written
// by copying a fifth. Every box, every sheet list and every text extent in this
// folder now comes from here.
//
// PRECONDITION for anything SVG-backed: snapshots must be current. Re-render
// `--theme light` after any routing / tag-placement / layout change.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// ------------------------------------------------------- FU-0008 frame honesty
// Re-exported, NOT reimplemented. FU-0008 §2.3 asked where the viewBox-vs-ink
// guard's truth should live given three copies of this folder exist; the answer
// is `08_validation/lib/ink_extent_V1_0_0.mjs`, once, and every consumer imports
// it. This is the ONLY file in 4_checks/ allowed to know a path, and the repo
// root is `PROJ/../..` — the same relationship run_pipeline.sh already computes
// as REPO, so the relative specifier below holds for any project folder copied
// from _PROJECT_TEMPLATE into 09_tests/.
export { frameHonesty, inkExtent, SNAPSHOT_PAD } from '../../../08_validation/lib/ink_extent_V1_0_0.mjs';

// PROJ is the PROJECT ROOT, not this script's directory — `4_checks/` sits one
// level down. Redefining it this way is what keeps every other script here free
// of path literals.
export const PROJ = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
export const BUILD = `${PROJ}/2_build`;
export const SHEETS = `${PROJ}/3_output/sheets`;
export const EPS = 0.5;

// The filename prefix is the topology's `metadata.slug` (schema §3), not the
// folder name and not the HTML basename — snapshot_html.mjs:212 resolves the
// snapshot prefix as `opt.slug || snap.slug || basename(html)`, so slug is the
// value that actually names the SVGs. Set by loadProject().
export let SLUG = null;

// ------------------------------------------------------------- loud, not quiet
// Every read below either succeeds or THROWS. A checker that finds no inputs
// prints "0 findings across 0 sheets", which on screen is indistinguishable
// from a clean run — that silent-pass mode is the most dangerous failure this
// folder has, so nothing here is allowed to shrug and continue.
export function soleFile(dir, suffix, what) {
  if (!fs.existsSync(dir)) {
    throw new Error(`${what}: ${dir} does not exist. Run \`bash run_pipeline.sh\` first.`);
  }
  const hits = fs.readdirSync(dir).filter(f => f.endsWith(suffix)).sort();
  if (!hits.length) {
    throw new Error(`${what}: nothing matching *${suffix} in ${dir}. ` +
                    `The stage that writes it did not run — \`bash run_pipeline.sh\` from the project root.`);
  }
  if (hits.length > 1) {
    throw new Error(`${what}: ${hits.length} candidates in ${dir} (${hits.join(', ')}). ` +
                    `One project per folder — delete the stale artifact.`);
  }
  return `${dir}/${hits[0]}`;
}

// Page composition constants. The composed <g class="composed-sld"> transform is
// fit to the printable area of the title-block template, which is 3360 x 2688 px
// with a 120 px margin on each side -- hence the 240 subtracted from each viewBox
// dimension below.
export const PAGE_W = 3360;
export const PAGE_H = 2688;
export const PAGE_MARGIN = 240;
export const PX_PER_INCH = 96;   // geometry.effective_px_per_inch / engine L15824

// ---------------------------------------------------------------- project load
// The MERGED topology, never the bare one: `run_layout.mjs --out` writes the
// geometry BLOCK, and stage 4 of run_pipeline.sh nests it under `geometry`.
// Reading the unmerged file gives every checker an empty geometry map.
export function loadProject() {
  const topoPath = soleFile(BUILD, '_SLD_topology_V1_0_0__WITH_GEOMETRY.json', 'merged topology');
  const t = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
  SLUG = (t.metadata && t.metadata.slug) || null;
  if (!SLUG) throw new Error(`${topoPath}: metadata.slug is missing. It names every snapshot file.`);
  if (!t.geometry || !t.geometry.devices) {
    throw new Error(`${topoPath}: no geometry{} block. Stage 4 (merge) did not run — ` +
                    `run_layout.mjs --out writes the BARE block, not a merged topology.`);
  }
  const by = {};
  t.devices.forEach(d => by[d.id] = d);
  const G = t.geometry.devices;

  // The sidecar is AUTHORITATIVE for the checkers. The old code wrapped this
  // read in `try { } catch { /* embedded copy stands */ }`, so a wrong path
  // threw ENOENT, got swallowed, and every checker silently scored against the
  // embedded copy — which made a sidecar-only edit invisible. Both copies are
  // written by the build script and must agree; if the sidecar is gone, that is
  // a broken build, not a fallback.
  const cfgPath = soleFile(BUILD, '_layout_config.json', 'layout_config sidecar');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  return { t, by, G, cfg, topoPath, cfgPath };
}

// ------------------------------------------------------------------ sheet list
// Never hardcode. A new sheet must never be silently skipped again.
export function sheetIds(t) {
  return (t.sheets || []).map(s => s.sheet_id);
}

// A MISSING SNAPSHOT IS FATAL. It used to `continue`, which meant an unrendered
// sheet dropped out of every scan and the run still reported clean. Combined
// with snapshot_html.mjs:215 — whose `--out` default is a SIBLING OF THE HTML,
// i.e. 2_build/snapshots/ once the viewer moved into 2_build/ — an omitted
// --out produced "0 findings across 0 sheets" and read exactly like a pass.
// Always: --out "$P/3_output/sheets".
export function loadSVGs(t, theme = 'light') {
  if (!SLUG) throw new Error('loadSVGs() before loadProject() — SLUG is unset, so no snapshot has a name.');
  const out = {};
  const missing = [];
  for (const id of sheetIds(t)) {
    const p = `${SHEETS}/${SLUG}_${id}_${theme}.svg`;
    if (!fs.existsSync(p)) { missing.push(p); continue; }
    out[id] = fs.readFileSync(p, 'utf8');
  }
  if (missing.length) {
    throw new Error(`${missing.length} of ${sheetIds(t).length} snapshots missing — these sheets ` +
                    `would NOT be checked:\n  ${missing.join('\n  ')}\n` +
                    `Re-render: node "$REPO/04_renderer/snapshot_html.mjs" --html <viewer> ` +
                    `--theme both --audit --out "$P/3_output/sheets"   (--out is MANDATORY)`);
  }
  return out;
}

// ------------------------------------------------------------------ device box
// Schema §14.1 anchor_mode, per the engine's own definition at
// sld_viewer_engine_V1_0_0.html L10138-10151:
//   top_left       — anchor IS the drawn box top-left
//   bus_dot_bottom — anchor is the bus dot at box bottom-CENTRE, symbol drawn
//                    UPWARD (L2-1 / L2-7 breaker ladder)
//   bus_dot_top    — anchor is the bus dot at box top-CENTRE, symbol drawn
//                    DOWNWARD (L1-1 GFP)
// `flip_vertical` lives on the GEOMETRY record, not on the device object -- on
// this project devices[].flip_vertical is unset for all 184 devices while
// geometry.devices['d-802'].flip_vertical is true. Reading it off the device
// puts the CB-FP box 44 px away from its ink and hides the fire-pump defect.
export function devBox(id, G) {
  const g = G[id];
  if (!g || !g.anchor) return null;
  const a = g.anchor, w = g.w || 0, h = g.h || 0;
  let x0, y0;
  switch (g.anchor_mode) {
    case 'bus_dot_bottom':
      x0 = a.x - w / 2;
      y0 = g.flip_vertical ? a.y : a.y - h;
      break;
    case 'bus_dot_top':
      x0 = a.x - w / 2;
      y0 = a.y;
      break;
    default:                       // top_left
      x0 = a.x;
      y0 = a.y;
  }
  return { x0, y0, x1: x0 + w, y1: y0 + h, w, h, mode: g.anchor_mode || 'top_left' };
}

// Every device box on the project, sheet-tagged. `by` supplies the designation
// and the sheet; geometry supplies the extents.
export function deviceBoxes(t, by, G) {
  const out = [];
  for (const id of Object.keys(G)) {
    const d = by[id];
    if (!d) continue;
    const b = devBox(id, G);
    if (!b) continue;
    out.push({ id, des: d.designation || id, sheet: d.sheet_id, node_type: d.node_type, ...b });
  }
  return out;
}

// ------------------------------------------------------------------ text boxes
// geometry.equipment_labels carries only a handful of records — switchboard
// blocks plus a few device blocks, 5 in total on the project where this was
// written — so A-8 extents have to come from the rendered SVG rather than from
// geometry. Use the engine's OWN text model so the numbers agree with
// measureMarkupExtent — anchor: `function measureMarkupExtent(markup, opts) {` in
// sld_viewer_engine_V1_0_0.html (the `opts` param distinguishes it from the dormant
// title-block twin, FL-0024) — and with _auditSheet.
// ⚠️ ANCHOR TO THE STRING, NOT A LINE NUMBER. THIS CITATION HAS NOW GONE STALE TWICE.
// It read L16134 against an actual L16448 for nine consecutive sessions — 314 lines
// stale, and nothing in the repo could see it. It was then corrected to L16604, which
// was right at engine rev 1.0.15 and WRONG one day later: rev 1.0.16 (2026-08-03, the
// cross-sheet bus-tap renderer) inserted 59 lines above it and the function moved to
// L16663, leaving L16604 pointing at a bare `});`. Nothing went red either time.
// `grep -n` is cheap:
//     w  = glyphs * fontSize * 0.6      (monospace advance)
//     y0 = y - fontSize * 0.8           (ascent)
//     y1 = y + fontSize * 0.25          (descent)
// with x0 shifted for text-anchor start|middle|end.
//
// font-size appears BOTH as an attribute (font-size="12") and inside a style
// string (style="font-weight:700;font-size:12px") -- the switchboard A-8 block
// uses the style form. Miss it and those labels silently measure at the 10 px
// default.
const attrsOf = (attrStr) => {
  const out = {};
  const re = /([a-zA-Z_:][\w:-]*)="([^"]*)"/g;
  let m;
  while ((m = re.exec(attrStr))) out[m[1]] = m[2];
  return out;
};

// Engine's _snapTextLen — anchor: `function _snapTextLen(content) {`. (Cited as L16434 at rev
// 1.0.15; live L16493 since rev 1.0.16 moved it 59 lines. Use the string.)
// Strip child tags, collapse each entity to one char.
const glyphLen = (content) => content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;|&#\d+;/gi, 'x').length;

function fontSizeOf(at) {
  if (at['font-size'] != null) return parseFloat(at['font-size']) || 10;
  const m = (at.style || '').match(/font-size\s*:\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : 10;
}

export function textBox(attrStr, content) {
  const at = attrsOf(attrStr);
  const x = parseFloat(at.x || 0), y = parseFloat(at.y || 0);
  const fs = fontSizeOf(at);
  const w = glyphLen(content) * fs * 0.6;
  const anchor = at['text-anchor'] || 'start';
  const x0 = anchor === 'middle' ? x - w / 2 : (anchor === 'end' ? x - w : x);
  return { x0, y0: y - fs * 0.8, x1: x0 + w, y1: y + fs * 0.25, fs, text: content.replace(/<[^>]*>/g, '') };
}

// Every <text> on a sheet, tagged with the class + data-id of the <g> it sits in
// (device-bound A-8 blocks render INSIDE <g class="dev" data-id="d-NNN">; only
// the switchboard block is top-level). Groups in these snapshots are flat -- one
// level, never nested -- so a non-greedy group scan is exact here.
export function textBoxes(svg) {
  const out = [];
  const groupRe = /<g class="([^"]*)"([^>]*)>([\s\S]*?)<\/g>/g;
  const textRe = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let g;
  const consumed = [];
  while ((g = groupRe.exec(svg))) {
    const cls = g[1], gid = (attrsOf(g[2]).hasOwnProperty('data-id') ? attrsOf(g[2])['data-id'] : null);
    consumed.push([g.index, g.index + g[0].length]);
    let m;
    while ((m = textRe.exec(g[3]))) out.push({ ...textBox(m[1], m[2]), group: cls, ownerId: gid });
    textRe.lastIndex = 0;
  }
  // top-level text: whatever is not inside a consumed group span
  let m;
  const bare = new RegExp(textRe.source, 'g');
  while ((m = bare.exec(svg))) {
    if (consumed.some(([a, b]) => m.index >= a && m.index < b)) continue;
    out.push({ ...textBox(m[1], m[2]), group: null, ownerId: null });
  }
  return out;
}

// ----------------------------------------------------------------- composed scale
// The number the page actually composes at. NEVER quote `s_pred` -- it is clamped
// at 1 and reported "Legibility S2 1.00" for a sheet that really composes at
// 0.6424. Verified exact against five known artifacts: 0.2160 / 0.6424 / 0.2119
// on a 9-storey hospital, and 0.4454 / 0.3972 on the golden case.
export function viewBox(svg) {
  const m = svg.match(/viewBox="\s*(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
  if (!m) return null;
  return { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
}

export function composedScale(svg) {
  const vb = viewBox(svg);
  if (!vb) return null;
  const sw = PAGE_W / (vb.w - PAGE_MARGIN);
  const sh = PAGE_H / (vb.h - PAGE_MARGIN);
  const s = Math.min(1, Math.floor(Math.min(sw, sh) * 1e4) / 1e4);
  return { vb, sw, sh, s, bind: sh <= sw ? 'height' : 'width' };
}

// ------------------------------------------------------------------- geometry bits
// Per-axis penetration: an axis-aligned segment has a degenerate bbox on one
// axis, so an area-overlap test always scores 0 there. The segment must reach
// STRICTLY inside the box on both axes; a line lying exactly on an edge stays
// legal (that is how a feeder is supposed to meet a symbol).
export function segPenetration(x1, y1, x2, y2, b, eps = EPS) {
  const sx0 = Math.min(x1, x2), sx1 = Math.max(x1, x2);
  const sy0 = Math.min(y1, y2), sy1 = Math.max(y1, y2);
  if (!(sx1 > b.x0 + eps && sx0 < b.x1 - eps)) return null;
  if (!(sy1 > b.y0 + eps && sy0 < b.y1 - eps)) return null;
  return Math.round(Math.min(
    Math.min(sx1, b.x1) - Math.max(sx0, b.x0) || Infinity,
    Math.min(sy1, b.y1) - Math.max(sy0, b.y0) || Infinity,
    Math.min(sx1 - b.x0, b.x1 - sx0, sy1 - b.y0, b.y1 - sy0)));
}

// Drawn points of a routed element, from the rendered SVG. Feeders render either
// as a <polyline> (jogged) or a <line> (straight); scoping to one form is how the
// 4M-1-A collinear defect stayed invisible.
export function feederPoints(svg, id) {
  const poly = svg.match(new RegExp(`<g class="feeder" data-id="${id}"[^>]*><polyline points="([^"]+)"`));
  if (poly) return poly[1].trim().split(/ +/).map(q => q.split(',').map(Number));
  const ln = svg.match(new RegExp(`<g class="feeder" data-id="${id}"[^>]*><line x1="([-\\d.]+)" y1="([-\\d.]+)" x2="([-\\d.]+)" y2="([-\\d.]+)"`));
  if (ln) return [[+ln[1], +ln[2]], [+ln[3], +ln[4]]];
  return null;
}
