// 08_validation/rules/schema_rules_V1_0_0.mjs — SCHEMA-§N family.
// Structural conformance checks ported from 03_contracts/conformance_walk_V1_0_0.mjs
// (seed copy alongside the validator). spec_ref cites sld_topology_schema_V1_0_0.md §N.
// Checks with a catalog identity (SH-1, TI-2, TI-3, TV-1/2/7, DV-15) live in their
// family modules and report under the canonical ID only — no check reports twice.
// Behavioral delta from the walker: §12/§13 entries matching the EXACT documented
// legacy dialect shapes are handled by MIG-1/MIG-2 (severity `migration`), not here.
import { isObj, isStr, isNum, isCanonicalXref, isLegacyXref, isCanonicalMeas, isLegacyMeas } from '../lib/context_V1_0_0.mjs';
import { GK_REQUIRED, GK_OPTIONAL, ANCHOR_MODES, ANNOTATION_LABEL_ANCHORS, SEC_KEYS, EL_KEYS, EL_ALIGN, GS_KINDS, GS_KEYS, BD_KEYS,
  TOP_REQ_KEYS, TOP_OPT_KEYS, SCHEMA_VERSIONS, EDGE_TYPES, BUS_LEVELS, ANNOTATION_TYPES, SW_VARIANTS, SECTION_TYPES, NEC_CLASSES } from '../../03_contracts/geometry_schema_data.mjs';

const S = '03_contracts/sld_topology_schema_V1_0_0.md';

export const SCHEMA_RULES = [
  {
    id: 'SCHEMA-2', spec_ref: `${S} §2`, title: 'Top-level structure', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      const REQ = TOP_REQ_KEYS, OPT = TOP_OPT_KEYS;
      for (const k of REQ) if (!(k in ctx.t)) F.push({ path: k, message: `missing required top-level key "${k}"` });
      for (const k of Object.keys(ctx.t)) if (!REQ.includes(k) && !OPT.includes(k))
        F.push({ path: k, message: `unknown top-level key "${k}"` });
      if (ctx.t.$schema !== 'sld_topology/v1')
        F.push({ path: '$schema', message: `$schema is "${ctx.t.$schema}", expected "sld_topology/v1"` });
      return F;
    },
  },
  {
    id: 'SCHEMA-3', spec_ref: `${S} §3/§3.1`, title: 'Metadata', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [], M = ctx.t.metadata || {};
      for (const k of ['schema_version','project_name','created_date'])
        if (!isStr(M[k]) || !M[k]) F.push({ path: `metadata.${k}`, message: `metadata.${k} missing/empty (required)` });
      if (M.schema_version && !SCHEMA_VERSIONS.includes(M.schema_version))
        F.push({ path: 'metadata.schema_version', message: `schema_version "${M.schema_version}" not in {${SCHEMA_VERSIONS.join(', ')}}` });
      if (M.slug !== undefined && !isStr(M.slug))
        F.push({ path: 'metadata.slug', message: 'metadata.slug must be a string' });
      if (M.title_block !== undefined) {
        const tb = M.title_block;
        if (!isObj(tb)) F.push({ path: 'metadata.title_block', message: 'title_block must be an object' });
        else if (tb.revisions !== undefined) {
          if (!Array.isArray(tb.revisions)) F.push({ path: 'metadata.title_block.revisions', message: 'revisions must be an array' });
          else tb.revisions.forEach((r, i) => {
            if (!isNum(r.no) || !isStr(r.date) || !isStr(r.description))
              F.push({ path: `metadata.title_block.revisions[${i}]`, message: 'revision entry bad shape (needs {no:number, date, description})' });
          });
        }
      }
      return F;
    },
  },
  {
    id: 'SCHEMA-4', spec_ref: `${S} §4`, title: 'Sheets', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [], seen = new Set();
      ctx.sheets.forEach((s, i) => {
        for (const k of ['sheet_id','sheet_number','title'])
          if (!isStr(s[k]) || !s[k]) F.push({ path: ctx.P.idx('sheets', i, k), message: `sheets[${i}].${k} missing (required)` });
        if (seen.has(s.sheet_id)) F.push({ path: ctx.P.idx('sheets', i, 'sheet_id'), message: `duplicate sheet_id "${s.sheet_id}"` });
        seen.add(s.sheet_id);
      });
      return F;
    },
  },
  {
    id: 'SCHEMA-16', spec_ref: `${S} §16`, title: 'Device/routed id ambiguity ban (duplicate-id)', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const d of ctx.devices) if (ctx.reMap.has(d.id))
        F.push({ path: ctx.P.dev(d.id), message: `id "${d.id}" exists in both devices and routed_elements (ambiguous for bus-tap resolution)` });
      const seenDev = new Set(), seenRe = new Set(), seenAnn = new Set();
      for (const d of ctx.devices) { if (seenDev.has(d.id)) F.push({ path: ctx.P.dev(d.id), message: `duplicate device id "${d.id}"` }); seenDev.add(d.id); }
      for (const r of ctx.routed) { if (seenRe.has(r.id)) F.push({ path: ctx.P.re(r.id), message: `duplicate routed_element id "${r.id}"` }); seenRe.add(r.id); }
      for (const a of ctx.anns) { if (seenAnn.has(a.id)) F.push({ path: ctx.P.ann(a.id), message: `duplicate annotation id "${a.id}"` }); seenAnn.add(a.id); }
      return F;
    },
  },
  {
    id: 'SCHEMA-5', spec_ref: `${S} §5/§5.1`, title: 'Device record shape', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      ctx.devices.forEach((d, i) => {
        if (!isStr(d.id)) F.push({ path: ctx.P.idx('devices', i), message: 'device id missing' });
        if (!isStr(d.node_type)) F.push({ path: ctx.P.dev(d.id, 'node_type'), message: `${d.id}: node_type missing` });
        if (d.designation === undefined) F.push({ path: ctx.P.dev(d.id, 'designation'), message: `${d.id}: designation missing (null allowed, absence not)` });
        if (!isObj(d.data_fields)) F.push({ path: ctx.P.dev(d.id, 'data_fields'), message: `${d.id}: data_fields missing/not object (required)` });
        const df = d.data_fields || {};
        if (df.internal_to !== undefined) {
          const parent = ctx.devices.find(p => p.designation === df.internal_to && p.node_type === 'L2-4' && p.sheet_id === d.sheet_id);
          if (!parent) F.push({ path: ctx.P.dev(d.id, 'data_fields.internal_to'), message: `${d.id}: internal_to "${df.internal_to}" does not name an L2-4 designation on the same sheet` });
        }
      });
      return F;
    },
  },
  {
    id: 'SCHEMA-6', spec_ref: `${S} §6; §15 amendments 1–2, 9`, title: 'Routed element shape & endpoint resolution (dangling refs)', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const r of ctx.routed) {
        if (!EDGE_TYPES.includes(r.edge_type))
          F.push({ path: ctx.P.re(r.id, 'edge_type'), message: `${r.id}: edge_type "${r.edge_type}" not implemented (R-1/R-2; R-3 reserved)` });
        if (!isStr(r.designation) || !r.designation)
          F.push({ path: ctx.P.re(r.id, 'designation'), message: `${r.id}: designation missing` });
        if (!isObj(r.data_fields)) F.push({ path: ctx.P.re(r.id, 'data_fields'), message: `${r.id}: data_fields missing/not object` });
        if (!Array.isArray(r.annotation_ids)) F.push({ path: ctx.P.re(r.id, 'annotation_ids'), message: `${r.id}: annotation_ids missing/not array` });

        const report = (which, ep) => {
          const res = ctx.resolveEndpoint(ep);
          if (res.kind === 'malformed') F.push({ path: ctx.P.re(r.id, which), message: `${r.id}: ${which} endpoint malformed` });
          else if (res.kind === 'bad_bus_tap') F.push({ path: ctx.P.re(r.id, which), message: `${r.id}: ${which} bus-tap target "${res.id}" invalid — ${res.reason}` });
          else if (res.kind === 'orphan') F.push({ path: ctx.P.re(r.id, which), message: `${r.id}: ${which}.device_id "${res.id}" resolves in neither devices nor routed_elements (RE_${which.toUpperCase()}_ORPHAN)` });
          else if (res.kind === 'bus_tap') F.push({ severity: 'info', path: ctx.P.re(r.id, which), message: `${r.id}: ${which} is a legal R-2 bus tap → ${res.id} (RE_${which.toUpperCase()}_BUSTAP, §15 amendment 1)` });
          return res;
        };

        if (r.edge_type === 'R-1') {
          if (r.start === undefined || r.end === undefined)
            F.push({ path: ctx.P.re(r.id), message: `${r.id}: R-1 requires start and end keys` });
          report('start', r.start); report('end', r.end);
          if (r.start === null) {
            const role = ctx.sheetRoles ? ctx.sheetRoles[r.sheet_id] : undefined;
            if (ctx.sheetRoles && role !== 'continuation')
              F.push({ path: ctx.P.re(r.id, 'start'), message: `${r.id}: start=null but sheet ${r.sheet_id} role is "${role}" (continuation entry contract requires continuation role)` });
            else
              F.push({ severity: 'info', path: ctx.P.re(r.id, 'start'), message: `${r.id}: start=null continuation entry on ${r.sheet_id}${ctx.sheetRoles ? ' (role=continuation)' : ' (sheet_roles unavailable — lenient)'}` });
            if (r.end === null) F.push({ path: ctx.P.re(r.id, 'end'), message: `${r.id}: continuation entry must still have a resolvable end` });
          }
          if (typeof r.stub_exempt !== 'boolean')
            F.push({ path: ctx.P.re(r.id, 'stub_exempt'), message: `${r.id}: R-1 stub_exempt must be boolean` });
        }
        if (r.edge_type === 'R-2') {
          if (!BUS_LEVELS.includes(r.bus_level))
            F.push({ path: ctx.P.re(r.id, 'bus_level'), message: `${r.id}: bus_level "${r.bus_level}" not in {${BUS_LEVELS.join(', ')}}` });
          if (r.start !== null || r.end !== null || r.stub_exempt !== null)
            F.push({ path: ctx.P.re(r.id), message: `${r.id}: R-2 requires start/end/stub_exempt = null` });
        }
        // forward index: annotation_ids entries resolve and point back
        for (const aid of (Array.isArray(r.annotation_ids) ? r.annotation_ids : [])) {
          const a = ctx.annMap.get(aid);
          if (!a) F.push({ path: ctx.P.re(r.id, 'annotation_ids'), message: `${r.id}: annotation_ids entry "${aid}" not in annotations[]` });
          else if (a.bound_to !== r.id) F.push({ path: ctx.P.re(r.id, 'annotation_ids'), message: `${r.id}: annotation "${aid}" bound_to "${a.bound_to}" ≠ this element` });
        }
      }
      // reverse index — R-1 only per §15 amendment 9; R-2 buses carry []
      for (const a of ctx.anns) {
        if (a.bound_to_type === 'routed_element' && ctx.reMap.has(a.bound_to)) {
          const r = ctx.reMap.get(a.bound_to);
          if (r.edge_type === 'R-1' && !(r.annotation_ids || []).includes(a.id))
            F.push({ path: ctx.P.ann(a.id, 'bound_to'), message: `${a.id}: bound to ${r.id} but missing from its annotation_ids` });
          if (r.edge_type === 'R-2')
            F.push({ severity: 'info', path: ctx.P.ann(a.id, 'bound_to'), message: `${a.id} (${a.annotation_type}) binds to bus ${r.id} — not reverse-indexed per §6/§15 amendment 9` });
        }
      }
      return F;
    },
  },
  {
    id: 'SCHEMA-7', spec_ref: `${S} §7`, title: 'Annotation shape & binding resolution', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      // A-6 content requirements are TV-7's canonical assertion — checked there.
      const CONTENT_REQ = { 'A-1': ['tag_text'], 'A-2': ['callout_text'], 'A-3': ['text'], 'A-4': ['fc_amps'] };
      for (const a of ctx.anns) {
        if (!ANNOTATION_TYPES.includes(a.annotation_type))
          F.push({ path: ctx.P.ann(a.id, 'annotation_type'), message: `${a.id}: annotation_type "${a.annotation_type}" not implemented (A-5 reserved)` });
        if (!isStr(a.bound_to)) F.push({ path: ctx.P.ann(a.id, 'bound_to'), message: `${a.id}: bound_to missing` });
        else if (!(ctx.devMap.has(a.bound_to) || ctx.reMap.has(a.bound_to) || ctx.swMap.has(a.bound_to) || ctx.secMap.has(a.bound_to)))
          F.push({ path: ctx.P.ann(a.id, 'bound_to'), message: `${a.id}: ANN_BOUND_ORPHAN bound_to "${a.bound_to}"` });
        if (!['routed_element','device'].includes(a.bound_to_type))
          F.push({ path: ctx.P.ann(a.id, 'bound_to_type'), message: `${a.id}: bound_to_type "${a.bound_to_type}" invalid` });
        if (!isObj(a.content)) { F.push({ path: ctx.P.ann(a.id, 'content'), message: `${a.id}: content missing` }); continue; }
        for (const k of (CONTENT_REQ[a.annotation_type] || []))
          if (a.content[k] === undefined || a.content[k] === null || a.content[k] === '')
            F.push({ path: ctx.P.ann(a.id, `content.${k}`), message: `${a.id} (${a.annotation_type}): content.${k} missing/empty` });
        if (a.annotation_type === 'A-4' && a.content.fc_amps !== undefined && !isNum(a.content.fc_amps))
          F.push({ path: ctx.P.ann(a.id, 'content.fc_amps'), message: `${a.id}: A-4 content.fc_amps must be a number (whole amps, §15 amendment 4)` });
      }
      return F;
    },
  },
  {
    id: 'SCHEMA-8', spec_ref: `${S} §8`, title: 'Switchboard shape & bus architecture', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const sw of ctx.sws) {
        if (!isStr(sw.designation)) F.push({ path: ctx.P.sw(sw.id, 'designation'), message: `${sw.id}: designation missing` });
        if (!SW_VARIANTS.includes(sw.variant)) F.push({ path: ctx.P.sw(sw.id, 'variant'), message: `${sw.id}: variant "${sw.variant}" invalid` });
        if (!ctx.sheetIds.has(sw.sheet_id)) F.push({ path: ctx.P.sw(sw.id, 'sheet_id'), message: `${sw.id}: sheet_id "${sw.sheet_id}" not in sheets[]` });
        if (!isObj(sw.data_fields)) F.push({ path: ctx.P.sw(sw.id, 'data_fields'), message: `${sw.id}: data_fields missing` });
        const busRef = (id, field, required) => {
          if (id == null) { if (required) F.push({ path: ctx.P.sw(sw.id, field), message: `${sw.id}: ${field} required for bus_architecture "${sw.bus_architecture}"` }); return; }
          const bus = ctx.reMap.get(id);
          if (!bus || bus.edge_type !== 'R-2') F.push({ path: ctx.P.sw(sw.id, field), message: `${sw.id}: ${field} "${id}" is not a valid R-2` });
        };
        if (sw.bus_architecture === 'two-level') {
          busRef(sw.main_bus_id, 'main_bus_id', true); busRef(sw.secondary_bus_id, 'secondary_bus_id', true);
          busRef(sw.distribution_bus_id, 'distribution_bus_id', false);
        } else if (sw.bus_architecture === 'single') {
          busRef(sw.distribution_bus_id, 'distribution_bus_id', true);
          const dbus = ctx.reMap.get(sw.distribution_bus_id);
          if (dbus && dbus.bus_level !== 'distribution')
            F.push({ path: ctx.P.sw(sw.id, 'distribution_bus_id'), message: `${sw.id}: single-architecture bus ${sw.distribution_bus_id} has bus_level "${dbus.bus_level}", expected "distribution"` });
          busRef(sw.main_bus_id, 'main_bus_id', false); busRef(sw.secondary_bus_id, 'secondary_bus_id', false);
        } else F.push({ path: ctx.P.sw(sw.id, 'bus_architecture'), message: `${sw.id}: bus_architecture "${sw.bus_architecture}" invalid` });
        for (const id of (sw.secondary_bus_overflow_ids || [])) busRef(id, 'secondary_bus_overflow_ids[]', false);
      }
      return F;
    },
  },
  {
    id: 'SCHEMA-9', spec_ref: `${S} §9`, title: 'Section shape & membership', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [], sectioned = new Map();
      for (const sec of ctx.secs) {
        if (!ctx.swMap.has(sec.switchboard_id)) F.push({ path: ctx.P.sec(sec.id, 'switchboard_id'), message: `${sec.id}: switchboard_id "${sec.switchboard_id}" invalid` });
        if (!SECTION_TYPES.includes(sec.type))
          F.push({ path: ctx.P.sec(sec.id, 'type'), message: `${sec.id}: type "${sec.type}" invalid` });
        if (!isNum(sec.order)) F.push({ path: ctx.P.sec(sec.id, 'order'), message: `${sec.id}: order missing` });
        if (sec.nec_class !== null && sec.nec_class !== undefined && !NEC_CLASSES.includes(sec.nec_class))
          F.push({ path: ctx.P.sec(sec.id, 'nec_class'), message: `${sec.id}: nec_class "${sec.nec_class}" invalid` });
        if (!Array.isArray(sec.device_ids)) { F.push({ path: ctx.P.sec(sec.id, 'device_ids'), message: `${sec.id}: device_ids missing` }); continue; }
        for (const did of sec.device_ids) {
          if (!ctx.devMap.has(did)) F.push({ path: ctx.P.sec(sec.id, 'device_ids'), message: `${sec.id}: device_ids entry "${did}" invalid` });
          if (sectioned.has(did)) F.push({ path: ctx.P.sec(sec.id, 'device_ids'), message: `device ${did} in multiple sections (${sectioned.get(did)}, ${sec.id})` });
          sectioned.set(did, sec.id);
        }
      }
      return F;
    },
  },
  {
    id: 'SCHEMA-10', spec_ref: `${S} §10`, title: 'Port assignment shape (exactly-one-of)', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      ctx.pas.forEach((pa, i) => {
        if (!isStr(pa.id)) F.push({ path: ctx.P.idx('port_assignments', i), message: `port_assignment missing id` });
        if (!ctx.devMap.has(pa.device_id)) F.push({ path: ctx.P.idx('port_assignments', i, 'device_id'), message: `${pa.id || `[${i}]`}: device_id "${pa.device_id}" invalid` });
        if (!isStr(pa.port)) F.push({ path: ctx.P.idx('port_assignments', i, 'port'), message: `${pa.id || `[${i}]`}: port missing` });
        const shape1 = pa.bus_id !== undefined, shape2 = pa.attached_to_device !== undefined || pa.attached_to_port !== undefined;
        if (shape1 === shape2) F.push({ path: ctx.P.idx('port_assignments', i), message: `${pa.id || `[${i}]`}: exactly one of {bus_id} / {attached_to_device, attached_to_port} required` });
        if (shape1) { const b = ctx.reMap.get(pa.bus_id); if (!b || b.edge_type !== 'R-2') F.push({ path: ctx.P.idx('port_assignments', i, 'bus_id'), message: `${pa.id || `[${i}]`}: bus_id "${pa.bus_id}" not a valid R-2` }); }
        if (shape2 && (!ctx.devMap.has(pa.attached_to_device) || !isStr(pa.attached_to_port)))
          F.push({ path: ctx.P.idx('port_assignments', i), message: `${pa.id || `[${i}]`}: attached_to_device/attached_to_port invalid` });
      });
      return F;
    },
  },
  {
    id: 'SCHEMA-11', spec_ref: `${S} §11`, title: 'Spur attachment FKs', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      ctx.spurs.forEach((sp, i) => {
        if (!ctx.devMap.has(sp.spd_id) || !ctx.devMap.has(sp.target_id))
          F.push({ path: ctx.P.idx('spur_attachments', i), message: `spur ${JSON.stringify(sp)} bad FKs` });
      });
      return F;
    },
  },
  {
    id: 'SCHEMA-12', spec_ref: `${S} §12`, title: 'Measurement attachment canonical dialect', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      ctx.meas.forEach((ma, i) => {
        if (isCanonicalMeas(ma)) {
          if (!ctx.devMap.has(ma.device_id)) F.push({ path: ctx.P.idx('measurement_attachments', i, 'device_id'), message: `${ma.id}: device_id invalid` });
          if (!ctx.reMap.has(ma.host_routed_element_id)) F.push({ path: ctx.P.idx('measurement_attachments', i, 'host_routed_element_id'), message: `${ma.id}: host_routed_element_id invalid` });
        } else if (isLegacyMeas(ma)) {
          // documented legacy dialect (Appendix A deviation A-2) → reported by MIG-2, but FKs still checked
          if (!ctx.devMap.has(ma.meter_id)) F.push({ path: ctx.P.idx('measurement_attachments', i, 'meter_id'), message: `legacy measurement attachment: meter_id "${ma.meter_id}" invalid` });
          if (!ctx.reMap.has(ma.bus_id)) F.push({ path: ctx.P.idx('measurement_attachments', i, 'bus_id'), message: `legacy measurement attachment: bus_id "${ma.bus_id}" invalid` });
        } else {
          F.push({ path: ctx.P.idx('measurement_attachments', i), message: `measurement_attachments[${i}] matches neither canonical {id, device_id, host_routed_element_id, mode, position} nor documented legacy dialect: ${JSON.stringify(ma)}` });
        }
      });
      return F;
    },
  },
  {
    id: 'SCHEMA-13', spec_ref: `${S} §13; §15 amendment 6`, title: 'Cross-sheet ref canonical shape & FKs', severity: 'error', phase: 2, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      ctx.csrefs.forEach((cs, i) => {
        if (isCanonicalXref(cs)) {
          if (!ctx.reMap.has(cs.source_routed_element_id)) F.push({ path: ctx.P.idx('cross_sheet_refs', i), message: `${cs.id}: XS_SRC_ORPHAN "${cs.source_routed_element_id}"` });
          if (!ctx.reMap.has(cs.dest_routed_element_id)) F.push({ path: ctx.P.idx('cross_sheet_refs', i), message: `${cs.id}: XS_DEST_ORPHAN "${cs.dest_routed_element_id}"` });
          if (!ctx.sheetIds.has(cs.source_sheet)) F.push({ path: ctx.P.idx('cross_sheet_refs', i), message: `${cs.id}: XS_SRC_SHEET "${cs.source_sheet}"` });
          if (!ctx.sheetIds.has(cs.dest_sheet)) F.push({ path: ctx.P.idx('cross_sheet_refs', i), message: `${cs.id}: XS_DEST_SHEET "${cs.dest_sheet}"` });
          if (cs.source_sheet === cs.dest_sheet) F.push({ path: ctx.P.idx('cross_sheet_refs', i), message: `${cs.id}: XS_SAME_SHEET` });
        } else if (isLegacyXref(cs)) {
          // documented legacy dialect (Appendix A deviation A-1) → reported by MIG-1, but FKs still checked
          for (const [k, map] of [['feeder_id_source', ctx.reMap], ['feeder_id_dest', ctx.reMap], ['squiggle_id_source', ctx.annMap], ['squiggle_id_dest', ctx.annMap]])
            if (!map.has(cs[k])) F.push({ path: ctx.P.idx('cross_sheet_refs', i, k), message: `${cs.id}: legacy xref ${k} "${cs[k]}" unresolved` });
        } else {
          F.push({ path: ctx.P.idx('cross_sheet_refs', i), message: `cross_sheet_refs[${i}] matches neither canonical cs-NNN directional shape nor documented legacy xref dialect: ${JSON.stringify(cs)}` });
        }
      });
      return F;
    },
  },
  {
    id: 'SCHEMA-14', spec_ref: `${S} §14`, title: 'Geometry block structure', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [], g = ctx.t.geometry;
      if (!g) return F;
      // §14 key whitelist, split into REQUIRED and OPTIONAL. `sections` and
      // `equipment_labels` (§14.7/§14.8) are documented but
      // NOT required: an older geometry block legitimately lacks them, and
      // the add-in's DTOs likewise default empty-never-null. Same
      // validated-only-when-present policy as device w/h/anchor_mode (§14.1)
      // and the A-1 pill. The undocumented-key check runs against the UNION,
      // so the whitelist stays closed.
      // GK_REQUIRED / GK_OPTIONAL + the §14 key lists/enums below are shared with
      // the conformance walk via 03_contracts/geometry_schema_data.mjs.
      const GK = [...GK_REQUIRED, ...GK_OPTIONAL];
      for (const k of GK_REQUIRED) if (!(k in g)) F.push({ path: `geometry.${k}`, message: `geometry missing required key "${k}"` });
      for (const k of Object.keys(g)) if (!GK.includes(k)) F.push({ path: `geometry.${k}`, message: `geometry has undocumented key "${k}"` });
      if (!isNum(g.effective_px_per_inch)) F.push({ path: 'geometry.effective_px_per_inch', message: 'effective_px_per_inch not a number' });
      if (!isObj(g.content_area) || !isNum(g.content_area.width_px) || !isNum(g.content_area.height_px))
        F.push({ path: 'geometry.content_area', message: 'content_area must be {width_px, height_px}' });
      // w/h/anchor_mode emitted (§14.1) — validated
      // when present; absence stays legal (older geometry).
      // ANCHOR_MODES shared (geometry_schema_data.mjs).
      for (const [id, d] of Object.entries(g.devices || {})) {
        if (!ctx.devMap.has(id)) F.push({ path: `geometry.devices.${id}`, message: `geometry.devices key "${id}" not a topology device` });
        if (!isObj(d.anchor) || !isNum(d.anchor.x) || !isNum(d.anchor.y)) F.push({ path: `geometry.devices.${id}.anchor`, message: `anchor malformed` });
        if ('w' in d && !isNum(d.w)) F.push({ path: `geometry.devices.${id}.w`, message: 'w not a number' });
        if ('h' in d && !isNum(d.h)) F.push({ path: `geometry.devices.${id}.h`, message: 'h not a number' });
        if ('anchor_mode' in d && !ANCHOR_MODES.includes(d.anchor_mode))
          F.push({ path: `geometry.devices.${id}.anchor_mode`, message: `anchor_mode "${d.anchor_mode}" not in {${ANCHOR_MODES.join(', ')}}` });
      }
      for (const [id, r] of Object.entries(g.routed_elements || {})) {
        if (!ctx.reMap.has(id)) F.push({ path: `geometry.routed_elements.${id}`, message: `geometry.routed_elements key "${id}" not a topology routed element` });
        if (!Array.isArray(r.path_vertices) || r.path_vertices.length < 2 || !r.path_vertices.every(p => isNum(p.x) && isNum(p.y)))
          F.push({ path: `geometry.routed_elements.${id}.path_vertices`, message: `path_vertices malformed` });
      }
      for (const [id, a] of Object.entries(g.annotations || {})) {
        if (!ctx.annMap.has(id)) F.push({ path: `geometry.annotations.${id}`, message: `geometry.annotations key "${id}" not a topology annotation` });
        if (!isNum(a.x) || !isNum(a.y)) F.push({ path: `geometry.annotations.${id}`, message: `must be {x, y}` });
        // A-1 pill center emitted (§14.1) — when present.
        if ('pill' in a && (!isObj(a.pill) || !isNum(a.pill.x) || !isNum(a.pill.y)))
          F.push({ path: `geometry.annotations.${id}.pill`, message: 'pill malformed (must be {x, y})' });
        // A-3 resolved squiggle label emitted (§14.1) —
        // when present. x/y = the SVG text anchor point (y is the BASELINE),
        // anchor = the SVG text-anchor keyword, text = the drawn string.
        if ('label' in a && (!isObj(a.label) || !isNum(a.label.x) || !isNum(a.label.y)
            || !ANNOTATION_LABEL_ANCHORS.includes(a.label.anchor)
            || typeof a.label.text !== 'string' || a.label.text.length === 0))
          F.push({ path: `geometry.annotations.${id}.label`, message: 'label malformed (must be {x, y, anchor: start|middle|end, text})' });
      }
      // level_lines (schema §14.6, emitted) — ordered array of
      // {sheet, level, label, y, x_start, x_end}; sheet must resolve in sheets[].
      if (!Array.isArray(g.level_lines)) {
        F.push({ path: 'geometry.level_lines', message: 'level_lines must be an array (§14.6)' });
      } else {
        const sheetIds = new Set((ctx.t.sheets || []).map(s => s.sheet_id));
        g.level_lines.forEach((ll, i) => {
          if (!isObj(ll) || !isStr(ll.sheet) || !isStr(ll.level) || !isStr(ll.label) || !isNum(ll.y) || !isNum(ll.x_start) || !isNum(ll.x_end))
            F.push({ path: `geometry.level_lines[${i}]`, message: 'level line must be {sheet, level, label, y, x_start, x_end} (§14.6)' });
          else if (!sheetIds.has(ll.sheet))
            F.push({ path: `geometry.level_lines[${i}].sheet`, message: `level line sheet "${ll.sheet}" not in topology sheets[]` });
        });
      }
      // sections (§14.7, emitted) — id-keyed object
      // mirroring geometry.devices, so it gets the FK check for free. Flat
      // x/y/w/h; L1-2 is definitionally top-left anchored, so no anchor_mode.
      // `sheet` is required per-record: topology.sections[] carries no sheet_id
      // (§9), so it is the only way the add-in can filter per sheet.
      if ('sections' in g) {
        const sheetIds = new Set((ctx.t.sheets || []).map(s => s.sheet_id));
        if (!isObj(g.sections) || Array.isArray(g.sections)) {
          F.push({ path: 'geometry.sections', message: 'sections must be an id-keyed object (§14.7)' });
        } else {
          // SEC_KEYS shared (geometry_schema_data.mjs).
          for (const [id, sec] of Object.entries(g.sections)) {
            const t = ctx.secMap.get(id);
            if (!t) F.push({ path: `geometry.sections.${id}`, message: `geometry.sections key "${id}" not a topology section` });
            if (!isObj(sec) || !isNum(sec.x) || !isNum(sec.y) || !isNum(sec.w) || !isNum(sec.h))
              F.push({ path: `geometry.sections.${id}`, message: 'section must carry numeric {x, y, w, h} (§14.7)' });
            // closed per-record key whitelist — mirrors the top-level GK discipline
            if (isObj(sec)) for (const k of Object.keys(sec))
              if (!SEC_KEYS.includes(k)) F.push({ path: `geometry.sections.${id}.${k}`, message: `undocumented section key "${k}" (§14.7)` });
            if (!isStr(sec.sheet)) F.push({ path: `geometry.sections.${id}.sheet`, message: 'section missing required "sheet" (§14.7)' });
            else if (!sheetIds.has(sec.sheet)) F.push({ path: `geometry.sections.${id}.sheet`, message: `section sheet "${sec.sheet}" not in topology sheets[]` });
            if (!isStr(sec.switchboard_id) || !ctx.swMap.has(sec.switchboard_id))
              F.push({ path: `geometry.sections.${id}.switchboard_id`, message: `switchboard_id "${sec.switchboard_id}" not a topology switchboard` });
            // ECHO CHECKS — the geometry record must agree with the topology section it
            // keys off. Without these a section can name a real-but-WRONG switchboard,
            // sit on the wrong sheet, or carry a mutated type/section_tag and still pass:
            // those last two are exactly what the DEADARMS add-in places, so a silently
            // wrong record would place wrong in Revit with every gate green.
            if (t) {
              if (sec.switchboard_id !== t.switchboard_id)
                F.push({ path: `geometry.sections.${id}.switchboard_id`, message: `switchboard_id "${sec.switchboard_id}" ≠ topology section's "${t.switchboard_id}"` });
              if (sec.type !== t.type)
                F.push({ path: `geometry.sections.${id}.type`, message: `type "${sec.type}" ≠ topology section's "${t.type}"` });
              if ((sec.section_tag ?? null) !== (t.section_tag ?? null))
                F.push({ path: `geometry.sections.${id}.section_tag`, message: `section_tag ${JSON.stringify(sec.section_tag)} ≠ topology section's ${JSON.stringify(t.section_tag ?? null)}` });
              if ((sec.nec_class ?? null) !== (t.nec_class ?? null))
                F.push({ path: `geometry.sections.${id}.nec_class`, message: `nec_class ${JSON.stringify(sec.nec_class)} ≠ topology section's ${JSON.stringify(t.nec_class ?? null)}` });
              // topology.sections[] has no sheet_id (§9) — the parent switchboard owns it
              const psw = ctx.swMap.get(t.switchboard_id);
              if (psw && isStr(psw.sheet_id) && sec.sheet !== psw.sheet_id)
                F.push({ path: `geometry.sections.${id}.sheet`, message: `sheet "${sec.sheet}" ≠ parent switchboard ${t.switchboard_id}'s sheet "${psw.sheet_id}"` });
            }
          }
        }
      }
      // equipment_labels (A-8, §14.8, emitted) — ordered
      // ARRAY, deliberately not merged into geometry.annotations (that dict is
      // FK-validated against topology.annotations[] and A-8 has no topology
      // instance; A-8 is derived geometry-only exactly as A-7 is). bound_to
      // reuses the §7 annotation vocabulary verbatim and must resolve against
      // devices ∪ routed_elements ∪ switchboards ∪ sections.
      if ('equipment_labels' in g) {
        const sheetIds = new Set((ctx.t.sheets || []).map(s => s.sheet_id));
        const BOUND_TYPES = ['switchboard', 'section', 'device'];
        // `first_line_pitch` sits in the whitelist but is validated
        // ONLY-WHEN-PRESENT below — exactly like device w/h/anchor_mode and the
        // A-1 pill. Requiring it would hard-fail every older export the
        // moment this lands: the same trap that forced the GK_REQUIRED /
        // GK_OPTIONAL split at block level.
        // EL_KEYS shared (geometry_schema_data.mjs).
        if (!Array.isArray(g.equipment_labels)) {
          F.push({ path: 'geometry.equipment_labels', message: 'equipment_labels must be an array (§14.8)' });
        } else {
          g.equipment_labels.forEach((el, i) => {
            const P = `geometry.equipment_labels[${i}]`;
            if (!isObj(el)) { F.push({ path: P, message: 'equipment label must be an object (§14.8)' }); return; }
            for (const k of Object.keys(el))
              if (!EL_KEYS.includes(k)) F.push({ path: `${P}.${k}`, message: `undocumented equipment-label key "${k}" (§14.8)` });
            // sheet echo: a switchboard-bound label must sit on its host's sheet
            if (el.bound_to_type === 'switchboard' && ctx.swMap.has(el.bound_to)) {
              const hs = ctx.swMap.get(el.bound_to).sheet_id;
              if (isStr(hs) && el.sheet !== hs)
                F.push({ path: `${P}.sheet`, message: `sheet "${el.sheet}" ≠ host switchboard ${el.bound_to}'s sheet "${hs}"` });
            }
            // device-bound labels (gen L1-5 / fire-pump L3-1) echo
            // their host DEVICE's sheet the same way.
            if (el.bound_to_type === 'device' && ctx.devMap.has(el.bound_to)) {
              const hs = ctx.devMap.get(el.bound_to).sheet_id;
              if (isStr(hs) && el.sheet !== hs)
                F.push({ path: `${P}.sheet`, message: `sheet "${el.sheet}" ≠ host device ${el.bound_to}'s sheet "${hs}"` });
            }
            if (!isStr(el.sheet)) F.push({ path: `${P}.sheet`, message: 'missing required "sheet" (§14.8)' });
            else if (!sheetIds.has(el.sheet)) F.push({ path: `${P}.sheet`, message: `sheet "${el.sheet}" not in topology sheets[]` });
            if (!BOUND_TYPES.includes(el.bound_to_type))
              F.push({ path: `${P}.bound_to_type`, message: `bound_to_type "${el.bound_to_type}" not in {${BOUND_TYPES.join(', ')}}` });
            if (!isStr(el.bound_to) || !(ctx.devMap.has(el.bound_to) || ctx.reMap.has(el.bound_to) || ctx.swMap.has(el.bound_to) || ctx.secMap.has(el.bound_to)))
              F.push({ path: `${P}.bound_to`, message: `bound_to "${el.bound_to}" resolves in none of devices/routed_elements/switchboards/sections` });
            if (!isObj(el.anchor) || !isNum(el.anchor.x) || !isNum(el.anchor.y))
              F.push({ path: `${P}.anchor`, message: 'anchor malformed (must be {x, y})' });
            if (!isNum(el.line_pitch)) F.push({ path: `${P}.line_pitch`, message: 'line_pitch not a number' });
            // Optional: the label→lines[0] step, which the catalog
            // restyle widened to 20 while every later step stays `line_pitch`.
            if ('first_line_pitch' in el && !isNum(el.first_line_pitch))
              F.push({ path: `${P}.first_line_pitch`, message: 'first_line_pitch not a number (§14.8)' });
            // align is an ENUM, not a free string — "end" for the
            // right-anchored switchboard blocks (anchor at the first line's
            // RIGHT end), "start" for device-bound gen/fire-pump blocks
            // (anchor at the first line's LEFT end, text grows rightward).
            if (!EL_ALIGN.includes(el.align))
              F.push({ path: `${P}.align`, message: `align "${el.align}" not in {end, start} (§14.8)` });
            if (!isStr(el.label)) F.push({ path: `${P}.label`, message: 'label not a string' });
            if (!Array.isArray(el.lines) || !el.lines.every(isStr))
              F.push({ path: `${P}.lines`, message: 'lines must be an array of strings (post-compaction, §14.8)' });
          });
        }
      }
      // glyph_supplements (§14.9, emitted) — ordered
      // ARRAY of engine-drawn connecting linework with NO topology instance
      // (today: the utility primary feed polyline + its TO-UTILITY squiggle,
      // drawn inline by the utility block — no R-1 / no A-3 in TOPO, the
      // pre-existing data-model gap the export now closes for geometry
      // consumers). Validated ONLY-WHEN-PRESENT: older exports stay legal,
      // same policy as sections/equipment_labels.
      if ('glyph_supplements' in g) {
        const sheetIds = new Set((ctx.t.sheets || []).map(s => s.sheet_id));
        // GS_KINDS / GS_KEYS shared (geometry_schema_data.mjs).
        if (!Array.isArray(g.glyph_supplements)) {
          F.push({ path: 'geometry.glyph_supplements', message: 'glyph_supplements must be an array (§14.9)' });
        } else {
          const seenIds = new Set();
          g.glyph_supplements.forEach((gs, i) => {
            const P = `geometry.glyph_supplements[${i}]`;
            if (!isObj(gs)) { F.push({ path: P, message: 'glyph supplement must be an object (§14.9)' }); return; }
            if (!isStr(gs.id)) F.push({ path: `${P}.id`, message: 'missing required "id" (§14.9)' });
            else if (seenIds.has(gs.id)) F.push({ path: `${P}.id`, message: `duplicate glyph-supplement id "${gs.id}"` });
            else seenIds.add(gs.id);
            if (!isStr(gs.sheet)) F.push({ path: `${P}.sheet`, message: 'missing required "sheet" (§14.9)' });
            else if (!sheetIds.has(gs.sheet)) F.push({ path: `${P}.sheet`, message: `sheet "${gs.sheet}" not in topology sheets[]` });
            if (!GS_KINDS.includes(gs.kind)) { F.push({ path: `${P}.kind`, message: `kind "${gs.kind}" not in {${GS_KINDS.join(', ')}}` }); return; }
            for (const k of Object.keys(gs))
              if (!GS_KEYS[gs.kind].includes(k)) F.push({ path: `${P}.${k}`, message: `undocumented glyph-supplement key "${k}" (§14.9)` });
            if (!isStr(gs.host_device_id) || !ctx.devMap.has(gs.host_device_id))
              F.push({ path: `${P}.host_device_id`, message: `host_device_id "${gs.host_device_id}" not a topology device` });
            if (!isStr(gs.role)) F.push({ path: `${P}.role`, message: 'role not a string (§14.9)' });
            if (gs.kind === 'polyline') {
              if (!Array.isArray(gs.vertices) || gs.vertices.length < 2 || !gs.vertices.every(p => isObj(p) && isNum(p.x) && isNum(p.y)))
                F.push({ path: `${P}.vertices`, message: 'vertices malformed (≥2 of {x, y}, §14.9)' });
            } else {
              if (!isNum(gs.x) || !isNum(gs.y)) F.push({ path: P, message: 'squiggle must carry numeric {x, y} (§14.9)' });
              if (!isStr(gs.text)) F.push({ path: `${P}.text`, message: 'text not a string (§14.9)' });
              if (!isStr(gs.text_side)) F.push({ path: `${P}.text_side`, message: 'text_side not a string (§14.9)' });
              if (!isStr(gs.orient)) F.push({ path: `${P}.orient`, message: 'orient not a string (§14.9)' });
            }
          });
        }
      }
      // bus_dots (§14.10, emitted) — ordered ARRAY of the
      // inline bus connection dots the engine draws at feeder×busbar junctions
      // (today the incoming feeder × main-bus dot). Validated ONLY-WHEN-PRESENT:
      // older exports stay legal, same policy as glyph_supplements. NOTE:
      // host_device_id FKs a topology SECTION (not a device) — the dot taps a
      // section's bus.
      if ('bus_dots' in g) {
        const sheetIds = new Set((ctx.t.sheets || []).map(s => s.sheet_id));
        const secIds = new Set((ctx.t.sections || []).map(s => s.id));
        // BD_KEYS shared (geometry_schema_data.mjs).
        if (!Array.isArray(g.bus_dots)) {
          F.push({ path: 'geometry.bus_dots', message: 'bus_dots must be an array (§14.10)' });
        } else {
          const seenIds = new Set();
          g.bus_dots.forEach((bd, i) => {
            const P = `geometry.bus_dots[${i}]`;
            if (!isObj(bd)) { F.push({ path: P, message: 'bus dot must be an object (§14.10)' }); return; }
            if (!isStr(bd.id)) F.push({ path: `${P}.id`, message: 'missing required "id" (§14.10)' });
            else if (seenIds.has(bd.id)) F.push({ path: `${P}.id`, message: `duplicate bus-dot id "${bd.id}"` });
            else seenIds.add(bd.id);
            if (!isStr(bd.sheet)) F.push({ path: `${P}.sheet`, message: 'missing required "sheet" (§14.10)' });
            else if (!sheetIds.has(bd.sheet)) F.push({ path: `${P}.sheet`, message: `sheet "${bd.sheet}" not in topology sheets[]` });
            for (const k of Object.keys(bd))
              if (!BD_KEYS.includes(k)) F.push({ path: `${P}.${k}`, message: `undocumented bus-dot key "${k}" (§14.10)` });
            if (!isStr(bd.host_device_id) || !secIds.has(bd.host_device_id))
              F.push({ path: `${P}.host_device_id`, message: `host_device_id "${bd.host_device_id}" not a topology section` });
            if (!isStr(bd.role)) F.push({ path: `${P}.role`, message: 'role not a string (§14.10)' });
            if (!isNum(bd.x) || !isNum(bd.y)) F.push({ path: P, message: 'bus dot must carry numeric {x, y} (§14.10)' });
          });
        }
      }
      if (!Array.isArray(g.layout_warnings) || !g.layout_warnings.every(isStr))
        F.push({ path: 'geometry.layout_warnings', message: 'layout_warnings must be array of strings' });
      F.push({ severity: 'info', path: 'geometry', message: `partial coverage: devices ${Object.keys(g.devices || {}).length}/${ctx.devices.length}, routed ${Object.keys(g.routed_elements || {}).length}/${ctx.routed.length}, annotations ${Object.keys(g.annotations || {}).length}/${ctx.anns.length} (defined semantics §14.2)` });
      return F;
    },
  },
];
