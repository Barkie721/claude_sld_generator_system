#!/usr/bin/env node
/**
 * test1_build_topology.mjs — the ONLY hand-edited file in this project.
 *
 * Test Claude: 3000 kVA, 480Y/277V service, 2 levels, one sheet. Stated scope (owner,
 * 2026-10-22): "3000 kVA service, 5 lighting branches, 2 power and 3 mech,
 * 2 levels — figure out the rest". Every value beyond that is a Tier-2 default
 * itemised in 1_source/test1_SLD_narrative_V1_0_0.md and in
 * metadata.compositor_notes[].
 *
 * Interpretation of "branch": one switchboard feeder breaker serving a two-level
 * riser — Level-1 head panel, Level-2 panel sub-fed from it (feed_top, plumb).
 * Ten breakers, ten riser columns.
 *
 * Writes two files into 2_build/:
 *   test1_layout_config.json        the sidecar (sidecar keys win at layout time)
 *   test1_SLD_topology_V1_0_0.json  topology with an EMBEDDED copy of the same config
 *
 * Both copies are deliberate. CV-14's capability gate reads only
 * topology.layout_config.subfeed_start_ports and cannot see a sidecar.
 *
 * ID ranges are rebased off the hospital golden (schema §16): d-3xx / r-3xx /
 * r-39x buses / a-6xx / sw-2xx / sec-2xx / pa-3xx / meas-3xx.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '2_build');
const SLUG = 'test1';

/* ---------------------------------------------------------------------------
 * Feeder data — every entry is a row of feeder_schedule_V1_0_0.json (4-wire
 * unless noted) or 3_phase_transformer_feeder_schedule_V1_0_0.json. No value
 * here is estimated.
 * ------------------------------------------------------------------------- */
const FEEDERS = {
  // 4000 A 4-wire service lateral, tag 40004: 15 sets, 4" C, (4)500 AL + 500 AL.
  '40004': { tag: null, sets: 15, conduit: '4"', size: '500', n: 4, neutral: '500', gnd: '500', gmat: 'AL', callout: '(15) 4"C - (4)500 AL + 500 AL GND' },
  // 400 A 4-wire, tag 4004: 2 sets, 3" C, (4)350 AL + #3 CU.
  '4004': { tag: '4004', sets: 2, conduit: '3"', size: '350', n: 4, neutral: '350', gnd: '3', gmat: 'CU', callout: '(2) 3"C - (4)350 AL + #3 CU GND' },
  // 225 A 4-wire, tag 2254: 1 set, 3 1/2" C, (4)350 AL + #6 CU.
  '2254': { tag: '2254', sets: 1, conduit: '3 1/2"', size: '350', n: 4, neutral: '350', gnd: '6', gmat: 'CU', callout: '3 1/2"C - (4)350 AL + #6 CU GND' },
  // 100 A 4-wire, tag 1004: 1 set, 2" C, (4)1/0 AL + #6 CU.
  '1004': { tag: '1004', sets: 1, conduit: '2"', size: '1/0', n: 4, neutral: '1/0', gnd: '6', gmat: 'CU', callout: '2"C - (4)#1/0 AL + #6 CU GND' },
  // 250 A 3-wire (delta primary, no neutral), tag 2503: 1 set, 2 1/2" C, (3)350 AL + #4 CU.
  '2503': { tag: '2503', sets: 1, conduit: '2 1/2"', size: '350', n: 3, neutral: null, gnd: '4', gmat: 'CU', callout: '2 1/2"C - (3)350 AL + #4 CU GND' },
  // 150 kVA secondary, transformer schedule one_line_tag 5004T (feeder type 5004):
  // 2 sets, 3 1/2" C, (4)500 AL; bonding jumper #2 AWG.
  '5004T': { tag: '5004T', sets: 2, conduit: '3 1/2"', size: '500', n: 4, neutral: '500', gnd: '3', gmat: 'CU', callout: '(2) 3 1/2"C - (4)500 AL + #2 CU SBJ' },
};

/* ---------------------------------------------------------------------------
 * The ten branches, in LEFT-TO-RIGHT bus order.
 *
 * The two Chain-B power columns are kept apart (mechanical between them): two
 * adjacent transformer columns put one unit's 3-line label block inside its
 * neighbour's glyph extent and trip --audit glyph_collision (default 2500 kVA
 * R-007). The five lighting columns are plain Chain-A panels and pack freely.
 * ------------------------------------------------------------------------- */
const BRANCHES = [
  { kind: 'L', id: 'A' }, { kind: 'L', id: 'B' }, { kind: 'L', id: 'C' }, { kind: 'L', id: 'D' }, { kind: 'L', id: 'E' },
  { kind: 'M', id: 'A' }, { kind: 'P', id: 'A' }, { kind: 'M', id: 'B' }, { kind: 'P', id: 'B' }, { kind: 'M', id: 'C' },
];

// Per-kind defaults (Tier 2 — no connected-load schedule was provided).
const KIND = {
  // Lighting: 480Y/277V, 225 A MLO on L1, 100 A MLO on L2. Breaker 250AF/225AT.
  L: { label: 'lighting', cb: { af: 250, at: 225 }, base: '2254', hop: '1004', l1: '225A', l2: '100A', volt: '480Y/277V' },
  // Mechanical: 480Y/277V, 400 A MLO on L1, 225 A MLO on L2. Breaker 400AF/400AT.
  M: { label: 'mechanical', cb: { af: 400, at: 400 }, base: '4004', hop: '2254', l1: '400A', l2: '225A', volt: '480Y/277V' },
  // Power: 150 kVA 480Δ-208Y/120V step-down (Chain B). Breaker 400AF/250AT = the
  // 150 kVA primary OCPD (transformer schedule tag 2503). 500 A secondary OCPD in
  // the L1 panel main (NEC 240.21(C)) -> MCB; L2 225 A MLO.
  P: { label: 'power', cb: { af: 400, at: 250 }, base: '2503', sec: '5004T', hop: '2254', l1: '500A', l2: '225A', volt: '208Y/120V' },
};

/* ---------------------------------------------------------------------------
 * Build the device / feeder / annotation lists.
 * ------------------------------------------------------------------------- */
let dN = 305, rN = 302, aN = 602;
const nextD = () => `d-${dN++}`;
const nextR = () => `r-${rN++}`;
const nextA = () => `a-${aN++}`;

const devices = [];
const routed = [];
const annotations = [];
const breakerIds = [];
const portAssignments = [];
const straighten = [];
const tagPlacement = {};
const levelMap = {};
const lightingStack = [];      // designations per branch for floor banding
const meta = [];               // branch summary for the notes

function feeder(fromId, fromPort, toId, toPort, key) {
  const f = FEEDERS[key];
  const rid = nextR();
  const desig = `F-${rid.slice(2)}`;
  const ann = [];
  if (f.tag) {
    const a1 = nextA();
    annotations.push({ id: a1, annotation_type: 'A-1', bound_to: rid, bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: f.tag } });
    ann.push(a1);
  }
  const a2 = nextA();
  annotations.push({ id: a2, annotation_type: 'A-2', bound_to: rid, bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: f.callout } });
  ann.push(a2);
  routed.push({
    id: rid,
    edge_type: 'R-1',
    designation: desig,
    sheet_id: 'S1',
    start: { device_id: fromId, port: fromPort },
    end: { device_id: toId, port: toPort },
    stub_exempt: false,
    data_fields: {},
    calc_fields: {
      conductor_material: 'AL',
      conductor_size: f.size,
      conductors_per_phase: f.n,
      neutral_size: f.neutral,
      ground_size: f.gnd,
      ground_material: f.gmat,
      conduit_type: 'EMT',
      conduit_size: f.conduit,
      num_sets: f.sets,
    },
    annotation_ids: ann,
  });
  tagPlacement[desig] = { side: 'right' };
  return desig;
}

const panel = (designation, rating, volt, main) => {
  const id = nextD();
  devices.push({
    id, node_type: 'L2-4', designation, sheet_id: 'S1',
    data_fields: main === 'mcb' ? { rating, voltage: volt, mcb: true } : { rating, voltage: volt, mlo: true },
  });
  return id;
};

BRANCHES.forEach((b, i) => {
  const k = KIND[b.kind];
  const cbDesig = `CB-${String(i + 1).padStart(2, '0')}`;
  const cbId = nextD();
  devices.push({
    id: cbId, node_type: 'L2-1', designation: cbDesig, sheet_id: 'S1',
    data_fields: { af: k.cb.af, at: k.cb.at, poles: 3, trip_type: 'LSI' },
  });
  breakerIds.push(cbId);

  const L1 = b.kind === 'P' ? `2P-1-${b.id}` : `4${b.kind}-1-${b.id}`;
  const L2 = b.kind === 'P' ? `2P-2-${b.id}` : `4${b.kind}-2-${b.id}`;

  if (b.kind === 'P') {
    const tx = nextD();
    devices.push({
      id: tx, node_type: 'L2-2', designation: `4T-1-${b.id}`, sheet_id: 'S1',
      // Golden notation, no spaces around the dash (default 2500 kVA R-007).
      // %Z / X-R midpoints from transformer_impedance_V1_0_0.json (150 kVA).
      data_fields: { kva: 150, config: '480Δ-208Y/120V' },
      calc_fields: { pct_z: 4.35, x_over_r: 2.95 },
    });
    const p1 = panel(L1, k.l1, k.volt, 'mcb');
    const p2 = panel(L2, k.l2, k.volt, 'mlo');
    feeder(cbId, 'line_in', tx, 'primary_in', k.base);
    feeder(tx, 'secondary_out', p1, 'feed_top', k.sec);
    straighten.push(feeder(p1, 'feed_top', p2, 'feed_bottom', k.hop));
  } else {
    const p1 = panel(L1, k.l1, k.volt, 'mlo');
    const p2 = panel(L2, k.l2, k.volt, 'mlo');
    feeder(cbId, 'line_in', p1, 'feed_top', k.base);
    straighten.push(feeder(p1, 'feed_top', p2, 'feed_bottom', k.hop));
  }
  levelMap[L1] = '1';
  levelMap[L2] = '2';
  lightingStack.push({ kind: b.kind, id: b.id, L1, L2 });
  meta.push(`${cbDesig} ${k.cb.af}AF/${k.cb.at}AT -> ${L1} -> ${L2} (${k.label})`);
});

// Two NAMED stacks a normal sheet can floor-band, the rest via OFF-009.
const FA = { 2: '4L-2-A', 1: '4L-1-A' };
const FA_MECH = { 2: '4M-2-A', 1: '4M-1-A' };
const named = new Set([...Object.values(FA), ...Object.values(FA_MECH)]);
const bandDesigs = lightingStack.flatMap((s) => [s.L1, s.L2]).filter((d) => !named.has(d));

/* ---------------------------------------------------------------------------
 * layout_config
 * Every hospital-named key is CLEARED EXPLICITLY. Absent keys fall back to the
 * engine's _DEF_* golden values, which anchor the drawing to devices that do not
 * exist here.
 * ------------------------------------------------------------------------- */
const LAYOUT_CONFIG = {
  sheet_roles: { S1: 'normal' },
  sheet_skips: {},
  // ⚠️ OBJECT FORM, NOT A FLAT ARRAY — _sheetFloorStackBottomUp reads only the
  // object form and falls back to the hospital stack otherwise. Index 0 = top.
  floor_order: { S1: ['2', '1'] },
  floor_anchors: FA,
  // ⚠️ The mech walk is positional and baselines its lowest present floor at the
  // Level-1 row, so the floor-1 entry is mandatory (Sprouts R-005).
  floor_anchors_mechanical: FA_MECH,
  floor_band_designations: bandDesigs,
  // Riser panels only. Transformers stay out — a mapped device drags its level
  // line down. L0-1 / L1-x are excluded by the engine's LEVEL_EXCLUDE_TYPES.
  level_map: levelMap,
  level_order: ['2', '1'],
  ats_xoffset_overrides: {},
  // Default 2500 kVA R-011: 650 is the first pitch with real margin between an
  // A-1 tick pinned 90 px off its exit and the child panel / level line.
  riser_step_standard: 650,
  // Must EXCEED the deepest sub-feed chain (one hop, L1 -> L2).
  subfeed_max_depth: 3,
  subfeed_start_ports: ['feed_bottom', 'feed_top'],
  subfeed_src_types: ['L2-4'],
  subfeed_dst_types: ['L2-4'],
  // OFF-027 — every L1 -> L2 hop draws as one plumb vertical.
  subfeed_straighten: straighten,
  s2_level_line_pitch: {},
  s2_shift_delta: {},
  subfeed_midy_nudge: {},
  // R-009 house style (default 2500 kVA): every feeder tag on the RIGHT of its run.
  a1_tag_placement: tagPlacement,
  a3_text_placement: {},
  fc_pennant_placement: {},
  fc_pennant_y_nudges: {},
};

const SIDECAR_COMMENT =
  'Sidecar layout_config for Test Claude (3000 kVA, 2 levels). Every hospital-golden default that ' +
  'names hospital designations is explicitly cleared — absent keys fall back to the engine\'s ' +
  '_DEF_* hospital values (schema §19). Ten riser stacks: two named, eight via ' +
  'floor_band_designations (OFF-009).';

const EMBED_COMMENT =
  'Embedded copy of test1_layout_config.json. Embedded (not sidecar-only) so validator rule ' +
  'CV-14 runs — its capability gate reads topology.layout_config.subfeed_start_ports and cannot ' +
  'see external configs (08_validation/lib/context_V1_0_0.mjs). Sidecar keys still win at layout time.';

/* ---------------------------------------------------------------------------
 * Tier-3 halts — five keys (id, topic, text, nec_reference, blocks); the shape
 * is load-bearing for 4_checks/make_open_items.mjs.
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
      'value. transformer_impedance_V1_0_0.json covers dry-type distribution units only and has ' +
      'no 3000 kVA row, so pct_z / x_over_r on d-301 are left null rather than fabricated. ' +
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
      'Affects every R-1 in this topology.',
    nec_reference: 'NEC 210.19(A) IN / 215.2(A)(1) IN',
    blocks: 'Voltage-drop calculation · A-5 tags',
  },
];

/* ---------------------------------------------------------------------------
 * Tier-2 decisions taken by default — four keys, no `blocks`.
 * ------------------------------------------------------------------------- */
const NOTES = [
  {
    id: 'NOTE-001',
    topic: 'Service voltage, configuration and main',
    text:
      '480Y/277V 3PH 4W assumed. FLA at 3000 kVA = 3,000,000 / (480 x 1.732) = 3608 A, so the main ' +
      'is the next standard rating above it: 4000AF / 4000AT LSIG with GFP (NEC 240.6(A), 230.95). ' +
      'Main and secondary bus 4000 A. Service lateral tag 40004 (15 sets 4" C, (4)500 AL + 500 AL GND).',
    nec_reference: 'NEC 230.95 / 240.6(A)',
  },
  {
    id: 'NOTE-002',
    topic: 'Occupancy and levels',
    text:
      'Commercial occupancy assumed, 2 storeys, electrical room on Level 1, one normal-power sheet. ' +
      'A-7 level lines on Levels 1 and 2.',
    nec_reference: null,
  },
  {
    id: 'NOTE-003',
    topic: 'Branch interpretation',
    text:
      '"5 lighting, 2 power, 3 mech branches" is taken as ten switchboard feeder breakers, each ' +
      'serving a two-level riser: a Level-1 head panel and a Level-2 panel sub-fed from it. Upper-' +
      'floor OCPD is internal to the Level-1 panel per its own schedule. Branches: ' + meta.join('; ') + '.',
    nec_reference: null,
  },
  {
    id: 'NOTE-004',
    topic: 'Panel and feeder sizing',
    text:
      'No connected-load schedule was provided, so every panel rating is a default size, not a ' +
      'calculation. Lighting 225 A MLO (L1, tag 2254) / 100 A MLO (L2, tag 1004) at 480Y/277V; ' +
      'mechanical 400 A MLO (L1, tag 4004) / 225 A MLO (L2, tag 2254) at 480Y/277V; power via ' +
      '150 kVA 480D-208Y/120V step-down, 500 A MCB (L1) / 225 A MLO (L2). Sum of feeder trips ' +
      '2825 A against a 4000 A bus.',
    nec_reference: null,
  },
  {
    id: 'NOTE-005',
    topic: '150 kVA transformer protection',
    text:
      'Primary OCPD 250 A (transformer schedule tag 2503) in the switchboard; secondary OCPD 500 A ' +
      '(tag 5004T) in the 2P-1-x panel main, which protects the secondary conductors per NEC ' +
      '240.21(C). %Z 4.35 / X-R 2.95 are transformer_impedance midpoints.',
    nec_reference: 'NEC 240.21(C) / 450.3(B)',
  },
  {
    id: 'NOTE-006',
    topic: 'No fire pump, generator, ATS or SPD',
    text:
      'None stated and none defaulted in. If a fire pump is added it must be tapped ahead of the ' +
      'main disconnect per NEC 695.4(B); that is non-negotiable.',
    nec_reference: 'NEC 695.4(B)',
  },
];

/* --------------------------------------------------------------------------- */

const topology = {
  $schema: 'sld_topology/v1',

  metadata: {
    schema_version: '1.0.0',
    project_name: 'Test Claude — 3000 kVA Service, 2 Levels',
    created_date: '2026-10-22',
    slug: SLUG,
    heading: 'Test Claude — 3000 kVA',
    facts: [
      '3000 kVA service, 480Y/277V 3PH 4W, 4000A GFP main',
      '10 feeders — 5 lighting, 2 power (150 kVA step-down), 3 mechanical',
      '2 storeys — every branch a two-level riser, A-7 level lines on S1',
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
    {
      id: 'd-301',
      node_type: 'L0-1',
      designation: 'UTILITY-XFMR',
      sheet_id: 'S1',
      data_fields: { kva_rating: 3000, primary_voltage: '13.2kV', secondary_voltage: '480Y/277V', phases: 3, wires: 4 },
      calc_fields: { pct_z: null, x_over_r: null },   // HALT-002
    },
    { id: 'd-302', node_type: 'L1-4', designation: 'UTIL-MTR', sheet_id: 'S1', data_fields: { meter_type: 'utility' } },
    // GFP main — Tier-1, NEC 230.95.
    { id: 'd-303', node_type: 'L1-1', designation: 'MAIN-GFP', sheet_id: 'S1', data_fields: { af: 4000, at: 4000, poles: 3, trip_type: 'LSIG' } },
    // N-G bond, NEC 250.24(C). Must sit in a `distribution` section.
    { id: 'd-304', node_type: 'L1-3', designation: 'NG-BOND', sheet_id: 'S1', data_fields: { sds: 'service_entrance' } },
    ...devices,
  ],

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
        conductor_material: 'AL', conductor_size: '500', conductors_per_phase: 4, neutral_size: '500',
        ground_size: '500', ground_material: 'AL', conduit_type: 'EMT', conduit_size: '4"', num_sets: 15,
      },
      annotation_ids: ['a-601'],
    },
    ...routed,
    {
      id: 'r-391', edge_type: 'R-2', designation: 'main-bus-4MSB-1-A', sheet_id: 'S1', bus_level: 'main',
      stroke_weight: 2.5, start: null, end: null, stub_exempt: null, data_fields: {}, calc_fields: { bus_rating: 4000 }, annotation_ids: [],
    },
    {
      id: 'r-392', edge_type: 'R-2', designation: 'sec-bus-4MSB-1-A', sheet_id: 'S1', bus_level: 'secondary',
      stroke_weight: 2, start: null, end: null, stub_exempt: null, data_fields: {}, calc_fields: { bus_rating: 4000 }, annotation_ids: [],
    },
  ],

  annotations: [
    { id: 'a-601', annotation_type: 'A-2', bound_to: 'r-301', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: FEEDERS['40004'].callout } },
    ...annotations,
  ],

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
    // Breaker order is the BRANCHES order (left to right). N-G bond last.
    { id: 'sec-204', switchboard_id: 'sw-201', type: 'distribution', order: 4, nec_class: null, section_tag: 'SEC-4', device_ids: [...breakerIds, 'd-304'] },
  ],

  port_assignments: [
    { id: 'pa-301', device_id: 'd-303', port: 'line_in', bus_id: 'r-391' },
    { id: 'pa-302', device_id: 'd-303', port: 'bus_out', bus_id: 'r-392' },
    ...breakerIds.map((id, i) => ({ id: `pa-${303 + i}`, device_id: id, port: 'bus_out', bus_id: 'r-392' })),
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
