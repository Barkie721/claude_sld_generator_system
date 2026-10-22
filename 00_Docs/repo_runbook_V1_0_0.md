# SLD Generator — Repo Runbook V1.0.0 (start to finish)

> **What this file is.** The single self-contained operating manual for *running and maintaining* this
> repo. Written so a newcomer — or a future Claude session, subagent, or git worktree that lost its
> context — can run the whole thing end to end **without** re-reading the two large `CLAUDE.md` files.
> Read this first. Everything below is copy-pasteable.
>
> **Scope — read the right doc.** This runbook owns *repo operations* (paths, gates, recovery, state).
> It does **not** own *composer behavior*: how the AI composes a topology, the Tier 1/2/3 decision
> authority, the non-negotiable NEC elements, tone and output modes are owned by
> [`project_instructions_V1_0_0.md`](./project_instructions_V1_0_0.md). Where the two touch, this file
> points there rather than restating.
>
> Written 2026-07-25. If a sha, gate count, or "current task" here disagrees with the machine-truth
> manifest (§1), **the manifest wins** — this doc is prose, the manifest is truth.

---

## 0. The 60-second version

- The repo turns a **prose electrical narrative** ("2500 kVA 480Y/277V hospital with a 2000 kW
  generator") into an **NEC-compliant Single-Line Diagram** — as a JSON topology, then geometry,
  then an SVG drawing, and finally BIM content placed in **Revit 2025**.
- **The backbone is one thing: the JSON topology contract.** AI writes it, a validator enforces it,
  a layout engine adds a `geometry{}` block, and both the SVG renderer and the Revit add-in consume
  it. Never break that contract.
- **The hospital "golden case" is a FROZEN ORACLE.** When a drawing looks wrong, you fix the *engine*
  and re-gate. You do **not** edit the golden viewer to make a divergence disappear.
- **One source of machine truth:** `03_contracts/current_state_manifest.json`. Live sha256 hashes,
  known issues, rollback status. Read it before trusting any number.
- **Status today:** V1_0_0 baseline, **13 gates** (⚠️ **gate 13, the C# build gate, was DELETED
  2026-07-31 with its subject — this suite compiles nothing**; gate 14 kept its number and is the
  sync-gate check-NAME baseline, both new 2026-07-30) + sync **14/14** (was 24/24 until Phase 7b
  deleted eleven checks and added one) — **and the 112 add-in tests are asserted in the TOOLKIT
  repo now, not here**; all green on both sides. The DLL is rebuilt and in map lockstep (§1a).
  ⚠️ **THE SHIPPING BUILD IS NO LONGER RUNTIME-VERIFIED.** This line used to say the add-in "has
  been runtime-verified on Revit 2025 (2026-07-25)". That was true of build `9f16a1e7`. Separation
  Phases 5a–5c replaced it with `d521ad30` plus a new satellite `43805105`; the FL-0018 load-context fix then re-blessed both on 2026-07-31 to **`be6ae51a`** + **`2e86b97d`**, and **neither
  has ever been loaded by Revit** — see `current_state_manifest.json` → `artifacts.addin_dll.
  runtime_unverified`. ⚠️ **The check that used to assert this against the add-in `CLAUDE.md` prose
  is gone from THIS repo** — Phase 7b deleted it with the add-in, and the surviving cross-check is
  the **toolkit repo's** `[T7]`. **A green suite here proves neither.**
  🚩 **A green run here compiles NOTHING and runs NO add-in test** — it is **13/13**, not 14/14, and
  it says nothing about the ribbon, the panes, or family placement. (This sentence read *"A green
  **14/14** proves the sources compile and 112 tests pass"* until 2026-08-03 — audit **A9**, swept by
  **FU-0014**. It was wrong twice over: wrong count, and the compile it claimed left with gate 13.)
  The 112 tests are asserted by `bash 08_validation/run_toolkit_gates.sh` in the **toolkit repo**.
  What remains is the
  open worklist in `10_failure_log/` (what is wrong and unfixed) plus the forward register in
  `11_future_updates/` (what is next, prioritized) — see §9.

---

## 1. Source of truth (read this before anything else)

**File:** `03_contracts/current_state_manifest.json`

This is the "machine-truth" state of the system. Its own comment says: *"Update this on every
re-freeze / rebuild BEFORE snapshotting. Shas are sha256, full hex."* It carries:

- `artifacts` — the sha256 (full hex + short prefix) of every key file: `viewer`, `sld_engine_mjs`,
  `hospital_with_geometry` (the golden case), `family_map` (with its 2 byte-identical copy paths),
  and `addin_dll` (with `carry_copies`, `install_on_trip`, and a `known_stale` block).
- `known_issues` — deliberately-unfixed items (e.g. the literal NUL bytes in `strip_compare.mjs`,
  and the two in add-in `.cs` files — see the `grep -a` rule below and FL-0013).
- `rollback` — currently `method: NONE` (**no git yet** — see §8).

> ⚠️ **GOLDEN RULE: never quote a sha from memory or from a CLAUDE.md. Read the manifest.**
> Deliberately, no shas are reproduced in this runbook — every one of them would be a copy to
> hand-sync, and this repo has been bitten by exactly that before.

### 1a. The DLL ↔ family-map embed — now in lockstep

The shipping add-in DLL embeds the family map as a .NET manifest resource, so the two can drift.
**They are in lockstep as of 2026-07-25**: the DLL was rebuilt, the embedded resource extracted by its
length prefix and hashed, and the result equals `family_map.sha256`. `stale_pending_rebuild` is
`false`. This was *not* always true — see the sidebar below and `10_failure_log/FL-0001`.

**How the gate proves it** (`sync_gate.mjs` P1, rewritten 2026-07-25). The manifest carries
`addin_dll.embeds_map_sha256` — the family-map sha the DLL *actually* embeds — and two assertions
stand on it:

1. **honesty** — the sha extracted live from the DLL must equal `embeds_map_sha256`. Proves the
   recorded value isn't a guess.
2. **lockstep** — `embeds_map_sha256` must equal `family_map.sha256`. This is the real map↔DLL
   proof. It is waived to a loud `KNOWN-STALE (declared)` pass **only** while
   `addin_dll.stale_pending_rebuild` is `true`; an undeclared mismatch is a hard FAIL.

Both currently assert identity outright, with no waiver in play. The moment someone rebuilds without
re-blessing — or the map moves again — the gate goes red. **On every rebuild: re-bless `sha256` +
`short` + `embeds_map_sha256` and keep `stale_pending_rebuild: false`** (leaving it `true` while in
lockstep is itself a FAIL, so it can't be forgotten). Re-bless the add-in `CLAUDE.md` "Current
shipping DLL sha256" line in the same pass — P5 checks it and it is the only living-doc record of the
install sha.

> 🕳️ **What this replaced, and why it matters.** The old check asked whether the DLL merely
> *contained* a 140-byte window of the current map starting at `coverage_summary`. That block is
> byte-identical across map revisions, so it could not discriminate — it reported `ok` on a stale DLL
> for the entire V1 reset. **Containment is not identity.** Any future "does artifact A contain
> artifact B" check in this repo deserves the same suspicion.

There are **four** state surfaces, together:
1. `current_state_manifest.json` — *what the true state is* (shas, issues).
2. `08_validation/sync_gate.mjs` — *drift detector* (proves the copies still agree — see §4/§8).
3. `10_failure_log/` — *memory of what went wrong* (FL-XXXX entries).
4. `11_future_updates/` — *the plan for what's next* (FU-XXXX entries, prioritized P0–P3 with effort
   and readiness). Its mirror-image relationship to surface 3 is the point: one records defects, the
   other records work not yet built. A defect never goes in 4, and an FL fix big enough to schedule
   spawns an FU rather than being duplicated into it.

---

## 2. Where the repo lives & how to orient

**Absolute path (this is NOT the shell's working directory — always use the full path):**

```
/storage/emulated/0/Mayo_Claude_Workspace/Claude Revit SLD Generator/claude_sld_generator_system
```

A handy shell prelude (paste once per session):

```bash
REPO="/storage/emulated/0/Mayo_Claude_Workspace/Claude Revit SLD Generator/claude_sld_generator_system"
GOLD="$REPO/09_tests/Hospital Example (Golden Case)"
PROJ="$REPO/09_tests/<Project>"     # working project — every HANDOFF assumes `cd "$PROJ"`
VIEWER="$REPO/04_renderer/sld_viewer_engine_V1_0_0.html"
ORACLE="$GOLD/hospital_SLD_topology_V1_0_0__WITH_GEOMETRY.json"
```

**The docs — read the right one** (was "the four docs"; separation Phase 6 split the add-in reference
on 2026-07-31, so it is now a hub plus six feature documents):

| File | When to read it |
|------|-----------------|
| `00_Docs/repo_runbook_V1_0_0.md` (this file) | Running the repo: paths, gates, recovery, state, current task. |
| `00_Docs/project_instructions_V1_0_0.md` | **Canonical for composer behavior** — stages, decision authority, NEC non-negotiables, tone, output modes. |
| `CLAUDE.md` (root, ~31 KB) | The lean system guide + auto-loaded index. Repo map, topology contract, symbol taxonomy, conventions, glossary. |
| `DEDARMS Revit Toolkit/CLAUDE.md` **(other repo)** | **The add-in HUB** — the doc index plus the shipping-sha ledger. ⚠️ **Four checks read this exact path — they are the TOOLKIT gate's `[T7]` now, and `sync_gate` reads nothing there;** read its own banner before editing it, and see FL-0022 for why prose near the ledger is load-bearing. |
| `DEDARMS Revit Toolkit/docs/*.md` **(other repo, 7 files)** | The deep C# reference, split by feature: `platform_architecture` (chassis + the DO-NOT-TOUCH identities) · `feature_sld` (the big one) · `feature_electrical` · `feature_reports_and_lab` · `feature_replay` · `ops_build_and_test`. Read **only** the one you are editing. |
| `00_Docs/drift_surfaces_V1_0_0.md` | The cross-language duplications no gate proves equal — surfaces 1–6, owning repo + change-set rule (D4a/D4b). Was a section of the add-in hub until Phase 6. ⚠️ **Its C# citations are cross-repo since Phase 7b and no gate can check them** — re-derived and re-pointed by Phase 8. |

**Newcomer reading order (cheapest first):**
1. This runbook.
2. `03_contracts/current_state_manifest.json` — the live state.
3. Root `CLAUDE.md` — the operational guide.
4. `00_Docs/project_instructions_V1_0_0.md` — *only* if you're composing a topology.
5. Add-in `CLAUDE.md` — *only* if you're touching C#.

**Repo map (numbered by pipeline stage):**

```
00_Docs/        this runbook + project instructions (decision authority, non-negotiables)
01_inputs/      title-block template + instance data + narrative template
02_specs/       topology rules, layout engine spec, preflight, symbol catalog (VISUAL MASTER)
03_contracts/   the JSON topology schema + current_state_manifest.json + conformance walk
04_renderer/    layout engine + SVG renderer + snapshot tools + the gate scripts
05_revit/       A SEAM POINTER, NOTHING ELSE — README.md only. The add-in was promoted to
                13_addin/ 2026-07-30 (Phase 4), then LEFT THIS REPO 2026-07-31 (Phase 7b); the 3
                Python oracles went with it, to DEDARMS Revit Toolkit/tools/
06_deliverables/ released SLDs (finished, out of test mode)
07_data/        excel source tables + normalized JSON lookups (NEC/feeder/transformer)
08_validation/  the validator + acceptance gate + sync_gate
09_tests/       the Hospital golden case (frozen oracle, flat) + every project folder.
                New project: cp -r _PROJECT_TEMPLATE, then 7 numbered subfolders
                (1_source .. 7_revisions). CANONICAL: 09_tests/README.md
10_failure_log/ regression-guard-driven record of past failures
11_future_updates/ forward register — what's next (FU-XXXX, prioritized P0-P3)
12_handoff/     session-to-session handoffs (HO-XXXX); at most one open per work stream
                13_addin/ IS GONE — the add-in left this repo 2026-07-31 (Phase 7b) for
                GitHub Barkie721/revit_dedarms_toolkit_system (not cloned on this machine), with its own CLAUDE.md, gate suite
                and HO/FL/FU sequences. The contract drop is the only seam.
```

---

## 3. The pipeline, start to finish (6 stages)

> **Canonical:** `00_Docs/project_instructions_V1_0_0.md` §0–§6 owns the stage *behavior* (what the
> composer does at each stage, its output contracts, and when it halts). The commands below are the
> repo-side mechanics only.

```
Narrative (.txt)  →  [AI composition]  →  Topology JSON (contract v1.0.0)
                                             │
                          Validation P1+P2 (topology + electrical rules)
                                             │
                          Layout engine (two-pass) → adds geometry{} block
                                             │
                          Preflight P3 (SH geometry rules, inside the validator)
                                             │
                          SVG render  AND  Revit add-in (detail items/lines/annotations)
```

**Runtime prerequisites:** Node **v22**, no npm dependencies (the engine stubs its own DOM). The PNG
gates additionally need **`rsvg-convert`** (the rsvg toolchain). On a box without rsvg, use the
`--no-png` modes — but read the caveat in §4.

### Stage 1 — Intake
Parse the narrative. The **only** mandatory input is service kVA; everything else defaults.
Narrative template: `01_inputs/templates/narrative_template_V1_0_0.md`.

**Scaffold the project folder first** — it is one command, and it is what makes every later stage a
path that already exists:

```bash
cd "$REPO/09_tests"
cp -r _PROJECT_TEMPLATE "<New Project>"
PROJ="$REPO/09_tests/<New Project>"
# filled narrative + its build script go in 1_source/, then:
cd "$PROJ" && bash run_pipeline.sh          # noexec storage — bash, never ./
```

Filled narratives live under `09_tests/<Project>/1_source/`, beside the
`<p>_build_topology.mjs` that consumes them. The copy needs **no rewiring**: `4_checks/` derives
every path from the project root and the topology's own `metadata.slug`, and `run_pipeline.sh` takes
the slug from the build script's filename.

> **Canonical:** `09_tests/README.md` owns the project-folder standard — the seven subfolders, the
> regenerable/authored axis, the checker suite, and the `7_revisions → FL → FU` chain.

### Stage 2 — Topology generation (the AI layer)
Emit JSON per the schema (`03_contracts/sld_topology_schema_V1_0_0.md`, schema version **`1.0.0`** —
the only accepted version). This is done by the AI/by hand — there is no CLI for it.

> **Decision authority (Tier 1/2/3), the non-negotiable NEC elements, the `COMPOSITOR_HALT` /
> `DATA_LOOKUP_MISS` protocol, and the PE-review disclaimer are owned by
> `project_instructions_V1_0_0.md` §2.3 and §2.4.** Read them there — they are deliberately not
> restated here.

### Stage 3 — Validate (Phase 1 + Phase 2)
```bash
cd "$REPO/08_validation"
node validate_topology_V1_0_0.mjs <topology.json> [<topology2.json> ...]      # human report
node validate_topology_V1_0_0.mjs --json --layout-config <cfg> --strict-migrations <topology.json>
```
Exit codes: `0` clean · `1` error · `2` migration-only · `3` crash/unreadable.
Flat **70-rule** registry (`rules/index_V1_0_0.mjs`), including the Phase 3 SH geometry-preflight
rules.

### Stage 4 — Layout (adds the `geometry{}` block)
```bash
cd "$REPO/04_renderer"
node run_layout.mjs                                                # runs the embedded hospital demo → stdout
node run_layout.mjs --topo "../09_tests/Hospital Example (Golden Case)/hospital_SLD_topology_V1_0_0.json" \
                    --config hospital_layout_config.json \
                    --out /tmp/geometry.json                       # external topology → file
node run_layout.mjs --gate "$ORACLE"                              # GATE: diff vs golden, ±1.0px, exit 1 on drift
```
The engine (`sld_engine.mjs`) is **generated** from the viewer HTML — never hand-edit it
(see §4, gen-idempotent).

### Stage 5 — Preflight (Phase 3)
There is **no standalone preflight step.** The SH geometry rules run **inside** the validator (§3)
when the topology carries a `geometry{}` block. Spec: `02_specs/drafting/sld_preflight_V1_0_0.md`.

### Stage 6 — Render / acceptance
```bash
node "$REPO/08_validation/check_acceptance_V1_0_0.mjs"            # self-verifying 2-case hospital gate
```
SVG rendering is done by the reference viewer; PNG/SVG snapshots by the snapshot tools (§4). Revit
placement is downstream of this repo's CLI surface — it happens in the add-in (§5).

---

## 4. The 13-gate regression suite

> 🚩 **IT WAS 14 UNTIL 2026-07-31, AND THIS SUITE NOW COMPILES NOTHING.** Separation Phase 7b
> deleted **gate 13, the C# build gate**, together with its subject: `08_validation/build_gate.sh`,
> the `--no-build` flag and `lib/dll_embed_V1_0_0.mjs` all left with the add-in. The live suite is
> **13 gates full / 6 `--quick` / 9 `--no-png`**. **`gate 14` KEPT ITS NUMBER** — sliding the
> check-name baseline down to 13 would repoint every "gate 14" citation at a gate that never
> existed. So the numbering has a hole, on purpose.
>
> ⚠️ **A green run here is now SILENT about the add-in**, exactly as "12/12 green" was before
> FU-0011 added gate 13. The difference is that the add-in has its own suite in its own repo:
> `DEDARMS Revit Toolkit` → `bash 08_validation/run_toolkit_gates.sh`. **Two repos, two suites,
> neither reports on the other — never run them at the same time.**

**Run everything (from the repo root):**
```bash
cd "$REPO"
./run_all_gates.sh                # full suite (13 gates), ~25 s on the phone
./run_all_gates.sh --quick        # G1 + G8 + conformance + gen-idempotent + sync + check-name baseline (6/6; no PNG, no parity/behavior/acceptance, no C# build)
./run_all_gates.sh --no-png       # full suite minus G5/G6/G7/G9 (9/9)
# --no-build IS GONE. It existed only to skip gate 13, and a flag that silently
# does nothing is the exact shape this repo keeps logging. Removed with the gate.
```

> ⚠️ **`--no-png` / `--quick` skip the PNG gates. A green `--no-png` run is NOT proof that a
> text/restyle change is safe** — the PNG gates are the only net for visual regressions. The script
> itself flags this.
>
> ⚠️ **`--no-png` also skips G7** (titleblock-derivation), which needs no rsvg at all — it just sits
> inside the same guard block in `run_all_gates.sh`. So `--no-png` drops **four** gates, not three.
> **Gate 13 was deliberately placed OUTSIDE that guard** so `--no-png` does not silently become
> `--no-csharp` as well.
>
> ⚠️ **`--no-build` and `--quick` skip the ONLY gate that compiles C#.** Gates 1–12 are all Node
> scripts over the renderer/topology/baselines; a green run without gate 13 says nothing whatever
> about the 100 add-in source files. Both flags print that warning; believe it.

**The 13 gates individually** (cwd shown; `$REPO`/`$GOLD`/`$VIEWER`/`$ORACLE` from §2):

| Gate | Command | cwd |
|------|---------|-----|
| **G1** geometry | `node run_layout.mjs --gate "$ORACLE"` | `$REPO/04_renderer` |
| **G5** png-baselines (4/4) | `sha256sum -c tests_V1_0_0/baseline_sha256.txt` | `$GOLD` |
| **G6** composed-baselines (6/6) | 2× `snapshot_html.mjs` capture, then `sha256sum -c baseline_composed_sha256.txt` | `$REPO/04_renderer` |
| **G7** titleblock-derivation | `node "$REPO/04_renderer/check_titleblock_derivation.mjs"` | any |
| **G8** strip-compare (additive-export proof) | `node strip_compare.mjs` | `$REPO/04_renderer` |
| **G9** catalog-baselines (108/108) | `sha256sum -c ../baseline_catalog_sha256.txt` | `$REPO/02_specs/visual_reference/snapshots` |
| conformance-walk | `node conformance_walk_V1_0_0.mjs "$ORACLE"` | `$REPO/03_contracts` |
| gen-idempotent | `node gen_engine.mjs` then compare `sha256sum sld_engine.mjs` before/after | `$REPO/04_renderer` |
| sync-gate | `node 08_validation/sync_gate.mjs` (`--quick` to skip PNG) | `$REPO` |
| parity | `node parity_test.mjs "$VIEWER" "$ORACLE"` | `$GOLD/tests_V1_0_0` |
| behavior (52 checks) | `node behavior_test.mjs "$VIEWER"` | `$GOLD/tests_V1_0_0` |
| acceptance | `node "$REPO/08_validation/check_acceptance_V1_0_0.mjs"` | any |
| **gate 14** sync-gate check-NAME baseline (D7) | `bash 08_validation/checkname_diff.sh` | `$REPO` |

(There is no G2/G3/G4 — the numbering is historical. **And there is no gate 13 any more**: it was
the C# build gate and it left this repo on 2026-07-31 with the code it compiled. Its successor is
the toolkit's `08_validation/toolkit_build_gate.sh`, **15 checks**, in the other repo.)

> 🚩 **EVERYTHING FROM HERE TO THE END OF THIS SUB-SECTION DESCRIBES A GATE THAT IS NO LONGER IN
> THIS REPO.** `build_gate.sh` was deleted on 2026-07-31 by separation Phase 7b, together with the
> C# it compiled. **Its successor is `08_validation/toolkit_build_gate.sh` in the
> `DEDARMS Revit Toolkit` repo (15 checks), and that repo's `docs/ops_build_and_test.md` is the
> live procedure.** Every `SLD_ADDIN_ROOT` / `ADDIN_ROOT` reference below is dead here —
> `ADDIN_ROOT` was deleted outright by decision **D-A**, not repointed at the sibling repo.
>
> **It is kept, not deleted, because the measurements are still true and were expensive**: the
> structural climb depth, T0.6's lab-vs-real-golden test, the seven mutant proofs, the
> RootNamespace trap. **Read it as the record of WHY the toolkit's gate is shaped the way it is.
> Do not run any command in it against this repo.**

**Gate 13 — `build_gate.sh` (T0 + T4 + T4b), added 2026-07-30 by FU-0011.** The first and only gate
in this repo that compiles anything. Its 14 checks:

| Check | What it proves |
|---|---|
| **T0.0** ×4 | preconditions: `dotnet` runs, all three projects present, scratchpad is off `/storage`, and **`Directory.Build.props` exists beside the projects** (Phase 5a — it holds the shared properties and does NOT travel with the scratchpad copy unless copied deliberately; a hard FAIL, never a skip) |
| **T0.1** | `DEDARMS` builds Release, **0 errors** (net8.0-windows) |
| **T0.2** | `DEDARMS.Replay2023` builds Release, **0 errors** (net48) |
| **T0.5** | `DEDARMS.Lab` builds Release, **0 errors** — the OPTIONAL satellite, built UNCONDITIONALLY (Phase 5b, D2b). There is no `IncludeLabFeatures` flag on purpose: a switch that can make this build not happen is the hazard D2b identified |
| **T0.3** | `DEDARMS.Tests` builds Release, **0 errors** |
| **T0.4** | the tests run **and the count equals the manifest pin** (112) |
| **T4** | the **freshly built** DLL still embeds the canonical family map (the BYTES) |
| **T4b** | `DEDARMS.dll` owns its **2** resource names **AND does NOT contain Lab's 3** (Phase 5b). The must-NOT-contain half is the point: a flat existence list is blind to a resource landing in the WRONG assembly, which scores green while every Lab icon resolves to null in Revit |
| **T4c** | `DEDARMS.Lab.dll` really carries those **3**. Not redundant with T4b — the must-NOT-contain pass is also satisfied by the cats existing NOWHERE |
| **T5** | every `.addin`'s `<FullClassName>` and `<Assembly>` agree with the SOURCE that produces them (Phase 5c, D2a). Source-anchored, not binary-anchored: a CLI `TypeDef` stores namespace and name as two separate `#Strings` entries, so `DEDARMS.App` never appears as a byte sequence in the assembly at all — measured, 0 hits as UTF-8 and UTF-16LE |
| **T5b** | every DLL the deploy needs is actually staged. ⚠️ This is the ONLY detector for a missing `DEDARMS.Lab.dll`: decision D2c makes an absent satellite SILENT at runtime (14 buttons, empty Fun panel), so nothing downstream will report it |

Three design rules, each the answer to something measured — do not "improve" them away:

1. **It never compares a DLL sha.** Both shipping assemblies are build-location-dependent. Measured
   2026-07-30: `DEDARMS` gives one sha twice in the same scratchpad and a different sha elsewhere,
   and `DEDARMS.Replay2023` behaves identically (`bb79a5cc` twice in one dir, `31f3a9a6` in another,
   blessed `1a3b7ead`) **despite setting `<Deterministic>true</Deterministic>`** — Deterministic
   removes timestamp/MVID churn, not absolute source paths, which need `<PathMap>`. The builds are
   reproducible but not relocatable, so a sha assertion here could only ever be red. Carrying the
   right bytes to the Revit box stays sync_gate's job, against the blessed carry copies.
2. **It never gates on warnings.** "0 warnings" can never pass here: `DEDARMS`'s post-build `xcopy`
   is Windows-only and always raises MSB3073 on Linux (1 warning), and `DEDARMS.Tests` carries 12
   pre-existing nullable/CS0649 warnings. Counts are printed for drift visibility only, matching the
   repo's standing "warnings don't gate" policy.
3. **It never soft-skips.** A missing `dotnet`, a missing project, or a scratchpad on `/storage` is a
   hard **FAIL** with the reason — FL-0009's lesson. If a box genuinely has no toolchain, say so out
   loud with `--no-build` and take the 13/13.

⚠️ **T4 and T4b check different things and you need both — this was learned by getting it wrong.**
T4 locates the family map by its `$schema` bytes, so it answers "are the bytes in there?". It does
**not** answer "are they reachable under the name the code asks for?". Measured 2026-07-30: setting
`<RootNamespace>DEDARMS.Core</RootNamespace>` renames every embedded resource to
`DEDARMS.Core.Resources.…`, breaking all five hardcoded `"DEDARMS.Resources.…"` lookups — and the
gate, T4 included, stayed **fully green**. T4b closes it by deriving the expected names *from the C#
source* and asserting each exists in the built DLL as a **UTF-8** byte sequence. The UTF-8 part is
load-bearing: a C# string literal is stored UTF-16LE in the `#US` heap while resource names are UTF-8
in `#Strings`, so a UTF-8 search finds the real name and cannot be fooled by the literal it is
validating. T4b also **fails on an empty list** — zero extracted literals means the pattern broke,
and a check that iterates nothing must never report success (FL-0010's class). This is the single
most Phase-5-relevant thing gate 13 does: the restructure is exactly when RootNamespace moves.

⚠️ **Running gate 13 writes inside the repo, transiently.** `DEDARMS.Tests` must build **in place**
because `DEDARMS.Tests.csproj:91` reaches the hospital golden by a repo-relative **three**-level climb (a
scratchpad copy fails MSB3030), so `DEDARMS.Tests/bin` + `obj` appear and are removed by an EXIT
trap. The two **shipping** assemblies build in a scratchpad instead — an in-place build there would
overwrite `bin/Release/*.dll`, which **is** a blessed carry copy that has run inside Revit, and
restoring it costs a Revit trip. Two build strategies in one script; that asymmetry is the whole
reason the task was [M] and not [S].

> ⚠️ **The climb depth is STRUCTURAL — re-measure it at every move.** It was *four* levels until
> separation Phase 4 promoted the add-in root out of `05_revit/` (2026-07-30) and became *three*.
> A wrong depth is not a subtle failure: `dotnet build` dies `MSB3030` naming the golden fixture,
> and T0.3/T0.4 go red together. The mutant lab inherits this — a lab tree reached via
> `SLD_ADDIN_ROOT` must sit at the **same depth below its own repo root** as `13_addin/` does, or
> the climb lands outside the lab and reads the real golden.
>
> ✅ **T0.6 NOW ENFORCES THAT (2026-07-31, FL-0019 item e).** Too shallow used to be *silent*: the
> climb escaped the lab, resolved a `09_tests/` further up, and the gate scored a full green
> against the **real** tree while the operator believed they were testing a mutant. T0.6 fails when
> `SLD_ADDIN_ROOT` is set and the golden the tests compiled against turns out to be **this repo's
> own**. Build the lab so `dirname($SLD_ADDIN_ROOT)` is the lab root and give it **its own
> `09_tests/`** — a **marked** copy of the golden makes the result readable at a glance, and T0.6
> prints the sha it actually used. A lab that genuinely intends to borrow the real golden (the
> `ln -s` form below) must now say so: **`BUILD_GATE_LAB_GOLDEN_OK=1`**. One deliberate act is the
> whole difference between an escape and a decision.
>
> ⚠️ Note what T0.6 does **not** do: its path arithmetic (`dirname($ADDIN_ROOT)/09_tests/…`) is the
> *same* arithmetic the csproj climb performs, so comparing the two can never detect a depth
> mistake on its own — that comparison holds by construction. The first draft of this check did
> exactly that and was tautological. The lab-vs-real-repo test is the part that has teeth.

**Overrides** (all optional, defaults measured on this phone):
`DOTNET_BIN` (default `/root/dotnet/dotnet` — `dotnet` is **not** on `$PATH` here),
`BUILD_GATE_SCRATCH` (default `/root/.cache/dedarms_build_gate`, must be off `/storage`),
`SLD_ADDIN_ROOT` (default `$REPO/13_addin`; mirror of sync_gate's `ADDIN_ROOT`, so Phase 7's
sibling-repo move is a one-line change in **two** files — as Phase 4's `mv` was, on 2026-07-30).
`DOTNET_GCHeapHardLimit` is set to `0x60000000` and is **not optional** — without it CoreCLR fails to
start on this device with `GC heap initialization failed with error 0x8007000E`.

**Why it can be trusted: it was mutant-proved 2026-07-30, seven ways — and all seven were
independently re-run and confirmed by the verification session the same day** (all in a throwaway copy
at `/root/.cache/dedarms_mutant` reached via `SLD_ADDIN_ROOT`, so the real sources were never edited):
gutting `AverageParentX`'s body in `Services/LayoutEngine.cs` → **3 reds** (T0.1, T0.3 — because the
tests source-link that file — and T4, which has no DLL to read); commenting out **one** `[Fact]` →
**T0.4 red at `passed=111`, while the runner itself still exits 0**, which is exactly the false-green
FU-0011 was written to close; dropping the family map from `<EmbeddedResource>` → **T4 *and* T4b red**,
with 0 errors and 112 tests passing, proving T4 sees what the compiler cannot; pointing `DOTNET_BIN`,
`BUILD_GATE_SCRATCH` and `SLD_ADDIN_ROOT` at bad paths → three hard **FAIL**s, never an `ok (skipped)`;
and — **the one that matters most, because it *is* the Phase 5 change** —
`<RootNamespace>DEDARMS.Core</RootNamespace>` → **T4 stays GREEN while T4b goes red naming all five**
hardcoded resource names. That last mutant is the whole reason T4b exists: without it the gate was
8/8 green on a build in which every `"DEDARMS.Resources.…"` lookup returns null at runtime.

⚠️ **Two corrections applied 2026-07-30 by the verification session (FL-0014).** This paragraph said
**six** ways and omitted the `RootNamespace` mutant entirely, and it recorded mutant ③ as "**only** T4
red" — re-measured, it is **two** reds (T4 and T4b), because T4b was added *after* mutant ③ was last
run and the expectation was never re-derived.

Every mutant was restored and the control re-verified green. The verification session additionally
exercised **nine mutants nobody had tried**; see **HO-0008** for those, including the two that found
real defects (**FL-0011** under-reported check counts, **FL-0012** concurrent runs give a false red).

**The number 112 lives in exactly one place:** `03_contracts/current_state_manifest.json` →
`artifacts.addin_tests.expected_passed`. Change it **only** when you added or removed tests on
purpose. If gate 13 goes red on the count after a refactor, **the count is the finding** — the most
likely cause is a `<Compile Include>` link dropped from `DEDARMS.Tests.csproj` (it source-links 21
production files and has **no** `ProjectReference`), which removes tests from the run without
removing a file from the repo. This is the first artifact slot in the manifest whose gate lives
outside `sync_gate.mjs`, which is why its `gated_by` field is load-bearing rather than decorative.

**Regenerate / re-bless commands:**
```bash
# Regenerate the engine from the viewer HTML (then run gen-idempotent to prove it's stable):
cd "$REPO/04_renderer" && node gen_engine.mjs

# Composed-page snapshots (G6 inputs):
cd "$REPO"
node 04_renderer/snapshot_html.mjs --html 01_inputs/templates/titleblock_template_30x42_V1_0_0.html \
     --theme both --out 04_renderer/snapshots_titleblock
node 04_renderer/snapshot_html.mjs --html 04_renderer/sld_viewer_engine_V1_0_0.html \
     --page --page-meta 01_inputs/hospital_titleblock_data_V1_0_0.json \
     --theme both --audit --out 04_renderer/snapshots_page

# Re-bless the symbol catalog (G9 — the catalog is the VISUAL MASTER for symbol appearance):
cd "$REPO/02_specs/visual_reference"
node snapshot_catalog.mjs --html sld_catalog_V1_0_0.html --all --theme both --audit
( cd snapshots && ls *.png *.svg | sort | while read f; do sha256sum "$f"; done ) > baseline_catalog_sha256.txt
```

**sync_gate (the 14/14 full · 12/12 quick):** `node 08_validation/sync_gate.mjs` reads the manifest as truth and proves
the cross-surface facts stay byte-identical — family map ×2 + the map↔DLL lockstep, viewer↔golden-viewer,
the `published_drop` publisher-side staleness check, engine↔regenerate(viewer), the 3-surface hospital
topology, the three living-doc rev anchors, and the 2 PNG baseline sets. Full run = 14 checks (12 in
`--quick`; `--quick` drops only the two phase-6 PNG baseline checks). Green prints `SYNC-GATE GREEN`.
The surviving DLL-embed check is described in §1a; it compares **two fields of the manifest** and
never opens a DLL.

> 🚩 **This paragraph read `24/24 full · 22/22 quick` until 2026-08-03** (audit **A8a/A8b**, swept by
> **FU-0014**) and listed **"the add-in root"** among the things it proves. **Separation Phase 7b
> deleted eleven checks with the add-in and added one**; the add-in-root assertion and the second
> DLL check went with them. Live counts derived by running `node 08_validation/sync_gate.mjs` and
> `--quick`: **14** and **12**. §0 `:33` has said `14/14` since Phase 8 — **this section disagreed
> with the top of its own file.**

**HOW "check N" IS NUMBERED, because two conventions are in use and nothing said so.**
Every `check N` cited in the manifest, the add-in `CLAUDE.md` and the FL/FU/HO records is an
**ARRIVAL ID** — the Nth check ever added to the suite, frozen when it landed. It is *not* the
execution index, and has not been since checks began being inserted mid-file. Example: manifest
L70's "check 15", and the "check 15" in the add-in hub and in its `docs/feature_replay.md` — both
now in the `DEDARMS Revit Toolkit` repo — all name the Replay2023 carry-copy check. ⚠️ **That check
LEFT `sync_gate` on 2026-07-31 (Phase 7b) and is the toolkit's `[T3]` now**, so the arrival-ID rule
below still applies, but to a check in the other repo.
Those citations are correct as written — **do not "fix" them to execution order.**
⚠️ **Located by prose, not by line, and deliberately so.** This sentence used to cite "add-in
`CLAUDE.md` L184/L214"; Phase 6 split that 331-line file into an 86-line hub plus the feature docs beside it,
and both numbers died. Re-derived 2026-07-31 (HO-0018): the three live sites are hub `:63` and
`feature_replay.md` `:34`/`:47` — **which will rot too, so do not copy them into the sentence.** New checks take the next arrival ID; the add-in-root check added 2026-07-30 is
arrival ID 21.

**NO CHECK MAY SOFT-SKIP TO GREEN.** Four of them used to: with the DLLs absent, checks for the
carry copies, the embed honesty and the map↔DLL lockstep all returned `ok … (skipped)`, so the
entire family-map↔DLL proof evaporated into reassuring green lines — FL-0001's failure class,
reintroduced by guards that looked like caution. Fixed 2026-07-30 (FL-0009). A check that cannot
see the bytes must FAIL. Regression test: move **both** `addin_dll` carry copies aside — one is not
enough, `carry_copies.filter(exists)` still finds the other — and confirm 3 hard reds while the
lockstep check stays green (it compares two manifest fields and needs no DLL at all).

---

### 4.x The mutant harness — deliberately OUTSIDE the 13 gates

```bash
bash 08_validation/run_mutants.sh              # build a lab, run it, clean up
bash 08_validation/run_mutants.sh --keep-lab   # leave the lab for inspection
```

**A green 13/13 says nothing about whether any of these checks can still GO RED.** That is what a
mutant harness is for, and this repo has two: `08_validation/mutants_drop_staleness.mjs`,
**12 arms**, covering `[P1] published_drop shas == the LIVE upstream files`, and, since 2026-10-13,
`08_validation/mutants_gate_stderr.mjs`, **6 arms**, proving that G6's and the gen_engine gate's own
errors reach the suite output (FL-0028, FU-0022). Before 2026-07-31,
`sync_gate.mjs` — 14 checks, the gate this system leans on — had **no mutant coverage of any kind**.

**FU-0012 (SLD) / FU-0006 (toolkit) decided on 2026-08-01 that it gets a runner rather than a slot
in the suite**, and the reasoning is worth keeping because it will be re-litigated:

- **Not suite-invoked.** The harness invokes the whole gate once per arm and needs a writable lab
  off `/storage` (`noexec`). Wiring it in would put a **soft-skip path inside the suite — the exact
  failure mode the harness exists to hunt** (FL-0009) — and would move `EXPECTED_GATES` and the
  gate-14 check-NAME baseline, i.e. a re-bless, for a change that adds no new assertion about the
  product.
- **Not manual-only.** "Run it when you remember" is a written warning used as a control, and this
  repo's record on that is bad.

**The runner has pins of its own**, because a runner without them is the layer FL-0017 was about:

| pin | catches |
|---|---|
| `EXPECTED_HARNESSES` | a harness deleted, or one that never ran — **red, not a smaller green** |
| per-harness **ARM COUNT** | an arm deleted from inside a harness that still reports green (FL-0023's failure, one layer down) |
| scores the `MUTANTS:` **summary line, not the exit code alone** | a harness that dies before its first arm — *absent* is its own verdict, not "no arms failed" |
| lab path + entry-count check | a lab on `/storage`, inside the repo, or an unfaithful copy |

All four were mutant-proved against a shadow repo on 2026-08-01, plus a control.

> 🚩 **THE TOOLKIT REPO HAS ITS OWN `run_mutants.sh` AND ITS OWN FOUR HARNESSES (43 arms).** Same
> decision, recorded there too — neither repo can see the other. **Never run the two at once**
> (FL-0012). Its first run found that `mutants_drift_coverage.mjs` **had no exit code**: it printed
> "1 MUTANT(S) BEHAVED WRONG" and exited 0. **Toolkit FL-0003.**

**When to run it:** after editing any check a harness covers, and before any change-set that
re-blesses a gate baseline. It is NOT part of a routine gate run and does not need to be.

---

## 5. The Revit add-in (DEADARMS)

**Build (compile-verify — this machine has no Revit, so runtime testing needs a Windows/Revit box):**
```bash
cd ".../DEDARMS Revit Toolkit/src/DEDARMS/"        # ANOTHER REPO since 2026-07-31
dotnet build -c Release          # → bin/Release/DEDARMS.dll  (compiles without Revit installed)
dotnet build                     # Debug
```

> 🚨 **FL-0021 — IF YOU CHANGED ANY `.cs`, THE COMMAND ABOVE IS NOT ENOUGH AND WILL LIE TO YOU.**
> **Editing an existing file in this repo does not advance its mtime** (the tooling rewrites content
> in place on this FUSE mount; *creating* a file is fine). MSBuild guards `CoreCompile` on
> "inputs newer than outputs", so **it does not see your edit at all** — it prints
> `Build succeeded. 0 Error(s)`, re-emits the previous assembly, and **the gate suite stays green**
> — in the **toolkit repo**, because `08_validation/toolkit_build_gate.sh` builds in a scratchpad it
> wipes first. Measured 2026-07-31: the FL-0018 fix sat in
> `App.cs` while `bin/Release/DEDARMS.dll` was still byte-identical to the previous day's build.
> ⚠️ **This warning said "because gate 13 builds in a scratchpad" until 2026-08-03** (audit **D6**,
> swept by **FU-0014**). **There is no gate 13 in this repo and this suite compiles nothing** — the
> scratchpad behaviour it describes is the toolkit gate's, so **the suite that stays deceptively
> green is the one in the OTHER repo, and you must run it there.** The trap is unchanged; only its
> address moved.
>
> ```bash
> touch <every edited .cs>
> dotnet build -c Release -p:EnableWindowsTargeting=true --no-incremental
> ls -l --time-style=full-iso bin/Release/DEDARMS.dll   # the mtime MUST have moved
> sha256sum bin/Release/DEDARMS.dll                     # so MUST the sha, for a real code change
> ```
>
> **A sha that does not move after a source edit is a finding, not a convenience.** Verify by the
> output, never by the banner — that rule is FL-0020's, and it is what caught FL-0021 in a minute.
Stack: C# / `net8.0-windows` / WPF **code-behind, no XAML** (deliberate — dodges Revit 2025 XAML
isolation bugs) / Revit 2025 via Nice3point reference-assembly NuGet. Assembly + namespace `DEDARMS`;
ribbon tab "DEDARMS". No CI, no lint, no automated test runner — `dotnet build` is the only C#-side
gate.

**Hard rules (non-negotiable):**
- A modeless dockable pane **never calls the Revit API directly** — everything routes through the
  `ExternalEvent` bridge.
- `App.OnStartup` **must never throw** (an escaping exception disables the add-in for the session).
- **Stable GUIDs** (`PaneId`, `DashboardPaneId` in `App.cs`; `AddInId` in the manifest) never change
  between releases.
- **Partial failure never aborts the run** — one bad element becomes a warn/skip, never a rollback.
- Families are preflight-validated *before* entering the transaction group.

**The family map — two byte-identical copies (keep both in sync + ship the xlsx same change-set):**
1. `07_data/normalized/revit_SLD_family_map_V1_0_0.json` — canonical.
2. `03_contracts/published_drop/revit_SLD_family_map_V1_0_0.json` — **the published drop copy**.
   ⚠️ **THIS ROW CHANGED ON 2026-07-31 (Phase 7b, HO-0021 §7.2).** It used to be the add-in's
   embedded-resource copy under `13_addin/`, which has left this repo; `copies[1]` in the manifest
   was repointed at the drop so no check here reads across the seam. The **embedded** copy is now
   `DEDARMS Revit Toolkit/src/DEDARMS/Sld/Resources/…` and editing it still requires a rebuild to
   take effect — but that rebuild happens in the other repo, and **nothing on this side can see
   whether it happened** (see §1a).
   Source of record: `07_data/excel/revit_SLD_family_map_V1_0_0.xlsx` — ships in the *same* change-set.

**Verify what a DLL actually embeds** (don't trust the doc line — this is how §1a was settled):
```bash
node -e '
const fs=require("fs"),c=require("crypto");
const dll=fs.readFileSync(process.argv[1]);
const i=dll.indexOf(Buffer.from("revit_family_map/v1.0"));
let s=i; while(s>0 && dll[s]!==0x7b) s--;              // back up to the JSON "{"
const len=dll.readUInt32LE(s-4);                        // .NET resource length prefix
console.log("embedded map sha256:", c.createHash("sha256").update(dll.subarray(s,s+len)).digest("hex"));
' "bin/Release/DEDARMS.dll"
```
Compare that against `manifest.artifacts.family_map.sha256`.

**Two-machine deploy caveat:** when upgrading a Revit box that ran the old build, **first delete the
stale `SLDGenerator2A.addin` + `SLDGenerator2A.dll`** from `%APPDATA%\Autodesk\Revit\Addins\2025\` —
the AddInId GUID is unchanged, so two manifests = a duplicate-AddInId load error. Hand-off
deliverables are `bin\Release\DEDARMS.dll` + `DEDARMS.addin` (the manifest `<Assembly>` path must
point at where the DLL lands).

---

## 6. Which Claude model to use for what

The main session should run on **Opus**; delegate read-heavy and mechanical work to subagents so the
main context stays lean. (Latest model families: **Opus 5 / Sonnet 5 / Haiku 4.5**.)

| Task | Model | Why |
|------|-------|-----|
| Topology composition, NEC decision authority, Tier 2/3 judgment | **Opus** | Reasoning + code-traceability matter; a wrong call can ship a non-compliant drawing. |
| Add-in C# geometry placers (the dense alignment/flip/companion logic) | **Opus** | High-context, subtle correctness; the add-in CLAUDE.md is intricate. |
| Architecture, review, "why is the gate red" debugging | **Opus** | Cross-file reasoning. |
| Mechanical edits, running the gate suite, doc/version bumps, snapshot regen | **Sonnet** | Deterministic, well-specified; cheaper and faster. |
| Broad exploration / "where is X" / reading whole files for a summary | **Explore or general-purpose subagent** (Sonnet-class) | Returns conclusions, not file dumps — protects the main context (see §7). |
| Trivial lookups (one grep, one value) | **Haiku** | Fast and cheap. |

**Orchestration pattern that works here:** main session (Opus) stays the coordinator and holds the
conclusions; every time you'd read more than ~2 files to answer something, spawn an **Explore**
subagent with a *specific* question and have it return a short structured answer. That is how this
very runbook was assembled without blowing the context.

---

## 7. Staying under 300k tokens per session

The two `CLAUDE.md` files are **~46 KB combined** (root **36,088 B**, add-in hub **11,071 B**) — but
they are in **two different repos** since 2026-07-31, and the add-in's real body lives in the
toolkit's `docs/`, a further **93,547 B** across **seven** documents, so
reading "everything" is **~140 KB**. Call it **11–12k tokens** for the two hubs, or **35k+** if you
raw-read the docs too. Don't. *(Re-measured 2026-07-31, HO-0018. The previous figures — "~105 KB
combined, root ~31 KB, add-in ~73 KB" — predated the Phase 6 split and survived it uncorrected while
the doc table at §5 was updated; this section is the one a token-budgeting session actually reads.)*

- **Don't raw-read the big docs.** Lean on targeted `grep`, and read only the section
  you need (`Read` with `offset`/`limit`, or `Grep` for the anchor).
- **Read the small manifest for shas** (`current_state_manifest.json`) instead of re-deriving them
  from files.
- **Delegate broad reads to Explore subagents** — they read the files and return a *summary*; the
  raw file text never enters your context.
- **`grep -a`, always.** **Three** files here contain NUL bytes and plain `grep` treats them as
  binary, silently dropping every match: `04_renderer/strip_compare.mjs` (2 NULs),
  `…/DEDARMS/Core/UI/RibbonBuilder.cs` (1) and `…/DEDARMS.Replay2023/Services/ReplayPreflight.cs` (2).
  **Two of the three are `.cs` files inside the add-in** — this said "only `strip_compare.mjs`"
  until 2026-07-30 (FL-0013). Re-measured 2026-07-30: still exactly those three. **Do not rely on
  the list staying at three** — the rule is `-a` unconditionally, not "`-a` when you think you are
  near a listed file." A grep that returns zero matches is indistinguishable from a grep that was
  never allowed to look.
- **Work one pipeline stage per turn.** Validate, then layout, then gate — don't fan the whole
  pipeline into one context.
- **Checkpoint before the context fills:** update `current_state_manifest.json` and write a memory
  note so the *next* session resumes from state, not from re-reading everything.
- **Run `--quick` gate subsets while iterating**, the full suite only at the end (respecting the
  `--no-png` caveat in §4).

---

## 8. Recovery — if work breaks between subagents, sessions, or worktrees

There is **no git yet** (`rollback.method: NONE` in the manifest). Recovery rests on the three state
surfaces from §1: the **manifest** (truth), **sync_gate** (drift detector), the **failure log**
(memory).

**Resume procedure (run in order):**
```bash
# 1. Re-establish truth — what SHOULD the state be?
cat "$REPO/03_contracts/current_state_manifest.json"      # (or Read it) — live shas + known_issues

# 2. Detect a half-applied change — did a broken session leave the copies out of sync?
cd "$REPO" && node 08_validation/sync_gate.mjs            # expect SYNC-GATE GREEN (14/14 full, 12/12 --quick)

# 3. Confirm the whole system still passes
./run_all_gates.sh                                        # expect 13 gates green (this suite compiles NOTHING)
```

- If **sync_gate is RED**: a broken edit left two copies disagreeing (e.g. one family-map copy
  changed but not the other, or the engine wasn't regenerated from the viewer). The RED list names
  exactly which surface drifted — fix that copy, re-run.
- If **sync_gate is GREEN**: read the P1 DLL-embed lines anyway — they should say `in lockstep`
  (§1a). A `KNOWN-STALE (declared)` line means someone moved the family map without rebuilding the
  DLL and declared it; that is a legal pass, but it is a debt, not a clean bill.
- If a **gate is RED**: read which one. G1/parity/behavior → an engine/geometry regression (fix the
  engine, never the golden oracle). G8 → a new geometry key broke additive-export. sync-gate → a
  copy drift (above).
- **Before any large change, take a fresh snapshot** — there is no rollback point otherwise:
  ```bash
  tar czf "/storage/emulated/0/Download/sld_snapshot_$(date +%Y%m%d_%H%M).tgz" -C "$REPO/.." claude_sld_generator_system
  ```
  *(This box has no reliable `date` inside some tools — if a timestamp is unavailable, name the tar
  by hand.)*

**Between subagents:** a subagent's final report is NOT in your context automatically — capture the
conclusion in your own message (or a memory note) before spawning the next one. If a subagent dies,
re-dispatch with the same specific prompt; nothing it did mutated state unless it ran a write tool.

**Between worktrees:** give mutation-heavy parallel tasks their own isolated worktree so they don't
collide. When merging back, run `sync_gate.mjs` — it is the mechanical proof the copies still agree
after a merge. (Worktrees need git; see §10 recommendation to initialize it.)

**The one rule that saves you:** every recovery decision reads from the **manifest**, never from a
remembered sha. The manifest is the only file allowed to state "what the DLL sha is."

---

## 9. The Revit machine — ship a DLL, and what remains

> ⚠️ **CORRECTED 2026-07-30 (Phase 5 verification). THIS SECTION READ "The add-in is
> runtime-verified" AND FLATLY CONTRADICTED §0 OF ITS OWN FILE (`:34`).** The run below is real, but
> it was **`9f16a1e7`** on 2026-07-25. **The build that ships today is `be6ae51a`, and it has NEVER
> been loaded by Revit** — nor has `DEDARMS.Lab 2e86b97d`, nor `Replay2023 1a3b7ead`. All three now
> carry `runtime_unverified: true` in `03_contracts/current_state_manifest.json`. ⚠️ **The
> bidirectional assertion against the add-in `CLAUDE.md` prose is no longer made HERE** — Phase 7b
> deleted that check with the add-in; it is the **toolkit repo's** `[T7]` now.
> **Do not read the evidence below as evidence about the DLL you are about to carry.** Phases
> 5a/5b/5c moved all `.cs` into feature folders, changed three Core signatures on the
> placement/view-creation path, split out a satellite and inverted the ribbon registry.
> 🚩 **The compile and the 112 tests are proved in the TOOLKIT repo, not by anything you can run
> here.** This sentence read *"A green **14/14** proves it compiles and that 112 tests pass, and
> nothing more"* until 2026-08-03 (audit **A9b**, swept by **FU-0014**) — **in a suite that is
> 13 gates and compiles nothing.** Run `bash 08_validation/run_toolkit_gates.sh` in
> GitHub `Barkie721/revit_dedarms_toolkit_system` (not cloned on this machine) **(toolkit repo)** for that, and even a green there
> proves it compiles and that 112 tests pass, **and nothing more**.

**The add-in WAS runtime-verified once, on a build that no longer ships.** A full hospital run on
Revit 2025 (2026-07-25, `9f16a1e7`) placed 104/128
devices with 104/104 aligned, 178 detail lines, 8/8 level lines, 4/4 equipment labels, 10/10 sections,
27/27 device tags and 14/14 squiggle labels; the 3 unplaced elements are the known family-map gaps
(L1-3 ×2, L3-3 ×1), not defects. The evidence — UI screenshots, run report, placement CSV and the
first committed `Measure Families` CSV — is banked in
`09_tests/Hospital Example (Golden Case)/Revit Tests Docs/`. That flat path is the golden case's own;
a project scaffolded from `_PROJECT_TEMPLATE` banks the same evidence in its **`6_revit/`** folder.

### 9a. Shipping a rebuilt DLL (repeat this every time)

Steps 1–2 run fine **on the phone**; only 3–4 need the Revit box.

1. **Rebuild.** Copy the project into a scratchpad **off `/storage`** (a build in place leaves the
   in-repo `obj/` stale, and FUSE storage misbehaves), then:
   `export DOTNET_GCHeapHardLimit=0x60000000 DOTNET_EnableWriteXorExecute=0` and
   `/root/dotnet/dotnet build -c Release -p:EnableWindowsTargeting=true`.
   The post-build `xcopy` MSB3073 warning is the Windows-only deploy step — expected and harmless.
2. **Verify the embed before copying anything back** — extract the resource by its length prefix and
   hash it (snippet in §5). A fresh build sha is *not* proof the right map went in. Then copy the DLL
   to **both** carry copies (`bin/Release/`, `deploy/DEDARMS/`) and confirm by sha.
3. **Install:** delete any stale `SLDGenerator2A.*` from `%APPDATA%\Autodesk\Revit\Addins\2025\`
   first, then copy the DLL + `DEDARMS.addin` (fix the manifest `<Assembly>` path). Verify the
   installed file by sha against the manifest before launching Revit.
4. **Runtime-verify:** load a hospital `__WITH_GEOMETRY.json` via Browse → Generate, confirm the panel
   reports placed/skipped counts and no hard-fail; run the `test_fixtures/` malformed JSONs and
   confirm each degrades to a warn/skip (no crash, no rollback). Export the run report + placement CSV
   and bank them.
5. **Update state:** re-bless the DLL sha in `current_state_manifest.json` here, **and** the add-in
   `CLAUDE.md` "Current shipping DLL sha256" line **in the toolkit repo**, then re-run
   `sync_gate.mjs` here for **14/14** and `bash 08_validation/run_toolkit_gates.sh` **there**.
   ⚠️ **The two are checked in different repos and neither can see the other — you must run both.**

> 🚩 **STEP 5 READ "re-run `sync_gate.mjs` for 24/24. Forgetting the CLAUDE.md line turns P5 red"
> UNTIL 2026-08-03** (audit **A8d / D8**, swept by **FU-0014**). **Both halves were wrong.** Live
> sync is **14/14** (derived by running it), and **P5 no longer reads the add-in `CLAUDE.md` at
> all** — Phase 7b deleted that check with the add-in. The three surviving `[P5]` checks are all
> local (viewer `<meta revision>`, `README_engine.md`'s `internal rev` header, root `CLAUDE.md`'s
> `` `sld_engine.mjs` rev **X** ``). **The check that catches a forgotten add-in `CLAUDE.md` sha is
> the toolkit repo's `[T7]`.** Forgetting it now turns **nothing** red on this side.

> ⚠️ **`DEDARMS.Tests` IS NOT IN THIS REPO** — it left with the add-in on 2026-07-31 (derived:
> `ls tests/` → *No such file or directory*). Its build procedure lives in the **toolkit repo**;
> see that repo's `docs/ops_build_and_test.md` and `tests/DEDARMS.Tests/README.md`.
> 🚩 **The three-level golden climb this banner used to cite is ALSO GONE** (audit **D7**): the
> csproj's `:91` now reads `<None Include="..\fixtures\hospital_golden.json"` — a **one-level**
> reference to a fixture copied inside the toolkit repo, verified in both trees 2026-08-03. It still
> must build **in place**, but for a different and stronger reason: it has **no `ProjectReference`**
> and source-links **21** production files via two-level `<Compile Include="..\..\src\…">` paths, so
> an off-repo copy raises **42 × CS2001 and never reaches MSB3030 at all**. See **FL-0004 (toolkit)
> §4.1** for the derivation. ⚠️ **The stale line number `:91` still resolves** — which is why the
> claim survived: cheap re-derivation *confirms* a false statement. Anchor to a string, not a number.

### 9b. What remains

Two registers, read both. `10_failure_log/failure_register_V1_0_0.md` is **what is wrong and unfixed**;
`11_future_updates/update_register_V1_0_0.md` is **what is next, prioritized**.

Open failures:

- **FL-0002** — engine `BOX` and its C# `SymbolDims` mirror carry unmeasured sizes for L1-5 and L3-2,
  now disproved by the measured families. Its §5 carries the design for the still-owed **FamilyMeasurer
  cross-check preflight**, which is the regression guard for this whole class of drift (→ FU-0001).
- **FL-0003** — 27 vertical A-1 tags measure a zero align correction; probably correct, settle by eye.
- **FL-0004** — six files cite a family-dimensions CSV path that never existed; fold into FL-0002.

Forward register — ready to start today, in order: **FU-0002** (git, S), **FU-0001** (FamilyMeasurer
cross-check, M), **FU-0005** (specify the Revit coordinate transform, M). Everything else is either
`XL` or blocked on the Revit box, an EOR decision, or family authoring. All seven seeded entries are
`proposed`, not accepted.

---

## 10. Additional recommendations

- **Initialize git now.** The single biggest hazard today is `rollback.method: NONE` — one bad edit
  has no undo but a manual tar. `git init` + an initial commit removes that hazard and enables
  worktrees (§8). The manifest already says "Git is planned to own history + rollback going forward."
  Tracked as **FU-0002** (P1, S, ready).
- **Read both registers before starting work.** `10_failure_log/failure_register_V1_0_0.md` is the
  running index of what is known-broken and what is merely known-odd (three of its four entries are
  open — §9b); `11_future_updates/update_register_V1_0_0.md` is the prioritized index of what is not
  built yet. Sort the second one by readiness, not just priority — a `blocked:windows-revit-box` P1
  cannot be tonight's work and a ready P2 can.
- **Keep the family-map trio locked together:** both JSON copies byte-identical + the xlsx, always in
  one change-set. `sync_gate` phase 1 enforces the two copies; the xlsx is on your discipline.
- **Re-run `sync_gate.mjs` after every edit that touches a duplicated artifact** (family map, engine,
  viewer, doc anchors). It's fast and it's the only automated drift net.
- **Trust the topology; suspect the renderer.** The overwhelming majority of drawing defects are
  layout/renderer bugs, not topology errors — start debugging there. The failure-pattern taxonomy
  (classes A–J) is owned by `project_instructions_V1_0_0.md` §9.6.
- **Never edit the golden oracle** (`09_tests/Hospital Example (Golden Case)/…`) to make a divergence
  go away. Fix the engine, re-gate, re-bless intentionally. (Canonical: `project_instructions` §9.5.)
- **The symbol catalog is the visual master.** If a symbol's appearance is disputed, the catalog
  (`02_specs/visual_reference/sld_catalog_V1_0_0.html`, gate G9) wins — align the engine to it.

---

## CHANGELOG

| Version | Date | Change Summary |
|---------|------|----------------|
| V1.0.0 | 2026-07-25 | **New `11_future_updates/` folder** — the forward register, mirroring `10_failure_log/` (README + copy-me template + `FU-XXXX` register), prioritized `P0`–`P3` with Effort and **Readiness**; seeded with seven `proposed` entries drawn from the `CLAUDE.md` §11 known-gaps list and the open FL pointers. State surfaces **three → four** (§1); §9b now names both registers and leads with what is ready to start; the §10 git recommendation and the status line cross-reference the new entries. |
| V1.0.0 | 2026-07-25 | Add-in runtime-verified on Revit 2025 and the DLL rebuilt into map lockstep. §1a retitled and rewritten (stale-embed discrepancy → lockstep, with the re-bless ritual); §9 rewritten from a one-time task into a repeatable ship-a-DLL recipe + a "what remains" pointer at `10_failure_log/`; status line, the two `KNOWN-STALE` mentions in §4/§5 and the §10 FL-0001 recommendation all corrected. **Trip numbers removed from this doc** — dates and the failure log carry the provenance instead. |
| V1.0.0 | 2026-07-25 | `sync_gate` P1 DLL-embed check rewritten (containment probe → extract-and-sha, split into honesty + lockstep assertions, both mutant-proved); suite 15 → **16 checks**, counts updated throughout; §1a rewritten to describe the working gate; the "fix the probe" recommendation retired from §10. |
| V1.0.0 | 2026-07-25 | Initial release. Moved into `00_Docs/` from a working draft. Corrections vs. the draft: `--no-png` also skips G7; §3a decision-authority and the golden-oracle / failure-pattern prose replaced with Canonical pointers to `project_instructions_V1_0_0.md`; inline shas removed in favour of the manifest; CLAUDE.md size estimate corrected (~92 KB / 20–25k tokens, was "~50k tokens"); **new §1a** recording the byte-verified stale DLL embed and the `sync_gate` false green, with the §10 `FL-0001` recommendation corrected accordingly. |
