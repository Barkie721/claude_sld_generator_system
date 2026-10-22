# ELECTRICAL NARRATIVE — LCC HOTEL WORKS, 1200 A / 208Y/120 V (V1_0_0)
# Project: LCC Hotel Works | Location: ______________________
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# Reverse-composed from a red-lined SNIPPET of an existing single line, not a
# dictated narrative. The name/topology inventory is
# lcc_SLD_names_V1_0_0.md; the owner's answers to its Q1–Q10 (2026-10-21) govern:
#   Q1 both panels keep the name P4     Q6 P1AA red note ignored
#   Q2 tags → office feeder-schedule    Q7 500 kVA service transformer
#      tags ([amps][wires], 13 → 904)   Q8 project name LCC HOTEL WORKS
#   Q3 red marks are verification ticks Q9 missing ratings → Tier-3 halts
#   Q4 P4-8 deleted                     Q10 service entrance — SUPERSEDED 2026-10-21:
#                                           fed from MPB1 through T1 (see §1)
#   Q5 P3B feeds LIGHT., no transformer
# Every value not on the drawing is a Tier-2 default or a Tier-3 halt (§6/§7).
# -----------------------------------------------------------------------------

## 1. SOURCE — FROM MPB1 THROUGH T1 (separately derived system)

Owner correction 2026-10-21 (supersedes Q10): HOTEL SWITCHGEAR is **not** the
service entrance. It is fed from **MPB1** through a standard transformer, straight
into its main breaker — no incoming or metering section.

- **T1: 500 kVA, 480Δ – 208Y/120 V** `[owner: 480 V primary]`.
  Primary FLA = 500 000 / (480 × √3) = **601 A**; secondary FLA = **1388 A**.
- From `3_phase_transformer_feeder_schedule_V1_0_0.json`, 500 kVA row:
  primary OCPD **800 A** / tag `8003` (in MPB1, off this sheet, unconfirmed);
  secondary OCPD **1600 A** / tag `16004T`, bonding jumper #1/0, GEC #3/0.
- Secondary feeder T1 → main (**owner-specified**, NOTE-008): `12004T`,
  `(4)4"C-(3)#500 KCM AL, (1)#350 KCM AL NEUTRAL & (1)#250 KCM AL GRD EACH`.
  4 × 310 A = 1240 A ≥ the 1200 A main (NEC 240.21(C)); replaces the schedule's
  1600 A / `16004T` row, which sizes for full T1 capacity.
- %Z, X/R: **not provided** `[T3-EOR]` → HALT-001. Fault current → HALT-002.
- **No utility meter.** Metering belongs at the service, which is upstream of MPB1.
- **System bonding jumper at T1**, NEC 250.30(A)(1) (source location; never at
  both source and first disconnect, Ex. 2). No N-G bond symbol in the switchgear
  (owner 2026-10-21); neutral isolated there. GEC #3/0 per the schedule row,
  NEC 250.30(A)(5). NOTE-007.
- Drawn by engine rev 1.0.20 (OFF-033). The squiggle text comes from T1's
  `fed_from: MPB1`.

### Ground-fault protection — not required, not shown
This is a separately derived system, not a service, and NEC 230.95 would not
apply in any case at 120 V to ground. The main is drawn as an LSI breaker (no G).
See NOTE-001.

## 2. BUILDING

- Occupancy: hotel (NEC Art. 210/220 dwelling-unit and hotel provisions apply to
  the branch level; nothing on this SLD depends on it).
- Levels: not stated on the snippet → single-band layout, no A-7 level lines.

## 3. HOTEL SWITCHGEAR — 1200 A, 120/208 V, 3 PH 4 W

- Main: **1200 AF / 1200 AT, 3P, LSI** (drawn `1200/3`).
- N-G bond: none in the switchgear — the SDS bonding jumper is at T1 (NOTE-007).
- Sections: main breaker · distribution (no incoming, no metering — owner 2026-10-21).

| Breaker | Rating | Serves | Drawing tag | Office tag |
|---|---|---|---|---|
| CB-01 | 100/3 | UPS | 15 | 1004 |
| CB-02 | 450/3 | P1 450 A | 4 | 4504 |
| CB-03 | 450/3 | P2 450 A | 4 | 4504 |
| CB-04 | 225/3 | P1AA 225 A | 5 | 2254 |
| CB-05 | 450/3 | P3 450 A | 4 | 4504 |
| CB-06 | 450/3 | P4 450 A | 4 | 4504 |

The six feeder breakers total 2,025 A on a 1,200 A bus — ordinary diversity.

## 4. SUB-FED PANELS (Chain G, panel → panel)

| Parent | Child | Child rating | Drawing tag | Office tag |
|---|---|---|---|---|
| P1 | P1A, P1B, P1C, P1D, P1E, P1F | 90 A each | 13 | 904 |
| P1 | **P1G** (red-line add) | 90 A (Q2: same tag as P1A–P1F) | 13 | 904 |
| P2 | P4 (the upper one; Q1: same name) | — | 16 | HALT-003 |
| P4 (upper) | P4AA | — | 17 | HALT-003 |
| P1AA | P2A | — | 19 | HALT-003 |
| P3 | P3A | — | 18 | HALT-003 |
| P3 | P3B | — | 19 | HALT-003 |
| P3B | LIGHT. | — | 20 | HALT-003 |
| P3 | S1 (single-phase, red-line "1PH") | — | 19 | HALT-003 |
| P4 | P4A, P4B | 100 A each | 14 | 1004 |

**Deleted:** P4-8 (red slash + squiggle on its feeder — Q4).

**UPS:** fed 100 A from CB-01, nothing shown downstream. The SLD library's UPS
symbol (L2-10) is still a placeholder with no Revit family, so the UPS is drawn
as an L3-3 equipment connection (NOTE-002).

## 5. FEEDERS

All conductors and conduits come from `feeder_schedule_V1_0_0.json`, 4-wire
configuration (`[amps]4` tags). The drawing's own tag numbers (4, 5, 13, 14, 15…)
are the legacy drawing's keynotes, mapped to office tags per Q2. Where the child's
rating is unknown the feeder carries a `TBD` tag and HALT-003.

## 6. TIER-3 HALTS (EOR owes)

| ID | Item |
|---|---|
| HALT-001 | T1 %Z, X/R; MPB1 primary breaker (schedule 800 A, unconfirmed) |
| HALT-002 | Available fault current → AIC ratings, A-4 tags |
| HALT-003 | Ratings + feeders for P4 (upper), P4AA, P2A, P3A, P3B, LIGHT., S1 |
| HALT-004 | S1 single-phase: feeder configuration (schedule has no 1-phase rows) |
| HALT-005 | UPS input rating, kVA and downstream distribution |
| HALT-006 | Feeder distances → voltage drop |
| HALT-007 | Two panels designated **P4** — breaks designation uniqueness (TI-3); kept per owner D1 |
| HALT-008 | Legacy names outside the designation legend (TI-4); legend left unchanged per owner D2 |

## 7. TIER-2 NOTES

| ID | Item |
|---|---|
| NOTE-001 | No GFP: 230.95 does not apply at 120 V to ground |
| NOTE-002 | UPS drawn as an L3-3 (L2-10 is a placeholder symbol) |
| NOTE-003 | Panels without a stated rating are MLO, rating left blank |
| NOTE-004 | Main 1200 A is below T1's 1388 A FLA and the schedule's 1600 A secondary OCPD — the main limits T1 to ≈432 kVA |
| NOTE-005 | Drawing tags mapped to office feeder-schedule tags (Q2) |
| NOTE-008 | T1 secondary conductors owner-specified: 4 sets 500 AL, 1240 A, tag 12004T |
| NOTE-007 | System bonding jumper at T1, not in the switchgear (NEC 250.30(A)(1)) |
| NOTE-006 | Panelboard symbols throughout; sub-fed panels on banded rows above their parent (drawing tiers, no level lines) |
