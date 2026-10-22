// 08_validation/lib/report_V1_0_0.mjs — finding normalization, emitters, exit-code policy.
// Severities: error (spec violation) > migration (documented-intentional legacy dialect,
// schema V1.1.0 Appendix A) > warning (calibrated finding awaiting a policy/rescope
// decision, or preflight soft_fail — surfaced prominently, never gates) > info
// (accepted-as-built advisory, never gates).
// Exit codes: 0 = no error/migration; 1 = any error; 2 = migration only; 3 = crash/unreadable.
// Warnings never change the exit code (policy: "warnings don't gate").

export const SEVERITIES = ['error', 'migration', 'warning', 'info'];
const SEV_ORDER = { error: 0, migration: 1, warning: 2, info: 3 };
const SEV_LABEL = { error: 'ERROR', migration: 'MIGR ', warning: 'WARN ', info: 'INFO ' };

export function normalizeFindings(rule, rawFindings) {
  return (rawFindings || []).map(f => ({
    rule_id: rule.id,
    spec_ref: rule.spec_ref,
    severity: f.severity || rule.severity || 'error',
    path: f.path || '(topology)',
    message: f.message,
  }));
}

export function sortFindings(findings) {
  return [...findings].sort((a, b) =>
    (SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
    || a.rule_id.localeCompare(b.rule_id)
    || a.path.localeCompare(b.path));
}

export function countBySeverity(findings) {
  const c = { error: 0, migration: 0, warning: 0, info: 0 };
  for (const f of findings) c[f.severity] = (c[f.severity] || 0) + 1;
  return c;
}

export function computeExit(findings, { strictMigrations = false } = {}) {
  const c = countBySeverity(findings);
  if (c.error > 0) return 1;
  if (c.migration > 0) return strictMigrations ? 1 : 2;
  return 0;
}

export function renderHuman(result, { quietInfo = false } = {}) {
  const { filePath, meta, findings, rulesRun, skipped, vacuous } = result;
  const lines = [];
  const c = countBySeverity(findings);
  lines.push(`=== ${filePath} (schema ${meta.schema_version ?? '?'}, ${meta.sheets} sheets, ${meta.devices} devices, ${meta.routed} routed) ===`);
  for (const f of sortFindings(findings)) {
    if (quietInfo && f.severity === 'info') continue;
    lines.push(`${SEV_LABEL[f.severity]} ${f.rule_id.padEnd(10)} ${f.path}`);
    lines.push(`      ${f.message}   [${f.spec_ref}]`);
  }
  if (quietInfo && c.info) lines.push(`(… ${c.info} info finding${c.info === 1 ? '' : 's'} suppressed by --quiet-info)`);
  const skippedTxt = skipped.length
    ? ` | skipped: ${skipped.map(s => `${s.id} (${s.reason})`).join(', ')}`
    : '';
  lines.push(`RESULT: ${c.error} errors, ${c.migration} migration items, ${c.warning} warnings, ${c.info} info | rules run: ${rulesRun}, vacuous: ${vacuous.length}${skippedTxt}`);
  if (result.preflight) {
    const sp = Object.entries(result.preflight.s_pred_by_sheet || {}).map(([k, v]) => `${k}=${v}`).join(' ');
    lines.push(`PREFLIGHT: s_pred { ${sp} } | calibration ${JSON.stringify(result.preflight.calibration)}`);
  }
  return lines.join('\n');
}

export function renderJson(result) {
  const { filePath, meta, findings, rulesRun, skipped, vacuous, deferred, exit, preflight } = result;
  return JSON.stringify({
    file: filePath,
    schema_version: meta.schema_version ?? null,
    counts: { ...countBySeverity(findings), by_rule: findings.reduce((m, f) => (m[f.rule_id] = (m[f.rule_id] || 0) + 1, m), {}) },
    findings: sortFindings(findings),
    rules_run: rulesRun,
    rules_skipped: skipped,
    rules_vacuous: vacuous,
    rules_deferred: deferred || [],
    ...(preflight ? { preflight } : {}),
    exit,
  }, null, 2);
}
