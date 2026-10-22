# FL-0000 — <one-line title in plain English>

> **Copy this file to start a new entry.** Name it `FL-XXXX_short-slug.md` (next number from
> `failure_register_V1_0_0.md`), fill the header table + sections below, delete the `<…>` prompts and
> this quote block, then add the one-row summary to the register.

| Field | Value |
|-------|-------|
| **ID** | FL-XXXX |
| **Title** | <short, specific — "level line drawn at stale Y after collision nudge", not "layout bug"> |
| **Opened** | YYYY-MM-DD |
| **Closed** | YYYY-MM-DD — or `—` while open |
| **Status** | `open` \| `investigating` \| `fixed` \| `wont-fix` \| `recurred` |
| **Severity** | `S1` \| `S2` \| `S3` \| `S4` (see README) |
| **Stage** | 1 Intake · 2 Topology · 3 Validate P1+P2 · 4 Layout · 5 Preflight P3 · 6 Render/Revit · or `process`/`gate` |
| **Component** | <file or folder, e.g. `04_renderer/sld_engine.mjs`> |
| **Failure class** | <one of CLAUDE.md §9: silent-skip · spec-value-deviation · coordinate-decoupling-cascade · level-line-placement · or `other`> |
| **Detected by** | <gate G#, a named test, manual review, Revit runtime — or `ESCAPED` if it reached downstream before anyone caught it> |

---

## 1. Symptom
<What was actually observed, concretely. Numbers, pixel deltas, the failing element, the exact
error. Enough that someone can reproduce it. Attach/reference a snapshot if visual.>

## 2. Impact
<What went (or would have gone) wrong if this shipped. Be honest about blast radius. Flag it here if
it touches an NEC non-negotiable (CLAUDE.md §6) or a golden-case divergence — those are always S1/S2.>

## 3. Root cause
<The real defect, once known. Not the symptom — the mechanism. "Anchor recomputed from narrative
floor name instead of rendered Y" beats "annotation misplaced". Leave as `TBD` while investigating.>

## 4. Resolution
<What fixed it. List files changed. If `wont-fix`, state why and what the accepted workaround is.>

## 5. Regression guard  ← the point of this whole log
<The new gate / test / assertion that makes this failure LOUD next time. This is mandatory for any
`fixed` entry. Reference it by name (e.g. "new assertion in strip_compare.mjs", "G# baseline
re-blessed"). If you genuinely can't guard it yet, say so explicitly and open a follow-up — an
unguarded fix is how G8-class blind spots are born.>

## 6. Detection gap (only if `Detected by: ESCAPED`)
<Why did every existing gate stay green while this was broken? This section is how the gate suite
grows — G8 exists precisely because G1 + parity_test were blind to a new geometry key.>

## 7. Links
- Related failures: <FL-XXXX, …>
- Specs / contracts touched: <file §section>
- Gates involved: <G#, …>
- Memory / session: <memory slug or Trip/Session #>
