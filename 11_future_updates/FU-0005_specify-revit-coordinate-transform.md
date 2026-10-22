# FU-0005 — formally specify the Revit coordinate transform

| Field | Value |
|-------|-------|
| **ID** | FU-0005 |
| **Title** | Specify the px → Revit coordinate transform; it is currently a recommendation in a gaps list |
| **Proposed** | 2026-07-25 |
| **Proposed by** | `Claude` |
| **Status** | `proposed` |
| **Priority** | `P2` |
| **Effort** | `M` |
| **Readiness** | `ready` |
| **Category** | `docs` |
| **Component** | `03_contracts/sld_topology_schema_V1_0_0.md` §14 or `02_specs/drafting/sld_layout_engine_V1_0_0.md`; mirrors the add-in's live conversion |
| **Stage** | 6 Render/Revit |
| **Decision tier** | `Tier 1 autonomous` |
| **Golden impact** | `golden-inert` — documents existing behavior |
| **Schema impact** | `none` if it documents what the add-in already does |
| **Version bumps** | whichever spec adopts it, plus its downstream references |
| **Gates affected** | none |
| **Depends on** | — |
| **Blocks** | — |
| **Target** | `next batch` |

---

## 1. Problem

`CLAUDE.md` §11 says the Revit coordinate transform is *"not formally specified (recommended
`revit_scale_factor = 1 / effective_px_per_inch`)"*. Meanwhile the add-in has been converting
coordinates in production for months and the 2026-07-25 run placed 104/104 devices aligned.

So the transform is not actually undefined — it is **defined only in C#**, and the spec layer carries a
recommendation instead of the rule. That inverts this repo's core discipline, where every dimension
traces to a spec. The practical cost: anyone reasoning about placement has to read the add-in source,
and a future change to the conversion has no spec to be checked against.

## 2. Proposed change

Read the add-in's actual conversion, confirm it against the placement-report evidence, and write it
into the spec layer as the authoritative rule — including the units, the direction of the Y axis, and
the origin convention.

## 3. Scope

**In:** documenting the transform as-built, in one canonical location, with the others pointing at it.

**Out (non-goals):**
- **Changing the transform.** This is codification of working behavior, not a retune. If reading the
  code reveals the implementation disagrees with the recommendation, that is a **finding for
  `10_failure_log/`**, not a silent correction here.

## 4. Acceptance criteria

- [ ] The transform is stated once, canonically, with units and worked example.
- [ ] It states explicitly that **Y increases downward = power-flow depth, not building elevation** —
      the single most misreadable thing about this coordinate system.
- [ ] It matches the add-in's implementation, verified by reading the code, not assumed.
- [ ] `CLAUDE.md` §11 drops the item and points at the spec.
- [ ] Every other mention of the transform defers to the canonical one (the repo's "Canonical:" banner
      pattern).

## 5. Blast radius

Documentation only. The one hazard is **stating it wrong**: a spec that disagrees with working code is
worse than no spec, because the next change trusts it. Verify against `SymbolDims` / the placer code
and the committed placement-report CSV before writing.

## 6. Verification plan

**Before / after:** `bash run_all_gates.sh` → 12/12 unchanged. No gate covers prose, so verification is
by cross-reading: the documented rule, applied by hand to two devices from the hospital
`__WITH_GEOMETRY` geometry, must reproduce the coordinates in the committed placement report. Show
that arithmetic in the entry when it ships.

## 7. Risks / open questions

- Which file owns it — the schema §14 (as-built authority for `geometry{}`) or the layout engine spec?
  Schema §14 is the better home if it is treated as part of the geometry contract.
- Confirm whether `revit_scale_factor` exists as a real named value in the add-in or only as a
  recommendation in prose. If the code hardcodes the arithmetic, say so rather than inventing a
  parameter the code does not have.

## 8. Alternatives considered

- **Leave it in §11** — rejected: it has sat there while the behavior became load-bearing and
  runtime-verified. A gaps list is where a documented rule goes to be forgotten.

## 9. Links

- Related updates: FU-0001 (also concerns engine ↔ Revit agreement)
- Specs / contracts touched: `CLAUDE.md` §8 (coordinate system), §11
- Evidence: the committed placement-report CSV from the 2026-07-25 run
- Memory / session: 2026-07-25
