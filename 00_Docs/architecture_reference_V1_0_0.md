# SLD Capability Repository — Architecture Reference

> **This is the deep architecture reference** (it was the root `README.md` until 2026-10-21, when that became a short introduction) — per-file roles, the full dependency graph,
> and data-consumption maps. For a fast operational orientation (how to work here, what's implemented
> vs. spec-only, conventions, and gotchas), start with [`CLAUDE.md`](../CLAUDE.md).

---

## 1. Purpose

This repository defines a **deterministic, standards-driven system for generating electrical Single-Line Diagrams (SLDs)** from structured engineering inputs.

It is not a document library.
It is a **multi-layer capability system** composed of:

* **Specifications** → how systems are defined, drawn, and assembled
* **Contracts** → how systems are represented and exchanged
* **Inputs** → how real-world projects enter the system
* **Data layer** → engineering constants, schedules, and calculations
* **Validation** → correctness, completeness, and constructability
* **Rendering + Revit** → downstream execution environments

The long-term objective is to evolve from:

> drafting assistance

to:

> a **repeatable, auditable electrical system modeling and SLD generation pipeline**

---

## 2. System Overview (Execution Flow)

> **Canonical:** `00_Docs/project_instructions_V1_0_0.md` §1–§6 owns the stage behavior; this diagram is a summary.

```text
Narrative / Templates / Data Inputs
                ↓
        AI Generation Layer
                ↓
   Structured Topology (JSON Contract)
                ↓
     Validation Phase 1+2 (Schema + Electrical)
                ↓
   Layout Engine (sld_layout_engine_V1_0_0.md)
      Anchor-chain placement + compose-time page transform
      Adds geometry{} block to topology contract
                ↓
     Validation Phase 3 (Preflight — sld_preflight_V1_0_0.md)
      SH-2 through SH-6 geometry validation
                ↓
             SVG Output
                ↓
        Revit Translation Layer
```

### Core Principle

The **JSON topology is the system backbone**:

* AI produces it
* validation enforces it
* renderer consumes it
* Revit maps from it

---

## 3. Repository Structure

> **Canonical:** this §3 (+ §4) is the authoritative repository/counts reference; the root `CLAUDE.md` §3 table summarizes it. Keep the live counts (rule count, symbol/dataset counts) here.

Folders are numbered by pipeline stage. `06_deliverables/` (released SLDs), `10_failure_log/` and
`11_future_updates/` were added after the original layout, so the numbering is historical, not
strictly sequential.
`04_renderer/` is **implemented** — a data-driven layout engine
(`sld_engine.mjs` via `gen_engine.mjs`), a headless geometry CLI (`run_layout.mjs`, gates vs golden
at 0.0px), a snapshot/audit-capable reference viewer with the touch UI, the PNG/SVG
snapshot tool (`snapshot_html.mjs`), and full-page composition — title
block + drawing on page viewBox `0 0 4032 2880` — gated by G6 (composed-page PNG baselines,
`baseline_composed_sha256.txt`) and G7 (`check_titleblock_derivation.mjs`), plus G8
(`strip_compare.mjs`, additive-export proof) and G9 (symbol-catalog snapshot baselines); the full suite is
13 gates (G1, G5–G9 plus conformance-walk, gen-idempotent, sync-gate, parity, behavior, acceptance,
and gate 14 `checkname_diff.sh`, which asserts sync_gate still runs the checks it ran last time, by
NAME), commands in `04_renderer/README_engine.md`. 🚩 **There is no gate 13 and this suite compiles
nothing** — gate 13 (`build_gate.sh`, the C# build-and-test gate) and `--no-build` were deleted
2026-07-31 by separation Phase 7b together with their subject; the port is
`08_validation/toolkit_build_gate.sh` in **the toolkit repo** (private GitHub
`Barkie721/revit_dedarms_toolkit_system`, not cloned on this machine), and the 112 add-in unit tests are asserted **there**, not here. This paragraph said
"14 gates … gate 13" until 2026-08-03 (audit **A5**, swept by **FU-0014**). **The suite is 13 gates
whose highest number is 14** — gate numbers are arrival IDs, never renumbered.
`08_validation/` is **implemented** — `validate_topology_V1_0_0.mjs` CLI,
a flat 70-rule registry (incl. the SH geometry-preflight rules, CV-14, and SH-3-A7), and a green 2-case
hospital acceptance gate (`check_acceptance_V1_0_0.mjs`; the hospital WITH_GEOMETRY case runs
the SH preflight). See [`CLAUDE.md`](../CLAUDE.md) §4 for the implementation-status table.

```text
claude_sld_generator_system/
│
├── README.md                          ← short introduction (what it is, how to run it)
├── AGENTS.md                          ← pointer to CLAUDE.md for non-Claude agents
├── CLAUDE.md                          ← operational guide (start here)
│
├── run_all_gates.sh                   ← the 13-gate engine-regression suite (bash run_all_gates.sh [--quick])
│
├── 00_Docs/
│   ├── architecture_reference_V1_0_0.md  ← this file (deep reference)
│   ├── repo_runbook_V1_0_0.md          (CANONICAL for repo operations — gate commands, recovery, current task)
│   ├── project_instructions_V1_0_0.md  (current — canonical for composer behavior)
│   ├── dedarms_separation_decisions_V1_0_0.md  (the decisions behind moving the add-in to its own repo)
│   ├── drift_surfaces_V1_0_0.md        (the duplications no gate proves equal)
│   └── staleness_audit_2026-08-02.md   (dated audit record — the A/B/D/F finding IDs FU-0014 cites)
│
├── 01_inputs/
│   ├── defaults/                                   (the canonical DEFAULT single line — 2500 kVA narrative +
│   │                                                build script + README + REVISIONS; "run the default" means this)
│   ├── hospital_titleblock_data_V1_0_0.json        (title-block instance data for the composed hospital page)
│   └── templates/
│       ├── narrative_template_V1_0_0.md            (blank tier-tagged narrative template — carries test-run findings D-1..D-9)
│       ├── titleblock_template_30x42_V1_0_0.html   (generic 30×42 title block, neutral defaults — canonical)
│       └── titleblock_template_snapshots/          (PNG/SVG renders + manifest)
│
├── 02_specs/
│   ├── drafting/
│   │   ├── sld_topology_rules_V1_0_0.md
│   │   ├── sld_preflight_V1_0_0.md
│   │   └── sld_layout_engine_V1_0_0.md
│   ├── symbols/
│   │   └── sld_system_model_V1_0_0.md          (symbol ontology; §A-7 also holds the level-annotation design record + deferred Tier-2/3 design)
│   └── visual_reference/
│       ├── sld_catalog_V1_0_0.html        (interactive 35-symbol catalog; carries headless __snapshot/__audit hooks)
│       └── snapshot_catalog.mjs           (headless per-symbol PNG/SVG back-check tool — sibling of 04_renderer/snapshot_html.mjs)
│
├── 03_contracts/
│   ├── sld_topology_schema_V1_0_0.md   (current — as-built codification)
│   ├── conformance_walk_V1_0_0.mjs     (schema conformance walker — 08_validation precursor)
│   ├── geometry_schema_data.mjs        (the schema key-lists and enums the conformance walk and the SCHEMA rules share)
│   ├── current_state_manifest.json     (engine rev + pinned artifact shas — the authority sync_gate checks against)
│   └── published_drop/                 (the four files the toolkit repo imports + drop_manifest.json — the only seam)
│
├── 04_renderer/                        (layout engine + geometry CLI + snapshot/audit viewer & tool;
│                                        also check_titleblock_derivation.mjs, baseline_composed_sha256.txt,
│                                        snapshots_page/, snapshots_titleblock/ —  page composition)
│
├── 05_revit/                           (A SEAM POINTER, NOTHING ELSE — README.md only.
│   │                                    The add-in was promoted here → 13_addin/ on 2026-07-30
│   │                                    (Phase 4), then LEFT THIS REPO on 2026-07-31 (Phase 7b);
│   │                                    the 3 Python oracles went with it, to
│   │                                    tools/ in the toolkit repo.)
│   └── README.md                       (the was→is map — read it before assuming code lives here)
│
├── 06_deliverables/                    (released SLDs — finished single-lines no longer in test mode;
│                                        one subfolder per delivered project + DELIVERY.md; has its own README)
│
├── 07_data/
│   ├── excel/                          (10 authoritative source spreadsheets)
│   └── normalized/                     (12 automation-ready JSON lookup files — 12 datasets)
│       ├── feeder_schedule_V1_0_0.json
│       ├── 3_phase_transformer_feeder_schedule_V1_0_0.json
│       ├── mv_feeder_schedule_V1_0_0.json
│       ├── transformer_impedance_V1_0_0.json
│       ├── nec_table9_ac_resistance_&_reactance_V1_0_0.json
│       ├── c_values_lookup_V1_0_0.json
│       ├── fault_current_calc_V1_0_0.json
│       ├── nec_motor_fla_V1_0_0.json
│       ├── nec_standard_ratings_V1_0_0.json
│       ├── equipment_designation_legend_V1_0_0.json (current — C/EQ power, MSB/G/FP equipment, special_designations, level_code_labels)
│       ├── revit_SLD_family_map_V1_0_0.json
│       └── sld_sheet_templates_V1_0_0.json     (current)
│
├── 08_validation/                      (Phase 1+2 validator — implemented)
│   ├── validate_topology_V1_0_0.mjs    (CLI entry)
│   ├── check_acceptance_V1_0_0.mjs     (self-verifying 2-case hospital acceptance gate)
│   ├── sync_gate.mjs                   (doc/artifact/manifest sync checks — the sync-gate gate)
│   ├── checkname_diff.sh               (gate 14 — sync_gate's check NAMES vs the baseline below)
│   ├── sync_gate_checknames_V1_0_0.txt (the committed check-name baseline)
│   ├── run_mutants.sh                  (mutant-harness runner — outside the gate count, FU-0012)
│   ├── mutants_drop_staleness.mjs      (the mutant harness for the publisher-side staleness check)
│   ├── lib/                            (context / graph / report modules)
│   └── rules/                          (index_V1_0_0.mjs flat 70-rule registry +
│                                        schema/ti/cv/tv/sv/dv/sh/mig rule modules)
│
├── 09_tests/                           (its README.md is CANONICAL for the project standard)
│   ├── Hospital Example (Golden Case)/ (FROZEN ORACLE — flat, reached by literal path from
│   │                                    four repo tools; never restructured)
│   ├── _PROJECT_TEMPLATE/              (cp -r this to start a new project)
│   └── <Project>/                      (the standard — sorted by "can I regenerate this?")
│       ├── 1_source/                   (AUTHORED — narrative + build script, nothing else)
│       ├── 2_build/                    (regenerable — safe to delete)
│       ├── 3_output/                   (sheets/ pages/ zoom/ RESULTS.json)
│       ├── 4_checks/                   (check_lib + 7 checkers + probe + 2 generators + pipeline_steps)
│       ├── 5_docs/                     (HANDOFF + phase docs)
│       ├── 6_revit/                    (add-in run report + placement CSV)
│       └── 7_revisions/                (REVISIONS.md — feeds 10_failure_log/)
│
├── 10_failure_log/                     (regression-guard-driven failure record; README + template +
│                                        FL-XXXX register; has its own README)
│
├── 11_future_updates/                  (forward register — what's next; README + template +
│                                        FU-XXXX register, prioritized P0-P3 with effort and
│                                        readiness; mirror of 10_failure_log; has its own README)
│
└── 12_handoff/                         (session-to-session handoffs — HO-XXXX register + template;
                                         at most one entry per work stream is `open`)

                                        (13_addin/ IS GONE. The DEDARMS Revit add-in left this
                                         repo on 2026-07-31, separation Phase 7b, for its own repo
                                         — private GitHub Barkie721/revit_dedarms_toolkit_system,
                                         not cloned on this machine — with its
                                         own CLAUDE.md, gate suite and HO/FL/FU sequences.
                                         No gate here can see it; the contract drop
                                         (03_contracts/published_drop/) is the only seam.)
```

> **Note on §4 below:** the component descriptions use short layer names (specs, contracts, data,
> renderer, revit, validation, tests) that map to the numbered folders above
> (`02_specs`, `03_contracts`, `07_data`, `04_renderer`, `08_validation`, `09_tests`) — **except "revit", whose code now lives in the toolkit repo (`Barkie721/revit_dedarms_toolkit_system`, not cloned on this machine).**

### File Versioning Convention

All spec files and normalized data files carry a version suffix: `_V{major}_{minor}_{patch}`. The version is part of the filename — consumers reference the versioned filename, not a bare name. When a file is updated, the version increments and downstream consumers must update their references per the dependency graph (§5).

---

## 4. Core Components

### 4.1 Specs Layer

The specs layer contains four working files that cross-reference each other and consume the normalized data layer. Together they form the complete system definition from symbol geometry through composed topology to geometry computation and pre-render validation.

#### sld_system_model_V1_0_0.md

> **Canonical:** this file is the owner of the symbol taxonomy (L0–L3 / R-1..R-3 / A-1..A-8) and the 35/27/8 symbol counts; the root `CLAUDE.md` §5 summarizes it.

The electrical symbol ontology. Defines every symbol in the SLD library across topological layers L0–L3 (service entrance → terminal loads), routed elements R-1/R-2/R-3, and annotations A-1 through A-8 (A-7 Level Annotation and A-8 Equipment Label are both fully derived — geometry computed at render time and exported as `geometry.level_lines` / `geometry.equipment_labels`; neither carries a topology instance).

Defines:
- Class A (placed devices) and Class B (routed elements) symbol classifications
- Three-object connection model (Device A → Routed Element → Device B) — every power connection passes through a Class B routed element instance; no implicit lines
- Layer definitions (L0–L3, R, A) with fault current propagation and voltage drop accumulation context
- Parametric geometry, anchor points, bounding boxes
- Connection ports with naming grammar (prefix taxonomy + directional suffixes) and connection modes (terminal, inline, bus_tap, bus_splice, measurement, spur, anchor, termination, float)
- Connection mode compatibility matrix
- Data fields (rendered on drawing) and calculation fields (metadata for VD/FC analysis)
- Calculation field source traceability to the normalized JSON data layer (source types: user, schedule, lookup, calculated, utility)
- Reference SVGs and anti-pattern tables per symbol

Symbol registry: 35 symbols (27 complete, 8 placeholder — L0-2 MV Transformer, L1-5 Generator, L1-6 Draw-Out CB, L2-9 Bus Plug, L2-10 UPS, L2-11 Inverter, L2-12 PV Array, L2-13 Meter Stack).

Consumes:
- `feeder_schedule_V1_0_0.json`, `3_phase_transformer_feeder_schedule_V1_0_0.json`, `mv_feeder_schedule_V1_0_0.json` (schedule-sourced calc fields)
- `nec_table9_ac_resistance_&_reactance_V1_0_0.json` (R-1 Feeder impedance calc fields)
- `transformer_impedance_V1_0_0.json` (L2-2 Transformer %Z and X/R calc fields)
- `c_values_lookup_V1_0_0.json` (R-3 Busway fault current calc fields)
- `nec_motor_fla_V1_0_0.json` (L3-1 Fire Pump and L3-2 Motor FLA verification)
- `nec_standard_ratings_V1_0_0.json` (L2-1 Circuit Breaker frame/trip/AIC validation)
- `fault_current_calc_V1_0_0.json` (formula definitions for calculated fields)

Role:
> Electrical system ontology — defines what can exist on a drawing and how it connects

---

#### sld_topology_rules_V1_0_0.md

The assembly instruction set. Converts the symbol vocabulary from `sld_system_model_V1_0_0.md` into composed SLD structures. Eight sections covering the full composition lifecycle from dimension traceability through switchboard architecture to machine-checkable validation:

Defines:

- **Dimension Variables** — all composition dimensions trace to named variables from `sld_system_model_V1_0_0.md` (symbol-derived) or composition-derived constants. No raw pixel values. Includes symbol-derived dimension tables (L2-1 Circuit Breaker, L2-4 Panelboard, L2-2 LV Transformer, L2-5 Disconnect, A-1 Feeder Tag, A-2 Conduit Callout, R-2 Bus), composition-derived constants (tag_gap, inter_tag_gap, equip_gap, equip_stub, breaker_pitch_min, section_margin, switchboard_text_zone_w), and computed chain heights for all chain variants (224px minimum through 524px annotated transformer chain with L-path clearance).

- **§1 Composition workflow** — bottom-to-top build order following power flow (utility transformer → switchboard → panels/transformers/ATS → terminal loads). Three-tier decision authority framework: Tier 1 (autonomous/deterministic), Tier 2 (default with EOR override), Tier 3 (EOR-required input). Vertical ordering convention (Y position = power flow depth, not building elevation). Level line composition rules for physical floor annotation.

- **§2 Multi-section switchboard composition** — two-bus architecture (main bus → GFP → secondary bus). Section definitions for: Incoming, Metering, Fire Pump (NEC 695.4(B) — taps main bus ahead of main disconnect), MV Transformer (integrated and with-secondary-main configurations), Main Breaker, and Distribution (with multi-section splitting rules). Variant NP (Normal Power) and Variant EM (Emergency per NEC 700/701/702 with NEC-class section ordering). Spare/space breaker handling (L2-7). Bus rules, section boundary rules, switchboard text conventions, reference SVGs with full SVG code, and anti-pattern tables.

- **§3 Feeder data contract** — formal lookup contracts against `feeder_schedule_V1_0_0.json`, `3_phase_transformer_feeder_schedule_V1_0_0.json`, `mv_feeder_schedule_V1_0_0.json` with input keys, output field paths, and usage rules (CU/AL material transition at 90A/100A, parallel set progression starting at 300A, tag encoding conventions, max 500 kcmil single conductor). Two-hop transformer secondary lookup (kVA → feeder_type → feeder_schedule). Provisional fire pump feeder contract (NEC 695 + NEC 430 motor branch circuit sizing) and equipment connection sizing contract (NEC 220.18 with continuous load 125% factor).

- **§4 Tag & callout generation algorithms** — deterministic algorithms for A-1 feeder tag content and A-2 conduit callout text from schedule data. AWG/kcmil formatting rules. Single-set vs. multi-set callout syntax. Transformer secondary callout variant (SBJ replaces GND per NEC 250.102(C)(1)). MV callout variant (PVC label, copper-only, no voltage class in text).

- **§5 Feeder chain composition** — seven chain variants:
  - **A — Direct Panel** (L2-1 → R-1 → L2-4) — most common, 480V panels
  - **B — Transformer + Panel** (L2-1 → R-1 → L2-2 → R-1 → L2-4) — step-down 480→208/120V, two R-1 instances with T-suffix secondary tags
  - **C — ATS Feed** (L2-1 → R-1 → L2-3) — emergency/standby source input
  - **D — Terminal Load** (L2-1 → R-1 → L3-1/L3-2/L3-3) — fire pump, motor, equipment connection
  - **E — SPD Mode A** (L2-1 → R-1 → L2-6) — dedicated CB-fed surge protective device
  - **F — Inline Disconnect** (L2-1 → R-1 → L2-5 → R-1 → downstream device) — two R-1 instances with `stub_exempt` downstream stub
  - **G — Sub-Fed Panelboard** (L2-4 → R-1 → L2-4) — panel-to-panel sub-feed, no explicit breaker

  Five-step composition process: Instantiate Breaker → Instantiate Feeder → Bind Feeder Tag → Bind Conduit Callout → Place Load Equipment. Coordinate computation formulas with full dimension traceability. Tag side selection algorithm (alternating sides below `feeder_alt_threshold`). Flex port routing rules for L2-2 and L2-5 (horizontal feeder entry/exit via `flex_left`/`flex_right`). Spur attachment composition for SPD Mode B (lateral snap-on to panelboard corner, no feeder chain). Branch/feeder meter attachment via measurement mode (L2-8, non-interrupting CT clamp on R-1). Inline device tag convention with `stub_exempt` flag.

- **§6 Multi-source composition (ATS/Generator)** — three topology patterns converging at L2-3 ATS:
  - Pattern 1: Normal MDP → breaker → R-1 → ATS `source1_in` (standard feeder chain)
  - Pattern 2: Generator → R-1 → ATS `source2_in` (EOR-supplied conductor specs per NEC 445.13, generator feeder exemptions)
  - Pattern 3: ATS `load_out` → R-1 → Emergency Switchboard (§2 Variant EM)

  Port bindings, feeder sizing rules per pattern, and ATS data field population.

- **§7 Composition validation rules** — 30+ machine-checkable assertions in five categories with defined execution order:
  1. **Topology Integrity** (TI-1 → TI-4, SH-1) — graph connectivity, normal/emergency bus separation, unique designations, naming convention compliance, sheet reference validity
  2. **Connectivity Completeness** (CV-1 → CV-13) — port bindings, directionality, bus assignment, squiggle bindings, spur connections, sub-feed port exclusivity, cross-sheet squiggle binding
  3. **Tag Completeness** (TV-1 → TV-8) — feeder tags, conduit callouts, T-suffix validation, FC/VD annotation completeness, keynote completeness, squiggle text
  4. **Spur Validation** (SV-1 → SV-3) — lateral spur connections validated, target restrictions, attachment geometry
  5. **Data Consistency** (DV-1 → DV-15) — schedule cross-checks, breaker rating validation (NEC 240.6), bus bracing adequacy, AIC adequacy (NEC 110.9), transformer OCPD sizing (NEC 450.3(A)), emergency switchboard section ordering (NEC 700/701/702), FC/VD tag value consistency, cross-sheet feeder spec consistency

  Documented exemptions: generator feeders (DV-1/DV-2/DV-7/DV-8), sub-fed panelboards (DV-3/DV-11), spare/space breakers (CV-2/TV-1/TV-2), measurement-mode devices (CV-8/TI-1), MLO switchboards (DV-10), stub-exempt R-1 instances (TV-1/TV-2/TV-6), suppressed FC/VD tags (TV-5/TV-6), empty calc fields (TV-5/TV-6), cross-sheet stub segments (TV-1/TV-2/TV-6).

- **§8 Known Gaps** — deferred issues not blocking current SLD generation (see §7 Known Gaps below).

Consumes:
- `sld_system_model_V1_0_0.md` (symbol geometry, ports, connection model, global visual conventions)
- `feeder_schedule_V1_0_0.json` (LV feeder sizing, tag content, callout generation)
- `3_phase_transformer_feeder_schedule_V1_0_0.json` (transformer OCPD sizing, T-suffix tags, bonding jumpers)
- `mv_feeder_schedule_V1_0_0.json` (MV feeder sizing)
- `transformer_impedance_V1_0_0.json` (L2-2 calc field population in Variant B chains)
- `nec_standard_ratings_V1_0_0.json` (validation rules DV-3 breaker rating, DV-4 bus bracing, DV-11 AIC adequacy)
- `nec_motor_fla_V1_0_0.json` (fire pump feeder sizing contract)
- `equipment_designation_legend_V1_0_0.json` (validation rule TI-4 naming convention, §5 designation assignment)

Produces input specification for:
- `sld_layout_engine_V1_0_0.md` (dimension variables, chain height formulas, coordinate computation, multi-sheet composition rules)
- `sld_preflight_V1_0_0.md` (Phase 1+2 validation rules consumed as precondition; `switchboard_text_zone_w` variable — single authority for SH-6, active)

Role:
> Converts symbols → system topology; defines composition rules, dimension traceability, and machine-checkable validation

---

#### sld_preflight_V1_0_0.md

Phase 3 geometry validation. Machine-checkable assertions run after the layout engine on the schema-§14 geometry block. **Every rule is bound to the as-built coordinate model** (floating origin with valid negative coordinates, extent-derived `content_area`, compose-time page transform under which page fit is guaranteed by construction) — a "every anchor/bbox/vertex within `(0,0)..(content_w, content_h)`" bounds reading is deliberately NOT used, because it hard-fails the pixel-frozen hospital golden.

Defines:
- §1 Coordinate and extent model — floating origin, extent-derived `content_area`; no 0-anchored bounds assertions
- §2 Bounding box authority — device bboxes from `sld_system_model_V1_0_0.md` symbol geometry; L2-2 Transformer L-path expansion; auxiliary device exclusions (L1-2, L1-3, L1-4, L2-7, L2-8 excluded from SH-3); unknown-type fallback (anchor-only, SH-3 skip, warning)
- §3 Validation rules (SH-2 through SH-6): SH-2a geometry-block self-consistency (hard_fail); SH-2b predicted compose-scale legibility (info, new); SH-3 device envelope collisions (soft_fail); SH-4 annotation proximity envelope (info, new — WI-7 rewrite); SH-5 routed-element path sanity; SH-6 switchboard text-zone extent (**active**, finiteness-only at `info` — rescoped from hard_fail; activated when the §14.7 `sections` export landed)
- §4 Structured result contract (per-rule pass/fail, aggregate status, violation details) with `geometry.layout_warnings[]` integration (`"source": "preflight"` disambiguator)
- §5 Execution order · §6 calibration protocol (new assertions enter at `info` first)

Consumes:
- `sld_layout_engine_V1_0_0.md` (coordinate model §1, compose-time page transform §8 this file binds to)
- `sld_topology_schema_V1_0_0.md` (geometry block §14; topology collection structures — `devices[]`, `routed_elements[]`, `annotations[]`, `sections[]`, `switchboards[]`, `sheets[]`, `metadata`)
- `sld_system_model_V1_0_0.md` (annotation geometry variables: `tag_pill_h`, `tag_pill_w_std`, `hex_r`, etc.)
- `sld_topology_rules_V1_0_0.md` (`switchboard_text_zone_w` variable — single authority; validation execution order §7 as precondition)
- `sld_sheet_templates_V1_0_0.json` (sheet template dimensions)

Role:
> Phase 3 geometry validation — verifies spatial correctness of the layout engine's output before the renderer consumes it

---

#### sld_layout_engine_V1_0_0.md

The geometry computation engine, **as-built** (spec-follows-engine). Converts a validated topology JSON (no `geometry` block) into a fully-placed composition with computed `(x, y)` coordinates for every device, routed element, and annotation. Describes the shipped engine embedded in `04_renderer/sld_viewer_engine_V1_0_0.html`.

Defines:

- **§0 Scope & authority** — the geometry *output* contract is owned by schema §14 (eleven emitted keys — seven required plus four optional: `effective_px_per_inch`, `content_area`, `devices`, `routed_elements`, `annotations`, `level_lines`, `sections` (optional), `equipment_labels` (optional), `glyph_supplements` (optional), `bus_dots` (optional), `layout_warnings`); this document owns the placement *mechanism*.

- **§1 Coordinate model** — SVG y-down, power flow composes load-upward, service entrance anchors the bottom. **Floating origin** — no `(0,0)`-anchored content box; coordinates are unbounded in both signs (hospital golden anchors at `x = −739.5`, `y = −640`). `content_area` is extent-derived; `effective_px_per_inch` is constant 96 (the overflow reducer was never built).

- **§2 Dimension system** — all constants in a single `DIM` table. Composition **gaps** scale by the composition multiplier `SP = 3`; switchboard-internal dimensions are unscaled (§2.2). Riser steps are config-overridable (§2.3).

- **§3 Anchor-chain placement model** — replaces V1's two-pass pipeline wholesale: switchboard + bus placement, floor-anchor seeding (`computeChainYOverrides`, bottom-up riser accumulation), chain placement (`placeAllChains`), sub-feed placement (`placeSubFeeds`, fixpoint to `subfeed_max_depth`), internal chains (`placeInternalChains`), terminal sub-feeds, and level lines. Sheet behavior is selected by **role** (`normal` / `continuation` / `emergency`), not sheet id.

- **§4 `layout_config` reference** — the 18-key configuration surface (schema §19); all keys optional, absent → hospital-golden default (`sheet_roles`, `floor_order`, `floor_anchors`, `level_map`, `riser_step_*`, `subfeed_*`, `ats_xoffset_overrides`, `s2_level_line_pitch`, `s2_shift_delta`, …).

- **§5 `layout_hints` reference** — 2 heuristic toggles (schema §20): `terminal_subfeeds`, `subfeed_gutter_parents`.

- **§6 Level lines (A-7) — summary** — constants and the emergency-sheet fixed-pitch stack; the normative symbol lives in `sld_system_model_V1_0_0.md` §A-7 and the placement rule in `sld_topology_rules_V1_0_0.md` §1.

- **§7 Overflow policy — flag, never mitigate** — the engine emits typed warning records (`LEVEL_LINE_FIXED_PITCH`, `VERTICAL_OVERFLOW_WARNING`) and renders as instructed; it never auto-corrects. The `px_per_inch` reduction ladder was never built.

- **§8 Compose-time page transform** — `pageCore()` composes one sheet onto the Arch E1 page as a pure wrapper transform (the layout is never re-anchored). §8.1 page geometry (template-derived via `computeTB`); §8.2 the fit-by-construction transform algorithm (never upscales; hospital S1 `s = 0.5662`, S2 `s = 0.4841` — **measured at engine rev 1.0.15 (FU-0008) and still current at rev 1.0.16**, which moved no composed-page pixel (derived: `snapshots_page/audit.json` `viewer_revision` — which reads 1.0.17 today — and G6 / sync `[P6]` match all 6 composed baselines on disk). Previously 0.4454 / 0.3972, phantom-inflated by the `measureMarkupExtent` radius FU-0008 removed, FL-0007.)

- **§9 Geometry output contract** — defers entirely to `sld_topology_schema_V1_0_0.md` §14. Not emitted (stale V1 concepts): typed warning objects, `tap_positions`. (`sections` bounds left this list — schema §14.7.)

Consumes:
- `sld_topology_rules_V1_0_0.md` (dimension variables, chain height formulas, §2 switchboard composition, §1 level-line rule, §8A multi-sheet composition)
- `sld_system_model_V1_0_0.md` (symbol bounding boxes, port positions for anchor computation, §A-7 level annotation)
- `sld_topology_schema_V1_0_0.md` §14 (geometry-output authority), §19/§20 (`layout_config`/`layout_hints` contract)
- `sld_sheet_templates_V1_0_0.json` (paper dimensions, border, title block, content margin — page composition)

Produces:
- `geometry{}` block on the topology JSON contract (consumed by renderer and `sld_preflight_V1_0_0.md`)

Role:
> Converts validated topology → placed geometry; defines the anchor-chain placement model, the configuration surface, and the compose-time page transform

---

### 4.2 Contracts Layer

#### sld_topology_schema_V1_0_0.md

The contract recording what the engine and
the reference topologies actually produce and consume (spec-follows-engine). A
conformance walker (`03_contracts/conformance_walk_V1_0_0.mjs`) accompanies it; the `08_validation/`
validator implements its rules.

Defines:
- nodes (device instances with type, designation, data/calc fields)
- edges (R-1/R-2/R-3 instances with port bindings and attributes)
- annotation bindings (A-1 through A-6 with `bound_to` references)

Role:
> Core system contract — the JSON structure that AI produces, validation enforces, renderer consumes, and Revit maps from

---

#### Future Contracts

- `symbol_catalog.json` — machine-readable symbol registry (derived from `sld_system_model_V1_0_0.md`)
- `node_type_catalog.csv` — enumerated node types for schema validation
- `edge_type_catalog.csv` — enumerated edge types for schema validation
- `revit_family_map.csv` — Revit family → node_type linkage (see `revit_SLD_family_map_V1_0_0.json` in data layer)

Role:
> Machine-readable system definitions

---

### 4.3 Inputs Layer

#### Narratives

Structured system descriptions that define the electrical distribution for a specific project.
Consumed by the AI generation layer to produce the JSON topology contract. Filled narratives
live **under `09_tests/<Project>/1_source/`**, beside the `<p>_build_topology.mjs` that consumes
them — that folder is the authored half of the project, and everything downstream of it is
regenerable. (The golden case predates the standard and keeps its narrative flat, as
`hospital_SLD_narrative_V1_0_0.txt`.) A **blank narrative template** exists at
`01_inputs/templates/narrative_template_V1_0_0.md` (carrying the template-test-run defect
findings D-1..D-9 — reworded emergency-architecture options, corrected distance/tag semantics,
documented the `layout_config` embedding + `COMPOSITOR_HALT` contract representations):
the hospital golden's power-flow section skeleton with every field tagged by decision tier
(`[REQUIRED]` / `[T2-DEFAULT]` / `[T3-EOR]` / `[LAYOUT]`), the Tier-2 override ledger, the
Tier-3 halt inventory, the schema §19/§20 layout surface, capability limits, and a
completeness checklist. Only service kVA is mandatory — everything else defaults per
`project_instructions_V1_0_0.md` §1.2.

---

#### Title block template

`01_inputs/templates/titleblock_template_30x42_V1_0_0.html` — generic 30×42 ARCH E1 title block
with neutral defaults, plus rendered snapshots in `titleblock_template_snapshots/`. It is the
**canonical** template and the project-agnostic sibling of the hospital design-of-record
(`09_tests/Hospital Example (Golden Case)/hospital_titleblock_30x42_V1_0_0.html`, frozen).
The template is composed into the engine's full-page output
via a compose-time transform, populated from `01_inputs/hospital_titleblock_data_V1_0_0.json`;
maintained title-block captures live in `04_renderer/snapshots_titleblock/`.

---

#### Calculation workbook (planned)

A fault-current / voltage-drop calc workbook template (AI fills system structure and breaker
sizing; the engineer fills distances, power factor, routing; output is voltage drop + fault
current) is **planned but does not exist yet** — no `.xlsx` lives in `01_inputs/` today. The
`calc_fields` side of the contract (§4.4 data layer) is where those values are staged.

Role:
> Real-world project entry points — narrative (per example) + title block; calc integration planned

---

### 4.4 Data Layer

The data layer provides engineering constants, schedules, and calculation methodologies consumed by the specs layer. Source `.xlsx` files live in `07_data/excel/`; normalized JSON versions in `07_data/normalized/`.

#### 07_data/excel/

Source spreadsheets from which the normalized JSON files were derived. Retained for audit trail and manual verification.

---

#### 07_data/normalized/

Automation-ready JSON files. Each file includes `$schema`, `description`, `source_file`, and `generated` metadata for traceability. All files carry version suffixes per the file versioning convention (§3).

| File | Role | Primary Consumers | Key References |
|------|------|-------------------|----------------|
| `feeder_schedule_V1_0_0.json` | LV feeder sizing — maps ampacity tiers (20A–4000A) to conductor size/material, conduit, ground conductor, feeder tags for 3W and 4W configs | `sld_topology_rules_V1_0_0.md` §3–§5, `sld_system_model_V1_0_0.md` R-1 calc fields | NEC 310.15(B)(16) |
| `3_phase_transformer_feeder_schedule_V1_0_0.json` | Transformer OCPD sizing — maps kVA (3–1000) to primary/secondary OCPD, T-suffix one-line tags, bonding jumpers, GEC | `sld_topology_rules_V1_0_0.md` §3, §5 Variant B, validation DV-6 | NEC 450.3(A), 250.102(C)(1), 250.66 |
| `mv_feeder_schedule_V1_0_0.json` | MV feeder sizing — 2001–5000V and 5001–15000V classes, copper conductors in PVC underground duct | `sld_topology_rules_V1_0_0.md` §3 | NEC Table 315.60(C)(11) |
| `transformer_impedance_V1_0_0.json` | Dry-type transformer %Z and X/R ranges (15–500 kVA, Eaton-based) | `sld_system_model_V1_0_0.md` L0-1, L2-2 calc fields; `sld_topology_rules_V1_0_0.md` §5 Variant B | NEC 450, IEEE Std 141 |
| `nec_table9_ac_resistance_&_reactance_V1_0_0.json` | Conductor AC resistance, reactance, effective impedance (600V, 3φ, 60Hz, 75°C, dual-unit) | `sld_system_model_V1_0_0.md` R-1 Feeder calc fields (voltage drop) | NEC Ch. 9 Table 9 |
| `c_values_lookup_V1_0_0.json` | IEEE point-to-point fault current C-values for cable (by size/material/config/conduit) and busway (by ampacity/type/material) | `sld_system_model_V1_0_0.md` R-1, R-3 calc fields; `fault_current_calc_V1_0_0.json` | IEEE Std 241, IEEE Std 242 |
| `fault_current_calc_V1_0_0.json` | 3φ bolted fault current calculation template — IEEE P2P method (f → M → Isc), AIC rating logic with 95% safety factor | `sld_system_model_V1_0_0.md` calculated-source fields | IEEE Std 241, IEEE Std 242 |
| `nec_motor_fla_V1_0_0.json` | Motor full-load current — induction (0.5–500 HP) and synchronous (25+ HP) at standard voltages | `sld_system_model_V1_0_0.md` L3-1, L3-2 calc fields; `sld_topology_rules_V1_0_0.md` §3 fire pump feeder contract | NEC Table 430.250 |
| `nec_standard_ratings_V1_0_0.json` | NEC 240.6 fuse/CB ratings (15A–6000A), switch ratings, AIC tiers (10–200 kAIC) | `sld_topology_rules_V1_0_0.md` validation DV-3, DV-4, DV-11; `sld_system_model_V1_0_0.md` L2-1 calc fields | NEC 240.6, NFPA 70 |
| `equipment_designation_legend_V1_0_0.json` | Equipment tag naming convention: `[PowerType][Voltage][Equipment] – [Level] – [Identifier]`, plus `level_code_labels` (level-line label strings, read through by the engine). Adds NEC-517 `power_type` codes `C`/`EQ`, `equipment` codes `MSB`/`G`/`FP`, and a `special_designations` mechanism (exact-match allowlist + `FUT` infix) consumed by TI-4. | `sld_topology_rules_V1_0_0.md` §5 designation assignment, validation TI-4 (gating, error); engine level-line labels | — |
| `revit_SLD_family_map_V1_0_0.json` | Maps Revit detail-item families to SLD pipeline — family/type names, parameterized fields, sample values. 32 entries across 21 distinct families; `sld_node_type` on every entry except the 2 deliberate `null` placeholders (Conductor-ends/Stub, Transducer placeholder) — 23 node types covered, remaining placeable gaps L1-3 + L3-3 (no family authored). Equipment-info is **A-8**; level-floor is **A-7** (family carries usable params) | Revit translation layer | — |
| `sld_sheet_templates_V1_0_0.json` | Sheet template definitions — paper size, border, title block, content margins, zone graduations for each supported sheet format. Default: 30×42. | `sld_topology_rules_V1_0_0.md` multi-sheet composition (§8A), `sld_layout_engine_V1_0_0.md` §1 coordinate model + §8 page composition, `sld_preflight_V1_0_0.md` §1 extent model; engine TPL mirror (gate G7) | — |

---

### 4.5 Renderer

- JSON topology + geometry → SVG rendering
- Consumes the full contract: topology collections (devices, routed elements, annotations, switchboards, sections) + `geometry{}` block (anchors, path vertices, annotation positions, section bounds)
- Applies symbol geometry from `sld_system_model_V1_0_0.md` using device anchors from the geometry block
- Per-sheet rendering using `sheet_id` assignments and sheet template dimensions

Role:
> Visual generation engine

---

### 4.6 Revit

- import structured JSON topology data
- map to Revit families via `revit_SLD_family_map_V1_0_0.json`
- place drafting views

Role:
> BIM execution layer

---

### 4.7 Validation

Three-phase validation model with defined execution order:

- **Phase 1 — Per-sheet topology validation** (`sld_topology_rules_V1_0_0.md` §7): SH-1 sheet references, TI-3/TI-4 designations, CV-1 through CV-12 connectivity, TV-1 through TV-8 tag completeness, SV-1 through SV-3 spur validation, DV-1 through DV-14 data consistency
- **Phase 2 — Global cross-sheet validation** (`sld_topology_rules_V1_0_0.md` §7): TI-1 global reachability, TI-2 bus separation, CV-13 cross-sheet squiggle binding, DV-15 cross-sheet feeder spec consistency
- **Phase 3 — Geometry validation** (`sld_preflight_V1_0_0.md`, bound to the as-built coordinate model of `sld_layout_engine_V1_0_0.md`): SH-2 through SH-6 — geometry-block self-consistency, compose-scale legibility, device envelope collisions, annotation proximity, routed-element path sanity (SH-6 text-zone extent active). Structured result contract with per-rule pass/fail and `layout_warnings[]` integration.

A composition that passes Phase 1 + 2 is ready for the layout engine. After layout adds the `geometry{}` block, Phase 3 validates spatial correctness. A composition passing all three phases is ready for the renderer.

**Phase 1+2 are implemented** in `08_validation/`: `validate_topology_V1_0_0.mjs` runs a flat 70-rule registry (catalog rules incl. CV-14 + schema-V1.1 structural rules + MIG migration rules + the SH geometry-preflight rules incl. SH-3-A7) with a green 2-case hospital acceptance gate (`check_acceptance_V1_0_0.mjs`; the hospital WITH_GEOMETRY case runs the SH preflight); 14 tampered-topology negative probes were run-verified (not persisted as a test suite).

Role:
> System correctness enforcement

---

### 4.8 Testing

> **Canonical:** `09_tests/README.md` owns the project-folder standard; this section summarizes it
> and explains why each piece exists.

- golden cases (known-good topologies)
- expected outputs
- failure cases

Role:
> Stability + regression control

`09_tests/` holds two different things under two different rules. **`Hospital Example (Golden
Case)/`** is the frozen oracle — flat, reached by literal path from `run_all_gates.sh` (its `GOLD=`
variable), `sync_gate.mjs:27`, `check_acceptance_V1_0_0.mjs:53,62` and `04_renderer/check_titleblock_derivation.mjs:34`,
and never restructured. Everything else is a **working project folder**, scaffolded from
`_PROJECT_TEMPLATE/` and iterated freely.

#### What a project folder contains

```text
09_tests/<Project>/
├── README.md          what this is · how to run · file inventory · registers touched · graduation
├── ACCEPTANCE.md      criterion | target | current | MEASURED BY
├── OPEN_ITEMS.md      GENERATED from metadata.compositor_halts[] — do not hand-edit
├── run_pipeline.sh    17 stages, end to end
│
├── 1_source/          THE ONLY HAND-EDITED FILES
│   ├── <p>_SLD_narrative_V1_0_0.md
│   └── <p>_build_topology.mjs            (LAYOUT_CONFIG lives inside this)
│
├── 2_build/           100% regenerable · safe to delete · never hand-edit
│   ├── <p>_SLD_topology_V1_0_0.json      <p>_layout_config.json
│   ├── <p>_geom_block.json               <p>_SLD_topology_V1_0_0__WITH_GEOMETRY.json
│   ├── <p>_sld_viewer_V1_0_0.html        run.log
│
├── 3_output/          sheets/ · pages/ · zoom/ · RESULTS.json (appended per run)
├── 4_checks/          check_lib.mjs + 7 checkers + probe_region.mjs + 2 generators
├── 5_docs/            HANDOFF_<p>.md + phase docs
├── 6_revit/           add-in run report + placement CSV
└── 7_revisions/
    └── REVISIONS.md   every change requested after generation
```

**The organizing axis is "can I delete this and regenerate it?"** That is the question you are
actually asking when you look at a loose file and wonder what it is for, and it sorts every artifact
cleanly. `<p>` is the topology's `metadata.slug` — the value that actually names the rendered SVGs.

⚠️ `<p>_layout_config.json` is **generated**, not authored — written by the build script from a
`LAYOUT_CONFIG` literal inside it, so hand-edits are clobbered on the next run. It is written
**twice**, sidecar *and* embedded in the topology, and the **embedded** copy is what makes 63 rules
run instead of 55.

#### The `4_checks/` suite — why an ungated checker exists at all

Every one of these was written because something passed 63 rules and 0 errors while being visibly
wrong. **A clean checker run is not a clean drawing.**

| Stage | Tool | Sees what nothing else does |
|---|---|---|
| 8 | `check_feeder_overlaps.mjs` | collinear feeder-on-feeder overlap · exits outside the parent box |
| 9 | `trace_feeders.mjs` | feeder × feeder right-angle crossings |
| 10 | `check_symbol_clash.mjs` | feeder through its own symbol · tag on symbol · feeder through A-8 text |
| 11 | `check_tag_feeder_clash.mjs` | tag pill sitting on a feeder run (HARD/TIGHT) |
| 12 | `check_level_bands.mjs` | devices in the wrong band · level line through a panel |
| 12b | `check_tick_detach.mjs` | A-1 tick left floating after its pill moved across the run (FL-0008) |
| 13 | `check_page_scale.mjs` | the REAL composed scale — the pipeline's own `s_pred` is clamped at 1 |
| — | `probe_region.mjs` | what already occupies a region you want to move a tag into |

`--audit` does not cover them: its `label_overlap` is label × label, its `feeder_crossing` is
feeder × device, and it excludes level lines outright. Each checker's last line is
`RESULT <scope> key=value …`, which stage 14 parses into `3_output/RESULTS.json` — diff two runs
instead of re-reading a phase document.

⚠️ **Do NOT run `run_all_gates.sh` for a project.** That suite is engine regression against the
golden; a project touches no engine code and cannot move it. The pipeline is the check.

#### `7_revisions/` — the layer below the failure log

`REVISIONS.md` records **every** change requested after the drawing was generated, including vague
ones, verbatim, with a `scope` of `project-only` \| `engine-suspect` \| `preference` \| `wontfix`.
Most entries are project-local tuning and should die with the project. A few are the engine being
wrong — and you cannot tell which without the log, because you only ever see one project at a time.
OFF-021, OFF-028 and OFF-029 were three faces of one engine bug, found separately across four phases
and re-derived each time.

It **feeds** `10_failure_log/`, it does not replace it: FL is cumulative across every project, which
a per-project log structurally cannot be, and every `fixed` FL entry must name the guard that makes
recurrence loud. `7_revisions → FL-XXXX → FU-XXXX` is the promotion chain.

---

## 5. Dependency Graph

### Spec File Cross-References

```text
sld_system_model_V1_0_0.md ←──→ sld_topology_rules_V1_0_0.md
        │                                   │
        │                                   ├── produces input for sld_preflight_V1_0_0.md
        │                                   └── produces input for sld_layout_engine_V1_0_0.md
        │                                                          │
        └── defines symbols consumed by ────────────────────────── ├── consumes symbol bounding boxes
            sld_topology_rules_V1_0_0.md                           ├── consumes sld_sheet_templates_V1_0_0.json
            sld_preflight_V1_0_0.md (annotation geometry)            ├── geometry{} output authority: sld_topology_schema_V1_0_0.md §14
                                                                   └── produces input for sld_preflight_V1_0_0.md (Phase 3)

sld_preflight_V1_0_0.md
        ├── binds to sld_layout_engine_V1_0_0.md §1 (coordinate model), §8 (compose transform)
        ├── consumes sld_topology_schema_V1_0_0.md §14 (geometry block) + topology collections
        ├── consumes sld_system_model_V1_0_0.md (annotation geometry + symbol bounding boxes)
        ├── consumes sld_topology_rules_V1_0_0.md (switchboard_text_zone_w — single authority; validation execution order as precondition)
        └── consumes sld_sheet_templates_V1_0_0.json (sheet dimensions)
```

`sld_topology_rules_V1_0_0.md` depends on `sld_system_model_V1_0_0.md` for symbol geometry, ports, connection model, and global visual conventions. `sld_system_model_V1_0_0.md` references `sld_topology_rules_V1_0_0.md` for assembly instructions. `sld_layout_engine_V1_0_0.md` consumes dimension variables and coordinate formulas from `sld_topology_rules_V1_0_0.md`, symbol bounding boxes from `sld_system_model_V1_0_0.md`, and sheet dimensions from `sld_sheet_templates_V1_0_0.json`. Its geometry *output* defers entirely to `sld_topology_schema_V1_0_0.md` §14 (the as-built authority, spec-follows-engine). `sld_preflight_V1_0_0.md` consumes the geometry block produced by the layout engine, takes device bounding-box authority from `sld_system_model_V1_0_0.md` symbol geometry, binds to the layout engine's coordinate and compose models (§1/§8), and reads sheet dimensions from `sld_sheet_templates_V1_0_0.json`.

### Data Layer Consumption Map

```text
                    feeder_schedule_V1_0_0.json ◄──── sld_topology_rules_V1_0_0.md §3–§5, DV-1
                                                ◄──── sld_system_model_V1_0_0.md R-1 calc fields
                                             
3_phase_transformer_feeder_schedule_V1_0_0.json ◄──── sld_topology_rules_V1_0_0.md §3, §5-B, TV-3, DV-6
    
                 mv_feeder_schedule_V1_0_0.json ◄──── sld_topology_rules_V1_0_0.md §3
                     
              transformer_impedance_V1_0_0.json ◄──── sld_system_model_V1_0_0.md L0-1, L2-2 calc fields
                                                ◄──── sld_topology_rules_V1_0_0.md §5-B
                                             
nec_table9_ac_resistance_&_reactance_V1_0_0.json ◄──── sld_system_model_V1_0_0.md R-1 calc fields
   
                   c_values_lookup_V1_0_0.json  ◄──── sld_system_model_V1_0_0.md R-1, R-3 calc fields
                                                ◄──── fault_current_calc_V1_0_0.json (C lookup)
                                             
                 fault_current_calc_V1_0_0.json  ◄──── sld_system_model_V1_0_0.md calculated fields
                     
                     nec_motor_fla_V1_0_0.json  ◄──── sld_system_model_V1_0_0.md L3-1, L3-2 calc fields
                                                ◄──── sld_topology_rules_V1_0_0.md §3 fire pump feeder contract
                         
                nec_standard_ratings_V1_0_0.json ◄──── sld_system_model_V1_0_0.md L2-1 calc fields
                                                ◄──── sld_topology_rules_V1_0_0.md DV-3, DV-4, DV-11
                                             
         equipment_designation_legend_V1_0_0.json ◄──── sld_topology_rules_V1_0_0.md §5, TI-4
             
               revit_SLD_family_map_V1_0_0.json ◄──── Revit translation layer

              sld_sheet_templates_V1_0_0.json  ◄──── sld_topology_rules_V1_0_0.md §8A multi-sheet composition
                                                ◄──── sld_layout_engine_V1_0_0.md §1 coordinate model, §8 page composition
                                                ◄──── sld_preflight_V1_0_0.md §1 extent model
```

---

## 6. Development Priorities

> **Implementation status:** "spec complete" below refers to the **specification documents**, which
> are written and stable. Executable code is now built for the `04_renderer/` layout engine + SVG
> renderer/snapshot tooling and the `08_validation/` Phase 1+2 validator; the Phase 3 SH
> preflight rules run **inside** that validator (no standalone preflight step exists).
> Topology composition is currently
> performed by the AI layer per these specs; shipped code is the `04_renderer/` engine, the
> `08_validation/` validator, and the Revit add-in, **which now lives in its own repo** (private GitHub `Barkie721/revit_dedarms_toolkit_system`, since 2026-07-31; not cloned on this machine). See
> [`CLAUDE.md`](../CLAUDE.md) §4 for the full
> component-by-component status table.

1. `sld_topology_rules_V1_0_0.md` — spec complete. Annotation composition (A-4/A-5/A-6 — §5 Steps 6–7), multi-sheet composition (§8A), and `switchboard_text_zone_w` variable integrated. Pending: composition testing against golden cases
2. `sld_topology_schema_V1_0_0.md` — JSON netlist schema (formalizes the topology contract; as-built codification). §14 geometry block is now the as-built authority for the `geometry{}` block. Conformance verified against the hospital golden reference topology (conformance walk + validator acceptance gate).
3. `sld_layout_engine_V1_0_0.md` — as-built (spec-follows-engine). Anchor-chain placement model, `layout_config`/`layout_hints` configuration surface, flag-not-mitigate overflow policy, and the compose-time page transform; geometry output defers to schema §14
4. `sld_preflight_V1_0_0.md` — Phase 3 geometry validator (SH-2 through SH-6), rebound to the as-built floating-origin coordinate model and compose transform; new assertions enter at `info` severity first. Implemented in `08_validation/`
5. L2-9 Bus Plug symbol definition (`sld_system_model_V1_0_0.md`) — blocks busway composition (§8.2) and busway layout engine support
6. `revit_SLD_family_map_V1_0_0.json` — 32 entries across 21 distinct Revit families (variants, companions, and dual-role tuples account for the multiplicity — no "N of M families" ratio); exactly 2 entries are deliberate `sld_node_type: null` placeholders (Conductor-ends/Stub, Transducer placeholder). Remaining placeable gaps: **L1-3 + L3-3** (no Revit family authored yet). (`level-floor` is **A-7**, whose family carries usable params.)

---

## 7. Known Gaps

| Gap | Location | Impact |
|-----|----------|--------|
| Placeable node types L1-3 + L3-3 have no Revit family (the map's real gap list; the 2 `sld_node_type: null` entries — Conductor-ends/Stub, Transducer placeholder — are deliberate placeholders, not pending work) | `revit_SLD_family_map_V1_0_0.json` | Revit translation layer cannot auto-map these families until populated. (`level-floor` is **A-7**, whose family carries usable params — the add-in places the family rather than a detail line + TextNote) |
| Generator feeder sizing is manual EOR input | `sld_topology_rules_V1_0_0.md` §6 Pattern 2 | No automated lookup — outside `feeder_schedule_V1_0_0.json` scope (NEC 445.13) |
| L1-5 Generator, L1-6 Draw-Out CB, L2-9 through L2-13 are placeholders | `sld_system_model_V1_0_0.md` Symbol Registry | Port definitions and calc fields TBD — `sld_topology_rules_V1_0_0.md` §6 uses provisional port names. L1-5 placeholder also affects `sld_layout_engine_V1_0_0.md` §3 anchor-chain generator placement (provisional anchor offsets) and its symbol bounding box (provisional 110×110 (engine box; UNMEASURED — family not loaded) bbox). |
| Busway composition incomplete | `sld_topology_rules_V1_0_0.md` §8.2, `sld_layout_engine_V1_0_0.md` §3 | L2-9 Bus Plug placeholder, tap spacing algorithm, busway feeder sizing contract, busway callout format, and busway fault current propagation are TBD. Blocks busway-fed distribution projects. Layout engine cannot place busway tap-offs until L2-9 is defined; `sld_preflight_V1_0_0.md` correspondingly defers busway geometry validation pending L2-9. |
| Vertical overflow flagged, never mitigated | `sld_layout_engine_V1_0_0.md` §7 | Dense compositions may push the emergency-sheet level stack past the content extent. The engine flags it (`VERTICAL_OVERFLOW_WARNING`) but never rescales — physical-sheet fit is guaranteed downstream by the §8 compose transform; overflow degrades legibility, not fit. |
| Switchboard internal height is a reference constant | `sld_layout_engine_V1_0_0.md` §2.2 | 280px (two-bus) and 200px (MLO) are reference values, not derived from section content. Must be manually updated if switchboard internal layout changes. |
| Revit translation layer architectural gaps | `sld_topology_rules_V1_0_0.md` §8.4, `sld_layout_engine_V1_0_0.md` | Coordinate mapping (SVG px → Revit paper units), switchboard section boundaries, routed elements (R-1/R-2/R-3 as detail lines), annotation placement, and bus tee dots all need Revit-specific implementation. The recommended transform is `revit_scale_factor = 1 / effective_px_per_inch`. Does not block SVG pipeline. |

---

## 8. Principles

- Deterministic outputs
- Contract-driven system
- Separation of concerns
- Traceability (dimension variables, data source paths, NEC/IEEE references)
- Incremental growth

---

## 9. Usage Rule

> No file evolves in isolation — changes to any spec, contract, or data file must be evaluated against its consumers in the dependency graph (§5).

---

## 10. Disclaimer

Outputs must be reviewed by a licensed Professional Engineer.
