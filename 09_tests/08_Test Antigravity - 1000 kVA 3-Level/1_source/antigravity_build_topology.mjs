#!/usr/bin/env node
/**
 * antigravity_build_topology.mjs — build script for Test Antigravity.
 *
 * Scope: 1000 kVA, 480Y/277V service, fire pump, no emergency system,
 * 2 plug load panels at 208V, 2 lighting branches at 208V, 4 mechanical branches
 * (one is 208V), 3 levels.
 *
 * Layout Strategy:
 * - Fire pump section taps switchboard main bus ahead of main breaker (NEC 695.4(B)).
 * - Interleave 208V Chain-B transformer columns with 480V Chain-A mechanical columns:
 *   B, A, B, A, B, A, B — avoiding adjacent transformer glyph collisions (R-007).
 * - Floor banding across Levels 1, 2, and 3 with riser_step_standard: 650.
 *
 * Writes:
 *   2_build/antigravity_layout_config.json
 *   2_build/antigravity_SLD_topology_V1_0_0.json (with embedded layout_config)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '2_build');
const SLUG = 'antigravity';

/* ---------------------------------------------------------------------------
 * Feeder Schedule Lookup
 * ------------------------------------------------------------------------- */
const FEEDERS = {
  // Service lateral: 1600 A 4-wire (tag 16004): 6 sets, 3 1/2" C, (4)500 AL + 350 AL GND
  '16004': { tag: null, sets: 6, conduit: '3 1/2"', size: '500', n: 4, neutral: '500', gnd: '350', gmat: 'AL', callout: '(6) 3 1/2"C - (4)500 AL + 350 AL GND' },
  // 400 A 4-wire (tag 4004): 2 sets, 3" C, (4)350 AL + #3 CU GND
  '4004': { tag: '4004', sets: 2, conduit: '3"', size: '350', n: 4, neutral: '350', gnd: '3', gmat: 'CU', callout: '(2) 3"C - (4)350 AL + #3 CU GND' },
  // 250 A 3-wire (delta primary / fire pump, tag 2503): 1 set, 2 1/2" C, (3)350 AL + #4 CU GND
  '2503': { tag: '2503', sets: 1, conduit: '2 1/2"', size: '350', n: 3, neutral: null, gnd: '4', gmat: 'CU', callout: '2 1/2"C - (3)350 AL + #4 CU GND' },
  // 125 A 3-wire (transformer primary 75 kVA, tag 1253): 1 set, 1 1/2" C, (3)2/0 AL + #6 CU GND
  '1253': { tag: '1253', sets: 1, conduit: '1 1/2"', size: '2/0', n: 3, neutral: null, gnd: '6', gmat: 'CU', callout: '1 1/2"C - (3)2/0 AL + #6 CU GND' },
  // 75 kVA secondary 208V (tag 2504T): 1 set, 3 1/2" C, (4)500 AL; bonding jumper #2 AWG
  '2504T': { tag: '2504T', sets: 1, conduit: '3 1/2"', size: '500', n: 4, neutral: '500', gnd: '2', gmat: 'CU', callout: '3 1/2"C - (4)500 AL + #2 CU SBJ' },
  // 225 A 4-wire (sub-feed hop 1, tag 2254): 1 set, 3 1/2" C, (4)350 AL + #6 CU GND
  '2254': { tag: '2254', sets: 1, conduit: '3 1/2"', size: '350', n: 4, neutral: '350', gnd: '6', gmat: 'CU', callout: '3 1/2"C - (4)350 AL + #6 CU GND' },
  // 100 A 4-wire (sub-feed hop 2, tag 1004): 1 set, 2" C, (4)1/0 AL + #6 CU GND
  '1004': { tag: '1004', sets: 1, conduit: '2"', size: '1/0', n: 4, neutral: '1/0', gnd: '6', gmat: 'CU', callout: '2"C - (4)#1/0 AL + #6 CU GND' },
};

/* ---------------------------------------------------------------------------
 * Distribution Branches: B, A, B, A, B, A, B
 * ------------------------------------------------------------------------- */
const BRANCHES = [
  { kind: 'L', id: 'A', desig: 'Lighting A', levels: 3 },
  { kind: 'M', id: 'A', desig: 'Mech A', levels: 3 },
  { kind: 'L', id: 'B', desig: 'Lighting B', levels: 3 },
  { kind: 'M', id: 'B', desig: 'Mech B', levels: 3 },
  { kind: 'P', id: 'A', desig: 'Plug Loads', levels: 2 }, // Exactly 2 plug load panels
  { kind: 'M', id: 'C', desig: 'Mech C', levels: 3 },
  { kind: 'M2', id: 'D', desig: 'Mech D (208V)', levels: 3 }, // 208V mechanical branch
];

const KIND = {
  // Lighting (208V via 75 kVA transformer): 225A MCB on L1, 225A MLO on L2, 100A MLO on L3
  L: { chain: 'B', cb: { af: 250, at: 125 }, pri: '1253', txKva: 75, sec: '2504T', hop1: '2254', hop2: '1004', l1: '225A', l2: '225A', l3: '100A', volt: '208Y/120V' },
  // Mechanical (480V): 400A MLO on L1, 225A MLO on L2, 225A MLO on L3
  M: { chain: 'A', cb: { af: 400, at: 400 }, pri: '4004', hop1: '2254', hop2: '2254', l1: '400A', l2: '225A', l3: '225A', volt: '480Y/277V' },
  // Power / Plug Loads (208V via 75 kVA transformer): 225A MCB on L1, 225A MLO on L2 (2 panels total)
  P: { chain: 'B', cb: { af: 250, at: 125 }, pri: '1253', txKva: 75, sec: '2504T', hop1: '2254', l1: '225A', l2: '225A', volt: '208Y/120V' },
  // Mechanical D (208V via 75 kVA transformer): 225A MCB on L1, 225A MLO on L2, 100A MLO on L3
  M2: { chain: 'B', cb: { af: 250, at: 125 }, pri: '1253', txKva: 75, sec: '2504T', hop1: '2254', hop2: '1004', l1: '225A', l2: '225A', l3: '100A', volt: '208Y/120V' },
};

/* ---------------------------------------------------------------------------
 * ID counters & object stores
 * ------------------------------------------------------------------------- */
let dN = 310, rN = 310, aN = 610;
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
const allPanelDesigs = [];
const metaNotes = [];

function feeder(fromId, fromPort, toId, toPort, key) {
  const f = FEEDERS[key];
  if (!f) throw new Error(`Missing feeder key ${key}`);
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

const addPanel = (designation, rating, volt, main) => {
  const id = nextD();
  devices.push({
    id, node_type: 'L2-4', designation, sheet_id: 'S1',
    data_fields: main === 'mcb' ? { rating, voltage: volt, mcb: true } : { rating, voltage: volt, mlo: true },
  });
  return id;
};

/* ---------------------------------------------------------------------------
 * Build branches
 * ------------------------------------------------------------------------- */
BRANCHES.forEach((b, i) => {
  const k = KIND[b.kind];
  const cbDesig = `CB-${String(i + 1).padStart(2, '0')}`;
  const cbId = nextD();
  devices.push({
    id: cbId, node_type: 'L2-1', designation: cbDesig, sheet_id: 'S1',
    data_fields: { af: k.cb.af, at: k.cb.at, poles: 3, trip_type: 'LSI' },
  });
  breakerIds.push(cbId);

  const prefix = b.kind === 'M' ? '4M' : (b.kind === 'M2' ? '2M' : (b.kind === 'P' ? '2P' : '2L'));
  const L1 = `${prefix}-1-${b.id}`;
  const L2 = `${prefix}-2-${b.id}`;
  const L3 = b.levels === 3 ? `${prefix}-3-${b.id}` : null;

  if (k.chain === 'B') {
    // 75 kVA transformer
    const txId = nextD();
    const txDesig = b.kind === 'P' ? '4T-1-P' : `4T-1-${b.id}`;
    devices.push({
      id: txId, node_type: 'L2-2', designation: txDesig, sheet_id: 'S1',
      data_fields: { kva: k.txKva, config: '480Δ-208Y/120V' },
      calc_fields: { pct_z: 4.45, x_over_r: 2.25 },
    });
    const p1 = addPanel(L1, k.l1, k.volt, 'mcb');
    const p2 = addPanel(L2, k.l2, k.volt, 'mlo');
    feeder(cbId, 'line_in', txId, 'primary_in', k.pri);
    feeder(txId, 'secondary_out', p1, 'feed_top', k.sec);
    straighten.push(feeder(p1, 'feed_top', p2, 'feed_bottom', k.hop1));

    levelMap[L1] = '1';
    levelMap[L2] = '2';
    allPanelDesigs.push(L1, L2);

    if (L3) {
      const p3 = addPanel(L3, k.l3, k.volt, 'mlo');
      straighten.push(feeder(p2, 'feed_top', p3, 'feed_bottom', k.hop2));
      levelMap[L3] = '3';
      allPanelDesigs.push(L3);
      metaNotes.push(`${cbDesig} ${k.cb.af}AF/${k.cb.at}AT -> ${txDesig} (75 kVA) -> ${L1} -> ${L2} -> ${L3}`);
    } else {
      metaNotes.push(`${cbDesig} ${k.cb.af}AF/${k.cb.at}AT -> ${txDesig} (75 kVA) -> ${L1} -> ${L2} (2 panels)`);
    }
  } else {
    // 480V Chain A
    const p1 = addPanel(L1, k.l1, k.volt, 'mlo');
    const p2 = addPanel(L2, k.l2, k.volt, 'mlo');
    const p3 = addPanel(L3, k.l3, k.volt, 'mlo');
    feeder(cbId, 'line_in', p1, 'feed_top', k.pri);
    straighten.push(feeder(p1, 'feed_top', p2, 'feed_bottom', k.hop1));
    straighten.push(feeder(p2, 'feed_top', p3, 'feed_bottom', k.hop2));

    levelMap[L1] = '1';
    levelMap[L2] = '2';
    levelMap[L3] = '3';
    allPanelDesigs.push(L1, L2, L3);
    metaNotes.push(`${cbDesig} ${k.cb.af}AF/${k.cb.at}AT -> ${L1} -> ${L2} -> ${L3}`);
  }
});

/* ---------------------------------------------------------------------------
 * Floor Banding Anchors
 * ------------------------------------------------------------------------- */
const FA = { 3: '2L-3-A', 2: '2L-2-A', 1: '2L-1-A' };
const FA_MECH = { 3: '4M-3-A', 2: '4M-2-A', 1: '4M-1-A' };
const namedAnchors = new Set([...Object.values(FA), ...Object.values(FA_MECH)]);
const bandDesigs = allPanelDesigs.filter(d => !namedAnchors.has(d));

/* ---------------------------------------------------------------------------
 * Layout Configuration
 * ------------------------------------------------------------------------- */
const LAYOUT_CONFIG = {
  sheet_roles: { S1: 'normal' },
  sheet_skips: {},
  floor_order: { S1: ['3', '2', '1'] },
  floor_anchors: FA,
  floor_anchors_mechanical: FA_MECH,
  floor_band_designations: bandDesigs,
  level_map: levelMap,
  level_order: ['3', '2', '1'],
  ats_xoffset_overrides: {},
  riser_step_standard: 650,
  subfeed_max_depth: 3,
  subfeed_start_ports: ['feed_bottom', 'feed_top'],
  subfeed_src_types: ['L2-4'],
  subfeed_dst_types: ['L2-4'],
  subfeed_straighten: straighten,
  s2_level_line_pitch: {},
  s2_shift_delta: {},
  subfeed_midy_nudge: {},
  a1_tag_placement: tagPlacement,
  a3_text_placement: {},
  fc_pennant_placement: {},
  fc_pennant_y_nudges: {},
};

const SIDECAR_COMMENT =
  'Sidecar layout_config for Test Antigravity (1000 kVA, 3 levels). Every hospital-golden default that ' +
  'names hospital designations is explicitly cleared. Seven distribution columns interleaved ' +
  '(B, A, B, A, B, A, B) to prevent adjacent transformer collisions.';

const EMBED_COMMENT =
  'Embedded copy of antigravity_layout_config.json. Embedded so validator rule CV-14 runs — its capability ' +
  'gate reads topology.layout_config.subfeed_start_ports. Sidecar keys still win at layout time.';

/* ---------------------------------------------------------------------------
 * Tier-3 Halts
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
      'no 1000 kVA row, so pct_z / x_over_r on d-301 are left null rather than fabricated. ' +
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
  {
    id: 'HALT-004',
    topic: 'Fire pump breaker rating confirmation',
    text:
      'COMPOSITOR_HALT: fire pump breaker rating is provisional (250AF / 250AT). EOR must confirm ' +
      'final overcurrent protection sizing per NEC 695.4(B)(2) locked-rotor current carrying requirements ' +
      'for 4FP-1-A (100 HP, 124 FLA / 725 LRA). Affects d-303, r-302.',
    nec_reference: 'NEC 695.4(B)(2)',
    blocks: 'Fire pump breaker certification',
  },
];

/* ---------------------------------------------------------------------------
 * Tier-2 Decisions Taken by Default
 * ------------------------------------------------------------------------- */
const NOTES = [
  {
    id: 'NOTE-001',
    topic: 'Service voltage, configuration and main',
    text:
      '480Y/277V 3PH 4W stated. FLA at 1000 kVA = 1,000,000 / (480 x 1.732) = 1202.8 A. Main breaker ' +
      'is next standard rating above FLA: 1600AF / 1600AT LSIG with GFP (NEC 240.6(A), 230.95). ' +
      'Main and secondary bus 1600 A. Service lateral tag 16004 (6 sets 3 1/2" C, (4)500 AL + 350 AL GND).',
    nec_reference: 'NEC 230.95 / 240.6(A)',
  },
  {
    id: 'NOTE-002',
    topic: 'Occupancy and levels',
    text:
      'Commercial occupancy assumed, 3 storeys, electrical room on Level 1, one normal-power sheet S1. ' +
      'A-7 level lines on Levels 1, 2, and 3.',
    nec_reference: null,
  },
  {
    id: 'NOTE-003',
    topic: 'Fire pump on main bus',
    text:
      'Fire pump taps main bus ahead of the main service disconnect per NEC 695.4(B) (non-negotiable). ' +
      'Positioned in dedicated fire_pump section between metering and main breaker sections.',
    nec_reference: 'NEC 695.4(B)',
  },
  {
    id: 'NOTE-004',
    topic: 'Branch arrangement & bus order',
    text:
      'Branches arranged B, A, B, A, B, A, B: four 208V transformer-fed branches interleaved with three ' +
      '480V direct mechanical branches to eliminate adjacent transformer glyph collision risk. ' +
      'Branches: ' + metaNotes.join('; ') + '.',
    nec_reference: null,
  },
  {
    id: 'NOTE-005',
    topic: 'Plug load branch interpretation',
    text:
      'Stated scope calls for "2 plug load panels at 208v". Realized as Power Branch A: 75 kVA transformer ' +
      '4T-1-P feeding 2P-1-A (Level 1) which sub-feeds 2P-2-A (Level 2). Exactly two plug load panels.',
    nec_reference: null,
  },
  {
    id: 'NOTE-006',
    topic: 'No emergency system',
    text:
      'Stated: "no emergency system". No generator, ATS, or emergency switchboard modeled.',
    nec_reference: null,
  },
];

/* ---------------------------------------------------------------------------
 * Assemble Full Topology JSON
 * ------------------------------------------------------------------------- */
const topology = {
  $schema: 'sld_topology/v1',

  metadata: {
    schema_version: '1.0.0',
    project_name: 'Test Antigravity — 1000 kVA Service, 3 Levels',
    created_date: '2026-10-22',
    slug: SLUG,
    heading: 'Test Antigravity — 1000 kVA',
    facts: [
      '1000 kVA service, 480Y/277V 3PH 4W, 1600A GFP main',
      'Dedicated fire pump tapped ahead of main disconnect (NEC 695.4(B))',
      '7 distribution branches: 2 lighting (208V), 3 mechanical (480V), 1 mechanical (208V), 1 plug load (208V, 2 panels)',
      '3 storeys — floor-banded risers with A-7 level lines on S1',
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
      data_fields: { kva_rating: 1000, primary_voltage: '13.2kV', secondary_voltage: '480Y/277V', phases: 3, wires: 4 },
      calc_fields: { pct_z: null, x_over_r: null },
    },
    { id: 'd-302', node_type: 'L1-4', designation: 'UTIL-MTR', sheet_id: 'S1', data_fields: { meter_type: 'utility' } },
    // Fire pump breaker on main bus — NEC 695.4(B)
    { id: 'd-303', node_type: 'L2-1', designation: 'CB-FP', sheet_id: 'S1', data_fields: { af: 250, at: 250, poles: 3, trip_type: 'LSI' } },
    // Main GFP breaker — NEC 230.95
    { id: 'd-304', node_type: 'L1-1', designation: 'MAIN-GFP', sheet_id: 'S1', data_fields: { af: 1600, at: 1600, poles: 3, trip_type: 'LSIG' } },
    // Fire pump motor / terminal load (L3-1)
    { id: 'd-305', node_type: 'L3-1', designation: '4FP-1-A', sheet_id: 'S1', data_fields: { hp: 100, fla: 124, lra: 725, voltage_phase: '480V-3PH' } },
    // N-G bond at service entrance — NEC 250.24(C)
    { id: 'd-306', node_type: 'L1-3', designation: 'NG-BOND', sheet_id: 'S1', data_fields: { sds: 'service_entrance' } },
    ...devices,
  ],

  routed_elements: [
    // Service lateral from utility transformer to main GFP breaker
    {
      id: 'r-301',
      edge_type: 'R-1',
      designation: 'F-301',
      sheet_id: 'S1',
      start: { device_id: 'd-301', port: 'secondary_out' },
      end: { device_id: 'd-304', port: 'line_in' },
      stub_exempt: false,
      data_fields: { is_service_entrance: true },
      calc_fields: {
        conductor_material: 'AL', conductor_size: '500', conductors_per_phase: 4, neutral_size: '500',
        ground_size: '350', ground_material: 'AL', conduit_type: 'EMT', conduit_size: '3 1/2"', num_sets: 6,
      },
      annotation_ids: ['a-601'],
    },
    // Fire pump feeder from CB-FP to 4FP-1-A
    {
      id: 'r-302',
      edge_type: 'R-1',
      designation: 'F-FP',
      sheet_id: 'S1',
      start: { device_id: 'd-303', port: 'line_in' },
      end: { device_id: 'd-305', port: 'load_in' },
      stub_exempt: false,
      data_fields: {},
      calc_fields: {
        conductor_material: 'AL', conductor_size: '350', conductors_per_phase: 3, neutral_size: null,
        ground_size: '4', ground_material: 'CU', conduit_type: 'EMT', conduit_size: '2 1/2"', num_sets: 1,
      },
      annotation_ids: ['a-602', 'a-603'],
    },
    ...routed,
    {
      id: 'r-391', edge_type: 'R-2', designation: 'main-bus-4MSB-1-A', sheet_id: 'S1', bus_level: 'main',
      stroke_weight: 2.5, start: null, end: null, stub_exempt: null, data_fields: {}, calc_fields: { bus_rating: 1600 }, annotation_ids: [],
    },
    {
      id: 'r-392', edge_type: 'R-2', designation: 'sec-bus-4MSB-1-A', sheet_id: 'S1', bus_level: 'secondary',
      stroke_weight: 2, start: null, end: null, stub_exempt: null, data_fields: {}, calc_fields: { bus_rating: 1600 }, annotation_ids: [],
    },
  ],

  annotations: [
    { id: 'a-601', annotation_type: 'A-2', bound_to: 'r-301', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: FEEDERS['16004'].callout } },
    { id: 'a-602', annotation_type: 'A-1', bound_to: 'r-302', bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: FEEDERS['2503'].tag } },
    { id: 'a-603', annotation_type: 'A-2', bound_to: 'r-302', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: FEEDERS['2503'].callout } },
    ...annotations,
  ],

  switchboards: [
    {
      id: 'sw-201',
      designation: '4MSB-1-A',
      variant: 'NP',
      bus_architecture: 'two-level',
      sheet_id: 'S1',
      data_fields: { rating: '1600A', voltage: '480Y/277V', wires: '4W, 3PH' },
      secondary_bus_overflow_ids: [],
      main_bus_id: 'r-391',
      secondary_bus_id: 'r-392',
      distribution_bus_id: null,
    },
  ],

  sections: [
    { id: 'sec-201', switchboard_id: 'sw-201', type: 'incoming', order: 1, nec_class: null, section_tag: 'SEC-1', device_ids: [] },
    { id: 'sec-202', switchboard_id: 'sw-201', type: 'metering', order: 2, nec_class: null, section_tag: 'SEC-2', device_ids: ['d-302'] },
    { id: 'sec-203', switchboard_id: 'sw-201', type: 'fire_pump', order: 3, nec_class: null, section_tag: 'SEC-3', device_ids: ['d-303'] },
    { id: 'sec-204', switchboard_id: 'sw-201', type: 'main_breaker', order: 4, nec_class: null, section_tag: 'SEC-4', device_ids: ['d-304'] },
    { id: 'sec-205', switchboard_id: 'sw-201', type: 'distribution', order: 5, nec_class: null, section_tag: 'SEC-5', device_ids: [...breakerIds, 'd-306'] },
  ],

  port_assignments: [
    // CB-FP taps main bus ahead of main breaker
    { id: 'pa-301', device_id: 'd-303', port: 'bus_out', bus_id: 'r-391' },
    // MAIN-GFP bridges main bus to secondary bus
    { id: 'pa-302', device_id: 'd-304', port: 'line_in', bus_id: 'r-391' },
    { id: 'pa-303', device_id: 'd-304', port: 'bus_out', bus_id: 'r-392' },
    // Distribution breakers tap secondary bus
    ...breakerIds.map((id, i) => ({ id: `pa-${304 + i}`, device_id: id, port: 'bus_out', bus_id: 'r-392' })),
  ],

  spur_attachments: [],

  measurement_attachments: [
    { id: 'meas-301', device_id: 'd-302', host_routed_element_id: 'r-391', mode: 'ct', position: 'incoming_section' },
  ],

  cross_sheet_refs: [],

  layout_config: { $comment: EMBED_COMMENT, ...LAYOUT_CONFIG },
};

/* ---------------------------------------------------------------------------
 * Write artifacts
 * ------------------------------------------------------------------------- */
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
