// 08_validation/rules/index_V1_0_0.mjs — flat rule registry.
// Execution order follows rules_V1_0_0.md §7 "Validation Execution Order":
// Phase 1 per-sheet topology, then Phase 2 global/cross-sheet, then Phase 3 geometry
// preflight (sld_preflight_V1_0_0.md, WITH_GEOMETRY topologies only). The engine sorts
// by the `phase` field; within a phase, registry order is the spec's family order.
import { SCHEMA_RULES } from './schema_rules_V1_0_0.mjs';
import { TI_RULES } from './ti_rules_V1_0_0.mjs';
import { CV_RULES } from './cv_rules_V1_0_0.mjs';
import { TV_RULES } from './tv_rules_V1_0_0.mjs';
import { SV_RULES } from './sv_rules_V1_0_0.mjs';
import { DV_RULES } from './dv_rules_V1_0_0.mjs';
import { MIG_RULES } from './mig_rules_V1_0_0.mjs';
import { SH_RULES } from './sh_rules_V1_0_0.mjs';

export const RULES = [
  ...SCHEMA_RULES,
  ...TI_RULES,
  ...CV_RULES,
  ...TV_RULES,
  ...SV_RULES,
  ...DV_RULES,
  ...MIG_RULES,
  ...SH_RULES,
];

// sanity: no duplicate rule ids
{
  const seen = new Set();
  for (const r of RULES) {
    if (seen.has(r.id)) throw new Error(`duplicate rule id in registry: ${r.id}`);
    seen.add(r.id);
  }
}
