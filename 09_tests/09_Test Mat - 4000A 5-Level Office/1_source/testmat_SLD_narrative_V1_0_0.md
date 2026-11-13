# ELECTRICAL NARRATIVE — TEST MAT, 4000 A OFFICE SERVICE, 5 LEVELS (V1_0_0)
# Project: Test Mat — 4000A Office / Five Levels | Location: ______________________
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# Stated scope (owner, 2026-11-13): "a single line based off a 4,000 amp service for
# an office building that has 5 floors. 4 power branches, only 1 lighting branch, and
# 2 mechanical branches. Add transformers for step down. No emergency power."
# Clarified with the owner the same day: 480Y/277V service; power risers at 480V with
# a step-down transformer on EVERY floor; lighting and mechanical as plain L1–L5
# risers; single sheet.
# -----------------------------------------------------------------------------

## 1. SERVICE

- Service: **4000 A**  `[REQUIRED — stated]`
- Service voltage: **480Y/277V**, 3Φ 4W  `[owner-confirmed]`
- Utility transformer: 13.2 kV — 480Y/277V, **3000 kVA** placeholder  *(Tier-2)* → HALT-002
  - FLA = 3,000,000 / (480 × √3) = **3608 A** → next standard rating **4000 A** (NEC 240.6(A))
- Utility metering: CT metering, switchboard metering section  *(Tier-1)*
- Available fault current: **NOT PROVIDED** `[T3-EOR]` → HALT-001
- Service lateral: feeder schedule tag **40004** — 15 sets, 4" C, (4)500 kcmil AL + 500 AL GND

## 2. BUILDING

- Occupancy: business / office, NEC 2023
- Levels: **5 storeys**, main electrical room on Level 1; A-7 level lines L1–L5

## 3. NORMAL POWER DISTRIBUTION

### Main switchboard — 4MSB-1-A
- 4000 A, 480Y/277V, two-level bus (main / secondary, 4000 A each)
- Main: 4000AF/4000AT, 3P, LSIG **with GFP** *(NEC 230.95 — non-negotiable)*
- Service N-G bond *(NEC 250.24(C) — non-negotiable)*
- Sections: incoming · metering · main breaker · 7 distribution bays (1 feeder + 1 space each)

### Branch interpretation  *(Tier-2)*
Each branch = **one switchboard feeder breaker serving a 480V riser with one MLO
feed-through panel on each floor, L1 → L5**, drawn plumb (`subfeed_straighten`).

### Distribution breakers (bus order, left → right)

| Tag | Trip | Branch | Riser panels (L1–L5) | Step-down per floor | Feeder tag |
|-----|------|--------|----------------------|---------------------|------------|
| CB-PA | 600 A | Power A | 4P-n-A 600A MLO | 4T-n-PA 75 kVA → 2P-n-A 250A MCB | 6004 |
| CB-MA | 600 A | Mechanical A | 4M-n-A 600A MLO | — | 6004 |
| CB-PB | 600 A | Power B | 4P-n-B 600A MLO | 4T-n-PB 75 kVA → 2P-n-B 250A MCB | 6004 |
| CB-LA | 225 A | Lighting A | 4L-n-A 225A MLO (277V lighting) | — | 2254 |
| CB-PC | 600 A | Power C | 4P-n-C 600A MLO | 4T-n-PC 75 kVA → 2P-n-C 250A MCB | 6004 |
| CB-MB | 600 A | Mechanical B | 4M-n-B 600A MLO | — | 6004 |
| CB-PD | 600 A | Power D | 4P-n-D 600A MLO | 4T-n-PD 75 kVA → 2P-n-D 250A MCB | 6004 |

Sum of feeder trips: 6 × 600 + 225 = **3825 A** on a 4000 A bus (allowances, not demand).

⚠️ **Bus order is deliberate.** Transformer-tapped power columns alternate with
non-tapped columns so no two tap clusters sit side by side.

### Floor step-downs — 20 total (4 power risers × 5 floors)
- Internal 125 A primary breaker in each floor's 4P panel → tag **1253** (delta primary)
- 75 kVA 480Δ-208Y/120V, %Z / X-R = `transformer_impedance_V1_0_0.json` midpoints
- Secondary tag **2504T**, SBJ #2 AWG; 250 A MCB at the 2P panel protects the secondary
  conductors (NEC 240.21(C)); SDS bonding per NEC 250.30 → HALT-005
- Power-riser loading: 5 × 75 kVA = 375 kVA = 451 A connected at 480 V → 600 A riser

## 4. EMERGENCY / STANDBY POWER
**None** — per owner. No generator, ATS or fire pump. Note: egress lighting (NEC 700)
will need a source (unit equipment or inverter) outside this SLD's scope.

## 5. FEEDER DISTANCES  `[T3-EOR]`
**NOT PROVIDED** → HALT-003. No voltage-drop calc; no A-5 tags.

## 6. SHEETS & LAYOUT  `[LAYOUT]`
- Single sheet **S1 / E-501**, 30×42 Arch E1, 96 px/in, `riser_step_standard: 1200`
- `internal_chain_exit_nudge -24` on every tapped panel; `subfeed_exit_x_nudge +20` on the
  riser leaving it (removes 16 tap × riser crossings found on run 1)
- Tap 208V panels shifted west via `chain_column_nudge -180`

## 7. COMPLETENESS
Stages 1–6 complete and validated. Not a construction document.

> This SLD is for design development and coordination. It requires review and seal by a
> licensed Professional Engineer before construction use.
