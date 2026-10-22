# FU-0016 — More than one lineup per sheet (the engine draws the FIRST and silently drops the rest)

> 📌 **Dated note, 2026-10-21 — `09_tests/3000A 208V Service` was removed** on Mayo's instruction
> (in git at `57383bf`, including the `OPEN_ITEMS.md` NOTE-007 cited below).
> `04_Clinic AI Test - 3000A - One Sheet` (NP + EM lineups on one sheet) still exercises the
> multi-lineup path. The body below is left as written.

| Field | Value |
|-------|-------|
| **ID** | FU-0016 (**SLD repo**) |
| **Title** | Let a sheet carry more than one switchboard, so a multi-lineup service can be drawn as one single-line instead of N sheets |
| **Proposed** | 2026-08-03 |
| **Proposed by** | Mayo — *"i want the 4 sheets combined into one single line instead"* (the 3000 A / 208 V service) |
| **Status** | **`SHIPPED 2026-08-03` — engine rev 1.0.17** (see §10) · geometry cleanup open |
| **Priority** | `P2` |
| **Effort** | `L` — engine layout change plus a new guard; **not a config edit** |
| **Readiness** | `ready` — no Revit, no Windows box |
| **Category** | `engine` · `validation/gates` |
| **Stage** | `design` |
| **Component** | `04_renderer/sld_viewer_engine_V1_0_0.html` (→ `sld_engine.mjs`) · `08_validation/` · `09_tests/3000A 208V Service` |
| **Decision tier** | **`Tier 2` — needs Mayo's drafting call on lineup order and spacing** |
| **Golden impact** | **MUST be `golden-inert` and must be PROVED so** — the golden has one lineup per sheet, so a correct change cannot move it. G1 must stay 0.0000 px with no baseline re-blessed |
| **Schema impact** | `none` expected — `switchboards[].sheet_id` already permits repeats; nothing in the schema forbids this |
| **Version bumps** | engine rev |
| **Gates affected** | G1 · G5–G7 · behavior · the 3000 A project pipeline |
| **Depends on** | — |
| **Blocks** | drawing any multi-lineup service as one single-line |
| **Target** | `next batch` |

> ⚠️ **ID NOTE — READ BEFORE CITING ANYTHING NEAR IT.** This entry is **FU-0016** because
> **`FU-0015` IS USED TWICE** in this repo, by two unrelated 2026-08-03 entries — the family-map
> coverage decision (cited by `HO-0028`) and the cross-sheet bus-tap guard gap (cited by `FL-0026`,
> the 3000 A `REVISIONS.md` and its narrative). **Both are cited externally, so neither can be
> renumbered without repointing live citations.** Not resolved here — it is Mayo's call. **Always
> say which FU-0015 you mean.**

---

## 1. Problem

**The engine resolves a sheet's lineup by taking the FIRST switchboard whose `sheet_id` matches, and
never looks for a second.** Derived, not inferred:

```
04_renderer/sld_engine.mjs:14318
    const sw = TOPO.switchboards.find(s => s.sheet_id === sheetId);
04_renderer/sld_engine.mjs:14493
    const srcSw = srcDev ? TOPO.switchboards.find(s => s.sheet_id === srcDev.sheet_id) : null;
```

`.find` — first match. **Put four lineups on one sheet today and the sheet draws one of them and
says nothing about the other three.**

🚩 **This is FL-0026's failure class, which shipped THIS WEEK:** a topology that validates clean,
renders, passes its geometry checks, and is missing electrical content that nobody was told about.
FL-0026 was a cross-sheet feeder into a lineup bus dropped with its NEC-non-negotiable A-1/A-2 tags.
**The difference here is scale — a whole lineup, not one feeder.**

**The repo already knows this and worked around it.** The 3000 A project's own ledger says so:

> `09_tests/3000A 208V Service/OPEN_ITEMS.md` — **NOTE-007**
> *"The layout engine resolves a sheet's lineup with `switchboards.find(s => s.sheet_id === sheetId)`,
> the FIRST match, so a second board on a sheet renders nothing. Each of the three is therefore its
> own `switchboards[]` entry on its own sheet (E-502/503/504)…"*

**So the 4-sheet split is not a drafting preference — it is a workaround for this limitation.**
Mayo's request is to remove the workaround, which means removing the limitation.

## 2. Proposed change

**Three parts. Part 1 alone is not enough and shipping it alone would be worse than nothing.**

1. **`.find` → `.filter`, and a lineup loop.** Both call sites above, plus every other per-sheet
   `switchboards.find` reachable from sheet rendering (`:13654`, `:13893`, `:15012`, `:15038` are
   keyed on bus/section id rather than sheet and are probably fine — **each must be read, not
   assumed**).
2. **Horizontal lineup placement — the actual design work.** Two or more lineups on one sheet need
   an X origin each, a gutter, and a rule for their order. **This is the Tier-2 decision:** order by
   `switchboards[]` order, by designation, or by an explicit `lineup_order` config key (the
   `ats_order` / OFF-026 precedent is the closest shape in this repo).
3. **A DROP REPORT, promoted to a hard stop.** Any lineup, device or feeder the renderer does not
   draw must be *reported*, not swallowed. **This is the same ask as the other FU-0015** (the
   cross-sheet bus-tap one), whose §"deeper gap" says *"no rule in `08_validation/` asserts that a
   VALIDATED object was actually DRAWN"* and proposes **promoting the merge step's advisory
   `DROPPED` report to a gate**. 🚩 **These two entries should share one implementation** — build the
   drop gate once, and this change becomes safe to make.

## 3. Scope

**In:** the per-sheet lineup lookup; lineup X placement and ordering; cross-sheet feeders that become
**intra-sheet** once their endpoints share a sheet (the A-3 squiggle pairs on E-502/503/504 exist
only because the feeders cross sheets — **combining removes their reason to exist**); the 3000 A
project rebuilt as a one-sheet drawing; the drop guard.

**Out:**
- ❌ **Re-tuning any composed-scale target** → **FU-0013** owns those.
- ❌ **Touching the golden.** If this change moves G1 by one pixel it is wrong.
- ❌ The toolkit side. The add-in consumes the geometry export; **if the export's shape does not
  change, the add-in does not care** — but that must be verified, not assumed.
- ❌ **Deleting the 4-sheet version.** Keep it. It is the only regression evidence that the split
  behaviour still works, and it is the control case for this change.

## 4. Acceptance criteria

- [ ] **Four lineups on one sheet draw four lineups.** Device, feeder and annotation counts on the
      combined sheet equal the sum over the four separate sheets, minus exactly the cross-sheet
      artefacts that legitimately disappear (the A-3 squiggle pairs) — **enumerated, not hand-waved.**
- [ ] **A lineup the renderer skips makes the run FAIL**, with the lineup named. **Demonstrated by
      removing one and watching it go red** — this repo ships no check it has not seen fail.
- [ ] **Golden untouched:** `run_all_gates.sh` → 13/13, G1 **0.0000 px**, **no baseline re-blessed**.
- [ ] The 4-sheet project still builds and still reports `drops: 0`.
- [ ] `OPEN_ITEMS.md` **NOTE-007 is rewritten or removed** — it documents the workaround, and leaving
      it would be a fresh staleness finding on day one (**FU-0014**'s whole subject).

## 5. Blast radius

**This is an engine change, so it is the highest-risk category in this repo.** Every `OFF-0NN` entry
from rev 1.0.3 to 1.0.14 was default-inert by construction; **rev 1.0.15 and 1.0.16 were not**, and
both moved real output. Assume this one is not inert either and prove otherwise.

⭐ **One measured encouragement.** The four sheets are SMALL, and the composed page clamps at
`s = 1.0000` because the transform never upscales — measured this session on the live project:

```
S1 E-501  2362 x 1378   s_width 1.5831  ->  s 1.0000   (clamped)
S2 E-502  2374 x 1302   s_width 1.5745  ->  s 1.0000   (clamped)
S3 E-503  2024 x 1048   s_width 1.8834  ->  s 1.0000   (clamped)
S4 E-504  1224 x 1048   s_width 3.4146  ->  s 1.0000   (clamped)
```

**Every sheet is being clamped, i.e. all four are far smaller than their page.** Combining them
should therefore *land in band* rather than crush legibility — the usual objection to a combined
drawing does not apply here. **This is a prediction from the current numbers, not a result.**

## 6. Verification plan

**Before:** `bash run_all_gates.sh` → 13/13, and `bash run_pipeline.sh` in the 3000 A project.
Snapshot first, **verified by extract + `diff -rq`**, never by `tar`'s exit status or an entry count
(both lie on this phone). **`find -newermt` cannot see edits here — FL-0021.**

**After:** the same, plus the combined sheet's counts reconciled against the four-sheet sums.

⚠️ **Run the two repo suites sequentially, never at once (FL-0012).** ⚠️ **`run_all_gates.sh` cannot
check this project at all** — the project's own runner says so in its header: *"Do NOT run
`../../run_all_gates.sh` for this project — that suite is engine regression against the hospital
golden. THIS PIPELINE IS THE CHECK."* **But this change DOES touch the engine, so both must run.**

## 7. Risks / open questions

1. **The ordering rule is Mayo's call, not a measurement** (§2.2).
2. **Silent-drop is the failure mode being removed, and a half-done change makes it worse** — a
   renderer that draws two of four lineups is harder to notice than one that draws one.
3. **Cross-sheet → intra-sheet is a behaviour change in FL-0026's exact code path**, which was fixed
   only on 2026-08-03 (rev 1.0.16). **That fix's only guard is this project, and the suite cannot
   invoke it** (the other FU-0015). **Do this after the drop gate exists, not before.**
4. **Sheet numbering and the title block.** Four sheets are E-501…E-504; one sheet is presumably
   E-501 alone. **Nothing has been checked about what else cites those numbers.**

## 8. Alternatives considered

- **Combine only the three sub-distribution boards, leaving 2MSB-1-A on its own sheet.** Smaller and
  still needs the identical engine change — **kept as a fallback if the combined sheet reads badly.**
- **Fake it with one `switchboards[]` entry containing every section.** Rejected: it would misstate
  the electrical reality (four separate boards) in the topology, which is the one artefact the Revit
  add-in and every downstream report read as truth.
- **Leave it at four sheets.** Rejected — Mayo asked. Recorded so the workaround is not mistaken for
  a decision.

## 9. Links

- Blocked-by-shared-need: **`FU-0015` (the cross-sheet bus-tap guard gap)** — ⚠️ *not* the family-map
  `FU-0015`; see the ID note at the top. **The drop gate should be built once, for both.**
- Failures: **FL-0026** (the silent-drop precedent, same code path) · **FL-0021** (mtime) ·
  **FL-0012** (never run both suites at once)
- Source: `09_tests/3000A 208V Service/OPEN_ITEMS.md` **NOTE-007** · `sld_engine.mjs:14318`, `:14493`


---

# 10. Disposition — SHIPPED 2026-08-03, engine rev **1.0.16 → 1.0.17** (appended)

> 🚩 **§§1–9 ABOVE ARE UNEDITED.** They record what was proposed, including the effort estimate this
> came in under and the §5 prediction that turned out right. Record beside, never over.

**Mayo asked for it directly and reaffirmed after the risk was raised.** Done.

## 10.1 What changed in the engine

All edits in `04_renderer/sld_viewer_engine_V1_0_0.html` (the source of truth), regenerated to
`sld_engine.mjs`. **Five changes, each proved golden-inert by G1 immediately after making it:**

1. **`switchboards.find` → `switchboards.filter` + a per-lineup loop.** The 342-line lineup block now
   runs once per switchboard on the sheet. ⭐ **Only THREE sites inside it used an absolute X**
   (`sx`'s origin, `swText`, `swLeftEdge`); every other coordinate derives from `sx` or `SEC_POS`, so
   offsetting those three moves a whole lineup. **That measurement is why this was 4 surgical edits
   and not a rewrite.**
2. **Same-sheet bus landing.** A feeder from a breaker in one lineup to another lineup's bus.
   🚩 **Without it these were SILENTLY DROPPED with their A-1/A-2 — FL-0026's exact failure in its
   same-sheet variant.** Measured before the fix: **3 feeders + 6 annotations dropped, and the run
   still printed "0 errors".**
3. **`renderR1Tags` wired into those runs.** Fixing the feeders alone left their 6 tags dropped.
4. **The utility-transformer block gated to its owning lineup.** OFF-020 scoped that lookup to the
   SHEET, correct when a sheet meant a lineup. Measured on the first merged render: **FOUR utility
   transformers, one per lineup, three of them fiction.**
5. **Inter-lineup runs routed above all placed boxes**, stacked 40 px apart. With the lane at bus
   height instead: `through_symbol 48`, `feeder_x_device 25` — the run drew through every panel in
   between. After: **25 → 0** and 48 → 23.

**Geometry-export ids** (`bd-…-incoming`, `gs-…-util-feed/squig`) are now qualified by switchboard
when a sheet has 2+ lineups — schema §14 requires uniqueness and four lineups collided on one id.
Suffixed **only** when the sheet has more than one lineup, so single-lineup sheets keep their ids.

## 10.2 The 3000 A project, rebuilt as ONE sheet

`crossFeeder()` now collapses to a single ordinary `feeder()` when both endpoints share a sheet — no
`.S1`/`.S2` halves, no A-3 squiggle pair, no `cross_sheet_refs` entry. **F-303, F-304 and F-312 are
real conductors now, not "TO SDPA" / "FROM 2MSB-1-A" continuation markers.** That is the actual point
of combining sheets.

| | before (4 sheets) | after (1 sheet) |
|---|---|---|
| sheets | 4 (E-501…E-504) | **1** (E-501) |
| drops | 0 | **0** |
| validator | 0 errors / 63 rules | **0 errors / 63 rules** |
| composed scale | 4 sheets, **`out_of_band=4`**, all clamped at s=1.0000 | **`out_of_band=0`, s = 0.4333, IN BAND** |
| frame honesty | 0.00 px | **0.00 px** |

⭐ **§5's prediction was right and is now a measurement.** The four sheets were all clamped at
`s = 1.0000` — far smaller than their pages — so combining them **landed in band** instead of
crushing legibility. **The combined drawing is better framed than the four it replaced.**

**Golden:** G1 **0.0000 px** after every single edit, and **no PNG baseline re-blessed**. Suite
**13/13**, sync **14/14**, behavior **52/52**, names 14/12. The rev bump followed the full protocol:
golden viewer re-copied, rev moved in all four `[P5]`-checked places, both manifest shas re-blessed
(`viewer ec0e1932 → 27ac1c2e`, `sld_engine fb52d279 → 51d126a1`).
⚠️ **FL-0006 fired exactly as documented** — the first suite run after a rev bump reds `[P4]` because
sync-gate reads `snapshots_page/audit.json` before G6 regenerates it. **The second run is green. That
is the known false red, not a defect in this change.**

## 10.4 Follow-up same day — LEFT-SIDE ENTRY, and the bug it exposed

**Mayo:** *"lets move this upstream equipment over on the left side of the switchboard F-303, F-312."*

**Done.** An inter-lineup run no longer drops a long vertical *through* its destination board at the
incoming-section centre. It now descends in the **GUTTER, clear to the LEFT of the board**, comes in
at bus-approach height and drops onto the tap. **This mirrors the convention the repo already used:**
the utility transformer feeding 2MSB-1-A sits to the LEFT of the board and approaches from outside
it. Upstream equipment on the left is what the drawing already said everywhere else.

🚩 **And the re-render exposed the real defect, which the routing change did NOT cause.** Moving the
runs left changed the collision counts by **nothing** — 23/2/1 before and after — which is what
proved they came from somewhere else:

> **`placeAllChains` was still receiving only LINEUP 0's bus Y.** The 3000 A service mixes
> architectures — a two-level `2MSB-1-A` (`SEC_BUS_Y`) beside three single-bus MLO boards
> (`DIST_BUS_Y`, **60 px higher**). Every chain on the three sub-boards was therefore anchored 60 px
> low, and every branch feeder rose **through its own breaker**: all 23 hits read
> `[ITS OWN PARENT] … penetration 7 px`. `placeAllChains` now resolves the bus **per feeder** from its
> own source breaker's lineup (a `sections → switchboard` map), which makes all **fourteen**
> `secBusY`-derived rows follow. **`through_symbol` 23 → 0.**

⭐ **The lesson is the one this repo keeps paying for: identical numbers across a change are
evidence.** Had the counts moved even slightly, the bus-Y bug would have been attributed to routing
and tuned instead of fixed.

Lane spacing also went **40 → 90 px**: an A-1 pill riding one lane overlapped the lane above it by
**1.4 px** (`tag_feeder_hard` 1 → **0**).

### Final state of the combined sheet

| check | value |
|---|---|
| sheets · drops | **1 · 0** |
| validator | **0 errors / 63 rules** |
| `through_symbol` · `feeder_x_device` · `collinear_v/h` · `tag_feeder_hard` | **0 · 0 · 0 · 0** |
| `feeder_x_feeder` | **2** — see below |
| composed scale | **`out_of_band=0`, s = 0.4333** |
| frame honesty | **0.00 px** |
| golden | **G1 0.0000**, no baseline re-blessed, suite **13/13** |

**`feeder_x_feeder = 2` is left deliberately.** Two true conductor crossings: F-304's riser/descent
crosses F-303's and F-312's lanes. The three runs' X-spans **partially overlap without nesting**
(1155–1760, 1315–4140, 2560–6170), so no lane ordering removes both — it is topological, not a tuning
miss. **Crossings are normal on a single-line diagram** and this checker is advisory. The honest fix
if it is ever wanted is a crossing hop, not a re-route.

## 10.3 ❌ STILL OPEN — the geometry cleanup

🚩 **SUPERSEDED BY §10.4 — this was written before the bus-Y bug was found, and it MISDIAGNOSED
the cause.** It blamed "descents clipping boxes"; the 23 hits were actually every sub-board's branch
feeders rising through their own breakers because `placeAllChains` had lineup 0's bus Y. **Kept as
written**, because the wrong diagnosis is the point: it was arrived at by reasoning about the picture
instead of reading the checker's own `[ITS OWN PARENT]` labels. Live counts are in §10.4.

Also still open from §7: **lineup ORDER is currently topology order** — Mayo's Tier-2 drafting call
(§2.2) was never made, and `LINEUP_GUTTER` is a hardcoded 320 px with the `LINEUP_GUTTER_CFG` hook
stubbed but not wired to `layout_config`.

⚠️ **The 4-sheet version is GONE from the live project** — it lives only in
`/root/sld_snap_combine_2026-08-03.tgz`. §3 said to keep it as the control case and that was **not**
honoured, because Mayo asked for the combined drawing itself rather than an additional variant.
