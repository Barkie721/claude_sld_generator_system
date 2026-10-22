# SLD Generator System

**Turn a plain-English description of a building's electrical service into an NEC-compliant
single-line diagram.**

You write something like *"2500 kVA, 480Y/277V, 3-storey commercial building with a lighting
transformer, a power transformer and a mechanical riser"*. The system turns that into a structured
model of the electrical distribution, lays it out, and draws the
single-line diagram (SLD) on a 30×42" sheet with a title block. The same model can then be placed in
Revit as native detail items by a separate add-in.

It is built for electrical engineers and designers, and it is **deterministic**: the same input
always gives the same drawing, and every dimension, lookup and code requirement traces back to a spec
or a data table in this repo.

> ⚠️ An SLD from this system is for design development and coordination. It requires review and seal
> by a licensed Professional Engineer before construction use.

---

## How it works

```
narrative (.md)
   │  1. compose   — the narrative becomes a topology JSON: every device, feeder and tag, explicitly connected (not automated, see below)
   │  2. validate  — 70 rules: topology, electrical (NEC), and cross-sheet consistency
   │  3. lay out   — a deterministic layout engine adds coordinates (a geometry{} block)
   │  4. preflight — geometry checks: nothing off the sheet, nothing colliding
   │  5. render    — SVG per sheet, then a full page with the title block
   ▼  6. Revit     — (separate add-in) places the same drawing as Revit families
drawing (.svg / .png)
```

The **topology JSON** is the backbone. Everything downstream reads it, and its format is defined in
[`03_contracts/sld_topology_schema_V1_0_0.md`](03_contracts/sld_topology_schema_V1_0_0.md).

**What you have to give it:** only the service size (kVA). Everything else has a documented default,
and each default is logged so an engineer can see and override it. Values the system must not guess,
such as available fault current, generator feeder sizing or feeder lengths, are left as clearly marked
**open items** for the engineer of record. They are never invented.

---

## What runs on code, and what doesn't

**Steps 2 to 5 are all code.** Validation, layout, rendering and the title block are plain Node.js
scripts. They call no AI service and make no network requests, and the same topology always gives the
same drawing.

**Step 1 is not automated.** No program in this repo reads a narrative and works out the devices and
feeders. A person, or an AI coding agent such as Claude Code, reads the narrative and writes a short
**build script** for that project (for example
[`01_inputs/defaults/default2500_build_topology.mjs`](01_inputs/defaults/default2500_build_topology.mjs)).
The build script is code. Once it exists, `run_pipeline.sh` runs the whole thing end to end with nobody
in the loop.

The rules for writing it, covering what is automatic, what takes a default and what must stop for the
engineer, are in [`00_Docs/project_instructions_V1_0_0.md`](00_Docs/project_instructions_V1_0_0.md).
An AI agent working in this repo picks them up through [`CLAUDE.md`](CLAUDE.md) and
[`AGENTS.md`](AGENTS.md).

So:
- **Running the included examples** needs nothing but Node.js and bash.
- **Drawing your own building** means writing its build script first, yourself or with an AI agent.

---

## Try it

You need a recent **Node.js** (tested on v24; there are no npm packages to install) and **bash**. On Windows,
Git Bash works.

```bash
git clone https://github.com/Barkie721/claude_sld_generator_system.git
cd claude_sld_generator_system

# make a project folder from the template and drop in the default 2500 kVA example
cp -r "09_tests/_PROJECT_TEMPLATE" "09_tests/06_My First SLD"
cp 01_inputs/defaults/default2500_* "09_tests/06_My First SLD/1_source/"

cd "09_tests/06_My First SLD"
SLD_RASTER=none bash run_pipeline.sh
```

This runs the whole pipeline and writes the results into `3_output/`:

| Look at | What it is |
|---|---|
| `3_output/pages/*__page.svg` | the finished sheet, with title block — open it in a browser |
| `3_output/sheets/` | the drawing itself, per sheet, in light and dark themes |
| `2_build/*_sld_viewer_V1_0_0.html` | an interactive viewer — open it in a browser to pan, zoom and inspect |
| `OPEN_ITEMS.md` | what the engineer of record still has to supply |
| `3_output/RESULTS.json` | the numbers from the run: devices, rules checked, errors |

`SLD_RASTER=none` skips the PNG images. If you have
[`rsvg-convert`](https://wiki.gnome.org/Projects/LibRsvg) installed, leave it off and you get PNGs too.

**Your own building:** copy the template again, and in `1_source/` write a narrative starting from
[`01_inputs/templates/narrative_template_V1_0_0.md`](01_inputs/templates/narrative_template_V1_0_0.md),
next to a build script modelled on the default's (see
[What runs on code, and what doesn't](#what-runs-on-code-and-what-doesnt)). [`09_tests/README.md`](09_tests/README.md) explains
the project folder in full.

---

## Examples in the repo

- [`01_inputs/defaults/`](01_inputs/defaults/) — the default: 2500 kVA, 480Y/277V, 3 storeys, one
  switchboard, three feeder branches. Its README explains every design choice.
- [`09_tests/`](09_tests/) — worked projects: an office building, two versions of a clinic, a hotel,
  and the **Hospital golden case** (128 devices, 2 switchboards, emergency power). The golden case is
  frozen, and the engine is regression-tested against it to 0.0 px.
- [`02_specs/visual_reference/sld_catalog_V1_0_0.html`](02_specs/visual_reference/sld_catalog_V1_0_0.html)
  — an interactive catalog of all 35 drawing symbols. Open it in a browser.

---

## Where things are

| Folder | What's in it |
|---|---|
| `00_Docs/` | the operating runbook, the composer rules, and the [full architecture reference](00_Docs/architecture_reference_V1_0_0.md) |
| `01_inputs/` | the default example, the narrative template and the title block template |
| `02_specs/` | how SLDs are drawn: symbols, feeder chains, layout and preflight rules |
| `03_contracts/` | the topology JSON schema, and the files the Revit add-in imports |
| `04_renderer/` | the layout engine, the viewer and the snapshot tools |
| `07_data/` | engineering tables (feeder schedules, transformer impedance, NEC tables) as Excel and JSON |
| `08_validation/` | the rule validator |
| `09_tests/` | the project template, worked projects and the golden case |
| `10_failure_log/` `11_future_updates/` `12_handoff/` | the defect log, the roadmap and session-to-session notes |

The Revit add-in (C#, Revit 2025) lives in a separate repository and is not included here.

---

## Going deeper

- [`00_Docs/architecture_reference_V1_0_0.md`](00_Docs/architecture_reference_V1_0_0.md) — every
  file's role, the dependency graph and the data-consumption maps.
- [`00_Docs/project_instructions_V1_0_0.md`](00_Docs/project_instructions_V1_0_0.md) — how a
  narrative becomes a topology: what is automatic, what defaults, and what must stop for an engineer.
- [`CLAUDE.md`](CLAUDE.md) — the working guide for developers and AI coding agents, including the
  13-gate regression suite (`bash run_all_gates.sh`) that guards the engine.
