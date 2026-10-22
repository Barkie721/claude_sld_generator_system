// Generate OPEN_ITEMS.md — the ledger of what the EOR still owes.
//
// WHY THIS EXISTS: the validator reports CLEAN on a halted topology. A project
// can sit at 63 rules / 0 errors / 0 warnings while carrying six unresolved
// Tier-3 halts, one of which means an entire sheet renders with no A-4
// fault-current tags at all. Nothing surfaced that, and per
// 06_deliverables/README.md unresolved Tier-3 halts mean `unreviewed` BY
// DEFINITION — so the halts, not the exit code, are what actually blocks
// delivery.
//
// Run from run_pipeline.sh stage 2b, off the BARE topology (stage 2b precedes
// layout, so no merged file exists yet).
//
//   node 4_checks/make_open_items.mjs
//
// THREE SOURCES, three tables:
//   1. metadata.compositor_halts[]  — 5 keys: id, topic, text, nec_reference,
//      blocks. ⚠️ `nec_reference` IS NULLABLE — a halt about a missing utility
//      letter or a manufacturer value has no section to cite.
//   2. metadata.compositor_notes[]  — 4 keys, NO `blocks`. Tier-2 decisions
//      taken by default: applied, logged, overridable, not blocking. Rendering
//      both through one function emits `undefined` in the Blocks column, which
//      is why they are separate tables here.
//   3. placeholder markers, found by walking the whole topology. DATA_LOOKUP_MISS
//      is not a key and not an object — project_instructions_V1_0_0.md §9.3
//      defines it as the STRING `DATA_LOOKUP_MISS: [table, params]` substituted
//      into an arbitrary leaf field, so the only reliable finder is a recursive
//      walk testing every string leaf for that prefix. Boolean markers
//      (`provisional`, `sizing_pending`) are found the same way.
import fs from 'node:fs';
import { PROJ, BUILD, soleFile } from './check_lib.mjs';

const LOOKUP_MISS = 'DATA_LOOKUP_MISS';
// Boolean-true markers. Keep this list explicit: a blanket "any true boolean"
// sweep pulls in flip_vertical, stub_exempt and friends, which are geometry, not
// debt.
const BOOL_MARKERS = new Set(['provisional', 'sizing_pending', 'assumed', 'estimated']);

const topoPath = soleFile(BUILD, '_SLD_topology_V1_0_0.json', 'topology');
const t = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
const meta = t.metadata || {};
const halts = meta.compositor_halts || [];
const notes = meta.compositor_notes || [];
const project = meta.project_name || meta.project || meta.slug || '<Project>';

// ------------------------------------------------------------- placeholder walk
const found = [];
(function walk(node, path) {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    if (node.startsWith(LOOKUP_MISS)) found.push({ marker: LOOKUP_MISS, path, value: node });
    return;
  }
  if (typeof node === 'boolean') {
    const key = path.split('.').pop().replace(/\[\d+\]$/, '');
    if (node === true && BOOL_MARKERS.has(key)) found.push({ marker: key, path, value: 'true' });
    return;
  }
  if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
  if (typeof node === 'object') {
    // metadata carries the halt prose itself, which QUOTES these marker names.
    // Walking it would report the description as an instance.
    for (const k of Object.keys(node)) {
      if (path === '' && k === 'metadata') continue;
      walk(node[k], path ? `${path}.${k}` : k);
    }
  }
})(t, '');

// Which halt, if any, names this marker in its prose.
const citedBy = (m) => {
  const hit = halts.filter(h => (h.text || '').includes(m.marker)).map(h => h.id);
  return hit.length ? hit.join(', ') : '—';
};

// ----------------------------------------------------------------------- render
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n+/g, ' ');
const nec = (v) => (v == null ? '—' : `\`${esc(v)}\``);
const L = [];

L.push(`# ${project} — open items the EOR still owes`);
L.push('');
L.push('> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not');
L.push('> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.');
L.push('');
L.push('⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says');
L.push('nothing about this list. **This ledger, not the exit code, is the completeness record.**');
L.push('');
L.push('Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by');
L.push('definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.');
L.push('');
L.push(`**Generated** ${new Date().toISOString()} · **Halts** ${halts.length} · ` +
       `**Notes** ${notes.length} · **Placeholders** ${found.length}`);
L.push('');
L.push('---');
L.push('');

// -- 1. halts
L.push('## 1. Tier-3 halts — EOR input required');
L.push('');
if (!halts.length) {
  L.push('`compositor_halts[]` is empty **by design** — every value on this drawing came from a');
  L.push('narrative statement or a Tier-1 data lookup. Nothing is owed.');
} else {
  L.push('| # | Topic | NEC | Blocks |');
  L.push('|---|-------|-----|--------|');
  for (const h of halts) {
    L.push(`| \`${esc(h.id)}\` | ${esc(h.topic)} | ${nec(h.nec_reference)} | ${esc(h.blocks) || '—'} |`);
  }
  L.push('');
  for (const h of halts) {
    L.push(`### ${esc(h.id)} — ${esc(h.topic)}`);
    L.push('');
    L.push(String(h.text || '').trim());
    L.push('');
    L.push(`**NEC** ${h.nec_reference == null ? '— *(no section applies — this is a project or ' +
           'manufacturer value, not a code question)*' : '`' + esc(h.nec_reference) + '`'} · ` +
           `**Blocks** ${esc(h.blocks) || '—'}`);
    L.push('');
  }
}
L.push('---');
L.push('');

// -- 2. notes
L.push('## 2. Tier-2 decisions taken by default (`compositor_notes[]`)');
L.push('');
L.push('Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.');
L.push('');
if (!notes.length) {
  L.push('`compositor_notes[]` is empty — no Tier-2 default was exercised.');
} else {
  L.push('| # | Topic | NEC |');
  L.push('|---|-------|-----|');
  for (const n of notes) L.push(`| \`${esc(n.id)}\` | ${esc(n.topic)} | ${nec(n.nec_reference)} |`);
  L.push('');
  for (const n of notes) {
    L.push(`### ${esc(n.id)} — ${esc(n.topic)}`);
    L.push('');
    L.push(String(n.text || '').trim());
    L.push('');
  }
}
L.push('---');
L.push('');

// -- 3. placeholders
L.push('## 3. Placeholder values in the topology');
L.push('');
L.push('Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into');
L.push('an arbitrary field**, not a key, so nothing shallower finds it reliably.');
L.push('');
if (!found.length) {
  L.push('None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker ' +
         `(\`${[...BOOL_MARKERS].join('\`, \`')}\`) appears anywhere in the topology.`);
} else {
  L.push('| Marker | JSON path | Value | Cited by |');
  L.push('|--------|-----------|-------|----------|');
  for (const m of found) {
    L.push(`| \`${esc(m.marker)}\` | \`${esc(m.path)}\` | ${esc(m.value).slice(0, 70)} | ${citedBy(m)} |`);
  }
}
L.push('');
L.push('---');
L.push('');
L.push('## Naming');
L.push('');
L.push('`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.');
L.push('This file is a per-project instance record, so it carries no `_V` suffix.');
L.push('');

const out = `${PROJ}/OPEN_ITEMS.md`;
fs.writeFileSync(out, L.join('\n'));
console.log(`  wrote OPEN_ITEMS.md — ${halts.length} halt${halts.length === 1 ? '' : 's'}, ` +
            `${notes.length} note${notes.length === 1 ? '' : 's'}, ${found.length} placeholder${found.length === 1 ? '' : 's'}`);
if (halts.length) {
  console.log(`  !! ${halts.length} UNRESOLVED TIER-3 HALT${halts.length === 1 ? '' : 'S'} — ` +
              `this project is \`unreviewed\` by definition and cannot graduate.`);
  for (const h of halts) console.log(`     ${h.id}  ${h.topic}  — blocks: ${h.blocks || '—'}`);
}
console.log(`RESULT open_items halts=${halts.length} notes=${notes.length} placeholders=${found.length}`);
