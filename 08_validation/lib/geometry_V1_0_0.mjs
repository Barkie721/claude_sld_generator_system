// 08_validation/lib/geometry_V1_0_0.mjs — shared Phase-3 geometry model.
// Spec of record: 02_specs/drafting/sld_preflight_V1_0_0.md (§1 coordinate/extent model,
// §2 bounding-box authority).
//
// Coordinates are composition px at 96 px/in, y-down, FLOATING ORIGIN — negative values
// are valid (layout engine §1). Absolute page-fit is guaranteed by construction
// (compose-time transform, layout engine §8); envelopes here are validator-side
// conservative approximations sourced from sld_system_model_V1_0_0.md symbol geometry,
// NOT engine data (since devices export anchor + w/h/anchor_mode and A-1
// annotations add pill:{x,y}, but these envelopes remain validator-side approximations
// — deliberately richer than drawn boxes; see the NOTE below).
//
// The model is memoized on ctx (ctx._geom), mirroring lib/graph_V1_0_0.mjs / ctx._graph.
import { isObj, isNum } from './context_V1_0_0.mjs';

// §6 calibration constants — initial values per preflight §4; M-tunable with a
// handoff journal entry. Echoed into every geometry-bearing report (buildPreflightSummary).
export const CALIBRATION = {
  // SH-2b legibility threshold. Hospital actuals 0.5662 / 0.4841 — measured at engine
  // rev 1.0.15 (FU-0008) and UNCHANGED at rev 1.0.16, re-derived 2026-08-03: G6 and sync
  // [P6] match all 6 composed-page baselines on disk with audit.json viewer_revision at
  // 1.0.16, so no composed pixel moved. (This comment carried a bare "engine rev 1.0.15"
  // stamp until then, which read as the CURRENT rev rather than the measurement's.)
  // ⚠️ The value 0.20 is UNCHANGED and deliberately so: the actuals moved UP,
  // so the margin over this threshold grew. Only the rationale was stale — it read
  // `0.4416 / 0.3972`, and 0.4416 was already wrong before FU-0008 (the measured
  // pre-change transform was 0.4454). Re-tuning the constant is a §6 calibration act
  // with a handoff journal entry, not a doc fix.
  s_pred_min: 0.20,
  sh4_inflate_px: 1000, // SH-4 annotation proximity slack (chain heights ≤ 791 px)
  sh5_inflate_px: 500,  // SH-5b routed-vertex proximity slack
  sh3_overlap_px2: 25,  // SH-3 pairwise device-envelope overlap tolerance
};

// Horizontal space reserved left of the switchboard for the designation label and
// data-field text block. SINGLE AUTHORITY: sld_topology_rules_V1_0_0.md §Dimension
// Variables `switchboard_text_zone_w` = 200 (preflight §3.6 consumes it by
// reference; the engine's DIM.sw_text_zone_w mirrors the same value).
export const SWITCHBOARD_TEXT_ZONE_W = 200;

// Compose-time target rect (layout engine §8.1: drawing area (72,72,3408,2736)
// inset by PAGE_INNER_PAD 24 → (96,96,3360,2688)).
export const PAGE_TARGET = { w: 3360, h: 2688 };

// Aux device types: zero-size anchor-point envelopes, excluded from SH-3 pairwise
// collisions (preflight §2 aux table).
export const SH3_EXCLUDED_TYPES = new Set(['L1-2', 'L1-3', 'L1-4', 'L2-7', 'L2-8']);

const finite = Number.isFinite;

// ---- device envelopes (preflight §2 relative-box table;
// symbol dimensions from sld_system_model_V1_0_0.md). Relative boxes are
// {left, top, w, h} offsets from the exported anchor.
// Family-dims retune: symbol boxes are the MEASURED Revit family
// drawn bounding boxes ("09_tests/Hospital Example (Golden Case)/Revit Tests
// Docs/hospital - SLD family dimensions.csv"; FL-0004) — mirrors the
// engine BOX table in 04_renderer/sld_viewer_engine_V1_0_0.html. Unmeasured
// types (L1-5 gen, L3-1, L3-3) keep their legacy envelopes.
// NOTE (deliberate non-retirement): the engine now exports per-device
// w/h/anchor_mode (schema §14.1), but this table is NOT a plain drawn-box
// mirror — it is the preflight ENVELOPE table: breakers add text extents
// (breakerBox), L2-2 adds the flex-ground L-path, L0-1 includes the dashed
// clearance below the family box (h 200 vs drawn 140), and L1-5/L3-x carry
// legacy provisional sizes. Substituting the exported drawn box would change
// clash-check behavior, which Re-freeze  forbids. Revisit at the
// Phase-3 re-freeze (gen/port retune, Gate 5) when envelope semantics are
// re-derived from measured data.
const XFMR_BASE = { left: 0, top: 0, w: 49.17, h: 35 };
// L-path ground expansion: drop line at x−19 (widest ground line reaches
// x−27; −19 kept per legacy convention), stack bottom ≈ box h + 26.
const XFMR_FLEX_LEFT = { left: -19, top: 0, w: 68.17, h: 61 };
const XFMR_FLEX_RIGHT = { left: 0, top: 0, w: 68.17, h: 61 };
const CB_TEXT_GAP = 12, CB_R_NODE = 4, CB_HEIGHT = 44.37; // family drawn height (engine BOX['L2-1'].h)

function breakerBox(device) {
  // text = "amps + separator + poles" right of symbol (system model §L2-1 data fields);
  // text_w estimated at 8 px/char (same approximation as the layout engine), formula
  // symmetric both sides (text SIDE is not exported; anchor_mode
  // gives only vertical bus-dot orientation).
  // orientation fix: the L2-1 anchor is the BUS DOT and the ladder
  // is drawn UPWARD (glyph top = anchor − CB_HEIGHT); the legacy box extended
  // downward from the anchor. L1-1 (GFP main breaker) genuinely extends
  // downward (main bus → secondary bus) and keeps the legacy orientation.
  const df = isObj(device.data_fields) ? device.data_fields : {};
  const txt = `${df.at ?? df.af ?? df.amps ?? ''}/${df.poles ?? ''}`;
  const textW = 8 * Math.max(4, txt.length);
  const down = device.node_type === 'L1-1';
  return { left: -(CB_TEXT_GAP + textW), top: down ? -CB_R_NODE : -CB_HEIGHT,
           w: 2 * (CB_TEXT_GAP + textW), h: CB_HEIGHT + CB_R_NODE };
}

function deviceRelBox(device, ctx) {
  switch (device.node_type) {
    case 'L2-4': return { left: 0, top: 0, w: 64, h: 88 };               // family box
    case 'L2-2': {                                                       // family box + L-path
      const flex = (ctx.paByDevice.get(device.id) || []).find(pa => typeof pa.port === 'string' && pa.port.startsWith('flex_'));
      if (flex) return flex.port === 'flex_left' ? XFMR_FLEX_LEFT : XFMR_FLEX_RIGHT;
      return XFMR_BASE;
    }
    case 'L2-1':
    case 'L1-1': return breakerBox(device);                              // incl. text extent
    case 'L1-4': return { left: 0, top: 0, w: 36, h: 36 };               // utility meter (family box)
    case 'L1-6': return { left: 0, top: 0, w: 20.14, h: 67.22 };         // draw-out CB (family box)
    case 'L2-5': return { left: 0, top: 0, w: 40.33, h: 26 };            // disconnect (family box)
    case 'L2-6': return { left: 0, top: 0, w: 36, h: 15 };               // SPD (family box)
    case 'L2-8': return { left: 0, top: 0, w: 36, h: 35.88 };            // branch meter (family box)
    case 'L2-11': return { left: 0, top: 0, w: 72, h: 72 };              // inverter (family box)
    case 'L3-1': return { left: 0, top: 0, w: 24, h: 32 };               // fire pump (MEASURED — _E_SLD_Motor V02 family box)
    // L3-2/L3-3 anchor convention: the exercised engine paths (ATS load_out
    // placement) anchor the box TOP-LEFT (verified on the hospital golden:
    // ELEV-01 anchor.x + 27 = feeder x). The unexercised chain-D/F direct
    // breaker→L3-x paths set anchor.x = feeder centerline — a latent engine
    // ambiguity.
    case 'L3-2': return { left: 0, top: 0, w: 24, h: 32 };               // motor (family box, top-left per SymbolDims)
    case 'L3-3': return { left: 0, top: 0, w: 54, h: 54 };               // equipment connection (UNMEASURED — legacy size, top-left)
    case 'L0-1':
    case 'L0-2': return { left: 0, top: 0, w: 168, h: 200 };             // family box (168×140) + dashed clearance below
                                                                          // (L0-2 UNMEASURED — borrows L0-1's box as approximation)
    case 'L2-3': return { left: 0, top: 0, w: 72, h: 72 };               // family box (stubs now internal)
    case 'L1-5': return { left: 0, top: 0, w: 140, h: 140 };             // generator (UNMEASURED — legacy provisional)
    default: return { left: 0, top: 0, w: 0, h: 0 };                     // aux/unknown: anchor point
  }
}

export function deviceEnvelope(device, anchor, ctx) {
  if (!isObj(anchor) || !finite(anchor.x) || !finite(anchor.y)) return null;
  const r = deviceRelBox(device, ctx);
  return { left: anchor.x + r.left, top: anchor.y + r.top, right: anchor.x + r.left + r.w, bottom: anchor.y + r.top + r.h };
}

// ---- annotation envelopes (preflight §2 WI-7 table — symmetric worst-case
// boxes centered on the exported {x, y}; side/rotation/mode not exported. Since
// A-1 also exports pill:{x,y} — envelopes deliberately still center on
// {x,y} (worst-case both sides); pill-aware envelopes are Phase-3 material).
const TAG_LEADER = 32, TAG_PILL_W_XFMR = 90, TAG_PILL_H = 31;      // A-1 (system model)
const CALLOUT_RUN = 30, CALLOUT_RISE = 48, CALLOUT_STUB = 16, CALLOUT_R = 10; // A-2
const HEX_R = 22;                                                   // A-6

function annTextLen(ann) {
  const c = isObj(ann.content) ? ann.content : {};
  let n = 0;
  for (const v of Object.values(c)) if (typeof v === 'string' && v.length > n) n = v.length;
  return Math.max(4, n);
}

export function annotationEnvelope(ann, pt) {
  if (!isObj(pt) || !finite(pt.x) || !finite(pt.y)) return null;
  const { x, y } = pt;
  switch (ann.annotation_type) {
    case 'A-1': { // side unknown → mirror the one-sided pill box both ways; T-suffix width as worst case
      const hw = TAG_LEADER + TAG_PILL_W_XFMR;
      return { left: x - hw, top: y - TAG_PILL_H / 2, right: x + hw, bottom: y + TAG_PILL_H / 2 };
    }
    case 'A-2': { // symmetric V1 formula; text_w ≈ 8 px/char
      const hw = CALLOUT_RUN + CALLOUT_STUB + 8 * annTextLen(ann);
      return { left: x - hw, top: y - CALLOUT_RISE, right: x + hw, bottom: y + CALLOUT_R };
    }
    case 'A-3': return { left: x - 15, top: y - 10, right: x + 15, bottom: y + 10 };
    case 'A-4':
    case 'A-5': return { left: x - 20, top: y - 10, right: x + 20, bottom: y + 10 };
    case 'A-6': return { left: x - HEX_R, top: y - HEX_R, right: x + HEX_R, bottom: y + HEX_R };
    // A-7 is not a geometry.annotations entry — it lives in geometry.level_lines (§14.6) and
    // is enveloped by levelLineLabelBox() below (preflight §2 last row).
    default: return { left: x, top: y, right: x, bottom: y }; // unknown type: point envelope
  }
}

// ---- A-7 level-line label box (preflight §2 last row; schema §14.6).
// Right-anchored at x_end, 13 px tall (font-size 13, baseline y+4 → top y−9). Width estimated
// at the house 8 px/char monospace rate (same approximation as breakerBox / annTextLen; the
// engine reserves DIM.level_line_label_w = 120 as the gutter). Only the LABEL box is enveloped —
// the LINE box (x_start..x_end) spans the cluster by design and is excluded (preflight §3.3),
// and its negative x_start bounds check stays deferred with A-7 WI-7 (sld_system_model_V1_0_0.md §A-7 Open Work Items).
const LEVEL_LABEL_H = 13;
export function levelLineLabelBox(ll) {
  const w = 8 * Math.max(4, (typeof ll.label === 'string' ? ll.label.length : 0));
  return { left: ll.x_end - w, top: ll.y - 9, right: ll.x_end, bottom: ll.y - 9 + LEVEL_LABEL_H };
}

// ---- box algebra
const emptyExtent = () => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
function addBox(e, b) {
  if (!b) return;
  if (b.left < e.minX) e.minX = b.left;
  if (b.top < e.minY) e.minY = b.top;
  if (b.right > e.maxX) e.maxX = b.right;
  if (b.bottom > e.maxY) e.maxY = b.bottom;
}
function addPoint(e, x, y) {
  if (!finite(x) || !finite(y)) return;
  if (x < e.minX) e.minX = x;
  if (y < e.minY) e.minY = y;
  if (x > e.maxX) e.maxX = x;
  if (y > e.maxY) e.maxY = y;
}
const extentValid = e => finite(e.minX) && finite(e.minY) && finite(e.maxX) && finite(e.maxY);

export function overlapArea(a, b) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return (w > 0 && h > 0) ? w * h : 0;
}

export function inflate(e, px) {
  return { minX: e.minX - px, minY: e.minY - px, maxX: e.maxX + px, maxY: e.maxY + px };
}

// predicted compose scale — preflight §1 (binds to layout engine §8.2):
// legibility indicator, not a reproduction of the engine's s (measureMarkupExtent superset).
export function computeSPred(extent) {
  if (!extentValid(extent)) return null;
  const extW = Math.max(1, extent.maxX - extent.minX);
  const extH = Math.max(1, extent.maxY - extent.minY);
  const s = Math.min(1, PAGE_TARGET.w / extW, PAGE_TARGET.h / extH);
  return Math.min(1, Math.floor(s * 1e4) / 1e4);
}

// ---- the per-topology model, memoized on ctx. Non-finite coordinates are EXCLUDED
// from envelopes/extents here (SH-2a reports them and hard-fails; the model stays
// well-formed so its consumers never propagate NaN).
export function buildGeometryModel(ctx) {
  if (ctx._geom) return ctx._geom;
  const g = isObj(ctx.t.geometry) ? ctx.t.geometry : null;
  const model = { g, perSheet: new Map(), hardFailed: false, hardFailedBy: [] };
  ctx._geom = model;
  if (!g) return model;

  const sheet = id => {
    if (!model.perSheet.has(id)) model.perSheet.set(id, {
      devices: [], annotations: [], vertices: [], levelLines: [], sections: [],
      eDev: emptyExtent(), eUnion: emptyExtent(), sPred: null,
    });
    return model.perSheet.get(id);
  };

  // devices — sheet resolution via the topology entry (geometry keys without a topology
  // counterpart are SCHEMA-14 errors and are skipped here)
  for (const [id, entry] of Object.entries(isObj(g.devices) ? g.devices : {})) {
    const d = ctx.devMap.get(id);
    if (!d || !isObj(entry)) continue;
    const box = deviceEnvelope(d, entry.anchor, ctx);
    if (!box) continue;
    const S = sheet(d.sheet_id);
    S.devices.push({ id, node_type: d.node_type, box, sh3Excluded: SH3_EXCLUDED_TYPES.has(d.node_type) });
    addBox(S.eDev, box);
    addBox(S.eUnion, box);
  }
  // routed-element path vertices
  for (const [id, entry] of Object.entries(isObj(g.routed_elements) ? g.routed_elements : {})) {
    const r = ctx.reMap.get(id);
    if (!r || !isObj(entry) || !Array.isArray(entry.path_vertices)) continue;
    const S = sheet(r.sheet_id);
    entry.path_vertices.forEach((p, i) => {
      if (!isObj(p) || !finite(p.x) || !finite(p.y)) return;
      S.vertices.push({ id, i, x: p.x, y: p.y });
      addPoint(S.eUnion, p.x, p.y);
    });
  }
  // annotations — {x, y} (A-1 also carries pill; envelope uses
  // {x,y} only); only capture-hooked types present (as-built A-1/A-3)
  for (const [id, pt] of Object.entries(isObj(g.annotations) ? g.annotations : {})) {
    const a = ctx.annMap.get(id);
    if (!a) continue;
    const box = annotationEnvelope(a, pt);
    if (!box) continue;
    const S = sheet(a.sheet_id);
    S.annotations.push({ id, type: a.annotation_type, box });
    addBox(S.eUnion, box);
  }
  // A-7 level lines (schema §14.6) — an ORDERED ARRAY (level codes recur
  // across sheets). Only the label box is captured, for the info-level SH-3-A7 collision
  // check. Deliberately NOT added to eDev/eUnion: A-7 extent handling is deferred with WI-7
  // (§14.3), so sPred / SH-4 / SH-5b outputs stay byte-identical to the golden.
  for (const ll of Array.isArray(g.level_lines) ? g.level_lines : []) {
    if (!isObj(ll) || !finite(ll.y) || !finite(ll.x_start) || !finite(ll.x_end)) continue;
    const S = sheet(ll.sheet);
    S.levelLines.push({ level: ll.level, label: ll.label, box: levelLineLabelBox(ll) });
  }
  // L1-2 switchboard sections (schema §14.7) — id-keyed object.
  // This is the export SH-6 was written for and waited on (preflight §3.6):
  // its input, section anchors, did not exist in the block until now. Per §3.6 the
  // text-zone LEFT EDGE is folded into E_union — the text block is right-anchored at
  // the section band and extends leftward, so the extent must account for it.
  //
  // ⚠️ Direction-of-effect (this is a load-bearing safety argument, stated carefully):
  //   - SH-4 and SH-5b inflate **eDev**, NOT eUnion (see sh_rules SH-4/SH-5b) — widening
  //     eUnion does not affect them AT ALL, permissively or otherwise.
  //   - The only consumer of eUnion is sPred, and widening eUnion LOWERS sPred, which
  //     makes SH-2b's legibility floor STRICTER, not more permissive. So this is not a
  //     free "safe direction" change; it is inert only because the magnitude is tiny.
  // Inertness is empirical, not structural: text_zone_left = 240 − 200 = 40 sits well
  // inside each sheet's existing extent (measured left edges: S1 −200, S2 −829.5), and
  // sPred is unchanged on all three live cases. Note addPoint also feeds sec.y and
  // sec.y + sec.h, so a future case with sections outside the vertical extent COULD move
  // sPred — re-verify rather than assuming this stays inert.
  // The section rects themselves are NOT added: they sit inside the switchboard
  // device cluster already covered by eDev, and adding them would be a scope
  // increase §3.6 does not ask for.
  // ⚠️ Sections are recorded even when their coordinates are NON-FINITE, unlike the
  // loops above. SH-6 is a finiteness check on exactly this input, so filtering
  // non-finite sections out here would make it permanently vacuous — and unlike
  // devices/routes/annotations, SH-2a does NOT cover sections (they are excluded from
  // content_area by design, so feeding them to SH-2a's running max would break its
  // content_area ±1 assertion). The model's NaN-free-envelope invariant is preserved
  // the narrow way instead: a non-finite textZoneLeft is never folded into eUnion.
  for (const [id, sec] of Object.entries(isObj(g.sections) ? g.sections : {})) {
    if (!isObj(sec)) continue;
    const S = sheet(sec.sheet);
    // finite(sec.x) guard BEFORE the subtraction: JS coerces `null - 200` to -200
    // (and `"" - 200` to -200), which would sail through a finiteness check on the
    // result and hide exactly the malformed anchor SH-6 exists to catch.
    const textZoneLeft = finite(sec.x) ? sec.x - SWITCHBOARD_TEXT_ZONE_W : NaN;
    S.sections.push({ id, type: sec.type, box: { left: sec.x, top: sec.y, right: sec.x + sec.w, bottom: sec.y + sec.h }, textZoneLeft });
    if (finite(textZoneLeft) && finite(sec.y) && finite(sec.h)) {
      addPoint(S.eUnion, textZoneLeft, sec.y);
      addPoint(S.eUnion, textZoneLeft, sec.y + sec.h);
    }
  }

  for (const S of model.perSheet.values()) {
    if (!extentValid(S.eDev)) S.eDev = null;
    if (extentValid(S.eUnion)) S.sPred = computeSPred(S.eUnion);
    else S.eUnion = null;
  }
  return model;
}

// calibration echo for the result payload (preflight §4) — attached by
// validate_topology as an additive `preflight` block when geometry is present.
export function buildPreflightSummary(ctx) {
  const model = buildGeometryModel(ctx);
  if (!model.g) return null;
  const sPred = {};
  for (const [sid, S] of model.perSheet) sPred[sid] = S.sPred;
  return {
    preflight_version: '1.0.0',
    target_rect: { ...PAGE_TARGET },
    calibration: { ...CALIBRATION },
    s_pred_by_sheet: sPred,
  };
}
