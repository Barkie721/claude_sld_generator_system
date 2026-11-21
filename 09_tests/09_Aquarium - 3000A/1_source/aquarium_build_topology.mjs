#!/usr/bin/env node
/**
 * aquarium_build_topology.mjs — the ONLY hand-edited file in this project.
 *
 * Aquarium: 58,000 SF, three storeys + roof, 3000 A / 480Y-277V service, fire
 * pump tapped ahead of the main (NEC 695.4(B)), 1000 kW generator serving four
 * transfer switches — Life Safety (700), Legally Required (701), Equipment
 * (owner-defined 702: animal life support) and Optional Standby (702).
 * Composed from the owner's verbal scope of 2026-11-21; every value the owner
 * did not state is itemised in 1_source/aquarium_SLD_narrative_V1_0_0.md and in
 * metadata.compositor_notes[] (Tier-2) or metadata.compositor_halts[] (Tier-3).
 *
 * Writes two files into 2_build/:
 *   aquarium_layout_config.json        the sidecar (sidecar keys win at layout time)
 *   aquarium_SLD_topology_V1_0_0.json  topology with an EMBEDDED copy of the same config
 *
 * Patterns reused: fire-pump section from 08_Test Antigravity; generator ->
 * EM switchboard -> ATS source 2, ATS source 1 cross-sheet from the NP board,
 * from 03_Clinic AI Test (itself the hospital-golden pattern).
 *
 * ID ranges are rebased off the hospital golden (schema §16): d-3xx / r-3xx /
 * r-39x buses / a-6xx+ / sw-2xx / sec-2xx / pa-3xx / meas-3xx / cs-3xx.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '2_build');
const SLUG = 'aquarium';

/* ---------------------------------------------------------------------------
 * Feeder rows: [calc_fields, A-2 callout]. Every row is a lookup —
 * feeder_schedule_V1_0_0.json (4-wire tags ...4, 3-wire tags ...3) or
 * 3_phase_transformer_feeder_schedule_V1_0_0.json (secondary tags ...T).
 * ------------------------------------------------------------------------- */
const cal = (m, size, qty, n, gsize, gmat, sets, cond) => ({
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
const FEEDER = {
  '30004': [cal('AL', '500', 4, '500', '500', 'AL', 11, '4"'), '(11) 4"C - (4)500 AL + 500 AL GND'],
  '16004': [cal('AL', '500', 4, '500', '350', 'AL', 6, '3 1/2"'), '(6) 3 1/2"C - (4)500 AL + 350 AL GND'],
  '8004': [cal('AL', '500', 4, '500', '1/0', 'CU', 3, '3 1/2"'), '(3) 3 1/2"C - (4)500 AL + #1/0 CU GND'],
  '4004': [cal('AL', '350', 4, '350', '3', 'CU', 2, '3"'), '(2) 3"C - (4)350 AL + #3 CU GND'],
  '2254': [cal('AL', '350', 4, '350', '6', 'CU', 1, '3 1/2"'), '3 1/2"C - (4)350 AL + #6 CU GND'],
  '8003': [cal('AL', '500', 3, null, '1/0', 'CU', 3, '3"'), '(3) 3"C - (3)500 AL + #1/0 CU GND'],
  '2503': [cal('AL', '350', 3, null, '4', 'CU', 1, '2 1/2"'), '2 1/2"C - (3)350 AL + #4 CU GND'],
  '1753': [cal('AL', '4/0', 3, null, '6', 'CU', 1, '2"'), '2"C - (3)4/0 AL + #6 CU GND'],
  '1253': [cal('AL', '2/0', 3, null, '6', 'CU', 1, '1 1/2"'), '1 1/2"C - (3)2/0 AL + #6 CU GND'],
  '703': [cal('CU', '4', 3, null, '8', 'CU', 1, '1"'), '1"C - (3)#4 CU + #8 CU GND'],
  // Transformer secondaries (bonding jumper per the transformer schedule).
  '16004T': [cal('AL', '500', 4, '500', '1/0', 'CU', 6, '3 1/2"'), '(6) 3 1/2"C - (4)500 AL + #1/0 CU SBJ'],
  '5004T': [cal('AL', '500', 4, '500', '2', 'CU', 2, '3 1/2"'), '(2) 3 1/2"C - (4)500 AL + #2 CU SBJ'],
  '2504T': [cal('AL', '500', 4, '500', '2', 'CU', 1, '3 1/2"'), '3 1/2"C - (4)500 AL + #2 CU SBJ'],
  '1504T': [cal('AL', '4/0', 4, '4/0', '4', 'CU', 1, '2 1/2"'), '2 1/2"C - (4)4/0 AL + #4 CU SBJ'],
};

/* ---------------------------------------------------------------------------
 * Fault-current bounds (NOTE-005 / HALT-002 / HALT-005). Infinite primary bus,
 * percent_z.low from transformer_impedance_V1_0_0.json — the correct bound for
 * AIC, the wrong one for voltage drop.
 * ------------------------------------------------------------------------- */
const FC_SVC = 56535; // 3007 A / 0.05319
const FC_GEN = 12529; // 1503.5 A / 0.12
// pct_z / x_over_r = low values; FC = FLA(208 V) / (pct_z / 100).
const XZ = { 500: [5.75, 5.5], 150: [4.2, 2.8], 75: [4.4, 2.1], 45: [3.4, 1.3] };
const FC208 = { 500: 24137, 150: 9914, 75: 4731, 45: 3674 };

/* ---------------------------------------------------------------------------
 * Storeys. S1 carries Levels 1-3 + Roof; S2 carries Levels 1-3 (the Life
 * Safety riser). Banded designations are panels that are neither a named
 * anchor nor placed by the sub-feed pass at L1.
 * ------------------------------------------------------------------------- */
const LEVEL_MAP_S1 = {
  '4P-1-A': '1', '4P-2-A': '2', '4P-3-A': '3',
  '2S-1-B': '1', '2P-1-B': '1', '2P-2-B': '2', '2P-3-B': '3',
  '4L-1-A': '1', '4L-3-A': '3',
  '2S-1-C': '1',
  '4M-1-A': '1', '2M-1-A': '1',
  '4K-1-A': '1',
  '4M-R-A': 'R', '2M-R-A': 'R',
};
// S2 carries Levels 1-3 for the Life Safety riser, on the emergency sheet's
// fixed-pitch level stack. Upper-floor sub-feed panels are lifted by
// -Σpitch + s2_shift_delta; closed form shift = L1_line - 180 - childY_base
// = 4840 - 180 - 3332 = 1328 — this sheet's L1 line and child baseline equal
// the golden's, so the golden values apply. They MUST be stated: an empty {}
// replaces the defaults (every pitch -> 1250, shift -> 0), which is what
// misplaced E4L-2-A / E4L-3-A in run 1. LS topology mirrors the golden
// E4S-1-A: sub-distribution panel above the ATS, L1 branch panel (with its
// internal chain) offset beside it, upper floors straight up.
const LEVEL_MAP_S2 = {
  'E4S-1-A': '1', 'E4L-1-A': '1', 'E4L-2-A': '2', 'E4L-3-A': '3', 'E2P-1-A': '1',
  'L4P-1-A': '1', 'EQ4S-1-A': '1', 'EQ2P-1-A': '1', 'O4P-1-A': '1', 'O2P-1-A': '1',
};

const FA = { '3': '4P-3-A', '2': '4P-2-A', '1': '4P-1-A' };
const FA_MECH = {};

const LAYOUT_CONFIG = {
  sheet_roles: { S1: 'normal', S2: 'emergency' },
  sheet_skips: {},

  floor_order: { S1: ['R', '3', '2', '1'], S2: ['3', '2', '1'] },
  floor_anchors: FA,
  floor_anchors_mechanical: FA_MECH,
  floor_band_designations: ['2P-2-B', '2P-3-B', '4L-3-A', '4M-R-A'],
  level_map: { ...LEVEL_MAP_S1, ...LEVEL_MAP_S2 },
  level_order: ['R', '3', '2', '1'],
  empty_floor_level_lines: [],

  ats_xoffset_overrides: {},
  ats_order: ['E4A-1-A', 'L4A-1-A', 'EQ4A-1-A', 'O4A-1-A'],

  // 1100, not the usual 650: the internal-chain pass stacks the 45 kVA unit and
  // its 208 V panel ABOVE 4M-1-A, and at 650 2M-1-A crossed the Level 2 line (run 1).
  riser_step_standard: 1100,
  riser_step_roof: 650,

  subfeed_max_depth: 2,
  subfeed_start_ports: ['feed_bottom', 'feed_top'],
  subfeed_src_types: ['L2-4'],
  subfeed_dst_types: ['L2-4'],
  ats_extent_subfeed_ports: ['feed_bottom', 'feed_top'],
  subfeed_straighten: ['F-311', 'F-312', 'F-318', 'F-321'],
  subfeed_exit_x_nudge: {},
  chain_dst_x_offset: {},

  s2_level_line_pitch: { '2': 2800, '3': 1250 },
  s2_shift_delta: { '2': 1328, '3': 1328 },
  subfeed_midy_nudge: {},

  // 2P-1-B stands beside 2S-1-B in the Level 1 room: drawn butted on its left;
  // F-317 stays in the topology (counted as an intentional skip, not a drop).
  feed_through_panels: { '2P-1-B': 'left' },

  // E4L-1-A's 45 kVA tap shared the panel-top lane with the incoming F-356
  // (collinear 30 px, run 4): shift the tap and its whole column west together
  // so the primary stays one straight vertical (OFF-014 + OFF-017, equal values).
  internal_chain_exit_nudge: { 'E4L-1-A': -20 },
  chain_column_nudge: { 'E2P-1-A': -20 },

  a1_tag_placement: {
    // 2S-1-B fan-out: F-318's pill sat on F-319's first riser segment (run 4).
    // F-319 is handled by a1_long_run_midpoint below.
    'F-318': { side: 'left' },
    // E4S-1-A -> E4L-2-A: pill sat across its own riser.
    'F-357': { force_orient: 'vertical', side: 'right', dy: -300 },
  },
  // F-319 (2S-1-B -> 2P-3-B) rises ~1650 px; its pill sat on the jog row,
  // across its own vertical. OFF-025: move it to the final vertical's midpoint.
  a1_long_run_midpoint: { 'F-319': 400 },
  a3_text_placement: {},
  fc_pennant_placement: {},
  fc_pennant_y_nudges: {},
};

const SIDECAR_COMMENT =
  'Sidecar layout_config for the Aquarium (3000 A, 3 storeys + roof). S1 normal power, S2 emergency ' +
  '(LS 700 / LR 701 / EQ 702 / OS 702). Every hospital-golden default that names hospital designations ' +
  "is explicitly cleared — absent keys fall back to the engine's _DEF_* hospital values (schema §19).";

const EMBED_COMMENT =
  'Embedded copy of aquarium_layout_config.json. Embedded (not sidecar-only) so validator rule ' +
  'CV-14 runs — its capability gate reads topology.layout_config.subfeed_start_ports and cannot ' +
  'see external configs (08_validation/lib/context_V1_0_0.mjs). Sidecar keys still win at layout time.';

/* ---------------------------------------------------------------------------
 * Tier-3 halts — FIVE keys (id, topic, text, nec_reference, blocks).
 * ------------------------------------------------------------------------- */
const HALTS = [
  {
    id: 'HALT-001',
    topic: 'Feeder distances',
    text:
      'COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation ' +
      'performed; no A-5 tags. Fault current below each bus is NOT attenuated for feeder ' +
      'impedance — the 56.5 kA service value is a conservative bound for every 480 V normal-side ' +
      'device, and the 208 V values are infinite-primary-bus bounds.',
    nec_reference: 'NEC 210.19(A) IN / 215.2(A)(1) IN',
    blocks: 'Voltage-drop calculation · A-5 tags · per-device fault current',
  },
  {
    id: 'HALT-002',
    topic: 'Utility fault current + transformer impedance — DERIVED, not confirmed',
    text:
      'COMPOSITOR_HALT: utility available fault current and the utility transformer nameplate ' +
      'were not provided. Derived on a worst-case basis: 2500 kVA (next standard size above the ' +
      '2494 kVA a 3000 A / 480 V service needs), %Z 5.75 less the IEEE C57.12.00 -7.5% tolerance ' +
      '= 5.319%, infinite primary bus: 3007 A / 0.05319 = 56,535 A sym, so 65 kAIC. No motor ' +
      'contribution (the fire pump and life-support pumps would add to it). The utility letter and ' +
      'transformer nameplate must confirm before AIC ratings are released for procurement.',
    nec_reference: 'NEC 110.9 / 110.24',
    blocks: 'AIC ratings released for procurement · DV-4 bus bracing verified against utility data',
  },
  {
    id: 'HALT-003',
    topic: 'Connected-load schedule / service adequacy',
    text:
      'COMPOSITOR_HALT: no connected-load or panel schedule was provided (T3-EOR). Every panel ' +
      'rating not stated by the owner is a Tier-2 default and no NEC 220 demand calculation was ' +
      'performed. The stated 3000 A service is 2494 kVA, 43 VA/SF on 58,000 SF — plausible for an ' +
      'aquarium (life-support pumping, chillers, exhibit HVAC). Branch trips on the secondary bus ' +
      'total 5500 A against the 3000 A main; acceptable only with demonstrated diversity.',
    nec_reference: 'NEC 220 / 230.42(A)',
    blocks: 'Service-size verification · panel schedules · feeder sizing confirmation',
  },
  {
    id: 'HALT-004',
    topic: 'Fire pump OCPD, controller and source — FILLED by compositor',
    text:
      'COMPOSITOR_HALT: fire pump size was not stated. Filled 100 HP, 460 V, 124 FLA (NEC Table ' +
      '430.250) / 725 LRA (NEC Table 430.251(B), Design B). Service tap ahead of the main per NEC ' +
      '695.4(B). OCPD 800AF/800AT — next standard rating at or above the locked-rotor current so ' +
      'it carries LRC indefinitely (NEC 695.4(B)(2)(a)(1)); feeder sized at 125% FLA = 155 A, tag ' +
      '1753 (NEC 695.6(C)). Fire pump is NOT on the generator: if the AHJ finds the utility ' +
      'unreliable, NEC 695.3(B)/(C) requires an alternate source and a listed fire-pump transfer ' +
      'switch, and the generator must then be sized for the pump starting kVA (695.3(D)). The pump ' +
      'data sheet and the AHJ reliability ruling are owed.',
    nec_reference: 'NEC 695.3 / 695.4(B)(2) / 695.6(C)',
    blocks: 'Fire pump breaker certification · fire pump controller · generator sizing (if 695.3(C))',
  },
  {
    id: 'HALT-005',
    topic: 'Generator breaker, feeder and capacity — Tier-3 values FILLED by compositor',
    text:
      'COMPOSITOR_HALT: generator feeder sizing is EOR input with no schedule lookup (NEC 445.13). ' +
      "At the owner's direction (1 MW stated) the compositor FILLED: 1000 kW / 1250 kVA at 0.8 PF, " +
      '480Y/277V, FLA 1503.5 A; integral breaker 2000AF/1600AT LSI 100% rated (NEC 445.12); feeder ' +
      'on feeder_schedule tag 16004, (6) 3 1/2"C - (4)500 AL + 350 AL GND. Aggregate ATS ratings ' +
      '1825 A exceed the generator FLA — acceptable only with automatic load management, shedding ' +
      'in the order Optional Standby, Equipment, Legally Required, never Life Safety (NEC 700.4(B), ' +
      '701.4(B), 702.4(B)(2)). The generator sizing study, with life-support pump motor starting, is owed.',
    nec_reference: 'NEC 445.12 / 445.13 / 700.4(B) / 701.4(B) / 702.4(B)',
    blocks: 'Generator feeder release · generator sizing study · EM board main rating',
  },
  {
    id: 'HALT-006',
    topic: 'Generator subtransient reactance — ASSUMED',
    text:
      'COMPOSITOR_HALT: X"d 0.12 pu assumed (worst case, low end of the typical 0.12-0.18 range) ' +
      'for the emergency-source fault current: 1503.5 A / 0.12 = 12,529 A sym on the EM bus. ' +
      'Generator submittal data must confirm before the EM board 22 kAIC rating is released.',
    nec_reference: 'NEC 110.9 / 700.4',
    blocks: 'EM board AIC release · ATS emergency-side withstand verification',
  },
  {
    id: 'HALT-007',
    topic: 'Equipment branch classification — owner-defined, not a code system',
    text:
      'COMPOSITOR_HALT: the owner asked for an "equipment" branch on the generator. An aquarium is not ' +
      'an NEC 517 health-care facility, so there is no code-defined Equipment branch. Composed as an ' +
      'owner-defined optional-standby (Art. 702) branch serving animal life-support systems — tank ' +
      'circulation pumps, filtration, chillers, ozone/UV, monitoring — on its own ATS EQ4A-1-A so it ' +
      'can be prioritised above general optional standby. The EOR must confirm the classification; ' +
      'if any life-support load is required by a code or permit condition it moves to Art. 701.',
    nec_reference: 'NEC 701.2 / 702.2',
    blocks: 'EQ branch classification · ATS EQ4A-1-A transfer type · load-shed priority',
  },
];

/* ---------------------------------------------------------------------------
 * Tier-2 decisions taken by default or by compositor fill. FOUR keys.
 * ------------------------------------------------------------------------- */
const NOTES = [
  {
    id: 'NOTE-001',
    topic: 'Service voltage and configuration',
    text:
      '480Y/277V, 3 phase 4 wire. Stated: 3000 A; every stated branch is 480 V, so the wye 4W ' +
      'service is the Tier-2 default. Main 3000AF/3000AT LSIG with GFP (NEC 230.95); main and ' +
      'secondary bus 3000 A; service lateral tag 30004.',
    nec_reference: 'NEC 230.95',
  },
  {
    id: 'NOTE-002',
    topic: 'Occupancy and building levels',
    text:
      'Aquarium (assembly occupancy), 58,000 SF, Levels 1-3 plus a mechanical roof. Main electrical ' +
      'room on Level 1. A-7 level lines on both sheets.',
    nec_reference: 'NEC 518',
  },
  {
    id: 'NOTE-003',
    topic: 'Three power branches',
    text:
      'Power 1: CB-02 400 A -> 4P-1-A / 4P-2-A / 4P-3-A, 480Y/277V, 400 A MLO full-rated feed-through ' +
      'risers protected by CB-02. Power 2: CB-03 250 A -> 150 kVA 4T-1-B (Level 1, size Tier-2) -> ' +
      '2S-1-B 600 A sub-distribution (500 A MCB per schedule) -> 225 A MLO panels 2P-1-B / 2P-2-B / ' +
      '2P-3-B on Levels 1, 2, 3 ("2 volt" read as 208 V). Power 3: CB-04 800 A -> 500 kVA 4T-1-C -> ' +
      '2S-1-C 1600 A MCB, 208Y/120V, Level 1.',
    nec_reference: 'NEC 450.3(B) / 240.21(C)',
  },
  {
    id: 'NOTE-004',
    topic: 'Lighting, mechanical and cafe branches',
    text:
      'Lighting: CB-01 225 A -> 4L-1-A (Level 1) -> 4L-3-A (Level 3), 225 A 480Y/277V; the riser ' +
      'passes Level 2 untapped as stated. Mechanical: 4M-1-A (Level 1) and 4M-R-A (Roof), 800 A ' +
      '480Y/277V MLO, each with an internal 70 A breaker feeding a 45 kVA step-down to a 150 A MCB ' +
      '208Y/120V panel (2M-1-A / 2M-R-A) for 120 V mechanical controls and receptacles. Cafe: 400 A, ' +
      'voltage not stated — 480Y/277V panel 4K-1-A (no transformer requested; 120 V cafe loads need ' +
      'one, EOR to confirm).',
    nec_reference: 'NEC 450.3(B)',
  },
  {
    id: 'NOTE-005',
    topic: 'Worst-case impedance basis for fault current',
    text:
      'Every dry-type unit uses percent_z.low from transformer_impedance_V1_0_0.json on an ' +
      'infinite primary bus: 500 kVA 1387.9 A / 0.0575 = 24,137 A; 150 kVA 416.4 A / 0.042 = ' +
      '9,914 A; 75 kVA 208.2 A / 0.044 = 4,731 A; 45 kVA 124.9 A / 0.034 = 3,674 A.',
    nec_reference: 'NEC 110.9',
  },
  {
    id: 'NOTE-006',
    topic: 'Transformer secondary OCPD location',
    text:
      'Every dry-type secondary OCPD is the main of the panel it feeds (1600 A for 500 kVA, 500 A for ' +
      '150 kVA, 250 A for 75 kVA, 150 A for 45 kVA — schedule lookups), protecting the secondary ' +
      'conductors. Primary OCPD per the same schedule (800 / 250 / 125 / 70 A).',
    nec_reference: 'NEC 240.21(C) / 450.3(B)',
  },
  {
    id: 'NOTE-007',
    topic: 'Fire pump tap',
    text:
      'Fire pump CB-FP taps the main bus ahead of the main service disconnect in its own section ' +
      '(NEC 695.4(B), non-negotiable), feeding 4FP-1-A on Level 1.',
    nec_reference: 'NEC 695.4(B)',
  },
  {
    id: 'NOTE-008',
    topic: 'Emergency architecture and EM board',
    text:
      'Golden-case pattern: generator-fed EM switchboard E4MSB-1-A (2000 A, 22 kAIC, two-level with ' +
      'a 2000AF/1600AT LSI main). Its breakers feed the ATS emergency (source 2) inputs; normal ' +
      '(source 1) inputs come from 4MSB-1-A on cross-sheet feeders. Life Safety is in its own ' +
      'section of the EM board (NEC 700.10(B)(5)); each system has its own transfer switch (NEC 700.5(D)).',
    nec_reference: 'NEC 700.5(D) / 700.10(B)(5)',
  },
  {
    id: 'NOTE-009',
    topic: 'Generator branches for an aquarium',
    text:
      'Life Safety E4A-1-A 225 A (Art. 700): sub-distribution E4S-1-A feeding egress-lighting panels E4L-1/2/3-A on every storey, plus a ' +
      '45 kVA step-down to E2P-1-A for fire alarm and emergency 120 V loads. Legally Required ' +
      'L4A-1-A 400 A (Art. 701): smoke control fans, sump/sewage ejectors, L4P-1-A. Equipment ' +
      'EQ4A-1-A 800 A (Art. 702, owner-defined, HALT-007): animal life support, EQ4S-1-A 800 A with ' +
      'a 45 kVA step-down to EQ2P-1-A. Optional Standby O4A-1-A 400 A (Art. 702): cafe refrigeration, ' +
      'IT/data, security, O4P-1-A with a 75 kVA step-down to O2P-1-A. All ATSs 3-pole, solid ' +
      'neutral (generator not separately derived), 65 kA withstand.',
    nec_reference: 'NEC 700 / 701 / 702',
  },
  {
    id: 'NOTE-010',
    topic: 'Two-level ground-fault protection',
    text:
      'GFP service main (NEC 230.95). Feeder breakers on 4MSB-1-A are LSI; second-level GFP is ' +
      'required only for health-care facilities (517.17) and is not applied. The fire pump breaker ' +
      'carries no GFP (NEC 695.6(G)). EM side: ground-fault indication only (NEC 700.6(D)).',
    nec_reference: 'NEC 230.95 / 695.6(G) / 700.6(D)',
  },
  {
    id: 'NOTE-011',
    topic: 'Spare and space provisions',
    text: 'One 400 A / 3P spare and one space on 4MSB-1-A; one 225 A / 3P spare and one space on E4MSB-1-A.',
    nec_reference: null,
  },
];

/* --------------------------------------------------------------------------- */

const routed = [];
const annotations = [];
let aSeq = 601;
const nextA = () => `a-${aSeq++}`;

// A Tier-1 feeder: R-1 plus its A-1 tag and A-2 callout.
function feeder(n, sheet, from, fport, to, tport, tag, tagText = tag) {
  const [calc, callout] = FEEDER[tag];
  const id = `r-${n}`;
  const a1 = nextA();
  const a2 = nextA();
  routed.push({
    id, edge_type: 'R-1', designation: `F-${n}`, sheet_id: sheet,
    start: { device_id: from, port: fport },
    end: { device_id: to, port: tport },
    stub_exempt: false, data_fields: {}, calc_fields: calc,
    annotation_ids: [a1, a2],
  });
  annotations.push(
    { id: a1, annotation_type: 'A-1', bound_to: id, bound_to_type: 'routed_element', sheet_id: sheet, content: { tag_text: tagText } },
    { id: a2, annotation_type: 'A-2', bound_to: id, bound_to_type: 'routed_element', sheet_id: sheet, content: { callout_text: callout } },
  );
  return `F-${n}`;
}

// Cross-sheet ATS normal feed: full-spec S1 segment + stub-exempt S2 alias
// with identical endpoints (hospital dialect), A-3 squiggle on both.
const crossRefs = [];
function crossFeeder(n, from, ats, atsDesig, tag) {
  const [calc, callout] = FEEDER[tag];
  const s1 = `r-${n}-s1`;
  const s2 = `r-${n}-s2`;
  const [a1, a2, q1, q2] = [nextA(), nextA(), nextA(), nextA()];
  const ends = { start: { device_id: from, port: 'line_in' }, end: { device_id: ats, port: 'source1_in' } };
  routed.push(
    { id: s1, edge_type: 'R-1', designation: `F-${n}.S1`, sheet_id: 'S1', ...ends, stub_exempt: false, data_fields: {}, calc_fields: calc, annotation_ids: [a1, a2, q1] },
    { id: s2, edge_type: 'R-1', designation: `F-${n}.S2`, sheet_id: 'S2', ...ends, stub_exempt: true, data_fields: {}, calc_fields: {}, annotation_ids: [q2] },
  );
  annotations.push(
    { id: a1, annotation_type: 'A-1', bound_to: s1, bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: tag } },
    { id: a2, annotation_type: 'A-2', bound_to: s1, bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: callout } },
    { id: q1, annotation_type: 'A-3', bound_to: s1, bound_to_type: 'routed_element', sheet_id: 'S1', designation: `SQ-F-${n}-1`, content: { text: `TO ${atsDesig}`, direction: 'to', destination_designation: atsDesig } },
    { id: q2, annotation_type: 'A-3', bound_to: s2, bound_to_type: 'routed_element', sheet_id: 'S2', designation: `SQ-F-${n}-2`, content: { text: 'FROM 4MSB-1-A', direction: 'from', destination_designation: '4MSB-1-A' } },
  );
  crossRefs.push({ id: `cs-${n}`, kind: 'feeder', source_sheet: 'S1', dest_sheet: 'S2', source_routed_element_id: s1, dest_routed_element_id: s2 });
}

const fc = (bound, type, sheet, amps, mode = null, anchor = 'default') => {
  annotations.push({ id: nextA(), annotation_type: 'A-4', bound_to: bound, bound_to_type: type, sheet_id: sheet, content: { fc_amps: amps, mode, anchor } });
};

/* ── Device helpers ──────────────────────────────────────────────────────── */

const cb = (id, desig, sheet, af, at, trip, extra = {}) =>
  ({ id, node_type: 'L2-1', designation: desig, sheet_id: sheet, data_fields: { af, at, poles: 3, trip_type: trip, ...extra } });
const panel = (id, desig, sheet, rating, voltage, main, fcA) => ({
  id, node_type: 'L2-4', designation: desig, sheet_id: sheet,
  data_fields: { rating, voltage, [main]: true },
  ...(fcA ? { calc_fields: { available_fc: fcA } } : {}),
});
const xfmr = (id, desig, sheet, kva) => ({
  id, node_type: 'L2-2', designation: desig, sheet_id: sheet,
  data_fields: { kva, config: '480Δ-208Y/120V' },
  calc_fields: { pct_z: XZ[kva][0], x_over_r: XZ[kva][1] },
});
const ats = (id, desig, rating, cls) => ({
  id, node_type: 'L2-3', designation: desig, sheet_id: 'S2',
  data_fields: { continuous_rating: rating, poles: 3, nec_class: cls },
  calc_fields: { withstand_rating: 65000 },
});

/* ── Devices ─────────────────────────────────────────────────────────────── */

const devices = [
  // ── S1: service entrance ──────────────────────────────────────────────
  {
    id: 'd-301', node_type: 'L0-1', designation: 'UTILITY-XFMR', sheet_id: 'S1',
    data_fields: { kva_rating: 2500, primary_voltage: '13.2kV', secondary_voltage: '480Y/277V', phases: 3, wires: 4 },
    calc_fields: { pct_z: 5.32, x_over_r: 8.0, available_fc: FC_SVC },
  },
  { id: 'd-302', node_type: 'L1-4', designation: 'UTIL-MTR', sheet_id: 'S1', data_fields: { meter_type: 'utility' } },
  // Fire pump breaker on the MAIN bus, ahead of the main — NEC 695.4(B). HALT-004.
  cb('d-303', 'CB-FP', 'S1', 800, 800, 'LSI'),
  // GFP main, NEC 230.95.
  { id: 'd-304', node_type: 'L1-1', designation: 'MAIN-GFP', sheet_id: 'S1', data_fields: { af: 3000, at: 3000, poles: 3, trip_type: 'LSIG' } },
  { id: 'd-305', node_type: 'L3-1', designation: '4FP-1-A', sheet_id: 'S1', data_fields: { hp: 100, fla: 124, lra: 725, voltage_phase: '480V-3PH' } },
  { id: 'd-306', node_type: 'L1-3', designation: 'NG-BOND', sheet_id: 'S1', data_fields: { sds: 'service_entrance' } },

  // ── S1: distribution breakers, in bus order ────────────────────────────
  cb('d-312', 'CB-01', 'S1', 250, 225, 'LSI'),    // Lighting riser
  cb('d-310', 'CB-02', 'S1', 400, 400, 'LSI'),    // Power 1 — 480 V riser
  cb('d-311', 'CB-03', 'S1', 250, 250, 'LSI'),    // Power 2 — 150 kVA primary (tag 2503)
  cb('d-313', 'CB-04', 'S1', 800, 800, 'LSI'),    // Power 3 — 500 kVA primary (tag 8003)
  cb('d-314', 'CB-05', 'S1', 400, 400, 'LSI'),    // Cafe
  cb('d-315', 'CB-06', 'S1', 800, 800, 'LSI'),    // Mechanical L1
  cb('d-316', 'CB-07', 'S1', 800, 800, 'LSI'),    // Mechanical Roof
  cb('d-317', 'CB-08', 'S1', 250, 225, 'LSI'),    // LS ATS normal
  cb('d-318', 'CB-09', 'S1', 400, 400, 'LSI'),    // LR ATS normal
  cb('d-319', 'CB-10', 'S1', 800, 800, 'LSI'),    // EQ ATS normal
  cb('d-320', 'CB-11', 'S1', 400, 400, 'LSI'),    // OS ATS normal
  { id: 'd-321', node_type: 'L2-7', designation: 'SPARE-01', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '400A/3P' } },
  { id: 'd-322', node_type: 'L2-7', designation: 'SPACE-01', sheet_id: 'S1', data_fields: { kind: 'space' } },

  // ── S1: Power 1 — 480 V riser, Levels 1-3
  panel('d-330', '4P-1-A', 'S1', '400A', '480Y/277V', 'mlo'),
  panel('d-331', '4P-2-A', 'S1', '400A', '480Y/277V', 'mlo'),
  panel('d-332', '4P-3-A', 'S1', '400A', '480Y/277V', 'mlo'),

  // ── S1: Power 2 — 150 kVA -> 2S-1-B -> 208 V panels L1/L2/L3
  xfmr('d-335', '4T-1-B', 'S1', 150),
  panel('d-336', '2S-1-B', 'S1', '600A', '208Y/120V', 'mcb', FC208[150]),
  panel('d-337', '2P-1-B', 'S1', '225A', '208Y/120V', 'mlo'),
  panel('d-338', '2P-2-B', 'S1', '225A', '208Y/120V', 'mlo'),
  panel('d-339', '2P-3-B', 'S1', '225A', '208Y/120V', 'mlo'),

  // ── S1: Lighting — Levels 1 and 3
  panel('d-340', '4L-1-A', 'S1', '225A', '480Y/277V', 'mlo'),
  panel('d-341', '4L-3-A', 'S1', '225A', '480Y/277V', 'mlo'),

  // ── S1: Power 3 — 500 kVA -> 2S-1-C
  xfmr('d-345', '4T-1-C', 'S1', 500),
  panel('d-346', '2S-1-C', 'S1', '1600A', '208Y/120V', 'mcb', FC208[500]),

  // ── S1: Cafe
  panel('d-348', '4K-1-A', 'S1', '400A', '480Y/277V', 'mlo'),

  // ── S1: Mechanical L1 — 4M-1-A -> internal 70 A -> 45 kVA -> 2M-1-A
  panel('d-350', '4M-1-A', 'S1', '800A', '480Y/277V', 'mlo'),
  cb('d-351', '4M-1-A-CB', 'S1', 100, 70, 'TM', { internal_to: '4M-1-A' }),
  xfmr('d-352', '4T-1-M', 'S1', 45),
  panel('d-353', '2M-1-A', 'S1', '150A', '208Y/120V', 'mcb', FC208[45]),

  // ── S1: Mechanical Roof — 4M-R-A -> internal 70 A -> 45 kVA -> 2M-R-A
  panel('d-355', '4M-R-A', 'S1', '800A', '480Y/277V', 'mlo'),
  cb('d-356', '4M-R-A-CB', 'S1', 100, 70, 'TM', { internal_to: '4M-R-A' }),
  xfmr('d-357', '4T-R-M', 'S1', 45),
  panel('d-358', '2M-R-A', 'S1', '150A', '208Y/120V', 'mcb', FC208[45]),

  // ── S2: generator + EM switchboard ──────────────────────────────────────
  {
    id: 'd-370', node_type: 'L1-5', designation: 'GEN-1', sheet_id: 'S2',
    data_fields: {
      kw: 1000, kva: 1250, voltage: '480Y/277V', phases: 3, wires: 4,
      nfpa_level: 'NFPA 110 Level 1 / Type 10 / Class 48', af: 2000, at: 1600, trip_type: 'LSI',
    },
  },
  { id: 'd-371', node_type: 'L1-1', designation: 'EMSB-MAIN', sheet_id: 'S2', data_fields: { af: 2000, at: 1600, poles: 3, trip_type: 'LSI' } },
  cb('d-372', 'ECB-01', 'S2', 250, 225, 'LSI'),     // -> LS ATS source 2
  cb('d-373', 'ECB-02', 'S2', 400, 400, 'LSI'),     // -> LR ATS source 2
  cb('d-374', 'ECB-03', 'S2', 800, 800, 'LSI'),     // -> EQ ATS source 2
  cb('d-375', 'ECB-04', 'S2', 400, 400, 'LSI'),     // -> OS ATS source 2
  { id: 'd-376', node_type: 'L2-7', designation: 'SPARE-EM-01', sheet_id: 'S2', data_fields: { kind: 'spare', rating: '225A/3P' } },
  { id: 'd-377', node_type: 'L2-7', designation: 'SPACE-EM-01', sheet_id: 'S2', data_fields: { kind: 'space' } },

  // ── S2: ATSs — dual-source, so NO available_fc (TV-5); dual A-4 instead.
  ats('d-380', 'E4A-1-A', 225, 'LIFE SAFETY'),
  ats('d-381', 'L4A-1-A', 400, 'LEGALLY REQUIRED 701'),
  ats('d-382', 'EQ4A-1-A', 800, 'EQUIPMENT'),
  ats('d-383', 'O4A-1-A', 400, 'OPTIONAL STANDBY'),

  // ── S2: Life Safety — E4S-1-A sub-distribution -> E4L-1/2/3-A; 45 kVA -> E2P-1-A
  panel('d-384', 'E4S-1-A', 'S2', '225A', '480Y/277V', 'mlo'),
  panel('d-385', 'E4L-1-A', 'S2', '225A', '480Y/277V', 'mlo'),
  panel('d-386', 'E4L-2-A', 'S2', '225A', '480Y/277V', 'mlo'),
  panel('d-387', 'E4L-3-A', 'S2', '225A', '480Y/277V', 'mlo'),
  cb('d-388', 'E4L-1-A-CB', 'S2', 100, 70, 'TM', { internal_to: 'E4L-1-A' }),
  xfmr('d-389', 'E4T-1-A', 'S2', 45),
  panel('d-390', 'E2P-1-A', 'S2', '150A', '208Y/120V', 'mcb', FC208[45]),

  // ── S2: Legally Required
  panel('d-392', 'L4P-1-A', 'S2', '400A', '480Y/277V', 'mlo'),

  // ── S2: Equipment (animal life support) — EQ4S-1-A + 45 kVA -> EQ2P-1-A
  panel('d-394', 'EQ4S-1-A', 'S2', '800A', '480Y/277V', 'mlo'),
  cb('d-395', 'EQ4S-1-A-CB', 'S2', 100, 70, 'TM', { internal_to: 'EQ4S-1-A' }),
  xfmr('d-396', 'EQ4T-1-A', 'S2', 45),
  panel('d-397', 'EQ2P-1-A', 'S2', '150A', '208Y/120V', 'mcb', FC208[45]),

  // ── S2: Optional Standby — O4P-1-A + 75 kVA -> O2P-1-A
  panel('d-399', 'O4P-1-A', 'S2', '400A', '480Y/277V', 'mlo'),
  cb('d-400', 'O4P-1-A-CB', 'S2', 125, 125, 'TM', { internal_to: 'O4P-1-A' }),
  xfmr('d-401', 'O4T-1-A', 'S2', 75),
  panel('d-402', 'O2P-1-A', 'S2', '250A', '208Y/120V', 'mcb', FC208[75]),
];

/* ── Routed elements ─────────────────────────────────────────────────────── */

// Service lateral, TV-1-exempt: carries the A-2 alone.
{
  const a = nextA();
  routed.push({
    id: 'r-301', edge_type: 'R-1', designation: 'F-301', sheet_id: 'S1',
    start: { device_id: 'd-301', port: 'secondary_out' },
    end: { device_id: 'd-304', port: 'line_in' },
    stub_exempt: false, data_fields: { is_service_entrance: true },
    calc_fields: FEEDER['30004'][0], annotation_ids: [a],
  });
  annotations.push({ id: a, annotation_type: 'A-2', bound_to: 'r-301', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: FEEDER['30004'][1] } });
}

// Fire pump.
feeder(302, 'S1', 'd-303', 'line_in', 'd-305', 'load_in', '1753');

// Power 1 — 480 V riser.
feeder(310, 'S1', 'd-310', 'line_in', 'd-330', 'feed_top', '4004');
feeder(311, 'S1', 'd-330', 'feed_top', 'd-331', 'feed_bottom', '4004');
feeder(312, 'S1', 'd-331', 'feed_top', 'd-332', 'feed_bottom', '4004');

// Power 2 — 150 kVA -> 2S-1-B fan-out.
feeder(315, 'S1', 'd-311', 'line_in', 'd-335', 'primary_in', '2503');
feeder(316, 'S1', 'd-335', 'secondary_out', 'd-336', 'feed_top', '5004T');
feeder(317, 'S1', 'd-336', 'feed_left', 'd-337', 'feed_right', '2254');
feeder(318, 'S1', 'd-336', 'feed_top', 'd-338', 'feed_bottom', '2254');
feeder(319, 'S1', 'd-336', 'feed_top', 'd-339', 'feed_bottom', '2254');

// Lighting.
feeder(320, 'S1', 'd-312', 'line_in', 'd-340', 'feed_top', '2254');
feeder(321, 'S1', 'd-340', 'feed_top', 'd-341', 'feed_bottom', '2254');

// Power 3 — 500 kVA.
feeder(325, 'S1', 'd-313', 'line_in', 'd-345', 'primary_in', '8003');
feeder(326, 'S1', 'd-345', 'secondary_out', 'd-346', 'feed_top', '16004T');

// Cafe.
feeder(328, 'S1', 'd-314', 'line_in', 'd-348', 'feed_top', '4004');

// Mechanical L1.
feeder(330, 'S1', 'd-315', 'line_in', 'd-350', 'feed_top', '8004');
feeder(331, 'S1', 'd-351', 'line_in', 'd-352', 'primary_in', '703');
feeder(332, 'S1', 'd-352', 'secondary_out', 'd-353', 'feed_top', '1504T');

// Mechanical Roof.
feeder(335, 'S1', 'd-316', 'line_in', 'd-355', 'feed_top', '8004');
feeder(336, 'S1', 'd-356', 'line_in', 'd-357', 'primary_in', '703');
feeder(337, 'S1', 'd-357', 'secondary_out', 'd-358', 'feed_top', '1504T');

// ATS normal sources, cross-sheet S1 -> S2.
crossFeeder(340, 'd-317', 'd-380', 'E4A-1-A', '2254');
crossFeeder(341, 'd-318', 'd-381', 'L4A-1-A', '4004');
crossFeeder(342, 'd-319', 'd-382', 'EQ4A-1-A', '8004');
crossFeeder(343, 'd-320', 'd-383', 'O4A-1-A', '4004');

// Generator feeder -> EM main bus (HALT-005).
feeder(350, 'S2', 'd-370', 'gen_out', 'r-393', 'bus_tap_bi', '16004', 'GEN');
// EM breakers -> ATS source 2.
feeder(351, 'S2', 'd-372', 'line_in', 'd-380', 'source2_in', '2254');
feeder(352, 'S2', 'd-373', 'line_in', 'd-381', 'source2_in', '4004');
feeder(353, 'S2', 'd-374', 'line_in', 'd-382', 'source2_in', '8004');
feeder(354, 'S2', 'd-375', 'line_in', 'd-383', 'source2_in', '4004');
// Life Safety.
feeder(355, 'S2', 'd-380', 'load_out', 'd-384', 'feed_top', '2254');
feeder(356, 'S2', 'd-384', 'feed_bottom', 'd-385', 'feed_top', '2254');
feeder(357, 'S2', 'd-384', 'feed_top', 'd-386', 'feed_bottom', '2254');
feeder(361, 'S2', 'd-384', 'feed_bottom', 'd-387', 'feed_bottom', '2254');
feeder(358, 'S2', 'd-388', 'line_in', 'd-389', 'primary_in', '703');
feeder(359, 'S2', 'd-389', 'secondary_out', 'd-390', 'feed_top', '1504T');
// Legally Required.
feeder(360, 'S2', 'd-381', 'load_out', 'd-392', 'feed_top', '4004');
// Equipment.
feeder(362, 'S2', 'd-382', 'load_out', 'd-394', 'feed_top', '8004');
feeder(363, 'S2', 'd-395', 'line_in', 'd-396', 'primary_in', '703');
feeder(364, 'S2', 'd-396', 'secondary_out', 'd-397', 'feed_top', '1504T');
// Optional Standby.
feeder(366, 'S2', 'd-383', 'load_out', 'd-399', 'feed_top', '4004');
feeder(367, 'S2', 'd-400', 'line_in', 'd-401', 'primary_in', '1253');
feeder(368, 'S2', 'd-401', 'secondary_out', 'd-402', 'feed_top', '2504T');

// Buses — the r-39x band is kept clear of the feeder allocator (SCHEMA-8).
const bus = (id, desig, sheet, level, rating, fcA) => ({
  id, edge_type: 'R-2', designation: desig, sheet_id: sheet,
  bus_level: level, stroke_weight: level === 'main' ? 2.5 : 2,
  start: null, end: null, stub_exempt: null, data_fields: {},
  calc_fields: { bus_rating: rating, ...(fcA ? { available_fc: fcA } : {}) },
  annotation_ids: [],
});
routed.push(
  bus('r-391', 'main-bus-4MSB-1-A', 'S1', 'main', 3000, FC_SVC),
  bus('r-392', 'sec-bus-4MSB-1-A', 'S1', 'secondary', 3000, FC_SVC),
  bus('r-393', 'main-bus-E4MSB-1-A', 'S2', 'main', 2000),
  bus('r-394', 'sec-bus-E4MSB-1-A', 'S2', 'secondary', 2000),
);

/* ── A-4 fault-current tags ──────────────────────────────────────────────── */
// TV-5: every device / bus with calc_fields.available_fc carries exactly one A-4.
fc('r-391', 'routed_element', 'S1', FC_SVC, null, 'bus');
fc('d-301', 'device', 'S1', FC_SVC);
for (const d of devices) {
  if (d.node_type === 'L2-4' && d.calc_fields?.available_fc) fc(d.id, 'device', d.sheet_id, d.calc_fields.available_fc);
}
fc('r-393', 'routed_element', 'S2', FC_GEN, 'EM', 'bus');
for (const a of ['d-380', 'd-381', 'd-382', 'd-383']) {
  fc(a, 'device', 'S2', FC_SVC, 'N', 'load');
  fc(a, 'device', 'S2', FC_GEN, 'EM', 'load');
}
for (const r of routed) {
  if (r.annotation_ids) r.annotation_ids = r.annotation_ids.concat(
    annotations.filter((a) => a.annotation_type === 'A-4' && a.bound_to === r.id).map((a) => a.id),
  );
}

/* ── Topology ────────────────────────────────────────────────────────────── */

const s1Dist = ['d-312', 'd-310', 'd-311', 'd-313', 'd-314', 'd-315', 'd-316'];
const s1Ats = ['d-317', 'd-318', 'd-319', 'd-320', 'd-321', 'd-322'];

const topology = {
  $schema: 'sld_topology/v1',

  metadata: {
    schema_version: '1.0.0',
    project_name: 'Aquarium — 3000 A Service',
    created_date: '2026-11-21',
    slug: SLUG,
    heading: 'Aquarium',
    facts: [
      '3000 A service, 480Y/277V 3PH 4W, 2500 kVA utility transformer (derived)',
      '58,000 SF aquarium — Levels 1-3 + Roof',
      'Fire pump 100 HP tapped ahead of the main (NEC 695.4(B))',
      '1000 kW generator; LS 225 A / LR 400 A / EQ 800 A / OS 400 A ATSs',
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
      nec_motor_fla: 'V1_0_0',
    },
    compositor_halts: HALTS,
    compositor_notes: NOTES,
  },

  sheets: [
    { sheet_id: 'S1', sheet_number: 'E-501', title: 'MAIN SINGLE-LINE DIAGRAM — NORMAL POWER' },
    { sheet_id: 'S2', sheet_number: 'E-502', title: 'MAIN SINGLE-LINE DIAGRAM — EMERGENCY / STANDBY POWER' },
  ],

  devices,
  routed_elements: routed,
  annotations,

  switchboards: [
    {
      id: 'sw-201', designation: '4MSB-1-A', variant: 'NP', bus_architecture: 'two-level', sheet_id: 'S1',
      data_fields: { rating: '3000A', voltage: '480Y/277V', wires: '4W, 3PH', aic: '65kAIC' },
      secondary_bus_overflow_ids: [], main_bus_id: 'r-391', secondary_bus_id: 'r-392', distribution_bus_id: null,
    },
    {
      id: 'sw-202', designation: 'E4MSB-1-A', variant: 'EM', bus_architecture: 'two-level', sheet_id: 'S2',
      data_fields: { rating: '2000A', voltage: '480Y/277V', wires: '4W, 3PH', aic: '22kAIC' },
      secondary_bus_overflow_ids: [], main_bus_id: 'r-393', secondary_bus_id: 'r-394', distribution_bus_id: null,
    },
  ],

  sections: [
    { id: 'sec-201', switchboard_id: 'sw-201', type: 'incoming', order: 1, nec_class: null, section_tag: 'SEC-1', device_ids: [] },
    { id: 'sec-202', switchboard_id: 'sw-201', type: 'metering', order: 2, nec_class: null, section_tag: 'SEC-2', device_ids: ['d-302'] },
    { id: 'sec-203', switchboard_id: 'sw-201', type: 'fire_pump', order: 3, nec_class: null, section_tag: 'SEC-3', device_ids: ['d-303'] },
    { id: 'sec-204', switchboard_id: 'sw-201', type: 'main_breaker', order: 4, nec_class: null, section_tag: 'SEC-4', device_ids: ['d-304'] },
    { id: 'sec-205', switchboard_id: 'sw-201', type: 'distribution', order: 5, nec_class: null, section_tag: 'SEC-5', device_ids: s1Dist },
    { id: 'sec-206', switchboard_id: 'sw-201', type: 'distribution', order: 6, nec_class: null, section_tag: 'SEC-6', device_ids: [...s1Ats, 'd-306'] },

    { id: 'sec-210', switchboard_id: 'sw-202', type: 'incoming', order: 1, nec_class: null, section_tag: 'SEC-1-EM', device_ids: [] },
    { id: 'sec-211', switchboard_id: 'sw-202', type: 'main_breaker', order: 2, nec_class: null, section_tag: 'SEC-2-EM', device_ids: ['d-371'] },
    // Life Safety alone — NEC 700.10(B)(5).
    { id: 'sec-212', switchboard_id: 'sw-202', type: 'distribution', order: 3, nec_class: '700', section_tag: 'SEC-3-EM', device_ids: ['d-372'] },
    { id: 'sec-213', switchboard_id: 'sw-202', type: 'distribution', order: 4, nec_class: '701', section_tag: 'SEC-4-EM', device_ids: ['d-373'] },
    { id: 'sec-214', switchboard_id: 'sw-202', type: 'distribution', order: 5, nec_class: '702', section_tag: 'SEC-5-EM', device_ids: ['d-374', 'd-375'] },
    { id: 'sec-215', switchboard_id: 'sw-202', type: 'distribution', order: 6, nec_class: null, section_tag: 'SEC-6-EM', device_ids: ['d-376', 'd-377'] },
  ],

  port_assignments: [
    { id: 'pa-301', device_id: 'd-303', port: 'bus_out', bus_id: 'r-391' },
    { id: 'pa-302', device_id: 'd-304', port: 'line_in', bus_id: 'r-391' },
    { id: 'pa-303', device_id: 'd-304', port: 'bus_out', bus_id: 'r-392' },
    ...[...s1Dist, ...s1Ats].map((d, i) => ({ id: `pa-${304 + i}`, device_id: d, port: 'bus_out', bus_id: 'r-392' })),
    { id: 'pa-330', device_id: 'd-351', port: 'bus_out', attached_to_device: 'd-350', attached_to_port: 'feed_bottom' },
    { id: 'pa-331', device_id: 'd-356', port: 'bus_out', attached_to_device: 'd-355', attached_to_port: 'feed_bottom' },
    { id: 'pa-340', device_id: 'd-371', port: 'line_in', bus_id: 'r-393' },
    { id: 'pa-341', device_id: 'd-371', port: 'bus_out', bus_id: 'r-394' },
    ...['d-372', 'd-373', 'd-374', 'd-375', 'd-376', 'd-377']
      .map((d, i) => ({ id: `pa-${342 + i}`, device_id: d, port: 'bus_out', bus_id: 'r-394' })),
    { id: 'pa-350', device_id: 'd-388', port: 'bus_out', attached_to_device: 'd-385', attached_to_port: 'feed_bottom' },
    { id: 'pa-351', device_id: 'd-395', port: 'bus_out', attached_to_device: 'd-394', attached_to_port: 'feed_bottom' },
    { id: 'pa-352', device_id: 'd-400', port: 'bus_out', attached_to_device: 'd-399', attached_to_port: 'feed_bottom' },
  ],

  spur_attachments: [],

  measurement_attachments: [
    { id: 'meas-301', device_id: 'd-302', host_routed_element_id: 'r-391', mode: 'ct', position: 'incoming_section' },
  ],

  cross_sheet_refs: crossRefs,

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
