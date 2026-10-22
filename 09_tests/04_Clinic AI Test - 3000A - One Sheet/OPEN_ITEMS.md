# Clinic AI Test — 3000 A Service — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-10-21T04:39:09.408Z · **Halts** 5 · **Notes** 10 · **Placeholders** 0

---

## 1. Tier-3 halts — EOR input required

| # | Topic | NEC | Blocks |
|---|-------|-----|--------|
| `HALT-001` | Feeder distances | `NEC 210.19(A) IN / 215.2(A)(1) IN` | Voltage-drop calculation · A-5 tags · per-device fault current |
| `HALT-002` | Utility fault current + transformer impedance — DERIVED, not confirmed | `NEC 110.9 / 110.24` | AIC ratings released for procurement · DV-4 bus bracing verified against utility data |
| `HALT-003` | Connected-load schedule / service adequacy | `NEC 220 / 230.42(A) / 517.30` | Service-size verification · panel schedules · feeder sizing confirmation |
| `HALT-004` | Generator breaker, feeder and capacity — Tier-3 values FILLED by compositor | `NEC 445.12 / 445.13 / 700.4(B) / 517.35` | Generator feeder release · generator sizing study · EM board main rating |
| `HALT-005` | Generator subtransient reactance — ASSUMED | `NEC 110.9 / 700.4` | EM board AIC release · ATS emergency-side withstand verification |

### HALT-001 — Feeder distances

COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation performed; no A-5 tags. Fault current below each bus is NOT attenuated for feeder impedance — the 56.5 kA service value is a conservative bound for every 480 V normal-side device, and the 208 V values are infinite-primary-bus bounds.

**NEC** `NEC 210.19(A) IN / 215.2(A)(1) IN` · **Blocks** Voltage-drop calculation · A-5 tags · per-device fault current

### HALT-002 — Utility fault current + transformer impedance — DERIVED, not confirmed

COMPOSITOR_HALT: utility available fault current and the utility transformer nameplate were not provided. Derived on a worst-case basis: 2500 kVA (next standard size above the 2494 kVA a 3000 A / 480 V service needs), %Z 5.75 less the IEEE C57.12.00 -7.5% tolerance = 5.319%, infinite primary bus: 3007 A / 0.05319 = 56,535 A sym, so 65 kAIC. No motor contribution. The utility letter and transformer nameplate must confirm before AIC ratings are released for procurement.

**NEC** `NEC 110.9 / 110.24` · **Blocks** AIC ratings released for procurement · DV-4 bus bracing verified against utility data

### HALT-003 — Connected-load schedule / service adequacy

COMPOSITOR_HALT: no connected-load or panel schedule was provided (T3-EOR). Every panel rating not stated by the owner is a Tier-2 default and no NEC 220 / 517 demand calculation was performed. Note the stated 3000 A service is 125 VA/SF on 20,000 SF — roughly 4-8x a typical outpatient clinic. Live feeder trips total 2920 A on the 3000 A bus.

**NEC** `NEC 220 / 230.42(A) / 517.30` · **Blocks** Service-size verification · panel schedules · feeder sizing confirmation

### HALT-004 — Generator breaker, feeder and capacity — Tier-3 values FILLED by compositor

COMPOSITOR_HALT: generator feeder sizing is EOR input with no schedule lookup (NEC 445.13). At the owner's direction the compositor FILLED: 1000 kW / 1250 kVA at 0.8 PF, FLA 1503.5 A; integral breaker 2000AF/1600AT LSI 100% rated (NEC 445.12); feeder sized to the 1600 A OCPD on feeder_schedule tag 16004, (6) 3 1/2"C - (4)500 AL + 350 AL GND. Aggregate ATS ratings 1825 A exceed the generator FLA — acceptable only with load diversity, equipment-branch delayed transfer and load shed (NEC 517.35 / 700.4(B)); the generator sizing study is owed.

**NEC** `NEC 445.12 / 445.13 / 700.4(B) / 517.35` · **Blocks** Generator feeder release · generator sizing study · EM board main rating

### HALT-005 — Generator subtransient reactance — ASSUMED

COMPOSITOR_HALT: X"d 0.12 pu assumed (worst case, low end of the typical 0.12-0.18 range) for the emergency-source fault current: 1503.5 A / 0.12 = 12,529 A sym on the EM bus. Generator submittal data must confirm before the EM board 22 kAIC rating is released.

**NEC** `NEC 110.9 / 700.4` · **Blocks** EM board AIC release · ATS emergency-side withstand verification

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Service voltage and configuration | — |
| `NOTE-002` | Occupancy and building levels | `NEC 517.2 / 517.29` |
| `NOTE-003` | Verbal-scope transcription corrections | — |
| `NOTE-004` | Branch architecture — 480 V panels ahead of the step-downs | `NEC 450.3(B)` |
| `NOTE-005` | Worst-case impedance basis for fault current | `NEC 110.9` |
| `NOTE-006` | Transformer secondary OCPD location | `NEC 240.21(C)` |
| `NOTE-007` | Two-level ground-fault protection | `NEC 230.95 / 517.17(B) / 700.6(D)` |
| `NOTE-008` | Emergency architecture and EM board main | `NEC 700.10(B)(5)` |
| `NOTE-009` | ATS classes and poles | `NEC 517.31 / 517.33-517.35 / 700.10(B)` |
| `NOTE-010` | Spare and space provisions | — |

### NOTE-001 — Service voltage and configuration

480Y/277V, 3 phase 4 wire. Stated: 3000 A, 480 V 3-phase; wye/4W is the Tier-2 default.

### NOTE-002 — Occupancy and building levels

Outpatient clinic, 20,000 SF, one storey (Level 1). NEC 517 health-care facility with an essential electrical system (Life Safety / Critical / Equipment branches) as stated. Single storey: no A-7 level lines, no riser cascades.

### NOTE-003 — Verbal-scope transcription corrections

The life-safety "225-240 volt panel" is read as a 225 A, 480Y/277V panel (it feeds a 480 V-primary 45 kVA step-down). The critical "440-volt panel" is read as 480Y/277V. The plug branch "panel that feeds through to another one" is drawn as 2P-1-A (MCB) feed-through to 2P-1-B (MLO).

### NOTE-004 — Branch architecture — 480 V panels ahead of the step-downs

Each 400 A plug / mechanical branch is drawn as a 400 A 480Y/277V panel (4P-1-A / 4M-1-A) whose internal breaker feeds the step-down, because a 400 A breaker cannot protect a 112.5 kVA (135 A) or 75 kVA (90 A) primary within NEC 450.3(B). The kitchen 45 kVA unit is fed directly from the switchboard (CB-04, 70 A primary OCPD).

### NOTE-005 — Worst-case impedance basis for fault current

Every dry-type unit uses percent_z.low from transformer_impedance_V1_0_0.json on an infinite primary bus: 112.5 kVA 312.3 A / 0.031 = 10,073 A; 75 kVA 208.2 A / 0.044 = 4,731 A; 45 kVA 124.9 A / 0.034 = 3,674 A. Correct bound for AIC; wrong one for voltage drop.

### NOTE-006 — Transformer secondary OCPD location

Every dry-type secondary OCPD is the main of the panel it feeds (400 A for 112.5 kVA, 250 A for 75 kVA, 150 A for 45 kVA — schedule lookups), protecting the secondary conductors. Hence MCB on those panels. 2P-1-B, fed through from 2P-1-A, is MLO.

### NOTE-007 — Two-level ground-fault protection

Health-care facility with a GFP service main: every normal-side feeder breaker on 4MSB-1-A is LSIG (second level of GFP). Not applied on the essential electrical system — GFP is not required on the EES and the generator / EM main use ground-fault indication only.

### NOTE-008 — Emergency architecture and EM board main

Golden-case pattern: generator-fed EM switchboard E4MSB-1-A (2000 A, 22 kAIC, two-level with a 2000AF/1600AT LSI main — TIER 2 OVERRIDE of the MLO default, matching the golden two-level board). Its breakers feed the ATS emergency (source 2) inputs; normal (source 1) inputs come from 4MSB-1-A on cross-sheet feeders.

### NOTE-009 — ATS classes and poles

LS4A-1-A 225 A, C4A-1-A 400 A, EQ4A-1-A 1200 A, 3-pole with solid neutral (generator is not a separately derived system — no EM-side N-G bond), 65 kA withstand. nec_class prose LIFE SAFETY / CRITICAL / EQUIPMENT drives the engine 700 -> 701 -> 702 drawing order; only the Life Safety section is classed 700 — the Critical and Equipment branches are NEC 517 branches, not Article 701/702 systems. Equipment branch transfer is delayed-automatic.

### NOTE-010 — Spare and space provisions

Two 400 A / 3P spares and two spaces on 4MSB-1-A; one 225 A / 3P spare and one space on E4MSB-1-A.

---

## 3. Placeholder values in the topology

Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into
an arbitrary field**, not a key, so nothing shallower finds it reliably.

None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker (`provisional`, `sizing_pending`, `assumed`, `estimated`) appears anywhere in the topology.

---

## Naming

`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.
This file is a per-project instance record, so it carries no `_V` suffix.
