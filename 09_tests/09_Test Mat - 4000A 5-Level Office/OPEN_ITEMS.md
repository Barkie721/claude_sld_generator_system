# Test Mat — 4000A Office / Five Levels — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-11-13T00:10:54.600Z · **Halts** 5 · **Notes** 6 · **Placeholders** 0

---

## 1. Tier-3 halts — EOR input required

| # | Topic | NEC | Blocks |
|---|-------|-----|--------|
| `HALT-001` | Utility fault current and AIC | `NEC 110.9 / 110.10 / 110.24` | Fault study and equipment interrupting ratings |
| `HALT-002` | Utility transformer nameplate | — | Utility interface and fault study |
| `HALT-003` | Feeder lengths and installation | `NEC 215.2 / 310.15` | Voltage drop and final conductor sizing |
| `HALT-004` | Loads and protection coordination | `NEC 220 / 215.2 / 430 / 440` | Final load calculation and branch protection |
| `HALT-005` | Transformer secondary conductors and bonding | `NEC 240.21(C) / 250.30 / 450.3(B)` | Secondary conductor protection and SDS installation |

### HALT-001 — Utility fault current and AIC

COMPOSITOR_HALT: Utility available fault current has not been supplied. AIC/SCCR and bus bracing remain unset.

**NEC** `NEC 110.9 / 110.10 / 110.24` · **Blocks** Fault study and equipment interrupting ratings

### HALT-002 — Utility transformer nameplate

COMPOSITOR_HALT: Utility primary voltage, kVA, impedance and X/R require confirmation. 13.2kV / 3000kVA is a coordination placeholder, not a confirmed utility design.

**NEC** — *(no section applies — this is a project or manufacturer value, not a code question)* · **Blocks** Utility interface and fault study

### HALT-003 — Feeder lengths and installation

COMPOSITOR_HALT: Riser route lengths (5 storeys), ambient temperature, grouping and installation conditions are unknown. No voltage-drop or derating calculation has been performed.

**NEC** `NEC 215.2 / 310.15` · **Blocks** Voltage drop and final conductor sizing

### HALT-004 — Loads and protection coordination

COMPOSITOR_HALT: No connected/demand load schedule or mechanical MCA/MOCP supplied. Riser, panel and transformer ratings are preliminary allowances; verify cumulative riser loading (5 x 75kVA = 375kVA, 451A connected per power riser), continuous loads, coordination and equipment suitability.

**NEC** `NEC 220 / 215.2 / 430 / 440` · **Blocks** Final load calculation and branch protection

### HALT-005 — Transformer secondary conductors and bonding

COMPOSITOR_HALT: Verify each of the 20 transformer secondary conductor lengths/routing and panel-main location for NEC 240.21(C), and complete each separately derived system grounding/bonding detail.

**NEC** `NEC 240.21(C) / 250.30 / 450.3(B)` · **Blocks** Secondary conductor protection and SDS installation

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Scope interpretation | — |
| `NOTE-002` | Service | `NEC 230.95 / 250.24(C)` |
| `NOTE-003` | Equipment allowances | `NEC 450.3(B)` |
| `NOTE-004` | Riser protection | `NEC 215 / 240.4 / 408.36` |
| `NOTE-005` | Emergency power | `NEC 695.4(B) / 700` |
| `NOTE-006` | Design status | — |

### NOTE-001 — Scope interpretation

Owner brief: 4000A service, 5-storey office, 4 power / 1 lighting / 2 mechanical branches, step-down transformers, no emergency power. Each branch = one switchboard feeder serving a 480V riser with one panel per floor (L1-L5). Each power riser taps a 75kVA 480Δ-208Y/120V transformer on every floor (20 total).

### NOTE-002 — Service

480Y/277V selected (owner-confirmed). 3000kVA utility transformer: 3,000,000 / (480 x 1.732) = 3608A -> 4000A main (NEC 240.6(A)). 4000AF/4000AT LSIG main with GFP, utility metering, service N-G bond.

### NOTE-003 — Equipment allowances

Power risers 600A each (5 x 75kVA = 451A connected at 480V); mechanical risers 600A each; lighting riser 225A at 277V. 75kVA taps: 125A primary OCPD, 250A secondary MCB per the repository transformer schedule. Sum of feeder trips 3825A on a 4000A bus. One future feeder space per distribution bay (7 total). Allowances, not calculated demand loads.

### NOTE-004 — Riser protection

480V riser panels are MLO with feed-through lugs/full-rated bus and same-rated feeders throughout; the upstream switchboard breaker protects the riser. Specify listed arrangements and verify total downstream demand.

### NOTE-005 — Emergency power

None per owner brief. No generator, ATS or fire pump. If a fire pump is later added it must be tapped ahead of the service main (NEC 695.4(B)); egress lighting then needs an NEC 700 source.

### NOTE-006 — Design status

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
