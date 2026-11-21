# Aquarium — 3000 A, assembly, 2 sheets, clean run, EOR owed

> **Canonical:** `09_tests/README.md` owns the standard project structure; this file describes only
> this project. Repo operations → `00_Docs/repo_runbook_V1_0_0.md`.

**Service** 3000 A, 480Y/277V (2500 kVA utility, derived) · **Occupancy** 58,000 SF aquarium, Levels 1-3 + Roof ·
**Devices** 68 · **Sheets** 2 (E-501 normal, E-502 emergency/standby)
**Engine rev** 1.0.22 · **Status** `in progress` — 7 Tier-3 halts open

Scope, every Tier-2/3 fill and the branch tables: `1_source/aquarium_SLD_narrative_V1_0_0.md`.
How the holes in the scope were filled: `5_docs/CHECKLIST_aquarium.md`.

---

## 1. Run it

```bash
cd "09_tests/09_Aquarium - 3000A"
bash run_pipeline.sh          # SLD_RASTER=none if no rsvg-convert/resvg is installed
```

One hand-edited input, `1_source/aquarium_build_topology.mjs`. Everything under `2_build/` and
`3_output/` is regenerated from it.

⚠️ **Do NOT run `../../run_all_gates.sh`.** No engine code was touched. **The pipeline is the check.**

---

## 2. What is on the drawing

- **E-501 (normal)** — utility → 4MSB-1-A 3000 A (65 kAIC): fire pump section ahead of the GFP main
  (NEC 695.4(B)); lighting riser L1→L3; 480 V power riser L1→L2→L3; 150 kVA → 2S-1-B sub-distribution
  fanning to 208 V panels on L1/L2/L3; 500 kVA → 2S-1-C 1600 A; cafe 400 A; 800 A mechanical on L1
  and Roof, each with an internal 45 kVA step-down; four ATS normal feeds to E-502.
- **E-502 (emergency/standby)** — GEN-1 1000 kW → E4MSB-1-A 2000 A → four ATSs, west→east LS (700),
  LR (701), EQ (owner-defined 702, animal life support), OS (702). Life Safety reaches all three storeys.

## 3. Layout decisions (all in `LAYOUT_CONFIG`, no engine change)

| Key | Why |
|---|---|
| `riser_step_standard: 1100` | the internal chain (800 A panel → 45 kVA → 208 V panel) stacks upward; at 650 2M-1-A crossed the Level 2 line |
| `floor_band_designations` incl. `4M-R-A` | puts the switchboard-fed roof panel directly on the Roof row |
| `feed_through_panels: {2P-1-B: left}` | 2P-1-B drawn butted beside 2S-1-B (same room); F-317 stays in the topology as an intentional skip — CV-14 reports its `feed_left` port as an INFO |
| `s2_level_line_pitch {2:2800,3:1250}` + `s2_shift_delta {2:1328,3:1328}` | **must be stated** — an empty `{}` replaces the golden defaults (every pitch 1250, shift 0) and misplaced the LS riser. Closed form: 4840 − 180 − 3332 = 1328 |
| E4S-1-A sub-distribution | the golden's LS pattern; a riser off a panel that also carries an internal chain runs through that chain |
| `ats_order` | engine prose map can't place 701 between LIFE SAFETY and EQUIPMENT on its own |
| `internal_chain_exit_nudge` / `chain_column_nudge` E4L-1-A/E2P-1-A −20 | clears the tap off the incoming F-356 lane |
| `a1_tag_placement`, `a1_long_run_midpoint` | three `2254` pills off their runs |

## 4. Registers this project touched

| ID | Title | Status |
|----|-------|--------|
| _None._ | The empty-`{}` override of `s2_level_line_pitch` / `s2_shift_delta` is a sharp edge worth an FL entry if it bites a second project (see `7_revisions/REVISIONS.md` R-002) | — |

## 5. Graduation status

- [x] Validation P1+P2 green — 0 errors, 0 warnings, 55 rules
- [x] Layout + Preflight P3 green — 0 errors, 0 warnings, **63 rules**
- [x] Renders clean — coverage 121/121 (S1) and 102/102 (S2), 0 drops
- [ ] EOR sign-off — ⚠️ blocked: `OPEN_ITEMS.md` §1 holds 7 halts
- [ ] Drawing quality — checkers clean except the accepted items in `ACCEPTANCE.md` §5
