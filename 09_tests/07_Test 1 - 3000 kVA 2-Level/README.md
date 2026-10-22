# Test 1 — 3000 kVA, commercial, 1 sheet, first run clean

> **Canonical:** `09_tests/README.md` owns the standard project structure; this file describes only
> this project. Repo operations → `00_Docs/repo_runbook_V1_0_0.md`.

**Service** 3000 kVA / 480Y-277V, 4000 A GFP main · **Occupancy** commercial (assumed), NEC 2023 ·
**Sheets** 1 (S1 / E-501) · **Status** `in progress` — 3 Tier-3 halts open, so it cannot graduate

Stated scope (2026-10-22): *3000 kVA service, 5 lighting branches, 2 power, 3 mech, 2 levels.*
Each branch is one switchboard feeder serving a two-level riser (L1 head panel → L2 panel,
plumb); the power branches step down through 150 kVA 480Δ-208Y/120V transformers. The full
breaker table and every Tier-2 default is in `1_source/test1_SLD_narrative_V1_0_0.md`.

Device, routed and annotation counts and the engine rev are **not restated here**: the newest run in
[`3_output/RESULTS.json`](3_output/RESULTS.json) is the record.

---

## 1. Run it

```bash
cd "09_tests/07_Test 1 - 3000 kVA 2-Level"
bash run_pipeline.sh          # phone storage is noexec — bash, never ./
```

One hand-edited input, `1_source/<p>_build_topology.mjs`. Everything under `2_build/` and
`3_output/` is regenerated from it and safe to delete.

⚠️ **`--out` is mandatory on every ad-hoc `snapshot_html.mjs` call.** Its default is a *sibling of the
HTML*, so an omitted `--out` writes to `2_build/snapshots/` and every checker then reports 0 findings
across 0 sheets — indistinguishable from a clean run. Stage 7 asserts the SVG count for this reason.

⚠️ **Do NOT run `../../run_all_gates.sh`.** That suite is engine regression against the hospital
golden. This project touches no engine code, so it cannot move those gates. **The pipeline is the
check.**

---

## 2. Files

| File | Role |
|------|------|
| `1_source/<p>_SLD_narrative_V1_0_0.md` | the intake narrative |
| `1_source/<p>_build_topology.mjs` | **the only thing you edit** — `LAYOUT_CONFIG` lives here |
| `2_build/<p>_SLD_topology_V1_0_0.json` | **generated** — edit the build script, not this |
| `2_build/<p>_layout_config.json` | **generated** — the sidecar; an identical copy is embedded in the topology |
| `2_build/<p>_geom_block.json` | **generated** — the BARE geometry block, not a merged topology |
| `2_build/<p>_SLD_topology_V1_0_0__WITH_GEOMETRY.json` | **generated** — topology + `geometry{}`; what Phase 3 validates |
| `2_build/<p>_sld_viewer_V1_0_0.html` | **generated** — reference viewer with this topology inlined |
| `2_build/run.log` | **generated** — every stage, unfiltered; what stage 14 parses |
| `3_output/sheets/` | per sheet × theme SVG+PNG + `manifest.json` + `audit.json` |
| `3_output/pages/` | composed Arch E1 (title block + drawing), `__page` suffix |
| `3_output/zoom/` | investigation crops — filenames self-document the region |
| `3_output/RESULTS.json` | **generated** — per-run counts; diff this instead of re-reading phase docs |
| `4_checks/` | the ungated checkers — see §3 |
| `5_docs/HANDOFF_<p>.md` | **resume here** |
| `6_revit/` | add-in run report + placement CSV |
| `7_revisions/REVISIONS.md` | every change requested after generation |
| `ACCEPTANCE.md` | criteria + what measures each one |
| `OPEN_ITEMS.md` | **generated** — the Tier-3 halts the EOR still owes |

The organizing axis is **"can I delete this and regenerate it?"** `1_source/` is authored,
`2_build/` is disposable, `3_output/` is what you look at or hand to someone.

---

## 3. The checkers — why they exist

⚠️ **A clean checker run is not a clean drawing.** Every one of these exists because something
passed 63 rules and 0 errors while being visibly wrong.

| Stage | Tool | Sees what nothing else does |
|---|---|---|
| 8 | `check_feeder_overlaps.mjs` | collinear feeder-on-feeder overlap · exits outside the parent box |
| 9 | `trace_feeders.mjs` | feeder × feeder right-angle crossings |
| 10 | `check_symbol_clash.mjs` | feeder through its own symbol · tag on symbol · feeder through A-8 text |
| 11 | `check_tag_feeder_clash.mjs` | tag pill sitting on a feeder run (HARD/TIGHT) |
| 12 | `check_level_bands.mjs` | devices in the wrong band · level line through a panel |
| 12b | `check_tick_detach.mjs` | A-1 tick left floating after its pill moved across the run (FL-0008) |
| 13 | `check_page_scale.mjs` | the REAL composed scale — the pipeline's own `s_pred` is clamped at 1 |
| — | `probe_region.mjs` | what is already occupying a region you want to move a tag into |
| 4, 6, 7 | `pipeline_steps.mjs` | not a checker — merge geometry · rebuild the viewer · count sheets (FL-0027) |

`4_checks/check_lib.mjs` is the only file in that folder that works out a path for itself; ten
others open the project through it. Two of those ten are generators rather than checkers:
`make_open_items.mjs` (stage 2b) and `make_results.mjs` (stage 14). The exception is
`pipeline_steps.mjs`: it does not use `check_lib.mjs`, and `run_pipeline.sh` hands it every path as
its own argv (FL-0027).

---

## 4. Registers this project touched

| ID | Title | Status |
|----|-------|--------|
| _None._ | No engine change, no FL/FU entry — composed entirely from existing config keys (OFF-009, OFF-027). | — |

---

## 5. Graduation status

Per `06_deliverables/README.md`, five criteria. Current state:

- [x] Validation P1+P2 green
- [x] Layout + Preflight P3 green (**63 rules** — 55 means `layout_config` went sidecar-only)
- [x] Renders clean — no silent-skip fallback boxes; overflow resolved or accepted in `DELIVERY.md`
- [ ] EOR sign-off recorded — ⚠️ **blocked while `OPEN_ITEMS.md` §1 is non-empty**, by definition
- [ ] Drawing quality measured — `4_checks/` clean (or every exception named in `DELIVERY.md`),
      `OPEN_ITEMS.md` §1 empty. Criteria 1 and 2 are exit codes; this one is the drawing.

---

## Naming

`<p>` is the project slug (`metadata.slug`), used as the filename prefix throughout — the pipeline
takes it from the build script's own filename and the checkers take it from the topology, so the two
cannot drift. Per-project instance docs are unversioned; only shared templates carry `_V1_0_0`.
