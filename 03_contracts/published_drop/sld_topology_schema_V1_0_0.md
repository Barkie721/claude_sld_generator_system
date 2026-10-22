# SLD Topology Schema — JSON Contract Specification — V1.0.0

Defines the machine-readable JSON structure for a composed SLD topology. This is the central contract in the SLD pipeline: the AI generation layer produces it, the validation layer enforces it, the layout engine adds geometry to it, the renderer consumes it, and the Revit translation layer maps from it.

**Version 1.0.0.** This document is an **as-built codification**: it records what the engine
(`04_renderer/sld_viewer_engine_V1_0_0.html`) and its reference topology actually produce and
consume. Spec follows engine.

> **Note.** The **Office Example** and **Lab Example** test cases were retired outright (removed from `09_tests/`). Every reference below to the office (or lab) example — including `office_layout_config.json` and the `09_tests/Office Example/…` paths — describes behavior now **frozen as-built**; those files no longer exist on disk. The dialect decisions (a)–(f), the §19 `layout_config` defaults, and the counter-rebase guidance are **retained as the calibration record**, not as live fixtures. Hospital is the sole live reference topology. (Spec-follows-engine: none of these baked decisions is un-made merely because its exemplar was deleted.)

This is one of the contract files in the SLD library:
- **`sld_topology_schema_V1_0_0.md`** (this file) — JSON structure, field definitions, referential integrity rules
- **`sld_system_model_V1_0_0.md`** — symbol ontology defining every `node_type` and its ports, data fields, and calc fields
- **`sld_topology_rules_V1_0_0.md`** — composition rules that produce instances conforming to this schema; validation rules (§7) that verify correctness

---

Dialect decisions (a)–(f) are codified at: (a) §12, (b) §6/§8, (c) §6, (d) §19 `floor_order`, (e) §19 `level_map`, (f) §6 continuation entry.

---

## 1. Design Principles

**Typed collections with explicit relationships.** Each object type has exactly one home collection. All relationships are explicit foreign keys (`*_id` fields). No nesting beyond one level — flat collections enable uniform iteration, filtering, and indexing.

**Topology and geometry are separated.** The `geometry` block is a top-level namespace that is absent before the layout engine runs. The AI generates topology-only contracts. The §7 validator checks topology without geometry. The layout engine adds geometry. The renderer requires both.

**Multi-sheet from day one.** The `sheets[]` collection exists even for single-sheet compositions (one entry). Cross-sheet feeders are two R-1 instances linked by `cross_sheet_refs[]`. Per-sheet validation is possible; global validation resolves cross-sheet links.

**Data layer version pinning.** The optional `metadata.data_layer_versions` object records which version of each JSON data file was used during composition. The validator loads the correct reference data by version.

**Calc fields are optional.** A topology with empty calc fields is valid for drawing — it cannot participate in automated fault current or voltage drop analysis, but it passes structural validation. DV-category rules require calc fields to be populated.

**Spec follows engine.** Where the drafting specs and the shipped engine disagree, this contract records the engine's behavior, because the engine's output is the pixel-frozen golden baseline. Contract changes that would alter golden-render output require golden regeneration and are separate design decisions.

**Open objects.** Unknown keys in `data_fields`, `calc_fields`, `content`, `metadata`, `layout_config`, and `layout_hints` are permitted and ignored by consumers. Only the vocabularies documented here carry rendering or validation semantics. This is how both reference topologies coexist: keys outside the documented vocabulary are inert, not invalid.

---

## 2. Top-Level Structure

```json
{
  "$schema": "sld_topology/v1",
  "metadata": { },
  "sheets": [ ],
  "devices": [ ],
  "routed_elements": [ ],
  "annotations": [ ],
  "switchboards": [ ],
  "sections": [ ],
  "port_assignments": [ ],
  "spur_attachments": [ ],
  "measurement_attachments": [ ],
  "cross_sheet_refs": [ ],
  "layout_config": { },
  "layout_hints": { },
  "geometry": { }
}
```

| Key | Required | Notes |
|-----|----------|-------|
| `$schema` | Yes | Literal `"sld_topology/v1"`. Unchanged across schema minor versions. |
| `metadata` … `cross_sheet_refs` | Yes | The eleven topology collections (§§3–13). May be empty arrays. |
| `layout_config` | No | §19. Layout-engine building-stack configuration. May live embedded here or in a sidecar JSON merged at run time (`run_layout.mjs --config <file>`; sidecar keys win). Absent keys fall back to engine `_DEF_*` hospital defaults. |
| `layout_hints` | No | §20. Per-topology renderer heuristic switches. |
| `geometry` | No | §14. Absent before the layout engine runs. |

---

## 3. Metadata

```json
"metadata": {
  "schema_version": "1.0.0",
  "project_name": "New Hospital — 121,000 SF",
  "created_date": "2026-04-16",
  "slug": "hospital",
  "heading": "Hospital",
  "facts": ["121,000 SF — 3 stories + roof", "2500 kVA service"],
  "project_number": "2026-0142",
  "created_by": "AI Compositor",
  "checked_by": null,
  "revised_date": null,
  "nec_edition": "2023",
  "sheet_template": "30x42",
  "px_per_inch": 96,
  "data_layer_versions": { "sld_sheet_templates": "V1_0_0", "feeder_schedule": "V1_0_0" },
  "title_block": { }
}
```

### Required fields (the real required-set)

| Field | Type | Description |
|-------|------|-------------|
| `schema_version` | string | Semantic version of this spec the topology conforms to. `"1.0.0"` — the single accepted value. **Engine note:** the engine sets `EXPECTED_SCHEMA = '1.0.0'` with an empty `KNOWN_PRIOR_SCHEMAS`; any other declared version is reported as `SCHEMA_UNKNOWN`. |
| `project_name` | string | Project name. Third slug fallback (see `slug`). |
| `created_date` | string (ISO date) | Creation date. |

### Optional fields

| Field | Type | Description |
|-------|------|-------------|
| `slug` | string | **New (de-hospitalization).** Snapshot/export filename prefix. Resolution order in the engine (`_sldSlug()`): `slug` → `heading` → `project_name` → `"sld"`, lowercased, non-alphanumerics collapsed to `_`. Example: office topology sets `"slug": "office"` → `office_S1_dark.png`. |
| `heading` | string | Viewer branding — sidebar heading and document title (`"<heading> SLD — …"`). Also second slug fallback. Golden: `"Hospital"`. |
| `facts` | array of string | Viewer branding — sidebar fact lines under the heading. |
| `project_number` | string | Project number. |
| `created_by` | string | Author or system that produced the topology. |
| `checked_by` | string / null | Reviewer. |
| `revised_date` | string / null | Last revision date. |
| `nec_edition` | string | NEC edition year used for all code references. Required for DV-category validation. |
| `sheet_template` | string | Key into **`sld_sheet_templates_V1_0_0.json`** → `templates`. Default `"30x42"` (Arch E1). The title block template (`01_inputs/templates/`) mirrors it field-for-field. |
| `px_per_inch` | number | Scale factor: composition pixels per paper inch. Default `96`. Tier 2 — EOR may adjust per project. |
| `data_layer_versions` | object | Version of each normalized JSON data file used during composition. Keys match the data layer file base names (without version suffix); values are version strings. When present, the `sld_sheet_templates` entry should read `"V1_0_0"`. |
| `title_block` | object | §3.1. Title block data extension. |

### 3.1 `metadata.title_block`

Promotes the "proposed additive schema extension" from the 01_inputs title block template header (`titleblock_template_30x42_V1_0_0.html`, derived from the Ramiro-approved hospital design of record) into the contract. Consumed by `buildTitleBlock()` / `computeTB()`; drives the Arch E1 sheet frame, title strip, and REVISIONS table when page-mode integration composes SLD content into the 3408×2736 px drawing area.

**Every field is optional.** `buildTitleBlock()` renders `'---'` for missing fields, or blank when `show_placeholders` is `false`.

| Field | Type | Description |
|-------|------|-------------|
| `firm_name` | string | Firm name (title strip, top stack). |
| `firm_tagline` | string | Firm tagline / discipline line. |
| `firm_address_lines` | array of string | Firm address, one string per rendered line. |
| `firm_phone` | string | Firm phone. |
| `client` | string | Client name. |
| `project_address_lines` | array of string | Project address, one string per rendered line. |
| `drawn_by` | string | Drafter initials/name (falls back to `metadata.created_by`). |
| `approved_by` | string / null | Approver. |
| `issue_date` | string | Issue date printed in the title strip (falls back to `metadata.created_date`). |
| `scale` | string | Title-strip scale text (e.g., `"NONE"`). Distinct from `sheets[].scale`. |
| `notes` | array of string | Free-text note lines. |
| `revisions` | array of object | REVISIONS table rows, filled bottom-up (rev 1 in the bottom row; 6 rows). Each: `{ "no": number, "date": string, "description": string }`. |
| `show_placeholders` | boolean | Default `true`. `false` renders missing fields blank instead of `'---'`. |

---

## 4. Sheets

```json
"sheets": [
  { "sheet_id": "S1", "sheet_number": "E-501", "title": "MAIN SINGLE-LINE DIAGRAM — NORMAL POWER" }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sheet_id` | string | Yes | Unique identifier within this topology. Convention: `S1`, `S2`, … |
| `sheet_number` | string | Yes | Drawing number per the project sheet index. |
| `title` | string | Yes | Sheet title block text. |
| `scale` | string | No | Drawing scale. `"NTS"` for SLDs. *(The golden omits it and the engine does not read it.)* |
| `revision` | string | No | Sheet revision number. *(Same demotion.)* |
| `template` | string | No | Sheet template override. If absent, uses `metadata.sheet_template`. Allows mixed sheet sizes (future use). |
| `content_type` | string | No | `"NP"`, `"EM"`, `"overflow"`, or `null`. Informational. Sheet *behavior* is driven by `layout_config.sheet_roles` (§19), not by this field. |

Single-sheet compositions have exactly one entry. Multi-sheet compositions have N entries.

---

## 5. Devices

All Class A placed symbols — L0 through L3, plus L1-2 Switchboard Section and L1-3 N-G Bond. Each device is a single instance of a symbol from the system model registry.

```json
"devices": [
  {
    "id": "d-001",
    "node_type": "L0-1",
    "designation": "UTILITY-XFMR",
    "sheet_id": "S1",
    "data_fields": {
      "kva_rating": 2500,
      "primary_voltage": "13.2kV",
      "secondary_voltage": "480Y/277V",
      "phases": 3,
      "wires": 4
    },
    "calc_fields": { "pct_z": 5.75, "x_over_r": null }
  }
]
```

### Common Fields (all devices)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier within the topology. Convention: `d-NNN`. |
| `node_type` | string | Yes | Symbol type from system model registry (e.g., `"L0-1"`, `"L2-1"`, `"L2-7"`, `"L1-3"`). |
| `designation` | string / null | Yes | Equipment designation per `equipment_designation_legend_V1_0_0.json`. Must be unique across the topology where non-null (TI-3). L1-3 N-G Bond has no designation — `null` (the golden also carries synthetic designations like `"NGB-SERVICE"`; both are accepted, uniqueness still applies). |
| `sheet_id` | string | Yes | Foreign key → `sheets[].sheet_id`. Sheet on which this device is rendered. |
| `data_fields` | object | Yes | **Semantic** rendered-data fields — see §5.1. May be empty `{}` for devices with no rendered text (L1-3, spaces). |
| `calc_fields` | object | No | Calculation metadata per `sld_system_model_V1_0_0.md` for the `node_type`. May be absent or empty `{}`. Required for DV-category validation. |
| `suppress_fc_tag` | boolean | No | Default `false`. When `true`, the compositor does not place an A-4 annotation on this device. Tier 2 EOR override. |

### 5.1 Semantic `data_fields` (dialect)

The renderer formats display text from **semantic** keys; it applies its own units, casing, and line layout. Presentation-style fields (`label`, `line_1`, `line_2`, `line_3`) are **deprecated**: they are inert under the open-objects rule (§1) — a device carrying only presentation fields renders its symbol, designation, and floor badge but omits detail text lines. (The retired office topology was in this state pre-migration.)

Engine-read vocabulary by `node_type` (as built; the system model remains the authority for the full per-type field ontology):

| `node_type` | Engine-read `data_fields` keys | Rendered as |
|---|---|---|
| `L0-1` Utility Transformer | `kva_rating`, `primary_voltage`, `secondary_voltage`, `phases`, `wires` | `<kva_rating>KVA` / `<primary>-<secondary>` / `<wires>W, <phases>PH` |
| `L1-1` Main Breaker/GFP | `af`, `at`, `poles` (`trip_type` retained data) | `<at>A` underlined (fallback `<af>A`), `<poles>P` |
| `L1-4` Utility Meter | `meter_type` (retained data; tooltip kind) | "M" symbol |
| `L1-3` N-G Bond | `sds` (retained data) | symbol only, no text |
| `L1-5` Generator | `kw`, `kva`, plus breaker keys `af`/`at`; `nfpa_level` retained | `<kw>KW / <kva>KVA` |
| `L2-1` Breaker | `af`, `at`, `poles`, `kind`, `internal_to`, `skip_chain_render` (`trip_type` retained) | `<at>A` underlined, `<poles>P`; `kind: "spare"` adds `SPARE` |
| `L2-2` Transformer | `kva`, `config` | `<kva>KVA` / `<config>` |
| `L2-3` ATS | `nec_class` (string; must contain `700`/`701`/`702` for class-sorted EM layout) | class ordering + labels |
| `L2-4` Panelboard | `rating`, `voltage`, `mlo` / `mcb` (booleans) | `<voltage>` / `MLO`\|`MCB` / `<rating>` |
| `L2-6` SPD | `type`, `mode` (`"A"` dedicated CB feed / `"B"` spur) | "SPD" symbol |
| `L2-7` Spare/Space | `kind`: `"spare"` or `"space"` | spare vs space symbol variant |
| `L3-1/L3-2/L3-3` loads | `hp`, `fla`, `kw`, `lra`, `voltage_phase` | stacked load text lines |

**Type discriminators live inside `data_fields`.** The discriminators are `data_fields.kind` (L2-7), `data_fields.mode` (L2-6), and `data_fields.nec_class` (L2-3). Device-level copies of those keys are tolerated as inert, but the engine reads only the `data_fields` versions.

**Sub-feed chain keys (load-bearing, previously undocumented):**

- `internal_to` (string, on L2-1): declares the breaker as living *inside* the named parent panelboard (designation reference). The engine renders it within the parent's chain and suppresses its standalone placement. Chain-B/internal-breaker semantics; also the anchor mechanic behind per-floor sub-feed rows.
- `skip_chain_render` (boolean, on L2-1 with `internal_to`): the breaker participates in topology (feeder source) but is not drawn in the parent's chain graphic.

### Referential Integrity

- Every `sheet_id` must reference a valid `sheets[].sheet_id`.
- Every non-null `designation` must be unique across `devices[]` ∪ `switchboards[]` (TI-3).
- Devices referenced by `sections[].device_ids` must exist in this collection.
- `data_fields.internal_to` must name an existing L2-4 `designation` on the same sheet.

---

## 6. Routed Elements

Class B routed symbols. **As built, two edge types are implemented: R-1 Feeder and R-2 Bus.** R-3 Busway remains defined in the system model but has no renderer, no composition rules, and no instances in either reference topology — it is reserved (see §18).

```json
"routed_elements": [
  {
    "id": "r-006",
    "edge_type": "R-1",
    "designation": "F-006",
    "sheet_id": "S1",
    "start": { "device_id": "d-005", "port": "line_in" },
    "end": { "device_id": "d-021", "port": "feed_top" },
    "stub_exempt": false,
    "data_fields": {},
    "calc_fields": { "conductor_material": "AL", "conductor_size": "500", "conductors_per_phase": 4, "neutral_size": "500", "ground_size": "250", "ground_material": "AL", "conduit_type": "EMT", "conduit_size": "3 1/2\"", "num_sets": 5 },
    "annotation_ids": ["a-006", "a-106"]
  },
  {
    "id": "r-901",
    "edge_type": "R-2",
    "designation": "main-bus-4MDP-1-A",
    "sheet_id": "S1",
    "bus_level": "main",
    "stroke_weight": 2.5,
    "start": null,
    "end": null,
    "stub_exempt": null,
    "data_fields": {},
    "calc_fields": { "bus_rating": 4000 },
    "annotation_ids": []
  }
]
```

### Common Fields (all routed elements)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier. Convention: `r-NNN`; cross-sheet feeder pairs use `r-NNN-s1` / `r-NNN-s2` suffixes (§16). |
| `edge_type` | string | Yes | `"R-1"` (Feeder) or `"R-2"` (Bus). `"R-3"` reserved. |
| `designation` | string | Yes | Unique identifier for the routed element. Feeders use project-specific IDs (e.g., `"F-006"`, `"F-GEN-ATS"`). Buses use switchboard-scoped IDs (e.g., `"main-bus-4MDP-1-A"`). |
| `sheet_id` | string | Yes | Foreign key → `sheets[].sheet_id`. |
| `data_fields` | object | Yes | Routed elements render no text directly (annotations handle text). Typically `{}`. |
| `calc_fields` | object | No | Calculation metadata per system model. Field set depends on `edge_type` (see the §6 calc-field reference tables). |
| `annotation_ids` | array of string | Yes | Convenience reverse-index of bound annotations. **As built, maintained for R-1 feeders only:** every entry must reference an annotation whose `bound_to` is this element, and every annotation bound to an R-1 must appear in its list. **R-2 buses carry `[]` even when annotations bind to them** (golden: A-4 pennants and A-6 notes bind to buses via `bound_to` alone) — the renderer resolves annotations by scanning `bound_to`; it never reads this index. |
| `suppress_vd_tag` / `suppress_fc_tag` | boolean | No | Tier 2 EOR overrides. |
| `stroke_weight` | number / null | No | Instance-level stroke weight override in points (main bus 2.5, secondary 2.0). Absent/`null` → system model default. |

### R-1 Feeder Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | object / **null** | Yes | Source-side endpoint `{ "device_id": "...", "port": "..." }`, or `null` for a continuation entry (below). |
| `end` | object | Yes | Load-side endpoint. Same structure. |
| `stub_exempt` | boolean | Yes | `true` for downstream stub R-1 instances whose conductor spec matches the upstream R-1 (inline disconnect chains; load-side cross-sheet stubs). Exempt from TV-1/TV-2. |

**R-1 `data_fields` keys (retained data, not engine-read):** `is_service_entrance: true` marks the utility service lateral (golden `r-002`). As built, the service-entrance feeder carries an A-2 conduit callout but **no A-1 feeder tag** (a service lateral has no feeder-schedule row) — it is exempt from TV-1, not TV-2 (§15).

**Endpoint targets (dialect decision (c)).** `device_id` nominally references `devices[].id`, but endpoints may also reference an **R-2 bus id** as a first-class attachment point, with `port: "bus_tap_bi"`:

```json
"start": { "device_id": "d-052", "port": "gen_out" },
"end":   { "device_id": "r-903", "port": "bus_tap_bi" }
```

This is how a feeder lands directly on a bus (golden `r-040` → EM distribution bus; office transformer secondary → main bus, ATS load → distribution bus). The engine resolves such endpoints against `routed_elements` and reports them as informational `RE_START_BUSTAP` / `RE_END_BUSTAP` warnings — resolvable, never errors. Validators must accept device-or-bus endpoint targets; an id resolving in neither collection is an error (`RE_*_ORPHAN`).

**Accepted endpoint patterns (OFF-010):** in addition to the CV-8 device-aware table — generator-to-ATS alternate source (`gen_out` → `source2_in`), transformer secondary to bus (`secondary_out` → `bus_tap_bi`), ATS load to bus (`load_out` → `bus_tap_bi`).

**Continuation entry contract (dialect decision (f), OFF-001).** On a sheet whose `layout_config.sheet_roles` value is `"continuation"`, an R-1 with `start === null` whose `end` resolves to a device on the same sheet is the **cross-sheet riser entry**: the engine places the entry device at chain-baseline Y, draws the entry stub into the `end` port, and emits the bound A-3 FROM-squiggle plus R-1 tags. `start: null` R-1s are only meaningful on continuation-role sheets; elsewhere a null start is a composition error (CV-3). A future explicit `continuation_of` field is a candidate for V1.2 (§18).

### R-2 Bus Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bus_level` | string | Yes | **`"main"`, `"secondary"`, or `"distribution"`** (dialect decision (b)). `main`/`secondary` are the two-level lineup buses; `distribution` is the sole bus of a single-bus (MLO) lineup. V1.0.0's `"single"` value is renamed `"distribution"` — no instance ever used `"single"`. |
| `start` / `end` / `stub_exempt` | null | Yes | Buses do not use endpoints. Their topology is defined by section membership and `switchboards[]` bus references. Set to `null`. |

**Rendered bus identity (dialect decision (b)):** the renderer's bus `data-id`s always come from the **switchboard's** `main_bus_id` / `secondary_bus_id` / `distribution_bus_id` fields — an R-2 not referenced by any switchboard is not drawn as a lineup bus.

### Referential Integrity

- Every endpoint `device_id` must resolve in `devices[]` **or** (bus-tap) `routed_elements[]` with `edge_type: "R-2"`.
- Every non-null endpoint `port` must be a valid port name for the referenced device's `node_type` per the system model, or `bus_tap_bi` for bus targets.
- Every entry in `annotation_ids` must reference a valid `annotations[].id`.
- Buses referenced by `switchboards[]` bus-id fields must exist here with `edge_type: "R-2"`.

---

## 7. Annotations

A-layer symbols. **As built, five types are implemented and instantiated: A-1, A-2, A-3, A-4, A-6.** A-5 Voltage Drop Tag remains specified in the system model but has no renderer and no instances — reserved (§18).

```json
"annotations": [
  { "id": "a-006", "annotation_type": "A-1", "bound_to": "r-006", "bound_to_type": "routed_element", "sheet_id": "S1",
    "content": { "tag_text": "12004" } },
  { "id": "a-201", "annotation_type": "A-3", "bound_to": "r-013-s1", "bound_to_type": "routed_element", "sheet_id": "S1",
    "designation": "SQ-F-022",
    "content": { "text": "TO E4A-1-A", "direction": "to", "destination_designation": "E4A-1-A" } },
  { "id": "a-251", "annotation_type": "A-4", "bound_to": "r-901", "bound_to_type": "routed_element", "sheet_id": "S1",
    "content": { "fc_amps": 52296, "mode": null, "anchor": "bus" } }
]
```

### Common Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier. Convention: `a-NNN`. |
| `annotation_type` | string | Yes | `"A-1"`, `"A-2"`, `"A-3"`, `"A-4"`, `"A-6"` (`"A-5"` reserved). |
| `bound_to` | string | Yes | Foreign key → `routed_elements[].id`, `devices[].id`, `switchboards[].id`, or `sections[].id`. The engine resolves `bound_to` against all four collections (`ANN_BOUND_ORPHAN` otherwise). |
| `bound_to_type` | string | Yes | `"routed_element"` or `"device"` (as instantiated; switchboard/section targets would extend this enum). |
| `sheet_id` | string | Yes | Foreign key → `sheets[].sheet_id`. |
| `content` | object | Yes | Type-specific payload (below). |
| `designation` | string | No | optional annotation designation for traceability (golden uses `SQ-F-NNN` on A-3 squiggles). |

### Content by Annotation Type (as built)

| Type | Content fields | Notes |
|------|----------------|-------|
| `A-1` Feeder Tag | `{ "tag_text": "12004" }` | Encoded ampacity + wire count. T-suffix (e.g., `"2504T"`) for transformer secondaries. |
| `A-2` Conduit Callout | `{ "callout_text": "3 1/2\"C - (4)#350 AL + #6 CU GND" }` | Full conduit/conductor spec string. |
| `A-3` Squiggle | `{ "text": "TO E4A-1-A", "direction": "to"\|"from", "destination_designation": "E4A-1-A" }` | `text` is the render source (drawn verbatim). `direction`/`destination_designation` are structured data for cross-referencing; the renderer does not derive text from them. |
| `A-4` Fault Current Tag | `{ "fc_amps": 52296, "mode": null, "anchor": "bus" }` | `fc_amps`: available fault current in **whole amperes** (integer); the renderer comma-formats and suffixes `A`. `mode`: placement-mode override or `null` (engine default). `anchor`: what the pennant hangs from — `"bus"` observed; open enum. A-4 may bind to R-2 buses (`bound_to_type: "routed_element"`) and devices. |
| `A-6` Hex Note | `{ "keynote_number": 1, "keynote_text": "GROUNDING ELECTRODE SYSTEM — …" }` | `keynote_number`: per-sheet sequential positive integer; drives the sorted keynote legend. `keynote_text`: EOR-provided string. |

### Referential Integrity

- Every `bound_to` must resolve in the collection(s) named above.
- Every annotation bound to an **R-1** must appear in that feeder's `annotation_ids`; annotations bound to R-2 buses are not reverse-indexed (§6).
- TV-1/TV-2: every non-stub-exempt R-1 has exactly one A-1 and one A-2 bound to it. TV-1 exemption: `data_fields.is_service_entrance: true` (§6).
- Cross-sheet feeder pairs carry their A-3s directly (`bound_to` → the per-sheet R-1); linkage across sheets is via `cross_sheet_refs[]` (§13), which references the R-1 segments, not the squiggles.

---

## 8. Switchboards

Switchboard assemblies — multi-section lineups containing buses and hosted devices. One entry per physical switchboard.

```json
"switchboards": [
  {
    "id": "sw-001",
    "designation": "4MDP-1-A",
    "variant": "NP",
    "bus_architecture": "two-level",
    "main_bus_id": "r-901",
    "secondary_bus_id": "r-902",
    "distribution_bus_id": null,
    "secondary_bus_overflow_ids": [],
    "sheet_id": "S1",
    "data_fields": { "rating": "4000A", "voltage": "480Y/277V", "wires": "4W, 3PH", "aic": "65kAIC" }
  }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier. Convention: `sw-NNN`. |
| `designation` | string | Yes | Switchboard equipment designation. Unique across switchboards and devices (TI-3). |
| `variant` | string | Yes | `"NP"` or `"EM"`. |
| `bus_architecture` | string | Yes | `"two-level"` (main + secondary bus) or `"single"` (MLO, one distribution bus). Both are exercised: hospital = two two-level boards; office EM board = single (OFF-010 single-bus branch). |
| `main_bus_id` | string / null | Conditional | FK → R-2. Required for `"two-level"`; `null` for `"single"`. |
| `secondary_bus_id` | string / null | Conditional | FK → R-2. Required for `"two-level"`; `null` for `"single"`. |
| `distribution_bus_id` | string / null | Conditional | FK → R-2 with `bus_level: "distribution"`. Required for `"single"`; `null` for `"two-level"`. |
| `secondary_bus_overflow_ids` | array of string | No | Additional R-2 ids for overflow-sheet secondary bus segments. Empty/absent otherwise. |
| `sheet_id` | string | Yes | FK → `sheets[].sheet_id`. |
| `data_fields` | object | Yes | **Semantic** switchboard text fields: `rating`, `voltage`, `wires`, `aic` — the engine renders the text zone as `[designation, rating, voltage, wires]`. `aic` remains a **valid topology field but is no longer rendered or exported** (Mayo: the References/AIC line removed entirely). (Presentation `label`/`line_N` keys are inert, per §5.1.) |

### Referential Integrity

- Bus-id fields must reference valid R-2 `routed_elements[]`.
- TI-2: NP switchboard bus ids disjoint from EM switchboard bus ids.
- DV-10: for `"two-level"`, main `bus_rating` ≥ secondary `bus_rating`.

---

## 9. Sections

Switchboard sections — subdivisions of a lineup. Each belongs to exactly one switchboard and contains zero or more devices.

```json
"sections": [
  { "id": "sec-001", "switchboard_id": "sw-001", "type": "incoming", "order": 1,
    "nec_class": null, "section_tag": "SEC-1", "device_ids": [] }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier. Convention: `sec-NNN`. |
| `switchboard_id` | string | Yes | FK → `switchboards[].id`. |
| `type` | string | Yes | `"incoming"`, `"metering"`, `"fire_pump"`, `"mv_transformer"`, `"main_breaker"`, `"distribution"`. |
| `order` | number | Yes | Left-to-right position within the switchboard (1-indexed). |
| `nec_class` | string / null | Conditional | `"700"` / `"701"` / `"702"` / `null`. Required for distribution sections in Variant EM switchboards. |
| `section_tag` | string | No | display tag for the section boundary (golden: `"SEC-1"` …). |
| `label` | string | No | free-text section label (office uses it on EM sections). |
| `device_ids` | array of string | Yes | FKs → `devices[].id`, left-to-right on the bus. May be empty (incoming/metering sections commonly are). |

Referential integrity: valid FKs; a device appears in at most one section; devices in no section are standalone.

---

## 10. Port Assignments

**As built.** A `{device_id, port, assigned_role}` flex-port role-resolution shape was specified once but no producer or consumer ever emitted it. The golden topology's actual `port_assignments[]` are **connection-documentation records** binding a device port to what it physically attaches to. Two record shapes exist:

```json
"port_assignments": [
  { "id": "pa-001", "device_id": "d-003", "port": "bus_out", "bus_id": "r-901" },
  { "id": "pa-018", "device_id": "d-025", "port": "bus_out",
    "attached_to_device": "d-024", "attached_to_port": "feed_bottom" }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Convention: `pa-NNN`. |
| `device_id` | string | Yes | FK → `devices[].id`. |
| `port` | string | Yes | Port on `device_id` being documented. |
| `bus_id` | string | Shape 1 | FK → `routed_elements[].id` (R-2). The bus this port taps. |
| `attached_to_device` / `attached_to_port` | string | Shape 2 | FK → `devices[].id` + port name. Direct device-to-device attachment. |

Exactly one of the two shapes per record. The engine treats these as non-visual entities (marked rendered by id; no geometry). The collection is optional-in-practice: the office topology carries `[]`. V1.0.0's `assigned_role` flex-port mechanism is withdrawn; CV-8 flex-port classification is deferred until a topology actually uses flex ports (§18).

---

## 11. Spur Attachments

`{spd_id, spd_port, target_id, target_corner}`, rules SV-1..SV-3. **Reserved-in-practice:** both reference topologies carry `[]` (the office SPD is Mode A / breaker-fed). The shape is retained as specified pending a first Mode B instance.

---

## 12. Measurement Attachments

Non-interrupting instrumentation attachments — meters clamped onto routed elements. **Canonical shape (dialect decision (a), engine-hardened / OFF-009):**

```json
"measurement_attachments": [
  { "id": "meas-001", "device_id": "d-002", "host_routed_element_id": "r-901",
    "mode": "ct", "position": "incoming_section" }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Convention: `meas-NNN`. Must be present — the engine's render manifest tracks attachments by `id` (records without one are skipped via the `ma.id` guard, never crash). |
| `device_id` | string | Yes | FK → `devices[].id`. L1-4 Utility Meter or L2-8 Branch Meter. |
| `host_routed_element_id` | string | Yes | FK → `routed_elements[].id`. The R-1 or R-2 the meter clamps onto. |
| `mode` | string | Yes | Attachment mode. `"ct"` (current transformer clamp) observed; open enum. |
| `position` | string | Yes | Placement hint. `"incoming_section"` observed; open enum. |

**Deprecated dialect:** the office topology carries the pre-codification shape `{meter_id, bus_id, attachment_mode}`. The engine tolerates it (the record is simply not manifest-tracked); validators must flag it as a migration item, not a fatal error. New topologies must use the canonical shape.

Measurement-mode devices do not interrupt the host element and are excluded from TI-1 reachability and CV-8 port classification.

---

## 13. Cross-Sheet References

Links paired R-1 feeder segments across sheet boundaries. Empty for single-sheet compositions. **Directional shape, as consumed by the engine's validator and render manifest:**

```json
"cross_sheet_refs": [
  { "id": "cs-001", "kind": "feeder",
    "source_sheet": "S1", "dest_sheet": "S2",
    "source_routed_element_id": "r-013-s1", "dest_routed_element_id": "r-013-s2" }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Convention: `cs-NNN`. |
| `kind` | string | Yes | Link kind. `"feeder"` observed (paired R-1 segments); open enum (a future `"bus"` continuation would land here). |
| `source_sheet` | string | Yes | FK → `sheets[].sheet_id`. Sheet carrying the source-side segment. Must differ from `dest_sheet`. |
| `dest_sheet` | string | Yes | FK → `sheets[].sheet_id`. Load-side sheet. |
| `source_routed_element_id` | string | Yes | FK → `routed_elements[].id`. Source-side R-1 segment. |
| `dest_routed_element_id` | string | Yes | FK → `routed_elements[].id`. Load-side R-1 segment (typically `stub_exempt: true`). |

### Convention

Cross-sheet feeders are **two separate R-1 instances** — one per sheet, conventionally `r-NNN-s1` / `r-NNN-s2` (§16). Each terminates at its own A-3 squiggle, bound directly to the segment (the xref record references the R-1 segments, not the squiggles — squiggle linkage is recoverable through `annotation_ids`). Direction is explicit: power flows source → dest. DV-15 (paired-segment conductor spec identity) applies across each pair.

**Withdrawn shape:** the symmetric `{ref_id: "xref-NNN", sheet_a: {...}, sheet_b: {...}}` was never produced or consumed. The office topology carries a third, transitional flat shape (`{id: "xref-NNN", feeder_id_source, feeder_id_dest, squiggle_id_source, squiggle_id_dest, source_sheet_id, dest_sheet_id}`) — the engine's topology panel reports its members as `XS_*` unresolved (advisory); migration to `cs-NNN` keys is owed. The engine's *rendering* of cross-sheet continuations does not depend on this collection (squiggles + null-start entry contract carry it), which is why the office sheets render correctly regardless.

---

## 14. Geometry (Optional)

Computed spatial data for rendering/translation. Absent before the layout engine runs. **This section specifies the block the engine actually exports** (`exportGeometry()` / `run_layout.mjs` / `buildGeometry()`), Where the drafting spec (`sld_layout_engine_V1_0_0.md`) and this section diverge, **this section governs for engine output**; the drafting spec's original two-pass algorithm was never implemented.

### 14.1 Top-Level Structure (exhaustive — eleven keys)

Seven are **required**; `sections` and `equipment_labels`,
`glyph_supplements`, and `bus_dots` are **optional** — an
older block legitimately lacks them, so validators check them only when present, exactly as they
do device `w`/`h`/`anchor_mode` and the A-1 `pill`. The key *whitelist* is closed
(an undocumented key is an error); the *required* set is the seven.

```json
"geometry": {
  "effective_px_per_inch": 96,
  "content_area": { "width_px": 5200, "height_px": 4950 },
  "devices":         { "d-001": { "anchor": { "x": -180, "y": 4740 }, "w": 168, "h": 140, "anchor_mode": "top_left" } },
  "routed_elements": { "r-901": { "path_vertices": [ { "x": 280, "y": 4580 }, { "x": 985, "y": 4580 } ] } },
  "annotations":     { "a-006": { "x": 1880, "y": 4456, "pill": { "x": 1957, "y": 4456 } } },
  "level_lines":     [ { "sheet": "S1", "level": "1", "label": "LEVEL 1", "y": 4860, "x_start": -220, "x_end": 5300 } ],
  "sections":        { "sec-005": { "sheet": "S1", "switchboard_id": "sw-001", "type": "distribution", "nec_class": null, "section_tag": "SEC-5", "x": 1090, "y": 4520, "w": 1980, "h": 280 } },
  "equipment_labels": [ { "sheet": "S1", "bound_to": "sw-001", "bound_to_type": "switchboard", "anchor": { "x": 220, "y": 4620 }, "align": "end", "line_pitch": 18, "first_line_pitch": 20, "label": "4MDP-1-A", "lines": [ "4000A", "480Y/277V", "4W, 3PH" ] },
                        { "sheet": "S2", "bound_to": "d-112", "bound_to_type": "device", "anchor": { "x": 12.33, "y": 3188 }, "align": "start", "line_pitch": 18, "first_line_pitch": 20, "label": "E4FP-1-A", "lines": [ "100HP", "124 FLA / 725 LRA", "480V/3PH" ] } ],
  "glyph_supplements": [ { "id": "gs-S1-util-feed", "sheet": "S1", "kind": "polyline", "host_device_id": "d-001", "role": "utility_primary_feed", "vertices": [ { "x": -144, "y": 4860 }, { "x": -144, "y": 4950 }, { "x": -414, "y": 4950 } ] } ],
  "bus_dots":        [ { "id": "bd-S1-incoming", "sheet": "S1", "host_device_id": "sec-001", "role": "incoming", "x": 345, "y": 4580 } ],
  "layout_warnings": [ "Exported from hospital viewer at 96px/in: 107 devices, 92 routed, 94 annotations." ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `effective_px_per_inch` | number | Yes | The px/in the layout was computed at (currently always `96`; no overflow-mitigation reducer exists). |
| `content_area` | object | Yes | `{ "width_px", "height_px" }` — **extent-derived**, not sheet-template-derived: the bounding size of everything placed, computed from running min/max during export. `height_px` is taken from maxY so the bottom-most element maps to Revit Y = 0. Not clamped to the `sld_sheet_templates` drawing area; mapping into the 3408×2736 px Arch E1 content box is a compose-time transform owed to the title-block integration phase. **Level lines are excluded from these extents** (they span past the cluster by design — see §14.6). |
| `devices` | object | Yes | Keyed by `devices[].id` → `{ "anchor": { x, y }, "w", "h", "anchor_mode" }`. **Since the anchor semantics are exported per record**: `w`/`h` are the drawn symbol box size in px (measured family bboxes; `L2-7` mirrors the shared L2-1 breaker-family extents; unmapped types export the 80×80 default) and `anchor_mode` says how `anchor` relates to that box — `"top_left"` (drawn box top-left, default), `"bus_dot_bottom"` (bus dot at box bottom-center, ladder drawn upward: L2-1/L2-7), `"bus_dot_top"` (bus dot at box top-center, GFP drawn downward: L1-1). Consumers must prefer the exported fields over any mirrored table (`13_addin/.../Services/SymbolDims` retains its table only as an older fallback). Older records carry `anchor` only — the per-type mode taxonomy above then applies implicitly. a record may additionally carry `"flip_vertical": true` (emitted only when truthy — changelog item 12): the engine renders that device VERTICALLY MIRRORED about its anchor (fire-pump-section L2-1: body below the bus, dot on top; arc/text sides unchanged), and the Revit add-in reproduces it as a 180° rotation about the anchor PLUS the family's hand-flip — the composition is the same pure vertical mirror (arc left, text right). The formerly-recorded side divergence (rotation-only = point reflection, arc right) was CLOSED; no viewer glyph change was ever needed. |
| `routed_elements` | object | Yes | Keyed by `routed_elements[].id` → `{ "path_vertices": [{x,y}, …] }` — ordered polyline (2 vertices straight, 3+ L-path), harvested from rendered markup; first occurrence wins for cross-sheet ids. |
| `annotations` | object | Yes | Keyed by `annotations[].id` → `{ x, y }` — a single representative anchor point per annotation (tick/squiggle/pennant anchor; for A-1 this is the **feeder attach point**, not the pill). **A-1 records additionally carry `pill: { x, y }`** — the drawn pill's CENTER — so consumers can resolve where the viewer draws the pill — e.g. to place the tag or derive its leader direction/orientation (render-time `side`/`orient`/`pill_below` decisions stay unexported; the pill point is their resolved result). Optional: present only on A-1 entries; pill extents are excluded from `content_area`. **A-3 records additionally carry `label: { x, y, anchor, text }`** — the RESOLVED "TO …"/"FROM …" squiggle-label anchor point exactly as `renderSquiggle` emits it AFTER the side/override rules (`A3_TEXT_PLACEMENT` + `layout_config.a3_text_placement`): `x`/`y` are the SVG `<text>` x/y (`y` is the 12 px label's **BASELINE**, not its top), `anchor` is the SVG `text-anchor` keyword (`start`\|`middle`\|`end`), `text` the drawn string (topology `content.text` or the call-site fallback). Optional: present only on A-3 entries whose squiggle rendered with a topology annotation id; label extents are excluded from `content_area` (the drawn text already participates in markup extents). Consumers must use it instead of mirroring the side/override tables. Type-specific field variants (`tick_position`, `side`, `mode`, …) are **not emitted**. |
| `level_lines` | array of object | Yes | Ordered **array** (not id-keyed — a level code recurs across sheets). One entry per rendered A-7 level line: `{ sheet, level, label, y, x_start, x_end }` — see §14.6. Emitted. |
| `sections` | object | Optional | Keyed by `sections[].id` → `{ sheet, switchboard_id, type, nec_class, section_tag, x, y, w, h }` — the L1-2 switchboard-section rectangle the engine has always drawn but never exported. See §14.7. |
| `equipment_labels` | array of object | Optional | Ordered **array** of A-8 equipment label blocks: `{ sheet, bound_to, bound_to_type, anchor, align, line_pitch, first_line_pitch, label, lines }`. One per switchboard (`align:"end"`), plus — — one per L1-5 generator and L3-1 fire pump (`bound_to_type:"device"`, `align:"start"`). Deliberately **not** merged into `annotations` — A-8 has no topology instance. See §14.8. |
| `glyph_supplements` | array of object | Optional | Ordered **array** of engine-drawn connecting linework with no topology instance (the utility primary feed polyline + its "TO UTILITY" squiggle, drawn inline — no R-1/no A-3 in TOPO). Two kinds: `polyline` (`vertices`) and `squiggle` (`x/y/text/text_side/orient`). See §14.9. |
| `bus_dots` | array of object | Optional (emergency incoming) | Ordered **array** of bus connection dots the engine draws inline at feeder×busbar junctions but never exported before. One entry per captured dot: `{ id, sheet, host_device_id, role, x, y }`. Scoped to the **incoming** feeder × main-bus dot on BOTH switchboards (normal utility tap + emergency generator/EMSB tap; the other four `bus_r_dot` sites stay inline until scoped in). See §14.10. |
| `layout_warnings` | array of **string** | Yes | Human-readable warning strings: an export provenance line, plus per-sheet drop reports (`"sheet S2: DROPPED n of m expected entities …"`, one line per miss) when coverage is incomplete. V1.0.0's typed warning objects are not emitted. |

### 14.2 Partial-coverage semantics

The geometry block covers **what the engine placed and rendered**, not the full topology (golden: 107/128 devices, 92/92 routed — the cross-sheet stub halves export their entry-stub `path_vertices` — 94/328 annotations):

- A topology id absent from `geometry.*` means *not independently positioned* — composite-rendered inside a parent symbol (chain breakers, switchboard internals), non-visual (`port_assignments`, xrefs), rendered without a harvestable anchor (legend/text-zone annotations), or intentionally skipped (`sheet_skips`, §19).
- Every id present in `geometry.*` **must** resolve in the corresponding topology collection (the exporter guarantees this; validators check the subset direction only).
- Genuine drops are not silent: the drop report (OFF-012) writes them into `layout_warnings`.

### 14.3 Coordinate space

Composition px, y-down, origin at the engine's internal layout origin — **negative coordinates are valid** (golden device anchors reach x = −729.5, y = −640 before export normalization; office x = −260). Consumers must not assume `0..content_w_px` bounds; SH-2-style bounds checks as written in V1.0.0 would hard-fail the golden output and are deferred to the sheet-format decision (A-7 WI-7, blocked).

### 14.4 Not emitted (removed from the required contract)

- `tap_positions` on R-2 entries (tap dots are rendered but not exported).
- Type-specific annotation geometry (§14.4). *(Partially superseded: A-1 records carry the resolved `pill` center — see §14.1. The descriptor fields themselves — `side`, `orient`, `pill_below` — remain unexported.)*
- **Device port offsets** (L0-1 primary/secondary, ATS source1/source2/load). Deliberately withheld until the ports are measured from the authored Revit families (named reference planes, Measure Families `named_refs_px` contract) — exporting unmeasured estimates would harden wrong numbers into the contract. *Status: the ATS ports ARE now family-measured (source1 9.5 / source2 62.5 / load 36, engine `ATS_PORT_S1_X`/`ATS_PORT_S2_X`) and route `path_vertices` land on them, so a consumer needs no separate port export for ATS; L0-1 primary/secondary remain unmeasured and the offsets stay unexported as a class pending the per-port export decision.*

These may return in a future minor version once an exporter emits them; validators must not require them. (`level_lines` **was** on this list; it is now emitted — see §14.6. The `sections` bounds sub-block **was** on this list too; it is now emitted — see §14.7 — and its arrival is what activated the long-dormant preflight rule SH-6.)

### 14.6 Level Lines (emitted — A-7 WI-6)

Level lines are rendered by the engine (data-driven via `layout_config.level_map` / `level_order`, §19) **and exported** in the geometry block as `geometry.level_lines`. Per the A-7 WI-6 decision, the field set below is the normative shape; it retains only engine-emitted fields — the former A-7 patch's band/roster fields are **not** adopted (nothing emits or consumes them — the tint-band/roster design lives in `sld_system_model_V1_0_0.md` §A-7 *Deferred Features*).

**Container:** an **ordered array of objects** (not id-keyed like `devices`/`routed_elements`/`annotations` — a level code recurs on multiple sheets, so no key is globally unique). The exporter harvests one entry per rendered A-7 line, in render order.

| Field | Type | Description |
|-------|------|-------------|
| `sheet` | string | Owning `sheets[].sheet_id`. Required so consumers fold each line's envelope into the correct per-sheet `E_union` (WI-6 addendum; §14.6 field set extended beyond the original five). |
| `level` | string | Level code (from `layout_config.level_order` vocabulary). |
| `label` | string | Complete emitted label string, e.g. `"LEVEL 1"`, `"LEVEL ROOF"` (engine applies no prefix beyond this — WI-5 reconciled semantics). |
| `y` | number | Y coordinate of the horizontal level line (may be negative — e.g. the S2 fixed-pitch stack pushes upper floors above the content origin). |
| `x_start` | number | Left endpoint X. Engine as built: `bb.minX − 40` (may be negative). |
| `x_end` | number | Right endpoint X. Engine as built: `bb.maxX + 40` (the `<line>` x2 before the label gutter). |

**Consumers (preflight `sld_preflight_V1_0_0.md`):** the A-7 envelope row (§2) builds a line box `(x_start, y−1, x_end−x_start, 2)` and a right-anchored label box `(x_end − label_w_est, y−9, label_w_est, 13)`; SH-3 excludes the line boxes (they span the cluster by design) and checks label boxes at `info`. **Bounds-checking of the line extents (SH-2/SH-4) remains deferred** — the negative `x_start` would hard-fail the V1.0.0 bounds formula, which is A-7 WI-7, still blocked on the sheet-format decision (`sld_system_model_V1_0_0.md` §A-7).

### 14.7 Switchboard Sections (emitted — L1-2)

The engine has always **drawn** the dashed switchboard-section rectangles; it also
**exports** them as `geometry.sections`, which is what lets the Revit add-in place L1-2 content.
Purely additive: the capture is hook-guarded (`window.__GEOM_CAP`), so normal renders and every PNG
snapshot are untouched by construction, and all three live cases are byte-identical after stripping
the key (gate G8).

**Container:** an **id-keyed object**, unlike `level_lines`. Section ids *are* globally unique
topology ids, so keying by id mirrors `devices`/`annotations` and inherits the §14 FK check for free;
a level code, by contrast, recurs per sheet and therefore cannot key.

| Field | Type | Description |
|-------|------|-------------|
| `sheet` | string | Owning `sheets[].sheet_id`. **Required** — `sections[]` in the topology carries no `sheet_id` of its own (§9), so without this the add-in cannot filter per sheet. (The C# `Section.SheetId` is a latent dead field, always empty; consumers must read this instead.) |
| `switchboard_id` | string | Parent `switchboards[].id`. |
| `type` | string | Section type verbatim from the topology (`incoming`, `metering`, `fire_pump`, `main_breaker`, `distribution`, …). |
| `nec_class` | string \| null | NEC class tag (`"700"`, `"701"`, `"702"`) or `null`. |
| `section_tag` | string \| null | Section tag, e.g. `"SEC-5"`. |
| `x`, `y` | number | Top-left of the dashed section boundary. Flat, **not** nested in an `anchor` object — this matches the `__snapshot.element` contract and L1-2's spec anchor. |
| `w`, `h` | number | Section width and height (`h` = `DIM.sw_section_h`, uniform across variants). |

No `anchor_mode` is emitted: L1-2 is **definitionally top-left anchored**, so the mode taxonomy that
applies to devices (§14.1) is not meaningful here.

**Consumers (preflight `sld_preflight_V1_0_0.md` §3.6):** this export is the input **SH-6** was
written for and had been dormant awaiting it; SH-6 is now active. It derives
`text_zone_left = section_anchor_x − switchboard_text_zone_w(200)`, **finiteness-only**, and folds
that left edge into the per-sheet `E_union`. ⚠️ A `≥ 0` reading on that edge stays **retired** — under the
floating origin the goldens' leftmost sections make it negative by design.

### 14.8 Equipment Labels (A-8, emitted)

The equipment text block the engine renders beside each switchboard (`swText()`, right-anchored)
— **and beside the generator and fire pump (`deviceEquipText()`,
start-anchored)** — exported so the Revit `_E_SLD_Equipment-info E01` family can be placed. Was
five lines originally; **four lines** since (the `aic` References line removed
entirely per Mayo — see §15 item 16). A later change (§15 item 21) converted the L1-5/L3-1
renderer-internal side text into A-8 blocks per Mayo: same visual grammar (12px,
line 0 bold underlined, line 1 bold, steps 20 then 18), device-bound records, and the add-in
retired those two DeviceTagPlacer TextNote rows in favor of family instances. Like §14.7 this
is a hook-guarded, additive, export-only change at the schema level.

**Container:** an **ordered array**. ⚠️ A-8 is deliberately **NOT** merged into
`geometry.annotations`: that dict is FK-validated against `topology.annotations[]`, and A-8 has **no
topology instance** — it is derived geometry-only, exactly as A-7 is. Folding it in would both fail
the FK check and push the golden's parity count 94 → 96. One record **per switchboard** (Mayo's
ruling) **plus one per L1-5 generator and L3-1 fire pump**; the in-rect 9px
section type labels are a different, smaller thing and are not A-8 instances.

| Field | Type | Description |
|-------|------|-------------|
| `sheet` | string | Owning `sheets[].sheet_id`. |
| `bound_to` | string | Host id. Reuses the §7 annotation `bound_to` vocabulary verbatim, so it resolves against `devices` ∪ `routed_elements` ∪ `switchboards` ∪ `sections`. |
| `bound_to_type` | string | `switchboard` \| `section` \| `device`. The engine emits `switchboard` and `device` (the latter for the L1-5 generator + L3-1 fire pump, exactly the "bind later with zero schema change" case this enum was provisioned for). `section` remains unemitted but live. Both validator twins sheet-echo `switchboard`- and `device`-bound records against their host. |
| `anchor` | object | `{ x, y }` — the **first line's baseline**, at the end named by `align`: its **right end** when `align:"end"` (switchboard blocks), its **left end** when `align:"start"` (device blocks). |
| `align` | string | Text anchor, `"end"` \| `"start"` (enum-validated). `"end"` = right-anchored, text grows left (switchboard blocks); `"start"` = left-anchored, text grows right of the device glyph (gen/fire-pump blocks). Exported explicitly as insurance against a mirrored label block that would otherwise only surface on a Revit print. |
| `line_pitch` | number | Vertical step between **successive** lines, px (`18`). this is no longer the whole story — the FIRST step differs, see the next row. |
| `first_line_pitch` | number | **Optional.** Step from `label` down to `lines[0]`, px (`20`). The catalog restyle widened only this first step; every later step stays `line_pitch`. Absent on older exports, which were uniform — so it is validated **only-when-present**, exactly like device `w`/`h`/`anchor_mode` and the A-1 `pill`. **Placement rule:** `label` at `anchor.y`; `lines[0]` at `anchor.y + first_line_pitch`; `lines[i>0]` at `anchor.y + first_line_pitch + i × line_pitch`. A consumer that falls back to `line_pitch` for the first step when this key is absent reproduces the older geometry exactly. |
| `label` | string | First line — the bold + underlined designation. Maps to the family's `Label Panel Name`. |
| `lines` | array of string | Remaining lines, in order. Map positionally to the family's `Line 1..3 Text` (was `1..4` before removed the `aic` line; the loaded family never had a `Line 4 Text` parameter, which is why every run warned). |

⚠️ **`label` + `lines` are the POST-COMPACTION list.** `swText()` drops blank fields, so a blank
`rating` slides `voltage` up a slot, while the Revit family has **fixed** slots. Exporting the
*resolved* list is what makes viewer and Revit agree by construction, and it sidesteps the
known-unsolved blank-write bug (a `" "` write still renders as unset in Revit, so the family's
authored sample value prints anyway). Currently latent, not live: both hospital switchboards
populate the three rendered fields, so `lines.length === 3`.

Only named source fields are emitted — never a generic `data_fields` dump (a `data_fields.ser`,
for instance, is ignored by `swText`; `data_fields.aic` joined the ignored set). Device blocks: the generator emits `designation` (falls back to
the literal `GEN`) / `{kw}KW / {kva}KVA` combined / `voltage` (`nfpa_level` and the integral
breaker's `at`/`af`/`trip_type` stay undrawn and unexported); the fire pump emits `designation` /
`{hp}HP` / **`{fla} FLA / {lra} LRA` combined on ONE line** / `voltage_phase`. Both combines exist
because the family has exactly three `Line N Text` slots after the label — the fire pump's four
data fields fit only by sharing (Mayo decision). All three live fire pumps carry all
four fields, so device `lines.length` is 3 (FP) and 2 (gen) everywhere today.

### 14.9 Glyph Supplements (emitted)

Engine-drawn **connecting linework with no topology instance**, exported so a geometry consumer
(the DEADARMS Revit add-in) can draw what the engine draws inline. Today exactly one producer: the
utility block's 13.2kV **primary feed polyline** and its **"TO UTILITY" squiggle** — both drawn
hardcoded at the draw site with the explicit comment "no R-1 / no A-3 in TOPO.
Pre-existing data-model gap". The consequence later surfaced: the add-in placed a
bare transformer with no primary feed. Optional key, validated **only-when-present** in both
validator twins (older exports stay legal); additive-only with the same G8 proof as
§14.7/§14.8; **not** fed to `content_area` (the inline polyline was never a `g.feeder` route).

**Container:** an **ordered array**; records carry their own `sheet` (like §14.8 — there is no
topology id to key by). Ids are deterministic per sheet (`gs-<sheet>-util-feed` /
`gs-<sheet>-util-squig`).

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique within the array. |
| `sheet` | string | Owning `sheets[].sheet_id`. |
| `kind` | string | `polyline` \| `squiggle`. Closed per-kind key whitelist in the validators. |
| `host_device_id` | string | The device whose glyph this linework serves (FK → `devices[]`; today the L0-1 utility transformer). |
| `role` | string | Semantic tag: `utility_primary_feed` (polyline), `utility_primary_continuation` (squiggle). |
| `vertices` | array | **polyline only.** ≥ 2 `{ x, y }` points, same px space as `routed_elements`. |
| `x`, `y` | number | **squiggle only.** Curl center — same anchor semantics as an A-3 `geometry.annotations` record. |
| `text` | string | **squiggle only.** The label (`TO UTILITY`, or the incoming A-3's text). |
| `text_side` | string | **squiggle only.** Which side of the curl the label sits (`left`). |
| `orient` | string | **squiggle only.** `vertical` = the curl runs vertically, marking a **horizontal** wire (the A-3 family is authored as the horizontal-orient curl, so a `vertical` record needs a 90° rotation in Revit). |

⚠️ **The squiggle record exists only on the no-A-3 fallback path.** When the topology DOES carry an
A-3 on the incoming feeder (the office a-501 shape, OFF-004), that squiggle already
exports via `geometry.annotations` and is placed by the annotation path — the capture hook
deliberately skips it so nothing double-places.

### 14.10 Bus Connection Dots (emitted; emergency incoming added)

The **bus connection dot** the engine draws inline at a feeder×busbar junction (`bus_r_dot`, a
filled r=5 pink circle) — the same class of gap `glyph_supplements` closed: drawn
but exported nowhere, so a geometry consumer (the DEADARMS Revit add-in, family
`_E_SLD_Conductor-ends E01 / _Connection Dot`) could not mark the junction. Scoped to the
**incoming feeder × main-bus** dot on BOTH switchboards: the utility secondary tap at the incoming
section center on `normal`-role sheets with an L0-1 utility transformer, and — per
Mayo's request ("emergency switchboard incomming needs a connection dot") — the
generator/EMSB tap at the emergency board's incoming section on `emergency`-role sheets. The engine
draws four other `bus_r_dot` circles (fire-pump tap, ATS load tap, breaker-top, N-G-bond tee) that
stay inline until a later rev scopes them in. Optional key, validated **only-when-present** in
both validator twins (older exports stay legal); additive-only with the same G8 proof as
§14.7–§14.9; **not** fed to `content_area` (the dot coincides with existing bus/routed geometry, so
the export must not move the extents).

Both incoming dots share the deterministic id `bd-<sheet>-incoming`, so a case with a normal and an
emergency sheet exports `bd-S1-incoming` (host = normal incoming section) and `bd-S2-incoming`
(host = emergency incoming section). The emergency dot is captured only when the emergency sheet has
an incoming-typed section; a sheet without one takes the `emSwbdStartX+100` fallback X, which has no
hosting section id, and the dot is not exported (host_device_id must be a real section — see below).

**Container:** an **ordered array**; records carry their own `sheet` (like §14.8/§14.9 — there is
no topology id to key by). Ids are deterministic per sheet (`bd-<sheet>-incoming`).

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique within the array (`bd-<sheet>-incoming`). |
| `sheet` | string | Owning `sheets[].sheet_id`. |
| `host_device_id` | string | The section/element whose bus the dot taps — the incoming `sections[]` id (e.g. `sec-001` normal, `sec-007` emergency). Both validator twins require it to be a real topology section. |
| `role` | string | Semantic tag: `incoming` (the only role today). |
| `x`, `y` | number | Dot center, same px space as `routed_elements` (the junction on the main bus). |

### Geometry Lifecycle

1. **AI composition** → topology contract (§§3–13), `geometry` absent.
2. **Layout engine** (04_renderer `sld_engine.mjs`, via `run_layout.mjs --topo t.json [--config c.json]` or in-viewer `exportGeometry()`) → adds this block.
3. **Preflight** — geometry checks (SH-3 collision advisory via the `__audit` API; A-7 level-line label-box checks at `info` once `level_lines` is present, §14.6; SH-2/SH-4 bounds deferred per §14.3).
4. **Renderer / Revit translation** → consumes topology + geometry.

---

## 15. Validation Rule Mapping

The §7 rule taxonomy of `sld_topology_rules_V1_0_0.md` (TI/SH/CV/TV/SV/DV) carries over with these as-built amendments for the 08_validation implementation:

1. **CV-3/CV-8 (feeder start):** accept `start: null` on continuation-role sheets (§6 entry contract); accept R-2 bus-tap endpoint targets (`bus_tap_bi`) on either end.
2. **CV-4:** an R-1 `end` may terminate at a device port, an R-2 bus tap, or (cross-sheet source segment) carry an A-3 squiggle.
3. **CV-8 flex ports:** withdrawn until a topology uses flex ports — `port_assignments` no longer carries `assigned_role` (§10).
4. **TV-5/DV-13:** A-4 content field is `fc_amps` (whole amps); tolerance comparisons convert accordingly (±100 A ≙ ±0.1 kA).
5. **TV-6/DV-14 (A-5):** vacuous until A-5 is implemented (§7).
6. **CV-13/DV-15:** operate on the §13 directional `cs-NNN` shape (`source_routed_element_id` / `dest_routed_element_id`).
7. **TI-3:** designation uniqueness spans `devices[]` ∪ `switchboards[]`, null-designation devices excluded.
8. **TV-1 service-entrance exemption:** R-1 with `data_fields.is_service_entrance: true` carries no A-1 (§6); TV-2 still applies.
9. **Reverse-index scope:** the `annotation_ids` consistency check applies to R-1 feeders only (§6/§7).
10. **A-7 level lines emitted:** `geometry.level_lines` promoted from the §14.4 not-emitted list to a live export (§14.6). The A-7 preflight envelope checks (`sld_preflight_V1_0_0.md` §2/§3.3) activate at `info`; SH-6 stays dormant (it needs a *separate* `sections`/L1-2-anchor export, not level lines) and the A-7 bounds check stays deferred (WI-7). *(Amended: that SH-6 condition is now MET — `geometry.sections` is exported per §14.7 and SH-6 is active. See item 13. The A-7 bounds deferral is unaffected.)* Schema was at a prior version at that point (the single accepted value is now `1.0.0`); `EXPECTED_SCHEMA` was unchanged by this item (the addition is a geometry-block export, additive to the golden — existing `devices`/`routed_elements`/`annotations`/`content_area` and all PNG baselines are byte-identical).
11. **Device dims + A-1 pill anchor emitted:** `geometry.devices[id]` gains nested `w`/`h`/`anchor_mode` and A-1 `geometry.annotations[id]` gains nested `pill` (§14.1) — the export-side retirement of the mirrored box tables (`13_addin/.../SymbolDims.cs`, `08_validation/lib/geometry_V1_0_0.mjs deviceRelBox`, both retained as older fallbacks). SCHEMA-14 and the conformance walk type-check the new keys **when present**; absence stays legal (older geometry). Additive nested keys only — the seven-key top-level structure, all sibling values, and all PNG baselines are byte-identical (same procedure as item 10).
12. **Render-flip flag emitted:** `geometry.devices[id]` gains nested `flip_vertical: true` — emitted **only when truthy** — for devices the engine renders VERTICALLY MIRRORED about their anchor (today: the fire-pump-section L2-1, whose glyph hangs BELOW the main bus with the bus dot on top; the flip is keyed structurally on section `type: "fire_pump"`, never on designation). Its `anchor_mode` stays `bus_dot_bottom` (unchanged bytes); consumers combine mode + flag: the anchor is the bus-dot center, box below when flipped. The Revit add-in rotates the family 180° about the anchor on this flag (`DevicePlacer`) — a point reflection, per Mayo's approved reference (arc right, text left); the engine's mirror keeps arc left / text right, a deliberate recorded viewer↔Revit side divergence. *(Amended: the add-in now composes the 180° rotation WITH the family's hand-flip — net pure vertical mirror, arc left / text right, matching the engine; the side divergence is CLOSED and no viewer change was needed. An interim flipHand-only DLL proved a hand flip alone cannot cross the bus.)* Absent = not flipped = older bytes; additive-only, proven by strip-and-compare on all 3 cases).
13. **Switchboard sections emitted:** `geometry.sections` promoted from the §14.4 not-emitted list to a live export (§14.7) — an id-keyed object of the dashed section rectangles the engine has always drawn. SCHEMA-14 and the conformance walk gained per-record checks (FK against `sections[]`, required `sheet` resolving in `sheets[]`, `switchboard_id` resolving in `switchboards[]`, numeric `x/y/w/h`); the key is **documented but not required**, so older blocks stay legal. **This export activated SH-6**, dormant purely for want of this input: `text_zone_left = section_anchor_x − switchboard_text_zone_w(200)`, finiteness-only at `info`, folded into `E_union` (inert in practice — `text_zone_left` = 40 sits well inside each sheet's extent and `s_pred` is unmoved at S1 0.5778 / S2 0.4878; note the fold affects only `s_pred`/SH-2b, since SH-4 and SH-5b inflate `E_dev` rather than `E_union`, and it makes SH-2b marginally *stricter*, not more permissive). The V1 `≥ 0` reading stays retired. Additive-only, proven by strip-and-compare on all 3 cases (gate G8).
14. **Equipment labels emitted (A-8):** `geometry.equipment_labels` — an ordered array of the five-line (reduced to FOUR — see item 16) right-anchored switchboard text block, one record **per switchboard** (§14.8). Deliberately **not** merged into `geometry.annotations`: A-8 has no topology instance (derived geometry-only, as A-7), so merging would fail that dict's FK check *and* move the golden's parity count 94 → 96. `bound_to`/`bound_to_type` reuse the §7 annotation vocabulary and accept `switchboard | section | device` from day one, so L0-1/L3-3 can bind later with zero schema change. `label` + `lines` are the POST-COMPACTION list, matching what `swText` actually renders rather than the raw field set. Optional key; additive-only, same G8 proof as item 13. `line_pitch` handling **RESOLVED — see item 15.**

15. **Label block restyled to the catalog:** `swText()` now follows the catalog's L1-2 card, the visual master (Mayo's decision 7, "adopted wholesale"). The engine had diverged **three** ways, not one: **12px throughout** (was 13px line 0 / 11px the rest), **line 1 bold** (was normal), and a **first step of 20** then 18s (was a uniform 18). `text-anchor="end"` and the `lines.filter(Boolean)` compaction are unchanged. This resolves item 14's `line_pitch` warning: the field keeps its meaning (step between successive lines) and the new **optional** `first_line_pitch` carries the wider first step (§14.8). Two scalars rather than an array — that is the actual rule, and it stays correct under compaction, which changes how *many* lines show but never the steps. ⚠️ **This is a TEXT change, so `run_layout --gate` reports 0.0000 and proves nothing** — the net is the PNG byte-compare. Verified: `content_area` did **not** move on any of the three cases (measured, not assumed — right-anchored text feeds `measureMarkupExtent`, so a width change *could* have moved it), G8 stayed 3/3, and the rendered diff is confined to one 61×79 px box on S1 and one 71×85 px box on S2 at identical image dimensions — i.e. the label block and nothing else.

16. **AIC/References line removed:** `swText()` no longer includes `data_fields.aic` — the block is now `[designation, rating, voltage, wires]`, drawn AND exported (the two share one array by construction, §14.8). Removed **entirely** per Mayo: the loaded `_E_SLD_Equipment-info E01` family has no `Line 4 Text` parameter, so the line never printed in Revit and every run warned twice; the engine-drawn 5th line was the only place it survived. `aic` stays a valid §5 topology field — composition is untouched; it simply joined the fields `swText` ignores. `lines.length` is now `3` on all six live switchboards and the add-in's slot count is 3 (a 4-line export against a 3-slot add-in now trips the over-count warning, which doubles as a stale-JSON tell). Same TEXT-change caveat as item 15: `--gate` 0.0000 proves nothing; verified by SVG element-diff — each sheet lost exactly one `<text>65kAIC</text>` element and nothing else, all four themes byte-identical after that single removal; `content_area` unchanged; G8 3/3; G6 page baselines moved while both title-block baselines stayed byte-identical.

17. **Glyph supplements emitted:** `geometry.glyph_supplements` — ordered array of engine-drawn connecting linework with **no topology instance** (§14.9): the utility 13.2kV primary feed polyline + its "TO UTILITY" squiggle, drawn inline with an on-site "pre-existing data-model gap" comment and invisible to every export until the Revit consequence surfaced (bare transformer). Optional key, only-when-present validation in both twins; `strip_compare`'s strip list gained the key; squiggle record captured only on the no-A-3 fallback path (a real incoming A-3 already exports via `geometry.annotations` — no double-place). Export-only and render-inert, proven at three levels: `buildSheet` markup byte-identical engine-vs-frozen-golden, G5 scratch PNGs byte-matched all 4 blessed baselines (no re-bless), G6 6/6 with page and title-block baselines both untouched. `content_area` unmoved by construction (the inline polyline was never harvested). Gates: 0.0000, parity OK, behavior 43/0, G8 3/3, conformance 0 ×3, acceptance 2/2, `gen_engine` idempotent.

18. **Bus connection dots emitted:** `geometry.bus_dots` — ordered array of the inline `bus_r_dot` connection dots the engine draws at feeder×busbar junctions (§14.10), the same export gap as item 17. Scoped to the **incoming feeder × main-bus** dot only (Mayo); the other five `bus_r_dot` sites stay inline. Optional key, only-when-present validation in both twins; `strip_compare`'s strip list gained the key. Export-only and render-inert by construction — the circle was already drawn; the capture hook is a no-op during a normal render (`__GEOM_CAP` undefined). Same proof as item 17: markup byte-identical, G5 scratch PNGs byte-match the blessed baselines (no re-bless), G6 untouched, `content_area` unmoved. Consumed by the add-in's `BusDotPlacer`, which resolves `_E_SLD_Conductor-ends E01 / _Connection Dot` by explicit name (its map `sld_node_type: "R-2"` collides last-wins with `_E_SLD_Bus E01`, so node-type resolution cannot reach it).

19. **Emergency-board incoming dot added:** the item-18 capture, extended from the normal sheet's utility incoming to the **emergency** sheet's generator/EMSB incoming (Mayo, "emergency switchboard incomming needs a connection dot"). The dot was already drawn inline in `placeATSsAndGenerator` at the main-bus tap but not captured; the fix threads the incoming section id into that function and pushes a `bd-<sheet>-incoming` record, gated on a real incoming section (the `emSwbdStartX+100` fallback has no hosting section, so no push — `host_device_id` must be a topology section). A case with a normal + emergency sheet now exports both `bd-S1-incoming` and `bd-S2-incoming`. NO add-in change: `BusDotPlacer` already places every `bus_dots` record filtered per sheet, so the emergency dot places itself once exported. Export-only and render-inert by the same construction as item 18 (the circle was already drawn; the hook is a no-op without `__GEOM_CAP`) — same proof: markup byte-identical, G5 scratch PNGs byte-match the blessed baselines (no re-bless), G6 untouched, `content_area` unmoved. The validator twins needed no change (they already require `host_device_id ∈ sections` and validate the array generically); the re-freeze is the golden geometry gaining one `bus_dots` record per case, and parity flips FAIL→OK at the freeze.

20. **A-3 resolved squiggle labels emitted:** A-3 `geometry.annotations[id]` records gain nested `label: { x, y, anchor, text }` (§14.1) — the "TO …"/"FROM …" text `renderSquiggle` has always drawn beside each squiggle but never exported. The capture runs AFTER the side/override resolution (call-site `textSide`, engine `A3_TEXT_PLACEMENT`, `layout_config.a3_text_placement`), so the exported point/anchor are the RESOLVED emission values — consumers (the DEADARMS add-in's squiggle-label TextNotes) place from them instead of hand-mirroring the tables; `y` is the SVG BASELINE of the 12 px label. Both `renderSquiggle` orientation branches capture; a squiggle rendered with `annId = null` (the hardcoded TO-UTILITY fallback) captures nothing — that label already exports via `glyph_supplements` (§14.9, no double-place). SCHEMA-14 and the conformance walk type-check the sub-object **when present** (anchor ∈ start\|middle\|end, non-empty text); absence stays legal (older geometry). Additive nested keys only — `strip_compare` gained its first NESTED strip path (`annotations.*.label`) to prove it; export-only and render-inert by construction (capture-only hooks; emission untouched): markup byte-identical, `content_area` unmoved (label points deliberately not fed to `ext()`, like `pill`).

21. **Gen/fire-pump side text converted to device-bound A-8 blocks:** the L1-5 and L3-1 renderer-internal side-text stacks became A-8 equipment-label blocks per Mayo — drawn by the new `deviceEquipText` (swText's visual grammar: 12px, line 0 bold underlined, line 1 bold, steps 20 then 18; the L3-1 stack was uniform 14px w600, the L1-5 stack 16px-stepped w600) and exported as `geometry.equipment_labels` records with `bound_to_type: "device"` and `align: "start"` (anchor = first line's baseline at its **LEFT** end; text grows right of the glyph). This is the first use of the `device` binding provisioned. The fire pump's `fla`/`lra` **combine onto one line** (`{fla} FLA / {lra} LRA`) because the `_E_SLD_Equipment-info` family has exactly three `Line N Text` slots after the label; the gen's `kw`/`kva` were already combined. Both validator twins gained the device sheet-echo and the `align ∈ {end, start}` enum this rev. **Golden-VISIBLE** (pitch/weight restyle; S2-only in all three live cases) — hence a golden re-freeze. Add-in consequence: `DeviceTagPlacer` retired its L1-5/L3-1 TagSpec rows; `EquipmentLabelPlacer` places device-bound records at the raw exported anchor with **no** `flipHand` (the un-flipped family is the start-anchored orientation) and no section registration.

**Engine built-in checks (`validateTopology()`)** — the advisory in-viewer layer, reported in the sidebar Topology panel; the 08_validation validator is the enforcing layer:

| Code | Level | Meaning |
|------|-------|---------|
| `SCHEMA_MISSING` / `SCHEMA_UNKNOWN` / ~~`SCHEMA_PRIOR`~~ | error / error / ~~warn~~ | `metadata.schema_version` absent / unrecognized. ⚠️ `SCHEMA_PRIOR` is **unreachable dead code** at the V1.0.0 baseline: `KNOWN_PRIOR_SCHEMAS = []`, so its `indexOf` branch can never match and any value other than `1.0.0` falls through to `SCHEMA_UNKNOWN` (error). The branch is left in place only to keep the diff minimal. |
| `RE_START_ORPHAN` / `RE_END_ORPHAN` | error | Endpoint id resolves in neither `devices` nor `routed_elements`. |
| `RE_START_BUSTAP` / `RE_END_BUSTAP` | warn (informational) | Endpoint resolves to an R-2 — legal bus tap (§6). |
| `ANN_BOUND_ORPHAN` | error | `bound_to` not found in devices ∪ routed_elements ∪ switchboards ∪ sections. |
| `XS_SRC_ORPHAN` / `XS_DEST_ORPHAN` / `XS_SRC_SHEET` / `XS_DEST_SHEET` / `XS_SAME_SHEET` | error | `cross_sheet_refs` member/sheet resolution failures (§13 shape). |
| `CALC_FLA_MISSING` | warn | L0-1 with `kva_rating` but no `calc_fields.fla`. |

The §15 collection-mapping tables and Exemptions Summary otherwise remain valid and are incorporated by reference (with amendment 4's field rename).

---

## 16. ID Conventions

All IDs are strings. Prefixes are conventions, not enforced constraints — validators treat IDs as opaque for referential integrity.

| Collection | Convention | Examples |
|-----------|-----------|----------|
| Devices | `d-NNN` | `d-001` |
| Routed Elements | `r-NNN`; cross-sheet pairs `r-NNN-s1` / `r-NNN-s2` (source/dest segment); switchboard buses often `r-9NN` | `r-006`, `r-013-s1`, `r-901` |
| Annotations | `a-NNN` | `a-006` |
| Switchboards | `sw-NNN` | `sw-001` |
| Sections | `sec-NNN` | `sec-001` |
| Port Assignments | `pa-NNN` | `pa-001` |
| Measurement Attachments | `meas-NNN` | `meas-001` |
| Cross-Sheet Refs | **`cs-NNN`** | `cs-001` |
| Sheets | `S{N}` | `S1` |

IDs must be unique within their collection; they need not be unique across collections. **Exception to cross-collection freedom:** because R-1 endpoints and `measurement_attachments.host_routed_element_id` may reference R-2 ids in a `device_id`-named field, resolvers check devices first, then routed elements — a device and a bus sharing an id would be ambiguous. Do not reuse ids across `devices[]` and `routed_elements[]`.

**Counter-rebase guidance (new buildings):** the engine retains a small number of hospital-golden special cases keyed to literal golden ids (e.g. `d-052`, `r-903`). New topologies must rebase their id counters into ranges disjoint from the hospital golden's (the office example uses `d-2xx`/`r-2xx`/`a-5xx`, `sw-1xx`, `sec-1xx`) so no special case can trigger accidentally.

---

## 17. Schema Evolution Rules

1. **Additive changes** (new optional fields, new collections) are minor version bumps. Existing topologies remain valid.
2. **Breaking changes** (field renames, type changes, required-field additions, collection restructuring) are major version bumps requiring migration.
3. `metadata.schema_version` identifies the conforming spec version. Validators accept `"1.0.0"` (§3).
4. Validators must reject topologies from incompatible major versions.
5. Per README §9: changes to this schema must be evaluated against all consumers — validation layer, layout engine, renderer, Revit translation layer.

---

## 18. Known Limitations

| Limitation | Impact | Resolution Path |
|-----------|--------|----------------|
| Engine schema-version handling | The engine sets `EXPECTED_SCHEMA = '1.0.0'` and `KNOWN_PRIOR_SCHEMAS = []` — `1.0.0` is the **only** accepted value, there is no prior-version acceptance, and the `SCHEMA_PRIOR` advisory is unreachable (see the engine built-in checks table above). | Done (§3 engine note) |
| R-3 Busway reserved | Busway topology cannot be drawn | Requires L2-9 Bus Plug completion + renderer support |
| A-5 Voltage Drop Tag reserved | VD tags cannot be drawn; TV-6/DV-14 vacuous | Renderer implementation + composition rules |
| Continuation entry is implicit (`start: null` + sheet role) | Entry pairing recoverable but not first-class | Candidate explicit `continuation_of` field |
| Geometry export omits `tap_positions` | Revit translation of those elements needs its own derivation | **`sections` RESOLVED (§14.7)**, as was done for `level_lines` (§14.6); `tap_positions` remains open |
| `content_area` unclamped to sheet template; negative coordinates | SH-2 bounds preflight cannot run as spec'd | Sheet-format decision + compose-time transform (title-block integration phase; A-7 WI-7) |
| Flex-port role records withdrawn | CV-8 flex classification undefined | Reintroduce with first flex-port topology |
| Office topology carried three unmigrated dialects | **Resolved** — the migrated office topology erased all three dialects (0 violations, 0 intentional exceptions); the pre-migration snapshot was kept frozen. Both since retired | Done |

---

## 19. `layout_config` — Layout Engine Configuration

Optional top-level object (or sidecar JSON merged via `run_layout.mjs --config`, sidecar winning). Consumed by `applyLayoutConfig()`. **Every key is optional; an absent key falls back to the engine's `_DEF_*` hospital-golden default**, so the hospital renders identically with no config at all. Reference instance: `04_renderer/hospital_layout_config.json` (extracted defaults). (The retired office example carried its own sidecar layout config exercising the non-default keys; since removed — see the note above. The default column below records those values as the calibration record.)

| Key | Type | Hospital default | Semantics |
|-----|------|------------------|-----------|
| `sheet_roles` | object `{sheetId: role}` | `{"S1":"normal","S2":"emergency"}` | Role per sheet: `"normal"` (service-entrance lineup), `"continuation"` (riser continuation — enables the §6 null-start entry contract; lineup optional), `"emergency"` (EM lineup: ATS class ordering, gen block, fixed-pitch level stack). |
| `sheet_skips` | object `{sheetId: [regex]}` | `{"S2":["[-][23][-]"]}` | Per-sheet designation regexes for devices intentionally not drawn (compact-skip). Matches are counted as intentional skips, not drops. Office: `{}`. |
| `floor_order` | array **or** object `{sheetId: array}` | `["R","3","2","1"]` | Riser row order, index 0 = top of stack. Flat array applies to S1-role sheets (≡ `{S1: array}`); object form resolves per sheet (OFF-005). **Baseline-row semantics (dialect (d)):** no `"B"` row — basement devices render at the L1 row. A row entry may act as a pure baseline spacer (office S2 keeps `"1"` so floors 5/6/7 stack above the entry panel). |
| `floor_anchors` | object `{floor: designation}` | hospital riser panels | Panelboard designation anchoring each floor row's Y. Re-pointable at any per-floor device (office points at riser panels `4S-n-A`). |
| `floor_anchors_mechanical` | object `{floor: designation}` | hospital mech panels | Anchors for the mechanical-chain rows. Floors absent here are skipped in the mech pass (OFF-006). |
| `level_map` | object `{designation: levelCode\|null}` | hospital map | Device designation → level-line level code. **Curation rule (dialect (e)): membership reflects *rendered-row* placement, not electrical service floor.** A device serving floor X but drawn on another floor's row must map to `null` (office `CT-1`: roof cooling tower fed from the L1 lineup), else its level line is dragged to the wrong row and the monotonic pass compresses every line between. |
| `level_order` | array | `["R","3","2","1"]` | Level-line vocabulary, top (lowest Y) to bottom. |
| `riser_step_standard` | number | `1200` | Y step per floor row (px). |
| `riser_step_roof` | number | `1460` | Y step for the roof row (px). |
| `ats_xoffset_overrides` | object `{designation: px}` | hospital offsets | Per-ATS lateral offset overrides on the EM sheet. `{}` disables. |
| `subfeed_max_depth` | number | `1` | Max sub-feed placement rounds (multi-round fixpoint, OFF-003). Hospital depth-1; office `8`. |
| `subfeed_start_ports` | array of port names | `["feed_bottom","feed_top"]` | Source ports scanned for sub-feed edges. Office adds `feed_left`, `feed_right` (lateral pass), `secondary_out` (transformer drop-through). |
| `subfeed_src_types` | array of node_types | `["L2-4"]` | Sub-feed parent types. Office: `["L2-4","L2-2"]`. |
| `subfeed_dst_types` | array of node_types | `["L2-4"]` | Sub-feed child types. Office: `["L2-4","L2-2"]`. |
| `continuation_entry_x` | number / null | `null` | X override for the continuation-entry panel; `null` → engine default (`sw_text_zone_w + 440`). |
| `s2_level_line_pitch` | object `{floor: px}` | `{"2":2800,"3":1250,"R":1250}` | Emergency-sheet fixed-pitch level-line stack: cumulative px above the floor immediately below (bypasses monotonic enforcement on the EM sheet). Building-specific; hospital-golden default ('3'/'R' tightened 2300/1800 → 1250). As-built config key — was engine-compiled before. |
| `s2_shift_delta` | object `{floor: px}` | `{"2":1328,"3":1328,"R":1328}` | Emergency-sheet cluster pack-down for `_s2FloorYOffset`: px the upper-floor parent moves DOWN after the pitch cascade. Closed form `L1_line − 180 − childY_base` (floor- and pitch-independent); lands each parent anchor 180 px (panel_S 140 + line margin 40) above its own level line. Hospital-golden default; Kestrel Ridge pins the older values `{"2":256,"3":768,"R":0}`. New config key — was the engine-hardcoded `SHIFT_DELTA` before. |
| `nec_class_aliases` | object `{raw: canonical}` | `{}` | **Opt-in** remap of a device's `data_fields.nec_class` string, consulted *before* the ATS class-ordering regex (`/7(00\|01\|02)/`). Lets a building whose `nec_class` uses prose (e.g. `"LIFE SAFETY"`) map to a canonical `7xx` code so ATSes order by class instead of falling to the `999` designation name-sort. Default `{}` = no remap = current behavior (the LS/CR/EQ/OS corner-badge prose lookup this also fed was removed with the ATS NEC viewer-extensions). |
| `s2_pitch_sheets` | array of sheet ids | `[]` | **Opt-in** extension of the emergency fixed-pitch floor stack to sheets that are not role `emergency`. `_usesS2Pitch(sheetId)` is true for role `emergency` **or** any sheet listed here. Exists because an emergency lineup's high-rise *continuation* sheet cannot carry role `emergency` (that role requires a switchboard on the sheet) yet still needs the fixed-pitch stack. The stack itself is data-driven from the sheet's own bottom-up floor stack (`_sheetFloorStackBottomUp`); sheets with no per-sheet `floor_order` walk the legacy `['1','2','3','R']` order, so the golden is byte-identical. |
| `subfeed_midy_nudge` | object `{designation: px}` | `{}` | Per-feeder horizontal-band Y nudge. Read into `SUBFEED_MIDY_NUDGE_CFG` and consulted per designation **ahead of** the engine's `SUBFEED_MIDY_NUDGE` table — config wins. One of only four tuning tables with a per-case override (see `README_engine.md`). |
| `a1_tag_placement` | object `{designation: {side, dx, dy}}` | `{}` | Per-designation A-1 pill placement override. Read into `A1_TAG_PLACEMENT_CFG`; consulted before the engine's `A1_TAG_PLACEMENT` table — config wins. |
| `a3_text_placement` | object `{designation: {side, dx, dy}}` | `{}` | Per-designation A-3 squiggle-label placement override. Read into `A3_TEXT_PLACEMENT_CFG`; consulted before the engine's `A3_TEXT_PLACEMENT` table — config wins. ⚠️ This is the intended escape hatch for the A-3 `SQ-F-30x-S2` designation collision between live cases: set it per case, never edit the engine table. |
| `fc_pennant_placement` | object `{designation: {...}}` | `{}` | Per-designation fault-current pennant stack placement (mirroring/anchor). Read into `FC_PENNANT_PLACEMENT_CFG`; consulted before the engine's `FC_PENNANT_PLACEMENT` table — config wins. |
| `fc_pennant_y_nudges` | object `{id: px}` | `{}` | Per-pennant Y nudge; **extends/overrides** the engine's L3 `Y_NUDGE_BY_ID` table. Read into `FC_PENNANT_Y_NUDGES_CFG`. |

---

## 20. `layout_hints` — Renderer Heuristic Switches

Optional top-level object. Distinct from `layout_config`: hints toggle *engine heuristics*, config supplies *building data*.

| Key | Type | Default | Semantics |
|-----|------|---------|-----------|
| `terminal_subfeeds` | boolean | enabled | **Opt-out (config gate):** set `false` to disable the terminal sub-feed placement pass (the historically "HOSPITAL-SAFE" depth-limited heuristic) entirely. Absent or any other value → enabled, so existing topologies that rely on it keep working. |
| `subfeed_gutter_parents` | array of designations | `[]` | Gutter mode opt-in: children of listed parent panels fan into the gutter column instead of the standard bottom fan. |
