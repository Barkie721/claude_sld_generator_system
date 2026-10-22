// sync_gate.mjs — cross-surface consistency gate.
//
// The SLD system keeps the same information on many surfaces: the family map is
// byte-copied ×2, the viewer is byte-copied to the golden, sld_engine.mjs is
// regenerated from the viewer, the DLL embeds the map, and several living docs
// restate the current rev/sha. This gate proves those surfaces still agree with
// each other AND with the machine-truth manifest (03_contracts/
// current_state_manifest.json), so a half-applied edit is caught immediately.
//
// ADDITIVE / READ-ONLY: it never writes a product artifact. Phase 3 regenerates
// sld_engine.mjs (gen_engine.mjs's only output path) and restores it from an
// in-memory backup on any mismatch.
//
//   node 08_validation/sync_gate.mjs           # all six phases
//   node 08_validation/sync_gate.mjs --quick   # phases 1-5 (skips the PNG-baseline sha compare)
//
// Exit 0 iff every check passes; non-zero with a FAILED list otherwise.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const QUICK = process.argv.includes('--quick');
const GOLD = '09_tests/Hospital Example (Golden Case)';

// ⚠️ `ADDIN_ROOT` AND ITS CHECK WERE DELETED 2026-07-31 BY PHASE 7b, DECISION D-A
// (HO-0022 §6.1). The add-in tree left this repo for `Mayo_Claude_Workspace/DEDARMS Revit
// Toolkit`; the const was NOT repointed at the sibling repo. HO-0021 §7.4 recommended
// repointing and D-A reverses that on evidence §7.4 did not have: after 7b's other ten
// removals, the `ADDIN_ROOT resolves` check would have been the ONLY remaining consumer of
// the constant, and the seven checks whose vague reds it existed to disambiguate are
// precisely the ones 7b deletes. Its second job — asserting the hub still indexes every
// feature document — is owned by toolkit `[T7]`, measured GREEN in a staging lab before
// this deletion. THE DROP (`03_contracts/published_drop/`) IS NOW THE ONLY SEAM between the
// two repos, and no check here reads a file outside this repo.
//
// path.isAbsolute passthrough, KEPT AND NOW INERT. It existed for exactly one future — an
// absolute out-of-repo ADDIN_ROOT — which D-A closed. It is left in place because removing
// it is a behaviour change to every path this gate resolves, not a cleanup, and because the
// trade-off it documents is still live: an absolute path pasted into a manifest
// carry_copies entry reads a file OUTSIDE the repo instead of failing loudly with ENOENT.
// There is no consumer of that behaviour in this file today.
const abs = p => path.isAbsolute(p) ? p : path.join(REPO, p);
const rd = p => fs.readFileSync(abs(p));
const rdText = p => fs.readFileSync(abs(p), 'utf8');
const exists = p => fs.existsSync(abs(p));
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
// stable, key-sorted deep serialization for order-insensitive deep-equal
const stable = x => { const s = v => Array.isArray(v) ? v.map(s)
  : (v && typeof v === 'object' ? Object.keys(v).sort().reduce((a, k) => { a[k] = s(v[k]); return a; }, {}) : v);
  return JSON.stringify(s(x)); };

const M = JSON.parse(rdText('03_contracts/current_state_manifest.json'));
const REV = M.engine.rev;

let pass = 0, fail = 0; const failed = [];
function check(phase, name, fn) {
  let ok = false, detail = '';
  try {
    const r = fn();
    if (r === true) ok = true;
    else if (r && r.ok) { ok = true; detail = r.detail || ''; }
    else detail = (r && r.detail) || 'mismatch';
  } catch (e) { detail = 'threw: ' + e.message; }
  if (ok) { pass++; console.log(`  ok    [${phase}] ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; failed.push(`[${phase}] ${name}: ${detail}`); console.log(`  FAIL  [${phase}] ${name} — ${detail}`); }
}

// ---------------------------------------------------------------- PHASE 1
console.log('----- phase 1: copies & DLL embed -----');
check('P1', 'family map ×2 byte-identical + matches manifest', () => {
  const copies = M.artifacts.family_map.copies;
  const shas = copies.map(p => (exists(p) ? sha(rd(p)) : 'MISSING:' + p));
  const uniq = [...new Set(shas)];
  if (uniq.length !== 1) return { detail: 'copies diverge: ' + shas.map(s => s.slice(0, 12)).join(', ') };
  if (uniq[0] !== M.artifacts.family_map.sha256) return { detail: `sha ${uniq[0].slice(0, 8)} != manifest ${M.artifacts.family_map.short}` };
  return { ok: true, detail: `${copies.length} copies @ ${M.artifacts.family_map.short}` };
});
check('P1', 'viewer == golden viewer byte-copy + matches manifest', () => {
  const v = sha(rd(M.artifacts.viewer.path));
  const g = sha(rd(`${GOLD}/hospital_sld_viewer_V1_0_0.html`));
  if (v !== g) return { detail: 'viewer and golden viewer differ (re-copy engine->viewer)' };
  if (v !== M.artifacts.viewer.sha256) return { detail: `sha ${v.slice(0, 8)} != manifest ${M.artifacts.viewer.short}` };
  return { ok: true, detail: M.artifacts.viewer.short };
});
check('P1', 'DLL embed == current family map (map<->DLL lockstep)', () => {
  const dll = M.artifacts.addin_dll;
  // NO DISK GUARD, DELIBERATELY. This check compares TWO MANIFEST FIELDS and never
  // opens a DLL. Whether one happens to be on this box is irrelevant to whether the
  // manifest is self-consistent, so the `carry_copies.some(exists)` guard that used to
  // sit here could only ever hide a real lockstep violation behind a green line --
  // FL-0001's exact failure class, reintroduced by a guard that looked like caution.
  if (!dll.embeds_map_sha256) return { detail: 'manifest addin_dll has no embeds_map_sha256 field' };
  const mapSha = M.artifacts.family_map.sha256;
  if (dll.embeds_map_sha256 === mapSha) {
    if (dll.stale_pending_rebuild) return { detail: 'in lockstep, but stale_pending_rebuild is still true — clear it in the manifest' };
    return { ok: true, detail: `in lockstep @ ${M.artifacts.family_map.short}` };
  }
  // Out of lockstep. Only a manifest that ADMITS the staleness may pass.
  if (dll.stale_pending_rebuild) {
    return { ok: true, detail: `KNOWN-STALE (declared): DLL embeds ${dll.embeds_map_short || dll.embeds_map_sha256.slice(0, 8)}, map is ${M.artifacts.family_map.short} — rebuild on trip ${dll.install_on_trip ?? '?'}` };
  }
  return { detail: `UNDECLARED DRIFT: DLL embeds ${dll.embeds_map_sha256.slice(0, 8)} but map is ${mapSha.slice(0, 8)} — rebuild the DLL, or set stale_pending_rebuild if this is intentional` };
});

// ---------------------------------------------------------------------------
// THE PUBLISHER-SIDE STALENESS CHECK — the one ADDITION Phase 7b makes to this gate
// (HO-0021 §7.1, appended at the END of phase 1 per E1's rule: check positions here are
// ARRIVAL IDs, never execution indices, and living docs cite specific ones by number).
//
// It is the SLD half of the two staleness checks `drop_manifest.json`'s own
// `$comment_staleness` describes. The toolkit's T1 asserts that its imported copy still
// hashes to the manifest — that catches local tampering on the consumer side. This asserts
// the other direction, which only the publisher can see: THE SHAS IN THE DROP STILL EQUAL
// THE LIVE UPSTREAM FILES. Without it, tuning the family map or editing the topology schema
// leaves the drop pinned to yesterday's bytes, the toolkit stays perfectly self-consistent
// with a stale contract, and NOTHING IN EITHER REPO GOES RED.
//
// 🚩 IT READS ONLY LOCAL FILES, AND THAT IS WHY IT LIVES HERE RATHER THAN IN THE TOOLKIT.
// E9's objection to the drafted alternative was that a check reaching into the sibling repo
// SOFT-SKIPS on exactly the machine where the sibling is absent — green because it could not
// look, which is FL-0009's entire lesson. Every path below is inside this repo, so there is
// no machine on which this check can decline to run.
//
// ON MISMATCH: WARN LOUDLY, NEVER AUTO-SYNC. Re-copying upstream into the drop would
// silently re-publish a family-map change into a DLL that was never rebuilt — FL-0001's
// exact class. Re-publishing the drop is a deliberate act with its own change-set.
//
// ⚠️ ONE DELIBERATE OVERLAP, STATED SO NOBODY "SIMPLIFIES" IT: the family map's `source` is
// `family_map.copies[0]`, and §7.2 repointed `copies[1]` at the drop copy, so check 1 and
// this check both compare those two files. Check 1 additionally binds them to
// `family_map.sha256`, and this check covers the OTHER THREE dropped files that check 1
// never sees. Neither is a subset of the other.
check('P1', 'published_drop shas == the LIVE upstream files (publisher-side staleness)', () => {
  const REL = '03_contracts/published_drop';
  const MAN = `${REL}/drop_manifest.json`;
  if (!exists(MAN)) return { detail: `${MAN} is missing — the drop is this repo's only seam with the toolkit, and an absent manifest must never read as "nothing to check"` };
  let DROP;
  // Parsed INSIDE the check on purpose. A top-level parse of a malformed manifest would
  // throw at module load, outside check()'s try/catch, and kill the gate with ZERO check
  // lines — which reads in a log as "the gate crashed", not "the gate went red". Same
  // reasoning as the const-placement note at the top of this file.
  try { DROP = JSON.parse(rdText(MAN)); }
  catch (e) { return { detail: `${MAN} is not valid JSON: ${e.message}` }; }

  const files = DROP.files || {};
  const names = Object.keys(files);
  if (!names.length) return { detail: `${MAN} declares no files — an empty drop is not a passing one, it is a seam that stopped carrying anything` };

  const problems = [], ok = [];
  for (const [name, entry] of Object.entries(files)) {
    const dropCopy = `${REL}/${name}`;
    if (!entry.sha256) { problems.push(`${name}: no sha256 in the drop manifest — a file without a pin is a comment, not a contract`); continue; }
    if (!entry.source) { problems.push(`${name}: no "source" — without it nothing here can tell whether the drop still tracks upstream, which is the whole job of this check`); continue; }
    if (!exists(dropCopy)) { problems.push(`${name}: declared but MISSING from ${REL}/ — the toolkit imports a file this repo no longer publishes`); continue; }
    if (!exists(entry.source)) { problems.push(`${name}: its upstream source ${entry.source} does not exist — the drop is pinned to a file that left, so nothing can be fresh against it` ); continue; }
    const dropSha = sha(rd(dropCopy)), srcSha = sha(rd(entry.source));
    if (dropSha !== entry.sha256)
      problems.push(`${name}: the drop copy hashes ${dropSha.slice(0, 8)} but its own manifest pins ${entry.short || entry.sha256.slice(0, 8)} — the published copy was edited in place. Re-publish deliberately; do NOT re-pin to clear this`);
    else if (srcSha !== entry.sha256)
      problems.push(`${name}: UPSTREAM HAS MOVED ON — ${entry.source} is now ${srcSha.slice(0, 8)} but the published drop is still ${entry.short || entry.sha256.slice(0, 8)}. The toolkit is consistent with a STALE contract and nothing on its side can see that. Re-publish the drop in a deliberate change-set; NEVER auto-sync, because copying a family-map change into a drop whose DLL was never rebuilt is FL-0001's exact class`);
    else ok.push(`${name} @ ${entry.short || entry.sha256.slice(0, 8)}`);
  }

  // The other direction, and it is not symmetry for its own sake: the loop above iterates the
  // MANIFEST, so a file added to published_drop/ without an entry is invisible to it. The
  // toolkit's T1 would then see it as a stray on ITS side, one repo too late.
  const OWNED = new Set(['drop_manifest.json']);
  const found = fs.readdirSync(abs(REL)).filter(f => !f.startsWith('.'));
  const stray = found.filter(f => !OWNED.has(f) && !files[f]);
  if (stray.length)
    problems.push(`${stray.join(', ')} live(s) in ${REL}/ but is named by no drop_manifest entry — an unpinned file in the drop reaches the toolkit with nothing tracking it`);

  if (problems.length) return { detail: problems.join(' | ') };
  return { ok: true, detail: `${ok.length} dropped file(s) still equal their live upstream: ${ok.join(' · ')}` };
});

// ---------------------------------------------------------------- PHASE 2
console.log('----- phase 2: hospital topology 3-surface -----');
const std = JSON.parse(rdText(`${GOLD}/hospital_SLD_topology_V1_0_0.json`));
check('P2', 'standalone topology == WITH_GEOMETRY topology (exact, minus geometry)', () => {
  const wg = JSON.parse(rdText(`${GOLD}/hospital_SLD_topology_V1_0_0__WITH_GEOMETRY.json`));
  const wgTopo = { ...wg }; delete wgTopo.geometry;
  if (JSON.stringify(std) !== JSON.stringify(wgTopo)) return { detail: 'standalone != WITH_GEOMETRY(minus geometry)' };
  return { ok: true, detail: `${std.devices.length} dev / ${std.routed_elements.length} routed / ${std.annotations.length} ann` };
});
check('P2', 'embedded viewer TOPO structurally == standalone (excl metadata/layout_config)', () => {
  const html = rdText(M.artifacts.viewer.path);
  const m = html.match(/\n(?:const|let) TOPO = (\{[\s\S]*?\n\});\n/);
  if (!m) return { detail: 'embedded TOPO block not found in viewer' };
  const emb = new Function('return (' + m[1] + ')')();
  const strip = o => { const c = { ...o }; delete c.metadata; delete c.layout_config; return c; };
  if (stable(strip(emb)) !== stable(strip(std))) return { detail: 'embedded TOPO structural drift vs standalone' };
  return { ok: true, detail: 'structural topology matches (metadata/layout_config surface-specific, excluded)' };
});

// ---------------------------------------------------------------- PHASE 3 (in --quick)
console.log('----- phase 3: engine == regenerate(viewer) -----');
check('P3', 'sld_engine.mjs == regenerate(viewer), byte-identical + matches manifest', () => {
  const enginePath = abs(M.artifacts.sld_engine_mjs.path);
  const backup = fs.readFileSync(enginePath);
  try {
    execFileSync('node', ['gen_engine.mjs'], { cwd: abs('04_renderer'), stdio: 'ignore' });
    const after = fs.readFileSync(enginePath);
    if (Buffer.compare(backup, after) !== 0) {
      fs.writeFileSync(enginePath, backup);
      return { detail: `regenerate(viewer) != committed engine ${sha(backup).slice(0, 8)} -> ${sha(after).slice(0, 8)} (restored)` };
    }
    if (sha(after) !== M.artifacts.sld_engine_mjs.sha256) return { detail: `engine sha ${sha(after).slice(0, 8)} != manifest ${M.artifacts.sld_engine_mjs.short}` };
    return { ok: true, detail: M.artifacts.sld_engine_mjs.short };
  } catch (e) { fs.writeFileSync(enginePath, backup); return { detail: 'gen_engine threw: ' + e.message }; }
});

// ---------------------------------------------------------------- PHASE 4
console.log('----- phase 4: provenance vs manifest -----');
check('P4', 'snapshots_page/audit.json viewer_revision == manifest engine rev', () => {
  const audit = JSON.parse(rdText('04_renderer/snapshots_page/audit.json'));
  if (audit.viewer_revision !== REV) return { detail: `audit ${audit.viewer_revision} != manifest ${REV}` };
  return { ok: true, detail: REV };
});
check('P4', 'family map provenance stamp present + ISO date', () => {
  const map = JSON.parse(rdText(M.artifacts.family_map.copies[0]));
  const gen = map.generated || (map._mapping_notes && map._mapping_notes.generated);
  if (!gen) return { detail: 'family map has no "generated" provenance stamp' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gen)) return { detail: `generated stamp "${gen}" is not an ISO date` };
  return { ok: true, detail: `generated ${gen}` };
});

// ---------------------------------------------------------------- PHASE 5
console.log('----- phase 5: living-doc anchors vs manifest -----');
check('P5', 'viewer <meta revision> == manifest rev', () => {
  const m = rdText(M.artifacts.viewer.path).match(/<meta name="revision" content="([^"]+)">/);
  if (!m) return { detail: 'no <meta name="revision"> in viewer' };
  if (m[1] !== REV) return { detail: `meta ${m[1]} != manifest ${REV}` };
  return { ok: true, detail: REV };
});
check('P5', 'README_engine header "internal rev X" == manifest rev', () => {
  const m = rdText('04_renderer/README_engine.md').match(/internal rev ([0-9][0-9.]*)\)/);
  if (!m) return { detail: 'no "internal rev X)" anchor on README_engine line 1' };
  if (m[1] !== REV) return { detail: `README_engine ${m[1]} != manifest ${REV}` };
  return { ok: true, detail: REV };
});
check('P5', 'CLAUDE.md "sld_engine.mjs rev **X**" == manifest rev', () => {
  const m = rdText('CLAUDE.md').match(/`sld_engine\.mjs` rev \*\*([0-9][0-9.]*)\*\*/);
  if (!m) return { detail: 'no "sld_engine.mjs rev **X**" anchor in CLAUDE.md' };
  if (m[1] !== REV) return { detail: `CLAUDE.md ${m[1]} != manifest ${REV}` };
  return { ok: true, detail: REV };
});

// ---------------------------------------------------------------- PHASE 6 (skipped in --quick)
if (!QUICK) {
  console.log('----- phase 6: PNG baselines vs on-disk -----');
  const baselineCheck = (label, listRel, baseRel) => check('P6', label, () => {
    const lines = rdText(listRel).split('\n').filter(l => l.trim());
    const bad = [];
    let n = 0;
    for (const line of lines) {
      const m = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/);
      // FL-0010. This used to `continue` silently, so a line that stopped parsing simply
      // stopped being checked: mangle the whole list and the check returned
      // `ok: true — 0 baselines match`, a green line meaning "I compared nothing". Both
      // lists are 100% sha-lines with no headers or comments, so an unparseable line is
      // always damage, never formatting. n is also asserted non-zero below.
      if (!m) { bad.push(`unparseable line: ${JSON.stringify(line.slice(0, 60))}`); continue; }
      n++;
      const [, want, rel] = m;
      const p = abs(path.join(baseRel, rel));
      if (!fs.existsSync(p)) { bad.push(`${rel} MISSING`); continue; }
      const got = sha(fs.readFileSync(p));
      if (got !== want) bad.push(`${rel} ${got.slice(0, 8)}!=${want.slice(0, 8)}`);
    }
    if (bad.length) return { detail: bad.join('; ') };
    if (n === 0) return { detail: `${listRel} yielded 0 baselines — an empty or truncated list cannot prove anything` };
    return { ok: true, detail: `${n} baselines match` };
  });
  baselineCheck('golden PNG baselines (baseline_sha256.txt) match on disk',
    `${GOLD}/tests_V1_0_0/baseline_sha256.txt`, GOLD);
  baselineCheck('composed PNG baselines (baseline_composed_sha256.txt) match on disk',
    '04_renderer/baseline_composed_sha256.txt', '04_renderer');
} else {
  console.log('----- phase 6 SKIPPED (--quick) -----');
}

// ---------------------------------------------------------------- SUMMARY
console.log('======================================================');
console.log(`SYNC-GATE: ${pass} passed, ${fail} failed.`);
if (fail) { failed.forEach(f => console.log('  FAILED ' + f)); console.log('SYNC-GATE RED'); process.exit(1); }
console.log('SYNC-GATE GREEN');
