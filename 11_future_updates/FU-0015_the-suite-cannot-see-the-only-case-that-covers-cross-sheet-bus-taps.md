# FU-0015 — the suite cannot see the only case that covers cross-sheet bus taps

> 📌 **Dated note, 2026-10-06 — the case this entry leans on no longer covers the branch.** Since
> FU-0016 (engine rev 1.0.17, 2026-08-03) put all four 3000 A lineups on one sheet, the 3000 A
> topology carries **0** `cross_sheet_refs` (checked 2026-10-06 in both
> `2_build/svc3000_SLD_topology_V1_0_0.json` and its `__WITH_GEOMETRY` twin: one sheet, `sw-201`…`sw-204`
> all on S1), and its build script's `crossFeeder()` emits an ordinary same-sheet feeder when both ends
> share a sheet. Its bus-tap R-1s (`r-303`, `r-304`, `r-312`) now land through FU-0016's same-sheet
> bus-landing renderer. **No project on disk exercises FL-0026's cross-sheet branch any more:** across
> the golden, `3000A 208V Service`, `Sprouts Office Building - 2000A` and `Default 2500 kVA Service`,
> no R-1 ends on an R-2 bus on another sheet (the golden's only bus tap, `r-040`, is S2 → S2). §1's
> "exercised by exactly one thing" is therefore now *exercised by nothing* — not even the project
> pipeline guards it. **That raises this item's priority.** The body below is left as written.

> 📌 **Dated note, 2026-10-21 — the 3000 A project was removed** on Mayo's instruction (in git at
> `57383bf`). Option (a) below now means authoring a new regression project, not adopting that one.

| Field | Value |
|-------|-------|
| **ID** | FU-0015 |
| **Proposed** | 2026-08-03 |
| **Category** | validation/gates · engine |
| **Priority** | P1 |
| **Effort** | M |
| **Readiness** | `ready` |
| **Status** | `proposed` |
| **Parent** | FL-0026 |

---

## 1. What's missing

Engine rev **1.0.16** added two branches so a cross-sheet feeder can land on a sub-lineup's R-2 bus
(FL-0026):

- `sld_viewer_engine_V1_0_0.html:11481` — the third clause on `isCrossSheetSource`
- `renderSheet` — the destination-side incoming renderer

Both are exercised by exactly one thing: `09_tests/3000A 208V Service`. Its `run_pipeline.sh`
asserts `drops: 0` at stage 4 and per-sheet snapshot coverage at stage 7, and it is a **demonstrated
failing arm** — reverting either edit was measured red, in both directions, during the fix.

**`run_all_gates.sh` cannot invoke it.** That suite is engine regression against the hospital
golden, and `09_tests/README.md` plus CLAUDE.md §9 are explicit that a project must *not* be run
through it. The golden cannot reach either branch: its only bus-tap R-1 (`r-040`) is same-sheet with
its source generator on that sheet, so clause 3 is false and the destination loop's
`srcDev.sheet_id === sheetId` guard skips it.

So the suite prints **13/13 green** on an engine where both branches have been deleted.

This is the same shape as **FU-0012** — a real guard that nothing runs. *A convention that nothing
consumes is a habit, not a contract.*

## 2. The deeper gap, which is worth more than the gate

**No rule in `08_validation/` asserts that a validated object was actually drawn.**

Every rule reads the topology. In FL-0026 the feeder and its A-1 and A-2 — which are
**NEC-non-negotiable** (CLAUDE.md §6) — were present and correct in the topology, TV-1/TV-2 passed,
and the sheet showed a 1200 A breaker with nothing above it. The contract and the drawing disagreed
and only the contract was checked.

The merge step's `DROPPED` report is the only detector of that class, and it is **advisory** —
stages 8–13 are reporting-only by design and exit 0. What actually stopped the run was
`snapshot_html.mjs:322` exiting 1 on a coverage miss: a *pixel* gate catching a *contract*
violation by accident. If the drops had been 22 annotations and no routed elements, coverage might
well have absorbed them.

## 3. Options

| # | Approach | Cost | Covers |
|---|----------|------|--------|
| a | Add a second regression project to the suite (this one, or a minimal two-sheet bus-tap case) | S–M — needs a "project regression" concept the suite does not have, and a policy for which projects are frozen | this defect only |
| b | Extend the golden with a bus-tap-fed sub-lineup | **L — re-freezes G1/G5/G6/G9 baselines and moves the frozen oracle**; the golden refreeze rule (batch 2 was FU-0008) makes this deliberately expensive | this defect only |
| c | **Promote the drop report to a gate** — make a non-zero drop count fail unless declared as an intentional skip | M — the merge step already computes it; needs a declared-skip manifest so legitimate `sheet_skips` stay green | **every** silent-skip, present and future |

**Recommended: (c), then (a).** (c) is the general fix and it turns CLAUDE.md §9's first named
renderer failure pattern — *"Silent skip — every topology object must map to a renderer; unknown
types throw + draw a red fallback box, never disappear (track intentional skips in a manifest)"* —
from prose into an assertion. The manifest that sentence already asks for is precisely the
declared-skip list (c) needs.

## 4. Done looks like

- A non-zero, undeclared drop count fails the run with a named exit, not a printed line.
- The declared-skip manifest exists and `sheet_skips`-driven omissions are green through it.
- Deleting either rev-1.0.16 branch turns something red that `run_all_gates.sh` actually runs.
- The new arm is mutant-proved in both directions (see `08_validation/run_mutants.sh`, which is
  itself out of the gate count on purpose — FU-0012).

## 5. Blocked by

Nothing. The drop count is already computed at merge; this is a policy + assertion change.
