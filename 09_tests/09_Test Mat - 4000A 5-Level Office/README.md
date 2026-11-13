# Test Mat — 4000 A office, 5 storeys, 1 sheet, all checkers clean

> **Canonical:** `09_tests/README.md` owns the standard project structure; this file describes only
> this project. Repo operations → `00_Docs/repo_runbook_V1_0_0.md`.

**Service** 4000 A / 480Y-277V (3000 kVA utility xfmr placeholder) · **Occupancy** office (NEC 2023) ·
**Devices** 113 · **Sheets** 1 (S1 / E-501) · **Engine rev** 1.0.22 · **Status** `in progress` — 5 Tier-3 halts open

Stated scope (2026-11-13): *4000 A service, 5-floor office, 4 power branches, 1 lighting, 2 mechanical,
step-down transformers, no emergency power.* Branch `test-mat`.

Seven 480 V risers (L1→L5, one MLO panel per floor) off a 4000 A GFP main. Each of the four power
risers taps a **75 kVA 480Δ-208Y/120V transformer + 250 A MCB panel on every floor — 20 step-downs**.
Full breaker table and Tier-2 defaults: `1_source/testmat_SLD_narrative_V1_0_0.md`.

| Output | Path |
|---|---|
| Drawing (light / dark) | `3_output/sheets/testmat_S1_light.png` · `_dark.png` |
| Composed Arch E1 page | `3_output/pages/testmat_S1_light__page.png` |
| Interactive viewer | `2_build/testmat_sld_viewer_V1_0_0.html` |
| Run record | `3_output/RESULTS.json` |
| EOR debt | `OPEN_ITEMS.md` |

## 1. Run it

```bash
cd "09_tests/09_Test Mat - 4000A 5-Level Office"
bash run_pipeline.sh
```

Needs `rsvg-convert` on PATH (`apt-get install librsvg2-bin`), or `SLD_RASTER=resvg`.
⚠️ Do NOT run `../../run_all_gates.sh` — this project touches no engine code. **The pipeline is the check.**

## 2. Verification (latest run)

- Phase 1+2: 0 errors / 0 warnings · Phase 3: **63 rules**, 0 errors / 0 warnings
- Audit: label_overlap 0 · glyph_collision 0 · out_of_frame 0 · feeder_crossing 0 · coverage 340/340
- Feeder overlaps 0 · feeder×feeder 0 · symbol clash 0 · tag×feeder HARD/TIGHT 0 · ticks detached 0
- Level bands: 0 line-through-device, 0 out-of-band. Datum-gap heuristic: 47/75 outside 180±250 px
  (tall 1200 px riser step needed for the per-floor tap clusters) — advisory, accepted, same class as project 06
- Composed scale **0.4144**, height-bound, in the 0.35–0.46 band

## 3. Registers this project touched

None. No engine change. Composed entirely from existing config keys (OFF-009, OFF-014, OFF-018, OFF-027).

## 4. Graduation status

- [x] Validation P1+P2 green
- [x] Layout + Preflight P3 green (63 rules)
- [x] Renders clean — no fallback boxes, nothing dropped
- [ ] EOR sign-off — blocked: `OPEN_ITEMS.md` has 5 halts (fault current, utility xfmr, feeder lengths, loads, SDS/240.21(C))
- [ ] Drawing quality — every checker 0 except the advisory datum gap

> This SLD is for design development and coordination. It requires review and seal by a licensed
> Professional Engineer before construction use.
