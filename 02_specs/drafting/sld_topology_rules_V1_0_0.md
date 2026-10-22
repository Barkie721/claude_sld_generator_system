# SLD Composition — Topology Assembly Rules

How to assemble individual symbols into complete SLD structures using the three-object connection model (Device → Routed Element → Device). Covers dimension traceability, switchboard multi-section lineups, feeder data contracts, tag/callout generation algorithms, feeder chain composition, multi-source ATS/generator topologies, and composition validation rules.

This is one of the working files in the SLD library:
- **`sld_system_model_V1_0_0.md`** — all symbol and tag geometry, ports, and reference SVGs
- **`sld_topology_rules_V1_0_0.md`** (this file) — assembly instructions, topology composition, and validation
- **`sld_layout_engine_V1_0_0.md`** — as-built geometry computation (anchor-chain model, layout_config, compose-time page transform)
- **`sld_preflight_V1_0_0.md`** — Phase 3 geometry validation, bound to the floating-origin/compose-time model

> **Note.** The **Office Example** and **Lab Example** were retired outright. The as-built calibration blockquotes below (CV-2/CV-5/CV-6 pair dialects, the CV-14 sub-feed-whitelist rule, the `feed_top` sub-feed source note, CV-8) reference the office as their exemplar; the exemplar is gone but **every calibration decision is retained, frozen as-built**. The acceptance gate is now **2 hospital cases**. Hospital is the sole live reference topology.


## Dimension Variables

All composition dimensions trace to either `sld_system_model.md` (symbol-derived) or this file (composition-derived). No raw pixel values appear in composition steps — all formulas reference variable names from this block.

### Symbol-Derived Dimensions

These values are defined in `sld_system_model.md` and consumed here. If a symbol's geometry changes, update this table to match — the composition formulas will follow.

> **⚠ Family-dims retune:** the DRAWN symbol boxes below
> are **superseded** by the measured Revit family bounding boxes — see the
> authoritative family-dimensions table at the top of
> `02_specs/symbols/sld_system_model_V1_0_0.md` (panel 64×88, CB drawn height
> 44.37 with rescaled `cb_link_length 9.24` / `cb_node_spacing 24.63`, TX
> 49.17×35, disconnect 40.33×26, SPD 36×15, ATS 72×72, utility TX 168×140).
> The LEGACY values below remain authoritative ONLY where they act as frozen
> **spacing/pitch** inputs (the engine's `panel_slot_S / xfmr_slot_S /
> ats_slot_S / cb_slot_h` constants — layout rhythm deliberately did not
> retune). Composition formulas that consume `panel_S`-class variables as
> ROW/PITCH inputs keep the legacy numbers; anything describing what is
> *drawn* follows the family boxes.

**L2-1 Circuit Breaker:**

| Variable | Value | Source | Description |
|----------|-------|--------|-------------|
| `cb_r_node` | 4 | L2-1 `r_node` | Radius of open circle nodes |
| `cb_r_bus` | 2.5 | L2-1 `r_bus` | Radius of filled bus termination node |
| `cb_node_spacing` | 32 | L2-1 `node_spacing` | Vertical distance between upper and lower circle centers |
| `cb_link_length` | 12 | L2-1 `link_length` | Vertical link from lower circle bottom to bus node center |
| `cb_arc_offset` | 13 | L2-1 `arc_offset` | Horizontal offset of trip arc control point |
| `cb_text_gap` | 12 | L2-1 `text_gap` | Gap from centerline to text block |
| `cb_height` | 54 | L2-1 derived | Port-to-port height (`line_in` to `bus_out`): port `line_in` at `(0, −4)` to port `bus_out` at `(0, 50)` = 54px. Visual bounding box (≈57px including node radii) is separate — see `sld_preflight_V1_0_0.md` §2 for collision envelope definitions. |

**L2-4 Panelboard:**

| Variable | Value | Source | Description |
|----------|-------|--------|-------------|
| `panel_S` | 140 | L2-4 `S` | Panel box side length (square) |

**L2-2 LV Transformer:**

| Variable | Value | Source | Description |
|----------|-------|--------|-------------|
| `xfmr_S` | 47 | L2-2 `S` | T-box side length (square, ⅓ panelboard) |
| `xfmr_L_horiz` | 19 | L2-2 `L_horiz` | L-path horizontal segment length |
| `xfmr_L_vert` | 33 | L2-2 `L_vert` | L-path vertical segment length |

**L2-5 Disconnect Switch:**

| Variable | Value | Source | Description |
|----------|-------|--------|-------------|
| `disc_S` | 47 | L2-5 `S` | Disconnect box side length (square, ⅓ panelboard) |

**A-1 Feeder Tag:**

| Variable | Value | Source | Description |
|----------|-------|--------|-------------|
| `tag_pill_h` | 31 | A-1 `pill_h` | Pill height (fixed) |
| `tag_pill_w_std` | 76 | A-1 `pill_w_std` | Pill width for standard annotation |
| `tag_pill_w_xfmr` | 90 | A-1 `pill_w_xfmr` | Pill width for T-suffix annotation |
| `tag_pill_rx` | 15.5 | A-1 `pill_rx` | Corner radius (= pill_h / 2) |
| `tag_leader_length` | 32 | A-1 `leader_length` | Leader from tick to pill edge |
| `tag_tick_half_w` | 10 | A-1 `tick_half_w` | Tick horizontal half-extent |
| `tag_tick_half_h` | 8 | A-1 `tick_half_h` | Tick vertical half-extent |

**A-2 Conduit Callout:**

| Variable | Value | Source | Description |
|----------|-------|--------|-------------|
| `callout_r` | 10 | A-2 `r` | Half-circle (D-loop) radius |
| `callout_leader_run` | 30 | A-2 `leader_run` | Leader horizontal distance |
| `callout_leader_rise` | 48 | A-2 `leader_rise` | Leader vertical distance |
| `callout_stub_length` | 16 | A-2 `stub_length` | Horizontal stub at leader end |

**R-2 Bus:**

| Variable | Value | Source | Description |
|----------|-------|--------|-------------|
| `bus_r_dot` | 5 | R-2 `r_dot` | Bus tee dot (bus_dot) radius |

### Composition-Derived Dimensions

These values are defined by this file. They control spacing, clearance, and layout decisions that exist between symbols — they are not part of any individual symbol's geometry.

| Variable | Value | Rationale |
|----------|-------|-----------|
| `tag_gap` | 60 | Minimum vertical clearance between breaker text bottom and first feeder tag tick |
| `inter_tag_gap` | 40 | Minimum vertical separation between feeder tag tick and conduit callout center |
| `equip_gap` | 40 | Minimum vertical clearance between last tag/callout and load equipment entry port |
| `equip_stub` | 30 | Composition clearance between the feeder line endpoint and the panelboard `feed_top` port. Not a physical stub on the L2-4 symbol — `feed_top` is directly on the box edge with marker_style `none` |
| `breaker_pitch_min` | 130 | Minimum horizontal spacing between adjacent breaker centerlines on the bus |
| `feeder_alt_threshold` | 120 | Feeder spacing below which tags alternate right/left sides |
| `tag_total_h_offset` | 108 | Total horizontal extent from feeder centerline to pill far edge. The A-1 leader starts at the feeder centerline (tick center = `(0,0)`), so extent = `leader_length + pill_w_std` = 32 + 76 = 108. The tick extends ±10px about the centerline but does not increase horizontal reach. |
| `section_margin` | 40 | Horizontal padding inside each switchboard section boundary (left and right). Half of `breaker_pitch_min`. |
| `level_line_y_margin` | 20 | Minimum vertical clearance between a level line and the nearest equipment bounding box edge |
| `main_bus_stroke` | 2.5 | Main bus R-2 stroke weight — composition override of R-2 default (3.0 pt). Heavier than secondary bus to show hierarchy. The compositor sets `stroke_weight: 2.5` on each main bus R-2 instance per `sld_topology_schema_V1_0_0.md` §6. Renderer uses the instance value; system model default (3.0 pt) is the fallback when absent. |
| `secondary_bus_stroke` | 2.0 | Secondary bus R-2 stroke weight — composition override of R-2 default (3.0 pt). Lighter than main bus to visually distinguish load-side distribution from service entrance bus. |
| `fc_vd_tag_gap` | 40 | Vertical clearance between A-2 conduit callout center Y and A-4/A-5 pennant apex Y. Positions the FC/VD annotation zone below the conduit callout, maintaining visual hierarchy: breaker → A-1 tag → A-2 callout → A-4/A-5 pennants → equipment. |
| `fc_vd_to_equip_gap` | 40 | Vertical clearance between A-4/A-5 pennant apex Y and load equipment entry port. Replaces `equip_gap` in chains that carry FC/VD annotations. |
| `a6_leader_min_length` | 40 | Minimum diagonal leader length for A-6 Hex Note in leader mode (from arrowhead base to bend point). |
| `a6_clearance` | 20 | Minimum clearance between A-6 hex body bounding circle (r = `hex_r` = 22) and any adjacent symbol bounding box edge. |
| `px_per_inch` | 96 | Scale factor: composition pixels per paper inch. At 96, a 140px panelboard box = 1.46" on paper. Standard screen resolution provides intuitive mapping. Tier 2 — EOR may adjust per project to fit dense or sparse compositions. |
| `switchboard_text_zone_w` | 200 | Horizontal space reserved left of the switchboard for the designation label and data field text block. Used by §8A overflow splitting to compute total horizontal extent. Consumed by `sld_layout_engine_V1_0_0.md` and `sld_preflight_V1_0_0.md` by reference. |

### Computed Chain Heights

Derived from the variables above. Update these when any source variable changes.

**Chains WITHOUT FC/VD annotations** (A-4/A-5 not placed — calc fields absent or suppressed):

| Chain | Formula | Value |
|-------|---------|-------|
| Minimum feeder chain (bus to panelboard `feed_top`) | `cb_height + tag_gap + inter_tag_gap + equip_gap + equip_stub` | `54 + 60 + 40 + 40 + 30 = 224px` |
| Terminal load chain (bus to L3-1/L3-2/L3-3 `load_in`) | `cb_height + tag_gap + inter_tag_gap + equip_gap + equip_stub` | `54 + 60 + 40 + 40 + 30 = 224px` (same formula — terminal devices are smaller than panelboards so height is governed by tag zones, not device geometry) |
| Disconnect chain (bus to disconnect to downstream device) | `cb_height + tag_gap + inter_tag_gap + equip_gap + equip_stub + disc_S + equip_stub` | `54 + 60 + 40 + 40 + 30 + 47 + 30 = 301px` (upstream chain + disconnect S=47 + downstream stub) |
| Disconnect chain — downstream conductor spec change (not stub-exempt) | `cb_height + tag_gap + inter_tag_gap + equip_gap + equip_stub + disc_S + tag_gap + inter_tag_gap + equip_gap + equip_stub` | `54 + 60 + 40 + 40 + 30 + 47 + 60 + 40 + 40 + 30 = 441px` (upstream tag zone + disconnect + downstream tag zone). Triggered when downstream R-1 is not `stub_exempt` — see §5 Inline Device Tag Convention exception. |
| Transformer chain — vertical secondary exit (bus to secondary panelboard, no L-path routing) | `cb_height + tag_gap + inter_tag_gap + equip_gap + xfmr_S + tag_gap + inter_tag_gap + equip_gap + equip_stub` | `54 + 60 + 40 + 40 + 47 + 60 + 40 + 40 + 30 = 411px` |
| Transformer chain — with L-path clearance (bus to secondary panelboard, earth ground extends below T-box) | `cb_height + tag_gap + inter_tag_gap + equip_gap + xfmr_S + xfmr_L_vert + tag_gap + inter_tag_gap + equip_gap + equip_stub` | `54 + 60 + 40 + 40 + 47 + 33 + 60 + 40 + 40 + 30 = 444px`. The `xfmr_L_vert` (33px) accounts for the earth ground symbol extending below the T-box left wall. When the primary feeder approaches from directly below the transformer, this clearance prevents the feeder from overlapping the ground symbol. When the primary enters via a flex port (horizontal approach), `xfmr_L_vert` is not needed — use the 411px chain. |

**Chains WITH FC/VD annotations** (A-4/A-5 placed — `available_fc` and/or `voltage_drop_pct` populated):

| Chain | Formula | Value |
|-------|---------|-------|
| Minimum feeder chain (bus to panelboard `feed_top`) | `cb_height + tag_gap + inter_tag_gap + fc_vd_tag_gap + fc_vd_to_equip_gap + equip_stub` | `54 + 60 + 40 + 40 + 40 + 30 = 264px` |
| Terminal load chain (bus to L3-1/L3-2/L3-3 `load_in`) | same formula | `264px` |
| Disconnect chain (stub_exempt) | `cb_height + tag_gap + inter_tag_gap + fc_vd_tag_gap + fc_vd_to_equip_gap + equip_stub + disc_S + equip_stub` | `54 + 60 + 40 + 40 + 40 + 30 + 47 + 30 = 341px` |
| Disconnect chain (not stub_exempt, both R-1 segments annotated) | upstream tag zone + FC/VD zone + disconnect + downstream tag zone + FC/VD zone | `54 + 60 + 40 + 40 + 40 + 30 + 47 + 60 + 40 + 40 + 40 + 30 = 521px` |
| Transformer chain (vertical, no L-path, both R-1 segments annotated) | `cb_height + tag_gap + inter_tag_gap + fc_vd_tag_gap + fc_vd_to_equip_gap + xfmr_S + tag_gap + inter_tag_gap + fc_vd_tag_gap + fc_vd_to_equip_gap + equip_stub` | `54 + 60 + 40 + 40 + 40 + 47 + 60 + 40 + 40 + 40 + 30 = 491px` |
| Transformer chain (with L-path, both R-1 segments annotated) | add `xfmr_L_vert` (33) to above | `524px` |

> **Mixed chains:** When only one R-1 in a multi-R-1 chain carries FC/VD annotations (e.g., primary R-1 has FC/VD but transformer secondary R-1 does not), use the annotated chain height for that segment and the un-annotated chain height for the other. This is the common case — FC/VD is typically placed on the primary feeder but suppressed on short transformer secondary stubs.

---

## 1. How to Compose a Full SLD

> **Success condition:** A valid composition is a JSON topology that passes all §7 validation rules (TI, CV, TV, SV, DV) and can be consumed by the rendering pipeline without modification. Every device has a unique designation, every power path is traceable from source to terminal load through explicit R-1 Feeder instances, every feeder carries a bound A-1 tag and A-2 callout with schedule-consistent content, and every protective device rating meets or exceeds the available fault current at its location.

### Vertical Ordering Convention

The SLD vertical axis follows **power flow hierarchy**, not building elevation. The service entrance switchboard is the visual anchor — upstream equipment (utility transformer, meter) appears below it on the drawing; downstream equipment (panels, transformers, ATS) appears above it. This holds regardless of the switchboard's physical floor location (grade, basement, penthouse, or any other level).

Equipment that is physically below the switchboard (e.g., a parking garage panel fed from a basement MDP) still appears **above** the switchboard on the SLD if it is downstream in the power flow. The physical floor is communicated by a level line annotation (see Level Lines below), not by drawing position.

> **Key principle:** Drawing Y position = power flow depth from source. Physical floor = level line label only.

### Build Order

Build the SLD bottom to top, following power flow direction:

1. **Utility Transformer** (bottom) — service entrance, utility-owned. For MV service, use L0-2 MV Transformer with MV Transformer Section (§2).
2. **Feeder** up to **Utility Meter** — revenue metering (omit if metering is at MV switchgear or not shown on this SLD sheet)
3. **Feeder** up to **Main Switchboard** — multi-section composition (§2) with incoming, metering, main breaker (GFP), distribution. The switchboard may be on any floor — its physical level is annotated by a level line, but its drawing position is always the anchor point from which all downstream equipment extends upward.
4. **Fire Pump Section** (if present) — dedicated breaker on main bus, feeder chain to L3-1 Fire Pump per §2 Fire Pump Section and §5 Variant D
5. **Feeders** from distribution breakers up to **Panelboards**, **LV Transformers**, **Motors**, **Equipment Connections**, or **ATS** units (§5 Variants A–D)
6. **LV Transformers** feed secondary **Panelboards** (208/120V) — §5 Variant B
7. **ATS** units connect normal + emergency sources (§6). Place **Generator** (L1-5) with feeder to ATS `source2_in` (§6 Pattern 2)
8. **Emergency Switchboard** — composed per §2 Variant EM, fed from ATS `load_out` (§6 Pattern 3)
9. **Continuation squiggles** wherever feeders leave the current SLD sheet
10. **Feeder tags** and **conduit callouts** on all feeder runs (auto-generated per §4 Tag & Callout Generation Algorithms)
11. **Level lines** at each building level represented in the distribution (see Level Lines below)

### Level Lines

Level lines (symbol **A-7**, `sld_system_model_V1_0_0.md` §A-7) are horizontal dashed annotations marking the physical building floor where equipment is located, labeled at the right edge. They are **informational only** — they do not drive equipment Y position or feeder chain height; equipment placement drives level-line placement, never the reverse.

> **As-built rewrite** (verified against `_frozen_ref_batch4/04_renderer/sld_viewer_engine_V1_0_0.html` `renderLevelLines`; design record in `sld_system_model_V1_0_0.md` §A-7). Spec follows engine. This section previously specified full-sheet-width lines, dash `8,4` at 0.5 pt, a left-aligned label, midpoint-Y placement, and designation-regex floor derivation — all superseded. The midpoint algorithm was explicitly rejected by the engine (it produced coincident Y values); regex derivation was rejected per the WI-3 rationale below.

| Property | Value (as-built) |
|----------|-------|
| Orientation | Horizontal, spanning the sheet's equipment-cluster bbox: `bb.minX − 40` → `bb.maxX + 40` (label allowance `level_line_label_w` = 120 px beyond); negative X valid under the floating-origin coordinate model |
| Stroke | Dashed `24,12`, stroke-width 1.2, `var(--sld-line)`, opacity .55 |
| Label | Complete emitted string from `level_code_labels` / `level_code_pattern`, right-edge `text-anchor="end"`, 13px/700 `'Courier New',monospace`, `var(--sld-text)` opacity .8 |
| Ordering | Physical elevation order (`level_order` top → bottom, hospital default `['R','3','2','1']`), guaranteed by the second-pass enforcement below |

**Device → floor derivation (WI-3 — data-driven contract, regex derivation dropped):** floor membership comes from `layout_config.level_map` (`{designation: floor|null}`) and `layout_config.level_order` (schema §19), never from parsing designations. `level_map` reflects **rendered Y position, not narrative floor designation**: membership is curated to the Chain-A sub-dist anchors per floor plus their Y-band siblings; Chain-B internal secondaries are excluded because `placeInternalChains` stacks them above their parent sub-dist into the adjacent floor's Y zone — a level-line anchor based on them collapses the line into the wrong floor (rejection rationale recorded from the engine's `LEVEL_MAP` comment). Off-row devices map to `null`. Device types `{L0-1, L1-1, L1-3, L1-4}` (`LEVEL_EXCLUDE_TYPES`) are excluded from the floor scan; L1-2's switchboard envelope is handled as an explicit placement anchor instead.

**Level-Line Composition Rule (as-built, A-7):** runs per sheet after all device placement, two passes.

*First pass — candidate Y per floor* (floors walked in `level_order`; empty floor buckets skipped):

1. Default: `candidateY = maxBottomY(floor's devices) + 40` — line **below** the floor's equipment cluster (clearance = `level_line_y_margin` 20 + 20).
2. Level 1 on a `normal`-role sheet: anchored to the utility-transformer pad bottom `G[L0-1].y + 80 + 40`; falls back to rule 1 if no L0-1 placed.
3. Level 1 on an `emergency`-role sheet: `maxBottomY` additionally includes the switchboard envelope bottom, recovered via the L1-1 main breaker (`SW_Y = G[L1-1].y − sw_main_bus_offset(60)`; bottom `= SW_Y + sw_section_h(280)`).
4. `escapeCollision`: while any device on the sheet lies within `level_line_y_margin` of the line, shift **up** by that margin, max 4 passes.

*Second pass — physical-order enforcement:*

- Default: monotonic enforcement walking `level_order` top→bottom — `y = max(candidateY, prevY + MIN_LINE_GAP)` with `MIN_LINE_GAP = 60`.
- **X-stagger:** a floor displaced by enforcement whose gap to the line above is `< LABEL_GAP(40) + MIN_LINE_GAP(60)` gets its label staggered inward, `labelX = x2 − 160` / `x2 − 80` alternating, so label text does not horizontally overlap.
- **Emergency-sheet fixed-pitch override:** on an `emergency`-role sheet with a populated Level 1, enforcement is bypassed — L1 keeps its candidate Y and floors `2, 3, R` stack bottom-up at fixed cumulative pitches `S2_LEVEL_LINE_PITCH = { '2': 2800, '3': 1250, 'R': 1250 }` ('3'/'R' tightened 2300/1800 → 1250, paired with the cluster pack-down key `s2_shift_delta`, schema §19). This is a **building-specific Tier-2 override**: the pitch table defaults to hospital-golden values and is an as-built `layout_config` key `s2_level_line_pitch` (schema §19) — was engine-compiled before, now resolved via `applyLayoutConfig()` with the hospital-golden default. Traceability: the engine emits `LEVEL_LINE_FIXED_PITCH` (with the authoritative `pitches` object and resulting Y map) on every emergency-sheet render, and `VERTICAL_OVERFLOW_WARNING` when any resulting line Y < 0. **Flag-not-mitigate:** overflow is flagged, never corrected — fixed pitches are authoritative. (Fixed: the warning's prose `reason` string formerly cited stale pitch arithmetic "L2=L1-1200, L3=L2-900, Roof=L3-500"; it now defers to the authoritative `pitches` field.)

**Sheet scoping:** a level line renders on a sheet only for floors with ≥1 mapped, non-excluded, placed device on that sheet; the same floor on two sheets produces two independent instances. Label merging across floors is forbidden — see the A-7 Do-Not table.

### Decision Authority

> **Canonical:** the tier *framework* is owned by `00_Docs/project_instructions_V1_0_0.md` §2.3. The table below restates it so the per-decision tier assignments in this file are self-contained; keep the framework wording in sync with §2.3.

Every composition decision falls into one of three tiers. The compositor must follow the tier assignment — it cannot upgrade a Tier 2 default to Tier 1 autonomous, and it cannot silently proceed on a Tier 3 item without EOR input.

| Tier | Policy | Compositor Behavior |
|------|--------|---------------------|
| **Tier 1 — Autonomous** | Compositor decides. No EOR input needed. | Proceed using the deterministic algorithm or lookup specified in the referenced section. Do not flag or pause. |
| **Tier 2 — Default with Override** | Compositor applies the stated default. EOR may override. | Proceed with the default value. Record the default and the override option in the composition output as an EOR review note. If the project narrative explicitly specifies an override, use the override instead of the default. |
| **Tier 3 — EOR Required** | Compositor cannot proceed without EOR input. | Insert a placeholder with a warning flag in the composition output. Do not fabricate a value. If the project input includes the required data, use it. If not, halt that branch of the composition and note the missing input. Other branches may continue. |

**Decision inventory:**

| Decision | Tier | Default (if Tier 2) | Override Condition | Source |
|----------|------|---------------------|--------------------|--------|
| Feeder conductor sizing (LV) | 1 | — | — | §3 LV lookup contract → `feeder_schedule.json` |
| Feeder tag content (LV) | 1 | — | — | §4 tag algorithm → `feeder_schedule.json` `tag` field |
| Conduit callout text (LV) | 1 | — | — | §4 callout algorithm |
| Transformer secondary OCPD rating | 1 | — | — | §3 transformer lookup → `3_phase_transformer_feeder_schedule.json` |
| Transformer secondary tag (T-suffix) | 1 | — | — | §3 → `one_line_tag` field |
| Transformer secondary callout (SBJ variant) | 1 | — | — | §4 transformer secondary callout variant |
| MV feeder sizing | 1 | — | — | §3 MV lookup contract → `mv_feeder_schedule.json` |
| Breaker placement on bus (X coordinates) | 1 | — | — | §5 Step 1 at `breaker_pitch_min` intervals |
| Tag side selection | 1 | — | — | §5 Tag Side Selection Algorithm |
| Panelboard port selection | 1 | `feed_top` | Offset routing requires non-vertical entry | §5 Variant A, Panelboard Port Selection |
| Switchboard section ordering (Normal Power) | 1 | — | — | §2 Variant NP section table |
| NEC class section ordering (Emergency) | 1 | — | — | §2 Variant EM: 700 → 701 → 702, validated by DV-9 |
| Validation rule execution | 1 | — | — | §7 Validation Execution Order |
| 75 kVA transformer secondary breaker: 250A vs. 225A | 2 | 250A (per schedule) | EOR may reduce to 225A for cost/commonality; update tag to `2254T` → `2254` and feeder type accordingly | §3 → `3_phase_transformer_feeder_schedule.json` design notes |
| 750 kVA transformer secondary breaker: 2000A vs. 2500A | 2 | 2000A (per schedule) | EOR may increase to 2500A for max capacity; requires 3000A bus rating — flag cost impact | §3 → `3_phase_transformer_feeder_schedule.json` design notes |
| Fire pump section position in switchboard | 2 | Left of main breaker (between metering and main breaker) | EOR may place right of main breaker; either position taps main bus | §2 Fire Pump Section blockquote |
| Emergency switchboard: MLO vs. main breaker | 2 | MLO per NEC 700.10(B)(5)(a) | EOR may add main breaker; changes bus architecture from single-bus to two-level | §2 Variant EM blockquote |
| Flex port routing (L2-2, L2-5) | 2 | Default vertical ports (`primary_in`/`secondary_out`, `line_in`/`load_out`) | EOR layout preference, or when vertical entry would cross adjacent feeder chains | §5 Flex Port Routing |
| SPD Mode B corner selection | 2 | Bottom-right corner of panelboard | Override if corner is obstructed by adjacent equipment | §5 Spur Attachment Composition |
| Fire pump breaker sizing | 3 | — | Provisional algorithm in §3 uses NEC 430.52 × 2.5 as starting point, but NEC 695.4(B)(2) locked-rotor sizing is the common practice. EOR must confirm final rating. | §3 Fire Pump Feeder contract (provisional) |
| Generator feeder conductor sizing | 3 | — | No schedule lookup available. EOR specifies per NEC 445.13. | §6 Pattern 2 manual override table |
| Generator feeder conduit sizing | 3 | — | EOR specifies. | §6 Pattern 2 |
| Generator feeder ground sizing | 3 | — | EOR specifies per NEC 250.122. | §6 Pattern 2 |
| Generator feeder tag content | 3 | — | EOR provides string. §4 algorithm cannot run — no matching schedule row. | §6 Pattern 2 |
| Generator feeder callout text | 3 | — | EOR provides string. | §6 Pattern 2 |
| Generator total output capacity vs. aggregate ATS load | 3 | — | EOR design decision. Not validated by this spec. | §6 Pattern 4 |
| Feeder distance (all R-1 instances) | 3 | — | Project-specific. Engineer provides per the calculation template (two-pass workflow). | §5 Step 2, R-1 `distance` field |
| Equipment connection feeder sizing (kW default) | 2 | PF = 0.90, 125% continuous | EOR overrides PF or continuous load factor; EOR provides MCA/MOCP from nameplate if available | §3 Equipment Connection Feeder contract |
| Equipment connection feeder sizing (MCA/MOCP override) | 3 | — | EOR provides MCA and MOCP from equipment nameplate. Overrides kW-derived sizing when populated. | §3 Equipment Connection Feeder contract |
| Sub-fed panelboard breaker rating | 1 | — | — | §5 Variant G — breaker rating = downstream panel `bus_rating` |
| Sub-fed panelboard exit port selection | 1 | — | — | §5 Variant G — distinct exit preferred for clarity, shared feed-in/exit legal; exit must be a drawable `feed_` anchor (§7 CV-12) |
| Level-line placement (candidate Y + enforcement) | 1 | — | — | §1 Level-Line Composition Rule (A-7) |
| Emergency-sheet fixed-pitch level-line stack | 2 | `layout_config.s2_level_line_pitch`, default `S2_LEVEL_LINE_PITCH` `{2: 2800, 3: 1250, R: 1250}` (hospital-golden values since the S2 pitch tighten — see §1) | Building-specific pitches; every application is flagged via `LEVEL_LINE_FIXED_PITCH` (flag-not-mitigate) | §1 Level-Line Composition Rule (A-7) |

> **Ambiguity handling:** When the compositor encounters a situation not covered by this table or by any section of this spec — an unsupported configuration, a breaker rating with no schedule match, a project narrative that contradicts a spec rule — it must halt that composition branch, insert a placeholder flagged `COMPOSITOR_HALT: [reason]`, and continue with other branches. It must not fabricate values, interpolate between schedule tiers, or silently skip the element.

### Per-Element Workflow

| Step | Action | References |
|------|--------|------------|
| Place symbol | Look up geometry and ports in `sld_system_model_V1_0_0.md` |
| Assign designation | Encode per naming convention in `equipment_designation_legend_V1_0_0.json` |
| Draw feeder | Route orthogonally per R-1 Feeder segment rules in `sld_system_model_V1_0_0.md` |
| Size feeder | Look up `nominal_ampacity` via Feeder Data Contract (Section 3) → `feeder_schedule.json` |
| Attach tags | Compute tag coordinates per Feeder Chain Composition (Section 5) |
| Generate callout text | Apply Conduit Callout Algorithm (Section 4) using schedule data from Section 3 |
| Apply colors | Use stroke color definitions per symbol in `sld_system_model_V1_0_0.md` (each symbol's Stroke Weights section defines its color) |

---

## 2. Multi-Section Switchboard Composition

A multi-section switchboard is composed of individual dashed-boundary sections sharing edges, connected by horizontal buses. Each section contains specific equipment symbols.

### Overall Layout

| Property | Value |
|----------|-------|
| Section adjacency | Shared edges, no gaps |
| Main bus | Near section top (~30px below top edge), horizontal |
| Main bus extent | From incoming section through main breaker — does NOT extend full width of distribution |
| Secondary bus | Below main breaker (~110px below main bus), extends right through distribution |
| Text fields | Left of enclosure, outside all sections |
| N-G bond | Floating inside distribution section, bottom-right, not connected to bus |
| Flow direction | Source at bottom (per §1 Vertical Ordering Convention). The incoming feeder enters from below; downstream breakers exit upward. The switchboard's physical floor (grade, basement, penthouse, etc.) is indicated by a level line annotation — it does not affect the switchboard's drawing position or internal layout. |

### Two Bus Levels

| Bus | Position | Extent | Purpose |
|-----|----------|--------|---------|
| Main bus | Near top (y ≈ 60) | Incoming → just past main GFP breaker | Full service entrance current |
| Secondary bus | Below main (y ≈ 170) | GFP bus node → right edge of distribution | Distributed current — downstream breakers tap here |

The main breaker (GFP) bridges between the two buses — its `line_in` connects to the main bus, its `bus_out` originates the secondary bus.

#### Topology — Bus Instances

Each bus level is an R-2 Bus instance carrying its own identity and calculation fields. The switchboard composition instantiates two R-2 objects:

| Instance | R-2 Ports | Calc Fields | Notes |
|----------|-----------|-------------|-------|
| Main bus | `bus_tap_bi` at incoming feeder, metering CT, and GFP `line_in` positions | `bus_rating` = switchboard main rating, `available_fc` = upstream transformer secondary FC | Carries full service entrance current |
| Secondary bus | `bus_splice_left` at GFP `bus_out` position (bus origin); `bus_tap_bi` at each downstream breaker position | `bus_rating` = main breaker trip rating, `available_fc` = GFP load-side FC | Distributed current — reduced by main breaker |

The incoming feeder (from utility transformer to main bus) is an R-1 Feeder instance with `start` bound to L0-1 `secondary_out` and `end` bound to the main bus `bus_tap_bi` at the incoming section.

### Section Definitions — Normal Power Main Switchboard

#### Section 1 — Incoming

| Element | Connection | Topology Object |
|---------|------------|-----------------|
| Bus tee dot | Filled circle on main bus, marks feeder tap | Main bus R-2 `bus_tap_bi` |
| Feeder line | Vertical, from bus tee down through section bottom | R-1 Feeder instance: `end` → main bus `bus_tap_bi`; `start` → L0-1 `secondary_out` |
| Continuation squiggle | Horizontal, outside and below section boundary | A-3 instance, `termination` mode, bound to the R-1 Feeder |
| Squiggle text | `TO UTILITY TRANSFORMER` | A-3 text field |

The incoming feeder enters from below. The squiggle and text sit below the section, not inside it.

#### Section 2 — Metering

| Element | Connection | Topology Object |
|---------|------------|-----------------|
| Utility meter jaws | CT jaws connect directly onto main bus bar — no gap | L1-4 Utility Grade Meter, `ct_bi` on main bus R-2 |
| Meter riser | Vertical from bus to meter box | Part of L1-4 symbol geometry (not a separate R-1) |
| Meter box | Square with circle and "M" inside, hangs below bus | L1-4 symbol body |

No separate feeder — the meter taps the bus inline via `measurement` connection mode.

#### Section 3 — Distribution

| Element | Connection | Topology Object |
|---------|------------|-----------------|
| GFP main breaker | Hangs below main bus. `line_in` at bus tee, `bus_out` originates secondary bus | L1-1 GFP Circuit Breaker: `line_in` → main bus R-2 `bus_tap_bi`; `bus_out` → secondary bus R-2 `bus_splice_left` (secondary bus origin) |
| Secondary bus | Horizontal, from GFP bus node extending right | R-2 Bus instance: `bus_splice_left` at GFP `bus_out` position, `bus_tap_bi` at each downstream breaker |
| Downstream breakers | Hang from secondary bus. `line_in` exits upward, `bus_out` taps secondary bus | L2-1 Circuit Breaker instances: `bus_out` → secondary bus R-2 `bus_tap_bi`; `line_in` → R-1 Feeder `start` (feeder chain, Section 5) |
| N-G bond | Floating, bottom-right corner. NOT connected to any bus | L1-3 Neutral-Ground Bond, `float` connection mode |

#### Spare and Space Breaker Positions

L2-7 Spare and Space breakers occupy `bus_tap_bi` positions on the secondary bus within distribution sections. They are bus-occupying placeholders — they consume horizontal bus pitch slots but have no downstream feeder chain.

| Variant | Symbol | Topology | Feeder Chain |
|---------|--------|----------|-------------|
| **L2-7 Variant A — Spare** | Full breaker geometry (upper circle, trip arc, lower circle, link, bus node) with "SPARE" label above | `bus_out` → secondary bus R-2 `bus_tap_bi`. No `line_in` port. Breaker is installed but no load is connected. | None — no R-1, no A-1 tag, no A-2 callout |
| **L2-7 Variant B — Space** | Vertical stub only with bus node and "SPACE" label above | `bus_out` → secondary bus R-2 `bus_tap_bi`. No `line_in` port. Physical space reserved but no breaker installed. | None — no R-1, no A-1 tag, no A-2 callout |

**Bus layout impact:** Each spare/space position consumes one `breaker_pitch_min` (130px) horizontal slot on the secondary bus. Include spare/space positions in the breaker count when computing section width (see Multiple Distribution Sections — section width formula).

**Rendering:** Spare/space breakers are positioned on the secondary bus at their assigned `feeder_x` coordinate, same as active L2-1 breakers. The breaker geometry hangs below the bus (same Y structure as Step 1 in §5). No feeder chain extends below them — the vertical space below a spare/space breaker is empty.

**Validation:** L2-7 breakers are exempt from CV-2 (no `line_in` → no downstream R-1 required), TV-1, and TV-2 (no R-1 → no tags required). See §7 exemption notes.

### Bus Rules

**Main bus:**
- Starts in incoming section, extends right through metering, terminates just past the **rightmost main-bus-connected device** (GFP main breaker in base configuration; fire pump breaker if positioned right of GFP — see §2 Fire Pump Section).
- Does NOT extend into distribution sections (which use the secondary bus).
- Stroke: `main_bus_stroke` (2.5 pt). Bus tee dots (r=5, pink fill) at every equipment tap.

**Secondary bus:**
- Originates from GFP `bus_out` filled node.
- Extends rightward through all distribution sections (see Multiple Distribution Sections).
- Stroke: `secondary_bus_stroke` (2.0 pt — lighter than main bus to show hierarchy).
- Does NOT extend left of the GFP main breaker.

### Section Boundary Rules

- Dashed rectangles per `sld_system_model.md` L1-2 Switchboard Section (stroke: neon green `#39FF14`, 1.2pt, dasharray 8,5).
- Adjacent sections share edges — no gaps.
- All sections same height. Widths vary (distribution is typically widest).
- Equipment may extend outside section boundaries (incoming feeder + squiggle extend below).

### Switchboard Text

Text fields for the switchboard designation sit to the left, outside all section boundaries. Text is right-aligned (`text-anchor="end"`).

| Field | Style | Example |
|-------|-------|---------|
| Label Panel Name | Bold (700), underlined | `4MSB-B-A` |
| Line 1 | Bold (700) | `3000A` |
| Line 2 | Regular (400) | `480Y/277V` |
| Line 3 | Regular (400) | `4W, 3PH` |

Text applies to the entire switchboard assembly, not individual sections.

> Text styles per `sld_system_model.md` L1-2 Data Fields. This table is a convenience copy — `sld_system_model.md` governs if values diverge.

### Composition Variants

The section definitions above (§§1–3) describe the base Normal Power Main Switchboard with three sections: Incoming, Metering, Distribution. The following variants extend or modify that base layout. All variants follow the same boundary rules, bus rules, and text placement conventions defined above.

#### Variant NP — Normal Power Main Switchboard (full)

The full Normal Power switchboard may include any combination of the following sections. Sections are ordered left-to-right as listed. Optional sections are omitted when not required by the project.

| Section (L→R) | Required | Contents | Bus Connection | Notes |
|---------------|----------|----------|----------------|-------|
| Incoming | Yes | Bus tee + feeder + squiggle | Main bus `bus_tap_bi` | Base §2 Section 1 |
| Metering | Yes | Utility grade meter on bus | Main bus `ct_bi` (measurement mode) | Base §2 Section 2 |
| Fire Pump | If fire pump present | Dedicated fire pump breaker | Main bus `bus_tap_bi` — NOT secondary bus | See Fire Pump Section below |
| MV Transformer | If MV→480V step-down | L0-2 MV Transformer within dashed section boundary | Main bus: transformer `secondary_out` feeds main bus or dedicated secondary bus | See MV Transformer Section below |
| Main Breaker | Yes | GFP breaker bridging main → secondary bus | Main bus `bus_tap_bi` → GFP `line_in`; GFP `bus_out` → secondary bus `bus_splice_left` (secondary bus origin) | Base §2 Section 3 (GFP portion) |
| Distribution 1 | Yes | Downstream breakers + N-G bond | Secondary bus `bus_tap_bi` per breaker | Base §2 Section 3 (distribution portion) |
| Distribution 2..N | If needed | Additional downstream breakers | Secondary bus extends through section | See Multiple Distribution Sections below |

> **Section ordering rule:** The left-to-right order above is the default. Fire Pump and MV Transformer sections sit between Metering and Main Breaker because they tap the main bus (upstream of the GFP main breaker). Distribution sections are always rightmost.

#### Fire Pump Section

NEC 695.4(B) requires the fire pump supply to be tapped ahead of the main service disconnect (GFP). The fire pump breaker connects to the **main bus**, not the secondary bus — it must remain energized even if the main breaker trips.

| Element | Connection | Topology Object |
|---------|------------|-----------------|
| Bus tee dot | Filled circle on main bus | Main bus R-2 `bus_tap_bi` |
| Fire pump breaker | `bus_out` on main bus tee, `line_in` exits upward | L2-1 Circuit Breaker (or L1-6 Draw-Out if switchgear-class). Ampere rating per NEC 695.4(B)(2) — typically sized at locked-rotor current of the fire pump motor. |
| Feeder | From breaker `line_in` upward to fire pump controller / disconnect | R-1 Feeder instance: `start` → breaker `line_in`; `end` → L3-1 Fire Pump `load_in` or L2-5 Disconnect `line_in` (if a separate disconnect is required per NEC 695.4(B)) |

**Breaker sizing:** Fire pump breakers are sized per NEC 695.4(B)(2) to carry the locked-rotor current of the largest fire pump motor plus the FLA of any other fire pump motors. This is NOT a standard `feeder_schedule.json` lookup — the breaker rating is derived from the motor data in `nec_motor_fla.json` and NEC 430.52 / 695.4(B)(2). Flag as manual EOR input, similar to generator feeders (§6 Pattern 2).

**Feeder chain:** The feeder chain from the fire pump breaker follows §5 Steps 1–4 with `bus_y` = `main_bus_y` (see §5 Coordinate Computation Inputs). At Step 5, use Variant D — the terminal device is the L3-1 Fire Pump (`load_in` as the terminal port) or an L2-5 Disconnect feeding the fire pump. Fire pump feeder sizing follows the §3 Fire Pump Feeder contract (provisional).

**Bus rule:** Per the Bus Rules above, the main bus terminates just past the rightmost main-bus-connected device. The fire pump section's `bus_tap_bi` is included in this extent. Validated by CV-9 (§7).

> **EOR discretion — fire pump section position:** Some engineers place the fire pump section to the left of the main breaker (between metering and main breaker — the default order above). Others place it to the right, after the main breaker section but still on the main bus. Both are NEC-compliant. The section ordering in the table above is the default; the EOR may override. Either way, the fire pump breaker taps the main bus, never the secondary bus.

#### MV Transformer Section

When the service entrance is medium-voltage (4160V–12470V), a step-down transformer section houses the MV→480V transformation within the switchgear lineup. This section contains the L0-2 MV Transformer (placeholder in `sld_system_model.md`) inside a dashed section boundary.

| Element | Connection | Topology Object |
|---------|------------|-----------------|
| MV primary feeder | Enters from below (from MV utility source) | R-1 Feeder instance: `start` → upstream MV source; `end` → L0-2 `primary_in` |
| L0-2 MV Transformer | Primary → secondary step-down | L0-2 MV Transformer: `primary_in` (from below), `secondary_out` (feeds main bus or secondary main breaker) |
| Secondary connection | Transformer `secondary_out` feeds the 480V main bus | R-1 Feeder or direct bus connection depending on configuration |

**Symbol status:** L0-2 MV Transformer is a placeholder — geometry, ports, and calc fields TBD. Use provisional port names `primary_in` and `secondary_out` (consistent with L0-1 Utility Transformer). When L0-2 is completed, update the port bindings here if final port names differ.

**Bus architecture:** Two configurations:

| Configuration | Description | Bus Impact |
|---------------|-------------|------------|
| **Integrated** | Transformer `secondary_out` feeds the main bus directly (no secondary main breaker between transformer and main bus) | Main bus originates at transformer `secondary_out`. No separate incoming section — the MV transformer section IS the incoming section. |
| **With secondary main** | Transformer `secondary_out` feeds a secondary main breaker, which then feeds the main bus | Main bus originates at secondary main breaker `bus_out`. The transformer section is upstream of the main breaker section. |

> **Feeder schedule:** The MV primary feeder uses `mv_feeder_schedule.json` for conductor sizing. The 480V secondary feeder (if present as a separate R-1) uses `feeder_schedule.json`. The voltage transition point is the transformer.

#### Multiple Distribution Sections

When a switchboard has more breakers than fit in a single distribution section, additional distribution sections are added to the right. All distribution sections share the same secondary bus instance.

**Splitting rules:**

| Trigger | Action |
|---------|--------|
| Breaker count exceeds section width at `breaker_pitch_min` (130px) spacing | Add a new distribution section to the right |
| EOR prefers logical grouping (e.g., mechanical loads in one section, lighting in another) | Split at the EOR-designated boundary |
| Bus rating change (future — if different bus bracing is needed for a subsection) | Not currently supported — all distribution sections share one R-2 bus instance with one `bus_bracing` value |

**Bus continuity:** The secondary bus is a single R-2 Bus instance that spans all distribution sections. It does NOT terminate at the first distribution section boundary — it extends rightward through every distribution section. Each additional section adds `bus_tap_bi` ports at the breaker positions within that section.

**Section boundary:** Adjacent distribution sections share edges (same rule as all sections). The boundary is purely visual — it does not interrupt the bus or create a new R-2 instance.

**N-G bond placement:** The N-G bond (L1-3) floats in the **last** (rightmost) distribution section, bottom-right corner. Only one N-G bond per switchboard.

**Section width formulas:**

| Section Type | Width Formula | Example |
|-------------|---------------|---------|
| Distribution | `(breaker_count × breaker_pitch_min) + (2 × section_margin)` | 3 breakers: `(3 × 130) + (2 × 40) = 470px` |
| Incoming | `breaker_pitch_min + (2 × section_margin)` | `130 + 80 = 210px` (one bus tap + padding) |
| Metering | `breaker_pitch_min + (2 × section_margin)` | `130 + 80 = 210px` (meter width + padding) |
| Main Breaker | `breaker_pitch_min + (2 × section_margin)` | `130 + 80 = 210px` (GFP + padding) |
| Fire Pump | `breaker_pitch_min + (2 × section_margin)` | `130 + 80 = 210px` (one breaker + padding) |
| NEC 700/701/702 | Same as Distribution formula | Per breaker count in each NEC class section |

Non-distribution sections contain a single device and use a fixed minimum width. Distribution sections scale with breaker count. `section_margin` (40px) is defined in Dimension Variables.

#### Variant EM — Emergency Switchboard (NEC 700/701/702)

The emergency switchboard receives power from the ATS `load_out` and distributes to emergency, legally required standby, and optional standby branch circuits. It follows the same composition principles as the Normal Power switchboard but with a simplified bus architecture and NEC-class-driven section organization.

**Bus architecture:** Single bus level (no main bus / secondary bus split). The incoming feeder connects directly to the distribution bus. No GFP main breaker — emergency switchboards typically use a main lug only (MLO) configuration per NEC 700.10(B)(5)(a), or a main breaker without GFP.

> **EOR discretion — main breaker vs. MLO:** If the emergency switchboard has a main breaker, add a Main Breaker section between Incoming and the first NEC class section. The main breaker taps the bus and all downstream sections are on the load side. If MLO, the incoming feeder connects directly to the distribution bus with no main breaker section.

**Port binding by configuration:**

| Configuration | Incoming R-1 `end` binds to | Bus topology | R-2 instance count |
|---------------|----------------------------|--------------|---------------------|
| **MLO** | Distribution bus R-2 `bus_tap_bi` (incoming section tap) | Single bus — one R-2 spans incoming through all NEC class sections | 1 |
| **Main breaker** | Main breaker L2-1 `line_in` | Two-level — main bus R-2 (incoming → main breaker) + distribution bus R-2 (main breaker `bus_out` → distribution bus `bus_splice_left`; NEC class breakers at `bus_tap_bi` positions). Same topology as Normal Power §2 two-bus architecture. | 2 |

| Section (L→R) | Required | Contents | Notes |
|---------------|----------|----------|-------|
| Incoming | Yes | Bus tee + feeder from ATS `load_out` + squiggle (`FROM ATS [designation]`) | Feeder R-1: `start` → ATS `load_out`; `end` → bus `bus_tap_bi`. Squiggle text references the ATS designation. |
| Main Breaker | If main breaker present | Main breaker bridging incoming to distribution bus | EOR discretion. If present, bus architecture becomes two-level (same as Normal Power). If absent (MLO), single bus throughout. |
| NEC 700 | If life safety loads present | Breakers for life safety branch circuits (exit lighting, fire alarm, smoke control, etc.) | Leftmost distribution section. NEC 700.10 — separate from other branches. |
| NEC 701 | If legally required loads present | Breakers for legally required standby circuits (ventilation, communications, etc.) | After NEC 700 section. NEC 701.10. |
| NEC 702 | If optional standby loads present | Breakers for optional standby circuits (HVAC, elevators, etc.) | Rightmost distribution section. NEC 702.10. |

**Section ordering:** NEC class sections are ordered by code priority: 700 (life safety) leftmost → 701 (legally required) → 702 (optional standby) rightmost. Sections for NEC classes not present in the project are omitted entirely — the switchboard only includes sections for NEC classes that have loads.

**Section definitions:**

| Element | Connection | Topology Object |
|---------|------------|-----------------|
| Bus tee dots | Filled circles on distribution bus at each breaker position | Bus R-2 `bus_tap_bi` |
| Downstream breakers | `bus_out` on bus tee, `line_in` exits upward | L2-1 Circuit Breaker instances per NEC class |
| N-G bond | Floating, bottom-right corner of rightmost section | L1-3 Neutral-Ground Bond, `float` mode |

**Switchboard text:**

| Field | Style | Example |
|-------|-------|---------|
| Label Panel Name | Bold (700), underlined | `E4MSB-B-A` |
| Line 1 | Bold (700) | `800A` |
| Line 2 | Regular (400) | `480Y/277V` |
| Line 3 | Regular (400) | `4W, 3PH` |

> Note the `E` prefix in the designation — per `equipment_designation_legend.json`, `E` = Emergency Power.

> Text styles per `sld_system_model.md` L1-2 Data Fields. This table is a convenience copy — `sld_system_model.md` governs if values diverge.

**Validation:** TI-2 (normal/emergency bus separation) ensures the emergency switchboard's R-2 Bus instance is disjoint from any Normal Power R-2 Bus. All feeder chains from this switchboard follow §5 identically.

**NEC class tagging:** Each breaker in the emergency switchboard should carry a `nec_class` data field (`700`, `701`, or `702`) matching the section it belongs to. This field is informational on the SLD but is consumed by the validation layer to confirm section assignment correctness.

#### Emergency Switchboard Anti-Patterns

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | NEC 700/701/702 sections in wrong order | NEC 700 (life safety) leftmost, then NEC 701, then NEC 702. Order follows code priority per NEC 700.10. |
| 2 | Emergency switchboard sharing R-2 bus with normal power switchboard | Separate R-2 Bus instances required. TI-2 enforces this. |
| 3 | Omitting NEC class sections that have loads | Every NEC class with downstream loads must have its own section. |
| 4 | Including empty NEC class sections | If no loads exist for a given NEC class, omit that section entirely. |
| 5 | GFP on emergency switchboard main breaker | Emergency switchboards typically do not have GFP per NEC 700.10(B)(5)(a). If a main breaker is present, use L2-1 (standard breaker) or L1-6 (draw-out), not L1-1 (GFP). EOR to confirm per AHJ. |
| 6 | Fire pump breaker on emergency switchboard secondary bus | Fire pump has a dedicated supply ahead of the main disconnect per NEC 695.4(B). It should not be on the emergency switchboard unless it is a dedicated fire pump ATS/controller arrangement — consult EOR. |
| 7 | N-G bond in wrong section | N-G bond floats in the rightmost section, same as Normal Power. |

### Reference SVG — 3-Section Main Switchboard

ViewBox: `0 0 820 360`. Sections: incoming (x=165, w=140), metering (x=305, w=140), distribution (x=445, w=340). Main bus at y=60, secondary bus at y=170. All symbol rendering within this SVG follows the anti-pattern rules defined in `sld_system_model.md` for each respective symbol.

```svg
<svg viewBox="0 0 820 360" xmlns="http://www.w3.org/2000/svg">
  <!-- Section boundaries -->
  <rect x="165" y="30" width="140" height="230"
        fill="none" stroke="#39FF14" stroke-width="1.2" stroke-dasharray="8,5"/>
  <rect x="305" y="30" width="140" height="230"
        fill="none" stroke="#39FF14" stroke-width="1.2" stroke-dasharray="8,5"/>
  <rect x="445" y="30" width="340" height="230"
        fill="none" stroke="#39FF14" stroke-width="1.2" stroke-dasharray="8,5"/>

  <!-- Main bus -->
  <line x1="220" y1="60" x2="540" y2="60"
        stroke="#00FFFF" stroke-width="2.5"/>

  <!-- S1: Incoming -->
  <circle cx="235" cy="60" r="5" fill="#FF69B4"/>
  <line x1="235" y1="65" x2="235" y2="270"
        stroke="#00FFFF" stroke-width="1.5"/>
  <path d="M220,278 C220,292 228,292 235,278 C242,264 250,264 250,278"
        fill="none" stroke="#FF69B4" stroke-width="2.5" stroke-linecap="round"/>
  <text x="172" y="300" font-family="monospace" font-size="9"
        font-weight="600" fill="#FFFFFF">TO UTILITY TRANSFORMER</text>

  <!-- S2: Metering -->
  <path d="M380,60 C380,52 372,42 364,38 C356,34 346,38 342,46"
        fill="none" stroke="#00FFFF" stroke-width="2" stroke-linecap="round"/>
  <path d="M380,60 C380,52 388,42 396,38 C404,34 414,38 418,46"
        fill="none" stroke="#00FFFF" stroke-width="2" stroke-linecap="round"/>
  <line x1="380" y1="60" x2="380" y2="100"
        stroke="#00FFFF" stroke-width="1.5"/>
  <rect x="355" y="100" width="50" height="50"
        fill="none" stroke="#00FFFF" stroke-width="2.5"/>
  <circle cx="380" cy="125" r="16"
          fill="none" stroke="#00FFFF" stroke-width="2"/>
  <text x="380" y="131" text-anchor="middle"
        font-family="monospace" font-size="16" font-weight="700"
        fill="#FFFFFF">M</text>

  <!-- S3: Distribution — GFP Main Breaker -->
  <circle cx="510" cy="60" r="5" fill="#FF69B4"/>
  <line x1="510" y1="65" x2="510" y2="80"
        stroke="#00FFFF" stroke-width="1.5"/>
  <circle cx="510" cy="88" r="7"
          fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <path d="M510,88 Q494,114 510,140"
        fill="none" stroke="#00FFFF" stroke-width="2"/>
  <circle cx="510" cy="140" r="7"
          fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <line x1="510" y1="147" x2="510" y2="165"
        stroke="#00FFFF" stroke-width="1.5"/>
  <circle cx="510" cy="170" r="5" fill="#FF69B4"/>

  <!-- GFP module -->
  <rect x="460" y="102" width="34" height="22"
        fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <text x="477" y="117" text-anchor="middle"
        font-family="monospace" font-size="9" font-weight="700"
        fill="#FFFFFF">GFP</text>
  <line x1="494" y1="114" x2="500" y2="114"
        stroke="#00FFFF" stroke-width="1.2" stroke-dasharray="4,3"/>
  <circle cx="500" cy="114" r="1.5" fill="#00FFFF" opacity="0.7"/>
  <line x1="477" y1="124" x2="477" y2="155"
        stroke="#00FFFF" stroke-width="1.2" stroke-dasharray="4,3"/>
  <line x1="477" y1="155" x2="510" y2="155"
        stroke="#00FFFF" stroke-width="1.2" stroke-dasharray="4,3"/>
  <circle cx="510" cy="155" r="1.5" fill="#00FFFF" opacity="0.7"/>

  <!-- GFP text -->
  <text x="526" y="112" font-family="monospace" font-size="10"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">3000A</text>
  <text x="526" y="128" font-family="monospace" font-size="10"
        font-weight="700" fill="#FFFFFF">3P</text>

  <!-- Secondary bus -->
  <line x1="515" y1="170" x2="760" y2="170"
        stroke="#00FFFF" stroke-width="2"/>

  <!-- Downstream breaker 1: 400A -->
  <circle cx="620" cy="170" r="4" fill="#FF69B4"/>
  <line x1="620" y1="166" x2="620" y2="154" stroke="#00FFFF" stroke-width="1.5"/>
  <circle cx="620" cy="148" r="5" fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <path d="M620,148 Q610,135 620,122" fill="none" stroke="#00FFFF" stroke-width="2"/>
  <circle cx="620" cy="122" r="5" fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <text x="636" y="134" font-family="monospace" font-size="9"
        font-weight="700" text-decoration="underline" fill="#FFFFFF">400A</text>
  <text x="636" y="146" font-family="monospace" font-size="9"
        font-weight="700" fill="#FFFFFF">3P</text>

  <!-- Downstream breaker 2: 225A -->
  <circle cx="720" cy="170" r="4" fill="#FF69B4"/>
  <line x1="720" y1="166" x2="720" y2="154" stroke="#00FFFF" stroke-width="1.5"/>
  <circle cx="720" cy="148" r="5" fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <path d="M720,148 Q710,135 720,122" fill="none" stroke="#00FFFF" stroke-width="2"/>
  <circle cx="720" cy="122" r="5" fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <text x="736" y="134" font-family="monospace" font-size="9"
        font-weight="700" text-decoration="underline" fill="#FFFFFF">225A</text>
  <text x="736" y="146" font-family="monospace" font-size="9"
        font-weight="700" fill="#FFFFFF">3P</text>

  <!-- N-G Bond (floating, bottom-right of distribution) -->
  <line x1="733" y1="232" x2="757" y2="232" stroke="#00FFFF" stroke-width="3"/>
  <circle cx="745" cy="232" r="3" fill="#FF69B4"/>
  <line x1="745" y1="232" x2="745" y2="247" stroke="#00FFFF" stroke-width="2"/>
  <circle cx="745" cy="247" r="3" fill="#FF69B4"/>
  <line x1="735" y1="247" x2="755" y2="247" stroke="#00FFFF" stroke-width="2.5"/>
  <line x1="745" y1="247" x2="745" y2="258" stroke="#00FFFF" stroke-width="2"/>
  <line x1="735" y1="258" x2="755" y2="258" stroke="#00FFFF" stroke-width="2"/>
  <line x1="738" y1="264" x2="752" y2="264" stroke="#00FFFF" stroke-width="2"/>
  <line x1="741" y1="270" x2="749" y2="270" stroke="#00FFFF" stroke-width="2"/>
  <ellipse cx="745" cy="276" rx="2.5" ry="1.5" fill="#00FFFF"/>

  <!-- Switchboard text -->
  <text x="150" y="78" text-anchor="end"
        font-family="monospace" font-size="13" font-weight="700"
        text-decoration="underline" fill="#FFFFFF">4MSB-B-A</text>
  <text x="150" y="96" text-anchor="end"
        font-family="monospace" font-size="12" font-weight="700"
        fill="#FFFFFF">3000A</text>
  <text x="150" y="112" text-anchor="end"
        font-family="monospace" font-size="12"
        fill="#FFFFFF">480Y/277V</text>
  <text x="150" y="128" text-anchor="end"
        font-family="monospace" font-size="12"
        fill="#FFFFFF">4W, 3PH</text>
</svg>
```

### Switchboard Anti-Patterns

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Main bus spanning full width of all sections | Main bus terminates just past the rightmost main-bus-connected device (GFP in base config, or fire pump breaker if positioned right of GFP). Secondary bus handles distribution. |
| 2 | Meter jaws with gap from bus | Jaws fork directly from the bus bar coordinate (same Y as bus). |
| 3 | Simple ground symbol instead of full N-G bond | Use the complete N-G bond assembly (neutral bus + ground bus + jumper + earth ground). |
| 4 | N-G bond connected to the power bus | N-G bond floats — not connected to any bus or feeder. |
| 5 | Gaps between adjacent sections | Shared edges — dashed rectangles touch at shared boundaries. |
| 6 | Different section heights | All sections same height. Only width varies. |
| 7 | Secondary bus extending left of GFP breaker | Secondary bus starts at GFP `bus_out` and extends right only. |
| 8 | Downstream breakers on main bus | Downstream breakers tap the secondary bus — load side of main breaker. |

---

## 3. Feeder Data Contract

All feeder sizing, tag encoding, and conduit callout generation is driven by the normalized JSON data layer. This section defines the lookup contract — how composition rules consume feeder data.

### Authoritative Sources

| Data Need | Source File | Lookup Key |
|-----------|------------|------------|
| LV feeders (3-wire and 4-wire) | `feeder_schedule.json` | `configurations[].feeders[].nominal_ampacity` |
| Transformer secondary feeders (T-suffix) | `3_phase_transformer_feeder_schedule.json` | `transformers[].kva` |
| MV feeders | `mv_feeder_schedule.json` | `voltage_classes[].feeders[].nominal_ampacity` |

### Lookup Contract — LV Feeders

**Input:** `nominal_ampacity` (breaker rating, e.g., 225) + system config (`3 Phase, 3 Wire + Ground` or `3 Phase, 4 Wire + Ground`)

**Config selection (Tier 1 — deterministic):** the wire count follows the load's neutral requirement:

- **4-wire** (`…4` tags) — feeders serving loads that carry a neutral: panelboards, ATS feeds, and any wye-served equipment with line-to-neutral loads.
- **3-wire** (`…3` tags) — feeders serving a **delta-connected transformer primary** (§5 Variant B primary R-1, e.g. 480Δ side of a 480Δ-208Y/120V unit): no neutral exists on the delta side, so the primary uses the 3-wire row (e.g., 225A → `2253`, (3)350 AL, #4 CU GND, 2 1/2"C). Terminal loads without a neutral requirement (motors) may also use 3-wire at EOR discretion (Tier 2 — default is 4-wire pending a documented determination).

**Output fields:**

| Composition Term | JSON Field Path | Example (225A, 4W) |
|-----------------|-----------------|---------------------|
| `tag` | `feeders[].tag` | `2254` |
| `sets` | `feeders[].number_of_sets` | `1` |
| `conduit_size` | `feeders[].conduit_size_min` | `3 1/2"` |
| `conductor_size` | `feeders[].phase_conductors.size` | `350` |
| `conductor_qty` | `feeders[].phase_conductors.quantity` | `4` |
| `conductor_material` | `feeders[].phase_conductors.material` | `AL` |
| `ground_size` | `feeders[].ground_conductor.size` | `6` |
| `ground_material` | `feeders[].ground_conductor.material` | `CU` |

### Lookup Contract — Transformer Secondary Feeders

**Input:** `kva` (transformer nameplate rating, e.g., 75)

**Output fields:** `secondary.ocpd.rating_a`, `secondary.one_line_tag` (T-suffix, e.g., `2504T`), `secondary.feeder_type`, `bonding_jumper`, `grounding_electrode_conductor`.

Secondary feeders use the T-suffix one-line tag on the SLD, NOT the standard feeder schedule tag. Refer to `3_phase_transformer_feeder_schedule.json` design notes for breaker sizing rationale and EOR discretion points.

**Conductor sizing for transformer secondary feeders (two-hop lookup):**

1. Look up `kva` in `3_phase_transformer_feeder_schedule.json` → extract `secondary.feeder_type` (e.g., `2504` for 75 kVA).
2. Parse the `feeder_type` string value: extract the last character as wire count (`'3'` → 3-wire, `'4'` → 4-wire). Convert the remaining characters to an integer — this is the `nominal_ampacity` for the `feeder_schedule.json` lookup. Select the `configurations[]` array in `feeder_schedule.json` where `wire_count` matches the extracted wire count digit. Example: `feeder_type` = `"2504"` → wire count = `4`, `nominal_ampacity` = `250`.
3. Look up that `nominal_ampacity` + configuration in `feeder_schedule.json` → extract `conductor_size`, `conductor_material`, `conduit_size`, `num_sets`, `ground_size`, `ground_material`.
4. Populate the secondary R-1 Feeder calc fields from this result. The secondary R-1's A-2 Conduit Callout also uses this data (Section 4 algorithm).

> Note: The bonding jumper size comes from `3_phase_transformer_feeder_schedule.json` directly — it replaces the equipment grounding conductor from the general feeder schedule for transformer secondary feeders.

### Usage Rules

- **≤90A:** Copper phase conductors, copper ground.
- **≥100A:** Aluminum phase conductors, copper ground (up to 800A).
- **≥1000A:** Both phase and ground transition to aluminum.
- **Parallel sets start at 300A** — 2 sets. Sets increase with ampacity: 3 at 600A, 4 at 1000A, up to 15 at 4000A.
- **Tag encoding:** 4-wire tags end in `4`, 3-wire tags end in `3`. Digits before the last = amperage.
- **Max single conductor:** 500 kcmil AL — larger feeders use more parallel sets, not bigger wire.

> **Source of truth:** The `feeder_schedule.json` `phase_conductors.material` and `ground_conductor.material` fields are authoritative for conductor material at each ampacity tier. The prose rules above are a human-readable summary. If the JSON and prose ever diverge, the JSON governs. Validation rule DV-7 checks against the JSON field, not the prose.

### Lookup Contract — MV Feeders

**Input:** `nominal_ampacity` (e.g., 400) + `voltage_class` (`2001-5000V` or `5001-15000V`)

**Resolution:** Select `voltage_classes[]` where `voltage_range` matches the voltage class, then find `feeders[]` where `nominal_ampacity` matches.

**Output fields:**

| Composition Term | JSON Field Path | Example (400A, 5kV) |
|-----------------|-----------------|----------------------|
| `tag` | `feeders[].tag` | `5K4003` |
| `sets` | `feeders[].number_of_sets` | `1` |
| `conduit_size` | `feeders[].conduit_size_min` | `4"` |
| `conductor_size` | `feeders[].phase_conductors.size` | `500` |
| `conductor_qty` | `feeders[].phase_conductors.quantity` | `3` |
| `ground_size` | `feeders[].ground_conductor.size` | `2` |

**MV-specific notes:**
- MV feeders are always copper (per `mv_feeder_schedule.json` — no CU/AL transition).
- MV feeders are always 3-wire + ground (no 4-wire neutral).
- Conduit is PVC underground duct (not EMT/RMC). The callout format differs from LV — see Section 4, MV Callout Variant.
- MV feeder tags use a `5K` or `15K` prefix encoding the voltage class, followed by ampacity and wire count (e.g., `5K4003` = 5kV class, 400A, 3-wire).

### Lookup Contract — Fire Pump Feeders (provisional)

Fire pump feeder sizing follows a motor branch circuit approach per NEC 695 and NEC 430. This contract is provisional — EOR confirmation is required for final breaker and conductor sizing.

**Input:** Motor HP + system voltage (e.g., 100 HP at 480V)

**Sizing path:**

1. Look up motor FLA in `nec_motor_fla.json` → `motors[].induction_fla[voltage]` (e.g., 100 HP at 460V → 124A).
2. Apply NEC 430.52 multiplier for breaker sizing: FLA × 2.5 (inverse-time breaker) = maximum OCPD rating. Round down to next standard rating per `nec_standard_ratings.json` → `fuse_cb_ampere_ratings.standard_ratings_a`.
3. Use the resulting OCPD rating as `nominal_ampacity` input to the LV feeder lookup contract (§3) to determine conductor sizing, conduit, and ground.
4. Populate the R-1 Feeder calc fields from this result.

**Breaker sizing note:** NEC 695.4(B)(2) permits the fire pump breaker to be sized to carry the locked-rotor current indefinitely. Locked-rotor current is typically 6× FLA for standard induction motors. The breaker must NOT open on locked-rotor current — it is sized to protect the conductors while allowing the pump to run under stall conditions. The NEC 430.52 multiplier above is the standard motor branch circuit sizing; EOR may adjust per NEC 695.4(B)(2) and the specific motor locked-rotor characteristics.

> **Tag and callout:** Fire pump feeders use the standard Section 4 callout algorithm with the conductor sizing determined by this contract. DV-1 and DV-2 validation applies — unlike generator feeders, fire pump feeders DO map to `feeder_schedule.json` through the sizing path above.

### Lookup Contract — Equipment Connection Feeders (provisional)

Equipment connection feeder sizing converts a kW-rated load to breaker and conductor specifications. This contract provides a calculated default path for schematic/DD phase design. An MCA/MOCP override path replaces the default when manufacturer nameplate data is available (typically CD phase).

**Default path — kW-derived sizing:**

**Input:** `rated_kw` + `voltage` + `phases` + `power_factor` (default 0.90)

**Sizing path:**

1. Calculate load amps:
   - 3-phase: `amps = rated_kw × 1000 / (voltage × √3 × power_factor)`
   - Single-phase: `amps = rated_kw × 1000 / (voltage × power_factor)`
2. Apply 125% continuous load factor per NEC 210.20(A) / NEC 215.3: `design_amps = amps × 1.25`
3. Select breaker rating: next standard rating ≥ `design_amps` per `nec_standard_ratings.json` → `fuse_cb_ampere_ratings.standard_ratings_a`
4. Use the resulting breaker rating as `nominal_ampacity` input to the LV feeder lookup contract (§3 LV Feeders) to determine conductor sizing, conduit, and ground.
5. Populate the R-1 Feeder calc fields from this result.

**Override path — MCA/MOCP:**

When manufacturer-provided ratings are available (equipment submittals, nameplate data), they override the kW-derived sizing:

| Input | Source | Use |
|-------|--------|-----|
| `mca` (Minimum Circuit Ampacity) | Equipment nameplate / submittal | Conductor sizing: next ampacity tier ≥ `mca` in `feeder_schedule.json` |
| `mocp` (Maximum Overcurrent Protection) | Equipment nameplate / submittal | Breaker rating: use `mocp` directly (already a standard rating per UL listing) |

When both `mca` and `mocp` are populated on the L3-3 instance, they take precedence over the kW-derived values. The compositor uses `mocp` as the breaker rating and looks up conductors based on the ampacity tier matching `mca`.

**Path selection and flagging:**

| Condition | Sizing path used | Flag |
|-----------|-----------------|------|
| Only `rated_kw` populated | Default (kW-derived) | EOR review note: "Breaker and conductor sized from kW with PF={value}, 125% continuous. Verify against equipment nameplate when available." |
| `mca` and `mocp` populated | Override (MCA/MOCP) | None — manufacturer data is authoritative |
| `mocp` ≠ kW-derived breaker rating | Override (MCA/MOCP) | EOR review note: "MCA/MOCP override produced different sizing than kW calculation. Using nameplate values." |

**Decision tier:** Default path = Tier 2 (PF=0.90 default, 125% continuous load factor — EOR may override either). Override path = Tier 3 (MCA/MOCP are project-specific nameplate data).

**Tag and callout:** Equipment connection feeders use the standard §4 callout algorithm with the conductor sizing determined by whichever path is active. DV-1 and DV-2 validation applies — the breaker rating (whether kW-derived or MOCP) drives the schedule lookup.

> **Single-phase note:** Most commercial/healthcare equipment connections are 3-phase. For single-phase equipment connections on a 3-phase SLD, use the single-phase formula in step 1 and note the wire count configuration (2-wire + ground). Single-phase equipment connections are uncommon on SLDs — flag as EOR review if encountered.

> **Continuous load assumption:** The 125% factor assumes continuous load per NEC definition (operates for 3 hours or more). Non-continuous loads (e.g., intermittent kitchen equipment) may use 100% — EOR overrides the factor. The compositor applies 125% by default and records the assumption.

---

## 4. Tag & Callout Generation Algorithms

### Conduit Callout Text Generation

Given a feeder schedule row (looked up per Section 3), generate the callout text string automatically.

#### Algorithm

```
Input: nominal_ampacity (e.g., 225)

0. Determine wire count configuration from downstream system voltage:
   - 480Y/277V or 208Y/120V → 4-wire → select configurations[] where wire_count = 4
   - 480V delta → 3-wire → select configurations[] where wire_count = 3
   All subsequent lookups use the selected configuration array.

1. Look up row in feeder_schedule.json where nominal_ampacity matches
2. Extract: sets (number_of_sets), conduit_size (conduit_size_min),
   conductor_size (phase_conductors.size), conductor_material (phase_conductors.material),
   conductor_qty (phase_conductors.quantity),
   ground_size (ground_conductor.size), ground_material (ground_conductor.material)

3. If sets = 1:
     "{conduit_size}"C - ({conductor_qty}){conductor_size} {conductor_material} + #{ground_size} {ground_material} GND"
   If sets > 1:
     "({sets}) {conduit_size}"C - ({conductor_qty}){conductor_size} {conductor_material} + #{ground_size} {ground_material} GND"

4. Wire size formatting:
   - AWG sizes ≤ 4/0: prefix with # (e.g., #10, #4/0)
   - kcmil sizes (250, 300, 350, 500): no # prefix (e.g., 250, 350, 500)

5. Conduit size formatting:
   - feeder_schedule.json stores sizes with spaces (e.g., "3 1/2\"")
   - Callout output uses the JSON value as-is, appended with "C" (e.g., 3 1/2"C)
```

#### Examples

| Amps | Sets | Output |
|------|------|--------|
| 20A | 1 | `3/4"C - (4)#12 CU + #12 CU GND` |
| 100A | 1 | `2"C - (4)#1/0 AL + #6 CU GND` |
| 225A | 1 | `3 1/2"C - (4)#350 AL + #6 CU GND` |
| 400A | 2 | `(2) 3"C - (4)#350 AL + #3 CU GND` |
| 1000A | 4 | `(4) 3 1/2"C - (4)#500 AL + #4/0 AL GND` |

> **Per-field formatting:** Apply the AWG/kcmil formatting rule (step 4) independently to each conductor field — phase conductor size and ground conductor size are formatted separately. A single callout may contain both formats (e.g., `350 AL + #6 CU GND`).

#### Transformer Secondary Callout Variant

When the R-1 Feeder is downstream of an L2-2 LV Transformer (T-suffix tag per §3), the ground conductor portion of the callout is replaced with the supply-side bonding jumper from `3_phase_transformer_feeder_schedule.json`.

**Modification to step 2:** Replace `ground_size` and `ground_material` with `bonding_jumper` from `3_phase_transformer_feeder_schedule.json` → `transformers[].bonding_jumper`. Material is always CU.

**Modification to step 3:** Replace `#{ground_size} {ground_material} GND` with `#{bonding_jumper_size} CU SBJ` (SBJ = Supply-side Bonding Jumper per NEC 250.102(C)(1)).

**Format (sets = 1):**
```
{conduit_size}"C - ({conductor_qty}){conductor_size} {conductor_material} + #{bonding_jumper_size} CU SBJ
```

**Format (sets > 1):**
```
({sets}) {conduit_size}"C - ({conductor_qty}){conductor_size} {conductor_material} + #{bonding_jumper_size} CU SBJ
```

> Per `3_phase_transformer_feeder_schedule.json` notes: provide (1) supply-side bonding jumper in each parallel raceway of the secondary feeder.

**Examples:**

| kVA | Amps | Bonding Jumper | Output |
|-----|------|----------------|--------|
| 75 | 250A | #2 AWG | `3 1/2"C - (4)350 AL + #2 CU SBJ` |
| 112.5 | 400A | #2 AWG | `(2) 3"C - (4)350 AL + #2 CU SBJ` |
| 300 | 1000A | #1/0 AWG | `(4) 3 1/2"C - (4)500 AL + #1/0 CU SBJ` |

#### MV Callout Variant

MV feeders use a different callout format reflecting underground PVC duct installation, copper-only conductors, and voltage class identification.

**Input:** MV feeder schedule row from `mv_feeder_schedule.json` (looked up per §3 MV Feeder contract).

**Format:**
```
{conduit_size} PVC - ({conductor_qty})#{conductor_size} CU + #{ground_size} CU GND
```

**Notes:**
- Conduit size uses the JSON value as-is (e.g., `4"`). No `"C` suffix — MV uses `PVC` label instead.
- MV feeders are always single-set (`number_of_sets` = 1 in current schedule). If multi-set MV feeders are added, apply the `({sets})` prefix format.
- No voltage class in the callout text — the feeder tag (e.g., `5K4003`) already encodes the voltage class.

**Examples:**

| Amps | Voltage Class | Output |
|------|---------------|--------|
| 400A | 5kV | `4" PVC - (3)500 CU + #2 CU GND` |
| 250A | 15kV | `4" PVC - (3)#3/0 CU + #2 CU GND` |

### Feeder Tag Content Generation

Tag content is the feeder schedule `tag` field for the matching `nominal_ampacity`. For transformer secondary feeders, use the `one_line_tag` from `3_phase_transformer_feeder_schedule.json` (T-suffix, e.g., `2254T`).

---

## 5. Feeder Chain Composition

The feeder chain is the vertical assembly between a distribution breaker and downstream equipment. This is the most repeated pattern on any SLD — it appears for every breaker on every switchboard.

Each feeder chain instantiates a sequence of topology objects following the three-object connection model defined in `sld_system_model.md`: **Device A → Routed Element (R-1) → Device B**. Every conductor run is a first-class R-1 Feeder instance with its own identity, data fields, and calculation fields — there are no implicit lines.

> **R-1 Directionality Convention:** Per `sld_system_model.md`, R-1 Feeder `start` is the **source-side** endpoint and `end` is the **load-side** endpoint. Power flows from `start` → `end`. In a feeder chain: `start` binds to the upstream breaker's `line_in` port; `end` binds to the downstream load device's input port (`feed_top`/`feed_bottom`/`feed_left`/`feed_right` for panelboard, `primary_in` or `flex_` for transformer, `source1_in`/`source2_in` for ATS, `load_in` for terminal loads, `line_in` for SPD Mode A). This convention applies to all R-1 instances throughout the composition. Port directionality is **device-aware** — the same port name can be source-side on one device and load-side on another (see CV-8 device-aware port classification in §7).

### Chain Variants — Topology Objects

| Variant | Topology Sequence | Use Case |
|---------|-------------------|----------|
| **A — Direct Panel** | L2-1 → R-1 → [A-1, A-2] → L2-4 | Most common. 480V panel, mechanical, branch |
| **B — Transformer + Panel** | L2-1 → R-1 → [A-1, A-2] → L2-2 → R-1 → [A-1, A-2] → L2-4 | Step-down 480→208/120V. Two R-1 instances (primary + secondary) |
| **C — ATS Feed** | L2-1 → R-1 → [A-1, A-2] → L2-3 (`source1_in` or `source2_in`) | Emergency/standby source |
| **D — Terminal Load** | L2-1 → R-1 → [A-1, A-2] → L3-1 / L3-2 / L3-3 (`load_in`) | Fire pump, motor, equipment connection |
| **E — SPD (Mode A)** | L2-1 → R-1 → [A-1, A-2] → L2-6 (`line_in`) | Dedicated CB-fed surge protective device. Terminal device, no output. |
| **F — Inline Disconnect** | L2-1 → R-1(upstream) → [A-1, A-2] → L2-5 → R-1(downstream, stub_exempt) → downstream device | Disconnect switch inline on feeder. Two R-1 instances. Fire pump disconnect, mechanical disconnect, service entrance disconnect. |
| **G — Sub-Fed Panelboard** | L2-4 `feed_[exit]` → R-1 → [A-1, A-2] → L2-4 `feed_[entry]` | Panel-to-panel sub-feed. No explicit breaker drawn — breaker is inside upstream panel (shown on panel schedule, not SLD). |

Variants A–F share the same upper structure (L2-1 breaker + R-1 feeder + A-1/A-2 tags). Variant G is structurally different — it originates from a panelboard port instead of a breaker, with no explicit breaker in the topology. SPD Mode B (spur attachment) is NOT a feeder chain — see Spur Attachment Composition below.

### Composition Anatomy

```
  ══════════● BUS BAR (bus tee dot, r = bus_r_dot)
            │
        ┌───┤ BREAKER ZONE (cb_height = 54px)
      arc   │
        └───│
            ● Filled bus node (r = cb_r_bus)
            │
            │ FEEDER ZONE
       ╱    │
      ╱ ────┤ FEEDER TAG (tag_gap = 60px below breaker)
            │
      D─────┤ CONDUIT CALLOUT (inter_tag_gap = 40px below tag)
            │
        ┌───┴───┐
        │ LOAD  │ EQUIPMENT (equip_gap + equip_stub = 70px below callout)
        └───────┘
```

### Zone Heights

| Zone | Variable | Minimum Height | Derivation |
|------|----------|---------------|------------|
| Breaker body | `cb_height` | 54px | `cb_r_node(4) + cb_node_spacing(32) + cb_r_node(4) + cb_link_length(12) + cb_r_bus(2.5) ≈ 54px` |
| Tag gap (breaker to feeder tag) | `tag_gap` | 60px | Clear space so tag doesn't overlap breaker text |
| Inter-tag gap (feeder tag to callout) | `inter_tag_gap` | 40px | Separation between tags |
| Tag-to-equipment gap | `equip_gap` | 40px | Clear space before load |
| Equipment stub | `equip_stub` | 30px | Composition clearance between feeder endpoint and panel `feed_top` |

**Minimum feeder run (bus to panelboard `feed_top`):**
```
cb_height(54) + tag_gap(60) + inter_tag_gap(40) + equip_gap(40) + equip_stub(30) = 224px
```

### Coordinate Computation — Inputs

| Input | Source | Example |
|-------|--------|---------|
| `bus_y` | Switchboard composition (Section 2). Use `secondary_bus_y` (≈170) for standard distribution breakers. Use `main_bus_y` (≈60) for breakers tapping the main bus (fire pump per §2 Fire Pump Section). | 170 (secondary) or 60 (main) |
| `feeder_x` | Breaker position on bus | 620 |
| `breaker_amps` | Design | 225A |
| `breaker_poles` | Design | 3P |
| `load_type` | Design (panel, transformer, ATS, fire pump, motor, equipment) | Panelboard |

### Step 1 — Instantiate the Breaker

**Topology:** Instantiate L2-1 Circuit Breaker. Bind `bus_out` to the appropriate R-2 Bus `bus_tap_bi`: secondary bus for standard distribution breakers, main bus for fire pump breakers (§2 Fire Pump Section). Assign designation per `equipment_designation_legend.json` (e.g., `4B-1-A` for a 480V branch panel breaker on level 1). Populate data fields: ampere trip rating, ampere frame rating, poles.

**Rendering:** The breaker's `bus_out` sits on the bus bar at `bus_y`. All geometry is computed upward from this point — the formulas are identical regardless of which bus. Only the starting `bus_y` value differs. Dimensions reference L2-1 Circuit Breaker variables from the Dimension Variables section.

| Element | X | Y Formula | Derivation |
|---------|---|-----------|------------|
| Bus node (`bus_out`) | `feeder_x` | `bus_y` | Bus bar coordinate — breaker `bus_out` sits on bus |
| `line_in` port | `feeder_x` | `bus_y − cb_height` | `bus_y − 54` — topmost breaker port |

> **Symbol-internal geometry:** The breaker's internal elements (open circles, trip arc, vertical link, bus node) are rendered by the L2-1 symbol definition in `sld_system_model.md`, placed from the breaker anchor. The composition layer only needs the two port Y-coordinates above. Do not compute internal element positions from composition formulas — use the system model's parametric geometry.

> **SVG coordinate convention:** Y increases downward. Bus bar is at HIGH Y (bottom of canvas). Load equipment at LOW Y (top of canvas). Throughout this section, "below" and "above" refer to **drawing space** (physical sheet position), not SVG Y direction. "Below the breaker" = toward the load = lower Y = higher on screen. All formulas use SVG coordinates — subtraction from `bus_y` moves toward load equipment.

### Step 2 — Instantiate the Feeder

**Topology:** Instantiate R-1 Feeder. Bind `start` to the L2-1 breaker's `line_in` port. Bind `end` to the load device's feed port, determined by variant:

| Variant | `end` binds to | Port selection |
|---------|---------------|----------------|
| A — Panelboard | `feed_top` / `feed_bottom` / `feed_left` / `feed_right` | Per Panelboard Port Selection algorithm (Step 5 Variant A) |
| B — Transformer | `primary_in` or `flex_left` / `flex_right` | Default `primary_in`; flex ports per Flex Port Routing rules |
| C — ATS | `source1_in` or `source2_in` | Per ATS source assignment |
| D — Terminal Load | `load_in` | L3-1, L3-2, L3-3 |
| E — SPD (Mode A) | `line_in` | L2-6 SPD only |
| F — Inline Disconnect (upstream R-1) | L2-5 `line_in` | Disconnect line-side entry |
| F — Inline Disconnect (downstream R-1) | Per downstream device type (A/D/E) | Downstream R-1 `start` = L2-5 `load_out`; `end` per downstream variant |

Populate R-1 data and calc fields:

| R-1 Field | Source | Example |
|-----------|--------|---------|
| `designation` | User-assigned unique feeder ID | `F-42` |
| `conductor_size` | Schedule lookup | `350` |
| `conductor_material` | Schedule lookup | `AL` |
| `conduit_size` | Schedule lookup | `3 1/2"` |
| `num_sets` | Schedule lookup | `1` |
| `distance` | Project input (engineer provides) | `75` |
| `voltage_drop_pct` | Calculated from impedance × current × distance | `1.2%` |
| `available_fc_load` | Calculated from upstream FC − feeder impedance contribution | `38.5 kA` |

The feeder schedule `tag` value (e.g., `2254`) is not stored on the R-1 — it is the content of the A-1 Feeder Tag instance bound to this R-1 via `bound_to` (see Step 3).

**Rendering:** Compute the path geometry between the two bound ports.

**Aligned (same X):** Single vertical `<line>` from `(feeder_x, line_in_y)` to `(feeder_x, load_feeder_port_y)`. Continuous through all tag attachment points.

**Offset (horizontal jog):**

| Segment | Start | End |
|---------|-------|-----|
| Vertical rise | `(feeder_x, line_in_y)` | `(feeder_x, jog_y)` |
| Horizontal jog | `(feeder_x, jog_y)` | `(load_x, jog_y)` |
| Vertical to load | `(load_x, jog_y)` | `(load_x, load_port_y)` |

**Tag segment rule:** Tags always attach to the **first vertical segment** (breaker side). Never on the horizontal jog or second vertical.

**`jog_y` computation:** `jog_y = line_in_y − tag_gap − inter_tag_gap − equip_gap`. The jog occurs after the tag and callout zone, in the equipment gap region. This ensures tags are always on the first vertical segment (above the jog). If the horizontal offset distance is small, the jog still occurs at this Y to maintain consistent tag placement.

### Step 3 — Bind the Feeder Tag

**Topology:** Instantiate A-1 Feeder Tag. Set `bound_to` to the R-1 Feeder instance from Step 2. Tag content = R-1's `tag` field (e.g., `2254`). For transformer secondary feeders, content = `one_line_tag` from `3_phase_transformer_feeder_schedule.json` (T-suffix, e.g., `2254T`). Side = right (default) or left (per Tag Side Selection Algorithm below).

**Rendering:** Given `feeder_x` and `tag_y = line_in_y − tag_gap`:

**Right-side leader (default):**

| Element | Position |
|---------|----------|
| Tick | `(feeder_x − tag_tick_half_w, tag_y + tag_tick_half_h)` to `(feeder_x + tag_tick_half_w, tag_y − tag_tick_half_h)` |
| Leader | `(feeder_x, tag_y)` to `(feeder_x + tag_leader_length, tag_y)` |
| Pill | `(feeder_x + tag_leader_length, tag_y − tag_pill_h/2)` w=`tag_pill_w_std`, h=`tag_pill_h`, rx=`tag_pill_rx` |
| Text | `(feeder_x + tag_leader_length + tag_pill_w_std/2, tag_y + 6)` centered in pill |

**Left-side (mirrored):** Pill at `(feeder_x − tag_total_h_offset, tag_y − tag_pill_h/2)`, text at `(feeder_x − tag_leader_length − tag_pill_w_std/2, tag_y + 6)`.

### Step 4 — Bind the Conduit Callout

**Topology:** Instantiate A-2 Conduit/Wire Callout Tag. Set `bound_to` to the same R-1 Feeder instance from Step 2. Callout text = output of the Conduit Callout Algorithm (Section 4) applied to the R-1's schedule data. Side follows the same side assignment as the A-1 tag in Step 3.

**Rendering:** Given `feeder_x` and `callout_y = tag_y − inter_tag_gap`:

**Right-side leader (default):**

| Element | Position |
|---------|----------|
| D-loop | Center at `(feeder_x, callout_y)`, radius = `callout_r` |
| Leader | `(feeder_x, callout_y)` to `(feeder_x + callout_leader_run, callout_y − callout_leader_rise)` |
| Stub | `(feeder_x + callout_leader_run, callout_y − callout_leader_rise)` to `(feeder_x + callout_leader_run + callout_stub_length, callout_y − callout_leader_rise)` |
| Text | `(feeder_x + callout_leader_run + callout_stub_length + 4, callout_y − callout_leader_rise + 4)` left-aligned |

### Step 5 — Instantiate the Load Equipment

#### Variant A — Panelboard

**Topology:** Instantiate L2-4 Panelboard. R-1 Feeder `end` binds to the selected `feed_` port (see Panelboard Port Selection below). Assign designation per `equipment_designation_legend.json`. Populate data fields: voltage, phase config, bus rating, MLO/main breaker.

**Panelboard Port Selection:**

The panelboard has four bidirectional `feed_` ports. The compositor selects the port based on the feeder's approach direction at the panelboard:

| Feeder approach | Port | When used |
|----------------|------|-----------|
| Vertical from above (default) | `feed_top` | Standard feeder chain — breaker above on bus, panel below. Most common case. |
| Vertical from below | `feed_bottom` | Panel fed from a source lower on the SLD (e.g., continuation feeder arriving from another sheet, sub-panel in a top-down riser configuration) |
| Horizontal from left | `feed_right` | Offset routing where the final segment is horizontal approaching from the left side |
| Horizontal from right | `feed_left` | Offset routing where the final segment is horizontal approaching from the right side |

> **Default rule:** Use `feed_top` unless the feeder path geometry requires a non-vertical entry. The compositor overrides only when offset routing (§5 Step 2) produces a final horizontal segment terminating at the panel, or when the panel's position relative to its source makes a vertical entry cross other feeder chains.

**Rendering by port:**

| Port | Feed port position | Panel box anchor (top-left) |
|------|-------------------|----------------------------|
| `feed_top` | `(feeder_x, feed_port_y)` | `(feeder_x − panel_S/2, feed_port_y)` |
| `feed_bottom` | `(feeder_x, feed_port_y)` | `(feeder_x − panel_S/2, feed_port_y − panel_S)` |
| `feed_left` | `(feed_port_x, feeder_y)` | `(feed_port_x, feeder_y − panel_S/2)` |
| `feed_right` | `(feed_port_x, feeder_y)` | `(feed_port_x − panel_S, feeder_y − panel_S/2)` |

For the default `feed_top` case: `feed_top_y = callout_y − equip_gap − equip_stub = callout_y − 70`. Panel box top-left = `(feeder_x − panel_w/2, feed_top_y)`. Panel box = the drawn family box (**.0: 64×88** — was `panel_S × panel_S` 140×140), centered on feeder_x.

#### Variant B — LV Transformer + Secondary Panelboard

**Topology:** Instantiate L2-2 LV Transformer. Primary R-1 Feeder `end` binds to `primary_in`. Assign designation. Populate calc fields: `kva`, `impedance_pct`, `x_r_ratio` (from `transformer_impedance.json` lookup), `secondary_voltage`.

> **Primary feeder wire count:** the primary R-1 serves the delta side of the transformer — per the §3 config-selection rule it uses the **3-wire** schedule row (`…3` tag, e.g. `2253`), not the 4-wire row. No neutral is pulled; the A-2 callout carries phase conductors + ground only.

Then instantiate a second R-1 Feeder from `secondary_out` to a new L2-4 Panelboard `feed_top`. This secondary R-1 uses the T-suffix tag from `3_phase_transformer_feeder_schedule.json`. The upstream fault current for this R-1's `available_fc_load` calculation comes from the L2-2 transformer's `available_fc_secondary` calc field.

Instantiate A-1 and A-2 tags bound to the secondary R-1 (same process as Steps 3–4).

**Rendering:**

`equip_y` = primary R-1 feeder endpoint = `callout_y − equip_gap − equip_stub` (same derivation as Variant A `feed_top_y`).

| Element | Position |
|---------|----------|
| Transformer `primary_in` | `(feeder_x, equip_y)` — T-box bottom center per L2-2 port `primary_in` at `(xfmr_S/2, xfmr_S)` |
| T-box anchor | `(feeder_x − xfmr_S/2, equip_y − xfmr_S)` |
| `secondary_out` | `(feeder_x − xfmr_S/2, equip_y − xfmr_S)` — T-box top-left; actual port at `(feeder_x, equip_y − xfmr_S)` per L2-2 port `secondary_out` at `(xfmr_S/2, 0)` |

Secondary feeder from `secondary_out` upward with T-suffix tag (e.g., `2254T`) per `3_phase_transformer_feeder_schedule.json`. Secondary panelboard aligned to secondary feeder X.

**Secondary feeder coordinate chain:**

The secondary R-1 starts a new chain from the transformer `secondary_out` port with its own tag and callout zones. Use the same Step 3/Step 4 formulas, substituting `secondary_start_y` for `line_in_y`:

| Variable | Formula | Derivation |
|----------|---------|------------|
| `secondary_start_y` | `equip_y − xfmr_S` | Transformer `secondary_out` port Y |
| `secondary_tag_y` | `secondary_start_y − tag_gap` | `equip_y − xfmr_S − 60` |
| `secondary_callout_y` | `secondary_tag_y − inter_tag_gap` | `equip_y − xfmr_S − 100` |
| `secondary_panel_y` | `secondary_callout_y − equip_gap − equip_stub` | `equip_y − xfmr_S − 170` |

Secondary A-1 tag tick at `(feeder_x, secondary_tag_y)`. Secondary A-2 callout center at `(feeder_x, secondary_callout_y)`. Secondary panelboard `feed_top` at `(feeder_x, secondary_panel_y)`. Tag/callout use the T-suffix content and the transformer secondary callout variant (Section 4).

> **Verification:** Total chain from bus to secondary panelboard = `cb_height(54) + tag_gap(60) + inter_tag_gap(40) + equip_gap(40) + xfmr_S(47) + tag_gap(60) + inter_tag_gap(40) + equip_gap(40) + equip_stub(30) = 411px`. This is the chain height when the secondary feeder exits `secondary_out` vertically and the primary feeder does NOT approach from directly below the earth ground symbol (e.g., primary enters via flex port, or the primary feeder centerline is offset from the L-path). When the primary feeder approaches vertically from below and would overlap the earth ground L-path, add `xfmr_L_vert(33)` between `xfmr_S` and the secondary tag zone for clearance = 444px. See the two transformer chain entries in the Computed Chain Heights table (Dimension Variables section) for the authoritative formulas.

#### Variant C — ATS Source Stub

**Topology:** R-1 Feeder `end` binds to L2-3 ATS port — `source1_in` for the normal power source, `source2_in` for the emergency/alternate power source. The ATS itself is instantiated once and receives feeders from two separate chains. See Section 6 (Multi-Source Composition) for the complete ATS topology.

**Rendering:**

| Connection | Port | Position |
|------------|------|----------|
| Normal source | `source1_in` | `(ats_x+35, ats_y+200)` |
| Emergency source | `source2_in` | `(ats_x+105, ats_y+200)` |

Feeder connects at stub bottom. No U-turn routing — stubs point downward, feeder arrives from below.

#### Variant D — Terminal Load (Fire Pump, Motor, Equipment Connection)

**Topology:** R-1 Feeder `end` binds to `load_in` on the terminal device. Assign designation per `equipment_designation_legend.json`. Terminal devices have no output port — they are load endpoints.

| Device | Symbol | Port | Geometry at Port |
|--------|--------|------|-----------------|
| L3-1 Fire Pump | Compound: starter box (S=47) + motor circle (r=19) | `load_in` at `(23.5, 47)` — bottom center of starter box | Box + circle total height ≈ 66px construction, uniform-scaled into the family box 24×32 (`_E_SLD_Motor V02` — see supersession table; `slotWidth` stays 47) |
| L3-2 Motor | Circle with arm slashes | `load_in` at `(0, 19)` — bottom center of circle | Circle diameter = 38px (family box: 24×32 — see supersession table) |
| L3-3 Equipment Connection | Circle + triangle | `load_in` at `(0, 27)` — bottom center of circle | Total height ≈ 54px |

**Rendering:**

| Element | Position |
|---------|----------|
| `load_in` port | `(feeder_x, callout_y − equip_gap − equip_stub)` — same Y derivation as Variant A |
| Device anchor | Centered on `feeder_x` using device-specific offset (e.g., fire pump: `feeder_x − 23.5`; motor: `feeder_x`; equipment connection: `feeder_x`) |

> `load_y = callout_y − equip_gap(40) − equip_stub(30) = callout_y − 70` — identical formula to Variant A. The terminal device is smaller than a panelboard but occupies the same Y position. The feeder chain height is governed by the tag zones, not the device geometry.

#### Variant E — SPD (Mode A, Dedicated CB Feed)

**Topology:** R-1 Feeder `end` binds to L2-6 SPD `line_in`. The SPD is a terminal device — no output port. Assign no designation (SPD has no external text fields — "SPD" label is inside the box). The SPD type and kA rating are specified in the equipment schedule, not on the SLD.

> **Port name note:** L2-6 SPD `line_in` is a **load-side input** port (power enters the SPD). This is the same port name as L2-1 breaker `line_in`, which is a **source-side output** port. The port name alone does not determine directionality — the device type does. See CV-8 (§7) for the device-aware port classification.

| Device | Port | Position | Geometry |
|--------|------|----------|----------|
| L2-6 SPD | `line_in` | `(w/2, h)` — bottom center of box | Box: family 36×15 (was 62×26), rectangular (~2.4:1 aspect) |

**Rendering:**

| Element | Position |
|---------|----------|
| `line_in` port | `(feeder_x, callout_y − equip_gap − equip_stub)` — same Y derivation as Variants A and D |
| SPD box anchor | `(feeder_x − w/2, line_in_y − h)` — box top-left, centered on feeder_x (w=36, h=15; was 62/26) |

> `spd_y = callout_y − equip_gap(40) − equip_stub(30) = callout_y − 70`. SPD box is compact (36×15) — significantly smaller than a panelboard, positioned at the same Y.

#### Variant F — Inline Disconnect

**Topology:** The disconnect switch (L2-5) is an inline device — it sits between two R-1 Feeder instances, splitting the feeder chain into an upstream segment and a downstream stub.

| R-1 Instance | `start` binds to | `end` binds to | Tags |
|-------------|------------------|----------------|------|
| Upstream R-1 | L2-1 breaker `line_in` | L2-5 Disconnect `line_in` | A-1 + A-2 (full tag + callout per Steps 3–4) |
| Downstream R-1 (stub) | L2-5 Disconnect `load_out` | Downstream device (`load_in`, `feed_top`, etc.) | `stub_exempt` — see Inline Device Tag Convention |

Assign designation to the L2-5 per `equipment_designation_legend.json`. Populate data fields: ampere rating, fuse type (if fused), poles.

**Rendering:**

| Element | Position |
|---------|----------|
| Disconnect `line_in` | `(feeder_x, callout_y − equip_gap − equip_stub)` — same Y as Variant A/D `feed_top_y` |
| Disconnect box anchor | `(feeder_x − disc_S/2, line_in_y − disc_S)` — box is S=47 (⅓ panelboard, same proportion as transformer) |
| Disconnect `load_out` | `(feeder_x, line_in_y − disc_S)` — top center of box |

The downstream R-1 stub exits `load_out` upward to the downstream device. The downstream device follows the variant appropriate for its type: L3-1 Fire Pump (Variant D), L2-4 Panelboard (Variant A), L3-2 Motor (Variant D), etc.

**Downstream stub coordinate chain:**

| Variable | Formula | Derivation |
|----------|---------|------------|
| `stub_start_y` | `line_in_y − disc_S` | Disconnect `load_out` port Y (S=47) |
| `downstream_device_y` | `stub_start_y − equip_stub` | Downstream device entry port — short stub clearance only (no tag zone) |

> The downstream stub R-1 is short — typically only `equip_stub` (30px) of clearance between the disconnect `load_out` and the downstream device's entry port. No tag or callout zone on the stub.

**Common configurations:**

| Configuration | Upstream R-1 `end` → | Downstream R-1 `end` → | Use Case |
|---------------|---------------------|------------------------|----------|
| Fire pump disconnect | L2-5 `line_in` | L3-1 Fire Pump `load_in` | NEC 695.4(B) — disconnect ahead of fire pump controller |
| Mechanical disconnect | L2-5 `line_in` | L3-2 Motor `load_in` | NEC 430 — motor disconnect |
| Service entrance disconnect | L2-5 `line_in` | L2-4 Panelboard `feed_top` | Service entrance with fused disconnect ahead of panel |

### Inline Device Tag Convention

When an inline device (L2-5 Disconnect, L2-8 Branch Meter) splits a feeder chain into two R-1 instances, the two segments are tagged differently to avoid double-annotating a single visual feeder run.

**Rule:**

| R-1 Segment | A-1 Feeder Tag | A-2 Conduit Callout | Rationale |
|-------------|----------------|---------------------|-----------|
| Upstream R-1 (breaker → inline device) | Yes — full tag per Steps 3–4 | Yes — full callout per Steps 3–4 | This is the primary feeder run — carries the conductor spec for the full circuit |
| Downstream R-1 stub (inline device → load) | No — `stub_exempt` | No — `stub_exempt` | Same conductor spec as upstream R-1. The disconnect doesn't change conductor sizing. Double-tagging would create visual clutter. |

**`stub_exempt` flag:** The downstream R-1 instance carries a `stub_exempt: true` property. TV-1 and TV-2 skip validation for R-1 instances with this flag. See §7 TV-1/TV-2 exemption note.

**Exception — conductor spec changes across inline device:** If the downstream conductor spec differs from the upstream (e.g., a fused disconnect with reduced downstream conductors — uncommon), the downstream R-1 is NOT stub-exempt and must carry its own A-1 and A-2 tags with the downstream conductor data. The compositor sets `stub_exempt: false` in this case.

### Branch/Feeder Meter Attachment (L2-8)

L2-8 Branch/Feeder Meter uses `measurement` connection mode — it clamps onto an existing R-1 Feeder via a CT, same pattern as L1-4 Utility Meter on the R-2 bus. It does **not** split the feeder into two R-1 instances. The R-1 passes through continuously; the meter is an attached measurement device.

**Topology:** L2-8 `ct_bi` binds to the R-1 Feeder instance via `measurement` connection mode. No new R-1 is created. The meter is not part of the directed power flow graph — it observes the feeder, it does not interrupt it.

**Rendering:** The CT clamp symbol is positioned at a Y coordinate on the R-1 feeder's vertical segment. Preferred placement: in the last gap before the load equipment, where it has visual clearance from annotations above and the load device below. The meter box hangs to one side of the feeder (same side selection as A-1/A-2 tags — follow the tag side assignment for that feeder chain).

| Element | Position |
|---------|----------|
| CT clamp center | `(feeder_x, ct_y)` — see below |
| Meter box | Offset horizontally from CT clamp, same side as tags |

`ct_y` depends on the feeder chain's annotation state:
- Un-annotated chain: `ct_y = callout_y − equip_gap / 2` — midpoint of the gap between A-2 callout and load equipment.
- Annotated chain (A-4/A-5 present): `ct_y = fc_vd_apex_y − fc_vd_to_equip_gap / 2` — midpoint of the gap between A-4/A-5 pennants and load equipment.

The meter sits in the last gap before the load equipment — between the A-2 callout and equipment in un-annotated chains, or between the A-4/A-5 pennants and equipment in annotated chains. This prevents the CT clamp from overlapping the FC/VD pennant zone in annotated chains.

**Validation:** L2-8 does not affect feeder chain validation. It has no source/load ports — only `ct_bi` in `measurement` mode. CV-8 does not apply (no R-1 `start` or `end` bound to the meter). TV-1/TV-2 do not apply (the meter has no R-1 of its own). The meter is validated only by its `ct_bi` binding to a valid R-1 instance.

> **Measurement mode devices:** Both L1-4 (Utility Meter on bus) and L2-8 (Branch Meter on feeder) use `measurement` connection mode. They attach to routed elements (R-2 or R-1) without interrupting them. They do not participate in the directed power flow graph and are excluded from TI-1 reachability analysis. They have no source-side or load-side ports in the CV-8 classification table.

### Spur Attachment Composition

SPD Mode B (spur attachment) is a lateral connection pattern that does NOT use a feeder chain. There is no breaker, no R-1 Feeder, no A-1 tag, and no A-2 callout. The SPD snaps directly onto a panelboard corner as an accessory device.

**Topology:** L2-6 SPD `spur_[position]` binds directly to L2-4 Panelboard boundary edge. No R-1 instance is created. The SPD is not part of the directed power flow graph — it is a lateral protection device attached to the panelboard it protects.

**Spur targets:** Panelboard (L2-4) only. SPD does not spur-attach to transformers, disconnects, ATS, or switchboard sections.

**Corner selection algorithm:**

1. Identify the panelboard's primary `feed_` port (the port where the R-1 feeder is bound — typically `feed_top`).
2. Identify the panelboard's text field side (text is centered inside the box — no conflict for L2-4, but if text were external, avoid that side).
3. Select the panelboard corner **diagonally opposite** the primary feed port. For `feed_top` (top center), the preferred corners are bottom-left or bottom-right.
4. **Default:** Bottom-right corner. Override to bottom-left if the bottom-right is obstructed by an adjacent feeder chain or equipment.
5. If the primary feed port is `feed_bottom`, prefer top-left or top-right corners. If `feed_left`, prefer top-right or bottom-right. If `feed_right`, prefer top-left or bottom-left.

**Port-to-corner mapping:**

| Panelboard corner | SPD port used | SPD box position |
|-------------------|---------------|------------------|
| Top-left | `spur_bottom` or `spur_right` | SPD box outside panel, touching at corner. `spur_bottom` → SPD sits above panel top-left; `spur_right` → SPD sits left of panel top-left. |
| Top-right | `spur_bottom` or `spur_left` | SPD above panel top-right, or right of panel top-right. |
| Bottom-left | `spur_top` or `spur_right` | SPD below panel bottom-left, or left of panel bottom-left. |
| Bottom-right (default) | `spur_top` or `spur_left` | SPD below panel bottom-right (`spur_top` aligned to panel bottom edge), or right of panel bottom-right (`spur_left` aligned to panel right edge). |

> **Preferred attachment:** `spur_top` at bottom-right corner — SPD box sits directly below the panelboard's bottom-right corner, with `spur_top` touching the panelboard's bottom edge. This keeps the SPD out of the feeder chain zone (which is above the panel).

**Rendering:** Position the SPD box adjacent to the panelboard box at the selected corner. The SPD `spur_` port aligns flush with the panelboard box edge at the corner. No routing line is drawn between them — physical adjacency implies the spur connection. The SPD box sits **outside** the panelboard bounding box, touching at the shared edge point.

**Validation:** Mode B SPDs are exempt from feeder chain validation rules (TV-1, TV-2, CV-2, CV-3) because they have no feeder, no tags, and no upstream breaker. They are validated by the dedicated Spur Validation rules (SV-1 through SV-3) in §7.

### Flex Port Routing

L2-2 LV Transformer and L2-5 Disconnect Switch each have two `flex_` ports (`flex_left`, `flex_right`) that allow horizontal feeder entry/exit as an alternative to the default vertical ports. Flex ports are reversible — their electrical role (primary/secondary for L2-2, line/load for L2-5) is assigned at composition time based on the feeder direction.

**When to use flex ports:**

| Trigger | Action |
|---------|--------|
| Feeder approach is horizontal (from left or right) | Use `flex_left` or `flex_right` instead of default vertical port |
| Vertical entry would cross adjacent feeder chains | Reroute to horizontal entry via flex port |
| Device is positioned beside (not above/below) its source | Horizontal connection is the natural path |
| EOR layout preference | Override default port selection |

**Direction assignment:**

| Device | Port | Assigned as | When |
|--------|------|-------------|------|
| L2-2 Transformer | `flex_left` | Primary input | Feeder arrives from the left carrying primary voltage |
| L2-2 Transformer | `flex_left` | Secondary output | Secondary feeder departs to the left |
| L2-2 Transformer | `flex_right` | Primary input | Feeder arrives from the right carrying primary voltage |
| L2-2 Transformer | `flex_right` | Secondary output | Secondary feeder departs to the right |
| L2-5 Disconnect | `flex_left` | Line input | Feeder arrives from the left (source side) |
| L2-5 Disconnect | `flex_left` | Load output | Feeder departs to the left (load side) |
| L2-5 Disconnect | `flex_right` | Line input or Load output | Same logic, opposite direction |

> **Key rule:** A single device instance uses at most one flex port per feeder. The other feeder (if any) uses a default vertical port or the opposite flex port. Both flex ports can be used simultaneously for a fully horizontal pass-through, but this is uncommon on SLDs.

**Coordinate impact for L2-2 Transformer with flex primary:**

When the primary feeder enters via `flex_left` (at `(0, 8)`) instead of `primary_in` (at `(23.5, 47)`):

| Element | Default (`primary_in`) | Flex (`flex_left`) |
|---------|----------------------|-------------------|
| Primary feeder R-1 `end` | `(feeder_x, equip_y)` at bottom center | `(xfmr_anchor_x, xfmr_anchor_y + 8)` at left wall |
| Primary feeder approach | Vertical from above | Horizontal from left, with vertical-to-horizontal jog |
| Tags and callout | On vertical segment above transformer | On vertical segment before the jog (per tag segment rule) |
| Secondary feeder | Exits `secondary_out` at top center — unchanged | Unchanged — flex port only affects the primary side |

The secondary feeder coordinate chain (§5 Variant B) remains the same regardless of which primary port is used — it always starts from `secondary_out` at the top center of the T-box.

**Coordinate impact for L2-5 Disconnect with flex port:**

Same pattern — the flex port shifts the feeder endpoint to the side wall at Y=8. Tags remain on the vertical segment before any horizontal jog. The opposite port (vertical) is unaffected.

### Continuation Squiggle Composition

A-3 Continuation Squiggle marks the point where a feeder leaves the current SLD sheet. It is a termination annotation — not a device in the power flow graph.

**When to use:** Any R-1 Feeder whose source or destination equipment is on a different SLD sheet. The squiggle replaces the off-sheet device's port binding at the sheet boundary.

**Topology:** Instantiate A-3 Continuation Squiggle. Set `bound_to` to the R-1 Feeder instance being terminated. The A-3's `termination` port binds to the R-1's endpoint at the sheet edge:

| Scenario | R-1 endpoint at sheet edge | A-3 text content |
|----------|---------------------------|------------------|
| Feeder leaves toward load (downstream) | R-1 `end` binds to A-3 `termination` | `TO [destination equipment designation]` |
| Feeder arrives from source (upstream) | R-1 `start` binds to A-3 `termination` | `FROM [source equipment designation]` |

The equipment designation in the text must be a valid designation from the overall composition (it references equipment on the other sheet). This enables cross-sheet traceability.

**Rendering:** The squiggle is positioned at the sheet boundary, oriented horizontally. Geometry per `sld_system_model.md` A-3 symbol definition.

| Element | Position |
|---------|----------|
| Squiggle center | At the feeder endpoint Y, offset horizontally to the sheet edge |
| Squiggle text | Side selected per callsite (`renderSquiggle` sides `above`/`below`/`left`/`right` — see `sld_layout_engine_V1_0_0.md` §3): source-side cross-sheet stubs default centered-above, ATS source-1 entry stubs side-left, continuation entries above; per-squiggle override via `A3_TEXT_PLACEMENT` / `layout_config.a3_text_placement`. Font per `sld_system_model_V1_0_0.md` A-3 data fields. |

**Squiggle at incoming section (§2 Section 1):** R-1 `start` is off-sheet (L0-1 Utility Transformer), R-1 `end` is on-sheet (main bus `bus_tap_bi`). The A-3 binds to the R-1 `start` side. Text: `TO UTILITY TRANSFORMER`. Squiggle positioned below the incoming section boundary.

**Squiggle at ATS cross-sheet (§6 Pattern 3):** If the ATS and emergency switchboard are on different sheets, the R-1 from ATS `load_out` terminates at A-3 on the ATS sheet. Text: `TO [emergency switchboard designation]`. On the emergency switchboard sheet, a separate R-1 `start` terminates at A-3. Text: `FROM ATS [designation]`.

> **Cross-sheet pairing:** Each A-3 squiggle on one sheet implies a matching A-3 squiggle on the other sheet, with complementary text (TO/FROM). Cross-sheet feeders are two R-1 instances linked by `cross_sheet_refs[]` — see §8A Multi-Sheet Composition for the full pairing mechanism, validation rules (CV-13, TV-8, DV-15), and the two-phase validation model.

**Validation:** CV-4 accepts A-3 as a valid R-1 `end` termination. CV-11 (below) validates squiggle binding and text content.

### Busway Composition (placeholder)

R-3 Busway is a Class B routed element fully defined in `sld_system_model.md` — parallel lines with parametric tap points for plug-in or feeder-type distribution. Busway composition is structurally different from feeder chain composition: a single R-3 instance spans a horizontal or vertical run with multiple tap-off points, each feeding a downstream branch via a bus plug (L2-9) and R-1 feeder.

**High-level topology pattern:**

```
Source breaker L2-1 → R-1 Feeder → L2-5 Disconnect `line_in`
                                        `load_out` → R-3 Busway `feed_start`
                                                        `tap_01` → L2-9 Bus Plug → R-1 → L2-4 Panelboard
                                                        `tap_02` → L2-9 Bus Plug → R-1 → L2-4 Panelboard
                                                        `tap_N`  → L2-9 Bus Plug → R-1 → L2-4 Panelboard
                                                     `feed_end` (terminated or extended)
```

**Deferred items (see §8 Known Gaps):**

| Item | Dependency | Status |
|------|-----------|--------|
| Tap spacing algorithm (parametric tap placement along busway run) | `sld_system_model.md` R-3 tap port definitions | R-3 symbol complete, composition rules pending |
| L2-9 Bus Plug topology (tap-off device connection) | `sld_system_model.md` L2-9 (placeholder) | L2-9 geometry and ports TBD |
| Busway feeder sizing contract | `c_values_lookup.json` busway section | C-values available, lookup contract not defined |
| Busway callout format | §4 (no busway callout variant) | Format TBD — busway callouts differ from cable feeders |
| Busway fault current integration | `fault_current_calc.json` | P2P method supports busway C-values, but no composition rule for propagating FC through taps |

> **Current state:** R-3 Busway can be instantiated as a topology object and connected at `feed_start` and `feed_end`, but the tap-off composition (L2-9 → R-1 → downstream device per tap) cannot be fully composed until L2-9 Bus Plug is defined in the system model.

### Annotation Composition — A-4 (Fault Current Tag) and A-5 (Voltage Drop Tag)

A-4 and A-5 are placed as a matched pair at the same Y-position on the feeder, with A-4 leaning left (−30°) and A-5 leaning right (+30°). The compositor evaluates placement eligibility independently for each annotation type, but when both are eligible on the same R-1, they share the same apex position.

#### A-4 Placement Eligibility

A-4 is placed at every device and bus location where `available_fc` is populated in `calc_fields`:

| Target Type | Node Types | Bound Field |
|-------------|-----------|-------------|
| Circuit breakers (distribution) | L2-1 | `calc_fields.available_fc` |
| GFP circuit breakers | L1-1 | `calc_fields.available_fc` |
| Panelboards | L2-4 | `calc_fields.available_fc` |
| ATS | L2-3 | `calc_fields.available_fc` |
| Switchboard main bus | R-2 (`bus_level: "main"`) | `calc_fields.available_fc` |
| Disconnect switches | L2-5 | `calc_fields.available_fc` |
| Terminal loads | L3-1, L3-2, L3-3 | `calc_fields.available_fc` |

> **Empty calc fields exemption:** If `available_fc` is null, absent, or `calc_fields` is empty on a device, no A-4 is placed. TV-5 does not flag this as an error.

**Decision authority:** Tier 2 — compositor places A-4 at all eligible locations by default. EOR may suppress per device via `suppress_fc_tag: true`.

#### A-5 Placement Eligibility

A-5 is placed on every non-stub-exempt R-1 Feeder where `voltage_drop_pct` is populated in `calc_fields`.

> **Display threshold (Tier 2):** `vd_display_threshold` (default: `0.0%`). A-5 is placed only where cumulative VD ≥ threshold. EOR may set a project-specific threshold (e.g., `2.0%`).

> **Generator feeder exemption:** R-1 instances whose `start` is bound to an L1-5 Generator port are exempt from A-5 placement and DV-14.

#### A-4/A-5 Binding and Value Source

**A-4 binding:** `bound_to_type = "device"` or `"routed_element"` (for R-2 bus). Reads `available_fc` (kA) from the bound target's `calc_fields`. Schema stores `{ "value_kA": 42.5 }`. Renderer converts: `value_kA × 1000` → whole amps, comma-separated, with `A` suffix (e.g., `42,500A`).

**A-5 binding:** `bound_to_type = "routed_element"` (R-1). Reads cumulative VD via graph traversal. Schema stores `{ "value_pct": 2.14, "cumulative": true, "segment_vd_pct": 1.8 }`. Displayed as `X.XX%`.

#### Cumulative Voltage Drop Computation

A-5 displays cumulative VD from the voltage source to the load end of the bound R-1. The cumulative value is computed by traversing the directed power graph upstream:

1. Start at the bound R-1. Set `cumulative_vd = R-1.calc_fields.voltage_drop_pct`.
2. Follow R-1 `start.device_id` upstream.
3. **If upstream is L0-1 or L1-5:** path terminates. `cumulative_vd` is the final value.
4. **If upstream is L2-2 Transformer:** VD resets at the transformer secondary. `cumulative_vd` = this R-1's `voltage_drop_pct` only. Primary-side VD is at a different voltage level and is not summed.
5. **If upstream is L2-1 Breaker:** find the R-2 Bus, follow upstream to the switchboard source. Add upstream R-1 `voltage_drop_pct` values, recurse.
6. **If upstream is L2-3 ATS:** traverse the normal source path (`source1_in`) by default. EOR may override with `vd_ats_path: "worst_case"` for the path with higher cumulative VD.
7. **If upstream is L2-4 Panelboard (Variant G sub-feed):** find the upstream R-1 feeding this panel, add its VD, recurse.

> **R-2 Bus VD:** Bus VD is typically negligible (< 0.01%). If R-2 gains a `voltage_drop_pct` calc field in a future system model update, include it. Until then, bus VD = 0 for accumulation.

#### A-4/A-5 Y-Position

Both pennant apexes are placed at the same Y on the feeder centerline, in a dedicated zone below A-2:

```
fc_vd_apex_y = callout_y − fc_vd_tag_gap
```

Updated zone stack with FC/VD:

```
  ══════════● BUS BAR
            │
        ┌───┤ BREAKER (cb_height = 54px)
      arc   │
        └───│
            ● Filled bus node
            │
       ╱    │
      ╱ ────┤ A-1 FEEDER TAG (tag_gap = 60px below breaker)
            │
      D─────┤ A-2 CONDUIT CALLOUT (inter_tag_gap = 40px below tag)
            │
    ◄───────● A-4 / A-5 PENNANTS (fc_vd_tag_gap = 40px below callout)
            │   A-4 leans LEFT (red, −30°)
            │   A-5 leans RIGHT (blue, +30°)
            │
        ┌───┴───┐
        │ LOAD  │ EQUIPMENT (fc_vd_to_equip_gap + equip_stub = 70px)
        └───────┘
```

When only A-4 or only A-5 is placed, the zone height does not change — `fc_vd_tag_gap` and `fc_vd_to_equip_gap` apply regardless.

#### A-4/A-5 Side Assignment

Sides are fixed by symbol geometry — A-4 always left (−30°), A-5 always right (+30°). They do not participate in the Tag Side Selection Algorithm.

**Adjacent feeder collision check:** At minimum pitch (130px), the A-4 pennant extends ~98px horizontally. Clearance = `130 − 98 = 32px` (sufficient). Below 110px pitch, reduce `body_w` to `max(64, (feeder_pitch − 20) / cos(30°))`. Tier 1 (autonomous).

### Step 6 — Bind Fault Current and Voltage Drop Annotations

Runs once per feeder chain, after Step 5 (Instantiate Load Equipment).

**6a. A-4 on the downstream device:**

1. Check the downstream device against the A-4 placement set.
2. If eligible, `available_fc` populated, and `suppress_fc_tag ≠ true`:
   a. Instantiate A-4. Set `bound_to` = device `id`, `bound_to_type = "device"`.
   b. Populate `content.value_kA` = device `calc_fields.available_fc`.
   c. Apex position: `(feeder_x, fc_vd_apex_y)` where `fc_vd_apex_y = callout_y − fc_vd_tag_gap`.
   d. Add to R-1's `annotation_ids`.

**6b. A-5 on the R-1 Feeder:**

1. Check R-1 against A-5 placement set.
2. If eligible, `voltage_drop_pct` populated, `suppress_vd_tag ≠ true`, and cumulative VD ≥ `vd_display_threshold`:
   a. Compute cumulative VD by graph traversal.
   b. Instantiate A-5. Set `bound_to` = R-1 `id`, `bound_to_type = "routed_element"`.
   c. Populate `content.value_pct` = cumulative VD, `content.segment_vd_pct` = R-1 `voltage_drop_pct`, `content.cumulative = true`.
   d. Apex position: same `(feeder_x, fc_vd_apex_y)` as A-4.
   e. Add to R-1's `annotation_ids`.

**6c. A-4 on the switchboard main bus** (once per switchboard):

If the main bus R-2 has `available_fc` populated and `suppress_fc_tag ≠ true`: instantiate A-4 bound to R-2 `id`. Apex on the main bus at the leftmost section boundary X, at `main_bus_y`. This is a standalone annotation, not part of any feeder chain.

> **Variant B chains:** Evaluate A-4/A-5 independently for each R-1. Primary R-1 gets cumulative VD at primary voltage. Secondary R-1 gets VD reset at transformer per the computation rule.

### Step 7 — Place Keynote Annotations (A-6)

Runs once per sheet, after all feeder chains and switchboard compositions are complete.

A-6 Hex Note is EOR-initiated. The compositor does not autonomously generate A-6 instances. EOR provides the target and keynote text; the compositor assigns the keynote number and computes placement geometry.

**Keynote number assignment:** Sequential positive integers per sheet, ordered by target Y-coordinate (top of drawing = lowest number) then X-coordinate. Numbers restart at 1 on each sheet.

**Mode selection:**

| Mode | Condition |
|------|-----------|
| **Leader mode** | Target is a routed element (R-1/R-2/R-3), OR target is a device but hex bounding circle (r = `hex_r + a6_clearance` = 42px) at any device edge overlaps another symbol |
| **Direct mode** | Target is a Class A device AND hex fits flush against a device edge without collision |

**Direct mode edge priority:** `bottom-right`, `bottom-left`, `top-right`, `top-left`. First collision-free edge wins.

**Leader angle selection (leader mode):**

1. Candidate priority: `[+45°, −45°, +30°, −30°, +60°, −60°, +15°, −15°, +75°, −75°, 0°, +90°, −90°]`
2. For each angle: compute bend point at `a6_leader_min_length` from target, then hex center via horizontal stub. Check hex bounding circle for collisions.
3. First angle with no collision wins.
4. If all angles collide: extend leader by +20px, retry. Max 5 extensions (140px max leader).

**Decision authority:**

| Decision | Tier |
|----------|------|
| Whether to place an A-6 | 3 (EOR provides) |
| Keynote text | 3 (EOR provides) |
| Keynote number | 1 (compositor auto-assigns per sheet) |
| Mode, angle, position | 1 (compositor computes) |

**Composition-derived configuration variables:**

| Variable | Default | Tier | Description |
|----------|---------|------|-------------|
| `vd_display_threshold` | 0.0 | 2 | Minimum cumulative VD % for A-5 placement |
| `vd_ats_path` | `"normal"` | 2 | ATS source path for VD accumulation: `"normal"` or `"worst_case"` |

### Tag Side Selection Algorithm

1. **Default:** All tags on the right side.
2. **Check clearance:** If right-side pill overlaps adjacent feeder line (`feeder_x_N + tag_total_h_offset > feeder_x_N+1 − 20`), move to left side.
3. **Alternating:** If feeders < `feeder_alt_threshold` (120px) apart, alternate odd=right, even=left.
4. **Stagger Y:** If adjacent same-side tags overlap vertically, offset by +30px.
5. **Dense fallback:** If both left and right sides collide after alternating + Y-stagger (e.g., 6+ breakers at minimum pitch with tags on both sides exhausted), increase `tag_gap` by +30px increments on conflicting feeders until clearance is achieved. This extends the feeder chain height but preserves readability. Flag to the layout engine that the chain exceeds minimum height.

### Feeder Chain Anti-Patterns

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Breaking feeder at tag points | One continuous R-1 Feeder instance from breaker `line_in` to load port. Tags bind to the R-1 via `bound_to`, they don't interrupt it. |
| 2 | Feeder tag below conduit callout | Tag first (near breaker), callout second (toward load). |
| 3 | Tags overlapping breaker text | Minimum `tag_gap` (60px) between `line_in` and first tag. |
| 4 | Tags overlapping each other | Minimum `inter_tag_gap` (40px) between tag tick Y and callout center Y. |
| 5 | Tags on opposite sides without reason | Both on same side unless collision forces alternation. |
| 6 | Diagonal feeder routing | Orthogonal only. L-path or Z-path for offsets. |
| 7 | Wrong conductor count in callout | Use conductor_qty from schedule lookup (typically 4 for 4-wire). |
| 8 | `T` suffix on primary feeder | `T` suffix only on transformer secondary feeders per `3_phase_transformer_feeder_schedule.json`. |
| 9 | Panelboard off-center from feeder | Panel box X = feeder_x − panel_S/2. `feed_top` X = feeder_x. |
| 10 | Tags on horizontal jog or second vertical segment | Tags always on the first vertical segment (breaker side). |
| 11 | R-1 Feeder with no A-1 tag bound | Every R-1 instance must have exactly one A-1 Feeder Tag with `bound_to` set. |
| 12 | R-1 Feeder with no A-2 callout bound | Every R-1 instance must have exactly one A-2 Conduit Callout with `bound_to` set. |
| 13 | Breaker `bus_out` not connected to any R-2 | Every L2-1 breaker's `bus_out` must bind to a `bus_tap_bi` on an R-2 Bus instance. |
| 14 | Implicit feeder line (no R-1 instance) | Every conductor run between two devices is an explicit R-1 Feeder with its own identity and calc fields. No implicit lines. |

#### Variant G — Sub-Fed Panelboard

A panelboard feeding a downstream panelboard through a feeder. The circuit breaker protecting this feeder physically exists inside the upstream panel but is NOT drawn as a separate L2-1 on the SLD — it is documented on the upstream panel's panel schedule. The SLD shows only the feeder between the two panelboard boxes.

**Topology:** L2-4 (upstream) `feed_[exit_port]` → R-1 Feeder → [A-1, A-2] → L2-4 (downstream) `feed_[entry_port]`

No L2-1 Circuit Breaker instance is created for the sub-feed breaker. The R-1 Feeder `start` binds directly to the upstream panelboard's exit port. The R-1 Feeder `end` binds to the downstream panelboard's entry port.

**Port rules:**

| Rule | Constraint |
|------|-----------|
| Preferred (not required): sub-feed exit port distinct from the feed-in port | Composition **default** for drawing clarity — **not** a hard rule. As-built, a single `feed_` port legally carries both the panel's own feed-in and one or more sub-feed exits: the engine renders port-anchored combs on a shared geometric anchor (11 golden panels do this). The binding requirement is only that each exit anchor be a **drawable** `feed_` port — see §7 CV-12. |
| Exit port example | Panel fed on `feed_top` → the compositor prefers to exit the sub-feed from `feed_bottom`/`feed_left`/`feed_right` for clarity, but re-using `feed_top` is legal (see row above). |
| Default exit port | `feed_bottom` (sub-feed exits downward from the upstream panel, toward downstream equipment drawn above per §1 vertical ordering). |
| Default entry port on downstream panel | `feed_top` (standard feeder entry from above). |
| Multiple sub-feeds from one panel | The default composition spreads sub-feeds across distinct exit ports for clarity, but multiple sub-feeds (and the feed-in) may legally share one `feed_` anchor — the engine fans a port-anchored comb (e.g. golden 4M-1-A exits both r-004 and r-005 from `feed_top`). No fixed maximum; every exit anchor must be one of the four drawable `feed_` ports (§7 CV-12). |

**Feeder sizing:**

The implicit breaker protecting this circuit is sized to match the downstream panel's `bus_rating`. Use this value as `nominal_ampacity` for the standard §3 LV Feeder lookup contract.

| Sizing Input | Value | Source |
|-------------|-------|--------|
| `nominal_ampacity` | Downstream panel `bus_rating` | L2-4 calc field on the downstream panel instance |
| System config | Match downstream panel voltage / wire count | Downstream panel calc fields `voltage`, `phases` |

**Feeder tag content:** Standard tag from `feeder_schedule.json` → `tag` for the `nominal_ampacity`. No T-suffix (not a transformer secondary).

**Conduit callout text:** Standard §4 algorithm output for the `nominal_ampacity`.

**Composition steps:**

| Step | Action | Notes |
|------|--------|-------|
| 1 | Identify exit port on upstream panel | Default `feed_bottom` (a distinct exit is preferred for drawing clarity; re-using the feed-in port is legal — §7 CV-12). |
| 2 | Instantiate R-1 Feeder. `start` binds to upstream panel exit port. `end` binds to downstream panel entry port (default `feed_top`). Populate R-1 calc fields using downstream panel `bus_rating` as `nominal_ampacity` for §3 lookup. | Same R-1 field population as Step 2 in the standard chain. |
| 3 | Bind A-1 Feeder Tag to R-1 per standard Step 3. Tag content from schedule lookup. | Standard tag algorithm. |
| 4 | Bind A-2 Conduit Callout to R-1 per standard Step 4. Callout from §4 algorithm. | Standard callout algorithm. |

**Rendering:**

The feeder path runs from the upstream panel's exit port to the downstream panel's entry port. Zone heights use the same variables as Variants A–D. The primary difference is that the tag/callout zone starts from the upstream panel's exit port (not from a breaker's `line_in`).

For the default `feed_bottom` → `feed_top` configuration (upstream panel above, downstream panel below on the SLD):

| Element | X | Y |
|---------|---|---|
| R-1 `start` (upstream panel `feed_bottom`) | upstream `feed_bottom` X | upstream `feed_bottom` Y |
| A-1 tag tick | `feeder_x` | `start_y + tag_gap` |
| A-2 callout center | `feeder_x` | `tag_y + inter_tag_gap` |
| R-1 `end` (downstream panel `feed_top`) | downstream `feed_top` X | `callout_y + equip_gap + equip_stub` |

> **Y-direction note:** In the standard chain (Variants A–F), feeders run upward from the bus (decreasing Y). In Variant G with `feed_bottom` → `feed_top`, the sub-feed feeder runs downward from the upstream panel (increasing Y). The tag and callout zones are between the two panels. The zone heights (`tag_gap`, `inter_tag_gap`, `equip_gap`, `equip_stub`) are identical — only the Y-direction sign changes. Formulas use addition instead of subtraction from `start_y`.

**Validation notes:**

- **TI-1 (reachability):** The downstream panel is reachable from the source through the upstream panel and the sub-feed R-1. No special handling needed.
- **CV-2:** Does not apply — CV-2 checks that every L2-1 breaker has a feeder. Variant G has no L2-1, so CV-2 is not triggered.
- **CV-3:** Satisfied — R-1 `start` connects to the upstream panel's `feed_` port (a Class A device port).
- **CV-8:** See §7 update — `feed_` ports are conditionally source-side in Variant G context.
- **CV-12:** Ensures each sub-feed exit anchors to a **drawable** panel `feed_` port (`feed_top`/`feed_bottom`/`feed_left`/`feed_right`). Shared feed-in/exit ports are legal (comb-anchor semantics) — see §7.
- **DV-3, DV-11:** Exempt — no explicit breaker exists. The implicit breaker is validated on the panel schedule, not the SLD topology.
- **TV-1, TV-2:** Apply normally — the sub-feed R-1 requires A-1 and A-2 tags like any other R-1 instance.

### Sub-Fed Panelboard Anti-Patterns

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Drawing an L2-1 breaker on the sub-feed chain | Variant G has no explicit breaker. The breaker exists inside the upstream panel (on the panel schedule). |
| 2 | Anchoring a sub-feed exit to a `feed_` port the panel symbol does not expose (e.g. `feed_center`) | Use one of the four drawable comb anchors `feed_top`/`feed_bottom`/`feed_left`/`feed_right`. (Re-using the feed-in port is *not* a mistake — the engine renders a shared anchor; see §7 CV-12. A distinct exit is only a clarity preference.) |
| 3 | Sizing the sub-feed feeder to the upstream panel's bus rating | Size to the DOWNSTREAM panel's `bus_rating`. The downstream panel determines the circuit capacity. |
| 4 | Using T-suffix tags on sub-feed feeders | T-suffix is for transformer secondary feeders only. Sub-feeds use standard feeder schedule tags. |
| 5 | Omitting A-1/A-2 tags on the sub-feed R-1 | Sub-feed R-1 instances are NOT stub-exempt. They require full A-1 and A-2 annotation. |

---

## 6. Multi-Source Composition (ATS / Generator)

Dual-source systems — where normal and emergency power paths converge at an Automatic Transfer Switch — are the most topologically complex compositions on an SLD. This section defines the connection sequences, port bindings, and feeder sizing rules for ATS-centered topologies.

### Topology Overview

A complete dual-source system instantiates three topology chains meeting at a single L2-3 ATS:

```
NORMAL PATH:                      EMERGENCY PATH:
                                  
  Normal MDP (§2)                   Generator (L1-5)
  Secondary bus R-2                     │
       │                            R-1 Feeder (gen feeder)
  L2-1 Breaker                         │
       │                          ┌────┴────┐
  R-1 Feeder (normal)             │  L2-3   │
       │                          │   ATS   │──── R-1 Feeder (load) ──── Emergency
  source1_in                      └────┬────┘                            Switchboard (§2)
                                  source2_in
```

### Pattern 1 — Normal Source to ATS

**Topology sequence:** Normal MDP secondary bus R-2 `bus_tap_bi` → L2-1 Breaker (`bus_out` → `line_in`) → R-1 Feeder (`start` → `end`) → L2-3 ATS `source1_in`

This is a standard feeder chain (Section 5) where the terminal device is the ATS rather than a panelboard. Follow Steps 1–4 of Section 5 identically. At Step 5 Variant C, the R-1 `end` binds to `source1_in`.

**Feeder sizing:** The R-1 feeder to `source1_in` is sized per `feeder_schedule.json` based on the upstream breaker's ampere rating — same as any other feeder chain. The breaker rating typically matches the ATS `continuous_rating`.

### Pattern 2 — Generator to ATS

**Topology sequence:** L1-5 Generator `gen_out` → R-1 Feeder (`start` → `end`) → L2-3 ATS `source2_in`

**Symbol status:** L1-5 Generator is a placeholder in `sld_system_model.md`. Use `gen_out` as the provisional port name. When L1-5 is completed, update the port binding here if the final port name differs.

**Feeder sizing:** Generator feeders are sized to match the generator's output ampacity, not a standard breaker rating. The R-1 feeder calc fields (`conductor_size`, `conduit_size`, `num_sets`) are determined by the generator kW rating converted to amperes at the system voltage, with conductor selection per NEC 445.13. This is outside the standard `feeder_schedule.json` lookup — flag as manual EOR input for now.

**Manual override path:** Because generator feeders don't map to `feeder_schedule.json`, the following fields must be populated directly by EOR input on the R-1 instance:

| R-1 Field | Input Method |
|-----------|-------------|
| `conductor_size` | EOR specifies per NEC 445.13 |
| `conductor_material` | EOR specifies |
| `conduit_size` | EOR specifies |
| `num_sets` | EOR specifies |
| `ground_size` | EOR specifies per NEC 250.122 |

**Tag and callout generation:** The A-1 Feeder Tag content and A-2 Conduit Callout text are also EOR-supplied strings for generator feeders — the Section 4 algorithm cannot be applied because there is no matching schedule row. Validation rules TV-1 and TV-2 still require one A-1 and one A-2 bound to the R-1, but DV-1 and DV-2 (schedule cross-checks) are **exempt** for R-1 instances whose `start` is bound to an L1-5 Generator port. Flag these exemptions in the validation layer.

**Rendering:** The generator typically sits below or beside the ATS on the drawing. The R-1 feeder routes vertically upward from `gen_out` to `source2_in` at `(ats_x + 105, ats_y + 200)`. Tags and callouts follow standard Steps 3–4 placement on the generator feeder's vertical segment.

### Pattern 3 — ATS to Emergency Switchboard

**Topology sequence:** L2-3 ATS `load_out` → R-1 Feeder (`start` → `end`) → Emergency Switchboard incoming section

The R-1 feeder from `load_out` feeds the emergency switchboard's incoming section. The emergency switchboard is composed per Section 2 Variant EM (NEC 700/701/702 sections).

**Port binding by emergency switchboard configuration:**

| Configuration | R-1 `end` binds to | Notes |
|---------------|---------------------|-------|
| **MLO** | Distribution bus R-2 `bus_tap_bi` (incoming section tap) | Direct connection to single bus |
| **Main breaker** | Main breaker L2-1 `line_in` | Main breaker mediates between incoming and distribution bus |

See §2 Variant EM port binding table for the full bus topology in each configuration.

**Feeder sizing:** The R-1 feeder from ATS `load_out` is sized to the ATS `continuous_rating`. Tag and callout per standard lookup on that ampere rating.

**Continuation squiggle:** If the ATS and emergency switchboard are on different SLD sheets, the R-1 feeder terminates with an A-3 Continuation Squiggle at the sheet boundary. Squiggle text: `TO [emergency switchboard designation]` or `FROM ATS [designation]` depending on which sheet the squiggle appears on.

### Pattern 4 — Multiple ATS Units

Healthcare and large commercial facilities often require multiple ATS units — typically one per NEC class (700, 701, 702). Each ATS is a separate L2-3 instance with its own source feeders and load feeder.

**Topology:** N ATS units, each following Patterns 1–3 independently:

| Per-ATS element | Topology | Notes |
|----------------|----------|-------|
| Normal source feeder | Pattern 1 — dedicated L2-1 breaker on normal MDP secondary bus → R-1 → ATS `source1_in` | N separate breakers on the normal switchboard, one per ATS |
| Generator feeder | Pattern 2 — L1-5 Generator `gen_out` → R-1 → ATS `source2_in` | N separate R-1 feeders from the same generator. Generator output must support the combined load of all ATS units. |
| Load feeder | Pattern 3 — ATS `load_out` → R-1 → emergency distribution | See load configurations below |

**Load configurations:**

| Configuration | Description | Emergency switchboard composition |
|---------------|-------------|----------------------------------|
| **Separate switchboards** | Each ATS feeds its own independent emergency switchboard | N independent Variant EM compositions (§2), each with its own designation and bus |
| **Shared switchboard** | Multiple ATSs feed sections of a single emergency switchboard | Single Variant EM switchboard with N incoming sections (one per ATS). Each incoming section has its own bus tee + feeder + squiggle referencing its ATS designation. NEC class sections are assigned to the ATS whose `nec_class` matches. |

> **Shared switchboard note:** When multiple ATSs feed one switchboard, each incoming R-1 `end` binds to a separate `bus_tap_bi` on the switchboard's bus (MLO) or to separate main breaker sections (if main breakers are present). The bus must be rated for the combined capacity. This is the more complex configuration — use separate switchboards unless the project specifically requires consolidation.

**Generator sizing note:** The generator kW rating must support the aggregate connected load across all ATS units. The individual generator feeders (Pattern 2) are each sized to the respective ATS `continuous_rating`. The generator's total output capacity is an EOR design decision — it is not validated by this spec.

### ATS Calculation Fields

When instantiating the L2-3 ATS, populate these calc fields:

| Field | Source | Notes |
|-------|--------|-------|
| `continuous_rating` | Design / ATS nameplate | Must match or exceed the downstream load |
| `poles` | Design | 3-pole or 4-pole per system grounding |
| `withstand_rating` | ATS nameplate (UL 1008) | Must ≥ `available_fc` per NEC 110.9 |
| `available_fc` | Calculated | Higher of the two source-side fault currents at `source1_in` and `source2_in` |
| `nec_class` | Design | `700` (life safety), `701` (legally required), `702` (optional standby) |

### Multi-Source Anti-Patterns

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | ATS with only one source connected | Both `source1_in` AND `source2_in` must have R-1 feeders bound. An ATS with one source is an incomplete topology. |
| 2 | ATS `load_out` unconnected | `load_out` must connect to exactly one downstream R-1 feeder leading to an emergency switchboard or panel. |
| 3 | Normal and emergency paths sharing an R-2 bus | Normal and emergency power paths must use separate R-2 Bus instances. Shared buses violate NEC 700.10 separation requirements. |
| 4 | Generator feeder sized from standard schedule | Generator feeders are sized per NEC 445.13 based on generator output, not from `feeder_schedule.json`. Manual EOR input required. |
| 5 | Missing NEC class on ATS | Every L2-3 ATS must have `nec_class` populated — this drives which sections of the emergency switchboard it feeds (700/701/702). |
| 6 | Emergency switchboard sections in wrong order | NEC 700 (life safety) leftmost, then NEC 701, then NEC 702. Order follows code priority. |

---

## 7. Composition Validation Rules

Machine-checkable assertions that a composed SLD must satisfy. These rules verify topology completeness, data consistency, and tag correctness. They are the input specification for the validation layer (`sld_preflight_V1_0_0.md`).

Validation is organized by category. Each rule states the assertion, the data sources it checks against, and the failure consequence.

### Connectivity Completeness

| Rule | Assertion | Failure |
|------|-----------|---------|
| CV-1 | Every `bus_tap_bi` port on an R-2 Bus instance has exactly one connected device (L2-1 breaker, L1-1 GFP, L1-4 meter, or L2-7 Spare/Space) | Orphaned bus tap — equipment missing or miswired |
| CV-2 | Every L2-1 breaker `line_in` connects to exactly one R-1 Feeder `start` | Breaker with no feeder — downstream equipment unreachable |
| CV-3 | Every R-1 Feeder `start` connects to a Class A device output port | Feeder with no source — dangling start |
| CV-4 | Every R-1 Feeder `end` terminates at a device port with `terminal`, `inline`, or `bus_tap` connection mode, OR at an A-3 Continuation Squiggle (`termination` mode) | Feeder with no load — dangling end |
| CV-5 | Every L2-3 ATS has both `source1_in` and `source2_in` connected to R-1 Feeder instances | Incomplete ATS — missing source path |
| CV-6 | Every L2-3 ATS `load_out` connects to exactly one downstream R-1 Feeder | ATS with no load — emergency distribution unreachable |
| CV-7 | No R-1 Feeder instance has both `start` and `end` bound to ports on the same device | Self-loop — topological error |
| CV-8 | Every R-1 Feeder `start` binds to a source-side port and every R-1 Feeder `end` binds to a load-side port, per the device-aware port classification table below | Reversed feeder — power flow direction violated |
| CV-9 | Every L2-1 breaker whose downstream R-1 Feeder `end` terminates at an L3-1 Fire Pump `load_in` (or an L2-5 Disconnect in a fire pump circuit) must have its `bus_out` bound to the **main bus** R-2 instance, not the secondary bus | Fire pump on wrong bus — NEC 695.4(B) violation |
| CV-10 | Every NEC-class distribution section in a Variant EM emergency switchboard contains at least one L2-1 breaker with a downstream R-1 Feeder | Empty NEC-class section — section exists with no loads |
| CV-11 | Every A-3 Continuation Squiggle has a `bound_to` reference to exactly one R-1 Feeder instance, and the squiggle text contains a valid equipment designation from the composition | Squiggle with no feeder binding or invalid destination reference |
| CV-12 | Every L2-4 Panelboard sub-feed exit — an R-1 Feeder `start` bound to a `feed_` port, or an internal-breaker `port_assignment` (`attached_to_device` = the panel, `attached_to_port` a `feed_` port) — anchors to a `feed_` port the L2-4 symbol exposes as a comb anchor: `feed_top`, `feed_bottom`, `feed_left`, or `feed_right`. A single feed port may legally carry **both** the panel's own feed-in and one or more sub-feed exits — feed ports are shared geometric comb anchors, not exclusive electrical terminals. | Undrawable sub-feed anchor — exit bound to a `feed_` port the engine has no geometry to draw |
| CV-13 | Every canonical cross-sheet pair (one logical feeder per resolved `cross_sheet_refs[]` pair, per §8A) carries a bound A-3 continuation marker on each participating sheet | Missing continuation marker on cross-sheet feeder |
| CV-14 | Every L2-4 Panelboard sub-feed exit whose port is a drawable comb anchor (in CV-12's set `feed_top`/`feed_bottom`/`feed_left`/`feed_right`) is also present in the topology's **effective** `subfeed_start_ports` whitelist — `layout_config.subfeed_start_ports` if embedded, else the engine default `['feed_bottom','feed_top']` (**REPLACE**, not union, mirroring the engine's `pick()`). **Capability-gated:** evaluated only when the topology embeds `layout_config.subfeed_start_ports`; otherwise registered in `rules_skipped` (the validator cannot see external `*_layout_config.json`, so it will not guess the whitelist). | Silently-dropped sub-feed — the engine's `applyLayoutConfig()` filters this exit out of the drawn comb, so the sub-feed never renders (no error) |
| CV-15 | Every authored `landing_offset_x` resolves to a landing point INSIDE the target panel's drawn box with ≥10 px corner margin, on an end port the engine honors (`feed_top`) — offset forms mirror the engine parser (`"right-N"` → `+w/2−N`, `"left+N"` → `−w/2+N`, numeric → signed offset from top-center; drawn width per the validator's `deviceRelBox` mirror of the engine `BOX` table, L2-4 = 64 px) | Stranded landing — the feeder hooks down beside the panel (or hugs its corner below the manual-route 10 px lane rhythm), or the offset is silently ignored (non-`feed_top` end) |

> **As-built calibration.** CV-13 previously appeared only in the Phase-2 execution order with no assertion row — the row above formalizes the validator's minimal advisory implementation ("each canonical cs-pair feeder carries a bound A-3"). Severity: **info** (advisory) until a full linkage contract is specced.

> **As-built calibration — CV-1 uniqueness is per (device, port), not per device:** main breakers legitimately bridge two buses — the golden's L1-1/L2-1 mains carry two bus port-assignments each (`line_in` → main bus, `bus_out` → secondary bus). CV-1's "exactly one connected device" is asserted per bus-tap port binding; a device appearing on two R-2 instances via two different ports is conformant.

> **As-built calibration — cross-sheet pair dialects (CV-2/CV-5/CV-6 counting):** two conformant dialects exist for `cross_sheet_refs[]` R-1 pairs. *Hospital dialect:* both segments duplicate the logical endpoints (R-1(a) and R-1(b) each bind `start` and `end`) — the destination segment is a pure alias and must **not** double-count toward CV-2/CV-5/CV-6. *Office dialect:* the destination segment has `start: null` and is the **sole carrier** of the end connection — it is not an alias and does count. The validator treats a destination segment as an alias only when its endpoints duplicate the source segment's. Under both dialects each resolved pair counts as exactly one logical feeder.

> **As-built calibration — `internal_to` sub-feed breakers are exempt from CV-2:** breakers carrying `internal_to` (panel-internal sub-feed OCPD) touch no R-1 Feeder at all — the sub-feed chain starts at the parent panel's feed port (attachment-shape port assignment `bus_out` → panel `feed_bottom`), not at the breaker symbol. CV-2's "every L2-1 `line_in` connects to an R-1 `start`" does not apply to them.

> **As-built rescope + promotion.** Severity history: **info** (the original "entry port ≠ exit port" assertion was contradicted by the golden) → **warning** → **rescoped and promoted to error**. The original assertion was factually wrong: the frozen engine has **no port occupancy/exclusivity check** — `feed_` ports are geometric comb anchors computed inline from the panel box edges and are freely shared by an incoming feed and one or more outgoing sub-feeds (engine `hasSubFeedsToPanels` path; a panel that is fed-in *and* sub-feeds from the same `feed_bottom` renders correctly). The **11 golden panelboards** that reuse one feed port for feed-in and a chained sub-feed exit (e.g. `d-138` 4M-1-A `feed_top`, `d-031` 4L-2-A `feed_bottom`; 4 feeder-form + 7 internal-breaker-PA-form) are therefore **legal by definition** and are no longer flagged. The rescoped rule asserts **drawability** instead: every sub-feed exit anchor — an R-1 `start` `feed_` port **or** an internal-breaker `attached_to_port` — must be one of the four box-edge anchors `feed_top`/`feed_bottom`/`feed_left`/`feed_right`; anything else has no anchor geometry (the engine mis-draws it at bottom-center, or silently drops the R-1 sub-feed). The internal-breaker PA form is CV-12's **unique surface** — CV-3/CV-8 police only R-1 `start`/`end` ports, never PAs. Promotion to **error** is honest under H discipline: both goldens are 0-finding at warning first (the 11 reuses vanished — `feed_top`/`feed_bottom` are drawable), and a negative probe (an internal-breaker `attached_to_port` set to a non-anchor `feed_` name) fires while CV-3/CV-8 stay silent, proving detection. Correct topologies never trip it — the compositor only ever emits the four drawable anchors — the same "detects-a-real-defect-but-goldens-can't-hit-it" shape as SH-5a.

> **As-built calibration.** CV-14 is the **complement** of CV-12. CV-12 catches a sub-feed exit port that is not a drawable comb anchor at all; CV-14 catches one that *is* drawable but is excluded from the effective `subfeed_start_ports` whitelist — the engine's `applyLayoutConfig()` runs `SUBFEED_START_PORTS = pick('subfeed_start_ports', ['feed_bottom','feed_top'])` and silently omits any sub-feed whose exit port is not in that set (never rendered, no diagnostic). **Effective set = REPLACE, not union:** `topo.layout_config.subfeed_start_ports ?? ['feed_bottom','feed_top']`, exactly mirroring `pick()`. A union reading would diverge from engine behavior and mask real drops. **Capability gate (load-bearing):** no validated topology embeds `layout_config`, and the validator never merges any external layout-config sidecar — e.g. the retired office example's sidecar *replaced* the whitelist with `[feed_bottom, feed_top, feed_left, feed_right, secondary_out]` (config since removed; behavior recorded here as-built). A naive read of `topo.layout_config` would fall to the 2-port default for **every** building and false-positive the office. So CV-14 evaluates only when the topology carries an embedded `layout_config.subfeed_start_ports` (capability `layout_config:subfeed_start_ports`, distinct from the `sheetRoles`-probing `layout_config` capability); absent it, CV-14 registers in `rules_skipped` and `check()` never runs. Both hospital cases (no embedded `layout_config`) skip → the acceptance gate stays PASS, 2 cases, and a `skipped: ['CV-14']` pin regression-locks the skip. Severity **info** (H discipline — new rules enter at info); promotion to **warning** is deferred until a genuine second config-bearing building exercises it (error is likely never appropriate — a filtered sub-feed is a soft data/layout coupling, not a malformation). Teeth proven by a scratchpad negative probe: a `WITH_GEOMETRY` copy embedding `subfeed_start_ports: ['feed_bottom']` fired CV-14 on all 11 `feed_top` sub-feed exits (probe deleted, never committed).

> **As-built calibration.** CV-15 was born from a geometry regression class, not a schema concern: the family-dims retune shrank the L2-4 drawn box from the ~140 px slot to the measured 64 px family bbox, silently stranding authored `landing_offset_x` values 8–28 px OUTSIDE the drawn panel (hospital F-044 sat 10 px inside the corner). The stranded offsets were retuned to the manual-rhythm lanes, so the hospital validates CV-15-silent. Severity **info** (H discipline). The non-`feed_top` clause is the CV-14-style silent-drop complement: the engine's LANDING OFFSET ADJUSTMENT only applies to `feed_top` termination, so an offset on any other end port is authored dead data.

**CV-8 Device-Aware Port Classification:**

Port names alone do not determine directionality — the device type does. `line_in` on an L2-1 breaker is a source-side output, but `line_in` on an L2-6 SPD is a load-side input. Flex ports (`flex_left`, `flex_right`) are reversible — their classification depends on the direction assigned at composition time.

| Device Type | Source-side ports (R-1 `start` binds here) | Load-side ports (R-1 `end` binds here) |
|------------|---------------------------------------------|----------------------------------------|
| L2-1 / L1-1 Circuit Breaker | `line_in` | `line_in` (L1-1 service-entrance main only)*** |
| L0-1 / L0-2 Transformer | `secondary_out` | `primary_in` |
| L2-2 LV Transformer | `secondary_out`, `flex_left`*, `flex_right`* | `primary_in`, `flex_left`*, `flex_right`* |
| L2-3 ATS | `load_out` | `source1_in`, `source2_in` |
| L2-4 Panelboard | `feed_top`**, `feed_bottom`**, `feed_left`**, `feed_right`** | `feed_top`, `feed_bottom`, `feed_left`, `feed_right` |
| L2-5 Disconnect | `load_out`, `flex_left`*, `flex_right`* | `line_in`, `flex_left`*, `flex_right`* |
| L2-6 SPD (Mode A) | — | `line_in` |
| L3-1 Fire Pump | — | `load_in` |
| L3-2 Motor | — | `load_in` |
| L3-3 Equipment Connection | — | `load_in` |
| L1-5 Generator | `gen_out` | — |
| L2-7 Spare/Space | — | — (no R-1 feeders — excluded from CV-8) |
| L1-4 Utility Meter | — | — (`measurement` mode — excluded from CV-8) |
| L2-8 Branch Meter | — | — (`measurement` mode — excluded from CV-8) |
| R-2 Bus | — | `bus_tap_bi` |

*\* Flex ports are reversible. The validation checks the **assigned direction** recorded at composition time, not the port name. A `flex_left` assigned as "primary input" is load-side; a `flex_left` assigned as "secondary output" is source-side.*

*\*\* Panelboard `feed_` ports are source-side ONLY in Variant G (sub-fed panelboard) context. In all other contexts, `feed_` ports are load-side only.*

*\*\*\* L1-1 `line_in` is load-side only for the service-entrance R-1: the service feeder terminates at the switchboard main breaker.*

> **As-built calibration — `feed_top` accepted as sub-feed source:** the golden chains sub-feeds out of `feed_top` (e.g. r-004/r-005 from panel 4M-1-A), beyond this table's previous `feed_bottom`/`feed_left`/`feed_right` set. All four `feed_*` ports are accepted source-side for CV-3/L2-4 in Variant G context, matching the engine's `layout_config.subfeed_start_ports` default `["feed_bottom","feed_top"]` and office extensions (schema §19). The former footnote sentence tying source-side use to CV-12 ("must not be the same port that serves as the panel's own feed-in") is retired — CV-12 no longer forbids shared feed-in/exit ports; it now asserts sub-feed exit **drawability** (see the CV-12 rescope amendment above).

> **As-built calibration — service entrance ends at the main breaker:** the golden's service R-1 (r-002) terminates at the L1-1 main breaker `line_in` (d-004). L1-1 `line_in` is therefore classified load-side for CV-8 in the service-entrance position, as reflected in the table row above.

> **CV-8 scope:** CV-8 applies only to R-1 Feeder `start`/`end` port bindings. The direct `bus_out` → `bus_tap_bi` connection between a breaker and the R-2 Bus is not mediated by an R-1 Feeder — it is a direct device-to-bus binding validated by CV-1. Similarly, `bus_splice_left`/`bus_splice_right` connections between adjacent R-2 Bus instances are section-to-section bus continuity and are outside CV-8 scope.

> **MLO note for CV-1:** For single-bus MLO configurations (§2 Variant EM), the incoming R-1 `end` binds directly to the distribution bus `bus_tap_bi`. No main breaker `line_in` connection exists. CV-1 is satisfied by the incoming feeder bus tap plus all downstream breaker bus taps on the single R-2 instance.

> **Spare/Space exemption:** L2-7 Spare/Space breakers are exempt from CV-2 (no `line_in` port, no downstream R-1 required). They are also exempt from TV-1 and TV-2 (no R-1 instance, therefore no tags). L2-7 devices satisfy CV-1 at their `bus_tap_bi` position but produce no feeder chain below.
>
> **As-built calibration.** The exemption extends beyond L2-7 — **L2-1 breakers carrying `data_fields.kind: "spare"`** (golden CB-05/06/14/15) sit on the bus with no feeder and receive the same Spare/Space exemption (validator predicate `isSpareOrSpace`). A spare is identified by the `kind` field, not by node type alone.

> **Port suffix vs. CV-8 column:** The `_in` suffix on a port name indicates drawing direction (line drawn toward the symbol), NOT electrical role. L2-1 `line_in` is classified as source-side in CV-8 because the R-1 Feeder originates here — power flows away from the breaker through the feeder. Generators must use the CV-8 table, not port name suffix patterns, for R-1 `start`/`end` binding decisions.

### Tag Completeness

| Rule | Assertion | Failure |
|------|-----------|---------|
| TV-1 | Every R-1 Feeder instance has exactly one A-1 Feeder Tag with `bound_to` referencing it | Missing feeder tag |
| TV-2 | Every R-1 Feeder instance has exactly one A-2 Conduit Callout with `bound_to` referencing it | Missing conduit callout |
| TV-3 | R-1 Feeders downstream of an L2-2 LV Transformer `secondary_out` use T-suffix tags from `3_phase_transformer_feeder_schedule.json` | Wrong tag type on transformer secondary |
| TV-4 | R-1 Feeders NOT downstream of a transformer do NOT use T-suffix tags | Incorrect T-suffix on non-transformer feeder |

> **TV-1/TV-2 exemptions:** The following R-1 instances are exempt from TV-1 and TV-2: (1) Downstream stub R-1 in an inline disconnect chain (§5 Variant F — `stub_exempt` flag, see Inline Device Tag Convention). (2) R-1 instances do not exist for L2-7 Spare/Space breakers or L2-6 SPD Mode B — these devices have no R-1 and are therefore not subject to TV-1/TV-2. (3) Generator feeder R-1 instances are NOT exempt from TV-1/TV-2 — they require tags, but DV-1/DV-2 schedule cross-checks are exempt per §6 Pattern 2.

| Rule | Assertion | Failure |
|------|-----------|---------|
| TV-5 | Every device in the A-4 placement set with populated `calc_fields.available_fc` and `suppress_fc_tag` ≠ `true` has exactly one A-4 annotation with `bound_to` referencing it. Every R-2 Bus with `bus_level: "main"` and populated `calc_fields.available_fc` and `suppress_fc_tag` ≠ `true` has exactly one A-4 annotation with `bound_to` referencing it. | Missing fault current annotation on device/bus with calculated FC |
| TV-6 | Every non-stub-exempt R-1 Feeder with populated `calc_fields.voltage_drop_pct` and `suppress_vd_tag` ≠ `true` and cumulative VD ≥ `vd_display_threshold` has exactly one A-5 annotation with `bound_to` referencing it. | Missing voltage drop annotation on feeder with calculated VD above threshold |
| TV-7 | Every A-6 Hex Note annotation has a non-null `content.keynote_number` (positive integer) and a non-empty `content.keynote_text` (non-whitespace string). | Incomplete keynote annotation — missing number or text |
| TV-8 | Every A-3 Continuation Squiggle has non-empty `content.text`. For feeders: text matches `"TO [designation]"` or `"FROM [designation]"` where `[designation]` is a valid equipment or switchboard designation. For bus squiggles: text matches `"BUS CONTINUES ON [sheet_number]"` or `"BUS FROM [sheet_number]"`. | Missing or malformed squiggle label |

> **TV-5/TV-6 exemptions:** (1) Devices/feeders with empty or absent `calc_fields` are exempt. (2) Devices/feeders with `suppress_fc_tag: true` or `suppress_vd_tag: true` are exempt (Tier 2 EOR override). (3) Generator feeder R-1 instances are exempt from TV-6 and DV-14. (4) Stub-exempt R-1 instances are exempt from TV-6. (5) Cross-sheet R-1(b) stub segments are exempt from TV-6 (same as TV-1/TV-2 stub exemption).

### Spur Validation

Spur-attached devices (L2-6 SPD Mode B) follow a lateral connection model outside the feeder chain topology. These rules validate spur connections independently from feeder chain rules.

| Rule | Assertion | Failure |
|------|-----------|---------|
| SV-1 | Every L2-6 SPD in Mode B has exactly one `spur_` port bound to an L2-4 Panelboard boundary edge. No other device types are valid spur attachment targets. | SPD spur-attached to invalid target |
| SV-2 | No L2-4 Panelboard has more than one Mode B SPD spur-attached to it | Duplicate SPD on panelboard |
| SV-3 | Mode B SPDs are exempt from TV-1, TV-2, CV-2, and CV-3. These rules do not apply to devices with `connection_mode: spur` and no upstream R-1 Feeder. | — (exemption definition, not a check) |

### Data Consistency

| Rule | Assertion | Check Source | Failure |
|------|-----------|-------------|---------|
| DV-1 | A-1 tag content matches the correct schedule source for the R-1's feeder type: (a) Standard LV feeders — `feeder_schedule.json` → `tag` field for the R-1's upstream breaker ampere rating. (b) Transformer secondary feeders (R-1 `start` bound to L2-2 `secondary_out` or `flex_` port assigned as secondary output) — `3_phase_transformer_feeder_schedule.json` → `transformers[].secondary.one_line_tag` for the upstream transformer's `kva`. (c) MV feeders — `mv_feeder_schedule.json` → `feeders[].tag` for the matching ampacity and voltage class. | `feeder_schedule.json`, `3_phase_transformer_feeder_schedule.json`, `mv_feeder_schedule.json` | Tag/schedule mismatch |
| DV-2 | A-2 callout text matches the Conduit Callout Algorithm (Section 4) output for the same schedule row. For transformer secondary feeders, the callout must use the transformer secondary callout variant (§4) with bonding jumper in place of EGC. | Section 4 algorithm (including transformer secondary and MV variants) | Callout/schedule mismatch |
| DV-3 | Every L2-1 breaker ampere trip rating is a valid value in `nec_standard_ratings.json` → `fuse_cb_ampere_ratings.standard_ratings_a` | `nec_standard_ratings.json` | Non-standard breaker rating |
| DV-4 | R-2 Bus `bus_bracing` ≥ R-2 Bus `available_fc` | `nec_standard_ratings.json` → AIC tiers | Bus bracing inadequate per NEC 110.10 |
| DV-5 | L2-3 ATS `withstand_rating` ≥ L2-3 ATS `available_fc` | UL 1008 rating vs. calculated FC | ATS withstand inadequate per NEC 110.9 |
| DV-6 | Transformer secondary breaker rating matches `3_phase_transformer_feeder_schedule.json` lookup for the transformer's kVA | `3_phase_transformer_feeder_schedule.json` | Secondary OCPD mismatch per NEC 450.3(A) |
| DV-7 | R-1 Feeder `conductor_material` matches `feeder_schedule.json` → `feeders[].phase_conductors.material` for the matching `nominal_ampacity` tier | `feeder_schedule.json` | Conductor material mismatch — wrong CU/AL breakpoint |
| DV-8 | R-1 Feeder schedule lookup used the correct `configurations[]` array (3-wire or 4-wire) matching the downstream system voltage: 480Y/277V → 4-wire; 480V delta → 3-wire; 208Y/120V → 4-wire | `feeder_schedule.json` | Wrong wire count configuration — tag and conductor spec inconsistent with system |
| DV-9 | NEC-class sections in a Variant EM emergency switchboard are ordered by code priority: 700 leftmost → 701 → 702 rightmost. No NEC class appears out of sequence. | §2 Variant EM section ordering rule | Emergency switchboard section ordering violation |
| DV-10 | R-2 Bus `bus_rating` on the main bus ≥ R-2 Bus `bus_rating` on the secondary bus (for two-bus switchboard architectures) | Switchboard composition | Main bus rated lower than secondary bus — design error |
| DV-11 | Every L2-1 (and L1-1) Circuit Breaker `aic_rating` ≥ `available_fc` at the breaker location. The `aic_rating` must also be a valid tier in `nec_standard_ratings.json` → `short_circuit_ratings.ratings_kaic` | `nec_standard_ratings.json` → `short_circuit_ratings`; L2-1 calc fields `aic_rating`, `available_fc` | Breaker interrupting capacity inadequate per NEC 110.9 — breaker cannot safely interrupt available fault current |
| DV-12 | Every L2-4 Panelboard `aic_rating` ≥ `available_fc` at the panelboard bus. The `aic_rating` must also be a valid tier in `nec_standard_ratings.json` → `short_circuit_ratings.ratings_kaic` | `nec_standard_ratings.json` → `short_circuit_ratings`; L2-4 calc fields `aic_rating`, `available_fc` | Panelboard short-circuit current rating inadequate per NEC 110.9 / UL 67 |
| DV-13 | Every A-4 tag `content.value_kA` equals the `available_fc` value on the bound device's or routed element's `calc_fields` within ±0.1 kA tolerance. | A-4 `content.value_kA` vs. bound target `calc_fields.available_fc` | Fault current tag value inconsistent with calculated FC at bound location |
| DV-14 | Every A-5 tag `content.value_pct` equals the cumulative voltage drop computed by the §5 Cumulative VD algorithm for the bound R-1 within ±0.05% tolerance. `content.segment_vd_pct` must equal the R-1's `calc_fields.voltage_drop_pct` within ±0.05% tolerance. | A-5 content vs. computed cumulative VD; segment VD vs. R-1 calc field | Voltage drop tag value inconsistent with calculated VD |
| DV-15 | For every `cross_sheet_refs[]` entry linking two R-1 Feeder instances, `conductor_material`, `conductor_size`, `conduit_type`, `conduit_size`, `ground_size`, and `num_sets` are identical on both R-1(a) and R-1(b). | R-1(a) `calc_fields` vs. R-1(b) `calc_fields` | Cross-sheet feeder conductor spec mismatch |

> **Generator feeder exemption:** DV-1, DV-2, DV-7, and DV-8 do not apply to R-1 Feeder instances whose `start` is bound to an L1-5 Generator port. Generator feeder tag content and callout text are EOR-supplied overrides (see §6 Pattern 2). Conductor specs are manual EOR input per NEC 445.13.

> **Transformer secondary feeder note:** For R-1 feeders downstream of L2-2 (i.e., `start` bound to `secondary_out` or a `flex_` port assigned as secondary output), DV-1 validates the A-1 tag against `3_phase_transformer_feeder_schedule.json` → `one_line_tag` (not `feeder_schedule.json` → `tag`). DV-7 and DV-8 still check against `feeder_schedule.json`, but the `nominal_ampacity` used for the lookup is the value decoded from `3_phase_transformer_feeder_schedule.json` → `secondary.feeder_type` (per §3 two-hop lookup step 2), not the upstream breaker ampere rating.

> **Sub-fed panelboard exemption:** DV-3 (breaker rating validation) and DV-11 (breaker AIC adequacy) do not apply to Variant G sub-fed panelboard chains. No explicit L2-1 breaker exists in the topology — the breaker protecting the sub-feed circuit is inside the upstream panelboard and is documented on the panel schedule, not the SLD. DV-1 and DV-2 (tag/callout schedule cross-checks) apply normally — the sub-feed R-1's schedule lookup uses the downstream panel `bus_rating` as `nominal_ampacity`.

> **MLO note for DV-4:** For single-bus architectures (§2 Variant EM MLO configuration), the bus bracing check applies to the single R-2 Bus instance. The main bus / secondary bus distinction in DV-10 does not apply — DV-10 is skipped for MLO switchboards.

### Topology Integrity

| Rule | Assertion | Failure |
|------|-----------|---------|
| TI-1 | The directed graph from every L0-class source device (L0-1 Utility Transformer, L0-2 MV Transformer) and every L1-5 Generator to every terminal device (L2-4, L3-1, L3-2, L3-3) is connected — no isolated subgraphs. L2-3 ATS devices are treated as pass-through nodes that connect their source paths to their load path for reachability purposes. | Orphaned equipment — unreachable from any source |
| TI-2 | Normal power and emergency power R-2 Bus instances are disjoint (no shared bus between normal and emergency paths) | NEC 700.10 separation violation |
| TI-3 | Every equipment designation is unique across the entire composition | Duplicate designation — ambiguous reference |
| TI-4 | Every equipment designation follows the pattern defined in `equipment_designation_legend_V1_0_0.json` (segment grammar plus the legend's `special_designations` exact-match allowlist and infix rules) | Naming convention violation |
| SH-1 | Every device, routed element, and annotation has a `sheet_id` that references a valid `sheets[]` entry. | Invalid sheet reference — object references a sheet that does not exist |

> **As-built calibration — TI-4 scope and severity:** TI-4 runs at **error** severity (gating). It reads `07_data/normalized/equipment_designation_legend_V1_0_0.json` and accepts a designation when it either (a) matches the segment grammar `[PowerType][Voltage][Equipment]-[Level]-[Identifier]` built from the legend's `power_type` / `voltage` / `equipment` code lists, optionally permitting a `special_designations.infix_rules` code (e.g. `FUT`) between the equipment and level segments, or (b) appears in the legend's `special_designations.exact_match` allowlist (e.g. `GEN-1`). Accessory designations are excluded by node-type scoping (L2-2/L2-3/L2-4, L1-5, L3-1 and switchboards are checked; accessory items like CB-03, NG-BOND, SPD-MSB, UTIL-MTR, SPACE-01, MAIN-GFP are not), and separator normalization treats the legend's spaced en-dash as the data's compact hyphen.
>
> **Gap inventory — CLOSED (resolved record).** The scoped check once produced 32 findings that were **substantive legend gaps, not noise**. All were closed by extending the legend (Ramiro's decision: extend the legend, not narrow TI-4's scope):
> - Hospital 28 — every `C…` (Critical) and `EQ…` (Equipment) NEC-517 branch designation → **closed** by new `power_type` codes `C` and `EQ`; `E4FP-1-A` → **closed** by new `equipment` code `FP`; `GEN-1` (two-segment, outside the grammar) → **closed** by the `special_designations.exact_match` allowlist.
> - Office 4 — `E4G-1-A` → **closed** by new `equipment` code `G`; `4MSB-1-A` / `E4MSB-1-A` → **closed** by new `equipment` code `MSB`; `4S-FUT-1-A` (three tail segments, outside the grammar) → **closed** by the `special_designations.infix_rules` `FUT` future/spare infix.
>
> With every gap closed, both goldens produce zero TI-4 findings at warning, so TI-4 was promoted warning → error (H calibration discipline: goldens clean at the target-minus-one severity before promotion; acceptance gate PASS after every step).

### Validation Execution Order

Rules are checked in two phases for multi-sheet support. Single-sheet compositions execute Phase 1 only (Phase 2 is a no-op when `cross_sheet_refs[]` is empty).

**Phase 1 — Per-Sheet Topology Validation:**

1. **SH-1** — every `sheet_id` references a valid sheet
2. **Topology Integrity** (TI-3, TI-4) — unique designations, naming convention (per-device, no global graph needed)
3. **Connectivity Completeness** (CV-1 through CV-12, plus CV-14) — with A-3 termination acceptance for cross-sheet R-1 per CV-4. CV-14 (sub-feed drawability vs. effective `subfeed_start_ports`, info) is capability-gated: it runs only when the topology embeds `layout_config.subfeed_start_ports`, else it registers in `rules_skipped`.
4. **Tag Completeness** (TV-1 through TV-8) — with stub-exempt exemptions for cross-sheet R-1(b) per TV-1/TV-2/TV-6
5. **Spur Validation** (SV-1 through SV-3)
6. **Data Consistency** (DV-1 through DV-14) — per-sheet schedule cross-checks, FC/VD tag consistency

**Phase 2 — Global Validation (cross-sheet resolution):**

7. Resolve `cross_sheet_refs[]` → build unified directed graph
8. **TI-1** — global reachability across all sheets
9. **TI-2** — global normal/emergency bus separation
10. **CV-13** — every canonical cross-sheet pair carries bound A-3 continuation markers (info)
11. **DV-15** — cross-sheet feeder spec consistency

**Phase 3 — Geometry Validation** (after layout engine, per `sld_preflight_V1_0_0.md`):

12. **SH-2** — geometry-block self-consistency + predicted compose-scale legibility
13. **SH-4** — annotation bounding boxes within the device-extent envelope
14. **SH-5** — routed-path vertex finiteness + envelope containment
15. **SH-6** — switchboard text-zone extent (**active**, finiteness-only at `info`; its `geometry.sections` input landed, schema §14.7 — `sld_preflight_V1_0_0.md` §3.6)
16. **SH-3** — no device bounding-box overlaps

A composition that passes Phase 1 and Phase 2 is ready for the layout engine. After layout, Phase 3 validates geometry. A composition passing all phases is ready for the renderer.

> **As-built calibration.** This Phase-3 list previously named only SH-2/SH-3 against an unversioned `sld_preflight.md`. The preflight rules were rebound to the floating-origin coordinate model and the compose-time page transform in `sld_preflight_V1_0_0.md`, which supersedes that earlier draft — under that model, page fit is guaranteed by construction, so Phase 3 validates geometry-block consistency, finiteness, legibility, and relative collisions rather than absolute `0..content_w_px` bounds. See `sld_preflight_V1_0_0.md` §3 for the rule semantics and severities.

> **Multi-sheet note for TI-1:** When `cross_sheet_refs[]` is non-empty, the validator reconstructs the full directed graph by linking paired R-1 instances across sheets before running reachability. Each `cross_sheet_refs` entry creates a virtual edge from R-1(a)'s `start` device to R-1(b)'s `end` device.

---

## 8A. Multi-Sheet Composition

### Sheet Template

Sheet templates are defined in `sld_sheet_templates_V1_0_0.json`. The active template is set via `metadata.sheet_template` in the topology contract. Default: `"30x42"` (Arch E1 — 42" × 30" landscape; V1_0_0 mislabeled this size ARCH D / ANSI D).

**Drawable area computation** (from template + `px_per_inch`):

```
drawable_w_in = paper_w(42) − border(0.5) × 2 − title_block_w(5.0) = 36.0"
drawable_h_in = paper_h(30) − border(0.5) × 2 = 29.0"
drawable_w_px = 36.0 × px_per_inch(96) = 3456px
drawable_h_px = 29.0 × px_per_inch(96) = 2784px
content_w_px  = 3456 − 2 × (0.25 × 96) = 3408px  (with 0.25" content margin)
content_h_px  = 2784 − 2 × (0.25 × 96) = 2736px
```

**Coordinate system:** Origin at top-left of content area. X left-to-right, Y top-to-bottom. Layout engine maps composition-space positions to per-sheet content-area coordinates.

### Sheet Assignment — NP/EM Split

**Default (Tier 2):** Normal power on S1, emergency power on S2.

| Sheet | Content | Default Sheet Number | Default Title | `content_type` |
|-------|---------|---------------------|---------------|---------------|
| S1 | Utility transformer, meter, NP switchboard, all NP distribution + downstream equipment | E-501 | `SINGLE-LINE DIAGRAM — NORMAL POWER` | `"NP"` |
| S2 | ATS(s), generator(s), EM switchboard(s), all EM distribution + downstream equipment | E-502 | `SINGLE-LINE DIAGRAM — EMERGENCY POWER` | `"EM"` |

When only normal power exists (no ATS/generator/EM switchboard): single-sheet composition. No S2 created.

**EOR override:** EOR may set `sheet_id` directly on any device in the topology input. The compositor respects explicit assignments and only auto-assigns devices without a `sheet_id`.

### Overflow Splitting

When a power source type exceeds sheet capacity (`switchboard_w + switchboard_text_zone_w(200) + tag_total_h_offset(108) > content_w_px`):

1. Identify the section boundary closest to the horizontal midpoint.
2. Sections LEFT of the boundary stay on the current sheet. Sections RIGHT move to the overflow sheet.
3. The secondary bus (R-2) spanning both sheet portions is split into two R-2 instances (see Bus Splitting below).
4. Each breaker and its complete feeder chain follow its section.
5. Create overflow sheet: `sheet_number` = next sequential (E-503, etc.), `content_type = "overflow"`.
6. Insert cross-sheet references for the bus and any feeder chains crossing the boundary.

**Split must occur at a section boundary** — never mid-section. Favor the shorter side staying on the original sheet.

**Vertical overflow:** Flagged as a composition warning. The EOR should adjust `px_per_inch` or restructure. Vertical splitting is deferred.

**Sheet ordering:** NP sheets first (E-501, E-502 for overflow), then EM sheets (E-503, etc.). Tier 2 — EOR may override.

### Cross-Sheet Feeder Identity

Cross-sheet feeders are **two separate R-1 instances**, one per sheet, each terminated by a matched A-3 squiggle. Linked by `cross_sheet_refs[]`.

**Splitting procedure:**

| Object | Source Sheet | Destination Sheet |
|--------|------------|------------------|
| R-1(a) | `start` = breaker `line_in`, `end` = null (squiggle-terminated), `stub_exempt = false` | — |
| A-3(a) | `bound_to` = R-1(a), `content.text` = `"TO [load designation]"`, `content.direction` = `"to"`, `content.destination_designation` = load equipment designation | — |
| — | — | R-1(b): `start` = null (squiggle-originated), `end` = panel/device port, `stub_exempt = true` |
| — | — | A-3(b): `bound_to` = R-1(b), `content.text` = `"FROM [source designation]"`, `content.direction` = `"from"`, `content.destination_designation` = source equipment/switchboard designation |

**Calc field duplication:** Both R-1 instances carry identical calc fields (conductor spec, distance, VD, FC). Makes each sheet self-contained. DV-15 validates consistency.

**A-3 text convention:** Equipment designations by default (Tier 2). EOR may override to sheet numbers.

**Annotation handling on cross-sheet feeders:**
- A-1, A-2: source-side R-1(a) only (load-side R-1(b) is stub-exempt)
- A-4: placed on the destination device on the load-side sheet (bound to device, not R-1)
- A-5: placed on source-side R-1(a) (stub-exempt R-1(b) is exempt)

### Bus Splitting (Overflow)

When a horizontal overflow split cuts through a switchboard:

1. Split R-2 into R-2(a) (left sheet) and R-2(b) (right sheet). Each carries duplicate calc fields and only the `bus_tap_bi` positions for its sheet's breakers.
2. A-3 squiggles at the bus split: `"BUS CONTINUES ON [sheet_number]"` / `"BUS FROM [sheet_number]"` (bus squiggles use sheet numbers, not equipment designations).
3. Cross-sheet reference links R-2(a) and R-2(b).
4. Switchboard entry gains `secondary_bus_overflow_ids: ["r-003b"]` for overflow R-2 segments. DV-10 checks all segments.

**Section splitting:** Sections cannot span sheets. Split occurs at a section boundary. Switchboard text on the left sheet only; overflow sheet gets `"[designation] (CONT.)"`. N-G bond stays in the rightmost section on the rightmost sheet.

---

## 8. Known Gaps — Deferred

Issues identified during review that are not blocking current SLD generation but will need resolution before downstream layers are production-ready.

> **§8.1 Multi-Sheet Composition — Resolved.** Multi-sheet composition rules are defined in §8A, covering sheet template specification (30×42 Arch E1 default, extensible), NP/EM sheet assignment, overflow splitting, cross-sheet feeder identity, bus splitting, A-3 text convention, and two-phase validation (CV-13, TV-8, DV-15).

> **§8.3 Annotation Composition (A-4 through A-6) — Resolved.** Composition rules for A-4 (Fault Current Tag), A-5 (Voltage Drop Tag), and A-6 (Hex Note) are defined in §5 Steps 6–7, including placement eligibility, Y-position algorithm, cumulative VD computation, A-6 mode selection with collision avoidance, and keynote number assignment (per-sheet sequential). Validation rules TV-5 through TV-8 and DV-13 through DV-15 enforce annotation completeness and value consistency.

### 8.2 Busway Composition (blocks busway-fed distribution projects)

R-3 Busway topology pattern is defined at high level in §5 (Busway Composition placeholder). Full composition depends on:

| Gap | Dependency | Impact |
|-----|-----------|--------|
| L2-9 Bus Plug symbol definition | `sld_system_model.md` L2-9 (placeholder) | Cannot compose tap-off connections without bus plug geometry and ports |
| Tap spacing algorithm | §5 composition rules | Parametric tap placement along busway runs — no formula defined |
| Busway feeder sizing contract | §3 + `c_values_lookup.json` busway section | C-values exist but no lookup contract maps ampacity → busway type → C-value |
| Busway callout format | §4 | Busway callouts differ from cable feeders — format TBD |
| Busway fault current propagation | §5 + `fault_current_calc.json` | P2P method supports busway but no composition rule for FC at each tap point |

### 8.4 Revit Translation Layer (architectural gaps — not blocking SVG pipeline)

The following gaps exist between the topology contract and the Revit execution layer. They do not affect SLD generation or SVG rendering, but will need resolution when `revit/` is developed.

| Gap | Description | Recommended Resolution |
|-----|-------------|----------------------|
| **Coordinate mapping** | Topology rules define all positions in SVG pixel coordinates. Revit detail items use paper-space units. No scale factor or coordinate transform contract exists. | Define a `revit_scale_factor` (px → paper units) and coordinate origin mapping in the Revit translation layer. The topology contract should remain in abstract units; the Revit layer applies the transform at placement time. |
| **Switchboard section boundaries** | `revit_SLD_family_map.json` has no family for switchboard-as-assembled-unit or dashed boundary rectangles. | Create a composite Revit family or implement a placement algorithm that draws detail lines at computed coordinates per §2 section boundary rules. |
| **Routed elements (R-1, R-2, R-3)** | Routed elements are variable-geometry polylines that cannot be placed as Revit families. | Draw as Revit detail lines with appropriate line styles. R-3 Busway may need a custom parametric detail component. |
| **Annotation placement** | A-1/A-2 have Revit families but placement coordinates are computed in SVG space. | Port the §5 coordinate formulas into the Revit translation layer with scale factor, or export tag coordinates in the JSON topology. |
| **Bus tee dots** | No Revit family exists for bus tap markers. | Include as small Revit detail component family or draw as filled detail circles. |
