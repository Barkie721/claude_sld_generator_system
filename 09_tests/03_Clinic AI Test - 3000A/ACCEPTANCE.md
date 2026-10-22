# Clinic AI Test — 3000A — acceptance criteria, and what measures each one

> **Canonical:** `06_deliverables/README.md` owns the five graduation criteria; this file tracks
> drawing-quality criteria for this project and names the tool that proves each.

⚠️ **A clean checker run is not a clean drawing.** Every tool below exists because something passed
63 rules and 0 errors while being visibly wrong.

⚠️ **A row with a blank `measured by` is not a criterion — it is a wish.** One project carried
"A-1 tick off its own feeder 27→0" for seven phases with nothing measuring it; it had been counted by
eye once and the true count was **31**. Fill the column or delete the row.

Fill `current` from `3_output/RESULTS.json` after every run — the key names below match its `checks`
and `page_scale` objects exactly, so this table is a transcription, not a re-measurement.

---

## 1. Contract + validation

| criterion | target | current | measured by |
|---|---|---|---|
| Phase 1+2 clean | 0 errors, 0 warnings | 0 errors, 0 warnings ✅ | `validate_topology_V1_0_0.mjs` (stage 2) |
| Phase 3 SH rules ran | **63 rules** (55 = capability-skip) | 63 rules, 0 errors, 0 warnings ✅ | `validate_topology_V1_0_0.mjs` (stage 5) |
| No silent drops | 0 `DROP` in `layout_warnings` | 0 ✅ | stage 4 merge report |
| Coverage | every entity rendered | 340/340 ✅ (F-305 + its A-1/A-2 are intentional skips, R-009) | `3_output/sheets/manifest.json` per-capture `coverage` |
| Nothing dropped at render | `dropped_entity` 0 | 0 ✅ | `3_output/sheets/audit.json` `counts` |

## 2. Geometry

| criterion | target | current | measured by |
|---|---|---|---|
| Collinear feeder overlap | 0 | 0 ✅ | `check_feeder_overlaps.mjs` (8) — `collinear_h` + `collinear_v` |
| Exits outside the parent box | 0 | 0 ✅ | `check_feeder_overlaps.mjs` (8) — `exits_outside` |
| Feeder × feeder crossings | 0 | 0 ✅ | `trace_feeders.mjs` (9) — `feeder_x_feeder` |
| Feeder through own symbol | 0 | 0 ✅ | `check_symbol_clash.mjs` (10) — `through_symbol` |
| Tag on symbol | 0 | 0 ✅ | `check_symbol_clash.mjs` (10) — `tag_on_symbol` |
| Feeder through A-8 text | 0 | 0 ✅ | `check_symbol_clash.mjs` (10) — `through_text` |
| Tag × feeder HARD | ≤ 1 | 1 (by design: utility A-4 apex on the secondary drop) ✅ | `check_tag_feeder_clash.mjs` (11) — `tag_feeder_hard` |
| Level line through device | 0 | 0 (no level lines — one storey) | `check_level_bands.mjs` (12) — `line_through_device` |
| Devices out of band | 0 | 0 (n/a) | `check_level_bands.mjs` (12) — `out_of_band` |
| Datum gap 180 ± 250 px | 0 outside | 0 (n/a) | `check_level_bands.mjs` (12) — `band_outside` |
| A-1 tick detached | 0 | 0 ✅ | `check_tick_detach.mjs` (12b) — `tick_detached` |

> ⚠️ `band_outside` and `out_of_band` are different questions. `out_of_band` is band **membership**
> (is the device between the right two lines); `band_outside` is the **datum gap** — how far its
> bottom edge sits from its own line. A device can be in the right band and 900 px off its datum.

## 3. Legibility

| criterion | target | current | measured by |
|---|---|---|---|
| Composed scale, every sheet | 0.35–0.46 | 1.00 / 1.00 ❌ (sparse one-storey sheets render below the band floor — not a density problem) | `check_page_scale.mjs` (13) — `out_of_band` |
| Set spread | ≤ 1.25× | 1.00× ✅ | `check_page_scale.mjs` (13) — `spread` |
| Every sheet height-bound | true | false (S1 width-bound) | `check_page_scale.mjs` (13) — `all_height_bound` |
| Sheet count | ≤ 6 | 2 ✅ | manual |

> Golden reference: **S1 0.5662 · S2 0.4841 — spread 1.17×**, with 11 px body text landing at
> ~0.0554 in on paper (S2). Judge a new set against those. ⚠️ **These numbers MOVED on 2026-08-01
> (engine rev 1.0.15, FU-0008).** They read S1 0.4454 · S2 0.3972 · spread 1.12× · ~0.0455 in
> through rev 1.0.14, and every one of those was inflated by the `measureMarkupExtent` phantom
> radius FL-0007 describes — the golden carried the same defect as every other sheet, which is
> precisely why comparing against it looked fair. ⚠️ **The 0.35–0.46 TARGET above has NOT been
> restated and is now known-stale**: it was chosen against the inflated 0.4454, so an honest sheet
> can sit above it and report out-of-band for no reason but the band. Restating it is **FU-0013**,
> deliberately deferred — FU-0008 §3 forbids re-tuning targets in the change-set that moved the
> measurement. ⚠️ **"Every sheet height-bound" is likewise no longer true of the golden**: honest S1
> is 6174 × 4949.59, so it is now WIDTH-bound. Judge a new set against those. ⚠️ Measure scale from the SVG viewBox, never
> from SH-2b's `s_pred` — that value is **clamped at 1**, so a sheet reported "1.00" can compose at
> 0.64.

## 4. Delivery

| criterion | target | current | measured by |
|---|---|---|---|
| Tier-3 halts resolved | 0 | | `OPEN_ITEMS.md` §1 (stage 2b) |
| Placeholder values resolved | 0 | | `OPEN_ITEMS.md` §3 (stage 2b) |

## 5. Criteria with NO automated guard

List anything judged by eye. Being here is a standing invitation to write a checker — that is exactly
how `check_tick_detach.mjs` came to exist, one project too late.

| criterion | why unguarded | who judged it | when |
|---|---|---|---|
| | | | |

---

## Naming

`measured by` takes only the repo's real provers: gates `G1`, `G5`–`G9`, `sync`, `parity`,
`behavior`, `acceptance`, `conformance`, `gen-idempotent`; stage checks
`validate_topology_V1_0_0.mjs`, `run_layout.mjs --gate`, `snapshot_html.mjs --audit`; the **seven**
checkers in `4_checks/` (stages 8–13); or the literal word `manual` with §5 filled in. Anything else
is a wish. ⚠️ `probe_region.mjs` is **not** a valid value — it answers "what is already here", which
is investigative, not a pass/fail measurement.
