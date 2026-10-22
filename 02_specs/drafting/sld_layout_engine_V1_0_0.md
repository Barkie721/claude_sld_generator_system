# SLD Layout Engine — As-Built Geometry Specification (V1.0.0)

Describes the **shipped** layout engine: the data-driven anchor-chain placement model, the `layout_config`/`layout_hints` configuration surface, the flag-not-mitigate overflow policy, and the compose-time page transform.

**Authoring rule:** spec-follows-engine. Every value in this document was verified against the frozen reference engine `_frozen_ref_batch4/04_renderer/sld_viewer_engine_V1_0_0.html` — grep strings in Appendix A. This document proposes no engine changes.

> **Note.** The **Office Example** was retired outright. Bare "office" references below (e.g. `subfeed_max_depth` 8, the lateral `subfeed_start_ports`, `L2-2` sub-feed types, anchor `x = −260`) record the non-default configuration the office exercised — **retained as the calibration record, frozen as-built**. Its sidecar layout config no longer exists on disk. Hospital is the sole live reference.

This is one of the working files in the SLD library:
- **`sld_system_model_V1_0_0.md`** — all symbol and tag geometry, ports, and reference SVGs (incl. §A-7 Level Annotation)
- **`sld_topology_rules_V1_0_0.md`** — assembly instructions, topology composition, and validation rules (§7)
- **`sld_layout_engine_V1_0_0.md`** (this file) — as-built geometry computation and page composition
- **`sld_preflight_V1_0_0.md`** — Phase 3 geometry validation, bound to this document's coordinate and compose models
- **`sld_topology_schema_V1_0_0.md`** — data contract; **§14 is the geometry-output authority**, §19/§20 the configuration contract

---

## 0. Scope & Authority

This document describes the placement *mechanism*. The geometry *output* contract is owned by schema §14: the engine emits exactly eleven keys — seven required plus four optional (`effective_px_per_inch`, `content_area`, `devices`, `routed_elements`, `annotations`, `level_lines`, `sections` (optional), `equipment_labels` (optional), `glyph_supplements` (optional), `bus_dots` (optional), `layout_warnings`); device entries carry `anchor` + `w`/`h`/`anchor_mode`; annotations emit `{x, y}` plus `pill: {x, y}` on A-1 entries; the exported `layout_warnings` are **plain strings** (coverage drop reports + the export summary). The *typed* warning records (§7) live only in the live `window.__LAYOUT_WARNINGS` array and the snapshot audit's advisories — they do not enter the geometry block. Where an older drafting spec and schema §14 diverge, **§14 governs for engine output** — this document defers to it throughout (§9).

The engine is embedded in `04_renderer/sld_viewer_engine_V1_0_0.html`; `sld_engine.mjs` is generated verbatim from that HTML by `gen_engine.mjs`. The edit target is always the viewer HTML.

## 1. Coordinate Model

SVG-style **y-down** axis; power flow composes **load-upward** (the service entrance anchors the bottom of the drawing; downstream floors stack above it). The service-entrance switchboard is the composition anchor.

**Floating origin.** There is no `(0,0)`-anchored content box. Coordinates are unbounded in both signs; the pixel-frozen hospital golden places anchors at `x = −767.5` and `y = −640`, the office case at `x = −260`. Nothing in the engine clamps, shifts, or validates placement against a template-derived rectangle:

- `content_area` in the geometry block is **extent-derived** — `{width_px, height_px}` of the running min/max over placed content — not a paper-size constant (schema §14.3).
- `effective_px_per_inch` is always **96**. There is no overflow reducer (`px_per_inch` step-down was never built).
- Mapping into a physical sheet happens **once, at page-composition time** (§8), as a pure wrapper transform. Layout coordinates are never re-anchored — this is the load-bearing decision that keeps the hospital golden pixel-frozen.

## 2. Dimension System — SP Composition Multiplier

The engine holds all geometric constants in a single `DIM` table. Composition **gaps** are scaled by the composition multiplier `SP = 3`; switchboard-internal dimensions are **unscaled** (`grep 'SP=3 applies to composition gaps only'`).

### 2.1 SP-scaled composition gaps (resolved)

| Constant | Formula | Resolved px | Role |
|---|---|---|---|
| `tag_gap` | `60·SP` | **180** | Feeder-tag vertical allowance in a chain |
| `equip_gap` | `40·SP` | **120** | Equipment-to-equipment vertical gap |
| `equip_stub` | `30·SP` | **90** | Entry stub above equipment |
| `ats_stub_top` | `30·SP` | **90** | ATS top stub |
| `ats_stub_bottom` | `60·SP` | **180** | ATS bottom stub |
| `riser_gap` | `40·SP` | **120** | Riser channel gap |
| `chain_h_min` | `54 + 60·SP + 40·SP + 30·SP` | **444** | Minimum feeder-chain height (breaker 54 + tag + equip + stub gaps) |
| `ats_vert_gap` | `chain_h_min · 2` | **888** | ATS row placement gap, emergency sheet only (spec-equivalent 368 at SP=1); replaces `chain_h_min` in the ATS row formula only |
| `chain_b_h` | `54 + 60·SP + 40·SP + 47 + 60·SP + 40·SP + 30·SP` | **791** | Chain-B (breaker→transformer→panel) height; 47 = `xfmr_S` |

### 2.2 Switchboard-internal constants (unscaled)

`sw_main_bus_offset` 60 · `sw_sec_bus_offset` 170 · `sw_section_h` 280 · `sw_dist_bus_offset` 110 · `sw_text_zone_w` 200 · `section_margin` 40 · `breaker_pitch_min` 130. Symbol dimensions (`cb_height` 54, `panel_S` 140, `xfmr_S` 47, `ats_S` 140, `gen_r` 55, stroke weights) import from `sld_system_model_V1_0_0.md` unchanged.

### 2.3 Riser steps (config-overridable, §4)

| Constant | Default | Role |
|---|---|---|
| `riser_step_standard` | **1200** | Standard floor-to-floor step (L3→L2, L2→L1) |
| `riser_step_roof` | **1460** | Roof→top-floor step (larger: roof sibling fan is placed at parent-bottom + 260) |

## 3. Anchor-Chain Placement Model

Placement is a set of deterministic passes driven by curated configuration (§4), not constraint relaxation:

1. **Switchboard + bus placement** — the service-entrance (or emergency) switchboard lineup is placed per `sld_topology_rules_V1_0_0.md` §2; buses derive from the section anchors (`sw_main_bus_offset`, `sw_sec_bus_offset`).
2. **Floor-anchor seeding** (`computeChainYOverrides`) — on sheets with a floor stack (`floor_order`; the legacy flat array form applies to S1 only, the object form `{sheetId: [floors]}` resolves per sheet), each floor's **Chain-A sub-dist anchor panel** (`floor_anchors[floor]`) is pinned to a Y override. Baseline: `topY = secBusY − cb_height`; `baselineEqY = topY − chain_h_min + cb_height − panel_S`. Floors walk **bottom-up** accumulating riser steps: standard step per pair, roof step when stepping onto `R`. A parallel mechanical stack walks `floor_anchors_mechanical` with its own cumulative offset from the same baseline; floors absent from the mech map are skipped.
3. **Chain placement** (`placeAllChains`) — feeder chains hang from their bus taps; anchored heads take their floor-anchor Y; chain internals compose from the §2.1 gap table. Emergency-sheet ATS rows use `ats_vert_gap` (888) in place of `chain_h_min` and honor `ats_xoffset_overrides` per-ATS X nudges plus deterministic source-2 feeder jog tiers (`JOG_TIER_SPACING` 30). Source-side cross-sheet stubs rise to `stubEndY = secBusY − chain_h_min` and terminate in an A-3 squiggle; feeders listed in the `CROSS_SHEET_STUB_DY` table (keyed by R-1 designation, positive = lower/shorter) take `stubEndY + dy` instead — hospital `F-013.S1`–`F-018.S1` at +120 (completed the set), dropping all six E-501 squiggles out of the 4MDP manual-route lane-bundle band so their default centered above-labels sit on one clear shared text row (4342). The `A3_TEXT_PLACEMENT` per-squiggle label table (`{side, dx, dy}` — `dy` added; `side` vocabulary `above`/`below`/`left`/`right`, side labels end-/start-anchored 28 px beside the curl and vertically centered on it) is the shipped mechanism for per-label conflicts and is currently EMPTY: the SQ-F-022/024 entries were retired when those stubs joined the DY table, and the four ATS entry-stub entries (engine SQ-F-025 + both exercise-case configs) were retired when those labels moved to side-left as the callsite default. the table is config-extendable via `layout_config.a3_text_placement` (same contract as `a1_tag_placement` — config entries win where both name a designation). **Per-CASE entries belong in the case's config, never the engine table:** A-3 designation series collide across cases (the same `SQ-F-30x-S2` designation can recur in different buildings with conflicting clearance needs). (EOR-scoped lists; unlisted feeders keep the callsite default.)
4. **Sub-feed placement** (`placeSubFeeds`) — panel→panel sub-feed edges are discovered from R-1 starts on `subfeed_start_ports` between `subfeed_src_types` → `subfeed_dst_types`, and placed in up to `subfeed_max_depth` parent→child rounds (fixpoint; hospital default depth 1). Chain-A sibling panels land at parent-bottom + 120 (sharing the parent's Y band); roof siblings at parent-bottom + 260. Gutter mode (§5) reroutes listed parents' fans into the gutter column. **Exit-point distribution is slot-frozen:** a parent's n exit taps spread at `slotWidth(parent)/(n+1)` pitch (140/(n+1) for L2-4), symmetric about the drawn-box center — keyed to the frozen slot constant, NOT the drawn family width, so exits may overhang the drawn box (an earlier retune had left this pitch on the drawn width, collapsing exit combs). The singleton exit shift is `−slotWidth/4` under the same policy. Exception: parents listed in the `EXIT_PITCH_OVERRIDES` table take its fixed pitch instead — `4M-1-A` (and `4S-1-B` where it parents sub-feeds) and `C4B-1-A` at 10 px; `4L-1-A`/`4M-R-A` at 20 px (their incoming feeder lands bottom-center BETWEEN the two exits; ±10 around it yields uniform 10 px lanes); `E4S-1-A`/`C4S-1-A`/`EQ4S-1-A` at 20 px and 8 additional split boards `4S-1-A`/`4S-5-A`/`4S-5-B`/`O4S-1-A`/`O4S-5-A`/`E4S-5-A`/`C4S-5-A`/`EQ4S-5-A` at 20 px; `C4B-2-A`/`C4B-3-A`/`C4B-4-A` at 10 px (the C4B family's 2-CB internal-chain combs join C4B-1-A's ±5 rhythm; C4B-5..8-A are single-CB, pitch-inert, unlisted). Same-band top-exit jogs can be staggered per-feeder via `SUBFEED_MIDY_NUDGE`/`subfeed_midy_nudge` (the engine table is EMPTY — the `F-058: −50` stagger was retired once a later exit-x re-slot put F-058 on EQ4S-1-A's center through-line and Mayo chose the aligned default band for both top horizontals; the config key remains live for per-case EQ4S staggers). Bottom-exit horizontals share the default `horizMidY` row unless nudged: RETIRED the legacy `F-049/F-044: −15` entries (an earlier pennant-clearance tune) so all six hospital S-panel bottom-exit horizontals (F-044/F-046, F-049/F-051, F-057/F-059) align on one row (3302; x-spans pairwise disjoint) — the exposed E4B-1-A/C4B-1-A right-side pennant-tip crossing was resolved at the pennant (`FC_PENNANT_PLACEMENT` left-mirror, the EQ4M-1-A mechanism) plus an `A1_TAG_PLACEMENT` `F-053: {dy: 40}` pill slide clearing the mirrored stack. `E4B-1-A` is deliberately unlisted: its single internal CB (n=1) makes the pitch term zero — its drop position is the scoped `lateralNudge` (−10 px — one manual-rhythm lane left of the top-center incoming; was the −35 quarter-slot tuned to the earlier wide boxes). Matching the manual-route right-edge entry rhythm (EOR-scoped list; unlisted parents keep the slot-frozen pitch). Landing-side companion: the four authored `landing_offset_x` values stranded by an earlier box shrink (hospital F-044 among them) were retuned onto the drawn box at the same 10 px rhythm, and validator advisory CV-15 now flags any landing offset that resolves outside (or within 10 px of a corner of) the target's drawn box.
   **Per-edge rider-aware distribution:** when a parent's sub-feed fan SPLITS across the top and bottom edges (start ports `feed_top` + `feed_bottom` both present), the single centered fan above is replaced by per-edge slotting via `_sfEdgeSlots`: each edge's m legs are assigned symmetrically about the panel center, in landing order (`childCenters + dst_x_offset`, so legs never cross). A rider-free edge uses the centered fan `(j−(m−1)/2)·p`. An edge whose CENTER is occupied by a rider — the parent's incoming riser (always bottom-center for bus-/ATS-fed L2-4), a continuation entry or cross-sheet stub with resolved `landing_offset_x` 0 (top-center), or an internal-chain riser (top-center) — reserves lane 0 and places legs on integer lanes at `qr = max(p/2, 10)`: even m → `±1..±m/2`, odd m adds `±(m/2+1)` on the destination-balance side (tie → east). The 10 px floor guarantees no rider-edge lane below the manual-route rhythm at any pitch. Unsplit fans and gutter-mode parents take the earlier expression verbatim (byte-identical geometry, including the singleton shift). After slot assignment, feeders listed in `SUBFEED_EXIT_X_NUDGE` (keyed by R-1 designation) take a px offset on the computed exit x — applied before STRAIGHTEN-TO-EXIT so landings and tags follow: hospital `F-058` at +10 (dropped F-056's matching entry per Mayo's spacing recheck) re-slots EQ4S-1-A's rider-free top fan from ±10 to {0, +10}, putting the floor-2 riser on the panel-center through-line (the E4S/C4S single-top-exit look) with the roof feeder one standard 10 px lane east — F-056's column coincides with bottom exit F-059's through the panel, accepted (EOR-scoped list; unlisted feeders keep their slot). Known limitation: the bottom-rider scan treats any same-sheet incoming R-1 as a bottom-center landing (depth>1 pass-through parents are unexercised), and an internal chain with n≥2 risers occupies ±chain-pitch/2 rather than the center — no current topology pairs one with a split fan.
5. **Internal chains** (`placeInternalChains`) — `internal_to` sub-feed internals (Chain-B secondaries) stack **above** their parent sub-dist panel. This is why `level_map` membership must be curated (see `sld_topology_rules_V1_0_0.md` §1): internals invade the adjacent floor's Y zone by design. Exit-point distribution at the parent top is slot-frozen exactly as in step 4, except where the per-parent `EXIT_PITCH_OVERRIDES` table (shared with step 4) names a fixed pitch — `4S-1-B: 10 px`, matching the manual-route pack's right-edge entry rhythm and keeping the 3-exit fan inside the 64 px drawn box (EOR-scoped list; all other combs keep the slot-frozen pitch). TX-primary A-1 tags avoid the down-sweeping EM fault-current pennant band: a single internal chain hangs its pill LEFT of the wire; multi-chain jog tags hang the pill UNDER the jog (per-feeder `a1_tag_placement` overrides still win).
6. **Terminal sub-feeds** — a depth-limited heuristic pass placing remaining terminal panel sub-feeds; opt-out via `layout_hints.terminal_subfeeds: false` (§5).
7. **Level lines** (A-7) — derived last from the placed clusters; normative rule in `sld_topology_rules_V1_0_0.md` §1, symbol in `sld_system_model_V1_0_0.md` §A-7.

Sheet behavior is selected by **role**, not sheet id: `sheetRole(sheetId)` returns `sheet_roles[sheetId] || 'normal'`. Roles: `normal` (service-entrance lineup), `continuation` (riser continuation; enables the null-start entry contract, entry panel X = `continuation_entry_x` or the DIM-derived default `sw_text_zone_w + 440`), `emergency` (EM lineup: NEC-class ATS ordering, generator block, fixed-pitch level stack). The ATS row orders by NEC class then designation: `atsNecClass()` resolves the device's `nec_class` through `nec_class_aliases` first, then maps NFPA-99 prose (`LIFE SAFETY`→`700`, `CRITICAL`→`701`, `EQUIPMENT`→`702`, `OPTIONAL STANDBY`→last) before falling back to a `/7(00|01|02)/` digit match; unmatched classes sort last and the tie-break is designation-alphabetical. Before that fix the prose classes never matched the digit regex, so prose-classed topologies (the hospital golden) degraded to pure alphabetical order. Each ATS's cross-sheet source-1 arrival renders as a real entry feeder below the `source1_in` port: a vertical stub of `ATS_SOURCE1_ENTRY_STUB` (32 px) with the "FROM …" A-3 squiggle at its end and the label side-LEFT of the curl on the squiggle row (a centered below-label was crossed by the ATS's own source-2 riser, port +36, at 16 of the 21 live sites and sat on the shallowest jog-tier row, forcing per-case dx entries; the band west of the stub at squiggle height is clean at every site, so the side label needs no tuning) — previously the squiggle sat directly ON the box-bottom port and its curl clipped the ATS outline. The stub is emitted as a feeder group, so the cross-sheet half's `path_vertices` now EXPORT (the s2-half routes went from absent to present in `geometry.routed_elements`; the add-in draws them like the OFF-001 continuation entry stubs). 32 px is a measured ceiling, not a style choice: the squiggle curl (±16 px) must clear both the box outline above and the shallowest source-2 jog tier below (port +60 across the live cases; the binding case ran its own tier under the curl span) — do not deepen without re-running the tier-clearance sweep.

## 4. `layout_config` Reference (schema §19 — 24 keys)

> **Canonical:** `03_contracts/sld_topology_schema_V1_0_0.md` §19 owns the complete `layout_config`
> table (all 24 keys, with types and hospital defaults). `04_renderer/README_engine.md` carries the
> same 24 as a commented example object. **This section documents the 15 structural/building-data
> keys only** — the 9 listed at the end of it are covered upstream. Keep the count in this heading in
> step with `applyLayoutConfig()`.

All keys optional; absent/null → the engine's `_DEF_*` hospital-golden default. Unknown keys are ignored. Merged from the topology's embedded `layout_config` (or a sidecar via `run_layout.mjs --config`, sidecar wins) by `applyLayoutConfig()`.

| Key | Type | Default (hospital-golden) | Semantics |
|---|---|---|---|
| `sheet_roles` | `{sheetId: role}` | `{"S1":"normal","S2":"emergency"}` | Sheet semantics, decoupled from ids; unlisted sheets are `normal` |
| `sheet_skips` | `{sheetId: [regex]}` | `{"S2":["[-][23][-]"]}` | Designations matching any regex are *intentionally skipped* on that sheet (counted as skips, not drops) |
| `floor_order` | array **or** `{sheetId: array}` | `["R","3","2","1"]` | Riser stack order, index 0 = top. Flat array ≡ `{S1: array}` |
| `floor_anchors` | `{floor: designation}` | hospital 4L stack | Chain-A sub-dist anchor panel per floor (Y-pinned, §3.2) |
| `floor_anchors_mechanical` | `{floor: designation}` | hospital mech stack | Mechanical-branch anchors; absent floors skipped |
| `level_map` | `{designation: floor\|null}` | hospital map | Designation → level-line floor tag; **rendered-Y membership, curated** (rules §1) |
| `level_order` | array | `["R","3","2","1"]` | Level-line floor vocabulary, top→bottom |
| `riser_step_standard` | px | `1200` | §2.3 |
| `riser_step_roof` | px | `1460` | §2.3 |
| `ats_xoffset_overrides` | `{designation: dx_px}` | hospital offsets | Per-ATS lateral nudge on the emergency sheet; `{}` disables |
| `subfeed_max_depth` | n | `1` | Max parent→child sub-feed rounds (office uses 8) |
| `subfeed_start_ports` | array | `["feed_bottom","feed_top"]` | R-1 start ports accepted as sub-feed edges (office adds `feed_left`/`feed_right`/`secondary_out`) |
| `subfeed_src_types` | array | `["L2-4"]` | Sub-feed edge source types (office adds `L2-2`) |
| `subfeed_dst_types` | array | `["L2-4"]` | Sub-feed edge target types (office adds `L2-2`) |
| `continuation_entry_x` | px\|null | `null` | Continuation-sheet entry panel X; `null` → DIM-derived default |

Reference instance: `04_renderer/hospital_layout_config.json` (the retired office example carried its own sidecar config, now removed — see the note above). Note: repeat `applyLayoutConfig()` calls are override-safe — riser-step defaults are captured once as immutable `_DEF_RISER_*` so a topology swap never folds a prior override back in.

**The other 9 keys** `applyLayoutConfig()` reads are documented in schema §19 (semantics) and
`README_engine.md` (example values), not restated here:

- **Emergency-sheet stack:** `s2_level_line_pitch`, `s2_shift_delta`, `s2_pitch_sheets` — the last
  opts a *non-emergency* sheet into the fixed-pitch floor stack (`_usesS2Pitch`), which an emergency
  lineup's high-rise continuation sheet needs because it cannot carry role `emergency` itself.
- **ATS ordering:** `nec_class_aliases`.
- **Per-designation tuning overrides:** `a1_tag_placement`, `a3_text_placement`,
  `fc_pennant_placement`, `fc_pennant_y_nudges`, `subfeed_midy_nudge` — each consulted **before** the
  matching engine table, so config wins. ⚠️ These five are the **only** per-case escape hatch from the
  designation-collision trap (an engine-table entry added for one building reaches every building
  reusing that designation). Only 4 of the engine's 9 tuning tables have such a key; the other five
  tables have no override at all — see `README_engine.md`.

## 5. `layout_hints` Reference (schema §20 — 2 keys)

Hints toggle engine *heuristics*; config (§4) describes *building data*.

| Key | Type | Default | Semantics |
|---|---|---|---|
| `terminal_subfeeds` | boolean | enabled | `false` disables the terminal sub-feed placement pass (the "HOSPITAL-SAFE" depth-limited heuristic); absent/other values → enabled |
| `subfeed_gutter_parents` | array of designations | `[]` | Children of listed parents fan into the gutter column instead of the standard bottom fan |

## 6. Level Lines (A-7) — Summary

Constants: `level_line_y_margin` 20, `level_line_label_w` 120, `level_line_dash` `"24,12"`; emergency-sheet fixed pitch `S2_LEVEL_LINE_PITCH = { '2': 2800, '3': 1250, 'R': 1250 }` (building-specific; as-built `layout_config` key `s2_level_line_pitch`, default = hospital-golden values; '3'/'R' tightened 2300/1800 → 1250, paired with the cluster pack-down key `s2_shift_delta`, default `{ '2': 1328, '3': 1328, 'R': 1328 }`, closed form `L1_line − 180 − childY_base`). The normative symbol definition lives in `sld_system_model_V1_0_0.md` §A-7; the placement/enforcement rule in `sld_topology_rules_V1_0_0.md` §1 Level-Line Composition Rule. This document does not restate them.

## 7. Overflow Policy — Flag, Never Mitigate

The engine **never** auto-corrects overflow. It emits typed warning records to the live `window.__LAYOUT_WARNINGS` array (surfaced through the snapshot audit's advisories; **not** part of the §14 geometry export, whose `layout_warnings` strings carry drop reports and the export summary) and renders as instructed:

- `LEVEL_LINE_FIXED_PITCH` — every emergency-sheet render under the fixed-pitch stack; carries the authoritative `pitches` object and resulting Y map.
- `VERTICAL_OVERFLOW_WARNING` — when the emergency-sheet level stack pushes any line Y < 0; flagged, not corrected (fixed pitches are authoritative).

**Retired mitigation (V1 §2.3):** the `px_per_inch` reduction ladder was never implemented. `effective_px_per_inch` is constant 96; overflow never changes scale at layout time., physical-sheet fit is guaranteed downstream by the compose transform (§8) — which is also why flag-not-mitigate is sufficient: overflow degrades *legibility* (compose scale shrinks), never *fit*, and legibility is a preflight concern (`sld_preflight_V1_0_0.md` SH-2b).

## 8. Compose-Time Page Transform (Phase B)

`pageCore(sheetId, opts)` composes one sheet's diagram onto the Arch E1 page. **The layout engine is never re-anchored** — composition wraps the untouched `buildSheet(sheetId)` markup in a single group transform at page-build time. Exposed headless as `window.__snapshot.page` (additive; `__snapshot.api` stays 1).

### 8.1 Page geometry (template-derived, `computeTB(tpl, ppi)`)

For the canonical `'30x42'` template (`sld_sheet_templates_V1_0_0.json`) at 96 ppi:

| Quantity | Derivation | Value |
|---|---|---|
| Page | `paper_w_in × ppi`, `paper_h_in × ppi` | **4032 × 2880** (42in × 30in) |
| Drawing area | `(B+M, B+M)` to title strip, `B` = border, `M` = content margin | **(72, 72, 3408, 2736)** |
| `PAGE_INNER_PAD` | constant, 0.25 in | **24** |
| Target rect | drawing area inset by `PAGE_INNER_PAD` per side | **(96, 96, 3360, 2688)** |
| Page viewBox | `0 0 page.w page.h` | **`0 0 4032 2880`** |

(No literal `4032` exists in the engine — all page numbers derive from the template. `TPL` mirrors the sheet-templates JSON; gate G7 asserts the mirror.)

### 8.2 Transform algorithm

```
extent = measureMarkupExtent(markup)            // no pad; safe SUPERSET (regex scan + radius heuristic)
extW = max(1, extent.maxX − extent.minX);  extH = max(1, extent.maxY − extent.minY)
s  = min(1, floor(min(target.w / extW, target.h / extH) · 1e4) / 1e4)   // floored to 4 decimals; NEVER upscales
tx = round2(target.x + (target.w − s·extW) / 2 − s·extent.minX)          // centered both axes
ty = round2(target.y + (target.h − s·extH) / 2 − s·extent.minY)
composed = <g class="composed-sld" transform="translate(tx, ty) scale(s)"> markup </g>
```

Properties, all normative:

- **Fit by construction.** For any finite extent, the scaled content fits the target rect (flooring only shrinks `s`). The frame + title block are drawn **after** the diagram and overplot any residual extent-scan overshoot at the drawing-area edge; `PAGE_INNER_PAD` absorbs small overshoots of the regex extent scan — **measured at 0.00 px on every sheet since engine rev 1.0.15 (FU-0008); the pad is retained as margin, not because overshoot is expected**.
- **Never upscale** (`s ≤ 1`): a small diagram never balloons its line weights/text relative to the fixed-size title block.
- **Plot-scale stroke semantics:** strokes scale with `s` — correct for a 42×30 plot of the whole diagram (line weight is not preserved on-screen-vs-page).
- **Extent scan:** `measureMarkupExtent` measures a transformed group by its real child geometry under a transform stack, so the extent is exact for the axis-aligned geometry the renderers emit and fit remains guaranteed by construction. ⚠️ **This bullet read "over-estimates via a radius heuristic, so … centering can be slightly off under asymmetric overshoot" until 2026-08-01.** That was true and is not: FU-0008 replaced the heuristic (FL-0007), the asymmetric-overshoot centering caveat is gone with it, and the only residual over-estimate is the circumscribed box used for a ROTATED circle/ellipse — which no renderer emits.
- Captured hospital transforms (identical dark/light): **S1 `s = 0.5662`**, **S2 `s = 0.4841`** (measured at engine rev 1.0.15 / FU-0008; **still current at rev 1.0.16**, which moved no composed-page pixel — `snapshots_page/audit.json` `viewer_revision` — which reads 1.0.17 today — and G6 / sync `[P6]` match all 6 composed baselines on disk, re-derived 2026-08-03). ⚠️ These read **0.4416 / 0.3972** until 2026-08-01 and BOTH numbers were wrong: 0.3972 was correct for the engine of its day and was superseded by FU-0008, while **0.4416 was already stale before that** — the measured pre-FU-0008 transform was `scale(0.4454)`. Two different values for the same quantity coexisted in this repo (0.4416 here, 0.4454 in `check_page_scale.mjs` / `ACCEPTANCE.md` / FL-0007) and nothing could see the disagreement.
- Metadata overlay: `opts.meta` (e.g. `01_inputs/hospital_titleblock_data_V1_0_0.json` → `.metadata_overlay`) shallow-merges over `TOPO.metadata`, overlay wins per key. The auto-NEC note (`DESIGNED PER NEC <edition>.`) is compose-layer policy keyed on `nec_edition` presence — never stored in data files.

**Consequence for validation (normative):** because fit is guaranteed by construction, geometry preflight must not assert absolute `0..content_w` bounds (they are meaningless under §1's floating origin and would hard-fail the golden). Preflight validates internal consistency, finiteness, and legibility — `sld_preflight_V1_0_0.md` §1/§3 binds to this section.

## 9. Geometry Output Contract

Owned by `sld_topology_schema_V1_0_0.md` §14. As-built emissions (per §14.1/§14.4): the eleven top-level keys listed in §0 (seven required, four optional); device entries carry anchors + bboxes (`w`/`h`/`anchor_mode`); annotations `{x,y}` + A-1 `pill: {x,y}`; level-line export uses `x_start = bb.minX − 40` (may be negative, §14.6). Not emitted: typed warning objects like `PX_PER_INCH_REDUCED`/`COLLISION_ROLLBACK`, `tap_positions`. This document adds nothing to the contract.

## Appendix A — Engine Value Traceability

Every number above, verified against `_frozen_ref_batch4/04_renderer/sld_viewer_engine_V1_0_0.html`. Grep by string, never by line number.

| Value | Engine source | Grep string |
|---|---|---|
| SP = 3 | multiplier const | `const SP = 3;` |
| tag/equip/stub/riser gaps, chain_h_min 444, ats_vert_gap 888, chain_b_h 791 | `DIM` table | `Composition gaps (SP-scaled)` |
| Switchboard internals 60/170/280/110/200/40/130 | `DIM` table | `Switchboard-internal (unscaled)` |
| Riser steps 1200/1460 | `DIM` table | `hospital_riser_step_std` |
| Floor-anchor baseline math | `computeChainYOverrides` | `function computeChainYOverrides` |
| Config keys + defaults | `applyLayoutConfig` + comment block | `layout_config schema (all keys optional` |
| Sheet roles | `sheetRole` | `function sheetRole` |
| Hints | gutter + terminal passes | `subfeed_gutter_parents` · `terminal_subfeeds` |
| Level-line constants 20/120/"24,12" | `DIM` additions | `level_line_y_margin` |
| S2 pitch {2800, 1250, 1250} | `applyLayoutConfig` key `s2_level_line_pitch` (tightened) | `S2_LEVEL_LINE_PITCH` |
| S2 cluster pack-down {1328, 1328, 1328} | `applyLayoutConfig` key `s2_shift_delta` | `S2_SHIFT_DELTA` |
| Warnings | level-line pass | `LEVEL_LINE_FIXED_PITCH` · `VERTICAL_OVERFLOW_WARNING` |
| PAGE_INNER_PAD 24, transform | page composition block | `PAGE COMPOSITION (Phase B2)` · `const PAGE_INNER_PAD` |
| Page/drawing-area derivation | `computeTB` | `function computeTB` |
| Extent scan | `measureMarkupExtent` | `function measureMarkupExtent` |
| 4-decimal floor | scale line | `* 1e4) / 1e4` |
| Hospital compose scales **0.5662 / 0.4841** (measured at rev 1.0.15, unchanged at rev 1.0.16; read 0.4416 / 0.3972 until 2026-08-01) | captured `pageCore` compose transform (§8.2) | composed `<g ... scale(s)>` |
