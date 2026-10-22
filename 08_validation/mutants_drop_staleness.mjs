// MUTANT HARNESS FOR THE PUBLISHER-SIDE STALENESS CHECK
// (`sync_gate.mjs`, phase 1: `[P1] published_drop shas == the LIVE upstream files`).
//
// WHY THIS EXISTS. Separation Phase 7b ADDED that check and it has only ever been observed
// GREEN — on the run that blessed it, and on every run since. **A green line proves the check
// did not fire. It does not prove the check CAN fire.** HO-0022 §0 recorded the mirror image
// of this in the same repo: eleven checks that had only ever gone RED turned out to be
// measuring something other than what they claimed once a staging lab could make them green.
// This repo has now produced five true-by-construction checks; the two most recent were both
// invisible to reading and obvious to running. Reading is not evidence. Running is.
//
// ⚠️ THIS IS THE FIRST MUTANT HARNESS IN THIS REPO. Before it, `sync_gate.mjs` — 14 checks,
// the cross-surface gate the whole system leans on — had NO mutant coverage of any kind. The
// two harnesses that exist live in the DEDARMS toolkit repo and cover that repo's gate. So
// this file is deliberately shaped like `mutants_addin_manifests.mjs` over there (control-arm
// discipline, the `didMutate` guard, restore-then-re-prove) rather than inventing a second
// idiom for the same job.
//
//   SLD_LAB=/root/sld_lab node 08_validation/mutants_drop_staleness.mjs
//
// ⚠️ IT REFUSES TO RUN AGAINST THE REAL TREE. Build the lab with `cp -r <repo>/. $LAB` and
// point SLD_LAB at it. A mutant harness that mutates the repo it is proving is not a harness.
//
// ⚠️ IT READS THE CHECK'S OWN LINE, NEVER THE EXIT CODE. Several arms deliberately damage
// files that OTHER checks also read — mutating the upstream golden topology reddens phase 2,
// and an unparseable drop manifest is visible elsewhere. If this harness scored on exit
// status it would pass every one of those arms without the staleness check ever firing, which
// is precisely the false-positive an instrument is supposed to be immune to.
//
// ⚠️ TWO CHECKS IN THIS GATE ARE BOTH CALLED `[P1]` AND BOTH TOUCH THE FAMILY MAP. Check
// positions here are ARRIVAL IDs, not phase-unique labels, so `/\[P1\]/` alone matches the
// wrong line. Every arm below selects on the check NAME.
//
// ── ON THE MUTATION STYLE ──────────────────────────────────────────────────────────────────
// The sha arms append a single space rather than corrupting bytes at random. The check
// compares SHA-256 digests, so every byte change is equivalent to it — but a random flip can
// also make a JSON file unparseable, which reddens the arm through a DIFFERENT assertion in a
// different check and makes the result unreadable. Appending whitespace changes the digest and
// nothing else: still valid JSON, still valid Markdown. The mutation is minimal on purpose so
// that what goes red is attributable.
//
// ── THE ARMS ───────────────────────────────────────────────────────────────────────────────
//   M0  control — must stay GREEN
//   M1  the DROP COPY edited in place        → "the published copy was edited in place"
//   M2  UPSTREAM edited                      → "UPSTREAM HAS MOVED ON"
//   M3  a files entry with no `sha256`       → "a file without a pin is a comment"
//   M4  a files entry with no `source`       → 'no "source"'
//   M5  the drop copy deleted                → "MISSING from"
//   M6  `source` points at a file that left  → "does not exist"
//   M7  a stray file in published_drop/      → "named by no drop_manifest entry"
//   M8  drop_manifest.json unparseable       → "is not valid JSON"
//   M9  an empty `files` block               → "declares no files"
//   M10 THE ISOLATION ARM — see below
//
// 🚩 M10 IS THE ARM THAT ANSWERS THE QUESTION THE OTHERS CANNOT. HO-0023 §3.1 declares a
// deliberate overlap: `family_map.copies[0]` is this drop entry's `source` and `copies[1]` is
// its drop copy, so check 1 (`family map ×2 byte-identical`) and this check compare the same
// two files. M1 and M2 therefore prove a red is REACHABLE but not that it is THIS check's —
// check 1 would have reddened on the same mutation. M10 mutates the upstream of
// `sld_topology_schema_V1_0_0.md`, one of the THREE dropped files check 1 never looks at, and
// asserts the staleness check goes RED **while check 1 stays GREEN in the same run**. That
// pair of assertions is the whole proof that the addition earns its place in the count.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const LAB = process.env.SLD_LAB;
if (!LAB) {
  console.error('SLD_LAB is not set. Build a lab first, then run:\n' +
                '  cp -r "<repo>/." /root/sld_lab\n' +
                '  SLD_LAB=/root/sld_lab node 08_validation/mutants_drop_staleness.mjs');
  process.exit(2);
}

const DROP = '03_contracts/published_drop';

// Every file any arm touches, so PRISTINE covers all of it. HO-0022 §2.4 is the record of what
// a partial snapshot costs: the toolkit's other harness restored its sources but not its
// contract file and left the lab poisoned for the NEXT user, who read a real red as their own.
const FILES = {
  man:        `${DROP}/drop_manifest.json`,
  dropMap:    `${DROP}/revit_SLD_family_map_V1_0_0.json`,
  dropSchema: `${DROP}/sld_topology_schema_V1_0_0.md`,
  upMap:      '07_data/normalized/revit_SLD_family_map_V1_0_0.json',
  upSchema:   '03_contracts/sld_topology_schema_V1_0_0.md',
};
const abs = k => path.join(LAB, FILES[k]);
const absPath = p => path.join(LAB, p);

for (const k of Object.keys(FILES)) {
  if (!fs.existsSync(abs(k))) {
    console.error(`lab is missing ${FILES[k]} — is SLD_LAB really a copy of the SLD repo?`);
    process.exit(2);
  }
}
// Guard against the obvious catastrophe: someone pointing SLD_LAB at the live tree.
if (fs.realpathSync(LAB).startsWith('/sdcard/Mayo_Claude_Workspace')) {
  console.error('SLD_LAB points inside the real workspace. Refusing to mutate the live tree.');
  process.exit(2);
}

const PRISTINE = Object.fromEntries(Object.keys(FILES).map(k => [k, fs.readFileSync(abs(k), 'utf8')]));
// The pristine LISTING, not just the contents — M7 creates a file, and a restore that only
// rewrites known paths would leave it behind to poison every later arm.
const PRISTINE_DROP_LS = fs.readdirSync(absPath(DROP)).sort();

const restore = () => {
  for (const k of Object.keys(FILES)) fs.writeFileSync(abs(k), PRISTINE[k]);
  for (const f of fs.readdirSync(absPath(DROP))) {
    if (!PRISTINE_DROP_LS.includes(f)) fs.rmSync(path.join(absPath(DROP), f), { recursive: true, force: true });
  }
};

const readMan = () => JSON.parse(fs.readFileSync(abs('man'), 'utf8'));
const writeMan = o => fs.writeFileSync(abs('man'), JSON.stringify(o, null, 2));

// --quick is enough: this check is in phase 1 and phase 6 only adds the PNG sha compare.
function runGate() {
  let out = '';
  try {
    out = execFileSync('node', [path.join(LAB, '08_validation/sync_gate.mjs'), '--quick'],
                       { cwd: LAB, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 });
  } catch (e) { out = String((e.stdout || '') + (e.stderr || '')); }
  const pick = needle => {
    const line = out.split('\n').find(l => l.includes(needle) && /^\s+(ok|FAIL)\s/.test(l));
    if (!line) return { verdict: 'ABSENT', line: `(no result line matched "${needle}")` };
    return { verdict: /^\s+ok\s/.test(line) ? 'GREEN' : 'RED', line: line.trim() };
  };
  return {
    stale:  pick('publisher-side staleness'),
    check1: pick('family map ×2 byte-identical'),
  };
}

const MUTANTS = [
  { id: 'M0', want: 'GREEN', desc: 'control — the lab untouched', apply: () => {} },

  { id: 'M1', want: 'RED', desc: 'the DROP COPY was edited in place (drop != its own pin)',
    expect: /the published copy was edited in place/,
    apply: () => fs.writeFileSync(abs('dropMap'), PRISTINE.dropMap + ' ') },

  // The headline case, and the reason the check exists: upstream moves, the drop stays pinned
  // to yesterday's bytes, and the toolkit remains perfectly self-consistent with a stale
  // contract while nothing on its side can see it.
  { id: 'M2', want: 'RED', desc: 'UPSTREAM moved on; the drop still pins the old bytes',
    expect: /UPSTREAM HAS MOVED ON/,
    apply: () => fs.writeFileSync(abs('upMap'), PRISTINE.upMap + ' ') },

  { id: 'M3', want: 'RED', desc: 'a files entry with its sha256 deleted (an unpinned contract file)',
    expect: /no sha256 in the drop manifest/,
    apply: () => { const m = readMan(); delete m.files['hospital_golden_WITH_GEOMETRY.json'].sha256; writeMan(m); } },

  { id: 'M4', want: 'RED', desc: 'a files entry with its "source" deleted (nothing left to be fresh against)',
    expect: /no "source"/,
    apply: () => { const m = readMan(); delete m.files['hospital_golden_WITH_GEOMETRY.json'].source; writeMan(m); } },

  { id: 'M5', want: 'RED', desc: 'the drop copy deleted while the manifest still declares it',
    expect: /MISSING from/,
    apply: () => fs.rmSync(abs('dropSchema')) },

  { id: 'M6', want: 'RED', desc: '"source" points at a file that no longer exists',
    expect: /does not exist/,
    apply: () => { const m = readMan(); m.files['hospital_golden_WITH_GEOMETRY.json'].source = '03_contracts/gone_V9_9_9.md'; writeMan(m); } },

  // The other direction. The main loop iterates the MANIFEST, so a file added to the drop
  // without an entry is invisible to it; the toolkit would see it as a stray one repo too late.
  { id: 'M7', want: 'RED', desc: 'a stray unpinned file dropped into published_drop/',
    expect: /named by no drop_manifest entry/,
    apply: () => fs.writeFileSync(path.join(absPath(DROP), 'STRAY_V0_0_0.md'), 'unpinned\n') },

  // The manifest is parsed INSIDE the check on purpose (see its comment): a module-scope parse
  // would throw at load, outside check()'s try/catch, and kill the gate with ZERO check lines —
  // a log that reads as "crashed", not "went red". This arm is what proves that held.
  { id: 'M8', want: 'RED', desc: 'drop_manifest.json unparseable — must go RED, NOT crash the gate',
    expect: /is not valid JSON/,
    apply: () => fs.writeFileSync(abs('man'), PRISTINE.man.replace('{', '{ "oops": ,')) },

  { id: 'M9', want: 'RED', desc: 'an empty files block — a seam that stopped carrying anything',
    expect: /declares no files/,
    apply: () => { const m = readMan(); m.files = {}; writeMan(m); } },

  // 🚩 See the header. This is the arm that proves the check is not a duplicate of check 1.
  { id: 'M10', want: 'RED', desc: 'ISOLATION — upstream of a file check 1 NEVER sees moved on',
    expect: /sld_topology_schema_V1_0_0\.md: UPSTREAM HAS MOVED ON/,
    alsoGreen: 'check1',
    apply: () => fs.writeFileSync(abs('upSchema'), PRISTINE.upSchema + ' ') },
];

let ok = 0, bad = 0;
const report = [];

for (const m of MUTANTS) {
  restore();                       // before, so no arm can inherit the previous one's damage
  m.apply();

  // 🚩 DID THE MUTANT ACTUALLY MUTATE? A mutant that mutates nothing scores IDENTICALLY to a
  // check that never fires, and the two need opposite fixes. The toolkit's .addin harness
  // bought this guard on its first run with a `replace()` that was a silent no-op.
  const dirty = Object.keys(FILES).some(k => !fs.existsSync(abs(k)) || fs.readFileSync(abs(k), 'utf8') !== PRISTINE[k]);
  const strays = fs.readdirSync(absPath(DROP)).filter(f => !PRISTINE_DROP_LS.includes(f));
  const didMutate = dirty || strays.length > 0;

  if (m.id !== 'M0' && !didMutate) {
    bad++;
    report.push(`  FAIL  ${m.id} MUTATED NOTHING — apply() left the lab byte-identical to pristine, so this arm tested an unmodified tree and whatever it reported is meaningless. Fix the mutant, not the check.`);
    continue;
  }
  if (m.id === 'M0' && didMutate) {
    bad++;
    report.push('  FAIL  M0 the control arm modified the lab — a control that mutates is not a control');
    continue;
  }

  const r = runGate();
  const { verdict, line } = r.stale;
  let good = verdict === m.want;
  let why = '';
  if (good && m.want === 'RED' && m.expect && !m.expect.test(line)) {
    good = false;
    why = ` — went red, but the message does not match ${m.expect}. A mutant that fires the WRONG assertion proves the wrong thing`;
  }
  if (good && m.alsoGreen && r[m.alsoGreen].verdict !== 'GREEN') {
    good = false;
    why = ` — the staleness check fired correctly, but ${m.alsoGreen} did NOT stay green (${r[m.alsoGreen].verdict}), so this arm does not isolate the two:\n        ${r[m.alsoGreen].line}`;
  }
  if (good) {
    const extra = m.alsoGreen ? ` [+ check 1 stayed GREEN — the checks are independent]` : '';
    ok++; report.push(`  ok    ${m.id.padEnd(3)} ${verdict.padEnd(5)} ${m.desc}${extra}`);
  } else {
    bad++; report.push(`  FAIL  ${m.id} expected ${m.want}, got ${verdict}${why}\n        ${line}`);
  }
}

// AND PUT THE LAB BACK — then PROVE it, by re-running the control. An unproven restore is how
// HO-0022 §2.4 handed the next session a false red it spent real time on.
restore();
const after = runGate();
if (after.stale.verdict === 'GREEN' && after.check1.verdict === 'GREEN') {
  ok++; report.push("  ok    M0' GREEN control re-run AFTER restore — the lab is clean for the next user");
} else {
  bad++; report.push(`  FAIL  M0' the lab is still dirty after restore(): ${after.stale.line} | ${after.check1.line}`);
}

console.log('----- [P1] publisher-side staleness mutant harness -----');
for (const r of report) console.log(r);
console.log('');
console.log(`MUTANTS: ${ok} correct, ${bad} wrong, of ${ok + bad}.`);
if (bad) { console.log('MUTANT HARNESS FAILED — the staleness check is not proving what it claims to.'); process.exit(1); }
console.log('MUTANT HARNESS GREEN — control holds, ten wrong states go red naming the right assertion, and the isolation arm shows the check fires on files check 1 cannot see.');
