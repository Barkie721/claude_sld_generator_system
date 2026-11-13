// The three run_pipeline.sh steps that used to be inline `python3 -c "..."`.
//
// WHY THIS EXISTS: the Python snippets spliced the Git Bash paths ($TOPO, $REPO
// = /c/Users/...) INTO A CODE STRING. MSYS converts a POSIX path only when it is
// a standalone argv, never inside one, so on Windows step 4 died with file not
// found — and `python3` there is the Microsoft Store 3.9 alias besides. Here
// every path arrives as its own argv, so Git Bash converts it, and the runtime
// is the same node every other stage already uses. No npm deps — keep it that way.
//
//   node 4_checks/pipeline_steps.mjs merge  <topo> <geom> <merged>   (stage 4)
//   node 4_checks/pipeline_steps.mjs viewer <repo> <topo> <viewer>   (stage 6)
//   node 4_checks/pipeline_steps.mjs sheets <topo>                   (stage 7 guard)
//
// ⚠️ BYTE PARITY WITH THE PYTHON IS THE CONTRACT. The merged topology and the
// viewer are tracked in git, and every run on disk before 2026-10-04 was made by
// `json.dump(indent=2, ensure_ascii=False)`. JSON.stringify differs from that in
// exactly one place for data node wrote in the first place: the float format
// (Python's float repr goes to exponent form below 1e-4; node's below 1e-6). pyDumps below copies Python's rule; everything else — separators,
// empty []/{}, string escapes, key order — already matches.
//
// ⚠️ make_results.mjs parses the `merged. layout_warnings: N | drops: N` line
// out of run.log. Keep its text exactly as Python's print() wrote it.
import fs from 'node:fs';
import path from 'node:path';

function pyFloat(x) {
  // repr(float): shortest round-trip digits (node finds the same ones), fixed
  // notation for -4 <= exp < 16, else d[.ddd]e±XX with at least two exponent digits.
  const [mant, e] = x.toExponential().split('e');
  const exp = Number(e);
  if (exp < -4 || exp >= 16) {
    const sign = exp < 0 ? '-' : '+';
    return `${mant}e${sign}${String(Math.abs(exp)).padStart(2, '0')}`;
  }
  return String(x);   // node is fixed-notation across this whole range
}

function pyDumps(v, ind = '') {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!isFinite(v)) throw new Error(`non-finite number ${v} — Python would write ${v > 0 ? 'Infinity' : v < 0 ? '-Infinity' : 'NaN'}, invalid JSON`);
    // JSON.parse cannot tell 5 from 5.0; node-written inputs never carry a 5.0.
    // Node writes every integer below 1e21 as plain digits, which Python reads
    // as an int and writes back as the same digits.
    if (Number.isInteger(v) && Math.abs(v) < 1e21) return String(v);
    return pyFloat(v);
  }
  if (typeof v === 'string') return JSON.stringify(v);
  const inner = ind + '  ';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return '[\n' + v.map(x => inner + pyDumps(x, inner)).join(',\n') + '\n' + ind + ']';
  }
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  return '{\n' + keys.map(k => inner + JSON.stringify(k) + ': ' + pyDumps(v[k], inner)).join(',\n') + '\n' + ind + '}';
}

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const [cmd, ...args] = process.argv.slice(2);
const want = n => { if (args.length !== n) { console.error(`pipeline_steps ${cmd}: expected ${n} path(s), got ${args.length}`); process.exit(2); } };

if (cmd === 'merge') {
  want(3);
  const [topoP, geomP, mergedP] = args;
  const t = readJson(topoP), g = readJson(geomP);
  t.geometry = g;   // replaces in place if present, appends if not — as Python's t['geometry']=g
  fs.writeFileSync(mergedP, pyDumps(t));
  const w = g.layout_warnings || [];
  const drops = w.filter(x => typeof x === 'string' && x.includes('DROP'));
  console.log(`  merged. layout_warnings: ${w.length} | drops: ${drops.length}`);
  for (const d of drops) console.log(`   ! ${d}`);
} else if (cmd === 'viewer') {
  // ⚠️ The line numbers bound the TOPO literal inside the reference viewer. The
  // asserts turn a moved block into a loud failure instead of a corrupt viewer.
  want(3);
  const [repo, topoP, viewerP] = args;
  const ref = path.join(repo, '04_renderer', 'sld_viewer_engine_V1_0_0.html');
  // Python's text-mode read folds \r\n and \r to \n; do the same.
  const lines = fs.readFileSync(ref, 'utf8').replace(/\r\n?/g, '\n').split('\n');
  if (!lines[293].startsWith('const TOPO = {')) throw new Error(`${ref}: line 294 is not 'const TOPO = {' — the TOPO block moved`);
  if (lines[8876].trim() !== '};') throw new Error(`${ref}: line 8877 is not '};' — the TOPO block moved`);
  const t = readJson(topoP);
  delete t.geometry;
  const body = 'const TOPO = ' + pyDumps(t) + ';';
  fs.writeFileSync(viewerP, [...lines.slice(0, 293), body, ...lines.slice(8877)].join('\n'));
  console.log('  viewer rebuilt');
} else if (cmd === 'sheets') {
  want(1);
  console.log(readJson(args[0]).sheets.length);
} else {
  console.error('usage: pipeline_steps.mjs merge <topo> <geom> <merged> | viewer <repo> <topo> <viewer> | sheets <topo>');
  process.exit(2);
}
