# FL-0026 — a cross-sheet feeder landing on a lineup bus was silently dropped, with its tags

> 📌 **Dated note, 2026-10-21 — the guard project is gone.** `09_tests/3000A 208V Service` was removed
> on Mayo's instruction; it is in git at `57383bf`. It had already stopped reaching this entry's
> cross-sheet branch at engine 1.0.17 (FU-0015's 2026-10-06 note), so **nothing guards this fix
> now**. The body below is left as written.

| Field | Value |
|-------|-------|
| **ID** | FL-0026 |
| **Title** | cross-sheet R-1 whose `end` is an off-sheet R-2 bus rendered nothing — feeder, A-1, A-2 and both A-3 squiggles all dropped |
| **Opened** | 2026-08-03 |
| **Closed** | 2026-08-03 |
| **Status** | `fixed` |
| **Severity** | S2 |
| **Stage** | 6 Render/Revit |
| **Component** | `04_renderer/sld_viewer_engine_V1_0_0.html` (→ `sld_engine.mjs`), engine rev 1.0.15 → **1.0.16** |
| **Failure class** | silent-skip |
| **Detected by** | `09_tests/3000A 208V Service` — stage 4 merge drop report (22 dropped entities), then the stage 7 snapshot coverage gate |

---

## 1. Symptom

The 3000 A / 208 V project feeds three MLO sub-distribution lineups (SDPA, SDPB, P6), each on its
own sheet, from breakers in the main switchboard. Each incoming is a cross-sheet R-1 pair whose
`end` is the destination lineup's R-2 bus (`{ device_id: 'r-393', port: 'bus_tap_bi' }`).

The topology validated **completely clean** — 0 errors, 63 rules, `SCHEMA-6` even reporting
`r-303-s2: end is a legal R-2 bus tap → r-393 (RE_END_BUSTAP)` as INFO. But layout dropped all six
segments and every annotation bound to them:

```
merged. layout_warnings: 23 | drops: 22
 ! sheet S1: DROPPED 8 of 30 expected entities (rendered 22, intentional skips 0)
 ! DROPPED re r-303-s1 (F-303.S1) on S1
 ! DROPPED ann a-666 (A-1 on r-303-s1) on S1     ← the feeder tag
 ! DROPPED ann a-667 (A-2 on r-303-s1) on S1     ← the conduit callout
 ! DROPPED ann a-668 (A-3 on r-303-s1) on S1     ← the TO squiggle
 …
```

On the sheet this reads as a 1200 A breaker sitting on the bus with **nothing above it** — no
feeder, no tag, no destination. The two 1200 A / 800 A distribution breakers on E-501 were bare.

## 2. Impact

**A-1 and A-2 are NEC-non-negotiable on every non-stub-exempt R-1 (CLAUDE.md §6 / project
instructions §2.4).** This defect deleted them from the drawing while the validator that enforces
them (TV-1/TV-2) stayed green, because the validator reads the *topology* and the tags were present
there. The drawing and the contract disagreed, and only the contract was checked.

Blast radius: **any** sub-distribution panel drawn as its own lineup and fed from another sheet —
i.e. the entire "show me the breakers on the sub-panel" pattern. Not reachable from the hospital
golden, whose boards are fed through *devices* (ATS `source1_in`), which is why it survived every
gate since the cross-sheet path was written.

It also blocked the pipeline outright: `snapshot_html.mjs:322` exits 1 on a coverage miss and has
no advisory flag, so the run died at stage 7 and stages 8–14 (composed pages, all seven geometry
checkers, `RESULTS.json`) never executed.

## 3. Root cause

Two independent halves of the same assumption — *a cross-sheet feeder ends on a **device***.

**Source side.** `sld_viewer_engine_V1_0_0.html:11481`:

```js
const isCrossSheetSource = (r.end === null)
  || (r.end && devMap[r.end.device_id] && devMap[r.end.device_id].sheet_id !== sheetId);
```

`r.end.device_id` held a *bus* id, so `devMap[…]` was `undefined`, the test was false, and the
feeder fell through to the same-sheet chain path — which could not resolve a destination on this
sheet and emitted nothing. Note the field is *named* `device_id` but schema §6 dialect decision (c)
explicitly allows it to hold an R-2 id; the lookup took the name at face value.

**Destination side.** There was no general renderer for a feeder landing on a bus at all. The only
one that existed was hardcoded for the golden's generator (`:13619`, "Gen feeds EMSB main bus
directly (r-040: GEN -> EM main bus r-903 bus_tap_bi)"), keyed off `node_type === 'L1-5'`.

**The contract required exactly what the renderer could not draw.** CV-8 rejects an L2-1 breaker as
a feeder *destination* ("has no load-side ports in the CV-8 classification"), so an MLO lineup's
incoming has nowhere to terminate **except** the bus. Both alternative shapes were measured and are
contract-invalid, not merely unrendered:

| Attempted shape | Result |
|---|---|
| `end: null` on the source segment (§8A's documented prose) | **CV-2 error** ×3 — `line_in starts 2 logical R-1 feeders (expected 1)`; identical endpoints on both halves is what makes a pair *one* logical feeder |
| main breaker (L2-1) as the endpoint | **CV-8 error** ×6 + CV-2 ×3 |
| bus tap (`bus_tap_bi`) | validates clean — and was dropped |

## 4. Resolution

Engine rev **1.0.15 → 1.0.16**, both edits in `sld_viewer_engine_V1_0_0.html`, regenerated via
`gen_engine.mjs`:

1. **`:11481` — widen `isCrossSheetSource`.** Added a third clause recognising an `end` that
   resolves through `reMap` to an `R-2` whose `sheet_id !== sheetId`, plus a `squigText` fallback
   that names the *switchboard owning the bus* rather than the bus.
2. **`renderSheet`, before the main-breaker block — new destination-side renderer.** For an R-1 on
   this sheet whose `end` is one of this lineup's bus ids and whose `start` device is *not* on this
   sheet, draw a riser off the bus tap at the incoming section, a bus dot, and the pair's A-3
   FROM-squiggle. Generalises the shape the generator route hardcoded.

Re-blessed with the change: golden viewer byte-copy (`a7497465` → `ec0e1932`), `sld_engine.mjs`
(`7f048fc4` → `fb52d279`), and the rev in all four places sync_gate P5 reads.

## 5. Regression guard

**The guard is the project itself, and it is a genuinely failing arm.**
`09_tests/3000A 208V Service` exercises all three sub-lineups on separate sheets. Its
`run_pipeline.sh` stage 4 asserts `drops: 0` and stage 7 asserts per-sheet coverage
(`snapshot_html.mjs` exits 1 on a miss). Revert either engine edit and the run goes red at stage 7
with an explicit miss list — measured, in both directions, during this fix.

⚠️ **That guard is not suite-invoked.** `run_all_gates.sh` is engine regression against the hospital
golden and cannot see this project, so a future engine change could re-break the bus-tap path and
still show 13/13. Closing that properly means either a golden-reachable case or a
second regression project in the suite → **FU-0015**.

**Golden-inertness proof** (this is what makes the fix safe, and it is unusually strong): the fix
required **no PNG re-bless at all**. G5 4/4, G6 6/6 and G9 108/108 all matched byte-for-byte on the
existing baselines, G1 held at **0.0000 px**, G8 confirmed the export is still additive, and
acceptance stayed 2/2. Both new branches are unreachable from the golden — its only bus-tap R-1
(`r-040`) is same-sheet with its source generator on that sheet, so clause 3 is false and the
destination loop's `srcDev.sheet_id === sheetId` guard skips it.

## 6. Detection gap

`Detected by` is not ESCAPED, but the gate suite was blind and the reason matters.

The drop was **reported and ignorable**: the merge step printed 22 `DROPPED` lines and still exited
0, because stages 8–13 are reporting-only by design. The only thing that turned it into a hard stop
was the snapshot coverage gate — a *pixel* check catching a *contract* violation.

Nothing in `08_validation/` can see this class at all: every rule reads the topology, where the
feeder and its tags were present and correct. **There is no rule asserting that a validated object
was actually drawn.** The merge step's drop report is the only detector, and it is advisory.
`_PROJECT_TEMPLATE`'s checkers inherit the same blind spot — they measure the geometry that *exists*
and cannot know what should have been in it.

*A validator that reads the topology cannot see a renderer that ignores it.*
