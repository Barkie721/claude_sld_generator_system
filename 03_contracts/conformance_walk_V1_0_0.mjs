// Schema V1.0.0 acceptance walker — implements the normative requirements of
// 03_contracts/sld_topology_schema_V1_0_0.md as written and walks a topology.
// Usage: node conformance_walk_V1_0_0.mjs <topology.json>
// Exit 0 = zero violations. Advisory notes are defined-legal semantics, not failures.
// Precursor for the 08_validation validator.
import fs from 'node:fs';
import { GK_REQUIRED, GK_OPTIONAL, ANCHOR_MODES, ANNOTATION_LABEL_ANCHORS, SEC_KEYS, EL_KEYS, EL_ALIGN, GS_KINDS, GS_KEYS, BD_KEYS,
  TOP_REQ_KEYS, TOP_OPT_KEYS, SCHEMA_VERSIONS, EDGE_TYPES, BUS_LEVELS, ANNOTATION_TYPES, SW_VARIANTS, SECTION_TYPES, NEC_CLASSES } from './geometry_schema_data.mjs';

const path = process.argv[2];
const t = JSON.parse(fs.readFileSync(path, 'utf8'));
const V = [];   // violations
const N = [];   // advisory notes (defined-legal semantics, not violations)
const viol = (sec, msg) => V.push(`[§${sec}] ${msg}`);
const note = (sec, msg) => N.push(`[§${sec}] ${msg}`);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = v => typeof v === 'string';
const isNum = v => typeof v === 'number';

// ---- §2 top-level
const REQ_KEYS = TOP_REQ_KEYS, OPT_KEYS = TOP_OPT_KEYS;
for (const k of REQ_KEYS) if (!(k in t)) viol(2, `missing required top-level key "${k}"`);
for (const k of Object.keys(t)) if (!REQ_KEYS.includes(k) && !OPT_KEYS.includes(k)) viol(2, `unknown top-level key "${k}"`);
if (t.$schema !== 'sld_topology/v1') viol(2, `$schema is "${t.$schema}", expected "sld_topology/v1"`);

// ---- §3 metadata
const M = t.metadata || {};
for (const k of ['schema_version','project_name','created_date'])
  if (!isStr(M[k]) || !M[k]) viol(3, `metadata.${k} missing/empty (required)`);
if (M.schema_version && !SCHEMA_VERSIONS.includes(M.schema_version))
  viol(3, `metadata.schema_version "${M.schema_version}" not in {${SCHEMA_VERSIONS.join(', ')}}`);
if (M.slug !== undefined && !isStr(M.slug)) viol(3, 'metadata.slug must be a string');
if (M.title_block !== undefined) {
  const tb = M.title_block;
  if (!isObj(tb)) viol(3.1, 'metadata.title_block must be an object');
  else if (tb.revisions !== undefined) {
    if (!Array.isArray(tb.revisions)) viol(3.1, 'title_block.revisions must be an array');
    else tb.revisions.forEach((r,i)=>{ if(!isNum(r.no)||!isStr(r.date)||!isStr(r.description)) viol(3.1,`title_block.revisions[${i}] bad shape`); });
  }
}

// ---- §4 sheets
const sheetIds = new Set();
(t.sheets||[]).forEach((s,i)=>{
  for (const k of ['sheet_id','sheet_number','title'])
    if (!isStr(s[k]) || !s[k]) viol(4, `sheets[${i}].${k} missing (required)`);
  if (sheetIds.has(s.sheet_id)) viol(4, `duplicate sheet_id "${s.sheet_id}"`);
  sheetIds.add(s.sheet_id);
});

// ---- resolver sets
const devIds = new Set((t.devices||[]).map(d=>d.id));
const reMap = new Map((t.routed_elements||[]).map(r=>[r.id,r]));
const swIds = new Set((t.switchboards||[]).map(s=>s.id));
const secIds = new Set((t.sections||[]).map(s=>s.id));
// id -> record maps for the §14.7 echo checks (geometry.sections must agree with the
// topology section it keys off, and with that section's parent switchboard's sheet).
const secMapById = new Map((t.sections||[]).map(s=>[s.id,s]));
const swMapById = new Map((t.switchboards||[]).map(s=>[s.id,s]));
// id -> device map for the §14.8 device-bound sheet echo (gen/fire-pump A-8).
const devById = new Map((t.devices||[]).map(d=>[d.id,d]));
const annMap = new Map((t.annotations||[]).map(a=>[a.id,a]));

// §16: device/routed id ambiguity ban
for (const id of devIds) if (reMap.has(id)) viol(16, `id "${id}" exists in both devices and routed_elements (ambiguous for bus-tap resolution)`);

// ---- §5 devices
const desigSeen = new Map();
const devMap = new Map();
(t.devices||[]).forEach((d,i)=>{
  devMap.set(d.id, d);
  if (!isStr(d.id)) viol(5, `devices[${i}].id missing`);
  if (!isStr(d.node_type)) viol(5, `${d.id}: node_type missing`);
  if (d.designation === undefined) viol(5, `${d.id}: designation missing (null allowed, absence not)`);
  if (!sheetIds.has(d.sheet_id)) viol(5, `${d.id}: sheet_id "${d.sheet_id}" not in sheets[]`);
  if (!isObj(d.data_fields)) viol(5, `${d.id}: data_fields missing/not object (required)`);
  if (d.designation != null) {
    if (desigSeen.has(d.designation)) viol(5, `TI-3: duplicate designation "${d.designation}" (${desigSeen.get(d.designation)}, ${d.id})`);
    desigSeen.set(d.designation, d.id);
  }
  // §5.1 internal_to referential check
  const df = d.data_fields || {};
  if (df.internal_to !== undefined) {
    const parent = (t.devices||[]).find(p => p.designation === df.internal_to && p.node_type === 'L2-4' && p.sheet_id === d.sheet_id);
    if (!parent) viol(5, `${d.id}: data_fields.internal_to "${df.internal_to}" does not name an L2-4 designation on the same sheet`);
  }
});

// ---- §6 routed elements
(t.routed_elements||[]).forEach(r=>{
  if (!EDGE_TYPES.includes(r.edge_type)) viol(6, `${r.id}: edge_type "${r.edge_type}" not implemented (R-1/R-2; R-3 reserved)`);
  if (!isStr(r.designation) || !r.designation) viol(6, `${r.id}: designation missing`);
  if (!sheetIds.has(r.sheet_id)) viol(6, `${r.id}: sheet_id "${r.sheet_id}" not in sheets[]`);
  if (!isObj(r.data_fields)) viol(6, `${r.id}: data_fields missing/not object`);
  if (!Array.isArray(r.annotation_ids)) viol(6, `${r.id}: annotation_ids missing/not array`);

  const checkEp = (ep, which) => {
    if (ep === null) return;
    if (!isObj(ep) || !isStr(ep.device_id) || !isStr(ep.port)) { viol(6, `${r.id}: ${which} endpoint malformed`); return; }
    if (devIds.has(ep.device_id)) { /* device target ok */ }
    else if (reMap.has(ep.device_id)) {
      const target = reMap.get(ep.device_id);
      if (target.edge_type !== 'R-2') viol(6, `${r.id}: ${which} bus-tap target "${ep.device_id}" is not an R-2`);
      else if (ep.port !== 'bus_tap_bi') viol(6, `${r.id}: ${which} routed-element target requires port "bus_tap_bi", got "${ep.port}"`);
      else note(6, `${r.id}: ${which} is a legal R-2 bus tap → ${ep.device_id} (RE_${which.toUpperCase()}_BUSTAP)`);
    }
    else viol(6, `${r.id}: ${which}.device_id "${ep.device_id}" resolves in neither devices nor routed_elements (RE_${which.toUpperCase()}_ORPHAN)`);
  };

  if (r.edge_type === 'R-1') {
    if (r.start === undefined || r.end === undefined) viol(6, `${r.id}: R-1 requires start and end keys`);
    checkEp(r.start, 'start'); checkEp(r.end, 'end');
    if (r.start === null) {
      const roles = (t.layout_config && t.layout_config.sheet_roles) || null;
      const role = roles ? roles[r.sheet_id] : undefined;
      if (roles && role !== 'continuation')
        viol(6, `${r.id}: start=null but sheet ${r.sheet_id} role is "${role}" (continuation entry contract requires continuation role)`);
      else note(6, `${r.id}: start=null continuation entry on ${r.sheet_id}${roles?' (role=continuation via layout_config)':' (sheet_roles resolved from sidecar config at run time)'}`);
      if (r.end === null) viol(6, `${r.id}: continuation entry must still have a resolvable end`);
    }
    if (typeof r.stub_exempt !== 'boolean') viol(6, `${r.id}: R-1 stub_exempt must be boolean`);
  }
  if (r.edge_type === 'R-2') {
    if (!BUS_LEVELS.includes(r.bus_level))
      viol(6, `${r.id}: bus_level "${r.bus_level}" not in {${BUS_LEVELS.join(', ')}}`);
    if (r.start !== null || r.end !== null || r.stub_exempt !== null)
      viol(6, `${r.id}: R-2 requires start/end/stub_exempt = null`);
  }
  // annotation_ids reverse index
  (r.annotation_ids||[]).forEach(aid=>{
    const a = annMap.get(aid);
    if (!a) viol(6, `${r.id}: annotation_ids entry "${aid}" not in annotations[]`);
    else if (a.bound_to !== r.id) viol(6, `${r.id}: annotation "${aid}" bound_to "${a.bound_to}" ≠ this element`);
  });
});
// reverse: every annotation bound to an R-1 appears in its annotation_ids
// (§6 as-built rule: index maintained for R-1 only; R-2 buses carry [])
(t.annotations||[]).forEach(a=>{
  if (a.bound_to_type === 'routed_element' && reMap.has(a.bound_to)) {
    const r = reMap.get(a.bound_to);
    if (r.edge_type === 'R-1' && !(r.annotation_ids||[]).includes(a.id))
      viol(7, `${a.id}: bound to ${r.id} but missing from its annotation_ids`);
    if (r.edge_type === 'R-2') note(7, `${a.id} (${a.annotation_type}) binds to bus ${r.id} — not reverse-indexed per §6`);
  }
});

// ---- §7 annotations
const CONTENT_REQ = { 'A-1':['tag_text'], 'A-2':['callout_text'], 'A-3':['text'], 'A-4':['fc_amps'], 'A-6':['keynote_number','keynote_text'] };
(t.annotations||[]).forEach(a=>{
  if (!ANNOTATION_TYPES.includes(a.annotation_type))
    viol(7, `${a.id}: annotation_type "${a.annotation_type}" not implemented (A-5 reserved)`);
  if (!sheetIds.has(a.sheet_id)) viol(7, `${a.id}: sheet_id "${a.sheet_id}" not in sheets[]`);
  if (!isStr(a.bound_to)) viol(7, `${a.id}: bound_to missing`);
  else if (!(devIds.has(a.bound_to)||reMap.has(a.bound_to)||swIds.has(a.bound_to)||secIds.has(a.bound_to)))
    viol(7, `${a.id}: ANN_BOUND_ORPHAN bound_to "${a.bound_to}"`);
  if (!['routed_element','device'].includes(a.bound_to_type)) viol(7, `${a.id}: bound_to_type "${a.bound_to_type}" invalid`);
  if (!isObj(a.content)) { viol(7, `${a.id}: content missing`); return; }
  for (const k of (CONTENT_REQ[a.annotation_type]||[]))
    if (a.content[k] === undefined || a.content[k] === null || a.content[k] === '')
      viol(7, `${a.id} (${a.annotation_type}): content.${k} missing/empty`);
  if (a.annotation_type === 'A-4' && a.content.fc_amps !== undefined && !isNum(a.content.fc_amps))
    viol(7, `${a.id}: A-4 content.fc_amps must be a number (whole amps)`);
  if (a.annotation_type === 'A-6' && !(Number.isInteger(a.content.keynote_number) && a.content.keynote_number > 0))
    viol(7, `${a.id}: A-6 keynote_number must be positive integer`);
});

// ---- §8 switchboards
const npBuses = new Set(), emBuses = new Set();
(t.switchboards||[]).forEach(sw=>{
  if (!isStr(sw.designation)) viol(8, `${sw.id}: designation missing`);
  else if (desigSeen.has(sw.designation)) viol(8, `TI-3: switchboard designation "${sw.designation}" collides with device ${desigSeen.get(sw.designation)}`);
  if (!SW_VARIANTS.includes(sw.variant)) viol(8, `${sw.id}: variant "${sw.variant}" invalid`);
  if (!sheetIds.has(sw.sheet_id)) viol(8, `${sw.id}: sheet_id invalid`);
  if (!isObj(sw.data_fields)) viol(8, `${sw.id}: data_fields missing`);
  const busRef = (id, field, required) => {
    if (id == null) { if (required) viol(8, `${sw.id}: ${field} required for bus_architecture "${sw.bus_architecture}"`); return; }
    const bus = reMap.get(id);
    if (!bus || bus.edge_type !== 'R-2') viol(8, `${sw.id}: ${field} "${id}" is not a valid R-2`);
    else (sw.variant === 'NP' ? npBuses : emBuses).add(id);
  };
  if (sw.bus_architecture === 'two-level') {
    busRef(sw.main_bus_id,'main_bus_id',true); busRef(sw.secondary_bus_id,'secondary_bus_id',true);
    busRef(sw.distribution_bus_id,'distribution_bus_id',false);
  } else if (sw.bus_architecture === 'single') {
    busRef(sw.distribution_bus_id,'distribution_bus_id',true);
    const dbus = reMap.get(sw.distribution_bus_id);
    if (dbus && dbus.bus_level !== 'distribution') viol(8, `${sw.id}: single-architecture bus ${sw.distribution_bus_id} has bus_level "${dbus.bus_level}", expected "distribution"`);
    busRef(sw.main_bus_id,'main_bus_id',false); busRef(sw.secondary_bus_id,'secondary_bus_id',false);
  } else viol(8, `${sw.id}: bus_architecture "${sw.bus_architecture}" invalid`);
  (sw.secondary_bus_overflow_ids||[]).forEach(id=>busRef(id,'secondary_bus_overflow_ids[]',false));
});
for (const id of npBuses) if (emBuses.has(id)) viol(8, `TI-2: bus ${id} referenced by both NP and EM switchboards`);

// ---- §9 sections
const sectioned = new Map();
(t.sections||[]).forEach(sec=>{
  if (!swIds.has(sec.switchboard_id)) viol(9, `${sec.id}: switchboard_id "${sec.switchboard_id}" invalid`);
  if (!SECTION_TYPES.includes(sec.type))
    viol(9, `${sec.id}: type "${sec.type}" invalid`);
  if (!isNum(sec.order)) viol(9, `${sec.id}: order missing`);
  if (sec.nec_class !== null && sec.nec_class !== undefined && !NEC_CLASSES.includes(sec.nec_class))
    viol(9, `${sec.id}: nec_class "${sec.nec_class}" invalid`);
  if (!Array.isArray(sec.device_ids)) { viol(9, `${sec.id}: device_ids missing`); return; }
  sec.device_ids.forEach(did=>{
    if (!devIds.has(did)) viol(9, `${sec.id}: device_ids entry "${did}" invalid`);
    if (sectioned.has(did)) viol(9, `device ${did} in multiple sections (${sectioned.get(did)}, ${sec.id})`);
    sectioned.set(did, sec.id);
  });
});

// ---- §10 port assignments
(t.port_assignments||[]).forEach(pa=>{
  if (!isStr(pa.id)) viol(10, `port_assignment missing id: ${JSON.stringify(pa)}`);
  if (!devIds.has(pa.device_id)) viol(10, `${pa.id}: device_id "${pa.device_id}" invalid`);
  if (!isStr(pa.port)) viol(10, `${pa.id}: port missing`);
  const shape1 = pa.bus_id !== undefined, shape2 = pa.attached_to_device !== undefined || pa.attached_to_port !== undefined;
  if (shape1 === shape2) viol(10, `${pa.id}: exactly one of {bus_id} / {attached_to_device, attached_to_port} required`);
  if (shape1) { const b=reMap.get(pa.bus_id); if (!b||b.edge_type!=='R-2') viol(10, `${pa.id}: bus_id "${pa.bus_id}" not a valid R-2`); }
  if (shape2 && (!devIds.has(pa.attached_to_device) || !isStr(pa.attached_to_port)))
    viol(10, `${pa.id}: attached_to_device/attached_to_port invalid`);
});

// ---- §11 spur attachments
(t.spur_attachments||[]).forEach(sp=>{
  if (!devIds.has(sp.spd_id) || !devIds.has(sp.target_id)) viol(11, `spur ${JSON.stringify(sp)} bad FKs`);
});

// ---- §12 measurement attachments
(t.measurement_attachments||[]).forEach((ma,i)=>{
  const canonical = ['id','device_id','host_routed_element_id','mode','position'].every(k=>isStr(ma[k]));
  if (!canonical) { viol(12, `measurement_attachments[${i}] not in canonical dialect {id, device_id, host_routed_element_id, mode, position}: ${JSON.stringify(ma)}`); return; }
  if (!devIds.has(ma.device_id)) viol(12, `${ma.id}: device_id invalid`);
  if (!reMap.has(ma.host_routed_element_id)) viol(12, `${ma.id}: host_routed_element_id invalid`);
});

// ---- §13 cross-sheet refs
(t.cross_sheet_refs||[]).forEach((cs,i)=>{
  const shape = ['id','kind','source_sheet','dest_sheet','source_routed_element_id','dest_routed_element_id'].every(k=>isStr(cs[k]));
  if (!shape) { viol(13, `cross_sheet_refs[${i}] not in cs-NNN directional shape: ${JSON.stringify(cs)}`); return; }
  if (!reMap.has(cs.source_routed_element_id)) viol(13, `${cs.id}: XS_SRC_ORPHAN "${cs.source_routed_element_id}"`);
  if (!reMap.has(cs.dest_routed_element_id)) viol(13, `${cs.id}: XS_DEST_ORPHAN "${cs.dest_routed_element_id}"`);
  if (!sheetIds.has(cs.source_sheet)) viol(13, `${cs.id}: XS_SRC_SHEET "${cs.source_sheet}"`);
  if (!sheetIds.has(cs.dest_sheet)) viol(13, `${cs.id}: XS_DEST_SHEET "${cs.dest_sheet}"`);
  if (cs.source_sheet === cs.dest_sheet) viol(13, `${cs.id}: XS_SAME_SHEET`);
  // DV-15 paired conductor spec
  const a = reMap.get(cs.source_routed_element_id), b = reMap.get(cs.dest_routed_element_id);
  if (a && b) for (const k of ['conductor_material','conductor_size','conduit_type','conduit_size','ground_size','num_sets']) {
    const av=(a.calc_fields||{})[k], bv=(b.calc_fields||{})[k];
    if (av !== undefined && bv !== undefined && av !== bv) viol(13, `${cs.id}: DV-15 paired R-1 ${k} mismatch (${av} vs ${bv})`);
  }
});

// ---- TV-1/TV-2 (§15 amendment 8: is_service_entrance exempt from TV-1)
(t.routed_elements||[]).filter(r=>r.edge_type==='R-1' && r.stub_exempt===false).forEach(r=>{
  const bound = (r.annotation_ids||[]).map(id=>annMap.get(id)).filter(Boolean);
  const n1 = bound.filter(a=>a.annotation_type==='A-1').length;
  const n2 = bound.filter(a=>a.annotation_type==='A-2').length;
  const svcEntrance = (r.data_fields||{}).is_service_entrance === true;
  if (svcEntrance) note(15, `${r.id}: TV-1 service-entrance exemption (is_service_entrance)`);
  else if (n1 !== 1) viol(15, `TV-1: ${r.id} has ${n1} A-1 tags (expected 1)`);
  if (n2 !== 1) viol(15, `TV-2: ${r.id} has ${n2} A-2 callouts (expected 1)`);
});

// ---- §14 geometry (if present)
if (t.geometry) {
  const g = t.geometry;
  // §14 key whitelist, split REQUIRED / OPTIONAL. `sections` +
  // `equipment_labels` (§14.7/§14.8) are documented but not
  // required — an older block legitimately lacks them. Undocumented-key
  // check runs against the UNION, so the whitelist stays closed. GK_REQUIRED /
  // GK_OPTIONAL + the §14 key lists/enums below are single-sourced from
  // 03_contracts/geometry_schema_data.mjs (shared with schema_rules SCHEMA-14).
  const GK = [...GK_REQUIRED, ...GK_OPTIONAL];
  for (const k of GK_REQUIRED) if (!(k in g)) viol(14, `geometry missing required key "${k}"`);
  for (const k of Object.keys(g)) if (!GK.includes(k)) viol(14, `geometry has undocumented key "${k}"`);
  if (!isNum(g.effective_px_per_inch)) viol(14, 'effective_px_per_inch not a number');
  if (!isObj(g.content_area) || !isNum(g.content_area.width_px) || !isNum(g.content_area.height_px))
    viol(14, 'content_area must be {width_px, height_px}');
  // w/h/anchor_mode emitted (§14.1) — validated when
  // present; absence stays legal (older geometry).
  Object.entries(g.devices||{}).forEach(([id,d])=>{
    if (!devIds.has(id)) viol(14, `geometry.devices key "${id}" not a topology device`);
    if (!isObj(d.anchor)||!isNum(d.anchor.x)||!isNum(d.anchor.y)) viol(14, `geometry.devices.${id} anchor malformed`);
    if ('w' in d && !isNum(d.w)) viol(14, `geometry.devices.${id}.w not a number`);
    if ('h' in d && !isNum(d.h)) viol(14, `geometry.devices.${id}.h not a number`);
    if ('anchor_mode' in d && !ANCHOR_MODES.includes(d.anchor_mode))
      viol(14, `geometry.devices.${id}.anchor_mode "${d.anchor_mode}" not in {${ANCHOR_MODES.join(', ')}}`);
  });
  Object.entries(g.routed_elements||{}).forEach(([id,r])=>{
    if (!reMap.has(id)) viol(14, `geometry.routed_elements key "${id}" not a topology routed element`);
    if (!Array.isArray(r.path_vertices)||r.path_vertices.length<2||!r.path_vertices.every(p=>isNum(p.x)&&isNum(p.y)))
      viol(14, `geometry.routed_elements.${id} path_vertices malformed`);
  });
  Object.entries(g.annotations||{}).forEach(([id,a])=>{
    if (!annMap.has(id)) viol(14, `geometry.annotations key "${id}" not a topology annotation`);
    if (!isNum(a.x)||!isNum(a.y)) viol(14, `geometry.annotations.${id} must be {x, y}`);
    // A-1 pill center emitted (§14.1) — when present.
    if ('pill' in a && (!isObj(a.pill)||!isNum(a.pill.x)||!isNum(a.pill.y)))
      viol(14, `geometry.annotations.${id}.pill malformed (must be {x, y})`);
    // A-3 resolved squiggle label emitted (§14.1) —
    // when present. x/y = SVG text anchor point (y is the BASELINE),
    // anchor = SVG text-anchor keyword, text = the drawn string.
    if ('label' in a && (!isObj(a.label)||!isNum(a.label.x)||!isNum(a.label.y)
        ||!ANNOTATION_LABEL_ANCHORS.includes(a.label.anchor)
        ||typeof a.label.text!=='string'||a.label.text.length===0))
      viol(14, `geometry.annotations.${id}.label malformed (must be {x, y, anchor: start|middle|end, text})`);
  });
  // level_lines (§14.6, emitted): ordered array of
  // {sheet, level, label, y, x_start, x_end}; sheet resolves in sheets[].
  if (!Array.isArray(g.level_lines)) {
    viol(14, 'level_lines must be an array (§14.6)');
  } else {
    const sheetIds = new Set((t.sheets||[]).map(s=>s.sheet_id));
    g.level_lines.forEach((ll,i)=>{
      if (!isObj(ll)||!isStr(ll.sheet)||!isStr(ll.level)||!isStr(ll.label)||!isNum(ll.y)||!isNum(ll.x_start)||!isNum(ll.x_end))
        viol(14, `geometry.level_lines[${i}] must be {sheet, level, label, y, x_start, x_end} (§14.6)`);
      else if (!sheetIds.has(ll.sheet))
        viol(14, `geometry.level_lines[${i}].sheet "${ll.sheet}" not in topology sheets[]`);
    });
  }
  // sections (§14.7) — id-keyed object; flat x/y/w/h, no
  // anchor_mode (L1-2 is definitionally top-left). `sheet` required per-record:
  // topology.sections[] carries no sheet_id (§9).
  if ('sections' in g) {
    const sheetIds = new Set((t.sheets||[]).map(s=>s.sheet_id));
    if (!isObj(g.sections)||Array.isArray(g.sections)) viol(14, 'geometry.sections must be an id-keyed object (§14.7)');
    else Object.entries(g.sections).forEach(([id,sec])=>{
      const topoSec = secMapById.get(id);   // NOT `t` — that is the module-level topology
      if (!topoSec) viol(14, `geometry.sections key "${id}" not a topology section`);
      if (!isObj(sec)||!isNum(sec.x)||!isNum(sec.y)||!isNum(sec.w)||!isNum(sec.h))
        viol(14, `geometry.sections.${id} must carry numeric {x, y, w, h} (§14.7)`);
      if (isObj(sec)) Object.keys(sec).forEach(k=>{
        if (!SEC_KEYS.includes(k)) viol(14, `geometry.sections.${id}.${k} undocumented section key "${k}" (§14.7)`);
      });
      if (!isStr(sec.sheet)) viol(14, `geometry.sections.${id} missing required "sheet" (§14.7)`);
      else if (!sheetIds.has(sec.sheet)) viol(14, `geometry.sections.${id}.sheet "${sec.sheet}" not in topology sheets[]`);
      if (!isStr(sec.switchboard_id)||!swIds.has(sec.switchboard_id))
        viol(14, `geometry.sections.${id}.switchboard_id "${sec.switchboard_id}" not a topology switchboard`);
      // ECHO CHECKS — must agree with the topology section it keys off (lockstep with
      // schema_rules SCHEMA-14). type/section_tag are what the add-in places, so a
      // real-but-wrong value must not pass silently.
      if (topoSec) {
        if (sec.switchboard_id !== topoSec.switchboard_id)
          viol(14, `geometry.sections.${id}.switchboard_id "${sec.switchboard_id}" ≠ topology section's "${topoSec.switchboard_id}"`);
        if (sec.type !== topoSec.type)
          viol(14, `geometry.sections.${id}.type "${sec.type}" ≠ topology section's "${topoSec.type}"`);
        if ((sec.section_tag ?? null) !== (topoSec.section_tag ?? null))
          viol(14, `geometry.sections.${id}.section_tag ${JSON.stringify(sec.section_tag)} ≠ topology section's ${JSON.stringify(topoSec.section_tag ?? null)}`);
        if ((sec.nec_class ?? null) !== (topoSec.nec_class ?? null))
          viol(14, `geometry.sections.${id}.nec_class ${JSON.stringify(sec.nec_class)} ≠ topology section's ${JSON.stringify(topoSec.nec_class ?? null)}`);
        const psw = swMapById.get(topoSec.switchboard_id);
        if (psw && isStr(psw.sheet_id) && sec.sheet !== psw.sheet_id)
          viol(14, `geometry.sections.${id}.sheet "${sec.sheet}" ≠ parent switchboard ${topoSec.switchboard_id}'s sheet "${psw.sheet_id}"`);
      }
    });
  }
  // equipment_labels (A-8, §14.8) — ordered array, kept OUT
  // of geometry.annotations (FK-validated; A-8 has no topology instance, as
  // A-7). bound_to reuses the §7 annotation vocabulary: devices ∪
  // routed_elements ∪ switchboards ∪ sections.
  if ('equipment_labels' in g) {
    const sheetIds = new Set((t.sheets||[]).map(s=>s.sheet_id));
    const BOUND_TYPES = ['switchboard','section','device'];
    // EL_KEYS (shared, geometry_schema_data.mjs). `first_line_pitch` is
    // whitelisted but validated ONLY-WHEN-PRESENT below — requiring it would
    // hard-fail every older export (the GK_REQUIRED/GK_OPTIONAL lesson).
    if (!Array.isArray(g.equipment_labels)) viol(14, 'geometry.equipment_labels must be an array (§14.8)');
    else g.equipment_labels.forEach((el,i)=>{
      const P = `geometry.equipment_labels[${i}]`;
      if (!isObj(el)) { viol(14, `${P} must be an object (§14.8)`); return; }
      for (const k of Object.keys(el))
        if (!EL_KEYS.includes(k)) viol(14, `${P}.${k} undocumented equipment-label key "${k}" (§14.8)`);
      // sheet echo: a switchboard-bound label must sit on its host's sheet
      if (el.bound_to_type === 'switchboard' && swMapById.has(el.bound_to)) {
        const hs = swMapById.get(el.bound_to).sheet_id;
        if (isStr(hs) && el.sheet !== hs)
          viol(14, `${P}.sheet "${el.sheet}" ≠ host switchboard ${el.bound_to}'s sheet "${hs}"`);
      }
      // device-bound labels (gen L1-5 / fire-pump L3-1) echo their
      // host DEVICE's sheet the same way. Twin of schema_rules' devMap branch.
      if (el.bound_to_type === 'device' && devById.has(el.bound_to)) {
        const hs = devById.get(el.bound_to).sheet_id;
        if (isStr(hs) && el.sheet !== hs)
          viol(14, `${P}.sheet "${el.sheet}" ≠ host device ${el.bound_to}'s sheet "${hs}"`);
      }
      if (!isStr(el.sheet)) viol(14, `${P} missing required "sheet" (§14.8)`);
      else if (!sheetIds.has(el.sheet)) viol(14, `${P}.sheet "${el.sheet}" not in topology sheets[]`);
      if (!BOUND_TYPES.includes(el.bound_to_type))
        viol(14, `${P}.bound_to_type "${el.bound_to_type}" not in {${BOUND_TYPES.join(', ')}}`);
      if (!isStr(el.bound_to)||!(devIds.has(el.bound_to)||reMap.has(el.bound_to)||swIds.has(el.bound_to)||secIds.has(el.bound_to)))
        viol(14, `${P}.bound_to "${el.bound_to}" resolves in none of devices/routed_elements/switchboards/sections`);
      if (!isObj(el.anchor)||!isNum(el.anchor.x)||!isNum(el.anchor.y)) viol(14, `${P}.anchor malformed (must be {x, y})`);
      if (!isNum(el.line_pitch)) viol(14, `${P}.line_pitch not a number`);
      if ('first_line_pitch' in el && !isNum(el.first_line_pitch))
        viol(14, `${P}.first_line_pitch not a number (§14.8)`);
      // align is an ENUM — "end" (switchboard blocks, anchor at the
      // first line's RIGHT end) or "start" (device-bound gen/fire-pump blocks,
      // anchor at the first line's LEFT end). Twin of schema_rules.
      if (!EL_ALIGN.includes(el.align))
        viol(14, `${P}.align "${el.align}" not in {end, start} (§14.8)`);
      if (!isStr(el.label)) viol(14, `${P}.label not a string`);
      if (!Array.isArray(el.lines)||!el.lines.every(isStr))
        viol(14, `${P}.lines must be an array of strings (post-compaction, §14.8)`);
    });
  }
  // glyph_supplements (§14.9) — ordered array of engine-drawn
  // connecting linework with NO topology instance (utility primary feed +
  // TO-UTILITY squiggle; no R-1 / no A-3 in TOPO). Validated ONLY-WHEN-PRESENT
  // (older exports stay legal). Lockstep with schema_rules SCHEMA-14.
  if ('glyph_supplements' in g) {
    const sheetIds = new Set((t.sheets||[]).map(s=>s.sheet_id));
    // GS_KINDS / GS_KEYS shared (geometry_schema_data.mjs).
    if (!Array.isArray(g.glyph_supplements)) viol(14, 'geometry.glyph_supplements must be an array (§14.9)');
    else {
      const seenIds = new Set();
      g.glyph_supplements.forEach((gs,i)=>{
        const P = `geometry.glyph_supplements[${i}]`;
        if (!isObj(gs)) { viol(14, `${P} must be an object (§14.9)`); return; }
        if (!isStr(gs.id)) viol(14, `${P} missing required "id" (§14.9)`);
        else if (seenIds.has(gs.id)) viol(14, `${P}.id duplicate glyph-supplement id "${gs.id}"`);
        else seenIds.add(gs.id);
        if (!isStr(gs.sheet)) viol(14, `${P} missing required "sheet" (§14.9)`);
        else if (!sheetIds.has(gs.sheet)) viol(14, `${P}.sheet "${gs.sheet}" not in topology sheets[]`);
        if (!GS_KINDS.includes(gs.kind)) { viol(14, `${P}.kind "${gs.kind}" not in {${GS_KINDS.join(', ')}}`); return; }
        Object.keys(gs).forEach(k=>{
          if (!GS_KEYS[gs.kind].includes(k)) viol(14, `${P}.${k} undocumented glyph-supplement key "${k}" (§14.9)`);
        });
        if (!isStr(gs.host_device_id)||!devIds.has(gs.host_device_id))
          viol(14, `${P}.host_device_id "${gs.host_device_id}" not a topology device`);
        if (!isStr(gs.role)) viol(14, `${P}.role not a string (§14.9)`);
        if (gs.kind === 'polyline') {
          if (!Array.isArray(gs.vertices)||gs.vertices.length<2||!gs.vertices.every(p=>isObj(p)&&isNum(p.x)&&isNum(p.y)))
            viol(14, `${P}.vertices malformed (≥2 of {x, y}, §14.9)`);
        } else {
          if (!isNum(gs.x)||!isNum(gs.y)) viol(14, `${P} squiggle must carry numeric {x, y} (§14.9)`);
          if (!isStr(gs.text)) viol(14, `${P}.text not a string (§14.9)`);
          if (!isStr(gs.text_side)) viol(14, `${P}.text_side not a string (§14.9)`);
          if (!isStr(gs.orient)) viol(14, `${P}.orient not a string (§14.9)`);
        }
      });
    }
  }
  // bus_dots (§14.10) — ordered array of the inline bus
  // connection dots at feeder×busbar junctions (incoming feeder × main-bus dot).
  // Validated ONLY-WHEN-PRESENT (older exports stay legal). Lockstep with
  // schema_rules SCHEMA-14. host_device_id FKs a topology SECTION (not a device).
  if ('bus_dots' in g) {
    const sheetIds = new Set((t.sheets||[]).map(s=>s.sheet_id));
    // BD_KEYS shared (geometry_schema_data.mjs).
    if (!Array.isArray(g.bus_dots)) viol(14, 'geometry.bus_dots must be an array (§14.10)');
    else {
      const seenIds = new Set();
      g.bus_dots.forEach((bd,i)=>{
        const P = `geometry.bus_dots[${i}]`;
        if (!isObj(bd)) { viol(14, `${P} must be an object (§14.10)`); return; }
        if (!isStr(bd.id)) viol(14, `${P} missing required "id" (§14.10)`);
        else if (seenIds.has(bd.id)) viol(14, `${P}.id duplicate bus-dot id "${bd.id}"`);
        else seenIds.add(bd.id);
        if (!isStr(bd.sheet)) viol(14, `${P} missing required "sheet" (§14.10)`);
        else if (!sheetIds.has(bd.sheet)) viol(14, `${P}.sheet "${bd.sheet}" not in topology sheets[]`);
        Object.keys(bd).forEach(k=>{
          if (!BD_KEYS.includes(k)) viol(14, `${P}.${k} undocumented bus-dot key "${k}" (§14.10)`);
        });
        if (!isStr(bd.host_device_id)||!secIds.has(bd.host_device_id))
          viol(14, `${P}.host_device_id "${bd.host_device_id}" not a topology section`);
        if (!isStr(bd.role)) viol(14, `${P}.role not a string (§14.10)`);
        if (!isNum(bd.x)||!isNum(bd.y)) viol(14, `${P} bus dot must carry numeric {x, y} (§14.10)`);
      });
    }
  }
  if (!Array.isArray(g.layout_warnings)||!g.layout_warnings.every(isStr)) viol(14, 'layout_warnings must be array of strings');
  note(14, `partial coverage: devices ${Object.keys(g.devices||{}).length}/${t.devices.length}, routed ${Object.keys(g.routed_elements||{}).length}/${t.routed_elements.length}, annotations ${Object.keys(g.annotations||{}).length}/${t.annotations.length} (defined semantics §14.2)`);
}

// ---- report
console.log(`\n=== ${path} ===`);
console.log(`VIOLATIONS: ${V.length}`);
V.forEach(v=>console.log('  ✗ ' + v));
console.log(`ADVISORY NOTES: ${N.length}`);
N.forEach(n=>console.log('  · ' + n));
process.exitCode = V.length ? 1 : 0;
