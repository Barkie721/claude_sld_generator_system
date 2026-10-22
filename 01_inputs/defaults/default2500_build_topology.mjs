#!/usr/bin/env node
/**
 * default2500_build_topology.mjs — the ONLY hand-edited file in this project.
 *
 * "Everything defaults" reference composition. The single stated input is the
 * service size (2500 kVA); every other value is a documented Tier-2 default per
 * 00_Docs/project_instructions_V1_0_0.md §2.3 and is itemised in
 * 1_source/default2500_SLD_narrative_V1_0_0.md.
 *
 * Writes two files into 2_build/:
 *   default2500_layout_config.json        the sidecar (sidecar keys win at layout time)
 *   default2500_SLD_topology_V1_0_0.json  topology with an EMBEDDED copy of the same config
 *
 * Both copies are deliberate. CV-14's capability gate reads only
 * topology.layout_config.subfeed_start_ports (08_validation/lib/context_V1_0_0.mjs)
 * and cannot see a sidecar — embedded-only is how a run silently drops to 55 rules
 * instead of 63.
 *
 * ID ranges are rebased off the hospital golden (schema §16): d-3xx / r-3xx / r-39x
 * buses / a-6xx / sw-2xx / sec-2xx / pa-3xx / meas-3xx. The engine retains
 * golden-keyed special cases on literal ids and designations; starting at d-001
 * trips them.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '2_build');
const SLUG = 'default2500';

/* ---------------------------------------------------------------------------
 * layout_config
 * Every hospital-named key is CLEARED EXPLICITLY. Absent keys fall back to the
 * engine's _DEF_* golden values, which anchor the drawing to devices that do not
 * exist here. Single level, so no level lines and an empty level_map.
 * ------------------------------------------------------------------------- */
const LAYOUT_CONFIG = {
  sheet_roles: { S1: 'normal' },
  sheet_skips: {},

  // ⚠️ OBJECT FORM, NOT A FLAT ARRAY. computeChainYOverrides treats a flat array
  // as ≡ {S1: array} and would work — but _sheetFloorStackBottomUp (which drives
  // the level-line pitch walk and the A-7 draw list) reads ONLY the object form
  // and silently falls back to the literal hospital stack ['1','2','3','R'] for
  // anything else. Index 0 is the TOP of the stack.
  floor_order: { S1: ['3', '2', '1'] },

  // The two NAMED riser stacks a `normal` sheet can floor-band, {floor: designation}.
  // A third stack would need floor_band_designations (OFF-009) — not used here.
  // The two NAMED riser stacks a `normal` sheet can floor-band, {floor: designation}.
  // A third stack would need floor_band_designations (OFF-009) — not used here.
  floor_anchors: { 3: '2P-3-A', 2: '2P-2-A', 1: '2P-1-A' },            // 208 V plug-load riser
  floor_anchors_mechanical: { 3: '4M-3-A', 2: '4M-2-A', 1: '4M-1-A' }, // mechanical riser

  // Band membership. Riser panels ONLY — 4T-1-A / 2L-1-A (the lighting Chain-B
  // cascade) stay out, exactly as the golden excludes its own Chain-B cascades:
  // a mapped device drags its level line down (lineY = maxBottom + margin).
  // 4T-2-A is likewise absent — it is the transformer feeding the riser head,
  // not a floor-banded panel. L0-1 / L1-1 / L1-3 / L1-4 are excluded by the
  // engine's own LEVEL_EXCLUDE_TYPES, so the utility TX, main, N-G bond and
  // meter need no entry.
  level_map: {
    '2P-1-A': '1', '2P-2-A': '2', '2P-3-A': '3',
    '4M-1-A': '1', '4M-2-A': '2', '4M-3-A': '3',
  },
  level_order: ['3', '2', '1'],   // top (lowest Y) to bottom (highest Y)

  ats_xoffset_overrides: {},

  // Floor-to-floor riser pitch. 1200 (engine default) -> 700 (R-006) -> 540
  // (R-010) -> 650 (R-011, raised back to clear a real collision).
  //
  // ⚠️ 540 was WRONG despite every checker reading 0. F-307's A-1 tag is pinned
  // a FIXED 90 px along the run from its exit, and its exit is 2P-1-A's top at
  // y 3798 — which does not move with the pitch. So the tag sits at fy 3708
  // ALWAYS, and only the child panel and its level line move. At 540 the run is
  // just 92 px, so the tick's own arm (fy +/- 8 = 3700..3716) reached 6 px
  // INSIDE 2P-2-A's box. Nothing catches it: check_symbol_clash section B tests
  // the PILL rect, and check_tag_feeder_clash explicitly excludes a tag's own
  // tick. Mayo caught it by eye.
  //
  // Solved as a constraint on the pitch, since fy is fixed:
  //
  //   step   2P-2-A bottom   L2 line   tick vs panel      pill vs level line
  //    540       3706          3746    PENETRATES 6 px    clear 22.5
  //    560       3686          3726    clear 14           clear 2.5   (marginal)
  //    580       3666          3706    clear 34           LINE CROSSES PILL
  //    600       3646          3686    clear 54           clear 6.5   (marginal)
  //    650       3596          3636    clear 104          clear 56.5  <-- here
  //    700       3546          3586    clear 154          clear 106.5
  //
  // 650 is the first pitch with real margin on BOTH constraints. The band
  // between 560 and 600 is unusable because the level line sweeps across the
  // pill. Costs 220 px of sheet height against 540; the sheet is 2404 x 2352,
  // still 32% shorter than the engine default and 100 px shorter than R-006.
  //
  // The alternative that keeps 540 is `a1_tag_placement['F-307'].dy: +64`,
  // dropping the tag below the level line into the 52 px pocket above 2P-1-A —
  // but that leaves only ~10 px margins, against 56-104 px here.
  riser_step_standard: 650,

  // ⚠️ MUST EXCEED the deepest chain, and 1 places NOTHING beyond the first hop.
  // The 208 V riser cascades two hops (2P-1-A -> 2P-2-A -> 2P-3-A), so this is 3.
  // The mechanical riser is still a depth-1 fan and is unaffected.
  //
  // The compounding-offset family (OFF-021 / 028 / 029) lives in _s2FloorYOffset,
  // which is EMERGENCY-sheet only. On this normal sheet every anchor is pinned
  // independently from __FLOOR_ROW_Y by computeChainYOverrides, so hops do not
  // accumulate. Verified: check_level_bands §3 shows no constant-difference
  // ladder, which is the documented signature of that bug.
  subfeed_max_depth: 3,
  subfeed_start_ports: ['feed_bottom', 'feed_top'],
  subfeed_src_types: ['L2-4'],
  subfeed_dst_types: ['L2-4'],

  // OFF-027 — STRAIGHTEN THE 208 V RISER INTO ONE PLUMB COLUMN.
  // Without this the cascade drifts 100 px WEST per level (2P-1-A centre 995,
  // 2P-2-A 895, 2P-3-A 795) and every hop draws a 4-vertex dogleg: up 90, west
  // 100, up again. That is the documented per-level drift for a lighting/plug
  // stack (115 px for power, 100 for lighting/mechanical).
  // Listing a feeder here snaps its destination panel's centre X to the
  // feeder's own exit X, so exitX == landingX, the two corner vertices go
  // colinear with the endpoints and the polyline collapses to ONE vertical.
  // The child's whole internal chain rides along via the shared G[] anchor.
  // Applying it to both hops walks the entire stack back onto 2P-1-A's column.
  //
  // F-308 is here to MAKE SPACE, not to straighten for its own sake. The
  // mechanical fan's L2 leg drifts the same 100 px WEST, which parked 4M-2-A at
  // centre 1085 — only 26 px of clear air from the 2P column's own 2P-2-A at
  // 995, the tightest pair on the sheet. Straightening it snaps 4M-2-A back onto
  // its exit X (1180, under its own parent 4M-1-A) and opens that gap to 121 px.
  //
  // ⚠️ F-309 is deliberately NOT straightened. It exits the same panel top 10 px
  // from F-308, so snapping it too would run two verticals 10 px apart for
  // 500+ px and read as one doubled line. It keeps its dogleg east to 1285.
  subfeed_straighten: ['F-307', 'F-310', 'F-308', 'F-309'],

  // No subfeed_exit_pitch. Both risers cascade, so every panel has exactly ONE
  // sub-feed exit and there is no comb to pitch. The key was needed only while
  // the mechanical branch was a two-leg fan.
  s2_level_line_pitch: {},
  s2_shift_delta: {},
  subfeed_midy_nudge: {},

  // Straightening the riser (subfeed_straighten, above) ROTATES both cascade
  // tags: a dogleg carries a horizontal-orient pill above its jog, a plumb run
  // carries a vertical-orient pill beside itself. They default to the EAST side,
  // and F-307's landed on the mechanical riser's own leg — check_tag_feeder_clash
  // measured `HARD ... x F-308 FOREIGN gap -1.4 px` against the F-308 vertical
  // at x=1085. The 2P column at x=995 leaves only 1027-1085 to the east: 58 px
  // for a 76 px pill.
  //
  // probe_region shows the WEST band (x 860-995) empty at BOTH tag rows
  // (y 3708 and y 3368) apart from the runs themselves, so both pills flip west.
  // Both, not just the clashing one — a plumb column with its tags alternating
  // sides reads as a mistake even when it measures clean.
  // ALL feeder tags sit on the RIGHT of their run (R-009), so the sheet reads
  // uniformly — the five non-riser tags (2503 / 5004T / 4004 / 1253 / 2504T)
  // already default there, and these four are stated explicitly rather than
  // left to the default so the alignment cannot drift if the geometry moves.
  // They were briefly 'left' under R-008, when the mechanical column sat only
  // 190 px east of the 2P column and a right pill (run+32 .. run+108) had
  // nowhere to go; the R-009 reorder reopens that lane.
  a1_tag_placement: {
    // +20 px of pill-only clearance. A right-side pill always starts at
    // run+32, which IS the panel's right edge (64-wide box on the run), so at
    // the tightened 540 pitch F-307's run is only 92 px long and its pill sits
    // high enough to share 13.5 px of vertical range with 2P-2-A's box. The
    // intersection has zero width, so check_symbol_clash correctly reads 0 —
    // but the pill visibly touches the panel corner. pill_dx moves the pill
    // alone and stretches the leader; the tick stays on the run (not `dx`,
    // which would carry the tick off it — FL-0008). 20 px clears the panel and
    // still leaves 30 px to the mechanical column's box at x=1328.
    // pill_dy is NOT the answer here: moving it down the run crosses the
    // level-2 line at y=3746.
    'F-307': { side: 'right', pill_dx: 20 },
    'F-310': { side: 'right' },
    'F-308': { side: 'right' },
    'F-309': { side: 'right' },
  },
  a3_text_placement: {},
  fc_pennant_placement: {},
  fc_pennant_y_nudges: {},
};

const SIDECAR_COMMENT =
  'Sidecar layout_config for the default 2500 kVA composition. Every hospital-golden ' +
  'default that names hospital designations is explicitly cleared — absent keys fall back ' +
  "to the engine's _DEF_* hospital values (schema §19), which would point floor anchors and " +
  'the level map at devices that do not exist here. Single-level composition: no level lines.';

const EMBED_COMMENT =
  'Embedded copy of default2500_layout_config.json. Embedded (not sidecar-only) so validator ' +
  'rule CV-14 runs — its capability gate reads topology.layout_config.subfeed_start_ports and ' +
  'cannot see external configs (08_validation/lib/context_V1_0_0.mjs). Sidecar keys still win ' +
  'at layout time.';

/* ---------------------------------------------------------------------------
 * Tier-3 halts. The validator exits CLEAN on a halted topology — this ledger,
 * not the exit code, is the completeness record (§2.3).
 *
 * FIVE keys — id, topic, text, nec_reference, blocks — and that shape is load-
 * bearing: 4_checks/make_open_items.mjs renders `topic` and `blocks` into the
 * OPEN_ITEMS.md table and greps `text` for placeholder markers. A halt written
 * with the older `reason`/`affects` keys still validates clean and still counts
 * 3 halts, but every column in the ledger prints `undefined`.
 * `nec_reference` is nullable — a utility or manufacturer value has no section.
 * ------------------------------------------------------------------------- */
const HALTS = [
  {
    id: 'HALT-001',
    topic: 'Utility available fault current',
    text:
      'COMPOSITOR_HALT: utility available fault current not provided (T3-EOR). No available_fc ' +
      'anywhere in this topology, therefore no A-4 fault-current tags are placed and the DV-4 ' +
      'bus-bracing / AIC check cannot run. Switchboard and panelboard AIC ratings are unset ' +
      'pending this value. Affects sw-201, d-301, r-391, r-392.',
    nec_reference: 'NEC 110.9 / 110.24',
    blocks: 'A-4 tags · DV-4 bus bracing / AIC · switchboard + panelboard AIC ratings',
  },
  {
    id: 'HALT-002',
    topic: 'Utility transformer impedance (%Z, X/R)',
    text:
      'COMPOSITOR_HALT: utility transformer impedance (%Z, X/R) is a utility-provided nameplate ' +
      'value. The transformer_impedance data layer covers dry-type distribution units only and ' +
      'has no 2500 kVA row, so pct_z / x_over_r on d-301 are left null rather than fabricated. ' +
      'Affects d-301.',
    nec_reference: null,
    blocks: 'Fault-current study at the service entrance',
  },
  {
    id: 'HALT-003',
    topic: 'Feeder distances',
    text:
      'COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation ' +
      'performed; voltage_drop_pct is absent on every R-1 and no A-5 tags are placed. ' +
      'Affects r-301, r-302, r-303, r-304.',
    nec_reference: 'NEC 210.19(A) IN / 215.2(A)(1) IN',
    blocks: 'Voltage-drop calculation · A-5 tags',
  },
];

/* ---------------------------------------------------------------------------
 * Tier-2 decisions taken by default. FOUR keys — no `blocks`, deliberately:
 * these are applied, logged and overridable by the EOR, and they do NOT gate
 * graduation. make_open_items.mjs renders them as a separate table for exactly
 * that reason. This project is the "everything defaults" case, so this list is
 * the substance of it.
 * ------------------------------------------------------------------------- */
const NOTES = [
  {
    id: 'NOTE-001',
    topic: 'Service voltage and configuration',
    text:
      '480Y/277V, 3 phase 4 wire assumed. Service size (2500 kVA) was the only stated input; ' +
      'voltage and configuration are the Tier-2 defaults for a commercial service of this size.',
    nec_reference: null,
  },
  {
    id: 'NOTE-002',
    topic: 'Occupancy and building levels',
    text:
      'Commercial occupancy, 3 storeys on a single normal-power sheet. Levels 1-3 are stated, so A-7 ' +
      'level lines are generated from layout_config.level_order and each riser panel takes its band ' +
      'from level_map.',
    nec_reference: null,
  },
  {
    id: 'NOTE-003',
    topic: 'Distribution section content',
    text:
      'One distribution section carrying three feeder breakers (CB-01 400AF/400AT power riser, ' +
      'CB-02 250AF/125AT lighting transformer, CB-03 400AF/400AT mechanical riser). No spares or ' +
      'spaces were requested and none are included.',
    nec_reference: null,
  },
  {
    id: 'NOTE-006',
    topic: 'Riser architecture — depth-1 fans, not cascading chains',
    text:
      'Both risers feed levels 2 and 3 directly from the Level-1 panel rather than cascading ' +
      '1 -> 2 -> 3, matching the golden case. Upper-floor OCPD is internal to the Level-1 panel per ' +
      'its own panel schedule. If the EOR wants a true cascading riser, that is a topology change ' +
      'and layout_config.subfeed_max_depth must be raised past 1.',
    nec_reference: null,
  },
  {
    id: 'NOTE-007',
    topic: 'Riser panel sizing',
    text:
      '4P-1-A and 4M-1-A at 400 A MLO; levels 2 and 3 at 225 A MLO on both risers. Feeder sizes are ' +
      'taken from feeder_schedule_V1_0_0.json — tag 4004 (2 sets, 3" C, (4)350 AL + #3 CU) for the ' +
      '400 A base feeds, tag 2254 (1 set, 3 1/2" C, (4)350 AL + #6 CU) for all four 225 A riser legs. ' +
      'No connected-load schedule was provided, so these are default sizes, not calculated ones.',
    nec_reference: null,
  },
  {
    id: 'NOTE-004',
    topic: '75 kVA transformer secondary OCPD',
    text:
      '250A secondary protection per 3_phase_transformer_feeder_schedule_V1_0_0.json, located in the ' +
      '2L-1-A panel main. 225A is the EOR-preference alternative. Tap conductors are protected at ' +
      'the panel main per NEC 240.21(C).',
    nec_reference: 'NEC 240.21(C)',
  },
  {
    id: 'NOTE-005',
    topic: 'No fire pump, generator, ATS or SPD',
    text:
      'None stated, and none defaulted in — emergency power is an architecture decision, not a ' +
      'Tier-2 default. If a fire pump is added later it must be tapped ahead of the main ' +
      'disconnect per NEC 695.4(B); that is non-negotiable.',
    nec_reference: 'NEC 695.4(B)',
  },
];

/* --------------------------------------------------------------------------- */

const topology = {
  $schema: 'sld_topology/v1',

  metadata: {
    schema_version: '1.0.0',
    project_name: 'Default Commercial — 2500 kVA Service',
    created_date: '2026-07-25',
    slug: SLUG,
    heading: 'Default 2500 kVA',
    facts: [
      '2500 kVA service, 480Y/277V 3PH 4W',
      'Tier-2 default composition — single lineup, one distribution section',
      '3 storeys — power riser (4P) and mechanical riser (4M), A-7 level lines on S1',
    ],
    created_by: 'AI Compositor',
    checked_by: null,
    revised_date: null,
    nec_edition: '2023',
    sheet_template: '30x42',
    px_per_inch: 96,
    data_layer_versions: {
      sld_sheet_templates: 'V1_0_0',
      feeder_schedule: 'V1_0_0',
      '3_phase_transformer_feeder_schedule': 'V1_0_0',
      transformer_impedance: 'V1_0_0',
      equipment_designation_legend: 'V1_0_0',
      nec_standard_ratings: 'V1_0_0',
    },
    compositor_halts: HALTS,
    compositor_notes: NOTES,
  },

  sheets: [
    { sheet_id: 'S1', sheet_number: 'E-501', title: 'MAIN SINGLE-LINE DIAGRAM — NORMAL POWER' },
  ],

  devices: [
    // L0 service entrance. FLA at 2500 kVA / 480 V / 3Φ = 3007 A.
    {
      id: 'd-301',
      node_type: 'L0-1',
      designation: 'UTILITY-XFMR',
      sheet_id: 'S1',
      data_fields: {
        kva_rating: 2500,
        primary_voltage: '13.2kV',
        secondary_voltage: '480Y/277V',
        phases: 3,
        wires: 4,
      },
      // HALT-002: utility nameplate values, not fabricated.
      calc_fields: { pct_z: null, x_over_r: null },
    },
    // L1 metering — Tier-1 auto-include, utility meter cannot be suppressed.
    { id: 'd-302', node_type: 'L1-4', designation: 'UTIL-MTR', sheet_id: 'S1', data_fields: { meter_type: 'utility' } },
    // GFP main — Tier-1 auto-include at ≥1000 A, NEC 230.95.
    {
      id: 'd-303',
      node_type: 'L1-1',
      designation: 'MAIN-GFP',
      sheet_id: 'S1',
      data_fields: { af: 4000, at: 3000, poles: 3, trip_type: 'LSIG' },
    },
    // N-G bond, NEC 250.24(C). MUST sit in a `distribution` section — an L1-3 in
    // an `incoming` section is DROPPED at layout, reported only in layout_warnings.
    { id: 'd-304', node_type: 'L1-3', designation: 'NG-BOND', sheet_id: 'S1', data_fields: { sds: 'service_entrance' } },
    // Distribution breakers — Tier-2 default: one section, two feeders, no spares.
    {
      id: 'd-305',
      node_type: 'L2-1',
      designation: 'CB-01',
      sheet_id: 'S1',
      // 250 AT is the 150 kVA primary OCPD from
      // 3_phase_transformer_feeder_schedule_V1_0_0.json (kva 150 -> primary 250 A 3P,
      // one_line_tag 2503). Not a chosen value.
      data_fields: { af: 400, at: 250, poles: 3, trip_type: 'LSI' },
    },
    {
      id: 'd-306',
      node_type: 'L2-1',
      designation: 'CB-02',
      sheet_id: 'S1',
      data_fields: { af: 250, at: 125, poles: 3, trip_type: 'LSI' },
    },
    // Chain B — Transformer + Panel. 150 kVA step-down feeding the 208 V riser.
    // %Z / X-R are midpoints from transformer_impedance_V1_0_0.json (150 kVA,
    // 480D -> 208Y/120: %Z 4.2-4.5 mid 4.35, X/R 2.8-3.1 mid 2.95).
    {
      id: 'd-307',
      node_type: 'L2-2',
      designation: '4T-2-A',
      sheet_id: 'S1',
      // ⚠️ NO spaces around the dash — this matches the golden's own notation
      // ('480Δ-208Y/120V', 14 chars). The project inherited a 16-char spaced
      // form from the pre-delete flat topology, which is a house-style
      // divergence AND 14.4 px of extra label. With the two transformer columns
      // adjacent (R-009 order) the engine's 190 px pitch left the spaced label
      // only 17.6 px from the neighbouring symbol and --audit read
      // `glyph_collision 1`; the correct notation clears it to 32 px.
      data_fields: { kva: 150, config: '480\u0394-208Y/120V' },
      calc_fields: { pct_z: 4.35, x_over_r: 2.95 },
    },
    // Chain B — Transformer + Panel. %Z / X-R are midpoints from
    // transformer_impedance_V1_0_0.json (dry-type rows exist for 75 kVA).
    {
      id: 'd-308',
      node_type: 'L2-2',
      designation: '4T-1-A',
      sheet_id: 'S1',
      // Same house-style notation as 4T-2-A above. THIS is the label that
      // actually collided: 4T-1-A is the WESTMOST transformer, so its label
      // block is the one running east into its neighbour's symbol.
      data_fields: { kva: 75, config: '480Δ-208Y/120V' },
      calc_fields: { pct_z: 4.45, x_over_r: 2.25 },
    },
    // 250 A secondary OCPD lives in the panel main — NEC 240.21(C).
    {
      id: 'd-309',
      node_type: 'L2-4',
      designation: '2L-1-A',
      sheet_id: 'S1',
      data_fields: { rating: '250A', voltage: '208Y/120V', mcb: true },
    },
    // Mechanical riser breaker.
    {
      id: 'd-310',
      node_type: 'L2-1',
      designation: 'CB-03',
      sheet_id: 'S1',
      data_fields: { af: 400, at: 400, poles: 3, trip_type: 'LSI' },
    },
    // 208 V riser, Level 1 head. The 150 kVA secondary OCPD is 500 A
    // (transformer feeder schedule, one_line_tag 5004T) and it lives in THIS
    // panel's main, which is what protects the secondary tap conductors —
    // NEC 240.21(C). Hence MCB, not MLO.
    {
      id: 'd-311',
      node_type: 'L2-4',
      designation: '2P-1-A',
      sheet_id: 'S1',
      data_fields: { rating: '500A', voltage: '208Y/120V', mcb: true },
    },
    // Plug-load panels, levels 2 and 3. ⚠️ These CASCADE — 2P-1-A -> 2P-2-A ->
    // 2P-3-A — unlike the mechanical riser's depth-1 fan and unlike anything in
    // the golden case. Upper-floor OCPD is internal to each parent panel per its
    // own panel schedule. This is why subfeed_max_depth is 3.
    {
      id: 'd-312',
      node_type: 'L2-4',
      designation: '2P-2-A',
      sheet_id: 'S1',
      data_fields: { rating: '225A', voltage: '208Y/120V', mlo: true },
    },
    {
      id: 'd-316',
      node_type: 'L2-4',
      designation: '2P-3-A',
      sheet_id: 'S1',
      data_fields: { rating: '225A', voltage: '208Y/120V', mlo: true },
    },
    // Mechanical riser, levels 1-3. 4M-1-A is the base-floor anchor and the
    // parent of the level 2/3 fan.
    {
      id: 'd-313',
      node_type: 'L2-4',
      designation: '4M-1-A',
      sheet_id: 'S1',
      data_fields: { rating: '400A', voltage: '480Y/277V', mlo: true },
    },
    {
      id: 'd-314',
      node_type: 'L2-4',
      designation: '4M-2-A',
      sheet_id: 'S1',
      data_fields: { rating: '225A', voltage: '480Y/277V', mlo: true },
    },
    {
      id: 'd-315',
      node_type: 'L2-4',
      designation: '4M-3-A',
      sheet_id: 'S1',
      data_fields: { rating: '225A', voltage: '480Y/277V', mlo: true },
    },
  ],

  // Three-object edges: Device A → Routed Element → Device B. No implicit lines.
  routed_elements: [
    {
      id: 'r-301',
      edge_type: 'R-1',
      designation: 'F-301',
      sheet_id: 'S1',
      start: { device_id: 'd-301', port: 'secondary_out' },
      end: { device_id: 'd-303', port: 'line_in' },
      stub_exempt: false,
      data_fields: { is_service_entrance: true },
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '500',
        conductors_per_phase: 4,
        neutral_size: '500',
        ground_size: '500',
        ground_material: 'AL',
        conduit_type: 'EMT',
        conduit_size: '4"',
        num_sets: 11,
      },
      annotation_ids: ['a-601'],
    },
    // 150 kVA transformer PRIMARY. 250 A 3-wire (delta primary, no neutral) =
    // feeder_schedule tag 2503: 1 set, 2 1/2" C, (3)350 AL + #4 CU.
    {
      id: 'r-302',
      edge_type: 'R-1',
      designation: 'F-302',
      sheet_id: 'S1',
      start: { device_id: 'd-305', port: 'line_in' },
      end: { device_id: 'd-307', port: 'primary_in' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '350',
        conductors_per_phase: 3,
        neutral_size: null,
        ground_size: '4',
        ground_material: 'CU',
        conduit_type: 'EMT',
        conduit_size: '2 1/2"',
        num_sets: 1,
      },
      annotation_ids: ['a-602', 'a-603'],
    },
    {
      id: 'r-303',
      edge_type: 'R-1',
      designation: 'F-303',
      sheet_id: 'S1',
      start: { device_id: 'd-306', port: 'line_in' },
      end: { device_id: 'd-308', port: 'primary_in' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '2/0',
        conductors_per_phase: 3,
        neutral_size: null,
        ground_size: '6',
        ground_material: 'CU',
        conduit_type: 'EMT',
        conduit_size: '1 1/2"',
        num_sets: 1,
      },
      annotation_ids: ['a-604', 'a-605'],
    },
    {
      id: 'r-304',
      edge_type: 'R-1',
      designation: 'F-304T',
      sheet_id: 'S1',
      start: { device_id: 'd-308', port: 'secondary_out' },
      end: { device_id: 'd-309', port: 'feed_top' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '500',
        conductors_per_phase: 4,
        neutral_size: '500',
        ground_size: '2',
        ground_material: 'CU',
        conduit_type: 'EMT',
        conduit_size: '3 1/2"',
        num_sets: 1,
      },
      annotation_ids: ['a-606', 'a-607'],
    },
    // Mechanical riser base feed. 400 A 4-wire = tag 4004 in
    // feeder_schedule_V1_0_0.json: 2 sets, 3" min conduit, (4)350 AL + #3 CU.
    {
      id: 'r-305',
      edge_type: 'R-1',
      designation: 'F-305',
      sheet_id: 'S1',
      start: { device_id: 'd-310', port: 'line_in' },
      end: { device_id: 'd-313', port: 'feed_top' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '350',
        conductors_per_phase: 4,
        neutral_size: '350',
        ground_size: '3',
        ground_material: 'CU',
        conduit_type: 'EMT',
        conduit_size: '3"',
        num_sets: 2,
      },
      annotation_ids: ['a-608', 'a-609'],
    },

    // ── 208 V PLUG-LOAD CASCADE (power) ─────────────────────────────────────
    // 4T-2-A secondary -> 2P-1-A (L1) -> 2P-2-A (L2) -> 2P-3-A (L3).
    // ⚠️ This is a true CASCADE, two hops deep — the first in this repo. The
    // golden only ever fans at depth 1, which is why subfeed_max_depth must be
    // raised past the chain depth (1 places nothing).
    // Exits are feed_top throughout: the child is always on a HIGHER floor, and
    // a feed_bottom exit would make each run dive 90 px below its parent and
    // hook back up — the dive whose jog corridor trapped the A-1 pills before.
    //
    // 150 kVA SECONDARY: 500 A 4-wire = transformer-schedule one_line_tag 5004T,
    // feeder_type 5004 -> 2 sets, 3 1/2" C, (4)500 AL + #3 CU. The 500 A OCPD
    // itself sits in 2P-1-A's main (NEC 240.21(C)); bonding jumper #2 AWG.
    {
      id: 'r-306',
      edge_type: 'R-1',
      designation: 'F-306',
      sheet_id: 'S1',
      start: { device_id: 'd-307', port: 'secondary_out' },
      end: { device_id: 'd-311', port: 'feed_top' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '500',
        conductors_per_phase: 4,
        neutral_size: '500',
        ground_size: '3',
        ground_material: 'CU',
        conduit_type: 'EMT',
        conduit_size: '3 1/2"',
        num_sets: 2,
      },
      annotation_ids: ['a-610', 'a-611'],
    },
    // Cascade hop 1 — L1 -> L2. 225 A 4-wire = tag 2254.
    {
      id: 'r-307',
      edge_type: 'R-1',
      designation: 'F-307',
      sheet_id: 'S1',
      start: { device_id: 'd-311', port: 'feed_top' },
      end: { device_id: 'd-312', port: 'feed_bottom' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '350',
        conductors_per_phase: 4,
        neutral_size: '350',
        ground_size: '6',
        ground_material: 'CU',
        conduit_type: 'EMT',
        conduit_size: '3 1/2"',
        num_sets: 1,
      },
      annotation_ids: ['a-612', 'a-613'],
    },
    // Cascade hop 2 — L2 -> L3. The hop the golden has no equivalent of.
    {
      id: 'r-310',
      edge_type: 'R-1',
      designation: 'F-310',
      sheet_id: 'S1',
      start: { device_id: 'd-312', port: 'feed_top' },
      end: { device_id: 'd-316', port: 'feed_bottom' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '350',
        conductors_per_phase: 4,
        neutral_size: '350',
        ground_size: '6',
        ground_material: 'CU',
        conduit_type: 'EMT',
        conduit_size: '3 1/2"',
        num_sets: 1,
      },
      annotation_ids: ['a-618', 'a-619'],
    },

    // ── MECHANICAL riser — also a CASCADE (4M-1-A -> 4M-2-A -> 4M-3-A) ──────
    // Originally a depth-1 fan mirroring the golden, converted 2026-07-28 (R-008).
    // A fan puts TWO exits on one panel top, and that geometry cannot be made
    // clean here at any setting: exits close together make F-308's A-1 tick
    // (drawn +/-10 px across its own line) touch F-309, while exits far enough
    // apart shrink F-309's dogleg below its own 76 px pill. Widening the dogleg
    // eastward is blocked outright — x=1345 is the LIGHTING column (2L-1-A /
    // 4T-1-A), and pushing 4M-3-A there ran F-309 straight through 2L-1-A's box
    // and collinear with F-304T. Cascading gives each panel a single exit, so
    // every hop is plumb and no jog corridor exists at all.
    {
      id: 'r-308',
      edge_type: 'R-1',
      designation: 'F-308',
      sheet_id: 'S1',
      start: { device_id: 'd-313', port: 'feed_top' },
      end: { device_id: 'd-314', port: 'feed_bottom' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '350',
        conductors_per_phase: 4,
        neutral_size: '350',
        ground_size: '6',
        ground_material: 'CU',
        conduit_type: 'EMT',
        conduit_size: '3 1/2"',
        num_sets: 1,
      },
      annotation_ids: ['a-614', 'a-615'],
    },
    {
      id: 'r-309',
      edge_type: 'R-1',
      designation: 'F-309',
      sheet_id: 'S1',
      start: { device_id: 'd-314', port: 'feed_top' },
      end: { device_id: 'd-315', port: 'feed_bottom' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL',
        conductor_size: '350',
        conductors_per_phase: 4,
        neutral_size: '350',
        ground_size: '6',
        ground_material: 'CU',
        conduit_type: 'EMT',
        conduit_size: '3 1/2"',
        num_sets: 1,
      },
      annotation_ids: ['a-616', 'a-617'],
    },

    // Buses. r-39x band is kept clear of the feeder allocator (SCHEMA-8): a bus id
    // colliding with an R-1 makes a bus tap resolve to the feeder.
    {
      id: 'r-391',
      edge_type: 'R-2',
      designation: 'main-bus-4MSB-1-A',
      sheet_id: 'S1',
      bus_level: 'main',
      stroke_weight: 2.5,
      start: null,
      end: null,
      stub_exempt: null,
      data_fields: {},
      calc_fields: { bus_rating: 4000 },
      annotation_ids: [],
    },
    {
      id: 'r-392',
      edge_type: 'R-2',
      designation: 'sec-bus-4MSB-1-A',
      sheet_id: 'S1',
      bus_level: 'secondary',
      stroke_weight: 2,
      start: null,
      end: null,
      stub_exempt: null,
      data_fields: {},
      calc_fields: { bus_rating: 3000 },
      annotation_ids: [],
    },
  ],

  // A-1 / A-2 on every non-stub-exempt R-1 is a Tier-1 auto-include. The service
  // lateral is TV-1-exempt and carries the A-2 alone, which is why its callout is
  // the one that draws inline.
  annotations: [
    { id: 'a-601', annotation_type: 'A-2', bound_to: 'r-301', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '(11) 4"C - (4)500 AL + 500 AL GND' } },
    { id: 'a-602', annotation_type: 'A-1', bound_to: 'r-302', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2503' } },
    { id: 'a-603', annotation_type: 'A-2', bound_to: 'r-302', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '2 1/2"C - (3)350 AL + #4 CU GND' } },
    { id: 'a-604', annotation_type: 'A-1', bound_to: 'r-303', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1253' } },
    { id: 'a-605', annotation_type: 'A-2', bound_to: 'r-303', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '1 1/2"C - (3)#2/0 AL + #6 CU GND' } },
    { id: 'a-606', annotation_type: 'A-1', bound_to: 'r-304', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2504T' } },
    { id: 'a-607', annotation_type: 'A-2', bound_to: 'r-304', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)500 AL + #2 CU SBJ' } },
    // Mechanical riser base feed.
    { id: 'a-608', annotation_type: 'A-1', bound_to: 'r-305', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '4004' } },
    { id: 'a-609', annotation_type: 'A-2', bound_to: 'r-305', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '(2) 3"C - (4)350 AL + #3 CU GND' } },
    // 150 kVA secondary + the 208 V plug-load cascade.
    { id: 'a-610', annotation_type: 'A-1', bound_to: 'r-306', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '5004T' } },
    { id: 'a-611', annotation_type: 'A-2', bound_to: 'r-306', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '(2) 3 1/2"C - (4)500 AL + #2 CU SBJ' } },
    { id: 'a-612', annotation_type: 'A-1', bound_to: 'r-307', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2254' } },
    { id: 'a-613', annotation_type: 'A-2', bound_to: 'r-307', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)350 AL + #6 CU GND' } },
    { id: 'a-618', annotation_type: 'A-1', bound_to: 'r-310', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2254' } },
    { id: 'a-619', annotation_type: 'A-2', bound_to: 'r-310', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)350 AL + #6 CU GND' } },
    // Mechanical riser fan.
    { id: 'a-614', annotation_type: 'A-1', bound_to: 'r-308', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2254' } },
    { id: 'a-615', annotation_type: 'A-2', bound_to: 'r-308', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)350 AL + #6 CU GND' } },
    { id: 'a-616', annotation_type: 'A-1', bound_to: 'r-309', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2254' } },
    { id: 'a-617', annotation_type: 'A-2', bound_to: 'r-309', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)350 AL + #6 CU GND' } },
  ],

  // ONE switchboard per sheet — renderSheet scopes the whole lineup region to the
  // first match, so a second board on S1 would render nothing.
  switchboards: [
    {
      id: 'sw-201',
      designation: '4MSB-1-A',
      variant: 'NP',
      bus_architecture: 'two-level',
      sheet_id: 'S1',
      data_fields: { rating: '4000A', voltage: '480Y/277V', wires: '4W, 3PH' },
      secondary_bus_overflow_ids: [],
      main_bus_id: 'r-391',
      secondary_bus_id: 'r-392',
      distribution_bus_id: null,
    },
  ],

  sections: [
    { id: 'sec-201', switchboard_id: 'sw-201', type: 'incoming', order: 1, nec_class: null, section_tag: 'SEC-1', device_ids: [] },
    { id: 'sec-202', switchboard_id: 'sw-201', type: 'metering', order: 2, nec_class: null, section_tag: 'SEC-2', device_ids: ['d-302'] },
    { id: 'sec-203', switchboard_id: 'sw-201', type: 'main_breaker', order: 3, nec_class: null, section_tag: 'SEC-3', device_ids: ['d-303'] },
    // Breaker order is left-to-right on the bus and is a pure drafting choice —
    // all three are the same class, so nothing electrical constrains it.
    // Requested order (R-009): LIGHTING, then POWER, then MECHANICAL.
    // ⚠️ This puts the two Chain-B TRANSFORMER columns adjacent (4T-1-A lighting
    // beside 4T-2-A power), which is the arrangement that tripped
    // `glyph_collision` in R-007 — --audit bounds a glyph INCLUDING its label
    // block, and a transformer's 3-line label needs ~174 px centre-to-centre to
    // clear its neighbour's symbol. See the lane check in R-009.
    // The N-G bond stays last.
    { id: 'sec-204', switchboard_id: 'sw-201', type: 'distribution', order: 4, nec_class: null, section_tag: 'SEC-4', device_ids: ['d-306', 'd-305', 'd-310', 'd-304'] },
  ],

  port_assignments: [
    { id: 'pa-301', device_id: 'd-303', port: 'line_in', bus_id: 'r-391' },
    { id: 'pa-302', device_id: 'd-303', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-303', device_id: 'd-305', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-304', device_id: 'd-306', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-305', device_id: 'd-310', port: 'bus_out', bus_id: 'r-392' },
  ],

  spur_attachments: [],

  measurement_attachments: [
    { id: 'meas-301', device_id: 'd-302', host_routed_element_id: 'r-391', mode: 'ct', position: 'incoming_section' },
  ],

  cross_sheet_refs: [],

  layout_config: { $comment: EMBED_COMMENT, ...LAYOUT_CONFIG },
};

/* --------------------------------------------------------------------------- */

fs.mkdirSync(OUT, { recursive: true });

const cfgPath = path.join(OUT, `${SLUG}_layout_config.json`);
const topoPath = path.join(OUT, `${SLUG}_SLD_topology_V1_0_0.json`);

fs.writeFileSync(cfgPath, JSON.stringify({ $comment: SIDECAR_COMMENT, ...LAYOUT_CONFIG }, null, 2) + '\n');
fs.writeFileSync(topoPath, JSON.stringify(topology, null, 2) + '\n');

const n = (k) => topology[k].length;
console.log(`  wrote ${path.basename(cfgPath)}`);
console.log(`  wrote ${path.basename(topoPath)}`);
console.log(
  `  sheets=${n('sheets')} devices=${n('devices')} routed=${n('routed_elements')} ` +
    `annotations=${n('annotations')} switchboards=${n('switchboards')} sections=${n('sections')} ` +
    `halts=${topology.metadata.compositor_halts.length}`
);
