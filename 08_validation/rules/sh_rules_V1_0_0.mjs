// 08_validation/rules/sh_rules_V1_0_0.mjs — Phase 3 geometry preflight (SH-2..SH-6).
// Implementation of 02_specs/drafting/sld_preflight_V1_0_0.md.
//
// Severity mapping (preflight vocabulary → validator vocabulary):
//   hard_fail → error | soft_fail → warning | info → info
// Per H's calibration discipline every rule ENTERED at info and was promoted to its
// spec'd severity only after both geometry-bearing goldens ran clean (gate after each).
//
// Execution order (preflight §5) is registry order within phase 3: SH-2a, SH-5a (hard,
// stop-on-fail) → SH-2b → SH-4 → SH-5b → SH-3 (O(n²)) → SH-3-A7 (A-7 label boxes, info)
// → SH-6 (text-zone finiteness, info, active — registered LAST,
// which is the actual array order; the rules are independent so position is cosmetic).
// "Stop on hard fail" is realized through the shared model's hardFailed flag: the two
// hard rules set it, downstream SH rules emit a single skip advisory instead of running.
//
// Rules run only on WITH_GEOMETRY topologies (requires: ['geometry']); the schema-§14
// block is the sole input. Level lines ARE emitted (§14.6) and drive
// SH-3-A7. `sections` bounds ARE emitted (schema §14.7), which is
// what activated SH-6 — preflight §3.6/§6. Still non-emitted (never required):
// tap_positions, L1-2 device anchors.
import {
  buildGeometryModel, CALIBRATION, inflate, overlapArea, SWITCHBOARD_TEXT_ZONE_W,
} from '../lib/geometry_V1_0_0.mjs';

const PSPEC = '02_specs/drafting/sld_preflight_V1_0_0.md';
const fin = Number.isFinite;
const isO = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function hardSkip(model) {
  return [{
    severity: 'info', path: 'geometry',
    message: `skipped — geometry block failed hard preflight (${model.hardFailedBy.join(', ')}); nothing downstream is trustworthy (preflight §5)`,
  }];
}

export const SH_RULES = [
  {
    id: 'SH-2a', spec_ref: `${PSPEC} §3.1`, title: 'Geometry-block self-consistency (finiteness + content_area = ceil(max exported coords) ±1)', severity: 'error', phase: 3, requires: ['geometry'], status: 'active',
    // hard_fail → error. Stands on the hospital WITH_GEOMETRY case running 0 violations.
    check(ctx) {
      const F = [];
      const model = buildGeometryModel(ctx);
      const g = model.g;
      let maxX = -Infinity, maxY = -Infinity, sawCoord = false;
      const coord = (path, x, y) => {
        if (!fin(x) || !fin(y)) { F.push({ path, message: `non-finite coordinate (${x}, ${y})` }); return; }
        sawCoord = true;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      };
      for (const [id, d] of Object.entries(isO(g.devices) ? g.devices : {})) {
        const a = isO(d) ? d.anchor : null;
        coord(`geometry.devices.${id}.anchor`, isO(a) ? a.x : NaN, isO(a) ? a.y : NaN);
      }
      for (const [id, r] of Object.entries(isO(g.routed_elements) ? g.routed_elements : {})) {
        const pv = isO(r) && Array.isArray(r.path_vertices) ? r.path_vertices : [];
        pv.forEach((p, i) => coord(`geometry.routed_elements.${id}.path_vertices[${i}]`, isO(p) ? p.x : NaN, isO(p) ? p.y : NaN));
      }
      for (const [id, a] of Object.entries(isO(g.annotations) ? g.annotations : {})) {
        coord(`geometry.annotations.${id}`, isO(a) ? a.x : NaN, isO(a) ? a.y : NaN);
      }
      const ca = g.content_area;
      if (!isO(ca) || !fin(ca.width_px) || !fin(ca.height_px)) {
        F.push({ path: 'geometry.content_area', message: 'content_area missing or non-finite' });
      } else if (sawCoord) {
        // exporter runs its running-max on unrounded values then ceil; the block stores
        // 2-decimal-rounded coordinates — recomputation can differ by 1 after ceil (§3.1)
        const eW = Math.ceil(maxX), eH = Math.ceil(maxY);
        if (Math.abs(ca.width_px - eW) > 1)
          F.push({ path: 'geometry.content_area.width_px', message: `content_area.width_px ${ca.width_px} ≠ ceil(max exported x) ${eW} (±1 px) — block inconsistent with its own coordinates` });
        if (Math.abs(ca.height_px - eH) > 1)
          F.push({ path: 'geometry.content_area.height_px', message: `content_area.height_px ${ca.height_px} ≠ ceil(max exported y) ${eH} (±1 px) — block inconsistent with its own coordinates` });
      }
      if (F.length) { model.hardFailed = true; model.hardFailedBy.push('SH-2a'); }
      return F;
    },
  },
  {
    id: 'SH-5a', spec_ref: `${PSPEC} §3.5`, title: 'Routed-element path sanity (≥2 vertices, all finite)', severity: 'error', phase: 3, requires: ['geometry'], status: 'active',
    // hard_fail → error. Same both-goldens-clean evidence as SH-2a.
    check(ctx) {
      const F = [];
      const model = buildGeometryModel(ctx);
      for (const [id, r] of Object.entries(isO(model.g.routed_elements) ? model.g.routed_elements : {})) {
        const pv = isO(r) && Array.isArray(r.path_vertices) ? r.path_vertices : null;
        if (!pv || pv.length < 2) {
          F.push({ path: `geometry.routed_elements.${id}.path_vertices`, message: `routed element has ${pv ? pv.length : 'no'} path vertices (minimum 2) — render-crash risk` });
          continue;
        }
        pv.forEach((p, i) => {
          if (!isO(p) || !fin(p.x) || !fin(p.y))
            F.push({ path: `geometry.routed_elements.${id}.path_vertices[${i}]`, message: `non-finite path vertex` });
        });
      }
      if (F.length) { model.hardFailed = true; model.hardFailedBy.push('SH-5a'); }
      return F;
    },
  },
  {
    id: 'SH-2b', spec_ref: `${PSPEC} §3.2`, title: 'Predicted compose-scale legibility (s_pred ≥ threshold per sheet)', severity: 'info', phase: 3, requires: ['geometry'], status: 'active',
    // info by spec (double safety: threshold 0.20 sits below the smallest golden scale
    // AND the rule never gates). Catches extent explosion — one element stranded far
    // from the diagram crushes the composed scale for the whole sheet.
    check(ctx) {
      const model = buildGeometryModel(ctx);
      if (model.hardFailed) return hardSkip(model);
      const F = [];
      for (const [sid, S] of model.perSheet) {
        if (S.sPred === null || S.eUnion === null) continue;
        if (S.sPred < CALIBRATION.s_pred_min) {
          const e = S.eUnion;
          F.push({
            path: `geometry (sheet ${sid})`,
            message: `predicted compose scale ${S.sPred} below legibility threshold ${CALIBRATION.s_pred_min} — extent { minX ${e.minX}, minY ${e.minY}, maxX ${e.maxX}, maxY ${e.maxY} } vs target 3360×2688 (fit still succeeds; legibility dies)`,
          });
        }
      }
      return F;
    },
  },
  {
    id: 'SH-4', spec_ref: `${PSPEC} §3.4`, title: 'Annotation proximity envelope (within E_dev inflated per calibration)', severity: 'info', phase: 3, requires: ['geometry'], status: 'active',
    // WI-7 rewrite: orphaned-annotation detector. Applies only to entries present in the
    // block (as-built A-1/A-3); never REQUIRES an annotation type (that's TV territory).
    check(ctx) {
      const model = buildGeometryModel(ctx);
      if (model.hardFailed) return hardSkip(model);
      const F = [];
      const pad = CALIBRATION.sh4_inflate_px;
      for (const [sid, S] of model.perSheet) {
        if (!S.eDev) continue; // no placed devices on this sheet → nothing to anchor to
        const zone = inflate(S.eDev, pad);
        for (const a of S.annotations) {
          const b = a.box;
          if (b.left < zone.minX || b.top < zone.minY || b.right > zone.maxX || b.bottom > zone.maxY)
            F.push({
              path: `geometry.annotations.${a.id}`,
              message: `${a.type} envelope (${b.left}, ${b.top})..(${b.right}, ${b.bottom}) outside E_dev(${sid}) inflated ${pad} px/side — annotation stranded far from the diagram`,
            });
        }
      }
      return F;
    },
  },
  {
    id: 'SH-5b', spec_ref: `${PSPEC} §3.5`, title: 'Routed vertices within E_dev inflated per calibration', severity: 'info', phase: 3, requires: ['geometry'], status: 'active',
    // Feeders/buses connect placed devices; a vertex farther out indicates a mis-harvested
    // route or stranded stub. Sheet resolution: the routed element's own topology sheet_id
    // (cross-sheet pair segments are validated on their own sheet only).
    check(ctx) {
      const model = buildGeometryModel(ctx);
      if (model.hardFailed) return hardSkip(model);
      const F = [];
      const pad = CALIBRATION.sh5_inflate_px;
      for (const [sid, S] of model.perSheet) {
        if (!S.eDev) continue;
        const zone = inflate(S.eDev, pad);
        for (const v of S.vertices) {
          if (v.x < zone.minX || v.y < zone.minY || v.x > zone.maxX || v.y > zone.maxY)
            F.push({
              path: `geometry.routed_elements.${v.id}.path_vertices[${v.i}]`,
              message: `vertex (${v.x}, ${v.y}) outside E_dev(${sid}) inflated ${pad} px/side — mis-harvested route or stranded stub`,
            });
        }
      }
      return F;
    },
  },
  {
    id: 'SH-3', spec_ref: `${PSPEC} §3.3`, title: 'Device envelope collisions (pairwise overlap ≤ tolerance, aux types excluded)', severity: 'warning', phase: 3, requires: ['geometry'], status: 'active',
    // soft_fail → warning (renderable but degraded; EOR review — never gates the exit
    // code). Same both-goldens-clean evidence as SH-2a.
    // Origin-agnostic (pure relative geometry) — unchanged in substance from V1.
    // Aux types {L1-2, L1-3, L1-4, L2-7, L2-8} excluded (intentional overlapping
    // placement). Violation messages are the string rendering of the V1
    // COLLISION_WARNING record with source "preflight" (layout_warnings are strings
    // as-built; this validator never mutates the input file). O(n²) pairwise, run last.
    check(ctx) {
      const model = buildGeometryModel(ctx);
      if (model.hardFailed) return hardSkip(model);
      const F = [];
      const tol = CALIBRATION.sh3_overlap_px2;
      for (const [sid, S] of model.perSheet) {
        const ds = S.devices.filter(d => !d.sh3Excluded);
        for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
          const area = overlapArea(ds[i].box, ds[j].box);
          if (area > tol)
            F.push({
              path: `geometry.devices.${ds[i].id}`,
              message: `COLLISION_WARNING {source: "preflight", sheet: ${sid}, devices: [${ds[i].id} ${ds[i].node_type}, ${ds[j].id} ${ds[j].node_type}], overlap_px2: ${Math.round(area * 100) / 100}, tolerance: ${tol}}`,
            });
        }
      }
      return F;
    },
  },
  {
    id: 'SH-3-A7', spec_ref: `${PSPEC} §3.3 (A-7)`, title: 'A-7 level-line label-box collisions (info; line boxes excluded, bounds deferred WI-7)', severity: 'info', phase: 3, requires: ['geometry'], status: 'active',
    // Activated, when geometry.level_lines began to be emitted (schema
    // §14.6). Preflight §2/§3.3: A-7 LINE boxes span the cluster by design and are excluded;
    // A-7 LABEL boxes are checked for overlap at INFO — vs each other and vs device envelopes
    // on the same sheet. Never gates (info-only; the acceptance gate's SH gating guard would
    // catch any error/warning anyway). Bounds-checking of the line extents stays deferred with
    // A-7 WI-7 (negative x_start; sld_system_model_V1_0_0.md §A-7 Open Work Items), so this rule never touches eDev/eUnion/sPred.
    // On a geometry block with no level_lines (older exports), every sheet's list is empty → [].
    check(ctx) {
      const model = buildGeometryModel(ctx);
      if (model.hardFailed) return hardSkip(model);
      const F = [];
      const tol = CALIBRATION.sh3_overlap_px2;
      for (const [sid, S] of model.perSheet) {
        const lls = S.levelLines || [];
        if (!lls.length) continue;
        // label vs label (same sheet)
        for (let i = 0; i < lls.length; i++) for (let j = i + 1; j < lls.length; j++) {
          const area = overlapArea(lls[i].box, lls[j].box);
          if (area > tol)
            F.push({ path: `geometry.level_lines (sheet ${sid})`, message: `A-7 label overlap {sheet: ${sid}, levels: [${lls[i].level}, ${lls[j].level}], overlap_px2: ${Math.round(area * 100) / 100}, tolerance: ${tol}}` });
        }
        // label vs device envelope (same sheet)
        for (const ll of lls) for (const d of S.devices) {
          const area = overlapArea(ll.box, d.box);
          if (area > tol)
            F.push({ path: `geometry.level_lines (sheet ${sid})`, message: `A-7 label "${ll.label}" overlaps device ${d.id} ${d.node_type} {sheet: ${sid}, overlap_px2: ${Math.round(area * 100) / 100}, tolerance: ${tol}}` });
        }
      }
      return F;
    },
  },
  {
    id: 'SH-6', spec_ref: `${PSPEC} §3.6`, title: 'Switchboard text-zone extent (definitional, finiteness-only)', severity: 'info', phase: 3, requires: ['geometry'],
    // ACTIVATED (schema §14.7): `geometry.sections` now carries the
    // section anchors this rule always needed. It was registered `deferred`
    // purely for want of that input — the body below is the §3.6 spec as written,
    // not a new design.
    // ⚠️ FINITENESS-ONLY. The V1 `text_zone_left >= 0` reading is RETIRED and must not be
    // restored: under the floating origin the goldens anchor at x = -767.5 and leftmost
    // sections make the expression negative BY DESIGN (the text zone extends the extent
    // leftward and compose absorbs it, layout V2 §8). Re-adding `>= 0` fails both goldens.
    // The text-zone left edge is folded into E_union in buildGeometryModel.
    status: 'active',
    check(ctx) {
      const F = [], model = buildGeometryModel(ctx);
      if (!model.g) return F;
      // stop-on-hard-fail, same contract as every other SH rule (preflight §5): if the
      // block failed SH-2a/SH-5a nothing downstream is trustworthy.
      if (model.hardFailed) return hardSkip(model);
      for (const [sid, S] of model.perSheet) {
        for (const sec of S.sections) {
          if (!fin(sec.textZoneLeft)) {
            F.push({
              path: `geometry.sections.${sec.id}`,
              message: `text_zone_left non-finite {sheet: ${sid}, section: ${sec.id}, section_anchor_x: ${sec.box.left}, switchboard_text_zone_w: ${SWITCHBOARD_TEXT_ZONE_W}} — section anchor is not a usable number`,
            });
          }
        }
      }
      return F;
    },
  },
];
