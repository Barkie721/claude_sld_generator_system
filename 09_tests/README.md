# 09_tests — the golden oracle, and every project exercised against the pipeline

> **Canonical:** this file owns the standard `09_tests/<Project>/` folder structure. `CLAUDE.md` §9,
> `00_Docs/architecture_reference_V1_0_0.md` §4.8, `00_Docs/repo_runbook_V1_0_0.md` and `06_deliverables/README.md` all
> summarize it and point here.

Two different things live in this folder and they follow different rules.

| Folder | What it is | Structure |
|---|---|---|
| `Hospital Example (Golden Case)/` | the **frozen oracle** — the regression target for `04_renderer/` | flat, frozen |
| `_PROJECT_TEMPLATE/` | **copy this** | the 7-folder standard |
| `01_Default 2500 kVA Service/` | a **run of the canonical default** — source lives in `01_inputs/defaults/`, this folder is disposable | the 7-folder standard |
| `02_Sprouts Office Building - 2000A/` | a working project — 2000 A office building | the 7-folder standard |
| `03_Clinic AI Test - 3000A/` | a working project — 3000 A one-storey NEC 517 clinic, 1000 kW generator, LS/C/EQ ATSs on an EM sheet; the only non-golden emergency-sheet exercise | the 7-folder standard |
| `04_Clinic AI Test - 3000A - One Sheet/` | the same clinic with NP (left) + EM (right) on one sheet, ATS normal feeds drawn whole — needs engine 1.0.19 (OFF-032); see its REVISIONS R-002 | the 7-folder standard |
| `05_LCC Hotel - 1200A 208V/` | a working project — 1200 A, 120/208 V hotel switchgear composed from a red-lined snippet; first user of engine 1.0.20–1.0.22 (transformer-fed main, `a2_callout_feeders`) | the 7-folder standard |
| every new project | `cp -r _PROJECT_TEMPLATE "<NN>_<New Project>"` — take the next number | the 7-folder standard |

### ⚠️ The canonical DEFAULT single line lives in `01_inputs/defaults/`, not here

**"Run the default" means `01_inputs/defaults/`.** That folder holds the two authored files — the
default narrative and its build script — and its README is the source of truth for what the default
composition is. `09_tests/01_Default 2500 kVA Service/` is just *a run of it* and is safe to delete;
recreate it any time with:

```bash
cp -r "09_tests/_PROJECT_TEMPLATE" "09_tests/01_Default 2500 kVA Service"
cp 01_inputs/defaults/default2500_*  "09_tests/01_Default 2500 kVA Service/1_source/"
cd "09_tests/01_Default 2500 kVA Service" && bash run_pipeline.sh
```

Verified 2026-07-28: a clean scaffold from those two files reproduces the topology, the layout config
**and the merged geometry byte-for-byte**. 16 stages green on engine 1.0.14 — 63 rules, 0 errors,
audit all-zero, every geometry checker 0.

⚠️ It is a **single-sheet, no-emergency, depth-2-cascade** composition (3 storeys, two plumb riser
columns). A green run here does **not** exercise the multi-sheet or emergency-sheet `layout_config`
paths; `01_inputs/defaults/README.md` describes the composition, and so what a green run of it
cannot prove.

⚠️ **`01_inputs/defaults/` is a REFERENCE COMPOSITION, not a set of Tier-2 intake defaults.** The
intake defaults are unchanged in `00_Docs/project_instructions_V1_0_0.md` §2.3 (single-level
basement, no level lines unless floors are stated, one distribution section with two breakers). Do
not let the reference composition's 3 storeys and two risers leak into what the compositor assumes
when a narrative is silent.

⚠️ **The golden case is a FROZEN ORACLE.** Four repo tools reach into it by flat path
(`run_all_gates.sh`'s `GOLD=` variable, `08_validation/sync_gate.mjs:27`,
`08_validation/check_acceptance_V1_0_0.mjs:53,62`, `04_renderer/check_titleblock_derivation.mjs:34`).
When a drawing diverges from it you fix `04_renderer/`, never the oracle —
`project_instructions_V1_0_0.md` §9.5.

**New projects under `09_tests/<Project>/` are NOT frozen.** They are working folders: iterate freely,
delete `2_build/` whenever you like.

⚠️ **DELETED 2026-07-28 (Mayo's call): ALL FOUR exercise cases** — `3-Story Clinic - 1000 kVA/`,
`5-Story Hospital - 2500 kVA/`, `9-Story Hospital - 2x2000 kVA/` and `Default 2500 kVA Service/`.
All four were flat, predating this standard. **Nothing executable depended on any of them** — every
repo tool that reaches into `09_tests/` reaches only into the golden case (the four paths listed
above). Their eight geometry checkers all survive here in `_PROJECT_TEMPLATE/4_checks/`, in
generalized form that supersedes the copies that were deleted.
✅ **`Default 2500 kVA Service` was REBUILT later the same day and then PROMOTED.** Its authored
source now lives permanently in **`01_inputs/defaults/`** and is no longer at risk from a `09_tests/`
cleanup — that promotion exists precisely because the first deletion destroyed the only copy. The
folder under `09_tests/` is now just a run of it. Its embedded-`layout_config` pattern (embed so
validator rule **CV-14**'s capability gate can see `subfeed_start_ports`; sidecar keys still win at
layout time) is additionally documented in
`01_inputs/templates/narrative_template_V1_0_0.md`, `02_specs/drafting/sld_topology_rules_V1_0_0.md`,
and `08_validation/lib/context_V1_0_0.mjs`.
⚠️ The rebuilt default is **not** the minimal Tier-2 shape the original demonstrated — it carries 3
storeys and two riser cascades by explicit request. **A worked example of a truly minimal one-line
narrative no longer exists on disk.**
**Their derivation docs went with them** — `REDESIGN_hosp9.md`, `PHASE1`–`PHASE7`, `HANDOFF_hosp9.md`,
`HANDOFF_clinic3.md`, `HANDOFF_review_pass_1.md` — which is the evidence base behind engine revs
**1.0.8 → 1.0.14** (OFF-013 … OFF-030). Every one of those derivations is restated inline in
`03_contracts/current_state_manifest.json`'s `engine.note`, which is where to read them now. Several
entries in `10_failure_log/` and `11_future_updates/` still cite the deleted paths as evidence; they
carry an archive note pointing here.
**Sole surviving copy:** `/storage/emulated/0/Download/sld_snapshot_pre-delete-09tests_2026-07-28.tgz`
(62 MB, full repo, 614 entries, verified before the delete), last recorded on the owner's Android
device and not on this machine (checked 2026-10-04). **Git holds no copy:** the deletion predates the
first commit (`46cc2ab`, 2026-08-11, of the former SLD repository, whose history is kept only in
`_Mayo_Claude_Workspace/_git-backups-2026-10-06/claude_sld_generator_system.git`). That tarball is the
only way back.

---

## 1. Start a new project

```bash
cd "$REPO/09_tests"
cp -r _PROJECT_TEMPLATE "<New Project>"
cd "<New Project>"
# put the filled narrative and its build script in 1_source/, then:
bash run_pipeline.sh          # phone storage is noexec — bash, never ./
```

The narrative comes from `01_inputs/templates/narrative_template_V1_0_0.md`. The only mandatory
input is **service kVA**; everything else has a Tier-2 default.

**Nothing in the copy needs rewiring.** `4_checks/check_lib.mjs` is the only file in the template that
knows a path, and it derives every one from the project root plus the topology's own `metadata.slug`.
`run_pipeline.sh` takes the slug from the build script's filename. There is no find-and-replace step.

---

## 2. The structure

```
09_tests/<Project>/
├── README.md          what this is · how to run · file inventory · registers touched · graduation
├── ACCEPTANCE.md      criterion | target | current | MEASURED BY
├── OPEN_ITEMS.md      GENERATED from metadata.compositor_halts[] — do not hand-edit
├── run_pipeline.sh
│
├── 1_source/          THE ONLY HAND-EDITED FILES
│   ├── <p>_SLD_narrative_V1_0_0.md
│   └── <p>_build_topology.mjs            (LAYOUT_CONFIG lives inside this)
│
├── 2_build/           100% regenerable · safe to delete · never hand-edit
│   ├── <p>_SLD_topology_V1_0_0.json
│   ├── <p>_layout_config.json
│   ├── <p>_geom_block.json
│   ├── <p>_SLD_topology_V1_0_0__WITH_GEOMETRY.json
│   ├── <p>_sld_viewer_V1_0_0.html
│   └── run.log                           (every stage, unfiltered — stage 14 parses this)
│
├── 3_output/          what you look at / hand to someone
│   ├── sheets/        per sheet × theme + manifest.json + audit.json
│   ├── pages/         composed Arch E1 (--page)
│   ├── zoom/          investigation crops (--region / --element)
│   └── RESULTS.json   appended per run
│
├── 4_checks/          check_lib.mjs + 7 checkers + probe_region.mjs + 2 generators + pipeline_steps.mjs
├── 5_docs/            HANDOFF_<p>.md + phase docs
├── 6_revit/           add-in run report + placement CSV
└── 7_revisions/
    └── REVISIONS.md   every change requested after generation
```

**The organizing axis is "can I delete this and regenerate it?"** That is the question you are
actually asking when you look at a loose file and wonder what it is for, and it sorts every artifact
cleanly. `<p>` is the project slug — the topology's `metadata.slug`, which is what actually names the
rendered SVGs (`snapshot_html.mjs:212`).

Numbered prefixes match the repo root's own idiom (`00_Docs` → `11_future_updates`) and follow
pipeline order: `1_source` → `2_build` → `3_output` is stages 1–7.

⚠️ **`<p>_layout_config.json` is GENERATED, not authored.** The build script writes it from a
`LAYOUT_CONFIG` literal inside itself — hand-edits are clobbered on the next run. It writes it
**twice**, sidecar *and* embedded in the topology, and **the embedded copy is what makes 63 rules run
instead of 55** (CV-14's capability gate reads only the embedded one). Both live in `2_build/` and
move together.

---

## 3. The pipeline

`bash run_pipeline.sh` runs 17 stages — 14 numbered plus 2b, 7b and 12b: build → validate (P1+P2) → **2b OPEN_ITEMS** → layout →
**merge** → validate (P3) → viewer → snapshots+audit → **7b composed pages** → seven geometry checks
→ **14 RESULTS.json**.

⚠️ **The merge step is not optional.** `run_layout.mjs --out` writes the BARE geometry block, not a
merged topology, despite the `__WITH_GEOMETRY` name that Phase 3 expects. Without the merge the
second validate silently re-runs Phase 1+2 and every SH geometry rule stays skipped — **55 rules, not
63.** That count is the canary; `RESULTS.json` records it every run.

⚠️ **`--out` is mandatory on every `snapshot_html.mjs` call.** `snapshot_html.mjs:215` defaults it to
a **sibling of the HTML**, which is now `2_build/`. An omitted `--out` writes `2_build/snapshots/`,
the checkers find nothing, and every one of them reports **0 findings across 0 sheets** —
indistinguishable from a clean run on screen. Stage 7 asserts `2 × sheet_count` SVGs in
`3_output/sheets/` and aborts loudly if they are not there; `check_lib.mjs` throws on any missing
snapshot rather than skipping it.

⚠️ **Do NOT run `../../run_all_gates.sh` for a project.** That suite is engine regression against the
hospital golden. A project touches no engine code, so it cannot move those gates. **The pipeline is
the check.** Run the suite only when you changed the engine, the viewer, the family map, or a
duplicated artifact.

Stages 8–13 are **reporting, not gating** — they print and exit 0 deliberately. `set -e` is on, so a
non-zero exit would abort the run and hide every later stage. Read the counts, not the exit status.

---

## 4. The checkers

⚠️ **A clean checker run is not a clean drawing.** Every one of these exists because something passed
63 rules and 0 errors while being visibly wrong.

| Stage | Tool | Sees what nothing else does |
|---|---|---|
| 8 | `check_feeder_overlaps.mjs` | collinear feeder-on-feeder overlap · exits outside the parent box |
| 9 | `trace_feeders.mjs` | feeder × feeder right-angle crossings |
| 10 | `check_symbol_clash.mjs` | feeder through its own symbol · tag on symbol · feeder through A-8 text |
| 11 | `check_tag_feeder_clash.mjs` | tag pill sitting on a feeder run (HARD/TIGHT) |
| 12 | `check_level_bands.mjs` | devices in the wrong band · level line through a panel |
| 12b | `check_tick_detach.mjs` | A-1 tick left floating after its pill moved across the run (**FL-0008**) |
| 13 | `check_page_scale.mjs` | the REAL composed scale — the pipeline's own `s_pred` is clamped at 1 |
| — | `probe_region.mjs` | what is already occupying a region you want to move a tag into |
| 2b | `make_open_items.mjs` | generates `OPEN_ITEMS.md` from `metadata.compositor_halts[]` |
| 14 | `make_results.mjs` | appends one run to `3_output/RESULTS.json` |
| 4, 6, 7 | `pipeline_steps.mjs` | merge geometry · rebuild the viewer · count sheets. These were inline `python3 -c` until 2026-10-04 (**FL-0027**); the output is byte-identical to Python's `json.dump` |

**The Windows PC is the build machine from 2026-10-04 (owner's decision).** Tracked `2_build/` and `3_output/` are PC runs from then on; the phone runs before that stay in the former SLD repository's history, kept only in `_Mayo_Claude_Workspace/_git-backups-2026-10-06/claude_sld_generator_system.git` (the workspace repository started without it on 2026-10-06). On the PC, `SLD_RASTER=resvg` is set as a user environment variable, so plain `bash run_pipeline.sh` from Git Bash works. `snapshot_html.mjs` then rasterizes with the pinned resvg 0.47.0 at `%USERPROFILE%\tools\resvg\0.47.0\`, because there is no `rsvg-convert` on the PC. A missing engine stops the run. The SVGs are byte-identical to a phone run; the PNGs are visually equal but never sha-equal, because the fonts differ.

`check_lib.mjs` is the shared box/text/sheet model. Every box, every sheet list and every text extent
comes from there — the two bugs that made a false-clean report were both copy-paste divergence
between scripts, and they come back the moment a checker is written by copying another one.

### The `RESULT` contract

Every checker's last line is `RESULT <scope> key=value key=value …`. Stage 14 parses those into
`3_output/RESULTS.json`. `<scope>` namespaces the keys because two checkers legitimately own a metric
named `out_of_band` — level-band **membership** in stage 12, composed-scale **band** in stage 13 — and
a flat merge would silently overwrite one with the other.

⚠️ The validator's own summary is `RESULT:` **with a colon** and no scope, a different format that
predates this one. `^RESULT ` never matches it.

⚠️ A `sed`/`tail` filter on a checker's stdout truncates before its `RESULT` line. That is why
`run_pipeline.sh` tees the **unfiltered** stream to `2_build/run.log` and filters only what reaches
the screen.

---

## 5. `7_revisions/` feeds `10_failure_log/` — it does not replace it

```
7_revisions/REVISIONS.md      per project · raw · cheap · EVERY request, including vague ones
        │
        │  repeats across projects, or traces to engine behavior
        ▼
10_failure_log/ FL-XXXX       repo-global · defect + NAMED GUARD
        │
        │  fix is big enough to schedule
        ▼
11_future_updates/ FU-XXXX    prioritized P0–P3 with Effort + Readiness
```

`10_failure_log/` is **cumulative across all projects** and every `fixed` entry must name the guard
that makes recurrence loud. A per-project log structurally cannot hold a repo-global guarantee — and
if FL moved into project folders, every new project would start with an empty failure log and
re-learn what the last three taught. That cumulative property is the entire value.

Most revision entries are **project-local tuning** and should die with the project — that is correct,
not a loss. A few are the engine being wrong. Without the log you cannot tell which, because you only
ever see one project at a time: OFF-021, OFF-028 and OFF-029 were three faces of one engine bug,
found separately across four phases and re-derived each time.

---

## Naming

Project folders take a human-readable name (`9-Story Hospital - 2x2000 kVA/`). Files inside take the
slug prefix `<p>`. **Per-project instance docs do not version** — `README.md`, `ACCEPTANCE.md`,
`OPEN_ITEMS.md`, `REVISIONS.md`, `RESULTS.json`, `HANDOFF_<p>.md`, `PHASE*.md` — because they are
immutable records superseded by a new one, never re-versioned. Only the shared copy-me template
carries `_V1_0_0`.
