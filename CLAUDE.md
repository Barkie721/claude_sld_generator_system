# CLAUDE.md — SLD Generator System

Guidance for Claude (and developers) working in this repository — a lean operational guide.

> 🚀 **Starting a session? Read [`00_Docs/repo_runbook_V1_0_0.md`](./00_Docs/repo_runbook_V1_0_0.md)
> first.** It is the copy-pasteable operating manual — shell prelude, the 13 gate commands, recovery
> procedure, context-budget strategy, and the current outstanding task. **Canonical for repo
> operations**; the gate list in §9 below is a summary of it.

For the **deep architecture reference** (per-file roles, full dependency graph, data-consumption
maps), see [`00_Docs/architecture_reference_V1_0_0.md`](./00_Docs/architecture_reference_V1_0_0.md) (the root `README.md` is a short introduction for new readers). The Revit add-in **has its own REPO** since
separation Phase 7b (2026-07-31): the private GitHub repository `Barkie721/revit_dedarms_toolkit_system`,
called **the toolkit repo** or `DEDARMS Revit Toolkit` below. **It is not cloned on this machine**
(checked 2026-10-04); a path written `DEDARMS Revit Toolkit/…` in this folder is a path inside that
GitHub repo, not a local folder (older text placed it at `Mayo_Claude_Workspace/DEDARMS Revit Toolkit`,
which does not exist here). Its hub is that
repo's `CLAUDE.md` — the shipping-sha ledger plus an index into its `docs/` (platform · sld contract ·
sld pipeline · electrical · reports+lab · replay · ops — **seven** documents). **Read the hub, then
the one feature doc you are editing**, before touching C# code. ⚠️ **No gate here can see that repo
and no gate there can see this one** — the contract drop is the only seam.

**Where this repo sits.** Since 2026-10-21 it is a **standalone public repository**,
`Barkie721/claude_sld_generator_system`, whose history starts at a single initial commit (`e29b8c8`). It
was separated from the workspace repository `Barkie721/revit_electrical-dedarms_system`, of which it had
been a folder since `89e70e3` (2026-10-06); that copy was taken at the workspace repository's `5936fc5`.
⚠️ **The workspace repository still holds its own `claude_sld_generator_system\` folder, and the two
copies do not sync** — a change made in one is not in the other until it is carried across. The tool
repository `revit_electrical-content-generator_system` (pyDEDARMS) consumes this system
**only through its published artifacts and contracts** and treats it as a frozen upstream (its rule
GOV-43): a change here that alters a published artifact or contract is written up as a decision in
that repository before it is made, and is never made silently.

---

## 1. What this is

A **deterministic, standards-driven system for generating electrical Single-Line Diagrams (SLDs)**
from structured engineering narratives. It converts a prose description of a building's electrical
distribution (e.g. *"2500 kVA 480Y/277V hospital with a 2000 kW emergency generator"*) into an
**NEC-compliant JSON topology**, computes geometry, and ultimately places BIM content in Revit 2025.

- **Audience:** Professional Engineers / electrical designers / Revit specialists. Not a consumer tool.
- **Backbone:** the **JSON topology contract**. The AI layer produces it; validation enforces it; the
  layout engine adds geometry to it; the renderer and the Revit add-in both consume it.
- **Design ethos:** deterministic, auditable, standards-traceable. Every dimension, data lookup, and
  code requirement traces to a spec or data file.

---

## 2. Pipeline (six stages)

> **Canonical:** `00_Docs/project_instructions_V1_0_0.md` §1–§6 owns the stage behavior; this diagram is a summary.

```
Narrative (.txt/.md)  ──▶  [AI composition]  ──▶  Topology JSON (contract v1.0.0)
        │                                               │
        │                                    Validation Phase 1+2 (topology + electrical)
        │                                               │
        │                                    Layout Engine (two-pass) ── adds geometry{} block
        │                                               │
        │                                    Validation Phase 3 (preflight — geometry/bounds)
        │                                               │
        │                                    SVG Renderer (per sheet)
        │                                               │
        └─────────────────────────────────▶  Revit Translation (DEDARMS add-in → detail items,
                                             detail lines, annotations, level lines)
```

1. **Intake** — parse narrative; only mandatory ask is service kVA, default everything else.
2. **Topology generation** — emit JSON per the schema; apply Tier 1/2/3 decision authority.
3. **Validation P1+P2** — 30+ rules across 5 categories (per-sheet + global cross-sheet).
4. **Layout** — deterministic two-pass placement + collision resolution → `geometry{}` block.
5. **Preflight P3** — geometry/bounds validation (rules SH-2…SH-6).
6. **Render** — SVG per sheet → Revit families via the add-in.

---

## 3. Repository map (numbered stages)

> **Canonical:** `00_Docs/architecture_reference_V1_0_0.md` §3 is the deep repository reference (with the authoritative live counts — rule count, symbol/dataset counts, batch numbers). Edit counts there; this table is a summary. **The engine rev is the exception:** its authority is `03_contracts/current_state_manifest.json` `engine.rev`, and §4 below, `04_renderer/README_engine.md` and the viewer's `<meta revision>` are its mirrors, each checked by sync_gate `[P5]`. Change the rev in the manifest and the mirrors together, never in `00_Docs/architecture_reference_V1_0_0.md`.

| Folder | Role | Notes |
|--------|------|-------|
| `00_Docs/` | Runbook + project instructions | `repo_runbook_V1_0_0.md` — **canonical for repo operations** (gate commands, recovery, state, current task); `project_instructions_V1_0_0.md` — **canonical for composer behavior** (decision authority, non-negotiables, stage sequence) |
| `01_inputs/` | Template shelf | `defaults/` holds the **canonical default single line** (2500 kVA narrative + build script + `README.md` + `REVISIONS.md` — "run the default" means this folder; see §9); `templates/` holds the **generic 30×42 title block template** (`titleblock_template_30x42_V1_0_0.html`, neutral defaults — sibling of the hospital design-of-record in `09_tests/`) + its `titleblock_template_snapshots/` (PNG/SVG + manifest); `hospital_titleblock_data_V1_0_0.json` (title-block instance data consumed by the page composition); `templates/narrative_template_V1_0_0.md` (blank tier-tagged narrative template — only service kVA is `[REQUIRED]`, everything else defaults). Filled narratives live under `09_tests/<Project>/1_source/`, beside the `<p>_build_topology.mjs` that consumes them; a calc-workbook template is planned but **does not exist yet** |
| `02_specs/` | Specifications | `drafting/` (topology rules, layout engine, preflight), `symbols/` (`sld_system_model_V1_0_0.md` — the symbol ontology; its §A-7 also holds the level-annotation design record + deferred Tier-2/3 tint-band/roster design), `visual_reference/` (interactive 35-symbol catalog `sld_catalog_V1_0_0.html` + `snapshot_catalog.mjs`, its headless per-symbol back-check tool — see §9) |
| `03_contracts/` | Data contract | `sld_topology_schema_V1_0_0.md` — the JSON netlist schema (as-built codification) + `conformance_walk_V1_0_0.mjs`; `geometry_schema_data.mjs` (schema key-lists shared by the walk and the validator); `current_state_manifest.json` (engine rev + pinned artifact shas — what sync_gate checks against); `published_drop/` (the four files the toolkit repo imports + `drop_manifest.json` — **the only seam**) |
| `04_renderer/` | Layout engine + renderer tooling | **Implemented.** Data-driven layout engine `sld_engine.mjs` (compiled from `sld_viewer_engine_V1_0_0.html` via `gen_engine.mjs`), headless geometry CLI `run_layout.mjs` (gates vs golden at 0.0px), a snapshot/audit-capable reference viewer with the touch UI, the PNG/SVG snapshot tool `snapshot_html.mjs`, sheet roles/continuation sheets, multi-round config-driven sub-feeds, per-sheet floor stacks, and a silent-drop report, and full-page composition — title block + drawing composed at page viewBox `0 0 4032 2880` — with gates G6 (`baseline_composed_sha256.txt`, `snapshots_page/`, `snapshots_titleblock/`) and G7 (`check_titleblock_derivation.mjs`); plus `strip_compare.mjs` (gate G8 — additive-export proof) |
| `05_revit/` | **a seam pointer, nothing else** | `README.md` only. The add-in was promoted to `13_addin/` on 2026-07-30 (Phase 4) and **left this repo entirely on 2026-07-31 (Phase 7b)**; the 3 Python oracles went with it and are now `DEDARMS Revit Toolkit/tools/`. **The README is the was→is map — read it before assuming anything here still holds code.** |
| `06_deliverables/` | Released SLDs | Finished single-lines no longer in test mode — one subfolder per delivered project (narrative + validated topology + `__WITH_GEOMETRY` + rendered sheets + composed pages + `DELIVERY.md`). **Not** test fixtures (that's `09_tests/`). Graduation + seal criteria in its `README.md` |
| `07_data/` | Data layer | `excel/` (10 authoritative source tables) + `normalized/` (12 JSON lookup files — 12 datasets) |
| `08_validation/` | Validation code | **Implemented.** `validate_topology_V1_0_0.mjs` CLI + `lib/` + `rules/` flat 70-rule registry (incl. the SH geometry-preflight rules, CV-14, and SH-3-A7 from the A-7 export) + `check_acceptance_V1_0_0.mjs` (2-case hospital acceptance gate, green — the hospital WITH_GEOMETRY case runs the SH preflight) |
| `09_tests/` | Test cases + working project folders | Two different things, different rules. **Hospital Example (Golden Case)** — the **frozen oracle** (narrative, topology, HTML viewer, `tests_V1_0_0`, `snapshots`), flat by path because four repo tools reach into it literally; never restructured, never edited. **Projects** — every one scaffolded from `_PROJECT_TEMPLATE/` into 7 numbered subfolders (`1_source` … `7_revisions`, organized by "can I regenerate this?"): today, numbered since 2026-10-21, `01_Default 2500 kVA Service/` (a run of `01_inputs/defaults/`), `02_Sprouts Office Building - 2000A/`, `03_Clinic AI Test - 3000A/`, `04_Clinic AI Test - 3000A - One Sheet/` and `05_LCC Hotel - 1200A 208V/`; a new project takes the next number. Projects are working folders, **not** frozen. `SLD Master Template/` (a Revit capture) and `3000A 208V Service/` (FL-0026's former guard) were **removed 2026-10-21** on Mayo's instruction (in git at `32c3e2e` and `57383bf` respectively). The four flat pre-standard exercise cases were **deleted 2026-07-28** (§9). **Canonical: `09_tests/README.md`** |
| `10_failure_log/` | Failure log | Regression-guard-driven record of what went wrong and how it's now prevented. `README.md` + copy-me template + running register (`FL-XXXX` entries). Every `fixed` entry must name the gate/test/assertion that makes it loud on recurrence |
| `11_future_updates/` | Future updates | The forward register — what should happen next and what "done" looks like. Deliberate mirror of `10_failure_log/`: `README.md` + copy-me template + running register (`FU-XXXX` entries), prioritized `P0`–`P3` with Effort and **Readiness** (`ready` / `blocked:…`). A defect goes in `10_failure_log/`; an FL entry may *spawn* an FU when its fix is big enough to schedule |
| `12_handoff/` | Handoffs | Session-to-session handoffs: `README.md` + copy-me template + running register (`HO-XXXX` entries). At most one entry per work stream is `open` |

> Folders are numbered by pipeline stage; `06_deliverables/` (released SLDs), `10_failure_log/`,
> `11_future_updates/` and `12_handoff/` were added later, so the numbering is otherwise historical rather than strictly
> sequential.

---

## 4. Implementation status (read before assuming code exists)

The **specs, contracts, and data are mature.** Executable code now exists for the `04_renderer/`
layout engine + SVG renderer/snapshot tooling, the Phase 1+2 validator (`08_validation/`),
the Phase 3 SH geometry preflight (implemented **inside** the
`08_validation/` validator — there is no standalone preflight step in
`04_renderer/`), and the Revit add-in (**its own repo since 2026-07-31**). Topology composition is still exercised
by hand / by the AI layer per the specs.

| Component | Location | Status |
|-----------|----------|--------|
| Topology composition | AI layer (per specs) | Working (manual/AI) |
| Phase 1+2 validator | `08_validation/` | **Implemented** — `validate_topology_V1_0_0.mjs` + flat 70-rule registry (`rules/index_V1_0_0.mjs`; rules from `sld_topology_rules_V1_0_0.md` §7 incl. CV-14 + schema V1.1 structural rules + MIG migration rules + SH geometry-preflight rules incl. SH-3-A7), 2-case hospital acceptance gate green (both hospital cases); 14 tampered-topology negative probes run-verified (not persisted as a suite) |
| Layout engine | `04_renderer/` | **Implemented** — `sld_engine.mjs` rev **1.0.22** (compiled from `sld_viewer_engine_V1_0_0.html` via `gen_engine.mjs`; `run_layout.mjs` gates vs golden geometry at 0.0px). Data-driven layout (`layout_config` floor stacks, sub-feed risers, exit-comb pitches, NEC-class ATS ordering), symbol `BOX` = measured Revit family bboxes with the layout rhythm frozen on `slotWidth()`, and the schema-§14 geometry export (`devices` / `routed_elements` / `annotations` / `level_lines` / `sections` / `equipment_labels` / `glyph_supplements` / `bus_dots`) the Revit add-in consumes. Current add-in DLL sha: see `DEDARMS Revit Toolkit/CLAUDE.md` (**authoritative, and in another repo — this one records no shipping DLL sha at all since Phase 7b**). **As-built description → `04_renderer/README_engine.md`.** |
| Phase 3 preflight | `08_validation/` | **Implemented** as the SH geometry rules inside the validator registry (runs on WITH_GEOMETRY topologies). Spec: `sld_preflight_V1_0_0.md`. No standalone `04_renderer/` preflight step |
| SVG renderer | `04_renderer/` | **Implemented** — reference viewer renders SVG; `snapshot_html.mjs` rasterizes to PNG headlessly (`__snapshot`/`__audit` hooks) |
| Title block | `01_inputs/templates/` + `09_tests/` | **Implemented** — generic `titleblock_template_30x42_V1_0_0.html` (canonical, neutral defaults); hospital design-of-record `hospital_titleblock_30x42_V1_0_0.html` frozen in the golden case. Composed into the engine's full-page output (data: `01_inputs/hospital_titleblock_data_V1_0_0.json`; gates G6/G7; maintained captures in `04_renderer/snapshots_titleblock/`) |
| Revit add-in (DEDARMS) | **`DEDARMS Revit Toolkit/` — a separate repo since 2026-07-31 (Phase 7b)** | **Implemented** (C#, **100** source `.cs` files excluding `obj/`+`bin/`, recounted 2026-07-30; was 96 before separation Phase 5a). **TWO shipping assemblies since Phase 5b: `DEDARMS.dll` + the optional satellite `DEDARMS.Lab.dll`.** `DEDARMS` is organised into `Core/ Sld/ Electrical/ Reports/` feature folders (27/37/7/1 of its 72 `.cs`, recounted 2026-08-02); the 6 Lab files are their own project. Namespaces are unchanged and still `DEDARMS.*` throughout — the folders were a move, not a namespace change. **`DEDARMS.dll` dropped 16,824,832 → 7,803,392 bytes** when the 9 MB of Lab media left it |

---

## 5. The topology contract (the thing everything shares)

> **Canonical owners** (edit there; entries below summarize): the `geometry{}` block → `03_contracts/sld_topology_schema_V1_0_0.md` §14; the symbol taxonomy + the 35/27/8 symbol counts → `02_specs/symbols/sld_system_model_V1_0_0.md`; the 7 feeder-chain variants A–G → `02_specs/drafting/sld_topology_rules_V1_0_0.md` §5. (Letter-collision note: the system model's L2-7 "Variant A/B" is breaker *spare*/*space* — an unrelated axis from the feeder-chain A–G letters.)

Spec: `03_contracts/sld_topology_schema_V1_0_0.md`. Schema version `1.0.0` — the single accepted
declared version (`EXPECTED_SCHEMA = '1.0.0'`); anything else is reported as unrecognized.

- **Metadata** — project, NEC edition (2023), sheet template (30×42" Arch E1), `px_per_inch` (96),
  and `data_layer_versions` pinning every consumed data file.
- **Collections** — `sheets[]`, `devices[]`, `routed_elements[]`, `annotations[]`, `switchboards[]`,
  `sections[]`, `port_assignments[]`, `spur_attachments[]`, `measurement_attachments[]`,
  `cross_sheet_refs[]`, plus an optional `geometry{}` block added at layout time.
- **Connection model** — three-object edges: **Device A → Routed Element → Device B**. Every port
  connection is explicit; no implicit lines. Ports use a `[prefix]_[suffix]` grammar
  (`line_in`, `load_out`, `bus_out`, `feed_top`, `flex_left`, …).
- **Two field classes** — `data_fields` (rendered on the drawing) vs `calc_fields` (metadata for
  fault-current / voltage-drop analysis).

### Symbol / element taxonomy
- **L0–L3 layers:** L0 service entrance · L1 metering/GFP/ATS · L2 distribution (breakers, panels,
  transformers) · L3 terminal loads (motors, fire pump).
- **Routed:** R-1 Feeder · R-2 Bus · R-3 Busway.
- **Annotations:** A-1 Feeder Tag · A-2 Conduit Callout · A-3 Squiggle · A-4 Fault-Current Tag ·
  A-5 Voltage-Drop Tag · A-6 Hex Note · A-7 Level Annotation (derived — geometry-only, no
  topology instances; exported as `geometry.level_lines`) ·
  A-8 Equipment Label (derived the same way — the four-line equipment text block (five removed the aic line; right-anchored beside switchboards, start-anchored when device-bound to the gen/fire-pump);
  exported as `geometry.equipment_labels`, deliberately NOT inside
  `geometry.annotations`, which is FK-validated against `topology.annotations[]`).
- **7 feeder chain variants (A–G):** Direct Panel, Transformer+Panel, ATS Feed, Terminal Load,
  SPD Mode A, Inline Disconnect, Sub-Fed Panelboard.

---

## 6. Decision authority (how the AI composer must behave)

> **Canonical:** `00_Docs/project_instructions_V1_0_0.md` §2.3 (the tier framework) and §2.4 (the non-negotiable NEC code elements) own these; the lists below summarize.

- **Tier 1 — Autonomous:** deterministic algorithm, no pause.
- **Tier 2 — Default + override:** apply the documented default, log it, continue; EOR can override.
- **Tier 3 — EOR-required:** halt with a `COMPOSITOR_HALT` placeholder (e.g. generator feeder sizing
  per NEC 445.13, fire-pump breaker rating per NEC 695.4(B), project-specific feeder distances).
- **Never fabricate values.** A missing data lookup becomes a `DATA_LOOKUP_MISS` placeholder and
  escalates to Tier 3 — it is not guessed.

### Non-negotiable code elements (cannot be suppressed on request)
GFP on mains ≥1000A (NEC 230.95) · N-G bond at service entrance (NEC 250.24(C)) · utility meter ·
A-1/A-2 tags on every non-stub-exempt R-1 · emergency section ordering 700→701→702 ·
fire pump tapped ahead of main disconnect (NEC 695.4(B)). If asked to remove one: **refuse, cite the
NEC section, state the consequence in one sentence.**

> First generated output each session must carry the disclaimer: *"This SLD is for design development
> and coordination. It requires review and seal by a licensed Professional Engineer before construction use."*

---

## 7. Data layer

`07_data/excel/` holds 10 authoritative source tables; `07_data/normalized/` holds their JSON
counterparts — 12 files covering 12 datasets (with `$schema`, `source_file`, `generated` metadata). Normalized JSON is the
automation-ready form consumed by specs/calc fields. Key files: `feeder_schedule`,
`3_phase_transformer_feeder_schedule`, `mv_feeder_schedule`, `transformer_impedance`,
`nec_table9_ac_resistance_&_reactance`, `c_values_lookup`, `fault_current_calc`, `nec_motor_fla`,
`nec_standard_ratings`, `equipment_designation_legend`, `revit_SLD_family_map`, and
`sld_sheet_templates` (`V1_0_0`).

Equipment designations follow `[PowerType][Voltage][Equipment] – [Level] – [Identifier]`
(e.g. `4L-1-A` = 480V lighting panel, Level 1, instance A).

---

## 8. Conventions

- **Versioning is in the filename:** every spec/data file carries `_V{major}_{minor}_{patch}`
  (e.g. `sld_layout_engine_V1_0_0.md`). Consumers reference the versioned name. **Changing a file
  means incrementing its version and updating every downstream reference** — nothing evolves in
  isolation (see `00_Docs/architecture_reference_V1_0_0.md` §5 dependency graph).
- **Spec authority on divergence:** `sld_topology_schema_V1_0_0.md` §14 is the as-built authority
  for the `geometry{}` block (spec-follows-engine, per the V1.1 codification);
  `sld_layout_engine_V1_0_0.md` §9 defers to it for engine output.
- **Coordinate system:** top-left origin, **Y increases downward = power-flow depth** (NOT building
  elevation). `content_area` is extent-derived (not a fixed sheet size); `effective_px_per_inch` is
  constant **96** — the V1 overflow reducer (px/in step-down) was never built (`sld_layout_engine_V1_0_0.md`
  §2.3/§10). Overflow is flagged, never mitigated. Level lines: line **below** the equipment cluster
  (project-wide convention).
- **Tone:** senior-engineer voice — direct, precise, cite NEC sections, don't narrate pipeline stages.

---

## 9. Testing

> **Canonical:** `00_Docs/repo_runbook_V1_0_0.md` §4 owns the runnable gate suite (per-gate command +
> cwd table, `--quick`/`--no-png` semantics, re-bless recipes). The descriptions below explain what
> each gate is *for*; go there for how to run one.

**Golden-case policy: the hospital viewer in `09_tests` is a frozen oracle;
`04_renderer` is the only live line.** Never edit the hospital viewer to "fix" a divergence —
fix the engine and re-gate. The policy covers the golden case only: other project folders under
`09_tests/<Project>/` are working folders and are **not** frozen.

An automated regression harness exists (all run from the golden case):

- `04_renderer/run_layout.mjs --gate` — geometry gate vs the golden `__WITH_GEOMETRY` file
  (current: **max deviation 0.0000 px**, tolerance ±1 px).
- `09_tests/Hospital Example (Golden Case)/tests_V1_0_0/` — `parity_test.mjs` (element counts
  107/92/94 vs golden), `behavior_test.mjs` (52 checks — FU-0008 added 9, incl. the viewBox-vs-ink guard),
  `baseline_sha256.txt` (PNG baselines — **re-blessed 2026-08-01 for FU-0008**, golden
  refreeze batch 2; the ONLY deliberate golden pixel move since the baselines were laid down).
- `04_renderer/snapshot_html.mjs` — headless PNG/SVG snapshots (`--theme both --audit`);
  4/4 PNGs currently byte-identical to golden. Coverage audits via `--audit` / `__audit`.
- `02_specs/visual_reference/snapshot_catalog.mjs` — the same pattern for the **symbol catalog**:
  headless per-symbol PNG/SVG back-check (`--all --theme both --audit`, or `--symbols L2-1,R-3`).
  The catalog's own `window.__snapshot`/`__audit` hooks (in `sld_catalog_V1_0_0.html`) own the
  rendering; the tool only writes bytes. Use it to *see* a component without asking for a screenshot.
- `04_renderer/check_titleblock_derivation.mjs` (gate **G7** — asserts the composed title block
  derives from `sld_sheet_templates_V1_0_0.json` `30x42`) and composed-page PNG baselines in
  `baseline_composed_sha256.txt` (gate **G6**) — page/title-block composition regression,.
- `04_renderer/strip_compare.mjs` (gate **G8**) — **additive-export proof.**
  Regenerates geometry for the hospital golden case, strips the keys under test (`--strip`, default
  `sections,equipment_labels,glyph_supplements,bus_dots,annotations.*.label` — the four whole-key
  strips complete; the nested `annotations.*.label` path joined), and requires everything else to be identical to the frozen
  `__WITH_GEOMETRY` block — including key order and sub-tolerance drift. Exists because the other
  nets are **blind to a new geometry key**: G1 compares only device anchors + route vertices at
  ±1 px, and `parity_test.mjs` names only six keys, so both go green on a completely broken new
  block. Run before AND after any export addition.
- `02_specs/visual_reference/baseline_catalog_sha256.txt` (gate **G9**) —
  **symbol-catalog snapshot baselines** (108/108 PNG+SVG). The catalog is the VISUAL MASTER for
  symbol appearance. G9
  sha-verifies the committed snapshots against the frozen baseline; it does NOT re-render
  (`audit.json`/`manifest.json` are excluded — their `generated` timestamp moves every re-freeze).
  Re-bless after an intended catalog change with `snapshot_catalog.mjs --all --theme both --audit`
  then regenerate `baseline_catalog_sha256.txt` (recipe in `run_all_gates.sh`).
  The full suite is **13 gates** — G1, G5–G9 plus conformance-walk, gen-idempotent, sync-gate,
  parity, behavior, acceptance (there is no G2/G3/G4), and **gate 14, the sync-gate check-NAME
  baseline**; commands in `04_renderer/README_engine.md`. Full mode reports **13/13**, `--quick`
  **6/6** (derived: `run_all_gates.sh` has 13 `run "…"` call sites and pins `EXPECTED_GATES=13`).
  **Gate numbers are arrival IDs, not execution indices** — new gates append rather than renumber,
  which is why the suite is 13 gates whose highest number is **14**.

> 🚩 **THERE IS NO GATE 13, AND THIS SUITE COMPILES NOTHING.** Gate 13 (T0, the C# build gate,
> added 2026-07-30 by FU-0011) and `08_validation/build_gate.sh` were **both deleted 2026-07-31 by
> separation Phase 7b**, along with `--no-build`. They compiled `13_addin/`, which has left this
> repo for **the toolkit repo** (`Barkie721/revit_dedarms_toolkit_system`); the port lives there as
> `08_validation/toolkit_build_gate.sh` and is run by `bash 08_validation/run_toolkit_gates.sh`
> **in that repo**. Derived: `ls 08_validation/build_gate.sh` → *No such file or directory*.
> ⚠️ **Say the consequence out loud:** a green run here is silent about the Revit add-in in exactly
> the way the pre-FU-0011 "12/12 green" was. **Two repos, two suites, and neither reports on the
> other.** `run_all_gates.sh:17-35` states this at the source. **This bullet described the deleted
> gate in the present tense until 2026-08-03** (audit finding **A1/A2**, swept by **FU-0014**).
- `08_validation/checkname_diff.sh` (**gate 14**, added 2026-07-30 by decision D7) — asserts that
  sync_gate still runs the checks it ran last time, **by NAME**, against the committed baseline
  `08_validation/sync_gate_checknames_V1_0_0.txt` (**14 full · 12 quick** — derived by running
  `node 08_validation/sync_gate.mjs` and `--quick`; it read **24 full · 22 quick** until 2026-08-03,
  because Phase 7b deleted eleven checks and added one). Diff the names, never
  the totals. **It lives outside sync_gate on purpose:** a missing `lib/dll_embed_V1_0_0.mjs` makes
  sync_gate die with *zero* check lines and no `SYNC-GATE:` line (measured), and a self-check would
  die with it. ⚠️ **That particular import is gone** — Phase 7b deleted the two checks that used it
  and the lib with them — **but the shape is unchanged** and still applies to sync_gate's remaining
  imports. Both the bless and the compare refuse an empty capture. Re-bless deliberately with
  `bash 08_validation/checkname_diff.sh --bless` when you add or remove a check — never to clear a
  red you did not intend.
  ⚠️ **This gate touches no C# whatever, and two claims attached to it here were the deleted gate
  13's, not its own** (audit **A2**, swept by **FU-0014** 2026-08-03). Derived:
  `grep -c "DEDARMS\|dotnet\|csproj" 08_validation/checkname_diff.sh` → **0**. It shells out to
  `sync_gate.mjs` in both modes and diffs the captured check names against the baseline; that is
  all it does. **It writes nothing inside the repo**, compiles nothing, and has never had a
  `DEDARMS.Tests/bin`+`obj` EXIT trap. The `DEDARMS.Tests.csproj:91` three-level-climb rationale
  that stood here belonged to `build_gate.sh`, **and it is dead twice over**: that project is in the
  **toolkit repo** now, and the climb itself was deleted by Phase 7b (the csproj reads
  `..\fixtures\hospital_golden.json`, a local fixture). See **FU-0007 (toolkit)**, which still
  carries the same dead climb inside that repo's live gate script.
  It **never compares a DLL sha**: both shipping assemblies are build-location-dependent (measured),
  so a sha assertion could only ever be red. Carrying the right bytes stays sync_gate's job.

Beyond the harness: the golden-case topology + manual visual comparison via the HTML viewer.

- **Hospital (golden case)** — `09_tests/Hospital Example (Golden Case)/` — 128 devices,
  92 routed elements (88 R-1 + 4 R-2), 2 switchboards, 10 sections, 328 annotations. Files:
  narrative `.txt`, topology `.json`, topology `__WITH_GEOMETRY.json`, HTML viewer (frozen oracle),
  title block design-of-record, `bad_example_*` counter-example viewer, `snapshots/`, `tests_V1_0_0/`,
  and `Revit Tests Docs/` (ribbon and SLD-panel screenshots plus the run report, placement report and
  family-dimensions CSV from a Revit run of the golden).
- **Exercise cases — all four were DELETED 2026-07-28 on Mayo's instruction:**
  `3-Story Clinic - 1000 kVA`, `5-Story Hospital - 2500 kVA`, `9-Story Hospital - 2x2000 kVA` (the
  first project to need an engine change) and `Default 2500 kVA Service`.
  **`Default 2500 kVA Service` was then rebuilt and PROMOTED — its authored source is now the
  canonical default single line at `01_inputs/defaults/`** (narrative + build script + README), safe
  from any `09_tests/` cleanup. **"Run the default" means that folder;** scaffold
  `_PROJECT_TEMPLATE`, copy the two files into `1_source/`, `bash run_pipeline.sh`. Verified to
  reproduce topology, layout config and merged geometry byte-for-byte.
  ⚠️ It is a REFERENCE COMPOSITION, **not** a change to the Tier-2 intake defaults, which remain as
  stated in `project_instructions_V1_0_0.md` §2.3. Nothing executable depended on any of them: gates,
  sync, and acceptance reach only into the golden case, and their geometry checkers survive in
  generalized form in `09_tests/_PROJECT_TEMPLATE/4_checks/`. What is gone is **coverage and
  evidence** — those projects were the only exercises of the `layout_config` paths the golden cannot
  reach (continuation sheets, multi-riser floor stacks, NEC 517 emergency architecture, and the
  minimal Tier-2-defaults case), and their `PHASE*`/`HANDOFF*`/`REDESIGN*` docs were the derivation
  record behind engine revs 1.0.8 → 1.0.14. Those derivations are restated inline in
  `03_contracts/current_state_manifest.json`'s `engine.note` — read them there. **Git holds no copy:**
  the deletion predates the former SLD repository's first commit (`46cc2ab`, 2026-08-11), which is
now kept only in `../../_git-backups-2026-10-06/claude_sld_generator_system.git` — neither the workspace repository nor this standalone one holds any of that history. The only copy is the
  pre-delete tarball `sld_snapshot_pre-delete-09tests_2026-07-28.tgz`, last recorded on the owner's
  Android device (`/storage/emulated/0/Download/`); it is not on this machine (checked 2026-10-04).
  **A new engine change now has no regression case beyond the golden itself** — see
  `09_tests/README.md`.

> **Canonical:** `09_tests/README.md` owns the standard project-folder structure; the below is a
> summary.

**A new project is scaffolded, not assembled.** `cp -r 09_tests/_PROJECT_TEMPLATE "<New Project>"`,
put the narrative and its build script in `1_source/`, then `bash run_pipeline.sh`. Seven numbered
subfolders on one axis — **can I delete this and regenerate it?** — `1_source/` authored,
`2_build/` disposable, `3_output/` what you look at, then `4_checks/` `5_docs/` `6_revit/`
`7_revisions/`. The copy needs no rewiring: paths derive from the project root and the topology's own
`metadata.slug`.

Three per-project records the golden has no equivalent of: **`ACCEPTANCE.md`** (every criterion names
the tool that measures it — a blank there is the alarm), **`OPEN_ITEMS.md`** (generated; the Tier-3
halts the EOR still owes, which the validator reports nothing about), and
**`7_revisions/REVISIONS.md`** (every post-generation change request; `scope: engine-suspect` entries
are what `10_failure_log/` is mined from).

⚠️ **Do NOT run `run_all_gates.sh` for a project.** That suite is engine regression against the
golden; a project touches no engine code and cannot move it. `run_pipeline.sh` is the check, and its
17 stages end by writing `3_output/RESULTS.json` — diff two runs instead of re-reading a phase doc.

**Key insight:** the overwhelming majority of drawing defects are **renderer/layout bugs, not
topology errors**. Trust the topology; treat renderer changes as isolated, visually-regression-tested work.

### Renderer failure patterns to guard against
- **Silent skip** — every topology object must map to a renderer; unknown types throw + draw a red
  fallback box, never disappear (track intentional skips in a manifest).
- **Spec-value deviation** — geometry must reference spec constants; never hardcode offsets.
- **Coordinate decoupling cascade** — after any spatial fix, re-derive dependent annotation anchors;
  a tag sits *on* a feeder segment, not at a stale coordinate near it.
- **Level-line placement (Class H)** — anchor to physical floor references / rendered Y, not narrative
  floor names; size `RISER_STEP` for real clearance (50–80 px), not the 3 px geometric minimum.

---

## 10. The Revit add-in (DEDARMS) — quick orientation

Full details in `DEDARMS Revit Toolkit/CLAUDE.md` (the hub) and that repo's `docs/` (**seven**
feature documents). ⚠️ **It is a separate repo, with its own gate suite, its own handoff/FL/FU
sequences and its own `CLAUDE.md`.** Nothing below is asserted by any gate in THIS repo.
Essentials:

- **Two copies of the family map.** **TWO byte-identical copies exist** — `Sld\Resources\` (embedded in the DLL)
  and the `07_data/normalized/` one (canonical) — keep both in sync on content
  changes, and ship `07_data/excel/revit_SLD_family_map_V1_0_0.xlsx` in the same change-set.
  Map schema is `revit_family_map/v1.0`: optional per-entry `sld_node_variant`
  + root `variant_selectors` (LIVE — the L2-7 spare/space and L2-1 spare entries carry variants),
  and optional `sld_companion: true` (an ADDITIONAL family placed alongside the primary — three
  companion entries / two live uses: the L1-1 GFP's breaker glyph and the L1-4/L2-8
  meters' `_E_SLD_Transducer V01/Combined` CT-jaws+wire glyph; companion entries must
  stay out of the node-type dictionary, where last-wins would clobber the primary).

- **Stack:** C# / `net8.0-windows` / WPF (code-behind, **no XAML**) / Revit 2025 (Nice3point NuGet
  reference assemblies). Assembly namespace `DEDARMS`; ribbon tab "DEDARMS".
- **What it does:** reads a finished topology JSON, resolves `node_type → Revit family` via the
  embedded family map, computes/reuses geometry, and places detail items (+ `sld_companion` instances), detail lines (R-1/R-2),
  annotations, device glyph-text tags (`Services/DeviceTagPlacer.cs` — the L2-3 ATS /
  L2-2 transformer / L0-1 utility-transformer / L3-3 equipment-connection renderer-internal text
  stacks as multi-line 1/8" TextNotes, first line underlined), glyph-supplement linework (from `geometry.glyph_supplements` — the
  utility primary feed + squiggle), bus connection dots (from `geometry.bus_dots`, via
  `BusDotPlacer`), A-7 level lines (from `geometry.level_lines`, placed as the `_E_SLD_level-floor E01`
  FAMILY — Level Name + Length), A-8 equipment labels, and L1-2 section rects into a
  new drafting view + sheet. Secondary: read-only Electrical Dashboard, Room/Circuit CSV export.
- **Build:** `dotnet build -c Release` from `src/DEDARMS/` (and `src/DEDARMS.Lab/` for the
  satellite) — **both `(toolkit repo)`**, i.e. `DEDARMS Revit Toolkit/src/…`; the old
  `Revit Addins/…` root has not existed in either repo since Phase 7b (repointed 2026-08-02).
  ⚠️ **There is no longer a post-build copy step** — the `DeployAddin` xcopy was
  removed in separation Phase 5c because it staged the manifest but NOT the DLL, and because two
  assemblies now ship while only one is named in the manifest. Deploy with
  `deploy/install_dedarms.ps1` — **`(toolkit repo)`, at that repo's ROOT; `src/DEDARMS/deploy/`
  does not exist** (sha-verified, clears the mark of the web,
  `-SkipLab` to install without the cats). **This machine can only compile — runtime testing needs a
  Revit 2025 machine.**
- **Hard rules (non-negotiable):** modeless pane → `ExternalEvent` bridge (panes never call the Revit
  API directly) · `App.OnStartup` must not throw · **stable GUIDs** in `App.cs` + manifest never change ·
  preflight-validate families before entering the transaction group · partial-failure philosophy
  (one bad element skips + warns, never aborts the run).

---

## 11. Known gaps / limitations

> Most of these now have a tracked entry in `11_future_updates/` with priority, effort and readiness
> — see `update_register_V1_0_0.md`. This section states *what* the gap is; the FU entry states what
> closing it would take. The standalone-preflight item below is the exception: it is by design (§4),
> not outstanding work.

- **No standalone Phase 3 preflight step:** the SH geometry rules run inside the `08_validation/`
  validator, not as a separate `04_renderer/` stage. (The `04_renderer/` layout engine +
  SVG renderer/snapshot tooling and the `08_validation/` Phase 1+2 validator **are** implemented —
  see §4.)
- **Placeholder symbols (8 of 35):** L0-2 MV Transformer, L1-5 Generator, L1-6 Draw-Out CB,
  L2-9 Bus Plug, L2-10 UPS, L2-11 Inverter, L2-12 PV Array, L2-13 Meter Stack — busway
  distribution is blocked until L2-9 is defined.
- **Generator feeders:** no automated sizing (NEC 445.13) — all fields are EOR input.
- **The family map carries 32 entries across 21 distinct Revit families** (variants, companions,
  and dual-role tuples account for the multiplicity — do NOT quote an "N of M families" ratio, the
  old "22 of 24" framing conflated entries with families). Exactly **2 entries are deliberate
  `sld_node_type: null` placeholders** (`Conductor-ends / Stub or End cap`, the `Transducer`
  placeholder); every other entry carries a real node type — 23 node types covered. The remaining
  PLACEABLE gaps are **L1-3 (NG bond) and L3-3 (equipment connection)**: no Revit family authored yet.
  (`Equipment-info` is **A-8**; `level-floor` is **A-7**, whose family carries usable params
  (Level Name / Length / Level Elevation) — the add-in places the family (`LevelLinePlacer`)
  rather than a detail line + TextNote.
  `_E_SLD_Conductor-ends E01 / _Connection Dot` maps to R-2 and is placed by `BusDotPlacer`
  resolving it by explicit name — the `null` entry above is the family's *Stub or End cap* type.)
- **Vertical overflow splitting** deferred; dense compositions may exceed sheet height (warns).
- **Revit coordinate transform** not formally specified (recommended `revit_scale_factor = 1 / effective_px_per_inch`).

---

## 12. Glossary

**SLD** single-line diagram · **kVA** service capacity · **GFP** ground-fault protection ·
**N-G bond** neutral-ground bond · **ATS** automatic transfer switch · **EOR** engineer of record ·
**Feeder** breaker→equipment conductor set · **Switchboard** multi-section distribution lineup ·
**NEC 700/701/702** life-safety / legally-required-standby / optional-standby classes ·
**NP/EM** normal-power vs emergency switchboard variant · **Stub-exempt** R-1 whose spec matches
upstream (no separate A-1/A-2) · **Flex port** reversible port assigned at composition ·
**Cross-sheet ref** paired R-1 segments on different sheets linked by an A-3 squiggle.
