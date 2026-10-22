// geometry_schema_data.mjs — single source of the schema key-lists and enums
// shared by the two validators: the §14 geometry-block lists and the
// §2–§13 top-level/section enums:
//   - 03_contracts/conformance_walk_V1_0_0.mjs   (the conformance walk)
//   - 08_validation/rules/schema_rules_V1_0_0.mjs (the SCHEMA-§N rules)
// Both previously carried byte-identical copies kept in sync BY HAND (each was
// literally commented "Twin of ..."). Add or change a key/enum HERE and both
// validators pick it up. Data only — each validator keeps its own reporting
// shape (the walk's viol(); the rule's F.push()) and its own procedural body.

// §14 block-level key whitelist, split REQUIRED / OPTIONAL. The optional four
// (sections/equipment_labels, glyph_supplements, bus_dots)
// are absent from pre-export blocks, so their absence is legal; the undocumented
// -key check runs against the UNION so the whitelist stays closed.
export const GK_REQUIRED = ['effective_px_per_inch', 'content_area', 'devices', 'routed_elements', 'annotations', 'level_lines', 'layout_warnings'];
export const GK_OPTIONAL = ['sections', 'equipment_labels', 'glyph_supplements', 'bus_dots'];

// §14.1 device anchor_mode enum.
export const ANCHOR_MODES = ['top_left', 'bus_dot_bottom', 'bus_dot_top'];

// §14.1 A-3 resolved squiggle-label text-anchor enum.
export const ANNOTATION_LABEL_ANCHORS = ['start', 'middle', 'end'];

// §14.7 switchboard-section record keys.
export const SEC_KEYS = ['sheet', 'switchboard_id', 'type', 'nec_class', 'section_tag', 'x', 'y', 'w', 'h'];

// §14.8 A-8 equipment-label record keys + align enum (device-bound).
export const EL_KEYS = ['sheet', 'bound_to', 'bound_to_type', 'anchor', 'align', 'line_pitch', 'first_line_pitch', 'label', 'lines'];
export const EL_ALIGN = ['end', 'start'];

// §14.9 glyph-supplement kinds + per-kind key sets.
export const GS_KINDS = ['polyline', 'squiggle'];
export const GS_KEYS_COMMON = ['id', 'sheet', 'kind', 'host_device_id', 'role'];
export const GS_KEYS = {
  polyline: [...GS_KEYS_COMMON, 'vertices'],
  squiggle: [...GS_KEYS_COMMON, 'x', 'y', 'text', 'text_side', 'orient']
};

// §14.10 bus-dot record keys.
export const BD_KEYS = ['id', 'sheet', 'host_device_id', 'role', 'x', 'y'];

// ── §2–§13 shared enums / key-lists ──────────────────────────────────────────
// Same single-source rationale as the §14 lists above: these were byte-identical
// array literals hand-kept in both validators. Deliberately NOT shared here (the
// two validators keep them LOCAL because they genuinely differ): §7 CONTENT_REQ
// (the walk validates A-6 content inline; the rule delegates A-6 to TV-7, so its
// map omits A-6) and §8 bus_architecture (branched in code, not a membership set).

// §2 top-level key whitelist.
export const TOP_REQ_KEYS = ['$schema', 'metadata', 'sheets', 'devices', 'routed_elements', 'annotations', 'switchboards', 'sections', 'port_assignments', 'spur_attachments', 'measurement_attachments', 'cross_sheet_refs'];
export const TOP_OPT_KEYS = ['layout_config', 'layout_hints', 'geometry'];

// §3 accepted schema_version set.
export const SCHEMA_VERSIONS = ['1.0.0'];

// §6 routed-element edge types (R-3 reserved) + R-2 bus levels.
export const EDGE_TYPES = ['R-1', 'R-2'];
export const BUS_LEVELS = ['main', 'secondary', 'distribution'];

// §7 implemented annotation types (A-5 reserved).
export const ANNOTATION_TYPES = ['A-1', 'A-2', 'A-3', 'A-4', 'A-6'];

// §8 switchboard variants.
export const SW_VARIANTS = ['NP', 'EM'];

// §9 section types + NEC emergency classes.
export const SECTION_TYPES = ['incoming', 'metering', 'fire_pump', 'mv_transformer', 'main_breaker', 'distribution'];
export const NEC_CLASSES = ['700', '701', '702'];
