#!/usr/bin/env node
/**
 * clinic_build_topology.mjs — the ONLY hand-edited file in this project.
 *
 * Clinic AI Test: 20,000 SF outpatient clinic, one storey, 3000 A / 480Y-277V
 * service, 1000 kW generator, NEC 517 essential electrical system with three
 * branch ATSs (Life Safety / Critical / Equipment). Composed from the owner's
 * verbal scope of 2026-10-20; every value the owner did not state is itemised
 * in 1_source/clinic_SLD_narrative_V1_0_0.md and in metadata.compositor_notes[]
 * (Tier-2) or metadata.compositor_halts[] (Tier-3).
 *
 * Writes two files into 2_build/:
 *   clinic_layout_config.json        the sidecar (sidecar keys win at layout time)
 *   clinic_SLD_topology_V1_0_0.json  topology with an EMBEDDED copy of the same config
 *
 * Emergency architecture follows the hospital golden: GEN-1 -> EM switchboard
 * main bus -> EM main breaker -> secondary bus -> one EM breaker per ATS
 * source2_in; each ATS source1_in is a cross-sheet feeder from the NP board.
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
const SLUG = 'clinic';

/* ---------------------------------------------------------------------------
 * layout_config
 *
 * One storey, so no level lines and no riser cascades. Every hospital-named
 * default is CLEARED EXPLICITLY — absent keys fall back to the engine's _DEF_*
 * golden values (sheet_skips would silently drop any S2 tag containing -2-/-3-,
 * and ats_xoffset_overrides names E4A-1-A).
 * ------------------------------------------------------------------------- */
const LAYOUT_CONFIG = {
  sheet_roles: { S1: 'normal', S2: 'emergency' },
  sheet_skips: {},

  // Object form — the flat array falls back to the hospital stack.
  floor_order: { S1: ['1'], S2: ['1'] },
  floor_anchors: {},
  floor_anchors_mechanical: {},
  floor_band_designations: [],
  level_map: {},
  level_order: [],

  ats_xoffset_overrides: {},

  riser_step_standard: 650,
  riser_step_roof: 1460,

  // No sub-feed chains remain: every step-down rides the internal-chain pass
  // and 2P-1-B is placed by feed_through_panels.
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

  // OFF-031 (engine 1.0.18): 2P-1-B is fed through 2P-1-A's feed-through lugs.
  // Physically the two cabinets stand side by side, so 2P-1-B is drawn butted to
  // the LEFT of 2P-1-A (its A-4 pennant is on the right) and F-305 is not drawn —
  // it stays in the topology as an intentional skip.
  feed_through_panels: { '2P-1-B': 'left' },

  a1_tag_placement: {
    'F-303': { side: 'right' },
    'F-307': { side: 'right' },
    'F-325': { side: 'right' },
    'F-328': { side: 'right' },
    // Middle primary of EQ4P-1-A's 3-transformer fan: its default pill sat
    // across F-331 / F-335 (35 px apart). Slide it ALONG its own run, above
    // the jog where the neighbours have turned away, pill on the right.
    'F-333': { force_orient: 'vertical', side: 'right', dy: -120 },
  },
  a3_text_placement: {},
  fc_pennant_placement: {},
  fc_pennant_y_nudges: {},
};

const SIDECAR_COMMENT =
  'Sidecar layout_config for the Clinic AI Test (3000 A, one storey). S1 normal power, S2 ' +
  'emergency (NEC 517 EES). Every hospital-golden default that names hospital designations is ' +
  "explicitly cleared — absent keys fall back to the engine's _DEF_* hospital values (schema §19).";

const EMBED_COMMENT =
  'Embedded copy of clinic_layout_config.json. Embedded (not sidecar-only) so validator rule ' +
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
      'contribution. The utility letter and transformer nameplate must confirm before AIC ratings ' +
      'are released for procurement.',
    nec_reference: 'NEC 110.9 / 110.24',
    blocks: 'AIC ratings released for procurement · DV-4 bus bracing verified against utility data',
  },
  {
    id: 'HALT-003',
    topic: 'Connected-load schedule / service adequacy',
    text:
      'COMPOSITOR_HALT: no connected-load or panel schedule was provided (T3-EOR). Every panel ' +
      'rating not stated by the owner is a Tier-2 default and no NEC 220 / 517 demand calculation ' +
      'was performed. Note the stated 3000 A service is 125 VA/SF on 20,000 SF — roughly 4-8x a ' +
      'typical outpatient clinic. Live feeder trips total 2920 A on the 3000 A bus.',
    nec_reference: 'NEC 220 / 230.42(A) / 517.30',
    blocks: 'Service-size verification · panel schedules · feeder sizing confirmation',
  },
  {
    id: 'HALT-004',
    topic: 'Generator breaker, feeder and capacity — Tier-3 values FILLED by compositor',
    text:
      'COMPOSITOR_HALT: generator feeder sizing is EOR input with no schedule lookup (NEC 445.13). ' +
      'At the owner\'s direction the compositor FILLED: 1000 kW / 1250 kVA at 0.8 PF, FLA 1503.5 A; ' +
      'integral breaker 2000AF/1600AT LSI 100% rated (NEC 445.12); feeder sized to the 1600 A OCPD ' +
      'on feeder_schedule tag 16004, (6) 3 1/2"C - (4)500 AL + 350 AL GND. Aggregate ATS ratings ' +
      '1825 A exceed the generator FLA — acceptable only with load diversity, equipment-branch ' +
      'delayed transfer and load shed (NEC 517.35 / 700.4(B)); the generator sizing study is owed.',
    nec_reference: 'NEC 445.12 / 445.13 / 700.4(B) / 517.35',
    blocks: 'Generator feeder release · generator sizing study · EM board main rating',
  },
  {
    id: 'HALT-005',
    topic: 'Generator subtransient reactance — ASSUMED',
    text:
      'COMPOSITOR_HALT: X"d 0.12 pu assumed (worst case, low end of the typical 0.12-0.18 range) ' +
      'for the emergency-source fault current: 1503.5 A / 0.12 = 12,529 A sym on the EM bus. ' +
      'Generator submittal data must confirm before the EM board 22 kAIC rating is released.',
    nec_reference: 'NEC 110.9 / 700.4',
    blocks: 'EM board AIC release · ATS emergency-side withstand verification',
  },
];

/* ---------------------------------------------------------------------------
 * Tier-2 decisions taken by default or by compositor fill. FOUR keys, no
 * `blocks` — these do NOT gate graduation.
 * ------------------------------------------------------------------------- */
const NOTES = [
  {
    id: 'NOTE-001',
    topic: 'Service voltage and configuration',
    text: '480Y/277V, 3 phase 4 wire. Stated: 3000 A, 480 V 3-phase; wye/4W is the Tier-2 default.',
    nec_reference: null,
  },
  {
    id: 'NOTE-002',
    topic: 'Occupancy and building levels',
    text:
      'Outpatient clinic, 20,000 SF, one storey (Level 1). NEC 517 health-care facility with an ' +
      'essential electrical system (Life Safety / Critical / Equipment branches) as stated. ' +
      'Single storey: no A-7 level lines, no riser cascades.',
    nec_reference: 'NEC 517.2 / 517.29',
  },
  {
    id: 'NOTE-003',
    topic: 'Verbal-scope transcription corrections',
    text:
      'The life-safety "225-240 volt panel" is read as a 225 A, 480Y/277V panel (it feeds a ' +
      '480 V-primary 45 kVA step-down). The critical "440-volt panel" is read as 480Y/277V. ' +
      'The plug branch "panel that feeds through to another one" is drawn as 2P-1-A (MCB) ' +
      'feed-through to 2P-1-B (MLO).',
    nec_reference: null,
  },
  {
    id: 'NOTE-004',
    topic: 'Branch architecture — 480 V panels ahead of the step-downs',
    text:
      'Each 400 A plug / mechanical branch is drawn as a 400 A 480Y/277V panel (4P-1-A / 4M-1-A) ' +
      'whose internal breaker feeds the step-down, because a 400 A breaker cannot protect a ' +
      '112.5 kVA (135 A) or 75 kVA (90 A) primary within NEC 450.3(B). The kitchen 45 kVA unit is ' +
      'fed directly from the switchboard (CB-04, 70 A primary OCPD).',
    nec_reference: 'NEC 450.3(B)',
  },
  {
    id: 'NOTE-005',
    topic: 'Worst-case impedance basis for fault current',
    text:
      'Every dry-type unit uses percent_z.low from transformer_impedance_V1_0_0.json on an ' +
      'infinite primary bus: 112.5 kVA 312.3 A / 0.031 = 10,073 A; 75 kVA 208.2 A / 0.044 = ' +
      '4,731 A; 45 kVA 124.9 A / 0.034 = 3,674 A. Correct bound for AIC; wrong one for voltage drop.',
    nec_reference: 'NEC 110.9',
  },
  {
    id: 'NOTE-006',
    topic: 'Transformer secondary OCPD location',
    text:
      'Every dry-type secondary OCPD is the main of the panel it feeds (400 A for 112.5 kVA, 250 A ' +
      'for 75 kVA, 150 A for 45 kVA — schedule lookups), protecting the secondary conductors. ' +
      'Hence MCB on those panels. 2P-1-B, fed through from 2P-1-A, is MLO.',
    nec_reference: 'NEC 240.21(C)',
  },
  {
    id: 'NOTE-007',
    topic: 'Two-level ground-fault protection',
    text:
      'Health-care facility with a GFP service main: every normal-side feeder breaker on 4MSB-1-A ' +
      'is LSIG (second level of GFP). Not applied on the essential electrical system — GFP is not ' +
      'required on the EES and the generator / EM main use ground-fault indication only.',
    nec_reference: 'NEC 230.95 / 517.17(B) / 700.6(D)',
  },
  {
    id: 'NOTE-008',
    topic: 'Emergency architecture and EM board main',
    text:
      'Golden-case pattern: generator-fed EM switchboard E4MSB-1-A (2000 A, 22 kAIC, two-level ' +
      'with a 2000AF/1600AT LSI main — TIER 2 OVERRIDE of the MLO default, matching the golden ' +
      'two-level board). Its breakers feed the ATS emergency (source 2) inputs; normal (source 1) ' +
      'inputs come from 4MSB-1-A on cross-sheet feeders.',
    nec_reference: 'NEC 700.10(B)(5)',
  },
  {
    id: 'NOTE-009',
    topic: 'ATS classes and poles',
    text:
      'LS4A-1-A 225 A, C4A-1-A 400 A, EQ4A-1-A 1200 A, 3-pole with solid neutral (generator is not ' +
      'a separately derived system — no EM-side N-G bond), 65 kA withstand. nec_class prose ' +
      'LIFE SAFETY / CRITICAL / EQUIPMENT drives the engine 700 -> 701 -> 702 drawing order; only ' +
      'the Life Safety section is classed 700 — the Critical and Equipment branches are NEC 517 ' +
      'branches, not Article 701/702 systems. Equipment branch transfer is delayed-automatic.',
    nec_reference: 'NEC 517.31 / 517.33-517.35 / 700.10(B)',
  },
  {
    id: 'NOTE-010',
    topic: 'Spare and space provisions',
    text: 'Two 400 A / 3P spares and two spaces on 4MSB-1-A; one 225 A / 3P spare and one space on E4MSB-1-A.',
    nec_reference: null,
  },
];

/* --------------------------------------------------------------------------- */

// Feeder rows. calc = conductor spec (feeder_schedule / transformer schedule
// lookups), callout = A-2 text in the golden notation.
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
  '12004': [cal('AL', '500', 4, '500', '250', 'AL', 5, '3 1/2"'), '(5) 3 1/2"C - (4)500 AL + 250 AL GND'],
  '4004': [cal('AL', '350', 4, '350', '3', 'CU', 2, '3"'), '(2) 3"C - (4)350 AL + #3 CU GND'],
  '2254': [cal('AL', '350', 4, '350', '6', 'CU', 1, '3 1/2"'), '3 1/2"C - (4)350 AL + #6 CU GND'],
  '1753': [cal('AL', '4/0', 3, null, '6', 'CU', 1, '2"'), '2"C - (3)4/0 AL + #6 CU GND'],
  '1253': [cal('AL', '2/0', 3, null, '6', 'CU', 1, '1 1/2"'), '1 1/2"C - (3)2/0 AL + #6 CU GND'],
  '703': [cal('CU', '4', 3, null, '8', 'CU', 1, '1"'), '1"C - (3)#4 CU + #8 CU GND'],
  '4004T': [cal('AL', '350', 4, '350', '2', 'CU', 2, '3"'), '(2) 3"C - (4)350 AL + #2 CU SBJ'],
  '2504T': [cal('AL', '500', 4, '500', '2', 'CU', 1, '3 1/2"'), '3 1/2"C - (4)500 AL + #2 CU SBJ'],
  '1504T': [cal('AL', '4/0', 4, '4/0', '4', 'CU', 1, '2 1/2"'), '2 1/2"C - (4)4/0 AL + #4 CU SBJ'],
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

/* ── Devices ─────────────────────────────────────────────────────────────── */

const cb = (id, desig, sheet, af, at, trip, extra = {}) =>
  ({ id, node_type: 'L2-1', designation: desig, sheet_id: sheet, data_fields: { af, at, poles: 3, trip_type: trip, ...extra } });
const panel = (id, desig, sheet, rating, voltage, main, fcA) => ({
  id, node_type: 'L2-4', designation: desig, sheet_id: sheet,
  data_fields: { rating, voltage, [main]: true },
  ...(fcA ? { calc_fields: { available_fc: fcA } } : {}),
});
// pct_z / x_over_r = percent_z.low / x_over_r.low (worst case, NOTE-005).
const XZ = { 112.5: [3.1, 2.2], 75: [4.4, 2.1], 45: [3.4, 1.3] };
const xfmr = (id, desig, sheet, kva) => ({
  id, node_type: 'L2-2', designation: desig, sheet_id: sheet,
  data_fields: { kva, config: '480Δ-208Y/120V' },
  calc_fields: { pct_z: XZ[kva][0], x_over_r: XZ[kva][1] },
});
const FC208 = { 112.5: 10073, 75: 4731, 45: 3674 };
const SEC_TAG = { 112.5: '4004T', 75: '2504T', 45: '1504T' };
const PRI_TAG = { 112.5: '1753', 75: '1253', 45: '703' };
const PRI_AT = { 112.5: 175, 75: 125, 45: 70 };
const SEC_RATING = { 112.5: '400A', 75: '250A', 45: '150A' };

const FC_SVC = 56535;
const FC_GEN = 12529;

const devices = [
  // ── S1: service entrance ──────────────────────────────────────────────
  {
    id: 'd-301', node_type: 'L0-1', designation: 'UTILITY-XFMR', sheet_id: 'S1',
    data_fields: { kva_rating: 2500, primary_voltage: '13.2kV', secondary_voltage: '480Y/277V', phases: 3, wires: 4 },
    calc_fields: { pct_z: 5.32, x_over_r: 8.0, available_fc: FC_SVC },
  },
  { id: 'd-302', node_type: 'L1-4', designation: 'UTIL-MTR', sheet_id: 'S1', data_fields: { meter_type: 'utility' } },
  // GFP main, NEC 230.95. No available_fc — the renderer has no A-4 anchor for L1-1.
  { id: 'd-303', node_type: 'L1-1', designation: 'MAIN-GFP', sheet_id: 'S1', data_fields: { af: 3000, at: 3000, poles: 3, trip_type: 'LSIG' } },
  { id: 'd-304', node_type: 'L1-3', designation: 'NG-BOND', sheet_id: 'S1', data_fields: { sds: 'service_entrance' } },

  // ── S1: distribution breakers — LSIG, second level of GFP (NOTE-007) ──
  cb('d-305', 'CB-01', 'S1', 400, 400, 'LSIG'),     // plug
  cb('d-306', 'CB-02', 'S1', 400, 400, 'LSIG'),     // mechanical
  cb('d-307', 'CB-03', 'S1', 250, 225, 'LSIG'),     // lighting
  cb('d-308', 'CB-04', 'S1', 100, 70, 'LSIG'),      // kitchen 45 kVA primary (tag 703)
  cb('d-309', 'CB-05', 'S1', 250, 225, 'LSIG'),     // LS ATS normal
  cb('d-310', 'CB-06', 'S1', 400, 400, 'LSIG'),     // C ATS normal
  cb('d-311', 'CB-07', 'S1', 1200, 1200, 'LSIG'),   // EQ ATS normal

  // ── S1: plug branch — 4P-1-A -> internal 175 A -> 112.5 kVA -> 2P-1-A, with
  // 2P-1-B fed through 2P-1-A's lugs (double-tub pair)
  panel('d-312', '4P-1-A', 'S1', '400A', '480Y/277V', 'mlo'),
  cb('d-327', '4P-1-A-CB', 'S1', 225, 175, 'TM', { internal_to: '4P-1-A' }),
  xfmr('d-313', '4T-1-A', 'S1', 112.5),
  panel('d-314', '2P-1-A', 'S1', '400A', '208Y/120V', 'mcb', FC208[112.5]),
  panel('d-315', '2P-1-B', 'S1', '400A', '208Y/120V', 'mlo'),

  // ── S1: mechanical branch — 4M-1-A -> internal 125 A -> 75 kVA -> 2M-1-A
  panel('d-316', '4M-1-A', 'S1', '400A', '480Y/277V', 'mlo'),
  cb('d-317', '4M-1-A-CB', 'S1', 125, 125, 'TM', { internal_to: '4M-1-A' }),
  xfmr('d-318', '4T-2-A', 'S1', 75),
  panel('d-319', '2M-1-A', 'S1', '250A', '208Y/120V', 'mcb', FC208[75]),

  // ── S1: lighting branch
  panel('d-320', '4L-1-A', 'S1', '225A', '480Y/277V', 'mlo'),

  // ── S1: kitchen branch — CB-04 -> 45 kVA -> 2K-1-A
  xfmr('d-321', '4T-3-A', 'S1', 45),
  panel('d-322', '2K-1-A', 'S1', '150A', '208Y/120V', 'mcb', FC208[45]),

  // ── S1: spares / spaces
  { id: 'd-323', node_type: 'L2-7', designation: 'SPARE-01', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '400A/3P' } },
  { id: 'd-324', node_type: 'L2-7', designation: 'SPARE-02', sheet_id: 'S1', data_fields: { kind: 'spare', rating: '400A/3P' } },
  { id: 'd-325', node_type: 'L2-7', designation: 'SPACE-01', sheet_id: 'S1', data_fields: { kind: 'space' } },
  { id: 'd-326', node_type: 'L2-7', designation: 'SPACE-02', sheet_id: 'S1', data_fields: { kind: 'space' } },

  // ── S2: generator + EM switchboard ──────────────────────────────────────
  // Integral breaker carried in data_fields (golden pattern). LSI: GF
  // indication only on the EES (NOTE-007). HALT-004 / HALT-005.
  {
    id: 'd-330', node_type: 'L1-5', designation: 'GEN-1', sheet_id: 'S2',
    data_fields: {
      kw: 1000, kva: 1250, voltage: '480Y/277V', phases: 3, wires: 4,
      nfpa_level: 'NFPA 110 Level 1 / Type 10 / Class 48', af: 2000, at: 1600, trip_type: 'LSI',
    },
  },
  { id: 'd-331', node_type: 'L1-1', designation: 'EMSB-MAIN', sheet_id: 'S2', data_fields: { af: 2000, at: 1600, poles: 3, trip_type: 'LSI' } },
  cb('d-332', 'ECB-01', 'S2', 250, 225, 'LSI'),     // -> LS ATS source 2
  cb('d-333', 'ECB-02', 'S2', 400, 400, 'LSI'),     // -> C ATS source 2
  cb('d-334', 'ECB-03', 'S2', 1200, 1200, 'LSI'),   // -> EQ ATS source 2
  { id: 'd-335', node_type: 'L2-7', designation: 'SPARE-EM-01', sheet_id: 'S2', data_fields: { kind: 'spare', rating: '225A/3P' } },
  { id: 'd-336', node_type: 'L2-7', designation: 'SPACE-EM-01', sheet_id: 'S2', data_fields: { kind: 'space' } },

  // ── S2: ATSs — dual-source, so NO available_fc (TV-5); dual A-4 instead.
  { id: 'd-337', node_type: 'L2-3', designation: 'LS4A-1-A', sheet_id: 'S2', data_fields: { continuous_rating: 225, poles: 3, nec_class: 'LIFE SAFETY' }, calc_fields: { withstand_rating: 65000 } },
  { id: 'd-338', node_type: 'L2-3', designation: 'C4A-1-A', sheet_id: 'S2', data_fields: { continuous_rating: 400, poles: 3, nec_class: 'CRITICAL' }, calc_fields: { withstand_rating: 65000 } },
  { id: 'd-339', node_type: 'L2-3', designation: 'EQ4A-1-A', sheet_id: 'S2', data_fields: { continuous_rating: 1200, poles: 3, nec_class: 'EQUIPMENT' }, calc_fields: { withstand_rating: 65000 } },

  // ── S2: Life Safety — LS4P-1-A -> internal 70 A -> 45 kVA -> LS2P-1-A
  panel('d-340', 'LS4P-1-A', 'S2', '225A', '480Y/277V', 'mlo'),
  cb('d-341', 'LS4P-1-A-CB', 'S2', 100, 70, 'TM', { internal_to: 'LS4P-1-A' }),
  xfmr('d-342', 'LS4T-1-A', 'S2', 45),
  panel('d-343', 'LS2P-1-A', 'S2', '150A', '208Y/120V', 'mcb', FC208[45]),

  // ── S2: Critical — C4P-1-A -> internal 175 A -> 112.5 kVA -> C2P-1-A
  panel('d-344', 'C4P-1-A', 'S2', '400A', '480Y/277V', 'mlo'),
  cb('d-345', 'C4P-1-A-CB', 'S2', 225, 175, 'TM', { internal_to: 'C4P-1-A' }),
  xfmr('d-346', 'C4T-1-A', 'S2', 112.5),
  panel('d-347', 'C2P-1-A', 'S2', '400A', '208Y/120V', 'mcb', FC208[112.5]),

  // ── S2: Equipment — EQ4P-1-A -> three internal breakers -> 75/75/45 kVA
  panel('d-348', 'EQ4P-1-A', 'S2', '1200A', '480Y/277V', 'mlo'),
  cb('d-349', 'EQ4P-1-A-CB1', 'S2', 125, 125, 'TM', { internal_to: 'EQ4P-1-A' }),
  xfmr('d-350', 'EQ4T-1-A', 'S2', 75),
  panel('d-351', 'EQ2P-1-A', 'S2', '250A', '208Y/120V', 'mcb', FC208[75]),
  cb('d-352', 'EQ4P-1-A-CB2', 'S2', 125, 125, 'TM', { internal_to: 'EQ4P-1-A' }),
  xfmr('d-353', 'EQ4T-1-B', 'S2', 75),
  panel('d-354', 'EQ2P-1-B', 'S2', '250A', '208Y/120V', 'mcb', FC208[75]),
  cb('d-355', 'EQ4P-1-A-CB3', 'S2', 100, 70, 'TM', { internal_to: 'EQ4P-1-A' }),
  xfmr('d-356', 'EQ4T-1-C', 'S2', 45),
  panel('d-357', 'EQ2P-1-C', 'S2', '150A', '208Y/120V', 'mcb', FC208[45]),
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
    calc_fields: FEEDER['30004'][0], annotation_ids: [a],
  });
  annotations.push({ id: a, annotation_type: 'A-2', bound_to: 'r-301', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: FEEDER['30004'][1] } });
}

// Plug: CB-01 -> 4P-1-A -> internal 175 A -> 112.5 kVA -> 2P-1-A, drawn by the
// internal-chain pass exactly like the mechanical branch. 2P-1-B is fed through
// 2P-1-A's feed-through lugs: F-305 stays in the topology (tag 4004, on paper)
// but is not drawn — see feed_through_panels.
feeder(302, 'S1', 'd-305', 'line_in', 'd-312', 'feed_top', '4004');
feeder(303, 'S1', 'd-327', 'line_in', 'd-313', 'primary_in', '1753');
feeder(304, 'S1', 'd-313', 'secondary_out', 'd-314', 'feed_top', '4004T');
feeder(305, 'S1', 'd-314', 'feed_left', 'd-315', 'feed_right', '4004');
// Mechanical.
feeder(306, 'S1', 'd-306', 'line_in', 'd-316', 'feed_top', '4004');
feeder(307, 'S1', 'd-317', 'line_in', 'd-318', 'primary_in', '1253');
feeder(308, 'S1', 'd-318', 'secondary_out', 'd-319', 'feed_top', '2504T');
// Lighting.
feeder(309, 'S1', 'd-307', 'line_in', 'd-320', 'feed_top', '2254');
// Kitchen.
feeder(310, 'S1', 'd-308', 'line_in', 'd-321', 'primary_in', '703');
feeder(311, 'S1', 'd-321', 'secondary_out', 'd-322', 'feed_top', '1504T');

// ATS normal sources, cross-sheet S1 -> S2.
crossFeeder(312, 'd-309', 'd-337', 'LS4A-1-A', '2254');
crossFeeder(313, 'd-310', 'd-338', 'C4A-1-A', '4004');
crossFeeder(314, 'd-311', 'd-339', 'EQ4A-1-A', '12004');

// Generator feeder -> EM main bus (HALT-004).
feeder(320, 'S2', 'd-330', 'gen_out', 'r-393', 'bus_tap_bi', '16004', 'GEN');
// EM breakers -> ATS source 2.
feeder(321, 'S2', 'd-332', 'line_in', 'd-337', 'source2_in', '2254');
feeder(322, 'S2', 'd-333', 'line_in', 'd-338', 'source2_in', '4004');
feeder(323, 'S2', 'd-334', 'line_in', 'd-339', 'source2_in', '12004');
// Life Safety.
feeder(324, 'S2', 'd-337', 'load_out', 'd-340', 'feed_top', '2254');
feeder(325, 'S2', 'd-341', 'line_in', 'd-342', 'primary_in', '703');
feeder(326, 'S2', 'd-342', 'secondary_out', 'd-343', 'feed_top', '1504T');
// Critical.
feeder(327, 'S2', 'd-338', 'load_out', 'd-344', 'feed_top', '4004');
feeder(328, 'S2', 'd-345', 'line_in', 'd-346', 'primary_in', '1753');
feeder(329, 'S2', 'd-346', 'secondary_out', 'd-347', 'feed_top', '4004T');
// Equipment.
feeder(330, 'S2', 'd-339', 'load_out', 'd-348', 'feed_top', '12004');
feeder(331, 'S2', 'd-349', 'line_in', 'd-350', 'primary_in', '1253');
feeder(332, 'S2', 'd-350', 'secondary_out', 'd-351', 'feed_top', '2504T');
feeder(333, 'S2', 'd-352', 'line_in', 'd-353', 'primary_in', '1253');
feeder(334, 'S2', 'd-353', 'secondary_out', 'd-354', 'feed_top', '2504T');
feeder(335, 'S2', 'd-355', 'line_in', 'd-356', 'primary_in', '703');
feeder(336, 'S2', 'd-356', 'secondary_out', 'd-357', 'feed_top', '1504T');

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
  // EM buses carry no available_fc (golden pattern); the A-4 rides the bus.
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
for (const ats of ['d-337', 'd-338', 'd-339']) {
  fc(ats, 'device', 'S2', FC_SVC, 'N', 'load');
  fc(ats, 'device', 'S2', FC_GEN, 'EM', 'load');
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
    project_name: 'Clinic AI Test — 3000 A Service',
    created_date: '2026-10-20',
    slug: SLUG,
    heading: 'Clinic AI Test',
    facts: [
      '3000 A service, 480Y/277V 3PH 4W, 2500 kVA utility transformer (derived)',
      '20,000 SF outpatient clinic — one storey, NEC 517',
      '1000 kW generator; LS 225 A / Critical 400 A / Equipment 1200 A ATSs',
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
    { sheet_id: 'S1', sheet_number: 'E-501', title: 'MAIN SINGLE-LINE DIAGRAM — NORMAL POWER' },
    { sheet_id: 'S2', sheet_number: 'E-502', title: 'MAIN SINGLE-LINE DIAGRAM — EMERGENCY POWER' },
  ],

  devices,
  routed_elements: routed,
  annotations,

  // ONE switchboard per sheet.
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
    { id: 'sec-203', switchboard_id: 'sw-201', type: 'main_breaker', order: 3, nec_class: null, section_tag: 'SEC-3', device_ids: ['d-303'] },
    // Normal branches. Transformer columns (CB-01 plug, CB-04 kitchen) are kept
    // apart so their label blocks do not overlap (Sprouts R-007).
    { id: 'sec-204', switchboard_id: 'sw-201', type: 'distribution', order: 4, nec_class: null, section_tag: 'SEC-4', device_ids: ['d-305', 'd-307', 'd-306'] },
    // ATS normal feeds, then spares, spaces and the N-G bond last.
    { id: 'sec-205', switchboard_id: 'sw-201', type: 'distribution', order: 5, nec_class: null, section_tag: 'SEC-5', device_ids: ['d-309', 'd-308', 'd-310', 'd-311', 'd-323', 'd-324', 'd-325', 'd-326', 'd-304'] },

    { id: 'sec-206', switchboard_id: 'sw-202', type: 'incoming', order: 1, nec_class: null, section_tag: 'SEC-1-EM', device_ids: [] },
    { id: 'sec-207', switchboard_id: 'sw-202', type: 'main_breaker', order: 2, nec_class: null, section_tag: 'SEC-2-EM', device_ids: ['d-331'] },
    // Life Safety in its own section — NEC 700.10(B) separation (NOTE-009).
    { id: 'sec-208', switchboard_id: 'sw-202', type: 'distribution', order: 3, nec_class: '700', section_tag: 'SEC-3-EM', device_ids: ['d-332'] },
    // One section per ATS branch (owner request R-011). Critical and Equipment
    // stay nec_class null: they are NEC 517 branches, not Art. 701/702 systems
    // (NOTE-009); the engine orders the ATSs by their own prose nec_class.
    { id: 'sec-209', switchboard_id: 'sw-202', type: 'distribution', order: 4, nec_class: null, section_tag: 'SEC-4-EM', device_ids: ['d-333'] },
    { id: 'sec-210', switchboard_id: 'sw-202', type: 'distribution', order: 5, nec_class: null, section_tag: 'SEC-5-EM', device_ids: ['d-334'] },
    // Spare + space in their own section so no branch section carries anything else.
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
    { id: 'pa-331', device_id: 'd-345', port: 'bus_out', attached_to_device: 'd-344', attached_to_port: 'feed_bottom' },
    { id: 'pa-332', device_id: 'd-349', port: 'bus_out', attached_to_device: 'd-348', attached_to_port: 'feed_bottom' },
    { id: 'pa-333', device_id: 'd-352', port: 'bus_out', attached_to_device: 'd-348', attached_to_port: 'feed_bottom' },
    { id: 'pa-334', device_id: 'd-355', port: 'bus_out', attached_to_device: 'd-348', attached_to_port: 'feed_bottom' },
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
