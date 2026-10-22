// 08_validation/lib/context_V1_0_0.mjs — shared validation context.
// Ports the resolver sets of 03_contracts/conformance_walk_V1_0_0.mjs into a reusable
// index object consumed by every rule.
// Contract of record: 03_contracts/sld_topology_schema_V1_0_0.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// repo root = 08_validation/lib/../../
const DATA_DIR = path.resolve(__dirname, '..', '..', '07_data', 'normalized');

export const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const isStr = v => typeof v === 'string';
export const isNum = v => typeof v === 'number';

// ---- legacy dialect shape matchers (schema V1.1.0 Appendix A deviations A-1 / A-2).
// Only these EXACT documented shapes downgrade to `migration`; anything else stays error.
export function isLegacyXref(cs) {
  return isObj(cs)
    && ['id','feeder_id_source','feeder_id_dest','squiggle_id_source','squiggle_id_dest','source_sheet_id','dest_sheet_id']
       .every(k => isStr(cs[k]))
    && /^xref-/.test(cs.id);
}
export function isCanonicalXref(cs) {
  return isObj(cs)
    && ['id','kind','source_sheet','dest_sheet','source_routed_element_id','dest_routed_element_id']
       .every(k => isStr(cs[k]));
}
export function isLegacyMeas(ma) {
  return isObj(ma) && ma.id === undefined
    && ['meter_id','bus_id','attachment_mode'].every(k => isStr(ma[k]));
}
export function isCanonicalMeas(ma) {
  return isObj(ma)
    && ['id','device_id','host_routed_element_id','mode','position'].every(k => isStr(ma[k]));
}

export function buildContext(topology, opts = {}) {
  const t = topology;
  const devices = Array.isArray(t.devices) ? t.devices : [];
  const routed = Array.isArray(t.routed_elements) ? t.routed_elements : [];
  const anns = Array.isArray(t.annotations) ? t.annotations : [];
  const sws = Array.isArray(t.switchboards) ? t.switchboards : [];
  const secs = Array.isArray(t.sections) ? t.sections : [];
  const pas = Array.isArray(t.port_assignments) ? t.port_assignments : [];
  const spurs = Array.isArray(t.spur_attachments) ? t.spur_attachments : [];
  const meas = Array.isArray(t.measurement_attachments) ? t.measurement_attachments : [];
  const csrefs = Array.isArray(t.cross_sheet_refs) ? t.cross_sheet_refs : [];
  const sheets = Array.isArray(t.sheets) ? t.sheets : [];

  const sheetIds = new Set(sheets.map(s => s.sheet_id));
  const sheetNumbers = new Set(sheets.map(s => s.sheet_number));
  const devMap = new Map(devices.map(d => [d.id, d]));
  const reMap = new Map(routed.map(r => [r.id, r]));
  const annMap = new Map(anns.map(a => [a.id, a]));
  const swMap = new Map(sws.map(s => [s.id, s]));
  const secMap = new Map(secs.map(s => [s.id, s]));
  const r1s = routed.filter(r => r.edge_type === 'R-1');
  const r2s = routed.filter(r => r.edge_type === 'R-2');

  const devsByType = new Map();
  for (const d of devices) {
    if (!devsByType.has(d.node_type)) devsByType.set(d.node_type, []);
    devsByType.get(d.node_type).push(d);
  }

  // designation index across devices ∪ switchboards, nulls excluded (V1.1 §15 amendment 7)
  const desigOwners = new Map(); // designation -> [{kind, id}]
  for (const d of devices) if (d.designation != null && d.designation !== '') {
    if (!desigOwners.has(d.designation)) desigOwners.set(d.designation, []);
    desigOwners.get(d.designation).push({ kind: 'device', id: d.id });
  }
  for (const sw of sws) if (sw.designation != null && sw.designation !== '') {
    if (!desigOwners.has(sw.designation)) desigOwners.set(sw.designation, []);
    desigOwners.get(sw.designation).push({ kind: 'switchboard', id: sw.id });
  }
  const desigSet = new Set(desigOwners.keys());

  // annotations grouped by binding target
  const annsByBound = new Map(); // bound_to id -> [ann]
  for (const a of anns) {
    if (!isStr(a.bound_to)) continue;
    if (!annsByBound.has(a.bound_to)) annsByBound.set(a.bound_to, []);
    annsByBound.get(a.bound_to).push(a);
  }

  // typed endpoint resolver — port of walker checkEp (lines 92–103), honoring
  // V1.1 §15 amendments 1–2 (null start on continuation sheets; R-2 bus taps either end)
  function resolveEndpoint(ep) {
    if (ep === null || ep === undefined) return { kind: 'null' };
    if (!isObj(ep) || !isStr(ep.device_id) || !isStr(ep.port)) return { kind: 'malformed', ep };
    if (devMap.has(ep.device_id))
      return { kind: 'device', id: ep.device_id, port: ep.port, device: devMap.get(ep.device_id) };
    if (reMap.has(ep.device_id)) {
      const target = reMap.get(ep.device_id);
      if (target.edge_type !== 'R-2') return { kind: 'bad_bus_tap', id: ep.device_id, port: ep.port, reason: 'target is not an R-2' };
      if (ep.port !== 'bus_tap_bi') return { kind: 'bad_bus_tap', id: ep.device_id, port: ep.port, reason: `routed-element target requires port "bus_tap_bi", got "${ep.port}"` };
      return { kind: 'bus_tap', id: ep.device_id, port: ep.port, bus: target };
    }
    return { kind: 'orphan', id: ep.device_id, port: ep.port };
  }

  // feeder endpoint indexes (resolved once)
  const feedersByStartDevice = new Map(); // device_id -> [{r, port}]
  const feedersByEndDevice = new Map();
  const feedersByStartBus = new Map();    // bus id -> [r]
  const feedersByEndBus = new Map();
  for (const r of r1s) {
    const s = resolveEndpoint(r.start), e = resolveEndpoint(r.end);
    if (s.kind === 'device') {
      if (!feedersByStartDevice.has(s.id)) feedersByStartDevice.set(s.id, []);
      feedersByStartDevice.get(s.id).push({ r, port: s.port });
    } else if (s.kind === 'bus_tap') {
      if (!feedersByStartBus.has(s.id)) feedersByStartBus.set(s.id, []);
      feedersByStartBus.get(s.id).push(r);
    }
    if (e.kind === 'device') {
      if (!feedersByEndDevice.has(e.id)) feedersByEndDevice.set(e.id, []);
      feedersByEndDevice.get(e.id).push({ r, port: e.port });
    } else if (e.kind === 'bus_tap') {
      if (!feedersByEndBus.has(e.id)) feedersByEndBus.set(e.id, []);
      feedersByEndBus.get(e.id).push(r);
    }
  }

  const paByDevice = new Map(); // device_id -> [pa]
  for (const pa of pas) {
    if (!isStr(pa.device_id)) continue;
    if (!paByDevice.has(pa.device_id)) paByDevice.set(pa.device_id, []);
    paByDevice.get(pa.device_id).push(pa);
  }

  // dialect partitions
  const canonicalCs = csrefs.filter(isCanonicalXref);
  const legacyCs = csrefs.filter(cs => !isCanonicalXref(cs) && isLegacyXref(cs));
  const canonicalMeas = meas.filter(isCanonicalMeas);
  const legacyMeas = meas.filter(ma => !isCanonicalMeas(ma) && isLegacyMeas(ma));

  // Cross-sheet continuation aliases. Two as-built pair dialects exist:
  //  - hospital: BOTH segments carry identical endpoints (r-013-s1/-s2 both
  //    d-009.line_in → d-045.source1_in) — the dest segment is a pure alias and must
  //    not double-count in CV-2/CV-5/CV-6;
  //  - second-building dialect: the dest segment is start:null and is the SOLE carrier
  //    of the end connection (e.g. r-216 → ATS source1_in) — it is NOT an alias.
  // So a dest segment is an alias only when its endpoints duplicate the source's.
  const epKey = ep => (ep && typeof ep === 'object') ? `${ep.device_id}|${ep.port}` : String(ep);
  const csAliasSegments = new Set();
  for (const [srcId, dstId] of [
    ...canonicalCs.map(cs => [cs.source_routed_element_id, cs.dest_routed_element_id]),
    ...legacyCs.map(cs => [cs.feeder_id_source, cs.feeder_id_dest]),
  ]) {
    const src = reMap.get(srcId), dst = reMap.get(dstId);
    if (src && dst && epKey(src.start) === epKey(dst.start) && epKey(src.end) === epKey(dst.end))
      csAliasSegments.add(dstId);
  }
  const isCsAlias = rId => csAliasSegments.has(rId);

  // sheet roles: embedded layout_config wins, else sidecar via --layout-config, else null (lenient)
  const sheetRoles = (t.layout_config && t.layout_config.sheet_roles)
    || (opts.layoutConfig && opts.layoutConfig.sheet_roles) || null;

  // ---- exemption helpers (SV-3 and rules-doc §7 exemption notes live here, not as rules)
  const genIds = new Set((devsByType.get('L1-5') || []).map(d => d.id));
  const isGeneratorFeeder = r => {
    const s = resolveEndpoint(r.start);
    return s.kind === 'device' && genIds.has(s.id);
  };
  const isServiceEntrance = r => isObj(r.data_fields) && r.data_fields.is_service_entrance === true;
  // Spare/Space is modeled two ways as-built: dedicated L2-7 devices, or L2-1 breakers
  // with data_fields.kind "spare"/"space" (hospital CB-05/06/14/15).
  const isSpareOrSpace = d => d.node_type === 'L2-7'
    || (isObj(d.data_fields) && ['spare', 'space'].includes(d.data_fields.kind));
  // internal (sub-feed) breaker living inside a panelboard: its downstream feeder starts
  // at the parent panel's feed port, not at the breaker (schema V1.1 §5.1 internal_to).
  const isInternalBreaker = d => isObj(d.data_fields) && d.data_fields.internal_to !== undefined;
  // discriminator may live in data_fields (V1.1 §5.1) or device level (legacy dialect)
  const spdMode = d => (isObj(d.data_fields) && d.data_fields.mode) || d.mode || null;
  const isSpdModeB = d => d.node_type === 'L2-6' && spdMode(d) === 'B';

  // ---- data layer loader (07_data/normalized), memoized; null = capability absent
  const dataCache = new Map();
  function data(fileName) {
    if (dataCache.has(fileName)) return dataCache.get(fileName);
    let parsed = null;
    try { parsed = JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), 'utf8')); }
    catch { parsed = null; }
    dataCache.set(fileName, parsed);
    return parsed;
  }

  // ---- json-path builders (id-keyed segments; index form for entries without ids)
  const P = {
    dev: (id, ...tail) => `devices[id=${id}]` + (tail.length ? '.' + tail.join('.') : ''),
    re: (id, ...tail) => `routed_elements[id=${id}]` + (tail.length ? '.' + tail.join('.') : ''),
    ann: (id, ...tail) => `annotations[id=${id}]` + (tail.length ? '.' + tail.join('.') : ''),
    sw: (id, ...tail) => `switchboards[id=${id}]` + (tail.length ? '.' + tail.join('.') : ''),
    sec: (id, ...tail) => `sections[id=${id}]` + (tail.length ? '.' + tail.join('.') : ''),
    idx: (coll, i, ...tail) => `${coll}[${i}]` + (tail.length ? '.' + tail.join('.') : ''),
  };

  const ctx = {
    t, filePath: opts.filePath || '(topology)',
    sheets, sheetIds, sheetNumbers,
    devices, devMap, devsByType,
    routed, reMap, r1s, r2s,
    anns, annMap, annsByBound,
    sws, swMap, secs, secMap,
    pas, paByDevice, spurs,
    meas, canonicalMeas, legacyMeas,
    csrefs, canonicalCs, legacyCs,
    desigOwners, desigSet,
    sheetRoles,
    resolveEndpoint,
    feedersByStartDevice, feedersByEndDevice, feedersByStartBus, feedersByEndBus,
    csAliasSegments, isCsAlias,
    isGeneratorFeeder, isServiceEntrance, isSpareOrSpace, isInternalBreaker, spdMode, isSpdModeB,
    data, P,
    _graph: null, // built lazily by lib/graph_V1_0_0.mjs via ctx.graph()
  };

  // capability probe used by the engine's `requires` gate
  ctx.hasCapability = req => {
    if (req === 'graph') return true;
    if (req === 'port_model') return pas.length > 0;
    if (req === 'layout_config') return ctx.sheetRoles != null;
    // embedded subfeed_start_ports whitelist present (CV-14 capability gate): distinct from the
    // 'layout_config' cap above (which probes sheetRoles). Only true when the topology actually
    // carries layout_config.subfeed_start_ports the validator can read (external configs unseen).
    if (req === 'layout_config:subfeed_start_ports') return Array.isArray(t.layout_config?.subfeed_start_ports);
    if (req === 'geometry') return isObj(t.geometry); // schema §14 block present (WITH_GEOMETRY)
    if (req.startsWith('data:')) return data(req.slice(5)) != null;
    return false;
  };

  return ctx;
}
