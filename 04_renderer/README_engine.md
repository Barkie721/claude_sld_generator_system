# SLD Viewer Engine V1.0.0 — Data-Driven Layout (internal rev 1.0.22)

The layout engine reads its building-specific stack from `TOPO.layout_config`
instead of hard-coded constants. When `layout_config` is absent or partial the
engine falls back to the hospital constants, so any topology stays renderable
and the golden regression reproduces **exactly** (0.0 px deviation).

**This file is the single source of truth for the engine's as-built
description.** CLAUDE.md §4 and 00_Docs/architecture_reference_V1_0_0.md §3 carry only a one-line pointer here.

## As-built design (V1.0.0)

**Data-driven layout.** Every building-specific quantity the engine used to
compile in — floor stacks, sub-feed risers, exit-comb pitches, level-line
pitches, the S2 cluster pack-down delta, ATS ordering — is resolved through
`applyLayoutConfig()` from `TOPO.layout_config`, each key with the hospital
value as its default (`pick(key, _DEF_…)`). The full key list, and which
function reads which key, are tabulated below. Consequence: a new building is a
data change, not an engine change; and every default reproduces the hospital
golden byte-for-byte, which is what the G1 gate asserts at 0.0000 px.

**Measured family boxes, frozen layout rhythm.** Symbol sizes (`BOX`) are the
**measured Revit family drawn bboxes** — the families are the dimension master.
Spacing is deliberately *decoupled* from them: pitch, rows, riser steps and
clearances read `slotWidth()` / `DIM.*_slot_*`, which stay at the legacy slot
sizes. Changing a drawn box therefore moves a glyph, never the rhythm. Chain
rows are anchored on `secBusY` so `cb_height` terms cancel. A handful of symbols
whose families were never measured carry an `// UNMEASURED` marker at their `BOX`
row (currently `L1-5` and `L3-3`) — treat those numbers as provisional.

**Per-designation tuning tables.** Visual fine-tuning is table-driven, never
inline: `EXIT_PITCH_OVERRIDES` (per-parent-designation exit-comb pitch, read by
both `placeInternalChains` and `placeSubFeeds`), `SUBFEED_EXIT_X_NUDGE` /
`SUBFEED_MIDY_NUDGE` (per-feeder exit-slot x / horizontal-band y),
`CHAIN_COLUMN_NUDGE` (shifts a whole chain column — TX, landings, panel, tags,
pennants), `CROSS_SHEET_STUB_DY` (cross-sheet stub end y),
`A1_TAG_PLACEMENT` (`{side, dx, dy}` for A-1 pills), `A3_TEXT_PLACEMENT`
(`{side, dx, dy}` for squiggle labels), `FC_PENNANT_PLACEMENT` (mirrors a
fault-current pennant stack), `ATS_TIER_OVERRIDES` (source-2 jog tiers).
**All but one now have a matching `layout_config` key** (as of rev 1.0.8) — each
read into a `…_CFG` companion via `pick(key, {})` and consulted per designation
*ahead of* the engine table, so **config wins over the engine table**:

| engine table | `layout_config` key | added |
|---|---|---|
| `A1_TAG_PLACEMENT` | `a1_tag_placement` | — |
| `A3_TEXT_PLACEMENT` | `a3_text_placement` | — |
| `FC_PENNANT_PLACEMENT` | `fc_pennant_placement` | — |
| `SUBFEED_MIDY_NUDGE` | `subfeed_midy_nudge` | — |
| `EXIT_PITCH_OVERRIDES` | `subfeed_exit_pitch` | OFF-011 |
| *(no table)* | `internal_chain_exit_nudge` | OFF-014 |
| `ATS_TIER_OVERRIDES` | `ats_src2_tier_overrides` (appends) | OFF-015 |
| *(no table)* | `chain_dst_x_offset` | OFF-016 |
| `CHAIN_COLUMN_NUDGE` | `chain_column_nudge` | OFF-017 |
| `SUBFEED_EXIT_X_NUDGE` | `subfeed_exit_x_nudge` | OFF-018 |
| *(no table)* | `a1_long_run_midpoint` | OFF-025 |
| *(no table)* | `ats_order` | OFF-026 |
| `SUBFEED_STRAIGHTEN_TO_EXIT` | `subfeed_straighten` (appends) | OFF-027 |
| `CROSS_SHEET_STUB_DY` | **none — engine-table-only** | — |

⚠️ These tables are keyed by DESIGNATION, so an entry added for one building
reaches every other building that reuses that designation. **Always** use the
`layout_config` key; editing an engine table for one case is a cross-case change
by construction, and `CROSS_SHEET_STUB_DY` is now the only place where that trap
still has no escape hatch.

**Exit fans.** `placeSubFeeds` slots exits symmetrically per edge in landing
order; an edge carrying a CENTER RIDER (incoming riser, continuation entry, or
internal-chain riser) reserves lane 0 and uses integer lanes at
`qr = max(pitch/2, 10)`. Singleton fans shift west (`−SIBLING_PITCH_MIN/2` for
the child, `−slotWidth(group[0].src)/4` for the exit — a quarter *slot* width,
**−35 px for L2-4**, slot-frozen alongside `exitPitchSF`; it read the drawn
family width `−16 px` before an earlier retune) so a one-child fan never draws
through its own parent's incoming riser. Golden-inert: the hospital has no
`n === 1` fans.

**Geometry export (schema §14).** The engine is the geometry producer for the
DEADARMS Revit add-in, so anything the add-in must place has to be *exported*,
not merely drawn. Required keys: `effective_px_per_inch`, `content_area`,
`devices`, `routed_elements`, `annotations`, `level_lines`, `layout_warnings`.
Optional keys: `sections`, `equipment_labels`, `glyph_supplements`, `bus_dots`.
`devices[id]` carries nested `w`/`h`/`anchor_mode` (`top_left` |
`bus_dot_bottom` | `bus_dot_top`) plus `flip_vertical` when truthy; A-1
`annotations[id]` carries nested `pill: {x, y}` (the drawn pill CENTER) and A-3
carries nested `label: {x, y, anchor, text}` (the RESOLVED emission point, i.e.
after the side/override rules, so the add-in never re-derives the tables).
`equipment_labels` records are `bound_to_type: "switchboard" | "device"` with
`align ∈ {end, start}` and carry the POST-COMPACTION `label`/`lines`, captured
inside `swText()`/`deviceEquipText()` themselves so they are what is actually
rendered rather than a re-derivation that could drift.

⚠️ **The three map-out sites.** Every exported record is rebuilt key-by-key in
**three** places: the capture hook, the viewer's `exportGeometry()`, and
`gen_engine.mjs`'s `buildGeometry()`. Adding a field to the capture hook alone
fails **silently**. Touch all three.

**Export-only changes are render-inert by construction.** Capture hooks are
guarded by `window.__GEOM_CAP`, undefined during a normal render, so an
export-only rev leaves every PNG byte-identical. Nothing captured for export is
fed to `ext()` unless it is genuinely new drawn ink, so `content_area` does not
move — assert it, don't assume it.

⚠️ **A TEXT-only change makes `run_layout --gate` report 0.0000 and prove
nothing.** The geometry gate is blind to text, level lines, labels and
pennants. For those, the PNG gates (G5/G6) plus an SVG element-diff are the only
net. Never claim a text change is safe on `--no-png`.

**Flag, never mitigate.** When the engine cannot place something correctly it
emits a typed `layout_warnings` entry (and an `__audit` finding) and carries
on — it does not silently invent a fallback position. `DROPPED …` reports a
dropped entity; `LEVEL_ROW_UNMAPPED` reports a level_map floor with no enforced
row (previously drawn at undefined Y, which also NaN-suppressed
`VERTICAL_OVERFLOW_WARNING`); `VERTICAL_OVERFLOW_WARNING` fires **only on the
emergency sheet, inside the fixed-pitch branch**, and scans **only the S2
level-line stack** (`min(lineYs) < 0`) — it is not a general content-overflow
check, and nothing else on the sheet is inspected for `y < 0`. Advisory warnings
on the golden are expected and pinned, not bugs.

**Known soft spots** (carried forward, not defects to "fix" blind):
- `s2_shift_delta` is a hand-calibrated bridge between two independently derived
  Y chains, keyed to `L1_line = 4840`. A topology whose L1 cluster bottom sits
  *below* the switchboard moves `candidateY['1']` and re-breaks the gap by that
  amount. The durable fix is to derive it at runtime
  (`enforcedY['1'] − 180 − childY_base`) so S2 self-corrects the way S1 does —
  that needs an ordering change (`placeSubFeeds` runs before `renderLevelLines`),
  so it is a real refactor.
- `escapeCollision` caps at 4 passes × 20 px and returns even when still
  colliding, with no failure signal.
- ~~`measureMarkupExtent`'s translate-group radius heuristic inflates the S2 west
  margin (~550 px of phantom whitespace). Cosmetic.~~ **FIXED 2026-08-01, rev
  1.0.15 (FU-0008).** Measured, it was 600.4 px on the west and it was not
  cosmetic: it cost S2 18 % of composed scale (0.3972 -> 0.4841). Step 1 now
  measures a transformed group by its real children under a transform stack
  instead of scraping the largest number out of its markup. FL-0007 has the
  measurement, FL-0024 the dormant twin in the title-block template.
- The ATS source-2 left-jog tier sort is order-dependent, not universally
  correct: it gives the LONGEST west jog the row FARTHEST from the breakers, so
  that feeder's descent column cuts every shorter west horizontal. (The east band
  is ordered the other way by the same sort and is correct — only west-jogging
  pairs collide.) Inverting it fixes some cases and introduces a real crossing in
  the golden, so it stays. A durable fix must route by occupancy rather than by
  sorting; until then, state the swap per case in `ats_src2_tier_overrides`.

The hospital viewer in `09_tests/Hospital Example (Golden Case)/` is a
**frozen oracle** — this directory is the only live line.

## Files

| File | Purpose |
|---|---|
| `sld_viewer_engine_V1_0_0.html` | The viewer + layout engine. Standalone, opens in a browser. Embedded `TOPO` is the hospital reference/demo and now carries a `layout_config` block equal to the extracted hospital values. Sidebar/zoom/pan chrome is the v1.1.0 touch UI (collapsible section cards, layer toggles, pointer pan/pinch, ≤720px off-canvas drawer). |
| `hospital_layout_config.json` | The extracted hospital `layout_config` as a standalone JSON (reference instance). |
| `sld_engine.mjs` | **Auto-generated** pure-JS module: the layout engine extracted verbatim from the HTML `<script>` with the DOM stubbed. Exposes `buildGeometry(topoInput?)`. Do not hand-edit — regenerate (see below). |
| `run_layout.mjs` | Headless CLI harness. Loads topology (+ optional config) JSON, runs the engine, emits a geometry block, and can gate against a golden `WITH_GEOMETRY` file. |
| `strip_compare.mjs` | **Additive-export proof harness.** Regenerates geometry for the hospital golden case from its committed topology + layout_config, deletes the keys under test (default `sections`, `equipment_labels`, `glyph_supplements`, `bus_dots`, `annotations.*.label` — the whole-key strips complete; the nested `annotations.*.label` path joined), and requires everything else to be identical to the frozen `__WITH_GEOMETRY` block — including key order and sub-tolerance coordinate drift. Exists because neither standing net can see a new key: `run_layout.mjs --gate` compares only device anchors + route vertices (at ±1 px tolerance), and `parity_test.mjs` names only six keys — both go green on a completely broken new block. Run before AND after any export addition (the device-dims / flip pattern). Flags: `--case NAME`, `--strip a,b`, `--verbose`, `--frozen FILE` (baseline override — how the harness self-tests against deliberately mutated copies). Exit 1 on any divergence. |
| `snapshot_html.mjs` | Headless PNG/SVG snapshot + audit tool. Drives the viewer's `__snapshot`/`__audit` hooks without a browser (`--theme both --audit --keep`); output filenames are slug-prefixed (see `_sldSlug()` below). Maintains the SHA256 PNG baselines used by the regression suite..0: `--page` captures the composed Arch E1 page via `__snapshot.page` (filename suffix `__page`; manifest entries gain `mode`/`transform`), `--page-meta FILE` merges a `sld_titleblock_instance` overlay over `TOPO.metadata`. |
| `gen_engine.mjs` | Build script that regenerates `sld_engine.mjs` from the HTML engine. Paths resolve relative to `import.meta.url`, so the toolchain works from any checkout location. |
| `check_titleblock_derivation.mjs` | B4 derivation gate (G7, read-only): byte-compares the engine's composed title-block frame (canonical template port + `hospital_titleblock_data_V1_0_0.json` + compose-layer NEC rule) against the frozen design of record for S1/S2, and asserts `TPL` mirrors `sld_sheet_templates_V1_0_0.json` `30x42`. |
| `baseline_composed_sha256.txt` | Composed-page + title-block-template PNG baselines (G6, 6 entries — hospital). Check with `cd 04_renderer && sha256sum -c baseline_composed_sha256.txt`. This file is hospital-only. |
| `snapshots_page/` | Current composed-page captures (`hospital_{S1,S2}_{dark,light}__page.{svg,png}` + manifest/audit). |
| `snapshots_titleblock/` | Current title-block-template captures (`titleblock_template_S1_{dark,light}.svg` + manifest; the G6 title-block half verifies via a scratch render, like G5). |
| `README_engine.md` | This file. |

## `layout_config` schema

All keys are **optional**; a missing/`null` key falls back to the hospital
default (`_DEF_*` constants in the engine). Unknown keys are ignored (room for
future keys reserved).

```jsonc
{
  "floor_order":              ["R","3","2","1"],          // legacy flat array ≡ {"S1": [...]} — S1 only;
                                                          // object form {"<sheetId>": ["7","6","5","1"], ...} = per-sheet stacks
  "floor_anchors":            { "R":"4M-R-A", "3":"4L-3-A", "2":"4L-2-A", "1":"4L-1-A" },
  "floor_anchors_mechanical": { "3":"4M-3-A", "2":"4M-2-A", "1":"4M-1-A" },
  "level_map":                { "<designation>": "R|3|2|1|null", ... }, // rendered-Y floor tag — CURATED membership
                                                          // (sub-dist anchors + same-row companions; a device fed on
                                                          // another floor's row must map to null or it drags its line there)
  "level_order":              ["R","3","2","1"],           // level-line order, top -> bottom
  "riser_step_standard":      1200,                        // px, std floor-to-floor step
  "riser_step_roof":          1460,                        // px, roof -> top-floor step
  "ats_xoffset_overrides":    { "<designation>": -50 },    // per-ATS X nudge (px), emergency sheet only
  // ----  sheet-role / sub-feed keys (defaults = hospital-identical) ----
  "sheet_roles":              { "S1":"normal", "S2":"emergency" },   // or "continuation"; unknown -> "normal"
  "sheet_skips":              { "S2": ["[-][23][-]"] },    // per-sheet designation regexes -> intentional skips
  "subfeed_max_depth":        1,                           // placeSubFeeds fixpoint rounds (riser spines need > 1)
  "subfeed_start_ports":      ["feed_bottom","feed_top"],  // + "feed_left"/"feed_right" (lateral) / "secondary_out"
  "subfeed_src_types":        ["L2-4"],                    // + "L2-2" for transformer taps
  "subfeed_dst_types":        ["L2-4"],                    // + "L2-2"
  "continuation_entry_x":     null,                        // entry-panel X on continuation sheets (null -> DIM-derived)
  // ----  emergency-sheet pitch + NEC-alias keys (defaults = hospital-identical) ----
  "s2_level_line_pitch":      { "2":2800, "3":1250, "R":1250 }, // emergency-sheet fixed-pitch level-line stack (px above floor below; '3'/'R' tightened)
  "nec_class_aliases":        { },                            // opt-in nec_class remap before ATS-order regex + badge lookup; {} = no remap
  // ----  key (default = hospital-golden) ----
  "s2_shift_delta":           { "2":1328, "3":1328, "R":1328 }, // emergency-sheet cluster pack-down for _s2FloorYOffset (closed form L1_line−180−childY_base)
  // ----  per-case escape hatches for the per-designation tuning tables ----
  //       (each read into a *_CFG companion and consulted BEFORE the engine
  //        table, per designation — config wins. These are the ONLY way to
  //        avoid the designation-collision trap; never edit the engine table
  //        for a single case.)
  "s2_pitch_sheets":          [],                          // sheet ids that also use the emergency fixed-pitch floor stack
                                                           // (a continuation sheet can't be role 'emergency' — that needs a
                                                           //  switchboard on the sheet — but may still need the stack)
  "subfeed_midy_nudge":       { "<designation>": 0 },      // per-feeder horizontal-band Y nudge
  "a1_tag_placement":         { "<designation>": { "side": "left", "dx": 0, "dy": 0 } }, // A-1 pill placement
  "a3_text_placement":        { "<designation>": { "side": "left", "dx": 0, "dy": 0 } }, // A-3 squiggle-label placement
                                                           // (the intended per-case fix for the SQ-F-30x-S2 collision)
  "fc_pennant_placement":     { "<designation>": { } },    // fault-current pennant stack placement
  "fc_pennant_y_nudges":      { "<id>": 0 },               // extends/overrides the L3 Y_NUDGE_BY_ID table
  // ----  floor-band + ATS-extent keys ----
  "floor_band_designations":  [],                          // OFF-009 — the Nth riser stack; a `normal` sheet floor-bands
                                                           // only two NAMED stacks (floor_anchors + _mechanical), so any
                                                           // third riser lists its designations here
  "ats_extent_subfeed_ports": ["feed_bottom"],             // OFF-010 — port set the ATS subtree-extent walker counts.
                                                           // Default is deliberately WRONG (see FL-0005); every new
                                                           // emergency-sheet project must set ['feed_bottom','feed_top']
  "a2_callout_feeders":       [],                          // OFF-034 (rev 1.0.22) — R-1 designations whose A-2 callout is
                                                           //   drawn IN PLACE OF the A-1 pill (A-1 kept in topology for TV-1)
  "feed_through_panels":      {},                          // OFF-031 (rev 1.0.18) — {designation: 'left'|'right'}. A panel
                                                           // fed through its neighbour's feed-through lugs is drawn BUTTED
                                                           // against that L2-4 on the given side, same row; the R-1 between
                                                           // them (+ its A-1/A-2) stays in the topology as an intentional
                                                           // skip. Runs after placeInternalChains, so the host may be an
                                                           // internal chain's secondary panel
  "empty_floor_level_lines":  [],                          // OFF-030 (rev 1.0.14) — sheet ids that draw a level line for a
                                                           // floor in their floor_order that carries NO devices. A line's Y
                                                           // is normally maxBottomY + margin over the devices standing on
                                                           // that floor, so an empty storey draws nothing and the sheet
                                                           // states a shorter building than it has — the normal case for a
                                                           // second service that taps L1 and L5 and nothing between.
                                                           // Y = __FLOOR_ROW_Y[floor] + boxH('L2-4') + margin, i.e. exactly
                                                           // where a panel on that floor would have put it; on hosp9 the
                                                           // synthesised S2 lines land on S1's populated rows to the pixel
  // ----  more per-case escape hatches (config wins over the engine table) ----
  "subfeed_exit_pitch":       { "<parent designation>": 16 },   // OFF-011 — per-parent sub-feed exit-comb pitch;
                                                                // overrides the EXIT_PITCH_OVERRIDES table
  "internal_chain_exit_nudge":{ "<parent designation>": -10 },  // OFF-014 — lateral shift of a panel's internal-chain
                                                                // EXIT only; the tap column does NOT follow
  "chain_column_nudge":       { "<2L designation>": -10 },      // OFF-017 — lateral shift of the whole internal tap
                                                                // COLUMN (TX + secondary feeder + 2L panel + tags +
                                                                // pennants). Keyed by the SECONDARY panel. Set equal to
                                                                // that panel's internal_chain_exit_nudge and the primary
                                                                // feeder's jog degenerates to a straight vertical
  "ats_src2_tier_overrides":  [ { "below": "r-NNN", "above": "r-NNN" } ], // OFF-015 — appends to the ATS source2
                                                                // ATS_TIER_OVERRIDES swap list. Needed because the
                                                                // leftJogs sort gives the LONGEST west jog the row
                                                                // FARTHEST from the breakers, so its descent column cuts
                                                                // every shorter west horizontal. Inverting that sort is
                                                                // ruled out — it moves the golden
  "chain_dst_x_offset":       { "<R-1 designation>": { "dx": 440, "jog_y": 4120 } } // OFF-016 — moves a Chain-A
                                                                // (breaker -> panel feed_top) OR Chain-D
                                                                // (breaker -> L3-1 fire pump; OFF-019, rev 1.0.9)
                                                                // child column off its
                                                                // breaker X and Z-routes the feeder at jog_y instead of
                                                                // a straight vertical. Everything anchored to the child
                                                                // follows. jog_y defaults to topY-100, which sits inside
                                                                // the switchboard band — state it explicitly
  ,"subfeed_exit_x_nudge":    { "<R-1 designation>": 20 }        // OFF-018 — per-feeder sub-feed exit X. Chiefly cancels
                                                                // the n===1 occupied-edge shift (-20 on a feed_top exit)
                                                                // once the edge's other occupant has moved clear: +20
                                                                // returns the exit to the panel centreline, where it
                                                                // meets the landing X and the hop draws as ONE straight
                                                                // vertical instead of a 20 px dogleg
  ,"a1_long_run_midpoint":    1200                              // OFF-025 (rev 1.0.11) — px threshold. A sub-feed's A-1
                                                                // anchors on the horizontal jog row (parentTop-90 on an
                                                                // upward riser), so on a long rise the tag sits in the
                                                                // bottom few percent of the run. At or above this length
                                                                // the tag moves to the MIDPOINT of the final vertical and
                                                                // takes vertical orient (tick perpendicular to the run it
                                                                // is actually on). A number applies globally; an object
                                                                // { "<R-1 designation>": px } applies per feeder and
                                                                // leaves unlisted ones alone. Default null = OFF
  ,"ats_order":               [ "LS4A-1-A", "C4A-1-A" ]         // OFF-026 (rev 1.0.11) — explicit ATS row order, west to
                                                                // east, by designation. Listed ATSs take the leading
                                                                // slots in this order; unlisted ones follow in the legacy
                                                                // NEC-class-then-designation sort. Required whenever two
                                                                // ATSs share an NEC class: atsNecClass can only ever emit
                                                                // 700/701/702/999, so a Life Safety and three Critical
                                                                // branches all collapse to '700' and the tiebreak falls
                                                                // to ALPHABETICAL — no nec_class_aliases entry can
                                                                // separate genuinely equal classes. Default [] = legacy
  ,"subfeed_straighten":      [ "F-NNN" ]                       // OFF-027 (rev 1.0.11) — appends to the engine's
                                                                // SUBFEED_STRAIGHTEN_TO_EXIT set: each listed sub-feeder
                                                                // draws as ONE straight vertical by snapping its child's
                                                                // centre X to the feeder's exit X. The child's whole
                                                                // internal chain rides along via the shared G[] anchor.
                                                                // Mutually exclusive with end.dst_x_offset. Default []
  ,"a1_tag_placement":        { "<R-1 designation>": { "pill_dx": 90, "pill_dy": 0 } } // OFF-023 (rev 1.0.11) added
                                                                // pill_dx/pill_dy alongside the existing dx/dy/side/
                                                                // force_orient/pill_below. dx/dy move the WHOLE tag —
                                                                // correct when sliding it ALONG its own feeder, WRONG
                                                                // across one, because the tick leaves the line and is
                                                                // left floating in whitespace. pill_dx/pill_dy move only
                                                                // the pill and stretch the leader to reach it
}
```

## Which functions read which keys

Resolution happens in `applyLayoutConfig()` (engine HTML), which assigns the
live `let` working constants from `TOPO.layout_config` with `_DEF_*` fallbacks.
Every layout function reads the working constant name unchanged:

| config key | working constant | read by |
|---|---|---|
| `floor_order` | `HOSPITAL_FLOOR_ORDER_S1` | `computeChainYOverrides()` |
| `floor_anchors` | `HOSPITAL_FLOOR_ANCHOR_S1` | `computeChainYOverrides()` |
| `floor_anchors_mechanical` | `HOSPITAL_FLOOR_ANCHOR_S1_MECH` | `computeChainYOverrides()` |
| `level_map` | `LEVEL_MAP` | `placeSubFeeds()`, `placeRiser()`, `renderLevelLines()`, `buildSheet()` |
| `level_order` | `LEVEL_ORDER` | `renderLevelLines()` (level-line ordering / bbox) |
| `riser_step_standard` | `DIM.hospital_riser_step_std` | `computeChainYOverrides()`, L2/L3 clone placement |
| `riser_step_roof` | `DIM.hospital_riser_step_roof` | `computeChainYOverrides()` |
| `ats_xoffset_overrides` | `ATS_X_OFFSET` | `placeATSsAndGenerator()` |
| `sheet_roles` | `SHEET_ROLES` (+ `sheetRole()` helper) | `buildSheet()`, `placeATSsAndGenerator()`, `_s2FloorYOffset()`, `renderLevelLines()` |
| `sheet_skips` | `SHEET_SKIPS` | `buildSheet()` intentional-skip scan |
| `subfeed_max_depth` | `SUBFEED_MAX_DEPTH` | `placeSubFeeds()` fixpoint loop |
| `subfeed_start_ports` | `SUBFEED_START_PORTS` | `placeSubFeeds()` scan filter |
| `subfeed_src_types` / `subfeed_dst_types` | `SUBFEED_SRC_TYPES` / `SUBFEED_DST_TYPES` | `placeSubFeeds()` scan filter |
| `continuation_entry_x` | `CONTINUATION_ENTRY_X` | `buildSheet()` continuation entry block |
| `s2_level_line_pitch` | `S2_LEVEL_LINE_PITCH` | emergency-sheet fixed-pitch level-line stack (`renderLevelLines()`, S1→S2 riser translate, `LEVEL_LINE_FIXED_PITCH` payload) |
| `nec_class_aliases` | `NEC_CLASS_ALIASES` | `atsNecClass()` ATS class ordering + the `_necAbbr` corner-badge lookup (both consult the alias before regex/prose; `{}` = no remap) |
| `s2_shift_delta` | `S2_SHIFT_DELTA` | `_s2FloorYOffset()` cluster pack-down inside `placeSubFeeds()` (closed form `L1_line − 180 − childY_base`). **Paid once per CHAIN, not per hop** — see the sub-feed chain note below |
| `floor_band_designations` | `FLOOR_BAND_DESIGS` | `computeChainYOverrides()` floor banding for risers that are not one of the two named anchor stacks |
| `ats_extent_subfeed_ports` | `ATS_EXTENT_PORTS` | `_panelSubtreeExtent()` inside `placeATSsAndGenerator()` (ATS cluster pitch) |
| `subfeed_exit_pitch` | `EXIT_PITCH_OVERRIDES_CFG` | `placeSubFeeds()` exit comb — consulted before `EXIT_PITCH_OVERRIDES` |
| `internal_chain_exit_nudge` | `INTERNAL_CHAIN_EXIT_NUDGE_CFG` | `placeInternalChains()` tap **exit** X |
| `chain_column_nudge` | `CHAIN_COLUMN_NUDGE_CFG` | `placeInternalChains()` tap **column** X — consulted before `CHAIN_COLUMN_NUDGE` |
| `ats_src2_tier_overrides` | `ATS_SRC2_TIER_OVERRIDES_CFG` | the ATS source2 tier pre-pass — appended to `ATS_TIER_OVERRIDES`, so config swaps resolve last |
| `chain_dst_x_offset` | `CHAIN_DST_X_OFFSET_CFG` | Chain A (`breaker → panel feed_top`) **and Chain D (`breaker → L3-1` fire pump — OFF-019, rev 1.0.9)** child placement + feeder route + tag anchor |
| `subfeed_exit_x_nudge` | `SUBFEED_EXIT_X_NUDGE_CFG` | `placeSubFeeds()` exit X — consulted before `SUBFEED_EXIT_X_NUDGE`, applied before STRAIGHTEN-TO-EXIT so landings and tags follow |
| `a2_callout_feeders` | `A2_CALLOUT_FEEDERS_CFG` | `renderR1Tags()` — draws the A-2 callout glyph in place of the A-1 pill for listed R-1s (OFF-034, rev 1.0.22) |
| `a1_long_run_midpoint` | `A1_LONG_RUN_MIDPOINT_CFG` | `placeSubFeeds()` A-1 tag anchor — jog row vs midpoint of the final vertical (OFF-025, rev 1.0.11) |
| `ats_order` | `ATS_ORDER_CFG` | `placeATSsAndGenerator()` row sort — ranked ahead of `atsNecClass()`, which cannot separate same-class ATSs (OFF-026, rev 1.0.11) |
| `subfeed_straighten` | `SUBFEED_STRAIGHTEN_CFG` | `placeSubFeeds()` — appended to `SUBFEED_STRAIGHTEN_TO_EXIT` (OFF-027, rev 1.0.11) |
| `a1_tag_placement` → `pill_dx`/`pill_dy` | (fields on `A1_TAG_PLACEMENT_CFG`) | `renderR1Tags()` → `renderTag()` — displace the pill and its leader endpoint only, leaving the tick on the feeder (OFF-023, rev 1.0.11) |

**Sub-feed chains on an emergency-pitch sheet — hop = pitch (OFF-021 rev 1.0.11,
OFF-028 rev 1.0.12, OFF-029 rev 1.0.13).** A sub-feed child's Y is built from two
parts, and on a CHAIN (`subfeed_max_depth > 1`, a child that is itself a parent
next round) each part used to be re-applied at every hop when it should be paid
once:

| part | value | what went wrong | fixed by |
|---|---|---|---|
| floor **offset** | `_s2FloorYOffset(child)` | absolute from the sheet's base floor, but read off an already-lifted parent — the hop grew by one **whole pitch** per level (18.3 : 1 over 8 hops) | OFF-021 — record each device's lift, subtract the parent's |
| stacking **baseline** | `parentBotY + 120` = `parentAnchor + bodyH + 120` (208 px for L2-4) | `s2_shift_delta`'s closed form already pays this exactly once at the base floor, so the chain fell **208 px** further behind its own level line per hop | OFF-028 — drop the baseline when the parent is itself a lifted sub-feed destination |
| the same baseline, at the **head of the chain** | as above, first hop only | OFF-028 fires only when the parent was placed by `placeSubFeeds`. A **continuation entry panel** is placed by `buildSheet`'s OFF-001 path instead, so a chain headed by one re-paid the 208 px once and every later hop inherited it — the whole chain sat 208 px below the entry-placed panels sharing its floors | OFF-029 — the entry path records its lift in `__ENTRY_LIFT`; `placeSubFeeds` seeds `_sfLift` from it |

Net: `hop = pitch(childFloor)` exactly, and a chain sits at the same offset under
its level line as the depth-1 fans beside it — and, since OFF-029, as the
continuation entries beside it. All three fixes are gated on the parent having
been lifted, so a depth-1 fan — every sub-feed in the golden — is untouched;
OFF-028 and OFF-029 additionally require `_usesS2Pitch(sheetId)`, which is what
keeps chains on a `normal` sheet (where the offset is 0 but *recorded*) unmoved,
and what leaves an anchor-row continuation sheet's entries out of `__ENTRY_LIFT`.
**If you are chasing a chain that drifts a constant amount per storey, it is one of
these terms.** Diagnose with `check_level_bands.mjs` — a constant-difference
ladder in the per-level `min` column is the signature; a *single* population
sitting a constant amount below another on the SAME floors is the OFF-029 shape.

**Sheet roles & continuation model.** Role semantics moved off sheet
ids: `normal` draws the utility block, `emergency` runs ATS/generator + the
fixed-pitch level stack, `continuation` allows a switchboard-less sheet whose
riser continues from another sheet — entry contract is an R-1 with
`start === null` whose `end` resolves to an unplaced device on that sheet
(placed at the chain-baseline Y with an entry stub + FROM-squiggle + tags).

**Drop report.** After each sheet builds, every expected-but-missing
entity is surfaced as a `DROPPED <kind> <id> (<designation>) on <sheet>`
layout_warning (exportGeometry + `buildGeometry`) and as advisory
`dropped_entity` findings in `__audit`. Hospital emits zero.

No geometry math, symbol rendering, `DIM` sizing, or validation logic was
changed — only the **source** of these constants moved from hard-code to
config-with-default.

## Engine-recognized topology keys beyond `layout_config`

Both are candidates for schema V1.1 (alongside
`layout_hints.subfeed_gutter_parents`):

- **`metadata.slug`** — snapshot filename prefix, resolved by `_sldSlug()`:
  `metadata.slug` wins → else `heading`/`project_name` slugified → else `'sld'`.
  Used by `snapshotSvgDownload`, `snapshotToPng`, and `window.__snapshot`. The
  embedded hospital demo (heading "Hospital") still yields `hospital`, so the
  golden baseline filenames are unchanged. A second building gets its own
  prefix automatically — no `--slug` flag needed.
- **`layout_hints.terminal_subfeeds`** — **opt-out, default ON**. Set to
  `false` to make `placeTerminalSubFeeds` return early (the former
  HOSPITAL-SAFE heuristic). Absent → enabled; zero behavior change for
  existing topologies.
- **Transformer-fed main (OFF-033, rev 1.0.20; squiggle rotated rev 1.0.21)** — a *data shape*, not a key.
  A lineup with **no `incoming` section** whose L1-1 main's `line_in` is fed by an
  R-1 from an **L2-2** `secondary_out` draws that transformer under the west end of
  the main bus: secondary straight up onto the bus (A-1 pill left of the run),
  primary down to a horizontal-orient squiggle across the stub end, text centred below it. Squiggle text: the R-1's own A-3 → else
  `'FROM ' + <L2-2>.data_fields.fed_from` → else `FROM SOURCE`. `fed_from` exists
  because the upstream board is normally off the composition and CV-11 rejects an
  A-3 naming a designation the topology lacks. Exports the incoming bus dot and the
  primary stub/squiggle as `geometry.bus_dots` / `geometry.glyph_supplements`, like
  the L0-1 path. Golden-inert: every hospital NP lineup has an incoming section.
  First user: `09_tests/LCC Hotel - 1200A 208V`.

## Viewer APIs for headless tooling

- **`window.__snapshot`** — getter returning the per-sheet SVG/PNG capture
  interface `snapshot_html.mjs` drives (diagram SVG only — sidebar chrome is
  not captured).
- **`window.__snapshot.page`** — `pageCore(sheetId, opts)`:
  composed Arch E1 page capture (sheet frame + title block + fitted diagram,
  viewBox `0 0 4032 2880`). `opts.meta` is a metadata overlay shallow-merged
  over `TOPO.metadata` (see `01_inputs/hospital_titleblock_data_V1_0_0.json`).
  Result shape matches `snapshotCore` plus `transform: {s, tx, ty}` and the
  raw `frame` markup. Driven by `snapshot_html.mjs --page [--page-meta FILE]`.
  In the browser, the **`🗎 Page PNG`** toolbar button (`#page-dl-btn`)
  downloads this composed page as a PNG via `pageToPng()` — a browser-only mirror
  of `snapshotToPng` that calls `pageCore(currentSheet, {})` (no `meta`, so the
  title block falls back to `TOPO.metadata`). Like the button and its click wiring,
  `pageToPng` is defined **inside the init IIFE**, so `gen_engine.mjs` strips it —
  it is pure chrome and never enters `sld_engine.mjs` or the headless capture path.
- **`window.__audit`** — per-sheet render-coverage audit (rendered vs expected
  entity counts + `layout_warnings`); surfaced by `snapshot_html.mjs --audit`
  into `audit.json`.

## Touch UI (v1.1.0 chrome) — maintenance notes

Ported verbatim from the frozen hospital viewer. Chrome-only:
collapsible sidebar section cards (`data-sec`), legend layer-toggle checkboxes
(`visibility`-based `layer-hide-*` rules — NOT `display`, for getBBox/viewBox
safety), pointer-events pan/pinch state machine, zoom clamp (`clampScale`/
`zoomAt`), hamburger + off-canvas drawer at ≤720px. The engine's data-driven
sidebar elements (`#app-heading`, `#app-version`, `#project-facts`,
`#stats-body`) were kept.

**Constraint:** the v1.1.0 init wiring must stay INSIDE the init IIFE —
`gen_engine.mjs` strips that IIFE by an end-anchored regex, so nothing may be
appended after it in the `<script>` body.

## Regression suite (golden case)

Lives under `09_tests/Hospital Example (Golden Case)/`:

- `run_layout.mjs --gate` vs the golden `__WITH_GEOMETRY` file (0.0000 px)
- `tests_V1_0_0/`: `parity_test.mjs` (107/92/94 counts),
  `behavior_test.mjs` (52 checks — 43 until 2026-08-01; FU-0008 added the
  transform algebra, the FL-0007 pennant regression test and the per-sheet
  "viewBox minus the pad == true ink" assertion), `baseline_sha256.txt`
  (snapshot PNG baselines, 4/4 — **re-blessed 2026-08-01, golden refreeze
  batch 2**; the composed 4 of G6's 6 moved with them, the 2 title-block PNGs
  did not)
- `snapshots/`: current PNG/SVG output + `audit.json` (S2's 2 advisory
  `layout_warnings` pre-exist — reproduced identically on the frozen ref)

adds two gates that live in `04_renderer/` (the golden dir stays
frozen):

- **G6 composed/template PNG baselines** — re-run the two capture commands
  below, then `cd 04_renderer && sha256sum -c baseline_composed_sha256.txt`
  (6/6):
  ```bash
  node 04_renderer/snapshot_html.mjs \
    --html 01_inputs/templates/titleblock_template_30x42_V1_0_0.html \
    --theme both --out 04_renderer/snapshots_titleblock
  node 04_renderer/snapshot_html.mjs \
    --html 04_renderer/sld_viewer_engine_V1_0_0.html \
    --page --page-meta 01_inputs/hospital_titleblock_data_V1_0_0.json \
    --theme both --audit --out 04_renderer/snapshots_page
  ```
- **G7 title-block derivation** — `node 04_renderer/check_titleblock_derivation.mjs`
  (byte-equal frames for S1/S2 + TPL mirror checks; PASS/exit 0).

There is also a third:

- **G8 additive-export proof** — `cd 04_renderer && node strip_compare.mjs` (3/3, exit 0).
  Regenerates geometry for **the hospital golden case** from its committed topology +
  layout_config, deletes the keys under test, and requires everything else to be identical
  to the frozen `__WITH_GEOMETRY` block — key order and sub-tolerance drift included.

  **Why it exists: G1 and parity are both blind to a NEW geometry key.** G1 compares only
  device anchors and route `path_vertices`, at ±1 px tolerance; `parity_test.mjs` names only
  five keys. Both go green on a completely broken new block. Run G8 *before* an export
  addition (to confirm a clean baseline) and *after* (to prove the edit added keys and
  touched nothing else) — the same pattern every export addition follows.
  ```bash
  cd 04_renderer
  node strip_compare.mjs                                  # the hospital case, default keys
  node strip_compare.mjs --strip sections,equipment_labels,glyph_supplements --verbose
  node strip_compare.mjs --case hospital --frozen /tmp/mutated.json   # self-test
  ```
  `--frozen` overrides one case's baseline; that is how the harness is self-tested against
  deliberately mutated copies (five injected breaks — sub-tolerance anchor drift, dropped
  route vertex, deleted device `w`, `content_area` shift, reordered keys — must all FAIL).
  ⚠️ It proves **structure only**. A text-restyle like the Phase 3B `swText` change moves no
  geometry, so G8 reports clean regardless — PNG byte-compare is the only net there.

A cross-surface consistency gate:

- **Sync gate** — `node 08_validation/sync_gate.mjs` (`--quick` skips the phase-6 PNG-baseline
  sha compare, which G5/G6 already cover). Proves the byte-copied / mirrored surfaces still
  agree with each other **and** with the machine-truth manifest `03_contracts/current_state_manifest.json`:
  phase 1 — family map ×2 byte-identical + the map↔DLL lockstep + viewer == golden viewer +
  `published_drop` shas vs the LIVE upstream files (publisher-side staleness); phase 2 — the
  hospital topology matches across its three surfaces
  (standalone JSON, `WITH_GEOMETRY` minus geometry, and the viewer's embedded `TOPO`, the
  last compared excluding the surface-specific `metadata`/`layout_config`); phase 3 —
  `sld_engine.mjs == regenerate(viewer)` (non-destructive; restores on mismatch); phase 4 —
  provenance stamps (`audit.json` `viewer_revision`, map `generated`) vs the manifest; phase 5 —
  living-doc rev anchors (viewer `<meta revision>`, **this file's own header**, root CLAUDE.md
  engine rev) vs the manifest; phase 6 — the PNG baseline lists vs on-disk files.
  Read-only. **14 checks (12 in `--quick`)** — derived by running `node 08_validation/sync_gate.mjs`
  and `--quick`.
  ⚠️ **The four sentences above were rewritten 2026-08-03** (audit **A7**, swept by **FU-0014**).
  They read **24 checks (22 in `--quick`)** and described a **fourth** phase-5 anchor (the add-in
  `CLAUDE.md` DLL sha), a phase-1 `ADDIN_ROOT` directory assertion, **four** DLL checks and **two**
  phase-1 DLL-embed checks. **Separation Phase 7b deleted eleven checks with the add-in and added
  one**, and none of those survive: phase 5 has exactly **three** anchors, all local, and there is
  exactly **one** DLL check left — `[P1] DLL embed == current family map`, which compares **two
  fields of the manifest** and never opens a DLL. The add-in's own `CLAUDE.md` is in
  **GitHub `Barkie721/revit_dedarms_toolkit_system` (not cloned on this machine) (toolkit repo)** and the check that reads it is
  that repo's `[T7]`. **No gate here can see it.**
  Mutant-probing: each check is meant to be proven to FAIL on a matching mutation. That held for
  the original 16 and for the survivors; `08_validation/run_mutants.sh` carries this repo's harnesses
  (12 + 6 arms) but **is invoked by no gate** — see **FU-0012**.
  Wired into `run_all_gates.sh` (runs in both full and `--quick` modes).

The acceptance gate is 2 hospital cases.

**Gate 14 — the sync-gate check-NAME baseline — is deliberately NOT documented here.**
`08_validation/checkname_diff.sh` (added 2026-07-30, decision D7) asserts that sync_gate still runs
the checks it ran last time, **by NAME**, against a committed baseline. It touches no renderer
surface and no golden-case artifact, so its command lives in
[`00_Docs/repo_runbook_V1_0_0.md`](../00_Docs/repo_runbook_V1_0_0.md) **§4, "The 13-gate regression
suite"** — the live gate table at that section's head. It is named here only so that
"the full suite is 13 gates" and "commands in `04_renderer/README_engine.md`" stop contradicting
each other: **12 of the 13 are documented here, gate 14 is in the runbook.**

> 🚩 **THIS PARAGRAPH USED TO ROUTE YOU SOMEWHERE THE RUNBOOK FORBIDS YOU TO GO.** Until 2026-08-03
> it opened *"**Gate 13** — the C# build gate — is deliberately NOT documented here"*, described
> `08_validation/build_gate.sh` in the present tense, claimed *"the full suite is 14 gates"*, and
> sent the reader to **runbook §4 for gate 13's commands** — a block whose **own banner** (`:320-329`)
> says *"Do not run any command in it against this repo."* **One document sent you where the other
> forbade you to go.** Gate 13 and `build_gate.sh` were deleted 2026-07-31 by separation Phase 7b
> with their subject; the port is `08_validation/toolkit_build_gate.sh` in
> **GitHub `Barkie721/revit_dedarms_toolkit_system` (not cloned on this machine) (toolkit repo)**. Derived:
> `ls 08_validation/build_gate.sh` → *No such file or directory*. Audit finding **A6**, the sharpest
> of its cluster; swept by **FU-0014**.

## Running the headless harness

Node v22, no dependencies (jsdom NOT required — `buildSheet` is DOM-free; the
module stubs the DOM and harvests route vertices from the returned SVG markup
strings with a faithful stack-based tag scan mirroring `exportGeometry()`).

```bash
cd 04_renderer

# 1) Embedded hospital demo TOPO -> geometry on stdout
node run_layout.mjs

# 2) External topology + external layout_config -> file
node run_layout.mjs \
  --topo "../09_tests/Hospital Example (Golden Case)/hospital_SLD_topology_V1_0_0.json" \
  --config hospital_layout_config.json \
  --out /tmp/geometry.json

# 3) REGRESSION GATE against the golden WITH_GEOMETRY file
node run_layout.mjs \
  --gate "../09_tests/Hospital Example (Golden Case)/hospital_SLD_topology_V1_0_0__WITH_GEOMETRY.json"
```

`--config` merges into `topology.layout_config` (config wins) and requires
`--topo`. The gate compares device anchors and routed-element path vertices;
tolerance is ±1.0 px. Exit code is non-zero if any element diverges.

**Current result:** `max deviation 0.0000 px, 0 mismatches` (both the embedded
TOPO path and the external-JSON path).

## Regenerating `sld_engine.mjs`

`sld_engine.mjs` is produced from the HTML `<script>` body by the build script
`gen_engine.mjs` (in this directory). It (a) strips the auto-run
init IIFE, (b) prepends minimal DOM/global stubs, (c) converts the top-level
`const TOPO` to `let` so an external topology can be swapped in, and (d)
appends `buildGeometry()` + the route harvester. After editing the HTML engine,
re-run that build script to refresh the module. the script
resolves its paths from `import.meta.url` (no hardcoded absolute paths) and
the generated header's regenerate hint points here correctly:
```
node 04_renderer/gen_engine.mjs   # writes 04_renderer/sld_engine.mjs
```

**Fragment files.** The prepended stubs (b) and appended footer (d) are read
verbatim from sibling fragment files `engine_header_fragment.js` and
`engine_footer_fragment.js` rather than living as inline template literals inside
`gen_engine.mjs`. Two consequences: `gen_engine.mjs` is backtick-free, so its
comments may use backticks freely; and the footer's regexes carry **single**
backslashes (ordinary JS) instead of the doubled `\\` a template literal forces,
so `buildGeometry()`/`_harvestRoutes` are editable as normal code. **The fragment
files are required build inputs** (not standalone modules — the footer references
identifiers defined in the assembled engine); edit the relevant fragment, then
regenerate. **Do not pin the engine sha here** — it moves with every
regeneration and this line is ungated (sync-gate P5 anchors only the header rev).
Machine truth is `03_contracts/current_state_manifest.json`, and `sync_gate.mjs`
phase 3 asserts `sld_engine.mjs == regenerate(viewer)` against it.
