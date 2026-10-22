#!/usr/bin/env node
// 08_validation/check_acceptance_V1_0_0.mjs — self-verifying acceptance gate.
// Asserts the behavioral acceptance on the hospital reference topologies:
//   hospital golden + __WITH_GEOMETRY : 0 errors, 0 migration items, exit 0
// The gate runs the 2 hospital cases. The MIG-1/2/3 and CV-14 rules are in the
// registry fixture-less; CV-14's skip coverage still rides on both hospital cases
// (skipped: ['CV-14']).
// The Phase 3 preflight assertions are additive (never loosened): on the
// WITH_GEOMETRY case the SH-2a..SH-3 rules must RUN (not skip),
// and no SH finding may sit at error/warning; on
// geometry-less topologies the SH rules must SKIP via the geometry capability.
// The opt-in expect.warnings exact-set pin is additive — cases without it are unaffected.
// The SILENT-SKIP TRAP is closed here.
// ctx.data() resolves data files BY FILENAME STRING, so a rename that misses one
// `requires: ['data:…']` string makes those rules skip silently while every
// assertion above still passes — the gate printed "GATE: PASS, 2 cases" and exited 0
// with TI-4/DV-3/DV-11/DV-12 dark (62 → 58 rules). Reproduced out-of-tree, not
// theorised. Three additive assertions now close it, each catching what the others
// cannot:
//   1. NO_MISSING_DATA_SKIPS (global, every case, no opt-in) — no rule may skip for
//      an unresolvable data file. Rename-proof and automatically covers any FUTURE
//      data-backed rule, which a hand-maintained id list would not.
//   2. expect.mustRun (per case) — names the load-bearing rule ids explicitly, so the
//      reason a rule is required is visible at the pin site. Catches a rule going
//      dark via vacuous/deferred, which reason-matching alone would miss.
//   3. expect.rulesRun (per case) — exact run-count pin. Catches a rule vanishing
//      from the registry entirely, which leaves NO trace in rules_skipped at all.
// Adding a legitimate new rule is expected to update the counts in 3 deliberately.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VALIDATOR = path.join(__dirname, 'validate_topology_V1_0_0.mjs');

// Active Phase 3 preflight rules (rules/sh_rules_V1_0_0.mjs).
// SH-3-A7 (A-7 level-line label boxes, info) activated when
// geometry.level_lines began to be emitted (schema §14.6).
// SH-6 (switchboard text-zone extent, finiteness-only, info) activated when
// geometry.sections began to be emitted (schema §14.7) — that export is the
// input it had been dormant for. SH-6 is now active and is asserted through SH_ACTIVE.
const SH_ACTIVE = ['SH-2a', 'SH-5a', 'SH-2b', 'SH-4', 'SH-5b', 'SH-3', 'SH-3-A7', 'SH-6'];

// Every rule whose `requires` names a data file (rules/*.mjs). These are the rules a
// missed rename silences. Listed here so the pin reads as a statement about the
// system, not a magic array; assertion 1 below does not depend on this list.
const DATA_BACKED = ['TI-4', 'DV-3', 'DV-11', 'DV-12'];

const CASES = [
  {
    name: 'hospital golden',
    file: path.join(ROOT, '09_tests', 'Hospital Example (Golden Case)', 'hospital_SLD_topology_V1_0_0.json'),
    expect: { errors: 0, migrations: [], exit: 0, sh: 'skipped', skipped: ['CV-14'],
              mustRun: DATA_BACKED, rulesRun: 54 },
  },
  {
    // CV-12 is scoped onto the comb-anchor port-role model at error severity. The 11 legal
    // feed-port reuses do not flag, so this golden is warning-free — pin warnings [] to
    // regression-lock it (additive strengthening).
    name: 'hospital WITH_GEOMETRY',
    file: path.join(ROOT, '09_tests', 'Hospital Example (Golden Case)', 'hospital_SLD_topology_V1_0_0__WITH_GEOMETRY.json'),
    expect: { errors: 0, migrations: [], exit: 0, sh: 'run', warnings: [], skipped: ['CV-14'],
              mustRun: DATA_BACKED, rulesRun: 62 },
  },
  // See the header note — the gate runs 2 hospital cases; MIG-1/2/3 are fixture-less
  // and CV-14's skip coverage rides on the two hospital cases above.
];

console.log('==== 08_validation ACCEPTANCE GATE ====');
let pass = true;
for (const c of CASES) {
  const run = spawnSync(process.execPath, [VALIDATOR, '--json', c.file], { encoding: 'utf8' });
  let report = null;
  try { report = JSON.parse(run.stdout); } catch { /* fallthrough */ }
  if (!report) {
    console.log(`✗ ${c.name}: validator produced no JSON (exit ${run.status})\n${run.stderr}`);
    pass = false; continue;
  }
  const errors = report.findings.filter(f => f.severity === 'error');
  const migIds = [...new Set(report.findings.filter(f => f.severity === 'migration').map(f => f.rule_id))].sort();
  const problems = [];
  if (errors.length !== c.expect.errors)
    problems.push(`${errors.length} errors (expected ${c.expect.errors}): ${errors.slice(0, 8).map(f => `${f.rule_id}@${f.path}`).join('; ')}${errors.length > 8 ? ' …' : ''}`);
  if (JSON.stringify(migIds) !== JSON.stringify(c.expect.migrations))
    problems.push(`migration rules [${migIds.join(', ')}] (expected [${c.expect.migrations.join(', ')}])`);
  if (run.status !== c.expect.exit)
    problems.push(`exit ${run.status} (expected ${c.expect.exit})`);
  // Phase 3 preflight assertions (additive)
  const skippedIds = new Set((report.rules_skipped || []).map(s => s.id));
  if (c.expect.sh === 'run') {
    const notRun = SH_ACTIVE.filter(id => skippedIds.has(id));
    if (notRun.length) problems.push(`SH rules skipped on a WITH_GEOMETRY topology: [${notRun.join(', ')}]`);
    // (SH-6 is active — asserted through SH_ACTIVE above — since geometry.sections ships.)
    const shGating = report.findings.filter(f => /^SH-[2-6]/.test(f.rule_id) && (f.severity === 'error' || f.severity === 'warning'));
    if (shGating.length)
      problems.push(`${shGating.length} SH finding(s) at error/warning: ${shGating.slice(0, 5).map(f => `${f.rule_id}@${f.path}`).join('; ')}`);
    if (!report.preflight || !report.preflight.calibration)
      problems.push('geometry-bearing report missing the preflight calibration echo');
  } else if (c.expect.sh === 'skipped') {
    const ran = SH_ACTIVE.filter(id => !skippedIds.has(id));
    if (ran.length) problems.push(`SH rules ran without a geometry block: [${ran.join(', ')}]`);
  }
  // Expected-warning pin (additive, opt-in per case): when a case declares
  // expect.warnings, the warning-severity rule-id set must match it exactly.
  if (c.expect.warnings) {
    const warnIds = [...new Set(report.findings.filter(f => f.severity === 'warning').map(f => f.rule_id))].sort();
    if (JSON.stringify(warnIds) !== JSON.stringify([...c.expect.warnings].sort()))
      problems.push(`warning rules [${warnIds.join(', ')}] (expected [${c.expect.warnings.join(', ')}])`);
  }
  // Expected-skip pin (additive, opt-in per case): regression-locks a
  // capability-gated rule into rules_skipped. CV-14 skips on every config-less topology (none
  // embeds layout_config.subfeed_start_ports) — the gate that keeps it off both goldens.
  if (c.expect.skipped) {
    for (const id of c.expect.skipped)
      if (!skippedIds.has(id)) problems.push(`rule ${id} expected in rules_skipped but was not (skipped: [${[...skippedIds].join(', ')}])`);
  }
  // ---- Silent-skip trap. See the header note. ----
  // 1. Global: no rule may go dark because its data file did not resolve. `requires`
  //    capabilities are 'data:<basename>' and the runner phrases the skip as
  //    `missing data:<basename>`, so this fires on ANY unresolvable data file —
  //    including one added after this line was written.
  const dataSkips = (report.rules_skipped || []).filter(s => /^missing .*\bdata:/.test(s.reason || ''));
  if (dataSkips.length)
    problems.push(`${dataSkips.length} rule(s) skipped on an UNRESOLVED DATA FILE — a rename almost certainly missed a requires/ctx.data() string: ${dataSkips.map(s => `${s.id} (${s.reason})`).join('; ')}`);
  // 2. Named must-run pin: the id must appear in none of skipped / vacuous / deferred.
  if (c.expect.mustRun) {
    const vacuousIds = new Set(report.rules_vacuous || []);
    const deferredIds = new Set((report.rules_deferred || []).map(d => d.id));
    const dark = c.expect.mustRun.filter(id => skippedIds.has(id) || vacuousIds.has(id) || deferredIds.has(id));
    if (dark.length) problems.push(`rule(s) expected to RUN did not: [${dark.join(', ')}]`);
  }
  // 3. Exact run-count pin: catches a rule removed from the registry outright, which
  //    leaves no trace in rules_skipped for assertions 1 and 2 to see.
  if (c.expect.rulesRun !== undefined && report.rules_run !== c.expect.rulesRun)
    problems.push(`${report.rules_run} rules ran (expected ${c.expect.rulesRun}) — a rule was added, removed or silenced`);
  if (problems.length) {
    console.log(`✗ ${c.name}:`);
    for (const p of problems) console.log(`    ${p}`);
    pass = false;
  } else {
    console.log(`✓ ${c.name}: ${c.expect.errors} errors, migrations [${c.expect.migrations.join(', ')}], exit ${c.expect.exit}`);
  }
}
console.log(pass ? `GATE: PASS, ${CASES.length} cases` : 'GATE: FAIL');
process.exitCode = pass ? 0 : 1;
