# ELECTRICAL NARRATIVE — TEST 1, 3000 kVA SERVICE, 2 LEVELS (V1_0_0)
# Project: Test Claude — 3000 kVA Service, 2 Levels | Location: ______________________
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# Stated scope (owner, 2026-10-22, verbatim): "Let's create a single line 3000kva
# serive. With 5 lighting branches 2 power amd 3 mech. 2 levels amd ill let you
# figure out the rest."
# Everything beyond service kVA, branch counts and level count is a Tier-2
# default per 00_Docs/project_instructions_V1_0_0.md §2.3, logged below.
# -----------------------------------------------------------------------------

## 1. SERVICE

- Service size: **3000 kVA**  `[REQUIRED — stated]`
- Service voltage: 480Y/277V  *(Tier-2 default)*
- Configuration: 3 phase, 4 wire  *(Tier-2 default)*
- Utility transformer: 13.2kV primary — 480Y/277V secondary  *(Tier-2 default)*
- Utility metering: CT metering in the switchboard metering section  *(Tier-1 auto-include)*
- Available fault current: **NOT PROVIDED** `[T3-EOR]` → HALT-001
- Utility transformer %Z / X-R: **NOT PROVIDED** `[T3-EOR]` → HALT-002

Full-load current at 3000 kVA, 480V, 3Φ = 3,000,000 / (480 × √3) = **3608 A**.
Next standard rating above FLA (NEC 240.6(A)) → **4000 A** main.

Service lateral: `feeder_schedule_V1_0_0.json` 4-wire tag **40004** — 15 sets, 4" C,
(4)500 kcmil AL + 500 kcmil AL GND.

## 2. BUILDING

- Occupancy: commercial  *(Tier-2 default)*
- Levels: **2 storeys**  `[stated]`, electrical room on Level 1
- A-7 level lines on Levels 1 and 2

## 3. NORMAL POWER DISTRIBUTION

### Main switchboard — 4MSB-1-A
- 4000 A, 480Y/277V, 4W 3PH, two-level bus (main 4000 A / secondary 4000 A; DV-10 main ≥ secondary)
- Main device: 4000AF / 4000AT, 3P, LSIG **with ground-fault protection**
  *(Tier-1 — NEC 230.95, main ≥ 1000 A. Cannot be suppressed.)*
- Neutral-to-ground bond at the service entrance *(Tier-1 — NEC 250.24(C))*
- AIC rating: unset pending available fault current → HALT-001

Sections: `incoming` · `metering` · `main_breaker` · `distribution` (10 feeder breakers + N-G bond).

### Interpretation of "branch"  *(Tier-2 — the one judgement call in this composition)*

Each stated branch = **one switchboard feeder breaker serving a two-level riser**: a Level-1
head panel and a Level-2 panel sub-fed from it (`feed_top` → `feed_bottom`, drawn plumb).
Upper-floor OCPD is internal to the Level-1 panel per its own schedule. If the intent was
instead *ten panels total split across the two floors*, that is a topology change — see §8.

### Distribution breakers (bus order, left to right)

| Tag | Frame / Trip | Branch | Level 1 | Level 2 | Chain |
|-----|--------------|--------|---------|---------|-------|
| CB-01 | 250AF / 225AT | Lighting A | 4L-1-A 225A MLO | 4L-2-A 100A MLO | A |
| CB-02 | 250AF / 225AT | Lighting B | 4L-1-B 225A MLO | 4L-2-B 100A MLO | A |
| CB-03 | 250AF / 225AT | Lighting C | 4L-1-C 225A MLO | 4L-2-C 100A MLO | A |
| CB-04 | 250AF / 225AT | Lighting D | 4L-1-D 225A MLO | 4L-2-D 100A MLO | A |
| CB-05 | 250AF / 225AT | Lighting E | 4L-1-E 225A MLO | 4L-2-E 100A MLO | A |
| CB-06 | 400AF / 400AT | Mechanical A | 4M-1-A 400A MLO | 4M-2-A 225A MLO | A |
| CB-07 | 400AF / 250AT | Power A | 4T-1-A 150 kVA → 2P-1-A 500A MCB | 2P-2-A 225A MLO | B |
| CB-08 | 400AF / 400AT | Mechanical B | 4M-1-B 400A MLO | 4M-2-B 225A MLO | A |
| CB-09 | 400AF / 250AT | Power B | 4T-1-B 150 kVA → 2P-1-B 500A MCB | 2P-2-B 225A MLO | B |
| CB-10 | 400AF / 400AT | Mechanical C | 4M-1-C 400A MLO | 4M-2-C 225A MLO | A |

Sum of feeder trips: 5×225 + 3×400 + 2×250 = **2825 A** on a 4000 A bus.

⚠️ **Bus order is deliberate.** The two Chain-B transformer columns are separated by a
mechanical column — adjacent transformer columns put one label block inside the
neighbour's glyph extent (`--audit glyph_collision`, default 2500 kVA R-007).

### Lighting — 480Y/277V  *(Tier-2 — 277 V lighting, no step-down)*
- L1 feed 225 A = tag **2254** (1 set, 3 1/2" C, (4)350 AL + #6 CU)
- L2 sub-feed 100 A = tag **1004** (1 set, 2" C, (4)1/0 AL + #6 CU)

### Mechanical — 480Y/277V
- L1 feed 400 A = tag **4004** (2 sets, 3" C, (4)350 AL + #3 CU)
- L2 sub-feed 225 A = tag **2254**

### Power — 208Y/120V via 150 kVA step-down  *(Tier-2 — same block as the default 2500 kVA)*
- Primary OCPD 250 A in the switchboard = transformer schedule tag **2503**
  (1 set, 2 1/2" C, (3)350 AL + #4 CU — delta primary, no neutral)
- Secondary 500 A = tag **5004T** (2 sets, 3 1/2" C, (4)500 AL; SBJ #2 AWG); the 500 A OCPD
  is the 2P-1-x panel **main** → protects the secondary conductors per NEC 240.21(C). Hence MCB.
- %Z 4.35, X/R 2.95 — `transformer_impedance_V1_0_0.json` 150 kVA midpoints
- L2 sub-feed 225 A = tag **2254**

⚠️ **No connected-load schedule was provided.** Every panel rating above is a default size,
not a calculated one.

## 4. EMERGENCY / STANDBY POWER

**None.** Not stated; emergency power is an architecture decision, not a Tier-2 default.
No fire pump (if added: tap ahead of the main disconnect, NEC 695.4(B) — non-negotiable).

## 5. FEEDER DISTANCES  `[T3-EOR]`

**NOT PROVIDED** → HALT-003. No voltage-drop calculation; no A-5 tags.

## 6. SHEETS & LAYOUT  `[LAYOUT]`

- Single sheet **S1 / E-501** — "MAIN SINGLE-LINE DIAGRAM — NORMAL POWER", 30×42 Arch E1, 96 px/in
- `riser_step_standard: 650` (default 2500 kVA R-011 value)
- Floor banding: lighting A stack = `floor_anchors`, mechanical A stack =
  `floor_anchors_mechanical`, the other eight stacks via `floor_band_designations` (OFF-009)
- Every L1 → L2 hop in `subfeed_straighten` (OFF-027) — plumb columns, no doglegs
- Every A-1 tag `side: 'right'` (house style, default 2500 kVA R-009)
- `layout_config` embedded in the topology AND written as the sidecar
  `test1_layout_config.json`; every hospital-named key explicitly cleared

## 7. KEYNOTES & OMISSIONS

- A-6 keynotes: none `[T3-EOR]`
- Omitted: fire pump, generator, ATS, SPD, spares/spaces, terminal loads

## 8. TIER-2 OVERRIDE LEDGER

No EOR overrides applied. Likely candidates for the first revision:
- Branch interpretation (two-level risers vs. ten single panels)
- Lighting at 480Y/277V vs. 208Y/120V via step-down
- Panel ratings once a load schedule exists

## 9. COMPLETENESS

Stages 1–6 complete and validated. Not a construction document.

> This SLD is for design development and coordination. It requires review and seal by a
> licensed Professional Engineer before construction use.
