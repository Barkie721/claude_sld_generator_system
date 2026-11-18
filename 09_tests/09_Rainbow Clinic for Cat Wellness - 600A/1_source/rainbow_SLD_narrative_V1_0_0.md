# ELECTRICAL NARRATIVE — SLD GENERATOR (V1_0_0)
# Project: Rainbow Clinic for Cat Wellness — 600 A Service | Location: not stated (NEC 2023 assumed)
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# A fictional single-storey cat-wellness clinic. Composed 2026-11-18 (branch
# `motions-test`) from a Revit room harvest of an AI-generated clinic model:
# 91 rooms harvested, 88 placed and bounded on LEVEL 1 (the ATTIC and two
# unplaced rooms are excluded). The owner supplied NO electrical scope: the
# service, every branch, and every rating below are COMPOSITOR-DERIVED from
# the room programme and floor areas. Each derived value is marked **[FILLED]**
# with its basis and is repeated in the build script's
# metadata.compositor_notes[] (Tier-2) or metadata.compositor_halts[] (Tier-3).
#
# This SLD is for design development and coordination. It requires review and
# seal by a licensed Professional Engineer before construction use.
# -----------------------------------------------------------------------------

## 0. ROOM PROGRAMME (from the harvest — Revit finish-face areas)

Conditioned building area **18,862 SF** (84 rooms). Outdoor yards **5,667 SF**
(EXT ACTIVITY ×3 = 4,633 SF; EXT EQUIP YARD D135 = 1,034 SF). Two harvested
rooms (200 MECHANICAL ELECTRICAL, 238 GENERAL STORAGE) are unplaced in the
model and carry 0 SF — HALT-006.

| Load group | Rooms (count) | SF |
|---|---|---|
| Animal housing — SLEEPING AREA | 6 | 2,875 |
| Activity / group — LARGE GROUP, SMALL GROUP, *ACTIVITY (3) | 7 | 2,870 |
| Clinical — EXAM, EXAM/CONSULT, THERAPY CONSULT, INTAKE, MEDS, QUIET, QUIET ROOM, TEAMING, HUC | 18 | 2,788 |
| Circulation — HALL, CORRIDOR, ARRIVAL HALL, LOBBY, WAITING, ANTE | 9 | 4,603 |
| Staff — OFFICE, OPEN OFFICE, MEETING, BREAK, LACTATION, QUIET WORK, CONTROL, VISITOR MTG. | 11 | 1,953 |
| Kitchen + kitchen storage + nutrition equip ×3 | 5 | 524 |
| Laundry ×4 + clothing bank + patient effects | 6 | 647 |
| Restrooms (patient, staff, public) | 11 | 799 |
| Storage / housekeeping / attic access | 7 | 493 |
| ELEC D133 / EPSS D134 / MDF D130 / WATER SVC ENTRY D132 | 4 | 1,307 |
| **Total conditioned** | **84** | **18,862** (group rows sum to 18,859 — rounding) |

## 1. LOAD CALCULATION (NEC 2023 Art. 220, non-dwelling) **[FILLED]**

| # | Load | Basis | Connected kVA | Calc kVA |
|---|---|---|---|---|
| 1 | General lighting | 18,862 SF × 1.6 VA/SF, Table 220.42(A) "health care clinic" (closest occupancy; no veterinary row) | 30.2 | 37.7 (×1.25 continuous) |
| 2 | Exterior / yard lighting | 5,667 SF × 0.25 VA/SF + 3.0 kVA site allowance | 4.4 | 5.5 (×1.25) |
| 3 | Receptacles | 2.0 VA/SF assumed (count unknown, 220.14(I) not computable) | 37.7 | 23.9 (220.47: 10 kVA @100 % + rest @50 %) |
| 4 | HVAC | 6.0 VA/SF assumed (heat pumps + DOAS + exhaust; animal housing ventilated 24/7) | 113.2 | 118.2 (+25 % of a 20 kVA largest motor, 430.24) |
| 5 | Kitchen | 6 appliances, 45 kVA connected assumed | 45.0 | 29.3 (Table 220.56, 6 units @65 %) |
| 6 | Laundry | 4 rooms × (5.0 kVA dryer + 1.2 kVA washer) | 24.8 | 24.8 |
| 7 | Plumbing — domestic water booster 10 HP + duplex sewage ejector 2 × 3 HP (460 V) | Table 430.250: 14 + 4.8 + 4.8 A | 19.6 | 22.5 (+25 % largest) |
| 8 | MDF / IT | 10 kVA continuous | 10.0 | 12.5 |
| 9 | Medication / nutrition refrigeration, misc. equipment | 12 kVA | 12.0 | 12.0 |
| 10 | Fire alarm, access control, egress hardware | 3 kVA continuous | 3.0 | 3.8 |
| | **Total** | | **300** | **290.2 kVA → 349 A @ 480 V** |

- With 25 % growth: 436 A → next standard size **600 A** (NEC 240.6(A)).
- Density: 600 A × 480 V × √3 / 18,862 SF = **26.4 VA/SF** (typical clinic range 15–30).
- No connected-load schedule exists: HALT-003.

## 2. SERVICE AND BUILDING

- Service: **600 A, 480Y/277V, 3Φ 4W** **[FILLED]** (load calc §1).
- Utility transformer: **500 kVA** pad-mount, 13.2 kV primary **[FILLED]** (FLA 601 A),
  %Z 4.35 less IEEE C57.12.00 −7.5 % = **4.02 %**, infinite primary bus →
  601 A / 0.0402 = **14,960 A sym** → **22 kAIC** equipment **[FILLED — HALT-002]**.
- Service lateral: feeder_schedule tag `6004` — (3) 3"C – (4)350 AL + #1 CU GND.
- Main: 800 AF / 600 AT, **LSI**. GFP is **not** required: NEC 230.95 applies at
  1000 A and above. N-G bond at the service (NEC 250.24(C)); utility meter.
- Occupancy: veterinary clinic for cats. **NEC 517 does not apply** (517 covers
  human health-care facilities), so the standby system is laid out as true
  Article **700 / 701 / 702** classes, not 517 branches **[FILLED — NOTE-002]**.
- One storey (Level 1). No level lines and no riser cascades.

### Equipment locations (for plan placement — Tier-2, EOR to confirm)

| Equipment | Room |
|---|---|
| UTILITY-XFMR, GEN-1 (outdoor, sound-attenuated enclosure) | D135 EXT EQUIP YARD |
| 4MSB-1-A, 4L-1-A, 4M-1-A, 4P-1-A, 4T-1-C | D133 ELEC |
| E4MSB-1-A, E4A-1-A, L4A-1-A, O4A-1-A, E4L-1-A, E4T-1-A, O4M-1-A, O4T-1-A | D134 EPSS |
| 2K-1-A (kitchen + laundry 208 V) | D129 KITCHEN STORAGE |
| 4T-1-A, 2P-1-A, 2P-1-B (feed-through pair, serves the B and C wings) | C110 CLEAN STOR |
| 4T-1-B, 2M-1-A (attic air handlers / fans) | D131 ATTIC ACCESS |
| L4M-1-A (booster pump, sewage ejector) | D132 WATER SVC ENTRY |
| E2P-1-A (fire alarm, access control) | D104 CONTROL |
| O4T-1-B, O2P-1-B (IT) | D130 MDF |
| O2P-1-A (refrigeration, meds — A wing) | A114 CLEAN STORAGE |

Feeders run overhead along the D111a / D111b corridors (preliminary; distances
still owed, HALT-001). Separation: 700 feeders in their own raceway (NEC 700.10(B)).

## 3. NORMAL POWER DISTRIBUTION

### Main switchboard — 4MSB-1-A: 600 A, 480Y/277V, 22 kAIC, two-level.

| CB | AF/AT/P | Trip | Feeds | Tag | Chain |
|----|---------|------|-------|-----|-------|
| CB-01 | 150/150/3 | TM | 4P-1-A — 480Y/277V plug distribution, 225 A MLO | 1504 | A |
| CB-02 | 150/150/3 | TM | 4M-1-A — 480Y/277V mechanical, 225 A MLO (61.6 kVA normal HVAC) | 1504 | A |
| CB-03 | 100/60/3 | TM | 4L-1-A — 480Y/277V lighting, 100 A MLO (normal lighting + site) | 604 | A |
| CB-04 | 150/125/3 | TM | 4T-1-C — 75 kVA kitchen + laundry step-down → 2K-1-A | 1253 | B |
| CB-05 | 100/100/3 | TM | E4A-1-A normal source (NEC 700) | 1004 | C |
| CB-06 | 100/100/3 | TM | L4A-1-A normal source (NEC 701) | 1004 | C |
| CB-07 | 250/150/3 | TM | O4A-1-A normal source (NEC 702) | 1504 | C |
| SPARE ×2 | 100/100/3 | — | spare | — | — |
| SPACE ×2 | — | — | space | — | — |

Live trips total 835 A on a 600 A bus — normal under diversity (calc load 349 A).

```
4P-1-A (225A MLO) — internal 125 A (1253) → 4T-1-A 75 kVA → 2P-1-A (250A MCB, 2504T)
                                              ═ 2P-1-B (250A MLO) via feed-through lugs
4M-1-A (225A MLO) — internal 50 A (503) → 4T-1-B 30 kVA → 2M-1-A (100A MCB, 1004T)
CB-04 → 4T-1-C 75 kVA → 2K-1-A (250A MCB, 2504T)
```

## 4. EMERGENCY / STANDBY

- GEN-1: **200 kW / 250 kVA**, 480Y/277V, 0.8 PF, FLA 300.7 A **[FILLED — HALT-004]**.
  Standby load: 700 ≈ 15 kVA (30 % of lighting for egress, fire alarm, egress
  hardware) + 701 ≈ 22.5 kVA (plumbing) + 702 ≈ 90 kVA (half the HVAC for the
  animal housing, refrigeration, IT) = 128 kVA, sized up for motor starting.
- Integral breaker 400 AF / 350 AT LSI (≥115 % FLA, NEC 445.13); feeder tag
  `4004` — (2) 3"C – (4)350 AL + #3 CU GND.
- X"d 0.12 pu assumed: 300.7 / 0.12 = **2,506 A** on the EM bus → 10 kAIC (HALT-005).
- E4MSB-1-A: 400 A, 10 kAIC, two-level, main 400 AF / 350 AT LSI.

| EM CB | AF/AT | Feeds | Section |
|---|---|---|---|
| ECB-01 | 100/100 | E4A-1-A source 2 | NEC 700 (own section, 700.10(B)) |
| ECB-02 | 100/100 | L4A-1-A source 2 | NEC 701 |
| ECB-03 | 250/150 | O4A-1-A source 2 | NEC 702 |
| SPARE / SPACE | 100/100 | — | own section |

ATSs (3-pole, solid neutral, 22 kA withstand ≥ 14.96 kA available):
E4A-1-A 100 A (700), L4A-1-A 100 A (701), O4A-1-A 150 A (702, manual-reset load-shed).

```
E4A-1-A → E4L-1-A (100A MLO, egress lighting) — internal 50 A → E4T-1-A 30 kVA → E2P-1-A (100A MCB: FA, access control)
L4A-1-A → L4M-1-A (100A MLO, booster pump + sewage ejector)
O4A-1-A → O4M-1-A (225A MLO, animal-housing HVAC) — internal 70 A → O4T-1-A 45 kVA → O2P-1-A (150A MCB, refrigeration/meds)
                                                    — internal 50 A → O4T-1-B 30 kVA → O2P-1-B (100A MCB, IT/MDF)
```

## 5. FEEDER DISTANCES
Not provided — Tier 3, HALT-001. No voltage drop; fault current not attenuated.

## 6. SHEETS
One sheet, E-501, normal and emergency together (one storey).

## 7. OPEN ITEMS (Tier 3)
HALT-001 feeder distances · HALT-002 utility fault current / transformer
impedance · HALT-003 load schedule (§1 is an area-based estimate) · HALT-004
generator sizing study · HALT-005 generator X"d · HALT-006 two unplaced rooms
in the architectural model.
