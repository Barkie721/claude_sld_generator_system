#!/usr/bin/env node
/**
 * mob_build_topology.mjs — the ONLY hand-edited file in this project.
 *
 * Medical Office Building: 5 storeys, 4000 A 480Y/277V service, 14 switchboard
 * breakers, NEC 700 "Emergency" (life-safety only) system on a 100 kW generator.
 * The design brief 5_docs/design_brief.md is the contract — every equipment tag,
 * rating, chain variant and bus order below is taken from it. Every departure
 * the engine or validator forced is listed in that brief's §9 and in
 * metadata.compositor_notes[] (NOTE-0xx "Deviation from brief").
 *
 * Writes two files into 2_build/:
 *   mob_layout_config.json        the sidecar (sidecar keys win at layout time)
 *   mob_SLD_topology_V1_0_0.json  topology with an EMBEDDED copy of the same config
 * Both copies are deliberate: CV-14's capability gate reads only
 * topology.layout_config.subfeed_start_ports and cannot see a sidecar.
 *
 * Every conductor value is a row of 07_data/normalized/feeder_schedule_V1_0_0.json
 * or 3_phase_transformer_feeder_schedule_V1_0_0.json, looked up at build time — a
 * missing row throws DATA_LOOKUP_MISS rather than being guessed.
 *
 * ID ranges are rebased off the hospital golden (schema §16): d-3xx / r-3xx /
 * r-39x buses / a-6xx+ / sw-2xx / sec-2xx / pa-3xx / meas-3xx / cs-3xx.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '2_build');
const REPO = path.resolve(HERE, '..', '..', '..');
const SLUG = 'mob';

const readData = (n) => JSON.parse(fs.readFileSync(path.join(REPO, '07_data', 'normalized', `${n}_V1_0_0.json`), 'utf8'));
const SCHED = readData('feeder_schedule').configurations.flatMap((c) => c.feeders);
const TX_SCHED = readData('3_phase_transformer_feeder_schedule').transformers;
const TX_Z = readData('transformer_impedance').transformers;

/* ---------------------------------------------------------------------------
 * Schedule lookups. `tag` is a feeder_schedule tag; a trailing T marks a
 * transformer secondary (same row, SBJ in place of the EGC).
 * ------------------------------------------------------------------------- */
const awg = (s) => (/^\d+$/.test(s) && Number(s) >= 250 ? s : `#${s}`);
function conductor(tag) {
  const secondary = tag.endsWith('T');
  const base = secondary ? tag.slice(0, -1) : tag;
  const row = SCHED.find((f) => f.tag === base);
  if (!row) throw new Error(`DATA_LOOKUP_MISS: feeder_schedule tag ${base}`);
  const pc = row.phase_conductors, g = row.ground_conductor;
  let gSize = g.size, gMat = g.material, gWord = 'GND';
  if (secondary) {
    const tx = TX_SCHED.find((t) => t.secondary.one_line_tag === tag);
    if (!tx) throw new Error(`DATA_LOOKUP_MISS: transformer secondary ${tag}`);
    gSize = tx.bonding_jumper.replace(/^#/, '').replace(' AWG', '');
    gMat = 'CU';
    gWord = 'SBJ';
  }
  const sets = row.number_of_sets > 1 ? `(${row.number_of_sets}) ` : '';
  const callout = `${sets}${row.conduit_size_min}C - (${pc.quantity})${awg(pc.size)} ${pc.material} + ${awg(gSize)} ${gMat} ${gWord}`;
  const calc = {
    conductor_material: pc.material,
    conductor_size: pc.size,
    conductors_per_phase: pc.quantity,
    neutral_size: pc.quantity === 4 ? pc.size : null,
    ground_size: gSize,
    ground_material: gMat,
    conduit_type: 'EMT',
    conduit_size: row.conduit_size_min,
    num_sets: row.number_of_sets,
  };
  return { calc, callout };
}
function txRow(kva) {
  const row = TX_SCHED.find((t) => t.kva === kva);
  const z = TX_Z.find((t) => t.kva === kva);
  if (!row || !z) throw new Error(`DATA_LOOKUP_MISS: transformer ${kva} kVA`);
  return { row, z };
}

/* ---------------------------------------------------------------------------
 * Collections + helpers
 * ------------------------------------------------------------------------- */
const devices = [];
const routed = [];
const annotations = [];
const crossRefs = [];
const portAssignments = [];
const straighten = [];
const tagPlacement = {};
const levelMap = {};
const bandDesigs = [];
const xfmrBand = [];   // OFF-035 xfmr_floor_band (engine rev 1.0.23)

let dN = 305, aN = 601, rN = 302, paN = 303;
const nextD = () => `d-${dN++}`;
const nextA = () => `a-${aN++}`;
const byDesig = {};

function dev(node_type, designation, sheet, data_fields, calc_fields) {
  const d = { id: nextD(), node_type, designation, sheet_id: sheet, data_fields };
  if (calc_fields) d.calc_fields = calc_fields;
  devices.push(d);
  byDesig[designation] = d;
  return d;
}
const cb = (desig, sheet, af, at, trip, extra = {}) =>
  dev('L2-1', desig, sheet, { af, at, poles: 3, trip_type: trip, ...extra });
const panel = (desig, sheet, rating, voltage, main) =>
  dev('L2-4', desig, sheet, { rating, voltage, [main]: true });
const xfmr = (desig, sheet, kva) => {
  const { z } = txRow(kva);
  return dev('L2-2', desig, sheet, { kva, config: '480Δ-208Y/120V' }, { pct_z: z.percent_z.midpoint, x_over_r: z.x_over_r.midpoint });
};

// A Tier-1 feeder: R-1 plus its A-1 tag and A-2 callout. Returns the designation.
function feeder(sheet, from, fport, to, tport, tag, { tagText = tag, side = 'right' } = {}) {
  const { calc, callout } = conductor(tag);
  const n = rN++;
  const id = `r-${n}`;
  const desig = `F-${n}`;
  const a1 = nextA();
  const a2 = nextA();
  routed.push({
    id, edge_type: 'R-1', designation: desig, sheet_id: sheet,
    start: { device_id: from.id, port: fport },
    end: { device_id: to.id, port: tport },
    stub_exempt: false, data_fields: {}, calc_fields: calc,
    annotation_ids: [a1, a2],
  });
  annotations.push(
    { id: a1, annotation_type: 'A-1', bound_to: id, bound_to_type: 'routed_element', sheet_id: sheet, content: { tag_text: tagText } },
    { id: a2, annotation_type: 'A-2', bound_to: id, bound_to_type: 'routed_element', sheet_id: sheet, content: { callout_text: callout } },
  );
  if (side) tagPlacement[desig] = { side };
  return desig;
}

// Cross-sheet ATS normal feed: full-spec S1 segment + stub-exempt S2 alias with
// identical endpoints (hospital dialect), A-3 squiggle on both.
function crossFeeder(from, ats, tag) {
  const { calc, callout } = conductor(tag);
  const n = rN++;
  const s1 = `r-${n}-s1`, s2 = `r-${n}-s2`;
  const [a1, a2, q1, q2] = [nextA(), nextA(), nextA(), nextA()];
  const ends = { start: { device_id: from.id, port: 'line_in' }, end: { device_id: ats.id, port: 'source1_in' } };
  routed.push(
    { id: s1, edge_type: 'R-1', designation: `F-${n}.S1`, sheet_id: 'S1', ...ends, stub_exempt: false, data_fields: {}, calc_fields: calc, annotation_ids: [a1, a2, q1] },
    { id: s2, edge_type: 'R-1', designation: `F-${n}.S2`, sheet_id: 'S2', ...ends, stub_exempt: true, data_fields: {}, calc_fields: {}, annotation_ids: [q2] },
  );
  annotations.push(
    { id: a1, annotation_type: 'A-1', bound_to: s1, bound_to_type: 'routed_element', sheet_id: 'S1', content: { tag_text: tag } },
    { id: a2, annotation_type: 'A-2', bound_to: s1, bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: callout } },
    { id: q1, annotation_type: 'A-3', bound_to: s1, bound_to_type: 'routed_element', sheet_id: 'S1', designation: `SQ-F-${n}-1`, content: { text: `TO ${ats.designation}`, direction: 'to', destination_designation: ats.designation } },
    { id: q2, annotation_type: 'A-3', bound_to: s2, bound_to_type: 'routed_element', sheet_id: 'S2', designation: `SQ-F-${n}-2`, content: { text: 'FROM 4MSB-1-A', direction: 'from', destination_designation: '4MSB-1-A' } },
  );
  crossRefs.push({ id: `cs-${n}`, kind: 'feeder', source_sheet: 'S1', dest_sheet: 'S2', source_routed_element_id: s1, dest_routed_element_id: s2 });
}

const band = (desig, floor) => {
  levelMap[desig] = floor;
  bandDesigs.push(desig);
};

/* ---------------------------------------------------------------------------
 * S1 — 4MSB-1-A distribution, bus order exactly as design brief §3.
 * Transformer columns (CB-03/05/07/10/13) are separated by non-transformer
 * columns: adjacent Chain-B columns put one label block inside the
 * neighbour's glyph extent (default 2500 kVA R-007).
 * ------------------------------------------------------------------------- */
const breakers = [];
const B = (desig, af, at, trip = 'LSI') => {
  const d = cb(desig, 'S1', af, at, trip);
  breakers.push(d);
  return d;
};

// CB-01 — SPD-1, Mode A (Chain E).
{
  const c = B('CB-01', 30, 30);
  const spd = dev('L2-6', 'SPD-1', 'S1', { type: 'Type 1', mode: 'A' });
  feeder('S1', c, 'line_in', spd, 'line_in', '304');
}

// Chain A, single panel (optionally with an upper-floor sub-feed, Chain G).
function chainA(cbDesig, af, at, tag, head, headRating, floor, sub) {
  const c = B(cbDesig, af, at);
  const p = panel(head, 'S1', headRating, '480Y/277V', 'mlo');
  feeder('S1', c, 'line_in', p, 'feed_top', tag);
  if (floor) band(head, floor);
  if (sub) {
    const p2 = panel(sub.desig, 'S1', sub.rating, '480Y/277V', 'mlo');
    straighten.push(feeder('S1', p, 'feed_top', p2, 'feed_bottom', sub.tag));
    band(sub.desig, sub.floor);
  }
}

// Chain B, transformer + MCB panel (optionally with a 208 V sub-feed, Chain G).
// Level 1: the engine's default Chain-B row just above the switchboard; only the
// secondary panel is level-mapped (as before).
// Upper floor (R-004): the transformer goes in `xfmr_floor_band` (OFF-035, engine
// rev 1.0.23), which lifts the transformer and its secondary panel rigidly onto
// the floor's datum (transformer bottom on the row a Chain-A panel stands on);
// both are level-mapped so the level checks see them. NOT in
// floor_band_designations: that key anchors Chain-A heads and sub-feed children.
// Site ('S') stays on the default row: the floor stack has no Site row (NOTE-012).
function chainB(cbDesig, kva, tx, sec, floor, sub) {
  const { row } = txRow(kva);
  const at = row.primary.ocpd.rating_a;
  const c = B(cbDesig, at <= 250 ? 250 : 400, at);
  const t = xfmr(tx, 'S1', kva);
  const p = panel(sec, 'S1', `${row.secondary.ocpd.rating_a}A`, '208Y/120V', 'mcb');
  feeder('S1', c, 'line_in', t, 'primary_in', row.primary.one_line_tag);
  feeder('S1', t, 'secondary_out', p, 'feed_top', row.secondary.one_line_tag);
  if (floor === '1') band(sec, '1');
  else if (floor && floor !== 'S') {
    xfmrBand.push(tx);
    levelMap[tx] = floor;
    levelMap[sec] = floor;
  }
  if (sub) {
    const p2 = panel(sub.desig, 'S1', sub.rating, '208Y/120V', 'mlo');
    const f = feeder('S1', p, 'feed_top', p2, 'feed_bottom', sub.tag);
    straighten.push(f);
    band(sub.desig, sub.floor);
    // R-004: on a lifted chain the sub-feed hop to the floor above is short and
    // the next level line crosses it; its default tag attach (5 px above that
    // line) put the A-1 pill ON the line. Slide the whole tag 45 px down ALONG
    // its own feeder, into the gap between the line and the secondary panel top.
    if (xfmrBand.includes(tx)) tagPlacement[f] = { ...(tagPlacement[f] || {}), dy: 45 };
  }
}

chainA('CB-02', 250, 225, '2254', '4L-1-A', '225A', '1', { desig: '4L-2-A', rating: '100A', tag: '1004', floor: '2' });
chainB('CB-03', 150, '4T-1-A', '2P-1-A', '1', { desig: '2P-2-A', rating: '225A', tag: '2254', floor: '2' });
chainA('CB-04', 250, 225, '2254', '4L-3-A', '225A', '3', { desig: '4L-4-A', rating: '100A', tag: '1004', floor: '4' });
chainB('CB-05', 150, '4T-3-A', '2P-3-A', '3', { desig: '2P-4-A', rating: '225A', tag: '2254', floor: '4' });
chainA('CB-06', 100, 100, '1004', '4L-5-A', '100A', '5');
chainB('CB-07', 112.5, '4T-5-A', '2P-5-A', '5');
chainA('CB-08', 600, 600, '6004', '4M-5-A', '600A', '5');
chainA('CB-09', 400, 400, '4004', '4M-1-A', '400A', '1');
chainB('CB-10', 75, '4T-1-B', '2K-1-A', '1');
// CB-11 — imaging. Brief: Chain F through fused disconnect DS-IMG. The engine has
// no L2-5 renderer (BOX entry only), so DS-IMG is not drawn and 4S-1-A is fed
// directly (Chain A) — brief §9, NOTE-011.
chainA('CB-11', 400, 400, '4004', '4S-1-A', '400A', '1');
// CB-12 — EV DC fast charging, site. No level band: the engine's floor stack
// starts at the switchboard row, so a Site row cannot sit below Level 1 (NOTE-012).
chainA('CB-12', 600, 600, '6004', '4S-S-A', '600A', null);
chainB('CB-13', 112.5, '4T-S-A', '2P-S-A', 'S');
// CB-14 — emergency normal feed to E4A-1-A source 1 (Chain C, cross-sheet).
const cb14 = B('CB-14', 250, 200);

/* ---------------------------------------------------------------------------
 * S2 — NEC 700 Emergency. Brief-preferred topology (GEN-1 straight to the ATS
 * emergency input) cannot be drawn: the engine's emergency-sheet placer
 * positions the generator and ATS row off an emergency switchboard lineup and
 * has nothing to anchor to without one. Brief fallback applied: E4MDP-1-A
 * (400 A, ECB-01 175 A) between GEN-1 and the ATS (NOTE-010, brief §9).
 * ------------------------------------------------------------------------- */
const gen = dev('L1-5', 'GEN-1', 'S2', {
  kw: 100, kva: 125, voltage: '480Y/277V', phases: 3, wires: 4,
  nfpa_level: 'NFPA 110 Level 1 / Type 10', af: 250, at: 175, trip_type: 'LSI',
});
const emMain = dev('L1-1', 'EMDP-MAIN', 'S2', { af: 250, at: 175, poles: 3, trip_type: 'LSI' });
const ecb01 = cb('ECB-01', 'S2', 250, 175, 'LSI', { nec_class: '700' });
const ats = dev('L2-3', 'E4A-1-A', 'S2', { continuous_rating: 225, poles: 3, nec_class: '700' });
const e4p = panel('E4P-1-A', 'S2', '225A', '480Y/277V', 'mlo');
const e4l3 = panel('E4L-3-A', 'S2', '100A', '480Y/277V', 'mlo');
const e4l5 = panel('E4L-5-A', 'S2', '100A', '480Y/277V', 'mlo');
const e4pCb = cb('E4P-1-A-CB', 'S2', 100, 50, 'TM', { internal_to: 'E4P-1-A' });
const e4t = xfmr('E4T-1-A', 'S2', 30);
const e2p = panel('E2P-1-A', 'S2', '100A', '208Y/120V', 'mcb');

crossFeeder(cb14, ats, '2004');

// Generator feeder -> E4MDP-1-A main bus (Tier-3, HALT-004). Sized to the 175 A
// integral breaker on schedule row 1754; A-1 carries 'GEN'.
feeder('S2', gen, 'gen_out', { id: 'r-393' }, 'bus_tap_bi', '1754', { tagText: 'GEN', side: null });
feeder('S2', ecb01, 'line_in', ats, 'source2_in', '1754');
feeder('S2', ats, 'load_out', e4p, 'feed_top', '2254');
const subE3 = feeder('S2', e4p, 'feed_top', e4l3, 'feed_bottom', '1004');
const subE5 = feeder('S2', e4l3, 'feed_top', e4l5, 'feed_bottom', '1004');
{
  const { row } = txRow(30);
  feeder('S2', e4pCb, 'line_in', e4t, 'primary_in', row.primary.one_line_tag);
  feeder('S2', e4t, 'secondary_out', e2p, 'feed_top', row.secondary.one_line_tag);
}
straighten.push(subE3, subE5);
levelMap['E4P-1-A'] = '1';
levelMap['E4L-3-A'] = '3';
levelMap['E4L-5-A'] = '5';

/* ---------------------------------------------------------------------------
 * Buses — the r-39x band is kept clear of the feeder allocator (SCHEMA-8).
 * ------------------------------------------------------------------------- */
const bus = (id, desig, sheet, level, rating) => ({
  id, edge_type: 'R-2', designation: desig, sheet_id: sheet,
  bus_level: level, stroke_weight: level === 'main' ? 2.5 : 2,
  start: null, end: null, stub_exempt: null, data_fields: {},
  calc_fields: { bus_rating: rating }, annotation_ids: [],
});

// Service lateral, TV-1-exempt: carries the A-2 alone.
const svc = conductor('40004');
const svcA = 'a-600';
const serviceLateral = {
  id: 'r-301', edge_type: 'R-1', designation: 'F-301', sheet_id: 'S1',
  start: { device_id: 'd-301', port: 'secondary_out' },
  end: { device_id: 'd-303', port: 'line_in' },
  stub_exempt: false, data_fields: { is_service_entrance: true },
  calc_fields: svc.calc, annotation_ids: [svcA],
};

/* ---------------------------------------------------------------------------
 * layout_config — every hospital-named key CLEARED EXPLICITLY. Absent keys fall
 * back to the engine's _DEF_* golden values (sheet_skips would silently drop
 * any S2 tag containing -2-/-3-; ats_xoffset_overrides names E4A-1-A).
 * ------------------------------------------------------------------------- */
const LAYOUT_CONFIG = {
  sheet_roles: { S1: 'normal', S2: 'emergency' },
  sheet_skips: {},
  // Object form, index 0 = top. The flat array falls back to the hospital stack.
  floor_order: { S1: ['5', '4', '3', '2', '1'], S2: ['5', '3', '1'] },
  floor_anchors: {},
  floor_anchors_mechanical: {},
  floor_band_designations: bandDesigs,
  // OFF-035 (R-004): 4T-3-A -> L3, 4T-5-A -> L5, with their secondary panels.
  xfmr_floor_band: xfmrBand,
  level_map: levelMap,
  level_order: ['5', '4', '3', '2', '1'],
  ats_xoffset_overrides: {},
  riser_step_standard: 650,
  riser_step_roof: 650,
  subfeed_max_depth: 3,
  subfeed_start_ports: ['feed_bottom', 'feed_top'],
  subfeed_src_types: ['L2-4'],
  subfeed_dst_types: ['L2-4'],
  ats_extent_subfeed_ports: ['feed_bottom', 'feed_top'],
  subfeed_straighten: straighten,
  // OFF-018: cancel the -20 occupied-edge shift on E4P-1-A's riser so it does not
  // run collinear with the internal-chain exit at -20 (F-330).
  subfeed_exit_x_nudge: { [subE3]: 20 },
  internal_chain_exit_nudge: { 'E4P-1-A': -20 },
  chain_column_nudge: { 'E2P-1-A': -220 },
  chain_dst_x_offset: {},
  empty_floor_level_lines: [],
  // S2 fixed-pitch stack (emergency sheet). Measured on run 2: L1 line 4840
  // (below E4MDP-1-A), E2P-1-A top 2251, E4P-1-A bottom 3212 -> child base 3332.
  // L3 line 2150 clears E2P-1-A by 100 px; L5 line 900 above it. Shift delta
  // = target anchor - (base - cumulative pitch): E4L-3-A 1882 -> 1240; E4L-5-A
  // 982 -> 1240. Both land 180 px above their own line (golden grade).
  // S2 floor_order omits floors 2/4 on purpose: the sub-feed lift walks every
  // floor in the stack while the line pass skips empty ones.
  s2_level_line_pitch: { '3': 2690, '5': 900 },
  s2_shift_delta: { '3': 1240, '5': 1240 },
  subfeed_midy_nudge: {},
  a1_tag_placement: tagPlacement,
  a3_text_placement: {},
  fc_pennant_placement: {},
  fc_pennant_y_nudges: {},
};

const SIDECAR_COMMENT =
  'Sidecar layout_config for the Medical Office Building (4000 A, 5 levels). S1 normal power, S2 ' +
  'NEC 700 emergency. Every hospital-golden default that names hospital designations is explicitly ' +
  "cleared — absent keys fall back to the engine's _DEF_* hospital values (schema §19).";
const EMBED_COMMENT =
  'Embedded copy of mob_layout_config.json. Embedded (not sidecar-only) so validator rule CV-14 ' +
  'runs — its capability gate reads topology.layout_config.subfeed_start_ports and cannot see ' +
  'external configs (08_validation/lib/context_V1_0_0.mjs). Sidecar keys still win at layout time.';

/* ---------------------------------------------------------------------------
 * Tier-3 halts — five keys (id, topic, text, nec_reference, blocks).
 * ------------------------------------------------------------------------- */
const HALTS = [
  {
    id: 'HALT-001',
    topic: 'Utility available fault current',
    text:
      'COMPOSITOR_HALT: utility available fault current not provided (T3-EOR). No available_fc ' +
      'anywhere in this topology, so no A-4 fault-current tags are placed and the DV-4 bus-bracing ' +
      '/ AIC check cannot run. Switchboard, panelboard and ATS withstand ratings are unset pending ' +
      'this value. Affects sw-201, sw-202, d-301, r-391..r-394.',
    nec_reference: 'NEC 110.9 / 110.24',
    blocks: 'A-4 tags · DV-4 bus bracing / AIC · equipment AIC and ATS withstand ratings',
  },
  {
    id: 'HALT-002',
    topic: 'Utility transformer impedance (%Z, X/R)',
    text:
      'COMPOSITOR_HALT: XFMR-U (UTILITY-XFMR, 3000 kVA) %Z and X/R are utility nameplate values. ' +
      'transformer_impedance_V1_0_0.json covers dry-type units only, so pct_z / x_over_r on d-301 ' +
      'are left null rather than fabricated.',
    nec_reference: null,
    blocks: 'Fault-current study at the service entrance',
  },
  {
    id: 'HALT-003',
    topic: 'Feeder distances',
    text:
      'COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation; ' +
      'voltage_drop_pct is absent on every R-1 and no A-5 tags are placed. The 5-storey risers ' +
      '(CB-04/05/06/07/08 to Levels 3-5) and the EV site feeders (CB-12/13) are the runs most ' +
      'likely to need upsizing.',
    nec_reference: 'NEC 210.19(A) IN / 215.2(A)(1) IN',
    blocks: 'Voltage-drop calculation · A-5 tags',
  },
  {
    id: 'HALT-004',
    topic: 'Generator feeder sizing',
    text:
      'COMPOSITOR_HALT: generator feeder sizing is EOR input (NEC 445.13). GEN-1 100 kW / 125 kVA ' +
      'at 0.8 PF, FLA 150.4 A; integral breaker 175 A (>= 115 % FLA, NEC 445.12). The GEN-1 -> ' +
      'E4MDP-1-A feeder is drawn on feeder_schedule row 1754 (sized to the 175 A OCPD, ' +
      '2 1/2"C - (4)250 AL + #4 CU GND) as a placeholder the EOR must confirm.',
    nec_reference: 'NEC 445.12 / 445.13',
    blocks: 'Generator feeder release · generator sizing study',
  },
  {
    id: 'HALT-005',
    topic: 'Connected loads and equipment nameplates',
    text:
      'COMPOSITOR_HALT: no connected-load schedule, DCFC nameplate (2 x 150 kW) or imaging ' +
      'equipment (CT, digital X-ray) nameplate was provided. Every rating is a default size from ' +
      'the design brief, not a calculation. Note 2 x 150 kW DCFC at 480 V is ~361 A continuous ' +
      'before diversity; the 600 A CB-12 / 4S-S-A allowance must be confirmed against the NEC ' +
      '625.42 EVEMS setting and the chargers\' listed input. Feeder trips sum to 3725 A on the ' +
      '4000 A bus. Life-safety load (egress lighting, fire alarm) against the 100 kW generator ' +
      'is unverified.',
    nec_reference: 'NEC 220 / 625.42 / 700.4(B) / 517.71',
    blocks: 'Service and generator sizing verification · panel schedules · imaging feeder release',
  },
];

/* ---------------------------------------------------------------------------
 * Tier-2 decisions — four keys, no `blocks`.
 * ------------------------------------------------------------------------- */
const NOTES = [
  {
    id: 'NOTE-001',
    topic: 'Service',
    text:
      '4000 A, 480Y/277V 3PH 4W. XFMR-U 3000 kVA, 12.47 kV primary: FLA 3,000,000 / (480 x 1.732) ' +
      '= 3608 A -> 4000AF/4000AT LSIG main with GFP (NEC 240.6(A), 230.95). Main and secondary ' +
      'bus 4000 A. Service lateral tag 40004. CT metering in 4MSB-1-A. N-G bond at the service.',
    nec_reference: 'NEC 230.95 / 240.6(A) / 250.24(C)',
  },
  {
    id: 'NOTE-002',
    topic: 'Occupancy and levels',
    text:
      'Medical office building, business occupancy, 5 storeys. Not a hospital: no NEC 517 ' +
      'essential electrical system; the generator serves NEC 700 Emergency loads only (egress ' +
      'lighting, fire alarm, generator accessories). A-7 level lines on Levels 1-5.',
    nec_reference: 'NEC 517.2 / 700.2',
  },
  {
    id: 'NOTE-003',
    topic: 'Distribution breakers and bus order',
    text:
      'Fourteen 4MSB-1-A breakers in design-brief order CB-01..CB-14. The five step-down ' +
      'columns (CB-03/05/07/10/13) are separated by non-transformer columns. Feeder trips sum ' +
      'to 3725 A on the 4000 A bus. Distribution breakers LSI.',
    nec_reference: null,
  },
  {
    id: 'NOTE-004',
    topic: 'Step-down transformer protection',
    text:
      'Primary OCPDs from 3_phase_transformer_feeder_schedule: 150 kVA 250 A (2503), 112.5 kVA ' +
      '175 A (1753), 75 kVA 125 A (1253), 30 kVA 50 A (503). Each secondary OCPD (500/400/250/100 A) ' +
      'is the MCB of the panel it feeds, protecting the secondary conductors. %Z / X-R are ' +
      'transformer_impedance midpoints.',
    nec_reference: 'NEC 240.21(C) / 450.3(B)',
  },
  {
    id: 'NOTE-005',
    topic: 'Riser sub-feeds',
    text:
      '4L-2-A, 2P-2-A, 4L-4-A and 2P-4-A are sub-fed from the panel below (Variant G); their ' +
      'OCPD is internal to the feeding panel per its own schedule (100 A for the 4L sub-feeds, ' +
      '225 A for the 2P sub-feeds). On the emergency system E4L-3-A is sub-fed from E4P-1-A and ' +
      'E4L-5-A from E4L-3-A, 100 A each.',
    nec_reference: 'NEC 215.3 / 240.4',
  },
  {
    id: 'NOTE-006',
    topic: 'SPD',
    text:
      'SPD-1 Type 1, Mode A on a dedicated 30AF/30AT breaker CB-01, feeder 304. The SPD kA rating ' +
      'is an equipment-schedule item, not an SLD field.',
    nec_reference: 'NEC 230.67 / 242',
  },
  {
    id: 'NOTE-007',
    topic: 'EV charging',
    text:
      'CB-12 600 A -> 4S-S-A 600 A MLO (site, NEMA 3R) for 2 x 150 kW DCFC. CB-13 175 A -> ' +
      '4T-S-A 112.5 kVA -> 2P-S-A 400 A MCB (site, NEMA 3R) for 16 Level-2 chargers under an ' +
      'EVEMS per NEC 625.42.',
    nec_reference: 'NEC 625.42',
  },
  {
    id: 'NOTE-008',
    topic: 'Emergency system',
    text:
      'NEC 700 "Emergency", life safety only. GEN-1 100 kW / 125 kVA 480Y/277V diesel, NFPA 110 ' +
      'Level 1 Type 10, integral 175 A breaker (LSI — ground-fault indication only, NEC 700.6(D)). ' +
      'E4A-1-A 225 A 3-pole (generator not separately derived; no EM-side N-G bond), normal = ' +
      '4MSB-1-A CB-14 200 A (tag 2004, cross-sheet), emergency = E4MDP-1-A ECB-01 175 A (1754). ' +
      'ATS -> E4P-1-A 225 A MLO on tag 2254. Emergency wiring in its own raceways and riser.',
    nec_reference: 'NEC 700.10(B) / 700.10(D) / 445.12',
  },
  {
    id: 'NOTE-009',
    topic: 'E4P-1-A step-down',
    text:
      'E4P-1-A internal 100AF/50AT breaker -> E4T-1-A 30 kVA (primary 503) -> E2P-1-A 100 A MCB ' +
      '208Y/120V (secondary 1004T) for fire alarm control and EM receptacles.',
    nec_reference: 'NEC 240.21(C) / 450.3(B)',
  },
  {
    id: 'NOTE-010',
    topic: 'Deviation from brief — emergency distribution board added',
    text:
      'Brief-preferred GEN-1 -> ATS direct cannot be drawn: the engine places the generator and ' +
      'ATS row off an emergency switchboard lineup on the emergency sheet. Brief fallback applied: ' +
      'E4MDP-1-A 400 A two-level board (main EMDP-MAIN 250AF/175AT LSI, no GFP; one breaker ' +
      'ECB-01 250AF/175AT) between GEN-1 and E4A-1-A emergency input.',
    nec_reference: 'NEC 700.10(B)(5)',
  },
  {
    id: 'NOTE-011',
    topic: 'Deviation from brief — DS-IMG not drawn',
    text:
      'Brief CB-11 is Chain F through DS-IMG 400 A fused disconnect. The engine has no L2-5 ' +
      'renderer, so the SLD feeds 4S-1-A directly from CB-11 (Chain A, tag 4004). DS-IMG remains ' +
      'a physical device (imaging corridor wall) to be added to the SLD when L2-5 is implemented.',
    nec_reference: 'NEC 517.72 / 660.5',
  },
  {
    id: 'NOTE-012',
    topic: 'Drawing convention — level bands',
    text:
      '4T-3-A / 2P-3-A (L3) and 4T-5-A / 2P-5-A (L5) are drawn in their own level bands, fed by a ' +
      'riser from their switchboard breaker; 2P-4-A (L4) is sub-fed plumb from 2P-3-A. The site ' +
      'equipment 4S-S-A, 4T-S-A and 2P-S-A is drawn just above the switchboard and carries no level ' +
      'badge; its designations still state its level. No Site level line: the engine floor stack ' +
      'starts at the switchboard row.',
    nec_reference: null,
  },
  {
    id: 'NOTE-013',
    topic: 'Design status',
    text:
      'This SLD is for design development and coordination. It requires review and seal by a ' +
      'licensed Professional Engineer before construction use.',
    nec_reference: null,
  },
];

/* --------------------------------------------------------------------------- */

const topology = {
  $schema: 'sld_topology/v1',
  metadata: {
    schema_version: '1.0.0',
    project_name: 'Medical Office Building — 4000 A Service, 5 Levels',
    created_date: '2026-11-18',
    slug: SLUG,
    heading: 'Medical Office Building — 4000 A',
    facts: [
      '4000 A service, 480Y/277V 3PH 4W, 4000A GFP main, 3000 kVA utility transformer',
      '5 storeys, ~120,000 SF medical office — 14 feeders incl. EV and imaging',
      'NEC 700 Emergency: 100 kW GEN-1, 225 A ATS E4A-1-A, life safety only',
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
    { sheet_id: 'S2', sheet_number: 'E-502', title: 'SINGLE-LINE DIAGRAM — EMERGENCY POWER' },
  ],

  devices: [
    {
      id: 'd-301', node_type: 'L0-1', designation: 'UTILITY-XFMR', sheet_id: 'S1',
      data_fields: { kva_rating: 3000, primary_voltage: '12.47kV', secondary_voltage: '480Y/277V', phases: 3, wires: 4 },
      calc_fields: { pct_z: null, x_over_r: null },
    },
    { id: 'd-302', node_type: 'L1-4', designation: 'UTIL-MTR', sheet_id: 'S1', data_fields: { meter_type: 'utility' } },
    { id: 'd-303', node_type: 'L1-1', designation: 'MAIN-GFP', sheet_id: 'S1', data_fields: { af: 4000, at: 4000, poles: 3, trip_type: 'LSIG' } },
    { id: 'd-304', node_type: 'L1-3', designation: 'NG-BOND', sheet_id: 'S1', data_fields: { sds: 'service_entrance' } },
    ...devices,
  ],

  routed_elements: [
    serviceLateral,
    ...routed,
    bus('r-391', 'main-bus-4MSB-1-A', 'S1', 'main', 4000),
    bus('r-392', 'sec-bus-4MSB-1-A', 'S1', 'secondary', 4000),
    bus('r-393', 'main-bus-E4MDP-1-A', 'S2', 'main', 400),
    bus('r-394', 'sec-bus-E4MDP-1-A', 'S2', 'secondary', 400),
  ],

  annotations: [
    { id: svcA, annotation_type: 'A-2', bound_to: 'r-301', bound_to_type: 'routed_element', sheet_id: 'S1', content: { callout_text: svc.callout } },
    ...annotations,
  ],

  switchboards: [
    {
      id: 'sw-201', designation: '4MSB-1-A', variant: 'NP', bus_architecture: 'two-level', sheet_id: 'S1',
      data_fields: { rating: '4000A', voltage: '480Y/277V', wires: '4W, 3PH' },
      secondary_bus_overflow_ids: [], main_bus_id: 'r-391', secondary_bus_id: 'r-392', distribution_bus_id: null,
    },
    {
      id: 'sw-202', designation: 'E4MDP-1-A', variant: 'EM', bus_architecture: 'two-level', sheet_id: 'S2',
      data_fields: { rating: '400A', voltage: '480Y/277V', wires: '4W, 3PH' },
      secondary_bus_overflow_ids: [], main_bus_id: 'r-393', secondary_bus_id: 'r-394', distribution_bus_id: null,
    },
  ],

  sections: [
    { id: 'sec-201', switchboard_id: 'sw-201', type: 'incoming', order: 1, nec_class: null, section_tag: 'SEC-1', device_ids: [] },
    { id: 'sec-202', switchboard_id: 'sw-201', type: 'metering', order: 2, nec_class: null, section_tag: 'SEC-2', device_ids: ['d-302'] },
    { id: 'sec-203', switchboard_id: 'sw-201', type: 'main_breaker', order: 3, nec_class: null, section_tag: 'SEC-3', device_ids: ['d-303'] },
    // Breaker order is the brief's bus order (left to right). N-G bond last.
    { id: 'sec-204', switchboard_id: 'sw-201', type: 'distribution', order: 4, nec_class: null, section_tag: 'SEC-4', device_ids: [...breakers.map((b) => b.id), 'd-304'] },
    { id: 'sec-205', switchboard_id: 'sw-202', type: 'incoming', order: 1, nec_class: null, section_tag: 'SEC-1-EM', device_ids: [] },
    { id: 'sec-206', switchboard_id: 'sw-202', type: 'main_breaker', order: 2, nec_class: null, section_tag: 'SEC-2-EM', device_ids: [emMain.id] },
    { id: 'sec-207', switchboard_id: 'sw-202', type: 'distribution', order: 3, nec_class: '700', section_tag: 'SEC-3-EM', device_ids: [ecb01.id] },
  ],

  port_assignments: [
    { id: 'pa-301', device_id: 'd-303', port: 'line_in', bus_id: 'r-391' },
    { id: 'pa-302', device_id: 'd-303', port: 'bus_out', bus_id: 'r-392' },
    ...breakers.map((b) => ({ id: `pa-${paN++}`, device_id: b.id, port: 'bus_out', bus_id: 'r-392' })),
    { id: `pa-${paN++}`, device_id: emMain.id, port: 'line_in', bus_id: 'r-393' },
    { id: `pa-${paN++}`, device_id: emMain.id, port: 'bus_out', bus_id: 'r-394' },
    { id: `pa-${paN++}`, device_id: ecb01.id, port: 'bus_out', bus_id: 'r-394' },
    { id: `pa-${paN++}`, device_id: e4pCb.id, port: 'bus_out', attached_to_device: e4p.id, attached_to_port: 'feed_bottom' },
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
