# Design Brief — Medical Office Building, 4000 A Service, 5 Levels (V1_0_0)

Owner's scope, 2026-11-18 (paraphrased from voice): *5-story medical office building, 4,000 A
service, generator backup for life safety only and it is to be called **Emergency**; a power branch,
mechanical, lighting, a kitchen, EV panels; a unique single line; "I'll let you fill in the details."*

This brief is the **single source** for two workstreams: (A) the SLD pipeline project in this folder
and (B) the 3D Motion animation of the building. Equipment tags, ratings and physical locations below
are shared by both. If (A) must change a tag or rating to satisfy the validator or engine, it records
the change in §9 of this file.

> This SLD is for design development and coordination. It requires review and seal by a licensed
> Professional Engineer before construction use.

---

## 1. Building

- Occupancy: **medical office building (MOB)** — business occupancy, outpatient clinics, imaging
  suite, ground-floor café with a commercial kitchen. Not a hospital: **no NEC 517 essential
  electrical system**; the generator serves NEC 700 Emergency loads only.
- 5 storeys above grade, ~24,000 sf per floor (200 ft × 120 ft), ~120,000 sf total.
- Floor-to-floor 15 ft. Roof at +75 ft carries three RTUs inside a screen wall.
- Surface parking lot to the south with EV charging.

## 2. Service

- **4000 A**, 480Y/277 V, 3Φ 4W. Utility pad-mount transformer **XFMR-U**, 3000 kVA,
  12.47 kV — 480Y/277 V (FLA 3608 A → 4000 A main per NEC 240.6(A)). `[Tier-2]`
- CT metering section in the main switchboard. `[Tier-1]`
- Available fault current and utility %Z/X-R: **not provided** → Tier-3 HALT.
- Service lateral: feeder_schedule tag **40004** (underground, north side).

## 3. Main switchboard — 4MSB-1-A (Main Electrical Room, Level 1)

- 4000 A bus, 480Y/277 V; main 4000AF/4000AT LSIG **with GFP** (NEC 230.95, cannot be suppressed);
  N-G bond at service (NEC 250.24(C)); SPD on the bus (chain variant E).

### Distribution breakers (bus order — transformer chains deliberately separated by non-transformer chains)

| Tag | Trip | Branch | Feeds | Chain |
|---|---|---|---|---|
| CB-01 | — | SPD | SPD-1 (Mode A) | E |
| CB-02 | 225 A | Lighting A | 4L-1-A 225 A MLO (L1) → sub-feeds 4L-2-A 100 A MLO (L2) | A |
| CB-03 | 250 A | Power A | 4T-1-A 150 kVA → 2P-1-A 500 A MCB (L1) → sub-feeds 2P-2-A 225 A MLO (L2) | B |
| CB-04 | 225 A | Lighting B | 4L-3-A 225 A MLO (L3) → sub-feeds 4L-4-A 100 A MLO (L4) | A |
| CB-05 | 250 A | Power B | 4T-3-A 150 kVA → 2P-3-A 500 A MCB (L3) → sub-feeds 2P-4-A 225 A MLO (L4) | B |
| CB-06 | 100 A | Lighting C | 4L-5-A 100 A MLO (L5) | A |
| CB-07 | 175 A | Power C | 4T-5-A 112.5 kVA → 2P-5-A 400 A MCB (L5) | B |
| CB-08 | 600 A | Mechanical A | 4M-5-A 600 A MLO (L5 mech room; RTU-1/2/3 on roof) | A |
| CB-09 | 400 A | Mechanical B | 4M-1-A 400 A MLO (L1; elevators ELEV-1/2, domestic booster pump, exhaust fans) | A |
| CB-10 | 125 A | Kitchen | 4T-1-B 75 kVA → 2K-1-A 250 A MCB (L1 café kitchen) | B |
| CB-11 | 400 A | Imaging | DS-IMG 400 A fused disconnect (inline) → 4S-1-A 400 A MLO imaging sub-distribution (L1; CT, digital X-ray) | F |
| CB-12 | 600 A | EV — DC fast | 4S-S-A 600 A MLO EV distribution (site, NEMA 3R; 2 × 150 kW DCFC) | A |
| CB-13 | 175 A | EV — Level 2 | 4T-S-A 112.5 kVA → 2P-S-A 400 A MCB (site, NEMA 3R; 16 × L2 chargers with EVEMS per NEC 625.42) | B |
| CB-14 | 200 A | Emergency normal feed | E4A-1-A ATS **normal** input | C |

Sum of feeder trips 3725 A on a 4000 A bus. **No connected-load schedule was provided**; every rating
is a default size, not a calculated one.

## 4. Emergency system — NEC 700, "Emergency" (life safety only)

- Generator **GEN-1** (designation `E4G-S-A`), **100 kW / 125 kVA**, 480Y/277 V, diesel, outdoor
  sound-attenuated enclosure with sub-base tank, NFPA 110 Level 1, Type 10. FLA 150.4 A.
  Integral breaker **175 A** (≥ 115 % FLA, NEC 445.12/445.13). Feeder sizing is Tier-3 (HALT).
- Loads: egress / exit lighting, fire alarm control and NAC power, generator accessories.
  Elevators and everything else are **normal power only** (owner: life safety only).
- **E4A-1-A** ATS, 225 A, 3-pole (generator not separately derived), NEC 700 class,
  normal = 4MSB-1-A CB-14, emergency = GEN-1. Located in the **Emergency Electrical Room (EER)**,
  2-hour separated from the main electrical room (NEC 700.10(D) good practice).
- Preferred topology: GEN-1 breaker → ATS emergency input directly. If the engine/validator
  cannot express that, use a small emergency distribution board **E4MDP-1-A** (400 A, one ECB-01
  175 A) between them, as the clinic project does, and record it in §9.
- Downstream:
  - **E4P-1-A** 225 A MLO, 480Y/277 V emergency distribution panel (EER, L1) — serves L1/L2
    egress lighting directly, and feeds:
    - **E4L-3-A** 100 A MLO (L3 emergency closet) → sub-feeds **E4L-5-A** 100 A MLO (L5)
    - **E4T-1-A** 30 kVA → **E2P-1-A** 100 A MCB, 208Y/120 V (fire alarm control, EM receptacles)
- Emergency wiring in its own raceways and its own riser (NEC 700.10(B)).

## 5. Sheets

- S1 / **E-501** — Main Single-Line Diagram — Normal Power (a continuation sheet is acceptable if
  14 breakers overflow 42 in).
- S2 / **E-502** — Single-Line Diagram — Emergency Power.
- Level lines (A-7) for Levels 1–5 and Site where the engine supports them.

## 6. Physical layout (for the 3D Motion — feet; x = east, y = north, z = up; building 0–200 × 0–120)

Floor elevations: L1 0, L2 15, L3 30, L4 45, L5 60, Roof 75. Ceiling-space conduit elevation = floor + 12 ft.

| Space | Level | x range | y range | Contents |
|---|---|---|---|---|
| Main Electrical Room (MER) | L1 | 165–200 | 92–120 | 4MSB-1-A (along north wall, 40 in deep, 16 ft long), SPD-1, 4T-1-A, 2P-1-A, 4L-1-A, 4M-1-A, 4T-1-B |
| Emergency Electrical Room (EER) | L1 | 145–163 | 104–120 | E4A-1-A, E4P-1-A, E4T-1-A, E2P-1-A |
| Normal electrical closet stack (ELEC-n) | L2–L5 | 116–128 | 52–66 | L2: 4L-2-A, 2P-2-A · L3: 4L-3-A, 4T-3-A, 2P-3-A · L4: 4L-4-A, 2P-4-A · L5: 4L-5-A, 4T-5-A, 2P-5-A |
| Emergency closet stack (EMC-n) | L3, L5 (stacked through all floors) | 72–80 | 52–60 | L3: E4L-3-A · L5: E4L-5-A |
| Core: elevators ELEV-1/2 + stairs | all | 86–112 | 52–68 | — |
| L5 mechanical room | L5 | 0–30 | 90–120 | 4M-5-A |
| Café / kitchen | L1 | 0–55 | 0–40 | 2K-1-A (kitchen back wall) |
| Imaging suite (CT, X-ray) | L1 | 140–200 | 0–45 | DS-IMG (corridor wall), 4S-1-A |
| Roof | Roof | — | — | RTU-1 (x 40,y 60), RTU-2 (x 100,y 60), RTU-3 (x 160,y 60) |
| Utility pad | Site | 176–186 | 128–136 | XFMR-U |
| Generator pad | Site | 140–160 | 130–140 | GEN-1 |
| EV equipment pad | Site | 10–30 | −30 to −22 | 4S-S-A, 4T-S-A, 2P-S-A |
| EV parking | Site | 0–200 | −110 to −35 | 2 DCFC (x 20, 40 at y −40) + 16 L2 pedestals in two rows |

## 7. Conduit routing intent (3D)

- XFMR-U → MER: underground ductbank (15 × 4 in) south into the MER, rising under 4MSB-1-A.
- MER → everything on L1: overhead in the ceiling space (cable tray along the north corridor is OK).
- Normal riser: MER → ELEC stack via a horizontal run at L1 ceiling, then vertical through the
  stacked ELEC closets (sleeves at each floor) to L2–L5 panels.
- Mechanical A: MER → ELEC riser → L5 → horizontal at L5 ceiling to the L5 mech room → roof
  penetrations to RTU-1/2/3.
- EV: underground from MER south under the building/lot to the EV pad; then underground to chargers.
- Emergency (draw in red, never shared with normal): GEN-1 → EER underground; CB-14 normal feed
  MER → EER; EER → EMC stack (own riser) → E4L-3-A, E4L-5-A.
- Color code: normal power blue/grey, emergency red, EV green, mechanical orange, imaging purple,
  kitchen amber.

## 8. Tier-3 HALTs (EOR owes)

Available fault current; utility %Z / X-R; feeder distances (no voltage drop); generator feeder
sizing (NEC 445.13); actual connected loads; DCFC and imaging equipment nameplates.

## 9. Changes made during SLD build (workstream A fills this in)

Recorded 2026-11-18 by the SLD build (`1_source/mob_build_topology.mjs`, engine rev 1.0.22).
**Every equipment tag in §3–§4 is kept.** One tag is added, one is not drawn; no rating in the
brief was changed.

| # | Brief | SLD | Reason | 3D impact |
|---|---|---|---|---|
| 1 | GEN-1 → E4A-1-A emergency input directly | GEN-1 → **E4MDP-1-A** (new, 400 A, two-level; main **EMDP-MAIN** 250AF/175AT LSI, no GFP; one breaker **ECB-01** 250AF/175AT) → E4A-1-A emergency input | The engine's emergency-sheet placer positions the generator and ATS row off an emergency switchboard lineup and has nothing to anchor to without one. Brief §4 named this fallback. | Add E4MDP-1-A in the EER (L1, next to E4A-1-A). GEN-1 feeder now lands on E4MDP-1-A, then E4MDP-1-A → E4A-1-A. |
| 2 | CB-11 → DS-IMG 400 A fused disconnect (inline, Chain F) → 4S-1-A | CB-11 → 4S-1-A directly (Chain A, feeder tag 4004); **DS-IMG not drawn on the SLD** | The engine has no L2-5 (disconnect) renderer, only a bounding box. | None. Keep DS-IMG on the imaging corridor wall; the SLD notes it in NOTE-011. |
| 3 | GEN-1 designation `E4G-S-A` | GEN-1 tag kept; `E4G-S-A` not used on the drawing | The validator's legend allows `GEN-1` as a special designation; the generator symbol carries one tag. | None. |
| 4 | Level lines for Levels 1–5 and Site | S1: Levels 1–5. S2: Levels 1, 3, 5 (the floors with emergency equipment). **No Site level line.** 4T-3-A / 2P-3-A are drawn in the Level 3 band and 4T-5-A / 2P-5-A in the Level 5 band, each fed by a riser from its 4MSB-1-A breaker; 2P-4-A is in the Level 4 band, sub-fed plumb from 2P-3-A (R-004, 2026-11-18, engine rev 1.0.23 `xfmr_floor_band`). 4S-S-A, 4T-S-A, 2P-S-A carry no level badge. | The engine's floor stack starts at the switchboard row, so it cannot place a Site row below Level 1; the site equipment is drawn just above the switchboard. Designations still state the level. | None — physical locations in §6 stand. |
| 5 | Ratings left open in the brief | CB-01 (SPD) 30AF/30AT, feeder 304. Breaker frames: 225 A trips 250AF; 250/175/125 A trips 250AF; 400/600/100 A trips equal frame. E4P-1-A internal breaker to E4T-1-A 100AF/50AT (30 kVA primary). GEN-1 integral breaker 250AF/175AT. | Schedule lookups / Tier-2 defaults. | None. |
| 6 | Sheets: continuation sheet allowed if 14 breakers overflow | Not needed: all 14 breakers fit E-501. | — | None. |
