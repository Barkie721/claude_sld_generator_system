# Test 1 — 3000 kVA Service, 2 Levels — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-10-22T03:53:35.819Z · **Halts** 3 · **Notes** 6 · **Placeholders** 0

---

## 1. Tier-3 halts — EOR input required

| # | Topic | NEC | Blocks |
|---|-------|-----|--------|
| `HALT-001` | Utility available fault current | `NEC 110.9 / 110.24` | A-4 tags · DV-4 bus bracing / AIC · switchboard + panelboard AIC ratings |
| `HALT-002` | Utility transformer impedance (%Z, X/R) | — | Fault-current study at the service entrance |
| `HALT-003` | Feeder distances | `NEC 210.19(A) IN / 215.2(A)(1) IN` | Voltage-drop calculation · A-5 tags |

### HALT-001 — Utility available fault current

COMPOSITOR_HALT: utility available fault current not provided (T3-EOR). No available_fc anywhere in this topology, therefore no A-4 fault-current tags are placed and the DV-4 bus-bracing / AIC check cannot run. Switchboard and panelboard AIC ratings are unset pending this value. Affects sw-201, d-301, r-391, r-392.

**NEC** `NEC 110.9 / 110.24` · **Blocks** A-4 tags · DV-4 bus bracing / AIC · switchboard + panelboard AIC ratings

### HALT-002 — Utility transformer impedance (%Z, X/R)

COMPOSITOR_HALT: utility transformer impedance (%Z, X/R) is a utility-provided nameplate value. transformer_impedance_V1_0_0.json covers dry-type distribution units only and has no 3000 kVA row, so pct_z / x_over_r on d-301 are left null rather than fabricated. Affects d-301.

**NEC** — *(no section applies — this is a project or manufacturer value, not a code question)* · **Blocks** Fault-current study at the service entrance

### HALT-003 — Feeder distances

COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation performed; voltage_drop_pct is absent on every R-1 and no A-5 tags are placed. Affects every R-1 in this topology.

**NEC** `NEC 210.19(A) IN / 215.2(A)(1) IN` · **Blocks** Voltage-drop calculation · A-5 tags

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Service voltage, configuration and main | `NEC 230.95 / 240.6(A)` |
| `NOTE-002` | Occupancy and levels | — |
| `NOTE-003` | Branch interpretation | — |
| `NOTE-004` | Panel and feeder sizing | — |
| `NOTE-005` | 150 kVA transformer protection | `NEC 240.21(C) / 450.3(B)` |
| `NOTE-006` | No fire pump, generator, ATS or SPD | `NEC 695.4(B)` |

### NOTE-001 — Service voltage, configuration and main

480Y/277V 3PH 4W assumed. FLA at 3000 kVA = 3,000,000 / (480 x 1.732) = 3608 A, so the main is the next standard rating above it: 4000AF / 4000AT LSIG with GFP (NEC 240.6(A), 230.95). Main and secondary bus 4000 A. Service lateral tag 40004 (15 sets 4" C, (4)500 AL + 500 AL GND).

### NOTE-002 — Occupancy and levels

Commercial occupancy assumed, 2 storeys, electrical room on Level 1, one normal-power sheet. A-7 level lines on Levels 1 and 2.

### NOTE-003 — Branch interpretation

"5 lighting, 2 power, 3 mech branches" is taken as ten switchboard feeder breakers, each serving a two-level riser: a Level-1 head panel and a Level-2 panel sub-fed from it. Upper-floor OCPD is internal to the Level-1 panel per its own schedule. Branches: CB-01 250AF/225AT -> 4L-1-A -> 4L-2-A (lighting); CB-02 250AF/225AT -> 4L-1-B -> 4L-2-B (lighting); CB-03 250AF/225AT -> 4L-1-C -> 4L-2-C (lighting); CB-04 250AF/225AT -> 4L-1-D -> 4L-2-D (lighting); CB-05 250AF/225AT -> 4L-1-E -> 4L-2-E (lighting); CB-06 400AF/400AT -> 4M-1-A -> 4M-2-A (mechanical); CB-07 400AF/250AT -> 2P-1-A -> 2P-2-A (power); CB-08 400AF/400AT -> 4M-1-B -> 4M-2-B (mechanical); CB-09 400AF/250AT -> 2P-1-B -> 2P-2-B (power); CB-10 400AF/400AT -> 4M-1-C -> 4M-2-C (mechanical).

### NOTE-004 — Panel and feeder sizing

No connected-load schedule was provided, so every panel rating is a default size, not a calculation. Lighting 225 A MLO (L1, tag 2254) / 100 A MLO (L2, tag 1004) at 480Y/277V; mechanical 400 A MLO (L1, tag 4004) / 225 A MLO (L2, tag 2254) at 480Y/277V; power via 150 kVA 480D-208Y/120V step-down, 500 A MCB (L1) / 225 A MLO (L2). Sum of feeder trips 2825 A against a 4000 A bus.

### NOTE-005 — 150 kVA transformer protection

Primary OCPD 250 A (transformer schedule tag 2503) in the switchboard; secondary OCPD 500 A (tag 5004T) in the 2P-1-x panel main, which protects the secondary conductors per NEC 240.21(C). %Z 4.35 / X-R 2.95 are transformer_impedance midpoints.

### NOTE-006 — No fire pump, generator, ATS or SPD

None stated and none defaulted in. If a fire pump is added it must be tapped ahead of the main disconnect per NEC 695.4(B); that is non-negotiable.

---

## 3. Placeholder values in the topology

Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into
an arbitrary field**, not a key, so nothing shallower finds it reliably.

None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker (`provisional`, `sizing_pending`, `assumed`, `estimated`) appears anywhere in the topology.

---

## Naming

`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.
This file is a per-project instance record, so it carries no `_V` suffix.
