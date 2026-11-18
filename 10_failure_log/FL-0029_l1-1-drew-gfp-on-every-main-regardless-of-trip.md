# FL-0029 — the L1-1 renderer drew a GFP box on every main, whatever its trip unit

| Field | Value |
|-------|-------|
| **ID** | FL-0029 |
| **Title** | L1-1 main drawn with a GFP box and sensing lines even when its trip unit has no ground-fault element |
| **Opened** | 2026-11-18 |
| **Closed** | 2026-11-18 |
| **Status** | `fixed` |
| **Severity** | `S3` |
| **Stage** | 6 Render/Revit |
| **Component** | `04_renderer/sld_viewer_engine_V1_0_0.html` → `RENDER['L1-1']` (compiled into `sld_engine.mjs`) |
| **Failure class** | spec-value-deviation |
| **Detected by** | manual review — the compositor's visual check of project `09_Rainbow Clinic for Cat Wellness - 600A` (its ACCEPTANCE.md §5) |

---

## 1. Symptom
Project 09 has a 600 A service main `MAIN-CB` (trip `LSI`) and a generator-board main `EMSB-MAIN`
(trip `LSI`). Its sheet showed a `GFP` box with dashed sensing lines on both mains, contradicting the
project's NOTE-003, which says no GFP is provided below 1000 A.

## 2. Impact
The drawing showed ground-fault protection that the topology does not specify. NEC 230.95 requires
GFP only on service disconnects of 1000 A or more, so every sub-1000 A project, and any LSI
generator main, was misdrawn. The topology itself was correct, and so was the geometry export: the
box is render-only and is not in `geometry{}`. The hospital golden was unaffected, because both of
its mains are `LSIG`.

## 3. Root cause
`RENDER['L1-1']` drew the GFP box and sensing lines unconditionally. It keyed on `node_type` alone,
not on `data_fields.trip_type`.

## 4. Resolution
The box and sensing lines are now drawn only when `trip_type` contains `G` (e.g. `LSIG`). They are
still drawn when `trip_type` is absent, for back-compat. Engine rev 1.0.22 → **1.0.23**. Files:
- `04_renderer/sld_viewer_engine_V1_0_0.html`, regenerated into `sld_engine.mjs`
- the golden viewer byte-copy, as sync_gate [P1] requires
- `03_contracts/current_state_manifest.json` and the rev mirrors (`CLAUDE.md` §4, `04_renderer/README_engine.md`)
- `04_renderer/snapshots_page/{audit,manifest}.json` (revision stamp only; the page SVGs were byte-identical)

Project 09 was re-run: its sheet now shows 0 GFP boxes. Project 04's committed outputs are **not**
regenerated, because it is in the published drop (GOV-43). Its `EMSB-MAIN` is `LSI`, so a fresh run
would drop that one GFP box; its geometry, the only part of it in the drop, is unaffected.

Gates (`run_all_gates.sh --no-png`, the only mode this container supports): 9/9 green. G1 is
0.0000 px, G8 strip-compare is identical, and G7 passed when run directly. **G5, G6 and G9 were not
run**, because this container has no `rsvg-convert`. Run the full 13/13 on the owner's machine.

## 5. Regression guard
**None automated yet — stated plainly.** No gate compares the symbol drawn against `trip_type`. The
golden can't exercise it (both mains are LSIG), and G9's catalog does not render an LSI main.
Follow-up: add an LSI-main case to the symbol catalog or a behavior check (the golden's
`tests_V1_0_0/` is frozen, so it belongs elsewhere). Until then, project 09's ACCEPTANCE.md §5 row
is the only record.

## 7. Links
- Specs: NEC 230.95; project 09 NOTE-003
- Gates involved: G1, G8, sync-gate [P1]/[P4]/[P5]
