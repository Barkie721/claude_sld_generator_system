# FU-0013 — Restate the composed-scale acceptance targets against honest geometry, now that the true numbers exist

| Field | Value |
|-------|-------|
| **ID** | FU-0013 |
| **Title** | the 0.35–0.46 band, the 0.0455 in bar and "every sheet height-bound" were all measured with the phantom in place |
| **Proposed** | 2026-08-01 |
| **Proposed by** | `Claude` |
| **Status** | `proposed` |
| **Priority** | `P2` |
| **Effort** | `S` |
| **Readiness** | `ready` |
| **Category** | `docs/acceptance` |
| **Stage** | 4 Layout / 6 Render |
| **Component** | `09_tests/*/4_checks/check_page_scale.mjs` (`LO`/`HI`), `09_tests/*/ACCEPTANCE.md` §3 |
| **Decision tier** | `Tier 2 default+override` — a drafting-quality target, not an electrical one |
| **Golden impact** | `none` — this changes numbers in checkers and docs, not the engine |
| **Schema impact** | `none` |
| **Version bumps** | none |
| **Gates affected** | none. `check_page_scale.mjs` is **ungated by design** (stage 13 reports, it does not gate) |
| **Depends on** | FU-0008 (`shipped` 2026-08-01) — this is its §7 follow-up, and it could not be written before the true numbers existed |
| **Blocks** | any project trying to read `out_of_band` as a real signal |
| **Target** | backlog — Mayo's call, because it is a change to what "acceptable" means |

---

## 1. Problem

FU-0008 fixed `measureMarkupExtent` and every sheet's frame got smaller and honest. **The targets
those sheets are judged against did not move, and they were all derived from the inflated
numbers.** Three of them are now wrong in a way that produces confident, incorrect reports:

| target | where | why it is stale |
|---|---|---|
| composed scale **0.35–0.46**, every sheet | `check_page_scale.mjs` `LO`/`HI`, mirrored in three `ACCEPTANCE.md` §3 | chosen against the golden's phantom-inflated **0.4454**. Honest sheets legitimately sit above it |
| **11 px ≈ 0.0455 in** on paper, band 0.0400–0.0490 | same files | that is the golden S2 at **0.3972**. S2 now composes at **0.4841** = **0.0554 in** |
| **"every sheet height-bound" = true** | same files, and the "H = base + Σ(steps); s = 2688/H" planning formula rests on it | the golden's own **S1 is now WIDTH-bound**: honest S1 is 6174 × 4949.59, so s_width 0.5662 < s_height 0.5707 |

**Measured consequence today:** `Sprouts Office Building - 2000A` composes at **0.5237** and its
checker reports `out_of_band=1` — for a sheet that got *better*, on a project where nothing about
the drawing changed. `Default 2500 kVA Service` reports `out_of_band=1` too, but for the unrelated
pre-existing reason that it is a small sheet clamped at `s = 1.0000`.

> **A target that flags correct work is worse than no target**: the next session either re-tunes a
> good layout to satisfy it, or learns to ignore the column. Both are bad and the second is worse.

## 2. Proposed change

Re-derive the band and the on-paper bar from measured honest geometry, then restate them in the one
place that propagates (`_PROJECT_TEMPLATE`) and copy outward. Specifically:

1. Re-measure the golden and both live projects at engine rev ≥ 1.0.15 (the numbers in §1 are the
   starting set, all measured 2026-08-01).
2. Decide the band **from what legible drafting requires**, not from what the golden happens to
   score — the old band's flaw was that it was reverse-engineered from one artifact that carried a
   defect. The on-paper inches figure is the physically meaningful quantity; the scale is derived.
3. Replace `LO`/`HI`/`SPREAD_MAX` in `_PROJECT_TEMPLATE/4_checks/check_page_scale.mjs`, propagate to
   both live projects, and mirror into the three `ACCEPTANCE.md` §3 tables (the file says "mirror it
   in ACCEPTANCE.md §3" — honour that or delete the instruction).
4. Restate or retire **"every sheet height-bound"**. It is not a quality criterion, it is a
   precondition for one specific planning formula; say which, or drop the row per ACCEPTANCE.md's
   own rule that *"a row with a blank `measured by` is not a criterion — it is a wish"*.

## 3. Scope

**In:** `LO`, `HI`, `SPREAD_MAX`, the golden-reference line and the on-paper band in
`check_page_scale.mjs`; the mirrored §3 tables in the three `ACCEPTANCE.md`.

**Out (non-goals):**
- **No layout change.** Nothing here may move a device, a vertex or a pitch. If a sheet is out of
  the restated band, that is a finding to log, not a licence to re-tune it in the same change-set —
  the identical rule FU-0008 §3 imposed on itself.
- No engine change. The measurement is correct now; this is about the yardstick.
- Not a re-bless of anything. No PNG baseline is involved.

## 4. Acceptance criteria

- [ ] Every number restated is **derived by running the checker**, not carried from this file — §1's
      table is evidence from 2026-08-01 and will itself go stale.
- [ ] `_PROJECT_TEMPLATE` updated FIRST, then both live copies, then verified byte-identical
      (`sha256sum 09_tests/*/4_checks/check_page_scale.mjs` → one hash, three times).
- [ ] All three `ACCEPTANCE.md` §3 tables agree with the checker's constants.
- [ ] Any sheet that still reports out-of-band after the restatement is **named, with why** — a
      restated band that happens to make every current sheet pass has proved nothing.
- [ ] The Sprouts `ACCEPTANCE.md` "RECORDED BESIDE" block from 2026-08-01 gets its `out_of_band`
      row resolved, or an explicit note saying it stands.

## 5. Blast radius

Small and entirely advisory. `check_page_scale.mjs` runs as pipeline stage 13 and **reports**; it
gates nothing, and `RESULT page_scale …` feeds `RESULTS.json` for the record. No gate in
`run_all_gates.sh` reads any of these constants.

⚠️ **The one thing to be careful of:** `09_tests/Sprouts Office Building - 2000A/ACCEPTANCE.md`
carries a transcription of **run 33 at engine rev 1.0.14** that was deliberately left unedited, with
the FU-0008 delta recorded beside it. **Keep doing that** — restate the TARGET rows, do not rewrite
the historical CURRENT column.

## 6. Verification plan

Run both project pipelines end to end (`bash run_pipeline.sh`) and the golden's
`behavior_test.mjs`; read stage 13's table and the new §3 frame-honesty block. No PNG re-render is
needed and no baseline moves — if one does, something outside this entry's scope changed.

## 7. Why it was not done inside FU-0008

Because FU-0008 §3 forbade it, on purpose: *"Not a revision of the acceptance targets. Those are §7
follow-up, once the true numbers exist."* Moving a measurement and its yardstick in one change-set
leaves nothing to check either against — the re-bless becomes unfalsifiable. The numbers exist now.
