# Test Antigravity — 1000 kVA, 3 Levels, Fire Pump, Commercial, 1 Sheet, Clean Run

> **Canonical:** `09_tests/README.md` owns the standard project structure; this file describes only
> this project. Repo operations → `00_Docs/repo_runbook_V1_0_0.md`.

**Service** 1000 kVA / 480Y-277V, 1600 A GFP main · **Occupancy** commercial (assumed), NEC 2023 ·
**Sheets** 1 (S1 / E-501) · **Status** `in progress` — 4 Tier-3 halts open (EOR debt)

Stated scope: *1000kva service at 480V, there is a fire pump, no emergency system, 2 plug load panels at 208v, 2 lighting branches at 208 v, 4 mehcanical branches ( one is 208V). there are 3 levels.*

### Key Architecture Features
1. **Fire Pump Tap:** Connected ahead of the main service disconnect on the switchboard main bus per NEC 695.4(B) (non-negotiable). Dedicated `fire_pump` section positioned between metering and main breaker sections.
2. **Main Switchboard:** 1600 A, 480Y/277V, 4W 3PH, two-level bus (1600 A main / 1600 A secondary). 1600AF / 1600AT LSIG main breaker with ground fault protection (NEC 230.95).
3. **Interleaved Distribution Lineup:** 7 distribution branches arranged `B, A, B, A, B, A, B` to separate 208V transformer-fed branches (Chain B) with 480V direct mechanical branches (Chain A), completely preventing adjacent transformer glyph collisions (`R-007`).
4. **Three Levels & Floor Banding:** Risers extend across Levels 1, 2, and 3 with `riser_step_standard: 650`, plumb verticals (`subfeed_straighten`), and A-7 level lines on S1.
5. **Plug Loads:** Exactly 2 plug load panels at 208V (`2P-1-A` on Level 1, `2P-2-A` on Level 2), fed via 75 kVA transformer `4T-1-P`.

---

## 1. Run it

```bash
cd "09_tests/08_Test Antigravity - 1000 kVA 3-Level"
SLD_RASTER=none bash run_pipeline.sh
```

---

## 2. Results Summary

- **Phase 1+2 Validation:** 0 errors, 55 rules run.
- **Layout & Phase 3 Validation:** 0 errors, 63 rules run, $s_{\text{pred}} = 1.000$.
- **Audit:** 0 label overlaps, 0 glyph collisions, 0 out-of-frame, 0 feeder crossings.
- **Geometry Checkers:** 0 collinear overlaps, 0 feeder crossings, 0 symbol clashes, 0 tick detaches, honest frame (0.00 px slack).
- **Composed Page:** Arch E1 sheet composed at full scale (1.0000).
