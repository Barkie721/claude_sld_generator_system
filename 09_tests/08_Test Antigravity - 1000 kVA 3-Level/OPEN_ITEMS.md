# Test Antigravity — 1000 kVA Service, 3 Levels — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-10-22T04:29:54.681Z · **Halts** 4 · **Notes** 6 · **Placeholders** 0

---

## 1. Tier-3 halts — EOR input required

| # | Topic | NEC | Blocks |
|---|-------|-----|--------|
| `HALT-001` | Utility available fault current | `NEC 110.9 / 110.24` | A-4 tags · DV-4 bus bracing / AIC · switchboard + panelboard AIC ratings |
| `HALT-002` | Utility transformer impedance (%Z, X/R) | — | Fault-current study at the service entrance |
| `HALT-003` | Feeder distances | `NEC 210.19(A) IN / 215.2(A)(1) IN` | Voltage-drop calculation · A-5 tags |
| `HALT-004` | Fire pump breaker rating confirmation | `NEC 695.4(B)(2)` | Fire pump breaker certification |

### HALT-001 — Utility available fault current

COMPOSITOR_HALT: utility available fault current not provided (T3-EOR). No available_fc anywhere in this topology, therefore no A-4 fault-current tags are placed and the DV-4 bus-bracing / AIC check cannot run. Switchboard and panelboard AIC ratings are unset pending this value. Affects sw-201, d-301, r-391, r-392.

**NEC** `NEC 110.9 / 110.24` · **Blocks** A-4 tags · DV-4 bus bracing / AIC · switchboard + panelboard AIC ratings

### HALT-002 — Utility transformer impedance (%Z, X/R)

COMPOSITOR_HALT: utility transformer impedance (%Z, X/R) is a utility-provided nameplate value. transformer_impedance_V1_0_0.json covers dry-type distribution units only and has no 1000 kVA row, so pct_z / x_over_r on d-301 are left null rather than fabricated. Affects d-301.

**NEC** — *(no section applies — this is a project or manufacturer value, not a code question)* · **Blocks** Fault-current study at the service entrance

### HALT-003 — Feeder distances

COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation performed; voltage_drop_pct is absent on every R-1 and no A-5 tags are placed. Affects every R-1 in this topology.

**NEC** `NEC 210.19(A) IN / 215.2(A)(1) IN` · **Blocks** Voltage-drop calculation · A-5 tags

### HALT-004 — Fire pump breaker rating confirmation

COMPOSITOR_HALT: fire pump breaker rating is provisional (250AF / 250AT). EOR must confirm final overcurrent protection sizing per NEC 695.4(B)(2) locked-rotor current carrying requirements for 4FP-1-A (100 HP, 124 FLA / 725 LRA). Affects d-303, r-302.

**NEC** `NEC 695.4(B)(2)` · **Blocks** Fire pump breaker certification

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Service voltage, configuration and main | `NEC 230.95 / 240.6(A)` |
| `NOTE-002` | Occupancy and levels | — |
| `NOTE-003` | Fire pump on main bus | `NEC 695.4(B)` |
| `NOTE-004` | Branch arrangement & bus order | — |
| `NOTE-005` | Plug load branch interpretation | — |
| `NOTE-006` | No emergency system | — |

### NOTE-001 — Service voltage, configuration and main

480Y/277V 3PH 4W stated. FLA at 1000 kVA = 1,000,000 / (480 x 1.732) = 1202.8 A. Main breaker is next standard rating above FLA: 1600AF / 1600AT LSIG with GFP (NEC 240.6(A), 230.95). Main and secondary bus 1600 A. Service lateral tag 16004 (6 sets 3 1/2" C, (4)500 AL + 350 AL GND).

### NOTE-002 — Occupancy and levels

Commercial occupancy assumed, 3 storeys, electrical room on Level 1, one normal-power sheet S1. A-7 level lines on Levels 1, 2, and 3.

### NOTE-003 — Fire pump on main bus

Fire pump taps main bus ahead of the main service disconnect per NEC 695.4(B) (non-negotiable). Positioned in dedicated fire_pump section between metering and main breaker sections.

### NOTE-004 — Branch arrangement & bus order

Branches arranged B, A, B, A, B, A, B: four 208V transformer-fed branches interleaved with three 480V direct mechanical branches to eliminate adjacent transformer glyph collision risk. Branches: CB-01 250AF/125AT -> 4T-1-A (75 kVA) -> 2L-1-A -> 2L-2-A -> 2L-3-A; CB-02 400AF/400AT -> 4M-1-A -> 4M-2-A -> 4M-3-A; CB-03 250AF/125AT -> 4T-1-B (75 kVA) -> 2L-1-B -> 2L-2-B -> 2L-3-B; CB-04 400AF/400AT -> 4M-1-B -> 4M-2-B -> 4M-3-B; CB-05 250AF/125AT -> 4T-1-P (75 kVA) -> 2P-1-A -> 2P-2-A (2 panels); CB-06 400AF/400AT -> 4M-1-C -> 4M-2-C -> 4M-3-C; CB-07 250AF/125AT -> 4T-1-D (75 kVA) -> 2M-1-D -> 2M-2-D -> 2M-3-D.

### NOTE-005 — Plug load branch interpretation

Stated scope calls for "2 plug load panels at 208v". Realized as Power Branch A: 75 kVA transformer 4T-1-P feeding 2P-1-A (Level 1) which sub-feeds 2P-2-A (Level 2). Exactly two plug load panels.

### NOTE-006 — No emergency system

Stated: "no emergency system". No generator, ATS, or emergency switchboard modeled.

---

## 3. Placeholder values in the topology

Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into
an arbitrary field**, not a key, so nothing shallower finds it reliably.

None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker (`provisional`, `sizing_pending`, `assumed`, `estimated`) appears anywhere in the topology.

---

## Naming

`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.
This file is a per-project instance record, so it carries no `_V` suffix.
