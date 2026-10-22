# FU-0009 — Standardize `09_tests/<Project>/` so a project folder records project STATE, not just artifacts

> ⚠️ **EVIDENCE ARCHIVED 2026-07-28.** This entry cites paths under `09_tests/` that no longer
> exist: **all four** flat exercise cases — `3-Story Clinic - 1000 kVA`, `5-Story Hospital - 2500 kVA`,
> `9-Story Hospital - 2x2000 kVA` and `Default 2500 kVA Service` — discussed here as migration
> candidates, were deleted on 2026-07-28 at Mayo's instruction.
> The finding itself is unaffected — this entry is `shipped` and the standard it defines is landed in `09_tests/_PROJECT_TEMPLATE/`.
> The migration analysis in §§81/179 ("`3-Story Clinic` has no `check_lib.mjs`", "migration is
> per-project surgery") is now **moot** — there is nothing left to migrate, and the first folder
> scaffolded from the template will be the standard's first real user.
> To re-read the evidence, restore from the pre-delete repo tarball (the only copy; there is no
> git): `/storage/emulated/0/Download/sld_snapshot_pre-delete-09tests_2026-07-28.tgz`.
> Context and what the delete cost: `09_tests/README.md`.

| Field | Value |
|-------|-------|
| **ID** | FU-0009 |
| **Title** | A `cp -r`-able project template with seven numbered subfolders on the regenerable/authored axis, plus the four per-project records the repo already asks for and nothing produced |
| **Proposed** | 2026-07-28 |
| **Proposed by** | `Mayo` |
| **Status** | `shipped` |
| **Priority** | `P2` |
| **Effort** | `M` |
| **Readiness** | `ready` |
| **Category** | `process` |
| **Stage** | `process` |
| **Component** | `09_tests/_PROJECT_TEMPLATE/` + `09_tests/README.md` (new) |
| **Decision tier** | `Tier 1 autonomous` |
| **Golden impact** | `golden-inert` |
| **Schema impact** | `none` |
| **Version bumps** | `none` — `01_inputs/templates/narrative_template_V1_0_0.md` took an in-place path correction rather than a `_V1_0_1` bump (Mayo, 2026-07-28); no downstream reference moved |
| **Gates affected** | `none` |
| **Depends on** | — |
| **Blocks** | — |
| **Target** | `next batch` |

---

## 1. Problem

Generating a single-line left ~20 loose files in `09_tests/<Project>/` with no way to tell, by
looking, which were authored, which were regenerable, and which were output. That is the surface
complaint. The deeper one was that the folder captured only **artifacts** — nothing in it recorded
project **state**.

Four concrete costs, all measured on real projects:

- **Tier-3 EOR halts were invisible.** The 9-storey hospital carries **6 unresolved halts** in
  `metadata.compositor_halts[]` while the validator exits clean at 63 rules / 0 errors. H-4 alone
  reads *"GEN-1 carries no kW/kVA and no X″d. Consequently SHEET S3 CARRIES NO A-4 TAGS AT ALL"* — an
  entire sheet missing its fault-current annotation on a drawing that looks finished. Per
  `06_deliverables/README.md`, unresolved Tier-3 halts mean `unreviewed` **by definition**, so this
  was the thing actually blocking delivery, and nothing surfaced it.
- **Acceptance criteria had no guard.** The row *"A-1 tick off its own feeder 27→0"* rode from
  Phase 1 to Phase 7 with **nothing measuring it**; it was eyeballed once and the true count was
  **31**. That is [FL-0008](../10_failure_log/FL-0008_tag-feeder-clash-blind-to-detached-own-tick.md).
  The repo already solved this one level up — `10_failure_log/` requires every `fixed` entry to name
  the gate that makes it loud on recurrence — but projects had no equivalent.
- **Run numbers evaporated.** Thirteen stages printed counts to scrollback and kept none, which is
  why every phase document had to re-baseline the next one.
- **Change requests were never logged.** OFF-021, OFF-028 and OFF-029 are, per that project's own
  notes, *"THREE engine bugs, one shape."* They were found in Phases 2, 3 and 5 — separately, each
  re-derived from scratch. The second instance pattern-matches the first only if the first was
  written down somewhere mineable.

`06_deliverables/` has existed for three projects and holds only its README. Nothing has ever
graduated, and assembling a delivery packet at the end was part of the reason.

## 2. Proposed change

`09_tests/_PROJECT_TEMPLATE/`, copied with `cp -r` to start any new project. Seven numbered
subfolders on **one axis — "can I delete this and regenerate it?"**: `1_source/` authored,
`2_build/` disposable, `3_output/` what you look at, then `4_checks/` `5_docs/` `6_revit/`
`7_revisions/`. Numbered prefixes match the repo root's own idiom and follow pipeline order.

Four per-project records the repo asked for and nothing produced: **`README.md`**,
**`ACCEPTANCE.md`** (every criterion names the tool that proves it), **`OPEN_ITEMS.md`** (generated
from `metadata.compositor_halts[]`), **`7_revisions/REVISIONS.md`**, plus **`3_output/RESULTS.json`**
appended per run.

The eight checkers move into `4_checks/` and gain a uniform `RESULT <scope> k=v …` final line so a
run's numbers land in a diffable file. `run_pipeline.sh` gains stage **2b** (OPEN_ITEMS), **7b**
(composed pages), **14** (RESULTS.json), and a post-stage-7 assert.

## 3. Scope

**In:** the template; rewiring `check_lib.mjs` and `run_pipeline.sh`; `RESULT` lines in all seven
checkers (three needed real code); the five document templates; a new `09_tests/README.md` as the
canonical home; pointer edits in six existing docs.

**Out (non-goals):**
- **Migrating any existing project.** The golden case and all four exercise cases stay flat and
  untouched. `3-Story Clinic` would need heavier treatment anyway — it has no `check_lib.mjs`, and
  its three checkers each carry their own inline path literals.
- Touching `04_renderer/`, the schema, or any gate. This is a folder-shape and documentation change.
- Fixing the two silent-failure modes *at their source*. `snapshot_html.mjs`'s `--out` default and
  `check_lib.mjs`'s swallowed ENOENT are **hardened in the template**, not changed in the renderer —
  changing the renderer's default would move the golden.

## 4. Acceptance criteria

Written before work started, as §10.2 of the implementation handoff. All verified 2026-07-28 against
a `Scaffold Smoke Test` copy pointed at the 9-storey hospital's source, then deleted.

- [x] Stage 5 reports **63 rules** — 55 would mean the embedded `layout_config` was lost in the move
- [x] `3_output/sheets/` holds **2 × sheet_count** SVGs — 10 for 5 sheets — and **not**
      `2_build/snapshots/`
- [x] Every checker reports a **nonzero sheets-scanned count** — 5 sheets, 126 ticks, 145 feeders;
      0 sheets reads as a pass and must be impossible
- [x] `3_output/pages/` gets `__page` files from stage 7b — 5 SVG + 5 PNG
- [x] `OPEN_ITEMS.md` regenerates, and renders H-6's **null** `nec_reference` without crashing —
      6 halts, 8 notes, 2 placeholders, `nec_reference` rendered as `—` with an explanatory line
- [x] `3_output/RESULTS.json` is written with every `RESULT` key populated — 21 check keys plus
      `page_scale`, `audit`, `render`, `open_items`
- [x] Deliberately break the `layout_config` path → the new assert **fails loudly**. Also proved for
      a missing snapshot, a missing merged topology, and the stage-7 SVG-count assert
- [x] `sync_gate.mjs --quick` and `run_all_gates.sh` unchanged — see §6
- [x] The golden case and all four existing project folders **byte-for-byte identical**, proved by
      sha256 of every file in `09_tests/` before and after

## 5. Blast radius

**Nothing in the repo globs, walks, or inventories `09_tests/`.** Every code reference is a literal
golden path: `run_all_gates.sh:29`, `sync_gate.mjs:27`, `check_acceptance_V1_0_0.mjs:53,62`,
`check_titleblock_derivation.mjs:34`, `strip_compare.mjs:61-64`, `current_state_manifest.json:25`,
`hospital_titleblock_data_V1_0_0.json:4`. Adding files and folders under a *different* project name
is therefore invisible to all 12 gates and all 16 sync-gate checks. **No re-blessing of any kind.**

G5/G6/G9 verify with `sha256sum -c` against explicit lists, so extra files are never flagged, and
nothing enforces a required file inventory inside a project folder.

`current_state_manifest.json` holds no doc hashes, so no key needed updating after a doc edit. Root
`README.md`, `00_Docs/repo_runbook_V1_0_0.md` and `00_Docs/project_instructions_V1_0_0.md` appear in
**zero scripts, zero manifests, zero baselines**.

⚠️ **The one tripwire.** In `sync_gate.mjs`, the check that prints as **`[P5] CLAUDE.md
"sld_engine.mjs rev **X**" == manifest rev`** — regexes `CLAUDE.md` for
`` `sld_engine.mjs` rev **X** `` and `.match()` is **non-global** — it takes the FIRST occurrence.
The anchor lives at `CLAUDE.md:97`, inside a table cell; backticks and the `**` are load-bearing. Two
ways to break it: reword or delete that line, **or** introduce any *earlier* mention of the pattern
carrying a different rev. Never add a changelog or history section above line 97 that names an engine
rev. Verified post-change: still line 97, still the only match, still `1.0.14`, agrees with the
manifest.

## 6. Verification plan

**Before:** `sha256sum` every file under `09_tests/` (194 files) — there is no git
([FU-0002](FU-0002_repo-under-git.md)), so this is the only proof the frozen folders were not
touched.

**After:**

| Check | Result |
|---|---|
| `sha256sum` diff of the 194 baseline files | **identical** — golden + 4 projects unchanged |
| `node 08_validation/sync_gate.mjs --quick` | **14/14 green** (a `--quick` run is 14, not 16 — it skips the two PNG-baseline checks) |
| `bash run_all_gates.sh` | **12/12** |
| `cd "Scaffold Smoke Test" && bash run_pipeline.sh` | all eight §4 asserts, twice — once incremental, once from a deleted `2_build/`+`3_output/` |

⚠️ The first suite run after any rev bump can report SUITE RED spuriously — that is
[FL-0006](../10_failure_log/FL-0006_sync-gate-p4-reads-a-later-gates-output.md), sync-gate P4 reading
an artifact G6 regenerates later in the same run. No rev was bumped here, so it should not fire; if
it does, re-run once with nothing edited.

No baseline is expected to move, so there is no re-bless recipe. **A moved baseline would be the
failure**, not the outcome.

## 7. Risks / open questions

**The risk this change created, and how it is closed.** `snapshot_html.mjs:215` defaults `--out` to a
*sibling of the HTML*. Once the viewer moved into `2_build/`, any invocation omitting `--out` writes
`2_build/snapshots/` — where nothing looks. `check_lib.mjs` then `continue`d past every missing file
and all seven geometry checkers reported **0 findings across 0 sheets**, which on screen is
indistinguishable from a clean run. This was the highest-risk item in the whole change-set.

Closed three ways: `--out` is mandatory and documented as such in every recipe; stage 7 asserts
`2 × sheet_count` SVGs and exits 1 with a `FALSE CLEAN` message; and `loadSVGs()` now **throws** on a
missing snapshot instead of skipping it. Proved by deliberately removing files.

Same class, second instance: `check_lib.mjs:46` wrapped the `layout_config` read in
`try { … } catch { /* embedded copy stands */ }`. A wrong path threw ENOENT, got swallowed, and the
checkers silently scored against the embedded copy — making a sidecar-only edit invisible. The
sidecar is now authoritative and its absence is fatal.

**Open:** whether the four existing flat projects are ever migrated. Currently **never**, unless
Mayo asks.

## 8. Alternatives considered

- **Migrate everything now.** Rejected: the golden is a frozen oracle reached by literal path from
  four tools, and `3-Story Clinic` has no `check_lib.mjs` at all, so migration is per-project surgery
  with no gate to catch a mistake. New projects only costs nothing and compounds.
- **A per-project failure log instead of `7_revisions/`.** Rejected: `10_failure_log/` is cumulative
  across all projects and every `fixed` entry names a repo-global guard. A per-project log
  structurally cannot hold a repo-global guarantee, and if FL moved into project folders every new
  project would start empty and re-learn what the last three taught. `7_revisions/` **feeds** FL; it
  does not replace it.
- **Keep `<p>` placeholders in the template and find-and-replace on copy.** Rejected: five filenames
  and ten path literals to edit by hand, with a silent-pass failure mode if one is missed.
  `check_lib.mjs` derives everything from the project root plus the topology's own `metadata.slug`,
  and `run_pipeline.sh` takes the slug from the build script's filename — so the copy needs **no**
  edit and the two cannot drift.
- **Sort by artifact type** (`json/`, `svg/`, `md/`). Rejected: it answers "what format is this?",
  which nobody asks. "Can I regenerate it?" is the question you actually have when you look at a
  loose file, and it sorts every artifact cleanly.

## 9. Links

- Related updates: [FU-0002](FU-0002_repo-under-git.md) — no git means the sha baseline in §6 is the
  only rollback proof this change had.
- Related failures:
  [FL-0008](../10_failure_log/FL-0008_tag-feeder-clash-blind-to-detached-own-tick.md) — the
  unmeasured acceptance row that motivated `ACCEPTANCE.md`'s `measured by` column; its guard
  (`check_tick_detach.mjs`) now ships in the template.
  [FL-0006](../10_failure_log/FL-0006_sync-gate-p4-reads-a-later-gates-output.md) — the false-red to
  expect on a first suite run.
  [FL-0007](../10_failure_log/FL-0007_marked-extent-pennant-phantom-radius.md) — why
  `check_page_scale.mjs` carries a phantom-viewBox warning.
- Specs / contracts touched: none. `09_tests/README.md` is new and canonical for the standard;
  `CLAUDE.md` §3/§9, root `README.md` §3/§4.3/§4.8, `repo_runbook_V1_0_0.md`,
  `project_instructions_V1_0_0.md` §1.1/§7.1/§7.3, `06_deliverables/README.md` and
  `narrative_template_V1_0_0.md` carry pointers to it.
- Session: 2026-07-28.
