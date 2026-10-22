// 08_validation/rules/mig_rules_V1_0_0.mjs — MIG family: documented-intentional
// legacy-dialect detectors, mapping 1:1 onto schema V1.1.0 Appendix A deviations A-1/A-2/A-3.
// Severity `migration`: reported (exit code 2), never fatal. Each rule emits ONE grouped
// finding per file, so a topology in the legacy dialect surfaces exactly the 3 Appendix-A
// deviations; migrating it to the canonical dialect drops the findings to 0 with no
// validator change. (The rules stay active but are fixture-less.)
import { isObj } from '../lib/context_V1_0_0.mjs';

const A = '03_contracts/sld_topology_schema_V1_0_0.md Appendix A';

export const MIG_RULES = [
  {
    id: 'MIG-1', spec_ref: `${A} deviation A-1; §13`, title: 'cross_sheet_refs in transitional flat xref-NNN dialect', severity: 'migration', phase: 2, requires: [], status: 'active',
    check(ctx) {
      if (!ctx.legacyCs.length) return [];
      const firstIdx = ctx.csrefs.findIndex(cs => ctx.legacyCs.includes(cs));
      return [{
        path: ctx.P.idx('cross_sheet_refs', firstIdx),
        message: `${ctx.legacyCs.length} entr${ctx.legacyCs.length === 1 ? 'y' : 'ies'} (${ctx.legacyCs.map(c => c.id).join(', ')}) in the transitional flat xref shape — migrate to the §13 directional cs-NNN shape`,
      }];
    },
  },
  {
    id: 'MIG-2', spec_ref: `${A} deviation A-2; §12`, title: 'measurement_attachments in deprecated {meter_id, bus_id, attachment_mode} dialect', severity: 'migration', phase: 1, requires: [], status: 'active',
    check(ctx) {
      if (!ctx.legacyMeas.length) return [];
      const firstIdx = ctx.meas.findIndex(ma => ctx.legacyMeas.includes(ma));
      return [{
        path: ctx.P.idx('measurement_attachments', firstIdx),
        message: `${ctx.legacyMeas.length} entr${ctx.legacyMeas.length === 1 ? 'y' : 'ies'} in the deprecated dialect — migrate to canonical {id, device_id, host_routed_element_id, mode, position}`,
      }];
    },
  },
  {
    id: 'MIG-3', spec_ref: `${A} deviation A-3; §5.1/§8`, title: 'Presentation-dialect data_fields / device-level type discriminators', severity: 'migration', phase: 1, requires: [], status: 'active',
    // Fires on devices whose data_fields carry presentation keys (label / line_N) or that
    // carry variant/mode/nec_class at device level (legal on switchboards per §8, not on
    // devices — V1.1 §5.1 moved discriminators inside data_fields). Hospital: 0 hits.
    check(ctx) {
      const presentation = [], discriminators = [];
      for (const d of ctx.devices) {
        if (isObj(d.data_fields) && Object.keys(d.data_fields).some(k => k === 'label' || /^line_\d+$/.test(k)))
          presentation.push(d.id);
        if (['variant', 'mode', 'nec_class'].some(k => d[k] !== undefined))
          discriminators.push(d.id);
      }
      if (!presentation.length && !discriminators.length) return [];
      const anchor = presentation[0] ?? discriminators[0];
      const parts = [];
      if (presentation.length) parts.push(`${presentation.length} device(s) with presentation data_fields (label/line_N)`);
      if (discriminators.length) parts.push(`${discriminators.length} device(s) with device-level variant/mode/nec_class discriminators`);
      return [{
        path: ctx.P.dev(anchor, 'data_fields'),
        message: `${parts.join('; ')} — migrate to the §5.1 semantic data_fields vocabulary (first instance anchored; e.g. ${[...presentation, ...discriminators].slice(0, 5).join(', ')})`,
      }];
    },
  },
];
