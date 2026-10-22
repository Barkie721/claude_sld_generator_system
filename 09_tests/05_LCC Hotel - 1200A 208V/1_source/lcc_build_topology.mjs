#!/usr/bin/env node
/**
 * lcc_build_topology.mjs — the ONLY hand-edited file in this project.
 *
 * LCC Hotel Works: 1200 A, 120/208 V 3PH 4W hotel switchgear, reverse-composed from
 * a red-lined snippet of an existing single line (2026-10-21). Names and links are
 * in 1_source/lcc_SLD_names_V1_0_0.md; every Tier-2 default / Tier-3 halt is in
 * 1_source/lcc_SLD_narrative_V1_0_0.md.
 *
 * Writes two files into 2_build/:
 *   lcc_layout_config.json        the sidecar (sidecar keys win at layout time)
 *   lcc_SLD_topology_V1_0_0.json  topology with an EMBEDDED copy of the same config
 *
 * Both copies are deliberate: CV-14's capability gate reads only the embedded
 * topology.layout_config (see svc3000_build_topology.mjs for the full story).
 *
 * ⚠️ TWO PANELS ARE DESIGNATED "P4" (owner's answer Q1). That breaks TI-3
 * (designation uniqueness) and the engine's designation-keyed layout lookups can
 * resolve either one. HALT-007 records it; nothing below is keyed on "P4".
 *
 * ID ranges follow svc3000: d-3xx / r-3xx / r-39x buses / a-6xx / sw-2xx /
 * sec-2xx / pa-3xx. Starting at d-001 trips golden-keyed special cases.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '2_build');
const SLUG = 'lcc';
const VOLTS = '208Y/120V';

/* ---------------------------------------------------------------------------
 * FEEDER SCHEDULE EXTRACT — verbatim 4-wire rows from
 * 07_data/normalized/feeder_schedule_V1_0_0.json. The owner's tag convention
 * (Q2) is exactly the schedule's: [amps][wires], so drawing tag 13 (90 A) → 904.
 * ------------------------------------------------------------------------- */
const FEEDER = {
  '90/4':   { tag: '904',   sets: 1, conduit: '1 1/4"', ph: { q: 4, size: '2',   mat: 'CU' }, g: { size: '8',   mat: 'CU' } },
  '100/4':  { tag: '1004',  sets: 1, conduit: '2"',     ph: { q: 4, size: '1/0', mat: 'AL' }, g: { size: '6',   mat: 'CU' } },
  '225/4':  { tag: '2254',  sets: 1, conduit: '3 1/2"', ph: { q: 4, size: '350', mat: 'AL' }, g: { size: '6',   mat: 'CU' } },
  '450/4':  { tag: '4504',  sets: 2, conduit: '3 1/2"', ph: { q: 4, size: '500', mat: 'AL' }, g: { size: '3',   mat: 'CU' } },
  '1600/4': { tag: '16004', sets: 6, conduit: '3 1/2"', ph: { q: 4, size: '500', mat: 'AL' }, g: { size: '350', mat: 'AL' } },
};

const isKcmil = (s) => /^\d+$/.test(s) && Number(s) >= 250;
const wsize = (s) => (isKcmil(s) ? s : `#${s}`);

/** Feeder spec from the schedule: calc_fields + A-1 tag text + A-2 callout text. */
function fspec(amps, wires = 4, { tSuffix = false, groundLabel = 'GND' } = {}) {
  const row = FEEDER[`${amps}/${wires}`];
  if (!row) throw new Error(`no feeder_schedule row for ${amps}A ${wires}-wire`);
  return {
    tag: tSuffix ? `${row.tag}T` : row.tag,
    callout:
      `${row.sets > 1 ? `(${row.sets}) ` : ''}${row.conduit}C - ` +
      `(${row.ph.q})${wsize(row.ph.size)} ${row.ph.mat} + ${wsize(row.g.size)} ${row.g.mat} ${groundLabel}`,
    calc: {
      conductor_material: row.ph.mat,
      conductor_size: row.ph.size,
      conductors_per_phase: row.ph.q,
      neutral_size: wires === 4 ? row.ph.size : null,
      ground_size: row.g.size,
      ground_material: row.g.mat,
      conduit_type: 'EMT',
      conduit_size: row.conduit,
      num_sets: row.sets,
    },
  };
}

/** HALT-003: the child's rating is not on the drawing, so the feeder is not sized. */
const HALT_SPEC = {
  tag: 'TBD',
  callout: 'COMPOSITOR_HALT HALT-003 - FEEDER TBD',
  calc: {},
};

/* ---------------------------------------------------------------------------
 * Collections + emit helpers.
 * ------------------------------------------------------------------------- */
const devices = [];
const routed = [];
const annotations = [];
const switchboards = [];
const sections = [];
const port_assignments = [];

let annSeq = 601;
let paSeq = 301;

const dev = (d) => (devices.push(d), d.id);

function annotate(type, boundTo, sheet, content) {
  const a = { id: `a-${annSeq++}`, annotation_type: type, bound_to: boundTo, bound_to_type: 'routed_element', sheet_id: sheet, content };
  annotations.push(a);
  return a.id;
}

function busTie(deviceId, port, busId) {
  port_assignments.push({ id: `pa-${paSeq++}`, device_id: deviceId, port, bus_id: busId });
}

/** One R-1 with its Tier-1 A-1 + A-2 pair (§2.4 non-negotiable). */
function feeder(id, sheet, start, end, spec, opts = {}) {
  const ids = [];
  routed.push({
    id,
    edge_type: 'R-1',
    designation: `F-${id.slice(2)}`,
    sheet_id: sheet,
    start,
    end,
    stub_exempt: false,
    data_fields: opts.data_fields || {},
    calc_fields: spec.calc,
    annotation_ids: ids,
  });
  if (!opts.noA1) ids.push(annotate('A-1', id, sheet, { tag_text: spec.tag }));
  ids.push(annotate('A-2', id, sheet, { callout_text: spec.callout }));
}

const panel = (id, desig, amps, opts = {}) =>
  dev({
    id,
    node_type: 'L2-4',
    designation: desig,
    sheet_id: 'S1',
    data_fields: { rating: amps ? `${amps}A` : null, voltage: opts.voltage || VOLTS, mlo: true },
  });

const breaker = (id, desig, amps) =>
  dev({ id, node_type: 'L2-1', designation: desig, sheet_id: 'S1', data_fields: { af: amps, at: amps, poles: 3, trip_type: 'LSI' } });

/* ===========================================================================
 * SOURCE + HOTEL SWITCHGEAR
 *
 * Owner correction 2026-10-21: the switchgear is fed from MPB1 through a 500 kVA
 * 480-208Y/120 V transformer, straight into the main breaker — no incoming or
 * metering section. That makes HOTEL SWITCHGEAR a SEPARATELY DERIVED SYSTEM, not
 * a service entrance (supersedes Q10): no utility meter here (metering lives at
 * the service), and the N-G bond below is the SDS system bonding jumper of NEC
 * 250.30(A)(1), not the 250.24(C) service bond. Drawn by engine OFF-033 (rev
 * 1.0.20), which needs exactly this shape: no incoming section, and an R-1 from an
 * L2-2 secondary_out into the L1-1 main's line_in.
 * ========================================================================= */

// T1: 500 kVA, 480 V primary (owner). The schedule's 500 kVA row
// (3_phase_transformer_feeder_schedule_V1_0_0.json, 480 V primary) gives primary
// OCPD 800 A / tag 8003 — that breaker is in MPB1, off this sheet — and secondary
// OCPD 1600 A / tag 16004T. HALT-001: %Z and X/R not given. 'T1' is an existing
// legend exact-match designation, so TI-4 does not grow.
dev({
  id: 'd-301',
  node_type: 'L2-2',
  designation: 'T1',
  sheet_id: 'S1',
  // fed_from: the off-sheet source. Engine OFF-033 draws it as the 'FROM MPB1'
  // squiggle on the primary stub. Not an A-3: CV-11 requires an A-3 to name a
  // designation in this composition, and MPB1 is not drawn here.
  data_fields: { kva: 500, config: '480Δ-208Y/120V', fed_from: 'MPB1' },
  calc_fields: { pct_z: null, x_over_r: null },
});

// NOTE-001: 230.95 does not apply at 120 V to ground — LSI, no G. L1-1 is the
// library's only main-breaker symbol; trip_type carries the distinction.
dev({
  id: 'd-303',
  node_type: 'L1-1',
  designation: 'MAIN',
  sheet_id: 'S1',
  data_fields: { af: 1200, at: 1200, poles: 3, trip_type: 'LSI' },
  calc_fields: { aic_required: null },
});

// No N-G bond symbol in the switchgear (owner 2026-10-21). This is a separately
// derived system, not a service, so the 250.24(C) service bond does not apply; the
// SDS system bonding jumper of NEC 250.30(A)(1) is located AT T1 (permitted at the
// source or the first disconnect, never both — 250.30(A)(1) Ex. 2). NOTE-007.

// Feeder breakers, left to right as drawn.
const SWGR = [
  { cb: 'CB-01', cbId: 'd-305', amps: 100, re: 'r-302' }, // UPS
  { cb: 'CB-02', cbId: 'd-306', amps: 450, re: 'r-303' }, // P1
  { cb: 'CB-03', cbId: 'd-307', amps: 450, re: 'r-304' }, // P2
  { cb: 'CB-04', cbId: 'd-308', amps: 225, re: 'r-305' }, // P1AA
  { cb: 'CB-05', cbId: 'd-309', amps: 450, re: 'r-306' }, // P3
  { cb: 'CB-06', cbId: 'd-310', amps: 450, re: 'r-307' }, // P4
];
for (const b of SWGR) breaker(b.cbId, b.cb, b.amps);

// T1 secondary -> main breaker line side. OWNER-SPECIFIED conductors (2026-10-21),
// verbatim callout: 4 sets of (3) 500 kcmil AL + (1) 350 kcmil AL reduced neutral +
// (1) 250 kcmil AL ground, 4" conduit each. 500 AL at 75 C = 310 A x 4 = 1240 A,
// which is sized to the 1200 A main, NOT to the schedule's 1600 A secondary OCPD —
// hence tag 12004T ([amps][wires]T, TV-3), not the schedule's 16004T. NOTE-008.
feeder('r-301', 'S1',
  { device_id: 'd-301', port: 'secondary_out' },
  { device_id: 'd-303', port: 'line_in' },
  {
    tag: '12004T',
    callout: '(4)4"C-(3)#500 KCM AL, (1)#350 KCM AL NEUTRAL & (1)#250 KCM AL GRD EACH',
    calc: {
      conductor_material: 'AL',
      conductor_size: '500',
      conductors_per_phase: 4,
      neutral_size: '350',
      ground_size: '250',
      ground_material: 'AL',
      conduit_type: 'EMT',
      conduit_size: '4"',
      num_sets: 4,
    },
  });

switchboards.push({
  id: 'sw-201',
  designation: 'HOTEL SWITCHGEAR',
  variant: 'NP',
  bus_architecture: 'two-level',
  sheet_id: 'S1',
  data_fields: { rating: '1200A', voltage: '120/208V', wires: '4W, 3PH' },
  secondary_bus_overflow_ids: [],
  main_bus_id: 'r-391',
  secondary_bus_id: 'r-392',
  distribution_bus_id: null,
});

sections.push(
  { id: 'sec-203', switchboard_id: 'sw-201', type: 'main_breaker', order: 1, nec_class: null, section_tag: 'SEC-1', device_ids: ['d-303'] },
  { id: 'sec-204', switchboard_id: 'sw-201', type: 'distribution', order: 2, nec_class: null, section_tag: 'SEC-2', device_ids: SWGR.map((b) => b.cbId) },
);

busTie('d-303', 'line_in', 'r-391');
busTie('d-303', 'bus_out', 'r-392');
for (const b of SWGR) busTie(b.cbId, 'bus_out', 'r-392');

routed.push(
  {
    id: 'r-391', edge_type: 'R-2', designation: 'main-bus-HOTEL-SWGR', sheet_id: 'S1',
    bus_level: 'main', stroke_weight: 2.5, start: null, end: null, stub_exempt: null,
    data_fields: {}, calc_fields: { bus_rating: 1200 }, annotation_ids: [],
  },
  {
    id: 'r-392', edge_type: 'R-2', designation: 'sec-bus-HOTEL-SWGR', sheet_id: 'S1',
    bus_level: 'secondary', stroke_weight: 2, start: null, end: null, stub_exempt: null,
    data_fields: {}, calc_fields: { bus_rating: 1200 }, annotation_ids: [],
  },
);

/* ===========================================================================
 * SWITCHGEAR FEEDERS (Chain A, plus the UPS as a terminal load)
 * ========================================================================= */

// NOTE-002: L2-10 (UPS) is a placeholder symbol with no Revit family, so the UPS
// is an L3-3 equipment connection. HALT-005: no UPS nameplate.
dev({ id: 'd-311', node_type: 'L3-3', designation: 'UPS', sheet_id: 'S1', data_fields: { hp: null, fla: null, voltage_phase: '208V-3PH' } });
feeder('r-302', 'S1', { device_id: 'd-305', port: 'line_in' }, { device_id: 'd-311', port: 'load_in' }, fspec(100));

/* ===========================================================================
 * PANELBOARDS — P1, P2, P1AA, P3, P4 (Chain A off the switchgear) and their
 * sub-fed panels (Chain G), all drawn with the L2-4 panelboard symbol, as on the
 * source drawing.
 *
 * ROWS. placeSubFeeds puts an un-anchored child at parentBotY + 120 — BELOW its
 * parent, i.e. down into the switchgear band (first render: 8 SH-3 collisions).
 * The fix is the OFF-009 floor band: level_map + floor_band_designations put each
 * sub-fed panel on a row ABOVE its parent (row 1 = switchgear-fed panels, row 2
 * = their children, row 3 = grandchildren), and placeSubFeeds honours that
 * anchor. level_order stays EMPTY, so no A-7 level lines are drawn: these rows
 * are drawing tiers, not building storeys.
 *
 * ⚠️ DEVICE ORDER IS LOAD-BEARING for the duplicate "P4" (owner D1). level_map is
 * keyed by DESIGNATION and the band pass resolves it with devices.find(), the
 * FIRST match. The upper P4 (d-330, row 2) is therefore emitted BEFORE the
 * switchgear-fed P4 (d-316), which takes the default row-1 chain-head Y anyway.
 * ========================================================================= */

// Row-2 / row-3 panels first (see the device-order warning above).
const SUBFEEDS = [
  // P2 → P4 (upper, Q1/D1 same name) → P4AA. Ratings not drawn — HALT-003.
  { parent: 'd-313', id: 'd-330', name: 'P4',     amps: null, re: 'r-320', row: '2' },
  { parent: 'd-330', id: 'd-331', name: 'P4AA',   amps: null, re: 'r-321', row: '3' },
  // P1 → seven 90 A panels, drawing tag 13 → 904. P1G is the red-line add.
  ...['P1A', 'P1B', 'P1C', 'P1D', 'P1E', 'P1F', 'P1G'].map((name, i) =>
    ({ parent: 'd-312', id: `d-${320 + i}`, name, amps: 90, re: `r-${310 + i}`, row: '2' })),
  // P1AA → P2A.
  { parent: 'd-314', id: 'd-332', name: 'P2A',    amps: null, re: 'r-322', row: '2' },
  // P3 → P3A, P3B (→ LIGHT., Q5), S1 single-phase. P4-8 deleted (Q4).
  { parent: 'd-315', id: 'd-333', name: 'P3A',    amps: null, re: 'r-323', row: '2' },
  { parent: 'd-315', id: 'd-334', name: 'P3B',    amps: null, re: 'r-324', row: '2' },
  { parent: 'd-334', id: 'd-335', name: 'LIGHT.', amps: null, re: 'r-325', row: '3' },
  { parent: 'd-315', id: 'd-336', name: 'S1',     amps: null, re: 'r-326', row: '2', voltage: '120/208V 1PH' },
  // P4 → P4A, P4B, drawing tag 14 → 1004.
  { parent: 'd-316', id: 'd-337', name: 'P4A',    amps: 100, re: 'r-327', row: '2' },
  { parent: 'd-316', id: 'd-338', name: 'P4B',    amps: 100, re: 'r-328', row: '2' },
];
for (const s of SUBFEEDS) panel(s.id, s.name, s.amps, { voltage: s.voltage });

// Row 1: the switchgear-fed panels, left to right as drawn.
const FIRST = [
  { cbId: 'd-306', id: 'd-312', name: 'P1',   amps: 450, re: 'r-303' },
  { cbId: 'd-307', id: 'd-313', name: 'P2',   amps: 450, re: 'r-304' },
  { cbId: 'd-308', id: 'd-314', name: 'P1AA', amps: 225, re: 'r-305' },
  { cbId: 'd-309', id: 'd-315', name: 'P3',   amps: 450, re: 'r-306' },
  { cbId: 'd-310', id: 'd-316', name: 'P4',   amps: 450, re: 'r-307' },
];
for (const p of FIRST) {
  panel(p.id, p.name, p.amps);
  feeder(p.re, 'S1', { device_id: p.cbId, port: 'line_in' }, { device_id: p.id, port: 'feed_top' }, fspec(p.amps));
}

// Sub-feeds rise from the parent's top into the child's bottom (the golden's
// riser form: child on a higher row, entered at feed_bottom).
for (const s of SUBFEEDS) {
  feeder(s.re, 'S1',
    { device_id: s.parent, port: 'feed_top' },
    { device_id: s.id, port: 'feed_bottom' },
    s.amps ? fspec(s.amps) : HALT_SPEC);
}
const LEVEL_ROWS = Object.fromEntries(SUBFEEDS.map((s) => [s.name, s.row]));

/* ---------------------------------------------------------------------------
 * layout_config. Every hospital-named key is CLEARED EXPLICITLY — absent keys
 * fall back to the engine's _DEF_* golden values.
 * ------------------------------------------------------------------------- */
const LAYOUT_CONFIG = {
  sheet_roles: { S1: 'normal' },
  sheet_skips: {},
  // Drawing tiers, not storeys (see PANELBOARDS above). level_order is EMPTY so
  // renderLevelLines draws nothing.
  floor_order: { S1: ['3', '2', '1'] },
  floor_anchors: {},
  floor_anchors_mechanical: {},
  level_map: LEVEL_ROWS,
  level_order: [],
  floor_band_designations: Object.keys(LEVEL_ROWS),
  ats_xoffset_overrides: {},
  // ⚠️ MUST EXCEED the deepest chain, and 1 places NOTHING beyond the first hop.
  // P2→P4→P4AA and P3→P3B→LIGHT. are two hops, so 3.
  subfeed_max_depth: 3,
  subfeed_start_ports: ['feed_bottom', 'feed_top'],
  subfeed_src_types: ['L2-4'],
  subfeed_dst_types: ['L2-4'],
  // P4 (upper) -> P4AA and P3B -> LIGHT. draw as ONE straight vertical: the child's
  // centre snaps to its parent's exit (owner 2026-10-21, "vertically aligned with
  // their upstream panel").
  subfeed_straighten: ['F-321', 'F-325'],
  s2_level_line_pitch: {},
  s2_shift_delta: {},
  // P1's SEVEN-PANEL FAN — the source drawing's comb: every feeder leaves P1's
  // top and runs out at its own height.
  //   exit pitch 8 px  -> the seven exits sit at -24..+24, inside the 64 px box
  //                       (default slot/(n+1) = 17.5 px put six of them outside it)
  //   jog lanes        -> outer panels jog LOWEST. A west run spans its child..exit;
  //                       the next-inner child's drop stands inside that span, so
  //                       the outer run must pass BELOW the inner run's jog or it cuts
  //                       the drop. Mirror image east. P1D is dead centre (no jog).
  // Measured before: collinear_h 6, exits_outside 6, tag_feeder_hard 6 (all P1).
  // ⚠️ Layout-tested alternative REJECTED: layout_hints.subfeed_gutter_parents.
  // Gutter mode assumes children BELOW the parent — with upward riser children it
  // drew the gutter under P1 and left all seven drops unconnected.
  // P3: the default 35 px pitch put its outer exits 3 px past the box edge.
  subfeed_exit_pitch: { P1: 8, P3: 20 },
  subfeed_midy_nudge: {
    'F-310': 0,    'F-316': 0,    // P1A / P1G — outermost, lowest lane
    'F-311': -50,  'F-315': -50,  // P1B / P1F
    'F-312': -100, 'F-314': -100, // P1C / P1E — innermost, highest lane
  },
  // Tags ride the vertical drop (OFF-025) rather than the jog. On the P1 comb a jog
  // pill sits across the next-inner panel's drop; on the straight hops (P1D, P3B,
  // P4A, P4B) the default pill landed on its own run at the jog row (tag_feeder 8).
  a1_long_run_midpoint: Object.fromEntries(
    ['F-310', 'F-311', 'F-312', 'F-313', 'F-314', 'F-315', 'F-316', 'F-324', 'F-327', 'F-328',
     // the two straightened risers: vertical-orient tag on the run (tick across it)
     'F-321', 'F-325'].map((f) => [f, 60])),
  // Row pitch. The 1200 px engine default is a hospital floor-to-floor; these are
  // drawing tiers with nothing between them but a sub-feed jog and its tag.
  riser_step_standard: 420,

  // COLUMNS. Breakers sit on a 160 px pitch but P1 fans seven children at 200 px
  // (centres 540..1740), so every other row-1 panel is moved EAST of that fan:
  //   P2   head 2040 (singleton child at head-100 = 1940)
  //   P1AA head 2240 (child 2140)
  //   P3   head 2540 (children 2340 / 2540 / 2740)
  //   P4   head 3040 (children 2940 / 3140)
  // P1 stays on its breaker. Jog rows step DOWN west→east (CB-03 highest): a
  // west breaker's run must sit above every east breaker's riser it passes, or
  // it cuts them (the nesting rule the sub-lineup render measured at 6 crossings).
  chain_dst_x_offset: {
    'F-304': { dx: 740,  jog_y: 4300 }, // P2
    'F-305': { dx: 780,  jog_y: 4340 }, // P1AA
    'F-306': { dx: 920,  jog_y: 4380 }, // P3
    'F-307': { dx: 1260, jog_y: 4420 }, // P4
  },
  // TAG ROWS (owner, 2026-10-21: "make sure they are aligned").
  //   P1A-P1G: OFF-025 puts each pill at its drop's midpoint, and the staggered
  //            jog lanes make the drops 0/25/50 px different, so the pills sat at
  //            y 3947 / 3922 / 3897. dy slides the inner four DOWN their own drop
  //            to 3947 — along the run, so the tick stays on it (FL-0008).
  //   P2/P1AA/P3/P4: the pill sat on the short upper riser (jog -> panel, y
  //            4273..4333). dx/dy carry it back onto the feeder's breaker riser
  //            at y 4466, the row the UPS (F-302) and P1 (F-303) tags sit on. Same
  //            run, so the tick is still on its own feeder.
  // T1 secondary (F-301): the owner's conductor callout is drawn in place of the
  // 12004T pill (owner 2026-10-21, "change the feeder tag to call out"). Engine
  // OFF-034, rev 1.0.22. The A-1 stays in the topology, so TV-1 still holds.
  a2_callout_feeders: ['F-301'],

  a1_tag_placement: {
    'F-311': { dy: 25 }, 'F-315': { dy: 25 },
    'F-312': { dy: 50 }, 'F-314': { dy: 50 },
    'F-304': { side: 'right', dx: -740,  dy: 192.63 },
    'F-305': { side: 'right', dx: -780,  dy: 172.63 },
    'F-306': { side: 'right', dx: -920,  dy: 152.63 },
    'F-307': { side: 'right', dx: -1260, dy: 132.63 },
  },
  a3_text_placement: {},
  fc_pennant_placement: {},
  fc_pennant_y_nudges: {},
};

const SIDECAR_COMMENT =
  'Sidecar layout_config for LCC Hotel Works. Every hospital-golden default is explicitly cleared; ' +
  'no storeys were stated, so no level lines.';
const EMBED_COMMENT =
  'Embedded copy of lcc_layout_config.json so validator rule CV-14 runs. Sidecar keys still win at layout time.';

/* ---------------------------------------------------------------------------
 * Tier-3 halts (five keys — make_open_items.mjs renders topic + blocks).
 * ------------------------------------------------------------------------- */
const HALTS = [
  {
    id: 'HALT-001',
    topic: 'T1 impedance (%Z, X/R) and the MPB1 primary breaker',
    text:
      'COMPOSITOR_HALT: T1 (500 kVA, 480-208Y/120 V, fed from MPB1) has no stated %Z or X/R; they are ' +
      'left null and no transformer_impedance lookup was performed. Its primary OCPD is in MPB1, off this ' +
      'sheet: the schedule row gives 800 A / tag 8003, unconfirmed. Affects d-301, r-301.',
    nec_reference: 'NEC 450.3(B)',
    blocks: 'Fault-current study · T1 primary protection',
  },
  {
    id: 'HALT-002',
    topic: 'Available fault current',
    text:
      'COMPOSITOR_HALT: available fault current not provided. No A-4 tags; switchgear and panel AIC ' +
      'ratings unset. Affects sw-201, d-303, r-391, r-392 and every panel.',
    nec_reference: 'NEC 110.9 / 110.24',
    blocks: 'A-4 tags · AIC ratings · bus bracing',
  },
  {
    id: 'HALT-003',
    topic: 'Ratings and feeders for P4 (upper), P4AA, P2A, P3A, P3B, LIGHT., S1',
    text:
      'COMPOSITOR_HALT: the source drawing shows no rating for these seven panels (drawing tags 16-20), ' +
      'so their feeders carry tag TBD and no conductor sizing. Owner chose to halt rather than default ' +
      '(Q9). Affects d-330..d-336, r-320..r-326.',
    nec_reference: 'NEC 215.2 / 215.3',
    blocks: 'Feeder tags + conduit callouts for seven feeders · panel ratings',
  },
  {
    id: 'HALT-004',
    topic: 'S1 single-phase feeder configuration',
    text:
      'COMPOSITOR_HALT: S1 is single-phase (red-line "1PH"). feeder_schedule_V1_0_0.json carries only ' +
      '3-phase 3-wire and 4-wire rows (DATA_LOOKUP_MISS), so even with a rating no row applies. EOR to ' +
      'give the 1-phase 3-wire conductor set. Affects d-336, r-326.',
    nec_reference: 'NEC 215.2',
    blocks: 'S1 feeder sizing',
  },
  {
    id: 'HALT-005',
    topic: 'UPS rating and downstream',
    text:
      'COMPOSITOR_HALT: the UPS has a 100 A input breaker but no kVA, input/output voltage, bypass ' +
      'arrangement or downstream distribution on the snippet. Affects d-311.',
    nec_reference: 'NEC 645 / 708 (if applicable)',
    blocks: 'UPS nameplate · output distribution',
  },
  {
    id: 'HALT-006',
    topic: 'Feeder distances',
    text: 'COMPOSITOR_HALT: feeder distances not provided; no voltage-drop calculation, no A-5 tags. Affects every R-1.',
    nec_reference: 'NEC 210.19(A) IN / 215.2(A)(1) IN',
    blocks: 'Voltage-drop calculation',
  },
  {
    id: 'HALT-007',
    topic: 'Two panels designated P4',
    text:
      'COMPOSITOR_HALT: per owner Q1 both d-316 (450 A, off CB-06) and d-330 (fed from P2) keep the ' +
      'designation P4, as on the source drawing. This violates TI-3 designation uniqueness and makes ' +
      'panel schedules, Revit circuiting and field labelling ambiguous (NEC 408.4(B) source ' +
      'identification). Owner re-confirmed keeping both (D1, 2026-10-21) knowing the project stays a ' +
      'preview: run_pipeline.sh stops at stage 2 on this error. EOR to rename one before construction.',
    nec_reference: 'NEC 408.4(B)',
    blocks: 'TI-3 · panel schedules · Revit electrical-system naming',
  },
  {
    id: 'HALT-008',
    topic: 'Legacy designations outside the office designation legend',
    text:
      'COMPOSITOR_HALT: 19 designations carried over from the existing drawing (HOTEL SWITCHGEAR, P1, P2, P3, ' +
      'P1AA, P1A-P1G, P4AA, P2A, P3A, P3B, LIGHT., S1, P4A, P4B) do not match the ' +
      '[PowerType][Voltage][Equipment]-[Level]-[Identifier] grammar, so TI-4 errors. Owner chose to leave ' +
      'equipment_designation_legend_V1_0_0.json unchanged (D2, 2026-10-21) and keep the names. Resolve by ' +
      'renaming to the office pattern or by a later legend decision.',
    nec_reference: null,
    blocks: 'TI-4 · run_pipeline.sh stage 2',
  },
];

const NOTES = [
  {
    id: 'NOTE-001',
    topic: 'No GFP on the 1200 A main',
    text:
      'HOTEL SWITCHGEAR is a separately derived system fed from MPB1 through T1, not a service, and in any case ' +
      'NEC 230.95 applies to solidly grounded wye services of more than 150 V to ground. 208Y/120 V is 120 V ' +
      'to ground, so it does not apply; the main is LSI. The L1-1 symbol is the library main-breaker glyph.',
    nec_reference: 'NEC 230.95',
  },
  {
    id: 'NOTE-002',
    topic: 'UPS drawn as an L3-3 equipment connection',
    text: 'L2-10 (UPS) is a placeholder symbol with no Revit family, so the UPS is an L3-3 terminal load.',
    nec_reference: null,
  },
  {
    id: 'NOTE-003',
    topic: 'Panel construction',
    text: 'All panels MLO; panels without a drawn rating carry a null rating (HALT-003).',
    nec_reference: null,
  },
  {
    id: 'NOTE-004',
    topic: '1200 A main below transformer FLA',
    text:
      '500 kVA at 208 V 3PH is 1388 A FLA; the schedule secondary OCPD is 1600 A, but the owner sized the ' +
      'secondary conductors to the 1200 A main (12004T, NOTE-008). The 1200 A main limits T1 to about 432 kVA. Consistent ' +
      'with the source drawing; recorded so it is not read as an error.',
    nec_reference: 'NEC 240.21(C) / 450.3(B)',
  },
  {
    id: 'NOTE-005',
    topic: 'Drawing tags mapped to office feeder-schedule tags',
    text:
      'Owner Q2: drawing keynotes 4/5/13/14/15 become schedule tags 4504/2254/904/1004/1004 ' +
      '([amps][wires], 4-wire rows of feeder_schedule_V1_0_0.json).',
    nec_reference: null,
  },
  {
    id: 'NOTE-008',
    topic: 'T1 secondary conductors are owner-specified',
    text:
      'Owner callout: (4)4"C-(3)#500 KCM AL, (1)#350 KCM AL NEUTRAL & (1)#250 KCM AL GRD EACH. Phase ampacity ' +
      '4 x 310 A (500 kcmil AL, 75 C, NEC 310.16) = 1240 A >= the 1200 A main that protects them (NEC 240.21(C)). ' +
      'Tag 12004T. This replaces the transformer schedule row (1600 A secondary OCPD, 16004T), which sizes for ' +
      'full T1 capacity. The 350 kcmil neutral is reduced (NEC 220.61, EOR to confirm against nonlinear load). ' +
      'The 250 kcmil AL per raceway exceeds the 3/0 AL supply-side bonding jumper NEC Table 250.102(C)(1) needs ' +
      'for 500 kcmil AL per set (250.102(C)(2)).',
    nec_reference: 'NEC 240.21(C) / 310.16 / 250.102(C)',
  },
  {
    id: 'NOTE-007',
    topic: 'System bonding jumper located at T1, not in the switchgear',
    text:
      'HOTEL SWITCHGEAR is a separately derived system fed from MPB1 through T1. The owner removed the N-G bond ' +
      'symbol from the switchgear; the system bonding jumper is therefore taken at T1 (NEC 250.30(A)(1) permits ' +
      'the source or the first disconnecting means, and Ex. 2 forbids both). The schedule row gives bonding jumper ' +
      '#1/0 and GEC #3/0 (250.30(A)(5)). The neutral is isolated from ground in the switchgear. EOR to confirm.',
    nec_reference: 'NEC 250.30(A)(1)',
  },
  {
    id: 'NOTE-006',
    topic: 'Panel tiers drawn on banded rows (not building levels)',
    text:
      'All panels use the L2-4 panelboard symbol, as on the source drawing. Sub-fed panels sit on rows above ' +
      'their parent via level_map + floor_band_designations (row 1 switchgear-fed, row 2 their children, row 3 ' +
      'P4AA / LIGHT.). These rows are drawing tiers, not storeys: level_order is empty, so no level lines are ' +
      'drawn. P2, P1AA, P3 and P4 are shifted east of the P1 fan with chain_dst_x_offset Z-jogs.',
    nec_reference: null,
  },
];

/* --------------------------------------------------------------------------- */

const topology = {
  $schema: 'sld_topology/v1',
  metadata: {
    schema_version: '1.0.0',
    project_name: 'LCC Hotel Works',
    created_date: '2026-10-21',
    slug: SLUG,
    heading: 'LCC Hotel Works',
    facts: [
      'Fed from MPB1 via T1, 500 kVA 480-208Y/120V; 1200 A hotel switchgear',
      'Six feeders: UPS, P1, P2, P1AA, P3, P4',
      'Recreated from a red-lined existing single line',
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
      equipment_designation_legend: 'V1_0_0',
      nec_standard_ratings: 'V1_0_0',
    },
    compositor_halts: HALTS,
    compositor_notes: NOTES,
  },
  sheets: [{ sheet_id: 'S1', sheet_number: 'E-501', title: 'SINGLE-LINE DIAGRAM — LCC HOTEL WORKS' }],
  devices,
  routed_elements: routed,
  annotations,
  switchboards,
  sections,
  port_assignments,
  spur_attachments: [],
  measurement_attachments: [], // no utility meter: not a service (see SOURCE above)
  cross_sheet_refs: [],
  layout_config: { $comment: EMBED_COMMENT, ...LAYOUT_CONFIG },
};

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
