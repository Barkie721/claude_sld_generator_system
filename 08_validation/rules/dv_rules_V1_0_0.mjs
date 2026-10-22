// 08_validation/rules/dv_rules_V1_0_0.mjs — Data Consistency (DV-1..DV-15).
// Catalog: 02_specs/drafting/sld_topology_rules_V1_0_0.md §7 "Data Consistency".
// The fc-comparison rules (DV-4/5/11/12/13) read operands from calc_fields (falling back
// to data_fields) and no-op when a side is absent — on both reference topologies today
// available_fc is unpopulated, so they pass by absence of data, not by proof.
// DV-1/2/6/7/8 are DEFERRED: their schedule-join semantics (feeder_schedule row keying,
// the §4 callout algorithm, two-hop transformer lookup) are not pinned tightly enough in
// the rules doc to enforce without a spec session; generator/Variant-G exemptions add
// further surface. Registered with status 'deferred' so the inventory stays honest.

const RSPEC = '02_specs/drafting/sld_topology_rules_V1_0_0.md §7';

const num = v => (typeof v === 'number' ? v : null);
const field = (owner, k) => num(owner?.calc_fields?.[k]) ?? num(owner?.data_fields?.[k]);

const deferred = (id, assertion, reason) => ({
  id, spec_ref: `${RSPEC} ${id}`, title: assertion, severity: 'error', phase: 1, requires: [],
  status: 'deferred', deferred_reason: reason, check() { return []; },
});

export const DV_RULES = [
  deferred('DV-1', 'A-1 tag matches feeder/transformer/MV schedule row',
    'needs pinned schedule-join semantics (ampacity-tier keying, generator + Variant-G exemptions)'),
  deferred('DV-2', 'A-2 callout matches §4 Conduit Callout Algorithm output',
    'needs the §4 algorithm implemented (incl. transformer-secondary and MV variants)'),
  {
    id: 'DV-3', spec_ref: `${RSPEC} DV-3 (NEC 240.6)`, title: 'Breaker trip rating is an NEC standard rating', severity: 'error', phase: 1, requires: ['data:nec_standard_ratings_V1_0_0.json'], status: 'active',
    // Trip lives at data_fields.at (hospital dialect) or calc_fields.trip_rating (legacy dialect).
    // Variant-G sub-fed chains have no explicit L2-1 device, so the exemption is structural.
    check(ctx) {
      const F = [];
      const nec = ctx.data('nec_standard_ratings_V1_0_0.json');
      const std = new Set(nec?.fuse_cb_ampere_ratings?.standard_ratings_a || []);
      if (!std.size) return F;
      for (const d of (ctx.devsByType.get('L2-1') || [])) {
        const trip = num(d.data_fields?.at) ?? num(d.calc_fields?.trip_rating);
        if (trip == null) continue;
        if (!std.has(trip))
          F.push({ path: ctx.P.dev(d.id), message: `${d.id} (${d.designation ?? 'L2-1'}): trip rating ${trip} A not in NEC 240.6 standard ratings` });
      }
      return F;
    },
  },
  {
    id: 'DV-4', spec_ref: `${RSPEC} DV-4 (NEC 110.10)`, title: 'Bus bracing ≥ available fault current', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const r of ctx.r2s) {
        const bracing = field(r, 'bus_bracing'), fc = field(r, 'available_fc');
        if (bracing == null || fc == null) continue;
        if (bracing < fc)
          F.push({ path: ctx.P.re(r.id), message: `${r.id}: bus_bracing ${bracing} < available_fc ${fc} (NEC 110.10)` });
      }
      return F;
    },
  },
  {
    id: 'DV-5', spec_ref: `${RSPEC} DV-5 (NEC 110.9 / UL 1008)`, title: 'ATS withstand rating ≥ available fault current', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const d of (ctx.devsByType.get('L2-3') || [])) {
        const wr = field(d, 'withstand_rating'), fc = field(d, 'available_fc');
        if (wr == null || fc == null) continue;
        if (wr < fc)
          F.push({ path: ctx.P.dev(d.id), message: `${d.id} (ATS ${d.designation ?? ''}): withstand_rating ${wr} < available_fc ${fc} (NEC 110.9)` });
      }
      return F;
    },
  },
  deferred('DV-6', 'Transformer secondary OCPD matches schedule for kVA (NEC 450.3(A))',
    'needs the kVA → secondary-breaker schedule join (same spec session as DV-1)'),
  deferred('DV-7', 'Feeder conductor material matches schedule CU/AL breakpoint',
    'needs ampacity-tier keying into feeder_schedule (same spec session as DV-1)'),
  deferred('DV-8', 'Feeder lookup used correct 3-wire/4-wire configuration for system voltage',
    'needs system-voltage propagation through the graph plus schedule configuration keying'),
  {
    id: 'DV-9', spec_ref: `${RSPEC} DV-9`, title: 'EM switchboard NEC-class sections ordered 700 → 701 → 702', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const sw of ctx.sws.filter(s => s.variant === 'EM')) {
        const classed = ctx.secs
          .filter(s => s.switchboard_id === sw.id && s.nec_class != null)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        for (let i = 1; i < classed.length; i++)
          if (Number(classed[i].nec_class) < Number(classed[i - 1].nec_class))
            F.push({ path: ctx.P.sec(classed[i].id), message: `${sw.designation}: NEC ${classed[i].nec_class} section ${classed[i].id} ordered after NEC ${classed[i - 1].nec_class} — code priority is 700 → 701 → 702 left-to-right` });
      }
      return F;
    },
  },
  {
    id: 'DV-10', spec_ref: `${RSPEC} DV-10`, title: 'Main bus rating ≥ secondary bus rating (two-level; MLO exempt)', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const sw of ctx.sws.filter(s => s.bus_architecture === 'two-level')) {
        const main = ctx.reMap.get(sw.main_bus_id), sec = ctx.reMap.get(sw.secondary_bus_id);
        const mr = field(main, 'bus_rating'), sr = field(sec, 'bus_rating');
        if (mr == null || sr == null) continue;
        if (mr < sr)
          F.push({ path: ctx.P.sw(sw.id), message: `${sw.designation}: main bus rating ${mr} < secondary bus rating ${sr}` });
      }
      return F;
    },
  },
  {
    id: 'DV-11', spec_ref: `${RSPEC} DV-11 (NEC 110.9)`, title: 'Breaker AIC ≥ available FC and a valid kAIC tier', severity: 'error', phase: 1, requires: ['data:nec_standard_ratings_V1_0_0.json'], status: 'active',
    check(ctx) {
      const F = [];
      const nec = ctx.data('nec_standard_ratings_V1_0_0.json');
      const tiers = new Set(nec?.short_circuit_ratings?.ratings_kaic || []);
      for (const nt of ['L2-1', 'L1-1']) {
        for (const d of (ctx.devsByType.get(nt) || [])) {
          const aic = field(d, 'aic_rating'), fc = field(d, 'available_fc');
          if (aic != null && tiers.size && !tiers.has(aic))
            F.push({ path: ctx.P.dev(d.id), message: `${d.id} (${d.designation ?? nt}): aic_rating ${aic} not a standard kAIC tier` });
          if (aic != null && fc != null && aic < fc)
            F.push({ path: ctx.P.dev(d.id), message: `${d.id} (${d.designation ?? nt}): aic_rating ${aic} < available_fc ${fc} (NEC 110.9)` });
        }
      }
      return F;
    },
  },
  {
    id: 'DV-12', spec_ref: `${RSPEC} DV-12 (NEC 110.9 / UL 67)`, title: 'Panelboard AIC ≥ available FC and a valid kAIC tier', severity: 'error', phase: 1, requires: ['data:nec_standard_ratings_V1_0_0.json'], status: 'active',
    check(ctx) {
      const F = [];
      const nec = ctx.data('nec_standard_ratings_V1_0_0.json');
      const tiers = new Set(nec?.short_circuit_ratings?.ratings_kaic || []);
      for (const d of (ctx.devsByType.get('L2-4') || [])) {
        const aic = field(d, 'aic_rating'), fc = field(d, 'available_fc');
        if (aic != null && tiers.size && !tiers.has(aic))
          F.push({ path: ctx.P.dev(d.id), message: `${d.id} (${d.designation ?? 'L2-4'}): aic_rating ${aic} not a standard kAIC tier` });
        if (aic != null && fc != null && aic < fc)
          F.push({ path: ctx.P.dev(d.id), message: `${d.id} (${d.designation ?? 'L2-4'}): aic_rating ${aic} < available_fc ${fc} (NEC 110.9 / UL 67)` });
      }
      return F;
    },
  },
  {
    id: 'DV-13', spec_ref: `${RSPEC} DV-13; schema V1.1 §15 amendment 4`, title: 'A-4 fc_amps equals bound target available_fc within ±100 A', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const a of ctx.anns.filter(a => a.annotation_type === 'A-4')) {
        const fcTag = num(a.content?.fc_amps);
        if (fcTag == null) continue; // shape is SCHEMA-7's
        const target = ctx.devMap.get(a.bound_to) || ctx.reMap.get(a.bound_to);
        const fc = target ? field(target, 'available_fc') : null;
        if (fc == null) continue; // no calculated FC to compare against
        if (Math.abs(fcTag - fc) > 100)
          F.push({ path: ctx.P.ann(a.id, 'content.fc_amps'), message: `${a.id}: fc_amps ${fcTag} vs bound ${a.bound_to} available_fc ${fc} — outside ±100 A (§15 amendment 4)` });
      }
      return F;
    },
  },
  {
    id: 'DV-14', spec_ref: `${RSPEC} DV-14; schema V1.1 §15 amendment 5`, title: 'A-5 VD tag consistency — VACUOUS (A-5 reserved, not implemented)', severity: 'error', phase: 1, requires: [], status: 'vacuous',
    check() { return []; },
  },
  {
    id: 'DV-15', spec_ref: `${RSPEC} DV-15; schema V1.1 §15 amendment 6`, title: 'Cross-sheet paired feeders carry identical conductor specs', severity: 'error', phase: 2, requires: [], status: 'active',
    // Canonical cs-NNN refs only; the legacy xref dialect is MIG-1's finding, and
    // its paired specs become checkable once the dialect is migrated to canonical form.
    check(ctx) {
      const F = [];
      const KEYS = ['conductor_material', 'conductor_size', 'conduit_type', 'conduit_size', 'ground_size', 'num_sets'];
      ctx.canonicalCs.forEach((cs, i) => {
        const a = ctx.reMap.get(cs.source_routed_element_id), b = ctx.reMap.get(cs.dest_routed_element_id);
        if (!a || !b) return; // SCHEMA-13's orphan
        for (const k of KEYS) {
          const av = a.calc_fields?.[k], bv = b.calc_fields?.[k];
          if (av !== undefined && bv !== undefined && av !== bv)
            F.push({ path: ctx.P.idx('cross_sheet_refs', ctx.csrefs.indexOf(cs)), message: `${cs.id}: paired R-1 ${k} mismatch (${av} vs ${bv})` });
        }
      });
      return F;
    },
  },
];
