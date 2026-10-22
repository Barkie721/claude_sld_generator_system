#!/usr/bin/env node
// ============================================================
// run_layout.mjs — headless SLD layout harness
//
// Loads a topology JSON (+ optional layout_config JSON), runs the extracted
// layout engine (sld_engine.mjs), and emits a geometry block in the exact
// exportGeometry() shape:
//   { effective_px_per_inch, content_area, devices, routed_elements,
//     annotations, layout_warnings }
//
// USAGE
//   node run_layout.mjs                         # embedded hospital demo TOPO
//   node run_layout.mjs --topo t.json           # external topology
//   node run_layout.mjs --topo t.json --config layout_config.json
//   node run_layout.mjs ... --out geometry.json # write result (default stdout)
//   node run_layout.mjs ... --gate golden.json  # diff vs a WITH_GEOMETRY file
//
// If --config is given it is merged into topology.layout_config (config wins).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGeometry } from './sld_engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));

const topoPath = arg('--topo');
const cfgPath = arg('--config');
const outPath = arg('--out');
const gatePath = arg('--gate');

let topo = null;
if (topoPath) {
  topo = readJSON(topoPath);
  if (cfgPath) topo.layout_config = { ...(topo.layout_config || {}), ...readJSON(cfgPath) };
} else if (cfgPath) {
  throw new Error('--config requires --topo (embedded TOPO already carries layout_config)');
}

const geometry = buildGeometry(topo);   // undefined -> embedded hospital demo

if (outPath) {
  fs.writeFileSync(outPath, JSON.stringify(geometry, null, 2) + '\n');
  console.error(`[run_layout] wrote ${outPath}`);
} else if (!gatePath) {
  process.stdout.write(JSON.stringify(geometry, null, 2) + '\n');
}

console.error(`[run_layout] devices=${Object.keys(geometry.devices).length} ` +
  `routed=${Object.keys(geometry.routed_elements).length} ` +
  `annotations=${Object.keys(geometry.annotations).length} ` +
  `content=${geometry.content_area.width_px}x${geometry.content_area.height_px}`);

if (gatePath) {
  const gold = readJSON(gatePath).geometry;
  const TOL = 1.0;
  let maxDev = 0, mism = 0;
  const problems = [];

  const gd = gold.devices || {}, cd = geometry.devices || {};
  for (const id of new Set([...Object.keys(gd), ...Object.keys(cd)])) {
    if (!gd[id]) { mism++; problems.push(`DEVICE extra ${id}`); continue; }
    if (!cd[id]) { mism++; problems.push(`DEVICE missing ${id}`); continue; }
    const a = gd[id].anchor, b = cd[id].anchor;
    const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    maxDev = Math.max(maxDev, dx, dy);
    if (dx > TOL || dy > TOL) { mism++; problems.push(`DEVICE ${id} dx=${dx.toFixed(2)} dy=${dy.toFixed(2)} gold=(${a.x},${a.y}) got=(${b.x},${b.y})`); }
  }
  const gr = gold.routed_elements || {}, cr = geometry.routed_elements || {};
  for (const id of new Set([...Object.keys(gr), ...Object.keys(cr)])) {
    if (!gr[id]) { mism++; problems.push(`ROUTE extra ${id}`); continue; }
    if (!cr[id]) { mism++; problems.push(`ROUTE missing ${id}`); continue; }
    const A = gr[id].path_vertices, B = cr[id].path_vertices;
    if (A.length !== B.length) { mism++; problems.push(`ROUTE ${id} vcount gold=${A.length} got=${B.length}`); continue; }
    for (let i = 0; i < A.length; i++) {
      const dx = Math.abs(A[i].x - B[i].x), dy = Math.abs(A[i].y - B[i].y);
      maxDev = Math.max(maxDev, dx, dy);
      if (dx > TOL || dy > TOL) { mism++; problems.push(`ROUTE ${id} v${i} dx=${dx.toFixed(2)} dy=${dy.toFixed(2)}`); }
    }
  }
  console.error('==== REGRESSION GATE ====');
  console.error(`gold devices=${Object.keys(gd).length} routes=${Object.keys(gr).length}`);
  console.error(`max deviation (px): ${maxDev.toFixed(4)}`);
  console.error(`tolerance-exceeding mismatches: ${mism} (tol=${TOL}px)`);
  if (problems.length) {
    problems.slice(0, 80).forEach(p => console.error('  ' + p));
    console.error(`  ...total problems: ${problems.length}`);
    process.exitCode = 1;
  } else {
    console.error('PASS — all device anchors and route vertices within tolerance.');
  }
}
