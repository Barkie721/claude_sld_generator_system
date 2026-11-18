#!/usr/bin/env node
/**
 * rainbow_build_topology.mjs — the ONLY hand-edited file in this project.
 *
 * Rainbow Clinic for Cat Wellness: 18,862 SF single-storey veterinary clinic,
 * 600 A / 480Y-277V service, 200 kW generator, true NEC 700 / 701 / 702 standby
 * systems (NEC 517 does not apply to a veterinary occupancy) with one ATS per
 * class. The owner supplied NO electrical scope: every rating is compositor-
 * derived in 1_source/rainbow_SLD_narrative_V1_0_0.md and repeated in
 * metadata.compositor_notes[] (Tier-2) or metadata.compositor_halts[] (Tier-3).
 *
 * Cloned from 09_tests/04_Clinic AI Test - 3000A - One Sheet (clinic1s) — same
 * one-sheet shape: normal switchboard 4MSB-1-A + generator -> EM switchboard
 * E4MSB-1-A -> 3 ATSs, internal-breaker step-down chains, feed-through panel
 * pair 2P-1-A / 2P-1-B.
 *
 * Writes two files into 2_build/:
 *   rainbow_layout_config.json        the sidecar (sidecar keys win at layout time)
 *   rainbow_SLD_topology_V1_0_0.json  topology with an EMBEDDED copy of the same config
 *
 * ID ranges are rebased off the hospital golden (schema §16): d-3xx / r-3xx /
 * r-39x buses / a-6xx+ / sw-2xx / sec-2xx / pa-3xx / meas-3xx / cs-3xx. The
 * engine carries hardcodes keyed on golden ids (r-042/r-047/r-052, E4B-1-A).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '2_build');
const SLUG = 'rainbow';

/* ---------------------------------------------------------------------------
 * layout_config
 *
 * One storey, so no level lines and no riser cascades. Every hospital-named
 * default is CLEARED EXPLICITLY — absent keys fall back to the engine's _DEF_*
 * golden values (sheet_skips would silently drop any S2 tag containing -2-/-3-,
 * and ats_xoffset_overrides names E4A-1-A).
 * ------------------------------------------------------------------------- */
const LAYOUT_CONFIG = {
  sheet_roles: { S1: 'emergency' },
  sheet_skips: {},

  // Object form — the flat array falls back to the hospital stack.
  floor_order: { S1: ['1'] },
  floor_anchors: {},
  floor_anchors_mechanical: {},
  floor_band_designations: [],
  level_map: {},
  level_order: [],

  ats_xoffset_overrides: {},

  riser_step_standard: 650,
  riser_step_roof: 1460,

  // No sub-feed chains: every step-down rides the internal-chain pass and
  // 2P-1-B is placed by feed_through_panels.
  subfeed_max_depth: 1,
  subfeed_start_ports: ['feed_bottom', 'feed_top', 'feed_left', 'secondary_out'],
  subfeed_src_types: ['L2-4', 'L2-2'],
  subfeed_dst_types: ['L2-4', 'L2-2'],
  ats_extent_subfeed_ports: ['feed_bottom', 'feed_top', 'secondary_out'],
  subfeed_straighten: [],
  subfeed_exit_x_nudge: {},
  chain_dst_x_offset: {},

  s2_level_line_pitch: {},
  s2_shift_delta: {},
  subfeed_midy_nudge: {},

  // OFF-031 (engine 1.0.18): 2P-1-B is fed through 2P-1-A's feed-through lugs,
  // drawn butted to the LEFT of 2P-1-A; F-305 stays in the topology as an
  // intentional skip.
  feed_through_panels: { '2P-1-B': 'left' },

  a1_tag_placement: {
    // O4M-1-A's two-transformer fan: both primary jog tags hang below their
    // jog (TX-primary default) with the pill 4 px off the feeder's own lower
    // vertical leg. Push each pill outward, away from the leg it sits beside
    // (pill-only move — the tick stays on the jog, OFF-023).
    'F-331': { pill_dx: -14 },
    'F-333': { pill_dx: 14 },
  },
  a3_text_placement: {},
  fc_pennant_placement: {},
  fc_pennant_y_nudges: {},
};

const SIDECAR_COMMENT =
  'Sidecar layout_config for Rainbow Clinic for Cat Wellness (600 A, one storey, one sheet: ' +
  'normal + NEC 700/701/702 standby). Every hospital-golden default that names hospital ' +
  "designations is explicitly cleared — absent keys fall back to the engine's _DEF_* hospital values (schema §19).";

const EMBED_COMMENT =
  'Embedded copy of rainbow_layout_config.json. Embedded (not sidecar-only) so validator rule ' +
  'CV-14 runs — its capability gate reads topology.layout_config.subfeed_start_ports and cannot ' +
  'see external configs (08_validation/lib/context_V1_0_0.mjs). Sidecar keys still win at layout time.';

/* ---------------------------------------------------------------------------
 * Tier-3 halts — FIVE keys (id, topic, text, nec_reference, blocks); rendered
 * into OPEN_ITEMS.md by 4_checks/make_open_items.mjs.
 * ------------------------------------------------------------------------- */
const HALTS = [
  {
    id: 'HALT-001',
    topic: 'Feeder distances',
    text:
      'COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation ' +
      'performed; no A-5 tags. Fault current below each bus is NOT attenuated for feeder ' +
      'impedance — the 14.96 kA service value is a conservative bound for every 480 V normal-side ' +
      'device, and the 208 V values are infinite-primary-bus bounds.',
    nec_reference: 'NEC 210.19(A) IN / 215.2(A)(1) IN',
    blocks: 'Voltage-drop calculation · A-5 tags · per-device fault current',
  },
  {
    id: 'HALT-002',
    topic: 'Utility fault current + transformer impedance — DERIVED, not confirmed',
    text:
      'COMPOSITOR_HALT: utility available fault current and the utility transformer nameplate ' +
      'were not provided. Derived on a worst-case basis: 500 kVA pad-mount (FLA 601 A), %Z 4.35 ' +
      'less the IEEE C57.12.00 -7.5% tolerance = 4.02%, infinite primary bus: 601 A / 0.0402 = ' +
      '14,960 A sym, so 22 kAIC. X/R 5.5 assumed (no utility data). No motor contribution. The ' +
      'utility letter and transformer nameplate must confirm before AIC ratings are released for ' +
      'procurement.',
    nec_reference: 'NEC 110.9 / 110.24',
    blocks: 'AIC ratings released for procurement · DV-4 bus bracing verified against utility data',
  },
  {
    id: 'HALT-003',
    topic: 'Connected-load schedule / service adequacy',
    text:
      'COMPOSITOR_HALT: no connected-load or panel schedule exists (T3-EOR). The 600 A service is ' +
      'an NEC 220 area-based estimate (290.2 kVA calculated, 349 A at 480 V, +25% growth = 436 A) ' +
      'built on assumed receptacle, HVAC, kitchen and laundry densities; every panel rating is a ' +
      'Tier-2 default. Live feeder trips total 835 A on the 600 A bus (diversity).',
    nec_reference: 'NEC 220 / 230.42(A)',
    blocks: 'Service-size verification · panel schedules · feeder sizing confirmation',
  },
  {
    id: 'HALT-004',
    topic: 'Generator breaker, feeder and capacity — Tier-3 values FILLED by compositor',
    text:
      'COMPOSITOR_HALT: generator feeder sizing is EOR input with no schedule lookup (NEC 445.13). ' +
      'The compositor FILLED: 200 kW / 250 kVA at 0.8 PF, FLA 300.7 A, against an estimated ' +
      '128 kVA standby load (700 ~15 kVA, 701 ~22.5 kVA, 702 ~90 kVA) sized up for motor ' +
      'starting; integral breaker 400AF/350AT LSI (>=115% FLA); feeder on feeder_schedule tag ' +
      '4004, (2) 3"C - (4)350 AL + #3 CU GND. Aggregate ATS ratings 350 A exceed the generator ' +
      'FLA — acceptable only with load diversity and 702 load shed (NEC 700.4(B) / 702.4). The ' +
      'generator sizing study is owed.',
    nec_reference: 'NEC 445.12 / 445.13 / 700.4(B) / 702.4',
    blocks: 'Generator feeder release · generator sizing study · EM board main rating',
  },
  {
    id: 'HALT-005',
    topic: 'Generator subtransient reactance — ASSUMED',
    text:
      'COMPOSITOR_HALT: X"d 0.12 pu assumed (worst case, low end of the typical 0.12-0.18 range) ' +
      'for the emergency-source fault current: 300.7 A / 0.12 = 2,506 A sym on the EM bus. ' +
      'Generator submittal data must confirm before the EM board 10 kAIC rating is released.',
    nec_reference: 'NEC 110.9 / 700.4',
    blocks: 'EM board AIC release · ATS emergency-side withstand verification',
  },
  {
    id: 'HALT-006',
    topic: 'Unplaced rooms in the architectural model',
    text:
      'COMPOSITOR_HALT: two harvested rooms are unplaced in the Revit model and carry 0 SF — ' +
      '200 MECHANICAL ELECTRICAL and 238 GENERAL STORAGE. They are excluded from the 18,862 SF ' +
      'basis, so the NEC 220 area load calculation (and the 600 A service derived from it) may ' +
      'be understated. The architect must place or delete them.',
    nec_reference: 'NEC 220.12 / 220.42',
    blocks: 'Load-calculation basis · service-size verification',
  },
];

/* ---------------------------------------------------------------------------
 * Tier-2 decisions taken by default or by compositor fill. FOUR keys, no
 * `blocks` — these do NOT gate graduation.
 * ------------------------------------------------------------------------- */
const NOTES = [
  {
    id: 'NOTE-001',
    topic: 'Service size and configuration',
    text:
      '600 A, 480Y/277V, 3 phase 4 wire. Owner supplied no electrical scope: NEC 220 area-based ' +
      'calculation 290.2 kVA -> 349 A at 480 V, +25% growth = 436 A -> next standard size 600 A ' +
      '(NEC 240.6(A)); 26.4 VA/SF on 18,862 SF. Service lateral feeder_schedule tag 6004.',
    nec_reference: 'NEC 220 / 240.6(A)',
  },
  {
    id: 'NOTE-002',
    topic: 'Occupancy and standby classes',
    text:
      'Veterinary clinic for cats, 18,862 SF, one storey (Level 1). NEC 517 covers human ' +
      'health-care facilities only, so the standby system is laid out as true Article 700 ' +
      '(egress lighting, fire alarm, egress hardware), 701 (domestic water booster, sewage ' +
      'ejector) and 702 (animal-housing HVAC, refrigeration, IT) classes, one ATS each. ' +
      'Single storey: no A-7 level lines, no riser cascades.',
    nec_reference: 'NEC 517.1 / 700 / 701 / 702',
  },
  {
    id: 'NOTE-003',
    topic: 'Service main — no ground-fault protection',
    text:
      'Main MAIN-CB 800AF/600AT LSI. GFP of equipment is not required: NEC 230.95 applies to ' +
      'services of 1000 A and above. Normal-side feeder breakers are thermal-magnetic (TM); no ' +
      'second-level GFP (NEC 517.17 does not apply). N-G bond at the service (NEC 250.24(C)) and ' +
      'utility meter as standard.',
    nec_reference: 'NEC 230.95 / 250.24(C)',
  },
  {
    id: 'NOTE-004',
    topic: 'Branch architecture — 480 V panels ahead of the step-downs',
    text:
      'The plug, mechanical, 700 and 702 branches are drawn as 480Y/277V MLO panels (4P-1-A, ' +
      '4M-1-A, E4L-1-A, O4M-1-A) whose internal breakers feed the step-downs at the ' +
      'transformer-schedule primary OCPD (125 A for 75 kVA, 70 A for 45 kVA, 50 A for 30 kVA, ' +
      'NEC 450.3(B)). The kitchen/laundry 75 kVA unit (4T-1-C) is fed directly from the ' +
      'switchboard (CB-04, 125 A primary OCPD).',
    nec_reference: 'NEC 450.3(B)',
  },
  {
    id: 'NOTE-005',
    topic: 'Worst-case impedance basis for fault current',
    text:
      'Every dry-type unit uses percent_z.low / x_over_r.low from transformer_impedance_V1_0_0.json ' +
      'on an infinite primary bus: 75 kVA 208.2 A / 0.044 = 4,731 A; 45 kVA 124.9 A / 0.034 = ' +
      '3,674 A; 30 kVA 83.3 A / 0.023 = 3,620 A. Correct bound for AIC; wrong one for voltage drop.',
    nec_reference: 'NEC 110.9',
  },
  {
    id: 'NOTE-006',
    topic: 'Transformer secondary OCPD location',
    text:
      'Every dry-type secondary OCPD is the main of the panel it feeds (250 A for 75 kVA, 150 A ' +
      'for 45 kVA, 100 A for 30 kVA — transformer-schedule lookups), protecting the secondary ' +
      'conductors. Hence MCB on those panels. 2P-1-B, fed through from 2P-1-A, is MLO.',
    nec_reference: 'NEC 240.21(C)',
  },
  {
    id: 'NOTE-007',
    topic: 'Emergency architecture and EM board main',
    text:
      'Golden-case pattern: generator-fed EM switchboard E4MSB-1-A (400 A, 10 kAIC, two-level ' +
      'with a 400AF/350AT LSI main). Its breakers feed the ATS emergency (source 2) inputs; normal ' +
      '(source 1) inputs come from 4MSB-1-A (CB-05/06/07). The NEC 700 breaker ECB-01 sits in its ' +
      'own section (NEC 700.10(B)); 701 and 702 in their own sections, ordered 700 -> 701 -> 702.',
    nec_reference: 'NEC 700.10(B)(5)',
  },
  {
    id: 'NOTE-008',
    topic: 'ATS classes and poles',
    text:
      'E4A-1-A 100 A (NEC 700), L4A-1-A 100 A (NEC 701), O4A-1-A 150 A (NEC 702, manual-reset ' +
      'load shed), 3-pole with solid neutral (generator is not a separately derived system — no ' +
      'EM-side N-G bond), 22 kA withstand >= 14.96 kA available.',
    nec_reference: 'NEC 700.5 / 701.5 / 702.5',
  },
  {
    id: 'NOTE-009',
    topic: 'Spare and space provisions',
    text: 'Two 100 A / 3P spares and two spaces on 4MSB-1-A; one 100 A / 3P spare and one space on E4MSB-1-A.',
    nec_reference: null,
  },
];

/* --------------------------------------------------------------------------- */

// Feeder rows. calc = conductor spec (feeder_schedule 4-wire rows; 3-wire rows
// for transformer primaries; transformer-schedule 'xxxxT' secondaries with the
// bonding jumper as the ground), callout = A-2 text in the golden notation.
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
  '6004': [cal('AL', '350', 4, '350', '1', 'CU', 3, '3"'), '(3) 3"C - (4)350 AL + #1 CU GND'],
  '4004': [cal('AL', '350', 4, '350', '3', 'CU', 2, '3"'), '(2) 3"C - (4)350 AL + #3 CU GND'],
  '2504': [cal('AL', '500', 4, '500', '4', 'CU', 1, '3 1/2"'), '3 1/2"C - (4)500 AL + #4 CU GND'],
  '1504': [cal('AL', '4/0', 4, '4/0', '6', 'CU', 1, '2 1/2"'), '2 1/2"C - (4)4/0 AL + #6 CU GND'],
  '1004': [cal('AL', '1/0', 4, '1/0', '6', 'CU', 1, '2"'), '2"C - (4)1/0 AL + #6 CU GND'],
  '604': [cal('CU', '4', 4, '4', '10', 'CU', 1, '1 1/4"'), '1 1/4"C - (4)#4 CU + #10 CU GND'],
  '1253': [cal('AL', '2/0', 3, null, '6', 'CU', 1, '1 1/2"'), '1 1/2"C - (3)2/0 AL + #6 CU GND'],
  '703': [cal('CU', '4', 3, null, '8', 'CU', 1, '1"'), '1"C - (3)#4 CU + #8 CU GND'],
  '503': [cal('CU', '6', 3, null, '10', 'CU', 1, '3/4"'), '3/4"C - (3)#6 CU + #10 CU GND'],
  '2504T': [cal('AL', '500', 4, '500', '2', 'CU', 1, '3 1/2"'), '3 1/2"C - (4)500 AL + #2 CU SBJ'],
  '1504T': [cal('AL', '4/0', 4, '4/0', '4', 'CU', 1, '2 1/2"'), '2 1/2"C - (4)4/0 AL + #4 CU SBJ'],
  '1004T': [cal('AL', '1/0', 4, '1/0', '6', 'CU', 1, '2"'), '2"C - (4)1/0 AL + #6 CU SBJ'],
};

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
  return id;
}

const crossRefs = [];

const fc = (bound, type, sheet, amps, mode = null, anchor = 'default') => {
  annotations.push({ id: nextA(), annotation_type: 'A-4', bound_to: bound, bound_to_type: type, sheet_id: sheet, content: { fc_amps: amps, mode, anchor } });
};

/* ── Devices ─────────────────────────────────────────────────────────────── */

const cb = (id, desig, sheet, af, at, trip, extra = {}) =>
  ({ id, node_type: 'L2-1', designation: desig, sheet_id: sheet, data_fields: { af, at, poles: 3, trip_type: trip, ...extra } });
const panel = (id, desig, sheet, rating, voltage, main, fcA) => ({
  id, node_type: 'L2-4', designation: desig, sheet_id: sheet,
  data_fields: { rating, voltage, [main]: true },
  ...(fcA ? { calc_fields: { available_fc: fcA } } : {}),
});
// pct_z / x_over_r = percent_z.low / x_over_r.low (worst case, NOTE-005).
const XZ = { 75: [4.4, 2.1], 45: [3.4, 1.3], 30: [2.3, 0.9] };
const xfmr = (id, desig, sheet, kva) => ({
  id, node_type: 'L2-2', designation: desig, sheet_id: sheet,
  data_fields: { kva, config: '480Δ-208Y/120V' },
  calc_fields: { pct_z: XZ[kva][0], x_over_r: XZ[kva][1] },
});
// Infinite-primary-bus secondary fault current: FLA208 / %Z.
const FC208 = { 75: 4731, 45: 3674, 30: 3620 };

const FC_SVC = 14960;
const FC_GEN = 2506;

const devices = [
  // ── service entrance ──────────────────────────────────────────────────
  {
    id: 'd-301', node_type: 'L0-1', designation: 'UTILITY-XFMR', sheet_id: 'S1',
    data_fields: { kva_rating: 500, primary_voltage: '13.2kV', secondary_voltage: '480Y/277V', phases: 3, wires: 4 },
    calc_fields: { pct_z: 4.02, x_over_r: 5.5, available_fc: FC_SVC },
  },
  { id: 'd-302', node_type: 'L1-4', designation: 'UTIL-MTR', sheet_id: 'S1', data_fields: { meter_type: 'utility' } },
  // Service main, LSI — no GFP below 1000 A (NEC 230.95, NOTE-003). No
  // available_fc — the renderer has no A-4 anchor for L1-1.
  { id: 'd-303', node_type: 'L1-1', designation: 'MAIN-CB', sheet_id: 'S1', data_fields: { af: 800, at: 600, poles: 3, trip_type: 'LSI' } },
  { id: 'd-304', node_type: 'L1-3', designation: 'NG-BOND', sheet_id: 'S1', data_fields: { sds: 'service_entrance' } },

  // ── distribution breakers — TM (no second-level GFP, NOTE-003) ────────
  cb('d-305', 'CB-01', 'S1', 150, 150, 'TM'),     // plug
  cb('d-306', 'CB-02', 'S1', 150, 150, 'TM'),     // mechanical
  cb('d-307', 'CB-03', 'S1', 100, 60, 'TM'),      // lighting
  cb('d-308', 'CB-04', 'S1', 150, 125, 'TM'),     // kitchen 75 kVA primary (tag 1253)
  cb('d-309', 'CB-05', 'S1', 100, 100, 'TM'),     // 700 ATS normal
  cb('d-310', 'CB-06', 'S1', 100, 100, 'TM'),     // 701 ATS normal
  cb('d-311', 'CB-07', 'S1', 250, 150, 'TM'),     // 702 ATS normal

  // ── plug branch — 4P-1-A -> internal 125 A -> 75 kVA -> 2P-1-A, with
  // 2P-1-B fed through 2P-1-A's lugs (double-tub pair)
  panel('d-312', '4P-1-A', 'S1', '225A', '480Y/277V', 'mlo'),
  cb('d-327', '4P-1-A-CB', 'S1', 125, 125, 'TM', { internal_to: '4P-1-A' }),
  xfmr('d-313', '4T-1-A', 'S1', 75),
  panel('d-314', '2P-1-A', 'S1', '250A', '208Y/120V', 'mcb', FC208[75]),
  panel('d-315', '2P-1-B', 'S1', '250A', '208Y/120V', 'mlo'),

  // ── mechanical branch — 4M-1-A -> internal 50 A -> 30 kVA -> 2M-1-A
  panel('d-316', '4M-1-A', 'S1', '225A', '480Y/277V', 'mlo'),
  cb('d-317', '4M-1-A-CB', 'S1', 100, 50, 'TM', { internal_to: '4M-1-A' }),
  xfmr('d-318', '4T-1-B', 'S1', 30),
  panel('d-319', '2M-1-A', 'S1', '100A', '208Y/120V', 'mcb', FC208[30]),

  // ── lighting branch
  panel('d-320', '4L-1-A', 'S1', '100A', '480Y/277V', 'mlo'),

  // ── kitchen + laundry branch — CB-04 -> 75 kVA -> 2K-1-A
  xfmr('d-321', '4T-1-C', 'S1', 75),
  panel('d-322', '2K-1-A', 'S1', '250A', '208Y/120V', 'mcb', FC208[75]),

  // ── spares / spaces
  { id: 'd-323', node_type: 'L2-7', designation: 'SPARE-01', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '100A/3P' } },
  { id: 'd-324', node_type: 'L2-7', designation: 'SPARE-02', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '100A/3P' } },
  { id: 'd-325', node_type: 'L2-7', designation: 'SPACE-01', sheet_id: 'S1', data_fields: { kind: 'space' } },
  { id: 'd-326', node_type: 'L2-7', designation: 'SPACE-02', sheet_id: 'S1', data_fields: { kind: 'space' } },

  // ── generator + EM switchboard ────────────────────────────────────────
  // Integral breaker carried in data_fields (golden pattern). HALT-004 / HALT-005.
  {
    id: 'd-330', node_type: 'L1-5', designation: 'GEN-1', sheet_id: 'S1',
    data_fields: {
      kw: 200, kva: 250, voltage: '480Y/277V', phases: 3, wires: 4,
      nfpa_level: 'NFPA 110 Level 1 / Type 10 / Class 48', af: 400, at: 350, trip_type: 'LSI',
    },
  },
  { id: 'd-331', node_type: 'L1-1', designation: 'EMSB-MAIN', sheet_id: 'S1', data_fields: { af: 400, at: 350, poles: 3, trip_type: 'LSI' } },
  cb('d-332', 'ECB-01', 'S1', 100, 100, 'TM'),     // -> 700 ATS source 2
  cb('d-333', 'ECB-02', 'S1', 100, 100, 'TM'),     // -> 701 ATS source 2
  cb('d-334', 'ECB-03', 'S1', 250, 150, 'TM'),     // -> 702 ATS source 2
  { id: 'd-335', node_type: 'L2-7', designation: 'SPARE-EM-01', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '100A/3P' } },
  { id: 'd-336', node_type: 'L2-7', designation: 'SPACE-EM-01', sheet_id: 'S1', data_fields: { kind: 'space' } },

  // ── ATSs — dual-source, so NO available_fc (TV-5); dual A-4 instead.
  { id: 'd-337', node_type: 'L2-3', designation: 'E4A-1-A', sheet_id: 'S1', data_fields: { continuous_rating: 100, poles: 3, nec_class: '700' }, calc_fields: { withstand_rating: 22000 } },
  { id: 'd-338', node_type: 'L2-3', designation: 'L4A-1-A', sheet_id: 'S1', data_fields: { continuous_rating: 100, poles: 3, nec_class: '701' }, calc_fields: { withstand_rating: 22000 } },
  { id: 'd-339', node_type: 'L2-3', designation: 'O4A-1-A', sheet_id: 'S1', data_fields: { continuous_rating: 150, poles: 3, nec_class: '702' }, calc_fields: { withstand_rating: 22000 } },

  // ── NEC 700 — E4L-1-A -> internal 50 A -> 30 kVA -> E2P-1-A
  panel('d-340', 'E4L-1-A', 'S1', '100A', '480Y/277V', 'mlo'),
  cb('d-341', 'E4L-1-A-CB', 'S1', 100, 50, 'TM', { internal_to: 'E4L-1-A' }),
  xfmr('d-342', 'E4T-1-A', 'S1', 30),
  panel('d-343', 'E2P-1-A', 'S1', '100A', '208Y/120V', 'mcb', FC208[30]),

  // ── NEC 701 — L4M-1-A (booster pump + sewage ejector), no step-down
  panel('d-344', 'L4M-1-A', 'S1', '100A', '480Y/277V', 'mlo'),

  // ── NEC 702 — O4M-1-A -> two internal breakers -> 45 / 30 kVA
  panel('d-348', 'O4M-1-A', 'S1', '225A', '480Y/277V', 'mlo'),
  cb('d-349', 'O4M-1-A-CB1', 'S1', 100, 70, 'TM', { internal_to: 'O4M-1-A' }),
  xfmr('d-350', 'O4T-1-A', 'S1', 45),
  panel('d-351', 'O2P-1-A', 'S1', '150A', '208Y/120V', 'mcb', FC208[45]),
  cb('d-352', 'O4M-1-A-CB2', 'S1', 100, 50, 'TM', { internal_to: 'O4M-1-A' }),
  xfmr('d-353', 'O4T-1-B', 'S1', 30),
  panel('d-354', 'O2P-1-B', 'S1', '100A', '208Y/120V', 'mcb', FC208[30]),
];

/* ── Routed elements ─────────────────────────────────────────────────────── */

// Service lateral, TV-1-exempt: carries the A-2 alone.
{
  const a = nextA();
  routed.push({
    id: 'r-301', edge_type: 'R-1', designation: 'F-301', sheet_id: 'S1',
    start: { device_id: 'd-301', port: 'secondary_out' },
    end: { device_id: 'd-303', port: 'line_in' },
    stub_exempt: false, data_fields: { is_service_entrance: true },
    calc_fields: FEEDER['6004'][0], annotation_ids: [a],
  });
  annotations.push({ id: a, annotation_type: 'A-2', bound_to: 'r-301', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: FEEDER['6004'][1] } });
}

// Plug: CB-01 -> 4P-1-A -> internal 125 A -> 75 kVA -> 2P-1-A. 2P-1-B is fed
// through 2P-1-A's lugs: F-305 stays in the topology (tag 2504, on paper) but
// is not drawn — see feed_through_panels.
feeder(302, 'S1', 'd-305', 'line_in', 'd-312', 'feed_top', '1504');
feeder(303, 'S1', 'd-327', 'line_in', 'd-313', 'primary_in', '1253');
feeder(304, 'S1', 'd-313', 'secondary_out', 'd-314', 'feed_top', '2504T');
feeder(305, 'S1', 'd-314', 'feed_left', 'd-315', 'feed_right', '2504');
// Mechanical.
feeder(306, 'S1', 'd-306', 'line_in', 'd-316', 'feed_top', '1504');
feeder(307, 'S1', 'd-317', 'line_in', 'd-318', 'primary_in', '503');
feeder(308, 'S1', 'd-318', 'secondary_out', 'd-319', 'feed_top', '1004T');
// Lighting.
feeder(309, 'S1', 'd-307', 'line_in', 'd-320', 'feed_top', '604');
// Kitchen + laundry.
feeder(310, 'S1', 'd-308', 'line_in', 'd-321', 'primary_in', '1253');
feeder(311, 'S1', 'd-321', 'secondary_out', 'd-322', 'feed_top', '2504T');

// ATS normal sources — same sheet, drawn whole (no squiggle pair).
feeder(312, 'S1', 'd-309', 'line_in', 'd-337', 'source1_in', '1004');
feeder(313, 'S1', 'd-310', 'line_in', 'd-338', 'source1_in', '1004');
feeder(314, 'S1', 'd-311', 'line_in', 'd-339', 'source1_in', '1504');

// Generator feeder -> EM main bus (HALT-004).
feeder(320, 'S1', 'd-330', 'gen_out', 'r-393', 'bus_tap_bi', '4004', 'GEN');
// EM breakers -> ATS source 2.
feeder(321, 'S1', 'd-332', 'line_in', 'd-337', 'source2_in', '1004');
feeder(322, 'S1', 'd-333', 'line_in', 'd-338', 'source2_in', '1004');
feeder(323, 'S1', 'd-334', 'line_in', 'd-339', 'source2_in', '1504');
// NEC 700.
feeder(324, 'S1', 'd-337', 'load_out', 'd-340', 'feed_top', '1004');
feeder(325, 'S1', 'd-341', 'line_in', 'd-342', 'primary_in', '503');
feeder(326, 'S1', 'd-342', 'secondary_out', 'd-343', 'feed_top', '1004T');
// NEC 701.
feeder(327, 'S1', 'd-338', 'load_out', 'd-344', 'feed_top', '1004');
// NEC 702.
feeder(330, 'S1', 'd-339', 'load_out', 'd-348', 'feed_top', '1504');
feeder(331, 'S1', 'd-349', 'line_in', 'd-350', 'primary_in', '703');
feeder(332, 'S1', 'd-350', 'secondary_out', 'd-351', 'feed_top', '1504T');
feeder(333, 'S1', 'd-352', 'line_in', 'd-353', 'primary_in', '503');
feeder(334, 'S1', 'd-353', 'secondary_out', 'd-354', 'feed_top', '1004T');

// Buses — the r-39x band is kept clear of the feeder allocator (SCHEMA-8).
const bus = (id, desig, sheet, level, rating, fcA) => ({
  id, edge_type: 'R-2', designation: desig, sheet_id: sheet,
  bus_level: level, stroke_weight: level === 'main' ? 2.5 : 2,
  start: null, end: null, stub_exempt: null, data_fields: {},
  calc_fields: { bus_rating: rating, ...(fcA ? { available_fc: fcA } : {}) },
  annotation_ids: [],
});
routed.push(
  bus('r-391', 'main-bus-4MSB-1-A', 'S1', 'main', 600, FC_SVC),
  bus('r-392', 'sec-bus-4MSB-1-A', 'S1', 'secondary', 600, FC_SVC),
  // EM buses carry no available_fc (golden pattern); the A-4 rides the bus.
  bus('r-393', 'main-bus-E4MSB-1-A', 'S1', 'main', 400),
  bus('r-394', 'sec-bus-E4MSB-1-A', 'S1', 'secondary', 400),
);

/* ── A-4 fault-current tags ──────────────────────────────────────────────── */
// TV-5: every device / bus with calc_fields.available_fc carries exactly one A-4.
fc('r-391', 'routed_element', 'S1', FC_SVC, null, 'bus');
fc('d-301', 'device', 'S1', FC_SVC);
for (const d of devices) {
  if (d.node_type === 'L2-4' && d.calc_fields?.available_fc) fc(d.id, 'device', d.sheet_id, d.calc_fields.available_fc);
}
fc('r-393', 'routed_element', 'S1', FC_GEN, 'EM', 'bus');
for (const ats of ['d-337', 'd-338', 'd-339']) {
  fc(ats, 'device', 'S1', FC_SVC, 'N', 'load');
  fc(ats, 'device', 'S1', FC_GEN, 'EM', 'load');
}
for (const r of routed) {
  if (r.annotation_ids) r.annotation_ids = r.annotation_ids.concat(
    annotations.filter((a) => a.annotation_type === 'A-4' && a.bound_to === r.id).map((a) => a.id),
  );
}

/* ── Topology ────────────────────────────────────────────────────────────── */

const topology = {
  $schema: 'sld_topology/v1',

  metadata: {
    schema_version: '1.0.0',
    project_name: 'Rainbow Clinic for Cat Wellness — 600 A Service',
    created_date: '2026-11-18',
    slug: SLUG,
    heading: 'Rainbow Clinic for Cat Wellness',
    facts: [
      '600 A service, 480Y/277V 3PH 4W, 500 kVA utility transformer (derived)',
      '18,862 SF veterinary clinic — one storey, NEC 700/701/702 (517 N/A)',
      '200 kW generator; 700 100 A / 701 100 A / 702 150 A ATSs',
      'No fire pump',
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
    { sheet_id: 'S1', sheet_number: 'E-501', title: 'MAIN SINGLE-LINE DIAGRAM — NORMAL AND STANDBY POWER' },
  ],

  devices,
  routed_elements: routed,
  annotations,

  switchboards: [
    {
      id: 'sw-201', designation: '4MSB-1-A', variant: 'NP', bus_architecture: 'two-level', sheet_id: 'S1',
      data_fields: { rating: '600A', voltage: '480Y/277V', wires: '4W, 3PH', aic: '22kAIC' },
      secondary_bus_overflow_ids: [], main_bus_id: 'r-391', secondary_bus_id: 'r-392', distribution_bus_id: null,
    },
    {
      id: 'sw-202', designation: 'E4MSB-1-A', variant: 'EM', bus_architecture: 'two-level', sheet_id: 'S1',
      data_fields: { rating: '400A', voltage: '480Y/277V', wires: '4W, 3PH', aic: '10kAIC' },
      secondary_bus_overflow_ids: [], main_bus_id: 'r-393', secondary_bus_id: 'r-394', distribution_bus_id: null,
    },
  ],

  sections: [
    { id: 'sec-201', switchboard_id: 'sw-201', type: 'incoming', order: 1, nec_class: null, section_tag: 'SEC-1', device_ids: [] },
    { id: 'sec-202', switchboard_id: 'sw-201', type: 'metering', order: 2, nec_class: null, section_tag: 'SEC-2', device_ids: ['d-302'] },
    { id: 'sec-203', switchboard_id: 'sw-201', type: 'main_breaker', order: 3, nec_class: null, section_tag: 'SEC-3', device_ids: ['d-303'] },
    // Normal branches. The kitchen column sits in SEC-4 (west of every ATS
    // normal feed, so their lanes never cross it), with SPARE-01 between it and
    // the mechanical column so the two transformer labels stay clear.
    { id: 'sec-204', switchboard_id: 'sw-201', type: 'distribution', order: 4, nec_class: null, section_tag: 'SEC-4', device_ids: ['d-305', 'd-307', 'd-306', 'd-323', 'd-308'] },
    // ATS normal feeds, then spares, spaces and the N-G bond last.
    { id: 'sec-205', switchboard_id: 'sw-201', type: 'distribution', order: 5, nec_class: null, section_tag: 'SEC-5', device_ids: ['d-309', 'd-310', 'd-311', 'd-324', 'd-325', 'd-326', 'd-304'] },

    { id: 'sec-206', switchboard_id: 'sw-202', type: 'incoming', order: 1, nec_class: null, section_tag: 'SEC-1-EM', device_ids: [] },
    { id: 'sec-207', switchboard_id: 'sw-202', type: 'main_breaker', order: 2, nec_class: null, section_tag: 'SEC-2-EM', device_ids: ['d-331'] },
    // One section per standby class, 700 -> 701 -> 702 (NEC 700.10(B), NOTE-007).
    { id: 'sec-208', switchboard_id: 'sw-202', type: 'distribution', order: 3, nec_class: '700', section_tag: 'SEC-3-EM', device_ids: ['d-332'] },
    { id: 'sec-209', switchboard_id: 'sw-202', type: 'distribution', order: 4, nec_class: '701', section_tag: 'SEC-4-EM', device_ids: ['d-333'] },
    { id: 'sec-210', switchboard_id: 'sw-202', type: 'distribution', order: 5, nec_class: '702', section_tag: 'SEC-5-EM', device_ids: ['d-334'] },
    // Spare + space in their own section so no class section carries anything else.
    { id: 'sec-211', switchboard_id: 'sw-202', type: 'distribution', order: 6, nec_class: null, section_tag: 'SEC-6-EM', device_ids: ['d-335', 'd-336'] },
  ],

  port_assignments: [
    { id: 'pa-301', device_id: 'd-303', port: 'line_in', bus_id: 'r-391' },
    { id: 'pa-302', device_id: 'd-303', port: 'bus_out', bus_id: 'r-392' },
    ...['d-305', 'd-306', 'd-307', 'd-308', 'd-309', 'd-310', 'd-311', 'd-323', 'd-324', 'd-325', 'd-326']
      .map((d, i) => ({ id: `pa-${303 + i}`, device_id: d, port: 'bus_out', bus_id: 'r-392' })),
    { id: 'pa-319', device_id: 'd-327', port: 'bus_out', attached_to_device: 'd-312', attached_to_port: 'feed_bottom' },
    { id: 'pa-320', device_id: 'd-317', port: 'bus_out', attached_to_device: 'd-316', attached_to_port: 'feed_bottom' },
    { id: 'pa-321', device_id: 'd-331', port: 'line_in', bus_id: 'r-393' },
    { id: 'pa-322', device_id: 'd-331', port: 'bus_out', bus_id: 'r-394' },
    ...['d-332', 'd-333', 'd-334', 'd-335', 'd-336']
      .map((d, i) => ({ id: `pa-${323 + i}`, device_id: d, port: 'bus_out', bus_id: 'r-394' })),
    { id: 'pa-330', device_id: 'd-341', port: 'bus_out', attached_to_device: 'd-340', attached_to_port: 'feed_bottom' },
    { id: 'pa-332', device_id: 'd-349', port: 'bus_out', attached_to_device: 'd-348', attached_to_port: 'feed_bottom' },
    { id: 'pa-333', device_id: 'd-352', port: 'bus_out', attached_to_device: 'd-348', attached_to_port: 'feed_bottom' },
  ],

  spur_attachments: [],

  measurement_attachments: [
    { id: 'meas-301', device_id: 'd-302', host_routed_element_id: 'r-391', mode: 'ct', position: 'incoming_section' },
  ],

  cross_sheet_refs: crossRefs,

  layout_config: { $comment: EMBED_COMMENT, ...LAYOUT_CONFIG },
};

/* ── placement{} — upstream shape (tool repository DEC-113) ─────────────────
 * Every device and switchboard is classified here BY DESIGNATION, and the build
 * throws on any node the table does not name: a node with no placement{} means
 * "a component of a line-up", so a forgotten node would otherwise read as one.
 *   PLACED     → { level } — the level as the SLD spells it (floor_order "1");
 *                the desk resolves it through an owner-signed sld_level alias.
 *   NOT_PLACED → { not_placed: { reason } } — not modelled by design.
 *   COMPONENT  → no placement{} — inside a switchboard line-up or a panelboard.
 * Never room, position, rotation, host, stable_key or revit_element_identity. */
const LEVEL = '1';
const PLACED = [
  '4MSB-1-A', 'E4MSB-1-A',
  '4P-1-A', '2P-1-A', '2P-1-B', '4M-1-A', '2M-1-A', '4L-1-A', '2K-1-A',
  'E4L-1-A', 'E2P-1-A', 'L4M-1-A', 'O4M-1-A', 'O2P-1-A', 'O2P-1-B',
  '4T-1-A', '4T-1-B', '4T-1-C', 'E4T-1-A', 'O4T-1-A', 'O4T-1-B',
  'E4A-1-A', 'L4A-1-A', 'O4A-1-A',
];
const NOT_PLACED = {
  'UTILITY-XFMR': 'Exterior utility-owned pad-mount transformer; not modelled by design.',
  'GEN-1': 'Exterior generator; not modelled by design.',
};
const COMPONENT = [
  'UTIL-MTR', 'MAIN-CB', 'NG-BOND', 'EMSB-MAIN',
  'CB-01', 'CB-02', 'CB-03', 'CB-04', 'CB-05', 'CB-06', 'CB-07', 'ECB-01', 'ECB-02', 'ECB-03',
  'SPARE-01', 'SPARE-02', 'SPACE-01', 'SPACE-02', 'SPARE-EM-01', 'SPACE-EM-01',
  '4P-1-A-CB', '4M-1-A-CB', 'E4L-1-A-CB', 'O4M-1-A-CB1', 'O4M-1-A-CB2',
];
{
  const cls = new Map();
  for (const [list, kind] of [[PLACED, 'placed'], [Object.keys(NOT_PLACED), 'not_placed'], [COMPONENT, 'component']]) {
    for (const d of list) {
      if (cls.has(d)) throw new Error(`placement: ${d} is classified twice (${cls.get(d)}, ${kind})`);
      cls.set(d, kind);
    }
  }
  const nodes = [...topology.devices, ...topology.switchboards];
  const unclassified = nodes.filter((r) => !cls.has(r.designation)).map((r) => r.designation);
  if (unclassified.length) throw new Error(`placement: unclassified node(s) ${unclassified.join(', ')} — classify every node`);
  const known = new Set(nodes.map((r) => r.designation));
  const stale = [...cls.keys()].filter((d) => !known.has(d));
  if (stale.length) throw new Error(`placement: table names node(s) the topology does not have: ${stale.join(', ')}`);
  for (const r of nodes) {
    const kind = cls.get(r.designation);
    if (kind === 'placed') r.placement = { level: LEVEL };
    else if (kind === 'not_placed') r.placement = { not_placed: { reason: NOT_PLACED[r.designation] } };
  }
}

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
