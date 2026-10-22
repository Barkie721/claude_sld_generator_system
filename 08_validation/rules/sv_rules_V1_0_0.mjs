// 08_validation/rules/sv_rules_V1_0_0.mjs — Spur Validation (SV-1, SV-2).
// Catalog: 02_specs/drafting/sld_topology_rules_V1_0_0.md §7 "Spur Validation".
// SV-3 is an exemption DEFINITION, not a check — it is codified as the ctx helpers
// isSpdModeB / isSpareOrSpace consumed by TV-1/TV-2/CV-2/CV-3 scoping, and listed
// in the rule inventory as "codified as exemption".
// Both reference topologies carry 0 spur_attachments and only Mode-A SPDs today,
// so these rules pass by absence of data.

const RSPEC = '02_specs/drafting/sld_topology_rules_V1_0_0.md §7';

export const SV_RULES = [
  {
    id: 'SV-1', spec_ref: `${RSPEC} SV-1`, title: 'Mode-B SPD spur-attaches to exactly one panelboard', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      const spursBySpd = new Map();
      for (const sp of ctx.spurs) {
        if (!spursBySpd.has(sp.spd_id)) spursBySpd.set(sp.spd_id, []);
        spursBySpd.get(sp.spd_id).push(sp);
      }
      for (const d of (ctx.devsByType.get('L2-6') || []).filter(d => ctx.isSpdModeB(d))) {
        const spurs = spursBySpd.get(d.id) || [];
        if (spurs.length !== 1) {
          F.push({ path: ctx.P.dev(d.id), message: `${d.id} (SPD Mode B): ${spurs.length} spur attachments (expected exactly 1)` });
          continue;
        }
        const target = ctx.devMap.get(spurs[0].target_id);
        if (!target || target.node_type !== 'L2-4')
          F.push({ path: ctx.P.dev(d.id), message: `${d.id} (SPD Mode B): spur target ${spurs[0].target_id} is ${target ? target.node_type : 'unresolved'} — only L2-4 panelboards are valid` });
      }
      // any spur whose spd_id is not a Mode-B SPD is also a violation
      for (const sp of ctx.spurs) {
        const spd = ctx.devMap.get(sp.spd_id);
        if (spd && !ctx.isSpdModeB(spd))
          F.push({ path: ctx.P.dev(sp.spd_id), message: `spur attachment on ${sp.spd_id} (${spd.node_type}, mode ${ctx.spdMode(spd) ?? '?'}) — only L2-6 SPD Mode B may spur-attach` });
      }
      return F;
    },
  },
  {
    id: 'SV-2', spec_ref: `${RSPEC} SV-2`, title: 'No panelboard carries more than one Mode-B SPD spur', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      const byTarget = new Map();
      for (const sp of ctx.spurs) {
        if (!byTarget.has(sp.target_id)) byTarget.set(sp.target_id, []);
        byTarget.get(sp.target_id).push(sp.spd_id);
      }
      for (const [tid, spds] of byTarget)
        if (spds.length > 1)
          F.push({ path: ctx.P.dev(tid), message: `${tid}: ${spds.length} SPDs spur-attached (${spds.join(', ')}) — maximum 1` });
      return F;
    },
  },
];
