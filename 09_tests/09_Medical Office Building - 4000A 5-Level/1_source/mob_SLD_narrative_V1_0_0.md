# ELECTRICAL NARRATIVE — MEDICAL OFFICE BUILDING, 4000 A SERVICE, 5 LEVELS (V1_0_0)
# Project: Medical Office Building — 4000 A Service, 5 Levels | Location: ______________________
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# Stated scope (owner, 2026-11-18, paraphrased from voice): "5-story medical office
# building, 4,000 A service, generator backup for life safety only and it is to be
# called Emergency; a power branch, mechanical, lighting, a kitchen, EV panels; a
# unique single line; I'll let you fill in the details."
# The details were filled in once, in 5_docs/design_brief.md, which is shared with
# the 3D Motion workstream and is the contract for every tag and rating below.
# Departures forced by the engine/validator are in that brief's §9 and in §8 here.
# -----------------------------------------------------------------------------

## 1. SERVICE

- Service size: **4000 A**  `[REQUIRED — stated]`
- Service voltage: 480Y/277V  *(Tier-2 default)*
- Configuration: 3 phase, 4 wire  *(Tier-2 default)*
- Utility transformer XFMR-U (`UTILITY-XFMR`): 3000 kVA, 12.47 kV — 480Y/277V  *(Tier-2 — brief §2)*
- Utility metering: CT metering in the switchboard metering section  *(Tier-1 auto-include)*
- Available fault current: **NOT PROVIDED** `[T3-EOR]` → HALT-001
- Utility transformer %Z / X-R: **NOT PROVIDED** `[T3-EOR]` → HALT-002

FLA at 3000 kVA, 480 V, 3Φ = 3,000,000 / (480 × √3) = **3608 A** → next standard rating
(NEC 240.6(A)) **4000 A** main.

Service lateral: `feeder_schedule_V1_0_0.json` 4-wire tag **40004** — 15 sets, 4" C,
(4)500 kcmil AL + 500 kcmil AL GND.

## 2. BUILDING

- Occupancy: medical office building — business occupancy, outpatient clinics, imaging suite,
  ground-floor café with commercial kitchen  `[stated]`
- **Not a hospital:** no NEC 517 essential electrical system; generator serves NEC 700 only
- Levels: **5 storeys** `[stated]`, ~24,000 SF per floor; main electrical room and emergency
  electrical room on Level 1; site equipment (utility pad, generator pad, EV pad) outdoors
- A-7 level lines on Levels 1–5 (S1) and 1 / 3 / 5 (S2)

## 3. NORMAL POWER DISTRIBUTION

### Main switchboard — 4MSB-1-A (Main Electrical Room, L1)
- 4000 A, 480Y/277V, 4W 3PH, two-level bus (main 4000 A / secondary 4000 A)
- Main: 4000AF / 4000AT, 3P, LSIG **with ground-fault protection** *(Tier-1 — NEC 230.95. Cannot be suppressed.)*
- Neutral-to-ground bond at the service entrance *(Tier-1 — NEC 250.24(C))*
- AIC: unset pending available fault current → HALT-001

Sections: `incoming` · `metering` · `main_breaker` · `distribution` (14 breakers + N-G bond).

### Distribution breakers (bus order, left to right — design brief §3)

| Tag | Frame / Trip | Branch | Feeds | Feeder tag(s) | Chain |
|-----|--------------|--------|-------|---------------|-------|
| CB-01 | 30AF / 30AT | SPD | SPD-1 Type 1, Mode A | 304 | E |
| CB-02 | 250AF / 225AT | Lighting A | 4L-1-A 225A MLO (L1) → 4L-2-A 100A MLO (L2) | 2254 / 1004 | A + G |
| CB-03 | 250AF / 250AT | Power A | 4T-1-A 150 kVA → 2P-1-A 500A MCB (L1) → 2P-2-A 225A MLO (L2) | 2503 / 5004T / 2254 | B + G |
| CB-04 | 250AF / 225AT | Lighting B | 4L-3-A 225A MLO (L3) → 4L-4-A 100A MLO (L4) | 2254 / 1004 | A + G |
| CB-05 | 250AF / 250AT | Power B | 4T-3-A 150 kVA → 2P-3-A 500A MCB (L3) → 2P-4-A 225A MLO (L4) | 2503 / 5004T / 2254 | B + G |
| CB-06 | 100AF / 100AT | Lighting C | 4L-5-A 100A MLO (L5) | 1004 | A |
| CB-07 | 250AF / 175AT | Power C | 4T-5-A 112.5 kVA → 2P-5-A 400A MCB (L5) | 1753 / 4004T | B |
| CB-08 | 600AF / 600AT | Mechanical A | 4M-5-A 600A MLO (L5 mech room; RTU-1/2/3) | 6004 | A |
| CB-09 | 400AF / 400AT | Mechanical B | 4M-1-A 400A MLO (L1; ELEV-1/2, booster pump, EF) | 4004 | A |
| CB-10 | 250AF / 125AT | Kitchen | 4T-1-B 75 kVA → 2K-1-A 250A MCB (L1 café) | 1253 / 2504T | B |
| CB-11 | 400AF / 400AT | Imaging | 4S-1-A 400A MLO (L1; CT, digital X-ray) — DS-IMG not drawn, §8 | 4004 | A (brief: F) |
| CB-12 | 600AF / 600AT | EV — DC fast | 4S-S-A 600A MLO (site, NEMA 3R; 2 × 150 kW DCFC) | 6004 | A |
| CB-13 | 250AF / 175AT | EV — Level 2 | 4T-S-A 112.5 kVA → 2P-S-A 400A MCB (site, NEMA 3R; 16 × L2, EVEMS NEC 625.42) | 1753 / 4004T | B |
| CB-14 | 250AF / 200AT | Emergency normal feed | E4A-1-A source 1 (cross-sheet to E-502) | 2004 | C |

Sum of feeder trips **3725 A** on a 4000 A bus. Distribution breakers LSI.

⚠️ **Bus order is deliberate.** The five Chain-B transformer columns (CB-03/05/07/10/13) are each
separated by a non-transformer column — adjacent transformer columns put one label block inside the
neighbour's glyph extent (default 2500 kVA R-007).

### Step-down transformers  *(Tier-1 schedule lookups — `3_phase_transformer_feeder_schedule_V1_0_0.json`)*
| kVA | Primary OCPD / tag | Secondary OCPD / tag | SBJ | %Z / X-R (midpoint) |
|-----|--------------------|----------------------|-----|---------------------|
| 150 | 250 A / 2503 | 500 A / 5004T | #2 | 4.35 / 2.95 |
| 112.5 | 175 A / 1753 | 400 A / 4004T | #2 | 3.65 / 2.8 |
| 75 | 125 A / 1253 | 250 A / 2504T | #2 | 4.45 / 2.25 |
| 30 | 50 A / 503 | 100 A / 1004T | #6 | 2.9 / 1.2 |

Every secondary OCPD is the main of the panel it feeds (NEC 240.21(C)) — hence MCB.

### Riser sub-feeds (Variant G)
4L-2-A / 4L-4-A sub-fed at 100 A (1004) from the 225 A L1/L3 lighting panels; 2P-2-A / 2P-4-A at
225 A (2254) from the 500 A MCB power panels. OCPD internal to the feeding panel. All hops plumb
(`subfeed_straighten`).

⚠️ **No connected-load schedule was provided.** Every rating is a default size → HALT-005.

## 4. EMERGENCY POWER — NEC 700 "Emergency" (life safety only)

- **GEN-1** (`E4G-S-A`), 100 kW / 125 kVA, 480Y/277V, diesel, outdoor sound-attenuated enclosure,
  NFPA 110 Level 1, Type 10. FLA 150.4 A. Integral breaker 250AF / **175AT** LSI (≥ 115 % FLA,
  NEC 445.12; ground-fault indication only, NEC 700.6(D)).
- Generator feeder: `[T3-EOR]` (NEC 445.13) → HALT-004. Drawn on row **1754** (sized to the 175 A
  OCPD), A-1 text `GEN`.
- **E4MDP-1-A** 400 A emergency distribution board, two-level, main EMDP-MAIN 250AF/175AT LSI
  (no GFP), one breaker **ECB-01** 250AF/175AT (NEC 700 section) → ATS emergency input, tag 1754.
  *(Brief fallback — §8.)*
- **E4A-1-A** ATS, 225 A, 3-pole (generator not separately derived — no EM-side N-G bond),
  NEC 700 class. Normal = 4MSB-1-A CB-14 (2004, cross-sheet), emergency = ECB-01.
- **E4P-1-A** 225 A MLO 480Y/277V (EER, L1), fed from ATS load_out on 2254:
  - sub-feeds **E4L-3-A** 100 A MLO (L3) → sub-feeds **E4L-5-A** 100 A MLO (L5), 1004 each
  - internal 100AF/50AT → **E4T-1-A** 30 kVA (503) → **E2P-1-A** 100 A MCB 208Y/120V (1004T) —
    fire alarm control, EM receptacles
- Loads: egress / exit lighting, fire alarm control and NAC power, generator accessories.
  Elevators and all other loads normal-power only.
- Emergency wiring in its own raceways and own riser (NEC 700.10(B)); EER 2-hour separated from MER.

No fire pump (if added: tap ahead of the main disconnect, NEC 695.4(B) — non-negotiable).

## 5. FEEDER DISTANCES  `[T3-EOR]`

**NOT PROVIDED** → HALT-003. No voltage-drop calculation; no A-5 tags.

## 6. SHEETS & LAYOUT  `[LAYOUT]`

- **S1 / E-501** — "MAIN SINGLE-LINE DIAGRAM — NORMAL POWER" — all 14 breakers fit one sheet; no
  continuation sheet needed
- **S2 / E-502** — "SINGLE-LINE DIAGRAM — EMERGENCY POWER" (`sheet_roles` S2 `emergency`)
- 30×42 Arch E1, 96 px/in
- S1: `floor_order` 5…1, `riser_step_standard: 650`, every level-mapped panel banded through
  `floor_band_designations` (OFF-009); no named anchor stacks
- S2: `floor_order` 5 / 3 / 1, fixed-pitch stack `s2_level_line_pitch {3: 2690, 5: 900}`,
  `s2_shift_delta {3: 1240, 5: 1240}` (derivation in the build script)
- S2: E4P-1-A's step-down column shifted west (`internal_chain_exit_nudge −20`,
  `chain_column_nudge −220`) and its riser exit re-centred (`subfeed_exit_x_nudge +20`) so the
  riser and the transformer tap do not run collinear
- Every A-1 tag `side: 'right'` (house style); `layout_config` embedded AND written as sidecar;
  every hospital-named key explicitly cleared

## 7. KEYNOTES & OMISSIONS

- A-6 keynotes: none `[T3-EOR]`
- A-4 fault-current tags: none (HALT-001)
- Omitted: fire pump, spares/spaces, terminal loads (RTUs, elevators, chargers are panel loads)

## 8. DEVIATIONS FROM THE DESIGN BRIEF  (mirrored in `5_docs/design_brief.md` §9)

1. **E4MDP-1-A added** between GEN-1 and E4A-1-A (brief's named fallback). The engine's
   emergency-sheet placer positions the generator and ATS row off an emergency switchboard lineup;
   with no board on S2 there is nothing to anchor to.
2. **DS-IMG not drawn.** Brief CB-11 is Chain F; the engine has no L2-5 renderer. 4S-1-A is fed
   directly by CB-11 (Chain A). DS-IMG stays a physical device.
3. **Level badges.** Chain-B transformers and secondary panels draw just above the switchboard
   whatever their floor, so 2P-3-A, 2P-5-A, 4S-S-A, 2P-S-A carry no level badge; no Site level line.
4. Ratings the brief left open, now fixed: CB-01 30AF/30AT (304); breaker frames per row above;
   EMDP-MAIN and ECB-01 250AF/175AT; E4P-1-A internal 100AF/50AT; GEN-1 integral breaker 250AF.

## 9. COMPLETENESS

Stages 1–6 complete and validated. Not a construction document.

> This SLD is for design development and coordination. It requires review and seal by a
> licensed Professional Engineer before construction use.
