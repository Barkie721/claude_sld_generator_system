# Sprouts Office Building — 2000 A Service — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-10-04T19:34:40.933Z · **Halts** 3 · **Notes** 10 · **Placeholders** 0

---

## 1. Tier-3 halts — EOR input required

| # | Topic | NEC | Blocks |
|---|-------|-----|--------|
| `HALT-001` | Feeder distances | `NEC 210.19(A) IN / 215.2(A)(1) IN` | Voltage-drop calculation · A-5 tags · per-device 480 V fault current |
| `HALT-002` | Utility fault current + transformer impedance — DERIVED, not confirmed | `NEC 110.9 / 110.24` | AIC ratings released for procurement · DV-4 bus bracing verified against utility data |
| `HALT-003` | Connected-load schedule / service adequacy | `NEC 220 / 230.42(A)` | Service-size verification · panel schedules · feeder sizing confirmation |

### HALT-001 — Feeder distances

COMPOSITOR_HALT: feeder distances not provided (T3-EOR). No voltage-drop calculation performed; voltage_drop_pct is absent on every R-1 and no A-5 tags are placed. Fault current downstream of the main switchboard bus is likewise NOT attenuated for feeder impedance — the 45.2 kA bus value is a conservative bound for every 480 V device below it, not a calculated per-device value. Affects r-302 through r-325.

**NEC** `NEC 210.19(A) IN / 215.2(A)(1) IN` · **Blocks** Voltage-drop calculation · A-5 tags · per-device 480 V fault current

### HALT-002 — Utility fault current + transformer impedance — DERIVED, not confirmed

COMPOSITOR_HALT: the utility available fault current and the 2000 kVA transformer nameplate impedance were not provided. Per Mayo’s instruction they were DERIVED on a stated worst-case basis rather than left null: assumed %Z 5.75 for a 2000 kVA liquid-filled pad-mount, less the IEEE C57.12.00 -7.5% manufacturing tolerance = 5.319%, on an infinite primary bus, giving 45,229 A symmetrical at the service entrance (65 kAIC selected). No motor contribution is included — no motor schedule was provided. These are ASSUMPTIONS: the utility letter and the transformer nameplate must confirm them before AIC ratings are released for procurement. The 208 V secondary values (4,731 / 3,674 / 3,621 A) are NOT assumptions — they come from transformer_impedance_V1_0_0.json percent_z.low. Affects d-301, sw-201, r-391, r-392.

**NEC** `NEC 110.9 / 110.24` · **Blocks** AIC ratings released for procurement · DV-4 bus bracing verified against utility data

### HALT-003 — Connected-load schedule / service adequacy

COMPOSITOR_HALT: no connected-load or panel schedule was provided (T3-EOR). Every panel kVA and ampere rating in this topology is a Tier-2 default, not a calculated value, and no demand calculation was performed. Feeder breaker trips total 2475 A against a 2000 A bus (before four 400 A spares) — normal under diversity, but the adequacy of the stated 2000 A service is UNVERIFIED without a load study. Affects sw-201 and every L2-4.

**NEC** `NEC 220 / 230.42(A)` · **Blocks** Service-size verification · panel schedules · feeder sizing confirmation

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | Service voltage and configuration | — |
| `NOTE-002` | Occupancy and building levels | — |
| `NOTE-003` | Utility transformer size — DERIVED | — |
| `NOTE-004` | Worst-case impedance basis for fault current | `NEC 110.9` |
| `NOTE-005` | Boiler equipment-connection sizing basis — EOR SELECTION | `NEC 424 / 210.19(A)(1)` |
| `NOTE-006` | Plug-load riser architecture — EOR SELECTION | — |
| `NOTE-007` | Riser panel ratings are defaults, not calculated | — |
| `NOTE-008` | Transformer secondary OCPD location | `NEC 240.21(C)` |
| `NOTE-009` | No fire pump, generator, ATS or SPD | `NEC 695.4(B)` |
| `NOTE-010` | Spare and space provisions | — |

### NOTE-001 — Service voltage and configuration

480Y/277V, 3 phase 4 wire assumed. The stated inputs were 2000 A and 480 V; the wye configuration and 4-wire system are the Tier-2 defaults for a commercial service of this size.

### NOTE-002 — Occupancy and building levels

Office occupancy, 50,000 SF, 4 storeys plus roof, single normal-power sheet. Levels 1-4 and the roof are stated, so A-7 level lines are generated on all five rows from layout_config.level_order and each riser panel takes its band from level_map.

### NOTE-003 — Utility transformer size — DERIVED

2000 kVA. Derived from the stated service: 2000 A x 480 V x sqrt(3) = 1662.8 kVA required, next standard pad-mount size 2000 kVA (FLA 2405.6 A = 120% of the service rating). The 1500 kVA alternative (1804 A) cannot carry the full 2000 A and yields a lower fault current, so it is less conservative on both counts.

### NOTE-004 — Worst-case impedance basis for fault current

Mayo directed that impedances be assumed to produce the WORST CASE fault current. Worst case for fault duty is MINIMUM impedance on an INFINITE primary bus, so the utility unit uses 5.75% less the IEEE C57.12.00 -7.5% tolerance (5.319%) and every dry-type unit uses percent_z.low from transformer_impedance_V1_0_0.json rather than the midpoint. Note this is the correct bound for AIC and bracing selection and the WRONG one for voltage-drop or coordination work — those want the midpoint or high value.

### NOTE-005 — Boiler equipment-connection sizing basis — EOR SELECTION

TIER 2 OVERRIDE confirmed: boiler sizing basis = PF 1.00 resistive (default was PF 0.90). 500 kW at 480 V 3PH gives FLA 601.4 A; 125% continuous = 751.8 A; next NEC standard rating 800 A. CB-06 is 800AF/800AT on feeder tag 8003 (3-wire — a resistive boiler carries no neutral). The PF 0.90 default would have given 668 A x 125% = 835 A and a 1000 A breaker. Nameplate MCA/MOCP, when available, overrides this kW-derived sizing.

### NOTE-006 — Plug-load riser architecture — EOR SELECTION

The verbal scope ("subfeed to levels two and four from the level one panel") was ambiguous and was resolved by direct question: each of the two 75 kVA branches CASCADES L1 -> L2 -> L3 -> L4, so both branches serve every floor. Upper-floor OCPD is internal to each parent panel per its own panel schedule. subfeed_max_depth is 4 because the chain is three hops deep and the key must EXCEED that.

### NOTE-007 — Riser panel ratings are defaults, not calculated

Lighting levels 2-4 at 100 A MLO are as stated. Plug levels 2-4 at 225 A MLO are a Tier-2 default — the largest standard rating below each branch’s 250 A main. The 208 V mechanical stack at 150 A matches the 45 kVA secondary OCPD as Mayo directed. No connected-load schedule was provided, so none of these are calculated values (HALT-003).

### NOTE-008 — Transformer secondary OCPD location

Every dry-type secondary OCPD lives in the main of the panel it feeds — 250 A in 2P-1-A and 2P-1-B, 150 A in 2M-1-A, 100 A in 2M-R-A — which is what protects the secondary tap conductors. Hence MCB on those four panels and MLO elsewhere. Ratings and bonding jumpers are lookups from 3_phase_transformer_feeder_schedule_V1_0_0.json, not chosen values.

### NOTE-009 — No fire pump, generator, ATS or SPD

Fire pump and emergency/standby power were both explicitly excluded from the scope of work. Nothing was defaulted in — emergency power is an architecture decision, not a Tier-2 default. If a fire pump is added later it must be tapped ahead of the main disconnect per NEC 695.4(B); that is non-negotiable. No SPD was requested and none is included.

### NOTE-010 — Spare and space provisions

Four 400 A / 3P spare breakers and four spaces, carried in their own distribution section (SEC-5) so the six live feeder columns keep a clean lane pitch in SEC-4.

---

## 3. Placeholder values in the topology

Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into
an arbitrary field**, not a key, so nothing shallower finds it reliably.

None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker (`provisional`, `sizing_pending`, `assumed`, `estimated`) appears anywhere in the topology.

---

## Naming

`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.
This file is a per-project instance record, so it carries no `_V` suffix.
