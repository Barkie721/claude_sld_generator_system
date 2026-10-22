// 08_validation/rules/ti_rules_V1_0_0.mjs — Topology Integrity (TI-1..TI-4) + SH-1.
// Catalog: 02_specs/drafting/sld_topology_rules_V1_0_0.md §7 "Topology Integrity".
// V1.1 amendment 7: TI-3 designation uniqueness spans devices ∪ switchboards, nulls excluded.
import { buildGraph } from '../lib/graph_V1_0_0.mjs';

const RSPEC = '02_specs/drafting/sld_topology_rules_V1_0_0.md §7';

export const TI_RULES = [
  {
    id: 'SH-1', spec_ref: `${RSPEC} SH-1`, title: 'Every device/routed element/annotation references a valid sheet', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const d of ctx.devices) if (!ctx.sheetIds.has(d.sheet_id))
        F.push({ path: ctx.P.dev(d.id, 'sheet_id'), message: `${d.id}: sheet_id "${d.sheet_id}" not in sheets[]` });
      for (const r of ctx.routed) if (!ctx.sheetIds.has(r.sheet_id))
        F.push({ path: ctx.P.re(r.id, 'sheet_id'), message: `${r.id}: sheet_id "${r.sheet_id}" not in sheets[]` });
      for (const a of ctx.anns) if (!ctx.sheetIds.has(a.sheet_id))
        F.push({ path: ctx.P.ann(a.id, 'sheet_id'), message: `${a.id}: sheet_id "${a.sheet_id}" not in sheets[]` });
      return F;
    },
  },
  {
    id: 'TI-1', spec_ref: `${RSPEC} TI-1`, title: 'Every terminal device reachable from an L0/generator source', severity: 'error', phase: 2, requires: ['graph'], status: 'active',
    check(ctx) {
      const F = [];
      const g = buildGraph(ctx);
      const SOURCE_TYPES = ['L0-1', 'L0-2', 'L1-5'];
      const TERMINAL_TYPES = ['L2-4', 'L3-1', 'L3-2', 'L3-3'];
      const sources = SOURCE_TYPES.flatMap(nt => (ctx.devsByType.get(nt) || []).map(d => g.D(d.id)));
      if (!sources.length) return F; // no sources modeled — nothing to assert
      const seen = g.reachableFrom(sources);
      for (const nt of TERMINAL_TYPES)
        for (const d of (ctx.devsByType.get(nt) || []))
          if (!seen.has(g.D(d.id)))
            F.push({ path: ctx.P.dev(d.id), message: `${d.id} (${d.node_type} ${d.designation ?? '(no designation)'}): unreachable from any L0-class source or generator` });
      return F;
    },
  },
  {
    id: 'TI-2', spec_ref: `${RSPEC} TI-2 (NEC 700.10)`, title: 'Normal and emergency R-2 buses disjoint', severity: 'error', phase: 2, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      const byVariant = { NP: new Set(), EM: new Set() };
      for (const sw of ctx.sws) {
        const set = byVariant[sw.variant];
        if (!set) continue;
        for (const id of [sw.main_bus_id, sw.secondary_bus_id, sw.distribution_bus_id, ...(sw.secondary_bus_overflow_ids || [])])
          if (id != null && ctx.reMap.has(id)) set.add(id);
      }
      for (const id of byVariant.NP) if (byVariant.EM.has(id))
        F.push({ path: ctx.P.re(id), message: `bus ${id} referenced by both NP and EM switchboards (NEC 700.10 separation)` });
      return F;
    },
  },
  {
    id: 'TI-3', spec_ref: `${RSPEC} TI-3; schema V1.1 §15 amendment 7`, title: 'Designation uniqueness across devices ∪ switchboards', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const [desig, owners] of ctx.desigOwners)
        if (owners.length > 1)
          F.push({ path: owners[0].kind === 'device' ? ctx.P.dev(owners[0].id, 'designation') : ctx.P.sw(owners[0].id, 'designation'),
            message: `duplicate designation "${desig}" (${owners.map(o => `${o.kind} ${o.id}`).join(', ')})` });
      return F;
    },
  },
  {
    id: 'TI-4', spec_ref: `${RSPEC} TI-4; 07_data equipment_designation_legend`, title: 'Designations follow the legend pattern (calibration: error)', severity: 'error', phase: 1, requires: ['data:equipment_designation_legend_V1_0_0.json'], status: 'active',
    // Severity: TI-4 cannot gate at error while the goldens carry designations the legend
    // cannot express. The goldens carried 32 such designations (hospital 28: C…/EQ… NEC-517
    // branch prefixes, GEN-1, E4FP-1-A; plus 4: FUT infix, E4G-1-A, 4MSB/E4MSB — inventory in rules §7). Ramiro's decision was
    // to EXTEND THE LEGEND (not narrow TI-4's scope). The extended legend
    // added power_type codes C/EQ, equipment codes MSB/G/FP, and a data-driven special_designations
    // mechanism (exact-match allowlist for GEN-1; FUT future/spare infix for 4S-FUT-1-A). All 32
    // gaps closed → both goldens produce zero TI-4 findings at warning, so TI-4 now gates at error.
    // That extended legend is the one pinned in the requires array and the ctx.data() call below;
    // after the V1_0_0 baseline reset its filename is equipment_designation_legend_V1_0_0.json,
    // so the pin reads V1_0_0 again — same FILE, not a revert to the older narrower legend.
    // Accessory designations (CB-03, NG-BOND, SPD-MSB, UTIL-MTR, SPACE-01,
    // MAIN-GFP…) remain excluded by node_type scoping; the legend's spaced en-dash ≡ the data's
    // compact hyphen.
    check(ctx) {
      const leg = ctx.data('equipment_designation_legend_V1_0_0.json');
      if (!leg) return [];
      const power = (leg.power_type?.values || []).map(v => v.code).filter(Boolean);
      const volt = (leg.voltage?.values || []).map(v => v.code);
      const equip = (leg.equipment?.values || []).map(v => v.code);
      const longestFirst = a => [...a].sort((x, y) => y.length - x.length);
      const norm = s => s.replace(/\s*[–—-]\s*/g, '-'); // spaced en-dash ≡ compact hyphen
      // Data-driven special designations (legend): exact-match allowlist for tags
      // outside the segment grammar (e.g. GEN-1), and infix codes permitted optionally
      // between the equipment and level segments (e.g. the FUT future/spare infix in 4S-FUT-1-A).
      const allow = new Set((leg.special_designations?.exact_match || []).map(e => norm(e.designation)));
      const infix = (leg.special_designations?.infix_rules || []).map(r => r.code).filter(Boolean);
      const inf = infix.length ? `(?:(?:${longestFirst(infix).join('|')})-)?` : '';
      const rx = new RegExp(`^(${longestFirst(power).join('|')})?(${longestFirst(volt).join('|')})(${longestFirst(equip).join('|')})-${inf}([A-Za-z0-9]+)-([A-Za-z0-9]+)$`);
      const ok = d => allow.has(norm(d)) || rx.test(norm(d));
      const SCOPED_TYPES = new Set(['L2-2', 'L2-3', 'L2-4', 'L3-1', 'L1-5']);
      const bad = [];
      for (const d of ctx.devices)
        if (SCOPED_TYPES.has(d.node_type) && d.designation != null && d.designation !== '' && !ok(d.designation))
          bad.push(`${d.id}:${d.designation}`);
      for (const sw of ctx.sws)
        if (sw.designation != null && sw.designation !== '' && !ok(sw.designation))
          bad.push(`${sw.id}:${sw.designation}`);
      if (!bad.length) return [];
      return [{ path: 'devices', message: `${bad.length} designation(s) do not match the legend pattern: ${bad.join(', ')}` }];
    },
  },
];
