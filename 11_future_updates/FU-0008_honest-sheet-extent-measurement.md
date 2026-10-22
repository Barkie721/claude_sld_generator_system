# FU-0008 — Measure a transformed group by its real geometry, so every sheet composes at the scale its content deserves

> ⚠️ **EVIDENCE ARCHIVED 2026-07-28.** This entry cites paths under `09_tests/` that no longer
> exist: the **9-Story Hospital - 2x2000 kVA** project folder — `REDESIGN_hosp9.md`'s acceptance table
> (0.35–0.46 every sheet, spread ≤ 1.25×) and its `check_page_scale.mjs` — was deleted on 2026-07-28 at Mayo's instruction.
> The finding itself is unaffected — ⚠️ **the `Blocks` field of this entry named that acceptance table, so this update no longer has a
> stated blocker on disk.** The engine defect it proposes to fix is real and unchanged; re-scope the
> `Blocks` field against a new exercise case before picking this up. The implementation hint —
> `check_page_scale.mjs` already parses the snapshot SVGs — now points at
> `09_tests/_PROJECT_TEMPLATE/4_checks/check_page_scale.mjs`.
> To re-read the evidence, restore from the pre-delete repo tarball (the only copy; there is no
> git): `/storage/emulated/0/Download/sld_snapshot_pre-delete-09tests_2026-07-28.tgz`.
> Context and what the delete cost: `09_tests/README.md`.

| Field | Value |
|-------|-------|
| **ID** | FU-0008 |
| **Title** | honest sheet extent — replace `measureMarkupExtent`'s number-scrape radius with a real child-geometry scan |
| **Proposed** | 2026-07-27 |
| **Proposed by** | `Claude` |
| **Status** | **`shipped` 2026-08-01** — engine rev 1.0.15, golden refreeze batch 2 |
| **Priority** | `P1` |
| **Effort** | `M` |
| **Readiness** | `ready` |
| **Category** | `engine` |
| **Stage** | 6 Render/Revit |
| **Component** | `04_renderer/sld_viewer_engine_V1_0_0.html` — `measureMarkupExtent()` step 1 |
| **Decision tier** | `Tier 2 default+override` — it is a drafting-quality change, not an electrical one |
| **Golden impact** | **`golden-visible (re-freeze required)`** |
| **Schema impact** | `none` |
| **Version bumps** | engine rev + `sld_engine.mjs` regen + golden viewer byte-copy + `current_state_manifest.json` + `README_engine.md` + root `CLAUDE.md` L97 |
| **Gates affected** | **G5, G6 (baselines move — deliberate re-bless)**; G1/G8/parity/sync unaffected |
| **Depends on** | FL-0007 |
| **Blocks** | the `REDESIGN_hosp9.md` acceptance table (0.35–0.46 every sheet, spread ≤ 1.25×) |
| **Target** | backlog — Mayo's call on timing, because it re-freezes the golden |

---

> # ✅ SHIPPED 2026-08-01 — engine rev 1.0.14 → 1.0.15
>
> **Read this block before §1; the body below is the proposal as written 2026-07-27 and is left
> unedited so the plan can be judged against what happened.**
>
> ### What shipped
> Steps 1-3 of `measureMarkupExtent` moved into `_mmeScan`, the same shape/text math walked under a
> real transform stack (`_mmeTransform` / `_mmeMul`). A transformed `<g>` is measured by its actual
> children with the full transform composed, recursively. **§2's "either apply the full transform,
> or bound the rotated child box by its circumscribed extent" — the full transform was applied**;
> only `circle`/`ellipse` fall back to a circumscribed box, and no renderer emits a rotated one.
>
> ### The four acceptance criteria, answered
> | §4 criterion | result |
> |---|---|
> | `--gate` on the golden: 0.0000 px, 0 mismatches | ✅ **0.0000 px, 0 mismatches** |
> | viewBox − 120 px pad == true ink, ±2 px, every sheet | ✅ **0.00 px on all four sides**, golden S1/S2 + both live projects |
> | no sheet's viewBox grows | ✅ every pennant-bearing sheet shrank; the pennant-free one is **byte-identical** |
> | `--audit out_of_frame` stays 0 | ✅ **0** on every sheet of every project |
> | G5/G6 re-blessed deliberately, PNGs eyeballed, recorded in the manifest | ✅ `artifacts.png_baselines.refreeze_batch_2` |
> | `check_page_scale.mjs` golden reference + header note updated | ✅ S1 0.5662 / S2 0.4841, and the header now says the old numbers were phantom-inflated |
>
> ### ⚠️ Three things this entry got WRONG, corrected by measurement
> 1. **§4 criterion 2 named four projects. One still exists.** "The 5-story", "the clinic" and the
>    9-story hospital are all gone from `09_tests/`. Re-scoped to what is on disk — the golden
>    (2 sheets), `Default 2500 kVA Service` (1) and `Sprouts Office Building - 2000A` (1), **4
>    sheets total, not 4 projects.** Said out loud rather than quietly testing fewer things.
> 2. **§6 said the regression guard belongs in `09_tests/9-Story Hospital - 2x2000 kVA/check_page_scale.mjs`.
>    That folder does not exist.** It landed in `_PROJECT_TEMPLATE` (the copy that propagates), in
>    both live projects, **and** — because the golden is the artifact this entry re-freezes and no
>    project pipeline covers it — in the suite-invoked `behavior_test.mjs`. The measurement itself
>    lives **once**, in `08_validation/lib/ink_extent_V1_0_0.mjs`.
> 3. **§5's blast-radius list said "every committed snapshot PNG in all four project folders and
>    the golden".** Measured: **`Default 2500 kVA Service` did not move at all** — it carries no
>    A-4 pennants, so its viewBox is byte-identical (`-634 2738 2404 2352`). FL-0007 §6a had already
>    corrected this ("only sheets carrying A-4 tags move"); §5 was never updated to match. That
>    sheet became the control case for the whole change.
>
> ### What was deliberately left undone
> - **The acceptance targets** (0.35–0.46, 0.0455 in, "every sheet height-bound"). §3 forbids
>   re-tuning them here and §7 defers them; raised as **FU-0013**. Both live projects now report
>   `out_of_band=1` against the stale band, expectedly.
> - **The title-block template's byte-copy of the same heuristic**, dormant by construction —
>   **FL-0024**, open by choice, with the reasoning recorded in `drift_surfaces` §7.
> - **`_auditFrameBox`'s 1 px workaround** for the old inflation still stands. Its comment was
>   corrected; removing the workaround would change `out_of_frame` findings, which is a behaviour
>   change this change-set had no business making.
>
> ### Evidence
> Suite green **twice**, with PNGs: **13/13 · sync 14/14 · names 14/12 · behavior 52/52**.
> Full record: `12_handoff/HO-0026`.

---

## 1. Problem

Full measurement in **FL-0007**; the short version: `measureMarkupExtent()` bounds every
`<g transform="translate(…)">` with a ±r square where **r is the largest number appearing anywhere in
that group's markup**. An A-4 fault-current pennant's markup contains its own tag text and
`font-weight="700"`, so a pennant reading "41,837A" claims a **±837 px** square around its anchor and
even a digit-free one claims **±700 px**, against true geometry of roughly ±100 px.

Cost, measured on the 9-story hospital: sheet S1A's drawn content is 6,425 px tall and its viewBox is
7,850 — **1,405 px, 18 %, of pure artifact**, and both the top and bottom of the box are set by
pennants rather than by ink. Composed scale is `2688 / (vbH − 240)`, so the sheet composes at 0.3532
where its content justifies ~0.403, and 11 px body text lands at 0.0405 in instead of ~0.046 in.

It has already cost real time: `REDESIGN_hosp9.md`'s sheet-height model predicts *drawn* height
accurately (Phase 4's S1A came in 258 px better than modelled) yet its scale gates were missed by
13 %, and two phases of planned targets (Phase 5's S3A ≈ 0.429, Phase 6's S2 ≈ 0.366) are
unreachable as written for the same reason.

## 2. Proposed change

Bound a transformed group by its **actual child geometry**: recurse the existing shape/text scan
(steps 2–3 of the same function) into the group's inner markup with the translate applied, instead of
scraping numbers out of the markup string. Handle the rotate/scale the pennants carry — either apply
the full transform, or bound the rotated child box by its circumscribed extent, which is still an
order of magnitude tighter than today.

The `< 10000` clamp in the current code is the tell that the author already knew the scrape was
picking up non-coordinates; this replaces the heuristic rather than tuning it.

## 3. Scope

**In:** `measureMarkupExtent()` step 1 only. Both consumers inherit the fix — `snapshotCore()` (the
per-sheet viewBox) and `pageCore()` (the composed Arch E1 transform).

**Out (non-goals):**
- No layout change. **Nothing may move**: same anchors, same vertices, same ink. This entry re-frames
  the sheet, it does not re-draw it. If G1 moves off 0.0000, the change is wrong.
- Not a re-tune of any `layout_config` key, pitch or nudge to "use" the recovered space.
- Not a revision of the acceptance targets. Those are §7 follow-up, once the true numbers exist.

## 4. Acceptance criteria

- [ ] `run_layout.mjs --gate` on the golden: **max deviation 0.0000 px, 0 mismatches** — the fix must
      not move a single anchor or vertex.
- [ ] For every sheet of the golden, the 5-story, the clinic and the 9-story: emitted `viewBox` minus
      the 120 px pad equals the true extent of the drawn `<rect>`/`<text>`/`<line>`/`<polyline>`/
      `<polygon>`/`<path>` ink, within ±2 px.
- [ ] No sheet's viewBox grows. (The current radius is an over-estimate in every direction, so every
      sheet should shrink or stay put; a growth means the recursion missed a child.)
- [ ] `--audit` `out_of_frame` stays 0 on every sheet — the tighter frame must not clip ink.
- [ ] G5/G6 re-blessed **deliberately**, with the before/after PNGs eyeballed side by side, and the
      re-bless recorded in `current_state_manifest.json`.
- [ ] `check_page_scale.mjs`'s golden reference line updated to the new true numbers, and its header
      note explaining that the old 0.4454/0.3972 were phantom-inflated.

## 5. Blast radius

**The golden re-freezes.** This is the whole reason the entry exists instead of the fix: G5 and G6
compare PNGs against baselines rendered *with* the phantom, so they are self-consistent today and
will both go red on the first correct render. That is expected and must be a deliberate re-bless, not
a "gate is flaky" reflex.

Everything downstream of a viewBox moves with it:
- every committed snapshot PNG in all four project folders and the golden;
- the composed-page `scale()` values `REDESIGN_hosp9.md`'s verification step greps for;
- `check_page_scale.mjs`'s golden reference and the acceptance band derived from it — the band
  0.35–0.46 was chosen against the golden's inflated 0.4454, so it needs restating, not reusing;
- the "11 px body text ≈ 0.0455 in" bar, same reason.

**Not** affected: the topology, the schema, `geometry{}` (no exported key changes shape, so G8 is
safe), the family maps, the add-in. The Revit placer consumes anchors and vertices, which do not move.

## 6. Verification plan

**Before:** full `bash run_all_gates.sh` **with PNGs** (never `--no-png` — this is a purely visual
change, so the PNG gates are the only net that sees it) plus `node 08_validation/sync_gate.mjs`, to
establish that the suite is green on the pre-change tree. Record the current viewBox of every sheet
of every project — that table is the evidence for the acceptance criteria.

**After:** `--gate` on the golden first and alone (0.0000 or stop). Then the viewBox-vs-ink assertion
across all four projects. Then re-bless G5/G6 and re-run the full suite twice — the first run after a
rev bump is a known false red (FL-0006).

**Regression guard, ships WITH the fix:** the viewBox-vs-ink assertion, added to
`09_tests/9-Story Hospital - 2x2000 kVA/check_page_scale.mjs` (it already parses the snapshot SVGs
and already owns the composed-scale question; today it has no opinion on whether the frame is
honest, which is exactly how this escaped). See FL-0007 §6 for why every existing gate was blind.

## 7. Follow-up once the true numbers exist

Restate `REDESIGN_hosp9.md`'s acceptance band and the golden reference against measured geometry
rather than against the phantom, and re-derive the Phase 5/6 sheet targets. Until this ships, those
phases should budget the artifact explicitly: **`s ≈ 2688 / (drawn_height + 1400 + 240)`**.
