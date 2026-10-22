// Append one run to 3_output/RESULTS.json.
//
// WHY THIS EXISTS: thirteen pipeline stages print their counts to scrollback and
// nothing keeps them. That is why every phase document has to re-baseline the
// next one, and why "did that change help?" is answered by re-reading prose
// instead of diffing two numbers.
//
// Run from run_pipeline.sh stage 14:
//
//   node 4_checks/make_results.mjs 2_build/run.log
//
// INPUT CONTRACT — every checker's last line is
//
//   RESULT <scope> key=value key=value …
//
// scope namespaces the keys, because two checkers legitimately own a metric
// called `out_of_band` (level-band MEMBERSHIP vs composed-scale BAND) and a flat
// merge would silently overwrite one with the other.
//
// ⚠️ The validator's own summary line is `RESULT:` WITH A COLON and no scope —
// a different format that predates this one. It is parsed separately below, and
// `^RESULT ` never matches it.
//
// The audit is NOT parsed from stdout. Stage 7 already writes
// 3_output/sheets/audit.json and manifest.json; reading the files is exact,
// while the printed tail is truncated by design.
import fs from 'node:fs';
import { PROJ, BUILD, SHEETS, soleFile } from './check_lib.mjs';

const logPath = process.argv[2] || `${PROJ}/2_build/run.log`;
if (!fs.existsSync(logPath)) {
  console.error(`!! no run log at ${logPath} — stage 14 has nothing to read. RESULTS.json not updated.`);
  process.exit(0);
}
const log = fs.readFileSync(logPath, 'utf8');
const lines = log.split('\n');

const num = (s) => (s === 'true' ? true : s === 'false' ? false : (/^-?[\d.]+$/.test(s) ? Number(s) : s));

// ------------------------------------------------------------- RESULT <scope> …
const scoped = {};
for (const ln of lines) {
  const m = ln.match(/^RESULT ([a-z_]+) (.*)$/);
  if (!m) continue;
  const bag = (scoped[m[1]] ||= {});
  for (const kv of m[2].trim().split(/\s+/)) {
    const i = kv.indexOf('=');
    if (i > 0) bag[kv.slice(0, i)] = num(kv.slice(i + 1));
  }
}

// ------------------------------------------------------------ validator summary
// `RESULT: 0 errors, 0 migration items, 0 warnings, 0 info | rules run: 63, vacuous: 2`
// Two of them per run: stage 2 (Phase 1+2, bare topology) then stage 5 (Phase 3,
// merged). Order is the discriminator — there is no other marker in the line.
const vals = [];
for (const ln of lines) {
  const m = ln.match(/RESULT:\s*(\d+) errors?, (\d+) migration items?, (\d+) warnings?, (\d+) info \| rules run: (\d+), vacuous: (\d+)/);
  if (m) vals.push({ errors: +m[1], migration: +m[2], warnings: +m[3], info: +m[4], rules_run: +m[5], vacuous: +m[6] });
}

// ------------------------------------------------------------------- layout line
// run_layout.mjs prints this on STDERR (source L55-58), so the pipeline must
// redirect 2>&1 into the log or it never lands here.
const lay = log.match(/\[run_layout\] devices=(\d+) routed=(\d+) annotations=(\d+) content=(\d+)x(\d+)/);
const mrg = log.match(/merged\. layout_warnings:\s*(\d+)\s*\|\s*drops:\s*(\d+)/);

// --------------------------------------------------------------------- the audit
let audit = null, engineRev = null, sheetCount = null, coverage = null;
const auditPath = `${SHEETS}/audit.json`;
if (fs.existsSync(auditPath)) {
  const a = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  engineRev = a.viewer_revision || null;
  sheetCount = (a.sheets || []).length;
  audit = {};
  for (const s of a.sheets || []) {
    for (const [k, v] of Object.entries(s.counts || {})) audit[k] = (audit[k] || 0) + v;
  }
}
const manPath = `${SHEETS}/manifest.json`;
if (fs.existsSync(manPath)) {
  // Per-capture `coverage` is {rendered, total, ok} — the whole point is that
  // rendered == total. Roll it up to one boolean plus the worst pair, so a
  // single dropped entity on one sheet is visible in a run diff.
  const mn = JSON.parse(fs.readFileSync(manPath, 'utf8'));
  const caps = mn.captures || mn.sheets || [];
  const covs = caps.map(c => c.coverage).filter(Boolean);
  const short = covs.filter(c => c.rendered !== c.total);
  coverage = {
    captures: caps.length,
    warnings: caps.reduce((n, c) => n + (c.warnings || []).length, 0),
    coverage_ok: covs.length > 0 && covs.every(c => c.ok !== false && c.rendered === c.total),
    rendered: covs.reduce((n, c) => n + (c.rendered || 0), 0),
    total: covs.reduce((n, c) => n + (c.total || 0), 0),
    sheets_short: short.length,
  };
}

// ----------------------------------------------------------------- assemble run
const page = scoped.page_scale || {};
delete scoped.page_scale;
const openItems = scoped.open_items || null;
delete scoped.open_items;

const checks = {};
for (const bag of Object.values(scoped)) Object.assign(checks, bag);

const run = {
  generated: new Date().toISOString(),
  engine_rev: engineRev,
  sheets: sheetCount,
  validate_p12: vals[0] || null,
  layout: lay ? {
    devices: +lay[1], routed: +lay[2], annotations: +lay[3],
    content: `${lay[4]}x${lay[5]}`,
    layout_warnings: mrg ? +mrg[1] : null,
    drops: mrg ? +mrg[2] : null,
  } : null,
  // ⚠️ THE CANARY. 63 means the merge worked and the SH geometry rules ran; 55
  // means layout_config went sidecar-only and every SH rule silently skipped.
  validate_p3: vals[1] || null,
  audit,
  render: coverage,
  checks,
  page_scale: page,
  open_items: openItems,
};

// ---------------------------------------------------------------- append + write
const outPath = `${PROJ}/3_output/RESULTS.json`;
let doc;
if (fs.existsSync(outPath)) {
  doc = JSON.parse(fs.readFileSync(outPath, 'utf8'));
} else {
  doc = {
    // Keep this string identical to the stub shipped in _PROJECT_TEMPLATE — the file is
    // recreated from here whenever 3_output/ has been deleted, and two texts in the wild
    // for the same file is exactly the drift this repo has sync_gate for elsewhere.
    $comment: 'Per-run results for this project. Appended by run_pipeline.sh stage 14 from the ' +
              'RESULT lines in 2_build/run.log plus 3_output/sheets/{audit,manifest}.json. Diff two ' +
              "runs to answer 'did that change help?' without re-reading a phase doc. Generated — " +
              'do not hand-edit. NOTE: validate_p3.rules_run is the canary — 63 means the merge ' +
              'worked and the SH geometry rules ran; 55 means layout_config went sidecar-only and ' +
              'every SH rule silently skipped.',
    schema_version: '1.0.0',
    project: null,
    slug: null,
    runs: [],
  };
}
// Identify the project from the topology's own metadata, never the folder name.
{
  const meta = JSON.parse(fs.readFileSync(
    soleFile(BUILD, '_SLD_topology_V1_0_0.json', 'topology'), 'utf8')).metadata || {};
  doc.slug = meta.slug || doc.slug;
  doc.project = meta.project_name || meta.project || doc.project;
}
doc.runs = doc.runs || [];
doc.runs.push(run);
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');

const p3 = run.validate_p3;
console.log(`  wrote 3_output/RESULTS.json — run ${doc.runs.length}`);
console.log(`  engine ${engineRev || 'unknown'} · sheets ${sheetCount ?? '—'} · ` +
            `P3 ${p3 ? `${p3.errors} errors / ${p3.rules_run} rules` : '—'}`);
if (p3 && p3.rules_run < 63) {
  console.log(`  !! rules run = ${p3.rules_run}. 63 is the number that proves the SH geometry rules ran.`);
  console.log(`     Below it, layout_config went sidecar-only and every SH rule capability-skipped.`);
}
const nonzero = Object.entries(checks).filter(([k, v]) => typeof v === 'number' && v > 0 && !/_total$|_directed$/.test(k));
if (nonzero.length) console.log(`  checks non-zero: ${nonzero.map(([k, v]) => `${k}=${v}`).join(' ')}`);
