# Default Commercial — 2500 kVA Service — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-10-04T19:34:44.476Z · **Halts** 3 · **Notes** 7 · **Placeholders** 0

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

COMPOSITOR_HALT: utility transformer impedance (%Z, X/R) is a utility-provided nameplate value. The transformer_impedance data layer covers dry-type distribution units only and has no 2500 kVA row, so pct_z / x_over_r on d-301 are left null rather than fabricated. Affects d-301.

**NEC** — *(no section applies — this is a project or manufacturer value, not a code question)* · **Blocks** Fault-current study at the service entrance

### HALT-003 — Feeder distances

COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation performed; voltage_drop_pct is absent on every R-1 and no A-5 tags are placed. Affects r-301, r-302, r-303, r-304.

**NEC** `NEC 210.19(A) IN / 215.2(A)(1) IN` · **Blocks** Voltage-drop calculation · A-5 tags

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Service voltage and configuration | — |
| `NOTE-002` | Occupancy and building levels | — |
| `NOTE-003` | Distribution section content | — |
| `NOTE-006` | Riser architecture — depth-1 fans, not cascading chains | — |
| `NOTE-007` | Riser panel sizing | — |
| `NOTE-004` | 75 kVA transformer secondary OCPD | `NEC 240.21(C)` |
| `NOTE-005` | No fire pump, generator, ATS or SPD | `NEC 695.4(B)` |

### NOTE-001 — Service voltage and configuration

480Y/277V, 3 phase 4 wire assumed. Service size (2500 kVA) was the only stated input; voltage and configuration are the Tier-2 defaults for a commercial service of this size.

### NOTE-002 — Occupancy and building levels

Commercial occupancy, 3 storeys on a single normal-power sheet. Levels 1-3 are stated, so A-7 level lines are generated from layout_config.level_order and each riser panel takes its band from level_map.

### NOTE-003 — Distribution section content

One distribution section carrying three feeder breakers (CB-01 400AF/400AT power riser, CB-02 250AF/125AT lighting transformer, CB-03 400AF/400AT mechanical riser). No spares or spaces were requested and none are included.

### NOTE-006 — Riser architecture — depth-1 fans, not cascading chains

Both risers feed levels 2 and 3 directly from the Level-1 panel rather than cascading 1 -> 2 -> 3, matching the golden case. Upper-floor OCPD is internal to the Level-1 panel per its own panel schedule. If the EOR wants a true cascading riser, that is a topology change and layout_config.subfeed_max_depth must be raised past 1.

### NOTE-007 — Riser panel sizing

4P-1-A and 4M-1-A at 400 A MLO; levels 2 and 3 at 225 A MLO on both risers. Feeder sizes are taken from feeder_schedule_V1_0_0.json — tag 4004 (2 sets, 3" C, (4)350 AL + #3 CU) for the 400 A base feeds, tag 2254 (1 set, 3 1/2" C, (4)350 AL + #6 CU) for all four 225 A riser legs. No connected-load schedule was provided, so these are default sizes, not calculated ones.

### NOTE-004 — 75 kVA transformer secondary OCPD

250A secondary protection per 3_phase_transformer_feeder_schedule_V1_0_0.json, located in the 2L-1-A panel main. 225A is the EOR-preference alternative. Tap conductors are protected at the panel main per NEC 240.21(C).

### NOTE-005 — No fire pump, generator, ATS or SPD

None stated, and none defaulted in — emergency power is an architecture decision, not a Tier-2 default. If a fire pump is added later it must be tapped ahead of the main disconnect per NEC 695.4(B); that is non-negotiable.

---

## 3. Placeholder values in the topology

Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into
an arbitrary field**, not a key, so nothing shallower finds it reliably.

None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker (`provisional`, `sizing_pending`, `assumed`, `estimated`) appears anywhere in the topology.

---

## Naming

`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.
This file is a per-project instance record, so it carries no `_V` suffix.
