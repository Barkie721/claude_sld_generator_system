

// ================= HEADLESS GEOMETRY EXPORT =================
function _round2(v){ return Math.round(v*100)/100; }

// Rebuild the TOPO-derived lookup tables after a topology swap. Mirrors the
// top-level builders verbatim (devMap/reMap/anMap/sectionMap/
// deviceToSectionTag/annByBound). The tables are const objects, so we clear
// and refill in place rather than reassign.
function _recomputeDerived() {
  for (const o of [devMap, reMap, anMap, sectionMap, deviceToSectionTag, annByBound]) {
    for (const k of Object.keys(o)) delete o[k];
  }
  TOPO.devices.forEach(d => devMap[d.id] = d);
  TOPO.routed_elements.forEach(r => reMap[r.id] = r);
  TOPO.annotations.forEach(a => anMap[a.id] = a);
  (TOPO.sections || []).forEach(s => sectionMap[s.id] = s);
  (TOPO.sections || []).forEach(s => {
    if (!s.section_tag) return;
    (s.device_ids || []).forEach(did => { deviceToSectionTag[did] = s.section_tag; });
  });
  TOPO.annotations.forEach(a => {
    if (!annByBound[a.bound_to]) annByBound[a.bound_to] = [];
    annByBound[a.bound_to].push(a);
  });
}

// Reproduces exportGeometry() headlessly. Pass a topology object to swap the
// embedded hospital demo; its optional .layout_config drives the stack.
export function buildGeometry(topoInput) {
  if (topoInput) { TOPO = topoInput; _recomputeDerived(); }
  applyLayoutConfig();

  const geometry = {
    effective_px_per_inch: 96,
    content_area: { width_px: 0, height_px: 0 },
    devices: {}, routed_elements: {}, annotations: {}, level_lines: [],
    sections: {}, equipment_labels: [], glyph_supplements: [], bus_dots: [], layout_warnings: []
  };
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  const ext=(x,y)=>{ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; };

  window.__GEOM_CAP = { ann:{}, levelLines:[], sections:[], equipmentLabels:[], glyphSupplements:[], busDots:[] };
  TOPO.sheets.forEach(sheet => {
    const markup = buildSheet(sheet.sheet_id);
    TOPO.devices.filter(d => d.sheet_id === sheet.sheet_id).forEach(d => {
      const g = G[d.id];
      if (!g || !isFinite(g.x) || !isFinite(g.y)) return;
      ext(g.x, g.y);
      // schema §14.1: w/h/anchor_mode via exportDims() — lockstep
      // with exportGeometry() in the viewer HTML.
      const dims = exportDims(d.node_type);
      geometry.devices[d.id] = {
        anchor:{ x:_round2(g.x), y:_round2(g.y) },
        w:_round2(dims.w), h:_round2(dims.h), anchor_mode: dims.anchor_mode
      };
      // Schema §14.1: flip flag for the Revit add-in — lockstep
      // with exportGeometry() in the viewer HTML; emitted only when truthy.
      if (g.flip_vertical) geometry.devices[d.id].flip_vertical = true;
    });
    // Harvest feeder/bus route vertices via the shared regex harvester
    // harvestRoutesFromMarkup (defined in the viewer body, included above —
    // regex-only, identical in-browser and headless). Retires the former
    // _harvestRoutes twin (cleanup P4-T2-B); same reMap-filter + first-wins +
    // ext + round as exportGeometry()'s harvestRoutes.
    const _routes = harvestRoutesFromMarkup(markup);
    Object.keys(_routes).forEach(id => {
      if (!reMap[id]) return;                    // skip unlabeled / non-topology lines
      if (geometry.routed_elements[id]) return;  // first occurrence wins
      const verts = _routes[id];
      verts.forEach(p => ext(p.x, p.y));
      geometry.routed_elements[id] = { path_vertices: verts.map(p => ({ x:_round2(p.x), y:_round2(p.y) })) };
    });
    // DROP REPORT (OFF-012): per-entity coverage diff via the
    // sheet's RenderManifest — silent drops become loud layout_warnings.
    // Full-coverage sheets (the golden case) add nothing.
    if (manifest) {
      const cov = manifest.audit();
      if (!cov.ok) {
        geometry.layout_warnings.push(
          'sheet ' + sheet.sheet_id + ': DROPPED ' + cov.misses.length + ' of ' +
          cov.total + ' expected entities (rendered ' + cov.rendered +
          ', intentional skips ' + cov.intentionalSkips + ')');
        cov.misses.forEach(m => geometry.layout_warnings.push(
          'DROPPED ' + m.type + ' ' + m.id + ' (' + m.label + ') on ' + sheet.sheet_id));
      }
    }
  });
  Object.keys(window.__GEOM_CAP.ann).forEach(id => {
    if (!anMap[id]) return;
    const p = window.__GEOM_CAP.ann[id];
    if (!isFinite(p.x)||!isFinite(p.y)) return;
    ext(p.x,p.y);
    // Schema §14.1: A-1 pill center passthrough — lockstep with
    // exportGeometry(). Not fed to ext() (excluded from content_area).
    const annRec = { x:_round2(p.x), y:_round2(p.y) };
    if (p.pill && isFinite(p.pill.x) && isFinite(p.pill.y)) {
      annRec.pill = { x:_round2(p.pill.x), y:_round2(p.pill.y) };
    }
    // Schema §14.1: A-3 resolved squiggle-label passthrough —
    // lockstep with exportGeometry(). Not fed to ext() (like pill).
    if (p.label && isFinite(p.label.x) && isFinite(p.label.y)
        && typeof p.label.text === 'string') {
      annRec.label = { x:_round2(p.label.x), y:_round2(p.label.y),
                       anchor: p.label.anchor, text: p.label.text };
    }
    geometry.annotations[id] = annRec;
  });
  // A-7 level lines (schema §14.6) — ordered array, not fed to ext()
  // (level-line extents excluded from content_area, matching the golden).
  geometry.level_lines = window.__GEOM_CAP.levelLines
    .filter(r => isFinite(r.y) && isFinite(r.x_start) && isFinite(r.x_end))
    .map(r => ({
      sheet: r.sheet, level: r.level, label: r.label,
      y:_round2(r.y), x_start:_round2(r.x_start), x_end:_round2(r.x_end)
    }));
  // L1-2 sections (schema §14.7) — id-keyed object (section ids are
  // unique, unlike per-sheet level codes), so it inherits the §14 FK check.
  // Not fed to ext(). Lockstep with exportGeometry() in the viewer HTML.
  window.__GEOM_CAP.sections
    .filter(r => isFinite(r.x) && isFinite(r.y) && isFinite(r.w) && isFinite(r.h))
    .forEach(r => {
      geometry.sections[r.id] = {
        sheet: r.sheet, switchboard_id: r.switchboard_id, type: r.type,
        nec_class: r.nec_class, section_tag: r.section_tag,
        x:_round2(r.x), y:_round2(r.y), w:_round2(r.w), h:_round2(r.h)
      };
    });
  // A-8 equipment labels (schema §14.8) — ordered array, kept OUT of
  // geometry.annotations (FK-validated; A-8 has no topology instance, as A-7).
  // Not fed to ext(). Lockstep with exportGeometry() in the viewer HTML.
  geometry.equipment_labels = window.__GEOM_CAP.equipmentLabels
    .filter(r => isFinite(r.x) && isFinite(r.y))
    .map(r => ({
      sheet: r.sheet, bound_to: r.bound_to, bound_to_type: r.bound_to_type,
      anchor: { x:_round2(r.x), y:_round2(r.y) },
      align: r.align, line_pitch: r.line_pitch,
      first_line_pitch: r.first_line_pitch,
      label: r.label, lines: r.lines.slice()
    }));
  // Glyph supplements (schema §14.9) — engine-drawn connecting
  // linework with no topology instance (utility primary feed + TO-UTILITY
  // squiggle). Ordered array with its own sheet. Not fed to ext(). Lockstep
  // with exportGeometry() in the viewer HTML.
  geometry.glyph_supplements = window.__GEOM_CAP.glyphSupplements
    .filter(r => r.kind === 'polyline'
      ? Array.isArray(r.vertices) && r.vertices.length >= 2 &&
        r.vertices.every(p => isFinite(p.x) && isFinite(p.y))
      : isFinite(r.x) && isFinite(r.y))
    .map(r => r.kind === 'polyline'
      ? { id: r.id, sheet: r.sheet, kind: r.kind,
          host_device_id: r.host_device_id, role: r.role,
          vertices: r.vertices.map(p => ({ x:_round2(p.x), y:_round2(p.y) })) }
      : { id: r.id, sheet: r.sheet, kind: r.kind,
          host_device_id: r.host_device_id, role: r.role,
          x:_round2(r.x), y:_round2(r.y), text: r.text,
          text_side: r.text_side, orient: r.orient });
  // Bus connection dots (schema §14.10) — incoming-feeder × bus
  // junction dot, drawn inline and captured above. Ordered array with its own
  // sheet. Not fed to ext(). Lockstep with exportGeometry() in the viewer HTML.
  geometry.bus_dots = window.__GEOM_CAP.busDots
    .filter(r => isFinite(r.x) && isFinite(r.y))
    .map(r => ({ id: r.id, sheet: r.sheet,
      host_device_id: r.host_device_id, role: r.role,
      x:_round2(r.x), y:_round2(r.y) }));
  delete window.__GEOM_CAP;

  geometry.content_area.width_px  = Math.ceil(maxX > -Infinity ? maxX : 0);
  geometry.content_area.height_px = Math.ceil(maxY > -Infinity ? maxY : 0);
  const counts = {
    devices: Object.keys(geometry.devices).length,
    routed_elements: Object.keys(geometry.routed_elements).length,
    annotations: Object.keys(geometry.annotations).length
  };
  geometry.layout_warnings.push(
    'Exported from sld_engine.mjs at 96px/in: ' +
    counts.devices + ' devices, ' + counts.routed_elements + ' routed, ' +
    counts.annotations + ' annotations.');
  return geometry;
}

// Expose the resolved default hospital layout_config (for extraction/tooling).
export function hospitalLayoutConfig() {
  return {
    floor_order:              _DEF_FLOOR_ORDER,
    floor_anchors:            _DEF_FLOOR_ANCHORS,
    floor_anchors_mechanical: _DEF_FLOOR_ANCHORS_MECH,
    level_map:                _DEF_LEVEL_MAP,
    level_order:              _DEF_LEVEL_ORDER,
    riser_step_standard:      _DEF_RISER_STD,
    riser_step_roof:          _DEF_RISER_ROOF,
    ats_xoffset_overrides:    _DEF_ATS_XOFFSET
  };
}

export function embeddedTopology() { return TOPO; }
