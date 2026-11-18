# Rainbow Clinic for Cat Wellness — 600 A Service — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-11-18T20:26:58.333Z · **Halts** 6 · **Notes** 9 · **Placeholders** 0

---

## 1. Tier-3 halts — EOR input required

| # | Topic | NEC | Blocks |
|---|-------|-----|--------|
| `HALT-001` | Feeder distances | `NEC 210.19(A) IN / 215.2(A)(1) IN` | Voltage-drop calculation · A-5 tags · per-device fault current |
| `HALT-002` | Utility fault current + transformer impedance — DERIVED, not confirmed | `NEC 110.9 / 110.24` | AIC ratings released for procurement · DV-4 bus bracing verified against utility data |
| `HALT-003` | Connected-load schedule / service adequacy | `NEC 220 / 230.42(A)` | Service-size verification · panel schedules · feeder sizing confirmation |
| `HALT-004` | Generator breaker, feeder and capacity — Tier-3 values FILLED by compositor | `NEC 445.12 / 445.13 / 700.4(B) / 702.4` | Generator feeder release · generator sizing study · EM board main rating |
| `HALT-005` | Generator subtransient reactance — ASSUMED | `NEC 110.9 / 700.4` | EM board AIC release · ATS emergency-side withstand verification |
| `HALT-006` | Unplaced rooms in the architectural model | `NEC 220.12 / 220.42` | Load-calculation basis · service-size verification |

### HALT-001 — Feeder distances

COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation performed; no A-5 tags. Fault current below each bus is NOT attenuated for feeder impedance — the 14.96 kA service value is a conservative bound for every 480 V normal-side device, and the 208 V values are infinite-primary-bus bounds.

**NEC** `NEC 210.19(A) IN / 215.2(A)(1) IN` · **Blocks** Voltage-drop calculation · A-5 tags · per-device fault current

### HALT-002 — Utility fault current + transformer impedance — DERIVED, not confirmed

COMPOSITOR_HALT: utility available fault current and the utility transformer nameplate were not provided. Derived on a worst-case basis: 500 kVA pad-mount (FLA 601 A), %Z 4.35 less the IEEE C57.12.00 -7.5% tolerance = 4.02%, infinite primary bus: 601 A / 0.0402 = 14,960 A sym, so 22 kAIC. X/R 5.5 assumed (no utility data). No motor contribution. The utility letter and transformer nameplate must confirm before AIC ratings are released for procurement.

**NEC** `NEC 110.9 / 110.24` · **Blocks** AIC ratings released for procurement · DV-4 bus bracing verified against utility data

### HALT-003 — Connected-load schedule / service adequacy

COMPOSITOR_HALT: no connected-load or panel schedule exists (T3-EOR). The 600 A service is an NEC 220 area-based estimate (290.2 kVA calculated, 349 A at 480 V, +25% growth = 436 A) built on assumed receptacle, HVAC, kitchen and laundry densities; every panel rating is a Tier-2 default. Live feeder trips total 835 A on the 600 A bus (diversity).

**NEC** `NEC 220 / 230.42(A)` · **Blocks** Service-size verification · panel schedules · feeder sizing confirmation

### HALT-004 — Generator breaker, feeder and capacity — Tier-3 values FILLED by compositor

COMPOSITOR_HALT: generator feeder sizing is EOR input with no schedule lookup (NEC 445.13). The compositor FILLED: 200 kW / 250 kVA at 0.8 PF, FLA 300.7 A, against an estimated 128 kVA standby load (700 ~15 kVA, 701 ~22.5 kVA, 702 ~90 kVA) sized up for motor starting; integral breaker 400AF/350AT LSI (>=115% FLA); feeder on feeder_schedule tag 4004, (2) 3"C - (4)350 AL + #3 CU GND. Aggregate ATS ratings 350 A exceed the generator FLA — acceptable only with load diversity and 702 load shed (NEC 700.4(B) / 702.4). The generator sizing study is owed.

**NEC** `NEC 445.12 / 445.13 / 700.4(B) / 702.4` · **Blocks** Generator feeder release · generator sizing study · EM board main rating

### HALT-005 — Generator subtransient reactance — ASSUMED

COMPOSITOR_HALT: X"d 0.12 pu assumed (worst case, low end of the typical 0.12-0.18 range) for the emergency-source fault current: 300.7 A / 0.12 = 2,506 A sym on the EM bus. Generator submittal data must confirm before the EM board 10 kAIC rating is released.

**NEC** `NEC 110.9 / 700.4` · **Blocks** EM board AIC release · ATS emergency-side withstand verification

### HALT-006 — Unplaced rooms in the architectural model

COMPOSITOR_HALT: two harvested rooms are unplaced in the Revit model and carry 0 SF — 200 MECHANICAL ELECTRICAL and 238 GENERAL STORAGE. They are excluded from the 18,862 SF basis, so the NEC 220 area load calculation (and the 600 A service derived from it) may be understated. The architect must place or delete them.

**NEC** `NEC 220.12 / 220.42` · **Blocks** Load-calculation basis · service-size verification

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Service size and configuration | `NEC 220 / 240.6(A)` |
| `NOTE-002` | Occupancy and standby classes | `NEC 517.1 / 700 / 701 / 702` |
| `NOTE-003` | Service main — no ground-fault protection | `NEC 230.95 / 250.24(C)` |
| `NOTE-004` | Branch architecture — 480 V panels ahead of the step-downs | `NEC 450.3(B)` |
| `NOTE-005` | Worst-case impedance basis for fault current | `NEC 110.9` |
| `NOTE-006` | Transformer secondary OCPD location | `NEC 240.21(C)` |
| `NOTE-007` | Emergency architecture and EM board main | `NEC 700.10(B)(5)` |
| `NOTE-008` | ATS classes and poles | `NEC 700.5 / 701.5 / 702.5` |
| `NOTE-009` | Spare and space provisions | — |

### NOTE-001 — Service size and configuration

600 A, 480Y/277V, 3 phase 4 wire. Owner supplied no electrical scope: NEC 220 area-based calculation 290.2 kVA -> 349 A at 480 V, +25% growth = 436 A -> next standard size 600 A (NEC 240.6(A)); 26.4 VA/SF on 18,862 SF. Service lateral feeder_schedule tag 6004.

### NOTE-002 — Occupancy and standby classes

Veterinary clinic for cats, 18,862 SF, one storey (Level 1). NEC 517 covers human health-care facilities only, so the standby system is laid out as true Article 700 (egress lighting, fire alarm, egress hardware), 701 (domestic water booster, sewage ejector) and 702 (animal-housing HVAC, refrigeration, IT) classes, one ATS each. Single storey: no A-7 level lines, no riser cascades.

### NOTE-003 — Service main — no ground-fault protection

Main MAIN-CB 800AF/600AT LSI. GFP of equipment is not required: NEC 230.95 applies to services of 1000 A and above. Normal-side feeder breakers are thermal-magnetic (TM); no second-level GFP (NEC 517.17 does not apply). N-G bond at the service (NEC 250.24(C)) and utility meter as standard.

### NOTE-004 — Branch architecture — 480 V panels ahead of the step-downs

The plug, mechanical, 700 and 702 branches are drawn as 480Y/277V MLO panels (4P-1-A, 4M-1-A, E4L-1-A, O4M-1-A) whose internal breakers feed the step-downs at the transformer-schedule primary OCPD (125 A for 75 kVA, 70 A for 45 kVA, 50 A for 30 kVA, NEC 450.3(B)). The kitchen/laundry 75 kVA unit (4T-1-C) is fed directly from the switchboard (CB-04, 125 A primary OCPD).

### NOTE-005 — Worst-case impedance basis for fault current

Every dry-type unit uses percent_z.low / x_over_r.low from transformer_impedance_V1_0_0.json on an infinite primary bus: 75 kVA 208.2 A / 0.044 = 4,731 A; 45 kVA 124.9 A / 0.034 = 3,674 A; 30 kVA 83.3 A / 0.023 = 3,620 A. Correct bound for AIC; wrong one for voltage drop.

### NOTE-006 — Transformer secondary OCPD location

Every dry-type secondary OCPD is the main of the panel it feeds (250 A for 75 kVA, 150 A for 45 kVA, 100 A for 30 kVA — transformer-schedule lookups), protecting the secondary conductors. Hence MCB on those panels. 2P-1-B, fed through from 2P-1-A, is MLO.

### NOTE-007 — Emergency architecture and EM board main

Golden-case pattern: generator-fed EM switchboard E4MSB-1-A (400 A, 10 kAIC, two-level with a 400AF/350AT LSI main). Its breakers feed the ATS emergency (source 2) inputs; normal (source 1) inputs come from 4MSB-1-A (CB-05/06/07). The NEC 700 breaker ECB-01 sits in its own section (NEC 700.10(B)); 701 and 702 in their own sections, ordered 700 -> 701 -> 702.

### NOTE-008 — ATS classes and poles

E4A-1-A 100 A (NEC 700), L4A-1-A 100 A (NEC 701), O4A-1-A 150 A (NEC 702, manual-reset load shed), 3-pole with solid neutral (generator is not a separately derived system — no EM-side N-G bond), 22 kA withstand >= 14.96 kA available.

### NOTE-009 — Spare and space provisions

Two 100 A / 3P spares and two spaces on 4MSB-1-A; one 100 A / 3P spare and one space on E4MSB-1-A.

---

## 3. Placeholder values in the topology

Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into
an arbitrary field**, not a key, so nothing shallower finds it reliably.

None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker (`provisional`, `sizing_pending`, `assumed`, `estimated`) appears anywhere in the topology.

---

## Naming

`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.
This file is a per-project instance record, so it carries no `_V` suffix.
