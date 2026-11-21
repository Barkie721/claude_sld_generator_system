# Aquarium — 3000 A Service — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-11-21T01:37:21.663Z · **Halts** 7 · **Notes** 11 · **Placeholders** 0

---

## 1. Tier-3 halts — EOR input required

| # | Topic | NEC | Blocks |
|---|-------|-----|--------|
| `HALT-001` | Feeder distances | `NEC 210.19(A) IN / 215.2(A)(1) IN` | Voltage-drop calculation · A-5 tags · per-device fault current |
| `HALT-002` | Utility fault current + transformer impedance — DERIVED, not confirmed | `NEC 110.9 / 110.24` | AIC ratings released for procurement · DV-4 bus bracing verified against utility data |
| `HALT-003` | Connected-load schedule / service adequacy | `NEC 220 / 230.42(A)` | Service-size verification · panel schedules · feeder sizing confirmation |
| `HALT-004` | Fire pump OCPD, controller and source — FILLED by compositor | `NEC 695.3 / 695.4(B)(2) / 695.6(C)` | Fire pump breaker certification · fire pump controller · generator sizing (if 695.3(C)) |
| `HALT-005` | Generator breaker, feeder and capacity — Tier-3 values FILLED by compositor | `NEC 445.12 / 445.13 / 700.4(B) / 701.4(B) / 702.4(B)` | Generator feeder release · generator sizing study · EM board main rating |
| `HALT-006` | Generator subtransient reactance — ASSUMED | `NEC 110.9 / 700.4` | EM board AIC release · ATS emergency-side withstand verification |
| `HALT-007` | Equipment branch classification — owner-defined, not a code system | `NEC 701.2 / 702.2` | EQ branch classification · ATS EQ4A-1-A transfer type · load-shed priority |

### HALT-001 — Feeder distances

COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation performed; no A-5 tags. Fault current below each bus is NOT attenuated for feeder impedance — the 56.5 kA service value is a conservative bound for every 480 V normal-side device, and the 208 V values are infinite-primary-bus bounds.

**NEC** `NEC 210.19(A) IN / 215.2(A)(1) IN` · **Blocks** Voltage-drop calculation · A-5 tags · per-device fault current

### HALT-002 — Utility fault current + transformer impedance — DERIVED, not confirmed

COMPOSITOR_HALT: utility available fault current and the utility transformer nameplate were not provided. Derived on a worst-case basis: 2500 kVA (next standard size above the 2494 kVA a 3000 A / 480 V service needs), %Z 5.75 less the IEEE C57.12.00 -7.5% tolerance = 5.319%, infinite primary bus: 3007 A / 0.05319 = 56,535 A sym, so 65 kAIC. No motor contribution (the fire pump and life-support pumps would add to it). The utility letter and transformer nameplate must confirm before AIC ratings are released for procurement.

**NEC** `NEC 110.9 / 110.24` · **Blocks** AIC ratings released for procurement · DV-4 bus bracing verified against utility data

### HALT-003 — Connected-load schedule / service adequacy

COMPOSITOR_HALT: no connected-load or panel schedule was provided (T3-EOR). Every panel rating not stated by the owner is a Tier-2 default and no NEC 220 demand calculation was performed. The stated 3000 A service is 2494 kVA, 43 VA/SF on 58,000 SF — plausible for an aquarium (life-support pumping, chillers, exhibit HVAC). Branch trips on the secondary bus total 5500 A against the 3000 A main; acceptable only with demonstrated diversity.

**NEC** `NEC 220 / 230.42(A)` · **Blocks** Service-size verification · panel schedules · feeder sizing confirmation

### HALT-004 — Fire pump OCPD, controller and source — FILLED by compositor

COMPOSITOR_HALT: fire pump size was not stated. Filled 100 HP, 460 V, 124 FLA (NEC Table 430.250) / 725 LRA (NEC Table 430.251(B), Design B). Service tap ahead of the main per NEC 695.4(B). OCPD 800AF/800AT — next standard rating at or above the locked-rotor current so it carries LRC indefinitely (NEC 695.4(B)(2)(a)(1)); feeder sized at 125% FLA = 155 A, tag 1753 (NEC 695.6(C)). Fire pump is NOT on the generator: if the AHJ finds the utility unreliable, NEC 695.3(B)/(C) requires an alternate source and a listed fire-pump transfer switch, and the generator must then be sized for the pump starting kVA (695.3(D)). The pump data sheet and the AHJ reliability ruling are owed.

**NEC** `NEC 695.3 / 695.4(B)(2) / 695.6(C)` · **Blocks** Fire pump breaker certification · fire pump controller · generator sizing (if 695.3(C))

### HALT-005 — Generator breaker, feeder and capacity — Tier-3 values FILLED by compositor

COMPOSITOR_HALT: generator feeder sizing is EOR input with no schedule lookup (NEC 445.13). At the owner's direction (1 MW stated) the compositor FILLED: 1000 kW / 1250 kVA at 0.8 PF, 480Y/277V, FLA 1503.5 A; integral breaker 2000AF/1600AT LSI 100% rated (NEC 445.12); feeder on feeder_schedule tag 16004, (6) 3 1/2"C - (4)500 AL + 350 AL GND. Aggregate ATS ratings 1825 A exceed the generator FLA — acceptable only with automatic load management, shedding in the order Optional Standby, Equipment, Legally Required, never Life Safety (NEC 700.4(B), 701.4(B), 702.4(B)(2)). The generator sizing study, with life-support pump motor starting, is owed.

**NEC** `NEC 445.12 / 445.13 / 700.4(B) / 701.4(B) / 702.4(B)` · **Blocks** Generator feeder release · generator sizing study · EM board main rating

### HALT-006 — Generator subtransient reactance — ASSUMED

COMPOSITOR_HALT: X"d 0.12 pu assumed (worst case, low end of the typical 0.12-0.18 range) for the emergency-source fault current: 1503.5 A / 0.12 = 12,529 A sym on the EM bus. Generator submittal data must confirm before the EM board 22 kAIC rating is released.

**NEC** `NEC 110.9 / 700.4` · **Blocks** EM board AIC release · ATS emergency-side withstand verification

### HALT-007 — Equipment branch classification — owner-defined, not a code system

COMPOSITOR_HALT: the owner asked for an "equipment" branch on the generator. An aquarium is not an NEC 517 health-care facility, so there is no code-defined Equipment branch. Composed as an owner-defined optional-standby (Art. 702) branch serving animal life-support systems — tank circulation pumps, filtration, chillers, ozone/UV, monitoring — on its own ATS EQ4A-1-A so it can be prioritised above general optional standby. The EOR must confirm the classification; if any life-support load is required by a code or permit condition it moves to Art. 701.

**NEC** `NEC 701.2 / 702.2` · **Blocks** EQ branch classification · ATS EQ4A-1-A transfer type · load-shed priority

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Service voltage and configuration | `NEC 230.95` |
| `NOTE-002` | Occupancy and building levels | `NEC 518` |
| `NOTE-003` | Three power branches | `NEC 450.3(B) / 240.21(C)` |
| `NOTE-004` | Lighting, mechanical and cafe branches | `NEC 450.3(B)` |
| `NOTE-005` | Worst-case impedance basis for fault current | `NEC 110.9` |
| `NOTE-006` | Transformer secondary OCPD location | `NEC 240.21(C) / 450.3(B)` |
| `NOTE-007` | Fire pump tap | `NEC 695.4(B)` |
| `NOTE-008` | Emergency architecture and EM board | `NEC 700.5(D) / 700.10(B)(5)` |
| `NOTE-009` | Generator branches for an aquarium | `NEC 700 / 701 / 702` |
| `NOTE-010` | Two-level ground-fault protection | `NEC 230.95 / 695.6(G) / 700.6(D)` |
| `NOTE-011` | Spare and space provisions | — |

### NOTE-001 — Service voltage and configuration

480Y/277V, 3 phase 4 wire. Stated: 3000 A; every stated branch is 480 V, so the wye 4W service is the Tier-2 default. Main 3000AF/3000AT LSIG with GFP (NEC 230.95); main and secondary bus 3000 A; service lateral tag 30004.

### NOTE-002 — Occupancy and building levels

Aquarium (assembly occupancy), 58,000 SF, Levels 1-3 plus a mechanical roof. Main electrical room on Level 1. A-7 level lines on both sheets.

### NOTE-003 — Three power branches

Power 1: CB-02 400 A -> 4P-1-A / 4P-2-A / 4P-3-A, 480Y/277V, 400 A MLO full-rated feed-through risers protected by CB-02. Power 2: CB-03 250 A -> 150 kVA 4T-1-B (Level 1, size Tier-2) -> 2S-1-B 600 A sub-distribution (500 A MCB per schedule) -> 225 A MLO panels 2P-1-B / 2P-2-B / 2P-3-B on Levels 1, 2, 3 ("2 volt" read as 208 V). Power 3: CB-04 800 A -> 500 kVA 4T-1-C -> 2S-1-C 1600 A MCB, 208Y/120V, Level 1.

### NOTE-004 — Lighting, mechanical and cafe branches

Lighting: CB-01 225 A -> 4L-1-A (Level 1) -> 4L-3-A (Level 3), 225 A 480Y/277V; the riser passes Level 2 untapped as stated. Mechanical: 4M-1-A (Level 1) and 4M-R-A (Roof), 800 A 480Y/277V MLO, each with an internal 70 A breaker feeding a 45 kVA step-down to a 150 A MCB 208Y/120V panel (2M-1-A / 2M-R-A) for 120 V mechanical controls and receptacles. Cafe: 400 A, voltage not stated — 480Y/277V panel 4K-1-A (no transformer requested; 120 V cafe loads need one, EOR to confirm).

### NOTE-005 — Worst-case impedance basis for fault current

Every dry-type unit uses percent_z.low from transformer_impedance_V1_0_0.json on an infinite primary bus: 500 kVA 1387.9 A / 0.0575 = 24,137 A; 150 kVA 416.4 A / 0.042 = 9,914 A; 75 kVA 208.2 A / 0.044 = 4,731 A; 45 kVA 124.9 A / 0.034 = 3,674 A.

### NOTE-006 — Transformer secondary OCPD location

Every dry-type secondary OCPD is the main of the panel it feeds (1600 A for 500 kVA, 500 A for 150 kVA, 250 A for 75 kVA, 150 A for 45 kVA — schedule lookups), protecting the secondary conductors. Primary OCPD per the same schedule (800 / 250 / 125 / 70 A).

### NOTE-007 — Fire pump tap

Fire pump CB-FP taps the main bus ahead of the main service disconnect in its own section (NEC 695.4(B), non-negotiable), feeding 4FP-1-A on Level 1.

### NOTE-008 — Emergency architecture and EM board

Golden-case pattern: generator-fed EM switchboard E4MSB-1-A (2000 A, 22 kAIC, two-level with a 2000AF/1600AT LSI main). Its breakers feed the ATS emergency (source 2) inputs; normal (source 1) inputs come from 4MSB-1-A on cross-sheet feeders. Life Safety is in its own section of the EM board (NEC 700.10(B)(5)); each system has its own transfer switch (NEC 700.5(D)).

### NOTE-009 — Generator branches for an aquarium

Life Safety E4A-1-A 225 A (Art. 700): sub-distribution E4S-1-A feeding egress-lighting panels E4L-1/2/3-A on every storey, plus a 45 kVA step-down to E2P-1-A for fire alarm and emergency 120 V loads. Legally Required L4A-1-A 400 A (Art. 701): smoke control fans, sump/sewage ejectors, L4P-1-A. Equipment EQ4A-1-A 800 A (Art. 702, owner-defined, HALT-007): animal life support, EQ4S-1-A 800 A with a 45 kVA step-down to EQ2P-1-A. Optional Standby O4A-1-A 400 A (Art. 702): cafe refrigeration, IT/data, security, O4P-1-A with a 75 kVA step-down to O2P-1-A. All ATSs 3-pole, solid neutral (generator not separately derived), 65 kA withstand.

### NOTE-010 — Two-level ground-fault protection

GFP service main (NEC 230.95). Feeder breakers on 4MSB-1-A are LSI; second-level GFP is required only for health-care facilities (517.17) and is not applied. The fire pump breaker carries no GFP (NEC 695.6(G)). EM side: ground-fault indication only (NEC 700.6(D)).

### NOTE-011 — Spare and space provisions

One 400 A / 3P spare and one space on 4MSB-1-A; one 225 A / 3P spare and one space on E4MSB-1-A.

---

## 3. Placeholder values in the topology

Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into
an arbitrary field**, not a key, so nothing shallower finds it reliably.

None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker (`provisional`, `sizing_pending`, `assumed`, `estimated`) appears anywhere in the topology.

---

## Naming

`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.
This file is a per-project instance record, so it carries no `_V` suffix.
