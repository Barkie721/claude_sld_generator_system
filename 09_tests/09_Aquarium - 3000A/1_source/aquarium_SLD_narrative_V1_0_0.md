# Aquarium — 3000 A service — SLD narrative V1.0.0

> Intake narrative for `aquarium_build_topology.mjs`. Tier tags follow
> `00_Docs/project_instructions_V1_0_0.md` §2.3: **[STATED]** owner scope, **[T2]** compositor default
> (logged in `metadata.compositor_notes[]`, EOR may override), **[T3]** EOR-required
> (`metadata.compositor_halts[]` → `OPEN_ITEMS.md`).

## Owner scope (verbal, 2026-11-21)

> "A single line diagram for a 58,000 square foot aquarium. 3,000 amp service with a fire pump.
> 3 branches of power fed from the main switchboard: one 480 V to all 3 stories; one a step-down
> transformer on the first level to a distribution power panel that feeds 208 V sub-panels on levels
> 1, 2 and 3; the last a 500 kVA transformer feeding a panel. 1 lighting branch, 480 V, first floor
> and third. A mechanical branch, 800 A 480 V panel on the first floor, and another 800 A panel on
> the roof, each with a 45 kVA step-down transformer. A cafe branch, 400 A. A backup generator
> system — life safety, legally required, equipment, optional standby — 1 MW generator."

## Building
- **[STATED]** Aquarium, 58,000 SF. **[T2]** Levels 1, 2, 3 + mechanical roof; main electrical room Level 1.

## Service
- **[STATED]** 3000 A. **[T2]** 480Y/277V 3Φ4W.
- **[T3 HALT-002]** Utility: 2500 kVA, 13.2 kV primary, 5.32 %Z (5.75 − 7.5 % tolerance) → 56,535 A → 65 kAIC.
- Main 3000AF/3000AT LSIG — GFP per NEC 230.95 (non-negotiable). N-G bond at service (NEC 250.24(C)). Utility meter.

## Fire pump
- **[STATED]** Fire pump. **[T2]** 100 HP, 124 FLA / 725 LRA, Level 1.
- Tapped ahead of the main in its own section (NEC 695.4(B), non-negotiable).
- **[T3 HALT-004]** 800 A OCPD ≥ LRC; feeder 1753 (125 % FLA); utility-only source.

## Normal-power branches (sheet E-501)
| CB | Trip | Branch | Equipment |
|---|---|---|---|
| CB-01 | 225 A | Lighting **[STATED L1 + L3]** | 4L-1-A → 4L-3-A, 225 A 480Y/277V **[T2 rating]** |
| CB-02 | 400 A | Power 1 **[STATED 480 V, 3 storeys]** | 4P-1-A → 4P-2-A → 4P-3-A, 400 A MLO **[T2]** |
| CB-03 | 250 A | Power 2 **[STATED]** | 4T-1-B 150 kVA **[T2 size]** → 2S-1-B 600 A / 500 A MCB → 2P-1-B, 2P-2-B, 2P-3-B 225 A |
| CB-04 | 800 A | Power 3 **[STATED 500 kVA]** | 4T-1-C 500 kVA → 2S-1-C 1600 A MCB 208Y/120V |
| CB-05 | 400 A | Cafe **[STATED 400 A]** | 4K-1-A 400 A 480Y/277V **[T2 voltage]** |
| CB-06 | 800 A | Mechanical L1 **[STATED]** | 4M-1-A 800 A + 45 kVA 4T-1-M → 2M-1-A 150 A |
| CB-07 | 800 A | Mechanical Roof **[STATED]** | 4M-R-A 800 A + 45 kVA 4T-R-M → 2M-R-A 150 A |
| CB-08…11 | 225/400/800/400 A | ATS normal feeds | to E4A / L4A / EQ4A / O4A (cross-sheet) |
| — | 400 A | Spare + space | |

## Generator system (sheet E-502)
- **[STATED]** 1 MW. **[T3 HALT-005]** 1000 kW / 1250 kVA 480Y/277V, 2000AF/1600AT LSI, feeder 16004.
- **[T3 HALT-006]** X"d 0.12 → 12,529 A on the EM bus; E4MSB-1-A 2000 A, 22 kAIC.
- **[T2]** Golden-pattern EM board; one breaker and one ATS per system.

| ATS | Class | Rating | Serves |
|---|---|---|---|
| E4A-1-A | Life Safety — NEC 700 | 225 A | E4S-1-A → egress lighting E4L-1/2/3-A; 45 kVA → E2P-1-A (fire alarm, EM 120 V) |
| L4A-1-A | Legally Required — NEC 701 | 400 A | L4P-1-A: smoke control, sump/sewage ejectors |
| EQ4A-1-A | Equipment — **[T3 HALT-007]** owner-defined 702 | 800 A | EQ4S-1-A: animal life support (pumps, filtration, chillers); 45 kVA → EQ2P-1-A |
| O4A-1-A | Optional Standby — NEC 702 | 400 A | O4P-1-A: cafe refrigeration, IT, security; 75 kVA → O2P-1-A |

- ATS sum 1825 A > generator FLA 1503.5 A → automatic load management; shed OS, then EQ, then LR,
  never LS (HALT-005).

## Not provided → halted
Feeder lengths (HALT-001), connected load / panel schedules (HALT-003).

This SLD is for design development and coordination. It requires review and seal by a licensed
Professional Engineer before construction use.
