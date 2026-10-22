// 08_validation/rules/tv_rules_V1_0_0.mjs — Tag Completeness (TV-1..TV-8).
// Catalog: 02_specs/drafting/sld_topology_rules_V1_0_0.md §7 "Tag Completeness".
// V1.1 amendments: 4 (A-4 field is fc_amps, whole amps), 5 (TV-6 vacuous — A-5 reserved),
// 8 (TV-1 service-entrance exemption; TV-2 still applies).
// Exemptions (spec notes + SV-3): stub-exempt R-1 (inline-disconnect / cross-sheet R-1(b)
// stubs); Spare/Space and SPD Mode B have no R-1 at all, so TV-1/TV-2 never see them.

const RSPEC = '02_specs/drafting/sld_topology_rules_V1_0_0.md §7';
const T_SUFFIX = /^\d+T$/;

function boundOfType(ctx, reId, annType) {
  return (ctx.annsByBound.get(reId) || []).filter(a => a.annotation_type === annType);
}

export const TV_RULES = [
  {
    id: 'TV-1', spec_ref: `${RSPEC} TV-1; schema V1.1 §15 amendment 8`, title: 'Every non-stub-exempt R-1 has exactly one A-1 feeder tag', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const r of ctx.r1s.filter(r => r.stub_exempt === false)) {
        if (ctx.isServiceEntrance(r)) {
          F.push({ severity: 'info', path: ctx.P.re(r.id), message: `${r.id}: TV-1 service-entrance exemption (is_service_entrance, §15 amendment 8)` });
          continue;
        }
        const n = boundOfType(ctx, r.id, 'A-1').length;
        if (n !== 1) F.push({ path: ctx.P.re(r.id), message: `TV-1: ${r.id} has ${n} A-1 tags (expected 1)` });
      }
      return F;
    },
  },
  {
    id: 'TV-2', spec_ref: `${RSPEC} TV-2`, title: 'Every non-stub-exempt R-1 has exactly one A-2 conduit callout', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const r of ctx.r1s.filter(r => r.stub_exempt === false)) {
        const n = boundOfType(ctx, r.id, 'A-2').length;
        if (n !== 1) F.push({ path: ctx.P.re(r.id), message: `TV-2: ${r.id} has ${n} A-2 callouts (expected 1)` });
      }
      return F;
    },
  },
  {
    id: 'TV-3', spec_ref: `${RSPEC} TV-3`, title: 'Transformer-secondary feeders use T-suffix tags', severity: 'error', phase: 1, requires: [], status: 'active',
    // Checks the tag TYPE (T-suffix form) only. Whether the tag matches the schedule row
    // for the transformer's kVA is DV-1(b)'s schedule cross-check, which is deferred —
    // e.g. a tag like 2254T is T-suffix-correct but not a schedule one_line_tag, and judging that
    // is DV-1's job, not TV-3's.
    check(ctx) {
      const F = [];
      for (const r of ctx.r1s) {
        const s = ctx.resolveEndpoint(r.start);
        if (s.kind !== 'device' || s.device.node_type !== 'L2-2' || s.port !== 'secondary_out') continue;
        for (const a of boundOfType(ctx, r.id, 'A-1')) {
          const tag = (a.content || {}).tag_text;
          if (typeof tag !== 'string' || !tag) continue; // presence is SCHEMA-7's
          if (!T_SUFFIX.test(tag))
            F.push({ path: ctx.P.ann(a.id, 'content.tag_text'), message: `${r.id}: transformer-secondary tag "${tag}" is not a T-suffix tag` });
        }
      }
      return F;
    },
  },
  {
    id: 'TV-4', spec_ref: `${RSPEC} TV-4`, title: 'Non-transformer feeders do not use T-suffix tags', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const r of ctx.r1s) {
        const s = ctx.resolveEndpoint(r.start);
        const isXfmrSecondary = s.kind === 'device' && s.device.node_type === 'L2-2' && s.port === 'secondary_out';
        if (isXfmrSecondary) continue;
        for (const a of boundOfType(ctx, r.id, 'A-1')) {
          const tag = (a.content || {}).tag_text;
          if (typeof tag === 'string' && T_SUFFIX.test(tag))
            F.push({ path: ctx.P.ann(a.id, 'content.tag_text'), message: `${r.id}: T-suffix tag "${tag}" on a feeder not downstream of an L2-2 transformer` });
        }
      }
      return F;
    },
  },
  {
    id: 'TV-5', spec_ref: `${RSPEC} TV-5; schema V1.1 §15 amendment 4`, title: 'A-4 fault-current tag present where available_fc is populated', severity: 'error', phase: 1, requires: [], status: 'active',
    // Vacuous on both reference topologies today (no device carries calc_fields.available_fc);
    // active so it engages the moment FC calcs land. Passing = absence of data, not proof.
    check(ctx) {
      const F = [];
      const eligible = [];
      for (const d of ctx.devices) {
        const fc = d.calc_fields && d.calc_fields.available_fc;
        if (fc != null && d.suppress_fc_tag !== true) eligible.push({ id: d.id, path: ctx.P.dev(d.id), label: d.designation ?? d.id });
      }
      for (const r of ctx.r2s) {
        const fc = r.calc_fields && r.calc_fields.available_fc;
        if (r.bus_level === 'main' && fc != null && r.suppress_fc_tag !== true) eligible.push({ id: r.id, path: ctx.P.re(r.id), label: r.designation ?? r.id });
      }
      for (const e of eligible) {
        const n = (ctx.annsByBound.get(e.id) || []).filter(a => a.annotation_type === 'A-4').length;
        if (n !== 1) F.push({ path: e.path, message: `TV-5: ${e.label} has populated available_fc but ${n} A-4 annotations (expected 1)` });
      }
      return F;
    },
  },
  {
    id: 'TV-6', spec_ref: `${RSPEC} TV-6; schema V1.1 §15 amendment 5`, title: 'A-5 voltage-drop tag completeness — VACUOUS (A-5 reserved, not implemented)', severity: 'error', phase: 1, requires: [], status: 'vacuous',
    check() { return []; },
  },
  {
    id: 'TV-7', spec_ref: `${RSPEC} TV-7`, title: 'A-6 keynote has positive-integer number and non-empty text', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const a of ctx.anns.filter(a => a.annotation_type === 'A-6')) {
        const c = a.content || {};
        if (!(Number.isInteger(c.keynote_number) && c.keynote_number > 0))
          F.push({ path: ctx.P.ann(a.id, 'content.keynote_number'), message: `${a.id}: keynote_number must be a positive integer (got ${JSON.stringify(c.keynote_number)})` });
        if (typeof c.keynote_text !== 'string' || !c.keynote_text.trim())
          F.push({ path: ctx.P.ann(a.id, 'content.keynote_text'), message: `${a.id}: keynote_text missing/blank` });
      }
      return F;
    },
  },
  {
    id: 'TV-8', spec_ref: `${RSPEC} TV-8`, title: 'A-3 squiggle text matches TO/FROM or BUS-continuation form', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const a of ctx.anns.filter(a => a.annotation_type === 'A-3')) {
        const text = (a.content || {}).text;
        if (typeof text !== 'string' || !text) continue; // presence is SCHEMA-7's
        const ok = /^(?:TO|FROM)\s+\S.*$/.test(text) || /^BUS (?:CONTINUES ON|FROM)\s+\S.*$/.test(text);
        if (!ok)
          F.push({ path: ctx.P.ann(a.id, 'content.text'), message: `${a.id}: squiggle text "${text}" matches neither "TO/FROM [designation]" nor "BUS CONTINUES ON/FROM [sheet]"` });
      }
      return F;
    },
  },
];
