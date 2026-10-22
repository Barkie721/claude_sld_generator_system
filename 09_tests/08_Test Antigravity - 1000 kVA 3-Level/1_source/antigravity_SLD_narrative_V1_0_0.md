# ELECTRICAL NARRATIVE — TEST ANTIGRAVITY, 1000 kVA SERVICE, 3 LEVELS (V1_0_0)
# Project: Test Antigravity — 1000 kVA Service, 3 Levels | Location: ______________________
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# Stated scope (owner, 2026-10-22, verbatim): "1000kva service at 480V, there is a fire
# pump, no emergency system, 2 plug load panels at 208v, 2 lighting branches at 208 v,
# 4 mehcanical branches ( one is 208V). there are 3 levels. ill let you fill in the rest oft he details"
#
# Everything beyond service kVA, fire pump presence, branch counts and level count is a Tier-2
# default per 00_Docs/project_instructions_V1_0_0.md §2.3, itemized below.
# -----------------------------------------------------------------------------

## 1. SERVICE

- Service size: **1000 kVA** `[REQUIRED — stated]`
- Service voltage: **480Y/277V** `[stated]`
- Configuration: 3 phase, 4 wire *(Tier-2 default)*
- Utility transformer: 13.2kV primary — 480Y/277V secondary *(Tier-2 default)*
- Utility metering: CT metering in switchboard metering section *(Tier-1 auto-include)*
- Available fault current: **NOT PROVIDED** `[T3-EOR]` → HALT-001
- Utility transformer %Z / X-R: **NOT PROVIDED** `[T3-EOR]` → HALT-002

Full-load current at 1000 kVA, 480V, 3Φ = 1,000,000 / (480 × √3) = **1202.8 A**.
Next standard rating above FLA (NEC 240.6(A)) → **1600 A** main (1600AF / 1600AT).
Service lateral: `feeder_schedule_V1_0_0.json` 4-wire tag **16004** — 6 sets, 3 1/2" C, (4)500 kcmil AL + 350 kcmil AL GND.

## 2. BUILDING & OCCUPANCY

- Occupancy: commercial *(Tier-2 default)*
- Levels: **3 storeys** `[stated]`, electrical room on Level 1
- A-7 level lines on Levels 1, 2, and 3

## 3. FIRE PUMP `[NEC 695.4(B)]`

- Dedicated **fire pump** tapped ahead of the main service disconnect on the switchboard main bus (NEC 695.4(B) non-negotiable).
- Fire pump section positioned between metering and main breaker sections (`sec-203`).
- Fire pump breaker: **CB-FP**, 250AF / 250AT, 3P `[T3-EOR — provisional rating]` → HALT-004.
- Feeder: tag **2503** (1 set, 2 1/2" C, (3)350 AL + #4 CU GND) to `4FP-1-A`.
- Fire pump motor: 100 HP, 480V, 3PH, 124 FLA / 725 LRA (L3-1 on Level 1).

## 4. NORMAL POWER DISTRIBUTION

### Main switchboard — 4MSB-1-A
- 1600 A, 480Y/277V, 4W 3PH, two-level bus architecture (main bus 1600 A / secondary bus 1600 A; DV-10 main ≥ secondary).
- Main device: 1600AF / 1600AT, 3P, LSIG **with ground-fault protection** *(Tier-1 — NEC 230.95, main ≥ 1000 A. Cannot be suppressed.)*
- Neutral-to-ground bond at service entrance *(Tier-1 — NEC 250.24(C))*.
- AIC rating: unset pending available fault current → HALT-001.

Sections: `incoming` · `metering` · `fire_pump` · `main_breaker` · `distribution`.

### Distribution branches & bus order

To prevent adjacent transformer glyph collisions (`--audit glyph_collision`, default 2500 kVA R-007), the four 208V transformer columns (Chain B) are interleaved with the three 480V mechanical columns (Chain A): `B, A, B, A, B, A, B`.

| Tag | Frame / Trip | Branch | Type | Transformer | Level 1 | Level 2 | Level 3 | Chain |
|-----|--------------|--------|------|-------------|---------|---------|---------|-------|
| CB-FP | 250AF / 250AT | Fire Pump | 480V | — | 4FP-1-A (100HP) | — | — | D |
| CB-01 | 250AF / 125AT | Lighting A | 208V | 4T-1-A (75 kVA) | 2L-1-A 225A MCB | 2L-2-A 225A MLO | 2L-3-A 100A MLO | B |
| CB-02 | 400AF / 400AT | Mech A | 480V | — | 4M-1-A 400A MLO | 4M-2-A 225A MLO | 4M-3-A 225A MLO | A |
| CB-03 | 250AF / 125AT | Lighting B | 208V | 4T-1-B (75 kVA) | 2L-1-B 225A MCB | 2L-2-B 225A MLO | 2L-3-B 100A MLO | B |
| CB-04 | 400AF / 400AT | Mech B | 480V | — | 4M-1-B 400A MLO | 4M-2-B 225A MLO | 4M-3-B 225A MLO | A |
| CB-05 | 250AF / 125AT | Plug Loads | 208V | 4T-1-P (75 kVA) | 2P-1-A 225A MCB | 2P-2-A 225A MLO | — | B |
| CB-06 | 400AF / 400AT | Mech C | 480V | — | 4M-1-C 400A MLO | 4M-2-C 225A MLO | 4M-3-C 225A MLO | A |
| CB-07 | 250AF / 125AT | Mech D | 208V | 4T-1-D (75 kVA) | 2M-1-D 225A MCB | 2M-2-D 225A MLO | 2M-3-D 100A MLO | B |

Sum of distribution feeder trips: 4×125 + 3×400 = **1700 A** on a 1600 A bus (standard commercial diversity; non-coincident peak).

### 208V step-down transformers (75 kVA)
- Four 75 kVA dry-type transformers (`4T-1-A`, `4T-1-B`, `4T-1-P`, `4T-1-D`), 480Δ — 208Y/120V.
- Primary OCPD: 125 A in switchboard (tag **1253** — 1 set, 1 1/2" C, (3)2/0 AL + #6 CU GND).
- Secondary: 250 A (tag **2504T** — 1 set, 3 1/2" C, (4)500 AL + #2 CU SBJ) feeding 225A MCB panel.
- %Z 4.45, X/R 2.25 from `transformer_impedance_V1_0_0.json` 75 kVA midpoints.

## 5. EMERGENCY / STANDBY POWER

**None.** Stated: "no emergency system". Single normal power sheet S1.

## 6. FEEDER DISTANCES `[T3-EOR]`

**NOT PROVIDED** → HALT-003. No voltage-drop calculation; no A-5 tags.

## 7. SHEETS & LAYOUT `[LAYOUT]`

- Single sheet **S1 / E-501** — "MAIN SINGLE-LINE DIAGRAM — NORMAL POWER", 30×42 Arch E1, 96 px/in.
- `riser_step_standard: 650` (clears A-1 tick to panel box at 3 storeys).
- Floor banding: Lighting A = `floor_anchors`, Mech A = `floor_anchors_mechanical`, remaining stacks banded via `floor_band_designations` (OFF-009).
- Subfeed risers straightened via `subfeed_straighten` (OFF-027).
- Every A-1 tag set to `side: 'right'` (house style).

## 8. COMPLETENESS & DISCLAIMER

> This SLD is for design development and coordination. It requires review and seal by a licensed Professional Engineer before construction use.
