# FL-0007 — `measureMarkupExtent` bounds every transformed group by a ±r square where r is the largest NUMBER in its markup, so an A-4 pennant inflates the sheet viewBox by up to 837 px per side

> ⚠️ **EVIDENCE ARCHIVED 2026-07-28.** This entry cites paths under `09_tests/` that no longer
> exist: the **9-Story Hospital - 2x2000 kVA** project folder — sheet S1A, its `check_page_scale.mjs`,
> `PHASE4_SPLIT.md` §3 and `PHASE5_EES.md` §5 — was deleted on 2026-07-28 at Mayo's instruction.
> The finding itself is unaffected — the phantom radius is in `measureMarkupExtent` in the live engine, and the per-pennant amendment
> (~1,400 px charged per A-4 pennant at the vertical extremes, not per sheet) is restated in full in
> `03_contracts/current_state_manifest.json`. The generalized `check_page_scale.mjs` also survives in
> `09_tests/_PROJECT_TEMPLATE/4_checks/`. What is gone is the measured S1A example (y −2135 → 4290).
> To re-read the evidence, restore from the pre-delete repo tarball (the only copy; there is no
> git): `/storage/emulated/0/Download/sld_snapshot_pre-delete-09tests_2026-07-28.tgz`.
> Context and what the delete cost: `09_tests/README.md`.

| Field | Value |
|-------|-------|
| **ID** | FL-0007 |
| **Title** | fault-current digits and `font-weight="700"` set the sheet bounding box |
| **Opened** | 2026-07-27 |
| **Closed** | 2026-08-01 |
| **Status** | **`fixed`** — engine rev 1.0.15, FU-0008, golden refreeze batch 2 |
| **Severity** | `S2` |
| **Stage** | 6 Render/Revit |
| **Component** | `04_renderer/sld_viewer_engine_V1_0_0.html` — `measureMarkupExtent()`, step 1 |
| **Failure class** | spec-value-deviation |
| **Detected by** | manual review — 9-story hospital Phase 4, chasing a 1,400 px gap between modelled and actual sheet height. **ESCAPED every gate.** |

---

## 1. Symptom

On `09_tests/9-Story Hospital - 2x2000 kVA/` sheet S1A, drawn content runs y −2135 → 4290
(**6,425 px**), but the emitted viewBox is **7,850 px** tall. Both extremes are phantom — neither
corresponds to any ink:

```
minY  −2817   PENNANT@(2098,−2117) r=700     true topmost ink  −2135  (2M-R-A box)
maxY   5013   PENNANT@(1158,4176) r=837      true lowest  ink   4290  (level-5 line label)
```

Composed scale is `2688 / (vbH − 240)`, so S1A composes at **0.3532** where its own content justifies
**~0.403**. S1 shows the same effect (6715 vs ~6100 of ink).

## 2. Impact

**Every sheet of every project composes smaller than its content requires**, by up to ~1,400 px of
sheet height — roughly a 15–20 % scale loss on a short sheet, less on a tall one. Concretely:

- It silently invalidates sheet-height planning arithmetic. `REDESIGN_hosp9.md`'s
  `H = 1263 + Σ(steps)` model predicts *drawn* height accurately (S1A came in 258 px BETTER than
  modelled) yet its scale gates were missed by 13 %, because scale is set by the box, not the ink.
- It is **not** a wrong drawing — no element moves, nothing collides, nothing is dropped. It is a
  wrong FRAME, and the cost is legibility on paper: 11 px body text at 0.0405 in instead of ~0.046 in.
- The golden case carries the same phantom, so `check_page_scale.mjs`'s golden reference
  (S1 0.4454 / S2 0.3972) is inflated identically and comparisons against it stay valid. **This is
  why it was not fixed on discovery** — fixing it re-frames the golden too.

## 3. Root cause

`measureMarkupExtent()` step 1 consumes transformed groups so their local coordinates do not pollute
the global scan, and bounds each one with a crude radius:

```js
let rest = markup.replace(/<g\b[^>]*transform="translate\((-?[\d.]+),\s*(-?[\d.]+)\)[^"]*"[^>]*>([\s\S]*?)<\/g>/g,
  (whole, tx, ty, inner) => {
    const ax = parseFloat(tx), ay = parseFloat(ty);
    let r = 0;
    (inner.match(/-?\d+(?:\.\d+)?/g) || []).forEach(n => {     // <-- EVERY number in the markup
      const a = Math.abs(parseFloat(n));
      if (a < 10000 && a > r) r = a;
    });
    ext(ax - r, ay - r); ext(ax + r, ay + r);
    return '';
  });
```

`inner` is markup, not geometry. For an A-4 fault-current pennant it contains
`font-weight="700"` and the tag text itself, so:

| pennant text | numbers seen | claimed radius |
|---|---|---|
| `41,837A` | 41, **837**, 700, 93, 53, 12… | **±837 px** |
| `2,871A` | 2, **871**, 700… | **±871 px** |
| `9,571A` | 9, 571, **700**… | **±700 px** |
| any tag at all | `font-weight="700"` | **±700 px floor** |

The true geometry of a pennant is the `<path d="M0,0 L13,-10.5 L93,-10.5 L93,10.5 L13,10.5 Z">`
plus its label — on the order of ±100 px. The scan overstates it by 7–9×.

Both attributions agree:
- Variant topology with every `fc_amps` = 1: S1A 8070 → **7933** (−137), S1 6715 → **6407** (−308).
  Small precisely because `font-weight="700"` still bounds the group at ±700 once the digits are gone.
- Replaying the regex over the emitted markup names the exact driver at each extreme (§1).

## 4. Resolution

> ## ✅ FIXED 2026-08-01 — FU-0008, engine rev 1.0.14 → 1.0.15
>
> **What shipped.** Steps 1-3 of `measureMarkupExtent` now live in `_mmeScan`, which walks the same
> shape/text math under a real transform stack (`_mmeTransform` / `_mmeMul`, 2x3 affine, regex-only
> so browser and `node:vm` agree). A transformed `<g>` is measured by its **actual children** with
> translate/rotate/scale/mirror composed, recursively; nested groups close at their own `</g>`
> instead of the old non-greedy first one; and shape/text elements carrying their own `transform`
> compose too, because a child transform ignored is precisely "the recursion missed a child".
> `rect`/`text` emit four corners rather than two opposite ones — a no-op under the identity, and a
> bound rather than a guess under rotation.
>
> **What moved, measured:**
>
> | | before (rev 1.0.14) | after (rev 1.0.15) |
> |---|---|---|
> | golden S1 viewBox | 6390 × 6274 | **6174 × 4949.59** |
> | golden S2 viewBox | 5199 × 7007 | **3963.65 × 5791.59** |
> | composed scale S1 / S2 | 0.4454 / 0.3972 | **0.5662 / 0.4841** |
> | 11 px body text, S2 | 0.0455 in | **0.0554 in** |
> | Sprouts S1 viewBox | 4440 × 6697 | **4224 × 5372.59** |
> | frame honesty, every sheet | 216–680 px of phantom | **0.00 px on all four sides** |
>
> **What did NOT move, also measured:** `run_layout.mjs --gate` **0.0000 px, 0 mismatches** — no
> anchor, no vertex, no ink changed, which is the whole point (§2's "it is not a wrong drawing, it
> is a wrong FRAME"). `--audit out_of_frame` stayed **0** on every sheet of every project, so the
> tighter frame clips nothing. **`Default 2500 kVA Service` re-rendered to a BYTE-IDENTICAL
> viewBox** (`-634 2738 2404 2352`) — it carries no pennants, and it is the control case proving
> the untransformed path is untouched. Both title-block PNG baselines are byte-unchanged
> (`60817f91` / `b9d8ecdc`), so only 4 of G6's 6 entries moved.
>
> **Baselines re-blessed deliberately:** G5 (4/4 golden sheet PNGs) and G6's 4 composed pages, with
> before/after PNGs rendered and eyeballed side by side at matched height. G7 and G9 were never
> candidates. Recorded in `03_contracts/current_state_manifest.json` under
> `artifacts.png_baselines.refreeze_batch_2`.
>
> ⚠️ **What was deliberately NOT done, and is still owed:** the acceptance band 0.35–0.46, the
> "11 px ≈ 0.0455 in" bar and "every sheet height-bound" were all derived from the inflated
> numbers and are **now stale** — honest sheets legitimately report out-of-band, and the golden's
> own S1 is now **width-bound**. FU-0008 §3 forbids re-tuning targets in the change-set that moved
> the measurement, so restating them is **FU-0013**. And the title-block template still carries a
> byte-copy of the old heuristic, dormant by construction — **FL-0024**.

**The original analysis, as written 2026-07-27 — the shape of the fix was correct.** The reason to
schedule it rather than do it: — bound a transformed group by its actual child geometry
(recurse the shape scan into `inner` with the translate applied, exactly as steps 2–3 already do for
untransformed markup) rather than by a number-scrape. The reason to schedule it rather than do it:

- It changes the viewBox of **every sheet in the repo, including the frozen golden**, so **G5/G6 PNG
  baselines move** and must be deliberately re-blessed. That is a re-freeze, not a default-inert OFF.
- It is not reachable by `layout_config` — there is no key, and there should not be one.
- It shifts the reference numbers everything else is currently judged against
  (`check_page_scale.mjs` golden reference, the `REDESIGN_hosp9.md` acceptance table 0.35–0.46, the
  "11 px body text ≈ 0.0455 in" bar), all of which were measured with the phantom in place.

Scheduled as **FU-0008** (P1). Until then, budget it: `s ≈ 2688 / (drawn_height + 1400 + 240)`.

## 5. Regression guard

> ## ✅ SHIPPED WITH THE FIX, 2026-08-01
>
> `08_validation/lib/ink_extent_V1_0_0.mjs` — a **deliberate second implementation** that re-derives
> the extent by walking the emitted SVG with its own transform stack, so a defect in
> `measureMarkupExtent` cannot hide inside the thing that checks it. Truth lives there once; both
> consumers import it rather than carrying a copy:
>
> - `09_tests/Hospital Example (Golden Case)/tests_V1_0_0/behavior_test.mjs` — **suite-invoked**
>   (gate `behavior`, now **52 checks**, up from 43). Asserts per sheet that `viewBox` minus the
>   120 px pad equals the true ink extent within ±2 px, plus unit tests of the transform algebra and
>   an explicit FL-0007 regression test: the exact `41,837A` pennant must measure 1000..1093 px, not
>   the ±837 square the scrape gave it.
> - `09_tests/*/4_checks/check_page_scale.mjs` §3 — per project, over that project's own rendered
>   sheets, with a `RESULT frame_honesty` line for stage 14. Landed in **`_PROJECT_TEMPLATE`**, the
>   copy that reaches every future project, and propagated to both live projects (all three
>   byte-identical).
>
> **It has a demonstrated failing arm** rather than being a never-red check: run against the
> pre-fix committed golden snapshots it reports `ok: false, worst 680.00 px` on S1 and `640.41 px`
> on S2; against the post-fix ones, `0.00`. **Both directions fail** — positive slack is phantom
> frame, negative slack is clipped ink, which is the new failure a tighter measurement could
> introduce and which `--audit out_of_frame` only sees past its own 400 px pad.

**As originally scoped, 2026-07-27:** a check that the emitted viewBox agrees with the drawn ink. `09_tests/9-Story Hospital - 2x2000 kVA/check_page_scale.mjs` already parses the snapshot
SVGs and is the natural home — assert `viewBox` minus the 120 px pad equals the true extent of
`<rect>`/`<text>`/`<line>`/`<path>`, within a tolerance. Today it reports the composed scale and has
no opinion on whether the box is honest, which is exactly how this survived.

## 6. Detection gap

Every gate stayed green because **no gate compares the frame to the content**:

- **G1** compares device anchors and route vertices — all correct here; nothing moved.
- **G5/G6** compare PNGs against baselines that were themselves rendered with the phantom, so they
  are self-consistent and blind by construction.
- **G8 `strip_compare.mjs`** watches export keys, not the viewBox.
- **SH-2b** reports `s_pred`, which is **clamped at 1** and is not the composed scale anyway (see
  `check_page_scale.mjs`'s header).
- **`--audit` `out_of_frame`** tests whether ink escapes the frame. A frame that is too LARGE passes
  it trivially — the check has no opposite direction.

The class is the same one G8 exists for: several nets that each verify internal consistency, none
that verifies the quantity against ground truth.

## 6a. AMENDMENT 2026-07-27 (Phase 5) — the phantom is charged PER PENNANT, not per sheet

`PHASE4_SPLIT.md` §3 generalised the measurement to "~1,400 px of phantom viewBox per sheet, budget
it on every sheet". **Measured on the two new EES sheets, that generalisation is wrong**, and the
correction sharpens both the diagnosis and the remaining-work estimate.

The inflation is charged to `<g transform="translate(…)">` groups containing large numbers — in
practice **A-4 fault-current pennants** ("41,837A" → ±837, `font-weight="700"` → ±700). A sheet with
no A-4 tags has essentially no phantom:

| sheet | device + level-line ink | viewBox | phantom | carries A-4? |
|---|---|---|---|---|
| S1A (E-502) | 6,425 | 7,850 | **1,425** | yes |
| S3 (E-504) | 7,403 | 7,673 | **270** | **no — halt H-4** |
| S3A (E-505) | 6,053 | 6,300 | **247** | **no — halt H-4** |

The 9-story hospital's EES sheets carry no A-4 tags at all because halt **H-4** withholds every
emergency-side fault current (they derive from a generator that has not been selected). That is why
Phase 5 *beat* its modelled scale targets instead of missing them the way Phase 4 did.

**Consequences:**
- Budget the phantom **per sheet, by asking whether that sheet carries pennants near its content
  edge** — never as a flat constant. `s ≈ 2688 / (drawn_height + phantom + 240)`.
- The blast radius of the fix is narrower than FU-0008 assumed: only sheets carrying A-4 tags move.
  On this project that is S1, S1A and S2 — and **S2 is the sheet that is currently too BIG**, so
  fixing the phantom makes S2 *smaller still*. Phase 6 must not count on the fix to shrink S2.
- The radius does **not** diminish on a smaller service: any 3-or-4-digit fault current claims a
  radius of the same order, and `font-weight="700"` alone floors it at ±700 even when the value is
  neutralised. A pennant-free sheet is the only sheet with an honest box.

## 7. Links
- Related failures: FL-0005 (also "the golden's own data is what makes the default wrong")
- Specs / contracts touched: `02_specs/drafting/sld_layout_engine_V1_0_0.md` (compose-time page
  transform, §144); `03_contracts/sld_topology_schema_V1_0_0.md` §14.3 coord space
- Gates involved: G5, G6 (would move on fix); SH-2b (blind); `--audit` `out_of_frame` (blind)
- Future update: **FU-0008** (`shipped` 2026-08-01)
- Descendants: **FL-0024** (the dormant twin in the title-block template) · **FU-0013** (restate the
  acceptance targets against honest geometry) · `00_Docs/drift_surfaces_V1_0_0.md` §7 and §8
- Memory / session: `09_tests/9-Story Hospital - 2x2000 kVA/PHASE4_SPLIT.md` §3 — full measurement;
  `PHASE5_EES.md` §5 — the per-pennant amendment above
