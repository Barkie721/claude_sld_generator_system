#!/usr/bin/env node
// 08_validation/validate_topology_V1_0_0.mjs — standalone Phase 1+2 topology validator.
// Grown from 03_contracts/conformance_walk_V1_0_0.mjs (seed copy alongside) into a rule
// engine over the TI/CV/TV/SV/DV catalog (02_specs/drafting/sld_topology_rules_V1_0_0.md §7)
// as amended by 03_contracts/sld_topology_schema_V1_0_0.md §15 items 1–9.
// Phase 3 geometry preflight SH-2..SH-6 (sld_preflight_V1_0_0.md) runs on
// WITH_GEOMETRY topologies; geometry-bearing reports carry an additive `preflight`
// block (calibration echo + per-sheet s_pred). SH-6 activated,
// when its input — the geometry.sections export (schema §14.7) — finally landed.
//
// Usage:
//   node validate_topology_V1_0_0.mjs [flags] <topology.json> [<topology2.json> ...]
// Flags:
//   --json                  machine-readable report to stdout (one JSON doc per file)
//   --layout-config <path>  sidecar layout config (sheet_roles for the null-start contract)
//   --quiet-info            suppress info findings in the human report
//   --strict-migrations     treat migration findings as errors (exit 1)
//
// Severities: error | migration (documented-intentional legacy dialect, Appendix A) | info.
// Exit codes: 0 = clean; 1 = any error; 2 = migration findings only; 3 = crash/unreadable.
import fs from 'node:fs';
import { buildContext } from './lib/context_V1_0_0.mjs';
import { normalizeFindings, renderHuman, renderJson, computeExit } from './lib/report_V1_0_0.mjs';
import { buildPreflightSummary } from './lib/geometry_V1_0_0.mjs';
import { RULES } from './rules/index_V1_0_0.mjs';

function parseArgs(argv) {
  const opts = { json: false, quietInfo: false, strictMigrations: false, layoutConfigPath: null, files: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--quiet-info') opts.quietInfo = true;
    else if (a === '--strict-migrations') opts.strictMigrations = true;
    else if (a === '--layout-config') opts.layoutConfigPath = argv[++i];
    else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
    else if (a.startsWith('--')) { console.error(`[validate] unknown flag ${a}`); usage(); process.exit(3); }
    else opts.files.push(a);
  }
  return opts;
}
function usage() {
  console.error('Usage: node validate_topology_V1_0_0.mjs [--json] [--quiet-info] [--strict-migrations] [--layout-config <path>] <topology.json> [...]');
}

function validateFile(filePath, opts, layoutConfig) {
  const t = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const ctx = buildContext(t, { filePath, layoutConfig });
  const findings = [];
  const skipped = [];   // {id, reason} — capability unavailable
  const deferredRules = []; // {id, reason} — registered but intentionally unimplemented
  const vacuous = [];   // rule ids that are registered no-ops (A-5 unimplemented, etc.)
  let rulesRun = 0;

  const ordered = [...RULES].sort((a, b) => (a.phase ?? 1) - (b.phase ?? 1));
  for (const rule of ordered) {
    if (rule.status === 'vacuous') { vacuous.push(rule.id); continue; }
    if (rule.status === 'deferred') { deferredRules.push({ id: rule.id, reason: rule.deferred_reason || 'deferred' }); continue; }
    const unmet = (rule.requires || []).filter(req => !ctx.hasCapability(req));
    if (unmet.length) { skipped.push({ id: rule.id, reason: `missing ${unmet.join(', ')}` }); continue; }
    rulesRun++;
    try {
      findings.push(...normalizeFindings(rule, rule.check(ctx)));
    } catch (err) {
      findings.push({ rule_id: rule.id, spec_ref: rule.spec_ref, severity: 'error', path: '(rule crashed)', message: `rule implementation threw: ${err.message}` });
    }
  }

  const meta = {
    schema_version: t.metadata?.schema_version,
    sheets: ctx.sheets.length, devices: ctx.devices.length, routed: ctx.routed.length,
  };
  const exit = computeExit(findings, { strictMigrations: opts.strictMigrations });
  // preflight §4 calibration echo — additive, geometry-bearing topologies only
  const preflight = ctx.hasCapability('geometry') ? buildPreflightSummary(ctx) : null;
  return { filePath, meta, findings, rulesRun, skipped, deferred: deferredRules, vacuous, exit, ...(preflight ? { preflight } : {}) };
}

const opts = parseArgs(process.argv);
if (!opts.files.length) { usage(); process.exit(3); }

let layoutConfig = null;
if (opts.layoutConfigPath) {
  try { layoutConfig = JSON.parse(fs.readFileSync(opts.layoutConfigPath, 'utf8')); }
  catch (err) { console.error(`[validate] cannot read --layout-config ${opts.layoutConfigPath}: ${err.message}`); process.exit(3); }
}

let sawError = false, sawMigration = false;
for (const file of opts.files) {
  let result;
  try {
    result = validateFile(file, opts, layoutConfig);
  } catch (err) {
    console.error(`[validate] ERROR: cannot validate ${file}: ${err.message}`);
    process.exitCode = 3;
    continue;
  }
  if (opts.json) console.log(renderJson(result));
  else console.log(renderHuman(result, { quietInfo: opts.quietInfo }));
  if (result.exit === 1) sawError = true;
  if (result.exit === 2) sawMigration = true;
}
if (process.exitCode !== 3) process.exitCode = sawError ? 1 : (sawMigration ? 2 : 0);
