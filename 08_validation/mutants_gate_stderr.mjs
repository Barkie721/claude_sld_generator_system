// MUTANT HARNESS FOR FL-0028 — A GATE'S OWN ERROR MUST REACH THE SUITE OUTPUT (FU-0022).
//
// WHY THIS EXISTS. `run_all_gates.sh` once sent G6's two `snapshot_html.mjs` runs and the
// gen_engine idempotency gate's `node gen_engine.mjs` to `>/dev/null 2>&1`. A box with no
// `rsvg-convert` then printed a bare `FAIL  G6 composed-baselines`, which reads exactly like
// "the composed pages changed". FL-0028 changed both to discard stdout only. **Nothing in the
// suite can see whether that still holds**: the suite is just as green with `2>&1` put back.
// This harness is what goes red if it is.
//
//   SLD_LAB=<a copy of the SLD folder> node 08_validation/mutants_gate_stderr.mjs
//
// Normally run by `08_validation/run_mutants.sh`, which builds the lab.
//
// ⚠️ IT RUNS THE GATE FUNCTIONS, NOT THE WHOLE SUITE. Each arm pulls the `run()` wrapper and the
// one gate function out of the LAB'S OWN `run_all_gates.sh`, byte for byte, and runs them in
// bash. That is the text a revert would change, and it costs seconds where a full suite run
// per arm would cost minutes. What it does not exercise is the code AROUND the functions,
// which FL-0028 never touched.
//
// ⚠️ IT HIDES THE RASTERIZER ITSELF, so the G6 arms mean the same thing on a box that HAS
// rsvg. A failing `rsvg-convert` stub goes first on PATH (that is enough on POSIX); on Windows,
// where Node will not run an extensionless stub, every PATH directory holding
// `rsvg-convert.exe` is dropped as well. A preflight proves the mask before any G6 arm runs,
// and the harness exits 2 if it does not hold — a mask that silently failed would score the
// G6 arms on a passing render.
//
// ⚠️ IT READS THE GATE'S OWN RESULT LINE AND THE ERROR TEXT, NEVER AN EXIT CODE. Every
// HIDDEN arm also requires the gate to FAIL, so an arm can't pass by the gate simply passing.
//
// Not covered: a PASSING G6 printing nothing extra. That needs a box where rsvg renders, and an
// arm that depends on the box would change this harness's arm count from box to box, which
// `run_mutants.sh` pins.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const LAB = process.env.SLD_LAB;
if (!LAB) {
  console.error('SLD_LAB is not set. Run this through 08_validation/run_mutants.sh, which builds the lab.');
  process.exit(2);
}

const HERE_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const real = p => fs.realpathSync(p);
if (!fs.existsSync(LAB)) { console.error(`SLD_LAB ${LAB} does not exist.`); process.exit(2); }
const labReal = real(LAB), repoReal = real(HERE_REPO);
if (labReal === repoReal || labReal.startsWith(repoReal + path.sep)) {
  console.error('SLD_LAB is the real tree, or inside it. Refusing to mutate the live repo.');
  process.exit(2);
}

const FILES = { suite: 'run_all_gates.sh', gen: '04_renderer/gen_engine.mjs' };
const abs = k => path.join(LAB, FILES[k]);
for (const k of Object.keys(FILES)) {
  if (!fs.existsSync(abs(k))) {
    console.error(`lab is missing ${FILES[k]} — is SLD_LAB really a copy of the SLD folder?`);
    process.exit(2);
  }
}
const PRISTINE = Object.fromEntries(Object.keys(FILES).map(k => [k, fs.readFileSync(abs(k), 'utf8')]));
const restore = () => { for (const k of Object.keys(FILES)) fs.writeFileSync(abs(k), PRISTINE[k]); };
const dirty = () => Object.keys(FILES).some(k => fs.readFileSync(abs(k), 'utf8') !== PRISTINE[k]);

// ---- pull a shell function out of the script, byte for byte ----
function extractFn(src, name) {
  const lines = src.split('\n');
  const open = new RegExp(`^(\\s*)${name}\\(\\) \\{`);
  const i = lines.findIndex(l => open.test(l));
  if (i < 0) return null;
  const indent = lines[i].match(open)[1];
  const j = lines.findIndex((l, k) => k > i && l === `${indent}}`);
  if (j < 0) return null;
  return lines.slice(i, j + 1).join('\n');
}

// ---- the rasterizer mask ----
const STUB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sld-rsvg-mask-'));
fs.writeFileSync(path.join(STUB_DIR, 'rsvg-convert'), '#!/bin/sh\necho "masked by mutants_gate_stderr" >&2\nexit 1\n', { mode: 0o755 });
function maskedEnv() {
  let dirs = (process.env.PATH || '').split(path.delimiter);
  if (process.platform === 'win32') dirs = dirs.filter(d => d && !fs.existsSync(path.join(d, 'rsvg-convert.exe')));
  return { ...process.env, PATH: [STUB_DIR, ...dirs].join(path.delimiter) };
}
{
  const probe = spawnSync('rsvg-convert', ['--version'], { env: maskedEnv() });
  if (!probe.error && probe.status === 0) {
    console.error('could not hide rsvg-convert from the gate — the G6 arms would score a real render. Refusing.');
    process.exit(2);
  }
}

// ---- run one gate function from the lab's script, stdout and stderr both read ----
function runGate(fnName, gateName, env) {
  const src = fs.readFileSync(abs('suite'), 'utf8');
  const runFn = extractFn(src, 'run');
  const gateFn = extractFn(src, fnName);
  if (!runFn || !gateFn) return { verdict: 'ABSENT', out: `(could not find run() or ${fnName}() in the lab's run_all_gates.sh)` };
  const driver = ['set -u', `REPO='${LAB.replace(/\\/g, '/')}'`, 'PASS=0; FAIL=0; FAILED_GATES=""', runFn, gateFn, `run "${gateName}" ${fnName}`].join('\n');
  const r = spawnSync('bash', ['-c', driver], { cwd: LAB, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const line = out.split('\n').find(l => new RegExp(`^\\s+(PASS|FAIL)\\s+${gateName}$`).test(l));
  return { verdict: line ? (/PASS/.test(line) ? 'PASS' : 'FAIL') : 'ABSENT', out };
}

const G6 = ['g6', 'G6 composed-baselines'];
const GEN = ['gen_idempotent', 'gen_engine-idempotent'];
const RSVG_MARK = 'rsvg-convert not runnable';
const GEN_MARK = 'mutants_gate_stderr: gen_engine broke on purpose';

const reHide = (fn, from, to) => () => {
  const src = PRISTINE.suite;
  const body = extractFn(src, fn);
  const swapped = body ? body.split(from).join(to) : null;
  // a swap that finds nothing would leave this arm resting on its other mutation alone
  if (!body || swapped === body) throw new Error(`${fn}() no longer contains "${from}" — update this arm to the script's current redirect`);
  fs.writeFileSync(abs('suite'), src.replace(body, swapped));
};
const breakGen = () => fs.writeFileSync(abs('gen'), `throw new Error(${JSON.stringify(GEN_MARK)});\n`);

const ARMS = [
  { id: 'A1', gate: G6, env: 'masked', mutates: false, want: 'VISIBLE', mark: RSVG_MARK,
    desc: 'G6, rasterizer hidden — its "not runnable" line shows above the FAIL', apply: () => {} },
  { id: 'A2', gate: G6, env: 'masked', mutates: true, want: 'HIDDEN', mark: RSVG_MARK,
    desc: 'G6 with `2>&1` put back — the line vanishes and only a bare FAIL is left',
    apply: reHide('g6', '>/dev/null || return 1', '>/dev/null 2>&1 || return 1') },
  { id: 'B1', gate: GEN, env: 'plain', mutates: true, want: 'VISIBLE', mark: GEN_MARK,
    desc: 'gen_engine.mjs throws — the error shows above the FAIL', apply: breakGen },
  { id: 'B2', gate: GEN, env: 'plain', mutates: true, want: 'HIDDEN', mark: GEN_MARK,
    desc: 'gen_engine.mjs throws, `2>&1` put back — only a bare FAIL is left',
    apply: () => { breakGen(); reHide('gen_idempotent', 'node gen_engine.mjs >/dev/null ||', 'node gen_engine.mjs >/dev/null 2>&1 ||')(); } },
  { id: 'B0', gate: GEN, env: 'plain', mutates: false, want: 'QUIET',
    desc: 'control — a passing gen_engine gate prints its header and PASS, nothing else', apply: () => {} },
];

function score(arm, r) {
  const [, gateName] = arm.gate;
  if (r.verdict === 'ABSENT') return `no result line for "${gateName}" — the gate did not run:\n        ${r.out.trim().split('\n').slice(-3).join('\n        ')}`;
  if (arm.want === 'QUIET') {
    const extra = r.out.split('\n').filter(l => l.trim() && l !== `----- ${gateName} -----` && !/^\s+PASS\s/.test(l));
    if (r.verdict !== 'PASS') return `expected PASS, got ${r.verdict}`;
    return extra.length ? `PASS, but printed ${extra.length} extra line(s): ${extra[0]}` : null;
  }
  if (r.verdict !== 'FAIL') return `expected the gate to FAIL, got ${r.verdict} — an arm that does not fail the gate proves nothing about how a failure reads`;
  const seen = r.out.includes(arm.mark);
  if (arm.want === 'VISIBLE' && !seen) return `the gate failed, but "${arm.mark}" never reached the output — FL-0028 has regressed`;
  if (arm.want === 'HIDDEN' && seen) return `"${arm.mark}" still reached the output with 2>&1 put back — this arm cannot tell a revert from the fix`;
  return null;
}

let ok = 0, bad = 0;
const report = [];
for (const arm of ARMS) {
  restore();
  try { arm.apply(); } catch (e) { bad++; report.push(`  FAIL  ${arm.id} could not be applied: ${e.message}`); continue; }
  if (arm.mutates !== dirty()) {
    bad++;
    report.push(`  FAIL  ${arm.id} ${arm.mutates ? 'MUTATED NOTHING — the lab is byte-identical to pristine, so this arm tested nothing' : 'is a control but modified the lab'}`);
    continue;
  }
  const env = arm.env === 'masked' ? maskedEnv() : process.env;
  const r = runGate(...arm.gate, env);
  const why = score(arm, r);
  if (why) { bad++; report.push(`  FAIL  ${arm.id} ${arm.desc}\n        ${why}`); }
  else { ok++; report.push(`  ok    ${arm.id}  ${arm.want.padEnd(7)} ${arm.desc}`); }
}

// PUT THE LAB BACK, THEN PROVE IT by re-running the control.
restore();
{
  const why = score(ARMS.find(a => a.id === 'B0'), runGate(...GEN, process.env));
  if (why || dirty()) { bad++; report.push(`  FAIL  B0' the lab is not clean after restore(): ${why || 'files differ from pristine'}`); }
  else { ok++; report.push("  ok    B0' QUIET   control re-run AFTER restore — the lab is clean for the next user"); }
}
fs.rmSync(STUB_DIR, { recursive: true, force: true });

console.log('----- FL-0028 gate-stderr mutant harness -----');
for (const r of report) console.log(r);
console.log('');
console.log(`MUTANTS: ${ok} correct, ${bad} wrong, of ${ok + bad}.`);
if (bad) { console.log('MUTANT HARNESS FAILED — a gate\'s own error no longer reaches the suite output, or an arm cannot tell.'); process.exit(1); }
console.log('MUTANT HARNESS GREEN — both gates show their own error under FAIL, and putting 2>&1 back hides it.');
