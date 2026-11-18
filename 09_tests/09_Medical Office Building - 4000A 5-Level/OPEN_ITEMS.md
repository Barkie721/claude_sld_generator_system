# Medical Office Building — 4000 A Service, 5 Levels — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-11-18T00:43:25.687Z · **Halts** 5 · **Notes** 13 · **Placeholders** 0

---

## 1. Tier-3 halts — EOR input required

| # | Topic | NEC | Blocks |
|---|-------|-----|--------|
| `HALT-001` | Utility available fault current | `NEC 110.9 / 110.24` | A-4 tags · DV-4 bus bracing / AIC · equipment AIC and ATS withstand ratings |
| `HALT-002` | Utility transformer impedance (%Z, X/R) | — | Fault-current study at the service entrance |
| `HALT-003` | Feeder distances | `NEC 210.19(A) IN / 215.2(A)(1) IN` | Voltage-drop calculation · A-5 tags |
| `HALT-004` | Generator feeder sizing | `NEC 445.12 / 445.13` | Generator feeder release · generator sizing study |
| `HALT-005` | Connected loads and equipment nameplates | `NEC 220 / 625.42 / 700.4(B) / 517.71` | Service and generator sizing verification · panel schedules · imaging feeder release |

### HALT-001 — Utility available fault current

COMPOSITOR_HALT: utility available fault current not provided (T3-EOR). No available_fc anywhere in this topology, so no A-4 fault-current tags are placed and the DV-4 bus-bracing / AIC check cannot run. Switchboard, panelboard and ATS withstand ratings are unset pending this value. Affects sw-201, sw-202, d-301, r-391..r-394.

**NEC** `NEC 110.9 / 110.24` · **Blocks** A-4 tags · DV-4 bus bracing / AIC · equipment AIC and ATS withstand ratings

### HALT-002 — Utility transformer impedance (%Z, X/R)

COMPOSITOR_HALT: XFMR-U (UTILITY-XFMR, 3000 kVA) %Z and X/R are utility nameplate values. transformer_impedance_V1_0_0.json covers dry-type units only, so pct_z / x_over_r on d-301 are left null rather than fabricated.

**NEC** — *(no section applies — this is a project or manufacturer value, not a code question)* · **Blocks** Fault-current study at the service entrance

### HALT-003 — Feeder distances

COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation; voltage_drop_pct is absent on every R-1 and no A-5 tags are placed. The 5-storey risers (CB-04/05/06/07/08 to Levels 3-5) and the EV site feeders (CB-12/13) are the runs most likely to need upsizing.

**NEC** `NEC 210.19(A) IN / 215.2(A)(1) IN` · **Blocks** Voltage-drop calculation · A-5 tags

### HALT-004 — Generator feeder sizing

COMPOSITOR_HALT: generator feeder sizing is EOR input (NEC 445.13). GEN-1 100 kW / 125 kVA at 0.8 PF, FLA 150.4 A; integral breaker 175 A (>= 115 % FLA, NEC 445.12). The GEN-1 -> E4MDP-1-A feeder is drawn on feeder_schedule row 1754 (sized to the 175 A OCPD, 2 1/2"C - (4)250 AL + #4 CU GND) as a placeholder the EOR must confirm.

**NEC** `NEC 445.12 / 445.13` · **Blocks** Generator feeder release · generator sizing study

### HALT-005 — Connected loads and equipment nameplates

COMPOSITOR_HALT: no connected-load schedule, DCFC nameplate (2 x 150 kW) or imaging equipment (CT, digital X-ray) nameplate was provided. Every rating is a default size from the design brief, not a calculation. Note 2 x 150 kW DCFC at 480 V is ~361 A continuous before diversity; the 600 A CB-12 / 4S-S-A allowance must be confirmed against the NEC 625.42 EVEMS setting and the chargers' listed input. Feeder trips sum to 3725 A on the 4000 A bus. Life-safety load (egress lighting, fire alarm) against the 100 kW generator is unverified.

**NEC** `NEC 220 / 625.42 / 700.4(B) / 517.71` · **Blocks** Service and generator sizing verification · panel schedules · imaging feeder release

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Service | `NEC 230.95 / 240.6(A) / 250.24(C)` |
| `NOTE-002` | Occupancy and levels | `NEC 517.2 / 700.2` |
| `NOTE-003` | Distribution breakers and bus order | — |
| `NOTE-004` | Step-down transformer protection | `NEC 240.21(C) / 450.3(B)` |
| `NOTE-005` | Riser sub-feeds | `NEC 215.3 / 240.4` |
| `NOTE-006` | SPD | `NEC 230.67 / 242` |
| `NOTE-007` | EV charging | `NEC 625.42` |
| `NOTE-008` | Emergency system | `NEC 700.10(B) / 700.10(D) / 445.12` |
| `NOTE-009` | E4P-1-A step-down | `NEC 240.21(C) / 450.3(B)` |
| `NOTE-010` | Deviation from brief — emergency distribution board added | `NEC 700.10(B)(5)` |
| `NOTE-011` | Deviation from brief — DS-IMG not drawn | `NEC 517.72 / 660.5` |
| `NOTE-012` | Drawing convention — level bands | — |
| `NOTE-013` | Design status | — |

### NOTE-001 — Service

4000 A, 480Y/277V 3PH 4W. XFMR-U 3000 kVA, 12.47 kV primary: FLA 3,000,000 / (480 x 1.732) = 3608 A -> 4000AF/4000AT LSIG main with GFP (NEC 240.6(A), 230.95). Main and secondary bus 4000 A. Service lateral tag 40004. CT metering in 4MSB-1-A. N-G bond at the service.

### NOTE-002 — Occupancy and levels

Medical office building, business occupancy, 5 storeys. Not a hospital: no NEC 517 essential electrical system; the generator serves NEC 700 Emergency loads only (egress lighting, fire alarm, generator accessories). A-7 level lines on Levels 1-5.

### NOTE-003 — Distribution breakers and bus order

Fourteen 4MSB-1-A breakers in design-brief order CB-01..CB-14. The five step-down columns (CB-03/05/07/10/13) are separated by non-transformer columns. Feeder trips sum to 3725 A on the 4000 A bus. Distribution breakers LSI.

### NOTE-004 — Step-down transformer protection

Primary OCPDs from 3_phase_transformer_feeder_schedule: 150 kVA 250 A (2503), 112.5 kVA 175 A (1753), 75 kVA 125 A (1253), 30 kVA 50 A (503). Each secondary OCPD (500/400/250/100 A) is the MCB of the panel it feeds, protecting the secondary conductors. %Z / X-R are transformer_impedance midpoints.

### NOTE-005 — Riser sub-feeds

4L-2-A, 2P-2-A, 4L-4-A and 2P-4-A are sub-fed from the panel below (Variant G); their OCPD is internal to the feeding panel per its own schedule (100 A for the 4L sub-feeds, 225 A for the 2P sub-feeds). On the emergency system E4L-3-A is sub-fed from E4P-1-A and E4L-5-A from E4L-3-A, 100 A each.

### NOTE-006 — SPD

SPD-1 Type 1, Mode A on a dedicated 30AF/30AT breaker CB-01, feeder 304. The SPD kA rating is an equipment-schedule item, not an SLD field.

### NOTE-007 — EV charging

CB-12 600 A -> 4S-S-A 600 A MLO (site, NEMA 3R) for 2 x 150 kW DCFC. CB-13 175 A -> 4T-S-A 112.5 kVA -> 2P-S-A 400 A MCB (site, NEMA 3R) for 16 Level-2 chargers under an EVEMS per NEC 625.42.

### NOTE-008 — Emergency system

NEC 700 "Emergency", life safety only. GEN-1 100 kW / 125 kVA 480Y/277V diesel, NFPA 110 Level 1 Type 10, integral 175 A breaker (LSI — ground-fault indication only, NEC 700.6(D)). E4A-1-A 225 A 3-pole (generator not separately derived; no EM-side N-G bond), normal = 4MSB-1-A CB-14 200 A (tag 2004, cross-sheet), emergency = E4MDP-1-A ECB-01 175 A (1754). ATS -> E4P-1-A 225 A MLO on tag 2254. Emergency wiring in its own raceways and riser.

### NOTE-009 — E4P-1-A step-down

E4P-1-A internal 100AF/50AT breaker -> E4T-1-A 30 kVA (primary 503) -> E2P-1-A 100 A MCB 208Y/120V (secondary 1004T) for fire alarm control and EM receptacles.

### NOTE-010 — Deviation from brief — emergency distribution board added

Brief-preferred GEN-1 -> ATS direct cannot be drawn: the engine places the generator and ATS row off an emergency switchboard lineup on the emergency sheet. Brief fallback applied: E4MDP-1-A 400 A two-level board (main EMDP-MAIN 250AF/175AT LSI, no GFP; one breaker ECB-01 250AF/175AT) between GEN-1 and E4A-1-A emergency input.

### NOTE-011 — Deviation from brief — DS-IMG not drawn

Brief CB-11 is Chain F through DS-IMG 400 A fused disconnect. The engine has no L2-5 renderer, so the SLD feeds 4S-1-A directly from CB-11 (Chain A, tag 4004). DS-IMG remains a physical device (imaging corridor wall) to be added to the SLD when L2-5 is implemented.

### NOTE-012 — Drawing convention — level bands

Chain-B transformers and their secondary panels are drawn just above the switchboard, whatever their floor, so 2P-3-A (L3), 2P-5-A (L5) and the site equipment 4S-S-A / 2P-S-A carry no level badge. Their designations still state their level. No Site level line: the engine floor stack starts at the switchboard row.

### NOTE-013 — Design status

This SLD is for design development and coordination. It requires review and seal by a licensed Professional Engineer before construction use.

---

## 3. Placeholder values in the topology

Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into
an arbitrary field**, not a key, so nothing shallower finds it reliably.

None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker (`provisional`, `sizing_pending`, `assumed`, `estimated`) appears anywhere in the topology.

---

## Naming

`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.
This file is a per-project instance record, so it carries no `_V` suffix.
