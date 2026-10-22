# FU-0006 — vertical overflow splitting; dense compositions warn but are never mitigated

| Field | Value |
|-------|-------|
| **ID** | FU-0006 |
| **Title** | Mitigate vertical overflow — today the engine flags it and draws off the sheet anyway |
| **Proposed** | 2026-07-25 |
| **Proposed by** | `Claude` |
| **Status** | `proposed` |
| **Priority** | `P2` |
| **Effort** | `XL` |
| **Readiness** | `ready` |
| **Category** | `engine` |
| **Component** | `04_renderer/sld_engine.mjs` (sheet assembly / continuation sheets), `02_specs/drafting/sld_layout_engine_V1_0_0.md` §2.3, §10 |
| **Stage** | 4 Layout |
| **Decision tier** | `Tier 2 default+override` |
| **Golden impact** | `unknown — must measure` |
| **Schema impact** | `additive` if a split emits continuation metadata |
| **Version bumps** | layout engine spec + engine; schema §14 if geometry gains keys |
| **Gates affected** | potentially all — `G1`, `G5`, `G6`, `G8`, `parity`, `behavior` |
| **Depends on** | — |
| **Blocks** | — |
| **Target** | `backlog` |

---

## 1. Problem

`effective_px_per_inch` is a constant 96 and the V1 overflow reducer (a px/in step-down) was never
built. **Overflow is flagged, never mitigated.** The golden itself trips it: `VERTICAL_OVERFLOW_WARNING`
fires today because the Roof line sits at −460 < 0, and `behavior_test.mjs` check #6 asserts exactly
two S2 warnings — the warning is a *pinned expectation*, not an anomaly.

That is fine for the hospital, whose layout was tuned around it. It is not fine as a general rule: a
denser building silently produces a drawing with content above the sheet. The system's whole claim is
that it produces drawings an engineer can seal, and a sheet with content off the edge fails that
without failing any gate.

## 2. Proposed change

Give the engine a real response to overflow. Two candidate mechanisms, and choosing between them is
the first task, not an implementation detail:

- **Continuation sheets** — split the stack across sheets and link with A-3 squiggles and cross-sheet
  refs. The infrastructure already exists (sheet roles, continuation sheets, `cross_sheet_refs[]`).
- **The px/in step-down** — the original V1 reducer: scale the composition down until it fits.

## 3. Scope

**In:** picking the mechanism, implementing it, and defining when it triggers.

**Out (non-goals):**
- **Silencing the existing warning.** It must keep firing — `behavior_test.mjs` check #6 depends on it
  and the golden's two S2 warnings are a deliberate pinned expectation.
- Horizontal sparsity. S1's whitespace is a *horizontal* problem needing a Chain-B stack redesign;
  that is a separate effort and was consciously not tightened.

## 4. Acceptance criteria

- [ ] Mechanism chosen, with the reasoning recorded (this entry's §8).
- [ ] A deliberately over-dense scratch topology renders fully on-sheet.
- [ ] The hospital golden is **byte-identical** — the mitigation triggers only above a threshold the
      golden does not cross.
- [ ] The two S2 overflow warnings still fire; `behavior_test.mjs` check #6 still passes unmodified.
- [ ] If continuation sheets: cross-sheet refs and A-3 squiggles resolve, and the geometry export
      round-trips through `strip_compare.mjs`.

## 5. Blast radius

**The largest of any seeded entry.** It touches sheet assembly, which everything downstream depends
on. If it changes composed-page output it moves G6; if it adds geometry keys it needs G8 re-run before
and after (G1 and `parity_test.mjs` are **blind to a new geometry key** — that blindness is precisely
why G8 exists). A golden re-freeze is possible and must be treated as expected until measured
otherwise.

## 6. Verification plan

**Before:** full suite, and record the current warning count and content extents.
**After:** the golden must be untouched — G1 0.0000, all 10 PNG baselines byte-identical, G6
composed-page baselines unmoved, G8 clean before **and** after any export addition. Then the over-dense
scratch case as the positive test. Treat any golden movement as a defect in the change until proven
intended, and re-freeze only with explicit sign-off.

## 7. Risks / open questions

- **Which mechanism?** The step-down is simpler but shrinks text toward illegibility, and
  `effective_px_per_inch` being constant is currently an invariant other code may lean on.
  Continuation sheets preserve legibility but multiply the cross-sheet bookkeeping.
- What is the trigger threshold, and is it a `layout_config` key (24 documented keys today, schema
  §19 canonical) or hardcoded?
- The golden already overflows. If the threshold is "any overflow", the golden re-freezes on day one —
  which is an argument for a threshold above the golden's own condition.

## 8. Alternatives considered

- **Keep warning only** — the status quo; defensible while the hospital is the sole live case and a
  human reviews every sheet. It stops being defensible the moment a case is generated unattended.
- **Larger sheet template** — rejected: 30×42 Arch E1 is a project-wide deliverable convention, not a
  layout parameter to tune.

## 9. Links

- Related updates: —
- Specs / contracts touched: `02_specs/drafting/sld_layout_engine_V1_0_0.md` §2.3/§10, `CLAUDE.md` §8, §11
- Gates involved: G1, G5, G6, G8, parity, behavior
- Memory / session: 2026-07-25
