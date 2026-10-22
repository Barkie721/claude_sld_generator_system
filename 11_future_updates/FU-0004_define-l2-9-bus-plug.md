# FU-0004 — define L2-9 Bus Plug; busway distribution is blocked on it

| Field | Value |
|-------|-------|
| **ID** | FU-0004 |
| **Title** | Define the L2-9 Bus Plug symbol — the lead placeholder of the eight, and the one that blocks a whole distribution type |
| **Proposed** | 2026-07-25 |
| **Proposed by** | `Claude` |
| **Status** | `proposed` |
| **Priority** | `P2` |
| **Effort** | `XL` |
| **Readiness** | `blocked:EOR` |
| **Category** | `symbols/spec` |
| **Component** | `02_specs/symbols/sld_system_model_V1_0_0.md`, `02_specs/visual_reference/sld_catalog_V1_0_0.html`, `04_renderer/sld_engine.mjs` |
| **Stage** | 2 Topology |
| **Decision tier** | `Tier 3 EOR-required` — symbol semantics and NEC treatment are engineering decisions |
| **Golden impact** | `golden-inert` — the hospital topology has no busway; a new symbol adds a code path nothing exercises |
| **Schema impact** | `additive` |
| **Version bumps** | system model + catalog + engine; the catalog re-freeze re-blesses G9 baselines |
| **Gates affected** | `G9` (catalog baselines re-bless), `conformance` if the schema gains a node type |
| **Depends on** | — |
| **Blocks** | any project using busway distribution |
| **Target** | `backlog` |

---

## 1. Problem

Eight of the 35 symbols are placeholders: L0-2 MV Transformer, L1-5 Generator, L1-6 Draw-Out CB,
**L2-9 Bus Plug**, L2-10 UPS, L2-11 Inverter, L2-12 PV Array, L2-13 Meter Stack.

L2-9 is singled out because it is the only one that blocks an **entire distribution type**. R-3 Busway
exists as a routed element, but without a bus plug there is no way to tap a load off it — so a busway
riser can be drawn and nothing can be connected to it. The others degrade a drawing; this one makes a
valid design undrawable.

## 2. Proposed change

Define L2-9 in the system model (semantics, ports, data fields, NEC treatment), add its catalog card,
and implement the glyph + layout behavior in the engine. Then the R-3 busway path becomes usable
end to end.

## 3. Scope

**In:** the L2-9 symbol definition, its catalog card, the engine glyph and layout rule, and whatever
port grammar a bus tap needs.

**Out (non-goals):**
- **The other seven placeholders.** Each is its own entry when its time comes. Batching all eight into
  one change is how an `XL` becomes unshippable.
- The Revit family (a follow-on entry once the symbol is defined — spec first, family second).

## 4. Acceptance criteria

- [ ] System model defines L2-9: semantics, port grammar for tapping R-3, required `data_fields`, and
      NEC treatment.
- [ ] Catalog card added and rendering; catalog re-frozen and G9 re-blessed.
- [ ] Engine draws L2-9 and routes an R-3 tap to it.
- [ ] A scratch busway topology validates clean and renders — proof the path works end to end.
- [ ] The hospital golden is byte-identical throughout.

## 5. Blast radius

Additive on paper, but it touches the three surfaces that must agree on any symbol — system model,
catalog, engine — plus the schema if a node type is added. The catalog is the **visual master**, so it
leads and the engine follows it, not the reverse.

The golden should not move at all (no busway in the hospital), which makes this unusually cheap to
verify: any golden movement is a bug in the change, not a consequence of it.

## 6. Verification plan

**Before:** `bash run_all_gates.sh` → 12/12, sync 16/16.
**After:** every gate green with **G9 re-blessed and nothing else moved**. G1 must stay 0.0000 and all
PNG baselines byte-identical — a new symbol that moves the golden means it perturbed shared layout
code. Re-bless G9 with `snapshot_catalog.mjs --all --theme both --audit` (`--all` is mandatory —
`--symbols` truncates the manifest) then regenerate `baseline_catalog_sha256.txt`.

## 7. Risks / open questions

- **EOR decision needed** on bus-plug representation and what a busway tap must carry (rating, plug
  type, tap-conductor treatment under NEC 368).
- The engine's layout rhythm is frozen on `slotWidth()` — a symbol with an unusual footprint may need
  a `BOX` entry chosen carefully rather than measured, since no family exists yet. Mark it
  `UNMEASURED` explicitly; FL-0002 is what happens when that is left unsaid.

## 8. Alternatives considered

- **Define all eight placeholders together** — rejected: unshippable in one pass, and only L2-9 blocks
  a distribution type. The others can be demand-driven.
- **Treat busway loads as direct panel feeds** — rejected: it draws a diagram that misrepresents the
  installation, which is the one thing this system exists not to do.

## 9. Links

- Related updates: FU-0003
- Specs / contracts touched: `CLAUDE.md` §11, `02_specs/symbols/sld_system_model_V1_0_0.md`
- Memory / session: 2026-07-25
