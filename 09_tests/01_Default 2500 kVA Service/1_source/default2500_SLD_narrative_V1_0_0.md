# ELECTRICAL NARRATIVE — DEFAULT 2500 kVA SERVICE (V1_0_0)
# Project: Default Commercial — 2500 kVA Service | Location: ______________________
# Target: sld_topology_rules_V1_0_0 pipeline (schema 1.0.0)
# -----------------------------------------------------------------------------
# Purpose: the reference "everything defaults" composition. The ONLY stated input
# was service size (2500 kVA). Every other value below is a documented Tier-2
# default applied by the compositor and logged here, per
# 00_Docs/project_instructions_V1_0_0.md §2.3.
# -----------------------------------------------------------------------------

## 1. SERVICE

- Service size: **2500 kVA**  `[REQUIRED — the only stated input]`
- Service voltage: 480Y/277V  *(Tier-2 default)*
- Configuration: 3 phase, 4 wire  *(Tier-2 default)*
- Utility transformer: 13.2kV primary — 480Y/277V secondary  *(Tier-2 default)*
- Utility metering: CT metering in the switchboard metering section  *(Tier-1 auto-include)*
- Available fault current: **NOT PROVIDED** `[T3-EOR]` → see HALT-001
- Utility transformer %Z / X-R: **NOT PROVIDED** `[T3-EOR]` → see HALT-002

Full-load current at 2500 kVA, 480V, 3Φ = 2500000 / (480 × √3) = **3007 A**.

## 2. BUILDING

- Occupancy: commercial  *(Tier-2 default)*
- Levels: **3 storeys**, basement electrical room. `[REVISED 2026-07-28 — R-002]`
  The original composition took the Tier-2 default of a single level; 3 storeys were
  requested afterward.
- Level lines: **A-7 lines on Levels 1, 2 and 3**, generated from
  `layout_config.level_order` / `level_map`. ⚠️ `floor_order` must be the per-sheet
  OBJECT form `{"S1":["3","2","1"]}` — a flat array silently falls back to the literal
  hospital stack `['1','2','3','R']` in `_sheetFloorStackBottomUp`.

## 3. NORMAL POWER DISTRIBUTION

### Main switchboard — 4MSB-1-A
- 4000A bus, 480Y/277V, 4W 3PH, two-level bus architecture (main + secondary)
- Main bus 4000A / secondary bus 3000A (DV-10: main ≥ secondary)
- Main device: 4000AF / 3000AT, 3P, LSIG **with ground-fault protection**
  *(Tier-1 auto-include — NEC 230.95, main ≥ 1000A. Cannot be suppressed.)*
- Neutral-to-ground bond at the service entrance *(Tier-1 auto-include — NEC 250.24(C))*
- AIC rating: unset pending available fault current → HALT-001

### Sections (left to right)
1. `incoming` — SEC-1
2. `metering` — SEC-2 (utility meter, CT clamp on the main bus)
3. `main_breaker` — SEC-3 (4000AF/3000AT GFP main)
4. `distribution` — SEC-4 (two feeder breakers + N-G bond)

### Fire pump
None. *(Not stated; Tier-2 default is no fire pump. If a fire pump is added it must be
tapped ahead of the main disconnect per NEC 695.4(B) — non-negotiable.)*

### Distribution breakers (full schedule)

| Tag | Frame / Trip | Poles | Serves | Chain |
|-----|--------------|-------|--------|-------|
| CB-01 | 400AF / 250AT | 3P | 4T-2-A — 150 kVA transformer → 208 V plug-load riser | B — Transformer + Panel |
| CB-03 | 400AF / 400AT | 3P | 4M-1-A — 480Y/277V mechanical panel, 400A MLO (mech riser base) | A — Direct Panel |
| CB-02 | 250AF / 125AT | 3P | 4T-1-A — 75 kVA transformer → 2L-1-A (lighting) | B — Transformer + Panel |

⚠️ **That is the bus order left-to-right, and it is deliberate.** The mechanical column
sits between the two transformer columns; adjacent Chain-B columns put 4T-2-A's label
block inside 4T-1-A's glyph extent (`R-007`). All three are the same class, so the order
is a drafting choice, not an electrical one.

*(One distribution section carrying three feeder breakers. No spares or spaces were
requested and none are included.)*

CB-01's 250 AT is **not a chosen value** — it is the 150 kVA primary OCPD from
`3_phase_transformer_feeder_schedule_V1_0_0.json` (one_line_tag 2503).

### Risers  `[REVISED 2026-07-28 — R-002, then R-005]`

Two riser stacks with **different topologies, on purpose**.

**208 V plug load — a true CASCADE (2 hops).** 150 kVA step-down on Level 1, then each
floor sub-fed from the floor below:

| | L1 | L2 | L3 |
|---|----|----|----|
| Panel | 2P-1-A 500A **MCB** | 2P-2-A 225A MLO | 2P-3-A 225A MLO |
| Fed from | 4T-2-A secondary | 2P-1-A `feed_top` | 2P-2-A `feed_top` |
| Feeder tag | 5004T | 2254 | 2254 |

Exits are `feed_top` throughout — the child is always on a higher floor, and a
`feed_bottom` exit would make each run dive 90 px below its parent and hook back up.
Upper-floor OCPD is internal to each parent panel per its own schedule.
`layout_config.subfeed_max_depth` is **3**: it must EXCEED the chain depth, and 1 places
nothing past the first hop.

**Mechanical — also a CASCADE** (`4M-1-A → 4M-2-A → 4M-3-A`) `[REVISED — R-008]`.
Originally a depth-1 fan matching the golden; converted because two exits on one
panel top cannot be made tag-clean in this lane spacing.

| Stack | L1 | L2 | L3 | Exit port | Feeder tag |
|-------|----|----|----|-----------|------------|
| Mechanical | 4M-1-A 400A MLO | 4M-2-A 225A MLO | 4M-3-A 225A MLO | `feed_top` | 2254 |

**Both risers draw as PLUMB COLUMNS** — 2P at x=995, mechanical at x=1185, lighting at
x=1345. Without `subfeed_straighten` each hop drifts 100 px west per level and draws a
dogleg, leaving only 26 px between 2P-2-A and 4M-2-A; straightened, that is 126 px.

**150 kVA transformer data — all data-layer lookups, none estimated.** From
`3_phase_transformer_feeder_schedule_V1_0_0.json`: primary OCPD 250 A (tag 2503),
secondary OCPD **500 A** (tag 5004T, feeder type 5004), bonding jumper #2 AWG, GEC
#2/0 AWG. From `transformer_impedance_V1_0_0.json`: %Z 4.35, X/R 2.95 (midpoints).
The 500 A secondary OCPD sits in **2P-1-A's main**, which is what protects the secondary
tap conductors — NEC 240.21(C). Hence MCB, not MLO.

All 225 A riser legs are `feeder_schedule_V1_0_0.json` tag **2254** (1 set, 3 1/2" C,
(4)350 AL + #6 CU GND); the 400 A mechanical base feed is tag **4004** (2 sets, 3" C,
(4)350 AL + #3 CU GND). ⚠️ **No connected-load schedule was provided**, so the panel
kVA and ampere ratings themselves are Tier-2 defaults, not calculated values.

### Sub-distribution
- 4T-1-A: 75 kVA, 480Δ — 208Y/120V dry-type. %Z 4.45, X/R 2.25
  (midpoint values, `transformer_impedance_V1_0_0.json`).
- 2L-1-A: 208Y/120V lighting panel, 250A, **main circuit breaker** — the 250A secondary
  OCPD from `3_phase_transformer_feeder_schedule_V1_0_0.json` lives in the panel main,
  satisfying NEC 240.21(C).

## 4. EMERGENCY / STANDBY POWER

**None.** No generator, ATS, or emergency lineup was specified. Nothing was defaulted in —
emergency power is an architecture decision, not a Tier-2 default.

## 5. FEEDER DISTANCES  `[T3-EOR]`

**NOT PROVIDED** → HALT-003. No voltage-drop calculation was performed; no A-5 tags.

## 6. SHEETS & LAYOUT  `[LAYOUT]`

- Single sheet: **S1 / E-501** — "MAIN SINGLE-LINE DIAGRAM — NORMAL POWER"
- 30×42 Arch E1, 96 px/in
- Riser pitch **`riser_step_standard: 700`** `[REVISED — R-006]`, tightened from the
  engine default 1200. Chosen by sweeping: 700 is the tightest value that stays clean
  with no tag override. At 600 an A-1 pill lands on a device box; at 500 F-307 routes
  through its own child panel. Full table in the project README.
- `a1_tag_placement` is empty. The pre-cascade 4P fan exited `feed_bottom` and needed
  `pill_below` to keep its pills out of the dive's 76.67 px jog corridor; the cascade
  exits `feed_top`, never dives, and needs no override.
- `layout_config`: embedded in the topology AND carried as the sidecar
  `default2500_layout_config.json`. Every hospital-golden default that names hospital
  designations (`floor_anchors`, `floor_anchors_mechanical`, `level_map`, `s2_*`) is
  explicitly cleared — absent keys fall back to the engine's `_DEF_*` hospital values,
  which would anchor this drawing to devices that do not exist here.

## 7. KEYNOTES & OMISSIONS

- A-6 keynotes: none `[T3-EOR — both placement and text]`
- Omitted from topology: fire pump, generator, ATS, SPD, spares/spaces, roof-level
  equipment, terminal loads (motors / equipment connections). The mechanical riser
  carries panels only — no motor or equipment connections are shown, because no
  mechanical schedule was provided.

## 8. TIER-2 OVERRIDE LEDGER

No EOR overrides applied. All defaults stand as listed above.

## 9. COMPLETENESS

Stage 1–3 complete and validated. Not a construction document.

> This SLD is for design development and coordination. It requires review and seal by a
> licensed Professional Engineer before construction use.
