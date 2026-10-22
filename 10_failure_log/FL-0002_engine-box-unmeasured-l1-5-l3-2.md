# FL-0002 — engine BOX carries unmeasured sizes for L1-5 and L3-2; the family measurements disprove them

| Field | Value |
|-------|-------|
| **ID** | FL-0002 |
| **Opened** | 2026-07-25 |
| **Closed** | — |
| **Status** | `open` |
| **Severity** | S3 |
| **Stage** | 4 Layout |
| **Component** | `04_renderer/sld_engine.mjs` (`BOX`, ~:9757) + its C# mirror `05_revit/DEADARMS ADDIN/Revit Addins/DEDARMS/Services/SymbolDims.cs` (`ByNodeType`, :33) |
| **Failure class** | spec-value-deviation |
| **Detected by** | Revit runtime — `Measure Families`, 2026-07-25. No gate covers this surface; see §6. |

---

## 1. Symptom

The 2026-07-25 Revit run executed `Measure Families` against the real loaded families and exported
`09_tests/Hospital Example (Golden Case)/Revit Tests Docs/hospital - SLD family dimensions.csv`.
Two node types disagree with the engine `BOX` table:

| Node type | Family / type | Measured (px) | Engine `BOX` (px) | Δw | Δh |
|-----------|---------------|---------------|-------------------|----|----|
| **L1-5** generator | `_E_SLD_Gen E01` / `_E_SLD_Gen` | **168 × 91** | `2·DIM.gen_r` = **110 × 110** | **+58** | **−19** |
| **L3-2** motor | `_E_SLD_Motor V02` / `Motor Only` | **24 × 14** | **24 × 32** | 0 | **−18** |

Every other measured type matches exactly (`dw = dh = 0` across 15 types).

⚠️ The other large deltas in that CSV are **noise, not findings**: `A-1`, `A-3`, `A-6`, `A-7`, `A-8`,
`L1-2` and `R-2` have no `BOX` row, so the CSV's `engine_w_px`/`engine_h_px` columns show the
`__default` **80 × 80** sentinel and the deltas are meaningless. `L2-7 space` (Δ −8.14 / −22.37) is
also expected and already handled — the `EXPORT_BOX_OVERRIDE` is variant-blind by design and the
`space` variant is registered by drawn-box **bottom** to the bus-dot anchor, which is height-independent.

## 2. Impact

`BOX` is the single source of truth for device geometry anchors, feeder endpoints, x-centering and
bboxes, and it feeds the exported per-device `w`/`h` that `DevicePlacer` prefers at placement time.
A wrong box therefore propagates into both the drawing layout *and* the Revit registration target.

Blast radius, measured not assumed:

- **L3-2 is golden-inert** — the hospital topology contains **0** L3-2 devices (verified against
  `hospital_SLD_topology_V1_0_0__WITH_GEOMETRY.json`). The wrong value only bites a future case that
  has a motor-only load. Correcting it should move nothing.
- **L1-5 is golden-visible** — exactly one device, `d-052` **GEN-1** on S2 (E-502). Correcting the box
  moves its anchor and the feeder endpoints derived from it, so it requires a golden re-freeze.

Not an NEC issue and no wrong drawing shipped: the golden was tuned *around* the legacy 110 × 110
value, and the run reported GEN-1 placed and aligned. The defect is that the engine's stated rule and
its data disagree.

## 3. Root cause

Both values were **knowingly provisional**, carried because the measurement did not exist:

- `sld_engine.mjs:9762` — `'L1-5': { w: 2 * DIM.gen_r, h: 2 * DIM.gen_r },  // UNMEASURED — family not loaded`
- `SymbolDims.cs:39` — `["L1-5"] = (110, 110, Anchor.TopLeft),  // generator — UNMEASURED (family not loaded)`

The generator family is now loaded, so the precondition for the placeholder is gone.

**L3-2 is the worse of the two** because it was *never* marked provisional. It silently borrowed
L3-1's fire-pump box (`24 × 32`) — the two share the `_E_SLD_Motor V02` family but are different
**types** (`Motor with Starter` vs `Motor Only`), and the Motor-Only type is half the height. Nothing
in the code or comments recorded that assumption.

The governing rule is written into the engine at `:9752`: *"the families are the dimension master; the
engine box = family drawn bbox exactly."* These two rows violate it.

## 4. Resolution

`TBD` — deferred by Mayo 2026-07-25, deliberately not fixed on the spot. Nothing is blocked by it.

Proposed when picked up (needs a decision on the second bullet):

1. **L3-2 → 24 × 14** in both `BOX` and `SymbolDims`. Expected golden-inert; prove it with
   G1 0.0000 + all 10 PNG baselines byte-identical rather than assuming.
2. **L1-5 → 168 × 91** in both. **Open design question, Mayo's call:** the engine still *draws* the
   generator as a circle of radius `DIM.gen_r`. Resizing the box to a 168 × 91 rectangle without
   redrawing the glyph reproduces the same box-vs-glyph mismatch already flagged on `L1-1`. Either
   redraw the glyph to the family, or accept and document the mismatch.
3. Golden re-freeze for the L1-5 change, with the usual byte-locked trio procedure (viewer →
   `gen_engine.mjs` → byte-copy the golden viewer → re-bless both manifest sha entries).

Both edits must land **together** in the engine and the C# mirror — `SymbolDims` is a hand-synced
mirror of `BOX` and this repo has been bitten by that pair drifting before.

## 5. Regression guard

**NOT YET — and this is the real deliverable.** No gate in the 12-gate suite can see this class of
drift, so fixing the two numbers without a guard would leave the next family retune just as silent.

Follow-up: **author the FamilyMeasurer cross-check preflight** — the last outstanding item from the
Revit work list. It should diff a committed `Measure Families` CSV against `BOX` + `SymbolDims` and
fail loudly on any nonzero delta. Design notes:

- Suppress rows whose node type has **no `BOX` entry** — otherwise every annotation type reports a
  false delta against the `__default` 80 × 80 sentinel (see §1).
- Treat **parametric** families as not-comparable: `L1-2` (`_E_SLD_Dist-Panel E01`, sized by
  Width/Length at placement), `A-7` (Length ← span) and `A-8` (text-driven) have no fixed drawn bbox,
  so their measured numbers are just the type's defaults.
- Handle **variants** — `L2-7 space` legitimately differs from its `EXPORT_BOX_OVERRIDE`; the check is
  per `(node_type, variant)`, not per node type.
- Cross-check the C# mirror in the same pass, so `BOX` and `SymbolDims` can never diverge quietly.

## 6. Detection gap

Not a silent escape for L1-5 — it was self-declared in a comment. But **no gate would ever have caught
it**, and L3-2 *was* silent. The suite is blind here by construction: G1 compares the engine against
its own frozen geometry, and the PNG baselines compare the engine against its own render, so an engine
that is internally consistent but disagrees with the **Revit families** passes everything. The only
instrument that can see it is `Measure Families` on the Windows box, which until 2026-07-25 had never
produced a committed CSV. §5's cross-check is what closes this.

## 7. Links

- Related failures: —
- Specs / contracts touched: `02_specs/symbols/sld_system_model_V1_0_0.md` (states the family-is-master
  rule), `03_contracts/current_state_manifest.json`
- Gates involved: none today — that is the finding
- Evidence: `09_tests/Hospital Example (Golden Case)/Revit Tests Docs/hospital - SLD family dimensions.csv`
- Memory / session: 2026-07-25 — first successful full Revit runtime verification
- See also: FL-0004 (the pointer to this CSV was dangling in 6 files)
