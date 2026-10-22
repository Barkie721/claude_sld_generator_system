# FL-0024 — the title-block template carries its own byte-copy of the number-scrape extent heuristic, fixed nowhere, dormant only because nothing in that file can emit a transformed group

| Field | Value |
|-------|-------|
| **ID** | FL-0024 |
| **Title** | a dormant twin of FL-0007 survives in `titleblock_template_30x42_V1_0_0.html` |
| **Opened** | 2026-08-01 |
| **Closed** | — |
| **Status** | **`open` BY CHOICE** — see §4. This is a recorded decision, not an unfinished task |
| **Severity** | `S4` (latent; `S2` the day it fires) |
| **Stage** | 6 Render/Revit |
| **Component** | `01_inputs/templates/titleblock_template_30x42_V1_0_0.html:456` — `measureMarkupExtent(markup)` |
| **Failure class** | duplicated-defect / latent |
| **Detected by** | the FU-0008 prep review, 2026-07-31, asking what else in the repo shares the shape of the defect about to be fixed. **No gate found it and no gate could: it produces no output difference today.** |

---

## 1. Symptom

There is no symptom. That is the entry.

`04_renderer/sld_viewer_engine_V1_0_0.html` was fixed on 2026-08-01 (FU-0008, engine rev 1.0.15).
The title-block template defines its **own** `measureMarkupExtent` — a different signature
(`measureMarkupExtent(markup)`, no `opts`, no G[] device-anchor step, because the demo has no
layout globals) — and it still carries the **identical defect**, `< 10000` clamp and all:

```js
(inner.match(/-?\d+(?:\.\d+)?/g) || []).forEach(n => {
  const a = Math.abs(parseFloat(n));
  if (a < 10000 && a > r) r = a;
```

It is byte-copied a second time to the golden's frozen
`09_tests/Hospital Example (Golden Case)/hospital_titleblock_30x42_V1_0_0.html:458`.

## 2. Why it does not fire — measured, not assumed

The heuristic only engages on `<g transform="translate(…)">` groups.

```
$ grep -c 'transform="translate' 01_inputs/templates/titleblock_template_30x42_V1_0_0.html
1                      # ← and that one occurrence IS the regex itself
$ grep -c '<g[^>]*transform="translate' 04_renderer/snapshots_titleblock/titleblock_template_S1_*.svg
0
0
```

**There is no emitter anywhere in that file that can produce a translate-rooted group**, and the
template declares exactly one sheet (`S1`). So the twin is dormant **by construction**, not merely
dormant on the two sheets someone happened to render.

> That distinction is what decided the scope. The FU-0008 prep brief reached "engine only" from the
> two rendered snapshots and flagged its own limit — *"I checked the two rendered S1 snapshots, not
> every sheet the template can build … if you widen scope, re-measure rather than trusting this
> line."* Re-measured at the source, the conclusion holds **more** strongly than it was stated.

## 3. Impact

**None today. Real the day it changes.** `G7 titleblock-derivation` renders this template and
`04_renderer/snapshots_titleblock/` is PNG-pinned by G6, so a *change in output* is gated. What is
not gated — and cannot cheaply be — is the defect itself, because a defect with no output is
invisible to an output gate.

The day someone adds a transformed group to a title block, its extent starts being set by whatever
digits its metadata happens to contain: a project number, a scale, a date. That is FL-0007 again,
in the one artifact that every drawing in the set carries.

## 4. Resolution — deliberately NOT fixed, and why

**Fixing it was considered and rejected for this change-set**, not overlooked:

- FU-0008 §3 scopes the change to `measureMarkupExtent()` **step 1 of the engine**, and §5 predicts
  a blast radius of exactly G5 + G6-composed. Touching the template would have moved
  `04_renderer/snapshots_titleblock/` and G7 as well.
- **A re-bless is defensible in proportion to how precisely its blast radius was predicted
  beforehand.** The prediction here was exact — the two title-block PNGs came out byte-identical
  (`60817f91` / `b9d8ecdc`) while the four composed pages moved — and that is the evidence that the
  change did what it said. Widening it to a copy that provably cannot fire would have spent that
  evidence for no behavioural gain.
- The golden's copy is inside a **frozen oracle**; changing it is a golden re-freeze of its own.

**The cost of the decision is this file, and `00_Docs/drift_surfaces_V1_0_0.md` §7**, which is the
document that exists for precisely this shape and did not list the pair until now.

**What fixing it would take, when someone does:** port `_mmeScan` / `_mmeTransform` from the engine
(they are self-contained and depend only on `_snapAttrs` / `_snapTextLen`, both of which the
template already has), re-render `04_renderer/snapshots_titleblock/`, re-bless the two title-block
entries in `04_renderer/baseline_composed_sha256.txt`, re-copy the template to the golden's
byte-copy, and re-run G6 + G7. **Expect zero pixel change** — if anything moves, the dormancy
argument above was wrong and that is the finding.

## 5. Regression guard

**None, and none is cheap.** Enumerated honestly:

- An output gate (G6/G7) cannot see a defect that produces no output.
- A "these two functions must be identical" gate would be **false**: they legitimately differ in
  signature and in the anchor step. It would also go red on the correct state that exists today.
- A grep for `< 10000 && a > r` would work and would be one line — but it lives in `sync_gate`,
  whose check-NAME baseline gate 14 pins at 14 names / 12 quick. Adding it is a deliberate act for
  its own change-set, with its own re-bless. **Listed as an option, not smuggled in as a rider.**

The standing guard is the drift-surfaces entry plus this file.

## 6. Detection gap

Same class as FL-0007 §6 and one turn worse: not "no gate compares the frame to the content", but
**"no gate can see a defect whose output is currently identical to the correct output."** The only
instrument that found it was a human reading the fix and asking *what else looks like this* — which
is not repeatable by construction, which is why it is written down instead.

## 7. Links
- Parent: **FL-0007** (the same defect in the engine, `fixed` 2026-08-01)
- Fixed by / alongside: **FU-0008** (`shipped` 2026-08-01, engine rev 1.0.15)
- Drift surface: `00_Docs/drift_surfaces_V1_0_0.md` **§7**
- Gates involved: G7 (renders the template), G6 (PNG-pins its output) — both green, both blind
- Sibling deferral from the same change-set: **FU-0013** (restate the acceptance targets)
