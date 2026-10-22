# Test Codex — acceptance evidence

| Criterion | Target | Measured result | Measured by |
|---|---|---|---|
| Requested service and main | 3,000 kVA / 480 V; 4,000 A main | matches | `4_checks/check_scope.mjs` |
| Branch and floor counts | 3 lighting / 2 power / 3 mech; four levels each | 8 risers / 32 480 V panels | `check_scope.mjs` |
| Stepdown location and quantity | one per branch; Level 3 only | 8 dry-type TX, 8 local secondary panels, all L3 | `check_scope.mjs`, stage 12 level bands |
| Voltage continuity | Levels 1–4 remain 480 V; separate L3 stepdown taps | exact route endpoints verified | `check_scope.mjs` |
| Phase 1+2 | 0 errors / 0 warnings | 0 / 0 | pipeline stage 2 |
| Phase 3 | 63 rules; 0 errors / 0 warnings | 63; 0 / 0 | pipeline stage 5 |
| Coverage and drops | full / zero | full coverage / zero drops | snapshot audit, RESULTS latest run |
| Feeder overlaps and crossings | zero | zero | pipeline stages 8–9 |
| Symbol, text and feeder-tag clashes | zero | zero | pipeline stages 10–11, snapshot audit |
| Level membership and level-line clashes | zero outside / zero crossings | 0 / 0, 48 devices mapped | pipeline stage 12 |
| Tick attachment | zero detached | 0 across 48 ticks | pipeline stage 12b |
| Honest frame | 0 px phantom extent | 0 px | frame_honesty in stage 13 |
| Composed scale | report actual; avoid stale target | 0.6092, body text ~0.0698 in | pipeline stage 13 |
| Engineering review / construction release | resolve engineering inputs and PE review | 5 unresolved items; unreviewed | OPEN_ITEMS |

## Recorded diagnostic exceptions

Stage 12 reports `band_outside=24`: this measures distance to the datum (target 180 ±250 px), not incorrect floor membership. Sixteen Level 3 symbols are above their parent panel in the tall transformer tap chains; eight Level 1 panels sit above the service lineup. `out_of_band`, `line_through_device` and `orphan` are all zero. Physical level assignment is explicit in `level_map`, and the schematic power-flow spacing is not building elevation.

Stage 13 reports one sheet above the template’s old 0.35–0.46 scale target. The template itself documents this target as stale following engine 1.0.15. Larger actual scale is retained for legibility. No checker or engine threshold was changed.

Visual review: Codex, 2026-10-22, full-sheet PNG and Level 3 equipment region; all risers, branch lettering, eight tap columns and four level bands visible. Engineering ratings remain provisional.
