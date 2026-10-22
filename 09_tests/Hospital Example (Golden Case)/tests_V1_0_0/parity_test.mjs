// Item A parity gate: exportGeometry() computed headlessly must deep-match
// the "geometry" block of hospital_SLD_topology_V1_0_0__WITH_GEOMETRY.json.
import fs from 'node:fs';
import { bootViewer } from './boot_viewer.mjs';

const [,, htmlPath, oraclePath] = process.argv;
const { sandbox } = bootViewer(htmlPath);

const computed = sandbox.exportGeometry();
const oracle = JSON.parse(fs.readFileSync(oraclePath, 'utf8')).geometry;

let fails = 0;
const fail = msg => { fails++; console.error('FAIL: ' + msg); };

function deepEq(a, b, pathStr) {
  if (a === b) return;
  if (typeof a !== typeof b) return fail(`${pathStr}: type ${typeof a} vs ${typeof b}`);
  if (typeof a === 'number') {
    if (Math.abs(a - b) > 1e-9) fail(`${pathStr}: ${a} vs ${b}`);
    return;
  }
  if (a === null || b === null || typeof a !== 'object') return fail(`${pathStr}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  const ka = Object.keys(a), kb = Object.keys(b);
  for (const k of ka) if (!(k in b)) fail(`${pathStr}.${k}: missing in oracle side`);
  for (const k of kb) if (!(k in a)) fail(`${pathStr}.${k}: missing in computed side`);
  for (const k of ka) if (k in b) deepEq(a[k], b[k], `${pathStr}.${k}`);
}

deepEq(computed.effective_px_per_inch, oracle.effective_px_per_inch, 'effective_px_per_inch');
deepEq(computed.content_area, oracle.content_area, 'content_area');
deepEq(computed.devices, oracle.devices, 'devices');
deepEq(computed.routed_elements, oracle.routed_elements, 'routed_elements');
deepEq(computed.annotations, oracle.annotations, 'annotations');
deepEq(computed.level_lines, oracle.level_lines, 'level_lines');

// Newer geometry keys (R4, 2026-07-19). Without these the suite is BLIND to the
// export: the five keys above would go green on a completely broken
// `sections` block, which is exactly why gate G8 had to be built separately.
//
// ⚠️ EMPTINESS, NOT KEY PRESENCE, IS THE LIVENESS TEST. `exportGeometry()`'s literal
// initializes `sections: {}` / `equipment_labels: []` UNCONDITIONALLY, so `k in computed`
// is true even if both capture hooks are dead — an earlier version of this check tested
// key presence and was provably vacuous (stubbing out both hooks still returned
// PARITY OK). Every live case has ≥1 switchboard and ≥1 section, so a hospital topology
// that yields an EMPTY collection means the capture path is broken, and that is the
// regression this must catch. G8 cannot catch it either: strip-and-compare DELETES both
// keys from both sides by design, so nothing else in the suite looks at this data.
//
//   - oracle HAS the key → strict deep-compare, like every key above.
//   - oracle LACKS it    → pre-Batch-#23 golden, nothing to compare against yet; assert
//     the engine still PRODUCES CONTENT and print a loud PENDING. Goes strict by itself
//     the moment the re-freeze splices the keys into the oracle.
const size = v => Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 0);
for (const k of ['sections', 'equipment_labels']) {
  if (k in oracle) {
    deepEq(computed[k], oracle[k], k);
  } else if (size(computed[k]) === 0) {
    fail(`${k}: engine produced an EMPTY collection for a topology with ${(oracle.devices && Object.keys(oracle.devices).length) || '?'} placed devices — the engine must emit it (schema §14.7/§14.8). Either the capture hook is broken, or the HTML under test is a STALE byte-copy of the engine (the golden viewer is re-copied as a Golden Re-freeze close-out step).`);
  } else {
    console.log(`PENDING: ${k} not in the oracle yet (pre- golden) — engine produced ${size(computed[k])} record(s); strict comparison activates at the re-freeze`);
  }
}

const counts = k => [Object.keys(computed[k]).length, Object.keys(oracle[k]).length];
console.log('counts computed/oracle:',
  'devices', counts('devices').join('/'),
  'routed_elements', counts('routed_elements').join('/'),
  'annotations', counts('annotations').join('/'));
console.log('layout_warnings computed:', JSON.stringify(computed.layout_warnings));
console.log('layout_warnings oracle  :', JSON.stringify(oracle.layout_warnings));

if (fails) { console.error(`PARITY FAIL (${fails} mismatches)`); process.exit(1); }
console.log('PARITY OK');
