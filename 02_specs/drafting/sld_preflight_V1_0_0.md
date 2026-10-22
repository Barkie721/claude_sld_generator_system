# SLD Preflight — Phase 3 Geometry Validation (V1.0.0)

Machine-checkable geometry assertions run after the layout engine, on the schema-§14 geometry block. Every rule is bound to the **as-built coordinate model**: floating origin with valid negative coordinates, extent-derived `content_area`, and the compose-time page transform under which **page fit is guaranteed by construction**.

The result payload declares `preflight_version` `"1.0.0"`. A 0-anchored bounds reading — "every anchor/bbox/vertex within `(0,0)..(content_w_px, content_h_px)`" — assumes a content box the shipped engine never had; run as written it would **hard-fail the pixel-frozen hospital golden** (anchors at x = −767.5, y = −640; schema §14.3). That reading is retired, not recalibrated.

**Implemented by:** `08_validation/` (rules `SH-2..SH-6`). New assertions enter at **info** severity first (§6 calibration protocol).

> **Note.** The office geometry oracle was retired with the **Office Example**. The `SH-2b`/`SH-4`/`SH-5b` → `soft_fail` promotion (§6) was gated on *two* geometry-bearing goldens; with only the hospital left it is **blocked until a new second geometry-bearing building exists**. All Phase-3 rules stay at their shipped severities — nothing is loosened.

This is one of the working files in the SLD library:
- **`sld_layout_engine_V1_0_0.md`** — coordinate model (§1), compose-time page transform (§8) this file binds to
- **`sld_topology_schema_V1_0_0.md`** — §14 geometry block (the input contract; validators must not require non-emitted data)
- **`sld_topology_rules_V1_0_0.md`** — §7 rule taxonomy and Phase-3 execution order
- **`sld_system_model_V1_0_0.md`** — symbol geometry (incl. §A-7), source of the envelope dimensions in §2

---

## 0. Scope and Execution Context

**Purpose.** Validate the exported geometry block for *internal consistency*, *finiteness*, *legibility*, and *relative collision quality*. Absolute page-fit is **not** validated here: `pageCore` scales any finite extent into the drawing area (`sld_layout_engine_V1_0_0.md` §8), so fit cannot fail — what can fail is the geometry block lying about itself (SH-2a), content so spread out it composes illegibly small (SH-2b), or elements orphaned far from the diagram (SH-4/SH-5b).

**Precondition.** A topology WITH_GEOMETRY: the eleven-key §14 block (seven required, four optional) produced by `exportGeometry()` / `run_layout.mjs`.

**Input facts this version relies on (as-built, schema §14 + exporter):**
- `devices` carry **anchor only** (`{anchor: {x, y}}`); no bboxes are exported. Device envelopes are a *validator-side conservative model* (§2), not engine data.
- `annotations` carry a **single `{x, y}` point**, and only capture-hooked annotation types actually present are emitted (as-built: **A-1 and A-3** — the hooks sit in `renderTag` and `renderSquiggle`). Rules apply to the entries present; absent types are not required.
- `content_area = { width_px: ceil(max exported x), height_px: ceil(max exported y) }` — **max coordinates, not spans** (`height_px` is `maxY` so the bottom-most element maps to Revit Y = 0). `minX`/`minY` are tracked during export but not emitted.
- `layout_warnings` are strings; `tap_positions` are **not emitted** (§14.4). **`sections` bounds ARE emitted** (§14.7) — so **SH-6 is now ACTIVE** (§3.6), reading section anchors directly. (L1-2 Switchboard Section *devices* still receive no geometry entries, and no longer need to — the section records supply the anchors.) **`level_lines` ARE emitted** (§14.6), so the **A-7 label-box checks are active** (rule `SH-3-A7`, §3.3); only the A-7 *bounds* check remains deferred (negative `x_start`, WI-7 — §14.3).

**Output.** The §4 result contract.

## 1. Coordinate and Extent Model

Coordinates are composition px at 96 px/in, y-down, floating origin, negative values valid (layout engine spec §1). This file defines two derived envelopes per sheet:

- **`E_dev(sheet)`** — the union of device envelopes (§2 device table applied to `devices[].anchor` by node type) for devices on the sheet.
- **`E_union(sheet)`** — `E_dev` ∪ annotation envelopes (§2) ∪ all routed-element path vertices ∪ **switchboard text-zone left edges**, on the sheet. (The text zones joined `E_union`, when the SH-6 inputs landed as `geometry.sections` — see §3.6. Only the derived `text_zone_left` edge is folded in, not the section rectangles, which sit inside the device cluster `E_dev` already covers.)

**Predicted compose scale** (binds to layout engine spec §8.2, target rect 3360 × 2688):

```
extW   = max(1, E_union.maxX − E_union.minX)
extH   = max(1, E_union.maxY − E_union.minY)
s_pred = min(1, floor(min(3360 / extW, 2688 / extH) · 1e4) / 1e4)
```

`s_pred` approximates the engine's composed scale from below/above only loosely: `pageCore` measures the *rendered markup* via `measureMarkupExtent` (**since engine rev 1.0.15 / FU-0008 that is a real child-geometry scan under a transform stack — it was a crude superset heuristic before, and this sentence said so until 2026-08-01**), while `E_union` is built from exported points plus conservative envelopes. The divergence is absorbed by design (`PAGE_INNER_PAD`, frame overplot) — `s_pred` is a **legibility indicator**, not a reproduction of the engine's `s`. Reference actuals: hospital S1 composes at `s = 0.5662`, S2 at `s = 0.4841` (measured at engine rev 1.0.15 / FU-0008; **still current at rev 1.0.16**, re-derived 2026-08-03 — G6 / sync `[P6]` match all 6 composed baselines with `audit.json` `viewer_revision` at 1.0.16). ⚠️ These read **0.4416 / 0.3972** until 2026-08-01 and BOTH numbers were wrong: 0.3972 was correct for the engine of its day and was superseded by FU-0008, while **0.4416 was already stale before that** — the measured pre-FU-0008 transform was `scale(0.4454)`. Two different values for the same quantity coexisted in this repo (0.4416 here, 0.4454 in `check_page_scale.mjs` / `ACCEPTANCE.md` / FL-0007) and nothing could see the disagreement.

## 2. Bounding Box Authority

Device and annotation envelope dimensions are conservative validator-side approximations. **Authority: device boxes are the MEASURED Revit family drawn bounding boxes** — see the authoritative dimension table at the top of `sld_system_model_V1_0_0.md` and the lockstep implementation in `08_validation/lib/geometry_V1_0_0.mjs` (`deviceRelBox`). The V1.0.0 §2 values (L2-4 `(0,0,140,140)`, L2-2 `(0,0,47,47)`, L0-1 `(−20,0,180,180)`, L2-3 `(0,−30,140,230)`) are superseded. (the engine now exports per-device `w`/`h`/`anchor_mode` in §14.1 — this envelope table is retained ON PURPOSE, since it encodes envelopes (text extents, clearances, flex paths), not drawn boxes; see the note in `geometry_V1_0_0.mjs`.) (The older attribution to "layout engine §5.1" stays retired — that engine section was never implemented.)

- **Device envelopes:** L2-4 `(0,0,64,88)`; L2-2 `(0,0,49.17,35)` + L-path expansion `(−19,0,68.17,61)`; L2-1/L1-1 breaker boxes at `CB_HEIGHT 44.37` + text extent (L2-1 extends UP from its bus-dot anchor; L1-1 down); L2-5 `(0,0,40.33,26)`; L2-6 `(0,0,36,15)`; L1-4 `(0,0,36,36)`; L1-6 `(0,0,20.14,67.22)`; L2-8 `(0,0,36,35.88)`; L2-11 `(0,0,72,72)`; L3-2 `(0,0,24,32)`; L2-3 `(0,0,72,72)` (external stubs removed — feeders land on box edges); L0-1/L0-2 `(0,0,168,200)` (140-tall family box + dashed clearance; L0-2 borrows as approximation); L3-1 `(0,0,24,32)` (measured — joined the measured set, the fire-pump family retune). UNMEASURED legacy: L3-3 `(0,0,54,54)`, L1-5 `(0,0,140,140)` provisional. Applied to the exported anchor: `abs_left = anchor.x + rel.left`, etc. Auxiliary types (L1-2, L1-3, L2-7) keep zero-size anchor-point boxes; L1-4/L2-8 now carry real boxes but remain excluded from SH-3 pairwise (`SH3_EXCLUDED_TYPES` unchanged).
- **Annotation envelopes (WI-7 rewrite — bbox-derived from the single `{x, y}` point).** The geometry block no longer carries `tick_position`/`side`/`apex_position`/`rotation`/`mode` (§14.4), so the V1 side-aware formulas cannot run. Each annotation type gets a **symmetric worst-case envelope centered on its exported point**, using the same symbol dimensions:

| Type | Envelope centered on `(x, y)` | Derivation |
|---|---|---|
| A-1 Feeder Tag | `(x − hw, y − tag_pill_h/2, 2·hw, tag_pill_h)`, `hw = tag_leader_length + tag_pill_w_xfmr(90)` | side unknown → mirror the one-sided box both ways; T-suffix pill width as worst case |
| A-2 Conduit Callout | `(x − hw, y − callout_leader_rise, 2·hw, callout_leader_rise + callout_r)`, `hw = callout_leader_run + callout_stub_length + text_w`, `text_w ≈ 8px · char count` | symmetric V1 formula |
| A-3 Squiggle | `(x − 15, y − 10, 30, 20)` | already point-symmetric |
| A-4 / A-5 FC/VD Tag | `(x − 20, y − 10, 40, 20)` | already point-symmetric |
| A-6 Hex Note | `(x − 22, y − 22, 44, 44)` | bounding circle; leader extent not recoverable from one point — accepted approximation |
| A-7 Level Line | **active**: line `(x_start, y − 1, x_end − x_start, 2)` + label box `(x_end − label_w_est, y − 9, label_w_est, 13)` from the §14.6 `level_lines` export (`label_w_est` = 8 px/char, monospace house rate) | A-7 line boxes span the cluster **by design** and are excluded from SH-3; label boxes are checked at **info** by rule `SH-3-A7` (§3.3). Envelopes are **not** folded into `E_dev`/`E_union` — A-7 extent/bounds handling stays deferred with WI-7 (negative `x_start`), so `s_pred`/SH-4/SH-5b are unaffected. |

> **Approximation note:** these envelopes are deliberately superset-conservative. They feed E_dev/E_union and the SH-3/SH-4 relative checks — none of which require exact text metrics.

## 3. Validation Rules

Severity vocabulary: `hard_fail` (geometry block must not be consumed), `soft_fail` (renderable but degraded; EOR review), `info` (advisory/report-only). Per H's calibration discipline, the rules marked *(new)* enter at **info** and promote only after both goldens pass clean (§6).

### 3.1 SH-2a — Geometry-Block Self-Consistency (hard_fail)

Assertions, per topology:
1. Every numeric value in the geometry block (`devices[].anchor`, `routed_elements[].path_vertices[]`, `annotations[].{x,y}`, `content_area`) is finite — no NaN/±Infinity/null-where-number.
2. `content_area.width_px == ceil(max x over all exported coordinates)` and `content_area.height_px == ceil(max y over all exported coordinates)`, tolerance **±1 px** (the exporter runs its running-max on unrounded values, then `ceil`; the block stores values rounded to 2 decimals — recomputation from stored values can differ by 1 after `ceil`).

Why the goldens pass: the exporter computes `content_area` from the same coordinates it emits (`exportGeometry`, grep `Running content extents`), so consistency holds by construction; the check catches hand-edited or merge-corrupted geometry blocks and exporter regressions.

### 3.2 SH-2b — Predicted Compose-Scale Legibility (info) *(new)*

Assertion, per sheet: `s_pred ≥ 0.20` (§1 formula over `E_union(sheet)`).

Catches extent explosion — a device or vertex placed 50,000 px from the diagram crushes the composed scale for the whole sheet (fit still succeeds; legibility dies). Threshold rationale: hospital actuals **0.5662 / 0.4841** (measured at rev 1.0.15, unchanged at rev 1.0.16) both clear 0.20 with margin — and by MORE margin than the 0.4416 / 0.3972 this line quoted until 2026-08-01, so **the 0.20 constant needs no re-tune and was not touched**; the threshold sits below the smallest golden scale **and** the rule is info-only (double safety). The 0.20 constant is a §6 calibration constant, tunable.

### 3.3 SH-3 — Device Envelope Collisions (soft_fail)

No two device envelopes on the same sheet overlap by more than **25 px²**; excluded types `{L1-2, L1-3, L1-4, L2-7, L2-8}`; overlap area = axis-aligned intersection. Origin-agnostic (pure relative geometry), so the floating origin changes nothing. Note: the engine already surfaces an SH-3-style collision advisory through its `__audit` API; the preflight implementation is the systematic pass. **A-7 (active):** line boxes excluded; label boxes checked at **info** by the dedicated rule `SH-3-A7` (label-vs-label and label-vs-device on the same sheet), so any A-7 finding is non-gating and separated from the device-collision `warning` severity of SH-3 proper.

### 3.4 SH-4 — Annotation Proximity Envelope (info) *(new — WI-7 rewrite)*

Assertion, per annotation entry present in the block: its §2 envelope lies entirely within `E_dev(sheet)` **inflated by 1000 px per side**.

In place of an absolute `0..content_w_px` containment (meaningless under the floating origin) this is an **orphaned-annotation detector**: tags/callouts/squiggles always sit within chain heights (`chain_h_min` 444, `chain_b_h` 791) of the equipment they annotate, so 1000 px of slack passes every legitimate placement while catching an annotation stranded far from the diagram — which would also silently drag `E_union` and crush SH-2b. The 1000 px inflation is a §6 calibration constant. Scope note: as-built the block carries A-1/A-3 points only; the rule applies to whatever entries exist and never *requires* an annotation type to be present (that is Phase-1/2 territory: TV rules).

### 3.5 SH-5 — Routed-Element Path Sanity

- **SH-5a (hard_fail):** every routed element in the block has `path_vertices` with ≥ 2 vertices, all finite. (Render-crash prevention; trivially true for both goldens.)
- **SH-5b (info) *(new)*:** every vertex lies within `E_dev(sheet)` inflated by **500 px** per side. Feeders and buses connect placed devices; a vertex farther out than 500 px indicates a mis-harvested route or a stranded stub. Calibration constant, tunable. Sheet resolution: a routed element's sheet is its topology `sheet_id`; cross-sheet pair segments are validated on their own sheet only.

### 3.6 SH-6 — Switchboard Text-Zone Extent (**ACTIVE**) *(rescoped from hard_fail)*

A `sw_anchor_x − switchboard_text_zone_w ≥ 0` assertion is deliberately **not** made — under the floating origin the golden's leftmost sections make that expression negative by design (the text zone simply extends the extent leftward, and compose absorbs it; layout spec §8).

The rescoped rule is definitional: `text_zone_left = section_anchor_x − switchboard_text_zone_w(200)`, finiteness-only, reported per sheet and folded into `E_union`.

**Its input landed.** `geometry.sections` (schema §14.7) exports the section rectangles the engine had always drawn but never emitted, supplying `section_anchor_x` directly — so the rule flipped `status: 'deferred'` → `'active'`, severity `info`, in the same change-set. It had been registered deferred *purely* for want of this input; the rule body is this spec as written, not a new design. Note it reads **section anchors**, not L1-2 device entries — L1-2 devices still receive no geometry entries and no longer need to. The prohibition stands unchanged: **do not synthesize section positions from other device anchors** — the exporter emits them for real.

Implementation notes (`08_validation/`): `buildGeometryModel` records sections per sheet and folds each `text_zone_left` into `E_union`. Two traps worth stating, both found by test rather than review:
- Sections are recorded **even when non-finite**, unlike devices/routes/annotations. SH-6 is a finiteness check on exactly this input, so filtering non-finite sections out of the model first would make it permanently vacuous — and SH-2a does **not** cover sections (they are excluded from `content_area` by design, so feeding them to SH-2a's running max would break its `content_area ±1` assertion). The NaN-free-envelope invariant is preserved the narrow way instead: a non-finite `text_zone_left` is never folded into `E_union`.
- `text_zone_left` must be guarded with `isFinite(section_anchor_x)` **before** the subtraction. JS coerces `null - 200` to `-200`, which would pass a finiteness check on the *result* and hide the malformed anchor the rule exists to catch.

Effect is nil in practice, but the reasoning matters more than the result. **SH-4 and SH-5b inflate `E_dev`, not `E_union`, so widening `E_union` does not touch them at all.** The only consumer of `E_union` is `s_pred`, and widening it *lowers* `s_pred` — making SH-2b's legibility floor **stricter**, not more permissive. This is therefore not a structurally-safe change; it is inert only because the magnitude is small: sections start at x = 240, so `text_zone_left` = 40, well inside each sheet's existing extent (measured left edges S1 −200 / S2 −829.5), and `s_pred` is unmoved (S1 0.5778 / S2 0.4878) on all three live cases. The fold also feeds `sec.y` and `sec.y + sec.h`, so a future case whose sections fall outside the vertical extent could move `s_pred` — **re-verify, do not assume.** Verified on all three re-frozen goldens — SH-6 now exercises against the frozen hospital golden too, since its geometry block carries `sections`.

### Rules not carried

The 0-anchored readings — SH-2 "device anchors within `(0,0)..(content_w, content_h)`", SH-4/SH-5's absolute bounds, and SH-6's `≥ 0` assertion — are retired per schema §14.3, recorded here so no future session "restores" them against the golden.

## 4. Result Contract

The result envelope carries a `severity` field per rule (`hard_fail` | `soft_fail` | `info`) and a `calibration` echo so every run is auditable against the constants that produced it.

```json
{
  "preflight_version": "1.0.0",
  "schema_version": "1.0.0",
  "timestamp": "<run time>",
  "effective_px_per_inch": 96,
  "sheet_template": "30x42",
  "sheets_validated": ["S1", "S2"],
  "calibration": {
    "s_pred_min": 0.20,
    "sh4_inflate_px": 1000,
    "sh5_inflate_px": 500,
    "sh3_overlap_px2": 25
  },
  "aggregate": {
    "status": "PASS | WARN | FAIL",
    "hard_fail_count": 0, "soft_fail_count": 0, "info_count": 0, "pass_count": 0,
    "rules_evaluated": ["SH-2a","SH-2b","SH-4","SH-5a","SH-5b","SH-3","SH-6"],
    "rules_skipped": []
  },
  "rules": {
    "SH-2b": {
      "severity": "info",
      "status": "INFO",
      "violations": [{
        "sheet_id": "S1",
        "s_pred": 0.1471,
        "threshold": 0.20,
        "extent": { "minX": -870, "minY": -3568, "maxX": 22000, "maxY": 4950 },
        "violation": "predicted compose scale 0.1471 below legibility threshold 0.20"
      }]
    }
  }
}
```

Aggregate logic: `FAIL` if any `hard_fail`-severity rule has violations; else `WARN` if any `soft_fail` rule has violations; else `PASS`. `info` findings never change the aggregate — they are surfaced in counts and payloads only. The V1 `COLLISION_WARNING` append-to-`layout_warnings` integration carries over for SH-3, with `"source": "preflight"`; `layout_warnings` entries are strings as-built (schema §14), so the appended form is the string rendering of that record.

## 5. Execution Order

```
SH-2a  (hard)     → if FAIL: stop — the block is inconsistent; nothing downstream is trustworthy
SH-5a  (hard)     → if FAIL: stop
SH-2b  (info)
SH-4   (info)
SH-5b  (info)
SH-6   (info)     — text-zone finiteness (active; only when sections present, §3.6)
SH-3   (soft)     — O(n²) pairwise last, skipped only when a hard rule failed
SH-3-A7 (info)    — A-7 label-box collisions (active; only when level_lines present, §3.3)
```

## 6. Calibration Protocol (H discipline)

1. New rules enter at **info**. Promotion path: `SH-2b`, `SH-4`, `SH-5b` → `soft_fail` was gated on *both* geometry-bearing goldens passing clean at the shipped constants. The office geometry oracle was **retired**; the promotion now needs a new geometry-bearing second building and is **blocked** until one exists. The hospital WITH_GEOMETRY case still verifies clean through `08_validation/check_acceptance_V1_0_0.mjs`.
2. The §4 `calibration` constants (0.20 / 1000 / 500 / 25) are initial values — they may be tuned against the goldens, recording each change and its acceptance-gate output.
3. **Never weaken the acceptance gate to force a rule through.** A golden failing a rule as spec'd means the rule *reading* is wrong (spec-follows-engine) — report it back to the spec, do not special-case the gate.
4. A-7 label-box rules (§2 last row, §3.3 note → rule `SH-3-A7`) are **active since the §14.6 `level_lines` export landed**; the A-7 *bounds* check stays deferred with WI-7. **SH-6 is active since the §14.7 `sections` export landed** (§3.6). The standing prohibition is unchanged and still applies to any future dormant rule: do not synthesize section positions from other device anchors — the exporter must emit them for real (level lines and sections both now do).

## 7. Dependency Summary

**Consumes:** schema §14 geometry block; `sld_system_model_V1_0_0.md` symbol dimensions (§2 envelopes); layout engine spec §8.1 target rect (3360 × 2688) and §8.2 scale formula; `sld_topology_rules_V1_0_0.md` §7 Phase-3 order.

**Consumed by:** `08_validation/` Phase-3 implementation; the topology-rules §7 execution order references this file by name.
