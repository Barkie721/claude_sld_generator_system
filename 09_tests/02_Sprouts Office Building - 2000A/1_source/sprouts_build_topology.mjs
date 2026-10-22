#!/usr/bin/env node
/**
 * sprouts_build_topology.mjs — the ONLY hand-edited file in this project.
 *
 * Sprouts Office Building: 50,000 SF, 4 storeys + roof, 2000 A / 480Y-277V
 * service. No fire pump, no emergency system. Composed from Mayo's verbal scope
 * of 2026-07-28; every assumption is itemised in
 * 1_source/sprouts_SLD_narrative_V1_0_0.md and in metadata.compositor_notes[].
 *
 * Writes two files into 2_build/:
 *   sprouts_layout_config.json        the sidecar (sidecar keys win at layout time)
 *   sprouts_SLD_topology_V1_0_0.json  topology with an EMBEDDED copy of the same config
 *
 * Both copies are deliberate. CV-14's capability gate reads only
 * topology.layout_config.subfeed_start_ports and cannot see a sidecar —
 * embedded-only is how a run silently drops to 55 rules instead of 63.
 *
 * ID ranges are rebased off the hospital golden (schema §16): d-3xx / r-3xx /
 * r-39x buses / a-6xx / sw-2xx / sec-2xx / pa-3xx / meas-3xx. Starting at d-001
 * trips golden-keyed special cases.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '2_build');
const SLUG = 'sprouts';

/* ---------------------------------------------------------------------------
 * layout_config
 *
 * FOUR riser stacks cascade up this building — lighting (4L), plug A (2P-x-A),
 * plug B (2P-x-B) and 208 V mechanical (2M). A `normal` sheet floor-bands only
 * TWO *named* stacks (floor_anchors + floor_anchors_mechanical), so the two plug
 * stacks go in floor_band_designations (OFF-009).
 *
 * Every hospital-named key is CLEARED EXPLICITLY. Absent keys fall back to the
 * engine's _DEF_* golden values, which anchor the drawing to devices that do not
 * exist here.
 * ------------------------------------------------------------------------- */
const LAYOUT_CONFIG = {
  sheet_roles: { S1: 'normal' },
  sheet_skips: {},

  // ⚠️ OBJECT FORM, NOT A FLAT ARRAY. _sheetFloorStackBottomUp (which drives the
  // level-line pitch walk and the A-7 draw list) reads ONLY the object form and
  // silently falls back to the literal hospital stack ['1','2','3','R'] for
  // anything else. Index 0 is the TOP of the stack.
  floor_order: { S1: ['R', '4', '3', '2', '1'] },

  // Named stack 1 — the lighting riser, plus the roof row anchored on the
  // rooftop mechanical panel (the only equipment standing on the roof row).
  floor_anchors: { R: '4M-R-A', 4: '4L-4-A', 3: '4L-3-A', 2: '4L-2-A', 1: '4L-1-A' },
  // Named stack 2 — the 208 V mechanical riser. No roof entry: 2M-R-A is fed off
  // 4M-R-A's internal chain, not off this cascade.
  //
  // ⚠️ THE FLOOR-1 ENTRY IS MANDATORY, AND IT MUST BE THE FLOOR-1 PANEL (R-005).
  // The mech walk is POSITIONAL, not keyed:
  //   mechFloorsBottomUp = floorsBottomUp.filter(f => _FA_MECH[f] !== undefined)
  // and then `idx > 0` accumulates one storey step (engine L11256-L11273). It
  // baselines whatever its LOWEST PRESENT floor is at the Level-1 row — so
  // dropping the floor-1 entry does not "skip" that floor, it slides the WHOLE
  // stack down one storey and puts 2M-2-A on the Level-1 row. Measured on a
  // trial run, not reasoned: 2M-4-A landed at y 2858, the Level-3 row.
  floor_anchors_mechanical: { 4: '2M-4-A', 3: '2M-3-A', 2: '2M-2-A', 1: '2M-1-A' },
  // OFF-009 — stacks 3 and 4. Both plug risers, which are neither of the two
  // named anchor stacks and would otherwise not floor-band at all.
  floor_band_designations: [
    '2P-1-A', '2P-2-A', '2P-3-A', '2P-4-A',
    '2P-1-B', '2P-2-B', '2P-3-B', '2P-4-B',
  ],

  // Band membership. Riser panels + the two Level-1/roof 480 V mechanical panels
  // ONLY. The four L2-2 transformers stay out — a mapped device drags its level
  // line down (lineY = maxBottom + margin), and a transformer sits above the
  // panel it feeds, not on that panel's row. L0-1 / L1-1 / L1-3 / L1-4 are
  // excluded by the engine's own LEVEL_EXCLUDE_TYPES, so the utility TX, main,
  // N-G bond and meter need no entry. BLR-1 (L3-3) is a terminal load hanging
  // off the switchboard, not a floor-banded panel.
  level_map: {
    '4L-1-A': '1', '4L-2-A': '2', '4L-3-A': '3', '4L-4-A': '4',
    '2P-1-A': '1', '2P-2-A': '2', '2P-3-A': '3', '2P-4-A': '4',
    '2P-1-B': '1', '2P-2-B': '2', '2P-3-B': '3', '2P-4-B': '4',
    '2M-1-A': '1', '2M-2-A': '2', '2M-3-A': '3', '2M-4-A': '4',
    '4M-1-A': '1',
    '4M-R-A': 'R', '2M-R-A': 'R',
  },
  level_order: ['R', '4', '3', '2', '1'],   // top (lowest Y) to bottom (highest Y)

  ats_xoffset_overrides: {},

  // Floor-to-floor riser pitch. Starting from the value the default 2500 kVA
  // composition settled on (R-011) rather than the engine's 1200, because this
  // building is a storey taller and a 1200 pitch would put five rows plus the
  // roof step well past a single sheet.
  riser_step_standard: 650,
  riser_step_roof: 1460,   // engine default; roof -> Level 4 step

  // ⚠️ MUST EXCEED the deepest chain, and 1 places NOTHING beyond the first hop.
  // The lighting and plug risers cascade THREE hops (L1 -> L2 -> L3 -> L4). The
  // 208 V mechanical riser is FIVE, because its transformer chain is placed by
  // this same pass: 4M-1-A -> 4T-2-A -> 2M-1-A -> 2M-2-A -> 2M-3-A -> 2M-4-A.
  subfeed_max_depth: 5,
  // 'secondary_out' + the L2-2 src/dst types are what let a transformer chain
  // ride the sub-feed pass instead of the internal-chain pass. See the r-317
  // note in routed_elements: placeSubFeeds (engine L14969) runs BEFORE
  // placeInternalChains (L14975), so anything hanging off an internal chain is
  // invisible to the sub-feed scan and silently drops.
  subfeed_start_ports: ['feed_bottom', 'feed_top', 'secondary_out'],
  subfeed_src_types: ['L2-4', 'L2-2'],
  subfeed_dst_types: ['L2-4', 'L2-2'],

  // OFF-027 — straighten every cascade hop into one plumb column. Without this
  // each hop drifts ~100 px west per level and draws a 4-vertex dogleg, which
  // with four parallel risers on one sheet would interleave the columns.
  //
  // ⚠️ F-317 IS STRAIGHTENED, F-318 IS DELIBERATELY NOT (R-012, R-005).
  //
  // F-317 straightened snaps 4T-2-A plumb under 4M-1-A, so the primary feeder
  // draws as ONE straight vertical instead of a down-west-down Z. This only
  // became possible after F-316 was Z-routed (chain_dst_x_offset below): before
  // that, the space under 4M-1-A was exactly where its own feeder rose from the
  // bus, and a plumb transformer sat in that corridor.
  //
  // F-318 must NOT be straightened. A transformer chain riding the SUB-FEED pass
  // exits `secondary_out` by dropping ~90 px below the unit before it routes —
  // unlike a true Chain-B secondary, which leaves the transformer cleanly
  // (compare r-307/r-312, both 2-vertex verticals {4288 → 3886}). 2M-1-A sits
  // ABOVE its own transformer, so that drop has to come back up. STRAIGHTENED,
  // the down-leg and the up-leg share one X: 90 px of the feeder doubles on
  // itself and the run cuts through its own transformer. UNSTRAIGHTENED, the
  // child lands ~118 px west and the run reads as a plain Z with its two
  // verticals in different columns.
  subfeed_straighten: [
    'F-303', 'F-304', 'F-305',            // lighting
    'F-308', 'F-309', 'F-310',            // plug A
    'F-313', 'F-314', 'F-315',            // plug B
    'F-317',                              // 45 kVA TX plumb under 4M-1-A
    'F-319', 'F-320', 'F-321',            // 208 V mechanical riser (above 2M-1-A)
  ],

  // OFF-018 — both entries move a feeder's EXIT only (neither is straightened,
  // so the child's landing does not follow).
  //
  // F-317: the engine's default sub-feed exit offset is -35 against a 32 px box
  // half-width, so the feeder left 4M-1-A 3 px outside its own box. +5 returns it
  // inside the edge.
  //
  // F-318: a TAG problem solved as a GEOMETRY problem (R-011). Its A-1 tick lands
  // on the horizontal jog leg and the engine places the pill directly above that
  // leg — the correct treatment for a horizontal run. But the leg was 88 px
  // between two verticals that are BOTH live at pill height (x 768 y 4401-4491,
  // x 680 y 4246-4491) and the pill is 76 px wide: 6 px of clearance a side, so
  // it grazed its own run wherever along the leg it sat. Sliding cannot fit a
  // 76 px pill into an 88 px slot. +30 walks the exit east along 4T-2-A's bottom
  // edge — still inside the 755..805 box — stretching the leg to ~118 px so the
  // DEFAULT pill placement fits with ~21 px a side and needs no tag override.
  subfeed_exit_x_nudge: { 'F-317': 5, 'F-318': 30 },

  // OFF-016 — Z-ROUTE 4M-1-A'S OWN FEEDER OFF ITS BREAKER COLUMN.
  //
  // This is the only fix for the label clash (R-004). A sub-feed transformer
  // always lands ~100 px west of its
  // parent, and an L2-2 label block always starts 8 px east of the symbol and
  // runs ~100 px — so the label always spans `parent_centre − 67 .. + 33` while
  // the parent's own riser sits at `parent_centre`. The label crosses that riser
  // by ~33 px at EVERY possible column spacing; no amount of lineup reordering
  // or extra bus slots moves them relative to each other.
  //
  // Moving the panel off its breaker X breaks the coincidence: the feeder now
  // rises in the empty breaker lane, turns at jog_y and lands from the side.
  // dx grew -100 → -180 in R-012: with 4T-2-A snapped plumb under 4M-1-A its
  // label block moved east with it and ran back into F-316's own riser at the
  // breaker column. -180 walks the whole branch west far enough to clear it.
  // jog_y sits ABOVE the transformer (4300 vs the transformer's 4366 top) so the
  // short final vertical never descends into the label band at all.
  // ⚠️ jog_y MUST be stated — its default is topY-100, which lands inside the
  // switchboard band.
  chain_dst_x_offset: { 'F-316': { dx: -180, jog_y: 4300 } },

  s2_level_line_pitch: {},
  s2_shift_delta: {},
  subfeed_midy_nudge: {},

  // ⚠️ NO `pill_dx` ANYWHERE, DELIBERATELY (R-011).
  //
  // An earlier pass cleared this cluster's tag clashes with pill_dx on F-317 and
  // F-318 and called it done because stage 11 read zero. That was wrong. pill_dx
  // displaces the pill ACROSS its run and stretches the leader to reach it, while
  // the A-1 spec fixes `leader_length` at 32 px square to the run — so driving
  // the clash counter to zero necessarily pushed both tags off spec, one of them
  // onto the wrong side of its own run. check_tag_feeder_clash has no opinion
  // about leader length, leader angle, or which side a tag sits on, so it read
  // clean while the tags were visibly non-standard. Mayo caught it by eye. The
  // checker is a net, not the target.
  //
  // Both clashes are now resolved in the GEOMETRY instead — F-318 by lengthening
  // its jog leg (subfeed_exit_x_nudge above), F-317 by sliding its tag ALONG its
  // own run below. Every pill on the sheet is at its engine-default offset.
  //
  // R-009: every feeder tag sits on the RIGHT (east) of its run so the sheet
  // reads uniformly. F-323's "503" on the roof chain defaulted WEST while its own
  // neighbour "1004T", 400 px above it on the same run, sat east. `side` works
  // there because an internal-chain tag renders through renderR1Tags.
  //
  // F-317 carries NO override at all now. It briefly had `dx: -25` to slide its
  // tag along what was then a horizontal jog leg; straightening the feeder
  // (R-012) turned that leg into a plain vertical, and the same offset then slid
  // the tag ACROSS the run and detached its tick — FL-0008, caught immediately by
  // check_tick_detach at stage 12b (tick_detached 1). Removed. A tag override is
  // only ever valid for the run shape it was measured against.
  a1_tag_placement: {
    'F-323': { side: 'right' },
  },
  a3_text_placement: {},
  // ⚠️ Deliberately empty. The utility transformer's A-4 pennant reads as a
  // stage-11 HARD clash against F-301 (gap -2.0 px), but that is BY DESIGN and
  // must not be "fixed" here: the engine carries a golden-keyed special case on
  // the literal designation 'UTILITY-XFMR' (FC_PENNANT_PLACEMENT, engine L10058)
  // that anchors the pennant apex ON the secondary feeder drop, because the
  // secondary side is the canonical point-of-fault location — 45,229 A is the
  // value downstream of the transformer impedance, not upstream of it. The apex
  // sitting on its own run is the same intentional geometry as an A-1 tick, and
  // check_tag_feeder_clash has no exclusion for it.
  // Overriding to {anchor:'top'} would clear the finding and put the pennant on
  // the PRIMARY side, which would be electrically misleading. Left as-is.
  //
  // 2M-1-A is a different matter — its default right-of-panel pennant lands 3.9
  // px off F-318's run in the tight staircase pocket. 'left-mirror' anchors it
  // at the panel's mid-left edge sweeping up-left, into open margin, and says
  // nothing misleading about where the fault is measured.
  fc_pennant_placement: {
  },
  // Engine-side this only reaches L3-1/L3-3 pennants (engine L13980), so it
  // cannot move the L0-1 pennant above in any case.
  fc_pennant_y_nudges: {},
};

const SIDECAR_COMMENT =
  'Sidecar layout_config for the Sprouts Office Building. Four cascading riser stacks on one ' +
  'normal sheet: lighting + 208V mechanical take the two named anchor stacks, both plug risers ' +
  'go in floor_band_designations (OFF-009). Every hospital-golden default that names hospital ' +
  "designations is explicitly cleared — absent keys fall back to the engine's _DEF_* hospital " +
  'values (schema §19), which would point floor anchors and the level map at devices that do not ' +
  'exist here.';

const EMBED_COMMENT =
  'Embedded copy of sprouts_layout_config.json. Embedded (not sidecar-only) so validator rule ' +
  'CV-14 runs — its capability gate reads topology.layout_config.subfeed_start_ports and cannot ' +
  'see external configs (08_validation/lib/context_V1_0_0.mjs). Sidecar keys still win at layout time.';

/* ---------------------------------------------------------------------------
 * Tier-3 halts. The validator exits CLEAN on a halted topology — this ledger,
 * not the exit code, is the completeness record (§2.3).
 *
 * FIVE keys — id, topic, text, nec_reference, blocks — and that shape is load-
 * bearing: 4_checks/make_open_items.mjs renders `topic` and `blocks` into the
 * OPEN_ITEMS.md table. `nec_reference` is nullable.
 * ------------------------------------------------------------------------- */
const HALTS = [
  {
    id: 'HALT-001',
    topic: 'Feeder distances',
    text:
      'COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation ' +
      'performed; voltage_drop_pct is absent on every R-1 and no A-5 tags are placed. Fault ' +
      'current downstream of the main switchboard bus is likewise NOT attenuated for feeder ' +
      'impedance — the 45.2 kA bus value is a conservative bound for every 480 V device below ' +
      'it, not a calculated per-device value. Affects r-302 through r-325.',
    nec_reference: 'NEC 210.19(A) IN / 215.2(A)(1) IN',
    blocks: 'Voltage-drop calculation · A-5 tags · per-device 480 V fault current',
  },
  {
    id: 'HALT-002',
    topic: 'Utility fault current + transformer impedance — DERIVED, not confirmed',
    text:
      'COMPOSITOR_HALT: the utility available fault current and the 2000 kVA transformer nameplate ' +
      'impedance were not provided. Per Mayo’s instruction they were DERIVED on a stated ' +
      'worst-case basis rather than left null: assumed %Z 5.75 for a 2000 kVA liquid-filled ' +
      'pad-mount, less the IEEE C57.12.00 -7.5% manufacturing tolerance = 5.319%, on an infinite ' +
      'primary bus, giving 45,229 A symmetrical at the service entrance (65 kAIC selected). No ' +
      'motor contribution is included — no motor schedule was provided. These are ASSUMPTIONS: ' +
      'the utility letter and the transformer nameplate must confirm them before AIC ratings are ' +
      'released for procurement. The 208 V secondary values (4,731 / 3,674 / 3,621 A) are NOT ' +
      'assumptions — they come from transformer_impedance_V1_0_0.json percent_z.low. ' +
      'Affects d-301, sw-201, r-391, r-392.',
    nec_reference: 'NEC 110.9 / 110.24',
    blocks: 'AIC ratings released for procurement · DV-4 bus bracing verified against utility data',
  },
  {
    id: 'HALT-003',
    topic: 'Connected-load schedule / service adequacy',
    text:
      'COMPOSITOR_HALT: no connected-load or panel schedule was provided (T3-EOR). Every panel ' +
      'kVA and ampere rating in this topology is a Tier-2 default, not a calculated value, and no ' +
      'demand calculation was performed. Feeder breaker trips total 2475 A against a 2000 A bus ' +
      '(before four 400 A spares) — normal under diversity, but the adequacy of the stated 2000 A ' +
      'service is UNVERIFIED without a load study. Affects sw-201 and every L2-4.',
    nec_reference: 'NEC 220 / 230.42(A)',
    blocks: 'Service-size verification · panel schedules · feeder sizing confirmation',
  },
];

/* ---------------------------------------------------------------------------
 * Tier-2 decisions taken by default, plus the two EOR selections. FOUR keys —
 * no `blocks`, deliberately: these are applied, logged and overridable by the
 * EOR, and they do NOT gate graduation.
 * ------------------------------------------------------------------------- */
const NOTES = [
  {
    id: 'NOTE-001',
    topic: 'Service voltage and configuration',
    text:
      '480Y/277V, 3 phase 4 wire assumed. The stated inputs were 2000 A and 480 V; the wye ' +
      'configuration and 4-wire system are the Tier-2 defaults for a commercial service of this size.',
    nec_reference: null,
  },
  {
    id: 'NOTE-002',
    topic: 'Occupancy and building levels',
    text:
      'Office occupancy, 50,000 SF, 4 storeys plus roof, single normal-power sheet. Levels 1-4 and ' +
      'the roof are stated, so A-7 level lines are generated on all five rows from ' +
      'layout_config.level_order and each riser panel takes its band from level_map.',
    nec_reference: null,
  },
  {
    id: 'NOTE-003',
    topic: 'Utility transformer size — DERIVED',
    text:
      '2000 kVA. Derived from the stated service: 2000 A x 480 V x sqrt(3) = 1662.8 kVA required, ' +
      'next standard pad-mount size 2000 kVA (FLA 2405.6 A = 120% of the service rating). The ' +
      '1500 kVA alternative (1804 A) cannot carry the full 2000 A and yields a lower fault ' +
      'current, so it is less conservative on both counts.',
    nec_reference: null,
  },
  {
    id: 'NOTE-004',
    topic: 'Worst-case impedance basis for fault current',
    text:
      'Mayo directed that impedances be assumed to produce the WORST CASE fault current. Worst ' +
      'case for fault duty is MINIMUM impedance on an INFINITE primary bus, so the utility unit ' +
      'uses 5.75% less the IEEE C57.12.00 -7.5% tolerance (5.319%) and every dry-type unit uses ' +
      'percent_z.low from transformer_impedance_V1_0_0.json rather than the midpoint. Note this ' +
      'is the correct bound for AIC and bracing selection and the WRONG one for voltage-drop or ' +
      'coordination work — those want the midpoint or high value.',
    nec_reference: 'NEC 110.9',
  },
  {
    id: 'NOTE-005',
    topic: 'Boiler equipment-connection sizing basis — EOR SELECTION',
    text:
      'TIER 2 OVERRIDE confirmed: boiler sizing basis = PF 1.00 resistive (default was PF 0.90). ' +
      '500 kW at 480 V 3PH gives FLA 601.4 A; 125% continuous = 751.8 A; next NEC standard rating ' +
      '800 A. CB-06 is 800AF/800AT on feeder tag 8003 (3-wire — a resistive boiler carries no ' +
      'neutral). The PF 0.90 default would have given 668 A x 125% = 835 A and a 1000 A breaker. ' +
      'Nameplate MCA/MOCP, when available, overrides this kW-derived sizing.',
    nec_reference: 'NEC 424 / 210.19(A)(1)',
  },
  {
    id: 'NOTE-006',
    topic: 'Plug-load riser architecture — EOR SELECTION',
    text:
      'The verbal scope ("subfeed to levels two and four from the level one panel") was ambiguous ' +
      'and was resolved by direct question: each of the two 75 kVA branches CASCADES ' +
      'L1 -> L2 -> L3 -> L4, so both branches serve every floor. Upper-floor OCPD is internal to ' +
      'each parent panel per its own panel schedule. subfeed_max_depth is 4 because the chain is ' +
      'three hops deep and the key must EXCEED that.',
    nec_reference: null,
  },
  {
    id: 'NOTE-007',
    topic: 'Riser panel ratings are defaults, not calculated',
    text:
      'Lighting levels 2-4 at 100 A MLO are as stated. Plug levels 2-4 at 225 A MLO are a Tier-2 ' +
      'default — the largest standard rating below each branch’s 250 A main. The 208 V ' +
      'mechanical stack at 150 A matches the 45 kVA secondary OCPD as Mayo directed. No ' +
      'connected-load schedule was provided, so none of these are calculated values (HALT-003).',
    nec_reference: null,
  },
  {
    id: 'NOTE-008',
    topic: 'Transformer secondary OCPD location',
    text:
      'Every dry-type secondary OCPD lives in the main of the panel it feeds — 250 A in 2P-1-A and ' +
      '2P-1-B, 150 A in 2M-1-A, 100 A in 2M-R-A — which is what protects the secondary tap ' +
      'conductors. Hence MCB on those four panels and MLO elsewhere. Ratings and bonding jumpers ' +
      'are lookups from 3_phase_transformer_feeder_schedule_V1_0_0.json, not chosen values.',
    nec_reference: 'NEC 240.21(C)',
  },
  {
    id: 'NOTE-009',
    topic: 'No fire pump, generator, ATS or SPD',
    text:
      'Fire pump and emergency/standby power were both explicitly excluded from the scope of work. ' +
      'Nothing was defaulted in — emergency power is an architecture decision, not a Tier-2 ' +
      'default. If a fire pump is added later it must be tapped ahead of the main disconnect per ' +
      'NEC 695.4(B); that is non-negotiable. No SPD was requested and none is included.',
    nec_reference: 'NEC 695.4(B)',
  },
  {
    id: 'NOTE-010',
    topic: 'Spare and space provisions',
    text:
      'Four 400 A / 3P spare breakers and four spaces, carried in their own distribution section ' +
      '(SEC-5) so the six live feeder columns keep a clean lane pitch in SEC-4.',
    nec_reference: null,
  },
];

/* --------------------------------------------------------------------------- */

// Callout helper — A-2 text follows the golden's notation exactly:
//   1 set:      3 1/2"C - (4)350 AL + #6 CU GND
//   N sets:     (2) 3"C - (4)350 AL + #3 CU GND
const cal = (m, size, qty, n, ng, gsize, gmat, sets, cond) => ({
  conductor_material: m,
  conductor_size: size,
  conductors_per_phase: qty,
  neutral_size: n,
  ground_size: gsize,
  ground_material: gmat,
  conduit_type: 'EMT',
  conduit_size: cond,
  num_sets: sets,
});

const topology = {
  $schema: 'sld_topology/v1',

  metadata: {
    schema_version: '1.0.0',
    project_name: 'Sprouts Office Building — 2000 A Service',
    created_date: '2026-07-28',
    slug: SLUG,
    heading: 'Sprouts Office Building',
    facts: [
      '2000 A service, 480Y/277V 3PH 4W, 2000 kVA utility transformer (derived)',
      '50,000 SF office — 4 storeys + roof, A-7 level lines on R/4/3/2/1',
      'Four cascading risers: lighting, plug A, plug B, 208 V mechanical',
      'No fire pump, no emergency system — both excluded from scope',
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
    // ── L0 service entrance ────────────────────────────────────────────────
    // 2000 kVA derived from the stated 2000 A / 480 V service (NOTE-003).
    // FLA = 2,000,000 / (480 x sqrt(3)) = 2405.6 A.
    // pct_z / x_over_r are ASSUMPTIONS on a worst-case basis, not lookups —
    // the impedance data layer covers dry-type 15-500 kVA only (HALT-002).
    {
      id: 'd-301',
      node_type: 'L0-1',
      designation: 'UTILITY-XFMR',
      sheet_id: 'S1',
      data_fields: {
        kva_rating: 2000,
        primary_voltage: '13.2kV',
        secondary_voltage: '480Y/277V',
        phases: 3,
        wires: 4,
      },
      calc_fields: { pct_z: 5.32, x_over_r: 8.0, available_fc: 45229 },
    },
    // L1 metering — Tier-1 auto-include, utility meter cannot be suppressed.
    { id: 'd-302', node_type: 'L1-4', designation: 'UTIL-MTR', sheet_id: 'S1', data_fields: { meter_type: 'utility' } },
    // GFP main — Tier-1 auto-include at >=1000 A, NEC 230.95.
    {
      id: 'd-303',
      node_type: 'L1-1',
      designation: 'MAIN-GFP',
      sheet_id: 'S1',
      // ⚠️ NO available_fc here, deliberately. The renderer has no A-4 anchor for
      // an L1-1 (the golden binds A-4 to L0-1/L2-x/L3-x and never to a main
      // breaker), so a tag placed here is DROPPED at layout — and TV-5 then
      // errors on a populated available_fc with no A-4. The service-entrance
      // value is carried by the A-4 on the utility transformer and on the main
      // bus, which is the golden's own pattern.
      data_fields: { af: 2000, at: 2000, poles: 3, trip_type: 'LSIG' },
    },
    // N-G bond, NEC 250.24(C). MUST sit in a `distribution` section — an L1-3 in
    // an `incoming` section is DROPPED at layout, reported only in layout_warnings.
    { id: 'd-304', node_type: 'L1-3', designation: 'NG-BOND', sheet_id: 'S1', data_fields: { sds: 'service_entrance' } },

    // ── Distribution breakers (SEC-4) ──────────────────────────────────────
    // CB-01 lighting riser base.
    { id: 'd-305', node_type: 'L2-1', designation: 'CB-01', sheet_id: 'S1', data_fields: { af: 250, at: 225, poles: 3, trip_type: 'LSI' } },
    // CB-02 / CB-03 — 125 AT is NOT a chosen value: it is the 75 kVA primary
    // OCPD from 3_phase_transformer_feeder_schedule_V1_0_0.json (one_line_tag 1253).
    { id: 'd-306', node_type: 'L2-1', designation: 'CB-02', sheet_id: 'S1', data_fields: { af: 250, at: 125, poles: 3, trip_type: 'LSI' } },
    { id: 'd-307', node_type: 'L2-1', designation: 'CB-03', sheet_id: 'S1', data_fields: { af: 250, at: 125, poles: 3, trip_type: 'LSI' } },
    // CB-04 Level-1 mechanical, CB-05 rooftop mechanical.
    { id: 'd-308', node_type: 'L2-1', designation: 'CB-04', sheet_id: 'S1', data_fields: { af: 400, at: 400, poles: 3, trip_type: 'LSI' } },
    { id: 'd-309', node_type: 'L2-1', designation: 'CB-05', sheet_id: 'S1', data_fields: { af: 800, at: 800, poles: 3, trip_type: 'LSI' } },
    // CB-06 boiler. 800 AT from the unity-PF basis Mayo selected (NOTE-005):
    // 500 kW / (480 x sqrt(3)) = 601.4 A, x125% = 751.8 A, next standard 800 A.
    { id: 'd-310', node_type: 'L2-1', designation: 'CB-06', sheet_id: 'S1', data_fields: { af: 800, at: 800, poles: 3, trip_type: 'LSI' } },

    // ── Lighting riser, 480Y/277V — CASCADE L1 -> L2 -> L3 -> L4 ────────────
    { id: 'd-311', node_type: 'L2-4', designation: '4L-1-A', sheet_id: 'S1', data_fields: { rating: '225A', voltage: '480Y/277V', mlo: true } },
    { id: 'd-312', node_type: 'L2-4', designation: '4L-2-A', sheet_id: 'S1', data_fields: { rating: '100A', voltage: '480Y/277V', mlo: true } },
    { id: 'd-313', node_type: 'L2-4', designation: '4L-3-A', sheet_id: 'S1', data_fields: { rating: '100A', voltage: '480Y/277V', mlo: true } },
    { id: 'd-314', node_type: 'L2-4', designation: '4L-4-A', sheet_id: 'S1', data_fields: { rating: '100A', voltage: '480Y/277V', mlo: true } },

    // ── Plug-load branch A — 75 kVA step-down + 208 V cascade ───────────────
    // ⚠️ NO spaces around the dash in `config` — matches the golden's own
    // notation ('480Δ-208Y/120V', 14 chars). A spaced form adds 14.4 px of label
    // and has tripped `glyph_collision` between adjacent transformer columns.
    // pct_z / x_over_r are percent_z.low / x_over_r.low from
    // transformer_impedance_V1_0_0.json — worst case, per NOTE-004.
    {
      id: 'd-315',
      node_type: 'L2-2',
      designation: '4T-1-A',
      sheet_id: 'S1',
      data_fields: { kva: 75, config: '480Δ-208Y/120V' },
      calc_fields: { pct_z: 4.4, x_over_r: 2.1 },
    },
    // 250 A secondary OCPD (one_line_tag 2504T) sits in THIS panel's main —
    // NEC 240.21(C). Hence MCB, not MLO. available_fc = 208.2 A / 0.044.
    { id: 'd-316', node_type: 'L2-4', designation: '2P-1-A', sheet_id: 'S1', data_fields: { rating: '250A', voltage: '208Y/120V', mcb: true }, calc_fields: { available_fc: 4731 } },
    { id: 'd-317', node_type: 'L2-4', designation: '2P-2-A', sheet_id: 'S1', data_fields: { rating: '250A', voltage: '208Y/120V', mlo: true } },
    { id: 'd-318', node_type: 'L2-4', designation: '2P-3-A', sheet_id: 'S1', data_fields: { rating: '250A', voltage: '208Y/120V', mlo: true } },
    { id: 'd-319', node_type: 'L2-4', designation: '2P-4-A', sheet_id: 'S1', data_fields: { rating: '250A', voltage: '208Y/120V', mlo: true } },

    // ── Plug-load branch B — identical architecture ─────────────────────────
    {
      id: 'd-320',
      node_type: 'L2-2',
      designation: '4T-1-B',
      sheet_id: 'S1',
      data_fields: { kva: 75, config: '480Δ-208Y/120V' },
      calc_fields: { pct_z: 4.4, x_over_r: 2.1 },
    },
    { id: 'd-321', node_type: 'L2-4', designation: '2P-1-B', sheet_id: 'S1', data_fields: { rating: '250A', voltage: '208Y/120V', mcb: true }, calc_fields: { available_fc: 4731 } },
    { id: 'd-322', node_type: 'L2-4', designation: '2P-2-B', sheet_id: 'S1', data_fields: { rating: '250A', voltage: '208Y/120V', mlo: true } },
    { id: 'd-323', node_type: 'L2-4', designation: '2P-3-B', sheet_id: 'S1', data_fields: { rating: '250A', voltage: '208Y/120V', mlo: true } },
    { id: 'd-324', node_type: 'L2-4', designation: '2P-4-B', sheet_id: 'S1', data_fields: { rating: '250A', voltage: '208Y/120V', mlo: true } },

    // ── Mechanical, Level 1 ────────────────────────────────────────────────
    { id: 'd-325', node_type: 'L2-4', designation: '4M-1-A', sheet_id: 'S1', data_fields: { rating: '400A', voltage: '480Y/277V', mlo: true } },
    // ⚠️ NO internal_to breaker device here — see the r-317 note. The 45 kVA
    // primary OCPD (100AF/70AT, tag 703) is real and is carried on 4M-1-A's panel
    // schedule, exactly as every other sub-feed OCPD in this drawing is. It is
    // not drawn, because an internal-chain breaker would take this whole branch
    // out of the sub-feed pass and drop the three upper-floor panels.
    {
      id: 'd-327',
      node_type: 'L2-2',
      designation: '4T-2-A',
      sheet_id: 'S1',
      data_fields: { kva: 45, config: '480Δ-208Y/120V' },
      calc_fields: { pct_z: 3.4, x_over_r: 1.3 },
    },
    // 150 A secondary OCPD (one_line_tag 1504T) in the panel main. Mayo asked the
    // whole 208 V mechanical stack to match this rating. FC = 124.9 A / 0.034.
    { id: 'd-328', node_type: 'L2-4', designation: '2M-1-A', sheet_id: 'S1', data_fields: { rating: '150A', voltage: '208Y/120V', mcb: true }, calc_fields: { available_fc: 3674 } },
    { id: 'd-329', node_type: 'L2-4', designation: '2M-2-A', sheet_id: 'S1', data_fields: { rating: '150A', voltage: '208Y/120V', mlo: true } },
    { id: 'd-330', node_type: 'L2-4', designation: '2M-3-A', sheet_id: 'S1', data_fields: { rating: '150A', voltage: '208Y/120V', mlo: true } },
    { id: 'd-331', node_type: 'L2-4', designation: '2M-4-A', sheet_id: 'S1', data_fields: { rating: '150A', voltage: '208Y/120V', mlo: true } },

    // ── Rooftop mechanical ─────────────────────────────────────────────────
    { id: 'd-332', node_type: 'L2-4', designation: '4M-R-A', sheet_id: 'S1', data_fields: { rating: '800A', voltage: '480Y/277V', mlo: true } },
    // 50 AT is the 30 kVA primary OCPD (tag 503).
    { id: 'd-333', node_type: 'L2-1', designation: 'CB-MR1', sheet_id: 'S1', data_fields: { af: 100, at: 50, poles: 3, trip_type: 'LSI', internal_to: '4M-R-A' } },
    {
      id: 'd-334',
      node_type: 'L2-2',
      designation: '4T-R-A',
      sheet_id: 'S1',
      data_fields: { kva: 30, config: '480Δ-208Y/120V' },
      calc_fields: { pct_z: 2.3, x_over_r: 0.9 },
    },
    // 100 A secondary OCPD (one_line_tag 1004T) in the panel main. FC = 83.3 / 0.023.
    { id: 'd-335', node_type: 'L2-4', designation: '2M-R-A', sheet_id: 'S1', data_fields: { rating: '100A', voltage: '208Y/120V', mcb: true }, calc_fields: { available_fc: 3621 } },

    // ── Terminal load — 500 kW boiler (Chain D) ─────────────────────────────
    // The engine's L3-3 label stack reads df.kw / df.hp / df.fla / df.voltage_phase
    // in that order (viewer ~L10823). kW, not HP: HP is reserved for motor-driven
    // loads (L3-1 / L3-2). FLA 601 A at PF 1.00 — the basis Mayo selected.
    {
      id: 'd-336',
      node_type: 'L3-3',
      designation: 'BLR-1',
      sheet_id: 'S1',
      data_fields: { kw: 500, fla: 601, voltage_phase: '480V-3PH', power_factor: 1.0 },
    },

    // ── Spares and spaces (SEC-5) ──────────────────────────────────────────
    { id: 'd-337', node_type: 'L2-7', designation: 'SPARE-01', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '400A/3P' } },
    { id: 'd-338', node_type: 'L2-7', designation: 'SPARE-02', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '400A/3P' } },
    { id: 'd-339', node_type: 'L2-7', designation: 'SPARE-03', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '400A/3P' } },
    { id: 'd-340', node_type: 'L2-7', designation: 'SPARE-04', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '400A/3P' } },
    { id: 'd-341', node_type: 'L2-7', designation: 'SPACE-01', sheet_id: 'S1', data_fields: { kind: 'space' } },
    { id: 'd-342', node_type: 'L2-7', designation: 'SPACE-02', sheet_id: 'S1', data_fields: { kind: 'space' } },
    { id: 'd-343', node_type: 'L2-7', designation: 'SPACE-03', sheet_id: 'S1', data_fields: { kind: 'space' } },
    { id: 'd-344', node_type: 'L2-7', designation: 'SPACE-04', sheet_id: 'S1', data_fields: { kind: 'space' } },
  ],

  // Three-object edges: Device A → Routed Element → Device B. No implicit lines.
  routed_elements: [
    // Service lateral. 2000 A 4-wire = feeder_schedule tag 20004: 8 sets, 4" C,
    // (4)500 AL + 500 AL GND. TV-1-exempt, so it carries the A-2 alone.
    {
      id: 'r-301', edge_type: 'R-1', designation: 'F-301', sheet_id: 'S1',
      start: { device_id: 'd-301', port: 'secondary_out' },
      end: { device_id: 'd-303', port: 'line_in' },
      stub_exempt: false,
      data_fields: { is_service_entrance: true },
      calc_fields: cal('AL', '500', 4, '500', null, '500', 'AL', 8, '4"'),
      annotation_ids: ['a-601'],
    },

    // ── LIGHTING riser (480Y/277V) ─────────────────────────────────────────
    // CB-01 -> 4L-1-A. 225 A 4-wire = tag 2254.
    {
      id: 'r-302', edge_type: 'R-1', designation: 'F-302', sheet_id: 'S1',
      start: { device_id: 'd-305', port: 'line_in' },
      end: { device_id: 'd-311', port: 'feed_top' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '350', 4, '350', null, '6', 'CU', 1, '3 1/2"'),
      annotation_ids: ['a-602', 'a-603'],
    },
    // Three cascade hops, 100 A 4-wire = tag 1004: 1 set, 2" C, (4)1/0 AL + #6 CU.
    {
      id: 'r-303', edge_type: 'R-1', designation: 'F-303', sheet_id: 'S1',
      start: { device_id: 'd-311', port: 'feed_top' },
      end: { device_id: 'd-312', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '1/0', 4, '1/0', null, '6', 'CU', 1, '2"'),
      annotation_ids: ['a-604', 'a-605'],
    },
    {
      id: 'r-304', edge_type: 'R-1', designation: 'F-304', sheet_id: 'S1',
      start: { device_id: 'd-312', port: 'feed_top' },
      end: { device_id: 'd-313', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '1/0', 4, '1/0', null, '6', 'CU', 1, '2"'),
      annotation_ids: ['a-606', 'a-607'],
    },
    {
      id: 'r-305', edge_type: 'R-1', designation: 'F-305', sheet_id: 'S1',
      start: { device_id: 'd-313', port: 'feed_top' },
      end: { device_id: 'd-314', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '1/0', 4, '1/0', null, '6', 'CU', 1, '2"'),
      annotation_ids: ['a-608', 'a-609'],
    },

    // ── PLUG BRANCH A ──────────────────────────────────────────────────────
    // 75 kVA PRIMARY. 125 A 3-wire (delta primary, no neutral) = tag 1253.
    {
      id: 'r-306', edge_type: 'R-1', designation: 'F-306', sheet_id: 'S1',
      start: { device_id: 'd-306', port: 'line_in' },
      end: { device_id: 'd-315', port: 'primary_in' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '2/0', 3, null, null, '6', 'CU', 1, '1 1/2"'),
      annotation_ids: ['a-610', 'a-611'],
    },
    // 75 kVA SECONDARY. 250 A 4-wire, transformer-schedule feeder_type 2504 /
    // one_line_tag 2504T. Bonding jumper #2 AWG — SBJ, not GND.
    {
      id: 'r-307', edge_type: 'R-1', designation: 'F-307', sheet_id: 'S1',
      start: { device_id: 'd-315', port: 'secondary_out' },
      end: { device_id: 'd-316', port: 'feed_top' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 4, '500', null, '2', 'CU', 1, '3 1/2"'),
      annotation_ids: ['a-612', 'a-613'],
    },
    // Cascade hops, 225 A 4-wire = tag 2254.
    {
      id: 'r-308', edge_type: 'R-1', designation: 'F-308', sheet_id: 'S1',
      start: { device_id: 'd-316', port: 'feed_top' },
      end: { device_id: 'd-317', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 4, '500', null, '4', 'CU', 1, '3 1/2"'),
      annotation_ids: ['a-614', 'a-615'],
    },
    {
      id: 'r-309', edge_type: 'R-1', designation: 'F-309', sheet_id: 'S1',
      start: { device_id: 'd-317', port: 'feed_top' },
      end: { device_id: 'd-318', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 4, '500', null, '4', 'CU', 1, '3 1/2"'),
      annotation_ids: ['a-616', 'a-617'],
    },
    {
      id: 'r-310', edge_type: 'R-1', designation: 'F-310', sheet_id: 'S1',
      start: { device_id: 'd-318', port: 'feed_top' },
      end: { device_id: 'd-319', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 4, '500', null, '4', 'CU', 1, '3 1/2"'),
      annotation_ids: ['a-618', 'a-619'],
    },

    // ── PLUG BRANCH B ──────────────────────────────────────────────────────
    {
      id: 'r-311', edge_type: 'R-1', designation: 'F-311', sheet_id: 'S1',
      start: { device_id: 'd-307', port: 'line_in' },
      end: { device_id: 'd-320', port: 'primary_in' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '2/0', 3, null, null, '6', 'CU', 1, '1 1/2"'),
      annotation_ids: ['a-620', 'a-621'],
    },
    {
      id: 'r-312', edge_type: 'R-1', designation: 'F-312', sheet_id: 'S1',
      start: { device_id: 'd-320', port: 'secondary_out' },
      end: { device_id: 'd-321', port: 'feed_top' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 4, '500', null, '2', 'CU', 1, '3 1/2"'),
      annotation_ids: ['a-622', 'a-623'],
    },
    {
      id: 'r-313', edge_type: 'R-1', designation: 'F-313', sheet_id: 'S1',
      start: { device_id: 'd-321', port: 'feed_top' },
      end: { device_id: 'd-322', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 4, '500', null, '4', 'CU', 1, '3 1/2"'),
      annotation_ids: ['a-624', 'a-625'],
    },
    {
      id: 'r-314', edge_type: 'R-1', designation: 'F-314', sheet_id: 'S1',
      start: { device_id: 'd-322', port: 'feed_top' },
      end: { device_id: 'd-323', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 4, '500', null, '4', 'CU', 1, '3 1/2"'),
      annotation_ids: ['a-626', 'a-627'],
    },
    {
      id: 'r-315', edge_type: 'R-1', designation: 'F-315', sheet_id: 'S1',
      start: { device_id: 'd-323', port: 'feed_top' },
      end: { device_id: 'd-324', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 4, '500', null, '4', 'CU', 1, '3 1/2"'),
      annotation_ids: ['a-628', 'a-629'],
    },

    // ── MECHANICAL, Level 1 ────────────────────────────────────────────────
    // CB-04 -> 4M-1-A. 400 A 4-wire = tag 4004: 2 sets, 3" C, (4)350 AL + #3 CU.
    {
      id: 'r-316', edge_type: 'R-1', designation: 'F-316', sheet_id: 'S1',
      start: { device_id: 'd-308', port: 'line_in' },
      end: { device_id: 'd-325', port: 'feed_top' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '350', 4, '350', null, '3', 'CU', 2, '3"'),
      annotation_ids: ['a-630', 'a-631'],
    },
    // 4M-1-A -> 45 kVA primary. 70 A 3-wire = tag 703: (3)#4 CU + #8 CU.
    //
    // ⚠️ THIS STARTS AT THE PANEL, NOT AT AN internal_to BREAKER, AND THAT IS
    // LOAD-BEARING. Modelled the obvious way — CB-M1 internal_to '4M-1-A' →
    // 4T-2-A → 2M-1-A — the chain draws correctly but the three panels above
    // 2M-1-A are SILENTLY DROPPED: renderSheet calls placeSubFeeds (engine
    // L14969) before placeInternalChains (L14975), and placeSubFeeds skips any
    // edge whose source is not yet in G[]. All SUBFEED_MAX_DEPTH rounds run
    // inside that one call, so no later round rescues it. Measured on run 1:
    // 13 dropped entities — d-329/330/331, r-319/320/321 and their six tags.
    // Starting the feeder at the panel puts the whole branch in the sub-feed
    // pass, where the cascade above it is reachable.
    {
      id: 'r-317', edge_type: 'R-1', designation: 'F-317', sheet_id: 'S1',
      start: { device_id: 'd-325', port: 'feed_bottom' },
      end: { device_id: 'd-327', port: 'primary_in' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('CU', '4', 3, null, null, '8', 'CU', 1, '1"'),
      annotation_ids: ['a-632', 'a-633'],
    },
    // 45 kVA SECONDARY. 150 A 4-wire, feeder_type 1504 / one_line_tag 1504T.
    // Bonding jumper #4 AWG.
    //
    // feed_top, like the two plug branches — power arrives from the transformer
    // ABOVE it. This was briefly feed_bottom (run 3) while 2M-1-A was still
    // floor-anchored to the Level-1 row, i.e. pinned ABOVE its own transformer;
    // the port had to invert with it. Once the staircase put the panel back
    // below the transformer (R-005), a feed_bottom landing made the run pass
    // straight through its own child's box to reach the far edge.
    {
      id: 'r-318', edge_type: 'R-1', designation: 'F-318', sheet_id: 'S1',
      start: { device_id: 'd-327', port: 'secondary_out' },
      end: { device_id: 'd-328', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '4/0', 4, '4/0', null, '4', 'CU', 1, '2 1/2"'),
      annotation_ids: ['a-634', 'a-635'],
    },
    // Cascade hops, 150 A 4-wire = tag 1504.
    {
      id: 'r-319', edge_type: 'R-1', designation: 'F-319', sheet_id: 'S1',
      start: { device_id: 'd-328', port: 'feed_top' },
      end: { device_id: 'd-329', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '4/0', 4, '4/0', null, '6', 'CU', 1, '2 1/2"'),
      annotation_ids: ['a-636', 'a-637'],
    },
    {
      id: 'r-320', edge_type: 'R-1', designation: 'F-320', sheet_id: 'S1',
      start: { device_id: 'd-329', port: 'feed_top' },
      end: { device_id: 'd-330', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '4/0', 4, '4/0', null, '6', 'CU', 1, '2 1/2"'),
      annotation_ids: ['a-638', 'a-639'],
    },
    {
      id: 'r-321', edge_type: 'R-1', designation: 'F-321', sheet_id: 'S1',
      start: { device_id: 'd-330', port: 'feed_top' },
      end: { device_id: 'd-331', port: 'feed_bottom' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '4/0', 4, '4/0', null, '6', 'CU', 1, '2 1/2"'),
      annotation_ids: ['a-640', 'a-641'],
    },

    // ── ROOFTOP MECHANICAL ─────────────────────────────────────────────────
    // CB-05 -> 4M-R-A. 800 A 4-wire = tag 8004: 3 sets, 3 1/2" C, (4)500 AL + #1/0 CU.
    {
      id: 'r-322', edge_type: 'R-1', designation: 'F-322', sheet_id: 'S1',
      start: { device_id: 'd-309', port: 'line_in' },
      end: { device_id: 'd-332', port: 'feed_top' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 4, '500', null, '1/0', 'CU', 3, '3 1/2"'),
      annotation_ids: ['a-642', 'a-643'],
    },
    // Internal CB-MR1 -> 30 kVA primary. 50 A 3-wire = tag 503: (3)#6 CU + #10 CU.
    {
      id: 'r-323', edge_type: 'R-1', designation: 'F-323', sheet_id: 'S1',
      start: { device_id: 'd-333', port: 'line_in' },
      end: { device_id: 'd-334', port: 'primary_in' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('CU', '6', 3, null, null, '10', 'CU', 1, '3/4"'),
      annotation_ids: ['a-644', 'a-645'],
    },
    // 30 kVA SECONDARY. 100 A 4-wire, feeder_type 1004 / one_line_tag 1004T.
    // Bonding jumper #6 AWG.
    {
      id: 'r-324', edge_type: 'R-1', designation: 'F-324', sheet_id: 'S1',
      start: { device_id: 'd-334', port: 'secondary_out' },
      end: { device_id: 'd-335', port: 'feed_top' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '1/0', 4, '1/0', null, '6', 'CU', 1, '2"'),
      annotation_ids: ['a-646', 'a-647'],
    },

    // ── BOILER — Chain D terminal load ─────────────────────────────────────
    // 800 A 3-wire = tag 8003: 3 sets, 3" C, (3)500 AL + #1/0 CU. Three-wire
    // because a resistive boiler carries no neutral.
    {
      id: 'r-325', edge_type: 'R-1', designation: 'F-325', sheet_id: 'S1',
      start: { device_id: 'd-310', port: 'line_in' },
      end: { device_id: 'd-336', port: 'load_in' },
      stub_exempt: false, data_fields: {},
      calc_fields: cal('AL', '500', 3, null, null, '1/0', 'CU', 3, '3"'),
      annotation_ids: ['a-648', 'a-649'],
    },

    // ── Buses ──────────────────────────────────────────────────────────────
    // The r-39x band is kept clear of the feeder allocator (SCHEMA-8): a bus id
    // colliding with an R-1 makes a bus tap resolve to the feeder.
    {
      id: 'r-391', edge_type: 'R-2', designation: 'main-bus-4MSB-1-A', sheet_id: 'S1',
      bus_level: 'main', stroke_weight: 2.5,
      start: null, end: null, stub_exempt: null,
      data_fields: {}, calc_fields: { bus_rating: 2000, available_fc: 45229 },
      annotation_ids: ['a-650'],
    },
    {
      id: 'r-392', edge_type: 'R-2', designation: 'sec-bus-4MSB-1-A', sheet_id: 'S1',
      bus_level: 'secondary', stroke_weight: 2,
      start: null, end: null, stub_exempt: null,
      data_fields: {}, calc_fields: { bus_rating: 2000, available_fc: 45229 },
      annotation_ids: [],
    },
  ],

  // A-1 / A-2 on every non-stub-exempt R-1 is a Tier-1 auto-include. The service
  // lateral is TV-1-exempt and carries the A-2 alone.
  annotations: [
    { id: 'a-601', annotation_type: 'A-2', bound_to: 'r-301', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '(8) 4"C - (4)500 AL + 500 AL GND' } },
    // Lighting riser.
    { id: 'a-602', annotation_type: 'A-1', bound_to: 'r-302', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2254' } },
    { id: 'a-603', annotation_type: 'A-2', bound_to: 'r-302', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)350 AL + #6 CU GND' } },
    { id: 'a-604', annotation_type: 'A-1', bound_to: 'r-303', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1004' } },
    { id: 'a-605', annotation_type: 'A-2', bound_to: 'r-303', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '2"C - (4)1/0 AL + #6 CU GND' } },
    { id: 'a-606', annotation_type: 'A-1', bound_to: 'r-304', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1004' } },
    { id: 'a-607', annotation_type: 'A-2', bound_to: 'r-304', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '2"C - (4)1/0 AL + #6 CU GND' } },
    { id: 'a-608', annotation_type: 'A-1', bound_to: 'r-305', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1004' } },
    { id: 'a-609', annotation_type: 'A-2', bound_to: 'r-305', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '2"C - (4)1/0 AL + #6 CU GND' } },
    // Plug branch A.
    { id: 'a-610', annotation_type: 'A-1', bound_to: 'r-306', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1253' } },
    { id: 'a-611', annotation_type: 'A-2', bound_to: 'r-306', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '1 1/2"C - (3)#2/0 AL + #6 CU GND' } },
    { id: 'a-612', annotation_type: 'A-1', bound_to: 'r-307', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2504T' } },
    { id: 'a-613', annotation_type: 'A-2', bound_to: 'r-307', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)500 AL + #2 CU SBJ' } },
    { id: 'a-614', annotation_type: 'A-1', bound_to: 'r-308', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2504' } },
    { id: 'a-615', annotation_type: 'A-2', bound_to: 'r-308', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)500 AL + #4 CU GND' } },
    { id: 'a-616', annotation_type: 'A-1', bound_to: 'r-309', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2504' } },
    { id: 'a-617', annotation_type: 'A-2', bound_to: 'r-309', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)500 AL + #4 CU GND' } },
    { id: 'a-618', annotation_type: 'A-1', bound_to: 'r-310', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2504' } },
    { id: 'a-619', annotation_type: 'A-2', bound_to: 'r-310', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)500 AL + #4 CU GND' } },
    // Plug branch B.
    { id: 'a-620', annotation_type: 'A-1', bound_to: 'r-311', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1253' } },
    { id: 'a-621', annotation_type: 'A-2', bound_to: 'r-311', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '1 1/2"C - (3)#2/0 AL + #6 CU GND' } },
    { id: 'a-622', annotation_type: 'A-1', bound_to: 'r-312', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2504T' } },
    { id: 'a-623', annotation_type: 'A-2', bound_to: 'r-312', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)500 AL + #2 CU SBJ' } },
    { id: 'a-624', annotation_type: 'A-1', bound_to: 'r-313', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2504' } },
    { id: 'a-625', annotation_type: 'A-2', bound_to: 'r-313', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)500 AL + #4 CU GND' } },
    { id: 'a-626', annotation_type: 'A-1', bound_to: 'r-314', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2504' } },
    { id: 'a-627', annotation_type: 'A-2', bound_to: 'r-314', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)500 AL + #4 CU GND' } },
    { id: 'a-628', annotation_type: 'A-1', bound_to: 'r-315', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '2504' } },
    { id: 'a-629', annotation_type: 'A-2', bound_to: 'r-315', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3 1/2"C - (4)500 AL + #4 CU GND' } },
    // Mechanical, Level 1.
    { id: 'a-630', annotation_type: 'A-1', bound_to: 'r-316', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '4004' } },
    { id: 'a-631', annotation_type: 'A-2', bound_to: 'r-316', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '(2) 3"C - (4)350 AL + #3 CU GND' } },
    { id: 'a-632', annotation_type: 'A-1', bound_to: 'r-317', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '703' } },
    { id: 'a-633', annotation_type: 'A-2', bound_to: 'r-317', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '1"C - (3)#4 CU + #8 CU GND' } },
    { id: 'a-634', annotation_type: 'A-1', bound_to: 'r-318', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1504T' } },
    { id: 'a-635', annotation_type: 'A-2', bound_to: 'r-318', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '2 1/2"C - (4)4/0 AL + #4 CU SBJ' } },
    { id: 'a-636', annotation_type: 'A-1', bound_to: 'r-319', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1504' } },
    { id: 'a-637', annotation_type: 'A-2', bound_to: 'r-319', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '2 1/2"C - (4)4/0 AL + #6 CU GND' } },
    { id: 'a-638', annotation_type: 'A-1', bound_to: 'r-320', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1504' } },
    { id: 'a-639', annotation_type: 'A-2', bound_to: 'r-320', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '2 1/2"C - (4)4/0 AL + #6 CU GND' } },
    { id: 'a-640', annotation_type: 'A-1', bound_to: 'r-321', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1504' } },
    { id: 'a-641', annotation_type: 'A-2', bound_to: 'r-321', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '2 1/2"C - (4)4/0 AL + #6 CU GND' } },
    // Rooftop mechanical.
    { id: 'a-642', annotation_type: 'A-1', bound_to: 'r-322', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '8004' } },
    { id: 'a-643', annotation_type: 'A-2', bound_to: 'r-322', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '(3) 3 1/2"C - (4)500 AL + #1/0 CU GND' } },
    { id: 'a-644', annotation_type: 'A-1', bound_to: 'r-323', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '503' } },
    { id: 'a-645', annotation_type: 'A-2', bound_to: 'r-323', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '3/4"C - (3)#6 CU + #10 CU GND' } },
    { id: 'a-646', annotation_type: 'A-1', bound_to: 'r-324', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '1004T' } },
    { id: 'a-647', annotation_type: 'A-2', bound_to: 'r-324', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '2"C - (4)1/0 AL + #6 CU SBJ' } },
    // Boiler.
    { id: 'a-648', annotation_type: 'A-1', bound_to: 'r-325', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: '8003' } },
    { id: 'a-649', annotation_type: 'A-2', bound_to: 'r-325', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: '(3) 3"C - (3)500 AL + #1/0 CU GND' } },

    // ── A-4 fault-current tags ─────────────────────────────────────────────
    // Placed ONLY where a value was actually derived: the service entrance and
    // the four dry-type secondaries. 480 V devices below the switchboard have no
    // calculated value (HALT-001) and get no tag.
    // ⚠️ TV-5 is a two-way contract: any device carrying calc_fields.available_fc
    // must carry EXACTLY ONE A-4. Populating the value without the tag is an
    // ERROR, not a warning — d-301 and d-303 failed this on the first run.
    { id: 'a-650', annotation_type: 'A-4', bound_to: 'r-391', bound_to_type: 'routed_element', sheet_id: 'S1', content: { fc_amps: 45229, mode: null, anchor: 'bus' } },
    { id: 'a-655', annotation_type: 'A-4', bound_to: 'd-301', bound_to_type: 'device', sheet_id: 'S1', content: { fc_amps: 45229, mode: null, anchor: 'default' } },
    { id: 'a-651', annotation_type: 'A-4', bound_to: 'd-316', bound_to_type: 'device', sheet_id: 'S1', content: { fc_amps: 4731, mode: null, anchor: 'default' } },
    { id: 'a-652', annotation_type: 'A-4', bound_to: 'd-321', bound_to_type: 'device', sheet_id: 'S1', content: { fc_amps: 4731, mode: null, anchor: 'default' } },
    { id: 'a-653', annotation_type: 'A-4', bound_to: 'd-328', bound_to_type: 'device', sheet_id: 'S1', content: { fc_amps: 3674, mode: null, anchor: 'default' } },
    { id: 'a-654', annotation_type: 'A-4', bound_to: 'd-335', bound_to_type: 'device', sheet_id: 'S1', content: { fc_amps: 3621, mode: null, anchor: 'default' } },
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
      // 65 kAIC: the derived 45,229 A exceeds the 42 kA standard rating, so the
      // next standard short-circuit rating applies (nec_standard_ratings).
      data_fields: { rating: '2000A', voltage: '480Y/277V', wires: '4W, 3PH', aic: '65kAIC' },
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
    // Breaker order left-to-right is a pure drafting choice — all six are the
    // same class, so nothing electrical constrains it. The two Chain-B plug
    // transformer columns (CB-02/4T-1-A and CB-03/4T-1-B) are deliberately
    // SEPARATED by the two mechanical columns: adjacent transformer columns put
    // one label block inside the other's glyph extent (R-007 / glyph_collision).
    // The N-G bond stays last.
    // SIX live feeder breakers, no gaps. The two SPACE slots that used to sit
    // between CB-02 and CB-04 as lane separators are gone (R-006); all four
    // spaces are consolidated in SEC-5.
    //
    // ⚠️ CB-04 IS WESTMOST AND THAT IS LOAD-BEARING. 4M-1-A's branch is the only
    // one carrying a second full column — its entire 208 V mechanical riser —
    // and the sub-feed pass builds that as a staircase drifting ~100 px WEST per
    // hop. With CB-04 mid-lineup the staircase lands on its west neighbour (a
    // measured 54×88 px overlap on the 2P-A stack). At the west end it drifts
    // into the open margin outside the lineup instead, which is what the deleted
    // SPACE separators were standing in for.
    //
    // The two Chain-B plug transformer columns (CB-02/4T-1-A and CB-03/4T-1-B)
    // stay separated by the roof column: adjacent transformer columns put one
    // label block inside the other's glyph extent (R-007 / glyph_collision).
    { id: 'sec-204', switchboard_id: 'sw-201', type: 'distribution', order: 4, nec_class: null, section_tag: 'SEC-4', device_ids: ['d-308', 'd-305', 'd-306', 'd-309', 'd-307', 'd-310'] },
    // All four spares, all four spaces, and the N-G bond LAST — far right of the
    // adjacent distribution section (R-008).
    { id: 'sec-205', switchboard_id: 'sw-201', type: 'distribution', order: 5, nec_class: null, section_tag: 'SEC-5', device_ids: ['d-337', 'd-338', 'd-339', 'd-340', 'd-341', 'd-342', 'd-343', 'd-344', 'd-304'] },
  ],

  port_assignments: [
    { id: 'pa-301', device_id: 'd-303', port: 'line_in', bus_id: 'r-391' },
    { id: 'pa-302', device_id: 'd-303', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-303', device_id: 'd-305', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-304', device_id: 'd-306', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-305', device_id: 'd-307', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-306', device_id: 'd-308', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-307', device_id: 'd-309', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-308', device_id: 'd-310', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-309', device_id: 'd-337', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-310', device_id: 'd-338', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-311', device_id: 'd-339', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-312', device_id: 'd-340', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-313', device_id: 'd-341', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-314', device_id: 'd-342', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-315', device_id: 'd-343', port: 'bus_out', bus_id: 'r-392' },
    { id: 'pa-316', device_id: 'd-344', port: 'bus_out', bus_id: 'r-392' },
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
