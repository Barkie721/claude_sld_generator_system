# Aquarium — 3000 A — working checklist

Owner scope (verbal, 2026-11-21): 58,000 SF aquarium, 3 storeys + roof, 3000 A service, fire pump,
1 MW generator with Life Safety / Legally Required / Equipment / Optional Standby.

Legend: ✅ done · 🟡 Tier-2 default chosen by compositor (EOR may override) · 🔴 Tier-3 halt (EOR owes)

## A. Repo review — how the tool works
- ✅ Pipeline: `1_source/<p>_build_topology.mjs` → topology JSON (+ embedded `layout_config`) →
  validator P1+P2 → `run_layout.mjs` geometry → merge → validator P3 (SH rules) → viewer → SVG/PNG
  snapshots → composed Arch E1 page → 7 geometry checkers → `RESULTS.json`.
- ✅ Closest priors: `03_Clinic AI Test - 3000A` (3000 A + 1000 kW gen + EM sheet with ATSs) and
  `08_Test Antigravity` (fire pump section ahead of main, 3-level floor-banded risers).
- ✅ Engine features needed and confirmed present: `fire_pump` section type; internal-chain pass
  (panel → internal CB → 45 kVA → 208 V panel); panel fan-out sub-feeds (golden `EQ4S-1-A`);
  `floor_band_designations` (switchboard-fed panel placed directly on Roof); `ats_order`
  (4 ATSs west→east LS, LR, EQ, OS).
- ✅ Data-layer rows exist for every size used: feeder tags 30004/16004/8004/4004/2254/1753/703/8003/2503,
  transformer rows 45/75/150/500 kVA, impedance rows 45/75/150/500 kVA.

## B. Holes in the scope, and how each is filled
| # | Hole | Fill | Tier |
|---|---|---|---|
| 1 | Service voltage | 480Y/277V 3Φ4W (every branch stated 480 V) | 🟡 |
| 2 | Utility transformer / available fault current | 2500 kVA, 5.75 %Z −7.5 % tol, infinite primary → 56.5 kA → 65 kAIC | 🔴 confirm |
| 3 | Main | 3000AF/3000AT LSIG, GFP per NEC 230.95 | non-negotiable |
| 4 | Fire pump size | 100 HP, 124 FLA / 725 LRA (NEC 430.250) | 🟡 |
| 5 | Fire pump OCPD | 800 A — next standard ≥ LRC, NEC 695.4(B)(2)(a) | 🔴 confirm |
| 6 | Fire pump on generator? | No — utility tap only; NEC 695.3(B)/(C) alternate source if AHJ deems utility unreliable | 🔴 |
| 7 | 480 V power riser rating | 400 A, MLO full-rated on L1/L2/L3 (feed-through) | 🟡 |
| 8 | 208 V power branch transformer size | 150 kVA → 2S-1-B 600 A sub-distribution (500 A MCB) → 225 A MLO panels L1/L2/L3 | 🟡 |
| 9 | 500 kVA branch secondary / panel | 1600 A MCB 208Y/120V panel 2S-1-C, L1 (schedule row 500 kVA) | 🟡 |
| 10 | "1 lighting branch, first and third" | 4L-1-A (L1) → 4L-3-A (L3), 225 A, riser passes L2 untapped | 🟡 rating |
| 11 | Mech L1 | 4M-1-A 800 A + internal 70 A → 45 kVA → 2M-1-A 150 A | stated / 🟡 |
| 12 | Mech Roof | 4M-R-A 800 A + internal 70 A → 45 kVA → 2M-R-A 150 A | stated / 🟡 |
| 13 | Cafe voltage | 400 A at 480Y/277V (no transformer requested) → 4K-1-A | 🟡 |
| 14 | Generator voltage / breaker / feeder | 1000 kW / 1250 kVA / 480Y/277V, 2000AF/1600AT LSI, tag 16004 | 🔴 NEC 445.13 |
| 15 | X"d | 0.12 pu worst case → 12.5 kA on EM bus | 🔴 confirm |
| 16 | Emergency architecture | Golden pattern: GEN-1 → E4MSB-1-A (2000 A) → one breaker per ATS; ATS normal side from 4MSB-1-A on cross-sheet feeders | 🟡 |
| 17 | Branch definitions for an aquarium | LS (700): egress lighting, FA, EM receptacles · LR (701): smoke control, sump/sewage ejectors · EQ (702, owner-defined): animal life-support — tank pumps, filtration, chillers · OS (702): cafe refrigeration, IT, POS | 🟡 |
| 18 | ATS sizes | LS 225 A · LR 400 A · EQ 800 A · OS 400 A | 🟡 |
| 19 | Generator capacity vs ATS sum | 1825 A ATS sum > 1503 A gen FLA → load management / shed priority LS>LR>EQ>OS (NEC 700.4(B), 701.4, 702.4(B)(2)) | 🔴 sizing study |
| 20 | Life Safety per floor | E4S-1-A sub-distribution → E4L-1-A (+ 45 kVA → E2P-1-A), E4L-2-A, E4L-3-A | 🟡 |
| 21 | Feeder lengths | not provided → no voltage drop, no A-5 tags | 🔴 |
| 22 | Connected load | not provided → no NEC 220 calc; 3000 A ≈ 43 VA/SF on 58,000 SF (plausible for an aquarium) | 🔴 |
| 23 | Designations | Legend grammar: E=700, L=701, O=702, EQ for the owner's "equipment" branch; S = sub-distribution panel | 🟡 |

## C. Build
- [x] Narrative `1_source/aquarium_SLD_narrative_V1_0_0.md`
- [x] Build script `1_source/aquarium_build_topology.mjs` (two sheets: E-501 normal, E-502 emergency)
- [x] `bash run_pipeline.sh` — P1+P2 0 errors; P3 **63 rules** (not 55)
- [x] Audit: no fallback boxes / drops; checkers reviewed
- [x] Visual review of both sheets; fix layout via `layout_config` only (no engine edits)
- [x] README / ACCEPTANCE / REVISIONS filled; `09_tests/README.md` row added
- [x] Commit + push to the session branch
