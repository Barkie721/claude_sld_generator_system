# Test Codex — 3,000 kVA / 480 V / Four Levels

Working design-development project on branch `test-codex`.

[Open the composed single-line PDF](3_output/pages/codex3000_S1_light__page.pdf) · [Drawing PNG](3_output/sheets/codex3000_S1_light.png) · [Full sheet PNG](3_output/pages/codex3000_S1_light__page.png) · [Interactive viewer (download and open)](2_build/codex3000_sld_viewer_V1_0_0.html)

Eight 480 V risers serve four levels: three lighting, two power and three mechanical. Each has one 480-to-208Y/120 V transformer tap on Level 3, for eight stepdowns total. The 480 V risers continue through Level 4. Main: preliminary 4,000 A GFP, supplied by a 3,000 kVA utility transformer.

| Branches | 480 V riser allowance | Level 3 transformer | Level 3 secondary MCB |
|---|---:|---:|---:|
| Lighting A/B/C | 250 A each | 75 kVA each | 250 A each |
| Power A/B | 600 A each | 150 kVA each | 500 A each |
| Mechanical A/B/C | 600 A each | 75 kVA each | 250 A each |

## Regenerate

Run `bash run_pipeline.sh` from this folder with Node and `rsvg-convert` on PATH. The project source is `1_source/codex3000_build_topology.mjs`; the narrative records the requested scope and assumptions. Run `node 4_checks/check_scope.mjs` after the pipeline. Optional PDF export requires CairoSVG: `python -m cairosvg 3_output/pages/codex3000_S1_light__page.svg -o 3_output/pages/codex3000_S1_light__page.pdf`.

The source script reads versioned repository feeder/transformer/impedance schedules and emits the topology and layout config. The scaffold pipeline regenerates the geometry, standalone viewer, SVGs, PNGs, audit and results. The reference/golden case, engine and published contracts are unchanged.

## Verification and review status

Phase 1+2: 0 errors / 0 warnings. Phase 3: all 63 applicable rules ran, 0 errors / 0 warnings. Drawing audit: all-zero findings, full coverage, no dropped entities. All feeder overlaps, crossings, symbol/text clashes and detached ticks are zero after bay spacing was corrected.

The datum-gap heuristic reports 24 devices farther than 430 px above their datum: 16 Level 3 transformer/secondary symbols in the tall tap clusters, and eight Level 1 panels above the service lineup. All 48 level-mapped devices are within their correct floor band; no level line crosses a device. This diagnostic is retained, not suppressed. Composed scale is 0.6092, above the template’s documented stale 0.35–0.46 band; this gives larger text, about 0.0698 inches at the nominal full sheet size. See `ACCEPTANCE.md` for acceptance evidence and exceptions.

Five engineering open items remain; see `OPEN_ITEMS.md`. This project is unreviewed and has not graduated to `06_deliverables`.

This SLD is for design development and coordination. It requires review and seal by a licensed Professional Engineer before construction use.
