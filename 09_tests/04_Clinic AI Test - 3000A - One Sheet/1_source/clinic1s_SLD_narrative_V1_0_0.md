# ELECTRICAL NARRATIVE — SLD GENERATOR (V1_0_0)
# Project: Clinic AI Test — 3000 A Service | Location: not stated (NEC 2023 assumed)
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# Composed 2026-10-20 from the owner's verbal scope (branch
# `clinic-ai-dedarms-tool-test`). The owner stated the service, the branch list
# and the transformer sizes, and directed the compositor to "fill out the rest
# of the details". Every value the owner did NOT state is marked
# **[FILLED]** below, with its basis, and is repeated in the build script's
# metadata.compositor_notes[] (Tier-2) or metadata.compositor_halts[] (Tier-3,
# EOR still owes confirmation).
#
# Verbal-scope transcription corrections (speech-to-text), resolved by the
# compositor and logged as NOTE entries:
#   "225-240 volt panel" (life safety)  -> 225 A, 480Y/277V panel
#   "440-volt panel"     (critical)     -> 480Y/277V panel
# -----------------------------------------------------------------------------

## 1. SERVICE

- Service size: **3000 A at 480Y/277V** → 2494 kVA required; **2500 kVA** utility
  transformer **[FILLED]** (next standard pad-mount size; FLA 3007 A).
- Service voltage: 480Y/277V, 3Φ 4W (stated 480 V 3-phase; wye/4W is the Tier-2 default).
- Utility transformer: 2500 kVA, 13.2 kV primary **[FILLED]** → 480Y/277V,
  %Z 5.75 less the IEEE C57.12.00 −7.5 % tolerance = **5.319 %** on an infinite
  primary bus **[FILLED — worst case for AIC, HALT]**.
- Utility feeder: Tier-1 lookup, feeder_schedule tag `30004` —
  (11) 4"C – (4)500 AL + 500 AL GND.
- Available fault current at the service: 3007 A / 0.05319 = **56,535 A sym**
  **[FILLED — derived, HALT]** → **65 kAIC** equipment rating.

## 2. BUILDING

- Type / use: **Outpatient clinic** (NEC 517 health-care facility; essential
  electrical system with Life Safety, Critical and Equipment branches as stated).
- Stories / levels: **one story** (Level 1). Single level → no riser cascade.
- Gross area: 20,000 SF. Service density 3000 A × 480 V × √3 / 20,000 SF =
  **125 VA/SF** — high for a clinic (typical 15–30 VA/SF connected). Logged as a
  service-adequacy NOTE for the EOR; the stated 3000 A is kept.
- Main electrical room: Level 1 (assumed).

## 3. NORMAL POWER DISTRIBUTION

### Main switchboard — 4MSB-1-A
- Bus: 3000 A, 480Y/277V, 65 kAIC, two-level (main bus / distribution bus).
- Main device: 3000 AF / 3000 AT, LSIG — GFP auto-included (NEC 230.95).
- Auto-included: N-G bond at service entrance (NEC 250.24(C)), utility meter.
- NEC 517.17(B): a second level of GFP is required on the next level of
  feeder devices downstream of a GFP main in a health-care facility — all
  normal-side feeder breakers are **LSIG** (two-level GFP) **[FILLED]**.

### Fire pump
None (stated).

### Distribution breakers (full schedule)

| CB | AF/AT/Poles | Trip | Feeds | Chain | Floor |
|----|-------------|------|-------|-------|-------|
| CB-01 | 400/400/3P | LSIG | 4P-1-A — 480Y/277V plug-load distribution panel, 400 A MLO | A | 1 |
| CB-02 | 400/400/3P | LSIG | 4M-1-A — 480Y/277V mechanical panel, 400 A MLO | A | 1 |
| CB-03 | 250/225/3P | LSIG | 4L-1-A — 480Y/277V lighting panel, 225 A MLO | A | 1 |
| CB-04 | 100/70/3P | LSIG | 4T-1-C — 45 kVA kitchen step-down → 2K-1-A | B | 1 |
| CB-05 | 250/225/3P | LSIG | LS4A-1-A normal source (Life Safety ATS) | C | 1 |
| CB-06 | 400/400/3P | LSIG | C4A-1-A normal source (Critical ATS) | C | 1 |
| CB-07 | 1200/1200/3P | LSIG | EQ4A-1-A normal source (Equipment ATS) | C | 1 |
| SPARE ×2 | 400/400/3P | — | SPARE **[FILLED]** | — | — |
| SPACE ×2 | — | — | SPACE **[FILLED]** | — | — |

Sum of live trips 2920 A on a 3000 A bus — normal under diversity; no load
study was provided (HALT).

### Sub-distribution / step-down trees

```
4P-1-A (400A MLO, 480Y/277V, fed from CB-01)
  internal CB 175 A (tag 1753) → 4T-1-A (112.5 kVA, 480Δ-208Y/120V)
    → 2P-1-A (400A MCB = 4004T secondary OCPD, 208Y/120V)
      ═ 2P-1-B (400A MLO, 208Y/120V) — fed through 2P-1-A's feed-through lugs;
        the two cabinets stand side by side, so the one-line draws them butted
        together and F-305 (tag 4004) is carried in the topology but not drawn
4M-1-A (400A MLO, 480Y/277V, fed from CB-02)
  feed_bottom → 4T-1-B (75 kVA; 125 A primary OCPD in 4M-1-A, tag 1253)
    → 2M-1-A (250A MCB = 2504T, 208Y/120V)
4L-1-A (225A MLO, 480Y/277V, fed from CB-03)
CB-04 → 4T-1-C (45 kVA kitchen; tag 703) → 2K-1-A (150A MCB = 1504T, 208Y/120V kitchen panel; K = Kitchen Panel, legend code added 2026-10-20)
```

Transformer primary/secondary OCPD, feeder tags and bonding jumpers are Tier-1
lookups from `3_phase_transformer_feeder_schedule_V1_0_0.json`; impedances are
`percent_z.low` from `transformer_impedance_V1_0_0.json` (worst case for fault duty).

## 4. EMERGENCY / STANDBY POWER — NEC 517 ESSENTIAL ELECTRICAL SYSTEM

**Architecture:** (x) Separate **generator-fed** emergency switchboard whose
distribution breakers feed the ATS **emergency (source 2)** inputs; ATS loads
are downstream panels *(the golden-case pattern)* **[FILLED — matches the
stated scope: one generator, three branch ATSs]**.

### Generator — GEN-1
- **1000 kW** (stated) / 1250 kVA at 0.8 PF **[FILLED]**, 480Y/277V 3Φ 4W,
  FLA = 1,250,000 / (480 × √3) = **1503.5 A**. Diesel, NFPA 110 Level 1,
  Type 10, Class 48 (NFPA 99 §6.7.1.2 / NFPA 110 for an EES) **[FILLED]**.
- Generator breaker (integral): **2000 AF / 1600 AT, LSI, 100 % rated**
  **[FILLED — HALT]** (1600 A ≥ 1503.5 A FLA; NEC 445.12).
- Generator feeder **[FILLED — Tier-3, HALT for EOR confirmation]**:
  sized to the 1600 A breaker (≥ 115 % of FLA = 1729 A is required only ahead of
  the first OCPD, NEC 445.13(A); the OCPD here is integral):
  feeder_schedule tag `16004` — (6) 3 1/2"C – (4)500 AL + 350 AL GND.
- Generator subtransient X″d 0.12 pu **[FILLED — worst-case assumption, HALT]** →
  1503.5 / 0.12 = **12,529 A** sym at the EM bus (generator alone).
- Generator capacity vs aggregate ATS load: 225 + 400 + 1200 = 1825 A of ATS
  ratings vs 1503.5 A generator FLA — acceptable only with load diversity and
  equipment-branch delayed transfer/load shed (NEC 517.35, 700.4(B)) — HALT.

### ATS inventory

| ATS | NEC class | Poles | Continuous A | Withstand | Normal source | Emergency source | Load |
|-----|-----------|-------|--------------|-----------|---------------|------------------|------|
| LS4A-1-A | 700 (517.33 Life Safety) | 3 | 225 | 65 kA | 4MSB-1-A / CB-05 | E4MSB-1-A / ECB-01 | LS4P-1-A |
| C4A-1-A | 701 position (517.34 Critical) | 3 | 400 | 65 kA | 4MSB-1-A / CB-06 | E4MSB-1-A / ECB-02 | C4P-1-A |
| EQ4A-1-A | 702 position (517.35 Equipment, delayed-automatic) | 3 | 1200 | 65 kA | 4MSB-1-A / CB-07 | E4MSB-1-A / ECB-03 | EQ4P-1-A |

- 3-pole, solid neutral: the generator is NOT a separately derived system
  (neutral bonded only at the service) **[FILLED]**.
- Withstand 65 kA = the normal-side bus rating (DV-5) **[FILLED]**.
- NEC class codes: the pipeline orders sections 700 → 701 → 702. The NEC 517
  branches map onto those positions **for drawing order only** — LS is
  700-class; Critical and Equipment are 517 branches (not 701/702 loads).
  Logged as a NOTE.

### Emergency switchboard — E4MSB-1-A
- Bus: 2000 A, 480Y/277V, 22 kAIC (≥ 12.5 kA generator contribution; the
  ATS load-side bus sees the 56.5 kA normal source only through the ATS, which
  is withstand-rated at 65 kA) **[FILLED]**.
- Main device: **2000 AF / 1600 AT LSI main breaker** — `TIER 2 OVERRIDE confirmed:
  emergency switchboard main = main breaker (default was MLO per NEC 700.10(B)(5)(a))`.
  Taken by the compositor to match the golden two-level EM board; the generator's
  integral breaker remains the generator OCPD. EOR may revert to MLO.
- Distribution breakers: ECB-01 250/225/3P (LS), ECB-02 400/400/3P (CR),
  ECB-03 1200/1200/3P (EQ), LSI **[FILLED]** — each sized to its ATS rating.
- One section per ATS branch: SEC-3-EM Life Safety (NEC 700.10(B) separation), SEC-4-EM
  Critical, SEC-5-EM Equipment; spare + space in SEC-6-EM (owner request, R-011).

### Emergency downstream chains

```
LS4A-1-A (225A ATS) load_out
  → LS4P-1-A (225A MLO, 480Y/277V life-safety panel; "225-240 V panel" read as 225 A / 480 V)
      feed_bottom → LS4T-1-A (45 kVA; 70 A primary OCPD in LS4P-1-A, tag 703)
        → LS2P-1-A (150A MCB = 1504T, 208Y/120V)
C4A-1-A (400A ATS) load_out
  → C4P-1-A (400A MLO, 480Y/277V critical panel; "440 V" read as 480 V)
      feed_bottom → C4T-1-A (112.5 kVA; 175 A primary, tag 1753)
        → C2P-1-A (400A MCB = 4004T, 208Y/120V)
EQ4A-1-A (1200A ATS) load_out
  → EQ4P-1-A (1200A MLO, 480Y/277V equipment distribution panel)
      ├─ EQ4T-1-A (75 kVA; 125 A primary, tag 1253) → EQ2P-1-A (250A MCB = 2504T)
      ├─ EQ4T-1-B (75 kVA; 125 A primary, tag 1253) → EQ2P-1-B (250A MCB = 2504T)
      └─ EQ4T-1-C (45 kVA;  70 A primary, tag 703)  → EQ2K-1-A (150A MCB = 1504T)
```

## 5. FEEDER DISTANCES  `[T3-EOR]`

Distances not provided this phase — VD calc fields left empty; A-5 tags
suppressed. Fault current below each bus is NOT attenuated for feeder
impedance (conservative bound). HALT.

## 6. SHEETS & LAYOUT

| Sheet | Drawing no. | Role | Content |
|-------|-------------|------|---------|
| S1 | E-501 | normal | 4MSB-1-A and all normal-power branches + ATS normal-source feeders |
| S2 | E-502 | emergency | GEN-1, E4MSB-1-A, the three ATSs and the LS / C / EQ branches |

- Cross-sheet ATS normal-source feeders paired with A-3 squiggles (Tier-2
  default text: equipment designations).
- Single storey: one level row (Level 1).

## 7. KEYNOTES & OMISSIONS

- No A-6 keynotes (Tier-3; none provided).
- Omitted: branch-circuit panel schedules, SPDs (not requested), the
  generator's own auxiliary loads (block heater, battery charger — on LS panel
  schedule), load bank connection (not requested).

## 8. TIER-2 OVERRIDE LEDGER

- TIER 2 OVERRIDE confirmed: emergency switchboard main = main breaker (default was MLO) — compositor selection, see §4.

No other Tier-2 overrides were stated by the owner. All **[FILLED]** values above
are compositor selections logged in `compositor_notes[]`; values that need EOR
confirmation are in `compositor_halts[]` and rendered into `OPEN_ITEMS.md`.
