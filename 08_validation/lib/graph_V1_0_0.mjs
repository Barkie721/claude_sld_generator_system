// 08_validation/lib/graph_V1_0_0.mjs — connectivity model for Phase-2 rules
// (TI-1 reachability) and graph-adjacent Phase-1 rules (CV-9, TV-3/TV-4).
// Nodes: `dev:<id>` and `bus:<id>` (R-2 instances). Directed edges follow power flow;
// attachment-style bindings (port_assignments, section membership, measurement hosts,
// internal_to) are bidirectional — they express containment, not direction.
// Cross-sheet refs add virtual edges per rules_V1_0_0 §7 "Multi-sheet note for TI-1":
// R-1(a).start device → R-1(b).end device. The legacy xref dialect is consumed
// the same way (the dialect itself is already reported by MIG-1).

export function buildGraph(ctx) {
  if (ctx._graph) return ctx._graph;
  const out = new Map(); // node -> Set(node), directed
  const und = new Map(); // node -> Set(node), undirected view (for containment edges)
  const nodes = new Set();
  const D = id => `dev:${id}`, B = id => `bus:${id}`;
  const addNode = n => { nodes.add(n); if (!out.has(n)) out.set(n, new Set()); if (!und.has(n)) und.set(n, new Set()); };
  const addDir = (a, b) => { addNode(a); addNode(b); out.get(a).add(b); };
  const addBi = (a, b) => { addNode(a); addNode(b); und.get(a).add(b); und.get(b).add(a); };

  for (const d of ctx.devices) addNode(D(d.id));
  for (const r of ctx.r2s) addNode(B(r.id));

  const epNode = ep => ep.kind === 'device' ? D(ep.id) : ep.kind === 'bus_tap' ? B(ep.id) : null;

  // R-1 feeders: directed start → end
  for (const r of ctx.r1s) {
    const s = epNode(ctx.resolveEndpoint(r.start));
    const e = epNode(ctx.resolveEndpoint(r.end));
    if (s && e) addDir(s, e);
  }
  // port assignments: containment/attachment — bidirectional
  for (const pa of ctx.pas) {
    if (!ctx.devMap.has(pa.device_id)) continue;
    if (pa.bus_id !== undefined && ctx.reMap.has(pa.bus_id)) addBi(D(pa.device_id), B(pa.bus_id));
    else if (pa.attached_to_device !== undefined && ctx.devMap.has(pa.attached_to_device))
      addBi(D(pa.device_id), D(pa.attached_to_device));
  }
  // switchboard bus architecture: buses of one switchboard are one electrical assembly
  for (const sw of ctx.sws) {
    const busIds = [sw.main_bus_id, sw.secondary_bus_id, sw.distribution_bus_id,
      ...(sw.secondary_bus_overflow_ids || [])].filter(id => id != null && ctx.reMap.has(id));
    for (let i = 0; i < busIds.length; i++)
      for (let j = i + 1; j < busIds.length; j++) addBi(B(busIds[i]), B(busIds[j]));
  }
  // section membership: devices sit on their switchboard's buses
  for (const sec of ctx.secs) {
    const sw = ctx.swMap.get(sec.switchboard_id);
    if (!sw) continue;
    const busIds = [sw.main_bus_id, sw.secondary_bus_id, sw.distribution_bus_id]
      .filter(id => id != null && ctx.reMap.has(id));
    for (const did of (sec.device_ids || [])) {
      if (!ctx.devMap.has(did)) continue;
      for (const bid of busIds) addBi(D(did), B(bid));
    }
  }
  // internal_to: sub-feed device lives inside its parent panelboard (schema V1.1 §5.1)
  for (const d of ctx.devices) {
    const it = d.data_fields && d.data_fields.internal_to;
    if (it == null) continue;
    const parent = ctx.devices.find(p => p.designation === it && p.node_type === 'L2-4' && p.sheet_id === d.sheet_id);
    if (parent) addBi(D(d.id), D(parent.id));
  }
  // measurement attachments: meter rides its host routed element
  for (const ma of ctx.canonicalMeas)
    if (ctx.devMap.has(ma.device_id) && ctx.reMap.has(ma.host_routed_element_id)) {
      const host = ctx.reMap.get(ma.host_routed_element_id);
      addBi(D(ma.device_id), host.edge_type === 'R-2' ? B(host.id) : D(host.id));
    }
  for (const ma of ctx.legacyMeas)
    if (ctx.devMap.has(ma.meter_id) && ctx.reMap.has(ma.bus_id)) addBi(D(ma.meter_id), B(ma.bus_id));

  // cross-sheet virtual edges (canonical cs-NNN + legacy xref dialect)
  const csPairs = [
    ...ctx.canonicalCs.map(cs => [cs.source_routed_element_id, cs.dest_routed_element_id]),
    ...ctx.legacyCs.map(cs => [cs.feeder_id_source, cs.feeder_id_dest]),
  ];
  for (const [srcId, dstId] of csPairs) {
    const a = ctx.reMap.get(srcId), b = ctx.reMap.get(dstId);
    if (!a || !b) continue;
    const from = epNode(ctx.resolveEndpoint(a.start));
    const to = epNode(ctx.resolveEndpoint(b.end));
    if (from && to) addDir(from, to);
  }

  // reachability over directed edges, expanding through undirected containment edges both ways
  function reachableFrom(startNodes) {
    const seen = new Set();
    const stack = [...startNodes].filter(n => nodes.has(n));
    while (stack.length) {
      const n = stack.pop();
      if (seen.has(n)) continue;
      seen.add(n);
      for (const m of out.get(n) || []) if (!seen.has(m)) stack.push(m);
      for (const m of und.get(n) || []) if (!seen.has(m)) stack.push(m);
    }
    return seen;
  }

  ctx._graph = { nodes, out, und, D, B, reachableFrom };
  return ctx._graph;
}
