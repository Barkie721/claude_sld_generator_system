# Sprouts Office Building — 2000 A service, office, 1 sheet, generated and measured

> **Canonical:** `09_tests/README.md` owns the standard project structure; this file describes only
> this project. Repo operations → `00_Docs/repo_runbook_V1_0_0.md`.

**Service** 2000 A / 480Y-277V, 2000 kVA utility transformer (derived) · **Occupancy** office, NEC 2023 ·
**Sheets** 1 (S1 / E-501) · **Rev** 1 · **Status** `in progress` — 3 Tier-3 halts open, so it cannot graduate

Device, routed and annotation counts and the engine rev are **not restated here**: the newest run in
[`3_output/RESULTS.json`](3_output/RESULTS.json) is the record. Diff two runs rather than trusting a
number in prose.

---

## 1. Run it

```bash
cd "09_tests/02_Sprouts Office Building - 2000A"
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
| 12c | `check_tag_spec.mjs` | **project-local (R-011).** A-1 pill displaced off its spec offset, or onto the wrong side of its run — invisible to stage 11 (proximity only) and to 12b (watches the tick) |
| 13 | `check_page_scale.mjs` | the REAL composed scale — the pipeline's own `s_pred` is clamped at 1 |
| — | `probe_region.mjs` | what is already occupying a region you want to move a tag into |
| 4, 6, 7 | `pipeline_steps.mjs` | not a checker — merge geometry · rebuild the viewer · count sheets (FL-0027) |

`4_checks/check_lib.mjs` is the only file in that folder that works out a path for itself; the
other eleven open the project through it — the template's ten plus the project-local
`check_tag_spec.mjs`. Two of those eleven are generators rather than checkers: `make_open_items.mjs`
(stage 2b) and `make_results.mjs` (stage 14). The exception is `pipeline_steps.mjs`: it does not use
`check_lib.mjs`, and `run_pipeline.sh` hands it every path as its own argv (FL-0027).

---

## 4. Registers this project touched

| ID | Title | Status |
|----|-------|--------|
| R-001…R-005 | `7_revisions/REVISIONS.md` — 5 compositor findings from the first-generation run | logged |
| R-006…R-012 | Mayo review 1 — 250 A plug panels, mechanical cluster redrawn, lineup cleanup, tag flips, tag-spec restore, routing improved | logged |
| R-012 | L2-2 `flex_left`/`flex_right` are spec'd, validator-legal and a documented Tier-2 override — but have **no renderer**; requests are silently ignored | **FL candidate** |
| R-003 | Cascade below an `internal_to` chain silently drops (placeSubFeeds runs before placeInternalChains) | **FL candidate** |
| R-004 | L2-2 label block always spans its parent's rising feeder | **FIXED in R-006** via `chain_dst_x_offset` |
| R-006 | Sub-feed `secondary_out` exit dives below the transformer even when its destination is above | **FL candidate** |
| FL-0007 | `measureMarkupExtent` phantom radius — 5 A-4 pennants on this sheet, each charging up to ±700 px | **FIXED 2026-08-01** by FU-0008 at engine rev 1.0.15: viewBox 4440×6697 → 4224×5372.59, composed scale 0.4162 → 0.5237, frame honesty 0.00 px all four sides. No device, vertex or glyph moved |

---

## 5. Graduation status

Per `06_deliverables/README.md`, five criteria. Current state:

- [x] Validation P1+P2 green — **0 errors, 0 warnings**
- [x] Layout + Preflight P3 green — **63 rules**, 0 errors, 0 warnings
- [x] Renders clean — **123/123 coverage** both themes, **0 drops**, `--audit` label_overlap /
      glyph_collision / out_of_frame all 0
- [ ] EOR sign-off recorded — ⚠️ **blocked**: 3 halts open (feeder distances · utility fault-current
      confirmation · connected-load schedule)
- [x] Drawing quality measured — **every geometry checker 0** and `--audit` fully clean as of
      run 23. The single remaining `tag_feeder_hard` is the by-design utility pennant and
      `band_outside` is the datum-gap artifact the golden shares; both named in `ACCEPTANCE.md` §2.
      Composed scale **0.5237** since FU-0008 (it was 0.4162 before; see §4), which
      `check_page_scale.mjs` reports as **`out_of_band=1`**. The sheet got better; the 0.35–0.46
      band was measured against the phantom-inflated golden and has not been restated — **FU-0013**.

---

## Naming

`<p>` is the project slug (`metadata.slug`), used as the filename prefix throughout — the pipeline
takes it from the build script's own filename and the checkers take it from the topology, so the two
cannot drift. Per-project instance docs are unversioned; only shared templates carry `_V1_0_0`.
