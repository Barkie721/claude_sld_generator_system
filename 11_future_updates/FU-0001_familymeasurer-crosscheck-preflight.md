# FU-0001 — FamilyMeasurer cross-check preflight: gate engine `BOX` against the measured families

| Field | Value |
|-------|-------|
| **ID** | FU-0001 |
| **Title** | FamilyMeasurer cross-check preflight — diff a committed `Measure Families` CSV against `BOX` + `SymbolDims` |
| **Proposed** | 2026-07-25 |
| **Proposed by** | `trip finding` |
| **Status** | `proposed` |
| **Priority** | `P1` |
| **Effort** | `M` |
| **Readiness** | `ready` |
| **Category** | `validation/gates` |
| **Stage** | `gate` |
| **Component** | new checker under `04_renderer/`; reads `04_renderer/sld_engine.mjs` (`BOX`) + `13_addin/Revit Addins/DEDARMS/Sld/Services/SymbolDims.cs` |
| **Decision tier** | `Tier 1 autonomous` |
| **Golden impact** | `golden-inert` — a new checker reads existing artifacts, renders nothing |
| **Schema impact** | `none` |
| **Version bumps** | none — new file, no existing `_V1_0_0` consumer |
| **Gates affected** | adds a gate to the suite (12 → 13); no existing gate changes |
| **Depends on** | FL-0002 (its §5 is the design source) |
| **Blocks** | the `BOX` corrections in FL-0002 §4 — those should not land unguarded |
| **Target** | `next batch` |

---

## 1. Problem

The engine's own stated rule (`sld_engine.mjs:9752`) is *"the families are the dimension master; the
engine box = family drawn bbox exactly."* Nothing enforces it. The 2026-07-25 Revit run produced the
first-ever committed `Measure Families` CSV and immediately found **two rows in violation** — L1-5
(110 × 110 vs measured 168 × 91) and L3-2 (24 × 32 vs measured 24 × 14). L3-2 had silently borrowed
L3-1's fire-pump box and no comment recorded the assumption.

The 12-gate suite is **blind to this class of drift by construction**: G1 compares the engine against
its own frozen geometry and the PNG baselines compare the engine against its own render, so an engine
that is internally consistent but disagrees with the real Revit families passes everything. The only
instrument that can see it is `Measure Families` on the Windows box.

This is the last outstanding item from the Revit work list, and it is the **regression guard FL-0002
is waiting on** — fixing those two numbers without it leaves the next family retune just as silent.

## 2. Proposed change

A headless checker that reads the committed `Measure Families` CSV and fails on any nonzero delta
against **both** the engine `BOX` table and its C# mirror `SymbolDims.ByNodeType`, then wire it into
`run_all_gates.sh`.

Cross-checking both in one pass is deliberate: `SymbolDims` is a hand-synced mirror of `BOX` and this
repo has been bitten by that pair drifting before.

## 3. Scope

**In:** the checker, its wiring into the gate suite, and the suppression rules below.

**Out (non-goals):**
- **Correcting the L1-5 / L3-2 values.** That is FL-0002's resolution and carries a golden re-freeze
  plus an open glyph-redraw decision. This entry builds the instrument; it does not use it to change
  geometry. Expect the new gate to go **red on first run** — that is correct, and FL-0002 closing is
  what turns it green.
- Running `Measure Families` itself (Windows-only), and any change to `FamilyMeasurer.cs`.

## 4. Acceptance criteria

- [ ] Checker parses the committed CSV and reports per `(node_type, variant)`, not per node type.
- [ ] Rows whose node type has **no `BOX` entry** are suppressed — otherwise every annotation type
      reports a false delta against the `__default` 80 × 80 sentinel.
- [ ] **Parametric** families are classified not-comparable: `L1-2` (sized by Width/Length at
      placement), `A-7` (Length ← span), `A-8` (text-driven). Their measured numbers are only the
      type's defaults.
- [ ] `L2-7 space` does not report — its `EXPORT_BOX_OVERRIDE` is variant-blind by design and the
      variant is registered by drawn-box bottom to the bus-dot anchor.
- [ ] `BOX` vs `SymbolDims` disagreement fails **on its own**, even when both agree with the CSV.
- [ ] Negative-tested: mutate one `BOX` row, one `SymbolDims` row, and one CSV row — each must fail
      loudly and name the offending node type.
- [ ] Wired into `run_all_gates.sh` with a documented re-run command.

## 5. Blast radius

Additive. No engine, viewer, golden, schema or DLL change; the checker only reads. The suite grows by
one gate, so `run_all_gates.sh`, the runbook §4 gate table and the gate counts in `CLAUDE.md` §9 /
`README.md` §3 all need updating — the count is stated in several places and a missed one is drift.

## 6. Verification plan

**Before:** `bash run_all_gates.sh` → 12/12 green, sync 16/16 (baseline).
**After:** the same 12 stay green and unchanged — a docs-and-new-file change must not move an existing
gate. The new gate is expected **red against today's `BOX`**, reporting exactly L1-5 and L3-2 and
nothing else; that specific result is the proof it works. Confirm the three mutants above each fail.

## 7. Risks / open questions

- The CSV is a **committed artifact from one Revit run**, not a live measurement — the gate proves
  the engine matches *that* run. If families are re-authored, the CSV must be re-committed or the gate
  enforces a stale truth. Make that dependency explicit in the checker's output.
- Node types with no family authored at all (L1-3, L3-3 — see FU-0003) will never appear in the CSV.
  Absent must read as "not measured", not as "matches".

## 8. Alternatives considered

- **Fix the two numbers and skip the guard** — rejected: it is exactly the unguarded fix the failure
  log exists to prevent, and the detection gap would survive intact.
- **Extend an existing gate (G8 / parity)** instead of adding one — rejected: those compare the engine
  to its own frozen output. This gate's whole point is that its reference is *external* to the engine.

## 9. Links

- Related updates: FU-0003 (unauthored families never reach the CSV)
- Related failures: **FL-0002** (source; its §5 holds the design notes), FL-0004 (the CSV pointer was
  dangling in six files)
- Specs / contracts touched: `02_specs/symbols/sld_system_model_V1_0_0.md` (states the family-is-master rule)
- Evidence: `09_tests/Hospital Example (Golden Case)/Revit Tests Docs/hospital - SLD family dimensions.csv`
- Memory / session: 2026-07-25 — first successful full Revit runtime verification
