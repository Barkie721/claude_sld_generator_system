# 06_deliverables — Released Single-Line Diagrams

Where **finished, real-project SLDs live** — the ones no longer in test mode. Everything else in the
repo exists to *produce* what lands here: this is the output shelf.

This is deliberately **not** `09_tests/`. That folder holds two things: the hospital **golden case**,
a frozen oracle whose only job is to catch regressions in the engine, and the **working project
folders** where drawings are actually built and iterated. Neither is a deliverable, and nothing here
is a test fixture or a work in progress.

**The graduation story runs `09_tests/<Project>/` → here.** A project is composed, validated and
tuned in its `09_tests/` folder; when the five criteria below are met, its finished artifacts move
into a subfolder here. `09_tests/README.md` is canonical for what that working folder contains —
and it is deliberately shaped so the delivery packet accumulates during the work rather than being
assembled at the end.

---

## What lives here

**One subfolder per delivered project.** A deliverable is the self-contained package a designer would
actually hand off — the composed drawing plus the source-of-truth artifacts that produced it:

```
06_deliverables/
└── <Project Name>/
    ├── <project>_narrative_V1_0_0.txt              (the intake narrative it was built from)
    ├── <project>_topology_V1_0_0.json              (validated topology — the contract instance)
    ├── <project>_topology_V1_0_0__WITH_GEOMETRY.json (post-layout, geometry{} block attached)
    ├── <project>_sld_V1_0_0.html                   ← THE HTML SINGLE-LINE (self-contained interactive
    │                                                 viewer — the primary human-readable deliverable)
    ├── sheets/                                     (rendered SVG/PNG per sheet)
    ├── composed_pages/                             (full-page: title block + drawing, 4032×2880)
    ├── titleblock_data_V1_0_0.json                 (title-block instance data for this project)
    ├── revit/                                      (optional — RVT + add-in Placement Report CSV, if it
    │                                                reached Revit; audit with tools/compare_placement.py
    │                                                in the toolkit repo)
    └── DELIVERY.md                                 (the delivery record — see below)
```

**Where each file comes from.** A project scaffolded from `09_tests/_PROJECT_TEMPLATE` already holds
every one of these; graduating is a copy and a rename, not an assembly job:

| Here | From `09_tests/<Project>/` |
|------|---------------------------|
| `<project>_narrative_V1_0_0.*` | `1_source/<p>_SLD_narrative_V1_0_0.md` |
| `<project>_topology_V1_0_0.json` | `2_build/<p>_SLD_topology_V1_0_0.json` |
| `<project>_topology_V1_0_0__WITH_GEOMETRY.json` | `2_build/<p>_SLD_topology_V1_0_0__WITH_GEOMETRY.json` |
| `<project>_sld_V1_0_0.html` | `2_build/<p>_sld_viewer_V1_0_0.html` |
| `sheets/` | `3_output/sheets/` |
| `composed_pages/` | `3_output/pages/` |
| `revit/` | `6_revit/` |
| `DELIVERY.md` — issue/revision table | `7_revisions/REVISIONS.md` §1 |
| `DELIVERY.md` — open Tier-3 items | `OPEN_ITEMS.md` §1 (generated) |
| `DELIVERY.md` — validation + provenance | `3_output/RESULTS.json`, newest run |

`1_source/<p>_build_topology.mjs`, `4_checks/`, `5_docs/` and `2_build/run.log` stay behind — they
are how the drawing was made, not what was delivered. The working folder is not deleted on
graduation; it remains the thing you re-run when a revision comes in.

**The HTML single-line is the headline deliverable.** It is the rendered, self-contained interactive
SLD — the same form as the hospital's HTML viewer in `09_tests/` — that a designer or EOR actually
opens and reads. Every delivered project must include it. The topology JSON, `__WITH_GEOMETRY`, and
SVG/PNG sheets ship alongside it as the source-of-truth and print artifacts, but the `.html` is the
drawing.

Keep the Revit output (RVT / exported detail views) with the project too if one was produced, or note
in `DELIVERY.md` where it lives if it's too large for the repo.

---

## Graduation criteria — what earns a spot here

A project moves into `06_deliverables/` only once it has cleanly cleared the pipeline (CLAUDE.md §2):

1. **Validation P1+P2 green** — passes `08_validation/validate_topology_V1_0_0.mjs` with no errors.
2. **Layout + Preflight P3 green** — geometry attached; SH geometry rules pass on the
   `__WITH_GEOMETRY` topology.
3. **Renders clean** — no silent-skip fallback boxes; any overflow flag is either resolved or
   explicitly accepted and noted in `DELIVERY.md`.
4. **EOR sign-off recorded** — see the seal note below.
5. **Drawing quality measured, not asserted** — the project's `4_checks/` suite clean (or every
   exception named in `DELIVERY.md`), and its `OPEN_ITEMS.md` §1 empty. ⚠️ **A clean checker run is
   not a clean drawing** — every tool in `4_checks/` exists because something passed 63 rules and
   0 errors while being visibly wrong. Criteria 1 and 2 are exit codes; this one is the drawing.
   An empty `OPEN_ITEMS.md` §1 is also what unblocks criterion 4, since unresolved Tier-3 halts mean
   `unreviewed` by definition.

Criterion 5 was added 2026-07-28 with `FU-0009`; it is only checkable for projects scaffolded from
`09_tests/_PROJECT_TEMPLATE`, which is where `4_checks/` and `OPEN_ITEMS.md` come from.

If a project is still being iterated, it is **not** a deliverable yet — keep it in a working area, not
here. A subfolder appearing here is a claim that all five criteria above were met.

---

## Seal / EOR status (do not skip)

These are real drawings now, so the disclaimer stops being boilerplate. Every deliverable is, until a
licensed PE seals it:

> *"This SLD is for design development and coordination. It requires review and seal by a licensed
> Professional Engineer before construction use."*

`DELIVERY.md` must record the EOR review state — `unreviewed` / `EOR-reviewed` / `sealed` — and list any
open Tier-3 `COMPOSITOR_HALT` items (CLAUDE.md §6) the EOR still owes (e.g. generator feeder sizing,
fire-pump breaker rating). A deliverable with unresolved Tier-3 halts is `unreviewed` by definition.

⚠️ **The validator reports CLEAN on a halted topology** — 63 rules / 0 errors / 0 warnings says
nothing about that list. Do not read the halts off the exit code or off memory: the project's
`OPEN_ITEMS.md` is regenerated from `metadata.compositor_halts[]` on every pipeline run, and it is
the completeness record. Copy its §1 into `DELIVERY.md` verbatim.

---

## `DELIVERY.md` — the delivery record

One per project subfolder. Minimum contents:

| Field | Notes |
|-------|-------|
| Project | Name / job number |
| Delivered | YYYY-MM-DD |
| Schema | topology contract version (e.g. `1.0.0`) |
| Sheets | count + list |
| Validation | validator run result (green + date) |
| Seal status | `unreviewed` / `EOR-reviewed` / `sealed` + who / when |
| Open Tier-3 | any `COMPOSITOR_HALT` items still on the EOR |
| Overflow | any accepted vertical-overflow warnings |
| Notes | anything a downstream reader must know |

**Provenance (so the drawing can be regenerated) — record what produced it:**

| Field | Notes |
|-------|-------|
| Engine rev | `sld_engine.mjs` rev used (e.g. `1.0.0`) |
| Validator | `validate_topology_V1_0_0.mjs` version + rule-count |
| Data layers | the topology's `data_layer_versions` (every consumed lookup, pinned) |
| Add-in DLL | DEDARMS DLL sha, if the project reached Revit |

**Issue / revision history — released drawings get reissued; log each issue:**

| Rev | Date | Description | Seal status |
|-----|------|-------------|-------------|
| 0 | YYYY-MM-DD | Issued for coordination | unreviewed |

---

## Naming

- Project subfolder: human-readable project name (`Mayo Crossing Medical Center/`).
- Files inside carry the repo's `_V1_0_0` version suffix and pin the schema version they conform to.

---

## Delivered projects (index)

| Project | Delivered | Sheets | Schema | Seal status |
|---------|-----------|--------|--------|-------------|
| _None yet — first released SLD lands here._ | — | — | — | — |
