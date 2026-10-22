// 08_validation/rules/cv_rules_V1_0_0.mjs — Connectivity Completeness (CV-1..CV-13).
// Catalog: 02_specs/drafting/sld_topology_rules_V1_0_0.md §7 "Connectivity Completeness"
// + the CV-8 device-aware port classification table. V1.1 §15 amendments 1–3 apply:
// null-start continuation entries and R-2 bus-tap endpoints are legal on either end;
// flex-port assigned_role records are withdrawn (no topology uses flex ports yet).
// Direction ownership: CV-3 owns the START side, CV-8 owns the END side — one defect,
// one rule. Endpoint orphans are SCHEMA-6's; CV rules only judge *resolved* endpoints.

const RSPEC = '02_specs/drafting/sld_topology_rules_V1_0_0.md §7';

// CV-8 device-aware port classification (spec table at rules_V1_0_0.md:1799).
// L2-7 / L1-4 / L2-8 are excluded from CV-8 by the spec (no R-1 / measurement mode).
// L2-4 feed_* are load-side generally; feed_bottom/left/right are source-side only in
// Variant G sub-feed context — CV-3 accepts them as source, CV-12 polices dual-use.
export const SOURCE_PORTS = {
  'L2-1': ['line_in'], 'L1-1': ['line_in'],
  'L0-1': ['secondary_out'], 'L0-2': ['secondary_out'],
  'L2-2': ['secondary_out', 'flex_left', 'flex_right'],
  'L2-3': ['load_out'],
  // spec footnote limits panel source-side to feed_bottom/left/right (Variant G), but the
  // as-built golden case exits chained sub-feeds from feed_top pervasively (r-004/r-005
  // from 4M-1-A feed_top, etc.) — spec-follows-engine: all feed_* accepted as source.
  'L2-4': ['feed_top', 'feed_bottom', 'feed_left', 'feed_right'],
  'L2-5': ['load_out', 'flex_left', 'flex_right'],
  'L1-5': ['gen_out'],
};
export const LOAD_PORTS = {
  // as-built amendment: the service-entrance feeder terminates at the main breaker/GFP
  // line_in (hospital r-002 → d-004 MAIN-GFP), so L1-1 line_in is load-capable.
  'L1-1': ['line_in'],
  'L0-1': ['primary_in'], 'L0-2': ['primary_in'],
  'L2-2': ['primary_in', 'flex_left', 'flex_right'],
  'L2-3': ['source1_in', 'source2_in'],
  'L2-4': ['feed_top', 'feed_bottom', 'feed_left', 'feed_right'],
  'L2-5': ['line_in', 'flex_left', 'flex_right'],
  'L2-6': ['line_in'],
  'L3-1': ['load_in'], 'L3-2': ['load_in'], 'L3-3': ['load_in'],
};
const CV8_EXCLUDED = new Set(['L2-7', 'L1-4', 'L2-8', 'L1-3']);

// CV-12: the L2-4 panelboard feed-port comb anchors the frozen engine can actually draw.
// The engine (04_renderer/sld_viewer_engine_V1_0_0.html) computes a feed port's (x,y)
// inline from the panel box edges — feed_top=top-center, feed_bottom=bottom-center
// (~L11098–11100), feed_left/feed_right=side-wall mid (~L11174–11213). No other feed_* name
// has anchor geometry: the engine either mis-draws it at bottom-center or (R-1 path) drops the
// sub-feed silently. Same four names as SOURCE_PORTS['L2-4'] / LOAD_PORTS['L2-4'], but a
// distinct concern — those encode electrical direction (CV-3/CV-8); this encodes drawability.
const L2_4_FEED_ANCHORS = new Set(['feed_top', 'feed_bottom', 'feed_left', 'feed_right']);

export const CV_RULES = [
  {
    id: 'CV-1', spec_ref: `${RSPEC} CV-1`, title: 'Bus-tap occupancy: attached devices are tap-legal, one bus per device', severity: 'error', phase: 1, requires: ['port_model'], status: 'active',
    // Partial implementation: taps are implicit in the as-built schema (no slot list), so
    // empty-tap detection is not expressible. Checked: (a) no device PORT binds >1 bus
    // (a main breaker legitimately bridges main and secondary buses on two different
    // ports — hospital d-004 line_in→r-901 + bus_out→r-902); (b) bus-attached devices
    // are of the tap-legal types.
    check(ctx) {
      const F = [];
      const TAP_TYPES = new Set(['L2-1', 'L1-1', 'L1-4', 'L2-7']);
      for (const [devId, pas] of ctx.paByDevice) {
        const busPas = pas.filter(pa => pa.bus_id !== undefined);
        const byPort = new Map();
        for (const pa of busPas) {
          if (!byPort.has(pa.port)) byPort.set(pa.port, []);
          byPort.get(pa.port).push(pa.bus_id);
        }
        for (const [port, buses] of byPort)
          if (buses.length > 1)
            F.push({ path: ctx.P.dev(devId), message: `${devId}: port "${port}" bound to ${buses.length} buses via port_assignments (${buses.join(', ')}) — one tap per port` });
        const d = ctx.devMap.get(devId);
        if (d && busPas.length && !TAP_TYPES.has(d.node_type))
          F.push({ path: ctx.P.dev(devId), message: `${devId} (${d.node_type}): not a tap-legal device type for direct bus attachment (L2-1/L1-1/L1-4/L2-7)` });
      }
      return F;
    },
  },
  {
    id: 'CV-2', spec_ref: `${RSPEC} CV-2`, title: 'Every L2-1 breaker line_in starts exactly one feeder', severity: 'error', phase: 1, requires: [], status: 'active',
    // Exemptions: Spare/Space (spec note — includes L2-1 with data_fields.kind spare/space),
    // internal sub-feed breakers (their feeder starts at the parent panel's feed port, not
    // at the breaker — §5.1 internal_to), and cross-sheet dest segments (aliases of their
    // source segment, so each logical feeder counts once).
    check(ctx) {
      const F = [];
      for (const d of (ctx.devsByType.get('L2-1') || [])) {
        if (ctx.isSpareOrSpace(d) || ctx.isInternalBreaker(d)) continue;
        const starts = (ctx.feedersByStartDevice.get(d.id) || [])
          .filter(x => x.port === 'line_in' && !ctx.isCsAlias(x.r.id));
        if (starts.length !== 1)
          F.push({ path: ctx.P.dev(d.id), message: `${d.id} (${d.designation ?? 'L2-1'}): line_in starts ${starts.length} logical R-1 feeders (expected 1)` });
      }
      return F;
    },
  },
  {
    id: 'CV-3', spec_ref: `${RSPEC} CV-3/CV-8 (start side); schema V1.1 §15 amendment 1`, title: 'Feeder start binds a source-side port (or legal bus tap / continuation null)', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const r of ctx.r1s) {
        const s = ctx.resolveEndpoint(r.start);
        if (s.kind !== 'device') continue; // null/bus_tap legal per amendment 1; orphans are SCHEMA-6
        const nt = s.device.node_type;
        if (CV8_EXCLUDED.has(nt)) continue;
        const src = SOURCE_PORTS[nt];
        if (!src)
          F.push({ path: ctx.P.re(r.id, 'start'), message: `${r.id}: start binds ${s.id} (${nt}) which has no source-side ports in the CV-8 classification` });
        else if (!src.includes(s.port))
          F.push({ path: ctx.P.re(r.id, 'start'), message: `${r.id}: start port "${s.port}" on ${s.id} (${nt}) is not source-side (${src.join('/')})` });
      }
      return F;
    },
  },
  {
    id: 'CV-4', spec_ref: `${RSPEC} CV-4; schema V1.1 §15 amendment 2`, title: 'Feeder end terminates at a device port, bus tap, or A-3 squiggle', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const r of ctx.r1s) {
        const e = ctx.resolveEndpoint(r.end);
        if (e.kind === 'device' || e.kind === 'bus_tap') continue;
        if (e.kind !== 'null') continue; // malformed/orphan already SCHEMA-6
        const squiggles = (ctx.annsByBound.get(r.id) || []).filter(a => a.annotation_type === 'A-3');
        if (!squiggles.length)
          F.push({ path: ctx.P.re(r.id, 'end'), message: `${r.id}: end is null and no A-3 continuation squiggle is bound — dangling end` });
      }
      return F;
    },
  },
  {
    id: 'CV-5', spec_ref: `${RSPEC} CV-5`, title: 'ATS has both source1_in and source2_in fed', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const d of (ctx.devsByType.get('L2-3') || [])) {
        const ends = (ctx.feedersByEndDevice.get(d.id) || []).filter(x => !ctx.isCsAlias(x.r.id));
        for (const port of ['source1_in', 'source2_in']) {
          const n = ends.filter(x => x.port === port).length;
          if (n !== 1)
            F.push({ path: ctx.P.dev(d.id), message: `${d.id} (ATS ${d.designation ?? ''}): ${port} fed by ${n} logical R-1 feeders (expected 1)` });
        }
      }
      return F;
    },
  },
  {
    id: 'CV-6', spec_ref: `${RSPEC} CV-6`, title: 'ATS load_out starts exactly one feeder', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const d of (ctx.devsByType.get('L2-3') || [])) {
        const n = (ctx.feedersByStartDevice.get(d.id) || [])
          .filter(x => x.port === 'load_out' && !ctx.isCsAlias(x.r.id)).length;
        if (n !== 1)
          F.push({ path: ctx.P.dev(d.id), message: `${d.id} (ATS ${d.designation ?? ''}): load_out starts ${n} logical R-1 feeders (expected 1)` });
      }
      return F;
    },
  },
  {
    id: 'CV-7', spec_ref: `${RSPEC} CV-7`, title: 'No feeder self-loop', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const r of ctx.r1s) {
        const s = ctx.resolveEndpoint(r.start), e = ctx.resolveEndpoint(r.end);
        if (s.kind === 'device' && e.kind === 'device' && s.id === e.id)
          F.push({ path: ctx.P.re(r.id), message: `${r.id}: start and end both bind device ${s.id} — self-loop` });
      }
      return F;
    },
  },
  {
    id: 'CV-8', spec_ref: `${RSPEC} CV-8 (end side); table at rules_V1_0_0.md:1799`, title: 'Feeder end binds a load-side port per device-aware classification', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const r of ctx.r1s) {
        const e = ctx.resolveEndpoint(r.end);
        if (e.kind !== 'device') continue; // bus_tap legal (amendment 1); null handled by CV-4
        const nt = e.device.node_type;
        if (CV8_EXCLUDED.has(nt)) continue;
        const load = LOAD_PORTS[nt];
        if (!load)
          F.push({ path: ctx.P.re(r.id, 'end'), message: `${r.id}: end binds ${e.id} (${nt}) which has no load-side ports in the CV-8 classification` });
        else if (!load.includes(e.port))
          F.push({ path: ctx.P.re(r.id, 'end'), message: `${r.id}: end port "${e.port}" on ${e.id} (${nt}) is not load-side (${load.join('/')})` });
      }
      return F;
    },
  },
  {
    id: 'CV-9', spec_ref: `${RSPEC} CV-9 (NEC 695.4(B))`, title: 'Fire-pump breaker taps the main bus, not secondary', severity: 'error', phase: 1, requires: ['port_model'], status: 'active',
    check(ctx) {
      const F = [];
      // feeders ending at L3-1 load_in (directly, or via an L2-5 disconnect fed from a breaker)
      const firePumpBreakers = new Set();
      for (const d of (ctx.devsByType.get('L3-1') || [])) {
        for (const { r } of (ctx.feedersByEndDevice.get(d.id) || [])) {
          const s = ctx.resolveEndpoint(r.start);
          if (s.kind !== 'device') continue;
          if (s.device.node_type === 'L2-1') firePumpBreakers.add(s.id);
          else if (s.device.node_type === 'L2-5') {
            // disconnect in a fire pump circuit: walk one hop upstream
            for (const { r: up } of (ctx.feedersByEndDevice.get(s.id) || [])) {
              const us = ctx.resolveEndpoint(up.start);
              if (us.kind === 'device' && us.device.node_type === 'L2-1') firePumpBreakers.add(us.id);
            }
          }
        }
      }
      for (const bid of firePumpBreakers) {
        const busPa = (ctx.paByDevice.get(bid) || []).find(pa => pa.bus_id !== undefined);
        if (!busPa) continue; // not bus-attached (e.g. sub-fed) — outside CV-9
        const sw = ctx.sws.find(s => [s.main_bus_id, s.secondary_bus_id, s.distribution_bus_id, ...(s.secondary_bus_overflow_ids || [])].includes(busPa.bus_id));
        if (sw && busPa.bus_id !== sw.main_bus_id)
          F.push({ path: ctx.P.dev(bid), message: `${bid}: fire-pump breaker taps ${busPa.bus_id}, not main bus ${sw.main_bus_id} of ${sw.designation} (NEC 695.4(B))` });
      }
      return F;
    },
  },
  {
    id: 'CV-10', spec_ref: `${RSPEC} CV-10`, title: 'Every NEC-class section of an EM switchboard has ≥1 breaker with a feeder', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const sw of ctx.sws.filter(s => s.variant === 'EM')) {
        for (const sec of ctx.secs.filter(s => s.switchboard_id === sw.id && s.type === 'distribution' && s.nec_class != null)) {
          const ok = (sec.device_ids || []).some(did => {
            const d = ctx.devMap.get(did);
            return d && d.node_type === 'L2-1' && (ctx.feedersByStartDevice.get(did) || []).length > 0;
          });
          if (!ok)
            F.push({ path: ctx.P.sec(sec.id), message: `${sec.id} (NEC ${sec.nec_class} section of ${sw.designation}): no L2-1 breaker with a downstream R-1 feeder` });
        }
      }
      return F;
    },
  },
  {
    id: 'CV-11', spec_ref: `${RSPEC} CV-11`, title: 'A-3 squiggle binds one R-1 and names a valid designation', severity: 'error', phase: 1, requires: [], status: 'active',
    check(ctx) {
      const F = [];
      for (const a of ctx.anns.filter(a => a.annotation_type === 'A-3')) {
        const target = ctx.reMap.get(a.bound_to);
        if (!target || target.edge_type !== 'R-1') {
          F.push({ path: ctx.P.ann(a.id, 'bound_to'), message: `${a.id}: A-3 must bind an R-1 feeder (bound_to "${a.bound_to}" is ${target ? target.edge_type : 'unresolved'})` });
          continue;
        }
        const text = (a.content || {}).text;
        if (typeof text !== 'string' || !text) continue; // presence is SCHEMA-7's
        const m = /^(?:TO|FROM)\s+(.+)$/.exec(text);
        const busM = /^BUS (?:CONTINUES ON|FROM)\s+(.+)$/.exec(text);
        if (m && !ctx.desigSet.has(m[1].trim()))
          F.push({ path: ctx.P.ann(a.id, 'content.text'), message: `${a.id}: squiggle destination "${m[1].trim()}" is not a device or switchboard designation in this composition` });
        else if (busM && !ctx.sheetNumbers.has(busM[1].trim()))
          F.push({ path: ctx.P.ann(a.id, 'content.text'), message: `${a.id}: bus squiggle sheet "${busM[1].trim()}" is not a sheet_number in this composition` });
        // neither pattern → TV-8's malformed-label finding, not CV-11's
      }
      return F;
    },
  },
  {
    id: 'CV-12', spec_ref: `${RSPEC} CV-12`, title: 'Panelboard sub-feed exit anchors to a drawable feed port (calibration: error)', severity: 'error', phase: 1, requires: [], status: 'active',
    // Scoped onto the comb-anchor port-role model at error severity.
    // The ORIGINAL assertion ("entry port ≠ sub-feed exit
    // port") was factually wrong per the frozen engine: it has NO occupancy/exclusivity check —
    // feed ports are geometric comb anchors freely shared by an incoming feed and outgoing
    // sub-feeds (engine `hasSubFeedsToPanels` ~L9205 explicitly supports fed-in + sub-feeding
    // from the same feed_bottom). The 11 golden panels that reuse a port (d-138 4M-1-A feed_top,
    // d-031 4L-2-A feed_bottom, …) are LEGAL, so the old rule could never gate.
    // RESCOPED assertion (spec-follows-engine): every L2-4 sub-feed EXIT must anchor to a feed
    // port the engine can draw a comb from — one of L2_4_FEED_ANCHORS. Shared entry/exit is
    // legal and no longer flagged. A violation is an exit anchored to a feed_ port outside the
    // four-anchor set (engine has no geometry → undrawable). Exit is expressed two ways: an R-1
    // Feeder start on a feed_ port, or an internal-breaker port_assignment attached_to_port on
    // the panel — the PA form is CV-12's unique surface (CV-3/CV-8 police only R-1 endpoints).
    // Promotion to error is honest per H discipline: both goldens are 0-finding at warning
    // first (the 11 hospital reuses vanished — feed_top/feed_bottom are drawable), and a
    // negative probe (pa-020 attached_to_port → feed_center) fires here while CV-3/CV-8 stay
    // silent, proving teeth. Correct topologies never trip it (compositor only emits the four
    // drawable anchors) — same "detects-a-real-defect-but-goldens-can't-hit-it" shape as SH-5a.
    check(ctx) {
      const F = [];
      for (const d of (ctx.devsByType.get('L2-4') || [])) {
        // Collect sub-feed exit anchors (both representations), with the referencing element id.
        const exits = [];
        for (const x of (ctx.feedersByStartDevice.get(d.id) || []))
          if (typeof x.port === 'string' && x.port.startsWith('feed_')) exits.push({ port: x.port, ref: x.r.id });
        for (const pa of ctx.pas)
          if (pa.attached_to_device === d.id && typeof pa.attached_to_port === 'string' && pa.attached_to_port.startsWith('feed_'))
            exits.push({ port: pa.attached_to_port, ref: pa.id });
        for (const { port, ref } of exits)
          if (!L2_4_FEED_ANCHORS.has(port))
            F.push({ path: ctx.P.dev(d.id), message: `${d.id} (${d.designation ?? 'L2-4'}): sub-feed exit anchors port "${port}" (${ref}) — not a drawable L2-4 comb anchor (feed_top/feed_bottom/feed_left/feed_right)` });
      }
      return F;
    },
  },
  {
    id: 'CV-13', spec_ref: `${RSPEC} CV-13 (§8A; no formal assertion row — minimal advisory)`, title: 'Cross-sheet squiggle binding consistency (partial)', severity: 'info', phase: 2, requires: [], status: 'active',
    // The spec references CV-13 by name only (rules_V1_0_0.md:1359/1915/2017) without an
    // assertion row. Minimal advisory: each canonical cs ref's paired feeders should each
    // carry a bound A-3 squiggle. Full rule deferred pending a spec session.
    check(ctx) {
      const F = [];
      for (const cs of ctx.canonicalCs) {
        for (const [role, reId] of [['source', cs.source_routed_element_id], ['dest', cs.dest_routed_element_id]]) {
          const r = ctx.reMap.get(reId);
          if (!r) continue; // SCHEMA-13's orphan
          const hasSquiggle = (ctx.annsByBound.get(reId) || []).some(a => a.annotation_type === 'A-3');
          if (!hasSquiggle)
            F.push({ path: ctx.P.re(reId), message: `${cs.id}: ${role} feeder ${reId} carries no A-3 continuation squiggle` });
        }
      }
      return F;
    },
  },
  {
    id: 'CV-14', spec_ref: `${RSPEC} CV-14`, title: 'R-1 sub-feed start port is a drawable anchor excluded from effective subfeed_start_ports (silently dropped)', severity: 'info', phase: 1, requires: ['layout_config:subfeed_start_ports'], status: 'active',
    // Complement of CV-12: CV-12 flags a sub-feed exit port that is NOT a drawable L2-4 comb
    // anchor at all; CV-14 flags one that IS a drawable anchor (in L2_4_FEED_ANCHORS) but is not
    // in the topology's EFFECTIVE subfeed_start_ports whitelist — the engine's applyLayoutConfig()
    // pick('subfeed_start_ports', ['feed_bottom','feed_top']) silently drops such a sub-feed
    // (never rendered, no error). Effective set = REPLACE not union, mirroring the engine's pick():
    //   topo.layout_config.subfeed_start_ports ?? ['feed_bottom','feed_top'].
    // CAPABILITY-GATED on 'layout_config:subfeed_start_ports': no validated topology embeds
    // layout_config and the validator never merges the external *_layout_config.json, so a naive
    // read would fall to the 2-port default for every building and false-positive any topology (whose
    // real external config replaces the set). When the whitelist is absent the runner registers
    // CV-14 in rules_skipped and check() never runs — both goldens skip. (Q handoff §9.)
    check(ctx) {
      const F = [];
      const eff = new Set(ctx.t.layout_config?.subfeed_start_ports ?? ['feed_bottom', 'feed_top']);
      for (const d of (ctx.devsByType.get('L2-4') || [])) {
        const exits = [];
        for (const x of (ctx.feedersByStartDevice.get(d.id) || []))
          if (typeof x.port === 'string' && x.port.startsWith('feed_')) exits.push({ port: x.port, ref: x.r.id });
        for (const pa of ctx.pas)
          if (pa.attached_to_device === d.id && typeof pa.attached_to_port === 'string' && pa.attached_to_port.startsWith('feed_'))
            exits.push({ port: pa.attached_to_port, ref: pa.id });
        for (const { port, ref } of exits)
          if (L2_4_FEED_ANCHORS.has(port) && !eff.has(port))
            F.push({ path: ctx.P.dev(d.id), message: `${d.id} (${d.designation ?? 'L2-4'}): sub-feed exit port "${port}" (${ref}) is a drawable anchor but not in effective subfeed_start_ports [${[...eff].join(', ')}] — the engine silently drops it` });
      }
      return F;
    },
  },
  {
    id: 'CV-15', spec_ref: `${RSPEC} CV-15 (advisory; no formal assertion row)`, title: 'landing_offset_x resolves outside (or within 10 px of a corner of) the target panel drawn box', severity: 'info', phase: 1, requires: [], status: 'active',
    // Advisory: the
    // family-dims retune shrank the L2-4 drawn box from the ~140 px slot to
    // the measured 64 px family bbox, silently stranding authored
    // landing_offset_x values 8–28 px OUTSIDE the drawn panel (the feeder
    // hooked down into air beside the box) in three cases. This rule resolves
    // each authored offset against the target's drawn half-width and flags:
    //   - landings strictly outside the box (the stranded class), and
    //   - landings within <10 px of a corner (below the manual-route lane
    //     rhythm — the pre-retune hospital F-044 "right-10" state), and
    //   - offsets the engine silently IGNORES (end.port !== 'feed_top' —
    //     the engine's LANDING OFFSET ADJUSTMENT only applies to feed_top
    //     termination; CV-14-style silent-drop complement).
    // Offset forms mirror the engine parser exactly: "right-N" → +w/2 − N;
    // "left+N" → −w/2 + N; numeric → signed offset from top-center.
    // Drawn width mirrors lib/geometry_V1_0_0.mjs deviceRelBox (engine BOX):
    // only L2-4 accepts sub-feed landings today; unknown target types are
    // skipped silently (no width authority).
    check(ctx) {
      const F = [];
      const HALF_W = { 'L2-4': 32 };  // deviceRelBox mirror: L2-4 w=64
      const MIN_CORNER = 10;
      for (const r of ctx.routed) {
        const lox = r.end && r.end.landing_offset_x;
        if (lox === undefined || lox === null) continue;
        const dst = ctx.devMap.get(r.end.device_id);
        if (!dst) continue;
        if (r.end.port !== 'feed_top') {
          F.push({ path: ctx.P.re(r.id, 'end'), message: `${r.id}: landing_offset_x=${JSON.stringify(lox)} on end.port "${r.end.port}" — the engine only honors it for feed_top termination (silently ignored)` });
          continue;
        }
        const half = HALF_W[dst.node_type];
        if (half === undefined) continue;
        let off = null;
        if (typeof lox === 'string') {
          const mR = lox.match(/^right-(\d+(?:\.\d+)?)$/);
          const mL = lox.match(/^left\+(\d+(?:\.\d+)?)$/);
          if (mR) off = half - parseFloat(mR[1]);
          else if (mL) off = -half + parseFloat(mL[1]);
        } else if (typeof lox === 'number') off = lox;
        if (off === null) continue;  // unparseable form falls to center in the engine
        const margin = half - Math.abs(off);
        if (margin < 0)
          F.push({ path: ctx.P.re(r.id, 'end'), message: `${r.id} → ${dst.designation ?? dst.id}: landing_offset_x=${JSON.stringify(lox)} resolves ${(-margin).toFixed(1)} px OUTSIDE the ${half * 2} px drawn box — feeder lands beside the panel` });
        else if (margin < MIN_CORNER)
          F.push({ path: ctx.P.re(r.id, 'end'), message: `${r.id} → ${dst.designation ?? dst.id}: landing_offset_x=${JSON.stringify(lox)} lands ${margin.toFixed(1)} px from the drawn corner (<${MIN_CORNER} px manual-rhythm margin)` });
      }
      return F;
    },
  },
];
