# Sprouts Office Building — acceptance criteria, and what measures each one

> **Canonical:** `06_deliverables/README.md` owns the five graduation criteria; this file tracks
> drawing-quality criteria for this project and names the tool that proves each.

⚠️ **A clean checker run is not a clean drawing.** Every tool below exists because something passed
63 rules and 0 errors while being visibly wrong.

⚠️ **A row with a blank `measured by` is not a criterion — it is a wish.**

Transcribed from `3_output/RESULTS.json` **run 33** (Mayo review 1, R-006…R-012), engine 1.0.14, 2026-07-29.

---

## 1. Contract + validation

| criterion | target | current | measured by |
|---|---|---|---|
| Phase 1+2 clean | 0 errors, 0 warnings | **0 / 0** | `validate_topology_V1_0_0.mjs` (stage 2) |
| Phase 3 SH rules ran | **63 rules** (55 = capability-skip) | **63** | `validate_topology_V1_0_0.mjs` (stage 5) |
| No silent drops | 0 `DROP` in `layout_warnings` | **0** | stage 4 merge report |
| Coverage | every entity rendered | **123/123, both themes** | `3_output/sheets/manifest.json` per-capture `coverage` |
| Nothing dropped at render | `dropped_entity` 0 | **0** | `3_output/sheets/audit.json` `counts` |

## 2. Geometry

| criterion | target | current | measured by |
|---|---|---|---|
| Collinear feeder overlap | 0 | **0 / 0** | `check_feeder_overlaps.mjs` (8) |
| Exits outside the parent box | 0 | **0** | `check_feeder_overlaps.mjs` (8) — `exits_outside` |
| Feeder × feeder crossings | 0 | **0** | `trace_feeders.mjs` (9) — `feeder_x_feeder` |
| Feeder through own symbol | 0 | **0** | `check_symbol_clash.mjs` (10) — `through_symbol` |
| Tag on symbol | 0 | **0** | `check_symbol_clash.mjs` (10) — `tag_on_symbol` |
| Feeder through A-8 text | 0 | **0** | `check_symbol_clash.mjs` (10) — `through_text` |
| Tag × feeder HARD | ≤ 1 (the by-design pennant) | **1** | `check_tag_feeder_clash.mjs` (11) — `tag_feeder_hard` |
| Level line through device | 0 | **0** | `check_level_bands.mjs` (12) — `line_through_device` |
| Devices out of band | 0 | **0 of 19** | `check_level_bands.mjs` (12) — `out_of_band` |
| Datum gap 180 ± 250 px | 0 outside | **6 of 19** ⚠️ | `check_level_bands.mjs` (12) — `band_outside` |
| A-1 tick detached | 0 | **0 of 24 ticks** | `check_tick_detach.mjs` (12b) — `tick_detached` |
| **A-1 pill off its spec offset** | 0 | **0 of 24** | `check_tag_spec.mjs` (12c) — `a1_off_spec` |
| **A-1 pill on the wrong side** | 0 | **0 of 24** | `check_tag_spec.mjs` (12c) — `a1_west_side` |

> ⚠️ `band_outside` and `out_of_band` are different questions. `out_of_band` is band **membership**
> (is the device between the right two lines); `band_outside` is the **datum gap** — how far its
> bottom edge sits from its own line. A device can be in the right band and 900 px off its datum.

### The non-zero readings, and why each is accepted

Mayo review 1 (R-006) cleared `collinear_v`, `exits_outside` and `through_text`
outright — the three below are all that remain.

| reading | value | why |
|---|---|---|
| `tag_feeder_hard` | 1 | The `UTILITY-XFMR` A-4 pennant vs F-301, gap −2.0 px. **By design.** The engine carries a golden-keyed special case on that literal designation (`FC_PENNANT_PLACEMENT`, engine L10058) anchoring the pennant apex *on* the secondary feeder drop — the secondary side is the canonical point-of-fault location. Same intentional geometry as an A-1 tick; the checker has no exclusion for it. Overriding to `{anchor:'top'}` clears the finding and moves the pennant to the **primary** side, which would be electrically misleading. Not fixed, deliberately. |
| `--audit` | all 0 | label_overlap / glyph_collision / out_of_frame / feeder_crossing all clean as of run 23. |
| `band_outside` | 6 of 19 | Datum gap, not membership (membership is 0). Levels R and 1 carry the tall clusters — the roof stack and the switchboard lineup — so their level line sits further from the nearest box bottom than the 180 ± 250 px target. The default 2500 kVA composition measures the same artifact at level 1, and so does the golden. |

## 3. Legibility

| criterion | target | current | measured by |
|---|---|---|---|
| Composed scale, every sheet | 0.35–0.46 | **0.4162** | `check_page_scale.mjs` (13) — `out_of_band` = 0 |
| Set spread | ≤ 1.25× | **1.00×** (single sheet) | `check_page_scale.mjs` (13) — `spread` |
| Every sheet height-bound | true | **true** | `check_page_scale.mjs` (13) — `all_height_bound` |
| Sheet count | ≤ 6 | **1** | manual |

> Golden reference: **S1 0.4454 · S2 0.3972 — spread 1.12×**, 11 px body text at ~0.0455 in on paper.
> This sheet lands at **0.0477 in**, inside the 0.0400–0.0490 acceptance band and slightly better
> than the golden's S2. Measured from the SVG viewBox, never from SH-2b's `s_pred` (clamped at 1).

> ### ⚠️ RECORDED BESIDE, NOT EDITED — 2026-08-01, engine rev 1.0.15 (FU-0008)
> **Every number in the table above and in the paragraph above it is a faithful transcription of
> run 33 at engine rev 1.0.14, and it is left exactly as written.** FU-0008 replaced
> `measureMarkupExtent`'s phantom radius (FL-0007) on 2026-08-01 and re-measured this project:
>
> | | run 33 (rev 1.0.14) | re-run (rev 1.0.15) |
> |---|---|---|
> | sheet viewBox | 4440 × 6697 | **4224 × 5372.59** |
> | composed scale S1 | 0.4162 | **0.5237** |
> | 11 px body text | 0.0477 in | **0.0600 in** |
> | bind | height | height |
> | frame honesty (new check) | not measured — the check did not exist | **0.00 px on all four sides** |
> | `out_of_band` vs the 0.35–0.46 target | 0 | **1** |
>
> **Nothing about the drawing changed** — no device, vertex, glyph or route moved, `--audit`
> `out_of_frame` stayed 0, and the 12 other stage checks are unchanged. The sheet got a smaller,
> honest frame and therefore composes larger.
>
> ⚠️ **The `out_of_band` = 1 is the TARGET being stale, not the sheet being wrong.** The 0.35–0.46
> band was chosen against the golden's own phantom-inflated 0.4454; an honest sheet legitimately
> sits above it. FU-0008 §3 forbids re-tuning targets in the change-set that moved the measurement,
> so restating the band is **FU-0013** and this row is expected to read out-of-band until then.
> **Do not "fix" it by re-tuning the layout.**

## 4. Delivery

| criterion | target | current | measured by |
|---|---|---|---|
| Tier-3 halts resolved | 0 | **3 open** ⚠️ | `OPEN_ITEMS.md` §1 (stage 2b) |
| Placeholder values resolved | 0 | **0** | `OPEN_ITEMS.md` §3 (stage 2b) |

Three unresolved halts means this project is `unreviewed` by definition and **cannot graduate to
`06_deliverables/`**. That is the correct state: HALT-001 (feeder distances), HALT-002 (utility fault
current / transformer impedance confirmation) and HALT-003 (connected-load schedule) are all EOR/
utility inputs that were never provided.

## 5. Criteria with NO automated guard

| criterion | why unguarded | who judged it | when |
|---|---|---|---|
| Riser columns read as four distinct plumb stacks | no checker measures "reads as a column" | Claude, from the composed page PNG + a 700×650 zoom on the mechanical cluster | 2026-07-29 |
| 45 kVA primary OCPD absent from the drawing | a documented-not-drawn OCPD is a representation choice, not a geometry fact | flagged to Mayo, undecided — see R-003 | 2026-07-29 |
| Fault-current values themselves | the pipeline places A-4 tags but never checks the arithmetic behind `fc_amps` | Claude, hand-derived; **unverified by any tool** | 2026-07-29 |

---

## Naming

`measured by` takes only the repo's real provers: gates `G1`, `G5`–`G9`, `sync`, `parity`,
`behavior`, `acceptance`, `conformance`, `gen-idempotent`; stage checks
`validate_topology_V1_0_0.mjs`, `run_layout.mjs --gate`, `snapshot_html.mjs --audit`; the **seven**
checkers in `4_checks/` (stages 8–13); or the literal word `manual` with §5 filled in.

> Requires review and seal by a licensed Professional Engineer before construction use.
