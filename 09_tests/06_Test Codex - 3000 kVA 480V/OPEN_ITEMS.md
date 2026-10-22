# Test Codex — 3000 kVA / Four Levels — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-10-22T03:33:58.460Z · **Halts** 5 · **Notes** 5 · **Placeholders** 0

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

COMPOSITOR_HALT: Utility primary voltage, impedance and X/R require confirmation. 13.2kV is a coordination placeholder, not a confirmed utility design.

**NEC** — *(no section applies — this is a project or manufacturer value, not a code question)* · **Blocks** Utility interface and fault study

### HALT-003 — Feeder lengths and installation

COMPOSITOR_HALT: Route lengths, ambient temperature, grouping and installation conditions are unknown. No voltage-drop or derating calculation has been performed.

**NEC** `NEC 215.2 / 310.15` · **Blocks** Voltage drop and final conductor sizing

### HALT-004 — Loads and protection coordination

COMPOSITOR_HALT: No connected/demand load schedule or mechanical MCA/MOCP supplied. All branch/panel/transformer ratings are preliminary allowances; verify cumulative riser loading, continuous loads, coordination and equipment suitability.

**NEC** `NEC 220 / 215.2 / 430 / 440` · **Blocks** Final load calculation and branch protection

### HALT-005 — Transformer secondary conductors and bonding

COMPOSITOR_HALT: Verify transformer secondary conductor lengths/routing and panel-main location for NEC 240.21(C), and complete each separately derived system grounding/bonding detail.

**NEC** `NEC 240.21(C) / 250.30 / 450.3(B)` · **Blocks** Secondary conductor protection and SDS installation

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Scope interpretation | — |
| `NOTE-002` | Service | `NEC 230.95 / 250.24` |
| `NOTE-003` | Equipment allowances | — |
| `NOTE-004` | Riser protection | `NEC 215 / 240.4 / 450.3(B)` |
| `NOTE-005` | Design status | — |

### NOTE-001 — Scope interpretation

Eight independent 480V risers serve Levels 1–4: 3 lighting, 2 power and 3 mechanical. One Level-3-only 480Δ to 208Y/120V tap transformer on each riser; Level 4 continues at 480V.

### NOTE-002 — Service

3000kVA at 480V three-phase gives 3608.44A. Preliminary 4000AF/4000AT GFP main and 4000A buses; utility metering and service N–G bond included.

### NOTE-003 — Equipment allowances

Lighting risers 250A each; power and mechanical risers 600A each. 75kVA lighting/mechanical and 150kVA power stepdowns on Level 3. One future feeder space is reserved per distribution bay (8 total). These are reviewable design allowances, not calculated demand loads.

### NOTE-004 — Riser protection

480V panels are MLO with feed-through lugs/full-rated bus and same-rated feeders throughout; upstream branch breaker protects the riser. Specify listed arrangements and verify total downstream demand. Internal transformer primary breakers and secondary MCB ratings follow the repository transformer schedule.

### NOTE-005 — Design status

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
