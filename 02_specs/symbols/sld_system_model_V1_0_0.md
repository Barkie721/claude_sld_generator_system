# SLD Symbols — Complete Symbol & Tag Catalog

## ⚠ Dimension Authority — the Revit families are the dimension master

**The Revit families are the dimension master** (Ramiro's standing decision).
Every symbol bounding box below that names an absolute size is **authoritative
as the measured family drawn bounding box** from
`09_tests/Hospital Example (Golden Case)/Revit Tests Docs/hospital - SLD family dimensions.csv`
(Measure Families @ view scale 96). ⚠️ Several other files still cite this CSV as
`09_tests/SLD family dimensions.csv`, which has never existed — see **FL-0004** for the
remaining sites and why they are expensive to correct. The engine `BOX` table
(`04_renderer/sld_viewer_engine_V1_0_0.html`), the validator envelope table
(`08_validation/lib/geometry_V1_0_0.mjs`), and the add-in mirror
(`DEDARMS Revit Toolkit/src/DEDARMS/Sld/Services/SymbolDims.cs` — **another repo since separation
Phase 7b, 2026-07-31; nothing here can check it**) all carry these values in lockstep:

| Type | Symbol | Box w×h (px) | Notes |
|------|--------|--------------|-------|
| L0-1 | Utility Transformer | 168 × 140 | anchor = drawn top-left; dashed clearance hangs below the box |
| L1-1 | GFP Main Breaker | 36 × 15 | anchor = main-bus dot (top-center); engine glyph still bridges the buses |
| L1-4 | Utility Meter | 36 × 36 | |
| L1-5 | Generator | 110 × 110 | **UNMEASURED** — family not loaded; legacy size |
| L1-6 | Draw-Out CB | 20.14 × 67.22 | |
| L2-1 | Circuit Breaker | 14.14 × 44.37 | anchor = bus dot (bottom-center); spacing rows still use the legacy 54 (`cb_slot_h`) |
| L2-2 | LV Transformer | 49.17 × 35 | drawn body only; ground clearance (60) lives in spacing |
| L2-3 | ATS | 72 × 72 | external stubs removed — feeders land on box edges; port x's FAMILY-MEASURED (source1 9.5, source2 62.5, load 36 — engine `ATS_PORT_S1_X`/`ATS_PORT_S2_X`) |
| L2-4 | Panelboard | 64 × 88 | non-square |
| L2-5 | Disconnect Switch | 40.33 × 26 | |
| L2-6 | SPD | 36 × 15 | |
| L2-8 | Branch/Feeder Meter | 36 × 35.88 | |
| L2-11 | Inverter | 72 × 72 | |
| L3-1 | Fire Pump | 24 × 32 | Measured — `_E_SLD_Motor V02 / Motor with Starter` family box (was the unmeasured legacy 47 × 66) |
| L3-2 | Motor | 24 × 32 | |
| L3-3 | Equipment Connection | 54 × 54 | **UNMEASURED** — no CSV row; legacy size |

Layout **spacing** (pitch, rows, clearances, riser steps) deliberately did NOT
retune — it stays frozen on the legacy sizes via the engine's `*_slot_*`
constants and `slotWidth()`. The per-symbol sections below remain authoritative
for **shape, proportions-within-the-glyph, ports, strokes, data fields, and
anti-patterns** — but not for absolute box sizes.

---

All SLD symbol geometry, connection ports, data fields, calculation fields, reference SVGs, and anti-patterns in one file. Symbols are organized by topological layer (L0–L3) following the directed power distribution graph from service entrance to terminal loads. This ordering mirrors fault current propagation, voltage drop accumulation, and the typical LLM composition workflow. Global visual conventions (colors, stroke weights, naming conventions, spacing) are defined inline in this file under each symbol's Stroke Weights section and in `sld_topology_rules_V1_0_0.md` Dimension Variables. For assembly instructions, see `sld_topology_rules_V1_0_0.md`.

---

## Symbol Classification

Symbols are divided into two classes based on their geometric behavior. Both classes share the same port system, data field conventions, and anti-pattern format. They differ in how geometry is defined and how connection ports are positioned.

### Class A — Placed Devices

Fixed-geometry symbols anchored at a single point. Bounding box dimensions are defined by parametric variables with default values. Connection ports are at fixed positions relative to the anchor. The renderer places the symbol, then draws feeder/bus lines to its ports during composition.

**Template sections:** Anchor & Geometry → Element Positions → Stroke Weights → Connection Ports → Data Fields → Calculation Fields → Reference SVG → Do Not

**Symbols:** All Class A symbols across layers L0, L1, L2, and L3 (Utility Transformer through Equipment Connection), plus all A-layer annotations.

### Class B — Routed Elements

Variable-geometry symbols that span between two or more device ports. Length, path, and bend count are determined at composition time. Connection ports exist at endpoints and (for some elements) at parametric intervals along the run. The renderer instantiates the element between device ports and constructs the path geometry from segment rules.

**Template sections:** Segment Rules → Stroke & Visual Treatment → Endpoint Ports → Intermediate Ports *(if applicable)* → Data Fields → Calculation Fields → Reference SVGs *(multiple: horizontal, vertical, bend)* → Do Not

**Symbols:** R-1 Feeder, R-2 Bus, R-3 Busway.

### Key Differences

| Property | Class A (Placed) | Class B (Routed) |
|----------|-----------------|------------------|
| Anchor | Single point `(x, y)` | Start port + end port |
| Geometry | Fixed bounding box, parametric variables | Variable-length polyline, segment rules |
| Bends | N/A | 90° bends, defined at composition time |
| Port positions | Fixed coordinates relative to anchor | Endpoints fixed; intermediate ports parametric |
| Reference SVGs | One canonical rendering | 2–3 renderings (straight H, straight V, with bend) |
| Instance identity | Placed once, static | Instantiated between devices, carries route data |

### Calculation Fields Convention

Both Class A and Class B symbols may carry a `### Calculation Fields` sub-section after `### Data Fields`. Calculation fields are properties used by voltage drop and fault current analysis engines. They are NOT rendered on the drawing — they exist as metadata on the symbol instance.

**Format:**

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| *field name* | *data type* | *engineering units* | *where the value comes from* | *representative value* | *context: formulas, enum values, NEC references, dependencies* |

**Source values:**

| Source | Meaning | JSON Data Layer |
|--------|---------|-----------------|
| `user` | Designer enters the value per project | — |
| `schedule` | Value pulled from feeder/equipment schedule | `feeder_schedule.json`, `3_phase_transformer_feeder_schedule.json`, `mv_feeder_schedule.json` |
| `lookup` | Value derived from reference tables (conductor impedance, transformer %Z) | `nec_table9_ac_resistance___reactance.json`, `transformer_impedance.json`, `c_values_lookup.json`, `nec_motor_fla.json` |
| `calculated` | Value computed from other fields (e.g., voltage drop from impedance × current × distance) | `fault_current_calc.json` (formula definitions and methodology) |
| `utility` | Value provided by the serving utility | — |

Where a specific JSON file is the lookup source for a field, the Notes column on that field includes the file name and JSON path. Fields marked "not currently in the normalized JSON data layer" require manual input or a future data file.

Calculation fields are optional on any symbol instance. A symbol with no calculation fields populated is still valid for drawing — it simply cannot participate in automated calculations.

---

## Symbol Registry

Master index of all symbols in the library. Layer prefix determines file position. Sequential number within each layer is assigned in order of addition and never reused — inserting a new L2 symbol takes the next available L2-N, with no renumbering of existing symbols.

| ID | Name | Class | Layer | Status | Ports | Has Calc Fields |
|----|------|-------|-------|--------|-------|-----------------|
| L0-1 | Utility Transformer | A | L0 | Complete | 2 | Yes |
| L0-2 | MV Transformer | A | L0 | Placeholder | TBD | Yes |
| L1-1 | GFP Circuit Breaker | A | L1 | Complete | 2 | Yes |
| L1-2 | Switchboard Section | A | L1 | Complete | 0 (hosts Bus R-2) | No |
| L1-3 | Neutral-Ground Bond | A | L1 | Complete | 0 (float) | No |
| L1-4 | Utility Grade Meter | A | L1 | Complete | 1 | No |
| L1-5 | Generator | A | L1 | Placeholder | 1 | Yes |
| L1-6 | Draw-Out Circuit Breaker | A | L1 | Placeholder | TBD | Yes |
| L2-1 | Circuit Breaker | A | L2 | Complete | 2 | Yes |
| L2-2 | LV Transformer | A | L2 | Complete | 4 | Yes |
| L2-3 | Automatic Transfer Switch | A | L2 | Complete | 3 | Yes |
| L2-4 | Panelboard | A | L2 | Complete | 4 | Yes |
| L2-5 | Disconnect Switch | A | L2 | Complete | 4 | Yes |
| L2-6 | Surge Protective Device | A | L2 | Complete | 4 + 1 (dual-mode) | No |
| L2-7 | Spare / Space Breaker | A | L2 | Complete | 1 | No |
| L2-8 | Meter (Branch / Feeder) | A | L2 | Complete | 1 | No |
| L2-9 | Bus Plug | A | L2 | Placeholder | TBD | TBD |
| L2-10 | UPS | A | L2 | Placeholder | TBD | Yes |
| L2-11 | Inverter | A | L2 | Placeholder | TBD | Yes |
| L2-12 | PV Array | A | L2 | Placeholder | TBD | Yes |
| L2-13 | Meter Stack | A | L2 | Placeholder | TBD | TBD |
| L3-1 | Fire Pump | A | L3 | Complete | 1 | Yes |
| L3-2 | Motor | A | L3 | Complete | 2 | Yes |
| L3-3 | Equipment Connection | A | L3 | Complete | 1 | Yes |
| R-1 | Feeder | B | R | Complete | 2 + intermediate | Yes |
| R-2 | Bus | B | R | Complete | 3 + intermediate | Yes |
| R-3 | Busway | B | R | Complete | 2 + parametric taps | Yes |
| A-1 | Feeder Tag | A | A | Complete | 1 | No |
| A-2 | Conduit / Wire Callout Tag | A | A | Complete | 1 | No |
| A-3 | Continuation Squiggle | A | A | Complete | 1 | No |
| A-4 | Fault Current Tag | A | A | Complete | 1 | No |
| A-5 | Voltage Drop Tag | A | A | Complete | 1 | No |
| A-6 | Hex Note | A | A | Complete | 5 (1 leader + 4 direct) | No |
| A-7 | Level Annotation | A | A | Complete | 0 (free-floating) | No |
| A-8 | Equipment Label | A | A | Complete | 0 (derived, host-bound) | No |

### Cross-Layer Instantiation

Some symbols can be instantiated at layers other than their home layer. Home layer = where the symbol definition lives. Instantiation layer = where it may appear on a specific project's SLD.

| Symbol | Home Layer | Also Instantiated At | Notes |
|--------|-----------|---------------------|-------|
| Circuit Breaker (L2-1) | L2 | L1 (main breaker), L3 (branch) | Port pattern and calc fields identical regardless of layer |
| SPD (L2-6) | L2 | — | Dual-mode: dedicated-CB-fed (terminal) or spur-attached to panelboard |
| PV Array (L2-12) | L2 | L0 (front-of-meter) | Behind-the-meter is default; front-of-meter for utility-scale |

---

## Port Naming Convention

All connection ports follow a standardized naming grammar. This section defines the rules; individual symbol sections apply them.

### Name Structure

Port names use the pattern: **`[prefix]_[suffix]`** (directional ports) or **`[prefix]_[position]`** (multi-directional ports).

### Suffix Rules — Drawing Direction

| Suffix | Meaning | When to use |
|--------|---------|-------------|
| `_in` | Line drawn TOWARD the symbol boundary | Feeder/conductor enters the symbol |
| `_out` | Line drawn AWAY from the symbol boundary | Feeder/conductor exits the symbol |
| `_bi` | Line can enter or exit | Bidirectional — compositor decides based on routing |
| `_attach` | No line drawn — symbol snaps onto an existing line | Annotation attachment points only |

Electrical role (what the terminal IS) is carried entirely by the prefix. Drawing behavior (how the line MOVES) is carried entirely by the suffix.

### Prefix Taxonomy

**Category A — Power Flow** (carries current on the SLD)

| Prefix | Meaning |
|--------|---------|
| `primary` | High-voltage terminal of a transformer |
| `secondary` | Low-voltage terminal of a transformer |
| `line` | Source/line side of a protective or switching device |
| `load` | Load side of a device, or terminal load entry |
| `source1` | Normal power source terminal (ATS) |
| `source2` | Emergency/alternate power source terminal (ATS) |
| `gen` | Generator output terminal |
| `feeder` | Generic feeder termination (no specific electrical role) |
| `flex` | Reversible primary/secondary — assigned at composition time |
| `feed` | Terminal feeder on multi-directional devices (panelboard), or routed element endpoint (busway) |
| `spur` | Lateral branch connection to protected equipment (not inline) |

**Category B — Bus Infrastructure** (horizontal bus system within switchboards)

| Prefix | Meaning |
|--------|---------|
| `bus` | Vertical tap onto a horizontal bus bar |
| `bus_splice` | Horizontal bus continuity between adjacent sections |
| `tap` | Parametric tap-off point along a routed element (busway). Indexed: `tap_01`, `tap_02`, etc. |

**Category C — Measurement** (non-interrupting instrumentation)

| Prefix | Meaning |
|--------|---------|
| `ct` | Current transformer / metering clamp point |

**Category D — Annotation** (non-electrical drawing elements)

| Prefix | Meaning |
|--------|---------|
| `anno` | Annotation attachment to existing linework |

**Category E — Routed Element Endpoints** (Class B symbols only)

| Prefix | Meaning |
|--------|---------|
| `start` | Source-side endpoint of a routed element (Feeder R-1). Inherits direction from connected device port |
| `end` | Load-side endpoint of a routed element (Feeder R-1). Inherits direction from connected device port |

> **Class B naming note:** `start` and `end` are reserved prefixes for Class B routed element endpoints. They do not use the `_in`/`_out`/`_bi` suffix because their direction is inherited from the connected Class A device port at composition time. Busway (R-3) uses `feed_start`/`feed_end` instead, combining the `feed` prefix with positional qualifiers, because its endpoints have a fixed electrical role (feed = power distribution).

### Positional Qualifiers

When a symbol has ≥3 equivalent bidirectional ports, the suffix is replaced by a positional qualifier: `_top`, `_bottom`, `_left`, `_right`. The prefix still carries the connection behavior (e.g., `feed_top` vs. `spur_top`).

Exceptions:

- `bus_splice_left` / `bus_splice_right` use positional qualifiers on an infrastructure prefix to distinguish splice direction in multi-section switchboard lineups.
- `flex_` ports use positional qualifiers regardless of port count. The qualifier communicates routing direction (which edge of the symbol), not disambiguation among equivalent ports. Examples: `flex_left` / `flex_right` on the LV Transformer (L2-2), `flex_top` on the Motor (L3-2).

### Port Metadata Fields

Each port carries two metadata fields beyond name and position:

| Field | Purpose | Values |
|-------|---------|--------|
| `connection_mode` | What happens electrically when something connects here | `inline`, `terminal`, `bus_tap`, `bus_splice`, `measurement`, `spur`, `anchor`, `termination`, `float` |
| `marker_style` | What the renderer draws at the port location | `none`, `bus_node`, `bus_dot`, `ct_jaw`, `ct_brace`, `tick`, `d_loop`, `stub`, `squiggle`, `pennant`, `arrowhead` |

**`connection_mode` definitions:**

| Mode | Behavior |
|------|----------|
| `inline` | Breaks the feeder run. Power flows through the device. |
| `terminal` | Ends the feeder run. No output. |
| `bus_tap` | Vertical connection onto a horizontal bus bar. |
| `bus_splice` | Horizontal bus continuity between adjacent equipment. |
| `measurement` | Non-interrupting clamp. Feeder passes through unbroken. |
| `spur` | Lateral branch off protected equipment. Not inline. |
| `anchor` | Annotation attachment to existing linework (feeders, buses) or device boundaries (panelboard edges, disconnect boxes, switchboard sections, breaker symbols, ATS boxes). No electrical meaning. |
| `termination` | Feeder run ends/continues to another sheet. |
| `float` | No connections. Symbol is decorative/symbolic. |

**`marker_style` definitions:**

| Style | Visual |
|-------|--------|
| `none` | No marker. Feeder line connects directly to symbol edge. |
| `bus_node` | Filled circle r=2.5, pink (`#FF69B4`). |
| `bus_dot` | Filled circle r=5, pink. Larger than bus_node. The **bus connection dot**. (both switchboard incomings) the **incoming** feeder × main-bus dot on each switchboard is exported as `geometry.bus_dots` (schema §14.10) and placed in Revit as the `_E_SLD_Conductor-ends E01 / _Connection Dot` family; the other four `bus_dot` sites stay inline until scoped in. |
| `ct_jaw` | J-shaped jaw hooks from fork point. |
| `ct_brace` | Curly brace `{` arcs. |
| `tick` | Diagonal tick mark at feeder crossing. |
| `d_loop` | Half-circle with diameter line, rotated 30°. |
| `stub` | Feeder stub line extending from symbol. |
| `squiggle` | S-curve in pink (`#FF69B4`). |
| `pennant` | Filled triangular pennant — rectangular body tapering to an apex point. Apex = port location. |
| `arrowhead` | Filled drafting arrowhead (20×10), aligned to leader angle. Tip = port location. |

### Connection Mode Compatibility Matrix

| Mode | Can connect to |
|------|---------------|
| `inline` | `inline`, `terminal`, `bus_tap`, `termination` |
| `terminal` | `inline` |
| `bus_tap` | `bus_tap`, `inline` |
| `bus_splice` | `bus_splice` only |
| `measurement` | Attaches to any feeder or bus — no direct port-to-port connection |
| `spur` | Attaches laterally to `terminal` or `bus_tap` equipment |
| `anchor` | Snaps onto any existing linework (feeder, bus, busway) or device boundary (panelboard edge, disconnect box, ATS, switchboard section, breaker symbol) — no port-to-port connection |
| `termination` | `inline` |
| `float` | Nothing — no connections |

### Connection Model — Three-Object Topology

With the introduction of Class B routed elements (R-1–R-3), the SLD uses an explicit three-object connection model for all power distribution paths:

**Device A** → **Routed Element** → **Device B**

Every power connection between two Class A placed devices passes through a Class B routed element instance. There are no implicit "lines drawn during composition" — every conductor run, bus bar, and busway is a first-class symbol with its own identity, data fields, and calculation fields.

**How it works:**

1. Device A's output port (e.g., `secondary_out` on a transformer) connects to the routed element's `start` port.
2. The routed element's `end` port connects to Device B's input port (e.g., `line_in` on a breaker).
3. The routed element carries the path geometry, conductor specification, distance, and computed electrical properties between the two devices.

**Connection examples:**

| Source Device | Source Port | Routed Element | Target Port | Target Device |
|---------------|------------|----------------|-------------|---------------|
| Utility Transformer (L0-1) | `secondary_out` | Feeder (R-1) | `line_in` | GFP Breaker (L1-1) |
| GFP Breaker (L1-1) | `bus_out` | Bus (R-2) | `bus_tap_bi` | Circuit Breaker (L2-1) |
| Circuit Breaker (L2-1) | `line_in` | Feeder (R-1) | `feed_top` | Panelboard (L2-4) |
| Disconnect (L2-5) | `load_out` | Busway (R-3) | `tap_01` → Feeder (R-1) | Panelboard (L2-4) |

**Annotation binding:** Feeder Tags (A-1), Conduit/Wire Callouts (A-2), Fault Current Tags (A-4), Voltage Drop Tags (A-5), and Hex Notes (A-6) attach to a Feeder (R-1) instance or device port via their `anchor` connection mode. The optional `bound_to` metadata field on each annotation links it to the bound symbol's designation for computational validation. A-4 reads `available_fc` from the bound symbol; A-5 reads `voltage_drop_pct` from the bound routed element.

**Fault current propagation:** The three-object model creates a directed graph where fault current flows from source to load. Each routed element reduces the available fault current by its impedance contribution. The calc engine traverses: Source → Transformer `available_fc_secondary` → Feeder `available_fc_load` → Bus `available_fc` → downstream Feeder `available_fc_load` → terminal device `available_fc`.

**Voltage drop chain:** Similarly, voltage drops accumulate along the path: Source voltage → Transformer secondary voltage → Feeder VD% → Bus (negligible) → downstream Feeder VD% → voltage at terminal device.

> **Migration note:** Prior compositions that describe connections as "feeder lines drawn during composition" between device ports should be interpreted as implicit Feeder (R-1) instances. The three-object model makes explicit what was previously implicit — it does not change what is drawn, only how the data model represents it.

---
## Layer Definitions

Each layer represents a topological position in the power distribution graph. Fault current decreases and voltage drop accumulates as you move from L0 toward L3. Routing elements (R) connect devices across all layers. Annotations (A) overlay the drawing without participating in power flow.

### L0 — Service Entrance

Utility-owned equipment upstream of the main protective device. The boundary between utility and owner responsibility.

- **Typical voltage:** MV primary (4160V–34.5kV), 480Y/277V or 208Y/120V secondary
- **Calc field entry point:** `available_fc_primary` enters from utility data
- **Calc field exit:** `available_fc_secondary` propagates to L1 via Feeder (R-1)
- **NEC context:** Article 230 (services), Article 450 (transformers)

### L1 — Main Distribution

Main switchboard level — first protective device, main bus, metering, grounding, and standby generation. Highest fault currents on the owner's side of the system.

- **Typical fault current:** 25–65 kA symmetrical (depends on transformer size and utility available)
- **Calc field entry:** `available_fc_secondary` from L0 transformer
- **Calc field exit:** `available_fc` on main bus, distributed to L2 devices via Bus (R-2) and Feeder (R-1)
- **NEC context:** Article 408 (switchboards), Article 250 (grounding), Article 230.95 (GFP for 480Y/277V services > 1000A)

### L2 — Sub-Distribution

Step-down, transfer, branch distribution. Largest symbol variety — includes transformers, panelboards, ATSs, disconnects, metering, and protection. Most of the equipment on a typical commercial SLD lives at this layer.

- **Typical fault current:** 10–42 kA symmetrical (reduced by feeder impedance from L1)
- **Calc field entry:** `available_fc_load` from upstream Feeder (R-1)
- **Calc field exit:** `available_fc` at panelboard bus or downstream feeder
- **NEC context:** Articles 240 (overcurrent), 408 (panelboards), 450 (transformers), 700/701 (emergency/legally required)

### L3 — Branch / Terminal

End-of-line loads, terminal connections, and generic equipment interfaces. Motor-driven equipment at this layer contributes fault current back upstream during the first few cycles of a fault event. Non-motor terminal loads (L3-3 Equipment Connection) are also placed at this layer.

- **Calc field entry:** `available_fc` at motor or fire pump terminals (from upstream feeder)
- **Calc field note:** Motors contribute fault current back upstream — approximately 4–6× FLA for the first few cycles
- **NEC context:** Articles 430 (motors), 695 (fire pumps)

### R — Routing Elements (Class B)

Connective tissue between all layers. Every power connection between two Class A devices passes through a Class B routed element instance. These symbols carry impedance, distance, and voltage drop data. They reduce `available_fc` by their impedance contribution along the run.

### A — Annotations

Non-electrical drawing elements. Attach to existing linework or device instances via `anchor` connection mode. Annotation tags may read calc field values from bound symbols (e.g., displaying `available_fc` or `voltage_drop_pct`) but never produce or modify calc field values.

---

# L0 — Service Entrance

Utility-owned service entrance equipment. Power enters the building here.

---

## L0-1. Utility Transformer

Wide rectangle with centered "T" label, transformer pad extending beyond the box on both sides, and dashed underground clearance zone below the pad. Text fields to the right. Utility-owned service entrance equipment. Connection ports on the pad bottom edge (pad/clearance boundary).

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Top-left corner of T-box, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `W` | 140 | T-box width |
| `H` | 80 | T-box height |
| `pad_h` | 40 | Transformer pad height |
| `clr_h` | 60 | Underground clearance zone height |
| `overhang` | 20 | Pad extension past T-box on each side |
| `offset` | 30 | Lateral offset for primary/secondary port separation |
| `text_gap` | 30 | Gap from T-box right edge to text |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| T-box | `(0, 0)` to `(140, 80)` | Wide rectangle, ~1.75:1 aspect |
| Pad | `(−20, 80)` to `(160, 120)` | Extends past T-box both sides |
| Clearance | `(−20, 120)` to `(160, 180)` | Dashed, same width as pad |
| "T" label | `(70, 52)` | Centered in T-box |

**Key Relationships:** T-box is wide (not square — differentiates from LV transformer). Pad top edge = T-box bottom edge (shared edge — draw T-box as open path, no bottom stroke). Clearance top edge = pad bottom edge (draw clearance as open path, no top stroke).

### Stroke Weights

| Element | Weight |
|---------|--------|
| T-box outline | 3.0 pt (open path: top + sides only) |
| Pad outline | 3.0 pt (full rect) |
| Clearance outline | 1.5 pt (open path: sides + bottom, dashed 12,6, stroke `#39FF14` — section green, NOT cyan) |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `primary_in` | `(40, 120)` — left of center, pad bottom edge | in (from below) | `inline` | `none` |
| `secondary_out` | `(100, 120)` — right of center, pad bottom edge | out (downward) | `inline` | `none` |

No stubs — feeder lines drawn during composition. Ports sit on the shared boundary between pad and clearance zone.

### Data Fields (right of T-box)

| Field | Style | Example |
|-------|-------|---------|
| Label Panel Name | Bold, underlined | `UTILITY TRANSFORMER` |
| Line 1 | Bold | `2500KVA` |
| Line 2 | Bold | `480Y/277V` |
| Line 3 | Bold | `4W, 3PH` |

### Calculation Fields

Fields used by voltage drop and fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `kva` | number | kVA | user | `2500` | Transformer nameplate rating |
| `primary_voltage` | number | V | user | `12470` | Primary winding voltage (line-to-line) |
| `secondary_voltage` | number | V | user | `480` | Secondary winding voltage (line-to-line) |
| `impedance_pct` | number | %Z | user / lookup | `5.75` | Nameplate impedance. If unknown, use lookup by kVA from `transformer_impedance.json` → `transformers[kva].percent_z.midpoint`. IEEE C57.12.00 Table 5 |
| `x_r_ratio` | number | — | utility / lookup | `4.9` | X/R ratio of transformer. If unknown, use lookup from `transformer_impedance.json` → `transformers[kva].x_over_r.midpoint`. Typical ranges: ≤1000 kVA → 3–5, >1000 kVA → 5–10 |
| `winding_config` | enum | — | user | `delta-wye` | Winding configuration: `delta-wye`, `delta-delta`, `wye-wye`, `wye-delta`. Affects available fault current calculation and grounding |
| `available_fc_primary` | number | kA (sym) | utility | `100` | Available symmetrical fault current at primary terminals. **Default: 100 kA** (conservative assumption for preliminary design). Override with actual utility fault current data when available |
| `available_fc_secondary` | number | kA (sym) | calculated | `42.5` | Available symmetrical fault current at secondary terminals. Calculated from `kva`, `impedance_pct`, `secondary_voltage`, and `available_fc_primary` |
| `fla_secondary` | number | A | calculated | `3007` | Full load amps on secondary. Calculated: `kva × 1000 / (secondary_voltage × √3)` |

**Calculation dependency chain:** `available_fc_primary` (default 100 kA — override with utility data when available) + `impedance_pct` + `kva` + `secondary_voltage` → `available_fc_secondary`. This value propagates downstream as the source fault current for the first protective device (typically the main breaker, L2-1/L1-1).

**Relevant standards:** IEEE C57.12.00 (transformer impedance), IEEE 141 (Red Book — fault calculation methodology), NEC 110.9 (interrupting rating adequacy), NEC 110.10 (short-circuit current rating).

### Reference SVG

```svg
<svg viewBox="0 0 380 260" xmlns="http://www.w3.org/2000/svg">
  <path d="M40,100 L40,20 L180,20 L180,100"
        fill="none" stroke="#00FFFF" stroke-width="2.5"/>
  <text x="110" y="72" text-anchor="middle"
        font-family="monospace" font-size="36" font-weight="700"
        fill="#FFFFFF">T</text>
  <rect x="20" y="100" width="180" height="40"
        fill="none" stroke="#00FFFF" stroke-width="2"/>
  <path d="M20,140 L20,200 L200,200 L200,140"
        fill="none" stroke="#39FF14" stroke-width="1.5"
        stroke-dasharray="12,6"/>
  <text x="210" y="38" font-family="monospace" font-size="12"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">UTILITY TRANSFORMER</text>
  <text x="210" y="58" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">2500KVA</text>
  <text x="210" y="76" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">480Y/277V</text>
  <text x="210" y="94" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">4W, 3PH</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | T-box as closed `<rect>` | Open `<path>` — top + sides only. Pad top edge is the shared boundary. |
| 2 | Clearance as closed dashed `<rect>` | Open `<path>` — sides + bottom only. Pad bottom edge is shared boundary. |
| 3 | T-box square (1:1) | Must be wider than tall (~1.75:1). |
| 4 | Pad same width as T-box | Pad extends past T-box on both sides (overhang). |
| 5 | Text inside T-box | Text always right of T-box. |

---


---

## L0-2. MV Transformer *(placeholder)*

Medium-voltage transformer within a switchgear lineup, contained within a dashed section boundary (not pad-mounted like L0-1). Typically 4160V–12470V primary stepping down to 480Y/277V secondary. Geometry, ports (`primary_in`, `secondary_out`), reference SVG, and anti-patterns not yet defined — see IEEE C57.12.00, NEC 450.3.


---

# L1 — Main Distribution

Main switchboard level equipment: first protective device, main bus, metering, grounding, and standby generation.

---

## L1-1. GFP Circuit Breaker

> **Inheritance:** This symbol extends the Circuit Breaker (L2-1) base definition. L2-1 defines the base geometry, anchor, stroke weights, and port definitions. This section documents only the GFP-specific additions and overrides. When composing, read L2-1 first.


Extends the standard circuit breaker with a Ground Fault Protection (GFP) module box connected via two dashed sensing lines. Inherits all base geometry from the circuit breaker above.

### GFP-Specific Variables (added to base breaker)

| Variable | Default | Description |
|----------|---------|-------------|
| `gfp_w` | 24 | GFP box width |
| `gfp_h` | 14 | GFP box height |
| `gfp_gap` | 12 | Gap between GFP box right edge and breaker centerline |
| `dash_pattern` | 4 on, 3 off | Dashed sensing lines |
| `dash_weight` | 1.2 pt | Sensing line stroke weight |
| `dot_r` | 1.2 | Endpoint indicator dot radius |

### GFP Element Positions (relative to breaker anchor)

| Element | Position | Notes |
|---------|----------|-------|
| GFP box top-left | `(−36, 10)` | Left of breaker body |
| GFP box center | `(−24, 17)` | "GFP" text anchor |
| Upper dashed target | `(−9, 16)` | Near arc deepest point |
| Lower dashed elbow | `(−24, ~42)` | L-path corner |
| Lower dashed target | `(0, ~42)` | Midpoint of vertical link |

### Dashed Line Routing

- **Upper (sensing):** Straight horizontal from GFP box right edge to arc deepest point. Endpoint dot at target.
- **Lower (trip):** L-path from GFP box BOTTOM CENTER, vertical down, then horizontal right to vertical link midpoint. Endpoint dot at target.

### GFP Stroke Weights (added elements only)

| Element | Weight | Notes |
|---------|--------|-------|
| GFP box outline | 3.0 pt | Matches base breaker linework |
| "GFP" text | Bold (700), 8px | Centered in box |
| Dashed sensing lines | 1.2 pt | Dash pattern 4 on, 3 off |
| Endpoint dots | filled, r=1.2 | Opacity 0.7, cyan fill (sensing indicators, not bus dots) |

All base breaker stroke weights (open circles 3.0pt, arc 3.0pt, link 3.0pt, bus node filled) are inherited unchanged from L2-1.

### Data Fields

Same as standard circuit breaker (L2-1) — 12px amps text (bold, underlined) + 12px poles text (bold, tight spacing ~14px below), positioned to the right. No separator line. GFP breakers typically show ≥1000A per NEC 230.95.

### Connection Ports

Same as standard circuit breaker — GFP module does not add or change ports.

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `line_in` | `(0, −4)` | in (from above) | `inline` | `none` |
| `bus_out` | `(0, 50)` — center of bus node | out (downward) | `bus_tap` | `bus_node` |

### Calculation Fields

Inherits all fields from Circuit Breaker (L2-1) plus GFP-specific fields:

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `gfp_pickup` | number | A | user | `1200` | Ground fault pickup current. Maximum 1200A per NEC 230.95(A) |
| `gfp_delay` | number | s | user | `1.0` | Maximum time delay before trip. Maximum 1 second at 3000A per NEC 230.95(B) |
| `gfp_type` | enum | — | user | `residual` | Sensing method: `residual` (vector sum), `zero-sequence` (CT), `ground-return` |

Per NEC 230.95, GFP is required on solidly-grounded wye services of more than 150V to ground but not exceeding 1000V, where the service disconnect is rated 1000A or more.

**Relevant standards:** NEC 230.95 (GFP requirement), NEC 240.13 (GFP for feeders), UL 489 (GFP-equipped breakers).

### Reference SVG

```svg
<svg viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="10" r="4"
          fill="none" stroke="#00FFFF" stroke-width="3"/>
  <path d="M60,10 Q47,26 60,42"
        fill="none" stroke="#00FFFF" stroke-width="3"/>
  <circle cx="60" cy="42" r="4"
          fill="none" stroke="#00FFFF" stroke-width="3"/>
  <line x1="60" y1="46" x2="60" y2="58"
        stroke="#00FFFF" stroke-width="3"/>
  <circle cx="60" cy="60" r="2.5"
          fill="#FF69B4" stroke="#FF69B4" stroke-width="1"/>
  <rect x="24" y="20" width="24" height="14"
        fill="none" stroke="#00FFFF" stroke-width="3"/>
  <text x="36" y="30" text-anchor="middle"
        font-family="monospace" font-size="8" font-weight="700"
        fill="#FFFFFF">GFP</text>
  <line x1="48" y1="26" x2="51" y2="26"
        stroke="#00FFFF" stroke-width="1.2" stroke-dasharray="4,3"/>
  <circle cx="51" cy="26" r="1.2" fill="#00FFFF" opacity="0.7"/>
  <line x1="36" y1="34" x2="36" y2="52"
        stroke="#00FFFF" stroke-width="1.2" stroke-dasharray="4,3"/>
  <line x1="36" y1="52" x2="60" y2="52"
        stroke="#00FFFF" stroke-width="1.2" stroke-dasharray="4,3"/>
  <circle cx="60" cy="52" r="1.2" fill="#00FFFF" opacity="0.7"/>
  <text x="72" y="23" font-family="monospace" font-size="12"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">3000A</text>
  <text x="72" y="33" font-family="monospace" font-size="12"
        font-weight="700" fill="#FFFFFF">3P</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Dashed lines as diagonals | Upper: horizontal. Lower: L-path (vertical then horizontal). |
| 2 | Both dashed lines from right edge of GFP box | Upper exits RIGHT edge. Lower exits BOTTOM CENTER. |
| 3 | Upper dashed targets circle instead of arc | Targets the deepest point of the trip arc. |
| 4 | Missing endpoint dots on dashed lines | Filled dots (r=1.2) at each target. |
| 5 | Different node_spacing than standard breaker | Use `node_spacing = 32` — same as base circuit breaker. |

---


---

## L1-2. Switchboard Section (hosts Bus R-2)

Dashed rectangle boundary that hosts a Bus (R-2) instance. Text fields outside to the left. Base building block for multi-section switchboard lineups. The section defines the enclosure geometry and bus positioning; the bus element itself — including stroke weight, connection ports (tap, splice), and calculation fields — is defined in R-2.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Top-left corner of dashed boundary, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `W` | 192 | Section width (varies by contents) |
| `H` | 192 | Section height (consistent across lineup) |
| `bus_y_offset` | 156 | Bus bar Y from section top — passed to the hosted Bus (R-2) instance to set its vertical position |
| `dash_on` / `dash_off` | 8 / 5 | Dash pattern |
| `text_gap` | 15 | Gap between text and section left edge |

> **Removed from this section:** `bus_half_w` and `r_dot` are now defined on the Bus symbol (R-2). The section provides only `bus_y_offset` to position the bus instance within the enclosure.

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Boundary | `(0, 0)` to `(192, 192)` | Dashed rectangle |
| Bus (R-2 instance) | Centered at `(W/2, bus_y_offset)` | Hosted element — see R-2 for geometry, ports, and stroke |
| Text block | `(−15, 48)` | Outside, left, right-aligned |

**Key Relationships:** Bus near BOTTOM (not center/top). Height consistent across lineup. Width varies. Dashed outline (not solid). Text OUTSIDE (not inside). Bus is a composed R-2 instance, not geometry owned by this section.

> **Composition override:** When composing a multi-section switchboard, the bus position changes — see `sld_topology_rules.md`. The main bus is near the top, secondary bus below the main breaker. This standalone position represents the secondary bus level.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Dashed boundary | 1.2 pt, dasharray 8,5 |

> **Bus stroke weight** is defined in R-2. This section only defines the enclosure boundary weight.

### Connection Ports

The switchboard section enclosure has no connection ports of its own. All bus-related ports (`bus_tap_bi`, `bus_splice_left`, `bus_splice_right`) are defined on the hosted Bus (R-2) instance and are available to the compositor through the bus element. See R-2 for port definitions.

> **Migration note:** Prior to R-2, bus ports were defined directly on this section. Existing compositions referencing `bus_tap_bi`, `bus_splice_left`, or `bus_splice_right` on a switchboard section should be read as referencing the hosted Bus instance's ports at the same coordinates.

### Data Fields (outside, left, right-aligned)

| Field | Style | Example |
|-------|-------|---------|
| Label Panel Name | 12px Bold (700), underlined | `4MSB-B-A` |
| Line 1 | 12px Bold (700) | `3000A` |
| Line 2 | 12px Regular (400) | `480Y/277V` |
| Line 3 | 12px Regular (400) | `4W, 3PH` |

Text applies to the ENTIRE switchboard assembly, not individual sections — appears once, left of first section.

> **This table documents *what* a switchboard displays. How that block is placed, bound, and
> exported is owned by [§A-8 Equipment Label](#a-8-equipment-label)** — the promotion of this text
> block into a placeable annotation (Mayo's decision 2). §A-8 normalizes to **four**
> lines: the label plus three, matching both the `_E_SLD_Equipment-info E01` family's four
> parameters and `swText()`'s four slots. (It was five until the `aic`
> References line was removed entirely per Mayo — the table above, which stops at Line 3, is now the
> full rendered set.) §A-8 is the authority.

### Section Types

| Type | Contents | Notes |
|------|----------|-------|
| Incoming | Bus tee, feeder, continuation squiggle | Feeder from utility transformer |
| Metering | Utility grade meter on bus | Revenue metering |
| Main Breaker | GFP breaker from bus | Main disconnect with GFP per NEC 230.95 |
| Distribution | Breakers on secondary bus, N-G bond | Downstream feeders |
| NEC 700 | Breakers for life safety branch | Emergency |
| NEC 701 | Breakers for legally required standby | Emergency |
| NEC 702 | Breakers for optional standby | Emergency |

### Reference SVG

```svg
<svg viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg">
  <rect x="140" y="30" width="192" height="192"
        fill="none" stroke="#39FF14" stroke-width="1.2"
        stroke-dasharray="8,5"/>
  <line x1="188" y1="186" x2="284" y2="186"
        stroke="#00FFFF" stroke-width="2.5"/>
  <circle cx="236" cy="186" r="5" fill="#FF69B4"/>
  <text x="125" y="78" text-anchor="end"
        font-family="monospace" font-size="12" font-weight="700"
        text-decoration="underline"
        fill="#FFFFFF">4MSB-B-A</text>
  <text x="125" y="98" text-anchor="end"
        font-family="monospace" font-size="12" font-weight="700"
        fill="#FFFFFF">3000A</text>
  <text x="125" y="116" text-anchor="end"
        font-family="monospace" font-size="12"
        fill="#FFFFFF">480Y/277V</text>
  <text x="125" y="134" text-anchor="end"
        font-family="monospace" font-size="12"
        fill="#FFFFFF">4W, 3PH</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Bus at center or top | Bus near bottom (`bus_y_offset = 156` in 192px section). |
| 2 | Solid outline | Always dashed. Solid = panelboard. |
| 3 | Text inside boundary | Text outside, left, right-aligned. |
| 4 | Different heights in a lineup | All sections same height. Only width varies. |
| 5 | Gaps between adjacent sections | Shared edges, no gaps. |
| 6 | Text per section | Text once, left of first section. |

---


---

## L1-3. Neutral-Ground Bond

Neutral bus + ground bus + bonding jumper + earth ground. Represents the main bonding jumper (MBJ) per NEC 250.24(A)(5). Floats inside switchboard distribution section — NOT connected to any bus.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Center of neutral bus bar, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `n_bus_half_w` | 22 | Neutral bus half-width |
| `g_bus_half_w` | 20 | Ground bus half-width (narrower) |
| `jumper_length` | 25 | Distance between N and G buses |
| `earth_drop` | 50 | Distance from G bus to first ground line |
| `r_dot` | 5 | Connection dot radius |
| `gnd_w1`/`gnd_w2`/`gnd_w3` | 44/32/20 | Earth ground line widths |
| `gnd_spacing` | 12 | Spacing between ground lines |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Neutral bus | `(−22, 0)` to `(22, 0)` | Heaviest stroke, widest |
| Neutral dot | `(0, 0)` r=5 | Filled, on neutral bus |
| Bonding jumper | `(0, 0)` to `(0, 25)` | Dot-to-dot, no gap |
| Ground dot | `(0, 25)` r=5 | Filled, on ground bus |
| Ground bus | `(−20, 25)` to `(20, 25)` | Narrower/lighter than neutral |
| Earth line 1 | `(−22, 75)` to `(22, 75)` | Widest |
| Earth line 2 | `(−16, 87)` to `(16, 87)` | Middle |
| Earth line 3 | `(−10, 99)` to `(10, 99)` | Narrowest |
| Earth ellipse | `(0, 107)` | rx=4, ry=2.5 |

**Key Relationships:** Neutral bus wider/heavier than ground bus. Jumper connects dot-to-dot with NO gap. Earth ground lines decrease in LENGTH (uniform stroke weight). This symbol FLOATS — no connection to power bus.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Neutral bus | 3.0 pt |
| Ground bus | 2.5 pt |
| Bonding jumper | 2.0 pt |
| Vertical link to earth | 2.0 pt |
| Earth ground lines (all 3) | 2.0 pt |
| Filled dots | filled, r=5 |
| Earth ellipse | filled, rx=4, ry=2.5 |

### Connection Ports

**None.** `connection_mode: float`. This symbol floats inside the switchboard distribution section as a symbolic indicator.

### Reference SVG

```svg
<svg viewBox="0 0 260 220" xmlns="http://www.w3.org/2000/svg">
  <line x1="108" y1="40" x2="152" y2="40"
        stroke="#00FFFF" stroke-width="3"/>
  <circle cx="130" cy="40" r="5" fill="#FF69B4"/>
  <line x1="130" y1="40" x2="130" y2="65"
        stroke="#00FFFF" stroke-width="2"/>
  <circle cx="130" cy="65" r="5" fill="#FF69B4"/>
  <line x1="110" y1="65" x2="150" y2="65"
        stroke="#00FFFF" stroke-width="2.5"/>
  <line x1="130" y1="65" x2="130" y2="115"
        stroke="#00FFFF" stroke-width="2"/>
  <line x1="108" y1="115" x2="152" y2="115"
        stroke="#00FFFF" stroke-width="2"/>
  <line x1="114" y1="127" x2="146" y2="127"
        stroke="#00FFFF" stroke-width="2"/>
  <line x1="120" y1="139" x2="140" y2="139"
        stroke="#00FFFF" stroke-width="2"/>
  <ellipse cx="130" cy="147" rx="4" ry="2.5" fill="#00FFFF"/>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Gap between jumper and dots | Jumper starts at neutral dot center, ends at ground dot center. |
| 2 | Earth lines with decreasing stroke weight | All three use 2 pt. Only LENGTH decreases. |
| 3 | N and G buses same width/weight | Neutral: wider (44px) + heavier (3pt). Ground: narrower (40px) + lighter (2.5pt). |
| 4 | Connecting to the power bus | Symbol FLOATS. Not connected to any bus or feeder. |
| 5 | Earth dot as circle | Use `<ellipse>` with rx=4, ry=2.5. |

---


---

## L1-4. Utility Grade Meter

Square box with circle inside containing "M" label, riser from top, and two J-shaped jaw hooks. Utility-owned revenue meter at service entrance.

**Proportion Rule:** Meter box is ⅓ the panelboard side length (S = 140 / 3 ≈ 47). All dependent variables scale proportionally.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Top-left corner of meter box, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `S` | 47 | Meter box side length (square) — ⅓ panelboard |
| `r_circle` | 14 | Inner circle radius |
| `riser_length` | 13 | Riser from box edge to jaw fork |
| `font_size_m` | 12 | "M" label font size |

### Element Positions (default: jaws top)

| Element | Position | Notes |
|---------|----------|-------|
| Meter box | `(0, 0)` to `(47, 47)` | Square, solid |
| Inner circle | `(23.5, 23.5)`, r=14 | Centered in box |
| "M" label | `(23.5, 28)` | Centered in circle |
| Riser | `(23.5, 0)` to `(23.5, −13)` | Box top center to fork point |
| Fork point | `(23.5, −13)` | Both jaw hooks originate here |

**Key Relationships:** Box is square. Box is ⅓ panelboard (S=47 vs S=140). Circle centered in box. "M" is the only text. Jaw hooks curl BACK toward the box (J-shape). Both hooks originate from the same fork point at riser tip.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Meter box | 3.0 pt |
| Inner circle | 3.0 pt |
| Riser | 3.0 pt |
| Jaw hooks | 3.0 pt, stroke-linecap="round" |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `ct_bi` | `(23.5, −13)` — fork point | in/out | `measurement` | `ct_jaw` |

No external text fields. "M" inside circle is the only label.

### Reference SVG

```svg
<svg viewBox="0 0 140 110" xmlns="http://www.w3.org/2000/svg">
  <line x1="63.5" y1="20" x2="63.5" y2="7"
        stroke="#00FFFF" stroke-width="2"/>
  <path d="M63.5,7 C63.5,4 60.5,0 57.5,-2 C54.5,-4 50.5,-2 48.5,2"
        fill="none" stroke="#00FFFF" stroke-width="2" stroke-linecap="round"/>
  <path d="M63.5,7 C63.5,4 66.5,0 69.5,-2 C72.5,-4 76.5,-2 78.5,2"
        fill="none" stroke="#00FFFF" stroke-width="2" stroke-linecap="round"/>
  <rect x="40" y="20" width="47" height="47"
        fill="none" stroke="#00FFFF" stroke-width="2.5"/>
  <circle cx="63.5" cy="43.5" r="14"
          fill="none" stroke="#00FFFF" stroke-width="2"/>
  <text x="63.5" y="48" text-anchor="middle"
        font-family="monospace" font-size="12" font-weight="700"
        fill="#FFFFFF">M</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Jaw hooks as straight lines or V-shape | Cubic Bézier with J-hook — tips curl back toward box. |
| 2 | Jaws curving outward without hooking back | Tips must curve back (J-shape). |
| 3 | Jaws forking from box edge (no riser) | Riser extends from box, jaws fork from riser tip. |
| 4 | Adding external text fields | "M" inside circle is the only label. |
| 5 | Meter box same size as panelboard | Meter box is ⅓ panelboard side length (S=47 vs S=140). |

---


---

## L1-5. Generator *(placeholder)*

Standby or emergency generator providing backup power via ATS. Typically shown at the bottom of the emergency distribution chain, below or beside the ATS. Geometry, ports, and reference SVG to be defined.

### Known Requirements

- Symbol must visually distinguish from utility transformer (different shape — likely circle with "G" or generator symbol).
- Connection port: single `gen_out` port (`connection_mode: inline`) feeding the emergency switchboard or ATS source stub.
- Data fields: designation (e.g., `EG-B-A`), KW rating, voltage, fuel type.
- Relevant codes: NEC 700.12, NEC 701.12, NFPA 110.

### Placeholder Status

| Item | Status |
|------|--------|
| Geometry / Variables | Not defined |
| Connection Ports | `gen_out` — `connection_mode: inline`, `marker_style: none`, direction out |
| Reference SVG | Not defined |
| Anti-patterns | Not defined |

### Calculation Fields *(known requirements)*

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `kw_rating` | number | kW | user | `500` | Generator nameplate standby kW rating |
| `kva_rating` | number | kVA | user | `625` | Generator nameplate kVA rating |
| `voltage` | number | V | user | `480` | Output voltage (line-to-line) |
| `subtransient_reactance` | number | %X"d | user | `12` | Subtransient reactance. Determines generator contribution to fault current |
| `available_fc_output` | number | kA (sym) | calculated | `6.0` | Available fault current at generator terminals: `kva × 1000 / (voltage × √3 × X"d / 100)` |
| `fuel_type` | enum | — | user | `diesel` | `diesel`, `natural_gas`, `bi_fuel`, `propane` |
| `nec_class` | enum | — | user | `700` | NEC classification: `700`, `701`, `702` |

**Relevant standards:** NEC 700.12 (emergency systems), NEC 701.12 (legally required standby), NFPA 110 (emergency power), IEEE 3002.3 (generator fault contribution).

---


---

## L1-6. Draw-Out Circuit Breaker *(placeholder)*

Draw-out variant of L2-1 (Circuit Breaker) with cradle/rail mechanism for racking in/out without de-energizing the bus. Electrically identical port pattern (`line_in`, `bus_out`) and calc fields to L2-1; geometry differs with cradle housing and racking position indicator. Common at L1 main switchboard positions in 3000A+ frames — see NEC 240, IEEE C37.


---

# L2 — Sub-Distribution

Step-down, transfer, branch distribution equipment. Largest layer — includes transformers, panelboards, ATSs, disconnects, metering, and protection.

---

## L2-1. Circuit Breaker

> **Cross-layer instantiation:** This symbol is defined at L2 but is instantiated at L1 (main breaker positions) and L3 (branch breakers) as well. Port pattern and calc fields are identical regardless of instantiation layer. The GFP Circuit Breaker (L1-1) extends this base definition with GFP-specific additions.


Vertical inline symbol: two open circle nodes connected by a trip arc on the left side, a filled circle node at bottom for bus termination. Text fields (amps + separator + poles) to the right.

**Proportion Rule:** Breaker total height is visually similar to inline device boxes (Disconnect S=47). Scaled 0.40× from original to achieve this.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Center of upper open circle (line side node), `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `r_node` | 4 | Radius of open circle nodes |
| `r_bus` | 2.5 | Radius of filled bus termination node |
| `node_spacing` | 32 | Vertical distance between upper and lower circle centers |
| `link_length` | 12 | Vertical link from lower circle bottom to bus node center |
| `arc_offset` | 13 | Horizontal offset of trip arc control point (left of centerline) |
| `text_gap` | 12 | Gap from centerline to text block |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Upper open circle | `(0, 0)` | Line side node, anchor |
| Trip arc control | `(−13, 16)` | Quadratic Bézier, always LEFT side |
| Lower open circle | `(0, 32)` | Load side node |
| Vertical link | `(0, 36)` to `(0, 48)` | Lower circle bottom to bus node area |
| Filled bus node | `(0, 50)` | r=2.5, solid fill |

**Key Relationships:** Trip arc spans node CENTER to node CENTER: `M(0,0) Q(−13,16) (0,32)`. Arc always on LEFT side. All three nodes colinear on vertical centerline. Bus node (r=2.5) is smaller than open nodes (r=4). Total height from `line_in` to `bus_out` = **54px port-to-port** — this is the authoritative value for `cb_height` in all composition formulas. The visual bounding box (including node radii at top and bottom) extends to approximately 57px but is not used for composition spacing; see `sld_preflight_V1_0_0.md` §2 for collision envelope definitions. Visually similar to Disconnect S=47.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Open circles | 3.0 pt |
| Trip arc | 3.0 pt |
| Vertical link | 3.0 pt |
| Filled bus node | filled |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `line_in` | `(0, −4)` — top of upper circle | in (from above) | `inline` | `none` |
| `bus_out` | `(0, 50)` — center of bus node | out (downward) | `bus_tap` | `bus_node` |

### Data Fields (right of symbol)

| Field | Style | Notes |
|-------|-------|-------|
| Amps text | 12px Bold, `text-decoration="underline"` | e.g., `400A` |
| Poles text | 12px Bold, no underline | e.g., `3P` — tight spacing, ~14px below amps baseline |

### Calculation Fields

Fields used by fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `frame_size` | number | A | user | `400` | Breaker frame ampere rating. Must be a valid rating per `nec_standard_ratings.json` → `fuse_cb_ampere_ratings.standard_ratings_a` |
| `trip_rating` | number | A | user | `400` | Trip unit ampere rating (may be less than frame for adjustable-trip breakers). Must be a valid rating per `nec_standard_ratings.json` → `fuse_cb_ampere_ratings.standard_ratings_a` |
| `poles` | number | — | user | `3` | Number of poles |
| `aic_rating` | number | kA (sym) | user | `65` | Interrupting capacity per UL 489. Must equal or exceed `available_fc` at the breaker location per NEC 110.9. Standard tiers in `nec_standard_ratings.json` → `short_circuit_ratings` |
| `available_fc` | number | kA (sym) | calculated | `42.5` | Available fault current at breaker line-side. From upstream bus `available_fc` or feeder `available_fc_load` |

**Relevant standards:** NEC 110.9 (interrupting rating), UL 489 (molded-case circuit breakers).

### Reference SVG

```svg
<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="30" cy="10" r="4"
          fill="none" stroke="#00FFFF" stroke-width="3"/>
  <path d="M30,10 Q17,26 30,42"
        fill="none" stroke="#00FFFF" stroke-width="3"/>
  <circle cx="30" cy="42" r="4"
          fill="none" stroke="#00FFFF" stroke-width="3"/>
  <line x1="30" y1="46" x2="30" y2="58"
        stroke="#00FFFF" stroke-width="3"/>
  <circle cx="30" cy="60" r="2.5"
          fill="#FF69B4" stroke="#FF69B4" stroke-width="1"/>
  <text x="42" y="23" font-family="monospace" font-size="12"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">400A</text>
  <text x="42" y="33" font-family="monospace" font-size="12"
        font-weight="700" fill="#FFFFFF">3P</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Arc starts from feeder above upper circle | Arc starts at upper circle CENTER `(0,0)`, ends at lower circle CENTER `(0,32)`. |
| 2 | Separator `<line>` between amps and poles | No separator line. Amps has `text-decoration="underline"` only. Poles text sits ~10px below amps baseline. |
| 3 | Trip arc on right side | Arc is always on the LEFT (control point X is negative). |
| 4 | Open nodes and bus node same size | Bus node r=2.5 < open node r=4. |
| 5 | Bus bar drawn as part of breaker | Bus bar is a composition element. Breaker only provides the filled bus node. |
| 6 | Breaker same height as panelboard | Breaker total height = 54px port-to-port — visually similar to Disconnect (S=47), much smaller than Panelboard (S=140). |

---

## L2-2. LV Transformer

Square box with centered "T" label, L-shaped ground path exiting left wall, and earth ground symbol. Text fields to the right. Building-owned step-down transformer. NEC 250.30 separately derived system. Primary enters from below (bottom center), secondary exits from top (top center). Alternate reversible ports on left and right walls allow flexible routing.

**Proportion Rule:** T-box is ⅓ the panelboard side length (S = 140 / 3 ≈ 47). All dependent variables scale proportionally.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Top-left corner of T-box, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `S` | 47 | T-box side length (square) — ⅓ panelboard |
| `L_horiz` | 19 | L-path horizontal segment length |
| `L_vert` | 33 | L-path vertical segment length |
| `gnd_w1` / `gnd_w2` / `gnd_w3` | 17 / 12 / 8 | Ground line widths (decreasing) |
| `gnd_spacing` | 6 | Spacing between ground lines |
| `gnd_ellipse_rx` / `ry` | 2 / 1.2 | Ground dot ellipse radii |
| `text_gap` | 8 | Gap from T-box right edge to text |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| T-box | `(0, 0)` to `(47, 47)` | Square, 1:1 always |
| L-path horiz | `(0, 23.5)` to `(−19, 23.5)` | Exits left wall at vertical center |
| L-path vert | `(−19, 23.5)` to `(−19, 56)` | Drops to ground symbol |
| Ground line 1 | `(−27, 56)` to `(−10, 56)` | Widest (17px) |
| Ground line 2 | `(−25, 62)` to `(−13, 62)` | Middle (12px) |
| Ground line 3 | `(−23, 68)` to `(−15, 68)` | Narrowest (8px) |
| Ground ellipse | `(−19, 71)` | rx=2, ry=1.2, filled |
| "T" label | `(23.5, 31)` | Font-size = S × 0.5 (internal label only — not a data tag) |

**Key Relationships:** T-box is always square (1:1). T-box is ⅓ the panelboard (S=47 vs panelboard S=140). L-path exits left wall at `(0, S/2)`. Ground lines decrease in LENGTH (not stroke weight) — all use 2.0 pt. Ground ellipse is wider than tall (not a circle).

### Stroke Weights

| Element | Weight |
|---------|--------|
| T-box outline | 3.0 pt |
| L-path (both segments) | 3.0 pt |
| Ground lines (all 3) | 3.0 pt |
| Ground ellipse | filled (no stroke) |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style | Notes |
|------|----------|-----------|-----------------|--------------|-------|
| `primary_in` | `(23.5, 47)` — bottom center of T-box | in (from below) | `inline` | `none` | Default primary |
| `secondary_out` | `(23.5, 0)` — top center of T-box | out (upward) | `inline` | `none` | Default secondary |
| `flex_left` | `(0, 8)` — left wall, upper quarter | in or out | `inline` | `none` | Reversible primary/secondary — assigned at composition time |
| `flex_right` | `(47, 8)` — right wall, upper quarter | in or out | `inline` | `none` | Reversible primary/secondary — assigned at composition time |

No stubs — feeder lines drawn during composition. Flex ports allow flexible routing; primary/secondary assignment is reversible on the flex ports.

### Data Fields (right of T-box)

| Field | Style | Example |
|-------|-------|---------|
| Label Panel Name | 12px Bold, underlined | `4T-B-A` |
| Line 1 | 12px Bold | `225KVA` |
| Line 2 | 12px Bold | `480V-` |
| Line 3 | 12px Bold | `208Y/120V` |

### Calculation Fields

Fields used by voltage drop and fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `kva` | number | kVA | user | `225` | Transformer nameplate rating |
| `primary_voltage` | number | V | user | `480` | Primary winding voltage (line-to-line) |
| `secondary_voltage` | number | V | user | `208` | Secondary winding voltage (line-to-line) |
| `impedance_pct` | number | %Z | user / lookup | `4.5` | Nameplate impedance. If unknown, use lookup by kVA from `transformer_impedance.json` → `transformers[kva].percent_z.midpoint`. Typical range for 225 kVA: 3.5–5.0% |
| `x_r_ratio` | number | — | lookup | `3.5` | X/R ratio. Lookup from `transformer_impedance.json` → `transformers[kva].x_over_r.midpoint`. Typical for dry-type ≤500 kVA: 2–5 |
| `winding_config` | enum | — | user | `delta-wye` | Winding configuration. Affects grounding and fault current per NEC 250.30 (separately derived system) |
| `available_fc_primary` | number | kA (sym) | calculated | `42.5` | Available fault current at primary terminals — inherited from upstream feeder `available_fc_load` or bus `available_fc` |
| `available_fc_secondary` | number | kA (sym) | calculated | `18.7` | Available fault current at secondary terminals |
| `fla_secondary` | number | A | calculated | `625` | Full load amps on secondary: `kva × 1000 / (secondary_voltage × √3)` |

**Relevant standards:** NEC 250.30 (separately derived systems), IEEE C57.12.01 (dry-type transformer impedance), NEC 450.3 (overcurrent protection).

### Reference SVG

```svg
<svg viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="60" y="20" width="47" height="47"
        fill="none" stroke="#00FFFF" stroke-width="3"/>
  <text x="83.5" y="51" text-anchor="middle"
        font-family="monospace" font-size="24" font-weight="700"
        fill="#FFFFFF">T</text>
  <line x1="60" y1="43.5" x2="41" y2="43.5"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="41" y1="43.5" x2="41" y2="76"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="32" y1="76" x2="50" y2="76"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="35" y1="82" x2="47" y2="82"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="37" y1="88" x2="45" y2="88"
        stroke="#00FFFF" stroke-width="3"/>
  <ellipse cx="41" cy="91" rx="2" ry="1.2" fill="#00FFFF"/>
  <text x="115" y="34" font-family="monospace" font-size="12"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">4T-B-A</text>
  <text x="115" y="50" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">225KVA</text>
  <text x="115" y="64" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">480V-</text>
  <text x="115" y="78" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">208Y/120V</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Ground dot as `<circle>` | Use `<ellipse>` with rx=2, ry=1.2. |
| 2 | "T" font-size too small | Font-size = S × 0.5 (24px for 47px box). |
| 3 | T-box rectangular | Must be square (1:1 always). |
| 4 | Ground lines with decreasing stroke weight | All 3 lines use same stroke weight (3.0 pt). Only length decreases. |
| 5 | L-path from bottom of T-box | L-path exits from LEFT WALL at vertical center. |
| 6 | T-box same size as panelboard | T-box is ⅓ panelboard side length (S=47 vs S=140). |

---

## L2-3. Automatic Transfer Switch (ATS)

Square box with three open circle nodes and a diagonal throw line. Upper circle = load; two lower circles = sources (normal left, emergency right). Three feeder stubs. Text fields to the right with separator line.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Top-left corner of ATS box, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `S` | 140 | ATS box side length (square) |
| `r_node` | 10 | All three circle nodes (same size) |
| `upper_y` | 28 | Upper circle Y offset from box top |
| `lower_y` | 108 | Lower circles Y offset from box top |
| `source_offset` | 35 | Lower circles horizontal offset from center |
| `stub_top` | 30 | Load stub length above box |
| `stub_bottom` | 60 | Source stub length below box |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| ATS box | `(0, 0)` to `(140, 140)` | Square, solid |
| Upper circle (load) | `(70, 28)` | Upper zone, NOT at center |
| Lower-left (source 1) | `(35, 108)` | Normal power |
| Lower-right (source 2) | `(105, 108)` | Emergency power |
| Throw line | Edge-to-edge, upper to active source | Default: to lower-left |

**Key Relationships:** Throw line connects EDGE-to-EDGE (not center-to-center). Source stubs pass through box bottom edge. No "NORMAL"/"EMERG" labels — position convention only.

### Stroke Weights

| Element | Weight |
|---------|--------|
| ATS box | 3.0 pt |
| Throw line | 3.0 pt |
| Circle nodes | 3.0 pt |
| Feeder stubs | 3.0 pt |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `load_out` | `(70, −30)` — top of load stub | out (upward toward load) | `inline` | `stub` |
| `source1_in` | `(35, 200)` — bottom of source 1 stub | in (from below, normal power) | `inline` | `stub` |
| `source2_in` | `(105, 200)` — bottom of source 2 stub | in (from below, emergency power) | `inline` | `stub` |

### Data Fields (right of box)

| Field | Style | Example |
|-------|-------|---------|
| Label Panel Name | 12px Bold, underlined | `L4A-B-A` |
| Line 1 | 12px Bold | `400A` — tight spacing, ~14px below name baseline |
| Line 2 | 12px Bold | `4-POLE` |

### Calculation Fields

Fields used by fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `continuous_rating` | number | A | user | `400` | ATS continuous current rating |
| `poles` | number | — | user | `4` | Number of poles (3 or 4) |
| `withstand_rating` | number | kA (sym) | user | `65` | Short-circuit withstand/closing rating per UL 1008. Must meet or exceed `available_fc` per NEC 110.9 |
| `available_fc` | number | kA (sym) | calculated | `42.5` | Available fault current at ATS. Higher of the two source-side fault currents |
| `nec_class` | enum | — | user | `700` | NEC classification: `700` (life safety), `701` (legally required), `702` (optional standby), `normal` |

**Relevant standards:** NEC 700.12 (emergency system transfer), NEC 701.12 (legally required standby), UL 1008 (transfer switch equipment), NFPA 110 (emergency power systems).

### Reference SVG

```svg
<svg viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg">
  <line x1="130" y1="10" x2="130" y2="40"
        stroke="#00FFFF" stroke-width="3"/>
  <rect x="60" y="40" width="140" height="140"
        fill="none" stroke="#00FFFF" stroke-width="3"/>
  <circle cx="130" cy="68" r="10"
          fill="none" stroke="#00FFFF" stroke-width="3"/>
  <circle cx="95" cy="148" r="10"
          fill="none" stroke="#00FFFF" stroke-width="3"/>
  <circle cx="165" cy="148" r="10"
          fill="none" stroke="#00FFFF" stroke-width="3"/>
  <line x1="123" y1="76" x2="101" y2="141"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="95" y1="158" x2="95" y2="240"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="165" y1="158" x2="165" y2="240"
        stroke="#00FFFF" stroke-width="3"/>
  <text x="218" y="58" font-family="monospace" font-size="12"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">L4A-B-A</text>
  <text x="218" y="76" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">400A</text>
  <text x="218" y="94" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">4-POLE</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Upper circle at vertical center | Upper circle at `upper_y = 28` — in the upper zone. |
| 2 | "NORMAL"/"EMERG" labels | Position convention only. No labels. |
| 3 | Throw line center-to-center | Edge-to-edge between circles. |
| 4 | Missing stubs on sources | All 3 connections have stubs. Source stubs pass through box bottom. |
| 5 | Text inside box | Text outside, to the right. |

---

## L2-4. Panelboard

Square box with heavy solid outline, underlined panel name at top, and up to three text lines below — all text centered inside the box. Bidirectional connection ports on all four sides. Terminal device on the SLD.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Top-left corner of panel box, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `S` | 140 | Panel box side length (square) |
| `name_y` | 32 | Panel name Y offset from box top |
| `line1_y` / `line2_y` / `line3_y` | 60 / 82 / 104 | Text line Y offsets |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Panel box | `(0, 0)` to `(140, 140)` | Square, SOLID outline |
| Panel name | `(70, 32)` | Bold, underlined (text-decoration, NOT a separator line) |
| Lines 1–3 | `(70, 60/82/104)` | Regular weight, centered |

**Key Relationships:** Box is always square (1:1). Outline is SOLID (not dashed — this distinguishes from switchboard sections). All text INSIDE the box, centered. Panel name underline is `text-decoration` only — NO internal `<line>` separator elements. No feeder stub — connection ports are directly on the box edges.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Panel box outline | 3.0 pt (solid, no dasharray) |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `feed_top` | `(70, 0)` — top center of box | in/out | `terminal` | `none` |
| `feed_bottom` | `(70, 140)` — bottom center of box | in/out | `terminal` | `none` |
| `feed_left` | `(0, 70)` — left center of box | in/out | `terminal` | `none` |
| `feed_right` | `(140, 70)` — right center of box | in/out | `terminal` | `none` |

**Four bidirectional ports** — panelboard is a terminal device but can be fed from any direction. Branch circuits are on the panel schedule.

### Data Fields (inside box, centered)

| Field | Style | Example |
|-------|-------|---------|
| Label Panel Name | Bold, underlined | `4B-2-A`, `E2L-1-A` |
| Line 1 | Regular | `480/277V 3Ø` |
| Line 2 | Regular | `MLO` |
| Line 3 | Regular | `225A` |

### Calculation Fields

Fields used by fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `bus_rating` | number | A | user | `225` | Panelboard bus continuous rating |
| `main_type` | enum | — | user | `MLO` | `MLO` (main lug only) or `MCB` (main circuit breaker). Affects upstream protection requirements |
| `aic_rating` | number | kA (sym) | user | `65` | Panel short-circuit current rating per UL 67. Must meet or exceed `available_fc` per NEC 110.9 |
| `available_fc` | number | kA (sym) | calculated | `28.3` | Available fault current at panel bus. From upstream feeder `available_fc_load` |
| `voltage` | number | V | user | `480` | Nominal voltage (line-to-line) |
| `phases` | number | — | user | `3` | Number of phases |
| `total_connected_load` | number | kVA | user | `168` | Defaults to panel bus rating (kVA equivalent) or feeding transformer kVA — whichever applies. Override with actual schedule total when available |

**Connected load workflow:** The feeder distance input template includes a connected load tab listing every panelboard designation with its default `total_connected_load` (derived from `bus_rating` or feeding transformer kVA). The engineer overrides individual values with actual panel schedule totals where available. The AI uses the final values for load current calculations on downstream feeders.

**Relevant standards:** NEC 110.9 (interrupting rating), NEC 408.36 (panelboard overcurrent protection), UL 67 (panelboard construction).

### Reference SVG

```svg
<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="40" width="140" height="140"
        fill="none" stroke="#00FFFF" stroke-width="3"/>
  <text x="120" y="72" text-anchor="middle"
        font-family="monospace" font-size="12" font-weight="700"
        text-decoration="underline"
        fill="#FFFFFF">4B-2-A</text>
  <text x="120" y="100" text-anchor="middle"
        font-family="monospace" font-size="12"
        fill="#FFFFFF">480/277V 3Ø</text>
  <text x="120" y="122" text-anchor="middle"
        font-family="monospace" font-size="12"
        fill="#FFFFFF">MLO</text>
  <text x="120" y="144" text-anchor="middle"
        font-family="monospace" font-size="12"
        fill="#FFFFFF">225A</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Full-width separator line under panel name | Use `text-decoration="underline"` only. No `<line>` elements inside box. |
| 2 | Dashed outline | Always solid. Dashed = switchboard section. |
| 3 | Text outside the box | All text centered inside at `x = S/2`. |
| 4 | Bold for Lines 1–3 | Only panel name is bold. Lines 1–3 are regular weight. |
| 5 | Bus bar inside panel | Panelboards have no bus on the SLD. |
| 6 | Rectangular (not square) | Must be 1:1. Scale both dimensions equally. |
| 7 | Feeder stub drawn as part of symbol | No stubs. Connection ports sit directly on box edges. Feeder lines drawn during composition. |

---

## L2-5. Disconnect Switch

Square box with centered fuse indicator letter, connection ports on all four edges, and an L-shaped handle (throw bar) exiting the right wall. Text fields to the right. Non-automatic switching device for isolation — maintenance disconnects, service entrance disconnects, fire pump disconnects per NEC 695. Line side enters from below (bottom center), load side exits upward (top center). Alternate reversible ports on left and right walls allow flexible routing.

**Proportion Rule:** Disconnect box is ⅓ the panelboard side length (S = 140 / 3 ≈ 47). All dependent variables scale proportionally.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Top-left corner of disconnect box, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `S` | 47 | Box side length (square) — ⅓ panelboard |
| `handle_horiz` | 16 | Handle horizontal segment length (exits right wall) |
| `handle_vert` | 16 | Handle vertical drop (knife-blade indicator) |
| `handle_y` | 16 | Y offset from box top to handle exit point |
| `font_size_indicator` | 16 | Fuse indicator letter font size (S × 0.33) |
| `text_gap` | 8 | Gap from box right edge + handle to text block |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Disconnect box | `(0, 0)` to `(47, 47)` | Square, SOLID outline |
| Handle horiz | `(47, 16)` to `(63, 16)` | Exits right wall at upper third |
| Handle vert | `(63, 16)` to `(63, 32)` | Knife-blade drop |
| Indicator letter | `(23.5, 27)` | Centered in box |

**Key Relationships:** Box is always square (1:1). Box is ⅓ panelboard (S=47 vs S=140). No feeder stubs — connection ports sit directly on box edges. This is an inline device, NOT bus-mounted. Handle always exits the RIGHT wall. Handle Y position at upper third of box (`handle_y = S × 0.33`). Handle forms an L-shape: horizontal right, then vertical down — representing the knife-blade throw position. No trip arc, no circles, no bus node — these are the primary visual differentiators from the circuit breaker. Flex ports on left and right walls sit at `y = 8` (upper quarter), 8px above the handle exit point — same positioning logic as LV Transformer flex ports.

### Fuse Indicator Convention

| Letter | Meaning |
|--------|---------|
| `F` | Fused disconnect |
| *(empty — no letter)* | Non-fused disconnect |

The indicator letter is centered inside the box at `(S/2, S × 0.58)`. Font-size = `S × 0.33` (16px for default 47px box). Bold weight (700). When no letter is present, the box interior is empty.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Disconnect box outline | 3.0 pt (solid, no dasharray) |
| Handle (both segments) | 3.0 pt |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style | Notes |
|------|----------|-----------|-----------------|--------------|-------|
| `load_out` | `(23.5, 0)` — top center of box | out (upward) | `inline` | `none` | Default load side |
| `line_in` | `(23.5, 47)` — bottom center of box | in (from below) | `inline` | `none` | Default line/source side |
| `flex_left` | `(0, 8)` — left wall, upper quarter | in or out | `inline` | `none` | Reversible line/load — assigned at composition time |
| `flex_right` | `(47, 8)` — right wall, upper quarter | in or out | `inline` | `none` | Reversible line/load — assigned at composition time |

**No `bus_tap` port** — disconnects are inline feeder devices, not bus-mounted. No feeder stubs — ports sit directly on box edges, feeder lines drawn during composition. Flex ports allow flexible routing; line/load assignment is reversible on the flex ports. `flex_right` at `y=8` sits 8px above the handle exit at `y=16` — no collision.

### Data Fields (right of symbol)

| Field | Style | Example |
|-------|-------|---------|
| Label Panel Name | 12px Bold (700), underlined (`text-decoration`) | `FPD-B-A` |
| Line 1 | 12px Bold (600) | `200A` |
| Line 2 | 12px Bold (600) | `3P` |

No separator `<line>` between name and data lines (distinguishes from ATS text layout).

### Calculation Fields

Fields used by fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `continuous_rating` | number | A | user | `200` | Disconnect continuous current rating |
| `poles` | number | — | user | `3` | Number of poles |
| `fused` | boolean | — | user | `true` | Whether the disconnect contains fuses |
| `fuse_type` | string | — | user | `Class RK1` | Fuse class (if fused): `Class J`, `Class RK1`, `Class L`, etc. Determines interrupting rating and current-limiting behavior |
| `fuse_aic` | number | kA (sym) | user | `200` | Fuse interrupting rating (if fused). Current-limiting fuses can have very high AIC. Per NEC 110.9 |
| `switch_withstand` | number | kA (sym) | user | `100` | Short-circuit withstand/closing rating of the switch itself per UL 98 |
| `available_fc` | number | kA (sym) | calculated | `42.5` | Available fault current at disconnect line-side |

**Relevant standards:** NEC 110.9 (interrupting rating), NEC 404.7 (disconnect switch ratings), NEC 695.4 (fire pump disconnects), UL 98 (enclosed and dead-front switches).

### Reference SVG

```svg
<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
  <rect x="40" y="20" width="47" height="47"
        fill="none" stroke="#00FFFF" stroke-width="2.5"/>
  <text x="63.5" y="47" text-anchor="middle"
        font-family="monospace" font-size="16" font-weight="700"
        fill="#FFFFFF">F</text>
  <line x1="87" y1="36" x2="103" y2="36"
        stroke="#00FFFF" stroke-width="2.5"/>
  <line x1="103" y1="36" x2="103" y2="52"
        stroke="#00FFFF" stroke-width="2.5"/>
  <text x="115" y="32" font-family="monospace" font-size="12"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">FPD-B-A</text>
  <text x="115" y="48" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">200A</text>
  <text x="115" y="62" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">3P</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Trip arc or circle nodes (circuit breaker style) | Square box with L-handle. No arcs, no circles. |
| 2 | Handle on left side | Handle always exits RIGHT wall. |
| 3 | Handle as a single diagonal line | Two-segment L-path: horizontal right, then vertical down. |
| 4 | Bus node at bottom (like a breaker) | Disconnects are NOT bus-mounted. Ports directly on box edges. |
| 5 | Separator `<line>` under name text | No separator line. Name underline is `text-decoration` only. |
| 6 | "FUSED" / "NON-FUSED" as text field | Use centered letter inside box: `F` = fused, empty = non-fused. |
| 7 | Rectangular (not square) box | Must be 1:1. Scale both dimensions equally. |
| 8 | Handle exit at box center or bottom | Handle exits at upper third (`handle_y = S × 0.33`). |
| 9 | Feeder stubs drawn as part of symbol | No stubs. Connection ports sit directly on box edges. Feeder lines drawn during composition. |
| 10 | Disconnect box same size as panelboard | Disconnect box is ⅓ panelboard side length (S=47 vs S=140). |
| 11 | `line_in` on top, `load_out` on bottom | Line side enters from BELOW (`line_in` at bottom center). Load side exits UPWARD (`load_out` at top center). |
| 12 | Flex ports at vertical center or below handle | Flex ports at `y = 8` (upper quarter), ABOVE the handle exit at `y = S × 0.33`. |

---

## L2-6. Surge Protective Device (SPD)

Small rectangular box with centered "SPD" label. Operates in one of two connection modes depending on installation: **Mode A** — fed from a dedicated circuit breaker as a branch load (terminal device); **Mode B** — spur-attached directly to a panelboard corner (lateral branch, no dedicated breaker). Per NEC 242.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Top-left corner of SPD box, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `W` | 62 | Box width |
| `H` | 26 | Box height |
| `font_size` | 11 | "SPD" label font size |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| SPD box | `(0, 0)` to `(62, 26)` | Rectangle, ~2.4:1 aspect ratio |
| "SPD" label | `(31, 18)` | Centered in box |

**Key Relationships:** Box is rectangular (wider than tall — NOT square). No spur stub — connection ports sit directly on box edges. No external text fields — "SPD" inside the box is the only label. The compact size allows placement adjacent to the equipment it protects without dominating the drawing.

### Stroke Weights

| Element | Weight |
|---------|--------|
| SPD box outline | 3.0 pt (solid, no dasharray) |

### Connection Ports

**Mode A — Dedicated CB Feed (terminal device):**

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `line_in` | `(31, 26)` — bottom center of box | in (from below) | `terminal` | `none` |

In Mode A, the SPD is a branch load fed from a dedicated circuit breaker via a Feeder (R-1). A single `line_in` port receives power from the upstream breaker's `bus_out` through a feeder. The SPD is a terminal device — no output port. This mode is used when the SPD is installed as a standalone device on a dedicated breaker position in a panelboard or switchboard.

**Mode B — Spur Attachment (lateral branch to panelboard):**

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `spur_top` | `(31, 0)` — top center of box | in/out | `spur` | `none` |
| `spur_bottom` | `(31, 26)` — bottom center of box | in/out | `spur` | `none` |
| `spur_left` | `(0, 13)` — left center of box | in/out | `spur` | `none` |
| `spur_right` | `(62, 13)` — right center of box | in/out | `spur` | `none` |

In Mode B, the SPD snaps directly onto a panelboard boundary corner — no dedicated breaker, no feeder. Four bidirectional spur ports allow placement on any edge. During composition, the appropriate port is selected based on the panelboard corner used for attachment.

**Spur attachment targets:** Panelboard (L2-4) corners only. SPD does not spur-attach to transformers or disconnects.

**Mode selection:** The compositor selects the mode based on whether the SPD has an upstream breaker instance:
- Upstream breaker exists → Mode A (`line_in`, `connection_mode: terminal`)
- No upstream breaker, snaps to panelboard boundary → Mode B (`spur_` ports, `connection_mode: spur`)

### Data Fields

**None.** The SPD has no external text fields. The "SPD" label inside the box is the only annotation. SPD type (1, 2, or 3) and kA rating are specified in the panel schedule or equipment schedule, not on the SLD symbol.

### Reference SVG

```svg
<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg">
  <rect x="49" y="22" width="62" height="26"
        fill="none" stroke="#00FFFF" stroke-width="2.5"/>
  <text x="80" y="40" text-anchor="middle"
        font-family="monospace" font-size="11" font-weight="700"
        fill="#FFFFFF">SPD</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | SPD inline on a feeder (two stubs, pass-through) | SPD is either a terminal device (Mode A — fed from dedicated CB) or a spur (Mode B — attached to panelboard corner). Never inline pass-through. |
| 2 | Square box (1:1) | Rectangular, ~2.4:1 aspect. Wider than tall. |
| 3 | External text fields (type, kA rating) | No external labels. "SPD" inside box is the only text. Type/kA go in equipment schedule. |
| 4 | Diamond or lightning-bolt shape | Rectangular box with "SPD" text. |
| 5 | Dashed outline | Always solid. |
| 6 | Large symbol competing with adjacent equipment | Keep compact (62×26 default). SPD is an accessory, not a primary device. |
| 7 | Spur stub drawn as part of symbol | No stubs. Connection ports sit directly on box edges. Routing lines drawn during composition. |
| 8 | SPD spur-attached to transformer or disconnect | Spur attachment targets are panelboard (L2-4) corners only. For transformer/disconnect protection, use Mode A (dedicated CB feed). |
| 9 | Mode B SPD overlapping panelboard data fields | SPD attachment corner must be on the opposite side from the panelboard's centered text. Place on bottom-left or bottom-right corner, away from primary feeder entry port. |

---

## L2-7. Spare / Space Breaker

Two variants representing unused breaker positions within a switchboard distribution section. Both occupy a breaker position on the secondary bus. Neither variant has amps/poles text to the right — replaced by a label above the symbol.

### Variant A: Spare

Full circuit breaker geometry (upper circle, trip arc, lower circle, vertical link, bus node) with "SPARE" label above. Breaker is installed but no load is connected.

### Variant B: Space

Lower open circle, vertical link, and bus node only — no upper circle, no trip arc. "SPACE" label above. Empty slot, no breaker installed. The open circle and link indicate the reserved bus position.

---

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor (both variants) | Center of upper open circle position, `(0, 0)` — same as standard breaker anchor for consistent bus-level alignment |

All variables inherited from the standard circuit breaker (L2-1):

| Variable | Default | Description |
|----------|---------|-------------|
| `r_node` | 4 | Radius of open circle nodes |
| `r_bus` | 2.5 | Radius of filled bus termination node |
| `node_spacing` | 32 | Vertical distance between upper and lower circle centers |
| `link_length` | 12 | Vertical link from lower circle bottom to bus node center |
| `arc_offset` | 13 | Horizontal offset of trip arc control point (left of centerline) |
| `label_gap` | 8 | Gap from label baseline to top of upper circle (or to top of lower circle for Space) |
| `font_size_label` | 12 | Label font size |

### Element Positions — Spare

| Element | Position | Notes |
|---------|----------|-------|
| "SPARE" label | `(0, −8)` | Centered above upper circle, `text-anchor="middle"` |
| Upper open circle | `(0, 0)` | Line side node, anchor |
| Trip arc control | `(−13, 16)` | Quadratic Bézier, LEFT side |
| Lower open circle | `(0, 32)` | Load side node |
| Vertical link | `(0, 36)` to `(0, 48)` | Lower circle bottom to bus node area |
| Filled bus node | `(0, 50)` | r=2.5, solid fill |

**Key Relationships (Spare):** Identical geometry to standard circuit breaker (L2-1). Only difference: no amps/poles text to the right, "SPARE" label above.

### Element Positions — Space

| Element | Position | Notes |
|---------|----------|-------|
| "SPACE" label | `(0, 24)` | Centered above lower circle position |
| Lower open circle | `(0, 32)` | Only circle present |
| Vertical link | `(0, 36)` to `(0, 48)` | Circle bottom to bus node area |
| Filled bus node | `(0, 50)` | r=2.5, solid fill |

**Key Relationships (Space):** No upper circle. No trip arc. Only the lower open circle, vertical link, and bus node — indicating a reserved bus tap position with no breaker installed.

### Stroke Weights

Same as standard circuit breaker for all shared elements:

| Element | Weight | Spare | Space |
|---------|--------|-------|-------|
| Open circles | 3.0 pt | Both circles | Lower circle only |
| Trip arc | 3.0 pt | Present | Absent |
| Vertical link | 3.0 pt | Present | Present |
| Filled bus node | filled | Present | Present |
| Label text | 600 weight, 12px | "SPARE" | "SPACE" |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style | Variant |
|------|----------|-----------|-----------------|--------------|---------|
| `bus_out` | `(0, 50)` — center of bus node | out (downward) | `bus_tap` | `bus_node` | Both |

**No `line_in` port** — neither variant has an active feeder connection above.

### Data Fields

**None.** No amps, poles, or other text to the right. The label above the symbol ("SPARE" or "SPACE") is the only annotation.

### Reference SVG — Spare

```svg
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <text x="40" y="8" text-anchor="middle"
        font-family="monospace" font-size="9" font-weight="600"
        fill="#FFFFFF">SPARE</text>
  <circle cx="40" cy="16" r="4"
          fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <path d="M40,16 Q27,32 40,48"
        fill="none" stroke="#00FFFF" stroke-width="2"/>
  <circle cx="40" cy="48" r="4"
          fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <line x1="40" y1="52" x2="40" y2="64"
        stroke="#00FFFF" stroke-width="1.5"/>
  <circle cx="40" cy="66" r="2.5"
          fill="#FF69B4" stroke="#FF69B4" stroke-width="1"/>
</svg>
```

### Reference SVG — Space

```svg
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <text x="40" y="38" text-anchor="middle"
        font-family="monospace" font-size="9" font-weight="600"
        fill="#FFFFFF">SPACE</text>
  <circle cx="40" cy="48" r="4"
          fill="none" stroke="#00FFFF" stroke-width="1.5"/>
  <line x1="40" y1="52" x2="40" y2="64"
        stroke="#00FFFF" stroke-width="1.5"/>
  <circle cx="40" cy="66" r="2.5"
          fill="#FF69B4" stroke="#FF69B4" stroke-width="1"/>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Amps/poles text to the right | No text fields to the right. Label above only. |
| 2 | Dashed or ghost outline on Spare | Spare uses full solid breaker geometry — it IS installed. |
| 3 | Full breaker geometry on Space | Space has lower circle + link + bus node ONLY. No upper circle, no arc. |
| 4 | Label below or beside the symbol | Label always ABOVE, centered on the breaker centerline. |
| 5 | Different bus node position than standard breaker | Bus node at `(0, 50)` — same as L2-1 for consistent bus alignment. |
| 6 | Adding a `line_in` port | Neither variant has an active feeder. `bus_out` only. |

---

## L2-8. Meter (Branch / Feeder)

Circle with horizontal center line dividing upper/lower text zones. CT clamp (two curly-brace arcs) extends from one side. Building-owned sub-meter.

**Proportion Rule:** Circle diameter is ⅓ the panelboard side length (dia = 140 / 3 ≈ 47, r ≈ 23.5). All dependent variables scale proportionally.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Center of meter circle, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `r` | 23.5 | Meter circle radius — dia ≈ ⅓ panelboard |
| `leader_gap` | 21 | Distance from circle edge to clamp center |
| `clamp_spread` | 25 | Vertical distance from clamp center to each arc tip |
| `font_size` | 13 | Text font size |

### Element Positions (default: clamp left)

| Element | Position | Notes |
|---------|----------|-------|
| Meter circle | `(0, 0)`, r=23.5 | Main body |
| Center line | `(−44, 0)` to `(23.5, 0)` | CONTINUOUS from clamp center to circle right edge |
| Clamp center | `(−44, 0)` | Both arcs originate here |
| Upper text ("M") | `(0, −6)` | Above center line |
| Lower text ("B") | `(0, 12)` | Below center line |

**Key Relationships:** Circle only — no box (distinguishes from utility meter). Circle diameter is ⅓ panelboard (dia=47 vs S=140). Center line is ONE continuous `<line>` from clamp center to circle right edge — terminates flush at the perimeter, does NOT extend beyond. CT clamp arcs form a curly brace `{` shape. Arc tips curl back toward circle.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Meter circle | 3.0 pt |
| CT clamp arcs | 3.0 pt, stroke-linecap="round" |
| Center line | 3.0 pt |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `ct_bi` | `(−44, 0)` — clamp center | in/out | `measurement` | `ct_brace` |

### Data Fields (inside circle)

| Field | Position | Example |
|-------|----------|---------|
| Upper text | Above center line | `M` |
| Lower text | Below center line | `B` (branch) or `F` (feeder) |

### Reference SVG

```svg
<svg viewBox="-10 10 120 80" xmlns="http://www.w3.org/2000/svg">
  <path d="M10.5,50 C5.5,50 -1.5,46 -3.5,41 C-5.5,35 -3.5,29 2.5,25"
        fill="none" stroke="#00FFFF" stroke-width="2" stroke-linecap="round"/>
  <path d="M10.5,50 C5.5,50 -1.5,54 -3.5,59 C-5.5,65 -3.5,71 2.5,75"
        fill="none" stroke="#00FFFF" stroke-width="2" stroke-linecap="round"/>
  <line x1="10.5" y1="50" x2="78.5" y2="50"
        stroke="#00FFFF" stroke-width="1.5"/>
  <circle cx="55" cy="50" r="23.5"
          fill="none" stroke="#00FFFF" stroke-width="2.5"/>
  <text x="55" y="45" text-anchor="middle"
        font-family="monospace" font-size="13" font-weight="600"
        fill="#FFFFFF">M</text>
  <text x="55" y="62" text-anchor="middle"
        font-family="monospace" font-size="13" font-weight="600"
        fill="#FFFFFF">B</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | CT arcs as half-circles or U-shapes | Cubic Bézier curly brace `{` shape. Tips curl back. |
| 2 | Separate leader + center line | Single continuous `<line>` from clamp center through full diameter. |
| 3 | Adding a surrounding box | Circle only. Box = utility meter. |
| 4 | Arc tips pointing outward | Tips curve BACK toward circle. |
| 5 | Circle same size as panelboard | Circle diameter is ⅓ panelboard side length (dia=47 vs S=140). |

---


---

## L2-9. Bus Plug *(placeholder)*

Tap-off device on a Busway (R-3) providing fusible or circuit breaker protection at the busway tap point. Inline between a busway `tap_N` port and downstream branch distribution. Geometry, ports (`busway_in`, `load_out`), reference SVG, and anti-patterns not yet defined — see NEC 368.56, NEC 240.21.

---

## L2-10. UPS *(placeholder)*

Uninterruptible power supply providing battery-backed ride-through between normal source and critical load panel. May include a maintenance bypass path. Geometry, ports (`source_in`, `load_out`, optional `bypass_in`), reference SVG, and anti-patterns not yet defined — see NEC 645.11, NEC 700/701, NFPA 111.

---

## L2-11. Inverter *(placeholder)*

DC-to-AC conversion device between a PV array (L2-12) or battery storage system and the AC distribution. Converts variable DC input to grid-synchronized AC output. Geometry, ports (`dc_in`, `ac_out`), reference SVG, and anti-patterns not yet defined — see NEC 690.11, NEC 705.12, UL 1741, IEEE 1547.

---

## L2-12. PV Array *(placeholder)*

Photovoltaic source representing one or more PV string combiners feeding an inverter (L2-11). Default is behind-the-meter at L2; can also instantiate at L0 for front-of-meter utility-scale. Geometry, ports (`dc_out`), reference SVG, and anti-patterns not yet defined — see NEC 690, NEC 690.7, NEC 690.8.

---

## L2-13. Meter Stack *(placeholder)*

Multi-meter assembly (CT cabinet + branch meters) in a single enclosure for multi-tenant commercial buildings. Ports include `line_in` and indexed `meter_out_N` positions. Geometry, reference SVG, and anti-patterns not yet defined — see NEC 408, local utility metering requirements.


---

# L3 — Branch / Terminal

End-of-line loads, terminal connections, and equipment interface elements.

---

## L3-1. Fire Pump

Compound symbol: pump motor circle with opposing arm slashes sitting on top of a starter box with an X cross inside. The motor circle occludes the arms (no linework visible inside the circle). Text fields to the right. Feeder enters from below at starter box bottom center. Per NEC 695 and NFPA 20.

**Proportion Rule:** Starter box is ⅓ the panelboard side length (S = 140 / 3 ≈ 47). Motor circle scales proportionally to maintain the ~78% width ratio. All dependent variables scale proportionally.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Top-left corner of starter box, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `S` | 47 | Starter box side length (square) — ⅓ panelboard |
| `r_motor` | 19 | Motor circle radius (proportional scale from 22 at S=56) |
| `arm_length` | 15 | Motor arm slash length (approximate diagonal) |
| `text_gap` | 21 | Gap from starter box right edge to text block |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Starter box | `(0, 0)` to `(47, 47)` | Square, solid outline |
| Motor circle | `(23.5, −19)`, r=19 | Centered above box, bottom edge flush with box top |
| "F" label | `(23.5, −14)` | Centered in motor circle, `text-anchor="middle"`, 19px Bold (700) |
| Left arm | `(−5, −36)` to `(7, −22)` | Upper-left of circle, angles down-right toward circle — inner end 3px inside circle perimeter for clean occlusion |
| Right arm | `(42, −13)` to `(52, −1)` | Lower-right of circle, angles down-right away from circle |
| X cross line 1 | `(0, 0)` to `(47, 47)` | Top-left to bottom-right |
| X cross line 2 | `(47, 0)` to `(0, 47)` | Top-right to bottom-left |

**Key Relationships:** Motor circle sits directly ON TOP of the starter box — circle bottom edge is flush with box top edge (shared boundary, verified: center y=−19 + r=19 = 0). Arms are drawn BEHIND the circle (circle has an opaque fill matching background to occlude). Arms are in OPPOSING directions: left arm angles up-left to down-right, right arm angles down-right continuing the opposing diagonal. The centered "F" annotation is the only element inside the motor circle — no other linework or text visible inside. X cross runs corner-to-corner of the starter box. No text inside the starter box. Starter box follows ⅓ panelboard proportion (S=47 vs S=140), matching the LV Transformer, Disconnect Switch, and Utility Meter.

### Motor Arm Convention

The two arms represent the motor shaft indication. They emerge from behind the circle at opposing quadrants:

| Arm | Outer end | Inner end (hidden by circle) | Angle |
|-----|-----------|------------------------------|-------|
| Left arm | Upper-left of circle | Enters circle at ~10 o'clock | Down-right (toward center) |
| Right arm | Lower-right of circle | Exits circle at ~4 o'clock | Down-right (away from center) |

Both arms use the same slope but are offset to opposite sides of the circle, creating the appearance of a line passing behind the circle.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Motor circle outline | 3.0 pt |
| Motor circle fill | Opaque (matches background — occludes arms) |
| Motor arms (both) | 3.0 pt |
| Starter box outline | 3.0 pt (solid, no dasharray) |
| X cross lines (both) | 3.0 pt |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `load_in` | `(23.5, 47)` — bottom center of starter box | in (from below) | `terminal` | `none` |

**Single port.** Feeder enters from below into the starter box bottom. No output port — fire pump is a terminal load.

### Data Fields (right of symbol)

Since Mayo's gen/fire-pump A-8 conversion this stack is a **device-bound A-8 equipment-label block**
(§A-8): same fields, A-8 styling grammar (line 1 bold, later lines regular, steps 20/18/18),
exported in `geometry.equipment_labels` with `bound_to_type:"device"` / `align:"start"`. The
fla/lra pair shares one line because the A-8 family has exactly three Line slots after the label.

| Field | Style | Example |
|-------|-------|---------|
| Label Panel Name | 12px Bold (700), underlined (`text-decoration`) | `FP-B-A` |
| Line 1 | 12px Bold (700) | `100HP` |
| Line 2 | 12px regular | `124 FLA / 725 LRA` |
| Line 3 | 12px regular | `480V/3PH` |

No separator `<line>` between name and data lines.

### Calculation Fields

Fields used by fault current analysis engines. Not rendered on the drawing — EXCEPT `fla` and
`locked_rotor_current`, which combine onto the A-8 block's Line 2
(`124 FLA / 725 LRA`, see Data Fields above).

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `hp` | number | HP | user | `100` | Motor nameplate horsepower |
| `fla` | number | A | user | `124` | Full load amps per NEC 430.248. Reference: `nec_motor_fla.json` → `motors[hp].induction_fla[voltage]` for design verification |
| `locked_rotor_current` | number | A | user | `725` | Locked rotor current. Used for starter sizing and voltage drop during starting |
| `voltage` | number | V | user | `480` | Rated voltage |
| `phases` | number | — | user | `3` | Number of phases |
| `subtransient_reactance` | number | %X"d | lookup | `17` | Motor subtransient reactance. Determines motor contribution to fault current. Typical: 15–20% for large induction motors. From manufacturer data or NEMA MG 1 — not currently in the normalized JSON data layer |
| `motor_fault_contribution` | number | kA (sym) | calculated | `4.3` | Motor contribution to fault current at motor terminals: `fla × (100 / X"d%)`. Approximately 4–6× FLA for the first few cycles |
| `controller_type` | enum | — | user | `across-the-line` | `across-the-line`, `reduced-voltage`, `soft-start`, `VFD`. Fire pumps typically use across-the-line per NFPA 20 |
| `available_fc` | number | kA (sym) | calculated | `28.3` | Available fault current at fire pump controller. From upstream feeder `available_fc_load` |

**Relevant standards:** NEC 695 (fire pumps), NFPA 20 (fire pump installations), NEC 430.248 (motor FLA tables), IEEE 3002.3 (motor fault contribution methodology).

### Reference SVG

```svg
<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
  <line x1="95" y1="59" x2="107" y2="73"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="142" y1="82" x2="152" y2="94"
        stroke="#00FFFF" stroke-width="3"/>
  <circle cx="123.5" cy="76" r="19"
          fill="#0a0e17" stroke="#00FFFF" stroke-width="3"/>
  <text x="123.5" y="81" text-anchor="middle"
        font-family="monospace" font-size="19" font-weight="700"
        fill="#FFFFFF">F</text>
  <rect x="100" y="95" width="47" height="47"
        fill="none" stroke="#00FFFF" stroke-width="3"/>
  <line x1="100" y1="95" x2="147" y2="142"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="147" y1="95" x2="100" y2="142"
        stroke="#00FFFF" stroke-width="3"/>
  <text x="168" y="73" font-family="monospace" font-size="12"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">FP-B-A</text>
  <text x="168" y="93" font-family="monospace" font-size="12"
        font-weight="700" fill="#FFFFFF">100HP</text>
  <text x="168" y="111" font-family="monospace" font-size="12"
        fill="#FFFFFF">124 FLA / 725 LRA</text>
  <text x="168" y="129" font-family="monospace" font-size="12"
        fill="#FFFFFF">480V/3PH</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Line/slash drawn THROUGH the circle | Arms are behind the circle. Circle has opaque fill to occlude. Only the "F" annotation appears inside the circle. |
| 2 | Both arms angling same direction | Arms are OPPOSING — left arm angles toward circle, right arm angles away. |
| 3 | Gap between motor circle and starter box | Circle bottom edge flush with box top edge (shared boundary). |
| 4 | "FPC" or other text inside the starter box | X cross inside the box. No text inside the starter box. "F" label goes inside the motor circle only. |
| 5 | Starter box rectangular | Must be square (1:1). |
| 6 | Arms as tangent lines or horizontal bar | Two separate short diagonal slashes at opposing quadrants of the circle. |
| 7 | Feeder stub on top of circle | No stub — feeder connects directly to `load_in` port at starter box bottom during composition. |
| 8 | Controller type in data fields | Only designation, HP, and voltage. Controller type goes in equipment schedule. |
| 9 | Starter box S=56 or same size as panelboard | Starter box is ⅓ panelboard side length (S=47 vs S=140). Motor r=19 scales proportionally. |

---

## L3-2. Motor

Circle with opaque background fill and two opposing diagonal arm slashes emerging from behind the circle at opposing quadrants. Arms are occluded by the circle — no linework visible inside. Text fields to the right. Standalone motor symbol extracted from the fire pump compound (L3-1) for reuse across motor-driven loads (HVAC, MCC feeders, elevator machines, etc.).

**Proportion Rule:** Motor circle radius scales proportionally from the fire pump motor. Default r=19 maintains the ~78% width ratio relative to the ⅓-panelboard starter box (S=47). When composed with a starter box, circle bottom edge is flush with box top edge.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Center of motor circle, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `r` | 19 | Motor circle radius |
| `arm_length` | 25 | Motor arm slash length (approximate diagonal) |
| `arm_angle` | ~40° | Arm angle from horizontal (opposing quadrants) |
| `text_gap` | 18 | Gap from circle right extent to text block |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Motor circle | `(0, 0)`, r=19 | Centered on anchor |
| "M" label | `(0, 5)` | Centered in circle, `text-anchor="middle"`, 19px Bold (700) |
| Left arm | `(−26, −27)` to `(−6, −3)` | Upper-left quadrant, angles down-right toward circle — inner end ~3px inside circle perimeter for clean occlusion |
| Right arm | `(8, 6)` to `(25, 26)` | Lower-right quadrant, angles down-right away from circle — inner end ~3px inside circle perimeter |

**Key Relationships:** Arms are drawn BEFORE the circle in SVG draw order — circle has opaque fill matching background to occlude arm inner ends. Arms are in OPPOSING directions: left arm at ~10 o'clock, right arm at ~4 o'clock, creating the appearance of a line passing behind the circle. The centered "M" annotation is the only element inside the circle — no data field text or linework inside. Circle is always round (1:1, `<circle>` not `<ellipse>`).

### Motor Arm Convention

The two arms represent the motor shaft indication. They emerge from behind the circle at opposing quadrants:

| Arm | Outer end | Inner end (hidden by circle) | Angle |
|-----|-----------|------------------------------|-------|
| Left arm | Upper-left of circle | Enters circle at ~10 o'clock | Down-right (toward center) |
| Right arm | Lower-right of circle | Exits circle at ~4 o'clock | Down-right (away from center) |

Both arms use the same slope but are offset to opposite sides of the circle, creating the appearance of a continuous line passing behind the circle. The arms are NOT tangent lines or horizontal bars — they are short diagonal slashes.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Motor circle outline | 3.0 pt |
| Motor circle fill | Opaque (matches background `#0a0e17` — occludes arms) |
| Motor arms (both) | 3.0 pt |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `load_in` | `(0, 19)` — bottom center of circle | in (from below) | `terminal` | `none` |
| `flex_top` | `(0, −19)` — top center of circle | in or out | `terminal` | `none` |

**Default entry is `load_in` at bottom** — power enters from below into a terminal load. `flex_top` is the alternate routing port; the compositor assigns direction based on the SLD layout. Both ports are `terminal` mode — motor is always a load endpoint with no output.

No stubs — feeder lines drawn during composition. When composed with a starter box (e.g., fire pump), the `load_in` port aligns with the starter box top edge.

### Data Fields (right of symbol)

| Field | Style | Example |
|-------|-------|---------|
| Label Equipment Name | 12px Bold (700), underlined (`text-decoration`) | `AHU-2-A` |
| Line 1 | 12px Bold (600) | `50HP, 65 FLA` |
| Line 2 | 12px Bold (600) | `480V/3PH` |

No separator `<line>` between name and data lines. Label follows the project equipment designation convention (see Naming Legend).

### Calculation Fields

Fields used by fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `hp` | number | HP | user | `50` | Motor nameplate horsepower |
| `fla` | number | A | user | `65` | Full load amps per NEC 430.248/250. Reference: `nec_motor_fla.json` → `motors[hp].induction_fla[voltage]` for design verification |
| `locked_rotor_current` | number | A | user | `363` | Locked rotor current. Affects voltage drop during starting and starter/protection sizing |
| `voltage` | number | V | user | `480` | Rated voltage |
| `phases` | number | — | user | `3` | Number of phases |
| `subtransient_reactance` | number | %X"d | lookup | `17` | Motor subtransient reactance. Typical: 15–20% for standard induction motors. From manufacturer data or NEMA MG 1 — not currently in the normalized JSON data layer |
| `motor_fault_contribution` | number | kA (sym) | calculated | `2.2` | Motor contribution to fault current at terminals: approximately `fla × (100 / X"d%)` |
| `efficiency` | number | % | user | `93.6` | Motor nameplate efficiency. For load calculations |
| `power_factor` | number | — | user | `0.87` | Motor nameplate power factor at full load |
| `controller_type` | enum | — | user | `VFD` | `across-the-line`, `reduced-voltage`, `soft-start`, `VFD`. Affects starting current and voltage drop |
| `available_fc` | number | kA (sym) | calculated | `18.7` | Available fault current at motor terminals. From upstream feeder `available_fc_load` |

**Relevant standards:** NEC 430 (motors and controllers), NEC 430.248/250 (FLA tables), IEEE 3002.3 (motor fault contribution), NEMA MG 1 (motor standards).

### Reference SVG

```svg
<svg viewBox="0 0 220 80" xmlns="http://www.w3.org/2000/svg">
  <line x1="79" y1="13" x2="99" y2="37"
        stroke="#00FFFF" stroke-width="2.5"/>
  <line x1="113" y1="46" x2="130" y2="66"
        stroke="#00FFFF" stroke-width="2.5"/>
  <circle cx="105" cy="40" r="19"
          fill="#0a0e17" stroke="#00FFFF" stroke-width="2.5"/>
  <text x="105" y="45" text-anchor="middle"
        font-family="monospace" font-size="19" font-weight="700"
        fill="#FFFFFF">M</text>
  <text x="142" y="33" font-family="monospace" font-size="12"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">AHU-2-A</text>
  <text x="142" y="49" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">50HP, 65 FLA</text>
  <text x="142" y="63" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">480V/3PH</text>
</svg>
```

### Composition Notes

When used as part of a compound symbol (e.g., fire pump per L3-1):

- Motor `load_in` port `(0, 19)` aligns with the starter box top edge at `(box_cx, 0)`.
- The motor circle bottom edge is flush with the starter box top edge (shared boundary).
- The starter box provides the feeder entry port; the motor symbol itself does not receive a feeder line when composed.
- Arm geometry and occlusion behavior are identical whether standalone or composed.

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Line/slash drawn THROUGH the circle | Arms are behind the circle. Circle has opaque fill to occlude. Only the "M" annotation appears inside. |
| 2 | Both arms angling same direction | Arms are OPPOSING — left arm angles toward circle, right arm angles away. |
| 3 | Arms as tangent lines or horizontal bar | Two separate short diagonal slashes at opposing quadrants of the circle. |
| 4 | Data field text inside the circle | Only the centered "M" annotation goes inside. Label, HP/FLA, and voltage are data fields — always to the right. |
| 5 | Circle as `<ellipse>` or non-square aspect | Always a true `<circle>` with equal r. Never distort. |
| 6 | Feeder stub drawn as part of symbol | No stubs — feeder connects directly to `load_in` or `flex_top` during composition. |
| 7 | Transparent or no fill on circle | Circle MUST have opaque fill matching background to occlude arms. Without it, arm inner ends are visible. |
| 8 | Motor same size as panelboard | Motor r=19 yields a diameter of 38 — smaller than the ⅓-panelboard box (S=47). It is a sub-component, not a primary device. |
| 9 | Controller/starter details in data fields | Only designation, HP/FLA, and voltage. Controller type goes in equipment schedule, starter box is a separate composition element. |


---

## L3-3. Equipment Connection

Circle with inscribed inverted triangle (delta symbol) representing a generic delta-connected terminal load or equipment connection point on the SLD. Feeder enters from above. Text fields to the right. Used for mechanical equipment, kitchen equipment, and other non-motor terminal loads where a specific L3 symbol (fire pump, motor) does not apply.

**Proportion Rule:** Circle circumradius is 27px (diameter 54), placing it in the same visual neighborhood as the LV Transformer T-box (S=47) and larger than the Motor circle (r=19). The inscribed triangle vertices sit at approximately 78% of the circle radius, creating a visible gap between triangle edges and circle perimeter.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Center of circle, `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `r` | 27 | Circle radius (circumradius) |
| `tri_inset` | 0.78 | Triangle vertex inset ratio from circle radius |
| `text_gap` | 13 | Gap from circle right extent to text block |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Circle | `(0, 0)`, r=27 | Main body |
| Triangle vertex — top-left | `(−21, −13)` | Flat top edge, left end |
| Triangle vertex — top-right | `(21, −13)` | Flat top edge, right end |
| Triangle vertex — bottom | `(0, 24)` | Inverted apex, point down |

**Key Relationships:** Triangle is INSCRIBED — flat top edge near the top of the circle, point near the bottom. Triangle is always inverted (point down). Circle is always round (`<circle>` not `<ellipse>`). No text or label inside the circle or triangle — all data fields are external to the right. The visible gap between triangle edges and circle perimeter is intentional and must be maintained.

### Stroke Weights

| Element | Weight |
|---------|--------|
| Circle outline | 3.0 pt |
| Triangle outline | 3.0 pt |
| Circle fill | None (transparent) |
| Triangle fill | None (transparent) |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `load_in` | `(0, 27)` — bottom center of circle | in (from below) | `terminal` | `none` |

**Single port.** Feeder enters from below into the circle bottom. No output port — equipment connection is a terminal load. This matches Fire Pump (L3-1) and Motor (L3-2) which also receive feeders from below.

### Data Fields (right of symbol)

| Field | Style | Example |
|-------|-------|---------|
| Label Equipment Name | 12px Bold (700), underlined (`text-decoration`) | `RTU-1-A` |
| Line 1 | 12px Bold (600) | `15KW` |
| Line 2 | 12px Bold (600) | `480V/3PH` |

No separator `<line>` between name and data lines. Label follows the project equipment designation convention (see Naming Legend). Power rating uses **KW** (not HP) for non-motor loads.

### Calculation Fields

Fields used by voltage drop and fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `rated_kw` | number | kW | user | `15` | Equipment nameplate power rating. Used by the default sizing path in the Equipment Connection Feeder contract (`sld_topology_rules.md` §3) |
| `voltage` | number | V | user | `480` | Rated voltage (line-to-line) |
| `phases` | number | — | user | `3` | Number of phases |
| `power_factor` | number | — | user | `0.90` | Load power factor. Default 0.90. Override per equipment when specific PF is known |
| `mca` | number | A | user | `18.5` | Minimum Circuit Ampacity from equipment nameplate. Optional — when populated, overrides kW-derived conductor sizing per `sld_topology_rules.md` §3 override path |
| `mocp` | number | A | user | `25` | Maximum Overcurrent Protection from equipment nameplate. Optional — when populated, overrides kW-derived breaker rating per `sld_topology_rules.md` §3 override path. Must be a valid rating per `nec_standard_ratings.json` → `fuse_cb_ampere_ratings.standard_ratings_a` |
| `available_fc` | number | kA (sym) | calculated | `18.7` | Available fault current at equipment terminals. From upstream feeder `available_fc_load` |

**Dual-path sizing workflow:** The default path calculates breaker and conductor sizing from `rated_kw` + `voltage` + `phases` + `power_factor` using the formula in `sld_topology_rules.md` §3 Equipment Connection Feeder contract. When `mca` and `mocp` are populated (typically from equipment submittals during CD phase), they override the kW-derived values. See `sld_topology_rules.md` §3 for the complete sizing algorithm and path selection logic.

**Relevant standards:** NEC 210.20(A) / 215.3 (continuous load 125%), UL equipment listing (MCA/MOCP markings), NEC 110.9 (interrupting rating).

### Reference SVG

```svg
<svg viewBox="-26 -67 310 220" xmlns="http://www.w3.org/2000/svg">
  <circle cx="83.5" cy="43" r="27"
          fill="none" stroke="#00FFFF" stroke-width="3"/>
  <polygon points="62.5,30 104.5,30 83.5,67"
           fill="none" stroke="#00FFFF" stroke-width="3" stroke-linejoin="miter"/>
  <text x="124" y="33" font-family="monospace" font-size="12"
        font-weight="700" text-decoration="underline"
        fill="#FFFFFF">RTU-1-A</text>
  <text x="124" y="49" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">15KW</text>
  <text x="124" y="65" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">480V/3PH</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Triangle pointing UP (standard delta) | Triangle is INVERTED — flat top, point down. |
| 2 | Triangle vertices tangent to circle | Vertices at ~78% of circle radius. Visible gap between triangle edges and circle perimeter. |
| 3 | Text inside circle or triangle | All data fields are external, to the right. Nothing inside the symbol. |
| 4 | Circle as `<ellipse>` or non-square aspect | Always a true `<circle>` with equal r. Never distort. |
| 5 | HP for power rating | Use KW for equipment connection loads. HP is reserved for motor-driven loads (L3-1, L3-2). |
| 6 | Feeder entering from top | Feeder enters from BOTTOM (`load_in` at circle bottom). This matches Fire Pump and Motor which also receive from below. |
| 7 | Feeder stub drawn as part of symbol | No stubs — feeder connects directly to `load_in` port during composition. |
| 8 | Fill on circle or triangle | Both are stroke-only, no fill. Unlike the Motor (L3-2) which requires opaque fill for arm occlusion, the Equipment Connection has no elements to occlude. |


---

# R — Routing Elements (Class B)

Symbols R-1 through R-3 use the Class B template. Unlike Class A placed devices, these elements have variable geometry determined at composition time. See [Symbol Classification](#symbol-classification) for the template definition and key differences.

---

## R-1. Feeder

Single solid line representing a conductor run between two device ports. The fundamental routing element of the SLD — every power connection between Class A devices passes through a Feeder instance. Carries conductor specification, conduit data, distance, and computed electrical properties (voltage drop, available fault current at load end).

**Visual Treatment:** Single solid line — black (`#000000`) for print / light theme, light gray (`#CCCCCC`) for dark theme. Visually the lightest of the three Class B elements — lighter stroke weight than a Bus (R-2), no fill pattern (distinguishes from Busway R-3).

### Segment Rules

| Rule | Value | Notes |
|------|-------|-------|
| Routing directions | Horizontal and vertical only | No diagonals. 90° bends at all direction changes. |
| Bend type | Sharp 90° corner | No radius, no chamfer. Vertex at the exact bend point. |
| Minimum segment length | 20 px | No segment shorter than 20px between bends or between a bend and an endpoint. |
| Routing priority | Vertical preferred | When start and end ports are offset both horizontally and vertically, the first segment exits the source port vertically, then bends horizontally to align, then continues vertically to the target. |
| Crossing behavior | No crossing indicator by default | When a feeder crosses another feeder or bus, lines simply overlap. The Conduit/Wire Callout (A-2) D-loop is the optional visual indicator at crossings. |
| Maximum bends per run | 4 | Practical limit for readability. Runs requiring >4 bends should be broken with a Continuation Squiggle (A-3). |

**Path construction:** A Feeder instance stores its path as an ordered list of vertices: `[start_port, vertex_1, vertex_2, ..., end_port]`. Each adjacent pair of vertices defines a horizontal or vertical segment. The renderer draws a single continuous `<polyline>` or sequence of `<line>` elements.

### Stroke & Visual Treatment

| Property | Value |
|----------|-------|
| Stroke color | `#000000` (black) for print / light theme; `#CCCCCC` (light gray) for dark theme |
| Stroke weight | 1.5 pt |
| Stroke style | Solid (no dasharray) |
| Stroke linecap | `butt` |
| Stroke linejoin | `miter` |
| Fill | None |

**Weight hierarchy:** Feeder (1.5 pt) < Bus (3.0 pt) < Busway (3.0 pt outer + fill). The feeder is the lightest line on the SLD and the only routing element that uses black/gray instead of cyan — this color distinction reinforces the visual separation between conductor runs and bus/equipment linework.

### Endpoint Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `start` | First vertex of the path | Matches connected device port direction | `inline` | `none` |
| `end` | Last vertex of the path | Matches connected device port direction | `inline` | `none` |

**Port binding:** Each endpoint connects to a Class A device port. The feeder's `start` port inherits direction and position from the source device's port. The feeder's `end` port inherits from the target device's port. A feeder cannot connect to another feeder — use a junction device or continuation squiggle.

### Intermediate Ports

None. Feeders have no intermediate connection points. Annotation elements (A-1 Feeder Tag, A-2 Conduit/Wire Callout) attach via their `anchor` connection mode to the feeder path geometry, not to a named port. See A-1 and A-2 for attachment behavior.

### Data Fields

| Field | Style | Position | Notes |
|-------|-------|----------|-------|
| Feeder Tag (A-1) | Per A-1 spec | Attached to path via `anno_attach` | Encoded ampacity + wire count. One per feeder run. |
| Conduit/Wire Callout (A-2) | Per A-2 spec | Attached to path via `anno_attach` | Full conduit/conductor spec string. One per feeder run, or multiple if conduit changes at a pull point. |

The feeder itself renders no text. All visible annotation comes from attached A-1 and A-2 instances.

### Calculation Fields

Fields used by voltage drop and fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `designation` | string | — | user | `F-42` | Unique feeder identifier for the project |
| `conductor_material` | enum | — | schedule | `AL` | `CU` or `AL`. Schedule source: `feeder_schedule.json` → `feeders[].phase_conductors.material` |
| `conductor_size` | string | AWG/kcmil | schedule | `350` | Per phase conductor size. Schedule source: `feeder_schedule.json` → `feeders[].phase_conductors.size` |
| `conductors_per_phase` | number | — | schedule | `3` | Number of conductors per phase (parallel sets × conductors per set). Schedule source: `feeder_schedule.json` → `feeders[].phase_conductors.quantity × feeders[].number_of_sets` |
| `neutral_size` | string | AWG/kcmil | schedule | `350` | Neutral conductor size. Same as phase for 4-wire; absent for 3-wire. Schedule source: same as `conductor_size` for 4-wire configs |
| `ground_size` | string | AWG/kcmil | schedule | `4` | Equipment grounding conductor size per NEC 250.122. Schedule source: `feeder_schedule.json` → `feeders[].ground_conductor.size`. For transformer secondaries: `3_phase_transformer_feeder_schedule.json` → `transformers[].bonding_jumper` |
| `conduit_type` | enum | — | schedule | `EMT` | `EMT`, `RMC`, `PVC`, `AL`. Affects reactance (X) values — steel conduit has higher reactance than non-magnetic |
| `conduit_size` | string | inches | schedule | `3"` | Trade size. Schedule source: `feeder_schedule.json` → `feeders[].conduit_size_min`. Must meet NEC Chapter 9 Table 1 fill requirements |
| `num_sets` | number | — | schedule | `2` | Number of parallel conduit/conductor sets. Schedule source: `feeder_schedule.json` → `feeders[].number_of_sets` |
| `distance` | number | ft | user | `150` | One-way circuit length from source to load (not total conductor length) |
| `load_current` | number | A | calculated | `180` | Design load current at the downstream device |
| `power_factor` | number | — | user | `0.90` | Load power factor. Default 0.90 for all feeders. Override per feeder when specific load PF is known |
| `r_per_1000ft` | number | Ω/1000ft | lookup | `0.0578` | Conductor AC resistance per 1000 ft. Lookup from `nec_table9_ac_resistance___reactance.json` → `conductors[size].ac_resistance_[material].[conduit_type].ohm_per_kft` |
| `x_per_1000ft` | number | Ω/1000ft | lookup | `0.0379` | Conductor reactance per 1000 ft. Lookup from `nec_table9_ac_resistance___reactance.json` → `conductors[size].reactance_xl.[conduit_type].ohm_per_kft` |
| `voltage_drop_pct` | number | % | calculated | `1.8` | Calculated voltage drop as percentage of source voltage. Formula: `VD = (√3 × I × L × (R×PF + X×sin(acos(PF)))) / (1000 × num_sets)`, then `VD% = VD / V_source × 100` |
| `voltage_at_load` | number | V | calculated | `471.4` | Voltage at the load end: `V_source × (1 − voltage_drop_pct/100)` |
| `available_fc_load` | number | kA (sym) | calculated | `28.3` | Available fault current at load end. Reduced from source by feeder impedance |
| `temperature_rating` | enum | °C | schedule | `75` | Conductor insulation temperature rating: `60`, `75`, `90`. Determines ampacity column per NEC 310.15(B)(16) and resistance values |

**Two-pass workflow:** The AI generates a feeder distance input template (spreadsheet) pre-populated with all schedule-derived fields from the SLD composition (`designation`, `from`/`to` devices, `conductor_spec`, `material`, `sets`, `conduit_type`, `conduit_size`, `ampacity`). The `distance`, `power_factor`, and `notes` columns are left as user-input fields. The engineer fills in field-measured distances, adjusts PF where needed, and feeds the completed template back to the AI to run voltage drop and fault current calculations. This keeps the AI out of building-geometry guesswork and creates an auditable record of engineering inputs.

**Calculation dependency chain:** `conductor_size` + `conductor_material` + `conduit_type` → `r_per_1000ft`, `x_per_1000ft` (from lookup). Then `distance` + `load_current` + `power_factor` + `r_per_1000ft` + `x_per_1000ft` + `num_sets` → `voltage_drop_pct` → `voltage_at_load`. For fault: source `available_fc` (from upstream device) + feeder impedance + `distance` → `available_fc_load`.

**Relevant standards:** NEC Chapter 9 Table 9 (conductor impedance), NEC 210.19(A) Informational Note No. 4 and NEC 215.2(A) Informational Note No. 2 (voltage drop recommendations: 3% branch, 5% total), NEC 310.15(B)(16) (ampacity tables), IEEE 141 Ch. 4 (fault calculation through cables).

### Reference SVG — Horizontal Segment

```svg
<svg viewBox="0 0 300 40" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="20" x2="280" y2="20"
        stroke="#000000" stroke-width="1.5"/>
</svg>
```

### Reference SVG — Vertical Segment

```svg
<svg viewBox="0 0 40 300" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="20" x2="20" y2="280"
        stroke="#000000" stroke-width="1.5"/>
</svg>
```

### Reference SVG — Segment with 90° Bend

```svg
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <polyline points="20,20 20,120 180,120"
            fill="none" stroke="#000000" stroke-width="1.5"
            stroke-linejoin="miter"/>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Diagonal routing | Horizontal and vertical segments only. 90° bends at all direction changes. |
| 2 | Rounded or chamfered bends | Sharp 90° corners. No `stroke-linejoin="round"`. |
| 3 | Feeder stroke weight same as bus (3.0 pt) | Feeder is 1.5 pt. Bus is 3.0 pt. Weight hierarchy is the primary visual differentiator. |
| 4 | Feeder with fill or hatching | Single solid line, no fill. Fill/hatching = Busway (R-3). |
| 5 | Text rendered directly on the feeder | Feeder has no intrinsic text. All annotation comes from attached A-1 and A-2 instances. |
| 6 | Feeder connecting to another feeder | Feeders connect device port to device port. Use a junction device or Continuation Squiggle (A-3) to chain runs. |
| 7 | Segments shorter than 20 px | Minimum segment length is 20 px for readability. |
| 8 | Dashed feeder line | Always solid. Dashed lines on the SLD indicate clearance zones (L0-1) or section boundaries (L1-2). |

---

## R-2. Bus

Single heavy solid line representing an internal bus bar within switchboard or distribution equipment. Carries current distribution from a main device (breaker, switch) to branch devices (breakers, feeders). Hosted inside Switchboard Section (L1-2) enclosures — the section provides vertical positioning via `bus_y_offset`, the bus defines its own geometry, ports, and electrical properties.

**Visual Treatment:** Single solid cyan line (`#00FFFF`), heavier stroke weight than a Feeder (R-1). No fill pattern (distinguishes from Busway R-3). Visually, the bus is the heaviest single-line element on the SLD.

### Segment Rules

| Rule | Value | Notes |
|------|-------|-------|
| Routing direction | Horizontal only (within a single section) | Bus bars run left-to-right inside switchboard sections. Vertical bus runs are not standard — use a feeder for vertical distribution. |
| Splice behavior | End-to-end via `bus_splice` ports | When a bus spans multiple adjacent switchboard sections, the left section's `bus_splice_right` aligns with the right section's `bus_splice_left` at the shared boundary. No gap. |
| Length | Determined by host section width | Default: `bus_half_w × 2 = 96 px` centered in a 192 px section. Actual length may vary with section width. |

**Path construction:** A Bus instance within a single section is a simple horizontal `<line>`. Multi-section bus runs are composed by splicing individual section buses end-to-end. The renderer draws each section's bus as a separate `<line>` element — visual continuity comes from aligned endpoints at shared section boundaries.

### Stroke & Visual Treatment

| Property | Value |
|----------|-------|
| Stroke color | `#00FFFF` (cyan — standard SLD linework) |
| Stroke weight | 3.0 pt |
| Stroke style | Solid (no dasharray) |
| Stroke linecap | `butt` |
| Fill | None |

**Weight hierarchy:** Feeder (1.5 pt) < **Bus (3.0 pt)** < Busway (3.0 pt outer + fill). Bus is heavier than feeder, same outer stroke as busway but distinguished by the absence of fill/hatching.

**Instance-level override:** When the topology contract provides a `stroke_weight` field on an R-2 instance (`sld_topology_schema_V1_0_0.md` §6), the renderer uses that value instead of the 3.0 pt default. The compositor sets `stroke_weight: 2.5` on main buses and `stroke_weight: 2.0` on secondary buses per `sld_topology_rules_V1_0_0.md` Composition-Derived Dimensions (`main_bus_stroke`, `secondary_bus_stroke`).

### Endpoint Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `bus_splice_left` | Left end of bus line | left | `bus_splice` | `none` |
| `bus_splice_right` | Right end of bus line | right | `bus_splice` | `none` |

**Splice ports** connect only to other `bus_splice` ports on adjacent section buses. They provide horizontal continuity across a multi-section lineup.

### Intermediate Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `bus_tap_bi` | Center of bus line (default) or at breaker centerline | in/out (vertical) | `bus_tap` | `bus_dot` |

**Parametric tap generation:** In a distribution section with multiple breakers, each breaker's `bus_out` port aligns vertically with a tap point on the bus. Tap positions are determined by breaker placement during composition — they are not pre-defined at fixed intervals. Each tap is marked with a `bus_dot` (filled circle r=5, pink `#FF69B4`).

**Single-device sections** (incoming, metering, main breaker): One `bus_tap_bi` at bus center, marked with `bus_dot`. The **incoming** section's dot is exported (`geometry.bus_dots`, for the normal incoming, for the emergency incoming / schema §14.10) and placed in Revit via `_E_SLD_Conductor-ends E01 / _Connection Dot`.

**Multi-device sections** (distribution, NEC 700/701/702): One `bus_tap_bi` per breaker, positioned at each breaker's horizontal centerline. Tap spacing is determined by breaker layout, not by bus geometry.

### Geometry Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `bus_half_w` | 48 | Bus half-width within a section (total length = `bus_half_w × 2`) |
| `r_dot` | 5 | Connection dot (bus_dot) radius |
| `dot_color` | `#FF69B4` | Pink fill for bus_dot markers |

These variables were previously defined in L1-2. They now live here as the single source of truth.

### Data Fields

The bus itself renders no text. The host Switchboard Section (L1-2) renders the assembly-level designation, ampacity, voltage, and phase configuration in its own Data Fields section.

### Calculation Fields

Fields used by fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `bus_rating` | number | A | user | `3000` | Continuous current rating of the bus bar |
| `bus_material` | enum | — | user | `CU` | `CU` or `AL`. Affects resistance |
| `bus_bracing` | number | kA (sym) | user | `65` | Short-circuit withstand rating (bus bracing). Must meet or exceed available fault current per NEC 110.10 |
| `available_fc` | number | kA (sym) | calculated | `42.5` | Available fault current at the bus. Equal to upstream device's load-side fault current (e.g., from L0-1 `available_fc_secondary` or reduced through upstream feeder impedance) |
| `impedance_per_ft` | number | Ω/ft | lookup | `0.0000215` | Bus bar impedance per unit length. From manufacturer data or IEEE 141 Table 4-7. Not currently in the normalized JSON data layer — manual input or future data file |
| `bus_length` | number | ft | user | `8` | Physical bus length (for impedance contribution in fault calcs — typically small relative to feeder impedance) |

**Calculation dependency chain:** `available_fc` comes from the upstream source (transformer secondary or feeder load-end). Bus impedance contribution is usually negligible for fault calcs in low-voltage switchboards but can be included for accuracy: `Z_bus = impedance_per_ft × bus_length`. `bus_bracing` is checked against `available_fc` — if bracing < available FC, the design fails NEC 110.10.

**Relevant standards:** NEC 110.10 (short-circuit current rating), IEEE 141 Ch. 4 (bus impedance data), UL 891 (switchboard construction and ratings).

### Reference SVG — Horizontal Bus (single section)

```svg
<svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="20" x2="180" y2="20"
        stroke="#00FFFF" stroke-width="3"/>
  <circle cx="100" cy="20" r="5" fill="#FF69B4"/>
</svg>
```

### Reference SVG — Multi-Section Bus Splice

```svg
<svg viewBox="0 0 400 40" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="20" x2="196" y2="20"
        stroke="#00FFFF" stroke-width="3"/>
  <circle cx="100" cy="20" r="5" fill="#FF69B4"/>
  <line x1="204" y1="20" x2="380" y2="20"
        stroke="#00FFFF" stroke-width="3"/>
  <circle cx="300" cy="20" r="5" fill="#FF69B4"/>
  <line x1="196" y1="10" x2="196" y2="30"
        stroke="#39FF14" stroke-width="0.8" stroke-dasharray="4,3"/>
  <line x1="204" y1="10" x2="204" y2="30"
        stroke="#39FF14" stroke-width="0.8" stroke-dasharray="4,3"/>
</svg>
```

### Reference SVG — Bus with Multiple Taps

```svg
<svg viewBox="0 0 300 40" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="20" x2="280" y2="20"
        stroke="#00FFFF" stroke-width="3"/>
  <circle cx="80" cy="20" r="5" fill="#FF69B4"/>
  <circle cx="150" cy="20" r="5" fill="#FF69B4"/>
  <circle cx="220" cy="20" r="5" fill="#FF69B4"/>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Bus with 1.5 pt stroke (feeder weight) | Bus is always 3.0 pt. Stroke weight is the primary differentiator from feeder. |
| 2 | Vertical bus run | Buses are horizontal within sections. Use a feeder for vertical distribution. |
| 3 | Bus extending beyond section boundary | Bus length is contained within its host section. Continuity across sections is via splice ports at shared boundaries. |
| 4 | Tap dots with cyan fill | Tap dots are always pink (`#FF69B4`) filled circles. Cyan = bus/device linework, pink = connection nodes. (Feeders use black/gray, not cyan.) |
| 5 | Bus with hatching or fill pattern | Single solid line. Hatching = Busway (R-3). |
| 6 | Gap at splice between adjacent sections | Splice ports align at shared boundary — no visible gap. The bus appears continuous across the lineup. |
| 7 | Fixed tap spacing | Tap positions are determined by breaker/device placement, not by fixed intervals on the bus. |
| 8 | Bus defining its own text/labels | Bus renders no text. The host L1-2 section carries assembly-level labels. |
| 9 | Bus bar properties defined in L1-2 | Bus geometry, ports, stroke weight, and calculation fields are defined here (R-2). L1-2 only provides `bus_y_offset` for vertical positioning. |

---

## R-3. Busway

Double parallel lines with diagonal hatching between them, representing a plug-in bus duct distribution system. Busway carries power over longer horizontal or vertical runs with periodic tap-off points for connecting downstream equipment. Unlike a Bus (R-2) which lives inside switchboard enclosures, a Busway is a standalone routed element on the SLD.

**Visual Treatment:** Two parallel cyan lines (`#00FFFF`) with white/light diagonal hatch stripes between them at ~45°. This is the heaviest visual element of the three Class B types — the dual-line-plus-fill treatment is unmistakable. Matches the reference image convention: parallel outer strokes with internal hatching.

### Segment Rules

| Rule | Value | Notes |
|------|-------|-------|
| Routing directions | Horizontal and vertical | Same routing constraint as feeders — 90° bends only. |
| Bend type | Sharp 90° corner | Both outer lines and hatching pattern turn together at bends. |
| Minimum segment length | 40 px | Longer minimum than feeder (20 px) — the hatching pattern needs room to read clearly. |
| Routing priority | Horizontal preferred | Busways typically run horizontally as overhead distribution; vertical risers are secondary. |
| Maximum bends per run | 3 | Busway runs are typically straight or have minimal direction changes. Physical bus duct elbows are expensive and bulky. |

**Path construction:** A Busway instance stores its path as an ordered vertex list like a Feeder (R-1). The renderer constructs two parallel `<line>` or `<polyline>` elements offset by `duct_width / 2` on each side of the centerline, then fills the space between with a diagonal hatch pattern.

### Stroke & Visual Treatment

| Property | Value |
|----------|-------|
| Outer line stroke color | `#00FFFF` (cyan) |
| Outer line stroke weight | 3.0 pt (each line) |
| Outer line style | Solid |
| Duct width | 16 px (center-to-center of the two parallel lines) |
| Hatch color | `#FFFFFF` (white — text/annotation color, NOT cyan) |
| Hatch stroke weight | 1.5 pt |
| Hatch angle | 45° (lower-left to upper-right) |
| Hatch spacing | 10 px (center-to-center between adjacent hatch lines) |
| Hatch clip | Clipped to the region between the two outer lines |

**Weight hierarchy:** Feeder (1.5 pt single) < Bus (3.0 pt single) < **Busway (3.0 pt × 2 + hatch fill)**. The busway is visually the most prominent routing element.

**Hatch implementation:** Use an SVG `<pattern>` element for the diagonal fill, clipped between the outer parallel lines. The pattern tile is a square with side = `hatch_spacing` containing a single diagonal line.

```svg
<defs>
  <pattern id="busway-hatch" width="10" height="10"
           patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="10"
          stroke="#FFFFFF" stroke-width="1.5"/>
  </pattern>
</defs>
```

### Endpoint Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `feed_start` | First vertex of centerline path | Matches connected device port direction | `inline` | `none` |
| `feed_end` | Last vertex of centerline path | Matches connected device port direction | `inline` | `none` |

**Port binding:** Busway endpoints connect to Class A device ports (typically a breaker `line_in` or disconnect `load_out` at the source end, and a tap-off device at the far end). The busway centerline aligns with the connected port position; the outer parallel lines are offset symmetrically.

### Intermediate Ports — Parametric Tap-Off Points

| Port template | Position | Direction | connection_mode | marker_style |
|---------------|----------|-----------|-----------------|--------------|
| `tap_[N]` | Along centerline at `tap_pitch × N` from `feed_start` | Perpendicular to busway run direction | `bus_tap` | `bus_dot` |

**Parametric definition:** Tap-off points are generated at regular intervals along the busway run. The number of taps is determined by the busway length and the `tap_pitch` variable. Each tap is named sequentially: `tap_01`, `tap_02`, etc.

| Variable | Default | Description |
|----------|---------|-------------|
| `tap_pitch` | 60 px | Center-to-center distance between adjacent tap-off points |
| `tap_offset_start` | 40 px | Distance from `feed_start` to first tap-off point |
| `tap_count` | — | Calculated: `floor((path_length − tap_offset_start) / tap_pitch) + 1` |

**Tap marker:** Each tap-off point is marked with a `bus_dot` (filled circle r=5, pink `#FF69B4`) on the busway centerline. A short perpendicular stub (length = `duct_width / 2 + 8`) extends from the centerline through the outer line to indicate the tap-off direction. The stub exits on the side where the downstream device is connected.

### Data Fields (right of busway, at midpoint)

| Field | Style | Example |
|-------|-------|---------|
| Label Designation | 12px Bold (700), underlined (`text-decoration`) | `BW-4-A` |
| Line 1 | 12px Bold (600) | `2000A` |
| Line 2 | 12px Bold (600) | `480V/3PH` |

Data fields are positioned at the midpoint of the busway run, offset to the right (for horizontal runs) or below (for vertical runs), following the same conventions as placed-device text fields.

### Calculation Fields

Fields used by voltage drop and fault current analysis engines. Not rendered on the drawing.

| Field | Type | Units | Source | Example | Notes |
|-------|------|-------|--------|---------|-------|
| `designation` | string | — | user | `BW-4-A` | Unique busway identifier per project naming convention |
| `ampacity` | number | A | user | `2000` | Continuous current rating per manufacturer |
| `voltage` | number | V | user | `480` | Rated voltage |
| `phases` | number | — | user | `3` | Number of phases |
| `wires` | number | — | user | `4` | Number of wires (3 or 4 — includes neutral if present) |
| `bus_material` | enum | — | user | `AL` | `CU` or `AL` |
| `r_per_100ft` | number | Ω/100ft | lookup | `0.00187` | Resistance per 100 ft. For fault current calculations, use C-value method: `c_values_lookup.json` → `busway[ampacity][busway_type][material]`. For voltage drop, use manufacturer data. Busway impedance is per 100 ft, not per 1000 ft like cable |
| `x_per_100ft` | number | Ω/100ft | lookup | `0.00056` | Reactance per 100 ft from manufacturer data. Not currently in the normalized JSON data layer — manual input or future data file |
| `total_length` | number | ft | user | `120` | Total busway run length (physical, not drawing scale) |
| `bracing` | number | kA (sym) | user | `65` | Short-circuit withstand rating |
| `available_fc_start` | number | kA (sym) | calculated | `42.5` | Available fault current at busway feed end (from upstream device) |
| `available_fc_end` | number | kA (sym) | calculated | `35.2` | Available fault current at busway far end (reduced by busway impedance) |
| `voltage_drop_pct` | number | % | calculated | `0.9` | Voltage drop at full busway length. Formula: `VD = (√3 × I × L × (R×PF + X×sin(acos(PF)))) / 100`, then `VD% = VD / V_rated × 100`. Note: R and X per 100 ft (not 1000 ft) |
| `tap_available_fc[N]` | number | kA (sym) | calculated | `38.1` | Available fault current at each tap-off point. Interpolated by position along the run |

**Calculation dependency chain:** `r_per_100ft` + `x_per_100ft` (from manufacturer lookup) + `total_length` + `load_current` + `power_factor` → `voltage_drop_pct`. For fault: `available_fc_start` − busway impedance contribution × distance to tap → `tap_available_fc[N]` for each tap, and `available_fc_end` for the full run.

**Relevant standards:** UL 857 (busway construction and ratings), NEC 368 (busways), IEEE 141 Ch. 4 (busway impedance data), NEMA BU 1.1 (busway testing standards).

### Reference SVG — Horizontal Busway Segment

```svg
<svg viewBox="0 0 300 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="bw-hatch-h" width="10" height="10"
             patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="10"
            stroke="#FFFFFF" stroke-width="1.5"/>
    </pattern>
  </defs>
  <rect x="20" y="22" width="260" height="16"
        fill="url(#bw-hatch-h)" stroke="none"/>
  <line x1="20" y1="22" x2="280" y2="22"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="20" y1="38" x2="280" y2="38"
        stroke="#00FFFF" stroke-width="3"/>
</svg>
```

### Reference SVG — Vertical Busway Segment

```svg
<svg viewBox="0 0 60 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="bw-hatch-v" width="10" height="10"
             patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="10"
            stroke="#FFFFFF" stroke-width="1.5"/>
    </pattern>
  </defs>
  <rect x="22" y="20" width="16" height="260"
        fill="url(#bw-hatch-v)" stroke="none"/>
  <line x1="22" y1="20" x2="22" y2="280"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="38" y1="20" x2="38" y2="280"
        stroke="#00FFFF" stroke-width="3"/>
</svg>
```

### Reference SVG — Busway with Tap-Off Points

```svg
<svg viewBox="0 0 360 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="bw-hatch-t" width="10" height="10"
             patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="10"
            stroke="#FFFFFF" stroke-width="1.5"/>
    </pattern>
  </defs>
  <rect x="20" y="32" width="320" height="16"
        fill="url(#bw-hatch-t)" stroke="none"/>
  <line x1="20" y1="32" x2="340" y2="32"
        stroke="#00FFFF" stroke-width="3"/>
  <line x1="20" y1="48" x2="340" y2="48"
        stroke="#00FFFF" stroke-width="3"/>
  <circle cx="80" cy="40" r="5" fill="#FF69B4"/>
  <line x1="80" y1="48" x2="80" y2="68"
        stroke="#00FFFF" stroke-width="1.5"/>
  <circle cx="180" cy="40" r="5" fill="#FF69B4"/>
  <line x1="180" y1="48" x2="180" y2="68"
        stroke="#00FFFF" stroke-width="1.5"/>
  <circle cx="280" cy="40" r="5" fill="#FF69B4"/>
  <line x1="280" y1="48" x2="280" y2="68"
        stroke="#00FFFF" stroke-width="1.5"/>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Single line (feeder style) | Always dual parallel lines with hatching between. The double-line + hatch is the defining visual characteristic. |
| 2 | Hatch in cyan | Hatch strokes are white (`#FFFFFF`), not cyan. Cyan = device/bus linework, white = fill pattern. (Feeders use black/gray, not cyan.) |
| 3 | Outer lines with different stroke weights | Both outer lines use identical 3.0 pt weight. Asymmetric weights break the visual balance. |
| 4 | Hatch lines parallel to busway direction | Hatch is always at 45° regardless of busway orientation. |
| 5 | Tap-off dots outside the busway centerline | Dots are on the centerline between the two outer strokes. The perpendicular stub extends outward from the dot. |
| 6 | Busway with no hatching (just two parallel lines) | Hatching is mandatory. Without it, the symbol could be confused with parallel feeders or a conduit bank. |
| 7 | Tap spacing varying arbitrarily | Taps are at regular `tap_pitch` intervals starting from `tap_offset_start`. Irregular spacing indicates a design error or a different busway segment. |
| 8 | Busway crossing another busway | Busway-to-busway crossings are physically impossible. If the routing requires it, redesign the layout. |
| 9 | Diagonal routing | Horizontal and vertical only, same as feeders. 90° bends at direction changes. |
| 10 | Data fields inside the hatched region | Text always outside the busway body, offset to the right or below. |

---

# A — Annotations

Non-electrical drawing elements. Attach to existing linework or device instances via `anchor` connection mode. Annotation tags may read calc field values from bound symbols but never produce or modify them.

---

## A-1. Feeder Tag

Pill-shaped (stadium) tag with horizontal leader and diagonal tick mark at feeder connection. Contains encoded annotation: amperage + wire count + optional T suffix.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Midpoint of tick mark (feeder connection), `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `pill_h` | 31 | Pill height (fixed, does not scale) |
| `pill_w_std` | 76 | Pill width for 4-digit annotation |
| `pill_w_xfmr` | 90 | Pill width for T-suffix annotation |
| `pill_rx` | 15.5 | Corner radius = pill_h / 2 (true stadium) |
| `leader_length` | 32 | Leader from tick to pill edge |
| `tick_half_w` | 10 | Tick horizontal half-extent |
| `tick_half_h` | 8 | Tick vertical half-extent |

### Element Positions (default: right-side leader)

| Element | Position | Notes |
|---------|----------|-------|
| Tick start | `(−10, 8)` | Lower-left of diagonal |
| Tick end | `(10, −8)` | Upper-right of diagonal |
| Leader | `(0, 0)` to `(32, 0)` | Horizontal, tick to pill |
| Pill | `(32, −15.5)` w=76, h=31, rx=15.5 | True stadium shape |
| Text | `(70, 6)` | Centered in pill |

**Key Relationships:** `pill_rx = pill_h / 2 = 15.5` — creates true stadium (not rounded rectangle). Pill height FIXED at 31px — only width scales. Tick midpoint = leader start = same coordinate.

### Encoding Convention

- All digits except last = amperage
- Last digit = wire count
- Trailing `T` = transformer secondary feeder

| Annotation | Reads As |
|------------|----------|
| `1004` | 100A, 4-wire |
| `2254` | 225A, 4-wire |
| `2254T` | Xfmr secondary, 225A, 4-wire |
| `603` | 60A, 3-wire |

### Stroke Weights

| Element | Weight |
|---------|--------|
| Pill outline | 3.0 pt |
| Leader line | 3.0 pt |
| Tick mark | 3.0 pt |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `anno_attach` | `(0, 0)` — tick midpoint | attach | `anchor` | `tick` |

### Binding Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bound_to` | string | optional | Feeder instance designation (e.g., `F-42`) that this tag annotates. When populated, the calc engine can validate that the tag's encoded ampacity/wire count matches the bound feeder's `conductor_size`, `num_sets`, and `conductors_per_phase`. When absent, the tag is a drawing-only annotation with no computational link. |

> **Backward compatibility:** The `bound_to` field is optional. Existing compositions that place feeder tags via `anchor` attachment mode without a binding reference remain valid for drawing. The field enables — but does not require — computational validation.

### Data Fields

| Field | Style | Position | Notes |
|-------|-------|----------|-------|
| Annotation text | Bold (700), 16px monospace | Centered in pill: `(leader_length + pill_w/2, 6)` | Encoded string (e.g., `2254`, `1004T`) |

### Reference SVG

```svg
<svg viewBox="0 0 340 170" xmlns="http://www.w3.org/2000/svg">
  <line x1="30" y1="58" x2="50" y2="42"
        stroke="#00FFFF" stroke-width="1.5"/>
  <line x1="40" y1="50" x2="72" y2="50"
        stroke="#00FFFF" stroke-width="1.5"/>
  <rect x="72" y="35" width="76" height="31" rx="15.5" ry="15.5"
        fill="none" stroke="#00FFFF" stroke-width="2"/>
  <text x="110" y="55" text-anchor="middle"
        font-family="monospace" font-size="16" font-weight="700"
        fill="#FFFFFF">1004</text>
  <rect x="170" y="35" width="90" height="31" rx="15.5" ry="15.5"
        fill="none" stroke="#00FFFF" stroke-width="2"/>
  <text x="215" y="55" text-anchor="middle"
        font-family="monospace" font-size="16" font-weight="700"
        fill="#FFFFFF">2254T</text>
  <line x1="260" y1="50" x2="292" y2="50"
        stroke="#00FFFF" stroke-width="1.5"/>
  <line x1="282" y1="42" x2="302" y2="58"
        stroke="#00FFFF" stroke-width="1.5"/>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Gap between tick and leader | Same coordinate — exactly coincident. |
| 2 | rx < pill_h / 2 | Always `rx = ry = 15.5` for h=31. True stadium. |
| 3 | Pill height scaling with text | Height always 31px. Only width varies. |
| 4 | Rotating the pill | Pill and text always horizontal. Only tick/leader direction changes. |

---

## A-2. Conduit / Wire Callout Tag

Half-circle loop on feeder (left side, rotated 30° clockwise) with diameter line through it, angled leader, horizontal stub, and left-aligned text specifying conduit/conductor details. All callout elements use text color (`#FFFFFF` on dark), NOT cyan.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Center of half-circle (feeder crossing point), `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `r` | 10 | Half-circle radius |
| `rotation` | 30 | Clockwise rotation of half-circle + diameter line (degrees) |
| `leader_run` | 30 | Leader horizontal distance |
| `leader_rise` | 48 | Leader vertical distance |
| `stub_length` | 16 | Horizontal stub at leader end |
| `font_size` | 12 | Text font size |
| `stroke_weight` | 1.2 | All callout elements uniform |

### Element Positions (default: leader up-right)

| Element | Position | Notes |
|---------|----------|-------|
| Half-circle arc | `(0, −10)` to `(0, 10)` via left bulge | Left-side semicircular arc, rotated 30° CW |
| Diameter line | `(0, −10)` to `(0, 10)` | Chord through half-circle, rotated with arc |
| Leader end / stub start | `(30, −48)` | Angle joint |
| Stub end | `(46, −48)` | Short transition to text |
| Text start | `(50, −44)` | Left-aligned, no underline |

**Key Relationships:** Half-circle on LEFT side of feeder only (no right bump). Half-circle and diameter line are grouped and rotated 30° CW around center. Leader is a single diagonal from center. Stub is short (16px). Text has NO underline. All callout linework uses text color (`#FFFFFF`), NOT cyan. The Reference SVG includes a background feeder line in muted gray (`#4a5568`) for context only — this is NOT part of the callout symbol and is not rendered by the callout. It represents the feeder (R-1) that the callout attaches to.

### Text Format

```
[Conduit]"C - ([Count])#[Size] [Material] + #[Ground] [Material] GND
```

Examples: `3/4"C - (4)#12 CU + #12 CU GND`, `(2) 3"C - (4)#350 AL + #3 CU GND`

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `anno_attach` | `(0, 0)` — D-loop center | attach | `anchor` | `d_loop` |

### Binding Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bound_to` | string | optional | Feeder instance designation (e.g., `F-42`) that this callout annotates. When populated, the calc engine can validate that the callout's conduit/conductor text matches the bound feeder's `conductor_size`, `conductor_material`, `conduit_type`, `conduit_size`, `num_sets`, and `ground_size`. When absent, the callout is a drawing-only annotation with no computational link. |

> **Backward compatibility:** The `bound_to` field is optional. Existing compositions that place callouts via `anchor` attachment mode without a binding reference remain valid for drawing. The field enables — but does not require — computational validation.

### Data Fields

| Field | Style | Position | Notes |
|-------|-------|----------|-------|
| Callout text | Semi-bold (600), 12px monospace | Left-aligned at stub end + 4px gap: `(leader_run + stub_length + text_gap, −leader_rise + 4)` | No underline. Full conduit/conductor spec string. |

### Reference SVG

```svg
<svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg">
  <line x1="50" y1="20" x2="50" y2="170"
        stroke="#4a5568" stroke-width="1.5"/>
  <g transform="rotate(30, 50, 100)">
    <path d="M50,90 A10,10 0 0,0 50,110"
          fill="none" stroke="#FFFFFF" stroke-width="1.2"/>
    <line x1="50" y1="90" x2="50" y2="110"
          stroke="#FFFFFF" stroke-width="1.2"/>
  </g>
  <line x1="50" y1="100" x2="80" y2="52"
        stroke="#FFFFFF" stroke-width="1.2"/>
  <line x1="80" y1="52" x2="96" y2="52"
        stroke="#FFFFFF" stroke-width="1.2"/>
  <text x="100" y="56" font-family="monospace" font-size="12"
        font-weight="600" fill="#FFFFFF">2"C - (4)#4/0 CU + #4 CU GND</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | D-loop with arcs on both sides | Half-circle on LEFT side only, with diameter line, rotated 30° CW. |
| 2 | Leader from top/bottom of loop | Leader from exact half-circle CENTER. |
| 3 | Multi-segment leader | Single diagonal from center to stub. |
| 4 | Long horizontal stub | Stub ≈ 16px — just a short transition. |
| 5 | Underlined text | Plain text, left-aligned, no decoration. |
| 6 | Cyan/linework color on callout elements | All callout elements (arc, diameter, leader, stub, text) use text color (`#FFFFFF`), NOT cyan. |

---

## A-3. Continuation Squiggle

S-curve indicating a feeder continues to another sheet/section. Two opposing cubic Bézier segments joined at center. Feeder connects perpendicular at center. Text label on opposite side from feeder.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Center of S-curve (where segments meet), `(0, 0)` |

| Variable | Default | Description |
|----------|---------|-------------|
| `half_span` | 20 | Half the S-curve total span |
| `amplitude` | 16 | Perpendicular bulge of each segment |
| `squiggle_weight` | 2.5 | S-curve stroke weight (pink — #FF69B4) |
| `feeder_weight` | 3.0 | Feeder line weight (black for print/light, light gray for dark) |
| `font_size` | 12 | Label font size |

### S-Curve Construction

**Horizontal squiggle** (feeder connects vertically):
```
M(-20, 0) C(-20, 16) (-10, 16) (0, 0) C(10, -16) (20, -16) (20, 0)
```
First segment bulges DOWN, second bulges UP.

**Vertical squiggle** (feeder connects horizontally):
```
M(0, -20) C(-16, -20) (-16, -10) (0, 0) C(16, 10) (16, 20) (0, 20)
```
First segment bulges LEFT, second bulges RIGHT.

**Key Relationships:** S-curve center = anchor = feeder connection point. Feeder is PERPENDICULAR to squiggle. Text on OPPOSITE side from feeder. Single continuous `<path>` (not two separate paths). `stroke-linecap="round"`.

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `feeder_bi` | `(0, 0)` — S-curve center | perpendicular, bidirectional | `termination` | `squiggle` |

### Typical Labels

`TO UTILITY TRANSFORMER`, `TO MV SWITCH`, `TO GENERATOR`, `TO PANEL [name]`, `SEE SHEET E-501`, `FROM ATS [designation]`

### Data Fields

| Field | Style | Position | Notes |
|-------|-------|----------|-------|
| Destination label | 12px Semi-bold (600), monospace | Opposite side of squiggle from feeder, 1–2 lines with 14px line spacing | May be multi-line (e.g., "TO UTILITY" / "TRANSFORMER") |

### Reference SVG

```svg
<svg viewBox="0 0 340 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M108,70 C108,86 118,86 128,70 C138,54 148,54 148,70"
        fill="none" stroke="#FF69B4" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="128" y1="50" x2="128" y2="70"
        stroke="#00FFFF" stroke-width="1.5"/>
  <text x="30" y="72" font-family="monospace" font-size="11"
        font-weight="600" fill="#FFFFFF">TO UTILITY</text>
  <text x="30" y="86" font-family="monospace" font-size="11"
        font-weight="600" fill="#FFFFFF">TRANSFORMER</text>
  <path d="M260,55 C244,55 244,67 260,80 C276,93 276,105 260,105"
        fill="none" stroke="#FF69B4" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="260" y1="80" x2="330" y2="80"
        stroke="#00FFFF" stroke-width="1.5"/>
  <text x="200" y="78" font-family="monospace" font-size="11"
        font-weight="600" fill="#FFFFFF">TO MV</text>
  <text x="200" y="92" font-family="monospace" font-size="11"
        font-weight="600" fill="#FFFFFF">SWITCH</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Lens/eye shape (arcs bulging same direction) | Two segments bulge in OPPOSITE directions — the S shape. |
| 2 | Feeder at end of S-curve | Feeder connects at CENTER (midpoint where segments meet). |
| 3 | Feeder parallel to squiggle | Feeder must be PERPENDICULAR. |
| 4 | Text on same side as feeder | Text on OPPOSITE side. |
| 5 | Two separate `<path>` elements | Single continuous `<path>` with two Bézier segments. |

---


---

## A-4. Fault Current Tag

Pennant-shaped annotation tag displaying the discrete calculated available fault current at a specific point in the system. Rectangular body tapers to a triangular apex at the attach point. Pennant leans LEFT of the feeder (rotated −30° from horizontal). Stroke color is red (`#FF3333`) — unique to this symbol. Binds to a device instance or feeder/bus and reads the `available_fc` value from the bound symbol's calculation fields. Non-electrical — reads data only.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Pennant apex (triangle tip), `(0, 0)` — sits on the feeder/bus centerline |

| Variable | Default | Description |
|----------|---------|-------------|
| `body_w` | 100 | Rectangular body width (dynamic — scales to text content, minimum 80). Must fit `100,000A` (8 chars) at default size. |
| `body_h` | 21 | Rectangular body height (fixed) |
| `tri_depth` | 13 | Triangle taper depth from body edge to apex |
| `rotation` | −30 | Rotation angle in degrees (negative = leans left of feeder) |
| `stroke_weight` | 2.5 | Pennant outline stroke weight |
| `font_size` | 12 | Value text font size |

### Element Positions (before rotation)

| Element | Position | Notes |
|---------|----------|-------|
| Apex (port) | `(0, 0)` | Triangle tip, on feeder centerline |
| Triangle taper | `(0, 0)` to `(tri_depth, −body_h/2)` and `(tri_depth, body_h/2)` | Expands from apex to body width |
| Rectangular body | `(tri_depth, −body_h/2)` to `(tri_depth + body_w, body_h/2)` | Contains value text |
| Value text | Centered in rectangular body | `text-anchor="middle"` at `(tri_depth + body_w/2, 0)` |

**Key Relationships:** The entire pennant (triangle + rectangle) is a single closed `<path>` element. The apex is always at the origin `(0, 0)`. The body extends AWAY from the feeder (rightward in local coordinates before rotation). After rotation, the pennant leans left of the feeder. The `<path>` construction: `M0,0 L13,−10.5 L113,−10.5 L113,10.5 L13,10.5 Z` (for default 100px body width).

### Pennant Shape Construction

```
M 0,0                           ← apex (attach point)
L tri_depth, −(body_h/2)       ← upper triangle corner
L tri_depth+body_w, −(body_h/2) ← upper-right body corner
L tri_depth+body_w, (body_h/2)  ← lower-right body corner
L tri_depth, (body_h/2)         ← lower triangle corner
Z                                ← close to apex
```

Default coordinates: `M0,0 L13,-10.5 L113,-10.5 L113,10.5 L13,10.5 Z`

The entire assembly is then rotated by `rotation` degrees around the apex `(0, 0)`.

### Stroke Weights

| Element | Weight | Color |
|---------|--------|-------|
| Pennant outline (`<path>`) | 2.5 pt | `#FF3333` (red) — `--sld-fc` |
| Value text | — | `#FFFFFF` (white) |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `anno_attach` | `(0, 0)` — pennant apex | attach | `anchor` | `pennant` |

### Binding Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bound_to` | string | optional | Symbol instance ID whose `available_fc` value is displayed. When populated, the renderer reads `available_fc` from the bound symbol's calculation fields at render time. When absent, the tag displays a static user-entered value. |

### Data Fields

| Field | Style | Position | Notes |
|-------|-------|----------|-------|
| Fault current value | Bold (700), 12px monospace, white | Centered in pennant body | Discrete calculated available fault current in whole amps with comma separators (e.g., `42,385A`, `100,000A`). This is the available fault current at this point — NOT equipment interrupting rating. |

### Display Format Convention

| Available FC Range | Display Format | Example |
|--------------------|---------------|---------|
| All values | `XX,XXXA` (whole amps, comma-separated) | `42,385A` |
| Maximum display | `100,000A` | Pennant body width accommodates up to 8 characters |

### Reference SVG

```svg
<svg viewBox="0 0 220 120" xmlns="http://www.w3.org/2000/svg">
  <line x1="30" y1="10" x2="30" y2="110"
        stroke="#CCCCCC" stroke-width="1.5"/>
  <g transform="translate(30, 60) rotate(-30, 0, 0)">
    <path d="M0,0 L13,-10.5 L113,-10.5 L113,10.5 L13,10.5 Z"
          fill="none" stroke="#FF3333" stroke-width="2.5"
          stroke-linejoin="miter"/>
    <text x="63" y="4" text-anchor="middle"
          font-family="monospace" font-size="12" font-weight="700"
          fill="#FFFFFF">42,385A</text>
  </g>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Cyan (`#00FFFF`) stroke | Stroke is ALWAYS red `#FF3333`. This is the only symbol that uses this color. |
| 2 | Pennant leaning RIGHT of feeder | FC tag always leans LEFT (rotation = −30°). VD tag (A-5) leans right. |
| 3 | Pill/stadium shape (like A-1) | Pennant is a triangular-tipped rectangle, NOT a rounded pill. |
| 4 | Port at the rectangular end | Port is at the APEX (triangle tip), not the body end. |
| 5 | Equipment interrupting rating or kA format | Display the discrete CALCULATED available fault current in whole amps with comma separators (e.g., `42,385A`). Not the equipment's AIC rating, and not in kA. |
| 6 | Rectangle with separate triangle element | Single closed `<path>` for the entire pennant shape. Not two separate elements. |
| 7 | Text color matching stroke (red text) | Text is always white `#FFFFFF` regardless of stroke color. |
| 8 | Rotation other than −30° | Fixed at −30°. Not variable per instance. |

---

## A-5. Voltage Drop Tag

Pennant-shaped annotation tag displaying the cumulative voltage drop percentage at a specific point in the system. Mirror image of A-4 (Fault Current Tag) — pennant leans RIGHT of the feeder (rotated +30° from horizontal). Stroke color is dark blue (`#1A5FAA`) — unique to this symbol. Binds to a feeder (R-1) or bus (R-2) instance and reads the `voltage_drop_pct` value from the bound routed element's calculation fields. Non-electrical — reads data only.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Pennant apex (triangle tip), `(0, 0)` — sits on the feeder/bus centerline |

| Variable | Default | Description |
|----------|---------|-------------|
| `body_w` | 80 | Rectangular body width (dynamic — scales to text content, minimum 64) |
| `body_h` | 21 | Rectangular body height (fixed) |
| `tri_depth` | 13 | Triangle taper depth from body edge to apex |
| `rotation` | +30 | Rotation angle in degrees (positive = leans right of feeder) |
| `stroke_weight` | 2.5 | Pennant outline stroke weight |
| `font_size` | 12 | Value text font size |

### Element Positions (before rotation)

| Element | Position | Notes |
|---------|----------|-------|
| Apex (port) | `(0, 0)` | Triangle tip, on feeder centerline |
| Triangle taper | `(0, 0)` to `(−tri_depth, −body_h/2)` and `(−tri_depth, body_h/2)` | Expands from apex LEFTWARD (mirrored from A-4) |
| Rectangular body | `(−tri_depth − body_w, −body_h/2)` to `(−tri_depth, body_h/2)` | Contains value text |
| Value text | Centered in rectangular body | `text-anchor="middle"` |

**Key Relationships:** Mirror image of A-4. The body extends to the LEFT in local coordinates (opposite direction from A-4). After +30° rotation, the pennant leans right of the feeder. The `<path>` construction: `M0,0 L−13,−10.5 L−93,−10.5 L−93,10.5 L−13,10.5 Z` (for default 80px body width).

### Pennant Shape Construction

```
M 0,0                                  ← apex (attach point)
L −tri_depth, −(body_h/2)             ← upper triangle corner
L −(tri_depth+body_w), −(body_h/2)    ← upper-left body corner
L −(tri_depth+body_w), (body_h/2)     ← lower-left body corner
L −tri_depth, (body_h/2)              ← lower triangle corner
Z                                      ← close to apex
```

Default coordinates: `M0,0 L-13,-10.5 L-93,-10.5 L-93,10.5 L-13,10.5 Z`

The entire assembly is then rotated by `rotation` degrees around the apex `(0, 0)`.

### Stroke Weights

| Element | Weight | Color |
|---------|--------|-------|
| Pennant outline (`<path>`) | 2.5 pt | `#1A5FAA` (dark blue) — `--sld-vd` |
| Value text | — | `#FFFFFF` (white) |

### Connection Ports

| Port | Position | Direction | connection_mode | marker_style |
|------|----------|-----------|-----------------|--------------|
| `anno_attach` | `(0, 0)` — pennant apex | attach | `anchor` | `pennant` |

### Binding Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bound_to` | string | optional | Routed element instance ID (Feeder R-1 or Bus R-2) whose `voltage_drop_pct` value is displayed. When populated, the renderer reads `voltage_drop_pct` from the bound element's calculation fields at render time. May also compute cumulative VD by summing all upstream `voltage_drop_pct` values along the power path from the source. When absent, the tag displays a static user-entered value. |

### Data Fields

| Field | Style | Position | Notes |
|-------|-------|----------|-------|
| Voltage drop value | Bold (700), 12px monospace, white | Centered in pennant body | Cumulative voltage drop as percentage with up to 2 decimals (e.g., `2.14%`). |

### Display Format Convention

| VD Range | Display Format | Example |
|----------|---------------|---------|
| ≥ 1.0% | `X.XX%` (2 decimals) | `2.14%` |
| < 1.0% | `0.XX%` (2 decimals, leading zero) | `0.87%` |

### Reference SVG

```svg
<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
  <line x1="170" y1="10" x2="170" y2="110"
        stroke="#CCCCCC" stroke-width="1.5"/>
  <g transform="translate(170, 60) rotate(30, 0, 0)">
    <path d="M0,0 L-13,-10.5 L-93,-10.5 L-93,10.5 L-13,10.5 Z"
          fill="none" stroke="#1A5FAA" stroke-width="2.5"
          stroke-linejoin="miter"/>
    <text x="-53" y="4" text-anchor="middle"
          font-family="monospace" font-size="12" font-weight="700"
          fill="#FFFFFF">2.14%</text>
  </g>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Cyan (`#00FFFF`) stroke | Stroke is ALWAYS dark blue `#1A5FAA`. This is the only symbol that uses this color. |
| 2 | Pennant leaning LEFT of feeder | VD tag always leans RIGHT (rotation = +30°). FC tag (A-4) leans left. |
| 3 | Pill/stadium shape (like A-1) | Pennant is a triangular-tipped rectangle, NOT a rounded pill. |
| 4 | Port at the rectangular end | Port is at the APEX (triangle tip), not the body end. |
| 5 | Segment-only voltage drop | Display CUMULATIVE voltage drop from source, not just the segment contribution. |
| 6 | Same color as A-4 | A-4 is red `#FF3333`, A-5 is dark blue `#1A5FAA`. Never swap. |
| 7 | Text color matching stroke (blue text) | Text is always white `#FFFFFF` regardless of stroke color. |
| 8 | Rotation other than +30° | Fixed at +30°. Not variable per instance. |
| 9 | Body extending rightward (same as A-4) | A-5 body extends LEFTWARD in local coordinates — it is the mirror of A-4. |

---

## A-6. Hex Note

Hexagonal keynote callout tag with filled drafting arrowhead, diagonal leader, horizontal stub, and regular hexagon body containing a keynote number. The hexagon is oriented with a flat edge on the bottom and a pointed vertex at the top. Used for cross-referencing equipment, details, or specifications to a keynote schedule maintained separately on the drawing set. Non-electrical — purely a documentation annotation.

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | Arrowhead tip, `(0, 0)` — sits on the target element (equipment, feeder, or area) |

| Variable | Default | Description |
|----------|---------|-------------|
| `hex_r` | 22 | Hexagon circumradius (80% of the pre-rotation value of 28) |
| `hex_rotation` | 30 | Hexagon rotation in degrees — produces flat bottom, pointed top |
| `arrow_length` | 20 | Arrowhead length (tip to tail) |
| `arrow_width` | 10 | Arrowhead width at tail (full span) |
| `leader_angle` | variable | Diagonal leader angle from horizontal, in 15° increments: 0°, ±15°, ±30°, ±45°, ±60°, ±75°, ±90° |
| `stub_length` | 12 | Minimum horizontal stub length between bend and hex entry |
| `stroke_weight_hex` | 2.5 | Hexagon outline stroke weight |
| `stroke_weight_leader` | 1.5 | Leader line stroke weight |
| `font_size` | 14 | Keynote number font size |

### Hexagon Vertex Coordinates (after 30° rotation, centered at hex center)

| Vertex | Position | Role |
|--------|----------|------|
| V0 | `(0, −22)` | Top point |
| V1 | `(19, −11)` | Upper-right |
| V2 | `(19, 11)` | Lower-right |
| V3 | `(11, 19)` | Bottom-right |
| V4 | `(−11, 19)` | Bottom-left |
| V5 | `(−19, 11)` | Lower-left |
| V6 | `(−19, −11)` | Upper-left |

**Simplified construction:** Apply `transform="rotate(30, 0, 0)"` to a standard flat-top hexagon with vertices at `(0,−22) (19,−11) (19,11) (0,22) (−19,11) (−19,−11)`.

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Arrowhead tip | `(0, 0)` — anchor, on target | Filled white `#FFFFFF`, 20×10 drafting arrowhead aligned to leader diagonal angle |
| Diagonal leader | From arrowhead base to bend point | Angle = `leader_angle`, length determined by composition |
| Bend | Where diagonal meets horizontal stub | Single clean 90° miter |
| Horizontal stub | From bend to hex body entry | Minimum 12px, enters hex at the midpoint of the nearest flat side (left or right depending on hex placement relative to feeder) |
| Hex body | Centered at end of stub | Regular hexagon, flat bottom, pointed top |
| Keynote number | Centered in hex body | `text-anchor="middle"`, vertically centered |

**Key Relationships:** The arrowhead is ALWAYS aligned to the diagonal leader's angle — it rotates with the leader. The horizontal stub is ALWAYS horizontal regardless of diagonal angle. The bend between diagonal and stub is a clean single corner. The hex body does NOT rotate — it always has flat bottom, pointed top. Leader entry is always at a flat side of the hex (left or right).

### Leader Construction Rule

1. Start at arrowhead tip `(0, 0)` on the target.
2. Draw diagonal at the selected angle (15° increments) away from the target.
3. At the bend point, transition to a horizontal stub.
4. Stub enters the hex body at the midpoint of the nearest flat side.

The compositor selects angle and side (left/right) based on available clear space around the target element.

### Stroke Weights

| Element | Weight | Color |
|---------|--------|-------|
| Hexagon outline | 2.5 pt | `#00FFFF` (cyan) — standard `--sld-linework` |
| Leader line (diagonal + stub) | 1.5 pt | `#00FFFF` (cyan) |
| Arrowhead | filled | `#FFFFFF` (white) — no stroke |
| Keynote number text | — | `#FFFFFF` (white) |

### Connection Ports

A-6 operates in two modes depending on placement. The two modes attach to different target types.

**Leader mode** — hex floats away from target, connected by arrowhead + leader. The arrowhead tip can attach to **any** target: feeder linework, bus linework, busway, or device boundaries.

| Port | Position | Direction | connection_mode | marker_style | Attaches to |
|------|----------|-----------|-----------------|--------------|-------------|
| `anno_attach` | `(0, 0)` — arrowhead tip | attach | `anchor` | `arrowhead` | Feeders (R-1), buses (R-2), busway (R-3), or any Class A device boundary |

**Direct mode** — hex body snaps directly onto a device boundary edge. No leader, stub, or arrowhead. Direct mode attaches to **device boundaries only** — not feeder or bus linework.

| Port | Position (relative to hex center, after 30° rotation) | Direction | connection_mode | marker_style | Attaches to |
|------|----------|-----------|-----------------|--------------|-------------|
| `anno_left` | `(−22, 0)` — left vertex | attach | `anchor` | `none` | Device boundary edge (left wall) |
| `anno_right` | `(22, 0)` — right vertex | attach | `anchor` | `none` | Device boundary edge (right wall) |
| `anno_top` | `(0, −19)` — top flat edge center | attach | `anchor` | `none` | Device boundary edge (top) |
| `anno_bottom` | `(0, 19)` — bottom flat edge center | attach | `anchor` | `none` | Device boundary edge (bottom) |

**Direct mode target devices:** Panelboard (L2-4), Disconnect Switch (L2-5), ATS (L2-3), Switchboard Section (L1-2), Circuit Breaker (L2-1), LV Transformer (L2-2), Fire Pump starter box (L3-1), Equipment Connection (L3-3), and any other Class A device with a rectangular or circular boundary. The hex edge aligns flush with the device boundary at the selected port.

**Mode selection:** The compositor selects the mode based on context. Leader mode when the keynote points at a feeder run, a specific spot on a bus, or when the hex would overlap other symbology if placed directly. Direct mode when the keynote labels a piece of equipment and the hex can sit flush against the device boundary. In direct mode, the leader, stub, and arrowhead are not rendered — only the hex body and keynote number.

### Data Fields

| Field | Style | Position | Notes |
|-------|-------|----------|-------|
| Keynote number | Bold (700), 14px monospace, white | Centered in hex body, `text-anchor="middle"` | Integer only (e.g., `3`, `14`, `127`). Cross-references a keynote schedule on the drawing set. |

### Reference SVG

```svg
<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
  <line x1="30" y1="10" x2="30" y2="110"
        stroke="#CCCCCC" stroke-width="1.5"/>
  <polygon points="28,60 44,57 39,54 40,48"
           fill="#FFFFFF" stroke="none"/>
  <line x1="38" y1="53" x2="62" y2="41"
        stroke="#00FFFF" stroke-width="1.5"/>
  <line x1="62" y1="41" x2="78" y2="41"
        stroke="#00FFFF" stroke-width="1.5"/>
  <polygon points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11"
           fill="none" stroke="#00FFFF" stroke-width="2.5"
           stroke-linejoin="miter"
           transform="translate(100, 41) rotate(30, 0, 0)"/>
  <text x="100" y="46" text-anchor="middle"
        font-family="monospace" font-size="14" font-weight="700"
        fill="#FFFFFF">14</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Hexagon with flat top/bottom (standard orientation) | Hex is ROTATED 30° — flat sides on left and right, flat edge on bottom, point on top. |
| 2 | Arrowhead aligned to horizontal | Arrowhead rotates to match the diagonal leader angle. |
| 3 | Horizontal line first, then diagonal | DIAGONAL first (from arrowhead), then BEND, then HORIZONTAL stub into hex. |
| 4 | Open/unfilled arrowhead | Arrowhead is FILLED white. Solid, no stroke. |
| 5 | Text or description inside hex | Integer keynote number ONLY. All descriptive text lives in the keynote schedule. |
| 6 | Free-form leader angles | Leader angles are FIXED 15° increments only: 0°, ±15°, ±30°, ±45°, ±60°, ±75°, ±90°. |
| 7 | Hex body rotating with leader | Hex body orientation is FIXED (flat bottom, pointed top). Only the arrowhead and diagonal rotate. |
| 8 | Leader entering hex at a vertex | Leader enters at the FLAT SIDE midpoint (left or right), not at a vertex. |
| 9 | Red or blue stroke (like A-4/A-5) | Hex note uses standard cyan `#00FFFF` linework. It is not color-coded like the FC/VD tags. |
| 10 | Rounded corners on hex | Hexagon uses `stroke-linejoin="miter"` for sharp corners. No rounding. |

---

## A-7. Level Annotation

Horizontal dashed line annotation marking the physical building floor where equipment is located, labeled at the right edge. Informational only — it does not drive equipment Y position or feeder chain height; equipment placement drives level-line placement, never the reverse. A-7 is fully **derived**: it carries no anchor of its own and computes its geometry from the placed-equipment cluster of its sheet.

> **Authored as-built** (verified against `_frozen_ref_batch4/04_renderer/sld_viewer_engine_V1_0_0.html`, `renderLevelLines`). The former standalone A-7 patch and rescope documents were folded into this section — their design record, deferred Tier-2/3 design, and remaining open work items are the four subsections at the end of §A-7. Spec follows engine. The earlier patch draft specified different values — dash `8,4`, stroke 0.5, left-inside 12px/500 label, full-content-width extent, midpoint Y — all superseded by the as-built values below (see *A-7 Superseded Draft Values*). The Tier-2 tint band and roster panel are **not part of the shipped A-7**: nothing emits or consumes them (deferred design preserved under *A-7 Deferred Features*).

### Anchor & Geometry

| Property | Value |
|----------|-------|
| Anchor | None — derived. Line Y and X extent are computed from the sheet's placed-equipment bounding box (`bboxOfG(sheetId)`, written `bb` below) and per-floor device clusters. |
| Line X extent | `x1 = bb.minX − 40` to `x2 − level_line_label_w`, where `x2 = bb.maxX + 40 + level_line_label_w` |
| Label X | `x2` (right edge, outside the linework span), staggered inward when flagged (see Collision Handling) |

The extent is **bbox-derived, not content-area-derived**: under the engine's floating-origin coordinate model, `bb.minX − 40` is frequently negative. The line never spans "full sheet width" — it spans the equipment cluster plus margins plus the label allowance.

### Core Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `level_line_y_margin` | 20 | Collision-escape step and device-clearance margin (px); engine `DIM.level_line_y_margin` |
| `level_line_label_w` | 120 | Label width allowance appended past `bb.maxX + 40` (px); engine `DIM.level_line_label_w` |
| `level_line_dash` | `"24,12"` | SVG `stroke-dasharray`; engine `DIM.level_line_dash` |
| `MIN_LINE_GAP` | 60 | Minimum vertical separation between adjacent level lines (px), enforcement pass |
| `LABEL_GAP` | 40 | Y-gap threshold below which labels are X-staggered (px) |
| cluster clearance `MARGIN` | 40 | `level_line_y_margin + 20`; clearance below the equipment cluster for candidate Y |

### Element Positions

| Element | Position | Notes |
|---------|----------|-------|
| Boundary line | `(x1, y)` → `(x2 − level_line_label_w, y)` | Horizontal, dashed; y from the Derivation Algorithm below |
| Label text | `(labelX, y + 4)`, `text-anchor="end"` | `labelX = x2` normally; staggered inward `−160` / `−80` alternating when flagged |

### Stroke Weights

| Element | Weight | Color |
|---------|--------|-------|
| Boundary line | 1.2 | `var(--sld-text)` at opacity `.55`, dashed `24,12` — text color, NOT cyan linework (alignment to the catalog A-7 card; was `var(--sld-line)`) |
| Label text | — (13px, weight 700, `'Courier New',monospace`) | `var(--sld-text)` at opacity `.8` |

### Connection Ports

None. A-7 is unbound and free-floating. It does not participate in the power flow graph.

### Data Fields

| Field | Style | Position | Notes |
|-------|-------|----------|-------|
| Level label | 13px 700 `'Courier New',monospace` | `(labelX, y + 4)`, `text-anchor="end"` | Complete emitted string from the level-code mapping below — no prefix applied |

### Level Code → Label Mapping

Source of truth: `07_data/normalized/equipment_designation_legend_V1_0_0.json` → `level_code_labels` / `level_code_pattern` (rescope WI-5). The engine keeps a hand-synced in-file mirror (`LEVEL_CODE_LABELS` / `LEVEL_CODE_PATTERN`) because the viewer is self-contained with no runtime fetch. As-built mapping:

```json
{
  "level_code_labels": {
    "S": "LEVEL S", "B": "LEVEL B", "1": "LEVEL 1", "2": "LEVEL 2",
    "3": "LEVEL 3", "4": "LEVEL 4", "R": "LEVEL ROOF"
  },
  "level_code_pattern": "LEVEL {code}"
}
```

Resolution: exact match in `level_code_labels`, else `level_code_pattern` with `{code}` substituted (e.g. office floors 5–7 → `LEVEL 5`…`LEVEL 7`). Note: an earlier A-7 WI-5 draft proposed a fuller 21-entry mapping with regex pattern objects; the shipped legend uses this simpler 7-entry form with a plain template string — spec follows the shipped data layer.

### Device → Level Derivation (data-driven, no regex)

Floor membership comes from `layout_config.level_map` (`{designation: floor|null}`) and `layout_config.level_order` (floors top → bottom, e.g. `['R','3','2','1']`), with hospital-golden defaults compiled into the engine (`_DEF_LEVEL_MAP` / `_DEF_LEVEL_ORDER`). Designation-regex derivation is **rejected** (rescope WI-3): `level_map` reflects **rendered Y position, not narrative floor designation** — membership is curated to Chain-A sub-dist anchors and their Y-band siblings, because Chain-B internal secondaries are stacked above their parent sub-dist into the adjacent floor's Y zone, so a level-line anchor based on them collapses the line into the wrong floor. Off-row devices map to `null`. See `sld_topology_rules_V1_0_0.md` §1 Level Lines for the full composition rule and `sld_topology_schema_V1_0_0.md` §19 for the config contract.

### Exclusion Set (LEVEL_EXCLUDE_TYPES)

```js
const LEVEL_EXCLUDE_TYPES = new Set(['L0-1','L1-1','L1-3','L1-4']);
```

Excluded from the per-floor device scan (rescope WI-4, canonical set). L1-2 (Switchboard Section) is **not** in the set: the switchboard envelope is handled explicitly as an L1 placement anchor on emergency sheets instead of being filtered out of a Y scan.

### Derivation Algorithm (placement)

Runs per sheet after all device placement is complete.

**First pass — candidate Y per floor** (floors walked in `level_order`; floors with zero mapped devices on the sheet are skipped):

1. Default (all floors): `candidateY = maxBottomY(floor devices) + MARGIN` — line **below** the floor's equipment cluster.
2. Level 1 on a `normal`-role sheet: anchors to the utility-transformer pad bottom, `G[L0-1].y + UT_TBOX_H(80) + UT_PAD_H(40)`; falls back to rule 1 if no L0-1 is placed.
3. Level 1 on an `emergency`-role sheet: `maxBottomY` additionally includes the switchboard envelope bottom, recovered via the L1-1 main breaker: `SW_Y = G[L1-1].y − sw_main_bus_offset(60)`, envelope bottom `= SW_Y + sw_section_h(280)`.
4. Each candidate then runs `escapeCollision`: while any device on the sheet lies within `level_line_y_margin` of the line, shift **up** by `level_line_y_margin` (max 4 passes).

**Second pass — order enforcement:**

- `emergency`-role sheet with a populated Level 1: **fixed-pitch stack** — L1 keeps its candidate; floors `2, 3, R` are placed bottom-up at `S2_LEVEL_LINE_PITCH = { '2': 2800, '3': 1250, 'R': 1250 }` cumulative steps above L1 ('3'/'R' tightened), bypassing monotonic enforcement (see `sld_topology_rules_V1_0_0.md` §1 — this is a building-specific layout override, flag-not-mitigate).
- All other sheets: monotonic enforcement walking `level_order` top→bottom: `y = max(candidateY, prevY + MIN_LINE_GAP)`.

**Note (as-built honesty):** the engine's function-header comment formerly mentioned a "Roof-above" convention (`y = minY − margin`) and computed a `sheetMinY` for it, but no code path used either — Roof lines use the uniform below-cluster rule and sort above the other floors only because roof equipment is placed topmost. **Fixed:** the dead `sheetMinY` computation and the misleading "Roof-above" comment were removed; the header comment now states the uniform below-cluster rule directly. Behavior documented here is (and always was) the code's.

### Cross-Sheet Rules

1. A-7 renders on a sheet only for floors with at least one mapped, non-excluded, placed device on that sheet (empty floor buckets are skipped).
2. Level lines are sheet-scoped: the same floor on two sheets produces two independent A-7 instances, each derived from its own sheet's cluster bbox.

### Collision Handling

Label merge (e.g. `"LEVEL 2 / LEVEL 6"`) is FORBIDDEN — each floor gets its own line and label. Vertical separation is guaranteed by the second-pass enforcement (`MIN_LINE_GAP = 60`). When enforcement displaced a floor and its enforced gap to the line above is `< LABEL_GAP + MIN_LINE_GAP`, the label X-staggers inward: `labelX = x2 − 160` / `x2 − 80`, alternating per staggered label.

### Traceability Warnings (flag-not-mitigate)

On `emergency`-role sheets the engine emits `LEVEL_LINE_FIXED_PITCH` (carrying the pitch object and resulting Y map) every render, and `VERTICAL_OVERFLOW_WARNING` when any resulting line Y `< 0`. No auto-mitigation — fixed pitches are authoritative; overflow is flagged, not corrected. (The warning's prose `reason` string formerly cited stale pitch arithmetic "L2=L1-1200, L3=L2-900, Roof=L3-500"; the `pitches` field carries the authoritative values. **Fixed:** the `reason` string now defers to the `pitches` field instead of hardcoding stale numbers.)

### Reference SVG

```svg
<svg viewBox="0 0 720 80" xmlns="http://www.w3.org/2000/svg" style="background:#1a1a1a">
  <!-- Boundary line: bb.minX-40 → x2-120 -->
  <line x1="10" y1="40" x2="580" y2="40"
        stroke="#FFFFFF" stroke-width="1.2"
        stroke-dasharray="24,12" opacity=".55"/>
  <!-- Label: end-anchored at x2, y+4 -->
  <text x="700" y="44" text-anchor="end"
        font-family="'Courier New',monospace" font-size="13" font-weight="700"
        fill="#e8e8e8" opacity=".8">LEVEL 2</text>
</svg>
```

### Do Not

| # | Mistake | Correct Approach |
|---|---------|-----------------|
| 1 | Merge two level labels into one line when floors collide | Spatial separation via enforcement pass — each floor gets its own line and label |
| 2 | Include switchboard-internal devices in the floor scan | Exclude `{L0-1, L1-1, L1-3, L1-4}` per `LEVEL_EXCLUDE_TYPES`. L1-2 is handled via the explicit envelope anchor, not exclusion |
| 3 | Drive equipment Y from level line Y | Level lines are informational only — equipment placement drives level-line Y |
| 4 | Dash `8,4`, stroke 0.5 (patch-draft values) | Dashed `24,12`, stroke 1.2, opacity .55, `var(--sld-text)` |
| 5 | Left-aligned label inside the drawing area at `x_start + 8` | Right-edge label, `text-anchor="end"` at `x2 = bb.maxX + 40 + 120`, 13px/700 monospace |
| 6 | Full-content-width line `0 → content_w_px` | Bbox-derived extent `bb.minX − 40 → x2 − 120`; negative X is valid (floating origin) |
| 7 | Render A-7 for a floor with no matching devices on the sheet | Skip empty floor buckets |
| 8 | Boxed outline enclosing the level (Option B — see *A-7 Design Record* below) | Rejected — feeders crossing box edges create visual noise and false "interruption" semantics |
| 9 | Derive floor membership by regex-parsing designations | Curated `layout_config.level_map` / `level_order` only (see *A-7 Superseded Draft Values*) |
| 10 | Aggregate level treatment across sheets | Per-sheet only; same floor on different sheets gets separate instances |
| 11 | Midpoint Y placement `(min_y + max_y)/2` | Rejected by the engine (produced coincident Y); line-below-cluster + enforcement pass |

---

### A-7 Design Record — Alternatives Considered

> The design of record for the level-annotation visual treatment. Historical rationale, not active spec.

**Option A — Separator lines only (status quo extended).** Accepted minimum-viable behavior; the Tier-1 default the engine ships.

**Option B — Boxed outlines enclosing level extent. Rejected.** Failure modes:
- Feeder risers cross 4–8 box edges on typical commercial SLDs, creating visual noise that semantically implies "feeder is interrupted by level boundary" (false — feeders pass through floors uninterrupted).
- Dashed box edges compete visually with bus-splice linework and switchboard section boundaries.
- Forces a boundary decision for Chain B secondaries that straddle level zones — the spec allows straddle; a box forces attribution.

**Option C — Hybrid (dashed line + tint band). Accepted (as the deferred Tier-2 form).** Rationale:
- Tint at 3% opacity creates a figure-ground relationship without adding linework for feeders to cross.
- The dashed line remains the authoritative boundary for EOR reference.
- Default-off (`band_fill: null`) preserves current behavior for print-first workflows.

The shipped engine implements **Option A** (dashed line + right-edge label). Option C's tint band + roster are the **deferred** design below.

### A-7 Deferred Features (Tier-2 / Tier-3 — specified, not implemented)

> **Nothing emits or consumes these.** The engine renders only the Tier-1 dashed boundary line + right-edge label documented above. The tint band and roster panel are a specified-but-unbuilt design, preserved here so the work isn't lost (was rescope WI-6). If ever revived, every value must be re-verified against the then-current engine.

**Tint Band (Tier-2 opt-in)**

| Variable | Default | Tier | Description |
|----------|---------|------|-------------|
| `band_fill` | `null` | 2 | Tint fill color. `null` disables band render. EOR-set per project. |
| `band_opacity` | 0.03 | 1 | Tint fill-opacity. Hard-capped at 0.05. |
| `band_y_start` | (derived) | — | Top of band = Y of the level line above (or 0 for the topmost). |
| `band_y_end` | (derived) | — | Bottom of band = this level's `y`. |

Render (only when `band_fill != null`): rectangle `(x_start, band_y_start, x_end − x_start, band_y_end − band_y_start)`, fill `band_fill` at `band_opacity`, no stroke.

**Roster Panel (Tier-2 opt-in, "actual" mode)**

| Variable | Default | Tier | Description |
|----------|---------|------|-------------|
| `roster_enabled` | `false` | 2 | Whether to render the roster panel. |
| `roster_mode` | `"actual"` | 2 | `"actual"` lists devices; `"diff"` compares vs `load_schedule[]` (Tier-3). |
| `roster_position` | `"right"` | 2 | Dock side: `"right"` or `"left"`. |
| `roster_w` | 232 | 1 | Panel width (px). |
| `roster_line_height` | 14 | 1 | Per-entry line height (px). |
| `roster_padding` | 12 | 1 | Interior padding (px). |
| `roster_max_lines` | 20 | 2 | Collapse to count-only if content exceeds this. |
| `roster_collapsed` | `false` | 2 | Force count-only display (`"LEVEL 2 · 12 devices"`). |
| `roster_header_font_size` | 11 | 1 | Header font size (px). |
| `roster_group_header_font_size` | 10 | 1 | Per-node-type group header (px). |
| `roster_entry_font_size` | 10 | 1 | Individual designation entries (px). |
| `roster_group_by` | `"node_type"` | 1 | Grouping key for entries. |

Roster data fields: header `"{label} · {total_count} devices"`; group header `"{node_type_code} {node_type_name} ({count})"` (e.g. `"L2-4 PANELBOARD (4)"`); entries one designation per line (comma-separated for dense groups >3 per type).

**Deferred layout passes** (patch §7.2, engine `§3.9`; also needs a layout var `roster_collision_behavior` = `"collapse" | "move_left" | "fail"`, default `"collapse"`):
- *Pass 2 — tint band bounds* (after all boundary Ys finalized): for each line with `band_fill != null`, `band_y_start` = Y of the line immediately above on the sheet (or 0 if topmost), `band_y_end = L.y`. Tier-1 default (`band_fill = null`) emits `band_y_start = band_y_end = null`.
- *Pass 3 — roster placement* (only when `roster_enabled`): derive roster content; `height = 2·roster_padding + roster_line_height·(1 header + N group_headers + M entry_lines)`; if it overflows the band, force `roster_collapsed`; place `roster_bbox` at the docked side; collision-check against device bboxes and apply `roster_collision_behavior`.

**Sheet-fit / auto-disable** (patch §9): a 232px right-docked roster consumes 6.8% of Arch E1 (30×42, 3408px content), 13.4% of ARCH C (18×24), 22.0% of ARCH B (11×17). Rule: when `content_w_px < 1200`, `roster_enabled` auto-falls to `false` and the engine emits `ROSTER_DISABLED_SHEET_TOO_NARROW`.

**Tier-3 open questions** (patch §14.2):
1. Promote `level_lines[]` to `annotations[]` with `annotation_type: "A-7"` for schema symmetry? Pro: consistent with A-1…A-6. Con: breaking schema change. Deferred.
2. Prescribe a per-level tint palette, or leave project-configurable? Deferred to Tier-2 feedback.
3. Does the roster need a "diff" mode in Tier 1? Mode A (actual-only) captures ~80% of level-assignment troubleshooting value at zero new schema cost; diff mode defers to Tier-3 when `load_schedule[]` earns its keep.

### A-7 Superseded Draft Values (why the engine diverged)

> The earlier patch draft specified values the shipped engine has since tried and rejected, or never adopted. Recorded here so the divergence stays traceable; the Do-Not table above enforces the as-built values. **None of these is revived** — re-choosing any (e.g. the left-inside label aesthetic) is a new design decision carrying golden-regeneration cost, not a spec clean-up.

| Aspect | Patch draft (superseded) | As-built engine |
|--------|--------------------------|-----------------|
| Y placement | midpoint `(min_y+max_y)/2` | midpoint **explicitly rejected** (produced coincident Y); line-below-cluster `maxBottomY + 40`; L1 anchored to utility-transformer pad (S1) / switchboard-envelope bottom (S2); S2 fixed-pitch stack |
| Collision | push colliding level **down** by `roster_line_height×2` (28px) | `escapeCollision` shifts **up**; monotonic enforcement `MIN_LINE_GAP=60`; label X-stagger |
| Dash / stroke / opacity | `8,4` / 0.5pt / .9 cyan | `24,12` / 1.2 / .55 `var(--sld-line)` |
| Label | left-aligned **inside** at `x_start+8`, 12px/500 | right-edge `text-anchor="end"` at `bb.maxX+40+120`, 13px/700 monospace |
| Line extent | full content width `0 → content_w_px` | bbox-derived `bb.minX−40 → bb.maxX+40` (ignores the content area) |
| Floor derivation | regex-parse level segment from designation | curated `layout_config.level_map` / `level_order` |
| `LEVEL_EXCLUDE` | `{L0-1, L1-1, L1-2, L1-3, L1-4}` | `{L0-1, L1-1, L1-3, L1-4}` — no L1-2 |
| Label mapping | `"R" → "ROOF"` | `"R" → "LEVEL ROOF"` |
| Tint band / roster | Tier-2, fully specified | absent (see *A-7 Deferred Features* above) |

**Why L1-2 is not excluded (was rescope WI-4):** the patch excluded L1-2 (Switchboard Section) as a containment construct, not a device. The engine reaches the same result differently — the switchboard **envelope** is an explicit L1 placement anchor (the L1 line anchors to the envelope bottom on S2 / utility pad on S1), so a device-Y scan never needs L1-2 filtered. With the envelope handled explicitly, adding L1-2 to the exclusion set is redundant; the 5-member set is superseded by the 4-member set.

### A-7 Open Work Items (carried from the retired rescope)

> WI-1…WI-6 all landed (A-7 symbol → this §A-7; composition rule → `sld_topology_rules_V1_0_0.md` §1; label mapping → `equipment_designation_legend_V1_0_0.json`; `geometry.level_lines` export + `SH-3-A7` preflight →). Two items remain open:

**WI-7 — SH-4 / SH-2 bounds check, bbox-derived (BLOCKED).** The patch's SH-4 formula assumed `0..content_w_px` bounds. The engine's level lines extend from `bb.minX − 40` — negative in the golden geometry — so SH-2/SH-4 as originally written would hard-fail the golden output (sheet-format drift). **Blocked on the 30×42-vs-36×48/60 sheet-format decision**; write the bbox-derived formula only after that lands. *(Referenced by `08_validation/lib/geometry_V1_0_0.mjs` and `08_validation/rules/sh_rules_V1_0_0.mjs` as "WI-7 (§14.3)".)*

**WI-8 — Failure-journal Class H migration (deferred, largely moot).** Class H journal entries were premature until the A-7 spec landed and the renderer read from it. Now mostly moot — the source journals this targeted were retired, so there is no linkage table left to migrate.

**§14.3 Failure-journal linkage** — *removed.* The issue-linkage table mapped these A-7 decisions to entries in the retired Lab/Hotel failure journals; those journals were deleted and the table went with them. Anchor retained for the `WI-7 (§14.3)` citation in `08_validation/lib/geometry_V1_0_0.mjs` / `rules/sh_rules_V1_0_0.mjs`.


---

## A-8. Equipment Label

The multi-line text block that identifies a piece of electrical equipment and states its key
ratings. Drawn beside every switchboard assembly (right-anchored) and, since Mayo's gen/fire-pump A-8 conversion, beside the L1-5 generator and L3-1 fire pump
devices (left/`start`-anchored, text grows right of the glyph); the symbol was defined to bind
beyond switchboards from the outset, and the device binding is that provision realized.

A-8 is fully **derived**, exactly as A-7 is: it carries **no topology instance**. Its content comes
from its host's `designation` + `data_fields`, and its geometry is computed at render time and
exported in the geometry block (`geometry.equipment_labels`, schema §14.8). See *A-8 Why No Topology
Instance* below — this is a hard constraint, not a convention.

> **Authored as-built** against `04_renderer/sld_viewer_engine_V1_0_0.html` `swText()`
> and the `_E_SLD_Equipment-info E01 / Standard` Revit family. Spec follows engine. A-8 is the
> promotion of L1-2's *Data Fields* block (§L1-2) into a placeable, bindable annotation — Mayo's
> decision 3. §L1-2 keeps its table (what a switchboard displays); §A-8 owns
> placement, binding, and export.

### Classification

| Property | Value |
|---|---|
| Class | A (placed annotation) |
| Layer | A (annotation) |
| Status | Complete |
| Connection ports | 0 — derived and host-bound; does not participate in the power-flow graph |
| Topology instance | **None.** Derived geometry-only (see below) |

### Host Classes

`bound_to_type` accepts three host classes from day one. `switchboard` and `device` are emitted;
`section` remains contract-ready (live in the contract, so adopting it needs **no schema change** —
exactly how `device` was adopted):

| `bound_to_type` | Host | Status |
|---|---|---|
| `switchboard` | `switchboards[].id` | **Emitted** — one record per switchboard (Mayo's ruling); `align:"end"` |
| `section` | `sections[].id` | Contract-ready; confirmed host class (Mayo: the same tag is used on switchboard sections) |
| `device` | `devices[].id` | **Emitted** — L1-5 generator + L3-1 fire pump; `align:"start"`, anchor at the first-line baseline LEFT end. (L0-1 and L3-3 — once named the intended device path — kept their DeviceTagPlacer TextNote stacks instead) |

⚠️ The in-rect section labels the engine draws (a 9px centered type label + 8px NEC-class tag, low
opacity) are **not** A-8 instances — different size, anchor, content, and only 1–2 lines against
A-8's four. Do not conflate them.

### Geometry

Four lines (five until the `aic` References line was removed entirely per Mayo),
stacked downward; right-anchored on switchboard hosts, left/`start`-anchored
on device hosts.

| Variable | Value | Notes |
|---|---|---|
| `label_anchor` | `(x, y)` | The **first line's baseline**, at the end `label_align` names: its **right end** on switchboard/section hosts (text grows leftward), its **LEFT end** on `device` hosts (text grows rightward). Downward from here either way |
| `label_align` | `end` \| `start` | SVG `text-anchor` — `end` for switchboard/section hosts, `start` for `device` hosts |
| `label_line_pitch` | 18 px | Step between successive lines; the label → line-1 step is 20 px (`first_line_pitch`,.1 — see the styling table below) |
| `label_line_count` | 4 max | Label + 3 lines; fewer after compaction (below) |

Line styling as built (these ARE the catalog's L1-2 card values):

| Line | Source field | Style | Step from previous line |
|---|---|---|---|
| 0 (`label`) | host `designation` | 12px, bold 700, **underlined** | — (sits at `anchor.y`) |
| 1 | `data_fields.rating` | 12px, **bold 700** | **20** (`first_line_pitch`) |
| 2 | `data_fields.voltage` | 12px regular | 18 (`line_pitch`) |
| 3 | `data_fields.wires` | 12px regular | 18 (`line_pitch`) |

The former line 4 (`data_fields.aic`, e.g. `65kAIC`) — which the catalog card never had — was
**removed entirely** (Mayo; schema §15 item 16): it no
longer draws and no longer exports, and `aic` joined the ignored `data_fields`. The switchboard
block stays right-anchored (`text-anchor="end"`; device blocks are `start`-anchored),
and the font family stays `'Courier New',monospace` — decision 7 scoped the alignment to
size/weight/underline/step only.

Device hosts source different fields, same styling grammar: L1-5 generator =
`designation` (falls back to the literal `GEN`) / `{kw}KW / {kva}KVA` combined / `voltage`;
L3-1 fire pump = `designation` / `{hp}HP` / **`{fla} FLA / {lra} LRA` combined on ONE line** /
`voltage_phase` — both combines exist because the family has exactly three `Line N Text` slots
after the label (Mayo decision).

✅ **Resolved.** The engine had diverged
from the catalog **three** ways — 13px line 0 / 11px the rest, line 1 not bold, and a uniform 18px
step. Mayo ruled the **catalog wins** ("adopted wholesale"), sequenced as its own change rather
than folded into the additive export so that export's "changed nothing" proof stayed
intact. Schema §14.8 was revisited in the same change-set: `line_pitch` keeps its meaning (step
between successive lines) and the new **optional** `first_line_pitch` carries the wider first step.

### Content Compaction (the trap)

`swText()` filters blank fields out **before** laying lines out: if `rating` is blank, `voltage`
slides up into slot 1. The Revit family, by contrast, has **fixed** slots. The export therefore
carries the **post-compaction** list — `label` = the first surviving line, `lines[]` = the rest, in
render order — so the viewer and Revit agree by construction rather than by coincidence.

This also sidesteps a known-unsolved add-in bug: writing `" "` to an unused `Line N Text` lands
without warning but Revit still renders a whitespace-only value as unset, so the family's authored
sample value prints anyway. Not currently live — all six switchboards across the three live cases
populate the three rendered fields (`lines.length === 3`), and the device-bound
hosts stay within the slots too: the fire pump reaches `lines.length === 3` only via the
fla/lra combined line, the generator sits at 2 — but latent.

Only the four named source fields are consumed. A host's other `data_fields` are ignored (Mayo
Crossing's `sw-101` carries a `ser` field that `swText` does not render; `aic` joined the ignored
set); the export must never become a generic `data_fields` dump.

### Revit Mapping

`_E_SLD_Equipment-info E01 / Standard`, whose four parameters are 1:1 with the four lines:

| A-8 field | Family parameter |
|---|---|
| `label` | `Label Panel Name` |
| `lines[0]` | `Line 1 Text` |
| `lines[1]` | `Line 2 Text` |
| `lines[2]` | `Line 3 Text` |

(`Line 4 Text`/`Line 4 References` was dropped from the family map with the aic-line
removal — the LOADED family never actually had it, which is why every older run warned
`parameter 'Line 4 Text' not found` twice.)

The family sat in the map at `sld_node_type: "TBD"` — it was always this symbol; it simply had no
symbol definition to point at until now.

### Anti-Patterns

| # | Anti-pattern | Correct |
|---|---|---|
| 1 | Adding A-8 entries to `topology.annotations[]` | Derived only — see below |
| 2 | Putting A-8 into `geometry.annotations` | Its own `geometry.equipment_labels` array (§14.8); that dict is FK-validated |
| 3 | Exporting the raw field set instead of the compacted list | Export what is rendered (see *Content Compaction*) |
| 4 | Dumping the host's whole `data_fields` | Four named fields only (`aic` ignored) |
| 5 | Treating the in-rect 9px section type label as an A-8 instance | Different symbol; see *Host Classes* |
| 6 | Left- or center-anchoring a **switchboard/section** block | Those use `text-anchor="end"` and grow leftward. Device-bound blocks are legitimately `start`-anchored and grow rightward — flipping THOSE to `end` is the same mistake mirrored |

### A-8 Why No Topology Instance

Adding A-8 entries to the golden's `annotations[]` would break the frozen oracle, and the failure
mode is worth recording so no future session retries it:

- `RenderManifest`'s constructor expects **every** `TOPO.annotations[]` entry on the sheet to be
  rendered, and `swText()` never calls `renderedIds.add(…)`. A-8 instances would therefore register
  as **DROPPED** → `layout_warnings` → `__audit` findings → `behavior_test.mjs` fails its "S1 audit
  clean" check, and S2's pinned count of exactly 2 warnings breaks too.
- Even with `renderedIds.add` wired, adding them edits the oracle's `annotations[]` (328 → 330) — a
  **content** change to the frozen oracle, categorically different from the geometry-block re-bless
  that Golden Re-freeze earlier freezes performed.
- The golden is confirmed A-7-free for the same reason (`{A-4:146, A-2:81, A-1:80, A-3:14, A-6:7}`,
  zero A-7). A-7 set the precedent; A-8 follows it.

Keeping A-8 out of `geometry.annotations` additionally preserves the parity count at 94 (folding it
in would make it 96) and avoids failing that dict's FK check against `topology.annotations[]`.
