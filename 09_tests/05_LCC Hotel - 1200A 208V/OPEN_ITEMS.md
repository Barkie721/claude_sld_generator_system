# LCC Hotel Works — open items the EOR still owes

> **GENERATED** by `run_pipeline.sh` stage 2b from `metadata.compositor_halts[]`. Do not
> hand-edit — it is overwritten on every run. Change the narrative or the build script instead.

⚠️ **The validator reports CLEAN on a halted topology.** 63 rules / 0 errors / 0 warnings says
nothing about this list. **This ledger, not the exit code, is the completeness record.**

Per `06_deliverables/README.md`: a deliverable with unresolved Tier-3 halts is `unreviewed` **by
definition**. While §1 below is non-empty, graduation criteria 4 and 5 cannot be met.

**Generated** 2026-10-21T22:05:47.340Z · **Halts** 8 · **Notes** 8 · **Placeholders** 0

---

## 1. Tier-3 halts — EOR input required

| # | Topic | NEC | Blocks |
|---|-------|-----|--------|
| `HALT-001` | T1 impedance (%Z, X/R) and the MPB1 primary breaker | `NEC 450.3(B)` | Fault-current study · T1 primary protection |
| `HALT-002` | Available fault current | `NEC 110.9 / 110.24` | A-4 tags · AIC ratings · bus bracing |
| `HALT-003` | Ratings and feeders for P4 (upper), P4AA, P2A, P3A, P3B, LIGHT., S1 | `NEC 215.2 / 215.3` | Feeder tags + conduit callouts for seven feeders · panel ratings |
| `HALT-004` | S1 single-phase feeder configuration | `NEC 215.2` | S1 feeder sizing |
| `HALT-005` | UPS rating and downstream | `NEC 645 / 708 (if applicable)` | UPS nameplate · output distribution |
| `HALT-006` | Feeder distances | `NEC 210.19(A) IN / 215.2(A)(1) IN` | Voltage-drop calculation |
| `HALT-007` | Two panels designated P4 | `NEC 408.4(B)` | TI-3 · panel schedules · Revit electrical-system naming |
| `HALT-008` | Legacy designations outside the office designation legend | — | TI-4 · run_pipeline.sh stage 2 |

### HALT-001 — T1 impedance (%Z, X/R) and the MPB1 primary breaker

COMPOSITOR_HALT: T1 (500 kVA, 480-208Y/120 V, fed from MPB1) has no stated %Z or X/R; they are left null and no transformer_impedance lookup was performed. Its primary OCPD is in MPB1, off this sheet: the schedule row gives 800 A / tag 8003, unconfirmed. Affects d-301, r-301.

**NEC** `NEC 450.3(B)` · **Blocks** Fault-current study · T1 primary protection

### HALT-002 — Available fault current

COMPOSITOR_HALT: available fault current not provided. No A-4 tags; switchgear and panel AIC ratings unset. Affects sw-201, d-303, r-391, r-392 and every panel.

**NEC** `NEC 110.9 / 110.24` · **Blocks** A-4 tags · AIC ratings · bus bracing

### HALT-003 — Ratings and feeders for P4 (upper), P4AA, P2A, P3A, P3B, LIGHT., S1

COMPOSITOR_HALT: the source drawing shows no rating for these seven panels (drawing tags 16-20), so their feeders carry tag TBD and no conductor sizing. Owner chose to halt rather than default (Q9). Affects d-330..d-336, r-320..r-326.

**NEC** `NEC 215.2 / 215.3` · **Blocks** Feeder tags + conduit callouts for seven feeders · panel ratings

### HALT-004 — S1 single-phase feeder configuration

COMPOSITOR_HALT: S1 is single-phase (red-line "1PH"). feeder_schedule_V1_0_0.json carries only 3-phase 3-wire and 4-wire rows (DATA_LOOKUP_MISS), so even with a rating no row applies. EOR to give the 1-phase 3-wire conductor set. Affects d-336, r-326.

**NEC** `NEC 215.2` · **Blocks** S1 feeder sizing

### HALT-005 — UPS rating and downstream

COMPOSITOR_HALT: the UPS has a 100 A input breaker but no kVA, input/output voltage, bypass arrangement or downstream distribution on the snippet. Affects d-311.

**NEC** `NEC 645 / 708 (if applicable)` · **Blocks** UPS nameplate · output distribution

### HALT-006 — Feeder distances

COMPOSITOR_HALT: feeder distances not provided; no voltage-drop calculation, no A-5 tags. Affects every R-1.

**NEC** `NEC 210.19(A) IN / 215.2(A)(1) IN` · **Blocks** Voltage-drop calculation

### HALT-007 — Two panels designated P4

COMPOSITOR_HALT: per owner Q1 both d-316 (450 A, off CB-06) and d-330 (fed from P2) keep the designation P4, as on the source drawing. This violates TI-3 designation uniqueness and makes panel schedules, Revit circuiting and field labelling ambiguous (NEC 408.4(B) source identification). Owner re-confirmed keeping both (D1, 2026-10-21) knowing the project stays a preview: run_pipeline.sh stops at stage 2 on this error. EOR to rename one before construction.

**NEC** `NEC 408.4(B)` · **Blocks** TI-3 · panel schedules · Revit electrical-system naming

### HALT-008 — Legacy designations outside the office designation legend

COMPOSITOR_HALT: 19 designations carried over from the existing drawing (HOTEL SWITCHGEAR, P1, P2, P3, P1AA, P1A-P1G, P4AA, P2A, P3A, P3B, LIGHT., S1, P4A, P4B) do not match the [PowerType][Voltage][Equipment]-[Level]-[Identifier] grammar, so TI-4 errors. Owner chose to leave equipment_designation_legend_V1_0_0.json unchanged (D2, 2026-10-21) and keep the names. Resolve by renaming to the office pattern or by a later legend decision.

**NEC** — *(no section applies — this is a project or manufacturer value, not a code question)* · **Blocks** TI-4 · run_pipeline.sh stage 2

---

## 2. Tier-2 decisions taken by default (`compositor_notes[]`)

Applied, logged, overridable by the EOR. **Not blocking** — these do not gate graduation.

| # | Topic | NEC |
|---|-------|-----|
| `NOTE-001` | No GFP on the 1200 A main | `NEC 230.95` |
| `NOTE-002` | UPS drawn as an L3-3 equipment connection | — |
| `NOTE-003` | Panel construction | — |
| `NOTE-004` | 1200 A main below transformer FLA | `NEC 240.21(C) / 450.3(B)` |
| `NOTE-005` | Drawing tags mapped to office feeder-schedule tags | — |
| `NOTE-008` | T1 secondary conductors are owner-specified | `NEC 240.21(C) / 310.16 / 250.102(C)` |
| `NOTE-007` | System bonding jumper located at T1, not in the switchgear | `NEC 250.30(A)(1)` |
| `NOTE-006` | Panel tiers drawn on banded rows (not building levels) | — |

### NOTE-001 — No GFP on the 1200 A main

HOTEL SWITCHGEAR is a separately derived system fed from MPB1 through T1, not a service, and in any case NEC 230.95 applies to solidly grounded wye services of more than 150 V to ground. 208Y/120 V is 120 V to ground, so it does not apply; the main is LSI. The L1-1 symbol is the library main-breaker glyph.

### NOTE-002 — UPS drawn as an L3-3 equipment connection

L2-10 (UPS) is a placeholder symbol with no Revit family, so the UPS is an L3-3 terminal load.

### NOTE-003 — Panel construction

All panels MLO; panels without a drawn rating carry a null rating (HALT-003).

### NOTE-004 — 1200 A main below transformer FLA

500 kVA at 208 V 3PH is 1388 A FLA; the schedule secondary OCPD is 1600 A, but the owner sized the secondary conductors to the 1200 A main (12004T, NOTE-008). The 1200 A main limits T1 to about 432 kVA. Consistent with the source drawing; recorded so it is not read as an error.

### NOTE-005 — Drawing tags mapped to office feeder-schedule tags

Owner Q2: drawing keynotes 4/5/13/14/15 become schedule tags 4504/2254/904/1004/1004 ([amps][wires], 4-wire rows of feeder_schedule_V1_0_0.json).

### NOTE-008 — T1 secondary conductors are owner-specified

Owner callout: (4)4"C-(3)#500 KCM AL, (1)#350 KCM AL NEUTRAL & (1)#250 KCM AL GRD EACH. Phase ampacity 4 x 310 A (500 kcmil AL, 75 C, NEC 310.16) = 1240 A >= the 1200 A main that protects them (NEC 240.21(C)). Tag 12004T. This replaces the transformer schedule row (1600 A secondary OCPD, 16004T), which sizes for full T1 capacity. The 350 kcmil neutral is reduced (NEC 220.61, EOR to confirm against nonlinear load). The 250 kcmil AL per raceway exceeds the 3/0 AL supply-side bonding jumper NEC Table 250.102(C)(1) needs for 500 kcmil AL per set (250.102(C)(2)).

### NOTE-007 — System bonding jumper located at T1, not in the switchgear

HOTEL SWITCHGEAR is a separately derived system fed from MPB1 through T1. The owner removed the N-G bond symbol from the switchgear; the system bonding jumper is therefore taken at T1 (NEC 250.30(A)(1) permits the source or the first disconnecting means, and Ex. 2 forbids both). The schedule row gives bonding jumper #1/0 and GEC #3/0 (250.30(A)(5)). The neutral is isolated from ground in the switchgear. EOR to confirm.

### NOTE-006 — Panel tiers drawn on banded rows (not building levels)

All panels use the L2-4 panelboard symbol, as on the source drawing. Sub-fed panels sit on rows above their parent via level_map + floor_band_designations (row 1 switchgear-fed, row 2 their children, row 3 P4AA / LIGHT.). These rows are drawing tiers, not storeys: level_order is empty, so no level lines are drawn. P2, P1AA, P3 and P4 are shifted east of the P1 fan with chain_dst_x_offset Z-jogs.

---

## 3. Placeholder values in the topology

Found by walking every leaf of the topology — `DATA_LOOKUP_MISS` is a **string substituted into
an arbitrary field**, not a key, so nothing shallower finds it reliably.

None. No `DATA_LOOKUP_MISS` string and no boolean placeholder marker (`provisional`, `sizing_pending`, `assumed`, `estimated`) appears anywhere in the topology.

---

## Naming

`H-N` halts and `NOTE-NNN` notes are assigned by the build script and are stable across runs.
This file is a per-project instance record, so it carries no `_V` suffix.
